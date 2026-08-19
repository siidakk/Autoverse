import { useGLTF } from "@react-three/drei";
import { useEffect, useMemo } from "react";
import * as THREE from "three";
import Wheels from "./accessories/Wheels";
import Spoiler from "./accessories/Spoiler";
import Exhaust from "./accessories/Exhaust";
import Headlights from "./accessories/Headlights";
import Underglow from "./accessories/Underglow";
import { inspectCar, detectWheels } from "../utils/carGeometry";

// Every model arrives at a different scale and sitting at a different height,
// so each one is normalised to the same length and stood on the floor.
const TARGET_LENGTH = 4.6;

export default function CarModel({
  car,
  color,
  paint,
  wheelType,
  spoilerType,
  wheelSize = 1,
  stance = 0,
  exhaustType = "stock",
  headlightType = "stock",
  underglow = null
}) {

  const { scene } = useGLTF(car.model);

  const measurements = useMemo(() => {
    const measured = inspectCar(scene);
    if (!measured) return null;

    return { car: measured, wheels: detectWheels(measured) };
  }, [scene]);

  const fit = useMemo(() => {
    if (!measurements) return { scale: 1, position: [0, 0, 0] };

    const { box, center, length, widthAxis, midWidth } = measurements.car;
    const scale = TARGET_LENGTH / length;

    // Centred on the panels sideways and on the bounding box lengthways, then
    // stood on the floor.
    const offset = { x: -center.x, y: -box.min.y, z: -center.z };
    offset[widthAxis] = -midWidth;

    return {
      scale,
      position: [offset.x * scale, offset.y * scale, offset.z * scale]
    };
  }, [measurements]);

  const detected = measurements?.wheels ?? null;

  // Lowering drops the body towards the wheels. How far it can go is set by the
  // bodywork itself: whatever sits lowest once the wheels are discounted, less
  // a little clearance, so no car is ever pushed through the floor.
  const drop = useMemo(() => {
    if (!measurements || !detected || !stance) return 0;

    const wheelMeshes = new Set(detected.meshes);
    let bodyFloor = Infinity;

    for (const part of measurements.car.parts) {
      if (wheelMeshes.has(part.ref)) continue;
      bodyFloor = Math.min(bodyFloor, part.min.y);
    }

    if (!Number.isFinite(bodyFloor)) return 0;

    const clearance = bodyFloor - measurements.car.box.min.y;
    return Math.max(clearance - measurements.car.height * 0.012, 0) * stance;
  }, [measurements, detected, stance]);

  // The model's own wheels are swapped out for the custom ones, and are put
  // back when the stock option is selected.
  useEffect(() => {
    if (!detected) return;

    const hidden = wheelType !== "stock";
    detected.meshes.forEach((mesh) => {
      mesh.visible = !hidden;
    });

    return () => {
      detected.meshes.forEach((mesh) => {
        mesh.visible = true;
      });
    };
  }, [detected, wheelType]);

  useEffect(() => {
    if (!scene) return;

    // Tyres and rims keep their own materials instead of taking body paint.
    const wheelMeshes = new Set(detected?.meshes ?? []);

    scene.traverse((child) => {
      if (child.isMesh) {

        child.castShadow = true;
        child.receiveShadow = true;

        if (wheelMeshes.has(child)) return;

        child.material = child.material.clone();

        // BASE COLOR
        child.material.color = new THREE.Color(color);

        // PAINT SYSTEM
        child.material.metalness = paint.metalness;
        child.material.roughness = paint.roughness;

        // CLEARCOAT (if supported)
        if ("clearcoat" in child.material) {
          child.material.clearcoat = paint.clearcoat;
          child.material.clearcoatRoughness = 0.1;
        }

        child.material.needsUpdate = true;
      }
    });

  }, [scene, color, paint, detected]);

  return (
    <group scale={fit.scale} position={fit.position}>

      {/* The body moves, the wheels stay on the road */}
      <group position={[0, -drop, 0]}>
        <primitive object={scene} />

        <Spoiler
          type={spoilerType}
          car={measurements?.car}
          scene={scene}
          track={detected?.track}
        />

        <Exhaust type={exhaustType} car={measurements?.car} />

        <Headlights type={headlightType} car={measurements?.car} />
      </group>

      {/* Lighting under the car stays with the road, not the lowered body */}
      <Underglow
        colour={underglow}
        car={measurements?.car}
        radius={detected?.radius}
      />

      <Wheels
        type={wheelType}
        wheels={detected?.wheels}
        axleAxis={detected?.axleAxis}
        sizeStep={wheelSize}
      />
    </group>
  );
}
