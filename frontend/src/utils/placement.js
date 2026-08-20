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

// The nose, which is simply the end the boot is not at.
export function noseEnd(car) {
  const { lengthAxis, box, rearSign } = car;
  return rearSign > 0 ? box.min[lengthAxis] : box.max[lengthAxis];
}

// Index into an [x, y, z] triple for the car's own axes.
export const axisIndex = (axis) => (axis === "x" ? 0 : 2);
