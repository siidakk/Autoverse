// Damage assessment.
//
// Two halves, and they are not equally certain, so they are kept apart.
//
// The first half looks at a photograph and marks regions that do not behave
// like bodywork. A car panel is smooth: neighbouring pixels agree with each
// other. A scratch, a crack or a crumpled dent is a run of disagreement across
// paint that is otherwise flat. That is genuinely what a gradient tells you and
// it needs no model, but it cannot tell a scratch from a reflected branch, so
// it produces candidates for a person to confirm and is labelled as such.
//
// The second half is arithmetic and is exact: given a confirmed damage type, a
// panel and a severity, what it costs to fix, scaled by what the car is worth.

// ---------------------------------------------------------------- candidates

function toGrey(context, width, height) {
  const { data } = context.getImageData(0, 0, width, height);
  const grey = new Float32Array(width * height);
  const light = new Float32Array(width * height);

  for (let i = 0, p = 0; i < data.length; i += 4, p++) {
    grey[p] = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
    light[p] = grey[p];
  }

  return { grey, light };
}

/**
 * Finds regions of a photograph that do not look like smooth paint.
 *
 * Returns candidates in the coordinate space of the original image, each with
 * a score of how far it departs from the panel around it.
 */
export function findCandidates(image, box, options = {}) {
  const { cells = 16, keep = 4 } = options;

  const [boxLeft, boxTop, boxWidth, boxHeight] = box;

  // Work small. Damage that only shows at full resolution is a polish job, and
  // a smaller image makes the gradient measure a local one.
  const width = 200;
  const height = Math.max(
    40,
    Math.round((boxHeight / Math.max(boxWidth, 1)) * width)
  );

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext("2d", { willReadFrequently: true });
  context.drawImage(image, boxLeft, boxTop, boxWidth, boxHeight, 0, 0, width, height);

  const { grey, light } = toGrey(context, width, height);

  // Sobel, which is the standard way of asking how fast the picture is changing.
  const gradient = new Float32Array(width * height);

  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const at = (dx, dy) => grey[(y + dy) * width + (x + dx)];

      const gx =
        -at(-1, -1) - 2 * at(-1, 0) - at(-1, 1) +
        at(1, -1) + 2 * at(1, 0) + at(1, 1);

      const gy =
        -at(-1, -1) - 2 * at(0, -1) - at(1, -1) +
        at(-1, 1) + 2 * at(0, 1) + at(1, 1);

      gradient[y * width + x] = Math.hypot(gx, gy);
    }
  }

  // Score each cell of a grid over the car.
  const cellW = Math.floor(width / cells);
  const rows = Math.max(3, Math.round(cells * (height / width)));
  const cellH = Math.floor(height / rows);

  const scored = [];

  for (let row = 0; row < rows; row++) {
    for (let column = 0; column < cells; column++) {
      let total = 0;
      let brightness = 0;
      let count = 0;

      for (let y = row * cellH; y < (row + 1) * cellH && y < height; y++) {
        for (let x = column * cellW; x < (column + 1) * cellW && x < width; x++) {
          total += gradient[y * width + x];
          brightness += light[y * width + x];
          count++;
        }
      }

      if (!count) continue;

      scored.push({
        row,
        column,
        gradient: total / count,
        brightness: brightness / count
      });
    }
  }

  if (!scored.length) return [];

  // Glass, tyres and deep shadow are busy for reasons that are not damage, so
  // the darkest cells are set aside rather than reported.
  const usable = scored.filter((cell) => cell.brightness > 45);
  if (usable.length < 4) return [];

  // The panel's own texture is whatever most of the car is doing. Damage is
  // what stands out from that, not what is merely detailed.
  const sorted = [...usable].sort((a, b) => a.gradient - b.gradient);
  const median = sorted[Math.floor(sorted.length / 2)].gradient;
  const spread =
    sorted[Math.floor(sorted.length * 0.9)].gradient - median || 1;

  return usable
    .map((cell) => ({ ...cell, score: (cell.gradient - median) / spread }))
    .filter((cell) => cell.score > 1.6)
    .sort((a, b) => b.score - a.score)
    .slice(0, keep)
    .map((cell) => ({
      score: Number(cell.score.toFixed(2)),
      // Back into the original photograph's coordinates.
      box: [
        boxLeft + (cell.column * cellW / width) * boxWidth,
        boxTop + (cell.row * cellH / height) * boxHeight,
        (cellW / width) * boxWidth,
        (cellH / height) * boxHeight
      ]
    }));
}

