"""Converts the trained damage model into something the browser can load.

    python export_damage_tfjs.py

Writes into frontend/public/models/damage/, which is served as a static file
like the cars are, so the first scan does not wait on someone else's CDN. The
detector already on the photo page does, and it costs a minute on a cold visit.

Needs the converter, which is not in requirements.txt because it drags in a
large dependency tree that nothing else here wants:

    pip install tensorflowjs
"""

import json
import pathlib
import shutil
import subprocess
import sys

HERE = pathlib.Path(__file__).parent
MODEL = HERE / "damage" / "savedmodel"
META = HERE / "damage" / "damage.json"
OUT = HERE.parent / "frontend" / "public" / "models" / "damage"


def main():
    if not MODEL.exists():
        sys.exit(f"\n  No exported model at {MODEL}. Run train_damage.py first.\n")

    try:
        import tensorflowjs  # noqa: F401
    except ImportError:
        sys.exit(
            "\n  The converter is missing. Install it with:\n\n"
            "    pip install tensorflowjs\n\n"
            "  It is kept out of requirements.txt because it pulls in a large\n"
            "  dependency tree that only this one step needs.\n"
        )

    OUT.mkdir(parents=True, exist_ok=True)

    print(f"\n  Converting {MODEL.name}")

    # Run as a subprocess rather than through the Python API: the converter's
    # own module has a habit of pinning versions against the installed
    # TensorFlow, and the command line entry point reports that clearly
    # instead of failing somewhere inside a graph rewrite.
    result = subprocess.run(
        [
            sys.executable,
            "-m",
            "tensorflowjs.converters.converter",
            "--input_format=tf_saved_model",
            "--output_format=tfjs_graph_model",
            # Sixteen bit weights halve the download for a loss that does not
            # show up in the held out numbers for a classifier this small.
            "--quantize_float16=*",
            str(MODEL),
            str(OUT),
        ],
        capture_output=True,
        text=True,
    )

    if result.returncode != 0:
        print(result.stdout)
        print(result.stderr)
        sys.exit("\n  Conversion failed.\n")

    # The labels and the measured accuracy travel with the weights, so the page
    # can say how good the model is without that number being hardcoded in two
    # places and drifting apart.
    if META.exists():
        shutil.copy(META, OUT / "damage.json")

    total = sum(p.stat().st_size for p in OUT.rglob("*") if p.is_file())
    print(f"\n  Wrote {OUT} ({total / 1_000_000:.1f} MB)")

    if META.exists():
        meta = json.loads(META.read_text())
        print(
            f"  {len(meta['classes'])} classes, "
            f"{meta['accuracy']:.1%} on {meta['testedOn']} held out images\n"
        )


if __name__ == "__main__":
    main()
