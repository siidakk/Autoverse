// Finds a car in a photograph and reads its paint, entirely in the browser.
//
// Nothing is uploaded. The model runs on the visitor's own machine, which costs
// nothing to host and means a photo of somebody's car never leaves it.
//
// What this can and cannot do is worth being plain about. It finds a vehicle and
// tells a car from a truck or a bus, because that is what a detector trained on
// everyday objects knows. It does not read a badge: naming a car as a 2018 City
// rather than a saloon needs a model fine tuned on car makes, which is a
// different piece of work and a different dataset.

import { readBody } from "./bodyModel";

let detector = null;
let loading = null;

// Weights are fetched from Google's model host on first use and run to several
// megabytes across five files. On a slow line that is a minute or more of a
// page looking like it has hung, so the wait is started as early as possible
// and reported while it happens.
export const MODEL_SIZE_MB = 6;

export const detectorState = () => (detector ? "ready" : loading ? "loading" : "idle");

// Kept out of the main bundle. Nobody visiting the configurator should download
// a detection model they never asked for.
export function warmDetector(onProgress) {
  if (detector) return Promise.resolve(detector);

  if (!loading) {
    loading = (async () => {
      onProgress?.("Starting up");

      const [tf, , cocoSsd] = await Promise.all([
        import("@tensorflow/tfjs-core"),
        import("@tensorflow/tfjs-backend-webgl"),
        import("@tensorflow-models/coco-ssd")
      ]);

      await tf.setBackend("webgl");
      await tf.ready();

      onProgress?.("Downloading the model");

      try {
        detector = await cocoSsd.load({ base: "lite_mobilenet_v2" });
      } catch (error) {
        // Let the next attempt start over rather than waiting on a promise
        // that already failed.
        loading = null;
        throw error;
      }

      return detector;
    })();
  }

  return loading;
}

async function loadDetector(onProgress) {
  return warmDetector(onProgress);
}

const VEHICLES = ["car", "truck", "bus"];

// A truck in this detector's vocabulary covers pickups and vans; a bus covers
// anything long with a tall flat side, which for our purposes is an MPV. These
// two the detector really does know, so they stand. `car` is left out on
// purpose: it covers every shape from an Alto to an SL63 and says nothing
// about which, so the classifier answers that one.
const BODY_FROM_CLASS = {
  truck: "Pickup",
  bus: "MPV"
};

/**
 * Reads the paint colour off the car, sampling only inside the detection box so
 * sky, tarmac and grass cannot vote.
 */
export function readPaint(image, box) {
  const [left, top, width, height] = box;

  // The middle of the box is bodywork. The edges are wheels, shadow, windows
  // and whatever is behind the car.
  const inset = {
    x: left + width * 0.25,
    y: top + height * 0.3,
    w: width * 0.5,
    h: height * 0.32
  };

  const canvas = document.createElement("canvas");
  const size = 48;
  canvas.width = size;
  canvas.height = size;

  const context = canvas.getContext("2d", { willReadFrequently: true });
  context.drawImage(image, inset.x, inset.y, inset.w, inset.h, 0, 0, size, size);

  const { data } = context.getImageData(0, 0, size, size);

  // Buckets of similar colour, so a few bright highlights cannot outvote the
  // body of the paint.
  const buckets = new Map();

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];

    // Specular highlights and deep shadow are the light, not the colour. The
    // test is for a clipped pixel rather than a bright one: white paint sits
    // around 245 and a highlight on it clips at 255, so judging by average
    // brightness threw away every white car.
    const clipped = r >= 250 && g >= 250 && b >= 250;
    const black = r + g + b < 30;
    if (clipped || black) continue;

    const key = `${r >> 4}-${g >> 4}-${b >> 4}`;
    const bucket = buckets.get(key) ?? { r: 0, g: 0, b: 0, n: 0 };

    bucket.r += r;
    bucket.g += g;
    bucket.b += b;
    bucket.n += 1;

    buckets.set(key, bucket);
  }

  if (!buckets.size) return { hex: "#9aa0a6", confidence: 0 };

  const sorted = [...buckets.values()].sort((a, b) => b.n - a.n);
  const winner = sorted[0];
  const total = sorted.reduce((sum, bucket) => sum + bucket.n, 0);

  const channel = (value) =>
    Math.round(value / winner.n).toString(16).padStart(2, "0");

  return {
    hex: `#${channel(winner.r)}${channel(winner.g)}${channel(winner.b)}`,
    confidence: winner.n / total
  };
}

