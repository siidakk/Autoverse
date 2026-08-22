// Builds the AutoVerse brochure deck.
//
//   node docs/build-deck.mjs
//
// The palette is the product's own: the near-black the site is built on, and
// the amber-into-pink gradient it uses for anything that matters. A deck about
// a dark, high contrast website should not arrive on white.

import pptxgen from "pptxgenjs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SHOTS = path.join(HERE, "screenshots");
const shot = (name) => path.join(SHOTS, `${name}.png`);

// --- palette ---
const INK = "06070F";      // page
const PANEL = "121729";    // raised surface
const EDGE = "2A3350";     // hairline
const CHALK = "EEF1F8";    // primary type
const FOG = "8B93AB";      // secondary type
const SIGNAL = "FF5E1A";   // brand
const FLARE = "FF2E63";    // brand, far end
const DATA = "3DDCFF";     // numbers only

const BODY = "Calibri";
const HEAD = "Calibri";

const pres = new pptxgen();
pres.layout = "LAYOUT_WIDE"; // 13.333 x 7.5
pres.author = "AutoVerse";
pres.title = "AutoVerse — every feature";

// pptxgenjs mutates option objects in place, so each of these is built fresh.
const softShadow = () => ({
  type: "outer",
  color: "000000",
  blur: 18,
  offset: 6,
  angle: 90,
  opacity: 0.55
});

const dark = (slide) => {
  slide.background = { color: INK };
};

// The motif: a filled circle carrying the section number, repeated on every
// feature slide so the deck reads as one thing.
function chip(slide, text, x, y) {
  slide.addShape(pres.ShapeType.ellipse, {
    x, y, w: 0.52, h: 0.52,
    fill: { color: SIGNAL },
    line: { color: SIGNAL }
  });
  slide.addText(text, {
    x, y, w: 0.52, h: 0.52,
    align: "center", valign: "middle",
    fontFace: BODY, fontSize: 13, bold: true, color: "FFFFFF", margin: 0
  });
}

function screen(slide, name, { x, y, w }) {
  slide.addImage({
    path: shot(name),
    x, y, w,
    h: w * (900 / 1440),
    rounding: false,
    shadow: softShadow()
  });
}

function phone(slide, name, { x, y, h }) {
  slide.addImage({
    path: shot(name),
    x, y, h,
    w: h * (390 / 844),
    shadow: softShadow()
  });
}

// A feature slide: number, title, one line of promise, a few points, a shot.
function feature(slide, {
  number, title, promise, points, image, imageSide = "right", note, tag
}) {
  dark(slide);

  // These four numbers have to be read together. The image is 6.6 wide, so an
  // image on the left runs 0.55 to 7.15 and the text must start after that;
  // an image on the right runs 6.05 to 12.65 and the text must end before it.
  const textX = imageSide === "right" ? 0.62 : 7.45;
  const imageX = imageSide === "right" ? 6.05 : 0.55;
  const textW = imageSide === "right" ? 5.15 : 5.25;

  chip(slide, number, textX, 0.62);

  if (tag) {
    slide.addText(tag.toUpperCase(), {
      x: textX + 0.72, y: 0.62, w: textW - 0.72, h: 0.52,
      fontFace: BODY, fontSize: 10.5, bold: true, color: FOG,
      charSpacing: 2, valign: "middle", margin: 0
    });
  }

  slide.addText(title, {
    x: textX, y: 1.32, w: textW, h: 0.9,
    fontFace: HEAD, fontSize: 33, bold: true, color: CHALK, margin: 0
  });

  slide.addText(promise, {
    x: textX, y: 2.2, w: textW, h: 0.8,
    fontFace: BODY, fontSize: 15, color: SIGNAL, margin: 0, lineSpacingMultiple: 1.15
  });

  slide.addText(
    points.map((line, i) => ({
      text: line,
      options: { bullet: true, breakLine: i < points.length - 1 }
    })),
    {
      x: textX, y: 3.1, w: textW, h: 3.4,
      fontFace: BODY, fontSize: 13.5, color: CHALK,
      lineSpacingMultiple: 1.2, paraSpaceAfter: 9, margin: 0
    }
  );

  screen(slide, image, { x: imageX, y: 1.62, w: 6.6 });

  if (note) slide.addNotes(note);
}

