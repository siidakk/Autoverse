// Where parts sit on a car, kept apart from the components that draw them so it
// can be checked against every model without a renderer.
//
// A measured part carries min, max, center and size directly. There is no
// nested box on it, which is worth stating because reaching for one throws and
// takes the whole canvas down with it.

// The rear-most point of the low bodywork. Using the whole bounding box would
// follow a roof spoiler or a raised wing, and hang the exhaust out behind the
// car in mid air.
export function lowerBodyEnd(car, band = 0.35) {
  const { lengthAxis, height, box, parts, rearSign } = car;

  const cutoff = box.min.y + height * band;
  let furthest = rearSign > 0 ? -Infinity : Infinity;

  for (const part of parts) {
    if (part.center.y >= cutoff) continue;

    furthest =
      rearSign > 0
        ? Math.max(furthest, part.max[lengthAxis])
        : Math.min(furthest, part.min[lengthAxis]);
  }

  return Number.isFinite(furthest)
    ? furthest
    : box[rearSign > 0 ? "max" : "min"][lengthAxis];
}

// The rear valance: the low bodywork across the back of the car, which is what
// an exhaust actually hangs under. Measuring it beats assuming a fraction of
// the car's height, because a Wrangler and a Corvette keep their bumpers in
// very different places.
//
// Returns the underside of that bodywork and how far it reaches sideways, so
// tips can be tucked beneath it and kept inboard of the corners.
export function rearValance(car, band = 0.45, depth = 0.2) {
  const { lengthAxis, widthAxis, midWidth, length, height, width, box, rearSign } = car;

  const ceiling = box.min.y + height * band;
  const inward = rearSign > 0
    ? box.max[lengthAxis] - length * depth
    : box.min[lengthAxis] + length * depth;

  let floor = Infinity;
  let reach = 0;
  let found = 0;

  for (const part of car.parts) {
    if (part.center.y >= ceiling) continue;

    // Only the back of the car, not the sills running down the side.
    const along = part.center[lengthAxis];
    if (rearSign > 0 ? along < inward : along > inward) continue;

    found++;
    floor = Math.min(floor, part.min.y);
    reach = Math.max(
      reach,
      Math.abs(part.max[widthAxis] - midWidth),
      Math.abs(midWidth - part.min[widthAxis])
    );
  }

  // A model with nothing recognisable across the back still gets sensible
  // numbers rather than an Infinity that quietly poisons every position.
  if (!found || !Number.isFinite(floor)) {
    return { floor: box.min.y + height * 0.16, halfWidth: width * 0.36, measured: false };
  }

  return { floor, halfWidth: Math.max(reach, width * 0.2), measured: true };
}

// The nose, which is simply the end the boot is not at.
export function noseEnd(car) {
  const { lengthAxis, box, rearSign } = car;
  return rearSign > 0 ? box.min[lengthAxis] : box.max[lengthAxis];
}

// Index into an [x, y, z] triple for the car's own axes.
export const axisIndex = (axis) => (axis === "x" ? 0 : 2);
