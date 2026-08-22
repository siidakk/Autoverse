#!/usr/bin/env node
//
// Checks the part of AR that does not need a phone.
//
//   npm run test:ar
//
// Neither an immersive session nor Quick Look can be driven from here, so what
// is checked is the step both of them depend on: turning the configurator's
// live scene into a detached, correctly placed copy, and getting a USDZ out of
// it. If that copy is wrong, both platforms are wrong in the same way -- which
// is exactly what happened when AR reloaded the bare model and left every
// fitted part behind.

import * as THREE from "three";
import { USDZExporter } from "three/examples/jsm/exporters/USDZExporter.js";
import { snapshot, release } from "../src/lib/arScene.js";

const GREEN = "\x1b[32m", RED = "\x1b[31m", DIM = "\x1b[2m", OFF = "\x1b[0m";

const checks = [];
const check = (name, passed, detail = "") => checks.push({ name, passed, detail });

// A stand-in for what the configurator assembles: a body, four wheels, a
// spoiler and an underglow light, inside a group carrying the scale and offset
// that normalise every model.
function buildStage() {
  const stage = new THREE.Group();
  stage.scale.setScalar(0.5);
  stage.position.set(3, 1.5, -2);

  const paint = new THREE.MeshStandardMaterial({ color: 0xff0000 });

  const body = new THREE.Mesh(new THREE.BoxGeometry(9.2, 2.4, 3.6), paint);
  body.position.y = 2.4;
  body.name = "body";
  stage.add(body);

  for (const [x, z] of [[-3, 1.6], [-3, -1.6], [3, 1.6], [3, -1.6]]) {
    const wheel = new THREE.Mesh(
      new THREE.CylinderGeometry(1.2, 1.2, 0.7, 12),
      new THREE.MeshStandardMaterial({ color: 0x111111 })
    );
    wheel.rotation.x = Math.PI / 2;
    wheel.position.set(x, 1.2, z);
    wheel.name = "wheel";
    stage.add(wheel);
  }

  const spoiler = new THREE.Mesh(
    new THREE.BoxGeometry(0.6, 0.2, 3),
    new THREE.MeshStandardMaterial({ color: 0x222222 })
  );
  spoiler.position.set(-4.2, 3.8, 0);
  spoiler.name = "spoiler";
  stage.add(spoiler);

  const glow = new THREE.PointLight(0x00ffcc, 3);
  glow.position.y = 0.3;
  stage.add(glow);

  stage.updateMatrixWorld(true);
  return stage;
}

const stage = buildStage();
const before = new THREE.Box3().setFromObject(stage).clone();

const copy = snapshot(stage);

check("a snapshot is produced", Boolean(copy));

// Everything fitted has to be in it. This is the check that would have caught
// AR showing a stock car.
const names = [];
copy.traverse((child) => {
  if (child.isMesh) names.push(child.name);
});

check("the body is included", names.includes("body"));
check("all four wheels are included", names.filter((n) => n === "wheel").length === 4,
  `found ${names.filter((n) => n === "wheel").length}`);
check("the spoiler is included", names.includes("spoiler"));

let lights = 0;
copy.traverse((child) => {
  if (child.isLight) lights++;
});
check("lights are stripped", lights === 0, `found ${lights}`);

// Placed on its own origin, standing on the ground.
const box = new THREE.Box3().setFromObject(copy);
const centre = box.getCenter(new THREE.Vector3());

check("it stands on y = 0", Math.abs(box.min.y) < 1e-6, `min.y ${box.min.y.toFixed(4)}`);
check("it is centred on x", Math.abs(centre.x) < 1e-6, `x ${centre.x.toFixed(4)}`);
check("it is centred on z", Math.abs(centre.z) < 1e-6, `z ${centre.z.toFixed(4)}`);

// The configurator normalises to 4.6 m, and the group's own scale has to be
// respected rather than thrown away -- get this wrong and a car arrives in
// somebody's driveway at twice the size of the house.
const length = Math.max(box.max.x - box.min.x, box.max.z - box.min.z);
check("the group's scale is kept", Math.abs(length - 4.6) < 0.01, `${length.toFixed(3)} m`);

// The live scene must be untouched: it is still being rendered behind the AR
// session, and moving it would blank the configurator.
const after = new THREE.Box3().setFromObject(stage);
check("the live scene is not moved",
  after.min.distanceTo(before.min) < 1e-9 && after.max.distanceTo(before.max) < 1e-9);

// Materials must be copies, or painting in AR would repaint the configurator.
const liveMaterial = stage.children.find((c) => c.name === "body").material;
const copyMaterial = (() => {
  let found = null;
  copy.traverse((child) => {
    if (child.isMesh && child.name === "body") found = child.material;
  });
  return found;
})();
check("materials are cloned", copyMaterial && copyMaterial !== liveMaterial);

// --- and out to a file iOS will open ---

let usdz = null;
try {
  usdz = await new USDZExporter().parseAsync(copy);
} catch (error) {
  check("USDZ export", false, error.message.slice(0, 90));
}

if (usdz) {
  check("USDZ export produces a file", usdz.byteLength > 1000, `${usdz.byteLength} bytes`);
  // A .usdz is a zip. Quick Look refuses anything that is not.
  check("it is a zip, as Quick Look requires",
    usdz[0] === 0x50 && usdz[1] === 0x4b,
    `starts ${usdz[0]?.toString(16)} ${usdz[1]?.toString(16)}`);
  console.log(`\n  ${DIM}USDZ is ${(usdz.byteLength / 1024).toFixed(1)} KB for this test car${OFF}`);
}

release(copy);

console.log();
let failures = 0;
for (const { name, passed, detail } of checks) {
  if (passed) console.log(`  ${GREEN}pass${OFF}  ${name}`);
  else {
    failures++;
    console.log(`  ${RED}FAIL${OFF}  ${name}${detail ? `${DIM} — ${detail}${OFF}` : ""}`);
  }
}

console.log(
  `\n${failures ? RED : GREEN}${checks.length - failures}/${checks.length} AR checks pass${OFF}\n`
);

process.exit(failures ? 1 : 0);
