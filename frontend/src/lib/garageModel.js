// Names the cars this project actually models.
//
// The other two classifiers answer categories: a shape, and — when it worked,
// which it did not — a manufacturer. This one answers a car. Show it a Toyota
// Fortuner and it is meant to say Toyota Fortuner, because a Fortuner is one
// of the fifteen cars in the garage and its 3D model was photographed from
// every angle to teach this.
//
// That is the only route to naming a specific Indian car that does not depend
// on a dataset nobody has published. It is also the one with the most obvious
// way to be wrong, so read the next paragraph before trusting it.
//
// It learned from renders, not photographs. The accuracy in garage.json is
// measured on held-out renders and is an upper bound: a real camera brings
// noise, motion blur, weather, a street behind the car and dirt on the paint,
// none of which a renderer produces. The training script fights that with
// heavy augmentation and the confidence floor is measured rather than chosen,
// but the honest position is that the number on renders is not the number on
// photographs, and the page says which one it is quoting.
//
// It also only knows fifteen cars. Everything else in the world is, to this
// model, one of those fifteen — which is exactly what the floor is for.

import { createClassifier } from "./classifier";

const garage = createClassifier({
  name: "car recogniser",
  modelUrl: "/models/garage/model.json",
  metaUrl: "/models/garage/garage.json",
  defaultFloor: 0.7
});

export const garageModelState = garage.state;
export const garageModelInfo = garage.info;
export const warmGarageModel = garage.warm;

/**
 * Which of the garage's cars this most looks like.
 *
 * @returns { car, confidence, ranked, recall } — car is the folder-style id
 *          the renderer used, null when unsure or when the model is absent
 */
export async function readGarageCar(image, box, onProgress) {
  const read = await garage.read(image, box, onProgress);
  if (!read) return null;

  return { ...read, car: read.label };
}
