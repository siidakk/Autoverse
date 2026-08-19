// Measuring a car and finding its wheels, with no dependency on three.js so the
// browser and the command line validator can run byte-for-byte the same checks.
//
// A part is { ref, name, min, max, center, size }, where the vectors are plain
// { x, y, z } objects. `ref` is whatever the caller wants handed back: a mesh in
// the app, a node name on the command line.

const AXES = ["x", "y", "z"];

function median(values) {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)];
}

function distance(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
}

function emptyBounds() {
  return {
    min: { x: Infinity, y: Infinity, z: Infinity },
    max: { x: -Infinity, y: -Infinity, z: -Infinity }
  };
}

function absorb(bounds, box) {
  for (const axis of AXES) {
    bounds.min[axis] = Math.min(bounds.min[axis], box.min[axis]);
    bounds.max[axis] = Math.max(bounds.max[axis], box.max[axis]);
  }
  return bounds;
}

function centreOf(box) {
  return {
    x: (box.min.x + box.max.x) / 2,
    y: (box.min.y + box.max.y) / 2,
    z: (box.min.z + box.max.z) / 2
  };
}

function sizeOf(box) {
  return {
    x: box.max.x - box.min.x,
    y: box.max.y - box.min.y,
    z: box.max.z - box.min.z
  };
}

export function boundsOf(min, max) {
  const box = { min, max };
  return { ...box, center: centreOf(box), size: sizeOf(box) };
}

// A boot lid always sits higher than a bonnet, on hatchbacks and mid-engined
// cars alike, so the taller end of the body is the back of the car.
function findRearSign(box, lengthAxis, length, parts) {
  const band = length * 0.12;
  let topAtMax = -Infinity;
  let topAtMin = -Infinity;

  for (const part of parts) {
    if (Math.abs(part.center[lengthAxis] - box.max[lengthAxis]) <= band) {
      topAtMax = Math.max(topAtMax, part.max.y);
    }
    if (Math.abs(part.center[lengthAxis] - box.min[lengthAxis]) <= band) {
      topAtMin = Math.max(topAtMin, part.max.y);
    }
  }

  return topAtMax >= topAtMin ? 1 : -1;
}

export function measureCar(parts) {
  if (!parts.length) return null;

  const bounds = emptyBounds();
  for (const part of parts) absorb(bounds, part);

  if (!Number.isFinite(bounds.min.x)) return null;

  const size = sizeOf(bounds);
  const center = centreOf(bounds);

  // The longest horizontal axis is the car's length, the other its track.
  const lengthAxis = size.x >= size.z ? "x" : "z";
  const widthAxis = lengthAxis === "x" ? "z" : "x";

  // Some models arrive with their doors swung open, which throws the bounding
  // box wider than the car and drags its middle off to one side. The median of
  // the panels is unmoved by those outliers, so it is used as the centreline.
  const midWidth = median(parts.map((part) => part.center[widthAxis]));

  return {
    box: bounds,
    size,
    center,
    lengthAxis,
    widthAxis,
    midWidth,
    length: size[lengthAxis],
    width: size[widthAxis],
    height: size.y,
    rearSign: findRearSign(bounds, lengthAxis, size[lengthAxis], parts)
  };
}

// Road cars and monster trucks disagree about how big a wheel is, so detection
// runs strict first and only loosens if that finds nothing. Keeping the strict
// pass first stops a fender on a normal car being read as a wheel.
const PROFILES = [
  { name: "standard", maxDiameter: 0.26, maxRadius: 0.13 },
  { name: "oversized", maxDiameter: 0.46, maxRadius: 0.23 }
];

function findCandidates(measurement, parts, profile) {
  const { box, lengthAxis, widthAxis, midWidth, length } = measurement;
  const candidates = [];

  for (const part of parts) {
    const { center, size } = part;

    const diameter = Math.max(size[lengthAxis], size.y);
    if (diameter < length * 0.08 || diameter > length * profile.maxDiameter) continue;

    // Round: as tall as it is long. Seat backs and door cards fail here.
    if (Math.min(size[lengthAxis], size.y) / diameter < 0.7) continue;

    // Out at the corners rather than along the centreline.
    if (Math.abs(center[widthAxis] - midWidth) < length * 0.1) continue;

    // Thick enough to be a tyre, but not a whole panel.
    const thickness = size[widthAxis];
    if (thickness < diameter * 0.15 || thickness > diameter * 1.3) continue;

    // A wheel's centre sits about one radius off the ground, which is what
    // separates it from the fenders and headlights around it.
    if (Math.abs(center.y - (box.min.y + diameter / 2)) > diameter * 0.5) continue;

    candidates.push({ part, center, diameter });
  }

  return candidates;
}

