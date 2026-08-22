#!/usr/bin/env node
//
// Checks the engine data behind the rev button.
//
//   npm run test:engines
//
// The sound cannot be heard from here, but the number it is built from can be
// checked, and that number is the whole idea: firing frequency is rpm times
// half the cylinder count. If a V12 does not come out above a V8 at the same
// revs, the premise is wrong and no amount of filtering will rescue it.

import { cars } from "../src/data/cars.js";
import { ENGINES, engineFor, firingHz } from "../src/data/engines.js";
import { sampleFor, shiftFor } from "../src/data/engineSamples.js";

const GREEN = "\x1b[32m", RED = "\x1b[31m", DIM = "\x1b[2m", OFF = "\x1b[0m";

const problems = [];
const check = (condition, message) => { if (!condition) problems.push(message); };

console.log();

// 1. Every car in the garage has to have an engine, or it falls back to a
//    generic four and quietly sounds like the wrong car.
for (const car of cars) {
  if (!ENGINES[car.model]) {
    problems.push(`${car.name} has no engine, and would fall back to the default`);
  }
}

// 2. Report, and check each one is physically sane.
console.log("  car                       engine                        idle Hz  redline Hz");
console.log("  " + "-".repeat(78));

for (const car of cars) {
  const engine = engineFor(car.model);
  const atIdle = firingHz(engine, engine.idle);
  const atRedline = firingHz(engine, engine.redline);

  console.log(
    `  ${car.name.slice(0, 24).padEnd(26)}${engine.label.slice(0, 28).padEnd(30)}` +
    `${atIdle.toFixed(0).padStart(5)}   ${atRedline.toFixed(0).padStart(9)}`
  );

  check(engine.redline > engine.idle + 2000, `${car.name}: redline is not above idle`);
  check(atIdle > 15, `${car.name}: idles at ${atIdle.toFixed(0)} Hz, below hearing`);
  check(atRedline < 2000, `${car.name}: ${atRedline.toFixed(0)} Hz at the redline is not an engine note`);
  check(engine.capacity > 0.5 && engine.capacity < 9, `${car.name}: implausible capacity`);
  check(engine.smooth >= 0 && engine.smooth <= 1, `${car.name}: smooth is out of range`);
}

// 3. The claim the whole feature rests on: more cylinders, higher note, at the
//    same engine speed.
const at3000 = (model) => firingHz(engineFor(model), 3000);

const v12 = at3000("/models/lamborghini_revuelto.glb");
const v10 = at3000("/models/audi.glb");
const v8 = at3000("/models/2020_chevrolet_corvette_c8_stingray_convertible.glb");
const i6 = at3000("/models/bmw.glb");
const i4 = at3000("/models/honda_civic.glb");

console.log(`\n  At 3000 rpm: ${DIM}V12${OFF} ${v12.toFixed(0)} Hz · ${DIM}V10${OFF} ${v10.toFixed(0)} · ` +
  `${DIM}V8${OFF} ${v8.toFixed(0)} · ${DIM}straight six${OFF} ${i6.toFixed(0)} · ${DIM}four${OFF} ${i4.toFixed(0)}`);

check(v12 > v10 && v10 > v8 && v8 > i6 && i6 > i4,
  "cylinder count does not order the notes correctly");

// The V12 fires twice as often as a six, exactly.
check(Math.abs(v12 / i6 - 2) < 1e-9, "a V12 should be exactly double a straight six");

// 4. The rotary is the one that does not follow the cylinder rule.
const rx7 = engineFor("/models/mazda_rx-7.glb");
check(rx7.rotor === true, "the RX-7 should be flagged as a rotary");
check(
  Math.abs(firingHz(rx7, 3000) - 100) < 1e-9,
  "a two rotor at 3000 rpm should fire at 100 Hz, order 2"
);
console.log(`  ${DIM}RX-7 two rotor at 3000 rpm: ${firingHz(rx7, 3000).toFixed(0)} Hz, order 2 rather than half a cylinder count${OFF}`);

// 5. Recorded audio, when there is any. With none configured every car has to
//    fall through to the synthesiser rather than to silence.
const recorded = cars.filter((car) => sampleFor(car.model, engineFor(car.model)));

console.log(
  `\n  ${DIM}recordings configured for ${recorded.length} of ${cars.length} cars; ` +
  `the rest synthesise${OFF}`
);

for (const car of recorded) {
  const choice = sampleFor(car.model, engineFor(car.model));
  check(choice.idle || choice.rev, `${car.name}: a sample entry with no files`);
  check(
    choice.rate > 0.66 && choice.rate < 1.51,
    `${car.name}: shifted ${choice.rate.toFixed(2)}x, too far to sound like itself`
  );
  console.log(`  ${DIM}${car.name.padEnd(24)} ${choice.source}${OFF}`);
}

// 6. The pitch shift itself. A V8 clip taken at a 6500 redline standing in for
//    a V8 that runs to 7000 has to come out at exactly that ratio.
const shift = shiftFor(
  { cylinders: 8, redline: 7000 },
  { cylinders: 8, redline: 6500 }
);
check(
  Math.abs(shift - 7000 / 6500) < 1e-9,
  `a same-layout shift should be the redline ratio, got ${shift}`
);

// Borrowing across layouts moves the pitch by the cylinder ratio too, which is
// how a V12 ends up an octave above a six rather than merely faster.
const octave = shiftFor(
  { cylinders: 12, redline: 6000 },
  { cylinders: 6, redline: 6000 }
);
check(
  Math.abs(octave - 2) < 1e-9,
  `twelve cylinders against six should be exactly 2x, got ${octave}`
);

if (problems.length) {
  console.log(`\n${RED}${problems.length} problem(s)${OFF}`);
  for (const problem of problems) console.log(`  ${RED}x${OFF} ${problem}`);
  console.log();
  process.exit(1);
}

console.log(`\n${GREEN}${cars.length}/${cars.length} cars have a sane engine${OFF}\n`);
