"""Trains the resale valuation model.

Three approaches are compared rather than one being assumed: a linear
regression, a random forest, and gradient boosted trees. The roadmap names
XGBoost for the third; scikit-learn's HistGradientBoosting is the same idea and
already installed, which matters when the whole service has to fit in half a
gigabyte of memory alongside pandas.

Alongside the point estimate, two quantile models are trained to give a range.
A valuation quoted to the rupee is a lie about how much anyone can know from
eight thousand listings, and a range is the honest answer.

    python train_price.py
"""

import joblib
import numpy as np
import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.ensemble import HistGradientBoostingRegressor, RandomForestRegressor
from sklearn.linear_model import Ridge
from sklearn.metrics import mean_absolute_error, r2_score
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder, StandardScaler

from train_model import LATEST_YEAR, load_listings

# What the roadmap asks a seller for, plus the specs that come with the car
# once its model is known.
NUMERIC = ["age", "km_driven", "max_power", "engine", "mileage_kmpl", "seats"]
CATEGORICAL = ["brand", "fuel", "transmission", "owner", "seller_type"]

# How worn a car is, in the order the listings describe it.
OWNER_ORDER = [
    "Test Drive Car",
    "First Owner",
    "Second Owner",
    "Third Owner",
    "Fourth & Above Owner",
]


def prepare(listings):
    frame = listings.copy()
    frame["age"] = LATEST_YEAR - frame["year"]
    return frame[NUMERIC + CATEGORICAL], np.log1p(frame["selling_price"])


def encoder(sparse):
    return ColumnTransformer([
        ("categorical", OneHotEncoder(handle_unknown="ignore", sparse_output=sparse), CATEGORICAL),
        ("numeric", StandardScaler(), NUMERIC),
    ])


def candidates():
    return {
        "Linear regression": Pipeline([
            ("prepare", encoder(sparse=True)),
            ("model", Ridge(alpha=1.0)),
        ]),
        "Random forest": Pipeline([
            ("prepare", encoder(sparse=False)),
            ("model", RandomForestRegressor(
                n_estimators=60, min_samples_leaf=3, random_state=42, n_jobs=-1
            )),
        ]),
        "Gradient boosted trees": Pipeline([
            ("prepare", encoder(sparse=False)),
            ("model", HistGradientBoostingRegressor(
                max_iter=400, learning_rate=0.06, min_samples_leaf=8, random_state=42
            )),
        ]),
    }


def score(name, model, X_test, y_test):
    predicted = model.predict(X_test)

    rupees = np.expm1(predicted)
    actual = np.expm1(y_test)

    r2 = r2_score(y_test, predicted)
    mae = mean_absolute_error(actual, rupees)
    # Percentage error says more than rupees when prices run from 30k to 1cr.
    mape = float(np.mean(np.abs(rupees - actual) / actual) * 100)
    within = float(np.mean(np.abs(rupees - actual) / actual <= 0.20) * 100)

    print(f"  {name:24s} R2 {r2:6.3f}   MAE Rs {mae:>9,.0f}   "
          f"off by {mape:5.1f}%   within 20%: {within:4.1f}%")

    return {"r2": r2, "mae": mae, "mape": mape, "within20": within}


def quantile_model(X_train, y_train, quantile):
    model = Pipeline([
        ("prepare", encoder(sparse=False)),
        ("model", HistGradientBoostingRegressor(
            loss="quantile", quantile=quantile, max_iter=250,
            learning_rate=0.08, min_samples_leaf=12, random_state=42
        )),
    ])
    model.fit(X_train, y_train)
    return model


def main():
    listings = load_listings()
    X, y = prepare(listings)

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42
    )

    print(f"\nTraining on {len(X_train):,} listings, testing on {len(X_test):,}\n")

    results = {}
    fitted = {}

    for name, model in candidates().items():
        model.fit(X_train, y_train)
        results[name] = score(name, model, X_test, y_test)
        fitted[name] = model

    best = max(results, key=lambda name: results[name]["r2"])
    print(f"\n  Best: {best}\n")

    print("  Training the range models...")
    low = quantile_model(X_train, y_train, 0.10)
    high = quantile_model(X_train, y_train, 0.90)

    # A range is only useful if the answer actually falls inside it.
    inside = float(np.mean(
        (np.expm1(low.predict(X_test)) <= np.expm1(y_test))
        & (np.expm1(y_test) <= np.expm1(high.predict(X_test)))
    ) * 100)
    print(f"  Real price lands inside the range {inside:.1f}% of the time\n")

    joblib.dump(
        {
            "model": fitted[best],
            "low": low,
            "high": high,
            "chosen": best,
            "metrics": results,
            "coverage": inside,
            "numeric": NUMERIC,
            "categorical": CATEGORICAL,
            "owners": OWNER_ORDER,
            "brands": sorted(listings["brand"].unique().tolist()),
            "latest_year": LATEST_YEAR,
        },
        "valuation.pkl",
        compress=3,
    )

    print("  Saved valuation.pkl\n")


if __name__ == "__main__":
    main()