// ============================================================ 01 cover
{
  const s = pres.addSlide();
  dark(s);

  // A purpose-taken shot with the whole interface stripped out. Cropping the
  // landing page instead left fragments of the site's own headline behind the
  // slide's headline, and the two fought.
  s.addImage({
    path: shot("cover-car"),
    x: 5.95, y: 1.35, w: 7.1, h: 7.1 * (1000 / 1600),
    shadow: softShadow()
  });

  s.addText("AUTOVERSE", {
    x: 0.85, y: 1.5, w: 6, h: 0.5,
    fontFace: BODY, fontSize: 15, bold: true, color: SIGNAL, charSpacing: 5, margin: 0
  });

  s.addText("See your car before\nyou change a thing.", {
    x: 0.85, y: 2.15, w: 6.3, h: 2.1,
    fontFace: HEAD, fontSize: 42, bold: true, color: CHALK,
    lineSpacingMultiple: 0.95, margin: 0
  });

  s.addText(
    "A 3D car configurator where every part is fitted by measuring the car, " +
    "wired to five machine learning features that each answer a question an " +
    "owner actually has.",
    {
      x: 0.85, y: 4.5, w: 4.85, h: 1.5,
      fontFace: BODY, fontSize: 15, color: FOG, lineSpacingMultiple: 1.25, margin: 0
    }
  );

  s.addText("autoverse-two.vercel.app", {
    x: 0.85, y: 6.15, w: 5, h: 0.4,
    fontFace: BODY, fontSize: 12.5, color: DATA, margin: 0
  });

  s.addNotes(
    "AutoVerse is a 3D car configurator plus five machine learning features. " +
    "The promise in one line: see your own car modified, faithfully, before " +
    "you spend anything."
  );
}

// ============================================================ 02 why
{
  const s = pres.addSlide();
  dark(s);

  s.addText("Why it exists", {
    x: 0.72, y: 0.66, w: 6, h: 0.5,
    fontFace: BODY, fontSize: 11, bold: true, color: FOG, charSpacing: 2.5, margin: 0
  });

  s.addText("Plausible is not the same as true.", {
    x: 0.72, y: 1.15, w: 5.6, h: 1.6,
    fontFace: HEAD, fontSize: 34, bold: true, color: CHALK,
    lineSpacingMultiple: 0.98, margin: 0
  });

  s.addText(
    [
      { text: "It started with one car and one question: what would it look like lowered, on different wheels? The obvious answer was to photograph it and ask an image model.", options: { breakLine: true } },
      { text: "", options: { breakLine: true, fontSize: 6 } },
      { text: "What came back was always convincing and never right. The proportions drifted. The wheels sat where wheels usually sit, not where they sit on that car. It was a picture of a car like mine.", options: { breakLine: true, color: CHALK } },
      { text: "", options: { breakLine: true, fontSize: 6 } },
      { text: "So everything here is measured rather than imagined.", options: { bold: true, color: SIGNAL } }
    ],
    {
      x: 0.72, y: 3.0, w: 5.5, h: 3.2,
      fontFace: BODY, fontSize: 14, color: FOG, lineSpacingMultiple: 1.3, margin: 0
    }
  );

  const proofs = [
    ["Wheels found by geometry", "130 of 612 materials in the models are literally named “material”. Names cannot be trusted, so nothing depends on them."],
    ["Exhausts placed on the valance", "Measured per car, so a tip tucks under a Corvette and a Hilux without either being special-cased."],
    ["Paint kept off the lamps", "The lamps are found first, then everything else takes colour."],
    ["A scan that admits doubt", "Below a measured confidence floor the damage model says nothing rather than guessing."]
  ];

  proofs.forEach(([title, body], i) => {
    const y = 0.95 + i * 1.55;
    s.addShape(pres.ShapeType.roundRect, {
      x: 6.85, y, w: 5.75, h: 1.32,
      rectRadius: 0.09,
      fill: { color: PANEL },
      line: { color: EDGE, width: 1 }
    });
    s.addText(title, {
      x: 7.12, y: y + 0.14, w: 5.2, h: 0.34,
      fontFace: BODY, fontSize: 14, bold: true, color: CHALK, margin: 0
    });
    s.addText(body, {
      x: 7.12, y: y + 0.5, w: 5.25, h: 0.75,
      fontFace: BODY, fontSize: 11, color: FOG, lineSpacingMultiple: 1.15, margin: 0
    });
  });

  s.addNotes(
    "This is the thesis slide. The failure of AI photo editing is the reason " +
    "the project exists, and every engineering decision follows from it."
  );
}

