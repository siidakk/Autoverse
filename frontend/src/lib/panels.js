// Works out which panel a piece of damage sits on, from where it falls inside
// the car.
//
// The classifier says what the damage is and roughly where. It does not say
// which panel, because "panel" is not a thing it was taught -- so this reads it
// off the geometry: a finding two thirds of the way down and near one end of
// the car is on a bumper, one high in the middle is on the roof, and so on.
//
// The one thing this genuinely cannot know is which way the car is facing.
// Nothing in the pipeline detects orientation, so a bonnet and a boot lid are
// the same region seen from opposite ends, as are a front wing and a rear
// quarter. Rather than pick one at random and state it, each ambiguous region
// resolves to the commoner and cheaper of the pair and is flagged `unsure`, so
// the page can say which calls are worth a second look. Guessing quietly and
// being wrong about a quarter panel is a sixty percent error in the bill.

// Where each panel lives, as a fraction of the car's own bounding box.
// `ends` means the region is at either end of the car rather than the middle.
const REGIONS = [
  { panel: "roof", top: 0.0, bottom: 0.3, ends: false, unsure: false },
  { panel: "bonnet", top: 0.15, bottom: 0.55, ends: true, unsure: true, pairedWith: "boot" },
  { panel: "door", top: 0.3, bottom: 0.75, ends: false, unsure: false },
  { panel: "fender", top: 0.45, bottom: 0.8, ends: true, unsure: true, pairedWith: "quarter" },
  { panel: "bumper", top: 0.72, bottom: 1.0, ends: true, unsure: false }
];

// A finding within this much of the left or right edge counts as being at an
// end of the car rather than along its side.
const END_SHARE = 0.28;

// Some damage names its own panel better than any coordinate can. A shattered
// window is glass wherever it appears in the box, and a flat tyre is not
// bodywork at all.
const PANEL_BY_DAMAGE = {
  // Lamps sit at bumper height at both ends, and the bumper is what actually
  // gets replaced alongside them.
  lamp_broken: { panel: "bumper", unsure: false },
  // Not a panel. The page drops these rather than costing them as paint.
  tire_flat: { panel: null, unsure: false }
};

/**
 * The panel a finding most likely sits on.
 *
 * @param finding  {x, y, width, height, label} in image pixels
 * @param carBox   [left, top, width, height] of the detected car, or null if
 *                 no car was found, in which case the photo itself is the frame
 * @param imageSize {width, height}
 */
export function panelFor(finding, carBox, imageSize) {
  const known = PANEL_BY_DAMAGE[finding.label];
  if (known) return known;

  const [left, top, width, height] = carBox?.length
    ? carBox
    : [0, 0, imageSize.width, imageSize.height];

  // The middle of the finding, as a fraction of the car.
  const acrossCar = (finding.x + finding.width / 2 - left) / Math.max(width, 1);
  const downCar = (finding.y + finding.height / 2 - top) / Math.max(height, 1);

  // Outside the car entirely: the sliding window found something on the
  // pavement. Say so rather than pinning it to a panel.
  if (acrossCar < -0.1 || acrossCar > 1.1 || downCar < -0.1 || downCar > 1.1) {
    return { panel: null, unsure: true };
  }

  const atEnd = acrossCar < END_SHARE || acrossCar > 1 - END_SHARE;

  // Glass is not in the cost table, so a shattered window is charged as the
  // panel it is set into: the windscreen against the roof rail, a side window
  // against the door.
  if (finding.label === "glass_shatter") {
    return { panel: downCar < 0.35 ? "roof" : "door", unsure: true };
  }

  const match = REGIONS.find(
    (region) => downCar >= region.top && downCar < region.bottom && region.ends === atEnd
  );

  // Nothing matched because the bands for ends and middles do not tile the
  // whole box. A door is the safe answer: it is the middle of the car, the
  // commonest thing to damage, and its cost factor sits in the middle too.
  if (!match) return { panel: "door", unsure: true };

  return { panel: match.panel, unsure: match.unsure, pairedWith: match.pairedWith };
}

// What the panel would be if the car were facing the other way. Used only to
// tell somebody what the alternative is, never to change the answer.
export const OPPOSITE_END = {
  bonnet: "boot",
  boot: "bonnet",
  fender: "quarter",
  quarter: "fender"
};

// The classifier's class names against the cost table's. They were written for
// different jobs -- one describes a photograph, the other a line on an invoice
// -- and a mismatch here costs nothing loudly: an unknown type prices at zero.
const TYPE_FROM_CLASS = {
  scratch: "scratch",
  dent: "dent",
  crack: "crack",
  glass_shatter: "glass",
  lamp_broken: "lamp",
  // Neither of these is bodywork, and neither belongs on a paint and panel
  // bill. A flat tyre is not a repair this page costs, and undamaged is the
  // classifier saying there is nothing here.
  tire_flat: null,
  undamaged: null
};

/**
 * Turns a set of scan findings into the repair line items the costing wants.
 *
 * Severity is deliberately not inferred. The classifier answers "what is
 * this", and says nothing about how deep it goes -- train_damage.py is explicit
 * about that -- so every line starts at moderate and waits to be confirmed.
 * Guessing at severity would swing the bill by a factor of four.
 */
export function itemsFromScan(findings, carBox, imageSize) {
  const items = [];
  const seen = new Set();

  for (const finding of findings) {
    const type = TYPE_FROM_CLASS[finding.label];
    if (!type) continue;

    const { panel, unsure } = panelFor(finding, carBox, imageSize);
    if (!panel) continue;

    // The sliding window finds the same scratch three times over. One line per
    // panel and damage type is what somebody would actually write on a bill.
    const key = `${type}-${panel}`;
    if (seen.has(key)) continue;
    seen.add(key);

    items.push({
      type,
      severity: "moderate",
      panel,
      // Carried so the page can mark which lines it is less sure about.
      detected: true,
      unsure,
      confidence: finding.confidence
    });
  }

  return items;
}
