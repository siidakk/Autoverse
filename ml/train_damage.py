"""Trains the damage classifier that replaces the hand written photo scan.

    python train_damage.py

Reads images from data/damage/<class>/*.jpg, one folder per class, which is
what prepare_damage_data.py cuts out of CarDD.

Why this shape of model
-----------------------
The scan being replaced measured gradients and colour and guessed. It was
wrong often enough that it was switched off, and no amount of further
threshold tuning was going to fix it: telling a dent from a reflection is not
something you can write down as a rule.

So the features are learned instead, by a network that already knows what
edges and surfaces and materials look like. MobileNetV2 trained on ImageNet is
used frozen, purely as a feature extractor, and only a small classifier on top
of it is trained here. That matters for three reasons:

  * it works with a couple of thousand images rather than a couple of hundred
    thousand, which is all the public car damage sets have;
  * the features can be cached, so training the head takes seconds on a CPU
    instead of hours on a GPU nobody here has;
  * the same backbone runs in the browser through TensorFlow.js, so the phone
    doing the scan does not have to send the photograph anywhere.

The honest limitation, written down rather than discovered later: this is a
classifier, not a detector. It answers "what is in this crop", and the browser
turns that into "where" by sliding the question across the photograph. So the
smallest thing it can point at is one window, and it will never draw a tight
outline round a scratch. It also says nothing about how deep the damage is,
which is why the costing still asks you to confirm severity.
"""

import contextlib
import hashlib
import io
import json
import os
import pathlib
import sys

import numpy as np
import tensorflow as tf
from sklearn.metrics import (
    classification_report,
    confusion_matrix,
    accuracy_score,
)
from sklearn.model_selection import train_test_split

HERE = pathlib.Path(__file__).parent
DATA = HERE / "data" / "damage"
OUT = HERE / "damage"
CACHE = HERE / "data" / "features.npz"

# Pulling features out of ten thousand images is the long part of this, and it
# will use every core it is given. On a laptop that means the machine stops
# responding, which is exactly what happened the first time. Leaving two cores
# free costs a few minutes and keeps the thing usable.
SPARE_CORES = max(1, (os.cpu_count() or 4) - 2)

IMAGE_SIZE = 224
BATCH = 32
SEED = 20260822

# Held out and never trained on. Twenty percent of a two thousand image set is
# four hundred pictures, which is enough for the per class numbers below to
# mean something.
TEST_SHARE = 0.2
VALID_SHARE = 0.15


