// Which way round a model sits, for the models where measuring cannot tell.
//
// findRearSign in utils/wheelDetection.js decides which end is the back by
// height: a bonnet slopes away and a boot does not, so the taller end is the
// rear. That holds for seventeen of the eighteen models here.
//
// It does not hold for a box. The G-Class is the same height at both ends, so
// the decision fell to whatever geometry happened to sit nearest each extreme:
// the grille at the front (1.01 tall) against the rear bumper at the back
// (0.85). It read the car back to front, and because every fitted part is
// placed from that one number, the exhaust, the wing and the headlight beams
// all went to the wrong end of the car -- the wing lay flat on the bonnet and
// the beams fired out of the tailgate.
//
// The obvious repair is a better rule, and the obvious better rule is the roof:
// it runs from the windscreen to the tailgate, so it finishes near the back and
// stops short of the nose. Measured across the garage, that rule fixes the
// G-Class and breaks three cars that work today -- and it is exactly backwards
// on the Hilux, because a pickup's roof stops behind the cab, nowhere near the
// tail. Trading one wrong car for three is not a fix.
//
// So the measurement stands, and this file corrects it where it is known to be
// wrong. Checked by rendering each car from the side with its headlights on and
// looking at which end the beam comes out of; the four models where the two
// rules disagree were all checked that way.
//
//   "max"  the back of the car is at the larger end of its length axis
//   "min"  the back is at the smaller end
export const CAR_FACING = {
  "/models/merc.glb": "min"
};

/** +1 or -1 to override the measured rear, or null to let the measurement stand. */
export function facingSign(model) {
  const facing = CAR_FACING[model];
  if (facing === "max") return 1;
  if (facing === "min") return -1;
  return null;
}
