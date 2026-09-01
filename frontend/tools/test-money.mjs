#!/usr/bin/env node
//
// Checks that the form can actually ask for everything the catalogue holds.
//
//   npm run test:money
//
// This exists because of a specific failure. Sixty-six cars were added to the
// catalogue reaching eleven crore, the API was checked with curl and returned
// a Porsche at two crore quite happily, and the work was reported as done --
// while the budget buttons on the page still stopped at forty lakh, because
// that list was hard coded and nobody had looked at it. Two thirds of what had
// just been added could not be reached by anyone using the site.
//
// So the test is not "does the formatter work". It is "can the form reach the
// data", which is the question that was never asked.

import { money, shortMoney, budgetsFor } from "../src/lib/money.js";

const GREEN = "\x1b[32m", RED = "\x1b[31m", DIM = "\x1b[2m", OFF = "\x1b[0m";

const problems = [];
const check = (condition, message) => { if (!condition) problems.push(message); };

console.log();

// --- rupees at the scale they belong to ------------------------------------
const cases = [
  [45000, "₹45,000"],
  [749000, "₹7.49 L"],
  [4292000, "₹42.92 L"],
  [20000000, "₹2.00 cr"],
  [110000000, "₹11.00 cr"],
];

for (const [value, expected] of cases) {
  const got = money(value);
  check(got === expected, `money(${value}) gave "${got}", expected "${expected}"`);
}

// The specific thing that was wrong: a crore rendered as a very large lakh.
check(!money(110000000).includes(" L"), "eleven crore should not be written in lakh");
console.log(`  ${GREEN}formats${OFF} ${DIM}${cases.length} amounts, and a crore reads as a crore${OFF}`);

// --- the form has to reach the whole catalogue -----------------------------
for (const dearest of [4000000, 11000000, 60000000, 110000000, 500000000]) {
  const rungs = budgetsFor([468500, dearest]);
  const top = rungs[rungs.length - 1].value;

  check(
    top >= dearest,
    `the priciest car is ${money(dearest)} but the highest budget button is ` +
    `${money(top)} — that car cannot be asked for`
  );
  check(rungs.length >= 3, `only ${rungs.length} budget rungs for a range up to ${money(dearest)}`);
}
console.log(`  ${GREEN}reaches${OFF} ${DIM}the top of the catalogue at five different sizes${OFF}`);

// --- and still be usable at the bottom, where most cars are ----------------
const real = budgetsFor([468500, 110000000]);
const cheap = real.filter((rung) => rung.value <= 2000000);

check(
  cheap.length >= 3,
  `only ${cheap.length} rungs under twenty lakh, which is where most of this market is`
);
check(
  real.length <= 16,
  `${real.length} budget buttons is more than a panel can show`
);
console.log(`  ${GREEN}${real.length} rungs${OFF} ${DIM}${real.map((r) => r.label).join(" ")}${OFF}`);

// --- no useless jumps ------------------------------------------------------
// The first version went 20L, 40L, then straight to a crore. A third of the
// catalogue sits in that gap -- the X3, the GLC, the Q5, the XC60 -- and there
// was no way to ask for any of it. Below a crore, no rung may be more than
// twice the one before it. Above a crore the market really is sparse and wider
// steps are fair.
const CRORE = 10000000;

for (let i = 1; i < real.length; i += 1) {
  const from = real[i - 1].value;
  const to = real[i].value;

  if (to > CRORE) continue;

  check(
    to / from <= 2.01,
    `${real[i - 1].label} jumps straight to ${real[i].label}, ` +
    `${(to / from).toFixed(1)} times over — too coarse below a crore`
  );
}

// And specifically the band that was wrong, which should step in twenties.
for (const wanted of [4000000, 6000000, 8000000, 10000000]) {
  check(
    real.some((rung) => rung.value === wanted),
    `no button for ${money(wanted)}`
  );
}
console.log(`  ${GREEN}graduated${OFF} ${DIM}40L 60L 80L 1cr all present, nothing doubles below a crore${OFF}`);

// --- labels have to fit on a button ----------------------------------------
for (const rung of real) {
  check(
    rung.label.length <= 5,
    `"${rung.label}" is too long for a button`
  );
  check(shortMoney(rung.value) === rung.label, `label mismatch on ${rung.value}`);
}
console.log(`  ${GREEN}fits${OFF} ${DIM}every label is five characters or fewer${OFF}`);

if (problems.length) {
  console.log(`\n${RED}${problems.length} problem(s)${OFF}`);
  for (const problem of problems) console.log(`  ${RED}x${OFF} ${problem}`);
  console.log();
  process.exit(1);
}

console.log(`\n${GREEN}the form can ask for everything the catalogue holds${OFF}\n`);
