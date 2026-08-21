import * as THREE from "three";
import {
  measureCar,
  detectWheels as detectWheelsIn,
  boundsOf
} from "./wheelDetection";
import { detectLights as detectLightsIn } from "./lightDetection";

// Turns a loaded glTF scene into the plain part list the detection algorithm
// works on. The algorithm itself lives in wheelDetection.js so the command line
// validator can run exactly the same checks on a file before it ships.

const WORK_MATRIX = new THREE.Matrix4();
const RAYCASTER = new THREE.Raycaster();

function partsFromScene(scene) {
  scene.updateWorldMatrix(true, true);

  const sceneInverse = new THREE.Matrix4().copy(scene.matrixWorld).invert();
  const parts = [];

  scene.traverse((child) => {
    if (!child.isMesh || !child.geometry) return;

    if (!child.geometry.boundingBox) {
      child.geometry.computeBoundingBox();
    }

    WORK_MATRIX.multiplyMatrices(sceneInverse, child.matrixWorld);

    const box = new THREE.Box3()
      .copy(child.geometry.boundingBox)
      .applyMatrix4(WORK_MATRIX);

    if (!Number.isFinite(box.min.x)) return;

    parts.push({
      ref: child,
      name: child.name,
      ...boundsOf(
        { x: box.min.x, y: box.min.y, z: box.min.z },
        { x: box.max.x, y: box.max.y, z: box.max.z }
      )
    });
  });

  return parts;
}

export function inspectCar(scene) {
  const parts = partsFromScene(scene);
  const measurement = measureCar(parts);
  if (!measurement) return null;

  return { ...measurement, parts };
}

export function detectWheels(car) {
  const found = detectWheelsIn(car, car.parts);
  if (!found) return null;

  // The algorithm hands back whatever ref it was given, which here is the mesh.
  return { ...found, meshes: found.refs };
}

// The light units, handed back as the meshes themselves so the paint pass can
// simply skip them.
export function detectLights(car) {
  const found = detectLightsIn(car, car.parts);
  return { ...found, meshes: new Set(found.refs) };
}

// Drops a ray onto the bodywork to find the exact height of the panel at a
// point, which is how the spoiler lands on the boot lid rather than at a
// guessed offset. Coordinates and the result are in the scene's own space.
export function sampleSurfaceHeight(scene, car, alongLength, lateral) {
  const { box, lengthAxis, widthAxis, height } = car;

  const origin = new THREE.Vector3();
  origin.y = box.max.y + height;
  origin[lengthAxis] = alongLength;
  origin[widthAxis] = lateral;

  scene.updateWorldMatrix(true, true);
  scene.localToWorld(origin);

  const direction = new THREE.Vector3(0, -1, 0)
    .transformDirection(scene.matrixWorld)
    .normalize();

  RAYCASTER.set(origin, direction);
  RAYCASTER.far = Infinity;

  const hits = RAYCASTER.intersectObject(scene, true);

  for (const hit of hits) {
    if (hit.object.visible === false) continue;
    return scene.worldToLocal(hit.point.clone()).y;
  }

  return null;
}
