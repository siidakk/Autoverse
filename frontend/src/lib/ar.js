// Standing the car you just built on your own driveway.
//
// This is the one feature where the project's whole argument gets tested by
// something outside the screen. If the proportions are wrong you will see it
// immediately, because there is a real doorway next to it.
//
// Built directly on WebXR and three.js rather than on a wrapper. The
// configurator's canvas cannot be reused: an immersive session needs its own
// renderer with `xr.enabled` set before it starts, and taking over the
// configurator's renderer would leave the page dead when the session ended.
// So this makes its own, uses it, and throws it away.
//
// The car is measured and painted by exactly the same code the configurator
// uses, so what you walk around is what you configured, including which parts
// keep their factory colour.

import * as THREE from "three";
import { snapshot, release } from "./arScene";
import { isApple } from "./arQuickLook";

export async function arAvailable() {
  if (typeof navigator === "undefined" || !navigator.xr) return false;
  try {
    return await navigator.xr.isSessionSupported("immersive-ar");
  } catch {
    return false;
  }
}

// Why it will not work, in words. iOS is the common case and deserves a real
// answer rather than a disabled button.
export function unavailableBecause() {
  if (typeof navigator === "undefined") return "Not running in a browser";

  // iOS is handled by Quick Look rather than here, so reaching this on an
  // Apple device means Quick Look was unavailable too.
  if (isApple()) {
    return "AR on iPhone and iPad runs through Safari. Open this page in Safari and the button will work.";
  }

  // A laptop is the common case, and "no support" is a useless thing to tell
  // someone sitting at one. What they need to know is that this is a phone
  // feature and how to get it onto theirs.
  return "AR needs a phone or tablet that can track the room. Open this same build on a phone and the button will work there.";
}

// Whether the reason is "wrong device" rather than "broken", which decides
// whether offering a way onto a phone makes any sense.
export function isDeviceLimitation() {
  if (typeof navigator === "undefined") return false;
  if (isApple()) return false;
  return !/Android/i.test(navigator.userAgent) || !navigator.xr;
}

/**
 * Opens an immersive AR session. Resolves when the session ends.
 *
 * `overlay` is a DOM element shown over the camera feed during the session,
 * which is how the exit button and the size control stay reachable.
 */
export async function startAR({ stage, overlay, onStatus }) {
  const supported = await arAvailable();
  if (!supported) throw new Error(unavailableBecause());

  onStatus?.("Preparing the car");

  // Taken from what the configurator has assembled, so the wheels, spoiler,
  // exhaust and ride height come too. Reloading the file instead is how the
  // first version of this ended up showing a stock car.
  const car = snapshot(stage);
  if (!car) throw new Error("The car is still loading.");

  const holder = new THREE.Group();
  holder.add(car);
  holder.visible = false;

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.xr.enabled = true;
  renderer.domElement.style.display = "none";
  document.body.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.01, 60);

  scene.add(holder);
  scene.add(new THREE.HemisphereLight(0xffffff, 0x445566, 2.2));

  const sun = new THREE.DirectionalLight(0xffffff, 1.6);
  sun.position.set(2, 6, 3);
  scene.add(sun);

  // The ring that tells you where the car will land. A flat circle lying on
  // whatever surface the device has found.
  const reticle = new THREE.Mesh(
    new THREE.RingGeometry(0.13, 0.15, 40).rotateX(-Math.PI / 2),
    new THREE.MeshBasicMaterial({ color: 0xff5e1a })
  );
  reticle.matrixAutoUpdate = false;
  reticle.visible = false;
  scene.add(reticle);

  const session = await navigator.xr.requestSession("immersive-ar", {
    requiredFeatures: ["hit-test"],
    optionalFeatures: ["dom-overlay", "light-estimation"],
    domOverlay: overlay ? { root: overlay } : undefined
  });

  await renderer.xr.setSession(session);
  onStatus?.("Point at the ground");

  const viewerSpace = await session.requestReferenceSpace("viewer");
  const localSpace = await session.requestReferenceSpace("local");
  const hitTest = await session.requestHitTestSource({ space: viewerSpace });

  let placed = false;

  const place = () => {
    if (!reticle.visible) return;
    holder.position.setFromMatrixPosition(reticle.matrix);
    // Kept upright: a car tilted to match a sloping floor looks broken, and
    // the yaw from a hit test is arbitrary anyway.
    holder.visible = true;
    placed = true;
    onStatus?.("Walk around it");
  };

  session.addEventListener("select", place);

  renderer.setAnimationLoop((_, frame) => {
    if (frame && !placed) {
      const hits = frame.getHitTestResults(hitTest);

      if (hits.length) {
        const pose = hits[0].getPose(localSpace);
        reticle.visible = true;
        reticle.matrix.fromArray(pose.transform.matrix);
      } else {
        reticle.visible = false;
      }
    } else {
      reticle.visible = false;
    }

    renderer.render(scene, camera);
  });

  // Handed back so the overlay can drive the session without knowing anything
  // about three.js.
  const handle = {
    setScale(factor) {
      car.scale.setScalar(factor);
    },
    reposition() {
      placed = false;
      holder.visible = false;
      onStatus?.("Point at the ground");
    },
    end: () => session.end()
  };

  const finished = new Promise((resolve) => {
    session.addEventListener("end", () => {
      renderer.setAnimationLoop(null);
      hitTest?.cancel?.();
      renderer.domElement.remove();
      renderer.dispose();

      // The snapshot cloned its materials, so they are this session's to free.
      // Geometry belongs to the live scene and is left alone.
      release(car);

      resolve();
    });
  });

  return { ...handle, finished };
}