def load_paths():
    """Every image on disk, with the folder it sits in as its label."""
    if not DATA.exists():
        sys.exit(
            f"\n  No images at {DATA}\n"
            "  Run fetch_damage_data.py first, or put one folder per class there.\n"
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
        print(f"  {name:16} {len(found):5} images")

    if not paths:
        sys.exit("\n  Class folders exist but contain no images.\n")

    return classes, np.array(paths), np.array(labels)


def limit_threads():
    """Leave enough of the machine free that it stays usable."""
    try:
        tf.config.threading.set_intra_op_parallelism_threads(SPARE_CORES)
        tf.config.threading.set_inter_op_parallelism_threads(2)
    except RuntimeError:
        # Thrown if TensorFlow has already built its thread pools, which is
        # not worth failing the run over.
        pass


def build_backbone():
    """MobileNetV2 with its classifier removed, pooled to a 1280 long vector.

    Frozen. Nothing here is trained; it is only ever asked what an image looks
    like, and the answer is the same every epoch, which is what makes caching
    the features possible.
    """
    backbone = tf.keras.applications.MobileNetV2(
        input_shape=(IMAGE_SIZE, IMAGE_SIZE, 3),
        include_top=False,
        weights="imagenet",
        pooling="avg",
    )
    backbone.trainable = False
    return backbone


def embed(backbone, paths):
    """One forward pass per image, cached in memory as 1280 numbers each."""
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


def build_head(features, classes):
    """The only part that learns: dropout and one dense layer."""
    return tf.keras.Sequential(
        [
            tf.keras.layers.Input(shape=(features,)),
            tf.keras.layers.Dropout(0.3),
            tf.keras.layers.Dense(len(classes), activation="softmax"),
        ],
        name="damage_head",
    )


def main():
    print("\n  Reading images")
    classes, paths, labels = load_paths()

    # Split before anything is fitted, and stratify so a rare class is not
    # simply absent from the test set.
    train_paths, test_paths, train_labels, test_labels = train_test_split(
        paths, labels, test_size=TEST_SHARE, stratify=labels, random_state=SEED
    )
    train_paths, valid_paths, train_labels, valid_labels = train_test_split(
        train_paths,
        train_labels,
        test_size=VALID_SHARE,
        stratify=train_labels,
        random_state=SEED,
    )

    print(
        f"\n  {len(train_paths)} train, {len(valid_paths)} validation, "
        f"{len(test_paths)} test, {len(classes)} classes"
    )

    limit_threads()
    backbone = build_backbone()

    # The backbone is frozen, so a given image always produces the same
    # numbers. They are cached to disk, keyed by exactly which files went in,
    # because this is the part that takes the time and losing it to a crash
    # halfway through is how the first attempt at this ended.
    signature = hashlib.sha1(
        "|".join(sorted(str(p) for p in paths)).encode("utf-8")
    ).hexdigest()[:16]

    cached = None
    if CACHE.exists():
        stored = np.load(CACHE, allow_pickle=False)
        if str(stored["signature"]) == signature:
            cached = stored

    if cached is not None:
        print(f"\n  Reusing cached features from {CACHE.name}")
        train_features = cached["train"]
        valid_features = cached["valid"]
        test_features = cached["test"]
    else:
        print("\n  Extracting features (frozen backbone, so this happens once)")
        train_features = embed(backbone, train_paths)
        valid_features = embed(backbone, valid_paths)
        test_features = embed(backbone, test_paths)

        CACHE.parent.mkdir(parents=True, exist_ok=True)
        np.savez_compressed(
            CACHE,
            train=train_features,
            valid=valid_features,
            test=test_features,
            signature=np.array(signature),
        )
        print(f"  Cached to {CACHE.name}")

    # Public damage sets are lopsided: scratches are everywhere and a flat
    # tyre is rare. Without this the model learns to answer "scratch".
    counts = np.bincount(train_labels, minlength=len(classes))
    weights = {
        i: len(train_labels) / (len(classes) * max(count, 1))
        for i, count in enumerate(counts)
    }

    head = build_head(train_features.shape[1], classes)
    head.compile(
        optimizer=tf.keras.optimizers.Adam(1e-3),
        loss="sparse_categorical_crossentropy",
        metrics=["accuracy"],
    )

    print("\n  Training the head")
    head.fit(
        train_features,
        train_labels,
        validation_data=(valid_features, valid_labels),
        epochs=60,
        batch_size=BATCH,
        class_weight=weights,
        callbacks=[
            tf.keras.callbacks.EarlyStopping(
                monitor="val_loss", patience=8, restore_best_weights=True
            )
        ],
        verbose=2,
    )

    # --- what it is actually worth, on images it has never seen ---

    predicted = head.predict(test_features, verbose=0)
    guessed = predicted.argmax(axis=1)
    accuracy = accuracy_score(test_labels, guessed)

    print(f"\n  Held out accuracy: {accuracy:.3f}\n")
    print(classification_report(test_labels, guessed, target_names=classes, digits=3))

    print("  Confusion, rows are truth and columns are the guess:")
    matrix = confusion_matrix(test_labels, guessed)
    width = max(len(name) for name in classes) + 1
    print(" " * (width + 2) + " ".join(name[:6].rjust(6) for name in classes))
    for name, row in zip(classes, matrix):
        print(f"  {name.ljust(width)}" + " ".join(str(value).rjust(6) for value in row))

    # How sure it is when it is right, against when it is wrong. This is what
    # sets the threshold below which the app should say it does not know
    # rather than inventing an answer.
    confidence = predicted.max(axis=1)
    right = confidence[guessed == test_labels]
    wrong = confidence[guessed != test_labels]

    # Where two thirds of the mistakes fall below, so most wrong answers are
    # withheld and most right ones survive.
    floor = float(np.percentile(wrong, 67)) if len(wrong) else 0.5
    kept = float((right >= floor).mean()) if len(right) else 0.0
    stopped = float((wrong < floor).mean()) if len(wrong) else 0.0

    print(
        f"\n  Confidence when right: {right.mean():.3f}"
        f"   when wrong: {wrong.mean() if len(wrong) else float('nan'):.3f}"
    )
    print(
        f"  Suggested floor {floor:.3f}: keeps {kept:.0%} of correct answers, "
        f"withholds {stopped:.0%} of wrong ones"
    )

    # --- save the whole thing, backbone and head as one model ---

    OUT.mkdir(parents=True, exist_ok=True)

    inputs = tf.keras.Input(shape=(IMAGE_SIZE, IMAGE_SIZE, 3))
    full = tf.keras.Model(inputs, head(backbone(inputs)), name="damage")
    full.save(OUT / "damage.keras")

    # Also as a SavedModel, because that converts to a TensorFlow.js *graph*
    # model, and the browser already carries the converter for those. Going out
    # through Keras instead would produce a layers model and mean shipping a
    # second runtime to the phone for no benefit.
    #
    # The export prints a few hundred lines about tensor specs, which buries
    # the numbers above. They are not diagnostic of anything, so they are
    # swallowed unless it actually fails.
    noise = io.StringIO()
    try:
        with contextlib.redirect_stdout(noise), contextlib.redirect_stderr(noise):
            full.export(OUT / "savedmodel")
    except Exception:
        print(noise.getvalue())
        raise

    (OUT / "damage.json").write_text(
        json.dumps(
            {
                "classes": classes,
                "imageSize": IMAGE_SIZE,
                "accuracy": round(float(accuracy), 4),
                "confidenceFloor": round(floor, 4),
                "trainedOn": len(train_paths),
                "testedOn": len(test_paths),
                # Written down so the page can say what the number means rather
                # than presenting a percentage with no provenance.
                "perClass": {
                    name: {
                        "support": int((test_labels == i).sum()),
                        "recall": round(
                            float(
                                ((guessed == i) & (test_labels == i)).sum()
                                / max((test_labels == i).sum(), 1)
                            ),
                            3,
                        ),
                    }
                    for i, name in enumerate(classes)
                },
            },
            indent=2,
        )
    )

    print(f"\n  Saved {OUT / 'damage.keras'} and damage.json")
    print("  Now run export_damage_tfjs.py to get it into the browser.\n")


if __name__ == "__main__":
    main()
