// Exhaust tips sit under the rear bumper. The back of the car and the road are
// both already measured, so the tips are placed against those rather than at a
// guessed offset.

const CHROME = { color: "#c6ccd4", metalness: 1, roughness: 0.18 };
const CARBON = { color: "#191b1f", metalness: 0.4, roughness: 0.45 };
const BURNT = { color: "#6d5240", metalness: 0.9, roughness: 0.35 };

const layouts = {
  twin: { count: 2, spread: 0.3, radius: 0.028, material: CHROME },
  quad: { count: 4, spread: 0.34, radius: 0.022, material: CHROME },
  centre: { count: 2, spread: 0.06, radius: 0.032, material: BURNT },
  carbon: { count: 2, spread: 0.3, radius: 0.034, material: CARBON }
};

export default function Exhaust({ type, car }) {

  if (!type || type === "stock" || !car) return null;

  const layout = layouts[type];
  if (!layout) return null;

  const { lengthAxis, widthAxis, midWidth, length, width, height, box, rearSign } = car;

  const rearEnd = rearSign > 0 ? box.max[lengthAxis] : box.min[lengthAxis];
  const tipRadius = length * layout.radius;
  const tipLength = length * 0.055;

  // Tucked under the bumper, a little above the road.
  const up = box.min.y + height * 0.13;

  // Pairs are mirrored about the centreline; a quad is two pairs.
  const offsets = [];
  for (let i = 0; i < layout.count / 2; i++) {
    const spacing = width * layout.spread - i * tipRadius * 2.6;
    offsets.push(spacing, -spacing);
  }

  const place = (lateral) => {
    const position = [0, up, 0];
    position[lengthAxis === "x" ? 0 : 2] = rearEnd + rearSign * (tipLength * 0.35);
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
            <cylinderGeometry args={[tipRadius, tipRadius * 0.92, tipLength, 24, 1, true]} />
            <meshStandardMaterial {...layout.material} side={2} />
          </mesh>

          {/* DARK BORE, SO IT READS AS A PIPE RATHER THAN A ROD */}
          <mesh position={[0, tipLength * 0.42, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <circleGeometry args={[tipRadius * 0.88, 24]} />
            <meshStandardMaterial color="#08090b" roughness={1} side={2} />
          </mesh>
        </group>
      ))}
    </group>
  );
}
