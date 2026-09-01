"""Builds a body-style training set out of Stanford Cars.

    python prepare_bodystyle_data.py

Writes data/bodystyle/<Body>/*.jpg, one folder per class, which is the same
shape prepare_damage_data.py produces and train_bodystyle.py reads.

Why this dataset, when the cars are American
--------------------------------------------
The photo page guessed body style from the *aspect ratio of the detection box*:
wider than 2.4 meant a saloon, narrower than 1.5 a hatchback. That number
describes where the photographer stood, not what the car is. Shoot a Creta from
the side and it was a saloon; step round to three quarters and the same car
became a hatchback. It was not a weak model, it was a measurement that carries
almost no information about the answer, and it is why the feature felt erratic.

Replacing it wants a real classifier, and a classifier wants labelled photos.
There is no public dataset of Indian cars by make and model -- the whole of
Hugging Face has vehicle *type* sets and one CC-BY-NC-ND set of about a hundred
images, and nothing else. So naming a Baleno from a photograph is off the table
and is not what this trains.

Body style is a different question, and it travels. A three box saloon has the
same silhouette in Detroit as in Delhi; a bonnet, a cabin and a boot is a shape,
not a market. Stanford Cars has 16,185 photographs across 196 models, and the
body is written in the class name -- "BMW 3 Series Sedan 2012" -- so the labels
come free.

Two limitations, stated here rather than discovered later:

  * The cars are American and stop at 2012, so the hatchbacks are Golf shaped
    rather than the tall narrow city cars that make up most of India's. Expect
    this to be its weakest class, and it is the one that matters most here.
  * Stanford's own labels are loose. It files the Acura ZDX, a coupe roofed
    crossover, under Hatchback. That noise is in the training data and there is
    no fixing it without relabelling by hand.

Both of which still leave it enormously better than a number that changes when
you take a step to the left.
"""

import io
import pathlib
from collections import Counter

import pyarrow.parquet as pq
from datasets import load_dataset_builder
from huggingface_hub import HfFileSystem
from PIL import Image

HERE = pathlib.Path(__file__).parent
OUT = HERE / "data" / "bodystyle"

DATASET = "tanganke/stanford_cars"

# The four files with the photographs in.
#
# The repository is six gigabytes: as well as train and test it holds seven
# corrupted copies of the test set -- blurred, pixelated, speckled -- for
# benchmarking robustness, which are of no use here. load_dataset() fetches the
# lot, so the files are named explicitly.
#
# The test half went in on a second pass, and the reason is a measurement.
#
# Trained on the train half alone the head scored 72.4% overall but only 0.44
# recall on Hatchback -- against 0.91 on Pickup and 0.84 on MPV. Hatchback is
# the most common body on Indian roads, so the one class that matters most here
# was the one it was worst at, and it was also the second smallest: 582 images
# against Sedan's 2,075. Doubling the source roughly doubles the thin classes,
# which is the cheapest thing available that addresses the actual weakness.
#
# The split this is measured on is carved out of the whole lot at training
# time. Stanford's own train/test division exists so people can compare numbers
# on their 196 class problem; this is a seven class one and does not need it.
PARQUET = [
    "data/train-00000-of-00002.parquet",
    "data/train-00001-of-00002.parquet",
    "data/test-00000-of-00002.parquet",
    "data/test-00001-of-00002.parquet",
]
ATTRIBUTION = (
    "Stanford Cars (Krause et al., 3D Object Representations for "
    "Fine-Grained Categorization, ICCV Workshops 2013)"
)

# Longest edge of what gets written. Training reads at 224; a little headroom
# leaves room for a random crop without upscaling.
SAVE_SIZE = 256

# The vocabulary the rest of the site speaks, so a prediction can be handed
# straight to the garage and the catalogue without translation.
#
# Wagon is deliberately absent. Stanford has six wagon classes and India has
# essentially no estates, so they are dropped rather than forced into a class
# they would only blur.
BODY_FROM_TOKEN = {
    "Sedan": "Sedan",
    "SUV": "SUV",
    "Hatchback": "Hatchback",
    "Coupe": "Coupe",
    "Convertible": "Convertible",
    "Van": "MPV",
    "Minivan": "MPV",
    "Cab": "Pickup",
    "SuperCab": "Pickup",
}

DROPPED_TOKENS = {"Wagon"}

