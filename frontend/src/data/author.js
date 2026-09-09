// Who built this.
//
// Everything the "Built by" section shows lives here, so changing a link never
// means going into a component. Any link left as an empty string is simply not
// rendered -- a dead button on a portfolio page is worse than no button, and a
// placeholder URL that ships is worse than both.

export const AUTHOR = {
  // Shown large, in the gradient. This is the name a recruiter reads first.
  name: "Sidak Arora",

  role: "Fourth-year Computer Science (AI & ML) at VIT Vellore",

  // A photograph if there is one, initials if there is not. Put the file in
  // frontend/public and name it here, e.g. "/sidak.jpg" -- a path rather than a
  // remote URL, because a hotlinked profile picture breaks the day the host
  // rotates it, and takes the face out of the page with it.
  photo: "/sidak.jpg",

  // First person. The rest of this site is careful about what it claims; this
  // should be too.
  blurb:
    "I built AutoVerse on my own — the 3D configurator, the models behind it, " +
    "the API and this site. It started with a question about my own car: what " +
    "would it look like lowered, on different wheels? Every answer here is " +
    "measured rather than imagined, because the plausible ones were always wrong.",

  // What was actually done, in the terms an interviewer asks about.
  did: [
    "Fitted every part by measuring the 3D model itself, not by what a modeller named it",
    "Trained four models that shipped and two that did not — the failures are written up, not hidden",
    "Ran the vision models in the browser, so a photo of your car never leaves your phone",
    "Catalogued 186 cars on sale in India, from ₹4.7 lakh to ₹11 crore"
  ],

  // Work that is not this project. Two lines each at most: a signpost to the
  // portfolio, not a second copy of the CV.
  elsewhere: [
    {
      org: "IBS Software",
      role: "Software Developer Intern",
      when: "2026",
      note:
        "Automation for the iFly Loyalty platform — a Java framework validating " +
        "the whole non-air billing workflow across REST APIs, Selenium, " +
        "PostgreSQL, ETL jobs and PDF invoices."
    },
    {
      org: "CormSquare",
      role: "Software Developer Intern",
      when: "2025",
      note:
        "A full-stack asset management and e-commerce application in ASP.NET " +
        "Core with role-based access, Stripe payments and a three-phase admin " +
        "order system, shipped through GitHub Actions to Azure."
    }
  ],

  // Empty string = the button does not appear. Full URLs, including https://.
  links: {
    linkedin: "https://www.linkedin.com/in/sidakarora",
    github: "https://github.com/siidakk",
    portfolio: "https://sidak-portfolio-gilt.vercel.app/",
    // Plain address, no mailto: -- the component adds it.
    email: "sidakarora2727@gmail.com"
  }
};

/** True once there is a name to show, so the section can stay hidden until then. */
export const hasAuthor = () => Boolean(AUTHOR.name.trim());
