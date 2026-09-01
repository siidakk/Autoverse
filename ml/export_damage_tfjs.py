"""Converts the trained damage model into something the browser can load.

    python export_damage_tfjs.py

Writes into frontend/public/models/damage/, which is served as a static file
like the cars are, so the first scan does not wait on someone else's CDN. The
object detector on the photo page does, and it costs about a minute on a cold
visit.

The converter and its Windows workarounds live in tfjs_export.py, shared with
the body-style model.
"""

import pathlib

from tfjs_export import export

HERE = pathlib.Path(__file__).parent
MODEL = HERE / "damage" / "savedmodel"
META = HERE / "damage" / "damage.json"
OUT = HERE.parent / "frontend" / "public" / "models" / "damage"


if __name__ == "__main__":
    export(MODEL, META, OUT, "train_damage.py")
