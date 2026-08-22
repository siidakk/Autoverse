"""Converts the trained damage model into something the browser can load.

    python export_damage_tfjs.py

Writes into frontend/public/models/damage/, which is served as a static file
like the cars are, so the first scan does not wait on someone else's CDN. The
object detector on the photo page does, and it costs about a minute on a cold
visit.

Install the converter with its dependencies skipped:

    pip install --no-deps tensorflowjs==4.22.0 tf_keras==2.18.0

4.22 rather than the newest, to match @tensorflow/tfjs-converter in the
frontend. `--no-deps` because the full dependency list does not install on
Windows: it wants uvloop, which has no Windows build at all.

Three of the converter's imports then have to be worked around, and all three
are things this model does not use:

  tensorflow_decision_forests  ships no Windows binary
  tensorflow_hub               wants pkg_resources, which modern setuptools
                               no longer provides
  jax                          only needed to convert JAX models

They are stubbed rather than installed. Keras is imported for real first,
because it probes for jax itself and copes when jax is genuinely missing --
it is only a half-built stub that confuses it.
"""

import json
import pathlib
import shutil
import sys
import types

HERE = pathlib.Path(__file__).parent
MODEL = HERE / "damage" / "savedmodel"
META = HERE / "damage" / "damage.json"
OUT = HERE.parent / "frontend" / "public" / "models" / "damage"


def load_converter():
    """The converter, with the parts that do not build on Windows stubbed."""
    import tensorflow  # noqa: F401
    import keras.src.backend.tensorflow.trainer  # noqa: F401

    for name in (
        "tensorflow_decision_forests",
        "tensorflow_hub",
        "jax",
        "jax.experimental",
        "jax.experimental.jax2tf",
    ):
        stub = types.ModuleType(name)
        stub.keras = types.SimpleNamespace(RandomForestModel=object)
        stub.KerasLayer = object
        stub.jax2tf = types.SimpleNamespace(convert=None)
        sys.modules[name] = stub

    from tensorflowjs.converters import tf_saved_model_conversion_v2

    return tf_saved_model_conversion_v2


def main():
    if not MODEL.exists():
        sys.exit(f"\n  No exported model at {MODEL}. Run train_damage.py first.\n")

    try:
        convert = load_converter()
    except ImportError as error:
        sys.exit(
            f"\n  The converter is not installed ({error}).\n\n"
            "    pip install --no-deps tensorflowjs==4.22.0 tf_keras==2.18.0\n"
        )

    OUT.mkdir(parents=True, exist_ok=True)

    print(f"\n  Converting {MODEL}")

    convert.convert_tf_saved_model(
        str(MODEL),
        str(OUT),
        # Sixteen bit weights halve the download for a loss that does not show
        # up in the held out numbers for a classifier this small.
        quantization_dtype_map={"float16": "*"},
    )

    # The labels and the measured accuracy travel with the weights, so the page
    # can say how good the model is without that number being written down in
    # two places and drifting apart.
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
