// The repair estimate has to read the car, not just its price band.
//
// It used to take a segment and nothing else, which is four numbers for a
// hundred and eighty six cars: a Swift and a Baleno came to the same rupee,
// and so did a 40 lakh Volvo and an 11 crore Bugatti.

import { repairCost } from "../src/lib/damage.js";

const items = [{ type: "scratch", severity: "moderate", panel: "door" }];

const cars = [
  ["Renault Kwid",        "Budget",  330000],
  ["Maruti Swift",        "Budget",  650000],
  ["Hyundai Creta",       "Mid",     1200000],
  ["Toyota Fortuner",     "Premium", 3400000],
  ["BMW 3 Series",        "Luxury",  4800000],
  ["Porsche 911",         "Luxury",  20000000],
  ["Lamborghini Revuelto", "Luxury", 89000000]
];

let failures = 0;
const seen = [];

for (const [name, segment, price] of cars) {
  const cost = repairCost(items, segment, price);
  seen.push([name, cost]);
  console.log(`  ${name.padEnd(22)} ${segment.padEnd(8)} ₹${Math.round(cost).toLocaleString("en-IN")}`);
}

// Every car costs more than the one below it.
for (let i = 1; i < seen.length; i += 1) {
  if (seen[i][1] <= seen[i - 1][1]) {
    console.log(`FAIL: ${seen[i][0]} is not dearer than ${seen[i - 1][0]}`);
    failures += 1;
  }
}

// Two cars in the same band must differ, which is the whole point.
const swift = repairCost(items, "Budget", 650000);
const kwid = repairCost(items, "Budget", 330000);
if (Math.abs(swift - kwid) < 1) {
  console.log("FAIL: same segment, same price -> identical bill");
  failures += 1;
}

// And an unknown price must not change the old answer.
const legacy = repairCost(items, "Mid");
const explicit = repairCost(items, "Mid", null);
if (legacy !== explicit) {
  console.log("FAIL: omitting the price is not the same as passing null");
  failures += 1;
}

console.log(`\n  same band, different car: ₹${Math.round(kwid)} vs ₹${Math.round(swift)}`);
console.log(failures ? `\n${failures} failed` : "\nall passed");
process.exit(failures ? 1 : 0);
