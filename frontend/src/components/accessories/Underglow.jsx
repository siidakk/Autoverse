import { useMemo } from "react";
import * as THREE from "three";

// Underglow is a strip of light under each sill plus the pool it throws onto
// the road. The footprint comes from the car's own measurements, so it hugs
// whatever is above it instead of sitting in a fixed rectangle.

function useSpillTexture() {
  return useMemo(() => {
    const size = 256;
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;

    const context = canvas.getContext("2d");
    const gradient = context.createRadialGradient(
      size / 2, size / 2, 0,
      size / 2, size / 2, size / 2
    );

    gradient.addColorStop(0, "rgba(255,255,255,0.9)");
    gradient.addColorStop(0.4, "rgba(255,255,255,0.3)");
    gradient.addColorStop(1, "rgba(255,255,255,0)");

    context.fillStyle = gradient;
    context.fillRect(0, 0, size, size);

    const map = new THREE.CanvasTexture(canvas);
    map.colorSpace = THREE.SRGBColorSpace;
    return map;
  }, []);
}

export default function Underglow({ colour, car, wheels }) {
  const spill = useSpillTexture();

  if (!colour || !car) return null;

  const { lengthAxis, widthAxis, midWidth, length, width, height, box, center } = car;

  const isLengthX = lengthAxis === "x";
  const alongCentre = center[lengthAxis];

  // Measured off the wheels where possible. The bounding box includes mirrors
  // and spoilers, which pushed the strips out past the sills.
  const radius = wheels?.radius ?? height * 0.18;
  const track = wheels?.track ?? width * 0.78;
  const wheelbase = wheels?.wheelbase ?? length * 0.58;

  // Tucked inboard of the wheels, low down under the sills.
  const tubeHeight = box.min.y + radius * 0.42;
  const sillOffset = track * 0.4;
  const thickness = track * 0.025;
  const tubeLength = wheelbase * 0.92;

  const place = (lateral, up) => {
    const position = [0, up, 0];
    position[isLengthX ? 0 : 2] = alongCentre;
    position[widthAxis === "x" ? 0 : 2] = midWidth + lateral;
    return position;
  };

  const barArgs = (span) =>
    isLengthX
      ? [span, thickness, thickness]
      : [thickness, thickness, span];

  return (
    <group>
      {/* SILL TUBES */}
      {[sillOffset, -sillOffset].map((lateral) => (
        <mesh key={lateral} position={place(lateral, tubeHeight)}>
          <boxGeometry args={barArgs(tubeLength)} />
          <meshBasicMaterial color={colour} toneMapped={false} />
        </mesh>
      ))}

      {/* POOL ON THE ROAD */}
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={place(0, box.min.y + height * 0.004)}
      >
        <planeGeometry
          args={
            isLengthX
              ? [length * 1.15, track * 2.2]
              : [track * 2.2, length * 1.15]
          }
        />
        <meshBasicMaterial
          map={spill}
          color={colour}
          transparent
          opacity={0.5}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>

      {/* ACTUAL LIGHT, SO NEARBY PANELS PICK UP THE COLOUR */}
      <pointLight
        position={place(0, box.min.y + height * 0.07)}
        color={colour}
        intensity={length * 1.4}
        distance={length * 0.9}
        decay={2}
      />
    </group>
  );
}