# Fourteen classes are named after a trim rather than a body. They are listed
# out in full because guessing at them in code would be worse than knowing.
BODY_BY_NAME = {
    "Acura TL Type-S 2008": "Sedan",
    "Acura Integra Type R 2001": "Coupe",
    "Buick Regal GS 2012": "Sedan",
    "Chevrolet Corvette ZR1 2012": "Coupe",
    "Chevrolet Corvette Ron Fellows Edition Z06 2007": "Coupe",
    "Chevrolet Cobalt SS 2010": "Coupe",
    "Chevrolet TrailBlazer SS 2009": "SUV",
    "Chrysler 300 SRT-8 2010": "Sedan",
    "Dodge Challenger SRT8 2011": "Coupe",
    "Dodge Charger SRT-8 2009": "Sedan",
    "FIAT 500 Abarth 2012": "Hatchback",
    "Jaguar XK XKR 2012": "Coupe",
    "Lamborghini Gallardo LP 570-4 Superleggera 2012": "Coupe",
    # The HHR is a retro panel wagon and belongs with the wagons that are being
    # dropped, so it goes the same way.
    "Chevrolet HHR SS 2010": None,
}


def body_of(class_name):
    """The body style this class name describes, or None to leave it out."""
    if class_name in BODY_BY_NAME:
        return BODY_BY_NAME[class_name]

    words = set(class_name.split())

    if words & DROPPED_TOKENS:
        return None

    for token, body in BODY_FROM_TOKEN.items():
        if token in words:
            return body

    return None


def shrink(image):
    """Down to SAVE_SIZE on the long edge, in RGB."""
    image = image.convert("RGB")
    width, height = image.size
    scale = SAVE_SIZE / max(width, height)

    if scale < 1:
        image = image.resize(
            (max(1, round(width * scale)), max(1, round(height * scale)))
        )

    return image


def main():
    # Class names come from the dataset metadata, which is a few kilobytes.
    # Only the photographs are worth fetching in bulk.
    names = load_dataset_builder(DATASET).info.features["label"].names
    bodies = [body_of(name) for name in names]

    left_out = sorted({
        name for name, body in zip(names, bodies) if body is None
    })

    print(f"\n{len(names)} models, of which {len(left_out)} have no usable body.")

    written = Counter()
    position = 0

    # Streamed a row group at a time rather than downloaded whole.
    #
    # These are half-gigabyte files and hf_hub_download stalls on them here --
    # it opens the transfer and then sits at zero bytes indefinitely, while a
    # four megabyte file from the same repository comes down fine. Reading the
    # parquet over range requests sidesteps whatever that is, and has two
    # advantages besides: nothing needs half a gigabyte of disk on top of the
    # JPEGs it becomes, and every image written is progress kept. Interrupt
    # this and it resumes from where the folders left off.
    filesystem = HfFileSystem()

    for filename in PARQUET:
        remote = f"datasets/{DATASET}/{filename}"

        with filesystem.open(remote, "rb") as handle:
            parquet = pq.ParquetFile(handle)
            groups = parquet.metadata.num_row_groups

            print(f"\n  {pathlib.Path(filename).name}  "
                  f"{parquet.metadata.num_rows:,} photographs in {groups} groups")

            # Is this file already on disk? Answered by reading the label
            # column on its own, which is four bytes a row against a quarter of
            # a megabyte for the picture, so it costs nothing to ask.
            #
            # Worth asking because adding the test shards meant a second run,
            # and without this it re-streamed a gigabyte of train photographs
            # it already had: decoding every row group in full only to find the
            # JPEG it would have written was already there.
            labels = parquet.read(columns=["label"]).column("label").to_pylist()
            expected = [
                OUT / bodies[label] / f"{position + row + 1:06d}.jpg"
                for row, label in enumerate(labels)
                if bodies[label] is not None
            ]

            if expected and all(path.exists() for path in expected):
                print(f"    already have all {len(expected):,} of these")
                for path in expected:
                    written[path.parent.name] += 1
                position += len(labels)
                continue

            for index in range(groups):
                batch = parquet.read_row_group(index, columns=["image", "label"])

                for image_cell, label in zip(
                    batch.column("image").to_pylist(),
                    batch.column("label").to_pylist(),
                ):
                    position += 1
                    body = bodies[label]
                    if body is None:
                        continue

                    folder = OUT / body
                    folder.mkdir(parents=True, exist_ok=True)

                    target = folder / f"{position:06d}.jpg"
                    if target.exists():
                        written[body] += 1
                        continue

                    with Image.open(io.BytesIO(image_cell["bytes"])) as image:
                        shrink(image).save(target, quality=90)

                    written[body] += 1

                if (index + 1) % 5 == 0 or index + 1 == groups:
                    print(f"    group {index + 1:>3}/{groups}  "
                          f"{sum(written.values()):>6,} kept", flush=True)

    print("\n  Images a class:")
    for body, count in written.most_common():
        print(f"    {body:12} {count:>6,}")

    print(f"\n  Left out: {', '.join(left_out[:4])}"
          f"{' and %d more' % (len(left_out) - 4) if len(left_out) > 4 else ''}")

    print(f"\n  Written to {OUT}")
    print(f"  Source: {ATTRIBUTION}\n")


if __name__ == "__main__":
    main()
