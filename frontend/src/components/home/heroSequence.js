import { cars } from "../../data/cars";

// Download weight in MB. The models range from half a megabyte to fifty, so the
// hero shows the light ones first and the heavy ones are only fetched once the
// carousel reaches them.
const WEIGHT = {
  "/models/merc.glb": 0.6,
  "/models/porsche.glb": 6.6,
  "/models/audi.glb": 11.6,
  "/models/gtr.glb": 17.0,
  "/models/bmw.glb": 19.5,
  "/models/lambo.glb": 50.0
};

export const HERO_SEQUENCE = [...cars].sort(
  (a, b) => (WEIGHT[a.model] ?? 99) - (WEIGHT[b.model] ?? 99)
);
