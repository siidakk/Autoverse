"""The part of the Indian market no open dataset covers: everything above 40 lakh.

    python curated_catalogue.py

Read this before trusting a number in it
----------------------------------------
Every other figure in this project traces back to a licensed dataset. These do
not. They are written down here by hand, and that is a real difference in
provenance which the site says out loud rather than hiding.

Why it exists at all: the VariantWise catalogue is 120 cars and fifteen
brands, and not one of them is BMW, Mercedes-Benz, Audi, Volvo, Lexus, Porsche,
Jaguar or Land Rover. Above one crore it holds exactly three cars -- a Land
Cruiser, an EV9 and a Vellfire. Meanwhile the configurator renders a G-Class,
an SL 63, a 911, an M4 and two Lamborghinis, so the site was modelling cars its
own recommender could not name. Searching hard for a dataset that fills this
in turned up nothing: Hugging Face has no Indian price data beyond VariantWise,
and the one large specification database on there carries no prices at all.

So the choice was to leave a third of the market missing or to write the prices
down. What is here:

  * ex-showroom prices, India, rounded to the nearest lakh because that is the
    precision they deserve -- variants, states and model years move them
  * only cars believed to be on sale in India as of mid-2026, which is why
    there is no Audi R8 or Ford Endeavour even though both are well known
  * specifications at the representative variant, not the range-topper

What this is not: current, exact, or citable. Treat a price here as the right
order of magnitude and roughly the right position against its rivals, which is
all the recommender actually needs -- it ranks and compares, it does not quote.
Anything that must be exact should come from the manufacturer.

Every row carries source="Curated" so the page can mark it, and so this can be
pulled out in one line if a real dataset for this segment ever appears.
"""

LAKH = 100000

AS_OF = "2026-06"

SOURCE = "Curated from published ex-showroom prices (approximate)"

