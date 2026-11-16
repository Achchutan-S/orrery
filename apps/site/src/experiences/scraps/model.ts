// Scraps' data model and every pure rule about it. No DOM, no storage: the island, the letter
// page and the unit tests all import this file.
//
// There is one thing: a scrap of paper. It has words on the front, perhaps a drawing, perhaps
// writing on the back. Scraps that belong together share a paperclip (`clip`). A scrap is on the
// table or in the drawer (`away`). Nothing has a type to choose, a folder, or a state to manage.

/** A freehand stroke: x, y pairs in a 0–1000 square. */
export type Stroke = number[];

export interface Draft {
  at: number;
  body: string;
}

export interface Scrap {
  id: string;
  /** The words on the front. May be empty for a drawing or a sheet that only has a back. */
  text: string;
  /** The writing on the back. Empty until someone turns it over. */
  body: string;
  /** The question it answers, when it came from a spark. Shown small above the words. */
  prompt?: string;
  /** A number that picks how the front is typeset; "New look" adds one. */
  look: number;
  /** Where it lies on the table: 0–1 across and down. */
  x: number;
  y: number;
  /** How it is turned, in degrees. */
  rot: number;
  createdAt: number;
  updatedAt: number;
  /** When it was last picked up: the most recent lies on top, the least recent goes to the drawer first. */
  liftedAt: number;
  strokes?: Stroke[];
  /** Scraps with the same clip are held together. */
  clip?: string;
  /** In the drawer rather than on the table. */
  away?: boolean;
  sentAt?: number;
  /** Earlier versions of `body`, oldest first. */
  drafts?: Draft[];
  /** In the bin since then. Binned scraps are kept for `BIN_DAYS` and can be taken out again. */
  binnedAt?: number;
  /** Taped down: it never slides into the drawer on its own. */
  taped?: boolean;
  starred?: boolean;
  /** How big the paper is: -1 small, 0 or absent ordinary, 1 big. */
  scale?: number;
  /** A picture, as a `data:image/…` address, already shrunk to fit a scrap. */
  image?: string;
  /** Who sent it, when it arrived as a letter and was kept. */
  from?: string;
  /** Sealed like a time capsule: out of sight until this moment. */
  sealedUntil?: number;
  sealedAt?: number;
}

export interface Snapshot {
  scraps: Scrap[];
  meta: Record<string, unknown>;
}

export const FORMAT = 1;
export const BIN_DAYS = 30;
export const MAX_DRAFTS = 12;
export const LOOKS = 5;
export const PAPERS = 6;
const DAY = 86_400_000;

export const newId = (): string => globalThis.crypto.randomUUID();