// ============================================================ 03 the map
{
  const s = pres.addSlide();
  dark(s);

  s.addText("What is in it", {
    x: 0.72, y: 0.6, w: 8, h: 0.5,
    fontFace: BODY, fontSize: 11, bold: true, color: FOG, charSpacing: 2.5, margin: 0
  });

  s.addText("Six places to go, each answering a real question", {
    x: 0.72, y: 1.05, w: 9, h: 0.7,
    fontFace: HEAD, fontSize: 30, bold: true, color: CHALK, margin: 0
  });

  const sections = [
    ["01", "Customise", "Build it in 3D", "Paint, wheels, stance, exhaust, lights — priced in ₹"],
    ["02", "Discover", "Find the right car", "166 Indian models, matched on what you need"],
    ["03", "Value", "What it is worth", "Gradient boosted trees, R² 0.947"],
    ["04", "Identify", "What car is that", "Recognised from a photo, on your device"],
    ["05", "Repair", "What will it cost", "Damage named by a trained model, then costed"],
    ["06", "Garage", "Everything you saved", "Builds, wishlist, recently viewed"]
  ];

  sections.forEach(([n, name, promise, detail], i) => {
    const col = i % 3;
    const row = Math.floor(i / 3);
    const x = 0.72 + col * 4.15;
    const y = 2.1 + row * 2.5;

    s.addShape(pres.ShapeType.roundRect, {
      x, y, w: 3.85, h: 2.2,
      rectRadius: 0.1,
      fill: { color: PANEL },
      line: { color: EDGE, width: 1 }
    });

    chip(s, n, x + 0.28, y + 0.26);

    s.addText(name, {
      x: x + 0.95, y: y + 0.28, w: 2.7, h: 0.45,
      fontFace: HEAD, fontSize: 19, bold: true, color: CHALK, valign: "middle", margin: 0
    });
    s.addText(promise, {
      x: x + 0.28, y: y + 0.95, w: 3.3, h: 0.35,
      fontFace: BODY, fontSize: 13, bold: true, color: SIGNAL, margin: 0
    });
    s.addText(detail, {
      x: x + 0.28, y: y + 1.32, w: 3.3, h: 0.72,
      fontFace: BODY, fontSize: 11, color: FOG, lineSpacingMultiple: 1.15, margin: 0
    });
  });

  s.addNotes("The menu was renamed so each item says what it does rather than how it works.");
}

// ============================================================ 04 landing
{
  const s = pres.addSlide();
  feature(s, {
    number: "✦",
    tag: "The landing page",
    title: "A real car, turning",
    promise: "Not a render. The same 3D engine the configurator uses.",
    points: [
      "Fifteen cars cycle through the hero, each one loaded and measured live",
      "Click any name to bring that car forward",
      "The next model downloads while the current one is still on screen, so the swap never stalls",
      "Everything below scrolls in on reveal, and honours a reduced-motion preference"
    ],
    image: "01-home-hero",
    note: "The hero is the product demonstrating itself rather than a picture of it."
  });
}

// ============================================================ 05 configurator
{
  const s = pres.addSlide();
  feature(s, {
    number: "01",
    tag: "Customise",
    title: "The configurator",
    promise: "Fifteen cars, six panels of controls, every part priced.",
    points: [
      "Parts are fitted by measuring each model, not by trusting mesh names",
      "Five rooms to stand the car in: studio, city, sunset, night, warehouse",
      "Four camera presets, plus free orbit, zoom and pan",
      "A running total in rupees, and a count of what you have changed",
      "Hold to compare snaps back to factory so you can see the difference"
    ],
    image: "05-configurator",
    imageSide: "left",
    note: "The centrepiece. Left: the garage. Middle: the car. Right: the controls."
  });
}

// ============================================================ 06 paint
{
  const s = pres.addSlide();
  feature(s, {
    number: "02",
    tag: "Customise / Paint",
    title: "Paint that behaves",
    promise: "Colour, finish, and a surface you can calibrate.",
    points: [
      "Nine colour families plus a full custom picker",
      "Matte, gloss and metallic, each changing how light actually lands",
      "Metalness, roughness and clearcoat exposed for anyone who wants them",
      "Headlights, tail lights, chrome and glass keep their factory look — they are found by measurement first, then left alone"
    ],
    image: "06-configurator-paint",
    note: "Painting the lamps was the original giveaway that a configurator is fake. The lamps are detected geometrically and excluded."
  });
}

