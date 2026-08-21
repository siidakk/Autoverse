import { lowerBodyEnd, rearValance } from "../../utils/placement";

// Exhaust tips tuck under the rear valance. A real tip is about a tenth of a
// metre across on a four and a half metre car, so everything here is kept to
// that ratio rather than to whatever looks large enough on screen.

const CHROME = { color: "#c6ccd4", metalness: 1, roughness: 0.18 };
const CARBON = { color: "#191b1f", metalness: 0.4, roughness: 0.45 };
const BURNT = { color: "#6d5240", metalness: 0.9, roughness: 0.35 };

// Radius is a fraction of the car's length. Spread is a fraction of how far
// the rear valance itself reaches sideways, so tips stay under the bumper on a
// narrow hatchback and on a wide pickup alike.
const layouts = {
  twin: { pairs: 1, spread: 0.62, radius: 0.012, material: CHROME },
  quad: { pairs: 2, spread: 0.66, radius: 0.0105, material: CHROME },
  centre: { pairs: 1, spread: 0.16, radius: 0.014, material: BURNT },
  carbon: { pairs: 1, spread: 0.62, radius: 0.016, material: CARBON }
};

export default function Exhaust({ type, car }) {

  if (!type || type === "stock" || !car) return null;

  const layout = layouts[type];
  if (!layout) return null;

  const { lengthAxis, widthAxis, midWidth, length, box, rearSign } = car;

  // The back of the car measured low down, so a roof spoiler or a raised wing
  // cannot drag the tips out behind the bumper.
  const rearEnd = lowerBodyEnd(car);
  const valance = rearValance(car);

  const tipRadius = length * layout.radius;
  const tipLength = length * 0.04;

  // Just under the valance, and never allowed through the road surface. The
  // old fixed fraction of body height put the tips in mid air under a tall car
  // and inside the bumper of a low one.
  const up = Math.max(
    valance.floor + tipRadius * 0.55,
    box.min.y + tipRadius * 1.15
  );

  // Kept inboard of the corners of the bumper itself. Spacing off the wheel
  // track pushed them out towards the arches, which is what made every car look
  // wrong in the same way.
  const usable = Math.max(valance.halfWidth - tipRadius * 1.6, tipRadius * 1.2);

  const offsets = [];
  for (let pair = 0; pair < layout.pairs; pair++) {
    const lateral = usable * layout.spread - pair * tipRadius * 2.6;
    offsets.push(lateral, -lateral);
  }

  const place = (lateral) => {
    const position = [0, up, 0];
    // Recessed under the bumper with only the last fifth of the tip showing.
    // This used to add the offset along rearSign, which pushed the whole tip
    // out behind the car instead of tucking it in.
    position[lengthAxis === "x" ? 0 : 2] = rearEnd - rearSign * tipLength * 0.3;
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
