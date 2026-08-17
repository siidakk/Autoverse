import * as THREE from "three";

// The sample models come from different authors, so their wheels are named
// every possible way (tire07, polySurface80_r, r35_wheel_05a, Object_31).
// Nothing can be matched by name, so the car is measured instead.

const WORK_MATRIX = new THREE.Matrix4();
const RAYCASTER = new THREE.Raycaster();

function meshBoxInSceneSpace(mesh, sceneInverse) {
  if (!mesh.geometry.boundingBox) {
    mesh.geometry.computeBoundingBox();
  }

  WORK_MATRIX.multiplyMatrices(sceneInverse, mesh.matrixWorld);

  return new THREE.Box3()
    .copy(mesh.geometry.boundingBox)
    .applyMatrix4(WORK_MATRIX);
}

function median(values) {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)];
}

// A boot lid always sits higher than a bonnet, on hatchbacks and mid-engined
// cars alike, so the taller end of the body is the back of the car.
function findRearSign(box, size, lengthAxis, parts) {
  const band = size[lengthAxis] * 0.12;
  let topAtMax = -Infinity;
  let topAtMin = -Infinity;

  for (const part of parts) {
    if (Math.abs(part.center[lengthAxis] - box.max[lengthAxis]) <= band) {
      topAtMax = Math.max(topAtMax, part.box.max.y);
    }
    if (Math.abs(part.center[lengthAxis] - box.min[lengthAxis]) <= band) {
      topAtMin = Math.max(topAtMin, part.box.max.y);
    }
  }

  return topAtMax >= topAtMin ? 1 : -1;
}

export function inspectCar(scene) {
  scene.updateWorldMatrix(true, true);

  const sceneInverse = new THREE.Matrix4()
    .copy(scene.matrixWorld)
    .invert();

  const box = new THREE.Box3();
  const parts = [];

  scene.traverse((child) => {
    if (!child.isMesh || !child.geometry) return;

    const meshBox = meshBoxInSceneSpace(child, sceneInverse);
    if (!Number.isFinite(meshBox.min.x)) return;

    parts.push({
      mesh: child,
      box: meshBox,
      center: meshBox.getCenter(new THREE.Vector3()),
      size: meshBox.getSize(new THREE.Vector3())
    });

    box.union(meshBox);
  });

  if (parts.length === 0) return null;

  const size = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());

  // The longest horizontal axis is the car's length, the other its track.
  const lengthAxis = size.x >= size.z ? "x" : "z";
  const widthAxis = lengthAxis === "x" ? "z" : "x";

  // Some models arrive with their doors swung open, which throws the bounding
  // box wider than the car and drags its middle off to one side. The median of
  // the panels is unmoved by those outliers, so it is used as the centreline.
  const midWidth = median(parts.map((part) => part.center[widthAxis]));

  return {
    box,
    size,
    center,
    lengthAxis,
    widthAxis,
    midWidth,
    length: size[lengthAxis],
    width: size[widthAxis],
    height: size.y,
    rearSign: findRearSign(box, size, lengthAxis, parts),
    parts
  };
}

