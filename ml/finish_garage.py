"""Finishes the garage classifier from its checkpoint.

    python finish_garage.py

Evaluates garage/best.keras on the held-out split, sweeps the confidence floor,
and writes garage/savedmodel and garage/garage.json -- everything train_garage.py
does after fit() returns.

Why it is a separate script
---------------------------
Training this model has run out of memory three times on this machine, always
deep into the run: at epoch 8, at 10 and at 11, each time with backpropagation
holding activations for a batch it could not afford. Twice that cost the whole
run because nothing had been written.

The third time there was a checkpoint, saved on every improvement in validation
accuracy, and it holds the best epoch -- 99.78%. Evaluating and exporting needs
only forward passes, which fit in memory comfortably, so there is no reason to
train again to recover a model that already exists.

Re-running train_garage.py would be the tidier story and a worse use of an hour.
"""

import json
import pathlib
import sys

import numpy as np
import tensorflow as tf
from sklearn.metrics import accuracy_score, classification_report, confusion_matrix
from sklearn.model_selection import train_test_split

from train_bodystyle import SEED, TEST_SHARE, VALID_SHARE, choose_floor, limit_threads
from train_garage import (
    CHECKPOINT, GARAGE_BATCH, IMAGE_SIZE, MAX_FLOOR, OUT, SOURCE,
    TARGET_PRECISION, load_paths, pipeline,
)


def main():
    if not CHECKPOINT.exists():
        sys.exit(f"\n  No checkpoint at {CHECKPOINT}. Run train_garage.py first.\n")

    print("\n  Reading renders")
    classes, paths, labels = load_paths()

    # The identical split, because the seed and the shares are the same. Any
    # drift here would quietly evaluate on images the model trained on.
    train_paths, test_paths, train_y, test_y = train_test_split(
        paths, labels, test_size=TEST_SHARE, stratify=labels, random_state=SEED
    )
    train_paths, valid_paths, train_y, valid_y = train_test_split(
        train_paths, train_y, test_size=VALID_SHARE, stratify=train_y, random_state=SEED
    )

    limit_threads()

    print(f"\n  Loading {CHECKPOINT.name}")
    model = tf.keras.models.load_model(CHECKPOINT)

    print(f"  Scoring {len(test_paths)} held-out images\n")
    predicted = model.predict(pipeline(test_paths, test_y, training=False), verbose=0)
    guessed = predicted.argmax(axis=1)
    accuracy = accuracy_score(test_y, guessed)

    print(f"  Held out accuracy: {accuracy:.1%} on {len(test_y)} images")
    print("  The fifteen car classes are renders; 'other' is real photographs.")
    print("  So recognition is measured on renders and rejection on photographs.\n")
    print(classification_report(
        test_y, guessed, target_names=classes, digits=3, zero_division=0
    ))

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
        "measuredOn": "renders for the cars, real photographs for 'other'",
        "targetPrecision": TARGET_PRECISION,
        "maxFloor": MAX_FLOOR,
        "batch": GARAGE_BATCH,
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
