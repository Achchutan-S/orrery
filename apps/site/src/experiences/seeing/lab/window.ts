// The laboratory's instrument: a window built from eight visual decisions. It is a drawing
// machine, not a classifier. The curated compositions are starting points made for this atlas;
// "nearest" means only that two drawings share numbers here. Pure: the page renders the presets
// at build time and lab.ts redraws live with the same function.

export type Params = {
  arch: number; organic: number; divisions: number; ornament: number;
  symmetry: number; depth: number; light: number; colour: number;
};
export const PARAMS: readonly { id: keyof Params; label: string; low: string; high: string }[] = [
  { id: 'arch', label: 'Head of the opening', low: 'flat', high: 'pointed' },
  { id: 'organic', label: 'Line', low: 'ruled', high: 'grown' },
  { id: 'divisions', label: 'Divisions', low: 'one pane', high: 'many panes' },
  { id: 'ornament', label: 'Ornament', low: 'none', high: 'rich' },
  { id: 'symmetry', label: 'Symmetry', low: 'irregular', high: 'mirrored' },
  { id: 'depth', label: 'Mass of the wall', low: 'thin', high: 'deep' },
  { id: 'light', label: 'Light', low: 'dim', high: 'bright' },
  { id: 'colour', label: 'Colour in the glass', low: 'none', high: 'saturated' },
];

export const PRESETS: readonly { id: string; title: string; p: Params }[] = [
  { id: 'gothic', title: 'Gothic', p: { arch: 0.95, organic: 0.1, divisions: 0.75, ornament: 0.9, symmetry: 1, depth: 0.45, light: 0.45, colour: 0.95 } },
  { id: 'renaissance', title: 'Renaissance', p: { arch: 0.5, organic: 0, divisions: 0.25, ornament: 0.35, symmetry: 1, depth: 0.3, light: 0.8, colour: 0.1 } },
  { id: 'art-nouveau', title: 'Art Nouveau', p: { arch: 0.6, organic: 0.9, divisions: 0.25, ornament: 0.6, symmetry: 0.8, depth: 0.2, light: 0.65, colour: 0.55 } },
  { id: 'bauhaus', title: 'Bauhaus', p: { arch: 0, organic: 0, divisions: 0.5, ornament: 0, symmetry: 0.75, depth: 0.1, light: 0.9, colour: 0.05 } },
  { id: 'brutalism', title: 'Brutalism', p: { arch: 0, organic: 0, divisions: 0, ornament: 0, symmetry: 1, depth: 1, light: 0.55, colour: 0 } },
  { id: 'wabi-sabi', title: 'Wabi-sabi', p: { arch: 0, organic: 0.35, divisions: 0.75, ornament: 0, symmetry: 0.3, depth: 0.15, light: 0.3, colour: 0.1 } },
  { id: 'cyberpunk', title: 'Cyberpunk', p: { arch: 0, organic: 0, divisions: 0.5, ornament: 0.2, symmetry: 0.9, depth: 0.3, light: 0.6, colour: 1 } },
  { id: 'frutiger-aero', title: 'Frutiger Aero', p: { arch: 0.25, organic: 0.2, divisions: 0, ornament: 0.2, symmetry: 1, depth: 0.1, light: 1, colour: 0.6 } },
];

export const nearest = (p: Params) => PRESETS.map((x) => ({
  ...x, d: Math.sqrt(PARAMS.reduce((a, k) => a + (p[k.id] - x.p[k.id]) ** 2, 0)),
})).sort((a, b) => a.d - b.d)[0]!;

