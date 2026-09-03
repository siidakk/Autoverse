import { cars } from "./cars";

// The recommender knows 186 real cars. The garage holds fifteen models. Rather
// than let a recommendation end in a dead end, each one is pointed at the
// closest thing that can actually be configured, and is honest about it being
// the closest rather than the same car.

const BODY_FALLBACK = {
  Hatchback: ["Sedan", "Coupe"],
  Sedan: ["Coupe", "SUV"],
  SUV: ["Pickup", "Sedan"],
  MPV: ["SUV", "Pickup"],
  Pickup: ["SUV"],
  Coupe: ["Sedan"],
  Convertible: ["Coupe"]
};

// The id the renderer used for each car's folder, so a prediction coming back
// as "toyota-fortuner" can be turned into the car itself. Derived rather than
// written down, because a second hand-kept list of these fifteen names is one
// more thing to drift.
const slug = (name) => name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

/** The garage car a recognised id refers to, or null if it is not one of ours. */
export function garageCarById(id) {
  return cars.find((car) => slug(car.name) === id) ?? null;
}

/**
 * Every garage car of a given body, exact matches first.
 *
 * Identify used to take the first match and present it as "closest car we
 * model", which for an SUV meant the G-Class every time -- even though the
 * garage holds a Fortuner and a Wrangler too, and the photograph that prompted
 * this was a Fortuner. Picking arbitrarily and then stating it with a
 * confident label is worse than offering the three and letting somebody point.
 *
 * No model is needed to know which cars share a shape, and none is used.
 */
export function garageCarsByBody(body) {
  const exact = cars.filter((car) => car.bodyStyle === body);
  const near = (BODY_FALLBACK[body] ?? []).flatMap((fallback) =>
    cars.filter((car) => car.bodyStyle === fallback)
  );

  return { exact, near };
}

/**
 * The closest garage car to a body style on its own.
 *
 * Used by Identify, which has a shape from the classifier and no brand. It had
 * its own copy of this map and its own search, and the copy was missing Coupe
 * and Convertible -- the two bodies the classifier gained when the luxury half
 * went into the catalogue. Latent rather than broken, because the garage
 * happens to hold both, but it is the same bug as the two definitions of
 * "Luxury": one idea, written down twice, drifting apart.
 */
export function matchGarageBody(body) {
  const sameBody = cars.find((car) => car.bodyStyle === body);
  if (sameBody) return { car: sameBody, exact: true };

  for (const fallback of BODY_FALLBACK[body] ?? []) {
    const near = cars.find((car) => car.bodyStyle === fallback);
    if (near) return { car: near, exact: false };
  }

  return { car: cars[0], exact: false };
}

export function matchGarageCar(recommendation) {
  const wanted = recommendation.body;

  // Same maker first: a Honda recommendation opening a Honda is the best that
  // can be done here.
  const sameBrand = cars.find((car) =>
    car.name.toLowerCase().startsWith(recommendation.brand.toLowerCase())
  );

  if (sameBrand) {
    return { car: sameBrand, exact: sameBrand.bodyStyle === wanted, reason: "same make" };
  }

  const sameBody = cars.find((car) => car.bodyStyle === wanted);
  if (sameBody) {
    return { car: sameBody, exact: true, reason: `also a ${wanted.toLowerCase()}` };
  }

  for (const fallback of BODY_FALLBACK[wanted] ?? []) {
    const near = cars.find((car) => car.bodyStyle === fallback);
    if (near) {
      return { car: near, exact: false, reason: `closest shape we model` };
    }
  }

  return { car: cars[0], exact: false, reason: "closest shape we model" };
}
