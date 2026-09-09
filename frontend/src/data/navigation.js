// What the site is made of, and what each part is called.
//
// The old names described the machinery rather than the job: "Configurator",
// "AI Match", "From a photo". Someone landing here has a question -- what would
// mine look like lowered, what is my car worth, what will this dent cost -- and
// the menu should answer in those words.
//
// Each entry carries three lengths of the same thing, because the same section
// has to introduce itself in three different amounts of room:
//
//   label   the top bar, where one word is all that fits
//   short   the tiles on the first screen, naming the job in five words
//   blurb   the mobile menu and the cards, a full line
//   kicker  the cards, saying what is behind it
//
// A one word label is the least understandable form, so it never travels
// alone: everywhere there is space for more, more is shown.

export const SECTIONS = [
  {
    to: "/customise",
    label: "Customise",
    short: "Modify a car in 3D",
    blurb: "Build your car in 3D and price every part",
    kicker: "Paint, wheels, stance, exhaust, lights",
    // Kept out of the top bar's redirect list; see LEGACY below.
    was: "/configure"
  },
  {
    to: "/discover",
    label: "Discover",
    short: "Find a car to buy",
    blurb: "Find the right car for your budget",
    kicker: "Every car on sale in India, matched on what you need",
    was: "/recommend"
  },
  {
    to: "/value",
    label: "Value",
    short: "Price a used car",
    blurb: "What a used car is actually worth",
    kicker: "Trained on age, mileage, fuel and power"
  },
  {
    to: "/identify",
    label: "Identify",
    short: "Read a photo of a car",
    blurb: "Read a car's shape and paint from a photo",
    kicker: "Runs on your device, nothing is uploaded",
    was: "/detect"
  },
  {
    to: "/repair",
    label: "Repair",
    short: "Cost up damage",
    blurb: "Cost the damage and see what it does to resale",
    kicker: "Damage recognised by a trained model",
    was: "/damage"
  }
];

// Old addresses that still have to work. Share links carry a build code in the
// query string, so a redirect that drops the query would quietly break every
// build anyone has ever shared.
export const LEGACY = [
  { from: "/configure", to: "/customise" },
  { from: "/showroom", to: "/customise" },
  { from: "/recommend", to: "/discover" },
  { from: "/detect", to: "/identify" },
  { from: "/damage", to: "/repair" }
];