// ============================================================ 07 wheels
{
  const s = pres.addSlide();
  feature(s, {
    number: "03",
    tag: "Customise / Wheels",
    title: "Wheels, stance, calipers",
    promise: "Found by geometry, so they drop into the right arches.",
    points: [
      "Sport and classic designs, built from the dimensions measured on that car",
      "Plus-sizing trades sidewall for rim, exactly as fitting bigger alloys does",
      "Ride height is a fraction of how far that body can drop before it meets the road",
      "Brake calipers in five finishes — the one modification visible through the spokes"
    ],
    image: "07-configurator-wheels",
    imageSide: "left",
    note: "Wheel detection is the heart of the project: mirrored pairs, wheelbase checks, centre one radius above the ground."
  });
}

// ============================================================ 08 body
{
  const s = pres.addSlide();
  feature(s, {
    number: "04",
    tag: "Customise / Body",
    title: "Spoiler, exhaust, wrap",
    promise: "Placed against the car, not at a guessed offset.",
    points: [
      "A spoiler is raycast onto the boot lid, so it lands on the panel",
      "Exhaust tips sit under the measured rear valance and inboard of its corners",
      "Twin, quad, centre and carbon layouts, sized as a fraction of the car",
      "Wraps are injected into the shader, so they work on models with no UV map"
    ],
    image: "08-configurator-body",
    note: "The exhaust used to hang in the air behind the bumper. It is now measured against the valance on every car."
  });
}

// ============================================================ 09 extras
{
  const s = pres.addSlide();
  feature(s, {
    number: "05",
    tag: "Customise / Extras",
    title: "Lights, glow, tint, decals",
    promise: "A beam through the nose, because every lamp is a different size.",
    points: [
      "Halogen, xenon and laser, thrown as real light down the road rather than drawn as a lamp",
      "Underglow in five colours, staying with the road when the body is lowered",
      "Window tint from clear to 5%, judged against how the glass arrived",
      "Decals placed by clicking the car; they travel with the panel they landed on"
    ],
    image: "09-configurator-extras",
    imageSide: "left",
    note: "Headlight units differ wildly between models, so what is drawn is the beam, which reads correctly on all of them."
  });
}

// ============================================================ 10 assistant + voice
{
  const s = pres.addSlide();
  feature(s, {
    number: "06",
    tag: "Customise / Assist",
    title: "Describe it, or say it",
    promise: "Thirteen settings move from a handful of words.",
    points: [
      "Seven themes: cyberpunk, luxury, track, murdered out, off-road, sleeper, sunset",
      "It shows which words it matched on, and what came second",
      "A colour named outright wins over the theme — “red track car” is a track build, in red",
      "Speak it instead: the same matcher with the keyboard removed",
      "Deliberately not a language model — instant, offline, free, and it can show its working"
    ],
    image: "05-configurator",
    note: "Worth saying plainly in an interview: this is keyword scoring, chosen over an LLM for reasons that hold up."
  });
}

// ============================================================ 11 share / AR / multiplayer
{
  const s = pres.addSlide();
  feature(s, {
    number: "07",
    tag: "Customise / Share",
    title: "On your driveway, or with a friend",
    promise: "The build leaves the screen.",
    points: [
      "AR stands the car in front of you at 4.6 m — its real length",
      "Android uses WebXR; iOS exports the car to USDZ and opens Apple’s viewer",
      "Both are handed the same clone, so wheels, stance and paint all come",
      "On a laptop it offers a QR code, because the whole build travels in the link",
      "Or open a room: send the link and either of you changing anything moves it for both"
    ],
    image: "10-configurator-share",
    imageSide: "left",
    note: "AR is the one feature tested against the real world — if the proportions were wrong you would see it against a real doorway."
  });
}

