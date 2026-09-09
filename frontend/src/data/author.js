// Who built this.
//
// Everything the "Built by" section shows lives here, so changing a link never
// means going into a component. Any link left as an empty string is simply not
// rendered -- a dead button on a portfolio page is worse than no button, and a
// placeholder URL that ships is worse than both.

export const AUTHOR = {
  // Shown large, in the gradient. This is the name a recruiter reads first.
  name: "",

  // One line under it. What you are, not what you did here.
  role: "Full-stack developer · 3D and machine learning on the web",

  // Two or three sentences, first person. The rest of this site is careful
  // about what it claims; this should be too.
  blurb:
    "I built AutoVerse on my own — the 3D configurator, the five machine " +
    "learning models behind it, the API, and the site you are reading. It " +
    "started with one question about my own car, and the whole thing is an " +
    "argument that a measured answer beats a plausible one.",

  // What you actually did, in the terms an interviewer would ask about. Keep
  // these true and specific; vague ones read as filler.
  did: [
    "Fitted every part by measuring the 3D model itself, not by name",
    "Trained and shipped five models — damage, body style, valuation, matching",
    "Ran the vision models in the browser, so no photo is ever uploaded",
    "Catalogued 186 cars on sale in India, from ₹3 lakh to ₹11 crore"
  ],

  // Empty string = the button does not appear. Full URLs, including https://.
  links: {
    linkedin: "",
    github: "",
    portfolio: "",
    // Plain address, no mailto: -- the component adds it.
    email: ""
  }
};

/** True once there is a name to show, so the section can stay hidden until then. */
export const hasAuthor = () => Boolean(AUTHOR.name.trim());
