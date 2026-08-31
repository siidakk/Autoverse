#!/usr/bin/env node
//
// Checks the two pieces of reasoning the repair page auto-fill rests on.
//
//   npm run test:panels
//
// Neither of these can be checked by looking at a photograph, because both are
// geometry rather than perception: given that the classifier found a dent at
// these coordinates, which panel is that, and given that the car is a
// hatchback about this big, which cars could it be. Those are exactly the
// parts that can be wrong silently -- a bumper quietly filed as a quarter
// panel is a sixty percent error in the bill, and nothing on screen says so.

import { panelFor, itemsFromScan, OPPOSITE_END } from "../src/lib/panels.js";
import { likelyCars } from "../src/lib/carGuess.js";

const GREEN = "\x1b[32m", RED = "\x1b[31m", DIM = "\x1b[2m", OFF = "\x1b[0m";

const problems = [];
const check = (condition, message) => { if (!condition) problems.push(message); };

// A car filling most of a 1000x600 photo.
const CAR = [100, 100, 800, 400];
const SIZE = { width: 1000, height: 600 };

// Somewhere inside the car, as a fraction of it.
const at = (acrossCar, downCar, label = "dent") => ({
  x: CAR[0] + CAR[2] * acrossCar - 20,
  y: CAR[1] + CAR[3] * downCar - 20,
  width: 40,
  height: 40,
  label,
  confidence: 0.8
});

console.log();

// --- position decides the panel -------------------------------------------
const cases = [
  ["low at the front",   at(0.08, 0.85), "bumper"],
  ["low at the back",    at(0.93, 0.85), "bumper"],
  ["middle, mid height", at(0.50, 0.55), "door"],
  ["high in the middle", at(0.50, 0.12), "roof"],
  ["end, mid height",    at(0.10, 0.60), "fender"],
  ["end, upper",         at(0.10, 0.30), "bonnet"]
];

for (const [name, finding, expected] of cases) {
  const { panel } = panelFor(finding, CAR, SIZE);
  check(panel === expected, `${name} should be a ${expected}, got ${panel}`);
}
console.log(`  ${GREEN}placed${OFF} ${DIM}${cases.length} positions onto the right panel${OFF}`);

// --- the same damage moves panel when it moves on the car ------------------
// The guard against the bug being replaced: the old code read the shape of the
// box, so the answer never changed no matter where on the car the damage was.
const everywhere = new Set(
  cases.map(([, finding]) => panelFor(finding, CAR, SIZE).panel)
);
check(
  everywhere.size >= 4,
  `six positions across the car produced only ${everywhere.size} distinct panels`
);
console.log(`  ${GREEN}${everywhere.size} panels${OFF} ${DIM}from six positions — position actually decides it${OFF}`);

// --- what the classifier says can override where it is ---------------------
check(
  panelFor(at(0.5, 0.5, "lamp_broken"), CAR, SIZE).panel === "bumper",
  "a broken lamp should be costed against the bumper wherever it appears"
);
check(
  panelFor(at(0.5, 0.5, "tire_flat"), CAR, SIZE).panel === null,
  "a flat tyre is not bodywork and should not become a panel"
);
console.log(`  ${GREEN}sane${OFF} ${DIM}lamps go to the bumper, tyres are not panels${OFF}`);

// --- ambiguity is admitted rather than hidden ------------------------------
// Nothing detects which way the car faces, so these two genuinely cannot be
// told apart, and the page needs to know that to say so.
for (const [name, finding] of [["bonnet or boot", at(0.1, 0.3)], ["wing or quarter", at(0.1, 0.6)]]) {
  const { panel, unsure } = panelFor(finding, CAR, SIZE);
  check(unsure === true, `${name}: ${panel} should be flagged unsure without knowing the car's orientation`);
  check(Boolean(OPPOSITE_END[panel]), `${panel} should name the panel it could equally be`);
}
check(
  panelFor(at(0.5, 0.55), CAR, SIZE).unsure === false,
  "a door in the middle of the car is not ambiguous and should not be flagged"
);
console.log(`  ${GREEN}honest${OFF} ${DIM}ends flagged unsure, the middle is not${OFF}`);

