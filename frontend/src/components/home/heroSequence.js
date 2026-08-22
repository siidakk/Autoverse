import { cars } from "../../data/cars";

// Which cars appear on the landing page, chosen rather than taken by weight.
// The garage has fifteen; eight is as many as the carousel can show before the
// loop feels long.
//
// Still ordered lightest first, so the homepage opens on a download of a
// megabyte rather than on the twelve megabyte Mercedes, and only fetches the
// next model while the current one is still on screen.
const ON_THE_HOMEPAGE = [
  3,  // Mercedes G-Class
  5,  // Jeep Wrangler Rubicon
  11, // Porsche 911
  8,  // Nissan GT-R
  10, // Audi R8
  13, // Lamborghini Aventador
  14, // Chevrolet Corvette C8
  15  // Mercedes-Benz SL63 AMG
];

export const HERO_SEQUENCE = ON_THE_HOMEPAGE
  .map((id) => cars.find((car) => car.id === id))
  .filter(Boolean)
  .sort((a, b) => a.weightMb - b.weightMb);

// How long each car holds the stage, and how long the crossfade between two of
// them takes.
//
// The turntable speed is derived from these rather than set independently, so
// that **one pass of the whole garage is exactly one revolution**. Each car
// therefore covers its own slice of the circle -- 45 degrees with eight of
// them -- and the next picks up precisely where the last left off. Watch it for
// a minute and you have seen every angle of the sequence, and when it returns
// to the first car the turntable is back at zero, so the loop is seamless.
//
// It used to reset to zero on every swap, which is why the same fifty degrees
// played over and over and no car ever showed its back.
export const DISPLAY_MS = 5600;
export const FADE_MS = 900;

const TURN_MS = DISPLAY_MS + FADE_MS;

// Radians per second for one revolution across the whole sequence.
export const SPIN_RATE = (Math.PI * 2) / ((TURN_MS / 1000) * HERO_SEQUENCE.length);