// ------------------------------------------------------------------ the bill

// Rough Indian workshop prices for a mid market car, in rupees. A panel beater
// charges for the work and the paint, so a dent that needs filling and
// respraying costs many times what a polish does.
export const DAMAGE_TYPES = {
  scratch: {
    label: "Scratch",
    note: "Through the clearcoat or into the paint",
    costs: { light: 1500, moderate: 4500, severe: 9000 }
  },
  dent: {
    label: "Dent",
    note: "Pushed in, paint may be intact",
    costs: { light: 2500, moderate: 7000, severe: 16000 }
  },
  crack: {
    label: "Crack",
    note: "Bumper or trim split",
    costs: { light: 3000, moderate: 8000, severe: 18000 }
  },
  glass: {
    label: "Glass",
    note: "Chipped or shattered",
    costs: { light: 2500, moderate: 9000, severe: 16000 }
  },
  lamp: {
    label: "Lamp",
    note: "Headlight or tail lamp",
    costs: { light: 2000, moderate: 6500, severe: 14000 }
  }
};

export const SEVERITIES = {
  light: { label: "Light", note: "Barely catches the eye" },
  moderate: { label: "Moderate", note: "Obvious up close" },
  severe: { label: "Severe", note: "Seen from across the road" }
};

// Panels are not equal. A bumper comes off and goes back on; a quarter panel is
// welded to the car and is a much longer job.
export const PANELS = {
  bumper: { label: "Bumper", factor: 1 },
  door: { label: "Door", factor: 1.15 },
  bonnet: { label: "Bonnet", factor: 1.25 },
  fender: { label: "Fender", factor: 1.1 },
  boot: { label: "Boot lid", factor: 1.2 },
  quarter: { label: "Quarter panel", factor: 1.6 },
  roof: { label: "Roof", factor: 1.7 }
};

// The same dent costs more on a car with more expensive paint and dearer parts.
const SEGMENT_FACTOR = {
  Budget: 1,
  Mid: 1.35,
  Premium: 2.1,
  Luxury: 3.3
};

export function repairCost(items, segment = "Mid") {
  const multiplier = SEGMENT_FACTOR[segment] ?? 1.35;

  return items.reduce((total, item) => {
    const base = DAMAGE_TYPES[item.type]?.costs[item.severity] ?? 0;
    const panel = PANELS[item.panel]?.factor ?? 1;
    return total + base * panel * multiplier;
  }, 0);
}

/**
 * What unrepaired damage does to what somebody will pay.
 *
 * A buyer does not deduct the repair bill; they deduct the bill plus the
 * trouble of arranging it and the doubt about what else was hit. That premium
 * is why fixing it first is usually worth doing, and the number below says by
 * how much.
 */
export function resaleImpact(cleanValue, cost, items) {
  const severeCount = items.filter((item) => item.severity === "severe").length;

  // More doubt when the damage is structural or plural.
  const doubt = 1.35 + severeCount * 0.15 + Math.max(items.length - 1, 0) * 0.05;

  const knockOff = Math.min(cost * doubt, cleanValue * 0.45);
  const damagedValue = Math.max(cleanValue - knockOff, cleanValue * 0.2);

  return {
    clean: Math.round(cleanValue),
    damaged: Math.round(damagedValue),
    knockOff: Math.round(knockOff),
    cost: Math.round(cost),
    // Fixing it is worth it when buyers take off more than the workshop charges.
    worthRepairing: knockOff > cost * 1.05,
    gain: Math.round(knockOff - cost)
  };
}
