import { useMemo } from "react";
import * as THREE from "three";

// Headlights aim out of the front of the car. Which end that is comes from the
// rear detection, so no model needs to be told which way it faces.
//
// The model's own headlight meshes cannot be found reliably by name, so rather
// than recolouring them this adds lamps at the nose: a visible source plus a
// real beam that lights the road.

const presets = {
  halogen: { colour: "#ffd9a0", intensity: 1.6 },
  xenon: { colour: "#eaf2ff", intensity: 2.4 },
  laser: { colour: "#cfe4ff", intensity: 3.4 }
};

export default function Headlights({ type, car }) {
  // A spotlight only aims at a target that is part of the scene, so each lamp
  // gets its own object placed down the road ahead.
  const targets = useMemo(
    () => [new THREE.Object3D(), new THREE.Object3D()],
    []
  );

  if (!type || type === "stock" || !car) return null;

  const preset = presets[type];
  if (!preset) return null;

  const { lengthAxis, widthAxis, midWidth, length, width, height, box, rearSign } = car;

  // The nose is the opposite end to the boot.
  const frontSign = -rearSign;
  const frontEnd = frontSign > 0 ? box.max[lengthAxis] : box.min[lengthAxis];

  const lengthIndex = lengthAxis === "x" ? 0 : 2;
  const widthIndex = widthAxis === "x" ? 0 : 2;

  const lensRadius = length * 0.02;
  const lampHeight = box.min.y + height * 0.44;
  const offsets = [width * 0.29, -width * 0.29];

  const at = (lateral, along, up) => {
    const position = [0, up, 0];
    position[lengthIndex] = frontEnd + frontSign * along;
    position[widthIndex] = midWidth + lateral;
    return position;
  };

  return (
    <group>
      {offsets.map((lateral, index) => (
        <group key={lateral}>

          {/* AIMING POINT, DOWN THE ROAD AND SLIGHTLY OUTWARD */}
          <primitive
            object={targets[index]}
            position={at(lateral * 1.6, length * 1.5, box.min.y)}
          />

          {/* LENS */}
          <mesh position={at(lateral, length * 0.005, lampHeight)}>
            <sphereGeometry args={[lensRadius, 20, 20]} />
            <meshBasicMaterial color={preset.colour} toneMapped={false} />
          </mesh>

          {/* BEAM */}
          <spotLight
            position={at(lateral, length * 0.02, lampHeight)}
            target={targets[index]}
            color={preset.colour}
            intensity={length * preset.intensity}
            angle={0.55}
            penumbra={0.65}
            distance={length * 2.6}
            decay={1.5}
          />
        </group>
      ))}
    </group>
  );
}
