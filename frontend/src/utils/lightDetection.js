// Finding the light units on a car, so body paint stops landing on them.
//
// Painting the car used to turn the headlights and tail lights the body colour
// too, which is the one thing that gives away a fake straight away. The obvious
// fix is to look for materials called "headlight", and it does not work: across
// this garage 130 materials are named "material", and the rest are things like
// "Material_694" and "notto3ds". Names cannot be trusted.
//
// So lamps are found the same way the wheels are, by measuring. A light unit
// is a shallow part sitting in the outer band at either end of the car, at
// roughly headlight height, and it has a twin on the other side. Very little
// else on a car fits all four of those at once.
//
// Kept free of three.js so the command line checker runs exactly this code.

// Every threshold is a fraction of the car's own dimensions, so a Wrangler and
// a Corvette are judged the same way.
// These are deliberately tight. The cost of missing a lamp is that it takes
// body colour, which is what happens today anyway. The cost of matching a door
// is that the door stops taking paint at all, which is far worse -- so
// everything here errs towards matching nothing.
const RULES = {
  endBand: 0.16,      // how far in from the nose or tail a lamp can sit
  minHeight: 0.2,     // above the bumper
  maxHeight: 0.78,    // below the roofline
  maxDepth: 0.12,     // lamps are shallow: they sit on the face of the car
  minWidth: 0.05,     // narrower than this is a badge or a screw
  maxWidth: 0.34,     // wider than this is the whole bumper or fascia
  maxTall: 0.2,       // a lamp is nothing like as tall as a door
  maxSpan: 0.34,      // and no dimension of one approaches the car's length
  pairAlong: 0.09,    // how closely a pair must line up front to back
  pairOffset: 0.1,    // and how evenly they must straddle the centreline
  pairSize: 0.6       // and how alike they must be
};

// A lamp candidate: shallow, modest, and at one end of the car.
function candidates(car, parts) {
  const { lengthAxis, widthAxis, midWidth, length, width, height, box, rearSign } = car;

  const frontEnd = rearSign > 0 ? box.min[lengthAxis] : box.max[lengthAxis];
  const rearEnd = rearSign > 0 ? box.max[lengthAxis] : box.min[lengthAxis];

  const found = [];

  for (const part of parts) {
    const along = part.center[lengthAxis];

    const atFront = Math.abs(along - frontEnd) < length * RULES.endBand;
    const atRear = Math.abs(along - rearEnd) < length * RULES.endBand;
    if (!atFront && !atRear) continue;

    const up = (part.center.y - box.min.y) / height;
    if (up < RULES.minHeight || up > RULES.maxHeight) continue;

    if (part.size[lengthAxis] > length * RULES.maxDepth) continue;
    if (part.size.y > height * RULES.maxTall) continue;

    const across = part.size[widthAxis] / width;
    if (across < RULES.minWidth || across > RULES.maxWidth) continue;

    // A last guard on sheer size, so nothing panel-shaped can reach the
    // pairing stage however it is oriented.
    const biggest = Math.max(part.size.x, part.size.y, part.size.z);
    if (biggest > length * RULES.maxSpan) continue;

    found.push({
      part,
      end: atFront ? "front" : "rear",
      along,
      offset: part.center[widthAxis] - midWidth,
      across
    });
  }

  return found;
}

export function detectLights(car, parts) {
  const { length, width } = car;

  const found = candidates(car, parts);
  if (!found.length) return { refs: [], units: 0 };

  const keep = new Set();
  const taken = new Set();
  let units = 0;

  for (let i = 0; i < found.length; i++) {
    if (taken.has(i)) continue;
    const a = found[i];

    // A light bar running across the whole tail is a single centred unit
    // rather than a pair, and is common on newer cars.
    if (Math.abs(a.offset) < width * 0.05 && a.across > 0.3) {
      keep.add(a.part.ref);
      taken.add(i);
      units++;
      continue;
    }

    for (let j = i + 1; j < found.length; j++) {
      if (taken.has(j)) continue;
      const b = found[j];

      if (a.end !== b.end) continue;

      // Opposite sides of the car.
      if (Math.sign(a.offset) === Math.sign(b.offset)) continue;

      // Level with each other, evenly spaced, and about the same size. A
      // headlight and a random bracket will fail at least one of these.
      if (Math.abs(a.along - b.along) > length * RULES.pairAlong) continue;
      if (Math.abs(Math.abs(a.offset) - Math.abs(b.offset)) > width * RULES.pairOffset) continue;

      const smaller = Math.min(a.across, b.across);
      const larger = Math.max(a.across, b.across);
      if (smaller / larger < RULES.pairSize) continue;

      keep.add(a.part.ref);
      keep.add(b.part.ref);
      // Each part belongs to one lamp. Without this a single part paired with
      // every other candidate and the count ran into the hundreds.
      taken.add(i);
      taken.add(j);
      units++;
      break;
    }
  }

  return { refs: [...keep], units };
}

// Names are unreliable as the only signal, but where a model does say what a
// part is, there is no reason to ignore it. Used alongside the measurement
// above, never instead of it.
export const TRIM_WORDS =
  /(head|tail|rear)?(light|lamp)s?\b|headlamp|taillamp|\blens\b|indicator|blinker|signal|reflector|\bchrome\b|\bbadge|emblem|\blogo\b|grill|interior|\bint\b|leather|carpet|\bseat|dashboard|\bdash\b|steer|speedo|gauge|cluster|display|shiftlight|\bplate\b|\bnumber\b|wiper|\btyre\b|\btire\b|rubber|caliper|\bbrake|\brotor\b|\bdisc\b|exhaust|muffler|engine|\bmirror/i;

export function looksLikeTrim(name) {
  return typeof name === "string" && TRIM_WORDS.test(name);
}
