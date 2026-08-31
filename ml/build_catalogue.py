"""Turns the VariantWise catalogue into the table the recommender trains on.

    python build_catalogue.py

Source: https://huggingface.co/datasets/variantwise/indian-cars-variants
Licence: CC BY 4.0 -- free to use and build on, including commercially, with
attribution to VariantWise (https://variantwise.com).

Why this replaced what was here
-------------------------------
The recommender was built on a scrape of used listings whose newest car was a
2020. Six years on that is not a catalogue of what somebody can buy, it is a
history lesson: no Creta of this generation, no Nexon EV, no Curvv, and prices
from before the last round of inflation.

This source is dated 2026-08-13 and is a *new car* catalogue rather than used
listings, which changes two things worth being explicit about:

  * It carries manufacturer specifications rather than whatever a seller typed
    into a listing, so power, displacement and efficiency are exact instead of
    being a median over noisy free text.
  * It has no age or odometer, so it cannot train the resale model. Valuation
    keeps its own used-listings data; the two features answer different
    questions and now have a dataset each.

It also has forty-five electric powertrains, twenty-six CNG and eight hybrids.
The old data had none of any of them, which by itself made the recommender
unable to answer the question most people are actually asking in this market.

On the economy column
---------------------
The publisher is explicit that "an absent field means the figure could not be
verified, never that it is zero", and a third of these cars have no published
figure. Writing a zero would have been a lie the ranking then acted on, since
economy is one of the axes it sorts by, and the front end printed it straight
out as "0 kmpl". So an unknown stays unknown here, and the two consumers deal
with it differently: the ranking fills it with the peer median so that a car is
not punished for a gap in the data, and the page shows nothing at all.

Economy is also spread across three fields depending on how the manufacturer
filed it, and electric cars quite reasonably do not have one at all. Reading
all three, and deriving km/kWh for the electrics, takes coverage from 32 models
to 85.
"""

import json

import pandas as pd
from huggingface_hub import hf_hub_download

DATASET = "variantwise/indian-cars-variants"
ATTRIBUTION = "VariantWise (https://variantwise.com), CC BY 4.0"

# One horsepower metric is not another. The rest of the app talks in bhp.
PS_TO_BHP = 0.98632

LAKH = 100000

# Pump prices and the domestic tariff, India, August 2026. They decide the
# running-cost column, so they are named here rather than buried in a formula:
# they are assumptions with a shelf life, and anyone who disagrees can edit one
# line and retrain.
FUEL_PRICES = {
    "Petrol": 104.0,    # a litre
    "Diesel": 92.0,     # a litre
    "CNG": 78.0,        # a kilogram, and for CNG "kmpl" is really km/kg
    "Hybrid": 104.0,    # burns petrol
    "Electric": 8.5,    # a unit, charging at home rather than at a fast charger
}

# The site's vocabulary, which the 3D garage and the accessory logic both use.
BODY_STYLES = {
    "hatchback": "Hatchback",
    "sedan": "Sedan",
    "suv": "SUV",
    "coupe-suv": "SUV",
    "mpv": "MPV",
    "van": "MPV",
    "pickup": "Pickup",
    "convertible": "Convertible",
    "coupe": "Coupe",
}

FUEL_NAMES = {
    "petrol": "Petrol",
    "diesel": "Diesel",
    "electric": "Electric",
    "hybrid": "Hybrid",
    "cng": "CNG",
}


def gearbox(code):
    """Manual or not, from the gearbox code on a variant.

    An AMT is a manual with a robot working the clutch, and a single speed EV
    reduction gear is not a gearbox at all, but from the driving seat both are
    two pedals, which is the distinction anybody is actually choosing between.
    """
    code = (code or "").upper()
    if code.endswith("MT") and "AMT" not in code:
        return "Manual"
    return "Automatic"


def segment_of(price_rupees, brand):
    if price_rupees >= 4000000:
        return "Luxury"
    if price_rupees >= 1800000:
        return "Premium"
    if price_rupees >= 900000:
        return "Mid"
    return "Budget"


def median(values):
    kept = sorted(v for v in values if v is not None)
    if not kept:
        return None
    middle = len(kept) // 2
    return kept[middle] if len(kept) % 2 else (kept[middle - 1] + kept[middle]) / 2


def economy_of(engine):
    """Kilometres a litre, from whichever of the three fields was filled in.

    Manufacturers file this three different ways and the dataset preserves all
    three rather than flattening them. Reading only the first, which is what
    this did to begin with, found a figure for 39 engines out of 228.
    """
    direct = engine.get("officialEfficiency") or engine.get("mileageKmpl")
    if direct:
        return float(direct)

    # Some are quoted per gearbox, because a manual and a torque converter of
    # the same engine genuinely differ. The average is what the model is like.
    by_gearbox = engine.get("officialEfficiencyByTransmission")
    if isinstance(by_gearbox, dict):
        figures = [float(v) for v in by_gearbox.values() if isinstance(v, (int, float))]
        if figures:
            return sum(figures) / len(figures)

    return None


def km_per_kwh(engine):
    """Range over battery. Both figures are claimed, which is worth saying.

    These are MIDC numbers, and MIDC flatters an electric car rather more than
    the CMVR cycle flatters a petrol one, so the two are not strictly
    comparable. No correction is applied, because inventing a coefficient would
    be worse than the bias it corrected; the label says claimed and means it.
    """
    battery = engine.get("batteryKwh")
    claimed = engine.get("rangeKmClaimed")

    if battery and claimed:
        return float(claimed) / float(battery)
    return None


