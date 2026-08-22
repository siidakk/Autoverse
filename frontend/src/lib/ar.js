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
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { MeshoptDecoder } from "three/examples/jsm/libs/meshopt_decoder.module.js";
import { inspectCar, detectLights } from "../utils/carGeometry";
import { looksLikeTrim } from "../utils/lightDetection";

// Real cars are about this long, and the configurator normalises every model
// to it, so a life size placement means something.
const TARGET_LENGTH = 4.6;

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

  const ios = /iPad|iPhone|iPod/.test(navigator.userAgent);
  if (ios) {
    return "Safari does not support WebXR, so in-room AR is not available on iPhone or iPad. It works on Android in Chrome.";
  }

  if (!navigator.xr) {
    return "This browser has no WebXR. On Android, Chrome supports it; on a laptop there is usually no camera pose to place anything against.";
  }

  return "This device reports no augmented reality support.";
}

function paint(scene, colour) {
  const measured = inspectCar(scene);
  if (!measured) return;

  const lights = detectLights(measured);
  const wheels = new Set();

  scene.traverse((child) => {
    if (!child.isMesh || !child.material) return;

    // Cloned so painting the AR copy cannot bleed back into the configurator,
    // which shares the same cached glTF.
    child.material = child.material.clone();

    const material = child.material;
    const name = `${child.name} ${material.name ?? ""}`;

    if (/glass|window|windscreen|windshield|glazing/i.test(name)) return;
    if (lights.meshes.has(child)) return;
    if (looksLikeTrim(child.name) || looksLikeTrim(material.name)) return;
    if (wheels.has(child)) return;

    material.color = new THREE.Color(colour);
    material.needsUpdate = true;
  });
}

function fit(scene) {
  const measured = inspectCar(scene);
  if (!measured) return { scale: 1, lift: 0 };

  return {
    scale: TARGET_LENGTH / measured.length,
    lift: -measured.box.min.y
  };
}

/**
 * Opens an immersive AR session. Resolves when the session ends.
 *
 * `overlay` is a DOM element shown over the camera feed during the session,
 * which is how the exit button and the size control stay reachable.
 */
export async function startAR({ model, colour = "#d8dce1", overlay, onStatus }) {
  const supported = await arAvailable();
  if (!supported) throw new Error(unavailableBecause());

  onStatus?.("Loading the car");

  const loader = new GLTFLoader();
  loader.setMeshoptDecoder(MeshoptDecoder);

  const gltf = await loader.loadAsync(model);
  const car = gltf.scene;

  paint(car, colour);
  const { scale, lift } = fit(car);

  // The car hangs inside a group so placement moves the group and scale is
  // applied to the car, which keeps the two from fighting each other.
  const holder = new THREE.Group();
  car.position.y = lift * scale;
  car.scale.setScalar(scale);
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
      car.scale.setScalar(scale * factor);
      car.position.y = lift * scale * factor;
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

      // Materials were cloned per mesh above, so they are this session's to
      // free. The geometry belongs to the cached glTF and is left alone.
      car.traverse((child) => {
        if (child.isMesh) child.material?.dispose?.();
      });

      resolve();
    });
  });

  return { ...handle, finished };
}
