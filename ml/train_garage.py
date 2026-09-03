"""Trains the classifier that names the cars this project actually models.

    node ../frontend/tools/render-garage.mjs --per=300
    python train_garage.py

Reads data/garage/<car>/*.jpg, one folder per car, rendered from the garage's
own GLB files.

Why this exists when the make classifier did not work
-----------------------------------------------------
Naming a car from a photograph needs labelled photographs of that car, and for
Indian cars none are published. Stanford Cars was the only option and it failed
honestly: 36.5% overall, Toyota at 0.15 precision, and no Maruti, Tata,
Mahindra or Kia in it at all.

But this project owns fifteen cars outright, as 3D models, and a model you own
can be photographed from anywhere, in any light, as many times as you like,
perfectly labelled. That is the whole idea here -- and the Fortuner that
started the complaint is one of the fifteen.

The catch, and it is the whole risk
-----------------------------------
These are renders. A real photograph has a real camera's noise and blur, real
sunlight, a real street behind it and dirt on the paint. A classifier can learn
to separate fifteen clean renders almost perfectly and still fall apart on a
photograph, and a held-out split made of renders would happily report 99% while
that was true. So:

  * the renderer varies angle, elevation, distance, focal length, lighting and
    background, and crops to the car the way the detector will at inference;
  * the augmentation below adds the things a render does not have -- noise,
    blur, colour casts, brightness swings, JPEG mush, and greyscale, so the
    model cannot lean on paint colour, since a Fortuner comes in several and
    the renders only show one;
  * and the number this prints is measured on held-out *renders*, which is an
    upper bound on real-photograph accuracy and is labelled as such wherever it
    is shown.

The only way to know the real figure is to try it on real photographs.
"""

import json
import pathlib
import sys

import numpy as np
import tensorflow as tf
from sklearn.metrics import accuracy_score, classification_report, confusion_matrix
from sklearn.model_selection import train_test_split
from sklearn.utils.class_weight import compute_class_weight

from train_bodystyle import (
    BATCH, IMAGE_SIZE, MAX_FLOOR, SEED, TARGET_PRECISION, TEST_SHARE,
    VALID_SHARE, choose_floor, limit_threads,
)

HERE = pathlib.Path(__file__).parent
DATA = HERE / "data" / "garage"
OUT = HERE / "garage"

SOURCE = "Rendered from this project's own car models, plus Stanford Cars as negatives"

# Real photographs of cars that are none of ours, used as a class of their own
# so the model can say "not one of mine" instead of always picking a favourite.
OTHER = HERE / "data" / "bodystyle"
OTHER_LABEL = "other"
OTHER_COUNT = 3000

# Renders are clean and a fully frozen backbone would let the head separate
# them on cues a photograph will not have, so the top of the backbone is
# unfrozen and the features themselves adapt.
#
# Only the top, though. This machine has 7.7 GB of memory and training died
# twice at UNFREEZE_FROM 100 -- backpropagating through half of MobileNetV2
# holds every intermediate activation for the backward pass, and that is what
# ran out. Unfreezing from 130 trains roughly the last twenty five layers,
# which is where the car-shaped features live anyway, and costs a fraction of
# the memory and time.
UNFREEZE_FROM = 130

EPOCHS = 24

# Smaller than the other trainers use, because this one is the only one that
# backpropagates through the backbone and that is where the memory goes.
#
# It ran out twice at 32, both times deep into training and both times with the
# same error out of oneDNN's convolution-gradient kernel: "could not create a
# memory object". The first death looked like an external kill and I wrongly
# said so; the second showed the traceback.
GARAGE_BATCH = 16

# Saved every time it improves, so a crash costs one epoch rather than the
# whole run. Twice now, seventy minutes of training has evaporated at 99.6%
# validation with nothing on disk to show for it.
CHECKPOINT = OUT / "best.keras" 


