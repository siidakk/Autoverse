// The trained damage classifier, run on the phone rather than on a server.
//
// This replaces the hand written scan in damage.js, which measured gradients
// and colour and guessed. That approach was abandoned because it could not be
// made to work: it flagged the grille and the badge on a clean car, then found
// nothing at all on a wrecked one. Telling a dent from a reflection is not
// something anybody can write down as a rule, so the rule is learned instead.
//
// The weights are served from public/models/damage/ alongside the cars, not
// from a CDN. The object detector on the photo page loads from Google's and
// costs about a minute on a cold visit, which is the whole reason that page
// needed a progress counter.
//
// What this returns is what kind of damage a photograph shows, and how sure it
// is. It does not return where the damage is. That needs box labels and a
// detector rather than a classifier, and pretending otherwise by drawing a
// rectangle around a guess is exactly the failure this replaces.

const MODEL_URL = "/models/damage/model.json";
const META_URL = "/models/damage/damage.json";

let model = null;
let meta = null;
let loading = null;
let unavailable = false;

export const modelState = () =>
  model ? "ready" : loading ? "loading" : unavailable ? "unavailable" : "idle";

export const modelInfo = () => meta;

// True when a trained model has been built and put in public/models/damage.
// Until someone runs the training, it has not been, and the page says so
// rather than quietly falling back to something that does not work.
export async function warmModel(onProgress) {
  if (model) return model;
  if (unavailable) return null;
  if (loading) return loading;

  loading = (async () => {
    try {
      onProgress?.("Checking for the model");

      // Asked for first, and separately, because it is a few hundred bytes.
      // If it is not there the weights are not either, and there is no reason
      // to start a multi megabyte download to find that out.
      const describe = await fetch(META_URL);
      if (!describe.ok) {
        unavailable = true;
        return null;
      }
      meta = await describe.json();

      onProgress?.("Loading the classifier");

      const [tf, converter] = await Promise.all([
        import("@tensorflow/tfjs-core"),
        import("@tensorflow/tfjs-converter")
      ]);

      await import("@tensorflow/tfjs-backend-webgl");
      await tf.ready();

      model = await converter.loadGraphModel(MODEL_URL);

      // The first call through a fresh WebGL program is slow enough to look
      // broken, so it is spent here on a blank image rather than on the
      // photograph somebody just chose.
      const size = meta.imageSize ?? 224;
      const warm = tf.zeros([1, size, size, 3]);
      const output = model.predict(warm);
      output.dataSync();
      tf.dispose([warm, output]);

      onProgress?.("Ready");
      return model;
    } catch {
      // A missing or unreadable model is a normal state here, not a crash.
      unavailable = true;
      return null;
    } finally {
      loading = null;
    }
  })();

  return loading;
}

// Classifies one photograph. `region` optionally narrows it to a crop, which is
// how the page asks about one panel rather than the whole car.
export async function classify(image, region = null) {
  const ready = await warmModel();
  if (!ready || !meta) return null;

  const tf = await import("@tensorflow/tfjs-core");
  const size = meta.imageSize ?? 224;

  const scores = tf.tidy(() => {
    let pixels = tf.browser.fromPixels(image);

    if (region) {
      const { x, y, width, height } = region;
      pixels = tf.slice(
        pixels,
        [Math.max(0, Math.round(y)), Math.max(0, Math.round(x)), 0],
        [
          Math.min(Math.round(height), pixels.shape[0] - Math.round(y)),
          Math.min(Math.round(width), pixels.shape[1] - Math.round(x)),
          3
        ]
      );
    }

    const resized = tf.image.resizeBilinear(pixels, [size, size]);

    // Exactly what MobileNetV2 was trained with, and what train_damage.py
    // applied. Anything else here reads as a bad model rather than a wrong
    // scale, which is a hard thing to notice afterwards.
    const scaled = tf.sub(tf.div(resized, 127.5), 1);

    return model.predict(tf.expandDims(scaled, 0));
  });

  const values = Array.from(await scores.data());
  scores.dispose();

  const ranked = values
    .map((confidence, index) => ({ label: meta.classes[index], confidence }))
    .sort((a, b) => b.confidence - a.confidence);

  const best = ranked[0];

  // Below the floor measured on the held out set, the model is more often
  // wrong than not, so it says nothing instead. A scan that admits it cannot
  // tell is worth more than one that always answers.
  const floor = meta.confidenceFloor ?? 0.5;

  return {
    sure: best.confidence >= floor,
    best,
    ranked: ranked.slice(0, 3),
    floor,
    // What this class was measured to get right on images it never saw, so
    // the page can be specific rather than showing one overall percentage.
    recall: meta.perClass?.[best.label]?.recall ?? null
  };
}

