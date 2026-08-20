"""Recommendation service.

Takes what a buyer can actually say about themselves, a budget, a fuel, how many
people they carry, how they drive, and turns it into cars and the parts to put
on them.

The ranking is content based filtering: hard filters remove anything that cannot
work, then the remaining models are scored by weighted distance from an ideal
built out of the stated preferences. Every result carries the reasons it was
picked, because a recommendation nobody can question is not much use.
"""

from pathlib import Path

import joblib
import numpy as np
import pandas as pd
from flask import Flask, jsonify, request
from flask_cors import CORS

BASE_DIR = Path(__file__).resolve().parent

bundle = joblib.load(BASE_DIR / "recommender.pkl")
price_model = joblib.load(BASE_DIR / "price_model.pkl")
valuation = joblib.load(BASE_DIR / "valuation.pkl")

catalogue = bundle["catalogue"]
scaler = bundle["scaler"]
FEATURES = bundle["features"]
LATEST_YEAR = bundle["latest_year"]

app = Flask(__name__)
CORS(app)

# How hard each preference pulls on the ranking. Budget dominates because it is
# the one thing a buyer cannot bend.
WEIGHTS = {
    "price": 2.4,
    "power": 1.0,
    "mileage": 1.0,
    "seats": 1.6,
    "engine_cc": 0.6,
}

DRIVING = {
    "calm": {"power": 0.25, "mileage": 1.6, "engine": 0.3},
    "balanced": {"power": 0.5, "mileage": 1.0, "engine": 0.5},
    "spirited": {"power": 0.9, "mileage": 0.5, "engine": 0.85},
}

USAGE = {
    "city": 1.5,
    "mixed": 1.0,
    "highway": 0.7,
}

PRIORITY = {
    "value": {"price": 3.0, "mileage": 1.5},
    "balanced": {},
    "comfort": {"seats": 2.2, "mileage": 0.8},
    "performance": {"power": 2.4, "engine_cc": 1.4, "mileage": 0.4},
}


def rupees(value):
    return int(round(float(value)))


def build_target(preferences):
    """The car the stated preferences describe, in the same space as the index."""
    budget = preferences["budget"]
    style = DRIVING[preferences["driving"]]

    span = catalogue["power"]
    power_target = span.quantile(style["power"])
    engine_target = catalogue["engine_cc"].quantile(style["engine"])

    # Wanting economy means wanting a high number, so the quantile is inverted.
    mileage_pull = min(0.95, 0.45 * USAGE[preferences["usage"]] * style["mileage"])
    mileage_target = catalogue["mileage"].quantile(mileage_pull)

    return pd.DataFrame([{
        # People buy near the top of what they will spend, not at the bottom.
        "price": budget * 0.85,
        "power": power_target,
        "mileage": mileage_target,
        "seats": preferences["seats"],
        "engine_cc": engine_target,
    }])[FEATURES]


def eligible(preferences):
    """Everything that could actually be bought, before anything is ranked."""
    budget = preferences["budget"]
    fuel = preferences["fuel"]
    seats = preferences["seats"]

    rows = catalogue[catalogue["price"] <= budget * 1.05]

    if fuel != "any":
        rows = rows[rows["fuels"].apply(lambda options: fuel in options)]

    if preferences["transmission"] != "any":
        rows = rows[
            rows["transmissions"].apply(
                lambda options: preferences["transmission"] in options
            )
        ]

    rows = rows[rows["seats"] >= seats]

    if preferences["body"] != "any":
        rows = rows[rows["body"] == preferences["body"]]

    return rows


def weights_for(preferences):
    weights = dict(WEIGHTS)
    for key, value in PRIORITY[preferences["priority"]].items():
        weights[key] = value
    return np.array([weights[name] for name in FEATURES])


def fair_price(row):
    """What the price model thinks this specification is worth, well kept."""
    frame = pd.DataFrame([{
        "max_power": row["power"],
        "engine": row["engine_cc"],
        "mileage_kmpl": row["mileage"],
        "seats": row["seats"],
        # Valued at the age these listings typically are, so the verdict
        # compares like with like rather than pricing a new one against a
        # median that includes ten year old cars.
        "age": max(LATEST_YEAR - int(row["year_typical"]), 1),
        "km_driven": 60000,
        "fuel": row["fuels"][0],
        "transmission": row["transmissions"][0],
        "owner": "First Owner",
        "seller_type": "Dealer",
    }])

    return float(np.expm1(price_model.predict(frame)[0]))


