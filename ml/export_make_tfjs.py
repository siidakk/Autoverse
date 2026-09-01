"""Converts the trained make classifier into something the browser can load.

    python export_make_tfjs.py

Writes into frontend/public/models/make/, served as a static file like the cars
are, so reading a badge does not wait on anybody else's CDN.

The converter and its Windows workarounds live in tfjs_export.py, shared with
the damage and body-style models.
"""

import pathlib

from tfjs_export import export

HERE = pathlib.Path(__file__).parent
MODEL = HERE / "make" / "savedmodel"
META = HERE / "make" / "make.json"
OUT = HERE.parent / "frontend" / "public" / "models" / "make"


if __name__ == "__main__":
    export(MODEL, META, OUT, "train_make.py")