// --- finding where the damage is ---
//
// The model is trained on crops, so asking it about one crop is the thing it
// was built to answer. Sliding that question across the photograph turns a
// classifier into something that can point, without needing a detector.
//
// It is a coarse answer by construction: a window is either damaged or not,
// so the smallest region it can report is one window. That is honest about
// what it knows, which the version this replaces was not.

const WINDOW_SCALES = [0.5, 0.33];
const STEP = 0.5; // overlap between neighbouring windows, as a share of size

function windowsOver(width, height) {
  const windows = [];

  for (const scale of WINDOW_SCALES) {
    const size = Math.min(width, height) * scale;
    const stride = size * STEP;

    for (let y = 0; y + size <= height + 1; y += stride) {
      for (let x = 0; x + size <= width + 1; x += stride) {
        windows.push({
          x: Math.min(x, width - size),
          y: Math.min(y, height - size),
          width: size,
          height: size
        });
      }
    }
  }

  return windows;
}

// Two findings are the same finding if they overlap a lot and agree on what
// they are. Without this a single scratch is reported four times, once per
// window that happened to contain it.
function merge(found, limit = 0.3) {
  const kept = [];

  for (const candidate of found.sort((a, b) => b.confidence - a.confidence)) {
    const duplicate = kept.find((existing) => {
      if (existing.label !== candidate.label) return false;

      const left = Math.max(existing.x, candidate.x);
      const top = Math.max(existing.y, candidate.y);
      const right = Math.min(existing.x + existing.width, candidate.x + candidate.width);
      const bottom = Math.min(existing.y + existing.height, candidate.y + candidate.height);

      if (right <= left || bottom <= top) return false;

      const shared = (right - left) * (bottom - top);
      const smaller = Math.min(
        existing.width * existing.height,
        candidate.width * candidate.height
      );

      return shared / smaller > limit;
    });

    if (duplicate) {
      // Grow the one already kept to cover both, rather than dropping the
      // evidence that the damage extends further than one window.
      const right = Math.max(duplicate.x + duplicate.width, candidate.x + candidate.width);
      const bottom = Math.max(duplicate.y + duplicate.height, candidate.y + candidate.height);
      duplicate.x = Math.min(duplicate.x, candidate.x);
      duplicate.y = Math.min(duplicate.y, candidate.y);
      duplicate.width = right - duplicate.x;
      duplicate.height = bottom - duplicate.y;
      duplicate.windows += 1;
    } else {
      kept.push({ ...candidate, windows: 1 });
    }
  }

  return kept;
}

export async function scan(image, onProgress) {
  const ready = await warmModel(onProgress);
  if (!ready || !meta) return null;

  const width = image.naturalWidth ?? image.width;
  const height = image.naturalHeight ?? image.height;

  const windows = windowsOver(width, height);
  const floor = meta.confidenceFloor ?? 0.5;
  const found = [];

  for (let i = 0; i < windows.length; i++) {
    const region = windows[i];
    const result = await classify(image, region);

    if (
      result?.sure &&
      result.best.label !== "undamaged" &&
      result.best.confidence >= floor
    ) {
      found.push({
        ...region,
        label: result.best.label,
        confidence: result.best.confidence
      });
    }

    // Yields to the browser so a long scan does not freeze the page.
    if (i % 4 === 3) {
      onProgress?.(`Looking… ${Math.round(((i + 1) / windows.length) * 100)}%`);
      await new Promise((resolve) => setTimeout(resolve, 0));
    }
  }

  return {
    findings: merge(found),
    windows: windows.length,
    floor,
    // A clean car should come back with nothing, and that is a result rather
    // than a failure. Saying so out loud is the difference from the old scan.
    clean: found.length === 0
  };
}
