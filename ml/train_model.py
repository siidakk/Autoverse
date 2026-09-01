"""Builds the recommendation artefacts from the new-car catalogue.

An earlier version scored cars with a hand written formula and then trained a
regressor to predict that same formula from three of its own terms, which
taught it arithmetic rather than preference. Ranking by nearest score also
meant two unrelated cars could tie, which is how a query for a coupe came back
with a pickup.

This builds two things instead:

  * a nearest neighbour index over the specs a buyer actually states a
    preference about, which is content based filtering
  * a price model, which is what lets a recommendation say whether a car is
    priced well for what it is

The table underneath both used to be aggregated from used listings whose newest
car was a 2020. It now comes from build_catalogue.py: real, current, on-sale
cars. The listings did not go away, they went to listings.py, because resale
valuation genuinely needs them and a manufacturer's price list cannot answer
what a six year old hatchback is worth.

    python train_model.py
"""

import joblib
import numpy as np
from sklearn.compose import ColumnTransformer
from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import r2_score
from sklearn.model_selection import KFold, cross_val_predict
from sklearn.neighbors import NearestNeighbors
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder, StandardScaler

from build_catalogue import ATTRIBUTION, build as new_catalogue

# The axes a buyer actually expresses a preference along.
#
# Price is logged. Standardising a column that runs from four lakh to eleven
# crore leaves the bottom of it indistinguishable -- a Swift and a twelve lakh
# car were 0.03 standard deviations apart -- so the ranking quietly stopped
# sorting on budget and sorted on everything else instead. See build_catalogue.
#
# Economy is running cost rather than kmpl. An electric car has no kmpl at all,
# so with the old feature every one of the twenty seven in this catalogue was
# imputed to the market average and none of them could ever rank as frugal --
# which is precisely backwards. Rupees a kilometre is the one axis a petrol, a
# diesel, a CNG and an electric car can all be put on. Note that it runs the
# other way: on this feature, lower is better.
FEATURES = ["price_log", "power", "cost_per_km_ranked", "seats", "engine_cc"]

# What a specification is worth is judged on the published figures plus the two
# dimensions that decide how much car you are getting for the money.
PRICE_FEATURES = [
    "power", "engine_cc", "mileage_ranked", "cost_per_km_ranked", "seats",
    "length_mm", "boot_litres", "fuel", "transmission", "body",
]


def build_index(catalogue):
    scaler = StandardScaler()
    matrix = scaler.fit_transform(catalogue[FEATURES])

    index = NearestNeighbors(n_neighbors=min(40, len(catalogue)), metric="euclidean")
    index.fit(matrix)

    return scaler, index, matrix


def train_price_model(catalogue):
    """What a specification is worth, judged against the rest of the market.

    On used listings this asked whether a seller was asking too much. On a new
    car the price is the manufacturer's, so the same model answers a more
    useful question: is this well priced for what it is, next to everything
    else on sale.
    """
    frame = catalogue.copy()
    frame["fuel"] = frame["fuels"].apply(lambda values: values[0])
    frame["transmission"] = frame["transmissions"].apply(lambda values: values[0])

    X = frame[PRICE_FEATURES]
    y = np.log1p(frame["price"])  # prices span three orders of magnitude

    categorical = ["fuel", "transmission", "body"]

    model = Pipeline([
        ("prepare", ColumnTransformer(
            [("categorical", OneHotEncoder(handle_unknown="ignore"), categorical)],
            remainder="passthrough"
        )),
        # Sized for a catalogue of a hundred and twenty rather than for tens of
        # thousands of listings: a bigger forest with smaller leaves would
        # memorise this table rather than learn the shape of the market.
        ("forest", RandomForestRegressor(
            n_estimators=300, min_samples_leaf=2, random_state=42, n_jobs=-1
        ))
    ])

    # A hundred and twenty rows leaves a twenty four row test set, which is far
    # too small to quote: the same model scored 0.824 or 0.832 depending only
    # on which rows happened to fall where. Cross validation predicts every row
    # exactly once, from a model that never saw it.
    predicted = cross_val_predict(
        model, X, y, cv=KFold(5, shuffle=True, random_state=42)
    )

    actual = np.expm1(y)
    guess = np.expm1(predicted)
    error = np.abs(guess - actual) / actual

    print("\nPRICE MODEL  (what a specification is worth on the new market)")
    print(f"  R2 on log price : {r2_score(y, predicted):.3f}")
    # The median, because the mean is decided by a handful of cars that have no
    # peers: a Land Cruiser at 221 lakh has nothing in the table to learn from,
    # and one of those drags an average wherever it likes.
    print(f"  Median error    : {np.median(error):.1%}")
    print(f"  Within 20%      : {(error <= 0.20).mean():.0%} of models")
    print(f"  Within 35%      : {(error <= 0.35).mean():.0%} of models")

    model.fit(X, y)
    return model


def main():
    catalogue, as_of = new_catalogue()

    known = int(catalogue["economy_known"].sum())

    print(f"Catalogue dated         : {as_of}")
    print(f"Models in the catalogue : {len(catalogue):,}")
    print(f"Body styles             : {dict(catalogue['body'].value_counts())}")
    print(f"Segments                : {dict(catalogue['segment'].value_counts())}")
    print(f"Published an economy fig: {known}/{len(catalogue)} "
          f"(the rest are ranked on the peer median and shown blank)")

    scaler, index, matrix = build_index(catalogue)
    price_model = train_price_model(catalogue)

    joblib.dump(
        {
            "catalogue": catalogue,
            "scaler": scaler,
            "index": index,
            "matrix": matrix,
            "features": FEATURES,
            "source": ATTRIBUTION,
            "as_of": as_of,
        },
        "recommender.pkl",
        compress=3,
    )
    joblib.dump(price_model, "price_model.pkl", compress=3)

    print("\nSaved recommender.pkl and price_model.pkl\n")


if __name__ == "__main__":
    main()
