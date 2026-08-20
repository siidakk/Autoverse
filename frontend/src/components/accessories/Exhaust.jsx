import { lowerBodyEnd } from "../../utils/placement";

// Exhaust tips tuck under the rear valance. A real tip is about a tenth of a
// metre across on a four and a half metre car, so everything here is kept to
// that ratio rather than to whatever looks large enough on screen.

const CHROME = { color: "#c6ccd4", metalness: 1, roughness: 0.18 };
const CARBON = { color: "#191b1f", metalness: 0.4, roughness: 0.45 };
const BURNT = { color: "#6d5240", metalness: 0.9, roughness: 0.35 };

// radius and spread are fractions of the car's length and track.
const layouts = {
  twin: { pairs: 1, spread: 0.34, radius: 0.012, material: CHROME },
  quad: { pairs: 2, spread: 0.4, radius: 0.0105, material: CHROME },
  centre: { pairs: 1, spread: 0.07, radius: 0.014, material: BURNT },
  carbon: { pairs: 1, spread: 0.34, radius: 0.016, material: CARBON }
};

export default function Exhaust({ type, car, wheels }) {

  if (!type || type === "stock" || !car) return null;

  const layout = layouts[type];
  if (!layout) return null;

  const { lengthAxis, widthAxis, midWidth, length, width, height, box, rearSign } = car;

  // The back of the car measured low down, so a roof spoiler or a raised wing
  // cannot drag the tips out behind the bumper.
  const rearEnd = lowerBodyEnd(car);

  const tipRadius = length * layout.radius;
  const tipLength = length * 0.04;

  // Sat just above the road, under the valance.
  const up = box.min.y + height * 0.14;

  // Measured across the wheels where possible; the bounding box picks up
  // mirrors and wings that have nothing to do with where a pipe sits.
  const span = wheels?.track ?? width * 0.78;

  const offsets = [];
  for (let pair = 0; pair < layout.pairs; pair++) {
    const lateral = span * layout.spread - pair * tipRadius * 2.8;
    offsets.push(lateral, -lateral);
  }

  const place = (lateral) => {
    const position = [0, up, 0];
    // Mostly tucked under, protruding only slightly past the bumper.
    position[lengthAxis === "x" ? 0 : 2] = rearEnd + rearSign * tipLength * 0.15;
    position[widthAxis === "x" ? 0 : 2] = midWidth + lateral;
    return position;
  };

  // Cylinders stand along Y by default, so they are laid onto the car's axis.
  const rotation = lengthAxis === "x" ? [0, 0, Math.PI / 2] : [Math.PI / 2, 0, 0];

  return (
    <group>
      {offsets.map((lateral, index) => (
        <group key={index} position={place(lateral)} rotation={rotation}>

          {/* TIP */}
          <mesh castShadow>
            <cylinderGeometry args={[tipRadius, tipRadius * 0.92, tipLength, 20, 1, true]} />
            <meshStandardMaterial {...layout.material} side={2} />
          </mesh>

          {/* DARK BORE, SO IT READS AS A PIPE RATHER THAN A ROD */}
          <mesh position={[0, tipLength * 0.42, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <circleGeometry args={[tipRadius * 0.86, 20]} />
            <meshStandardMaterial color="#07080a" roughness={1} side={2} />
          </mesh>
        </group>
      ))}
    </group>
  );
}
