"""Builds the recommendation artefacts from the Indian market listings.

The previous model scored cars with a hand written formula and then trained a
regressor to predict that same formula from three of its own terms, which taught
it arithmetic rather than preference. Ranking by nearest score also meant two
unrelated cars could tie, which is how a query for a coupe came back with a
pickup.

This builds two things instead:

  * a catalogue of one row per model, aggregated from the listings, with a body
    style and a segment worked out from the name and the price
  * a nearest neighbour index over the specs that a buyer actually states a
    preference about, which is content based filtering

A price model is trained alongside it. It is what lets a recommendation say
whether a car is priced above or below what its specification is worth, and it
is the same model Phase 7 needs for resale estimates.

    python train_model.py
"""

import re

import joblib
import numpy as np
import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import mean_absolute_error, r2_score
from sklearn.model_selection import train_test_split
from sklearn.neighbors import NearestNeighbors
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder, StandardScaler

DATA = "cars_india.csv"
LATEST_YEAR = 2020  # the newest listings in this dataset

# Body style cannot be read off a column here, so it comes from the model name.
# Anything unmatched falls back to a guess from how many seats it has.
BODY_KEYWORDS = {
    "SUV": [
        "fortuner", "creta", "seltos", "scorpio", "xuv", "duster", "ecosport",
        "brezza", "venue", "harrier", "safari", "endeavour", "compass", "thar",
        "bolero", "tucson", "captur", "hexa", "terrano", "kicks", "gurkha",
        "pajero", "rexton", "land cruiser", "wrangler", "sportage", "santa fe",
        "innova", "carnival", "quanto", "nuvosport", "tuv",
        # Premium badges name their SUVs by letter, so they need listing too or
        # a BMW X1 comes back filed as a saloon.
        "x1", "x3", "x5", "x6", "q3", "q5", "q7", "gla", "glc", "gle", "gls",
        "ml-class", "discovery", "evoque", "range rover", "xc60", "xc90", "kodiaq"
    ],
    "Sedan": [
        "city", "verna", "ciaz", "dzire", "amaze", "vento", "rapid", "octavia",
        "corolla", "altis", "sunny", "fiesta", "linea", "manza", "zest",
        "aspire", "xcent", "tigor", "accent", "esteem", "lancer", "civic",
        "elantra", "jetta", "passat", "camry", "superb", "accord", "fluidic",
        "sx4", "logan", "verito", "etios", "yaris", "slavia", "virtus"
    ],
    "Hatchback": [
        "swift", "i10", "i20", "alto", "wagon r", "santro", "celerio", "tiago",
        "polo", "figo", "beat", "kwid", "baleno", "jazz", "brio", "micra",
        "pulse", "grande", "ritz", "zen", "800", "eon", "redi", "spark",
        "getz", "indica", "bolt", "punto", "estilo", "a-star", "nano", "go"
    ],
    "Pickup": ["hilux", "dost", "bolero pickup", "isuzu", "d-max"],
    "MPV": ["ertiga", "marazzo", "triber", "lodgy", "enjoy", "omni", "eeco", "sumo"],
    "Luxury": [
        "bmw", "mercedes", "audi", "jaguar", "volvo", "lexus", "porsche",
        "land rover", "mini", "bentley"
    ]
}

PREMIUM_BRANDS = {
    "BMW", "Mercedes-Benz", "Audi", "Jaguar", "Volvo", "Lexus", "Porsche",
    "Land", "Mini", "Bentley", "Isuzu"
}


def to_number(value):
    """Pull the leading number out of fields like '74 bhp' or '1248 CC'."""
    if pd.isna(value):
        return np.nan
    match = re.search(r"[\d.]+", str(value))
    return float(match.group()) if match else np.nan


def body_style(name, seats):
    lowered = name.lower()

    for style, keywords in BODY_KEYWORDS.items():
        if style == "Luxury":
            continue
        if any(keyword in lowered for keyword in keywords):
            return style

    # Nothing matched, so fall back on capacity.
    if seats >= 7:
        return "MPV"
    return "Hatchback" if seats <= 4 else "Sedan"


def segment(brand, price):
    """What kind of buy this is, which is what "luxury or sporty" really asks."""
    if brand in PREMIUM_BRANDS or price >= 2_000_000:
        return "Luxury"
    if price >= 900_000:
        return "Premium"
    if price >= 450_000:
        return "Mid"
    return "Budget"


def load_listings():
    df = pd.read_csv(DATA)

    df["engine"] = df["engine"].apply(to_number)
    df["max_power"] = df["max_power"].apply(to_number)
    df["mileage_kmpl"] = df["mileage_kmpl"].apply(to_number)

    df = df.dropna(
        subset=["engine", "max_power", "mileage_kmpl", "seats", "selling_price"]
    )

    df["brand"] = df["name"].str.split().str[0]
    # Two words is enough to separate a Swift from a Swift Dzire without
    # splitting every trim into its own entry, except where the second word is
    # only a qualifier and the name proper is the third: Hyundai Elite i20.
    qualifiers = {"new", "elite", "grand", "next", "all", "the"}
    df["model"] = df["name"].apply(
        lambda name: " ".join(
            name.split()[:3]
            if len(name.split()) > 2 and name.split()[1].lower() in qualifiers
            else name.split()[:2]
        )
    )
    df["age"] = LATEST_YEAR - df["year"]

    return df[df["age"] >= 0]


