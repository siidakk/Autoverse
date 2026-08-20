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
import { measureCar, detectWheels, boundsOf } from "../src/utils/wheelDetection.js";
import { lowerBodyEnd, noseEnd } from "../src/utils/placement.js";

const GREEN = "\x1b[32m";
const RED = "\x1b[31m";
const DIM = "\x1b[2m";
const OFF = "\x1b[0m";

// --- minimal glTF reader, same approach as the validator ---

function multiply(a, b) {
  const out = new Array(16).fill(0);
  for (let c = 0; c < 4; c++) {
    for (let r = 0; r < 4; r++) {
      out[c * 4 + r] =
        a[r] * b[c * 4] + a[4 + r] * b[c * 4 + 1] +
        a[8 + r] * b[c * 4 + 2] + a[12 + r] * b[c * 4 + 3];
    }
  }
  return out;
}

function localMatrix(node) {
  if (node.matrix) return node.matrix.slice();
  const [tx, ty, tz] = node.translation || [0, 0, 0];
  const [x, y, z, w] = node.rotation || [0, 0, 0, 1];
  const [sx, sy, sz] = node.scale || [1, 1, 1];
  const x2 = x + x, y2 = y + y, z2 = z + z;
  const xx = x * x2, xy = x * y2, xz = x * z2;
  const yy = y * y2, yz = y * z2, zz = z * z2;
  const wx = w * x2, wy = w * y2, wz = w * z2;
  return [
    (1 - (yy + zz)) * sx, (xy + wz) * sx, (xz - wy) * sx, 0,
    (xy - wz) * sy, (1 - (xx + zz)) * sy, (yz + wx) * sy, 0,
    (xz + wy) * sz, (yz - wx) * sz, (1 - (xx + yy)) * sz, 0,
    tx, ty, tz, 1
  ];
}

const NORMALISERS = { 5120: 127, 5121: 255, 5122: 32767, 5123: 65535 };

function denormalise(accessor, value) {
  if (!accessor.normalized) return value;
  const divisor = NORMALISERS[accessor.componentType];
  return divisor ? Math.max(value / divisor, -1) : value;
}

function partsOf(file) {
  const buffer = fs.readFileSync(file);
  const json = JSON.parse(
    buffer.subarray(20, 20 + buffer.readUInt32LE(12)).toString("utf8")
  );

  const nodes = json.nodes || [];
  const roots = json.scenes?.[json.scene ?? 0]?.nodes ?? [];
  const parts = [];

  const walk = (index, parentMatrix, inherited) => {
    const node = nodes[index];
    if (!node) return;

    const world = multiply(parentMatrix, localMatrix(node));
    const name = node.name || inherited;

    if (node.mesh !== undefined) {
      for (const primitive of json.meshes[node.mesh].primitives || []) {
        const accessor = json.accessors?.[primitive.attributes?.POSITION];
        if (!accessor?.min) continue;

        const min = { x: Infinity, y: Infinity, z: Infinity };
        const max = { x: -Infinity, y: -Infinity, z: -Infinity };

        for (let corner = 0; corner < 8; corner++) {
          const local = [
            denormalise(accessor, corner & 1 ? accessor.max[0] : accessor.min[0]),
            denormalise(accessor, corner & 2 ? accessor.max[1] : accessor.min[1]),
            denormalise(accessor, corner & 4 ? accessor.max[2] : accessor.min[2])
          ];
          const point = {
            x: world[0] * local[0] + world[4] * local[1] + world[8] * local[2] + world[12],
            y: world[1] * local[0] + world[5] * local[1] + world[9] * local[2] + world[13],
            z: world[2] * local[0] + world[6] * local[1] + world[10] * local[2] + world[14]
          };
          for (const axis of ["x", "y", "z"]) {
            min[axis] = Math.min(min[axis], point[axis]);
            max[axis] = Math.max(max[axis], point[axis]);
          }
        }

        parts.push({ ref: name, name: name || "unnamed", ...boundsOf(min, max) });
      }
    }

    for (const child of node.children || []) walk(child, world, name);
  };

  for (const root of roots) walk(root, localMatrix({}), null);
  return parts;
}

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

    // Tips are sized off length and spaced off track; both must stay inboard.
    if (wheels) {
      const tipRadius = car.length * 0.012;
      const lateral = wheels.track * 0.4;
      if (lateral + tipRadius > car.width / 2)
        problems.push("exhaust tips would sit outside the bodywork");
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
