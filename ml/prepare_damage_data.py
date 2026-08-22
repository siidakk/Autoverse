"""Turns CarDD into the folder of crops that train_damage.py expects.

    python prepare_damage_data.py

CarDD gives 2,816 photographs with 6,211 boxes drawn round the damage on them.
Two things follow from that, and both matter.

First, the unit of training is the box, not the photograph. A picture of a car
with a scratch on one door is mostly undamaged car; feeding the whole frame in
teaches the model about bonnets. Cropping to the labelled region teaches it
what a scratch looks like.

Second, a classifier trained only on damage will call everything damage,
because it has never been shown anything else. So crops that overlap nothing
are cut from the same photographs and kept as `undamaged`. Those negatives are
the reason the finished scan can look at a clean panel and say so -- which is
precisely what the hand written version could not do.

Each crop is taken with a margin of context around the box. Damage is partly
recognisable by how it interrupts a surface, and a crop cut exactly to the
box throws that away.

Licence: CarDD is for non-commercial research and education, and the images
are from Flickr and Shutterstock under their terms. Nothing derived from it is
committed to this repository.
"""

import json
import pathlib
import random
import sys

from PIL import Image

HERE = pathlib.Path(__file__).parent
OUT = HERE / "data" / "damage"

SEED = 20260822
CONTEXT = 0.25      # margin round each box, as a share of its size
MIN_PIXELS = 40     # below this a crop carries no usable detail
NEGATIVES_PER_IMAGE = 2
MAX_OVERLAP = 0.02  # a negative may not share more than this with any box


def source():
    """The downloaded dataset, wherever the hub cache put it."""
    try:
        from huggingface_hub import snapshot_download
    except ImportError:
        sys.exit("\n  pip install huggingface_hub\n")

    path = snapshot_download(
        "harpreetsahota/CarDD",
        repo_type="dataset",
        allow_patterns=["data/*.jpg", "samples.json"],
        max_workers=8,
    )
    return pathlib.Path(path)


def overlap(a, b):
    """Shared area of two boxes as a share of the smaller one."""
    ax, ay, aw, ah = a
    bx, by, bw, bh = b

    left = max(ax, bx)
    top = max(ay, by)
    right = min(ax + aw, bx + bw)
    bottom = min(ay + ah, by + bh)

    if right <= left or bottom <= top:
        return 0.0

    shared = (right - left) * (bottom - top)
    return shared / max(min(aw * ah, bw * bh), 1e-9)


def widen(box, width, height):
    """Box in pixels, with context around it, clamped to the image."""
    x, y, w, h = box

    x -= w * CONTEXT / 2
    y -= h * CONTEXT / 2
    w *= 1 + CONTEXT
    h *= 1 + CONTEXT

    left = max(int(x * width), 0)
    top = max(int(y * height), 0)
    right = min(int((x + w) * width), width)
    bottom = min(int((y + h) * height), height)

    return left, top, right, bottom


def main():
    random.seed(SEED)

    print("\n  Locating CarDD")
    root = source()

    samples = json.loads((root / "samples.json").read_text(encoding="utf-8"))["samples"]
    print(f"  {len(samples)} photographs")

    if OUT.exists():
        print(f"  Clearing {OUT}")
        for child in OUT.rglob("*"):
            if child.is_file():
                child.unlink()

    written = {}
    skipped = 0

    for index, sample in enumerate(samples, 1):
        image_path = root / sample["filepath"]
        if not image_path.exists():
            skipped += 1
            continue

        try:
            image = Image.open(image_path).convert("RGB")
        except Exception:
            skipped += 1
            continue

        width, height = image.size
        boxes = [
            (detection["label"], detection["bounding_box"])
            for detection in (sample.get("detections") or {}).get("detections", [])
            if detection.get("bounding_box")
        ]

        # --- the damage itself ---
        for order, (label, box) in enumerate(boxes):
            left, top, right, bottom = widen(box, width, height)
            if right - left < MIN_PIXELS or bottom - top < MIN_PIXELS:
                continue

            name = label.replace(" ", "_")
            folder = OUT / name
            folder.mkdir(parents=True, exist_ok=True)

            image.crop((left, top, right, bottom)).save(
                folder / f"{image_path.stem}_{order}.jpg", quality=90
            )
            written[name] = written.get(name, 0) + 1

        # --- and somewhere on the same car that is not damaged ---
        folder = OUT / "undamaged"
        folder.mkdir(parents=True, exist_ok=True)

        taken = 0

        # Tries several times because a heavily damaged photograph may have
        # little clear space left to cut from, and giving up on it is better
        # than shrinking the crop until it is meaningless.
        for attempt in range(NEGATIVES_PER_IMAGE * 6):
            if taken >= NEGATIVES_PER_IMAGE:
                break

            # Sized like the real boxes are, so the negatives are not all
            # enormous and trivially different.
            size = random.uniform(0.08, 0.35)
            aspect = random.uniform(0.6, 1.7)
            w = min(size * aspect, 0.9)
            h = min(size / aspect, 0.9)
            x = random.uniform(0, 1 - w)
            y = random.uniform(0, 1 - h)

            candidate = (x, y, w, h)
            if any(overlap(candidate, box) > MAX_OVERLAP for _, box in boxes):
                continue

            left, top, right, bottom = widen(candidate, width, height)
            if right - left < MIN_PIXELS or bottom - top < MIN_PIXELS:
                continue

            image.crop((left, top, right, bottom)).save(
                folder / f"{image_path.stem}_{attempt}.jpg", quality=90
            )
            written["undamaged"] = written.get("undamaged", 0) + 1
            taken += 1

        if index % 250 == 0:
            print(f"  {index}/{len(samples)}")

    print(f"\n  Written to {OUT}")
    for name, count in sorted(written.items(), key=lambda item: -item[1]):
        print(f"    {name:16} {count:6}")

    if skipped:
        print(f"\n  {skipped} photographs skipped (missing or unreadable)")

    print("\n  Now run train_damage.py\n")


if __name__ == "__main__":
    main()
