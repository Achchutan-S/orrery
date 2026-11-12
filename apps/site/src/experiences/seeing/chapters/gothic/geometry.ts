import { rng } from '../../lib/random.ts';

// Build-time geometry for the Gothic chapter: pointed arches and leaded glass. Pure and seeded,
// so the page is identical on every build. Nothing here ships to the browser.

/** Two-centred pointed arch from (x0, y) to (x1, y), rising h. Returns path commands (no M). */
export const archPath = (x0: number, x1: number, y: number, h: number) => {
  const w = (x1 - x0) / 2;
  const r = (w * w + h * h) / (2 * w);
  const mid = x0 + w;
  return `M${x0} ${y} A${r.toFixed(1)} ${r.toFixed(1)} 0 0 1 ${mid} ${y - h} A${r.toFixed(1)} ${r.toFixed(1)} 0 0 1 ${x1} ${y}`;
};

/** A lancet: an arch on two jambs, closed at the sill. */
export const lancet = (x0: number, x1: number, spring: number, rise: number, sill: number) =>
  `M${x0} ${sill} L${archPath(x0, x1, spring, rise).slice(1)} L${x1} ${sill} Z`;


// Thirteenth-century glass is dominated by blue and red, with yellow, green, white and murrey.
export const GLASS = { blue: '#1f3f99', deep: '#152a6b', ruby: '#a3182b', gold: '#e0a630', green: '#2f7a45', white: '#d8d2bf', murrey: '#5b2d6e' } as const;
type Glass = keyof typeof GLASS;
const pick = (r: () => number, weights: [Glass, number][]) => {
  let x = r() * weights.reduce((a, [, w]) => a + w, 0);
  for (const [g, w] of weights) { x -= w; if (x <= 0) return GLASS[g]; }
  return GLASS[weights[0]![0]];
};

export interface Piece { points: string; fill: string }

/**
 * A medallion window: a ground of small, slightly irregular pieces (blue and red, as in
 * thirteenth-century mosaic grounds), with a column of medallions, each a ring of ruby around a
 * rosette of coloured segments. Every piece is outlined in lead by the caller. Clipped by the
 * caller to the lancet's outline.
 */
export function medallionWindow(x0: number, x1: number, top: number, sill: number, seed: number) {
  const r = rng(seed);
  const jitter = () => (r() - 0.5) * 3;
  const pieces: Piece[] = [];
  const size = 12;
  for (let y = top; y < sill; y += size) {
    for (let x = x0; x < x1; x += size) {
      const checker = (Math.round((x - x0) / size) + Math.round((y - top) / size)) % 2 === 0;
      const fill = checker ? pick(r, [['blue', 7], ['deep', 3], ['white', 0.25]]) : pick(r, [['ruby', 4], ['blue', 3], ['gold', 0.35], ['green', 0.3]]);
      pieces.push({ fill, points: [[x, y], [x + size, y], [x + size, y + size], [x, y + size]].map(([a, b]) => `${(a! + jitter()).toFixed(1)},${(b! + jitter()).toFixed(1)}`).join(' ') });
    }
  }
  const cx = (x0 + x1) / 2;
  const rad = Math.min(54, (x1 - x0) / 2 - 10);
  const medallions: Piece[] = [];
  const ring = (cy: number, r0: number, r1: number, n: number, colours: [Glass, number][], twist = 0) => {
    for (let i = 0; i < n; i++) {
      const a0 = (i / n) * Math.PI * 2 + twist; const a1 = ((i + 1) / n) * Math.PI * 2 + twist;
      const p = (rr: number, a: number) => `${(cx + Math.cos(a) * rr).toFixed(1)},${(cy + Math.sin(a) * rr).toFixed(1)}`;
      medallions.push({ fill: pick(r, colours), points: [p(r0, a0), p(r1, a0), p(r1, (a0 + a1) / 2), p(r1, a1), p(r0, a1)].join(' ') });
    }
  };
  for (let y = sill - rad - 18; y > top + rad + 26; y -= rad * 2 + 22) {
    ring(y, rad - 8, rad, 16, [['ruby', 5], ['gold', 1]]);
    ring(y, rad * 0.5, rad - 8, 10, [['blue', 2], ['green', 2], ['white', 1], ['murrey', 1], ['gold', 1]], 0.3);
    ring(y, 0, rad * 0.5, 6, [['gold', 2], ['ruby', 1], ['white', 1]]);
  }
  const bars: number[] = [];
  for (let y = sill - 90; y > top; y -= 90) bars.push(y);
  return { pieces, medallions, bars };
}

/** A rose of n foils: petals around a centre, each a ring of coloured segments. */
export function rose(cx: number, cy: number, radius: number, foils: number, seed: number) {
  const r = rng(seed);
  const petals: { path: string; fill: string }[] = [];
  for (let i = 0; i < foils; i++) {
    const a = (i / foils) * Math.PI * 2 - Math.PI / 2;
    const px = cx + Math.cos(a) * radius * 0.55;
    const py = cy + Math.sin(a) * radius * 0.55;
    const pr = radius * 0.4;
    petals.push({ path: `M${(px + pr).toFixed(1)} ${py.toFixed(1)} A${pr.toFixed(1)} ${pr.toFixed(1)} 0 1 0 ${(px - pr).toFixed(1)} ${py.toFixed(1)} A${pr.toFixed(1)} ${pr.toFixed(1)} 0 1 0 ${(px + pr).toFixed(1)} ${py.toFixed(1)}`, fill: pick(r, [['blue', 3], ['ruby', 3], ['gold', 1]]) });
  }
  return petals;
}
