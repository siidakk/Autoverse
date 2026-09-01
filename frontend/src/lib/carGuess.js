// Narrows a photograph down to a few cars it could be.
//
// Be clear about what this is. It is not badge recognition and it never will
// be: there is no public dataset of Indian cars labelled by make and model --
// the whole of Hugging Face has vehicle *type* sets and one CC-BY-NC-ND set of
// about a hundred images -- so nothing here can read "Baleno" off a photo of a
// Baleno, and any code claiming to would be lying.
//
// What can be read off a photograph is the body style, by a classifier trained
// for it, and roughly how big the car is in frame. Put those against a
// catalogue of a hundred and twenty cars actually on sale and the list of
// candidates gets short enough to be useful: a hatchback rules out three
// quarters of the catalogue on its own.
//
// So this ranks rather than decides, and the page presents the top of that
// ranking as a starting point somebody can correct in one click. The panel and
// the damage come from the classifier and are the part worth trusting; the
// name is the part worth checking.

// How much weight each signal carries. Body dominates because it is the one
// thing an actual model was trained to answer.
const WEIGHT = {
  // The badge, when it is legible, is worth more than everything else put
  // together: a white SUV is seventy four cars, a white *Toyota* SUV is four.
  make: 2.5,
  body: 1.0,
  size: 0.35,
  popularity: 0.25
};

// Bodies that are near neighbours. Getting an MPV where the truth is an SUV is
// a much smaller mistake than getting a hatchback, and the ranking should say
// so rather than treating every wrong answer as equally wrong.
const NEIGHBOURS = {
  SUV: { MPV: 0.55, Pickup: 0.45, Hatchback: 0.2 },
  MPV: { SUV: 0.55, Hatchback: 0.2 },
  Hatchback: { Sedan: 0.35, SUV: 0.2, MPV: 0.2 },
  Sedan: { Hatchback: 0.35, Coupe: 0.4, SUV: 0.15 },
  Coupe: { Sedan: 0.4, Convertible: 0.6 },
  Convertible: { Coupe: 0.6, Sedan: 0.25 },
  Pickup: { SUV: 0.45 }
};

const bodyScore = (guess, candidate) => {
  if (!guess) return 0.5; // no opinion, so nothing is penalised
  if (guess === candidate) return 1;
  return NEIGHBOURS[guess]?.[candidate] ?? 0;
};

/**
 * How well a car's length matches the apparent size of the one in the photo.
 *
 * The only size signal available is how wide the detection box is against the
 * frame, which confuses a small car photographed closely with a large one
 * photographed from further back. It is therefore weighted lightly and used
 * only to separate a Land Cruiser from an Alto, which it can do.
 */
const sizeScore = (shareOfFrame, lengthMm) => {
  if (!shareOfFrame || !lengthMm) return 0.5;

  // Roughly: a car filling most of the frame reads as a big one. Anchored so
  // that half the frame lands in the middle of the catalogue, around 4.2 m.
  const impliedMm = 3200 + shareOfFrame * 2200;
  const off = Math.abs(impliedMm - lengthMm);

  // A metre out scores nothing; spot on scores one.
  return Math.max(0, 1 - off / 1000);
};

/**
 * Ranks catalogue models against what was seen in a photograph.
 *
 * @param models   the catalogue, as /valuation/options returns it
 * @param seen     { body, shareOfFrame } from the scan; any field may be absent
 * @param limit    how many to return
 */
export function likelyCars(models, seen = {}, limit = 4) {
  if (!models?.length) return [];

  const biggest = models.reduce(
    (most, entry) => Math.max(most, entry.typical || 0),
    1
  );

  const ranked = models
    .map((entry) => {
      const body = bodyScore(seen.body, entry.body) * WEIGHT.body;
      const size = sizeScore(seen.shareOfFrame, entry.length) * WEIGHT.size;

      // No opinion on the make scores neutral, so a car is never punished for
      // the classifier having declined -- which it does often, and correctly,
      // on the thirteen Indian brands it was never shown.
      const badge = !seen.make
        ? 0.5 * WEIGHT.make
        : (entry.brand === seen.make ? 1 : 0) * WEIGHT.make;

      // Nothing here knows what people actually own, so price stands in for it
      // upside down: the cheaper half of the catalogue is most of the cars on
      // the road. It only ever breaks ties.
      const common = (1 - (entry.typical || 0) / biggest) * WEIGHT.popularity;

      return { entry, score: badge + body + size + common };
    })
    // A car whose body is flatly wrong is not a candidate, however cheap.
    .filter((row) => !seen.body || bodyScore(seen.body, row.entry.body) > 0)
    // Nor is one wearing a different badge, when the badge was read.
    .filter((row) => !seen.make || row.entry.brand === seen.make)
    .sort((a, b) => b.score - a.score);

  return ranked.slice(0, limit).map((row) => row.entry);
}
