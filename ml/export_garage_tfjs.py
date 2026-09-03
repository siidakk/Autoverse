"""Converts the garage classifier into something the browser can load.

    python export_garage_tfjs.py

Writes into frontend/public/models/garage/.

The converter and its Windows workarounds live in tfjs_export.py, shared with
the damage, body-style and make models.
"""

import pathlib

from tfjs_export import export

HERE = pathlib.Path(__file__).parent
MODEL = HERE / "garage" / "savedmodel"
META = HERE / "garage" / "garage.json"
OUT = HERE.parent / "frontend" / "public" / "models" / "garage"


if __name__ == "__main__":
    export(MODEL, META, OUT, "train_garage.py")