// Tyre, rim, brake disc and caliper are separate meshes that all belong to one
// wheel, so overlapping candidates are merged into assemblies.
function clusterCandidates(candidates) {
  const mergeDistance = median(candidates.map((c) => c.diameter)) * 0.5;
  const clusters = [];

  for (const candidate of candidates) {
    const match = clusters.find(
      (cluster) => distance(cluster.center, candidate.center) < mergeDistance
    );

    if (match) {
      match.refs.push(candidate.part.ref);
      absorb(match, candidate.part);
      match.center = centreOf(match);
    } else {
      clusters.push({
        refs: [candidate.part.ref],
        min: { ...candidate.part.min },
        max: { ...candidate.part.max },
        center: { ...candidate.center }
      });
    }
  }

  return clusters;
}

function attempt(measurement, parts, profile) {
  const { lengthAxis, widthAxis, midWidth, length } = measurement;

  const candidates = findCandidates(measurement, parts, profile);
  if (candidates.length < 4) return null;

  const measured = clusterCandidates(candidates)
    .map((cluster) => {
      const size = sizeOf(cluster);
      return {
        refs: cluster.refs,
        center: cluster.center,
        radius: Math.max(size[lengthAxis], size.y) / 2,
        thickness: size[widthAxis]
      };
    })
    .filter((wheel) => wheel.radius <= length * profile.maxRadius);

  if (measured.length < 4) return null;

  const alongLength = (wheel) => wheel.center[lengthAxis];
  const offCentre = (wheel) => wheel.center[widthAxis] - midWidth;

  // Wheels come in mirrored pairs, so the pairs are found first and the front
  // and rear axle picked from them.
  const axles = [];

  for (let i = 0; i < measured.length; i++) {
    for (let j = i + 1; j < measured.length; j++) {
      const a = measured[i];
      const b = measured[j];

      if (Math.sign(offCentre(a)) === Math.sign(offCentre(b))) continue;
      if (Math.abs(alongLength(a) - alongLength(b)) > length * 0.06) continue;
      if (Math.abs(Math.abs(offCentre(a)) - Math.abs(offCentre(b))) > length * 0.06) continue;

      const radiusGap = Math.abs(a.radius - b.radius) / Math.max(a.radius, b.radius);
      if (radiusGap > 0.45) continue;

      axles.push({ wheels: [a, b], at: (alongLength(a) + alongLength(b)) / 2 });
    }
  }

  if (axles.length < 2) return null;

  let front = null;
  let rear = null;
  let wheelbase = 0;

  for (let i = 0; i < axles.length; i++) {
    for (let j = i + 1; j < axles.length; j++) {
      const separation = Math.abs(axles[i].at - axles[j].at);
      if (separation > wheelbase) {
        wheelbase = separation;
        front = axles[i];
        rear = axles[j];
      }
    }
  }

  // A real wheelbase covers most of the car's length.
  if (wheelbase < length * 0.35) return null;

  const picked = [...front.wheels, ...rear.wheels];

  return {
    profile: profile.name,
    axleAxis: widthAxis,
    radius: median(picked.map((wheel) => wheel.radius)),
    wheelbase,
    // Measured across the wheels, because some bounding boxes are inflated by
    // doors left open.
    track: median(picked.map((wheel) => Math.abs(offCentre(wheel)))) * 2,
    refs: picked.flatMap((wheel) => wheel.refs),
    wheels: picked.map((wheel) => ({
      position: [wheel.center.x, wheel.center.y, wheel.center.z],
      radius: wheel.radius,
      // Calipers can inflate the measured width, so it is kept sane.
      thickness: Math.min(
        Math.max(wheel.thickness, wheel.radius * 0.4),
        wheel.radius * 1.2
      )
    }))
  };
}

export function detectWheels(measurement, parts) {
  for (const profile of PROFILES) {
    const found = attempt(measurement, parts, profile);
    if (found) return found;
  }

  return null;
}
