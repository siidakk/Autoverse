// Wheels are built from the dimensions measured on the car itself, so they
// drop straight into the arches the model's own wheels came out of.
// Everything is modelled with the axle running along local Z.

const RUBBER = {
  color: "#15161a",
  roughness: 0.92,
  metalness: 0
};

// Plus-sizing keeps the overall diameter and trades sidewall for rim, which is
// exactly what fitting bigger alloys to a car does.
const SIDEWALL = {
  sport: [0.74, 0.78, 0.82, 0.86],
  classic: [0.58, 0.62, 0.66, 0.7]
};

function Tire({ radius, width, sidewall }) {
  const rimRadius = radius * sidewall;

  return (
    <>
      {/* TREAD */}
      <mesh rotation={[Math.PI / 2, 0, 0]} castShadow>
        <cylinderGeometry args={[radius, radius, width, 48, 1, true]} />
        <meshStandardMaterial {...RUBBER} side={2} />
      </mesh>

      {/* SIDEWALLS */}
      {[width / 2, -width / 2].map((z) => (
        <mesh key={z} position={[0, 0, z]}>
          <ringGeometry args={[rimRadius, radius, 48]} />
          <meshStandardMaterial {...RUBBER} side={2} />
        </mesh>
      ))}
    </>
  );
}

function SportWheel({ radius, width, sidewall }) {
  const rimRadius = radius * sidewall;
  const spokes = 10;

  return (
    <>
      <Tire radius={radius} width={width} sidewall={sidewall} />

      {/* RIM BARREL */}
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[rimRadius, rimRadius, width * 0.9, 48, 1, true]} />
        <meshStandardMaterial color="#3a3f47" metalness={1} roughness={0.28} side={2} />
      </mesh>

      {/* POLISHED OUTER LIP */}
      <mesh position={[0, 0, width * 0.42]}>
        <torusGeometry args={[rimRadius * 0.97, radius * 0.035, 12, 48]} />
        <meshStandardMaterial color="#cdd3da" metalness={1} roughness={0.12} />
      </mesh>

      {/* SPOKES */}
      {Array.from({ length: spokes }).map((_, i) => {
        const angle = (i / spokes) * Math.PI * 2;

        return (
          <mesh
            key={i}
            position={[
              Math.cos(angle) * rimRadius * 0.46,
              Math.sin(angle) * rimRadius * 0.46,
              width * 0.28
            ]}
            rotation={[0, 0, angle]}
          >
            <boxGeometry args={[rimRadius * 0.92, rimRadius * 0.14, width * 0.16]} />
            <meshStandardMaterial color="#4a5058" metalness={1} roughness={0.22} />
          </mesh>
        );
      })}

      {/* HUB */}
      <mesh position={[0, 0, width * 0.34]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[rimRadius * 0.24, rimRadius * 0.24, width * 0.16, 24]} />
        <meshStandardMaterial color="#1f2226" metalness={0.9} roughness={0.3} />
      </mesh>

      {/* BRAKE DISC + RED CALIPER */}
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[rimRadius * 0.68, rimRadius * 0.68, width * 0.1, 32]} />
        <meshStandardMaterial color="#8a8f96" metalness={1} roughness={0.45} />
      </mesh>

      <mesh position={[-rimRadius * 0.5, rimRadius * 0.2, 0]}>
        <boxGeometry args={[rimRadius * 0.3, rimRadius * 0.5, width * 0.3]} />
        <meshStandardMaterial color="#c0242c" metalness={0.4} roughness={0.35} />
      </mesh>
    </>
  );
}

function ClassicWheel({ radius, width, sidewall }) {
  const rimRadius = radius * sidewall;
  const vents = 6;

  return (
    <>
      <Tire radius={radius} width={width} sidewall={sidewall} />

      {/* STEEL RIM */}
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[rimRadius, rimRadius, width * 0.9, 36, 1, true]} />
        <meshStandardMaterial color="#6d7278" metalness={0.85} roughness={0.5} side={2} />
      </mesh>

      {/* PLASTIC HUBCAP - the flat face of a base model wheel */}
      <mesh position={[0, 0, width * 0.33]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[rimRadius * 0.94, rimRadius * 0.9, width * 0.08, 36]} />
        <meshStandardMaterial color="#9aa0a6" metalness={0.5} roughness={0.55} />
      </mesh>

      {/* STAMPED VENT SLOTS */}
      {Array.from({ length: vents }).map((_, i) => {
        const angle = (i / vents) * Math.PI * 2;

        return (
          <mesh
            key={i}
            position={[
              Math.cos(angle) * rimRadius * 0.55,
              Math.sin(angle) * rimRadius * 0.55,
              width * 0.37
            ]}
            rotation={[0, 0, angle]}
          >
            <boxGeometry args={[rimRadius * 0.42, rimRadius * 0.22, width * 0.05]} />
            <meshStandardMaterial color="#33373c" metalness={0.3} roughness={0.8} />
          </mesh>
        );
      })}

      {/* CENTRE CAP */}
      <mesh position={[0, 0, width * 0.39]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[rimRadius * 0.28, rimRadius * 0.28, width * 0.06, 24]} />
        <meshStandardMaterial color="#babfc4" metalness={0.7} roughness={0.4} />
      </mesh>
    </>
  );
}

export default function Wheels({ type, wheels, axleAxis, sizeStep = 1 }) {

  if (!wheels || type === "stock") return null;

  const ladder = SIDEWALL[type] ?? SIDEWALL.sport;
  const sidewall = ladder[Math.min(Math.max(sizeStep, 0), ladder.length - 1)];

  // Geometry above is built around local Z, so swap it onto X when the car's
  // axles run that way.
  const rotation = axleAxis === "x" ? [0, Math.PI / 2, 0] : [0, 0, 0];

  return (
    <>
      {wheels.map((wheel, index) => (
        <group key={index} position={wheel.position} rotation={rotation}>

          {type === "sport" ? (
            <SportWheel
              radius={wheel.radius}
              width={wheel.thickness}
              sidewall={sidewall}
            />
          ) : (
            <ClassicWheel
              radius={wheel.radius}
              width={wheel.thickness}
              sidewall={sidewall}
            />
          )}

        </group>
      ))}
    </>
  );
}
