"""Checks that a budget search returns cars near the budget.

    python test_discover.py

This exists because of one report: a search at eighty lakh returned a fifty-four
lakh Superb second, and a sixty lakh search returned a Kia Seltos at seventeen
point eight. Both were correct code doing the wrong thing.

Two causes, and neither was visible from reading the ranking:

  * Price was standardised on a linear scale across a catalogue spanning 235 to
    1. That put a Swift 0.03 standard deviations from a twelve lakh target, so
    below about forty lakh price had effectively stopped being a signal at all
    and the ranking sorted on everything else.
  * The popularity nudge was worth 0.35 against a price signal worth about 0.6,
    and popularity is the number of variants a maker offers -- 1.0 for a
    mass-market car, 0.045 for every curated one. Cheap cars were handed back
    more than half their price penalty.

So the test measures the property that failed, across the whole range, rather
than checking one search returns one expected car.
"""

import sys

import numpy as np

from app import app, catalogue

GREEN, RED, DIM, OFF = "\x1b[32m", "\x1b[31m", "\x1b[2m", "\x1b[0m"

LAKH = 100000

problems = []


def check(passed, message):
    if not passed:
        problems.append(message)


client = app.test_client()


def search(**overrides):
    body = {
        "budget": 2000000, "seats": 5, "fuel": "any", "transmission": "any",
        "body": "any", "driving": "balanced", "usage": "mixed",
        "priority": "balanced",
    }
    body.update(overrides)
    return client.post("/recommend", json=body).get_json().get("results", [])


print()

# --- results have to be near the budget ------------------------------------
# Above two and a half crore the catalogue holds fourteen cars, so a search up
# there cannot fill five results near the money however it ranks. That is the
# data being thin, not the ranking being wrong, and the rungs below it are
# where the complaint came from.
DENSE = [5, 8, 12, 20, 40, 60, 80, 100, 200]

shares = []
for lakhs in DENSE:
    budget = lakhs * LAKH
    results = search(budget=budget)

    check(bool(results), f"a {lakhs} lakh search returned nothing at all")
    if not results:
        continue

    here = [row["price"] / budget for row in results]
    shares.extend(here)

    # The specific failure: something less than half the budget ranked above
    # cars that fit it.
    check(
        max(here) >= 0.7,
        f"at {lakhs} lakh the dearest result is only {max(here):.0%} of budget"
    )
    check(
        here[0] >= 0.55,
        f"at {lakhs} lakh the *top* result is {here[0]:.0%} of budget — "
        f"{results[0]['model']}"
    )

median = float(np.median(shares))
check(median >= 0.75, f"the median result sits at {median:.0%} of budget")
print(f"  {GREEN}near the money{OFF} {DIM}median result is {median:.0%} of budget "
      f"across {len(DENSE)} rungs{OFF}")

# The two reported cases, by name.
eighty = search(budget=8000000)
check(
    min(row["price"] for row in eighty) >= 4000000,
    "an 80 lakh search still returns something under 40 lakh: "
    + ", ".join(f"{r['model']} at {r['price'] / LAKH:.0f}L" for r in eighty)
)
sixty = search(budget=6000000)
check(
    not any("Seltos" in row["model"] for row in sixty),
    "a 60 lakh search still returns a Seltos"
)
print(f"  {GREEN}the two reported searches{OFF} {DIM}80L holds above 40L; 60L has no Seltos{OFF}")

# --- the top of the market ranks by price too -------------------------------
# Sparse, so it is checked differently: the dearest car in the catalogue should
# lead a search at a budget that comfortably clears it.
top = search(budget=120000000)
check(bool(top) and top[0]["price"] >= 90000000,
      f"a twelve crore search leads with {top[0]['model'] if top else 'nothing'} "
      f"at {top[0]['price'] / 10000000:.1f} cr" if top else "nothing at twelve crore")
print(f"  {GREEN}top of the market{OFF} {DIM}12 crore leads with "
      f"{top[0]['model'] if top else '—'}{OFF}")

# --- asking a different question gets a different answer --------------------
for lakhs in (12, 20, 40):
    sets = {
        priority: tuple(row["model"] for row in search(budget=lakhs * LAKH, priority=priority))
        for priority in ("value", "balanced", "comfort", "performance")
    }
    check(
        len(set(sets.values())) >= 2,
        f"at {lakhs} lakh all four priorities return the same five cars"
    )

styles = {
    style: tuple(row["model"] for row in search(budget=2000000, driving=style))
    for style in ("calm", "balanced", "spirited")
}
check(len(set(styles.values())) >= 2, "calm and spirited return the same cars")
print(f"  {GREEN}preferences matter{OFF} {DIM}priority and driving style both move the answer{OFF}")

# --- the filters are filters ------------------------------------------------
for label, kwargs, test in [
    ("fuel", {"fuel": "Electric", "budget": 3000000}, lambda r: "Electric" in r["fuels"]),
    ("body", {"body": "MPV", "budget": 3000000}, lambda r: r["body"] == "MPV"),
    ("gearbox", {"transmission": "Manual", "budget": 1500000}, lambda r: "Manual" in r["transmissions"]),
    ("seats", {"seats": 7, "budget": 4000000}, lambda r: r["seats"] >= 7),
    ("budget", {"budget": 1000000}, lambda r: r["price"] <= 1000000 * 1.05),
]:
    results = search(**kwargs)
    check(bool(results), f"the {label} filter returned nothing")
    for row in results:
        check(test(row), f"the {label} filter let through {row['model']}")

print(f"  {GREEN}filters hold{OFF} {DIM}fuel, body, gearbox, seats and budget{OFF}")

# --- nothing is priced or described nonsensically ---------------------------
for row in search(budget=110000000, seats=2):
    check(row["price"] > 0, f"{row['model']} has no price")
    check(row["mileage"] is None or row["mileage"] > 0,
          f"{row['model']} reports {row['mileage']} kmpl")
    check(0 <= row["match"] <= 100, f"{row['model']} has a match of {row['match']}%")
    check(bool(row["reasons"]), f"{row['model']} came back with no reasons")
    check(2 <= len(row["accessories"]) <= 4,
          f"{row['model']} has {len(row['accessories'])} part suggestions")

print(f"  {GREEN}cards are complete{OFF} {DIM}price, match, reasons and parts all present{OFF}")

if problems:
    print(f"\n{RED}{len(problems)} problem(s){OFF}")
    for problem in problems[:12]:
        print(f"  {RED}x{OFF} {problem}")
    if len(problems) > 12:
        print(f"  {DIM}...and {len(problems) - 12} more{OFF}")
    print()
    sys.exit(1)

print(f"\n{GREEN}discover ranks on the budget it was given{OFF}\n")
