"""Trains a manufacturer classifier, which was measured and then not shipped.

    python label_makes.py && python train_make.py

THE RESULT, BEFORE ANYTHING ELSE
--------------------------------
This does not work well enough to put on the page, and the numbers are here so
that nobody spends another day rediscovering it.

    overall accuracy   36.5% on 2,865 held out photographs, 33 makes
    target precision   80%, never reached at any usable confidence
    best available     73.4% precision, answering only 20.7% of the time
    Toyota             precision 0.15, recall 0.21

That last line is the one that decided it. The complaint that prompted this was
a Toyota Fortuner being called a Pickup, and a badge reader that says "Toyota"
correctly fifteen times in a hundred would have replaced a wrong shape with a
wrong badge -- worse, because a badge looks like knowledge.

Only the exotics do respectably (Ferrari 0.72, Lamborghini 0.53), because they
look like nothing else. Everything a normal person photographs -- Toyota 0.15,
Land Rover 0.07, Jeep 0.16, Hyundai 0.24 -- is guesswork.

The frontend wiring for it was written and then removed. The scripts stay,
because the measurement is the useful part and because if a dataset of Indian
cars ever appears this is the shape the work takes.

WHY IT FAILS
------------
Not enough images per make (9,739 training photographs over 33 classes), a
frozen backbone that was never fine-tuned for fine-grained distinctions, and a
task that is genuinely hard: telling a Toyota from a Honda from a Hyundai at
three quarters on is not something a linear head over generic ImageNet features
can do. Fine-tuning the backbone would help and needs a GPU this project does
not have.

And underneath all of it, the fatal one: Stanford is American. Its makes cover
seventeen of the thirty one brands in the catalogue, and the missing fourteen
include Maruti Suzuki, Tata, Mahindra and Kia -- most of what is on the road in
India. Even a perfect model here would be silent on the majority of cars
anybody would photograph.

It reads the same photographs train_bodystyle.py uses, relabelled by make, so
the cached MobileNetV2 features are reused and the slow part does not run
twice. Re-running it is cheap; re-running it will not make the numbers better.
"""

import json
import pathlib
import sys

import joblib
import numpy as np
import tensorflow as tf
from sklearn.metrics import accuracy_score, classification_report
from sklearn.model_selection import train_test_split
from sklearn.utils.class_weight import compute_class_weight

from train_bodystyle import (
    IMAGE_SIZE, MAX_FLOOR, SEED, TARGET_PRECISION, TEST_SHARE, VALID_SHARE,
    build_backbone, build_head, cached_features, choose_floor, limit_threads,
)

HERE = pathlib.Path(__file__).parent
DATA = HERE / "data" / "bodystyle"
LABELS = DATA / "makes.json"
OUT = HERE / "make"

# A make needs enough photographs to be learnable at all. Below this it cannot
# be predicted reliably and its presence only makes every other class harder,
# so it is left out and the model simply does not know that brand.
MIN_IMAGES = 90

SOURCE = "Stanford Cars (Krause et al., ICCV Workshops 2013), by manufacturer"


def load_labelled():
    """Every image that has a make, in the order train_bodystyle caches them."""
    if not LABELS.exists():
        sys.exit(f"\n  No labels at {LABELS}. Run label_makes.py first.\n")

    by_path = json.loads(LABELS.read_text(encoding="utf-8"))

    # Exactly the same file set and order as the body-style run, so the cached
    # features line up row for row and do not need extracting again.
    paths, makes = [], []
    for folder in sorted(p for p in DATA.iterdir() if p.is_dir()):
        for path in sorted(folder.rglob("*.jpg")):
            key = f"{folder.name}/{path.name}"
            paths.append(path)
            makes.append(by_path.get(key))

    return np.array(paths), np.array([m if m else "" for m in makes])


def main():
    print("\n  Reading images and their makes")
    paths, makes = load_labelled()

    limit_threads()
    backbone = build_backbone()
    features = cached_features(backbone, paths)

    # Anything unlabelled or from a make with too few photographs is dropped
    # after the features are computed, so the cache key still matches.
    counts = {make: int((makes == make).sum()) for make in set(makes) if make}
    keep = {make for make, count in counts.items() if count >= MIN_IMAGES}

    mask = np.array([make in keep for make in makes])
    features, makes = features[mask], makes[mask]

    classes = sorted(keep)
    labels = np.array([classes.index(make) for make in makes])

    dropped = sorted(m for m in counts if m not in keep)
    print(f"\n  {len(classes)} makes with at least {MIN_IMAGES} photographs")
    for make in classes:
        print(f"    {make:16} {counts[make]:>5}")
    print(f"\n  left out ({len(dropped)}, too few images): {', '.join(dropped)}")

    train_x, test_x, train_y, test_y = train_test_split(
        features, labels, test_size=TEST_SHARE, stratify=labels, random_state=SEED
    )
    train_x, valid_x, train_y, valid_y = train_test_split(
        train_x, train_y, test_size=VALID_SHARE, stratify=train_y, random_state=SEED
    )

    print(f"\n  {len(train_x)} train, {len(valid_x)} validation, {len(test_x)} test")

    weights = compute_class_weight("balanced", classes=np.arange(len(classes)), y=train_y)

    head = build_head(features.shape[1], classes)
    head.compile(
        optimizer=tf.keras.optimizers.Adam(1e-3),
        loss="sparse_categorical_crossentropy",
        metrics=["accuracy"],
    )
    head.fit(
        train_x, train_y,
        validation_data=(valid_x, valid_y),
        epochs=80, batch_size=64,
        class_weight=dict(enumerate(weights)),
        callbacks=[tf.keras.callbacks.EarlyStopping(
            monitor="val_accuracy", patience=10, restore_best_weights=True
        )],
        verbose=2,
    )

    predicted = head.predict(test_x, verbose=0)
    guessed = predicted.argmax(axis=1)
    accuracy = accuracy_score(test_y, guessed)

    print(f"\n  Held out accuracy: {accuracy:.1%} on {len(test_y)} images")
    print(f"  {DIM_NOTE}\n")
    print(classification_report(test_y, guessed, target_names=classes, digits=3, zero_division=0))

    floor = choose_floor(predicted.max(axis=1), guessed == test_y)

    report = classification_report(
        test_y, guessed, target_names=classes, output_dict=True, zero_division=0
    )

    OUT.mkdir(parents=True, exist_ok=True)
    whole = tf.keras.Sequential([backbone, head], name="make")
    whole.build((None, IMAGE_SIZE, IMAGE_SIZE, 3))
    whole.export(str(OUT / "savedmodel"))

    (OUT / "make.json").write_text(json.dumps({
        "classes": classes,
        "imageSize": IMAGE_SIZE,
        "accuracy": round(float(accuracy), 4),
        "confidenceFloor": floor,
        "trainedOn": int(len(train_x)),
        "testedOn": int(len(test_y)),
        "source": SOURCE,
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


DIM_NOTE = (
    "guessing the commonest make every time would score "
    "roughly one in eight, so compare against that, not against zero"
)


if __name__ == "__main__":
    main()
