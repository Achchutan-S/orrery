// Build-time botany for the Art Nouveau chapter: one whiplash stem (a chain of cubic curves that
// sways, then recoils at the top), its leaves, and the shape-outside polygon that lets text flow
// along it. Original drawing, seeded so every build is identical.
type P = [number, number];
type Seg = [P, P, P, P];

/** The stem in a 300 × 1000 box, bottom to top. */
export const STEM: Seg[] = [
  [[150, 1000], [60, 860], [250, 760], [150, 620]],
  [[150, 620], [60, 490], [40, 380], [140, 300]],
  [[140, 300], [230, 230], [250, 120], [170, 70]],
  [[170, 70], [110, 35], [80, 110], [130, 125]],
];

const at = (s: Seg, t: number): P => {
  const u = 1 - t;
  return [0, 1].map((k) => u * u * u * s[0][k]! + 3 * u * u * t * s[1][k]! + 3 * u * t * t * s[2][k]! + t * t * t * s[3][k]!) as P;
};
const tangent = (s: Seg, t: number): P => {
  const u = 1 - t;
  return [0, 1].map((k) => 3 * u * u * (s[1][k]! - s[0][k]!) + 6 * u * t * (s[2][k]! - s[1][k]!) + 3 * t * t * (s[3][k]! - s[2][k]!)) as P;
};

export const stemPath = (segs: Seg[] = STEM) => `M${segs[0]![0].join(' ')}` + segs.map((s) => ` C${s[1].join(' ')} ${s[2].join(' ')} ${s[3].join(' ')}`).join('');

/** Almond leaves along the stem, alternating sides, angled from the tangent. */
export function leaves(segs: Seg[] = STEM) {
  const out: { d: string; transform: string }[] = [];
  const spots: [number, number][] = [[0, 0.35], [0, 0.75], [1, 0.3], [1, 0.7], [2, 0.4]];
  spots.forEach(([i, t], n) => {
    const s = segs[i]!;
    const [x, y] = at(s, t);
    const [dx, dy] = tangent(s, t);
    const angle = (Math.atan2(dy, dx) * 180) / Math.PI + (n % 2 ? 55 : -55) + 180;
    const len = 90 - n * 9;
    out.push({ d: `M0 0 C ${len * 0.3} ${-len * 0.28} ${len * 0.75} ${-len * 0.22} ${len} 0 C ${len * 0.75} ${len * 0.22} ${len * 0.3} ${len * 0.28} 0 0Z`, transform: `translate(${x.toFixed(1)} ${y.toFixed(1)}) rotate(${angle.toFixed(1)})` });
  });
  return out;
}

/**
 * A shape-outside polygon (percentages of the float's box) that hugs the stem's outer edge plus a
 * margin. `side` is the side the float sits on; text flows on the other.
 */
export function wrapPolygon(side: 'left' | 'right', margin = 46, segs: Seg[] = STEM) {
  const samples: P[] = [];
  for (const s of segs) for (let i = 0; i <= 12; i++) samples.push(at(s, i / 12));
  // Leaf tips count too, so text never runs over a leaf.
  for (const leaf of leaves(segs)) {
    const m = /translate\(([-\d.]+) ([-\d.]+)\) rotate\(([-\d.]+)\)/.exec(leaf.transform)!;
    const len = Number(/C [-\d.]+ [-\d.]+ [-\d.]+ [-\d.]+ ([-\d.]+) 0/.exec(leaf.d)![1]);
    const a = (Number(m[3]) * Math.PI) / 180;
    samples.push([Number(m[1]) + Math.cos(a) * len, Number(m[2]) + Math.sin(a) * len]);
  }
  const rows = new Map<number, number>();
  for (const [x, y] of samples) {
    const row = Math.round(y / 50) * 50;
    rows.set(row, Math.max(rows.get(row) ?? 0, x + margin));
  }
  const pts = [...rows.entries()].sort((a, b) => a[0] - b[0]).map(([y, x]) => [Math.min(300, x), y] as P);
  const pct = ([x, y]: P) => `${((side === 'left' ? x : 300 - x) / 3).toFixed(1)}% ${(y / 10).toFixed(1)}%`;
  const edge = side === 'left' ? '0%' : '100%';
  return `polygon(${edge} 0%, ${pts.map(pct).join(', ')}, ${edge} 100%)`;
}