def reasons_for(row, preferences):
    reasons = []

    share = row["price"] / preferences["budget"]
    if share <= 0.75:
        reasons.append(f"{int((1 - share) * 100)}% under budget")
    else:
        reasons.append("Fits the budget")

    if preferences["fuel"] != "any":
        reasons.append(f"{preferences['fuel']} available")

    if row["seats"] > preferences["seats"]:
        reasons.append(f"Seats {row['seats']}, one more than asked")
    else:
        reasons.append(f"Seats {row['seats']}")

    if preferences["usage"] == "city" and row["mileage"] >= 18:
        reasons.append(f"{row['mileage']:.0f} kmpl in traffic")
    elif preferences["priority"] == "performance":
        reasons.append(f"{row['power']:.0f} bhp")
    else:
        reasons.append(f"{row['mileage']:.0f} kmpl")

    if row["popularity"] >= 0.25:
        reasons.append("Commonly owned, parts are easy")

    return reasons[:4]


# Which accessories suit which kind of car. This is the second half of what the
# recommender is for: the parts, not just the car.
def accessories_for(row, preferences):
    body = row["body"]
    sporty = preferences["priority"] == "performance" or preferences["driving"] == "spirited"
    premium = row["segment"] in ("Premium", "Luxury")

    picks = []

    if sporty:
        picks.append({"category": "wheels", "value": "sport", "why": "Matches how you drive"})
        picks.append({"category": "wheelSize", "value": 2, "why": "Fills the arches"})
        picks.append({
            "category": "spoiler",
            "value": "racing" if body in ("Hatchback", "Sedan") else "sport",
            "why": "Suits the shape"
        })
        picks.append({"category": "stance", "value": 0.45, "why": "Lowered, not slammed"})
    elif premium:
        picks.append({"category": "wheels", "value": "sport", "why": "Cleaner than the stock rim"})
        picks.append({"category": "tint", "value": "dark", "why": "Usual on this segment"})
        picks.append({"category": "wrap", "value": "roof", "why": "Contrast roof, common here"})
    else:
        picks.append({"category": "wheels", "value": "classic", "why": "Honest and cheap to keep"})
        picks.append({"category": "tint", "value": "light", "why": "Cuts the heat"})

    if body in ("SUV", "MPV"):
        picks.append({"category": "exhaust", "value": "twin", "why": "Sits well under a high bumper"})
    elif sporty:
        picks.append({"category": "exhaust", "value": "quad", "why": "Matches the build"})

    if preferences["usage"] == "highway":
        picks.append({"category": "headlights", "value": "xenon", "why": "Worth it after dark"})

    return picks[:5]


@app.route("/health", methods=["GET"])
def health():
    return jsonify({"status": "ok", "models": int(len(catalogue))})


@app.route("/meta", methods=["GET"])
def meta():
    """What the front end should offer, taken from the data rather than guessed."""
    fuels = sorted({fuel for options in catalogue["fuels"] for fuel in options})

    return jsonify({
        "fuels": fuels,
        "bodies": sorted(catalogue["body"].unique().tolist()),
        "seats": sorted(int(seat) for seat in catalogue["seats"].unique()),
        "priceRange": [rupees(catalogue["price"].min()), rupees(catalogue["price"].max())],
        "models": int(len(catalogue)),
    })


