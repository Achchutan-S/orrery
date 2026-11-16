// The land. Every mark raises a smooth bump in a height field; the coast, the shoals around it
// and the contour lines on it are level sets of that field, found with marching squares. Marks
// placed close together merge into one landmass, and a mark that is written at length grows.
// Pure functions over numbers: the chart draws the result, the tests check it.

export interface Bump {
  x: number;
  y: number;
  sigma: number;
  height: number;
}

export interface Field {
  cols: number;
  rows: number;
  /** Size of one cell, in the same units as the bumps. */
  cell: number;
  /** Position of the first sample. */
  x0: number;
  y0: number;
  values: Float32Array;
}

/** Smooth value noise in [-1, 1], fixed for a position: coasts stay where they are between frames. */
export function noise(x: number, y: number): number {
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  const h = (i: number, j: number) => {
    const s = Math.sin(i * 127.1 + j * 311.7) * 43758.5453;
    return (s - Math.floor(s)) * 2 - 1;
  };
  const fx = x - xi;
  const fy = y - yi;
  const u = fx * fx * (3 - 2 * fx);
  const v = fy * fy * (3 - 2 * fy);
  return (h(xi, yi) * (1 - u) + h(xi + 1, yi) * u) * (1 - v) + (h(xi, yi + 1) * (1 - u) + h(xi + 1, yi + 1) * u) * v;
}

/** Samples the field on a grid covering the rectangle from (x0, y0), `width` by `height`. */
export function sample(bumps: readonly Bump[], x0: number, y0: number, width: number, height: number, cell: number): Field {
  const cols = Math.ceil(width / cell) + 2;
  const rows = Math.ceil(height / cell) + 2;
  const values = new Float32Array(cols * rows);
  for (const b of bumps) {
    const reach = b.sigma * 3.2;
    const c0 = Math.max(0, Math.floor((b.x - reach - x0) / cell));
    const c1 = Math.min(cols - 1, Math.ceil((b.x + reach - x0) / cell));
    const r0 = Math.max(0, Math.floor((b.y - reach - y0) / cell));
    const r1 = Math.min(rows - 1, Math.ceil((b.y + reach - y0) / cell));
    const k = 1 / (2 * b.sigma * b.sigma);
    for (let r = r0; r <= r1; r += 1) {
      const dy = y0 + r * cell - b.y;
      for (let c = c0; c <= c1; c += 1) {
        const dx = x0 + c * cell - b.x;
        values[r * cols + c]! += b.height * Math.exp(-(dx * dx + dy * dy) * k);
      }
    }
  }
  // Roughen what is there. Open water stays exactly flat, so no land appears where nothing was written.
  for (let r = 0; r < rows; r += 1) {
    for (let c = 0; c < cols; c += 1) {
      const i = r * cols + c;
      const v = values[i]!;
      if (v > 0.02) {
        const x = x0 + c * cell;
        const y = y0 + r * cell;
        values[i] = v * (1 + 0.26 * noise(x / 46, y / 46) + 0.1 * noise(x / 13, y / 13));
      }
    }
  }
  return { cols, rows, cell, x0, y0, values };
}

export interface Level {
  /** Line segments along the level: x1, y1, x2, y2, … */
  lines: number[];
  /** Polygons covering everything above the level, one per grid cell: each is x, y, x, y, … */
  fills: number[][];
}

/** Marching squares with linear interpolation along cell edges. */
export function level(f: Field, threshold: number, withFills: boolean): Level {
  const { cols, rows, cell, x0, y0, values } = f;
  const lines: number[] = [];
  const fills: number[][] = [];
  const cx = [0, 1, 1, 0];
  const cy = [0, 0, 1, 1];
  const v = [0, 0, 0, 0];
  const cross: number[] = [];
  for (let r = 0; r < rows - 1; r += 1) {
    for (let c = 0; c < cols - 1; c += 1) {
      const i = r * cols + c;
      v[0] = values[i]!;
      v[1] = values[i + 1]!;
      v[2] = values[i + cols + 1]!;
      v[3] = values[i + cols]!;
      const inside = (v[0] >= threshold ? 1 : 0) + (v[1] >= threshold ? 1 : 0) + (v[2] >= threshold ? 1 : 0) + (v[3] >= threshold ? 1 : 0);
      if (inside === 0) continue;
      const px = x0 + c * cell;
      const py = y0 + r * cell;
      if (inside === 4) {
        if (withFills) fills.push([px, py, px + cell, py, px + cell, py + cell, px, py + cell]);
        continue;
      }
      // Walk the four corners in order: keep each corner that is above the level, and add the
      // point where the level crosses each edge whose two ends disagree.
      const poly: number[] = [];
      cross.length = 0;
      for (let k = 0; k < 4; k += 1) {
        const n = (k + 1) % 4;
        const a = v[k]!;
        const b = v[n]!;
        if (a >= threshold) poly.push(px + cx[k]! * cell, py + cy[k]! * cell);
        if ((a >= threshold) !== (b >= threshold)) {
          const t = (threshold - a) / (b - a);
          const ex = px + (cx[k]! + (cx[n]! - cx[k]!) * t) * cell;
          const ey = py + (cy[k]! + (cy[n]! - cy[k]!) * t) * cell;
          poly.push(ex, ey);
          cross.push(ex, ey);
        }
      }
      if (withFills) fills.push(poly);
      for (let k = 0; k + 3 < cross.length; k += 4) lines.push(cross[k]!, cross[k + 1]!, cross[k + 2]!, cross[k + 3]!);
    }
  }
  return { lines, fills };
}

export const COAST = 0.5;
/** Shallow water around land, as nautical charts tint it; and the depth contours beyond. */
export const SHOAL = 0.26;
export const DEPTHS = [0.13, 0.05] as const;
/** Contours on the land, every 0.4 above the coast. */
export const heightsUpTo = (max: number): number[] => {
  const out: number[] = [];
  for (let h = COAST + 0.4; h < max && out.length < 12; h += 0.4) out.push(h);
  return out;
};
