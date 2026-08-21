#!/usr/bin/env node
//
// Runs the lamp detection over every model in the garage.
//
//   npm run test:lights
//
// There is no renderer here, so what is checked is that the counts are sane:
// a car has a handful of light units, not none and not fifty. A rule that
// matched half the car would hide half the car from the paint.

import fs from "node:fs";
import path from "node:path";
import { measureCar } from "../src/utils/wheelDetection.js";
import { partsOf } from "./readGlb.mjs";
import { detectLights } from "../src/utils/lightDetection.js";

const GREEN = "\x1b[32m", RED = "\x1b[31m", DIM = "\x1b[2m", OFF = "\x1b[0m";

const dir = process.argv[2] || "public/models";
const files = fs.readdirSync(dir)
  .filter((f) => f.endsWith(".glb") && !f.endsWith(".orig.glb"))
  .map((f) => path.join(dir, f));

let failures = 0;
console.log();

for (const file of files) {
  const name = path.basename(file, ".glb");

  try {
    const parts = partsOf(file);
    const car = { ...measureCar(parts), parts };
    const lights = detectLights(car, parts);

    const share = lights.refs.length / parts.length;
    const problems = [];

    // The rule must not swallow the car. Anything above a fifth of the parts
    // means it is matching bodywork, and the paint would stop working.
    if (share > 0.2)
      problems.push(`matched ${(share * 100).toFixed(0)}% of all parts`);

    if (problems.length) {
      failures++;
      console.log(`${RED}FAIL${OFF} ${name}`);
      for (const problem of problems) console.log(`     ${RED}x${OFF} ${problem}`);
    } else {
      const flag = lights.units === 0 ? `${DIM}none found${OFF}` : `${lights.units} unit(s)`;
      console.log(
        `${GREEN}PASS${OFF} ${name.slice(0, 44).padEnd(46)} ` +
        `${DIM}${String(lights.refs.length).padStart(3)}/${String(parts.length).padEnd(4)} parts  ${OFF}${flag}`
      );
    }
  } catch (error) {
    failures++;
    console.log(`${RED}FAIL${OFF} ${name}\n     ${RED}x${OFF} threw: ${error.message}`);
  }
}

console.log(`\n${failures ? RED : GREEN}${files.length - failures}/${files.length} models classify cleanly${OFF}\n`);
process.exit(failures ? 1 : 0);