export function detectWheels(car) {
  const { box, lengthAxis, widthAxis, midWidth, length, parts } = car;

  // Thresholds are taken from the car's length, the one dimension that is not
  // thrown out by open doors or mirrors.
  const candidates = [];

  for (const part of parts) {
    const { box: partBox, center, size } = part;

    const diameter = Math.max(size[lengthAxis], size.y);
    if (diameter < length * 0.08 || diameter > length * 0.26) continue;

    // Round: as tall as it is long. Seat backs and door cards fail here.
    if (Math.min(size[lengthAxis], size.y) / diameter < 0.7) continue;

    // Out at the corners rather than along the centreline.
    if (Math.abs(center[widthAxis] - midWidth) < length * 0.1) continue;

    // Thick enough to be a tyre, but not a whole panel.
    const thickness = size[widthAxis];
    if (thickness < diameter * 0.15 || thickness > diameter * 1.3) continue;

    // A wheel's centre sits about one radius off the ground, which is what
    // separates it from the fenders and headlights around it.
    if (Math.abs(center.y - (box.min.y + diameter / 2)) > diameter * 0.5) continue;

    candidates.push({ mesh: part.mesh, box: partBox, center, diameter });
  }

  if (candidates.length < 4) return null;

  const mergeDistance = median(candidates.map((c) => c.diameter)) * 0.5;

  // Tyre, rim, brake disc and caliper are separate meshes that all belong to
  // one wheel, so overlapping candidates are merged into assemblies.
  const clusters = [];

  for (const candidate of candidates) {
    const match = clusters.find(
      (cluster) => cluster.center.distanceTo(candidate.center) < mergeDistance
    );

    if (match) {
      match.meshes.push(candidate.mesh);
      match.box.union(candidate.box);
      match.box.getCenter(match.center);
    } else {
      clusters.push({
        meshes: [candidate.mesh],
        box: candidate.box.clone(),
        center: candidate.center.clone()
      });
    }
  }

  // No wheel is a seventh of the car long; anything bigger is bodywork.
  const measured = clusters
    .map((cluster) => {
      const clusterSize = cluster.box.getSize(new THREE.Vector3());
      return {
        meshes: cluster.meshes,
        center: cluster.center,
        radius: Math.max(clusterSize[lengthAxis], clusterSize.y) / 2,
        thickness: clusterSize[widthAxis]
      };
    })
    .filter((wheel) => wheel.radius <= length * 0.13);

  if (measured.length < 4) return null;

  const alongLength = (wheel) => wheel.center[lengthAxis];
  const offCentre = (wheel) => wheel.center[widthAxis] - midWidth;

  // Wheels come in mirrored pairs, so the pairs are found first and the front
  // and rear axle picked from them.
  const axles = [];

  for (let i = 0; i < measured.length; i++) {
    for (let j = i + 1; j < measured.length; j++) {
      const a = measured[i];
      const b = measured[j];

      if (Math.sign(offCentre(a)) === Math.sign(offCentre(b))) continue;
      if (Math.abs(alongLength(a) - alongLength(b)) > length * 0.06) continue;
      if (Math.abs(Math.abs(offCentre(a)) - Math.abs(offCentre(b))) > length * 0.06) continue;

      const radiusGap =
        Math.abs(a.radius - b.radius) / Math.max(a.radius, b.radius);
      if (radiusGap > 0.45) continue;

      axles.push({
        wheels: [a, b],
        at: (alongLength(a) + alongLength(b)) / 2
      });
    }
  }

  if (axles.length < 2) return null;

  let front = null;
  let rear = null;
  let bestSeparation = 0;

  for (let i = 0; i < axles.length; i++) {
    for (let j = i + 1; j < axles.length; j++) {
      const separation = Math.abs(axles[i].at - axles[j].at);
      if (separation > bestSeparation) {
        bestSeparation = separation;
        front = axles[i];
        rear = axles[j];
      }
    }
  }

  // A real wheelbase covers most of the car's length.
  if (bestSeparation < length * 0.35) return null;

  const picked = [...front.wheels, ...rear.wheels];
  const radius = median(picked.map((w) => w.radius));

  return {
    axleAxis: widthAxis,
    radius,
    // The distance across the wheels is a truer measure of how wide the car is
    // than its bounding box.
    track: median(picked.map((w) => Math.abs(offCentre(w)))) * 2,
    meshes: picked.flatMap((wheel) => wheel.meshes),
    wheels: picked.map((wheel) => ({
      position: [wheel.center.x, wheel.center.y, wheel.center.z],
      radius: wheel.radius,
      // Calipers can inflate the measured width, so it is kept sane.
      thickness: THREE.MathUtils.clamp(
        wheel.thickness,
        wheel.radius * 0.4,
        wheel.radius * 1.2
      )
    }))
  };
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
