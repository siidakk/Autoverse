// The manufacturer classifier: whose car is this.
//
// The body classifier answers a shape, and a shape is not a car. This is the
// other half -- and between them they can say "a white Toyota SUV", which is
// four cars in the catalogue rather than seventy four.
//
// What it cannot do, and this is severe enough to state here rather than bury
// in the training script: it learned from Stanford Cars, which is American.
// Its makes cover eighteen of the thirty one brands sold in India, and the
// thirteen missing include Maruti Suzuki, Tata, Mahindra and Kia -- most of
// what is actually on the road there. Shown a Swift it has no right answer
// available and will reach for whichever of its makes looks nearest.
//
// Which is why the floor is doing real work here. It is measured on held out
// data at the point where the model is right four times in five among the
// answers it gives, and below it this returns null and the page says nothing
// about the make. A confident wrong badge is worse than no badge.

import { createClassifier } from "./classifier";

const makes = createClassifier({
  name: "badge reader",
  modelUrl: "/models/make/model.json",
  metaUrl: "/models/make/make.json",
  defaultFloor: 0.6
});

export const makeModelState = makes.state;
export const makeModelInfo = makes.info;
export const warmMakeModel = makes.warm;

/**
 * Reads the manufacturer of the car in a crop of the photograph.
 *
 * @returns { make, confidence, ranked, recall }, make null when unsure or when
 *          the model has not been built yet
 */
export async function readMake(image, box, onProgress) {
  const read = await makes.read(image, box, onProgress);
  if (!read) return null;

  return { ...read, make: read.label };
}
