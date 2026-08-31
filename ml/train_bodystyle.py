"""Trains the body-style classifier that replaces the aspect-ratio guess.

    python train_bodystyle.py

Reads images from data/bodystyle/<Body>/*.jpg, which prepare_bodystyle_data.py
cuts out of Stanford Cars.

What this replaces
------------------
The photo page decided body style from the shape of the detection box: wider
than 2.4 was a saloon, narrower than 1.5 a hatchback. That ratio is a fact
about where the photographer stood. The same car gave three different answers
from three angles, which is exactly how the feature behaved -- erratic, and no
threshold tuning was ever going to fix a measurement that does not carry the
answer.

Same shape of model as the damage classifier, for the same reasons: MobileNetV2
pretrained on ImageNet, frozen and used only as a feature extractor, with a
small head trained on top. Eight thousand photographs is nowhere near enough to
train a network from nothing, it is plenty to train a head, and the features can
be cached so the slow part happens once.

What it cannot do
-----------------
It cannot name a car. There is no public dataset of Indian cars labelled by make
and model -- the whole of Hugging Face has vehicle *type* sets and one
CC-BY-NC-ND set of about a hundred images -- so "that is a Baleno" is not on
offer from any model that could be built here. Body style is what a photograph
can actually support, and it is what the rest of the site consumes anyway.

Two honest weaknesses, worth reading before trusting a number:

  * The training cars are American and stop at 2012. A silhouette travels
    better than a badge does, but India's hatchbacks are tall narrow city cars
    and Stanford's are Golf shaped, so expect hatchback to be the weakest
    class -- and it is the most common body on Indian roads.
  * The classes are lopsided, roughly four saloons for every hatchback,
    because that is the American market Stanford sampled. Class weights push
    back on that, but weighting is not the same as having the photographs.

Both are reported per class below rather than hidden behind one accuracy
figure, because the average is flattered by the classes that happen to be easy.
"""

import hashlib
import json
import os
import pathlib
import sys

import numpy as np
import tensorflow as tf
from sklearn.metrics import classification_report, confusion_matrix, accuracy_score
from sklearn.model_selection import train_test_split
from sklearn.utils.class_weight import compute_class_weight

HERE = pathlib.Path(__file__).parent
DATA = HERE / "data" / "bodystyle"
OUT = HERE / "bodystyle"
CACHE = HERE / "data" / "bodystyle_features.npz"

# Same reasoning as train_damage.py: extracting features will use every core it
# is given, and a laptop that stops responding is not a faster laptop.
SPARE_CORES = max(1, (os.cpu_count() or 4) - 2)

IMAGE_SIZE = 224
BATCH = 32
SEED = 20260901

TEST_SHARE = 0.2
VALID_SHARE = 0.15

# Below this the browser says it is not sure rather than naming a body. A wrong
# body style quietly steers the whole car guess, so it is better to decline.
CONFIDENCE_FLOOR = 0.55

SOURCE = (
    "Stanford Cars (Krause et al., ICCV Workshops 2013), "
    "relabelled by body style"
)


def load_paths():
    """Every image on disk, with the folder it sits in as its label."""
    if not DATA.exists():
        sys.exit(
            f"\n  No images at {DATA}\n"
            "  Run prepare_bodystyle_data.py first.\n"
        )

    classes = sorted(p.name for p in DATA.iterdir() if p.is_dir())
    if len(classes) < 2:
        sys.exit(f"\n  Need at least two class folders in {DATA}, found {classes}\n")

    paths, labels = [], []
    for index, name in enumerate(classes):
        found = [
            p for p in (DATA / name).rglob("*")
            if p.suffix.lower() in {".jpg", ".jpeg", ".png", ".bmp", ".webp"}
        ]
        paths.extend(found)
        labels.extend([index] * len(found))
        print(f"  {name:14} {len(found):5} images")

    if not paths:
        sys.exit("\n  Class folders exist but contain no images.\n")

    return classes, np.array(paths), np.array(labels)


def limit_threads():
    try:
        tf.config.threading.set_intra_op_parallelism_threads(SPARE_CORES)
        tf.config.threading.set_inter_op_parallelism_threads(2)
    except RuntimeError:
        # Thrown if TensorFlow has already built its thread pools.
        pass


def build_backbone():
    backbone = tf.keras.applications.MobileNetV2(
        input_shape=(IMAGE_SIZE, IMAGE_SIZE, 3),
        include_top=False,
        weights="imagenet",
        pooling="avg",
    )
    backbone.trainable = False
    return backbone


def embed(backbone, paths):
    dataset = (
        tf.data.Dataset.from_tensor_slices([str(p) for p in paths])
        .map(
            lambda p: tf.keras.applications.mobilenet_v2.preprocess_input(
                tf.image.resize(
                    tf.image.decode_image(
                        tf.io.read_file(p), channels=3, expand_animations=False
                    ),
                    (IMAGE_SIZE, IMAGE_SIZE),
                )
            ),
            num_parallel_calls=tf.data.AUTOTUNE,
        )
        .batch(BATCH)
        .prefetch(tf.data.AUTOTUNE)
    )

    return backbone.predict(dataset, verbose=1)


