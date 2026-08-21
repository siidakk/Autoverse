#!/usr/bin/env node
//
// Runs the accessory placement maths over every model in the garage.
//
//   npm run test:placement
//
// The renderer cannot be driven from the command line, but the arithmetic that
// decides where a part goes can be, and that is where the mistakes have been:
// reading a field that does not exist, or landing a part outside the car.

import fs from "node:fs";
import path from "node:path";
import { measureCar, detectWheels } from "../src/utils/wheelDetection.js";
import { lowerBodyEnd, noseEnd, rearValance } from "../src/utils/placement.js";

const GREEN = "\x1b[32m";
const RED = "\x1b[31m";
const DIM = "\x1b[2m";
const OFF = "\x1b[0m";

import { partsOf } from "./readGlb.mjs";

// --- the checks ---

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
    const wheels = detectWheels(car, parts);

    const problems = [];

    const rear = lowerBodyEnd(car);
    const nose = noseEnd(car);

    if (!Number.isFinite(rear)) problems.push("rear of the low body is not a number");
    if (!Number.isFinite(nose)) problems.push("nose is not a number");

    // The exhaust end must lie within the car, not beyond either extreme.
    const lo = car.box.min[car.lengthAxis];
    const hi = car.box.max[car.lengthAxis];
    if (rear < lo - 1e-6 || rear > hi + 1e-6) problems.push("rear falls outside the car");

    // Nose and rear must be at opposite ends.
    if (Math.abs(rear - nose) < car.length * 0.4)
      problems.push(`nose and rear are only ${(Math.abs(rear - nose) / car.length).toFixed(2)} of the car apart`);

    // Each wheel is turned to face out of its own side of the car. Getting
    // this wrong is invisible from one side and obvious from the other, which
    // is exactly how it shipped, so it is checked here on real geometry.
    if (wheels) {
      const axleIndex = wheels.axleAxis === "x" ? 0 : 2;
      const centreline =
        wheels.wheels.reduce((sum, w) => sum + w.position[axleIndex], 0) /
        wheels.wheels.length;

      const facing = wheels.wheels.map((wheel) => {
        const outward = wheel.position[axleIndex] >= centreline ? 1 : -1;
        const yaw = (wheels.axleAxis === "x" ? Math.PI / 2 : 0) + (outward < 0 ? Math.PI : 0);

        // Where the rim face, built on local +Z, actually ends up pointing.
        const points = wheels.axleAxis === "x" ? Math.sin(yaw) : Math.cos(yaw);
        return { outward, points: Math.round(points) };
      });

      const left = facing.filter((f) => f.outward > 0).length;
      if (left !== facing.length / 2)
        problems.push(`${left} of ${facing.length} wheels ended up on one side`);

      // The rim face must point the same way as the side the wheel is on.
      const wrong = facing.filter((f) => f.points !== f.outward).length;
      if (wrong) problems.push(`${wrong} wheels face into the car`);
    }

    // The exhaust is now placed against the measured rear valance, so the
    // checks follow the same arithmetic the component runs.
    const valance = rearValance(car);

    if (!Number.isFinite(valance.floor)) problems.push("valance floor is not a number");
    if (!Number.isFinite(valance.halfWidth)) problems.push("valance width is not a number");

    if (valance.floor < car.box.min.y - 1e-6 || valance.floor > car.box.min.y + car.height * 0.6)
      problems.push(
        `valance floor sits ${((valance.floor - car.box.min.y) / car.height * 100).toFixed(0)}% up the car`
      );

    for (const [label, layout] of Object.entries({
      twin: { pairs: 1, spread: 0.62, radius: 0.012 },
      quad: { pairs: 2, spread: 0.66, radius: 0.0105 },
      centre: { pairs: 1, spread: 0.16, radius: 0.014 },
      carbon: { pairs: 1, spread: 0.62, radius: 0.016 }
    })) {
      const tipRadius = car.length * layout.radius;
      const tipLength = car.length * 0.04;
      const up = Math.max(valance.floor + tipRadius * 0.55, car.box.min.y + tipRadius * 1.15);
      const usable = Math.max(valance.halfWidth - tipRadius * 1.6, tipRadius * 1.2);

      // Never through the road.
      if (up - tipRadius < car.box.min.y - 1e-6)
        problems.push(`${label} tips go through the floor`);

      // An exhaust belongs low down, not up the back panel.
      if (up > car.box.min.y + car.height * 0.42)
        problems.push(
          `${label} tips sit ${((up - car.box.min.y) / car.height * 100).toFixed(0)}% up the car`
        );

      for (let pair = 0; pair < layout.pairs; pair++) {
        const lateral = usable * layout.spread - pair * tipRadius * 2.6;

        if (lateral < 0) problems.push(`${label} inner tip crosses the centreline`);

        if (Math.abs(lateral) + tipRadius > car.width / 2 + 1e-6)
          problems.push(`${label} tips would sit outside the bodywork`);
      }

      // The tip is recessed, so its rear face must not reach past the car.
      const along = rear - car.rearSign * tipLength * 0.3;
      const back = along + car.rearSign * tipLength * 0.5;
      if (back < lo - car.length * 0.02 || back > hi + car.length * 0.02)
        problems.push(`${label} tips hang out behind the car`);
    }

    if (problems.length) {
      failures++;
      console.log(`${RED}FAIL${OFF} ${name}`);
      for (const problem of problems) console.log(`     ${RED}x${OFF} ${problem}`);
    } else {
      console.log(
        `${GREEN}PASS${OFF} ${name} ${DIM}rear ${rear.toFixed(2)}  nose ${nose.toFixed(2)}` +
        `  wheels ${wheels ? "yes" : "no"}${OFF}`
      );
    }
  } catch (error) {
    failures++;
    console.log(`${RED}FAIL${OFF} ${name}\n     ${RED}x${OFF} threw: ${error.message}`);
  }
}

console.log(
  `\n${failures ? RED : GREEN}${files.length - failures}/${files.length} models place cleanly${OFF}\n`
);

process.exit(failures ? 1 : 0);