const URL_RE = /\bhttps?:\/\/[^\s<>"')\]]+/i;

/** The first line, shortened: what a scrap is called in labels and in the letter's title. */
export function titleOf(s: Pick<Scrap, 'text' | 'strokes' | 'body'>, max = 64): string {
  const line = (s.text.trim() || s.body.trim()).split('\n')[0]?.trim() ?? '';
  if (!line) return (s as Scrap).image ? 'A picture' : s.strokes?.length ? 'A doodle' : 'A blank sheet';
  if (line.length <= max) return line;
  const cut = line.slice(0, max);
  return `${cut.slice(0, Math.max(cut.lastIndexOf(' '), max - 16)).trimEnd()}…`;
}

export const wordCount = (s: string): number => s.trim().match(/\S+/g)?.length ?? 0;
export const hasBack = (s: Scrap): boolean => s.body.trim().length > 0;
export const isEmpty = (s: Scrap): boolean => !s.text.trim() && !s.body.trim() && !s.strokes?.length && !s.image;
/** Out of sight: in the bin, or sealed until later. Such a scrap is in no pile and no suggestion. */
export const isHidden = (s: Scrap): boolean => Boolean(s.binnedAt || s.sealedUntil);
export const visible = (scraps: readonly Scrap[]): Scrap[] => scraps.filter((s) => !isHidden(s));

/**
 * How the front is set: one of five compositions on one of six papers, and a size step chosen
 * so that three words fill the scrap and a paragraph still fits on it.
 */
export function faceOf(s: Pick<Scrap, 'text' | 'body' | 'look'>): { look: number; paper: number; size: number } {
  const words = s.text.trim() || s.body.trim();
  const n = words.length;
  const look = ((s.look % LOOKS) + LOOKS) % LOOKS;
  const paper = ((Math.floor(s.look / LOOKS) % PAPERS) + PAPERS) % PAPERS;
  const byLength = n <= 14 ? 0 : n <= 34 ? 1 : n <= 72 ? 2 : n <= 140 ? 3 : 4;
  // The longest word has to fit on one line: a word broken in two ("strin / g") is the ugliest thing a scrap can do.
  const longest = Math.max(0, ...words.split(/\s+/).map((w) => w.length));
  const fits = FITS[look]!;
  const byWord = fits.findIndex((room) => longest <= room);
  return { look, paper, size: Math.max(byLength, byWord < 0 ? 4 : byWord) };
}
/** How many letters of one word fit on a line at each size step, for each look (measured generously: the heavy faces are wide). */
const FITS: readonly (readonly number[])[] = [
  [5, 8, 11, 15, 99], // the poster
  [6, 9, 12, 16, 99], // the soft one
  [6, 9, 12, 16, 99], // the note
  [4, 5, 8, 11, 99], // the cut-out: the words sit inside a shape
  [6, 9, 12, 16, 99], // the clipping
];
export const faceClass = (s: Pick<Scrap, 'text' | 'body' | 'look'>): string => {
  const f = faceOf(s);
  return `k-face look-${f.look} paper-${f.paper} size-${f.size}`;
};

// --- The table and the drawer ----------------------------------------------------------------

export interface Pile {
  /** The scrap on top: the one most recently picked up. */
  top: Scrap;
  /** Every scrap in the pile, top first. One scrap alone is a pile of one. */
  all: Scrap[];
}

/** Scraps grouped by paperclip, each group most recent first; groups in the order they lie (oldest lowest). */
export function pilesOf(scraps: readonly Scrap[]): Pile[] {
  const by = new Map<string, Scrap[]>();
  for (const s of scraps) {
    if (isHidden(s)) continue;
    const key = s.clip ?? s.id;
    const list = by.get(key);
    if (list) list.push(s); else by.set(key, [s]);
  }
  return [...by.values()]
    .map((all) => { all.sort((a, b) => b.liftedAt - a.liftedAt); return { top: all[0]!, all }; })
    .sort((a, b) => a.top.liftedAt - b.top.liftedAt);
}
export const onTable = (scraps: readonly Scrap[]): Pile[] => pilesOf(scraps).filter((p) => !p.top.away);

/** The ids that should slide into the drawer so that at most `room` piles stay on the table: least recently touched first. */
export function overflow(scraps: readonly Scrap[], room: number): string[] {
  const piles = onTable(scraps);
  const loose = piles.filter((p) => !p.all.some((s) => s.taped));
  return loose.slice(0, Math.max(0, Math.min(loose.length, piles.length - room))).flatMap((p) => p.all.map((s) => s.id));
}

/** Clips `a` to `b`: everything already clipped to either ends up on one clip. Returns the changed scraps. */
export function clipTogether(scraps: readonly Scrap[], a: string, b: string, now: number, makeId: () => string = newId): Scrap[] {
  const A = scraps.find((s) => s.id === a);
  const B = scraps.find((s) => s.id === b);
  if (!A || !B || a === b || (A.clip && A.clip === B.clip)) return [];
  const clip = B.clip ?? A.clip ?? makeId();
  const joining = new Set([a, b]);
  for (const s of scraps) if ((A.clip && s.clip === A.clip) || (B.clip && s.clip === B.clip)) joining.add(s.id);
  // The pile lies where the scrap it was dropped on lies, and the one just dropped is on top.
  return scraps.filter((s) => joining.has(s.id)).map((s) => ({
    ...s, clip, x: B.x, y: B.y, away: B.away, liftedAt: s.id === a ? now : Math.min(s.liftedAt, now - 1),
  }));
}

/** Takes one scrap off its clip. A clip left holding a single scrap is removed from that one too. Returns the changed scraps. */
export function unclip(scraps: readonly Scrap[], id: string, now: number): Scrap[] {
  const s = scraps.find((k) => k.id === id);
  if (!s?.clip) return [];
  const rest = scraps.filter((k) => k.clip === s.clip && k.id !== id);
  const { clip: _clip, ...free } = s;
  const out: Scrap[] = [{ ...free, x: Math.min(0.92, s.x + 0.12), y: Math.min(0.92, s.y + 0.08), liftedAt: now }];
  if (rest.length === 1) { const { clip: _c, ...alone } = rest[0]!; out.push(alone); }
  return out;
}

/**
 * A place on the table (0–1 each way) as far as possible from what already lies there, out of a
 * few dozen tries. `tall` is the table's height over its width, so "far" means far on screen.
 */
export function spot(taken: readonly Pick<Scrap, 'x' | 'y'>[], rand: () => number, tall = 0.6): { x: number; y: number } {
  let best = { x: 0.5, y: 0.45 };
  let bestGap = -1;
  for (let i = 0; i < 40; i += 1) {
    const p = { x: 0.03 + rand() * 0.94, y: 0.03 + rand() * 0.94 };
    const gap = taken.length ? Math.min(...taken.map((t) => Math.hypot(t.x - p.x, (t.y - p.y) * tall))) : 1 - Math.hypot(p.x - 0.5, p.y - 0.42);
    if (gap > bestGap) { bestGap = gap; best = p; }
  }
  return best;
}

// --- Things that might belong together ---------------------------------------------------------

const STOP = new Set('about above after again against because before being below between both could does doing down during each from further have having here into itself just more most only other over same should some such than that their them then there these they this those through under until very what when where which while with would your yours yourself'.split(' '));

export function tokens(s: string): Set<string> {
  const out = new Set<string>();
  for (const w of s.toLowerCase().match(/[\p{L}\p{N}]{4,}/gu) ?? []) {
    if (STOP.has(w)) continue;
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

// A scrap object is never changed in place, so its words can be remembered for as long as it lives:
// with thousands of scraps, looking for kin on every keystroke would otherwise read them all again.
const remembered = new WeakMap<Scrap, Set<string>>();
const wordsOf = (s: Scrap): Set<string> => {
  let t = remembered.get(s);
  if (!t) { t = tokens(`${s.text} ${s.body}`); remembered.set(s, t); }
  return t;
};

/** Up to `limit` scraps that share words with this one and are not on its clip, strongest first. */
export function kin(scrap: Scrap, scraps: readonly Scrap[], limit = 3): Scrap[] {
  const mine = wordsOf(scrap);
  return scraps
    .filter((s) => s.id !== scrap.id && !isHidden(s) && !(scrap.clip && s.clip === scrap.clip))
    .map((s) => ({ s, score: similarity(mine, wordsOf(s)) }))
    .filter((e) => e.score >= 0.12)
    .sort((x, y) => y.score - x.score || x.s.createdAt - y.s.createdAt)
    .slice(0, limit)
    .map((e) => e.s);
}

/**
 * Something to find again on return: a scrap left alone for at least three days, preferring one
 * that shares words with what was touched most recently. Undefined when nothing is old enough.
 */
export function forgotten(scraps: readonly Scrap[], now: number, rand: () => number): Scrap | undefined {
  const old = scraps.filter((s) => now - Math.max(s.updatedAt, s.liftedAt) >= 3 * DAY && !isEmpty(s) && !isHidden(s));
  if (!old.length) return undefined;
  const latest = [...scraps].sort((a, b) => b.updatedAt - a.updatedAt)[0];
  if (latest) {
    const ref = wordsOf(latest);
    const related = old.filter((s) => s.id !== latest.id && similarity(ref, wordsOf(s)) >= 0.12);
    if (related.length) return related[Math.floor(rand() * related.length)];
  }
  return old[Math.floor(rand() * old.length)];
}

// --- Sparks: the jar is several different instruments, not one list -----------------------------

export type SparkKind = 'small' | 'notice' | 'whatif' | 'other' | 'against' | 'pair' | 'more' | 'again' | 'turn';

export interface Spark {
  kind: SparkKind;
  text: string;
  /** The scrap the spark was made from, if any. */
  about?: string;
}

/** What the slip says about itself, in pencil, above the question. */
export const SPARK_LABELS: Record<SparkKind, string> = {
  small: 'a small question',
  notice: 'look closer',
  whatif: 'what if',
  other: 'through someone else’s eyes',
  against: 'argue with yourself',
  pair: 'an odd pair',
  more: 'pull the thread',
  again: 'from a while ago',
  turn: 'make it into something',
};

/** Easy to answer in a sentence, about things everyone has. None asks for an opinion worth defending. */
export const SPARKS: readonly string[] = [
  'What did you eat today that was good?',
  'What is a smell that takes you somewhere?',
  'What made you laugh this week?',
  'What are you looking forward to, even slightly?',
  'What is a small thing you are weirdly good at?',
  'What did you want to be when you were eight?',
  'What is the best thing someone has cooked for you?',
  'What is a word you like the sound of?',
  'What is something you believed for far too long?',
  'Who taught you something without meaning to?',
  'What would you do with one extra hour today?',
  'What is a sound you would miss?',
  'What is on your mind that you have not said out loud?',
  'What is the oldest thing you own?',
  'What is a rule you made up for yourself?',
  'What are you putting off?',
  'What is a question you wish someone would ask you?',
  'What is the last thing you fixed?',
  'What is a tiny luxury you love?',
  'What song is stuck in your head, and why that one?',
  'What is something you know how to do that might be lost one day?',
  'What did you almost say?',
];

/** Observation: something ordinary, looked at properly. */
const NOTICE: readonly string[] = [
  'Describe the room you are in to someone who will never see it.',
  'What is the nearest thing to you that is older than you are?',
  'Look out of the nearest window. What is moving?',
  'What can you hear right now that you had stopped hearing?',
  'Pick up the closest object. Where has it been?',
  'What colour is the light where you are, exactly?',
  'What is on the floor that should not be?',
  'Whose handwriting can you see from where you sit?',
  'What did you notice today that nobody else did?',
  'What does your street sound like at the hour you never see it?',
  'What is the most worn-out thing you use every day?',
  'Draw the view from here in four words.',
  'What is a place you could draw from memory?',
];

/** Imagination: a small impossible thing, taken seriously. */
const WHATIF: readonly string[] = [
  'What if you could keep only one hour of this year? Which one?',
  'What if rain had a flavour? What would yours be?',
  'What if your shoes kept a diary? What happened in it this week?',
  'What if you had to give your home a title, like a book?',
  'What if every door you passed today led somewhere else? Pick one.',
  'What if you could send one object back to yourself at ten?',
  'What if silence were for sale? How much would you buy, and when would you use it?',
  'What if the moon were a little closer? What changes first?',
  'What if you could un-invent one thing?',
  'What if animals could ask us one question? Which animal, which question?',
  'What if you woke up fluent in a language nobody else speaks? What is the first word?',
  'What if this week were a weather forecast?',
  'What if you had a museum with one room? What is in it?',
];

/** Perspective: the same world, seen by someone standing elsewhere. */
const OTHER: readonly string[] = [
  'How would your grandmother describe what you do all day?',
  'What does the person who serves your coffee know about you?',
  'What would a ten-year-old find strangest about your week?',
  'How does your home look to the one who cleans it? (Even if that is you.)',
  'What would a stranger guess about you from your bag?',
  'What would someone a hundred years from now envy about today?',
  'What does your oldest friend still not understand about you?',
  'What would your eight-year-old self be thrilled to hear?',
];
const OTHER_ABOUT: ((t: string) => string)[] = [
  (t) => `“${t}”. How would someone who loves you hear that?`,
  (t) => `Say “${t}” again, to a child this time.`,
  (t) => `Who would love “${t}”? Who would hate it?`,
  (t) => `“${t}”. What would you think of that at seventy?`,
];

/** Contradiction: the other side, tried on for size. */
const AGAINST: readonly string[] = [
  'What is something you changed your mind about?',
  'What is an opinion you hold mostly out of habit?',
  'What do you defend a little too quickly?',
  'What advice do you give and not take?',
  'What is something everyone seems to like that you do not? Make their case.',
  'What were you sure about five years ago?',
];
const AGAINST_ABOUT: ((t: string) => string)[] = [
  (t) => `“${t}”. Now say the opposite and see if it is also a bit true.`,
  (t) => `Someone clever disagrees with “${t}”. What do they say?`,
  (t) => `“${t}”. When is that not so?`,
];

/** Unexpected connection: two things that have no business together. */
const THINGS: readonly string[] = [
  'a lighthouse', 'a bus ticket', 'cold tea', 'your first bicycle', 'a locked drawer', 'the smell of rain', 'a borrowed book', 'a queue',
  'an unanswered message', 'bread', 'a staircase', 'a birthday you forgot', 'a map', 'a kitchen at night', 'the last day of a holiday', 'a spare key',
  'a song from a passing car', 'a waiting room', 'an old coat', 'a window seat', 'a secret', 'a cracked cup', 'a long walk', 'a phone ringing in another room',
];
const PAIR_ABOUT: ((a: string, b: string) => string)[] = [
  (a, b) => `“${a}” and “${b}”. You said both. What do they have to do with each other?`,
  (a, b) => `Put “${a}” next to “${b}”. What happens between them?`,
  (a, b) => `If “${a}” and “${b}” were two halves of one thought, what is the thought?`,
];

/** Expansion: one fragment, several ways on. */
const MORE_ABOUT: ((t: string) => string)[] = [
  (t) => `You said “${t}”. What happened next?`,
  (t) => `“${t}”. Where were you when you first thought that?`,
  (t) => `“${t}”. What does that remind you of?`,
  (t) => `“${t}”. What is the part you left out?`,
  (t) => `“${t}”. Why does it matter to you?`,
];

/** Memory: something of yours from a while ago, held up again. */
const AGAIN_ABOUT: ((t: string, when: string) => string)[] = [
  (t, when) => `You said this ${when}: “${t}”. Still true?`,
  (t, when) => `From ${when}: “${t}”. What would you add now?`,
  (t, when) => `“${t}”, ${when}. What has happened to that since?`,
];

/** Transformation: a fragment becomes a different kind of thing. */
const TURN_ABOUT: ((t: string) => string)[] = [
  (t) => `Turn “${t}” into the first line of a letter. Who is it to?`,
  (t) => `“${t}” is the title. What is the first sentence of the story?`,
  (t) => `Make “${t}” into a rule to live by, however silly.`,
  (t) => `“${t}”. Write the question that this is the answer to.`,
];

/** What the place leaves on the table for a first visit. It is the studio's sentence, so no spark is made from it. */
export const WELCOME = 'Hello. Nothing here has to be finished.';

/**
 * Something to answer. Which instrument plays depends on what is already here: with nothing of
 * your own, the jar asks open questions; with a few scraps, it starts pairing them, turning them
 * round and bringing old ones back. `only` asks for one kind (it falls back when that kind needs
 * scraps that are not there yet).
 */
export function spark(scraps: readonly Scrap[], rand: () => number, avoid?: string | ReadonlySet<string>, now = Date.now(), only?: SparkKind): Spark {
  const seen = (text: string) => (typeof avoid === 'string' ? avoid === text : avoid?.has(text) ?? false);
  const pick = <T,>(xs: readonly T[]): T => xs[Math.floor(rand() * xs.length)]!;
  const said = (s: Scrap) => s.text.trim().replace(/[.!?…]+$/u, '');
  const own = scraps.filter((s) => { const n = s.text.trim().length; return !isHidden(s) && n > 3 && n <= 90 && !s.text.includes('“') && s.text !== WELCOME; });
  const old = own.filter((s) => now - s.createdAt >= 14 * DAY);
  const about = (fn: (t: string) => string, kind: SparkKind): Spark => { const o = pick(own); return { kind, text: fn(said(o)), about: o.id }; };
  const makers: [SparkKind, number, () => Spark][] = [
    ['small', 4, () => ({ kind: 'small', text: pick(SPARKS) })],
    ['notice', 3, () => ({ kind: 'notice', text: pick(NOTICE) })],
    ['whatif', 3, () => ({ kind: 'whatif', text: pick(WHATIF) })],
    ['other', 2, () => (own.length && rand() < 0.5 ? about(pick(OTHER_ABOUT), 'other') : { kind: 'other', text: pick(OTHER) })],
    ['against', 2, () => (own.length && rand() < 0.5 ? about(pick(AGAINST_ABOUT), 'against') : { kind: 'against', text: pick(AGAINST) })],
    ['pair', own.length >= 2 ? 3 : 1, () => {
      if (own.length >= 2) {
        const a = pick(own);
        // An odd pair is odd: of a few candidates, the one that shares the fewest words with the first.
        const others = own.filter((s) => s.id !== a.id);
        const b = [pick(others), pick(others), pick(others)].sort((x, y) => similarity(wordsOf(a), wordsOf(x)) - similarity(wordsOf(a), wordsOf(y)))[0]!;
        return { kind: 'pair', text: pick(PAIR_ABOUT)(said(a), said(b)), about: a.id };
      }
      const a = pick(THINGS);
      return { kind: 'pair', text: `What do ${a} and ${pick(THINGS.filter((t) => t !== a))} have in common?` };
    }],
    ...(own.length ? [
      ['more', 3, () => about(pick(MORE_ABOUT), 'more')],
      ['turn', 2, () => about(pick(TURN_ABOUT), 'turn')],
    ] as [SparkKind, number, () => Spark][] : []),
    ...(old.length ? [
      ['again', 3, () => { const o = pick(old); return { kind: 'again', text: pick(AGAIN_ABOUT)(said(o), ago(o.createdAt, now)), about: o.id }; }],
    ] as [SparkKind, number, () => Spark][] : []),
  ];
  const pool = makers.filter((m) => m[0] === only);
  const from = pool.length ? pool : makers;
  const total = from.reduce((n, m) => n + m[1], 0);
  let last: Spark | undefined;
  for (let i = 0; i < 24; i += 1) {
    let at = rand() * total;
    const maker = from.find((m) => (at -= m[1]) < 0) ?? from[0]!;
    last = maker[2]();
    if (!seen(last.text)) return last;
  }
  // Everything this instrument has was shown lately: a repeat is better than nothing.
  return last ?? { kind: 'small', text: SPARKS[0]! };
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

// --- The back: a small, safe subset of Markdown ---------------------------------------------

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

// --- Letters: scraps sent to someone travel inside their own link -------------------------------

/** One scrap inside a letter. Pictures do not travel: a link cannot carry them. */
export interface Leaf {
  t: string;
  b: string;
  /** The look, so it arrives set the way it was sent. */
  k: number;
  p?: string;
  s?: Stroke[];
}

export interface Letter {
  v: number;
  d: number;
  /** One scrap is a note; several are a little zine, read in order. */
  items: Leaf[];
  to?: string;
  from?: string;
  /** What a zine is called, on its cover. */
  name?: string;
  /** Asked to stay folded until this moment. A courtesy the page keeps, not a lock. */
  open?: number;
}

export const MAX_LEAVES = 40;
const NAME = 60;

const leafOf = (s: Scrap): Leaf => ({ t: s.text, b: s.body, k: s.look, ...(s.prompt ? { p: s.prompt } : {}), ...(s.strokes?.length ? { s: s.strokes } : {}) });

export function letterOf(scraps: readonly Scrap[], now: number, extra: { to?: string; from?: string; name?: string; open?: number } = {}): Letter {
  const name = extra.name?.trim().slice(0, 80);
  const to = extra.to?.trim().slice(0, NAME);
  const from = extra.from?.trim().slice(0, NAME);
  return {
    v: 2, d: now, items: scraps.filter((s) => !isEmpty({ ...s, image: undefined })).slice(0, MAX_LEAVES).map(leafOf),
    ...(to ? { to } : {}), ...(from ? { from } : {}), ...(name ? { name } : {}), ...(extra.open && extra.open > now ? { open: extra.open } : {}),
  };
}

/** A kept letter becomes scraps of your own: its leaves, clipped together when there are several. */
export function scrapsOf(letter: Letter, now: number, at: { x: number; y: number }, makeId: () => string = newId): Scrap[] {
  const clip = letter.items.length > 1 ? makeId() : undefined;
  return letter.items.map((l, i) => ({
    id: makeId(), text: l.t, body: l.b, look: l.k, x: at.x, y: at.y, rot: -3, createdAt: now, updatedAt: now, liftedAt: now - i,
    ...(l.p ? { prompt: l.p } : {}), ...(l.s ? { strokes: l.s } : {}), ...(clip ? { clip } : {}), from: letter.from || 'someone',
  }));
}

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
export async function encodeLetter(letter: Letter | (Leaf & { v: number; d: number })): Promise<string> {
  const json = new TextEncoder().encode(JSON.stringify(letter));
  if (typeof CompressionStream === 'undefined') return `0.${toBase64Url(json)}`;
  return `1.${toBase64Url(await pipe(json, new CompressionStream('deflate-raw')))}`;
}

function leafFrom(v: unknown): Leaf | undefined {
  if (typeof v !== 'object' || v === null) return undefined;
  const o = v as Record<string, unknown>;
  if (typeof o.t !== 'string' || typeof o.b !== 'string') return undefined;
  const s = Array.isArray(o.s) ? o.s.filter((k): k is Stroke => Array.isArray(k) && k.every((n) => typeof n === 'number' && Number.isFinite(n))) : undefined;
  return {
    t: o.t, b: o.b,
    k: typeof o.k === 'number' && Number.isFinite(o.k) ? Math.abs(Math.trunc(o.k)) % (LOOKS * PAPERS) : 0,
    ...(typeof o.p === 'string' ? { p: o.p } : {}),
    ...(s?.length ? { s } : {}),
  };
}

/** Undefined for anything that is not a letter: a letter link is input from a stranger. Reads the first format (one scrap) too. */
export async function decodeLetter(fragment: string): Promise<Letter | undefined> {
  try {
    const [mode, data] = fragment.replace(/^#/, '').split('.', 2);
    if (!data || data.length > 400_000 || (mode !== '0' && mode !== '1')) return undefined;
    const bytes = mode === '1' ? await pipe(fromBase64Url(data), new DecompressionStream('deflate-raw')) : fromBase64Url(data);
    const v: unknown = JSON.parse(new TextDecoder().decode(bytes));
    if (typeof v !== 'object' || v === null) return undefined;
    const o = v as Record<string, unknown>;
    if (typeof o.d !== 'number' || !Number.isFinite(o.d)) return undefined;
    const items = (Array.isArray(o.items) ? o.items.slice(0, MAX_LEAVES) : [o]).map(leafFrom).filter((l): l is Leaf => Boolean(l));
    if (!items.length) return undefined;
    const short = (n: unknown, max = NAME) => (typeof n === 'string' && n.trim() ? n.trim().slice(0, max) : undefined);
    const to = short(o.to);
    const from = short(o.from);
    const name = short(o.name, 80);
    return { v: 2, d: o.d, items, ...(to ? { to } : {}), ...(from ? { from } : {}), ...(name ? { name } : {}), ...(typeof o.open === 'number' && Number.isFinite(o.open) ? { open: o.open } : {}) };
  } catch {
    return undefined;
  }
}


// --- Copies: everything as one file -----------------------------------------------------------

const num = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const str = (v: unknown): v is string => typeof v === 'string';
const isStroke = (k: unknown): k is Stroke => Array.isArray(k) && k.every(num);
export const isPicture = (v: unknown): v is string => str(v) && /^data:image\/(png|jpeg|webp|gif);base64,[A-Za-z0-9+/=]+$/.test(v);

/**
 * A scrap read from outside (a file, another tab, the leave-journal): only the fields a scrap
 * has, each of the type it must be. Undefined when the essentials are missing.
 */
export function clean(v: unknown): Scrap | undefined {
  if (typeof v !== 'object' || v === null) return undefined;
  const o = v as Record<string, unknown>;
  if (!str(o.id) || !o.id || !str(o.text) || !str(o.body) || !num(o.x) || !num(o.y) || !num(o.rot) || !num(o.look) || !num(o.createdAt) || !num(o.updatedAt) || !num(o.liftedAt)) return undefined;
  const unit = (n: number) => Math.min(1, Math.max(0, n));
  const strokes = Array.isArray(o.strokes) ? o.strokes.filter(isStroke) : [];
  const drafts = Array.isArray(o.drafts) ? o.drafts.filter((d): d is Draft => typeof d === 'object' && d !== null && num((d as Draft).at) && str((d as Draft).body)).slice(-MAX_DRAFTS) : [];
  return {
    id: o.id, text: o.text, body: o.body, look: Math.trunc(o.look), x: unit(o.x), y: unit(o.y), rot: Math.max(-30, Math.min(30, o.rot)),
    createdAt: o.createdAt, updatedAt: o.updatedAt, liftedAt: o.liftedAt,
    ...(str(o.prompt) ? { prompt: o.prompt } : {}),
    ...(strokes.length ? { strokes } : {}),
    ...(str(o.clip) && o.clip ? { clip: o.clip } : {}),
    ...(o.away === true ? { away: true } : {}),
    ...(num(o.sentAt) ? { sentAt: o.sentAt } : {}),
    ...(drafts.length ? { drafts } : {}),
    ...(num(o.binnedAt) ? { binnedAt: o.binnedAt } : {}),
    ...(o.taped === true ? { taped: true } : {}),
    ...(o.starred === true ? { starred: true } : {}),
    ...(o.scale === 1 || o.scale === -1 ? { scale: o.scale } : {}),
    ...(isPicture(o.image) ? { image: o.image } : {}),
    ...(str(o.from) && o.from ? { from: o.from.slice(0, 60) } : {}),
    ...(num(o.sealedUntil) ? { sealedUntil: o.sealedUntil, ...(num(o.sealedAt) ? { sealedAt: o.sealedAt } : {}) } : {}),
  };
}

export const exportCopy = (scraps: readonly Scrap[], now: number): string => JSON.stringify({ scraps: FORMAT, savedAt: now, items: scraps }, null, 1);

/** Reads a copy made by `exportCopy`. Throws a sentence a person can read when the file is something else. */
export function importCopy(json: string): Scrap[] {
  let v: unknown;
  try { v = JSON.parse(json); } catch { throw new Error('That file is not a copy of a table: it is not JSON.'); }
  const o = v as { scraps?: unknown; items?: unknown };
  if (typeof v !== 'object' || v === null || typeof o.scraps !== 'number' || !Array.isArray(o.items)) throw new Error('That file is not a copy of a table.');
  // A copy made by a later Scraps may hold things this one would drop without saying. Refuse, and say why.
  if (o.scraps > FORMAT) throw new Error('That copy was made by a newer Scraps than this one. Reload the page to get the newest, then bring it back.');
  return o.items.map(clean).filter((s): s is Scrap => Boolean(s));
}

/** Adds a copy to what is already here: a scrap already present is kept in its newer version. */
export function mergeCopy(current: readonly Scrap[], incoming: readonly Scrap[]): Scrap[] {
  const all = new Map(current.map((s) => [s.id, s]));
  for (const s of incoming) {
    const mine = all.get(s.id);
    if (!mine || s.updatedAt > mine.updatedAt) all.set(s.id, s);
  }
  return [...all.values()];
}

/** Keeps an earlier version of the back when it differs from the last one kept. */
export function withDraft(s: Scrap, now: number, body = s.body): Scrap {
  if (!body.trim() || s.drafts?.some((d) => d.body === body)) return s;
  return { ...s, drafts: [...(s.drafts ?? []), { at: now, body }].slice(-MAX_DRAFTS) };
}

// --- Two tabs, one table ------------------------------------------------------------------------

/**
 * Another tab saved `theirs`. Take each one, unless this tab is in the middle of changing the
 * same scrap (`busy`): then this tab's words stay on the page and theirs are kept as an earlier
 * draft, so neither is lost. Returns the whole table, and the scraps this tab must now save.
 */
export function reconcile(mine: readonly Scrap[], theirs: readonly Scrap[], gone: readonly string[], busy: ReadonlySet<string>, now: number): { scraps: Scrap[]; resave: Scrap[]; clashed: string[] } {
  const by = new Map(theirs.map((s) => [s.id, s]));
  const resave: Scrap[] = [];
  const clashed: string[] = [];
  const scraps = mine.filter((s) => !gone.includes(s.id) || busy.has(s.id)).map((s) => {
    const t = by.get(s.id);
    if (!t) return s;
    by.delete(s.id);
    if (!busy.has(s.id)) return t;
    const kept = t.body !== s.body ? withDraft(s, now, t.body) : s;
    if (kept !== s) { resave.push(kept); clashed.push(s.id); }
    return kept;
  });
  return { scraps: [...scraps, ...by.values()], resave, clashed };
}

// --- The bin, the seal, copies of one scrap -------------------------------------------------------

/** Ids that have been in the bin longer than `BIN_DAYS`: these are torn up for good. */
export const stale = (scraps: readonly Scrap[], now: number): string[] => scraps.filter((s) => s.binnedAt && now - s.binnedAt > BIN_DAYS * DAY).map((s) => s.id);

/** Sealed scraps whose day has come. */
export const due = (scraps: readonly Scrap[], now: number): Scrap[] => scraps.filter((s) => s.sealedUntil && s.sealedUntil <= now && !s.binnedAt);

export function duplicate(s: Scrap, now: number, makeId: () => string = newId): Scrap {
  const { clip: _clip, sentAt: _sent, drafts: _drafts, taped: _taped, sealedUntil: _until, sealedAt: _at, ...rest } = s;
  return { ...rest, id: makeId(), x: Math.min(1, s.x + 0.06), y: Math.min(1, s.y + 0.08), rot: -s.rot || 2, createdAt: now, updatedAt: now, liftedAt: now };
}

// --- The drawer as a calendar ---------------------------------------------------------------------

/** Scraps newest first, in runs that share a month. `key` is `YYYY-MM` in local time. */
export function byMonth(scraps: readonly Scrap[]): { key: string; at: number; items: Scrap[] }[] {
  const out: { key: string; at: number; items: Scrap[] }[] = [];
  for (const s of [...scraps].sort((a, b) => b.createdAt - a.createdAt)) {
    const d = new Date(s.createdAt);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const last = out.at(-1);
    if (last?.key === key) last.items.push(s); else out.push({ key, at: s.createdAt, items: [s] });
  }
  return out;
}

/** Scraps made within a few days of today's date in an earlier year, newest first: "around this time, other years". */
export function anniversaries(scraps: readonly Scrap[], now: number, days = 4): Scrap[] {
  const today = new Date(now);
  return scraps.filter((s) => {
    const d = new Date(s.createdAt);
    if (isHidden(s) || d.getFullYear() >= today.getFullYear()) return false;
    const then = new Date(today.getFullYear(), d.getMonth(), d.getDate()).getTime();
    return Math.abs(then - now) <= days * DAY || Math.abs(then - now) >= (365 - days) * DAY;
  }).sort((a, b) => b.createdAt - a.createdAt);
}

/** Text with `**strong**` runs marked, for the reading view. */
export function strongRuns(text: string): { text: string; strong?: boolean }[] {
  return text.split(/(\*\*[^*\n]+\*\*)/).filter(Boolean).map((t) => (/^\*\*[^*\n]+\*\*$/.test(t) ? { text: t.slice(2, -2), strong: true } : { text: t }));
}