def build_head(width, classes):
    """A hidden layer more than the damage head has.

    Damage is largely a texture question and a linear probe on the backbone's
    features answers it. Body style is about proportion -- where the glass
    stops and the boot starts -- which is a combination of features rather than
    any one of them, and a single dense layer measurably underfits it.
    """
    return tf.keras.Sequential(
        [
            tf.keras.layers.Input(shape=(width,)),
            tf.keras.layers.Dropout(0.3),
            tf.keras.layers.Dense(256, activation="relu"),
            tf.keras.layers.Dropout(0.3),
            tf.keras.layers.Dense(len(classes), activation="softmax"),
        ],
        name="bodystyle_head",
    )


def cached_features(backbone, paths):
    """Features, computed once and kept, keyed by exactly which files went in."""
    signature = hashlib.sha1(
        "|".join(sorted(str(p) for p in paths)).encode("utf-8")
    ).hexdigest()[:16]

    if CACHE.exists():
        stored = np.load(CACHE, allow_pickle=False)
        if str(stored["signature"]) == signature:
            print("  Using cached features")
            return stored["features"]

    print("  Extracting features (the slow part, and it is cached afterwards)")
    features = embed(backbone, paths)

    CACHE.parent.mkdir(parents=True, exist_ok=True)
    np.savez_compressed(CACHE, features=features, signature=signature)

    return features


def main():
    print("\n  Reading images")
    classes, paths, labels = load_paths()

    limit_threads()
    backbone = build_backbone()
    features = cached_features(backbone, paths)

    # Split after extraction, because the features are per image and the split
    # is cheap; stratified so a small class is not simply absent from the test.
    train_x, test_x, train_y, test_y = train_test_split(
        features, labels, test_size=TEST_SHARE, stratify=labels, random_state=SEED
    )
    train_x, valid_x, train_y, valid_y = train_test_split(
        train_x, train_y, test_size=VALID_SHARE, stratify=train_y, random_state=SEED
    )

    print(
        f"\n  {len(train_x)} train, {len(valid_x)} validation, "
        f"{len(test_x)} test, {len(classes)} classes"
    )

    # Stanford sampled the American market, which is four saloons to every
    # hatchback. Without this the head learns that guessing Sedan is usually
    # right, which is true and useless.
    weights = compute_class_weight("balanced", classes=np.arange(len(classes)), y=train_y)
    print("\n  Class weights: " + ", ".join(
        f"{name} {weight:.2f}" for name, weight in zip(classes, weights)
    ))

    head = build_head(features.shape[1], classes)
    head.compile(
        optimizer=tf.keras.optimizers.Adam(1e-3),
        loss="sparse_categorical_crossentropy",
        metrics=["accuracy"],
    )

    head.fit(
        train_x,
        train_y,
        validation_data=(valid_x, valid_y),
        epochs=60,
        batch_size=64,
        class_weight=dict(enumerate(weights)),
        callbacks=[
            tf.keras.callbacks.EarlyStopping(
                monitor="val_accuracy", patience=8, restore_best_weights=True
            )
        ],
        verbose=2,
    )

    predicted = head.predict(test_x, verbose=0)
    guessed = predicted.argmax(axis=1)
    accuracy = accuracy_score(test_y, guessed)

    print(f"\n  Held out accuracy: {accuracy:.1%} on {len(test_y)} images\n")
    print(classification_report(test_y, guessed, target_names=classes, digits=3))

    print("  Confusion (rows are truth):")
    print(f"    {'':12}" + "".join(f"{name[:8]:>9}" for name in classes))
    for name, row in zip(classes, confusion_matrix(test_y, guessed)):
        print(f"    {name:12}" + "".join(f"{count:>9}" for count in row))

    report = classification_report(
        test_y, guessed, target_names=classes, output_dict=True, zero_division=0
    )

    # The whole model, backbone included, because the browser has to run the
    # same thing end to end.
    OUT.mkdir(parents=True, exist_ok=True)
    whole = tf.keras.Sequential([backbone, head], name="bodystyle")
    whole.build((None, IMAGE_SIZE, IMAGE_SIZE, 3))
    whole.export(str(OUT / "savedmodel"))

    (OUT / "bodystyle.json").write_text(json.dumps({
        "classes": classes,
        "imageSize": IMAGE_SIZE,
        "accuracy": round(float(accuracy), 4),
        "confidenceFloor": CONFIDENCE_FLOOR,
        "trainedOn": int(len(train_x)),
        "testedOn": int(len(test_y)),
        "source": SOURCE,
        "perClass": {
            name: {
                "precision": round(report[name]["precision"], 3),
                "recall": round(report[name]["recall"], 3),
                "support": int(report[name]["support"]),
            }
            for name in classes
        },
    }, indent=2), encoding="utf-8")

    print(f"\n  Written {OUT}\n")


if __name__ == "__main__":
    main()