@app.route("/recommend", methods=["POST"])
def recommend():
    data = request.json or {}

    preferences = {
        "budget": float(data.get("budget", 600000)),
        "fuel": data.get("fuel", "any"),
        "transmission": data.get("transmission", "any"),
        "seats": int(data.get("seats", 5)),
        "body": data.get("body", "any"),
        "driving": data.get("driving", "balanced"),
        "usage": data.get("usage", "mixed"),
        "priority": data.get("priority", "balanced"),
    }

    if preferences["driving"] not in DRIVING:
        preferences["driving"] = "balanced"
    if preferences["usage"] not in USAGE:
        preferences["usage"] = "mixed"
    if preferences["priority"] not in PRIORITY:
        preferences["priority"] = "balanced"

    rows = eligible(preferences)

    if rows.empty:
        return jsonify({
            "results": [],
            "message": "Nothing in the data fits that. Try raising the budget or "
                       "asking for fewer seats."
        })

    # Content based filtering: distance from the ideal the preferences describe,
    # measured on standardised features so rupees cannot drown out seats.
    target = scaler.transform(build_target(preferences))[0]
    points = scaler.transform(rows[FEATURES])
    weights = weights_for(preferences)

    distance = np.sqrt((((points - target) * weights) ** 2).sum(axis=1))

    # A nudge towards cars people actually own, which is as close to a
    # collaborative signal as this data gets.
    score = distance - rows["popularity"].to_numpy() * 0.35

    rows = rows.assign(distance=distance, score=score).sort_values("score")
    top = rows.head(5)

    spread = float(max(top["score"].max() - top["score"].min(), 1e-6))

    results = []
    for _, row in top.iterrows():
        worth = fair_price(row)
        gap = (worth - row["price"]) / worth

        results.append({
            "brand": row["brand"],
            "model": row["model"],
            "price": rupees(row["price"]),
            "priceRange": [rupees(row["price_low"]), rupees(row["price_high"])],
            "power": round(float(row["power"]), 1),
            "engine": rupees(row["engine_cc"]),
            "mileage": round(float(row["mileage"]), 1),
            "seats": int(row["seats"]),
            "body": row["body"],
            "segment": row["segment"],
            "fuels": list(row["fuels"]),
            "transmissions": list(row["transmissions"]),
            "listings": int(row["listings"]),
            "match": round(float(100 - (row["score"] - top["score"].min()) / spread * 22), 1),
            "reasons": reasons_for(row, preferences),
            "valuation": {
                "fair": rupees(worth),
                "verdict": "under" if gap > 0.08 else "over" if gap < -0.08 else "fair"
            },
            "accessories": accessories_for(row, preferences),
        })

    return jsonify({"results": results, "considered": int(len(rows))})


# ---------------------------------------------------------------- valuation

def valuation_frame(data, age=None, km=None):
    """One row in the shape the valuation model was trained on."""
    return pd.DataFrame([{
        "age": age if age is not None else float(data["age"]),
        "km_driven": km if km is not None else float(data["km"]),
        "max_power": float(data["power"]),
        "engine": float(data["engine"]),
        "mileage_kmpl": float(data["mileage"]),
        "seats": float(data["seats"]),
        "brand": data["brand"],
        "fuel": data["fuel"],
        "transmission": data["transmission"],
        "owner": data["owner"],
        "seller_type": data.get("seller", "Individual"),
    }])


@app.route("/valuation/options", methods=["GET"])
def valuation_options():
    """Everything the form needs, including the specs of each known model so a
    seller does not have to know their own engine capacity."""
    known = catalogue.sort_values(["brand", "model"])

    return jsonify({
        "models": [
            {
                "brand": row["brand"],
                "model": row["model"],
                "power": round(float(row["power"]), 1),
                "engine": int(row["engine_cc"]),
                "mileage": round(float(row["mileage"]), 1),
                "seats": int(row["seats"]),
                "fuels": list(row["fuels"]),
                "transmissions": list(row["transmissions"]),
                "typical": rupees(row["price"]),
            }
            for _, row in known.iterrows()
        ],
        "owners": valuation["owners"],
        "sellers": ["Individual", "Dealer", "Trustmark Dealer"],
        "years": [1995, LATEST_YEAR],
        "accuracy": {
            "chosen": valuation["chosen"],
            "r2": round(valuation["metrics"][valuation["chosen"]]["r2"], 3),
            "typicalError": round(valuation["metrics"][valuation["chosen"]]["mape"], 1),
            "within20": round(valuation["metrics"][valuation["chosen"]]["within20"], 1),
            "coverage": round(valuation["coverage"], 1),
            "compared": {
                name: round(scores["r2"], 3)
                for name, scores in valuation["metrics"].items()
            },
        },
    })


@app.route("/valuation", methods=["POST"])
def value_car():
    data = request.json or {}

    try:
        frame = valuation_frame(data)
    except (KeyError, TypeError, ValueError):
        return jsonify({"error": "Missing or invalid car details."}), 400

    estimate = float(np.expm1(valuation["model"].predict(frame)[0]))
    low = float(np.expm1(valuation["low"].predict(frame)[0]))
    high = float(np.expm1(valuation["high"].predict(frame)[0]))

    # The quantile models are fitted separately and can cross on unusual cars.
    low, high = min(low, high), max(low, high)

    # What the same car is worth as it ages, which is the shape of the answer
    # rather than a single number.
    age_now = int(float(data["age"]))
    curve = []
    for age in range(0, 16):
        predicted = float(np.expm1(
            valuation["model"].predict(
                valuation_frame(data, age=age, km=max(age, 0) * 12000)
            )[0]
        ))
        curve.append({"age": age, "value": rupees(predicted), "now": age == age_now})

    return jsonify({
        "estimate": rupees(estimate),
        "range": [rupees(low), rupees(high)],
        "curve": curve,
        "model": valuation["chosen"],
    })


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=8000)