// ============================================================ 12 sound
{
  const s = pres.addSlide();
  dark(s);

  s.addText("Customise / Sound".toUpperCase(), {
    x: 0.72, y: 0.62, w: 6, h: 0.4,
    fontFace: BODY, fontSize: 10.5, bold: true, color: FOG, charSpacing: 2, margin: 0
  });

  s.addText("Every car has its own engine", {
    x: 0.72, y: 1.05, w: 8.4, h: 0.75,
    fontFace: HEAD, fontSize: 32, bold: true, color: CHALK, margin: 0
  });

  s.addText(
    "The rev button does not play a recording. Firing frequency is rpm × half the " +
    "cylinder count, so the note comes out of the specification itself.",
    {
      x: 0.72, y: 1.9, w: 8.6, h: 0.75,
      fontFace: BODY, fontSize: 14.5, color: SIGNAL, lineSpacingMultiple: 1.2, margin: 0
    }
  );

  s.addShape(pres.ShapeType.roundRect, {
    x: 0.72, y: 2.95, w: 11.9, h: 1.5,
    rectRadius: 0.1,
    fill: { color: PANEL },
    line: { color: EDGE, width: 1 }
  });

  s.addText("At 3000 rpm", {
    x: 1.0, y: 3.12, w: 3, h: 0.3,
    fontFace: BODY, fontSize: 11, color: FOG, margin: 0
  });

  const notes = [
    ["V12", "300 Hz"], ["V10", "250"], ["V8", "200"], ["Straight six", "150"], ["Four", "100"]
  ];
  notes.forEach(([label, hz], i) => {
    const x = 1.0 + i * 2.3;
    s.addText(hz, {
      x, y: 3.45, w: 2.1, h: 0.5,
      fontFace: BODY, fontSize: 25, bold: true, color: DATA, margin: 0
    });
    s.addText(label, {
      x, y: 3.95, w: 2.1, h: 0.3,
      fontFace: BODY, fontSize: 11.5, color: FOG, margin: 0
    });
  });

  const cards = [
    ["Layout changes the character", "A cross-plane V8 fires unevenly across its banks. That half-order content is exactly why a Corvette burbles where an M4’s straight six is hard and smooth."],
    ["Forced induction is modelled", "A turbo spools behind the revs and releases on lift. A supercharger is belt driven, so its whine tracks rpm exactly."],
    ["The rotary breaks the rule", "A 13B has no cylinders — two chambers, order 2, nine thousand rpm. It is the one engine the cylinder rule does not describe."]
  ];

  cards.forEach(([title, body], i) => {
    const x = 0.72 + i * 4.07;
    s.addShape(pres.ShapeType.roundRect, {
      x, y: 4.75, w: 3.78, h: 2.1,
      rectRadius: 0.1,
      fill: { color: PANEL },
      line: { color: EDGE, width: 1 }
    });
    s.addText(title, {
      x: x + 0.26, y: 4.95, w: 3.3, h: 0.6,
      fontFace: BODY, fontSize: 13, bold: true, color: CHALK, lineSpacingMultiple: 1.1, margin: 0
    });
    s.addText(body, {
      x: x + 0.26, y: 5.6, w: 3.3, h: 1.1,
      fontFace: BODY, fontSize: 10.5, color: FOG, lineSpacingMultiple: 1.15, margin: 0
    });
  });

  s.addNotes(
    "A V12 sits an octave above a straight six because it fires twice as often. " +
    "That is arithmetic, not a sample library."
  );
}

// ============================================================ 13 discover
{
  const s = pres.addSlide();
  feature(s, {
    number: "02",
    tag: "Discover",
    title: "Find the right car",
    promise: "166 Indian models, matched on what you actually need.",
    points: [
      "Content-based filtering: hard filters first, then weighted distance",
      "Budget, body style, fuel, transmission, seats and use",
      "Every result explains why it matched, rather than appearing as a score",
      "Each comes with accessory suggestions suited to that segment",
      "Trained on Indian listings, priced in rupees throughout"
    ],
    image: "11-discover",
    note: "Rebuilt from naive score-matching to content-based filtering on an Indian dataset."
  });
}

// ============================================================ 14 value
{
  const s = pres.addSlide();
  feature(s, {
    number: "03",
    tag: "Value",
    title: "What a used car is worth",
    promise: "R² 0.947, and it shows you its range rather than one number.",
    points: [
      "Gradient boosted trees, chosen by comparison against ridge and random forest",
      "Age, kilometres, power, engine, mileage, seats, fuel and transmission",
      "Two quantile models give a confidence band, measured at 70.9% coverage",
      "Typically 13.7% out — stated, rather than hidden behind a single figure",
      "Depreciation charted over the years ahead"
    ],
    image: "12-value",
    imageSide: "left",
    note: "Showing the interval matters: a valuation with no range is a guess wearing a suit."
  });
}

// ============================================================ 15 identify
{
  const s = pres.addSlide();
  feature(s, {
    number: "04",
    tag: "Identify",
    title: "What car is that",
    promise: "Recognised from a photo, without the photo leaving your phone.",
    points: [
      "SSD-MobileNetV2 running in the browser through TensorFlow.js",
      "Finds the car, then reads its paint colour from the bodywork",
      "Colour is measured by chromaticity, so shade and sunlight do not fool it",
      "Matches it against the garage and offers to open that car, in that colour",
      "Nothing is uploaded — the model comes to the picture"
    ],
    image: "13-identify",
    note: "Running vision client-side is a privacy decision and a hosting-cost decision at once."
  });
}

