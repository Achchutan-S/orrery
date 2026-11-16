// Soundings' data model and every pure rule about it. No DOM, no storage: the island, the
// letter page and the unit tests all import this file.
//
// One entity, the Mark, carries the whole journey the brief describes: a capture is a mark with
// only `text`; it becomes a creation when it gains a `body` or `strokes`; an exploration is a
// group of marks joined by links; a publication is a mark with `releasedAt`.

export type Kind = 'thought' | 'question' | 'source';

/** A freehand stroke: x, y pairs in a 0–1000 square. */
export type Stroke = number[];

export interface Draft {
  at: number;
  body: string;
}

export interface Mark {
  id: string;
  kind: Kind;
  /** The fragment itself, and the title of whatever grows from it. May be empty for a drawing. */
  text: string;
  /** Long-form writing. Empty until someone writes at length. */
  body: string;
  /** Position on the chart, in chart units. */
  x: number;
  y: number;
  createdAt: number;
  updatedAt: number;
  strokes?: Stroke[];
  releasedAt?: number;
  /** Earlier versions of `body`, oldest first. */
  drafts?: Draft[];
}

export interface Link {
  id: string;
  a: string;
  b: string;
  createdAt: number;
}

export interface Snapshot {
  marks: Mark[];
  links: Link[];
  meta: Record<string, unknown>;
}

export const FORMAT = 1;
export const MAX_DRAFTS = 12;
const DAY = 86_400_000;

export const newId = (): string => globalThis.crypto.randomUUID();

