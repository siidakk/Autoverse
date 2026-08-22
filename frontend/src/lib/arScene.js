// The car, as it currently stands on screen, ready to be taken somewhere else.
//
// The first version of AR reloaded the .glb and painted it, which meant the
// wheels you fitted, the spoiler, the exhaust and the stance were all silently
// missing -- while the button cheerfully claimed "everything you have fitted
// comes with it". It did not.
//
// This takes the group the configurator has actually assembled and clones it.
// Whatever is on screen is what travels, on both platforms, because both
// platforms are handed the same clone.

import * as THREE from "three";

// A real car is about this long. The configurator normalises every model to it,
// so exporting at world scale gives a life sized car without any conversion.
export const CAR_LENGTH = 4.6;

/**
 * A detached copy of the configured car, stood on its own origin.
 *
 * Cloned rather than moved: the original is still being rendered by the
 * configurator, and taking it out of that scene would leave a blank canvas
 * behind for as long as AR was open.
 */
export function snapshot(stage) {
  if (!stage) return null;

  const copy = stage.clone(true);

  // A clone shares materials with the original, so anything done to them here
  // would show up behind the AR session too.
  copy.traverse((child) => {
    if (child.isMesh && child.material) {
      child.material = Array.isArray(child.material)
        ? child.material.map((entry) => entry.clone())
        : child.material.clone();
    }
  });

  // Lights do not survive either export, and an underglow light left in the
  // graph exports as nothing while costing a node.
  const lights = [];
  copy.traverse((child) => {
    if (child.isLight) lights.push(child);
  });
  for (const light of lights) light.removeFromParent();

  // The configurator's group carries the scale and offset that normalised the
  // model. Baking it means the caller gets a car at metres, sitting on y = 0,
  // whatever the original file measured.
  copy.updateMatrixWorld(true);

  const box = new THREE.Box3().setFromObject(copy);
  const centre = box.getCenter(new THREE.Vector3());

  const holder = new THREE.Group();
  holder.add(copy);

  copy.position.x -= centre.x;
  copy.position.z -= centre.z;
  copy.position.y -= box.min.y;

  holder.userData.length = Math.max(box.max.x - box.min.x, box.max.z - box.min.z);

  return holder;
}

// Frees a snapshot. The geometry belongs to the live scene and is left alone;
// the materials were cloned above and are ours to release.
export function release(object) {
  if (!object) return;

  object.traverse((child) => {
    if (!child.isMesh) return;
    const materials = Array.isArray(child.material) ? child.material : [child.material];
    for (const material of materials) material?.dispose?.();
  });
}