// ============================================================ 16 repair
{
  const s = pres.addSlide();
  feature(s, {
    number: "05",
    tag: "Repair",
    title: "What the damage will cost",
    promise: "83.0% on 2,026 photographs it had never seen.",
    points: [
      "MobileNetV2 with a trained head, slid across the photo to find where",
      "Six damage types: dent, scratch, crack, glass shatter, lamp broken, flat tyre",
      "Trained on damage regions, plus undamaged panels, so it can say “nothing here”",
      "Below a measured confidence floor it stays quiet instead of guessing",
      "Then costs the repair by segment and shows what it does to resale"
    ],
    image: "14-repair",
    imageSide: "left",
    note: "The hand-written scan this replaced flagged the grille on a clean car. It had no concept of an intact panel; this one does, at 86.5%."
  });
}

// ============================================================ 17 accounts
{
  const s = pres.addSlide();
  feature(s, {
    number: "06",
    tag: "Garage",
    title: "Saved, and shareable",
    promise: "An account gathers your builds. It never gates them.",
    points: [
      "Builds save without signing in, and a share code still reopens one",
      "Signed in, they gather in a garage alongside a wishlist and recently viewed",
      "Passwords are bcrypt hashed and excluded from every query by default",
      "An unknown email returns the identical message to a wrong password, so the site cannot be used to discover who has an account",
      "24 checks cover it, including every security rule above"
    ],
    image: "15-account",
    note: "Signing in is additive. Nothing that worked before an account now demands one."
  });
}

// ============================================================ 18 mobile
{
  const s = pres.addSlide();
  dark(s);

  s.addText("ON A PHONE", {
    x: 0.72, y: 0.66, w: 6, h: 0.4,
    fontFace: BODY, fontSize: 10.5, bold: true, color: FOG, charSpacing: 2, margin: 0
  });

  s.addText("The same thing, not a cut-down one", {
    x: 0.72, y: 1.08, w: 5.15, h: 1.5,
    fontFace: HEAD, fontSize: 30, bold: true, color: CHALK,
    lineSpacingMultiple: 1.0, margin: 0
  });

  s.addText(
    [
      { text: "The configurator, the 3D, the vision models and AR all run on a phone. AR is the one feature that is better there.", options: { breakLine: true } },
      { text: "", options: { breakLine: true, fontSize: 8 } },
      { text: "Every menu item carries its explanation in the drawer, because a one-word label is least likely to be understood on a small screen.", options: {} }
    ],
    {
      x: 0.72, y: 2.85, w: 5.0, h: 2.4,
      fontFace: BODY, fontSize: 14, color: FOG, lineSpacingMultiple: 1.3, margin: 0
    }
  );

  phone(s, "16-home-mobile", { x: 6.2, y: 1.42, h: 4.6 });
  phone(s, "18-menu-mobile", { x: 8.55, y: 1.42, h: 4.6 });
  phone(s, "17-configurator-mobile", { x: 10.9, y: 1.42, h: 4.6 });

  s.addNotes("Verified at 375 px: no horizontal overflow anywhere, and the drawer locks the page behind it.");
}

