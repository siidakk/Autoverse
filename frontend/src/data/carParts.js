// Corrections to the automatic part classification, per model.
//
// Lamps are found by measurement in utils/lightDetection.js, and on seventeen
// of the eighteen models that finds something. It cannot be right everywhere:
// some models merge a headlight into the panel around it, so there is no
// separate piece of geometry to leave alone, and no rule can invent one.
//
// This file is the escape hatch. Patterns are matched against the mesh name and
// the material name, and they win over whatever the measurement decided.
//
//   neverPaint   keep the factory look: lamps, chrome, grilles, badges
//   alwaysPaint  a panel the lamp rule wrongly claimed, put back into the paint
//
// To find the names for a car, open the configurator with that car selected and
// run this in the browser console:
//
//   __autoverseParts()
//
// It prints every part with its size, where it sits on the car, and whether the
// paint currently reaches it. Pick the lamps out of that list and add their
// names here. Nothing else has to change.

export const CAR_PARTS = {
  // Keyed by the model path, so renaming a car in the sidebar cannot quietly
  // detach its corrections.

  // The Porsche is the one model where nothing is found automatically: its rear
  // measures 0.79 of the car's height in a single piece, so the lamps are part
  // of the bodywork rather than separate from it. Left empty on purpose --
  // guessing at a part name here would stop a whole panel painting, which is
  // worse than the lamps taking colour.
  "/models/porsche.glb": {}
};

function matches(patterns, name) {
  if (!patterns || !name) return false;

  return patterns.some((pattern) =>
    pattern instanceof RegExp
      ? pattern.test(name)
      : name.toLowerCase().includes(String(pattern).toLowerCase())
  );
}

// What the overrides say about one mesh: true to keep it stock, false to force
// it painted, null when this file has no opinion and the measurement stands.
export function overrideFor(model, meshName, materialName) {
  const rules = CAR_PARTS[model];
  if (!rules) return null;

  if (matches(rules.alwaysPaint, meshName) || matches(rules.alwaysPaint, materialName)) {
    return false;
  }

  if (matches(rules.neverPaint, meshName) || matches(rules.neverPaint, materialName)) {
    return true;
  }

  return null;
}