def load_paths():
    if not DATA.exists():
        sys.exit(
            f"\n  No renders at {DATA}\n"
            "  Run: node ../frontend/tools/render-garage.mjs --per=300\n"
        )

    classes = sorted(p.name for p in DATA.iterdir() if p.is_dir())
    paths, labels = [], []

    for index, name in enumerate(classes):
        found = sorted((DATA / name).glob("*.jpg"))
        paths.extend(found)
        labels.extend([index] * len(found))
        print(f"  {name:<26} {len(found):>5} renders")

    if not paths:
        sys.exit("\n  Folders exist but hold no renders.\n")

    # And the negatives: real photographs of cars that are none of ours.
    #
    # Without these the model has no way to say "not one of mine". The first
    # version had none, scored 99.6% on held-out renders, and then confidently
    # named one of our fifteen for 94% of six hundred real photographs that
    # were none of them -- sixty-one different cars called a Porsche 911.
    #
    # Sampled evenly across the body-style folders rather than taken off the
    # front, so the class is not accidentally all convertibles.
    others = sorted(OTHER.rglob("*.jpg")) if OTHER.exists() else []
    if len(others) < 500:
        sys.exit(
            f"\n  Need real photographs as negatives, found {len(others)} at {OTHER}.\n"
            "  Run prepare_bodystyle_data.py first.\n"
        )

    step = max(1, len(others) // OTHER_COUNT)
    others = others[::step][:OTHER_COUNT]

    classes.append(OTHER_LABEL)
    paths.extend(others)
    labels.extend([len(classes) - 1] * len(others))
    print(f"  {OTHER_LABEL:<26} {len(others):>5} real photographs (negatives)")

    return classes, np.array([str(p) for p in paths]), np.array(labels)


def decode(path, label):
    image = tf.io.decode_jpeg(tf.io.read_file(path), channels=3)
    image = tf.image.resize(image, (IMAGE_SIZE, IMAGE_SIZE))
    return image, label


def augment(image, label):
    """Everything a render is missing.

    Each of these stands for something real: a phone's sensor, a moving hand,
    the colour of the light, a compressed upload, and a car that comes in more
    than one colour. Without them the model learns the renderer.
    """
    image = tf.image.random_flip_left_right(image)

    # Framing: a detector's box is never exactly the box used here.
    image = tf.image.resize_with_crop_or_pad(image, IMAGE_SIZE + 32, IMAGE_SIZE + 32)
    image = tf.image.random_crop(image, (IMAGE_SIZE, IMAGE_SIZE, 3))

    image = tf.image.random_brightness(image, 45.0)
    image = tf.image.random_contrast(image, 0.6, 1.5)
    image = tf.image.random_saturation(image, 0.3, 1.7)
    image = tf.image.random_hue(image, 0.09)

    # A fifth of them in black and white, so paint colour cannot be the
    # deciding feature. These models each come in one colour; the real cars
    # do not.
    grey = tf.image.rgb_to_grayscale(image)
    image = tf.cond(
        tf.random.uniform([]) < 0.2,
        lambda: tf.image.grayscale_to_rgb(grey),
        lambda: image,
    )

    # Sensor noise, and the softness of a photograph that is not a render.
    image = image + tf.random.normal(tf.shape(image), stddev=tf.random.uniform([], 0, 12))
    blur = tf.nn.avg_pool2d(image[None], 3, 1, "SAME")[0]
    image = tf.cond(tf.random.uniform([]) < 0.3, lambda: blur, lambda: image)

    return tf.clip_by_value(image, 0.0, 255.0), label


def pipeline(paths, labels, training):
    data = tf.data.Dataset.from_tensor_slices((paths, labels))
    data = data.map(decode, num_parallel_calls=tf.data.AUTOTUNE)

    if training:
        data = data.shuffle(2048, seed=SEED)
        data = data.map(augment, num_parallel_calls=tf.data.AUTOTUNE)

    data = data.map(
        lambda image, label: (
            tf.keras.applications.mobilenet_v2.preprocess_input(image), label
        ),
        num_parallel_calls=tf.data.AUTOTUNE,
    )
    return data.batch(GARAGE_BATCH).prefetch(tf.data.AUTOTUNE)


def build(classes):
    backbone = tf.keras.applications.MobileNetV2(
        input_shape=(IMAGE_SIZE, IMAGE_SIZE, 3),
        include_top=False,
        weights="imagenet",
        pooling="avg",
    )

    # Frozen except the last block. The body-style and damage models froze the
    # lot because they had a few thousand photographs of enormously varied
    # things; this has fifteen very specific shapes and needs the features to
    # move towards them.
    backbone.trainable = True
    for layer in backbone.layers[:UNFREEZE_FROM]:
        layer.trainable = False

    return tf.keras.Sequential([
        backbone,
        tf.keras.layers.Dropout(0.35),
        tf.keras.layers.Dense(256, activation="relu"),
        tf.keras.layers.Dropout(0.35),
        tf.keras.layers.Dense(len(classes), activation="softmax"),
    ], name="garage")


def main():
    print("\n  Reading renders")
    classes, paths, labels = load_paths()

    train_paths, test_paths, train_y, test_y = train_test_split(
        paths, labels, test_size=TEST_SHARE, stratify=labels, random_state=SEED
    )
    train_paths, valid_paths, train_y, valid_y = train_test_split(
        train_paths, train_y, test_size=VALID_SHARE, stratify=train_y, random_state=SEED
    )

    print(f"\n  {len(train_paths)} train, {len(valid_paths)} validation, "
          f"{len(test_paths)} test, {len(classes)} cars")

    limit_threads()
    OUT.mkdir(parents=True, exist_ok=True)

    model = build(classes)
    model.compile(
        # Low, because the backbone is being fine-tuned and ImageNet features
        # are worth more than anything fifteen cars can teach from scratch.
        optimizer=tf.keras.optimizers.Adam(1e-4),
        loss="sparse_categorical_crossentropy",
        metrics=["accuracy"],
    )

    # "other" holds ten times as many images as any one car, so without this
    # the cheapest route to a good score is to answer "other" more often.
    weights = compute_class_weight(
        "balanced", classes=np.arange(len(classes)), y=train_y
    )

    model.fit(
        pipeline(train_paths, train_y, training=True),
        validation_data=pipeline(valid_paths, valid_y, training=False),
        epochs=EPOCHS,
        class_weight=dict(enumerate(weights)),
        callbacks=[
            tf.keras.callbacks.EarlyStopping(
                monitor="val_accuracy", patience=5, restore_best_weights=True
            ),
            tf.keras.callbacks.ModelCheckpoint(
                str(CHECKPOINT), monitor="val_accuracy",
                save_best_only=True, verbose=0
            ),
        ],
        verbose=2,
    )

    predicted = model.predict(pipeline(test_paths, test_y, training=False), verbose=0)
    guessed = predicted.argmax(axis=1)
    accuracy = accuracy_score(test_y, guessed)

    print(f"\n  Held out accuracy: {accuracy:.1%} on {len(test_y)} renders")
    print("  On renders. Real photographs will be worse, and by how much is "
          "not knowable from here.\n")
    print(classification_report(test_y, guessed, target_names=classes, digits=3, zero_division=0))

    print("  Confusion (rows are truth):")
    short = [name[:9] for name in classes]
    print("    " + "".join(f"{name:>10}" for name in short))
    for name, row in zip(short, confusion_matrix(test_y, guessed)):
        print(f"    {name:<10}" + "".join(f"{count:>10}" for count in row))

    floor = choose_floor(predicted.max(axis=1), guessed == test_y)

    report = classification_report(
        test_y, guessed, target_names=classes, output_dict=True, zero_division=0
    )

    OUT.mkdir(parents=True, exist_ok=True)
    model.export(str(OUT / "savedmodel"))

    (OUT / "garage.json").write_text(json.dumps({
        "classes": classes,
        "imageSize": IMAGE_SIZE,
        "accuracy": round(float(accuracy), 4),
        "confidenceFloor": floor,
        "trainedOn": int(len(train_paths)),
        "testedOn": int(len(test_y)),
        "source": SOURCE,
        "measuredOn": "renders",
        "targetPrecision": TARGET_PRECISION,
        "maxFloor": MAX_FLOOR,
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
