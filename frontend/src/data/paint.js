// Paint is grouped the way a real colour chart is: neutrals first, because most
// cars on the road are white, silver, grey or black, then hue families each
// holding a light-to-dark run of shades.

export const finishes = {
  matte: {
    label: "Matte",
    note: "Flat, no reflection",
    metalness: 0.1,
    roughness: 0.8,
    clearcoat: 0
  },
  glossy: {
    label: "Gloss",
    note: "Factory clearcoat",
    metalness: 0.5,
    roughness: 0.15,
    clearcoat: 1
  },
  metallic: {
    label: "Metallic",
    note: "Flake, deep shine",
    metalness: 0.9,
    roughness: 0.25,
    clearcoat: 0.6
  }
};

export const neutrals = {
  name: "Neutral",
  swatch: "#c8ccd2",
  shades: [
    "#f4f6f8",
    "#d8dce1",
    "#b0b5bd",
    "#82878f",
    "#565b63",
    "#33373d",
    "#15171a",
    "#0a0b0d"
  ]
};

const hueFamilies = [
  { name: "Red", hue: 358 },
  { name: "Orange", hue: 24 },
  { name: "Gold", hue: 44 },
  { name: "Green", hue: 132 },
  { name: "Teal", hue: 172 },
  { name: "Blue", hue: 212 },
  { name: "Indigo", hue: 252 },
  { name: "Purple", hue: 286 },
  { name: "Pink", hue: 330 }
];

const shadeSteps = [
  { s: 88, l: 62 },
  { s: 92, l: 52 },
  { s: 96, l: 44 },
  { s: 90, l: 36 },
  { s: 70, l: 30 },
  { s: 55, l: 42 },
  { s: 42, l: 56 },
  { s: 30, l: 68 }
];

export const paintFamilies = [
  neutrals,
  ...hueFamilies.map((family) => ({
    name: family.name,
    swatch: `hsl(${family.hue}, 92%, 50%)`,
    shades: shadeSteps.map(
      (step) => `hsl(${family.hue}, ${step.s}%, ${step.l}%)`
    )
  }))
];

export const totalShades = paintFamilies.reduce(
  (count, family) => count + family.shades.length,
  0
);
