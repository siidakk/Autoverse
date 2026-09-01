// The trained body-style classifier, run on the phone rather than on a server.
//
// This replaces a line in vision.js that decided body style from the shape of
// the detection box: wider than 2.4 was a saloon, narrower than 1.5 a
// hatchback. That ratio is a fact about where the photographer stood. The same
// car answered differently from three angles, which is exactly how the feature
// behaved, and no amount of threshold tuning fixes a measurement that does not
// carry the answer.
//
// Weights are served from public/models/bodystyle/ alongside the cars. Nothing
// is uploaded; the photo never leaves the device.
//
// What it answers is the body: hatchback, saloon, SUV and so on. It does not
// name a car, and it never will -- there is no public dataset of Indian cars
// labelled by make and model, so no model built here can read a badge. The
// naming on the repair page is a shortlist built from this answer plus the
// catalogue, and is presented as a guess because that is what it is.

const MODEL_URL = "/models/bodystyle/model.json";
const META_URL = "/models/bodystyle/bodystyle.json";

let model = null;
let meta = null;
let loading = null;
let unavailable = false;

export const bodyModelState = () =>
  model ? "ready" : loading ? "loading" : unavailable ? "unavailable" : "idle";

export const bodyModelInfo = () => meta;

/**
 * Loads the classifier if it has been built. Returns null if it has not, so
 * callers fall back rather than break.
 */
export async function warmBodyModel(onProgress) {
  if (model) return model;
  if (unavailable) return null;
  if (loading) return loading;

  loading = (async () => {
    try {
      // A few hundred bytes, asked for first. If the description is missing so
      // are the weights, and there is no sense starting a multi megabyte
      // download to discover that.
      const describe = await fetch(META_URL);
      if (!describe.ok) {
        unavailable = true;
        return null;
      }
      meta = await describe.json();

      onProgress?.("Reading the shape of the car");

      const [tf, converter] = await Promise.all([
        import("@tensorflow/tfjs-core"),
        import("@tensorflow/tfjs-converter")
      ]);

      await import("@tensorflow/tfjs-backend-webgl");
      await import("@tensorflow/tfjs-backend-cpu");
      await tf.ready();

      model = await converter.loadGraphModel(MODEL_URL);

      // The first pass through a fresh WebGL program is slow enough to look
      // broken. Spend it on a blank image rather than on somebody's photo.
      const size = meta.imageSize ?? 224;
      const blank = tf.zeros([1, size, size, 3]);
      const warmed = model.predict(blank);
      await warmed.data();
      blank.dispose();
      warmed.dispose();

      return model;
    } catch {
      // A body style is a nicety; the damage reading is the point of the page.
      // Never let this take the rest down with it.
      unavailable = true;
      model = null;
      return null;
    } finally {
      loading = null;
    }
  })();

  return loading;
}

/**
 * Reads the body style of the car in a crop of the photograph.
 *
 * @param image   the photograph, as a canvas from imageSource.js or an <img>
 * @param box     [left, top, width, height] of the car, or null for the lot.
 *                Must be in the same pixels as `image` -- see imageSource.js
 *                for why that is worth saying out loud.
 * @returns { body, confidence, ranked } or null if the model is not available
 */
export async function readBody(image, box, onProgress) {
  const loaded = await warmBodyModel(onProgress);
  if (!loaded) return null;

  const tf = await import("@tensorflow/tfjs-core");
  const size = meta.imageSize ?? 224;

  // Cropped to the car before it is asked. The classifier was trained on
  // photographs that are mostly car, so handing it a car in the corner of a
  // car park is a different question from the one it learned to answer.
  //
  // A canvas has width and height; an <img> has naturalWidth as well, and only
  // that one is its real size. Both are accepted, so both are asked properly.
  const [left, top, width, height] = box?.length
    ? box
    : [0, 0, image.naturalWidth ?? image.width, image.naturalHeight ?? image.height];

  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;

  const context = canvas.getContext("2d", { willReadFrequently: true });
  context.drawImage(image, left, top, width, height, 0, 0, size, size);

  const scores = tf.tidy(() => {
    // MobileNetV2 wants pixels in -1..1, which is what the training pipeline
    // fed it through preprocess_input.
    //
    // Written as function calls rather than chained off the tensor. The
    // chaining API -- .toFloat().div().sub() -- is registered by the union
    // @tensorflow/tfjs package, and only tfjs-core is imported here, so
    // chaining fails at runtime with "toFloat is not a function" once the
    // weights are actually there to run. damageModel.js already did it this
    // way; this now matches it.
    const pixels = tf.browser.fromPixels(canvas);
    const scaled = tf.sub(tf.div(tf.cast(pixels, "float32"), 127.5), 1);

    return loaded.predict(tf.expandDims(scaled, 0));
  });

  const values = Array.from(await scores.data());
  scores.dispose();

  const ranked = values
    .map((confidence, index) => ({ body: meta.classes[index], confidence }))
    .sort((a, b) => b.confidence - a.confidence);

  const best = ranked[0];
  const floor = meta.confidenceFloor ?? 0.55;

  // Below the floor it declines rather than guessing. A wrong body style does
  // not just show a wrong word: it steers the whole shortlist of cars on the
  // repair page, so a shrug is worth more than a coin toss.
  if (!best || best.confidence < floor) {
    return { body: null, confidence: best?.confidence ?? 0, ranked };
  }

  return {
    body: best.body,
    confidence: best.confidence,
    ranked,
    // How well it does on this class specifically, which is a fairer thing to
    // show than one overall accuracy: hatchbacks are its weakest class and the
    // commonest body on Indian roads.
    recall: meta.perClass?.[best.body]?.recall ?? null
  };
}
