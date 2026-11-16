// Turns a mark's writing into DOM nodes: used by the reading view inside the island and by the
// letter page, so a released piece reads the same in both. Text only ever enters the page through
// textContent; the only links made are http(s) addresses found in the text.
import { linkify, parseBlocks, type Stroke } from './model.ts';

const SVG = 'http://www.w3.org/2000/svg';

function inline(parent: HTMLElement, text: string): void {
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
  svg.setAttribute('class', 's-drawing');
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

/** Replaces the contents of `root` with the drawing (if any) and the body as headings, paragraphs, quotations and lists. */
export function renderWriting(root: HTMLElement, body: string, strokes?: readonly Stroke[]): void {
  root.replaceChildren();
  if (strokes?.length) root.append(drawingOf(strokes, 'A drawing made with this piece'));
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
