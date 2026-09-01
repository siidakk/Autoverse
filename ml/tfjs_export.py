"""Turning a trained SavedModel into something the browser can load.

Shared by export_damage_tfjs.py and export_bodystyle_tfjs.py, which are the
same job twice: the awkward part is not the conversion, it is getting the
converter to import at all on Windows, and that was not worth writing down two
different times and letting the two copies drift.

Install the converter with its dependencies skipped:

    pip install --no-deps tensorflowjs==4.22.0 tf_keras==2.18.0

4.22 rather than the newest, to match @tensorflow/tfjs-converter in the
frontend. `--no-deps` because the full dependency list does not install on
Windows: it wants uvloop, which has no Windows build at all.

Three of the converter's imports then have to be worked around, and all three
are things these models do not use:

  tensorflow_decision_forests  ships no Windows binary
  tensorflow_hub               wants pkg_resources, which modern setuptools
                               no longer provides
  jax                          only needed to convert JAX models

They are stubbed rather than installed. Keras is imported for real first,
because it probes for jax itself and copes when jax is genuinely missing -- it
is only a half-built stub that confuses it.
"""

import json
import shutil
import sys
import types


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


def export(model, meta, out, trainer):
    """Convert `model` into `out`, carrying `meta` alongside the weights.

    `trainer` is only used to say which script to run when the model is not
    there yet.
    """
    if not model.exists():
        sys.exit(f"\n  No exported model at {model}. Run {trainer} first.\n")

    try:
        convert = load_converter()
    except ImportError as error:
        sys.exit(
            f"\n  The converter is not installed ({error}).\n\n"
            "    pip install --no-deps tensorflowjs==4.22.0 tf_keras==2.18.0\n"
        )

    out.mkdir(parents=True, exist_ok=True)

    print(f"\n  Converting {model}")

    convert.convert_tf_saved_model(
        str(model),
        str(out),
        # Sixteen bit weights halve the download for a loss that does not show
        # up in the held out numbers for a classifier this small.
        quantization_dtype_map={"float16": "*"},
    )

    # The labels and the measured accuracy travel with the weights, so the page
    # can say how good the model is without that number being written down in
    # two places and drifting apart.
    if meta.exists():
        shutil.copy(meta, out / meta.name)

    total = sum(p.stat().st_size for p in out.rglob("*") if p.is_file())
    print(f"\n  Wrote {out} ({total / 1_000_000:.1f} MB)")

    if meta.exists():
        described = json.loads(meta.read_text(encoding="utf-8"))
        print(
            f"  {len(described['classes'])} classes, "
            f"{described['accuracy']:.1%} on {described['testedOn']} "
            "held out images\n"
        )
