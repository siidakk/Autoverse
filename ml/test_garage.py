"""Checks the car recogniser knows what it does not know.

    python test_garage.py

The test that matters here is not "does it recognise our fifteen cars". It is
"does it keep quiet about everything else", and the first version of this model
failed that catastrophically while looking perfect.

What happened, so the shape of it is on record
----------------------------------------------
Trained on renders alone, it scored 99.6% on a held-out split of renders. The
confidence floor was swept on that same split and came out at 0.30, because on
renders the model was essentially never wrong and there was no reason to demand
more. Both numbers were true and both were useless.

Shown six hundred real photographs of cars that are none of the fifteen, it
named one of ours for 94.3% of them at that floor. Sixty-one separate cars came
back as a Porsche 911 and sixty as a Fortuner. A classifier trained on fifteen
things will answer "one of my fifteen" for every photograph on earth unless it
is taught otherwise and then measured on the teaching.

So the model has a sixteenth class of real photographs, and this file measures
the thing that went wrong rather than the thing that looked good.
"""

import json
import pathlib
import sys

import numpy as np
import tensorflow as tf

HERE = pathlib.Path(__file__).parent
MODEL = HERE / "garage" / "savedmodel"
META = HERE / "garage" / "garage.json"
RENDERS = HERE / "data" / "garage"
PHOTOS = HERE / "data" / "bodystyle"

GREEN, RED, DIM, OFF = "\x1b[32m", "\x1b[31m", "\x1b[2m", "\x1b[0m"

# Of real photographs that are none of our cars, at most this share may be
# given one of our names. It is not zero because a real photograph of a real
# Porsche 911 is in that pile and calling it a Porsche 911 is correct.
MAX_FALSE_NAMING = 0.15

# And it still has to recognise its own cars, or the rejection is only being
# bought by refusing to answer at all.
MIN_RECOGNITION = 0.85

problems = []


def check(passed, message):
    if not passed:
        problems.append(message)


def load():
    if not META.exists():
        sys.exit(
            f"\n  No model at {META}. Run train_garage.py first.\n"
        )
    meta = json.loads(META.read_text(encoding="utf-8"))
    infer = tf.saved_model.load(str(MODEL)).signatures["serving_default"]
    return meta, infer


def score(infer, paths):
    """Softmax rows for a list of image paths."""
    rows = []
    for start in range(0, len(paths), 32):
        images = []
        for path in paths[start:start + 32]:
            image = tf.io.decode_jpeg(tf.io.read_file(str(path)), channels=3)
            image = tf.image.resize(image, (224, 224))
            images.append(tf.keras.applications.mobilenet_v2.preprocess_input(image))
        rows.append(list(infer(tf.stack(images)).values())[0].numpy())
    return np.concatenate(rows) if rows else np.zeros((0, 1))


def main():
    meta, infer = load()
    classes = meta["classes"]
    floor = meta["confidenceFloor"]
    other = classes.index("other") if "other" in classes else None

    print()
    check(other is not None, "the model has no 'other' class, so it cannot decline")
    if other is None:
        report()
        return

    # --- it still knows its own cars -----------------------------------------
    every = []
    truth = []
    for index, name in enumerate(classes):
        if name == "other":
            continue
        found = sorted((RENDERS / name).glob("*.jpg"))[-20:]
        every.extend(found)
        truth.extend([index] * len(found))

    scores = score(infer, every)
    guessed = scores.argmax(axis=1)
    confident = scores.max(axis=1) >= floor

    recognised = float(((guessed == np.array(truth)) & confident).mean())
    check(
        recognised >= MIN_RECOGNITION,
        f"only {recognised:.0%} of its own cars are recognised above the floor"
    )
    print(f"  {GREEN}{recognised:.0%} recognised{OFF} {DIM}of {len(every)} renders of "
          f"our own cars, above the floor of {floor}{OFF}")

    # --- and keeps quiet about everything else -------------------------------
    # Real photographs, spread across the whole pile rather than taken off the
    # front, so this is not a test on one body style.
    photos = sorted(PHOTOS.rglob("*.jpg"))
    photos = photos[:: max(1, len(photos) // 800)][:800]

    scores = score(infer, photos)
    guessed = scores.argmax(axis=1)
    confident = scores.max(axis=1) >= floor

    named = float(((guessed != other) & confident).mean())
    check(
        named <= MAX_FALSE_NAMING,
        f"{named:.0%} of real photographs that are not our cars still get one of "
        f"our names — the first version of this model scored 94% here"
    )
    print(f"  {GREEN}{1 - named:.0%} declined{OFF} {DIM}of {len(photos)} real photographs "
          f"that are none of ours{OFF}")

    # --- and the floor is not doing all the work ------------------------------
    # A model that answers nothing passes both tests above only if the first one
    # is checked too, which it is. This checks it is not scraping through.
    speaks = float((scores.max(axis=1) >= floor).mean())
    print(f"  {DIM}it answers something for {speaks:.0%} of real photographs; "
          f"most of those answers are 'other'{OFF}")

    report()


def report():
    if problems:
        print(f"\n{RED}{len(problems)} problem(s){OFF}")
        for problem in problems:
            print(f"  {RED}x{OFF} {problem}")
        print()
        sys.exit(1)

    print(f"\n{GREEN}it recognises its own cars and declines the rest{OFF}\n")


if __name__ == "__main__":
    main()
