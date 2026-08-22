"""Which parts suit a particular car.

This used to branch on three things: whether the person asked for performance,
whether the car was in a premium segment, and whether it was an SUV. None of
those distinguish one result from another -- the first is a property of the
question, and the other two are usually identical across a set of matches. So
four cars in a row came back with the same two lines, "Classic wheels" and
"Light tint", which is worse than saying nothing: it looks like the page is
broken rather than like anyone thought about it.

Suggestions are now read off the car's own numbers. Power, specific output,
economy, price, body, seats and fuel all move the answer, so two cars that
differ get different parts, and two that really are alike get alike parts for a
reason that can be pointed at.

Every suggestion carries the number it came from. "88 bhp is worth a lighter
rim" is a claim someone can disagree with, which is the point -- the alternative
is a recommendation nobody can argue with because it never says why.
"""


def _tier(value, thresholds):
    """How far up a ladder a value sits. Returns 0 for below the first rung."""
    step = 0
    for threshold in thresholds:
        if value >= threshold:
            step += 1
    return step


def accessories_for(row, preferences):
    power = float(row["power"])
    engine_cc = float(row["engine_cc"])
    economy = float(row["mileage"])
    price = float(row["price"])
    seats = int(row["seats"])
    body = row["body"]
    segment = row["segment"]
    fuels = list(row["fuels"])

    # Specific output separates a willing small engine from a lazy big one,
    # which raw power alone does not: 88 bhp from 1.2 litres is a different
    # car from 88 bhp from 2.5.
    per_litre = power / max(engine_cc / 1000.0, 0.1)

    petrol = "Petrol" in fuels
    diesel_only = not petrol
    tall = body in ("SUV", "MPV")
    premium = segment in ("Premium", "Luxury")

    # What the person asked for still counts, but only as a nudge on top of
    # what the car is.
    keen = preferences.get("priority") == "performance" or preferences.get("driving") == "spirited"

    picks = []

    # ---- wheels -----------------------------------------------------------
    # Three rungs rather than one threshold, so cars a few bhp apart do not
    # always land on the same side.
    pace = _tier(power, [80, 110, 145])

    if pace >= 2 or (keen and pace >= 1):
        picks.append({
            "category": "wheels",
            "value": "sport",
            "why": f"{power:.0f} bhp is worth a lighter rim"
        })
    elif economy >= 18:
        picks.append({
            "category": "wheels",
            "value": "classic",
            "why": f"{economy:.1f} kmpl — a steel rim keeps it that way"
        })
    elif premium:
        picks.append({
            "category": "wheels",
            "value": "sport",
            "why": "Cleaner than the rim this segment ships with"
        })
    else:
        picks.append({
            "category": "wheels",
            "value": "classic",
            "why": f"{power:.0f} bhp does not need a lighter wheel"
        })

    # ---- rim size ---------------------------------------------------------
    if pace >= 3:
        picks.append({
            "category": "wheelSize",
            "value": 3,
            "why": f"{power:.0f} bhp fills a bigger arch"
        })
    elif pace == 2:
        picks.append({
            "category": "wheelSize",
            "value": 2,
            "why": "One inch up, sidewall still usable"
        })
    elif pace == 1 and not tall:
        picks.append({
            "category": "wheelSize",
            "value": 2,
            "why": f"{power:.0f} bhp carries one inch comfortably"
        })

    # ---- what the shape asks for ------------------------------------------
    # Body is the strongest signal that has nothing to do with the engine, and
    # it is what stops four hatchbacks of similar output reading identically.
    if not tall and per_litre >= 75 and power >= 120:
        picks.append({
            "category": "spoiler",
            "value": "racing" if power >= 200 else "sport",
            "why": f"{per_litre:.0f} bhp per litre has something to hold down"
        })
    elif body == "Hatchback" and price < 1200000:
        picks.append({
            "category": "wrap",
            "value": "roof",
            "why": "A contrast roof is the usual first change on a hatchback"
        })
    elif body == "Sedan" and power >= 80:
        picks.append({
            "category": "spoiler",
            "value": "sport",
            "why": "A lip on the boot is the subtle version of this"
        })

    # ---- exhaust ----------------------------------------------------------
    # A diesel does not sound better through four tips, and pretending
    # otherwise is the sort of thing this project is supposed to avoid.
    if diesel_only:
        pass
    elif power >= 200:
        picks.append({
            "category": "exhaust",
            "value": "quad",
            "why": f"{power:.0f} bhp has the note to carry it"
        })
    elif tall and power >= 100:
        picks.append({
            "category": "exhaust",
            "value": "twin",
            "why": "Sits well under a high bumper"
        })
    elif power >= 130:
        picks.append({
            "category": "exhaust",
            "value": "twin",
            "why": f"{power:.0f} bhp earns a visible tip"
        })

    # ---- ride height ------------------------------------------------------
    # Never suggested on something tall. Ground clearance is the reason
    # somebody bought it.
    if tall:
        picks.append({
            "category": "stance",
            "value": 0,
            "why": "Left alone — clearance is the point of this shape"
        })
    elif pace >= 3 or (keen and pace >= 2):
        picks.append({
            "category": "stance",
            "value": 0.45,
            "why": "Lowered, not slammed — the springs still work"
        })

    # ---- glass ------------------------------------------------------------
    if seats >= 7:
        picks.append({
            "category": "tint",
            "value": "dark",
            "why": f"{seats} seats — the back row cooks without it"
        })
    elif price >= 1500000:
        picks.append({
            "category": "tint",
            "value": "dark",
            "why": "Standard at this price"
        })
    elif economy >= 20:
        picks.append({
            "category": "tint",
            "value": "light",
            "why": "Less air conditioning, which is where the economy goes"
        })
    else:
        # Always offered. Every car in this market sits in the sun, and a card
        # carrying a single line looks unfinished rather than considered.
        picks.append({
            "category": "tint",
            "value": "light",
            "why": "Cuts the heat without going dark enough to be pulled over"
        })

    # ---- lights -----------------------------------------------------------
    if preferences.get("usage") == "highway" and price >= 800000:
        picks.append({
            "category": "headlights",
            "value": "laser" if price >= 2000000 else "xenon",
            "why": "Worth it on a car that does long runs after dark"
        })
    elif power < 100 and price < 1000000:
        # On a slow, cheap car the honest advice is not a wheel. The lamps on
        # this end of the market are the thing you actually notice at night.
        picks.append({
            "category": "headlights",
            "value": "xenon",
            "why": "Better light does more for this car than a bigger wheel"
        })

    # ---- paint ------------------------------------------------------------
    # Only when nothing above has filled the card, and only on something cheap
    # enough that a respray would be a silly thing to spend on.
    already = {pick["category"] for pick in picks}
    if price < 400000 and "wrap" not in already and len(picks) < 4:
        picks.append({
            "category": "wrap",
            "value": "roof",
            "why": f"At {price / 100000:.1f} L a wrap costs less than a respray"
        })

    # A card with one line looks unfinished, and a card with six is a list
    # nobody reads.
    return picks[:4]