const URL_RE = /\bhttps?:\/\/[^\s<>"')\]]+/i;

/** A question ends with a question mark; a source contains a web address; anything else is a thought. */
export function inferKind(text: string): Kind {
  const t = text.trim();
  if (URL_RE.test(t)) return 'source';
  if (/\?\s*$/.test(t)) return 'question';
  return 'thought';
}

export const urlIn = (text: string): string | undefined => URL_RE.exec(text)?.[0];

/** The first line, shortened: what the chart, the log and the letter call this mark. */
export function titleOf(mark: Pick<Mark, 'text' | 'strokes' | 'body'>, max = 64): string {
  const line = (mark.text.trim() || mark.body.trim()).split('\n')[0]?.trim() ?? '';
  if (!line) return mark.strokes?.length ? 'A drawing' : 'Untitled';
  if (line.length <= max) return line;
  const cut = line.slice(0, max);
  return `${cut.slice(0, Math.max(cut.lastIndexOf(' '), max - 16)).trimEnd()}…`;
}

export const wordCount = (s: string): number => s.trim().match(/\S+/g)?.length ?? 0;

export const isWritten = (m: Mark): boolean => m.body.trim().length > 0;

/**
 * How much land a mark makes. A bare capture is an islet; words, drawings and links raise it.
 * `sigma` is the spread in chart units, `height` the peak; the coast is drawn where the field is 0.5.
 */
export function massOf(mark: Mark, linkCount: number): { sigma: number; height: number } {
  const words = wordCount(mark.body) + (mark.strokes?.length ? 30 : 0);
  return {
    sigma: Math.min(92, 24 + 2.6 * Math.sqrt(words) + 2 * Math.min(linkCount, 6)),
    height: 1 + 0.5 * Math.log2(1 + words / 40),
  };
}

// --- Connections ---------------------------------------------------------------------------

export const linkBetween = (links: readonly Link[], a: string, b: string): Link | undefined =>
  links.find((l) => (l.a === a && l.b === b) || (l.a === b && l.b === a));

export const neighbours = (links: readonly Link[], id: string): string[] =>
  links.flatMap((l) => (l.a === id ? [l.b] : l.b === id ? [l.a] : []));

/** Marks joined by links, as groups of two or more: the explorations. */
export function groupsOf(marks: readonly Mark[], links: readonly Link[]): Mark[][] {
  const byId = new Map(marks.map((m) => [m.id, m]));
  const seen = new Set<string>();
  const groups: Mark[][] = [];
  for (const m of marks) {
    if (seen.has(m.id)) continue;
    const group: Mark[] = [];
    const queue = [m.id];
    seen.add(m.id);
    while (queue.length) {
      const id = queue.pop()!;
      const mark = byId.get(id);
      if (mark) group.push(mark);
      for (const n of neighbours(links, id)) if (byId.has(n) && !seen.has(n)) { seen.add(n); queue.push(n); }
    }
    if (group.length > 1) groups.push(group);
  }
  return groups;
}

// --- Echoes: old marks that share words with this one ------------------------------------

const STOP = new Set('about above after again against because before being below between both could does doing down during each from further have having here into itself just more most only other over same should some such than that their them then there these they this those through under until very what when where which while with would your yours yourself'.split(' '));

export function tokens(s: string): Set<string> {
  const out = new Set<string>();
  for (const w of s.toLowerCase().match(/[\p{L}\p{N}]{4,}/gu) ?? []) {
    if (STOP.has(w)) continue;
    // A crude stem, so "maps" meets "map" and "walking" meets "walked".
    out.add(w.replace(/(ing|ed|es|s)$/u, '').slice(0, 12) || w);
  }
  return out;
}

export function similarity(a: Set<string>, b: Set<string>): number {
  if (!a.size || !b.size) return 0;
  let shared = 0;
  for (const t of a) if (b.has(t)) shared += 1;
  return shared / Math.sqrt(a.size * b.size);
}

/** Up to `limit` marks that share words with `mark` and are not yet linked to it, strongest first. */
export function echoesFor(mark: Mark, marks: readonly Mark[], links: readonly Link[], limit = 3): Mark[] {
  const mine = tokens(`${mark.text} ${mark.body}`);
  const linked = new Set(neighbours(links, mark.id));
  return marks
    .filter((m) => m.id !== mark.id && !linked.has(m.id))
    .map((m) => ({ m, score: similarity(mine, tokens(`${m.text} ${m.body}`)) }))
    .filter((e) => e.score >= 0.12)
    .sort((x, y) => y.score - x.score || x.m.createdAt - y.m.createdAt)
    .slice(0, limit)
    .map((e) => e.m);
}

/**
 * Something to bring back on return: a mark left alone for at least three days, preferring one
 * that shares words with what was touched most recently. Undefined when nothing is old enough.
 */
export function resurface(marks: readonly Mark[], now: number, rand: () => number): Mark | undefined {
  const old = marks.filter((m) => now - m.updatedAt >= 3 * DAY && (m.text.trim() || m.body.trim()));
  if (!old.length) return undefined;
  const latest = [...marks].sort((a, b) => b.updatedAt - a.updatedAt)[0];
  if (latest) {
    const ref = tokens(`${latest.text} ${latest.body}`);
    const related = old.filter((m) => m.id !== latest.id && similarity(ref, tokens(`${m.text} ${m.body}`)) >= 0.12);
    if (related.length) return related[Math.floor(rand() * related.length)];
  }
  return old[Math.floor(rand() * old.length)];
}

// --- Placement -----------------------------------------------------------------------------

/** The nearest open water to `near`: walks outward on a spiral until no mark is within `gap`. */
export function freeSpot(marks: readonly Pick<Mark, 'x' | 'y'>[], near: { x: number; y: number }, gap = 150): { x: number; y: number } {
  for (let i = 0; i < 400; i += 1) {
    const r = 26 * Math.sqrt(i) * (gap / 110);
    const a = i * 2.399963; // the golden angle, so successive tries fan out evenly
    const p = { x: near.x + r * Math.cos(a), y: near.y + r * Math.sin(a) };
    if (marks.every((m) => Math.hypot(m.x - p.x, m.y - p.y) >= gap)) return p;
  }
  return near;
}

// --- Headings: something to think about, made from the chart itself --------------------------

export interface Heading {
  text: string;
  /** Marks the heading was made from; keeping the heading links to them. */
  from: string[];
}

const SINGLE: ((t: string) => string)[] = [
  (t) => `What would have to be true for “${t}” to be wrong?`,
  (t) => `Who would disagree with “${t}”, and what would they say first?`,
  (t) => `What is “${t}” an example of?`,
  (t) => `How would you say “${t}” to a ten-year-old?`,
  (t) => `What happened just before “${t}”?`,
  (t) => `If “${t}” were a place, what would it look like?`,
  (t) => `What is the smallest thing you could do about “${t}” today?`,
];

const PAIR: ((a: string, b: string) => string)[] = [
  (a, b) => `What does “${a}” have to do with “${b}”?`,
  (a, b) => `Could “${a}” be the cause of “${b}”?`,
  (a, b) => `What would someone who believes “${a}” make of “${b}”?`,
];

export const OPEN_WATER: readonly string[] = [
  'What did you change your mind about this year?',
  'What do you know that you could not prove?',
  'Which sound would you miss if it stopped?',
  'What are you pretending not to understand?',
  'What is a rule you follow that nobody gave you?',
  'What did you believe at fifteen that you still half believe?',
  'Which question do you hope nobody asks you?',
  'What is something small that is working?',
  'What would you make if nobody would ever see it?',
  'Where do you go in your head when you are waiting?',
  'What did someone explain to you so well that you still remember how?',
  'What is slower than it looks?',
  'Which object near you has the longest story?',
  'What are you good at that you never chose?',
  'What do you keep meaning to look up?',
  'What would your grandmother have called what you do all day?',
  'What is the opposite of the thing you are sure about?',
  'When did you last feel like a beginner?',
  'What is a word you use that you could not define?',
  'What does this room know about you?',
  'What is a good idea that arrived too early?',
  'What have you seen today that nobody else noticed?',
  'What are two things you believe that cannot both be true?',
  'What would you measure if measuring were free?',
];

const short = (m: Mark) => titleOf(m, 48).replace(/[?.!…]+$/u, '');

/** A provocation built from one or two existing marks, or an open question when the chart is nearly empty. */
export function heading(marks: readonly Mark[], links: readonly Link[], rand: () => number): Heading {
  const pick = <T,>(xs: readonly T[]): T => xs[Math.floor(rand() * xs.length)]!;
  const usable = marks.filter((m) => m.text.trim().length > 2);
  const roll = rand();
  if (usable.length >= 2 && roll < 0.5) {
    for (let i = 0; i < 12; i += 1) {
      const a = pick(usable);
      const b = pick(usable);
      if (a.id !== b.id && !linkBetween(links, a.id, b.id)) return { text: pick(PAIR)(short(a), short(b)), from: [a.id, b.id] };
    }
  }
  if (usable.length >= 1 && roll < 0.8) {
    const a = pick(usable);
    return { text: pick(SINGLE)(short(a)), from: [a.id] };
  }
  return { text: pick(OPEN_WATER), from: [] };
}

// --- Time ----------------------------------------------------------------------------------

export function ago(then: number, now: number): string {
  const days = Math.floor((now - then) / DAY);
  if (days < 1) return 'today';
  if (days === 1) return 'yesterday';
  if (days < 14) return `${days} days ago`;
  if (days < 60) return `${Math.round(days / 7)} weeks ago`;
  if (days < 730) return `${Math.round(days / 30.4)} months ago`;
  return `${Math.round(days / 365)} years ago`;
}

// --- Writing: a small, safe subset of Markdown ------------------------------------------------

export type Block =
  | { type: 'h'; level: 2 | 3; text: string }
  | { type: 'p'; text: string }
  | { type: 'quote'; text: string }
  | { type: 'list'; items: string[] };

/** Lines starting with `# `, `## `, `> ` or `- ` become headings, quotations and lists; blank lines separate paragraphs. */
export function parseBlocks(src: string): Block[] {
  const blocks: Block[] = [];
  let para: string[] = [];
  const flush = () => { if (para.length) blocks.push({ type: 'p', text: para.join(' ') }); para = []; };
  for (const raw of src.replace(/\r\n?/g, '\n').split('\n')) {
    const line = raw.trimEnd();
    const h = /^(#{1,2})\s+(.*)$/.exec(line);
    const last = blocks.at(-1);
    if (!line.trim()) flush();
    else if (h) { flush(); blocks.push({ type: 'h', level: h[1]!.length === 1 ? 2 : 3, text: h[2]! }); }
    else if (/^>\s?/.test(line)) {
      const text = line.replace(/^>\s?/, '');
      if (!para.length && last?.type === 'quote') last.text += ` ${text}`;
      else { flush(); blocks.push({ type: 'quote', text }); }
    } else if (/^[-*]\s+/.test(line)) {
      const item = line.replace(/^[-*]\s+/, '');
      if (!para.length && last?.type === 'list') last.items.push(item);
      else { flush(); blocks.push({ type: 'list', items: [item] }); }
    } else para.push(line.trim());
  }
  flush();
  return blocks;
}

/** Splits text into plain runs and web addresses, so a renderer can link the addresses. */
export function linkify(text: string): { text: string; href?: string }[] {
  const out: { text: string; href?: string }[] = [];
  let rest = text;
  for (;;) {
    const m = URL_RE.exec(rest);
    if (!m) break;
    const url = m[0].replace(/[.,;:!?]+$/, '');
    if (m.index) out.push({ text: rest.slice(0, m.index) });
    out.push({ text: url, href: url });
    rest = rest.slice(m.index + url.length);
  }
  if (rest) out.push({ text: rest });
  return out;
}

// --- Letters: a released mark travels inside its own link ------------------------------------

export interface Letter {
  v: number;
  t: string;
  b: string;
  s?: Stroke[];
  d: number;
}

export const letterOf = (m: Mark, now: number): Letter => ({ v: FORMAT, t: m.text, b: m.body, ...(m.strokes?.length ? { s: m.strokes } : {}), d: now });

const toBase64Url = (bytes: Uint8Array): string => {
  let bin = '';
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};
const fromBase64Url = (s: string): Uint8Array<ArrayBuffer> => {
  const bin = atob(s.replace(/-/g, '+').replace(/_/g, '/'));
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i += 1) out[i] = bin.charCodeAt(i);
  return out;
};
async function pipe(bytes: Uint8Array<ArrayBuffer>, stream: CompressionStream | DecompressionStream): Promise<Uint8Array<ArrayBuffer>> {
  const out = new Response(new Blob([bytes]).stream().pipeThrough(stream));
  return new Uint8Array(await out.arrayBuffer());
}

/** The letter as a URL fragment: `1.` + deflated JSON, or `0.` + plain JSON where the browser cannot compress. */
export async function encodeLetter(letter: Letter): Promise<string> {
  const json = new TextEncoder().encode(JSON.stringify(letter));
  if (typeof CompressionStream === 'undefined') return `0.${toBase64Url(json)}`;
  return `1.${toBase64Url(await pipe(json, new CompressionStream('deflate-raw')))}`;
}

/** Undefined for anything that is not a letter: a letter link is input from a stranger. */
export async function decodeLetter(fragment: string): Promise<Letter | undefined> {
  try {
    const [mode, data] = fragment.replace(/^#/, '').split('.', 2);
    if (!data || (mode !== '0' && mode !== '1')) return undefined;
    const bytes = mode === '1' ? await pipe(fromBase64Url(data), new DecompressionStream('deflate-raw')) : fromBase64Url(data);
    const v: unknown = JSON.parse(new TextDecoder().decode(bytes));
    if (typeof v !== 'object' || v === null) return undefined;
    const o = v as Record<string, unknown>;
    if (typeof o.t !== 'string' || typeof o.b !== 'string' || typeof o.d !== 'number') return undefined;
    const s = Array.isArray(o.s) ? o.s.filter((k): k is Stroke => Array.isArray(k) && k.every((n) => typeof n === 'number' && Number.isFinite(n))) : undefined;
    return { v: FORMAT, t: o.t, b: o.b, d: o.d, ...(s?.length ? { s } : {}) };
  } catch {
    return undefined;
  }
}

// --- Copies: the whole chart as one file -----------------------------------------------------

const isMark = (v: unknown): v is Mark => {
  const m = v as Mark;
  return typeof v === 'object' && v !== null && typeof m.id === 'string' && typeof m.text === 'string' && typeof m.body === 'string'
    && Number.isFinite(m.x) && Number.isFinite(m.y) && Number.isFinite(m.createdAt) && Number.isFinite(m.updatedAt)
    && (m.kind === 'thought' || m.kind === 'question' || m.kind === 'source');
};
const isLink = (v: unknown): v is Link => {
  const l = v as Link;
  return typeof v === 'object' && v !== null && typeof l.id === 'string' && typeof l.a === 'string' && typeof l.b === 'string' && Number.isFinite(l.createdAt);
};

export const exportCopy = (s: Snapshot, now: number): string => JSON.stringify({ soundings: FORMAT, savedAt: now, marks: s.marks, links: s.links }, null, 1);

/** Reads a copy made by `exportCopy`. Throws a sentence a person can read when the file is something else. */
export function importCopy(json: string): Pick<Snapshot, 'marks' | 'links'> {
  let v: unknown;
  try { v = JSON.parse(json); } catch { throw new Error('That file is not a Soundings copy: it is not JSON.'); }
  const o = v as { soundings?: unknown; marks?: unknown; links?: unknown };
  if (typeof v !== 'object' || v === null || o.soundings !== FORMAT || !Array.isArray(o.marks) || !Array.isArray(o.links)) {
    throw new Error('That file is not a Soundings copy.');
  }
  const marks = o.marks.filter(isMark);
  const ids = new Set(marks.map((m) => m.id));
  return { marks, links: o.links.filter(isLink).filter((l) => ids.has(l.a) && ids.has(l.b)) };
}

/** Adds a copy to what is already here: a mark already present is kept in its newer version. */
export function mergeCopy(current: Pick<Snapshot, 'marks' | 'links'>, incoming: Pick<Snapshot, 'marks' | 'links'>): Pick<Snapshot, 'marks' | 'links'> {
  const marks = new Map(current.marks.map((m) => [m.id, m]));
  for (const m of incoming.marks) {
    const mine = marks.get(m.id);
    if (!mine || m.updatedAt > mine.updatedAt) marks.set(m.id, m);
  }
  const links = new Map(current.links.map((l) => [l.id, l]));
  for (const l of incoming.links) if (!links.has(l.id) && !linkBetween([...links.values()], l.a, l.b)) links.set(l.id, l);
  return { marks: [...marks.values()], links: [...links.values()] };
}

/** Keeps an earlier version of the body when it differs from the last one kept. */
export function withDraft(mark: Mark, now: number): Mark {
  const last = mark.drafts?.at(-1);
  if (!mark.body.trim() || last?.body === mark.body) return mark;
  return { ...mark, drafts: [...(mark.drafts ?? []), { at: now, body: mark.body }].slice(-MAX_DRAFTS) };
}
