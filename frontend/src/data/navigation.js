// What the site is made of, and what each part is called.
//
// The old names described the machinery rather than the job: "Configurator",
// "AI Match", "From a photo". Someone landing here has a question -- what would
// mine look like lowered, what is my car worth, what will this dent cost -- and
// the menu should answer in those words.
//
// Each entry carries a one line explanation as well as a label. Short labels
// keep the bar uncluttered; the explanation appears under it on mobile and on
// the home page, so nothing depends on guessing what a word means.

export const SECTIONS = [
  {
    to: "/customise",
    label: "Customise",
    blurb: "Build your car in 3D and price every part",
    kicker: "Paint, wheels, stance, exhaust, lights",
    // Kept out of the top bar's redirect list; see LEGACY below.
    was: "/configure"
  },
  {
    to: "/discover",
    label: "Discover",
    blurb: "Find the right car for your budget",
    kicker: "Every car on sale in India, matched on what you need",
    was: "/recommend"
  },
  {
    to: "/value",
    label: "Value",
    blurb: "What a used car is actually worth",
    kicker: "Trained on age, mileage, fuel and power"
  },
  {
    to: "/identify",
    label: "Identify",
    blurb: "Recognise a car and its paint from a photo",
    kicker: "Runs on your device, nothing is uploaded",
    was: "/detect"
  },
  {
    to: "/repair",
    label: "Repair",
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
