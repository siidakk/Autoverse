// Design themes: a phrase in, a whole specification out.
//
// This matches words against vocabularies rather than calling a language model.
// That is a deliberate choice and worth stating plainly rather than dressing up:
// the job is to turn a handful of words into eleven settings that already exist,
// a lookup does it accurately and instantly with nothing to host, and it can
// show its working. A model would be slower, cost money, need a key, and
// occasionally invent an option that is not in the list.
//
// What it does do is score every theme against what was typed, so partial and
// unexpected phrasings still land somewhere sensible, and say which words it
// matched on.

export const THEMES = [
  {
    id: "cyberpunk",
    label: "Cyberpunk",
    blurb: "Night city, lit from underneath",
    words: [
      "cyberpunk", "cyber", "neon", "night", "tokyo", "futuristic", "future",
      "glow", "electric", "synthwave", "retrowave", "blade", "runner", "purple",
      "violet", "dark", "city", "underglow", "led", "rgb", "vapor", "vaporwave"
    ],
    spec: {
      color: "#1b1230",
      finish: "glossy",
      wheelType: "sport",
      wheelSize: 3,
      stance: 0.8,
      spoilerType: "racing",
      exhaustType: "quad",
      headlightType: "laser",
      underglow: "violet",
      wrapMode: "stripes",
      wrapColour: "#b06bff",
      tintLevel: "limo",
      stage: "night"
    }
  },
  {
    id: "luxury",
    label: "Luxury",
    blurb: "Quiet money, nothing shouting",
    words: [
      "luxury", "luxurious", "premium", "executive", "elegant", "classy",
      "class", "refined", "understated", "chauffeur", "business", "formal",
      "expensive", "rich", "posh", "smart", "black", "limousine", "mature",
      "subtle", "sophisticated"
    ],
    spec: {
      color: "#0f1114",
      finish: "metallic",
      wheelType: "sport",
      wheelSize: 2,
      stance: 0,
      spoilerType: "stock",
      exhaustType: "twin",
      headlightType: "xenon",
      underglow: "off",
      wrapMode: "none",
      wrapColour: "#0c0d0f",
      tintLevel: "dark",
      stage: "studio"
    }
  },
  {
    id: "track",
    label: "Track build",
    blurb: "Stripped, stiff and pointed at an apex",
    words: [
      "track", "race", "racing", "circuit", "lap", "motorsport", "sport",
      "sporty", "fast", "aggressive", "aero", "downforce", "gt", "rally",
      "performance", "stripes", "livery", "weekend", "spirited", "apex"
    ],
    spec: {
      color: "#f2f4f7",
      finish: "matte",
      wheelType: "sport",
      wheelSize: 2,
      stance: 0.45,
      spoilerType: "racing",
      exhaustType: "quad",
      headlightType: "xenon",
      underglow: "off",
      wrapMode: "stripes",
      wrapColour: "#c0242c",
      tintLevel: "light",
      stage: "concrete"
    }
  },
  {
    id: "stealth",
    label: "Murdered out",
    blurb: "Every surface the same shade of nothing",
    words: [
      "stealth", "murdered", "blacked", "blackout", "murder", "sinister",
      "menacing", "shadow", "matte", "satin", "dark", "goth", "villain",
      "batman", "tinted", "all", "black"
    ],
    spec: {
      color: "#0a0b0d",
      finish: "matte",
      wheelType: "sport",
      wheelSize: 2,
      stance: 0.45,
      spoilerType: "sport",
      exhaustType: "carbon",
      headlightType: "laser",
      underglow: "off",
      wrapMode: "roof",
      wrapColour: "#0c0d0f",
      tintLevel: "limo",
      stage: "studio"
    }
  },
  {
    id: "offroad",
    label: "Off-road",
    blurb: "Built for where the tarmac stops",
    words: [
      "offroad", "off", "road", "overland", "trail", "mud", "dirt", "desert",
      "safari", "expedition", "adventure", "rugged", "tough", "utility",
      "camping", "4x4", "jeep", "green", "sand", "outdoors", "wild"
    ],
    spec: {
      color: "#4a5a3c",
      finish: "matte",
      wheelType: "classic",
      wheelSize: 0,
      stance: 0,
      spoilerType: "stock",
      exhaustType: "twin",
      headlightType: "halogen",
      underglow: "off",
      wrapMode: "none",
      wrapColour: "#2b2f36",
      tintLevel: "light",
      stage: "sunset"
    }
  },
  {
    id: "sleeper",
    label: "Sleeper",
    blurb: "Looks like nothing, is not nothing",
    words: [
      "sleeper", "stock", "plain", "quiet", "boring", "ordinary", "unassuming",
      "grandpa", "innocent", "clean", "factory", "original", "simple", "silver",
      "modest", "discreet"
    ],
    spec: {
      color: "#b8bec4",
      finish: "glossy",
      wheelType: "classic",
      wheelSize: 1,
      stance: 0,
      spoilerType: "stock",
      exhaustType: "stock",
      headlightType: "stock",
      underglow: "off",
      wrapMode: "none",
      wrapColour: "#0c0d0f",
      tintLevel: "clear",
      stage: "studio"
    }
  },
  {
    id: "summer",
    label: "Sunset cruise",
    blurb: "Warm paint, long evenings, nowhere to be",
    words: [
      "summer", "sunset", "beach", "coast", "cruise", "cruising", "miami",
      "holiday", "warm", "orange", "gold", "relaxed", "calm", "sunny", "sun",
      "boulevard", "evening", "golden"
    ],
    spec: {
      color: "#d98324",
      finish: "metallic",
      wheelType: "sport",
      wheelSize: 2,
      stance: 0.45,
      spoilerType: "sport",
      exhaustType: "twin",
      headlightType: "xenon",
      underglow: "ember",
      wrapMode: "none",
      wrapColour: "#0c0d0f",
      tintLevel: "light",
      stage: "sunset"
    }
  }
];

