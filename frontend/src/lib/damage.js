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

function readPixels(context, width, height) {
  const { data } = context.getImageData(0, 0, width, height);
  const grey = new Float32Array(width * height);

  for (let i = 0, p = 0; i < data.length; i += 4, p++) {
    grey[p] = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
  }

  return { grey, rgb: data };
}

function hexToRgb(hex) {
  return [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
}

// Colour without brightness. A white door runs from 250 in the sun to 150 in
// its own shadow, so matching paint by how close the numbers are throws away
// most of the panel. What stays constant under shading is the ratio between
// the channels, which is what this returns.
function chromaticity(r, g, b) {
  const sum = r + g + b + 1;
  return [r / sum, g / sum];
}

function isPaint(r, g, b, paint) {
  const [pr, pg] = paint.chroma;
  const [cr, cg] = chromaticity(r, g, b);

  // Grey paint and a black grille share a chromaticity, so brightness still has
  // to be compared. Generously, because shadow is not a different colour.
  const luminance = 0.299 * r + 0.587 * g + 0.114 * b;
  const ratio = luminance / paint.luminance;

  return (
    Math.abs(cr - pr) < 0.055 &&
    Math.abs(cg - pg) < 0.055 &&
    ratio > 0.42 &&
    ratio < 1.75
  );
}

// Merges flagged cells that touch into one region, so a long crease reads as a
// single area rather than as four separate findings sitting next to each other.
function mergeRegions(flagged) {
  const key = (row, column) => `${row},${column}`;
  const pool = new Map(flagged.map((cell) => [key(cell.row, cell.column), cell]));
  const regions = [];

  while (pool.size) {
    const [firstKey] = pool.keys();
    const stack = [pool.get(firstKey)];
    pool.delete(firstKey);

    const group = [];

    while (stack.length) {
      const cell = stack.pop();
      group.push(cell);

      for (const [dr, dc] of [[0, 1], [0, -1], [1, 0], [-1, 0], [1, 1], [-1, -1], [1, -1], [-1, 1]]) {
        const neighbour = pool.get(key(cell.row + dr, cell.column + dc));
        if (neighbour) {
          pool.delete(key(neighbour.row, neighbour.column));
          stack.push(neighbour);
        }
      }
    }

    regions.push({
      cells: group,
      score: Math.max(...group.map((cell) => cell.score)),
      minRow: Math.min(...group.map((cell) => cell.row)),
      maxRow: Math.max(...group.map((cell) => cell.row)),
      minColumn: Math.min(...group.map((cell) => cell.column)),
      maxColumn: Math.max(...group.map((cell) => cell.column))
    });
  }

  return regions;
}

/**
 * Finds regions of a photograph that do not look like smooth paint.
 *
 * Returns candidates in the coordinate space of the original image, each with
 * a score of how far it departs from the panel around it.
 */
export function findCandidates(image, box, options = {}) {
  const { cells = 16, keep = 3, paint = null } = options;

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

  const { grey, rgb } = readPixels(context, width, height);

  const paintRgb = paint ? hexToRgb(paint) : null;
  const paintModel = paintRgb
    ? {
        chroma: chromaticity(...paintRgb),
        luminance:
          0.299 * paintRgb[0] + 0.587 * paintRgb[1] + 0.114 * paintRgb[2]
      }
    : null;

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
      const values = [];
      let brightness = 0;
      let painted = 0;
      let holes = 0;
      let count = 0;

      for (let y = row * cellH; y < (row + 1) * cellH && y < height; y++) {
        for (let x = column * cellW; x < (column + 1) * cellW && x < width; x++) {
          const p = y * width + x;

          values.push(gradient[p]);
          brightness += grey[p];
          count++;

          // Counted pixel by pixel rather than averaged. A cell holding mostly
          // white bonnet and one black grille slat averages out to something
          // close to white, sails through, and brings the slat's enormous
          // gradient with it. That is how the grille kept winning.
          if (paintModel) {
            if (isPaint(rgb[p * 4], rgb[p * 4 + 1], rgb[p * 4 + 2], paintModel)) {
              painted++;
            }

            // Grille slats are grey and read as paint, but what sits between
            // them does not: a grille is full of near black gaps, and paint,
            // however deep in shadow, is not.
            if (grey[p] < paintModel.luminance * 0.38) holes++;
          }
        }
      }

      if (!count) continue;

      // High in the cell, but not the very top. A mean lets one panel gap take
      // the cell; a median misses real damage, because a crease is a few lines
      // through paint that is otherwise smooth and most of the cell stays
      // smooth. The eightieth percentile is high where a minority of the cell
      // is rough and low where a single hard edge crosses it.
      values.sort((a, b) => a - b);

      scored.push({
        row,
        column,
        gradient: values[Math.floor(values.length * 0.8)],
        brightness: brightness / count,
        paintedShare: paintModel ? painted / count : 1,
        holeShare: paintModel ? holes / count : 0
      });
    }
  }

  if (!scored.length) return [];

  // Only painted bodywork is judged. This is the whole point: a grille is the
  // busiest thing on the front of a car and it is meant to be. Looking for a
  // rough patch anywhere finds the grille, the badge and the lamps every time.
  // Looking for a rough patch *in the paint* finds the dent.
  // Nearly the whole cell has to be paint. Anything straddling a panel gap, a
  // lamp or the grille is thrown out along with the edge it was carrying.
  const usable = scored.filter(
    (cell) =>
      cell.brightness > 40 && cell.paintedShare > 0.75 && cell.holeShare < 0.1
  );

  if (usable.length < 6) return [];

  // The panel's own texture is whatever most of the paint is doing. Damage is
  // what stands out from that, not what is merely detailed.
  const sorted = [...usable].sort((a, b) => a.gradient - b.gradient);
  const median = sorted[Math.floor(sorted.length / 2)].gradient;
  const spread = sorted[Math.floor(sorted.length * 0.9)].gradient - median || 1;

  const flagged = usable
    .map((cell) => ({ ...cell, score: (cell.gradient - median) / spread }))
    .filter((cell) => cell.score > 1.4);

  if (!flagged.length) return [];

  // A shutline, a body crease or the rubber strip along a door runs the whole
  // length of the panel and is one cell wide. Damage is a place, not a line
  // from one end to the other, so anything that long and that thin is the car
  // as built rather than something that happened to it.
  const seam = (region) => {
    const tall = region.maxRow - region.minRow + 1;
    const wide = region.maxColumn - region.minColumn + 1;

    return (
      (tall >= rows * 0.5 && wide <= 2) ||
      (wide >= cells * 0.5 && tall <= 2)
    );
  };

  return mergeRegions(flagged)
    .filter((region) => !seam(region))
    .sort((a, b) => b.score - a.score)
    .slice(0, keep)
    .map((region) => ({
      score: Number(region.score.toFixed(2)),
      cells: region.cells.length,
      // Back into the original photograph's coordinates.
      box: [
        boxLeft + (region.minColumn * cellW / width) * boxWidth,
        boxTop + (region.minRow * cellH / height) * boxHeight,
        ((region.maxColumn - region.minColumn + 1) * cellW / width) * boxWidth,
        ((region.maxRow - region.minRow + 1) * cellH / height) * boxHeight
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
