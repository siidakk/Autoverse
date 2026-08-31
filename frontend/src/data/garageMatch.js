import { cars } from "./cars";

// The recommender knows 120 real cars. The garage holds fifteen models. Rather
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
