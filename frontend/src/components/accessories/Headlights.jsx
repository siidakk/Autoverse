import { useMemo } from "react";
import * as THREE from "three";

// Headlight units are a different shape and size on every car, and none of them
// can be picked out by name across this garage, so nothing tries to draw a lamp.
// What is drawn is the beam: light thrown forward out of the nose, which is the
// part that actually reads, and which works whatever the light unit looks like.
//
// Which end the nose is comes from the rear detection, so no model has to be
// told which way it faces.

const presets = {
  halogen: { colour: "#ffd9a0", intensity: 1.4, cone: 0.1, reach: 1.5 },
  xenon: { colour: "#eaf2ff", intensity: 2.2, cone: 0.14, reach: 1.9 },
  laser: { colour: "#dbe9ff", intensity: 3.2, cone: 0.18, reach: 2.4 }
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

  const frontSign = -rearSign;
  const frontEnd = frontSign > 0 ? box.max[lengthAxis] : box.min[lengthAxis];

  const lengthIndex = lengthAxis === "x" ? 0 : 2;
  const widthIndex = widthAxis === "x" ? 0 : 2;

  // Roughly where a headlight sits on any car: outboard, a little under half
  // the body height.
  const lamps = [width * 0.31, -width * 0.31];
  const lampHeight = box.min.y + height * 0.42;

  const at = (lateral, along, up) => {
    const position = [0, up, 0];
    position[lengthIndex] = frontEnd + frontSign * along;
    position[widthIndex] = midWidth + lateral;
    return position;
  };

  // The cone tapers from the lamp outwards, so its point sits at the nose and
  // it widens down the road.
  const beamLength = length * preset.reach;
  const beamRadius = width * preset.cone * 3;

  const beamRotation =
    lengthAxis === "x"
      ? [0, 0, frontSign > 0 ? Math.PI / 2 : -Math.PI / 2]
      : [frontSign > 0 ? -Math.PI / 2 : Math.PI / 2, 0, 0];

  return (
    <group>
      {lamps.map((lateral, index) => (
        <group key={lateral}>

          {/* AIMING POINT, DOWN THE ROAD AND SLIGHTLY OUTWARD */}
          <primitive
            object={targets[index]}
            position={at(lateral * 1.5, length * 1.6, box.min.y)}
          />

          {/* THE LIGHT ITSELF, WHICH LANDS ON THE ROAD */}
          <spotLight
            position={at(lateral, length * 0.01, lampHeight)}
            target={targets[index]}
            color={preset.colour}
            intensity={length * preset.intensity}
            angle={0.5}
            penumbra={0.7}
            distance={length * 2.6}
            decay={1.5}
          />

          {/* THE VISIBLE BEAM, DRAWN AS A SOFT ADDITIVE CONE */}
          <mesh
            position={at(lateral, beamLength / 2, lampHeight * 0.94)}
            rotation={beamRotation}
          >
            <coneGeometry args={[beamRadius, beamLength, 24, 1, true]} />
            <meshBasicMaterial
              color={preset.colour}
              transparent
              opacity={0.07}
              depthWrite={false}
              blending={THREE.AdditiveBlending}
              side={THREE.DoubleSide}
              toneMapped={false}
            />
          </mesh>
        </group>
      ))}
    </group>
  );
}