def build_catalogue(listings):
    """One row per model, so the same car cannot fill the results five times."""
    grouped = listings.groupby(["brand", "model"], as_index=False).agg(
        price=("selling_price", "median"),
        price_low=("selling_price", lambda s: s.quantile(0.15)),
        price_high=("selling_price", lambda s: s.quantile(0.85)),
        power=("max_power", "median"),
        # Not named `engine`: that is a reserved argument of agg() and the
        # aggregation is silently dropped instead of failing.
        engine_cc=("engine", "median"),
        mileage=("mileage_kmpl", "median"),
        seats=("seats", "median"),
        year=("year", "max"),
        # The typical age of the cars this price came from. Valuing the model
        # against its newest listing while quoting the median price of all of
        # them compares two different cars and calls everything a bargain.
        year_typical=("year", "median"),
        listings=("selling_price", "size"),
        fuels=("fuel", lambda s: sorted(set(s))),
        transmissions=("transmission", lambda s: sorted(set(s))),
    )

    # A model seen twice is noise, not a catalogue entry.
    grouped = grouped[grouped["listings"] >= 3].reset_index(drop=True)

    grouped["seats"] = grouped["seats"].round().astype(int)
    grouped["body"] = [
        body_style(name, seats)
        for name, seats in zip(grouped["model"], grouped["seats"])
    ]
    grouped["segment"] = [
        segment(brand, price)
        for brand, price in zip(grouped["brand"], grouped["price"])
    ]

    # Popularity, as a share of the most listed model. Stands in for the
    # interaction data a collaborative filter would need and does not have yet.
    grouped["popularity"] = grouped["listings"] / grouped["listings"].max()

    return grouped


# The axes a buyer actually expresses a preference along.
FEATURES = ["price", "power", "mileage", "seats", "engine_cc"]


def build_index(catalogue):
    scaler = StandardScaler()
    matrix = scaler.fit_transform(catalogue[FEATURES])

    index = NearestNeighbors(n_neighbors=min(40, len(catalogue)), metric="euclidean")
    index.fit(matrix)

    return scaler, index, matrix


def train_price_model(listings):
    """Predicts what a listing should cost, given the car and its condition."""
    features = [
        "max_power", "engine", "mileage_kmpl", "seats", "age", "km_driven",
        "fuel", "transmission", "owner", "seller_type"
    ]

    X = listings[features]
    y = np.log1p(listings["selling_price"])  # prices span three orders of magnitude

    categorical = ["fuel", "transmission", "owner", "seller_type"]

    model = Pipeline([
        ("prepare", ColumnTransformer(
            [("categorical", OneHotEncoder(handle_unknown="ignore"), categorical)],
            remainder="passthrough"
        )),
        # Sized for a free tier. Two hundred trees left unpruned come to fifty
        # megabytes on disk and score 0.942; sixty trees with a larger leaf come
        # to under three and score 0.940, which is not a difference worth half a
        # gigabyte of memory at boot.
        ("forest", RandomForestRegressor(
            n_estimators=60, min_samples_leaf=3, random_state=42, n_jobs=-1
        ))
    ])

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42
    )

    model.fit(X_train, y_train)

    predicted = model.predict(X_test)
    rupees = np.expm1(predicted)
    actual = np.expm1(y_test)

    print("\nPRICE MODEL")
    print(f"  R2 on log price : {r2_score(y_test, predicted):.3f}")
    print(f"  Mean error      : Rs {mean_absolute_error(actual, rupees):,.0f}")
    print(f"  Median price    : Rs {actual.median():,.0f}")

    return model


def main():
    listings = load_listings()
    print(f"Listings after cleaning : {len(listings):,}")

    catalogue = build_catalogue(listings)
    print(f"Models in the catalogue : {len(catalogue):,}")
    print(f"Body styles             : {dict(catalogue['body'].value_counts())}")
    print(f"Segments                : {dict(catalogue['segment'].value_counts())}")

    scaler, index, matrix = build_index(catalogue)
    price_model = train_price_model(listings)

    joblib.dump(
        {
            "catalogue": catalogue,
            "scaler": scaler,
            "index": index,
            "matrix": matrix,
            "features": FEATURES,
            "latest_year": LATEST_YEAR,
        },
        "recommender.pkl",
        compress=3,
    )
    joblib.dump(price_model, "price_model.pkl", compress=3)

    print("\nSaved recommender.pkl and price_model.pkl\n")


if __name__ == "__main__":
    main()
