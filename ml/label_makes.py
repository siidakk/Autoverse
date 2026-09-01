"""Recovers the make of every image prepare_bodystyle_data.py already wrote.

    python label_makes.py

Writes data/bodystyle/makes.json, a map from image path to manufacturer.

Why this rather than downloading again
--------------------------------------
The body-style pass threw the model name away: it filed each photograph under
its shape and named it by position, so 000123.jpg is the hundred and twenty
third row across the four parquet files in order. That position is enough to
get the label back, and the label column is four bytes a row against a quarter
of a megabyte for the picture -- so the make of all 15,534 images can be
recovered for a few megabytes of traffic instead of the two gigabytes it took
to fetch them.

What this is for
----------------
Body style answers "that is an SUV", which is a shape. The complaint was that
the page should recognise cars. Stanford's class names carry the manufacturer,
so the same photographs can train a second, harder question -- whose car is
this -- without another download.

The limit is worth reading before trusting it. Stanford is an American dataset
and its 49 makes cover 18 of the 31 brands in the Indian catalogue: Toyota,
Hyundai, Honda, BMW, Mercedes-Benz, Audi, Volkswagen, Jeep, Nissan, Volvo and
the exotics. It has never seen a Maruti Suzuki, a Tata, a Mahindra or a Kia,
and between them those are most of what is sold in India. A classifier cannot
name what it has never been shown, so whatever this scores, it scores on
eighteen brands and is blind to the rest by construction.
"""

import json
import pathlib
from collections import Counter

import pyarrow.parquet as pq
from datasets import load_dataset_builder
from huggingface_hub import HfFileSystem

from prepare_bodystyle_data import DATASET, PARQUET, body_of

HERE = pathlib.Path(__file__).parent
OUT = HERE / "data" / "bodystyle"
LABELS = OUT / "makes.json"

# Two-word manufacturers, which splitting on whitespace would cut in half.
COMPOUND = {"Land": "Land Rover", "Aston": "Aston Martin", "AM": "AM General"}


def make_of(class_name):
    """The manufacturer out of a Stanford class name."""
    first = class_name.split()[0]
    return COMPOUND.get(first, first)


def main():
    names = load_dataset_builder(DATASET).info.features["label"].names
    bodies = [body_of(name) for name in names]
    makes = [make_of(name) for name in names]

    filesystem = HfFileSystem()
    found = {}
    position = 0

    print(f"\n  Reading the label column of {len(PARQUET)} files\n")

    for filename in PARQUET:
        # Cached per file. Reading one label column over range requests takes a
        # few minutes -- the column is scattered across forty-one row groups,
        # so it is forty-one round trips -- and losing all of it because the
        # run was interrupted on the last file is a poor trade for a few
        # kilobytes of disk.
        cache = OUT / f".labels-{pathlib.Path(filename).stem}.json"

        if cache.exists():
            labels = json.loads(cache.read_text(encoding="utf-8"))
            print(f"    {pathlib.Path(filename).name:34} cached")
        else:
            with filesystem.open(f"datasets/{DATASET}/{filename}", "rb") as handle:
                labels = pq.ParquetFile(handle).read(columns=["label"])
                labels = labels.column("label").to_pylist()
            cache.write_text(json.dumps(labels), encoding="utf-8")

        for row, label in enumerate(labels):
            position += 1
            body = bodies[label]
            if body is None:
                continue

            path = OUT / body / f"{position:06d}.jpg"
            if path.exists():
                found[str(path.relative_to(OUT)).replace("\\", "/")] = makes[label]

        print(f"    {pathlib.Path(filename).name:34} {len(found):>6,} matched")

    LABELS.write_text(json.dumps(found, indent=0), encoding="utf-8")

    counted = Counter(found.values())
    print(f"\n  {len(found):,} images labelled across {len(counted)} makes")
    print(f"  written {LABELS}\n")

    print("  most represented:")
    for make, count in counted.most_common(12):
        print(f"    {make:16} {count:>5}")

    thin = [make for make, count in counted.items() if count < 80]
    print(f"\n  {len(thin)} makes with fewer than 80 photographs: {', '.join(sorted(thin))}\n")


if __name__ == "__main__":
    main()