// ============================================================ 19 numbers
{
  const s = pres.addSlide();
  dark(s);

  s.addText("MEASURED, NOT CLAIMED", {
    x: 0.72, y: 0.62, w: 8, h: 0.4,
    fontFace: BODY, fontSize: 10.5, bold: true, color: FOG, charSpacing: 2, margin: 0
  });

  s.addText("The machine learning, with its real numbers", {
    x: 0.72, y: 1.02, w: 11, h: 0.7,
    fontFace: HEAD, fontSize: 30, bold: true, color: CHALK, margin: 0
  });

  const stats = [
    ["0.947", "R² on valuation", "with a measured 70.9% interval coverage"],
    ["83.0%", "damage accuracy", "over 2,026 held-out crops"],
    ["166", "models matched", "Indian market, real prices"],
    ["0", "photos uploaded", "every vision model runs on your device"]
  ];

  stats.forEach(([big, label, detail], i) => {
    const x = 0.72 + i * 3.05;
    s.addText(big, {
      x, y: 2.1, w: 2.9, h: 1.0,
      fontFace: HEAD, fontSize: 44, bold: true, color: i === 3 ? SIGNAL : DATA, margin: 0
    });
    s.addText(label, {
      x, y: 3.1, w: 2.85, h: 0.35,
      fontFace: BODY, fontSize: 14, bold: true, color: CHALK, margin: 0
    });
    s.addText(detail, {
      x, y: 3.48, w: 2.85, h: 0.7,
      fontFace: BODY, fontSize: 11, color: FOG, lineSpacingMultiple: 1.15, margin: 0
    });
  });

  s.addShape(pres.ShapeType.roundRect, {
    x: 0.72, y: 4.5, w: 11.9, h: 2.35,
    rectRadius: 0.1,
    fill: { color: PANEL },
    line: { color: EDGE, width: 1 }
  });

  s.addText("Damage model, per class — recall on photographs it never trained on", {
    x: 1.0, y: 4.72, w: 11, h: 0.32,
    fontFace: BODY, fontSize: 12, bold: true, color: CHALK, margin: 0
  });

  const perClass = [
    ["Flat tyre", "97.8%"], ["Glass shatter", "96.8%"], ["Undamaged", "86.5%"],
    ["Lamp broken", "85.9%"], ["Scratch", "84.1%"], ["Dent", "71.6%"], ["Crack", "64.6%"]
  ];

  perClass.forEach(([label, value], i) => {
    const x = 1.0 + i * 1.63;
    s.addText(value, {
      x, y: 5.2, w: 1.55, h: 0.42,
      fontFace: BODY, fontSize: 17, bold: true,
      color: i === 2 ? SIGNAL : CHALK, margin: 0
    });
    s.addText(label, {
      x, y: 5.62, w: 1.55, h: 0.3,
      fontFace: BODY, fontSize: 10, color: FOG, margin: 0
    });
  });

  s.addText(
    "Undamaged is the number that matters. The hand-written scan this replaced had no " +
    "concept of an intact panel, which is why it flagged the grille on a clean car.",
    {
      x: 1.0, y: 6.05, w: 11.3, h: 0.6,
      fontFace: BODY, fontSize: 11.5, italic: true, color: FOG, lineSpacingMultiple: 1.15, margin: 0
    }
  );

  s.addNotes("Every figure here is from a held-out set, not from training.");
}

// ============================================================ 20 built with
{
  const s = pres.addSlide();
  dark(s);

  s.addText("HOW IT IS BUILT", {
    x: 0.72, y: 0.62, w: 8, h: 0.4,
    fontFace: BODY, fontSize: 10.5, bold: true, color: FOG, charSpacing: 2, margin: 0
  });

  s.addText("Four services, one repository", {
    x: 0.72, y: 1.02, w: 11, h: 0.7,
    fontFace: HEAD, fontSize: 30, bold: true, color: CHALK, margin: 0
  });

  const stack = [
    ["Frontend", "React 19, Vite, Tailwind 4", "three.js and react-three-fiber for the 3D, Framer Motion for everything that moves, TensorFlow.js for vision"],
    ["API", "Express, MongoDB", "Accounts, saved builds and share codes. WebSocket rooms for the shared garage"],
    ["ML service", "Flask, scikit-learn", "The recommender and the valuation, trained offline and served"],
    ["In the browser", "TensorFlow.js", "Car detection and damage classification, so no photograph is uploaded"]
  ];

  stack.forEach(([name, tech, detail], i) => {
    const x = 0.72 + (i % 2) * 6.1;
    const y = 2.05 + Math.floor(i / 2) * 2.35;

    s.addShape(pres.ShapeType.roundRect, {
      x, y, w: 5.8, h: 2.05,
      rectRadius: 0.1,
      fill: { color: PANEL },
      line: { color: EDGE, width: 1 }
    });

    s.addText(name, {
      x: x + 0.28, y: y + 0.2, w: 5.2, h: 0.35,
      fontFace: BODY, fontSize: 15, bold: true, color: CHALK, margin: 0
    });
    s.addText(tech, {
      x: x + 0.28, y: y + 0.58, w: 5.2, h: 0.32,
      fontFace: BODY, fontSize: 12, bold: true, color: SIGNAL, margin: 0
    });
    s.addText(detail, {
      x: x + 0.28, y: y + 0.95, w: 5.25, h: 0.95,
      fontFace: BODY, fontSize: 11, color: FOG, lineSpacingMultiple: 1.2, margin: 0
    });
  });

  s.addText(
    "The geometry lives in plain modules with no three.js import, so command-line checkers " +
    "run byte for byte the same code as the browser. That is how a placement bug is caught " +
    "across eighteen models instead of in one screenshot.",
    {
      x: 0.72, y: 6.7, w: 11.9, h: 0.6,
      fontFace: BODY, fontSize: 11.5, italic: true, color: FOG, lineSpacingMultiple: 1.15, margin: 0
    }
  );

  s.addNotes("Eleven roadmap phases, all complete. Around 90 automated checks across the suites.");
}