// --- outside the car is not a panel ---------------------------------------
check(
  panelFor({ x: 5, y: 5, width: 20, height: 20, label: "scratch" }, CAR, SIZE).panel === null,
  "something found on the pavement should not be pinned to a panel"
);
console.log(`  ${GREEN}bounded${OFF} ${DIM}findings outside the car are dropped${OFF}`);

// --- findings become a bill ------------------------------------------------
const items = itemsFromScan(
  [
    at(0.08, 0.85, "crack"),
    at(0.09, 0.86, "crack"),      // the sliding window seeing the same crack
    at(0.50, 0.55, "scratch"),
    at(0.50, 0.50, "undamaged"),  // not a repair
    at(0.50, 0.50, "tire_flat"),  // not bodywork
    at(0.50, 0.20, "glass_shatter")
  ],
  CAR,
  SIZE
);

check(items.length === 3, `expected three lines, got ${items.length}: ${items.map((i) => `${i.type}/${i.panel}`).join(", ")}`);
check(
  items.every((item) => item.severity === "moderate"),
  "severity must not be inferred — the classifier says nothing about depth"
);
check(
  !items.some((item) => ["undamaged", "tire_flat"].includes(item.type)),
  "undamaged and flat tyres must not reach the bill"
);
check(
  items.some((item) => item.type === "glass"),
  "glass_shatter should map to the cost table's `glass`, not pass through unpriced"
);
console.log(`  ${GREEN}${items.length} lines${OFF} ${DIM}from six findings — duplicates merged, non-repairs dropped${OFF}`);

// --- the car shortlist ------------------------------------------------------
const CATALOGUE = [
  { brand: "Maruti Suzuki", model: "Maruti Suzuki Alto K10", body: "Hatchback", length: 3530, typical: 490000 },
  { brand: "Maruti Suzuki", model: "Maruti Suzuki Swift", body: "Hatchback", length: 3860, typical: 749000 },
  { brand: "Hyundai", model: "Hyundai Creta", body: "SUV", length: 4330, typical: 1400000 },
  { brand: "Toyota", model: "Toyota Innova", body: "MPV", length: 4755, typical: 2000000 },
  { brand: "Honda", model: "Honda City", body: "Sedan", length: 4580, typical: 1300000 },
  { brand: "Toyota", model: "Toyota Land Cruiser", body: "SUV", length: 5100, typical: 22000000 }
];

const hatchbacks = likelyCars(CATALOGUE, { body: "Hatchback", shareOfFrame: 0.5 });
check(hatchbacks.length > 0, "a hatchback should return candidates");
check(
  hatchbacks[0].body === "Hatchback",
  `a hatchback should be led by a hatchback, got ${hatchbacks[0].body}`
);
check(
  !hatchbacks.some((car) => car.body === "Pickup"),
  "a hatchback should never shortlist a pickup"
);

// Size has to count for something, or the shortlist is just the body filter.
const big = likelyCars(CATALOGUE, { body: "SUV", shareOfFrame: 0.95 })[0];
const small = likelyCars(CATALOGUE, { body: "SUV", shareOfFrame: 0.1 })[0];
check(
  big.model !== small.model,
  "a car filling the frame and one lost in it should not give the same first guess"
);
console.log(`  ${GREEN}shortlist${OFF} ${DIM}led by the right body; size moves the answer${OFF}`);

// No opinion on the body must not mean no answer at all: the model declines
// below its confidence floor, and the page still needs somewhere to start.
const noIdea = likelyCars(CATALOGUE, { shareOfFrame: 0.5 });
check(noIdea.length > 0, "with no body style it should still offer candidates");
console.log(`  ${GREEN}degrades${OFF} ${DIM}still answers when the body is unknown${OFF}`);

if (problems.length) {
  console.log(`\n${RED}${problems.length} problem(s)${OFF}`);
  for (const problem of problems) console.log(`  ${RED}x${OFF} ${problem}`);
  console.log();
  process.exit(1);
}

console.log(`\n${GREEN}panel placement and the car shortlist hold up${OFF}\n`);