# brand, model, price in lakh, (low, high), bhp, cc, seats, body, length mm,
# fuels, gearboxes, kmpl or None
CARS = [
    # ---- premium, 40 to 60 lakh -------------------------------------------
    ("BMW", "2 Series Gran Coupe", 46, (43, 49), 154, 1499, 5, "Sedan", 4546, ["Petrol"], ["Automatic"], 16.3),
    ("BMW", "X1", 50, (46, 55), 134, 1995, 5, "SUV", 4616, ["Diesel", "Petrol"], ["Automatic"], 17.0),
    ("Mercedes-Benz", "GLA", 52, (48, 56), 221, 1991, 5, "SUV", 4417, ["Diesel", "Petrol"], ["Automatic"], 15.8),
    ("Audi", "Q3", 48, (45, 52), 187, 1984, 5, "SUV", 4485, ["Petrol"], ["Automatic"], 14.2),
    ("Mini", "Cooper S", 45, (42, 48), 189, 1998, 4, "Hatchback", 3876, ["Petrol"], ["Automatic"], 15.4),
    ("Volvo", "XC40 Recharge", 57, (55, 59), 235, 0, 5, "SUV", 4440, ["Electric"], ["Automatic"], None),
    ("Skoda", "Superb", 54, (52, 56), 187, 1984, 5, "Sedan", 4912, ["Petrol"], ["Automatic"], 15.8),
    ("BYD", "Seal", 45, (41, 53), 308, 0, 5, "Sedan", 4800, ["Electric"], ["Automatic"], None),
    ("BYD", "Sealion 7", 48, (45, 54), 308, 0, 5, "SUV", 4830, ["Electric"], ["Automatic"], None),

    # ---- 60 lakh to a crore ------------------------------------------------
    ("BMW", "3 Series LWB", 65, (62, 72), 255, 1998, 5, "Sedan", 4819, ["Petrol"], ["Automatic"], 16.1),
    ("Mercedes-Benz", "C-Class", 62, (60, 68), 201, 1999, 5, "Sedan", 4751, ["Diesel", "Petrol"], ["Automatic"], 17.0),
    ("Audi", "A4", 50, (48, 56), 187, 1984, 5, "Sedan", 4762, ["Petrol"], ["Automatic"], 17.0),
    ("Audi", "Q5", 72, (70, 78), 245, 1984, 5, "SUV", 4682, ["Petrol"], ["Automatic"], 12.9),
    ("BMW", "X3", 78, (75, 84), 194, 1995, 5, "SUV", 4755, ["Diesel", "Petrol"], ["Automatic"], 16.0),
    ("Mercedes-Benz", "GLC", 79, (75, 85), 254, 1999, 5, "SUV", 4716, ["Diesel", "Petrol"], ["Automatic"], 15.0),
    ("Mercedes-Benz", "E-Class LWB", 82, (78, 92), 254, 1999, 5, "Sedan", 5092, ["Petrol"], ["Automatic"], 14.5),
    ("BMW", "5 Series LWB", 78, (75, 85), 255, 1998, 5, "Sedan", 5175, ["Petrol"], ["Automatic"], 15.0),
    ("Audi", "A6", 68, (65, 75), 241, 1984, 5, "Sedan", 4939, ["Petrol"], ["Automatic"], 15.0),
    ("Volvo", "XC60", 70, (68, 74), 247, 1969, 5, "SUV", 4708, ["Petrol"], ["Automatic"], 13.0),
    ("Volvo", "S90", 68, (66, 71), 247, 1969, 5, "Sedan", 4963, ["Petrol"], ["Automatic"], 13.5),
    ("Lexus", "ES", 65, (63, 71), 215, 2487, 5, "Sedan", 4975, ["Hybrid"], ["Automatic"], 22.4),
    ("Lexus", "NX", 72, (70, 78), 240, 2487, 5, "SUV", 4660, ["Hybrid"], ["Automatic"], 19.0),
    ("Land Rover", "Range Rover Evoque", 70, (68, 74), 246, 1997, 5, "SUV", 4371, ["Petrol"], ["Automatic"], 12.0),
    ("Land Rover", "Discovery Sport", 72, (70, 76), 246, 1997, 7, "SUV", 4597, ["Petrol"], ["Automatic"], 11.5),
    ("Jaguar", "F-Pace", 78, (75, 82), 246, 1997, 5, "SUV", 4747, ["Petrol"], ["Automatic"], 11.0),
    ("Mini", "Countryman", 60, (57, 64), 215, 1998, 5, "SUV", 4433, ["Petrol"], ["Automatic"], 14.0),

    # ---- one crore to two -------------------------------------------------
    ("Porsche", "Macan", 95, (90, 110), 355, 0, 5, "SUV", 4784, ["Electric"], ["Automatic"], None),
    ("Land Rover", "Range Rover Velar", 95, (92, 100), 246, 1997, 5, "SUV", 4803, ["Petrol"], ["Automatic"], 11.0),
    ("Audi", "Q7", 90, (88, 100), 335, 2995, 7, "SUV", 5063, ["Petrol"], ["Automatic"], 11.2),
    ("BMW", "X5", 105, (100, 115), 375, 2998, 5, "SUV", 4922, ["Diesel", "Petrol"], ["Automatic"], 12.0),
    ("Mercedes-Benz", "GLE", 105, (100, 120), 375, 2999, 5, "SUV", 4924, ["Diesel", "Petrol"], ["Automatic"], 11.5),
    ("Volvo", "XC90", 105, (102, 110), 295, 1969, 7, "SUV", 4953, ["Petrol"], ["Automatic"], 11.0),
    ("Land Rover", "Defender", 105, (98, 150), 296, 2996, 7, "SUV", 5018, ["Diesel", "Petrol"], ["Automatic"], 10.0),
    ("Lexus", "RX", 100, (96, 108), 246, 2393, 5, "SUV", 4890, ["Hybrid"], ["Automatic"], 17.8),
    ("Audi", "Q8", 120, (115, 130), 335, 2995, 5, "SUV", 4986, ["Petrol"], ["Automatic"], 10.9),
    ("BMW", "X7", 130, (125, 145), 375, 2998, 7, "SUV", 5151, ["Diesel", "Petrol"], ["Automatic"], 11.0),
    ("Mercedes-Benz", "GLS", 135, (130, 150), 375, 2999, 7, "SUV", 5210, ["Diesel", "Petrol"], ["Automatic"], 10.5),
    ("Audi", "A8 L", 140, (135, 150), 335, 2995, 5, "Sedan", 5302, ["Petrol"], ["Automatic"], 11.0),
    ("Maserati", "Grecale", 140, (135, 160), 325, 1995, 5, "SUV", 4846, ["Petrol"], ["Automatic"], 10.0),
    ("Porsche", "Cayenne", 145, (140, 200), 348, 2995, 5, "SUV", 4930, ["Petrol"], ["Automatic"], 9.5),
    ("Land Rover", "Range Rover Sport", 145, (140, 190), 395, 2996, 5, "SUV", 4946, ["Diesel", "Petrol"], ["Automatic"], 10.0),
    ("Mercedes-Benz", "EQS", 165, (160, 195), 516, 0, 5, "Sedan", 5223, ["Electric"], ["Automatic"], None),
    ("Porsche", "Taycan", 175, (170, 250), 402, 0, 5, "Sedan", 4963, ["Electric"], ["Automatic"], None),
    ("Porsche", "Panamera", 175, (170, 230), 348, 2894, 5, "Sedan", 5052, ["Petrol"], ["Automatic"], 9.0),
    ("Mercedes-Benz", "S-Class", 180, (170, 210), 362, 2999, 5, "Sedan", 5289, ["Diesel", "Petrol"], ["Automatic"], 12.0),
    ("BMW", "7 Series", 190, (175, 250), 375, 2998, 5, "Sedan", 5391, ["Petrol"], ["Automatic"], 12.0),

    # ---- two crore and up --------------------------------------------------
    ("Porsche", "911", 200, (195, 350), 385, 2981, 4, "Coupe", 4535, ["Petrol"], ["Automatic"], 9.0),
    ("BMW", "i7", 210, (200, 260), 536, 0, 5, "Sedan", 5391, ["Electric"], ["Automatic"], None),
    ("Mercedes-Benz", "SL 63 AMG", 250, (240, 265), 577, 3982, 4, "Convertible", 4705, ["Petrol"], ["Automatic"], 7.5),
    ("Land Rover", "Range Rover", 250, (240, 400), 395, 2996, 5, "SUV", 5052, ["Diesel", "Petrol"], ["Automatic"], 9.5),
    ("Lexus", "LX", 290, (285, 320), 409, 3444, 7, "SUV", 5100, ["Petrol"], ["Automatic"], 8.0),
    ("Mercedes-Benz", "Maybach S-Class", 300, (290, 350), 496, 3982, 5, "Sedan", 5469, ["Petrol"], ["Automatic"], 9.0),
    ("Mercedes-Benz", "G-Class", 375, (350, 440), 577, 3982, 5, "SUV", 4817, ["Diesel", "Petrol"], ["Automatic"], 7.0),
    ("Ferrari", "Roma", 400, (390, 430), 612, 3855, 4, "Coupe", 4656, ["Petrol"], ["Automatic"], 7.0),
    ("Lamborghini", "Urus", 450, (430, 500), 657, 3996, 5, "SUV", 5137, ["Petrol"], ["Automatic"], 6.5),
    ("Bentley", "Bentayga", 450, (440, 520), 542, 3996, 5, "SUV", 5125, ["Petrol"], ["Automatic"], 6.5),
    ("Aston Martin", "DB12", 480, (470, 520), 671, 3982, 4, "Coupe", 4725, ["Petrol"], ["Automatic"], 7.0),
    ("Bentley", "Continental GT", 550, (530, 620), 771, 3996, 4, "Coupe", 4850, ["Petrol"], ["Automatic"], 6.0),
    ("Lamborghini", "Revuelto", 890, (870, 950), 1001, 6498, 2, "Coupe", 4947, ["Hybrid"], ["Automatic"], 6.0),
    ("Rolls-Royce", "Ghost", 900, (880, 1100), 563, 6749, 5, "Sedan", 5546, ["Petrol"], ["Automatic"], 6.0),
    ("Ferrari", "Purosangue", 1000, (980, 1100), 715, 6496, 4, "SUV", 4973, ["Petrol"], ["Automatic"], 6.0),
    ("Rolls-Royce", "Cullinan", 1100, (1050, 1300), 563, 6749, 5, "SUV", 5341, ["Petrol"], ["Automatic"], 6.0),

    # ---- mass market the licensed catalogue happens to miss ----------------
    ("Mahindra", "XUV700", 22, (14, 27), 197, 1997, 7, "SUV", 4695, ["Diesel", "Petrol"], ["Automatic", "Manual"], 16.0),
    ("Hyundai", "Tucson", 32, (29, 36), 154, 1999, 5, "SUV", 4630, ["Diesel", "Petrol"], ["Automatic"], 13.0),
    ("MG", "Gloster", 42, (39, 45), 215, 1996, 7, "SUV", 4985, ["Diesel"], ["Automatic"], 12.0),
    ("BYD", "Atto 3", 25, (24, 34), 201, 0, 5, "SUV", 4455, ["Electric"], ["Automatic"], None),
]


