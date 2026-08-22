// What each car in the garage actually has under the bonnet.
//
// The rev button does not play a recording. It builds the sound from these
// numbers, because the thing that makes a V12 sound different from a V8 is
// arithmetic, not a microphone:
//
//   firing frequency (Hz) = rpm / 60 * cylinders / 2
//
// A four stroke fires every cylinder once per two crankshaft revolutions, so
// the engine's fundamental note is half its cylinder count per revolution. At
// 3000 rpm a V12 hums at 300 Hz and an inline four at 100 Hz, and that ratio
// is why one shrieks and the other thrums. Sweep rpm from idle to the redline
// and you have a rev.
//
// Everything else here is the character on top of that fundamental:
//
//   bank        cross plane V8s fire unevenly, which is the American burble.
//               A flat plane V8, a straight six or a V12 fires evenly and
//               sounds smooth and hard instead.
//   aspiration  turbos add spool on the way up and a release on lift off.
//   clatter     compression ignition is noisy in a way petrol is not.
//   rotary      no pistons at all: two chambers firing once per eccentric
//               shaft revolution, which is order 2 and revs to nine thousand.
//
// The specifications are the real ones for these cars. Where a model is sold
// with several engines, the one named is the version the model represents.

const DEFAULT = {
  cylinders: 4,
  layout: "inline",
  aspiration: "na",
  idle: 800,
  redline: 6500,
  capacity: 2.0,
  clatter: 0,
  smooth: 0.5,
  label: "Engine"
};

export const ENGINES = {
  "/models/honda_civic.glb": {
    cylinders: 4, layout: "inline", aspiration: "turbo",
    idle: 750, redline: 6600, capacity: 1.5, clatter: 0, smooth: 0.6,
    label: "1.5 turbo inline four"
  },

  "/models/2008_honda_city_v_at.glb": {
    cylinders: 4, layout: "inline", aspiration: "na",
    idle: 780, redline: 6800, capacity: 1.5, clatter: 0, smooth: 0.62,
    label: "1.5 inline four"
  },

  // G 63: the twin turbo AMG V8, cross plane, and it sounds like it.
  "/models/merc.glb": {
    cylinders: 8, layout: "cross", aspiration: "turbo",
    idle: 620, redline: 6000, capacity: 4.0, clatter: 0, smooth: 0.2,
    label: "4.0 twin turbo V8"
  },

  "/models/toyota_fortuner_2021.glb": {
    cylinders: 4, layout: "inline", aspiration: "turbo",
    idle: 700, redline: 4400, capacity: 2.8, clatter: 0.75, smooth: 0.35,
    label: "2.8 turbo diesel four"
  },

  "/models/2007_jeep_wrangler_rubicon.glb": {
    cylinders: 6, layout: "vee", aspiration: "na",
    idle: 700, redline: 5600, capacity: 3.8, clatter: 0.1, smooth: 0.35,
    label: "3.8 V6"
  },

  "/models/2022_toyota_hilux.glb": {
    cylinders: 4, layout: "inline", aspiration: "turbo",
    idle: 700, redline: 4400, capacity: 2.8, clatter: 0.8, smooth: 0.32,
    label: "2.8 turbo diesel four"
  },

  // B58: a straight six, which is inherently balanced and sounds it.
  "/models/toyota_gr_supra.glb": {
    cylinders: 6, layout: "inline", aspiration: "turbo",
    idle: 650, redline: 6500, capacity: 3.0, clatter: 0, smooth: 0.8,
    label: "3.0 turbo straight six"
  },

  // VR38DETT, a 60 degree V6 with a turbo on each bank.
  "/models/gtr.glb": {
    cylinders: 6, layout: "vee", aspiration: "turbo",
    idle: 700, redline: 7100, capacity: 3.8, clatter: 0, smooth: 0.55,
    label: "3.8 twin turbo V6"
  },

  // S58, the other famous straight six.
  "/models/bmw.glb": {
    cylinders: 6, layout: "inline", aspiration: "turbo",
    idle: 700, redline: 7200, capacity: 3.0, clatter: 0, smooth: 0.82,
    label: "3.0 twin turbo straight six"
  },

  // The reason to own one. Naturally aspirated V10 to eight and a half.
  "/models/audi.glb": {
    cylinders: 10, layout: "vee", aspiration: "na",
    idle: 800, redline: 8700, capacity: 5.2, clatter: 0, smooth: 0.9,
    label: "5.2 V10"
  },

  // Flat six, hung out the back, turbocharged in this generation.
  "/models/porsche.glb": {
    cylinders: 6, layout: "flat", aspiration: "turbo",
    idle: 750, redline: 7500, capacity: 3.0, clatter: 0, smooth: 0.72,
    label: "3.0 turbo flat six"
  },

  // Naturally aspirated V12 to nine and a half thousand.
  "/models/lamborghini_revuelto.glb": {
    cylinders: 12, layout: "vee", aspiration: "na",
    idle: 850, redline: 9500, capacity: 6.5, clatter: 0, smooth: 0.95,
    label: "6.5 V12"
  },

  "/models/lambo.glb": {
    cylinders: 12, layout: "vee", aspiration: "na",
    idle: 850, redline: 8500, capacity: 6.5, clatter: 0, smooth: 0.94,
    label: "6.5 V12"
  },

  // LT2: a cross plane pushrod V8, so the lumpy one.
  "/models/2020_chevrolet_corvette_c8_stingray_convertible.glb": {
    cylinders: 8, layout: "cross", aspiration: "na",
    idle: 650, redline: 6500, capacity: 6.2, clatter: 0, smooth: 0.18,
    label: "6.2 V8"
  },

  "/models/mersedes-benz_sl63_amg_free.glb": {
    cylinders: 8, layout: "cross", aspiration: "turbo",
    idle: 620, redline: 7000, capacity: 4.0, clatter: 0, smooth: 0.22,
    label: "4.0 twin turbo V8"
  },

  // Not in the sidebar today, but the files are in the garage and the moment
  // either is added it should already sound like itself.
  "/models/dodge_challenger_demon__free_model.glb": {
    cylinders: 8, layout: "cross", aspiration: "supercharged",
    idle: 650, redline: 6300, capacity: 6.2, clatter: 0, smooth: 0.15,
    label: "6.2 supercharged V8"
  },

  // A 13B rotary has no cylinders. Two chambers, each firing once per
  // eccentric shaft revolution, so its order is 2 rather than half of
  // anything, and it will go to nine thousand doing it.
  "/models/mazda_rx-7.glb": {
    rotor: true, cylinders: 4, layout: "rotary", aspiration: "turbo",
    idle: 900, redline: 9000, capacity: 1.3, clatter: 0, smooth: 0.85,
    label: "13B twin rotor"
  }
};

export function engineFor(model) {
  return { ...DEFAULT, ...(ENGINES[model] ?? {}) };
}

// The fundamental the engine is making at a given speed. A rotary is taken as
// order 2; everything else fires half its cylinders per revolution.
export function firingHz(engine, rpm) {
  const order = engine.rotor ? 2 : engine.cylinders / 2;
  return (rpm / 60) * order;
}
