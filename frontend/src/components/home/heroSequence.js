import { cars } from "../../data/cars";

// The hero shows the lightest cars first and only fetches the next model while
// the current one is still on screen, so the homepage starts on a download of
// well under a megabyte rather than the whole garage.
export const HERO_SEQUENCE = [...cars]
  .sort((a, b) => a.weightMb - b.weightMb)
  .slice(0, 8);
