import * as THREE from "three";

const AXIS_INDEX = { x: 0, y: 1, z: 2 };

// Sweeps a closed cross-section across a row of stations. Each station carries
// its own base height, so a part built this way follows the curve of the
// bodywork instead of sitting on a single flat line.
export function buildSweptGeometry({
  profile,
  stations,
  lengthAxis,
  widthAxis,
  rearSign,
  rearEnd
}) {
  const lengthIndex = AXIS_INDEX[lengthAxis];
  const widthIndex = AXIS_INDEX[widthAxis];
  const ring = profile.length;

  const positions = [];
  const indices = [];

  for (const station of stations) {
    const scale = station.scale ?? 1;

    for (const point of profile) {
      const vertex = [0, 0, 0];

      vertex[lengthIndex] =
        rearEnd + rearSign * (station.chordOffset + point.x * scale);
      vertex[1] = station.baseY + point.y * scale;
      vertex[widthIndex] = station.lateral;

      positions.push(vertex[0], vertex[1], vertex[2]);
    }
  }

  // SKIN BETWEEN STATIONS
  for (let s = 0; s < stations.length - 1; s++) {
    for (let p = 0; p < ring; p++) {
      const next = (p + 1) % ring;

      const a = s * ring + p;
      const b = s * ring + next;
      const c = (s + 1) * ring + p;
      const d = (s + 1) * ring + next;

      indices.push(a, c, b, b, c, d);
    }
  }

  // CAPS AT EACH END, FANNED FROM THE SECTION CENTRE
  const capCentre = (stationIndex) => {
    const centre = [0, 0, 0];

    for (let p = 0; p < ring; p++) {
      const base = (stationIndex * ring + p) * 3;
      centre[0] += positions[base];
      centre[1] += positions[base + 1];
      centre[2] += positions[base + 2];
    }

    centre[0] /= ring;
    centre[1] /= ring;
    centre[2] /= ring;

    const index = positions.length / 3;
    positions.push(centre[0], centre[1], centre[2]);
    return index;
  };

  const firstCentre = capCentre(0);
  for (let p = 0; p < ring; p++) {
    indices.push(firstCentre, p, (p + 1) % ring);
  }

  const lastStation = stations.length - 1;
  const lastCentre = capCentre(lastStation);
  for (let p = 0; p < ring; p++) {
    indices.push(
      lastCentre,
      lastStation * ring + ((p + 1) % ring),
      lastStation * ring + p
    );
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(positions, 3)
  );
  geometry.setIndex(indices);
  geometry.computeVertexNormals();

  return geometry;
}

// A thin lip that grows out of the boot lid and turns up at the trailing edge.
export function ducktailProfile(chord, rise) {
  const steps = 8;
  const top = [];
  const bottom = [];

  for (let i = 0; i <= steps; i++) {
    const u = i / steps;
    const x = -chord * (1 - u);
    const y = rise * Math.pow(u, 2.1);

    // The lip tapers to nothing where it meets the panel.
    const thickness = rise * 0.3 * Math.pow(u, 0.5) + rise * 0.04;

    top.push({ x, y });
    bottom.push({ x, y: y - thickness });
  }

  return [...top, ...bottom.reverse()];
}

// A cambered aerofoil, tilted to a small angle of attack.
export function wingProfile(chord, thickness, attackDegrees = 7) {
  const steps = 12;
  const upper = [];
  const lower = [];

  for (let i = 0; i <= steps; i++) {
    const u = i / steps;
    const x = -chord * (1 - u);
    const bulge = Math.sin(Math.PI * u);

    upper.push({ x, y: thickness * Math.pow(bulge, 0.85) });
    lower.push({ x, y: -thickness * 0.22 * bulge });
  }

  const angle = (-attackDegrees * Math.PI) / 180;
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);

  return [...upper, ...lower.reverse()].map(({ x, y }) => ({
    x: x * cos - y * sin,
    y: x * sin + y * cos
  }));
}
