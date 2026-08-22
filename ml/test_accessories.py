"""Checks the part suggestions actually depend on the car.

    python test_accessories.py

The failure this guards against is not a crash. The old version branched only
on the question asked and the segment, so a page of results carried the same
two lines on every card -- correct code, useless output, and the sort of thing
no test written against a single car would ever catch.

So the checks here are mostly about a *set* of results rather than about one.
"""

import sys

import joblib

from accessories import accessories_for

GREEN, RED, DIM, OFF = "\x1b[32m", "\x1b[31m", "\x1b[2m", "\x1b[0m"

problems = []


def check(passed, message):
    if not passed:
        problems.append(message)


catalogue = joblib.load("recommender.pkl")["catalogue"]


def signature(picks):
    return tuple((pick["category"], str(pick["value"])) for pick in picks)


def top(budget, **prefs):
    """Roughly what the recommender would return: affordable, best matches."""
    rows = catalogue[catalogue["price"] <= budget * 1.05]
    rows = rows.sort_values("popularity", ascending=False).head(5)
    return [(row, accessories_for(row, {"budget": budget, "seats": 5, **prefs})) for _, row in rows.iterrows()]


print()

# --- every card has to look finished -------------------------------------
for _, row in catalogue.iterrows():
    picks = accessories_for(row, {"priority": "value", "driving": "calm", "usage": "city", "seats": 5})

    check(
        2 <= len(picks) <= 4,
        f"{row['model']} produced {len(picks)} suggestions; a card wants between two and four"
    )

    # A suggestion with no reason is the thing being replaced.
    check(all(pick.get("why") for pick in picks), f"{row['model']} has a suggestion with no reason")

    # Two lines about the same part read as a bug.
    categories = [pick["category"] for pick in picks]
    check(len(categories) == len(set(categories)), f"{row['model']} suggests the same category twice")

print(f"  {GREEN}checked{OFF} every one of {len(catalogue)} cars for shape and reasons")

# --- a page of results must not read the same ------------------------------
searches = [
    ("a budget city search", 700000, {"priority": "value", "driving": "calm", "usage": "city"}),
    ("a family search", 1800000, {"priority": "space", "driving": "calm", "usage": "mixed"}),
    ("a performance search", 4000000, {"priority": "performance", "driving": "spirited", "usage": "highway"}),
]

for name, budget, prefs in searches:
    results = top(budget, **prefs)
    distinct = {signature(picks) for _, picks in results}

    # Three out of five is the bar. Demanding five would be dishonest: two cars
    # with the same body and the same output should get the same parts.
    check(
        len(distinct) >= 3,
        f"{name}: {len(results)} results produced only {len(distinct)} distinct sets"
    )
    print(f"  {GREEN}{len(distinct)}/{len(results)} distinct{OFF} {DIM}{name}{OFF}")

# --- suggestions must follow the car, not only the question ---------------
prefs = {"priority": "value", "driving": "calm", "usage": "city", "seats": 5, "budget": 5000000}

slow = catalogue.sort_values("power").iloc[0]
fast = catalogue.sort_values("power").iloc[-1]

check(
    signature(accessories_for(slow, prefs)) != signature(accessories_for(fast, prefs)),
    "the slowest and fastest cars get identical parts under identical preferences"
)
print(f"  {GREEN}differs{OFF} {DIM}slowest ({slow['power']:.0f} bhp) against fastest ({fast['power']:.0f} bhp){OFF}")

# --- and must not say anything daft ---------------------------------------
for _, row in catalogue.iterrows():
    picks = accessories_for(row, {"priority": "performance", "driving": "spirited", "usage": "highway", "seats": 5})
    chosen = {pick["category"]: pick["value"] for pick in picks}

    if row["body"] in ("SUV", "MPV"):
        check(
            chosen.get("stance", 0) == 0,
            f"{row['model']} is an {row['body']} and was told to lower itself"
        )

    if "Petrol" not in row["fuels"]:
        check(
            "exhaust" not in chosen,
            f"{row['model']} is diesel only and was sold an exhaust"
        )

print(f"  {GREEN}sane{OFF} {DIM}no lowered SUVs, no exhausts on diesels{OFF}")

if problems:
    print(f"\n{RED}{len(problems)} problem(s){OFF}")
    for problem in problems[:12]:
        print(f"  {RED}x{OFF} {problem}")
    if len(problems) > 12:
        print(f"  {DIM}...and {len(problems) - 12} more{OFF}")
    print()
    sys.exit(1)

print(f"\n{GREEN}part suggestions vary with the car{OFF}\n")
