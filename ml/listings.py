"""The used-car listings, which are now a separate source from the catalogue.

These two datasets used to live in one file because there was only one of them.
There are two questions being asked here, though, and they want different data:

  * what should somebody buy -- answered from the *new car* catalogue in
    build_catalogue.py, because a car you cannot buy is not a recommendation
  * what is the car on the driveway worth -- answered from these listings,
    because resale needs an age, an odometer and a number somebody actually
    accepted, none of which a manufacturer's price list contains

So the listings stayed exactly as they were, and only moved house. They are a
scrape whose newest car is a 2020, which is a real limitation of the valuation
feature and is stated on the page rather than hidden.
"""

import re

import numpy as np
import pandas as pd

DATA = "cars_india.csv"
LATEST_YEAR = 2020  # the newest listings in this dataset


def to_number(value):
    """Pull the leading number out of fields like '74 bhp' or '1248 CC'."""
    if pd.isna(value):
        return np.nan
    match = re.search(r"[\d.]+", str(value))
    return float(match.group()) if match else np.nan


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