// Colours somebody might name outright, which should win over the theme's own
// paint because it is the most specific thing they said.
const NAMED_COLOURS = {
  red: "#b2282d", crimson: "#8f1f24", maroon: "#6e1e28",
  orange: "#d66e28", amber: "#d98324", gold: "#c4a046",
  yellow: "#e0c020", lime: "#8bff4d", green: "#3c8250",
  emerald: "#1f7a4d", teal: "#328c91", cyan: "#41b6c4",
  blue: "#2d55af", navy: "#1e2d5f", purple: "#6e46a0",
  violet: "#b06bff", pink: "#ff3d8b", rose: "#e0557f",
  white: "#f2f4f7", silver: "#bec3c8", grey: "#80858c",
  gray: "#80858c", gunmetal: "#4d5259", black: "#15171a",
  brown: "#6e5040", bronze: "#8c6239"
};

function tokenise(prompt) {
  return prompt
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ")
    .split(/[\s-]+/)
    .filter((word) => word.length > 1);
}

/**
 * Scores every theme against a phrase and returns the best, along with the
 * words that earned it and anything the phrase overrode.
 */
export function interpret(prompt) {
  const tokens = tokenise(prompt);

  if (!tokens.length) return null;

  const scored = THEMES.map((theme) => {
    const matched = tokens.filter((token) =>
      theme.words.some(
        (word) => word === token || (token.length > 4 && word.startsWith(token.slice(0, 5)))
      )
    );

    // Every distinct word that lands counts once, so "dark neon city" beats a
    // single strong word without letting a repeated one run away with it.
    const unique = [...new Set(matched)];

    return { theme, matched: unique, score: unique.length };
  }).sort((a, b) => b.score - a.score);

  const best = scored[0];
  if (!best.score) return null;

  // A colour named outright is more specific than the theme's own, so it wins.
  const namedColour = tokens.find((token) => NAMED_COLOURS[token]);

  return {
    theme: best.theme,
    matched: best.matched,
    runnerUp: scored[1]?.score ? scored[1].theme : null,
    spec: {
      ...best.theme.spec,
      ...(namedColour ? { color: NAMED_COLOURS[namedColour] } : {})
    },
    overrodeColour: namedColour ?? null
  };
}
