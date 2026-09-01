"""Converts the trained body-style model into something the browser can load.

    python export_bodystyle_tfjs.py

Writes into frontend/public/models/bodystyle/, served as a static file like the
cars are, so reading the shape of a car does not wait on anybody else's CDN.

The converter and its Windows workarounds live in tfjs_export.py, shared with
the damage model.
"""

import pathlib

from tfjs_export import export

HERE = pathlib.Path(__file__).parent
MODEL = HERE / "bodystyle" / "savedmodel"
META = HERE / "bodystyle" / "bodystyle.json"
OUT = HERE.parent / "frontend" / "public" / "models" / "bodystyle"


if __name__ == "__main__":
    export(MODEL, META, OUT, "train_bodystyle.py")