def segment_of(price_rupees):
    """Same ladder build_catalogue uses, so the two halves agree."""
    if price_rupees >= 4000000:
        return "Luxury"
    if price_rupees >= 1800000:
        return "Premium"
    if price_rupees >= 900000:
        return "Mid"
    return "Budget"


def rows():
    """The curated cars, in the shape build_catalogue produces."""
    built = []

    for (brand, name, price, span, power, engine_cc, seats, body,
         length, fuels, gearboxes, kmpl) in CARS:
        low, high = span

        built.append({
            "brand": brand,
            "model": f"{brand} {name}",
            "price": price * LAKH,
            "price_low": low * LAKH,
            "price_high": high * LAKH,
            "power": float(power),
            "power_max": float(power),
            "engine_cc": int(engine_cc),
            "mileage": float(kmpl) if kmpl else float("nan"),
            # None of these quote a battery figure worth repeating, so the
            # electric ones are left to the peer median like any other gap.
            "km_per_kwh": float("nan"),
            "cost_per_km": float("nan"),
            "seats": int(seats),
            "body": body,
            "body_detail": "",
            "segment": segment_of(price * LAKH),
            "fuels": sorted(fuels),
            "transmissions": sorted(gearboxes),
            # The licensed rows count variants. There is no variant list here,
            # so this is deliberately low: it feeds the popularity nudge, and a
            # Cullinan should not be nudged up the results.
            "variants": 2,
            "length_mm": int(length),
            "boot_litres": 0,
            "year": 2026,
            "year_typical": 2026,
            "source": "Curated",
        })

    return built


if __name__ == "__main__":
    built = rows()
    prices = sorted(r["price"] for r in built)

    print(f"\n  {len(built)} curated cars, prices as of {AS_OF}")
    print(f"  Rs {prices[0]/LAKH:.0f}L - Rs {prices[-1]/LAKH:.0f}L\n")

    from collections import Counter
    print("  brands  ", dict(Counter(r["brand"] for r in built)))
    print("  bodies  ", dict(Counter(r["body"] for r in built)))
    print("  segments", dict(Counter(r["segment"] for r in built)))
    print(f"\n  {SOURCE}\n")