// Named so the result can be described in words rather than a hex code.
const NAMED = [
  ["White", [242, 244, 247]],
  ["Silver", [190, 195, 200]],
  ["Grey", [128, 133, 140]],
  ["Gunmetal", [77, 82, 89]],
  ["Black", [26, 28, 31]],
  ["Red", [178, 40, 45]],
  ["Maroon", [110, 30, 40]],
  ["Orange", [214, 110, 40]],
  ["Gold", [196, 160, 70]],
  ["Green", [60, 130, 80]],
  ["Teal", [50, 140, 145]],
  ["Blue", [45, 85, 175]],
  ["Navy", [30, 45, 95]],
  ["Purple", [110, 70, 160]],
  ["Brown", [110, 80, 60]]
];

export function nameColour(hex) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);

  let best = NAMED[0];
  let closest = Infinity;

  for (const entry of NAMED) {
    const [, [cr, cg, cb]] = entry;
    const distance = (r - cr) ** 2 + (g - cg) ** 2 + (b - cb) ** 2;

    if (distance < closest) {
      closest = distance;
      best = entry;
    }
  }

  return best[0];
}

/**
 * Runs detection over an image element and returns the best vehicle found.
 */
export async function inspectPhoto(image, onProgress) {
  const model = await loadDetector(onProgress);

  onProgress?.("Looking for a car");
  const found = await model.detect(image, 10, 0.25);

  const vehicles = found
    .filter((item) => VEHICLES.includes(item.class))
    .sort((a, b) => b.bbox[2] * b.bbox[3] - a.bbox[2] * a.bbox[3]);

  if (!vehicles.length) {
    return { found: false, others: found.map((item) => item.class) };
  }

  const best = vehicles[0];
  const [, , width, height] = best.bbox;

  const paint = readPaint(image, best.bbox);

  // Body style, from a classifier trained to answer it.
  //
  // What used to be here read the body off the aspect ratio of the box: wider
  // than 2.4 a saloon, narrower than 1.5 a hatchback. That number describes
  // where the photographer was standing. Side on, a Creta measured as a
  // saloon; from three quarters the same car measured as a hatchback. It was
  // not a coarse read, it was a measurement of the wrong thing, and it is why
  // this page felt erratic.
  //
  // readBody() returns null until the model has been built and put in
  // public/models/bodystyle, and null again when it is genuinely unsure. Both
  // are better answers than a ratio. `bodySource` is what tells a caller
  // whether the answer is worth acting on -- the repair page will not name a
  // car from anything but "model".
  const ratio = width / Math.max(height, 1);

  let body = BODY_FROM_CLASS[best.class] ?? null;
  let bodySource = best.class === "car" ? null : "detector";
  let bodyConfidence = null;
  let bodyRecall = null;

  if (best.class === "car") {
    onProgress?.("Reading the shape");
    const read = await readBody(image, best.bbox, onProgress);

    if (read?.body) {
      body = read.body;
      bodySource = "model";
      bodyConfidence = read.confidence;
      bodyRecall = read.recall;
    }
  }

  return {
    found: true,
    label: best.class,
    confidence: best.score,
    box: best.bbox,
    body,
    bodySource,
    bodyConfidence,
    bodyRecall,
    ratio,
    paint,
    colourName: nameColour(paint.hex),
    alternatives: vehicles.slice(1, 3).map((item) => ({
      label: item.class,
      confidence: item.score
    }))
  };
}
