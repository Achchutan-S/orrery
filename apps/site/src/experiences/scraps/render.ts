// Builds a scrap's front and its back as DOM nodes: used by the letter page, and by the reading
// view inside the island, so a piece reads the same in both. Text only ever enters the page
// through textContent; the only links made are http(s) addresses found in the text.
import { faceClass, linkify, parseBlocks, strongRuns, type Stroke } from './model.ts';

const SVG = 'http://www.w3.org/2000/svg';

function inline(root: HTMLElement, text: string): void {
  for (const piece of strongRuns(text)) {
    if (!piece.strong) { links(root, piece.text); continue; }
    const b = document.createElement('strong');
    links(b, piece.text);
    root.append(b);
  }
}

function links(parent: HTMLElement, text: string): void {
  for (const run of linkify(text)) {
    if (!run.href) { parent.append(run.text); continue; }
    const a = document.createElement('a');
    a.href = run.href;
    a.rel = 'noopener noreferrer';
    a.textContent = run.text;
    parent.append(a);
  }
}

/** A drawing as an inline SVG. Decorative unless `label` is given. */
export function drawingOf(strokes: readonly Stroke[], label?: string): SVGSVGElement {
  const svg = document.createElementNS(SVG, 'svg');
  svg.setAttribute('viewBox', '0 0 1000 1000');
  svg.setAttribute('class', 'k-drawing');
  if (label) { svg.setAttribute('role', 'img'); svg.setAttribute('aria-label', label); } else svg.setAttribute('aria-hidden', 'true');
  for (const s of strokes) {
    if (s.length < 2) continue;
    const line = document.createElementNS(SVG, 'polyline');
    // A single tap is two numbers: draw it as a dot by repeating the point.
    line.setAttribute('points', (s.length === 2 ? [...s, ...s] : s).join(' '));
    svg.append(line);
  }
  return svg;
}

/** Fills `root` with a scrap's front, typeset the way the island sets it (Face in parts.tsx is the same markup). */
export function renderFace(root: HTMLElement, s: { text: string; body: string; look: number; prompt?: string; strokes?: readonly Stroke[] }): void {
  root.className = faceClass(s);
  root.replaceChildren();
  if (s.prompt) { const p = document.createElement('span'); p.className = 'k-prompt'; p.textContent = s.prompt; root.append(p); }
  if (s.text.trim()) { const w = document.createElement('span'); w.className = 'k-words'; w.textContent = s.text; root.append(w); }
  if (s.strokes?.length) root.append(drawingOf(s.strokes, s.text.trim() ? undefined : 'A doodle'));
}

/** Replaces the contents of `root` with the back: headings, paragraphs, quotations and lists. */
export function renderWriting(root: HTMLElement, body: string): void {
  root.replaceChildren();
  for (const b of parseBlocks(body)) {
    if (b.type === 'list') {
      const ul = document.createElement('ul');
      for (const item of b.items) { const li = document.createElement('li'); inline(li, item); ul.append(li); }
      root.append(ul);
      continue;
    }
    const el = document.createElement(b.type === 'h' ? (b.level === 2 ? 'h2' : 'h3') : b.type === 'quote' ? 'blockquote' : 'p');
    inline(el, b.text);
    root.append(el);
  }
}
