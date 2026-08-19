#!/usr/bin/env node
//
// Checks a .glb against everything AutoVerse needs from a car model, before it
// goes anywhere near the site.
//
//   npm run validate:models
//   node tools/validate-model.mjs public/models/some-car.glb
//
// It reads the glTF container directly and runs the same detection code the
// browser uses, so a pass here means wheels and spoilers will fit in the app.

import fs from "node:fs";
import path from "node:path";
import {
  measureCar,
  detectWheels,
  boundsOf
} from "../src/utils/wheelDetection.js";

const MAX_MB = 15;

// ---------------------------------------------------------------- glTF reading

function multiply(a, b) {
  const out = new Array(16).fill(0);
  for (let c = 0; c < 4; c++) {
    for (let r = 0; r < 4; r++) {
      out[c * 4 + r] =
        a[r] * b[c * 4] +
        a[4 + r] * b[c * 4 + 1] +
        a[8 + r] * b[c * 4 + 2] +
        a[12 + r] * b[c * 4 + 3];
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

function transform(m, p) {
  return {
    x: m[0] * p[0] + m[4] * p[1] + m[8] * p[2] + m[12],
    y: m[1] * p[0] + m[5] * p[1] + m[9] * p[2] + m[13],
    z: m[2] * p[0] + m[6] * p[1] + m[10] * p[2] + m[14]
  };
}

// Compressed models store positions as normalised integers under
// KHR_mesh_quantization, so accessor bounds have to be scaled back into unit
// range before the node transform is applied.
const NORMALISERS = {
  5120: 127,    // BYTE
  5121: 255,    // UNSIGNED_BYTE
  5122: 32767,  // SHORT
  5123: 65535   // UNSIGNED_SHORT
};

function denormalise(accessor, value) {
  if (!accessor.normalized) return value;

  const divisor = NORMALISERS[accessor.componentType];
  if (!divisor) return value;

  return Math.max(value / divisor, -1);
}

function readContainer(file) {
  const buffer = fs.readFileSync(file);

  if (buffer.readUInt32LE(0) !== 0x46546c67) {
    throw new Error("not a binary .glb (a .gltf + .bin pair needs converting first)");
  }

  const jsonLength = buffer.readUInt32LE(12);
  return JSON.parse(buffer.subarray(20, 20 + jsonLength).toString("utf8"));
}

// Walks the node hierarchy, turning every mesh primitive into a world-space box
// built from its accessor bounds.
function partsFromGltf(gltf) {
  const nodes = gltf.nodes || [];
  const roots = gltf.scenes?.[gltf.scene ?? 0]?.nodes ?? [];
  const parts = [];

  const walk = (index, parentMatrix, inheritedName) => {
    const node = nodes[index];
    if (!node) return;

    const world = multiply(parentMatrix, localMatrix(node));
    const name = node.name || inheritedName;

    if (node.mesh !== undefined) {
      const mesh = gltf.meshes[node.mesh];

      for (const primitive of mesh.primitives || []) {
        const accessor = gltf.accessors?.[primitive.attributes?.POSITION];
        if (!accessor?.min || !accessor?.max) continue;

        const min = { x: Infinity, y: Infinity, z: Infinity };
        const max = { x: -Infinity, y: -Infinity, z: -Infinity };

        for (let corner = 0; corner < 8; corner++) {
          const point = transform(world, [
            denormalise(accessor, corner & 1 ? accessor.max[0] : accessor.min[0]),
            denormalise(accessor, corner & 2 ? accessor.max[1] : accessor.min[1]),
            denormalise(accessor, corner & 4 ? accessor.max[2] : accessor.min[2])
          ]);

          for (const axis of ["x", "y", "z"]) {
            min[axis] = Math.min(min[axis], point[axis]);
            max[axis] = Math.max(max[axis], point[axis]);
          }
        }

        const label = name || mesh.name || "unnamed";
        parts.push({ ref: label, name: label, ...boundsOf(min, max) });
      }
    }

    for (const child of node.children || []) walk(child, world, name);
  };

  for (const root of roots) walk(root, localMatrix({}), null);

  return parts;
}

// ------------------------------------------------------------------ reporting

const GREEN = "\x1b[32m";
const RED = "\x1b[31m";
const YELLOW = "\x1b[33m";
const DIM = "\x1b[2m";
const OFF = "\x1b[0m";

function validate(file) {
  const name = path.basename(file);
  const sizeMb = fs.statSync(file).size / 1048576;

  const problems = [];
  const notes = [];

  let gltf;
  try {
    gltf = readContainer(file);
  } catch (error) {
    console.log(`${RED}FAIL${OFF} ${name}\n     ${error.message}\n`);
    return false;
  }

  const parts = partsFromGltf(gltf);
  const car = measureCar(parts);

  if (!car) {
    console.log(`${RED}FAIL${OFF} ${name}\n     no meshes with position bounds\n`);
    return false;
  }

  const wheels = detectWheels(car, parts);

  if (sizeMb > MAX_MB) {
    problems.push(`${sizeMb.toFixed(1)} MB is over the ${MAX_MB} MB budget — compress it`);
  }

  if (!wheels) {
    problems.push("wheels not found — wheel swapping, stance and plus-sizing will not work");
  }

  // A bounding box much wider than the wheel track means something is sticking
  // out, which is almost always a door or a mirror left open.
  if (wheels) {
    const ratio = wheels.track / car.width;
    if (ratio < 0.62) {
      problems.push(
        `body is ${(1 / ratio).toFixed(1)}x wider than its wheel track — doors are probably open`
      );
    }
    if (wheels.profile === "oversized") {
      notes.push("matched the oversized wheel profile (monster truck / lifted)");
    }
  }

  const proportion = car.length / car.width;
  if (proportion < 1.4 || proportion > 3.4) {
    notes.push(`unusual proportions (length is ${proportion.toFixed(1)}x width)`);
  }

  const ok = problems.length === 0;
  console.log(`${ok ? GREEN + "PASS" : RED + "FAIL"}${OFF} ${name} ${DIM}${sizeMb.toFixed(1)} MB, ${parts.length} meshes${OFF}`);

  console.log(
    `     ${DIM}length axis${OFF} ${car.lengthAxis}   ` +
    `${DIM}rear faces${OFF} ${car.rearSign > 0 ? "+" : "-"}${car.lengthAxis}   ` +
    `${DIM}proportions${OFF} ${proportion.toFixed(2)}x`
  );

  if (wheels) {
    console.log(
      `     ${DIM}wheels${OFF} 4 found   ` +
      `${DIM}wheelbase${OFF} ${(wheels.wheelbase / car.length).toFixed(2)} of length   ` +
      `${DIM}radius${OFF} ${(wheels.radius / car.length).toFixed(3)} of length   ` +
      `${DIM}track${OFF} ${(wheels.track / car.width).toFixed(2)} of width`
    );
  }

  for (const problem of problems) console.log(`     ${RED}x${OFF} ${problem}`);
  for (const note of notes) console.log(`     ${YELLOW}!${OFF} ${note}`);

  console.log();
  return ok;
}

// ----------------------------------------------------------------------- main

const targets = process.argv.slice(2);

if (!targets.length) {
  console.log("usage: node tools/validate-model.mjs <file-or-directory> [...]");
  process.exit(1);
}

const files = targets.flatMap((target) => {
  if (!fs.existsSync(target)) {
    console.log(`${RED}missing${OFF} ${target}`);
    return [];
  }

  return fs.statSync(target).isDirectory()
    ? fs.readdirSync(target)
        .filter((entry) => entry.toLowerCase().endsWith(".glb"))
        .map((entry) => path.join(target, entry))
    : [target];
});

console.log();
const results = files.map(validate);
const passed = results.filter(Boolean).length;

console.log(
  `${passed === results.length ? GREEN : YELLOW}${passed}/${results.length} usable${OFF}\n`
);

process.exit(passed === results.length ? 0 : 1);