// ============================================================ 21 limits
{
  const s = pres.addSlide();
  dark(s);

  s.addText("SAID OUT LOUD", {
    x: 0.72, y: 0.62, w: 8, h: 0.4,
    fontFace: BODY, fontSize: 10.5, bold: true, color: FOG, charSpacing: 2, margin: 0
  });

  s.addText("What it does not do", {
    x: 0.72, y: 1.02, w: 11, h: 0.7,
    fontFace: HEAD, fontSize: 30, bold: true, color: CHALK, margin: 0
  });

  s.addText(
    "A project whose whole argument is fidelity does not get to be vague about its own limits.",
    {
      x: 0.72, y: 1.78, w: 11.5, h: 0.4,
      fontFace: BODY, fontSize: 14, color: SIGNAL, margin: 0
    }
  );

  const limits = [
    ["Damage is a classifier, not a detector", "It is slid across the photo, so the smallest thing it can point at is one window. It will not outline a scratch."],
    ["Voice recognition leaves the device", "Chrome does it on Google’s servers. Every other model here runs locally, and the panel says which is which."],
    ["One car’s lamps cannot be found", "The Porsche’s rear is a single piece 0.79 of the car’s height, so there is no separate lamp to leave unpainted."],
    ["The damage data is non-commercial", "CarDD is licensed for research and education. Fine for a portfolio; commercial use would need retraining."]
  ];

  limits.forEach(([title, body], i) => {
    const x = 0.72 + (i % 2) * 6.1;
    const y = 2.5 + Math.floor(i / 2) * 2.1;

    s.addShape(pres.ShapeType.roundRect, {
      x, y, w: 5.8, h: 1.8,
      rectRadius: 0.1,
      fill: { color: PANEL },
      line: { color: EDGE, width: 1 }
    });
    s.addText(title, {
      x: x + 0.28, y: y + 0.22, w: 5.25, h: 0.55,
      fontFace: BODY, fontSize: 14, bold: true, color: CHALK, lineSpacingMultiple: 1.1, margin: 0
    });
    s.addText(body, {
      x: x + 0.28, y: y + 0.82, w: 5.25, h: 0.85,
      fontFace: BODY, fontSize: 11, color: FOG, lineSpacingMultiple: 1.2, margin: 0
    });
  });

  s.addNotes("Stating the limits is the point, not an apology for it.");
}

// ============================================================ 22 close
{
  const s = pres.addSlide();
  dark(s);

  // The car, faded almost out. A page screenshot here put the site's own
  // closing headline behind this slide's closing headline -- the same
  // collision the cover had.
  s.addImage({
    path: shot("cover-car"),
    x: 0, y: 0, w: 13.333, h: 7.5,
    sizing: { type: "cover", w: 13.333, h: 7.5 },
    transparency: 82
  });

  s.addText("Pick a car. Change everything.", {
    x: 1.2, y: 2.5, w: 11, h: 0.9,
    fontFace: HEAD, fontSize: 40, bold: true, color: CHALK, align: "center", margin: 0
  });

  s.addText("See it properly.", {
    x: 1.2, y: 3.42, w: 11, h: 0.9,
    fontFace: HEAD, fontSize: 40, bold: true, color: SIGNAL, align: "center", margin: 0
  });

  s.addText("autoverse-two.vercel.app", {
    x: 1.2, y: 4.75, w: 11, h: 0.45,
    fontFace: BODY, fontSize: 15, color: DATA, align: "center", margin: 0
  });

  s.addText("Fifteen cars · five ML features · nothing to install", {
    x: 1.2, y: 5.25, w: 11, h: 0.4,
    fontFace: BODY, fontSize: 13, color: FOG, align: "center", margin: 0
  });

  s.addNotes("All eleven roadmap phases complete.");
}

const out = path.join(HERE, "AutoVerse-Brochure.pptx");
await pres.writeFile({ fileName: out });
console.log(`\n  Written ${out}\n`);