const f = (n: number) => n.toFixed(1);
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/** SVG markup (inside a 300 × 420 viewBox) for one window. */
export function windowSvg(p: Params): string {
  const W = 180; const x0 = 60; const x1 = x0 + W; const sill = 370;
  const skew = (1 - p.symmetry) * 40; // irregularity pushes the apex and one side
  const half = W / 2;
  const rise = p.arch <= 0.5 ? (p.arch / 0.5) * half : lerp(half, W * 0.95, (p.arch - 0.5) / 0.5);
  const spring = 150 + (half - Math.min(rise, half)) * 0.4;
  const apexX = x0 + half + skew * 0.6;
  const bulge = p.organic * 34;
  // Outline: left jamb up, head over, right jamb down.
  const left = p.organic > 0.02 ? `Q ${f(x0 - bulge)} ${f((sill + spring) / 2)} ${f(x0 + skew * 0.2)} ${f(spring)}` : `L${f(x0 + skew * 0.2)} ${f(spring)}`;
  const right = p.organic > 0.02 ? `Q ${f(x1 + bulge * 0.7)} ${f((sill + spring) / 2)} ${f(x1)} ${f(sill)}` : `L${f(x1)} ${f(sill)}`;
  let head: string;
  if (rise < 1) head = `L${f(x1)} ${f(spring)}`;
  else if (p.arch <= 0.5) head = `A ${f(half)} ${f(rise)} 0 0 1 ${f(x1)} ${f(spring)}`;
  else {
    const r = (half * half + rise * rise) / (2 * half);
    head = `A ${f(r)} ${f(r)} 0 0 1 ${f(apexX)} ${f(spring - rise)} A ${f(r)} ${f(r)} 0 0 1 ${f(x1)} ${f(spring)}`;
  }
  const outline = `M${f(x0)} ${f(sill)} ${left} ${head} ${right} Z`;
  const top = spring - rise;

  // Glass: tint by colour, brightness by light; panes alternate when colour is high.
  const n = Math.round(p.divisions * 4);
  const cols = n + 1; const rows = Math.max(1, Math.round(p.divisions * 6));
  const palette = ['#1f3f99', '#a3182b', '#e0a630', '#2f7a45', '#5ee6ff', '#ff4d6a'];
  const neutral = `hsl(205 ${f(20 + p.colour * 40)}% ${f(lerp(28, 86, p.light))}%)`;
  let panes = '';
  const pw = W / cols; const ph = (sill - top) / rows;
  for (let i = 0; i < cols; i++) for (let j = 0; j < rows; j++) {
    const pick = palette[(i * 3 + j * 2 + (p.colour > 0.9 && p.arch < 0.3 ? 4 : 0)) % palette.length]!;
    const fill = p.colour > 0.5 ? pick : neutral;
    const op = p.colour > 0.5 ? lerp(0.35, 0.95, p.light) : 1;
    panes += `<rect x="${f(x0 - 40 + i * pw)}" y="${f(top + j * ph)}" width="${f(pw + 80 / cols)}" height="${f(ph + 1)}" fill="${fill}" opacity="${f(op)}"/>`;
  }
  let bars = '';
  for (let i = 1; i < cols; i++) bars += `<line x1="${f(x0 + i * (W / cols))}" x2="${f(x0 + i * (W / cols))}" y1="${f(top)}" y2="${sill}"/>`;
  for (let j = 1; j < rows; j++) bars += `<line x1="${x0 - 40}" x2="${x1 + 40}" y1="${f(top + j * ph)}" y2="${f(top + j * ph)}"/>`;

  // Mass: the reveal, a deep shadowed band below and beside the opening.
  const d = p.depth * 38;
  const reveal = d > 1 ? `<path d="${outline}" transform="translate(${f(d * 0.5)} ${f(d)})" fill="#1c1916" opacity="${f(0.35 + p.depth * 0.4)}"/>` : '';
  const frameW = 3 + p.depth * 18 + p.ornament * 4;

  // Ornament: trim lines echoing the outline, cusps along a pointed head, a rosette at the apex.
  let orn = '';
  const trims = Math.round(p.ornament * 3);
  for (let k = 1; k <= trims; k++) orn += `<path d="${outline}" transform="translate(${150 - 150 * (1 + k * 0.06)} ${220 - 220 * (1 + k * 0.05)}) scale(${1 + k * 0.06} ${1 + k * 0.05})" fill="none" stroke="currentColor" stroke-width="1.5" opacity="${f(0.7 - k * 0.15)}"/>`;
  if (p.ornament > 0.6) orn += `<circle cx="${f(apexX)}" cy="${f(top + 34)}" r="${f(10 + p.ornament * 8)}" fill="none" stroke="currentColor" stroke-width="3"/>`;
  if (p.ornament > 0.5 && p.organic > 0.5) orn += `<path d="M${f(x0 - 30)} ${sill + 20} C ${f(x0 - 60)} 300, ${f(x0 - 10)} 220, ${f(x0 - 40)} 160" fill="none" stroke="currentColor" stroke-width="3"/>`;

  const wall = `hsl(30 ${f(8 + p.organic * 10)}% ${f(lerp(30, 78, p.light) - p.depth * 18)}%)`;
  const glow = `<ellipse cx="${f(apexX)}" cy="${sill + 34}" rx="${f(W * 0.6)}" ry="18" fill="#fff6dc" opacity="${f(p.light * 0.35)}"/>`;
  return `<rect width="300" height="420" fill="${wall}"/>${glow}${reveal}`
    + `<clipPath id="lab-clip"><path d="${outline}"/></clipPath>`
    + `<g clip-path="url(#lab-clip)">${panes}<g stroke="#1c1916" stroke-width="${f(1.5 + p.colour * 2.5)}">${bars}</g></g>`
    + `<path d="${outline}" fill="none" stroke="#1c1916" stroke-width="${f(frameW)}"/>`
    + `<g color="#1c1916">${orn}</g>`;
}

/** Each preset renders with its own clip id, so many can share a page. */
export const presetSvg = (id: string, p: Params) => windowSvg(p).replaceAll('lab-clip', `lab-clip-${id}`);
