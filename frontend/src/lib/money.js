// Rupees, written the way they are written in India.
//
// There was a formatter in three pages, each a slightly different copy, and all
// three stopped at lakh:
//
//     ₹${(value / 100000).toFixed(1)} L
//
// That was fine while the catalogue topped out at sixty lakh. It stopped being
// fine the moment the catalogue reached eleven crore, because a Rolls-Royce
// came out as "₹1100.0 L" -- a number nobody in this market reads without
// counting digits. Past a crore you say crore.

const LAKH = 100000;
const CRORE = 10000000;

/**
 * A price, at the scale it belongs to.
 *
 *   45,000        -> ₹45,000
 *   7,49,000      -> ₹7.49 L
 *   4,29,20,000   -> ₹4.29 cr
 */
export function money(value) {
  const amount = Number(value) || 0;

  if (amount >= CRORE) return `₹${(amount / CRORE).toFixed(2)} cr`;
  if (amount >= LAKH) return `₹${(amount / LAKH).toFixed(2)} L`;

  return `₹${Math.round(amount).toLocaleString("en-IN")}`;
}

/** The same thing, short enough for a button. 7.49L, 40L, 2cr. */
export function shortMoney(value) {
  const amount = Number(value) || 0;

  if (amount >= CRORE) {
    const crore = amount / CRORE;
    return `${crore % 1 === 0 ? crore : crore.toFixed(1)}cr`;
  }

  const lakh = amount / LAKH;
  return `${lakh % 1 === 0 ? lakh : lakh.toFixed(1)}L`;
}

// The rungs a budget can sit on. Round numbers people actually say.
//
// The spacing matters more than it looks. A first attempt went 20L, 40L, then
// straight to a crore, which is a useless jump: a third of the catalogue lives
// between forty lakh and a crore -- the X3, the GLC, the Q5, the XC60, the
// whole German middle -- and there was no way to say you wanted any of it. So
// that band steps every twenty lakh.
//
// Above a crore the market genuinely does thin out and wider steps are honest.
// Below twenty lakh it needs to be fine, because most cars sold here are there.
const LADDER = [
  3 * LAKH, 5 * LAKH, 8 * LAKH, 12 * LAKH, 20 * LAKH,
  40 * LAKH, 60 * LAKH, 80 * LAKH,
  1 * CRORE, 2 * CRORE, 3 * CRORE, 5 * CRORE, 12 * CRORE,
];

/**
 * Budget buttons that can actually reach the whole catalogue.
 *
 * This was a fixed list ending at forty lakh, written when the catalogue
 * ended at sixty. After the luxury half went in, the data held cars up to
 * eleven crore and the form could not ask for more than forty lakh -- so
 * two thirds of what had just been added was unreachable, and the search that
 * proved it worked had been made with curl rather than with the form.
 *
 * @param priceRange [cheapest, dearest] from /meta
 */
export function budgetsFor(priceRange) {
  const cheapest = priceRange?.[0] ?? 0;
  const dearest = priceRange?.[1] ?? 4000000;

  // Nothing below the cheapest car in the catalogue. A three lakh button was
  // being offered when the cheapest car is 4.69 lakh, so it could only ever
  // answer "nothing fits" -- a control that is guaranteed to fail is worse
  // than no control.
  const rungs = LADDER.filter((rung) => rung <= dearest && rung >= cheapest);

  // Whatever happens, the last rung has to clear the priciest car, or it
  // cannot be chosen at all.
  if (!rungs.length || rungs[rungs.length - 1] < dearest) {
    rungs.push(LADDER.find((rung) => rung >= dearest) ?? dearest);
  }

  return rungs.map((value) => ({ value, label: shortMoney(value) }));
}