def running_cost(engine, fuel):
    """Rupees a kilometre, which is the one axis every powertrain shares.

    Litres and kilowatt hours cannot be compared, and an electric car has no
    kmpl at all, so ranking on economy alone quietly excluded a quarter of the
    catalogue from ever being able to look frugal.
    """
    if fuel == "Electric":
        rate = km_per_kwh(engine)
        return FUEL_PRICES["Electric"] / rate if rate else None

    kmpl = economy_of(engine)
    if not kmpl:
        return None
    return FUEL_PRICES.get(fuel, FUEL_PRICES["Petrol"]) / kmpl


def build():
    path = hf_hub_download(DATASET, "data/catalogue.json", repo_type="dataset")
    source = json.loads(open(path, encoding="utf-8").read())

    as_of = source.get("dataAsOf", "")
    rows = []

    for model in source["models"]:
        engines = model.get("engines") or []
        variants = model.get("variants") or []

        prices = [v["price"] * LAKH for v in variants if v.get("price")]
        if not prices:
            continue

        powers = [e["powerPs"] * PS_TO_BHP for e in engines if e.get("powerPs")]
        if not powers:
            continue

        # An electric motor has no displacement. Zero is the honest answer and
        # it keeps the column numeric; the fuel column is what says why.
        displacements = [e.get("displacementCc") or 0 for e in engines]

        fuel_of = {e["id"]: FUEL_NAMES.get(e.get("fuel"), "Petrol") for e in engines}

        economies = [economy_of(e) for e in engines if e.get("fuel") != "electric"]
        rates = [km_per_kwh(e) for e in engines if e.get("fuel") == "electric"]
        costs = [running_cost(e, fuel_of[e["id"]]) for e in engines]

        price = median(prices)
        kmpl = median(economies)
        rate = median(rates)
        cost = median(costs)

        rows.append({
            "brand": model["brand"],
            "model": f"{model['brand']} {model['name']}",
            "price": price,
            "price_low": min(prices),
            "price_high": max(prices),
            "power": round(median(powers), 1),
            "power_max": round(max(powers), 1),
            "engine_cc": int(median(displacements) or 0),
            # Genuinely absent rather than zero. The ranking fills this in
            # below; the page must not.
            "mileage": round(kmpl, 1) if kmpl else float("nan"),
            "km_per_kwh": round(rate, 1) if rate else float("nan"),
            "cost_per_km": round(cost, 2) if cost else float("nan"),
            "seats": int(model.get("seats") or 5),
            "body": BODY_STYLES.get(model.get("bodyStyle"), "SUV"),
            "body_detail": model.get("bodyType") or "",
            "segment": segment_of(price, model["brand"]),
            "fuels": sorted(set(fuel_of.values())),
            "transmissions": sorted({gearbox(v.get("transmission")) for v in variants}),
            # Stands in for the listing count the old data had: how many ways
            # this model can be bought, which is a fair proxy for how much of
            # the market it is meant to cover.
            "variants": len(variants),
            "length_mm": model.get("lengthMm") or 0,
            "boot_litres": model.get("bootLitres") or 0,
            # New cars, so this is the year of the catalogue rather than of the
            # car. Valuation does not use this table.
            "year": int(as_of[:4]) if as_of[:4].isdigit() else 2026,
            "year_typical": int(as_of[:4]) if as_of[:4].isdigit() else 2026,
        })

    catalogue = pd.DataFrame(rows)
    catalogue["listings"] = catalogue["variants"]
    catalogue["popularity"] = catalogue["variants"] / catalogue["variants"].max()

    return fill_economy(catalogue), as_of


def fill_economy(catalogue):
    """Give the ranking a number to sort on without inventing one to display.

    `mileage` and `cost_per_km` keep their gaps, so the page can stay silent
    about a car whose figure was never published. `*_ranked` is the same column
    with each gap filled by the median of that car's own peer group -- same
    body, same primary fuel -- which is a far better guess than either a zero
    or the market average, and it stops a missing figure being read by the
    nearest-neighbour index as terrible economy.
    """
    catalogue["economy_known"] = catalogue["mileage"].notna()

    primary = catalogue["fuels"].apply(lambda names: names[0])

    for column in ("mileage", "cost_per_km"):
        peer = catalogue.groupby([catalogue["body"], primary])[column].transform("median")
        catalogue[f"{column}_ranked"] = (
            catalogue[column].fillna(peer).fillna(catalogue[column].median())
        )

    return catalogue


if __name__ == "__main__":
    catalogue, as_of = build()

    print(f"\n  {len(catalogue)} models, catalogue dated {as_of}")
    print(f"  attribution: {ATTRIBUTION}\n")

    print("  bodies    ", dict(catalogue["body"].value_counts()))
    print("  segments  ", dict(catalogue["segment"].value_counts()))
    print(f"  price     Rs {catalogue['price'].min():,.0f} - Rs {catalogue['price'].max():,.0f}")
    print(f"  power     {catalogue['power'].min():.0f} - {catalogue['power'].max():.0f} bhp")

    known = catalogue[catalogue["economy_known"]]
    print(f"  economy   {known['mileage'].min():.1f} - {known['mileage'].max():.1f} kmpl"
          f"   ({len(known)}/{len(catalogue)} published a figure)")

    electric = catalogue[catalogue["fuels"].apply(lambda f: "Electric" in f)]
    rates = catalogue["km_per_kwh"].dropna()
    print(f"  electric  {len(electric)} models offer one, {len(rates)} quote a range"
          f" ({rates.min():.1f} - {rates.max():.1f} km/kWh claimed)")

    cost = catalogue["cost_per_km"].dropna()
    print(f"  running   Rs {cost.min():.2f} - Rs {cost.max():.2f} a km"
          f"   ({len(cost)}/{len(catalogue)} models)")

    catalogue.to_pickle("catalogue_new.pkl")
    print("\n  written catalogue_new.pkl\n")
