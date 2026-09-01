// The body-style classifier: hatchback, saloon, SUV and so on.
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
// It answers a shape, not a car. Naming the car is makeModel.js's half of the
// job, and even together they narrow rather than identify -- see carGuess.js.

import { createClassifier } from "./classifier";

const bodies = createClassifier({
  name: "shape reader",
  modelUrl: "/models/bodystyle/model.json",
  metaUrl: "/models/bodystyle/bodystyle.json"
});

export const bodyModelState = bodies.state;
export const bodyModelInfo = bodies.info;
export const warmBodyModel = bodies.warm;

/**
 * Reads the body style of the car in a crop of the photograph.
 *
 * @param image an <img> or a canvas from imageSource.js
 * @param box   [left, top, width, height] in that image's own pixels
 * @returns { body, confidence, ranked, recall }, body null when unsure
 */
export async function readBody(image, box, onProgress) {
  const read = await bodies.read(image, box, onProgress);
  if (!read) return null;

  return { ...read, body: read.label };
}
