// Recorded engine audio, when there is any.
//
// The synthesised engine in lib/sound.js gets the pitch right -- firing
// frequency really is rpm times half the cylinder count -- but a recording of
// a real engine will always sound more like a real engine than anything built
// out of oscillators. So if a file is here, it is used, and the synthesiser is
// only what plays when there is nothing.
//
// Nothing is committed to the repository: engine libraries are either paid or
// carry a licence worth reading, and neither belongs in someone else's git
// history. Drop the files into public/sounds/ and they are picked up. See
// public/sounds/README.md for where to get some legally.
//
// One recording covers several cars. A rev clip can be shifted in pitch by the
// ratio of two engines' firing frequencies, which is the same arithmetic the
// synthesiser uses, so a single good V8 stands in for every V8 in the garage
// as long as it is not stretched too far.

// A car with its own recording. Nothing is shifted; it plays as recorded.
export const CAR_SAMPLES = {
  // "/models/toyota_fortuner_2021.glb": {
  //   idle: "/sounds/fortuner-idle.mp3",
  //   rev: "/sounds/fortuner-rev.mp3"
  // }
};

// Recordings that stand in for a family of engines. `recordedFrom` is the
// engine the clip was actually taken from, and is what the pitch shift is
// measured against, so it has to be roughly honest for the result to be.
export const FAMILY_SAMPLES = [
  // {
  //   id: "v8-cross",
  //   layout: "cross",
  //   recordedFrom: { cylinders: 8, idle: 650, redline: 6500 },
  //   idle: "/sounds/v8-idle.mp3",
  //   rev: "/sounds/v8-rev.mp3"
  // },
  // {
  //   id: "diesel-four",
  //   layout: "inline",
  //   aspiration: "turbo",
  //   diesel: true,
  //   recordedFrom: { cylinders: 4, idle: 700, redline: 4400 },
  //   idle: "/sounds/diesel4-idle.mp3",
  //   rev: "/sounds/diesel4-rev.mp3"
  // }
];

// Beyond this the shift stops sounding like the same engine at a different
// speed and starts sounding like a tape running wrong.
const SHIFT_LIMIT = 1.5;

function order(spec) {
  return spec.rotor ? 2 : spec.cylinders / 2;
}

// How far a family recording has to be moved to stand in for this engine,
// measured where it matters most: the top of the rev range.
export function shiftFor(engine, recordedFrom) {
  const target = (engine.redline / 60) * order(engine);
  const source = (recordedFrom.redline / 60) * order(recordedFrom);
  return target / source;
}

// Which recording, if any, should play for this car.
export function sampleFor(model, engine) {
  const exact = CAR_SAMPLES[model];
  if (exact) return { ...exact, rate: 1, source: "recorded for this car" };

  const diesel = engine.clatter > 0.4;

  const usable = FAMILY_SAMPLES.filter((family) => {
    if (family.layout && family.layout !== engine.layout) return false;
    if (family.aspiration && family.aspiration !== engine.aspiration) return false;
    if (Boolean(family.diesel) !== diesel) return false;

    const rate = shiftFor(engine, family.recordedFrom);
    return rate <= SHIFT_LIMIT && rate >= 1 / SHIFT_LIMIT;
  });

  if (!usable.length) return null;

  // The one that needs moving least.
  const best = usable
    .map((family) => ({ family, rate: shiftFor(engine, family.recordedFrom) }))
    .sort((a, b) => Math.abs(Math.log(a.rate)) - Math.abs(Math.log(b.rate)))[0];

  return {
    idle: best.family.idle,
    rev: best.family.rev,
    rate: best.rate,
    source: `${best.family.id}, shifted ${best.rate.toFixed(2)}x`
  };
}
