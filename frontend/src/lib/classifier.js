// One image classifier, loaded and run in the browser.
//
// There are three of these now -- damage, body style and manufacturer -- and
// they differ only in where the weights live and what the classes are called.
// The first two were written out separately and immediately drifted: the body
// one used tfjs's chained tensor API, which is not registered when only
// tfjs-core is imported, and failed the moment real weights existed to run.
// The damage one had always used the function form. Same code, one copy wrong.
//
// So the mechanics live here once: fetch the description, load the graph, warm
// the shaders, crop, normalise the way MobileNetV2 was trained, rank, and
// refuse to answer below the floor the training measured.

import { atNaturalSize } from "./imageSource";

/**
 * @param name        for error messages
 * @param modelUrl    /models/<thing>/model.json
 * @param metaUrl     the sidecar written by the trainer
 * @param defaultFloor used only if the sidecar has no confidenceFloor
 */
export function createClassifier({ name, modelUrl, metaUrl, defaultFloor = 0.55 }) {
  let model = null;
  let meta = null;
  let loading = null;
  let unavailable = false;

  const state = () =>
    model ? "ready" : loading ? "loading" : unavailable ? "unavailable" : "idle";

  const info = () => meta;

  async function warm(onProgress) {
    if (model) return model;
    if (unavailable) return null;
    if (loading) return loading;

    loading = (async () => {
      try {
        // A few hundred bytes, asked for first. If the description is missing
        // so are the weights, and there is no sense starting a multi megabyte
        // download to discover that.
        const describe = await fetch(metaUrl);
        if (!describe.ok) {
          unavailable = true;
          return null;
        }
        meta = await describe.json();

        onProgress?.(`Loading the ${name}`);

        const [tf, converter] = await Promise.all([
          import("@tensorflow/tfjs-core"),
          import("@tensorflow/tfjs-converter")
        ]);

        await import("@tensorflow/tfjs-backend-webgl");
        // CPU too: a few kernels are registered only there and WebGL forwards
        // to them. See the note in vision.js.
        await import("@tensorflow/tfjs-backend-cpu");
        await tf.ready();

        model = await converter.loadGraphModel(modelUrl);

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
        // A missing or unreadable model is a normal state, not a crash: the
        // page falls back to saying less.
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
   * @param image an <img> or a canvas
   * @param box   [left, top, width, height] in the image's own pixels, or null
   * @returns { label, confidence, ranked, recall } — label is null below the
   *          floor, which is a considered answer rather than a failure
   */
  async function read(image, box, onProgress) {
    const loaded = await warm(onProgress);
    if (!loaded) return null;

    const tf = await import("@tensorflow/tfjs-core");
    const size = meta.imageSize ?? 224;
    const source = atNaturalSize(image);

    const [left, top, width, height] = box?.length
      ? box
      : [0, 0, source.width, source.height];

    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    canvas
      .getContext("2d", { willReadFrequently: true })
      .drawImage(source, left, top, width, height, 0, 0, size, size);

    const scores = tf.tidy(() => {
      // Function calls, not chained off the tensor: the chaining API belongs
      // to the union @tensorflow/tfjs package and only tfjs-core is imported.
      const pixels = tf.browser.fromPixels(canvas);
      const scaled = tf.sub(tf.div(tf.cast(pixels, "float32"), 127.5), 1);
      return loaded.predict(tf.expandDims(scaled, 0));
    });

    const values = Array.from(await scores.data());
    scores.dispose();

    const ranked = values
      .map((confidence, index) => ({ label: meta.classes[index], confidence }))
      .sort((a, b) => b.confidence - a.confidence);

    const best = ranked[0];
    const floor = meta.confidenceFloor ?? defaultFloor;

    if (!best || best.confidence < floor) {
      return { label: null, confidence: best?.confidence ?? 0, ranked, floor };
    }

    return {
      label: best.label,
      confidence: best.confidence,
      ranked,
      floor,
      // How well it does on this class specifically, which is fairer than one
      // overall accuracy when the classes are lopsided.
      recall: meta.perClass?.[best.label]?.recall ?? null
    };
  }

  return { state, info, warm, read };
}
