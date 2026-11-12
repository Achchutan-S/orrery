// The atlas: every subject the finished experience covers, in its canonical order, and which of
// them have a page yet. This is the one list the Sightline, chapter navigation, the map and the
// tests read. Adding a chapter: set `built`, add its folder under chapters/, add its id to
// SEEING_CHAPTERS in the catalog entry (a test keeps the two in step).

export type PartId = 'history' | 'spaces' | 'internet' | 'language';

export interface Part {
  id: PartId;
  numeral: string;
  title: string;
  /** What kind of thing the part's subjects are; shown on wall labels. */
  kind: string;
}

export const PARTS: readonly Part[] = [
  { id: 'history', numeral: 'I', title: 'The history of art and design', kind: 'Historical movement' },
  { id: 'spaces', numeral: 'II', title: 'The spaces we inhabit', kind: 'Interior and lifestyle aesthetic' },
  { id: 'internet', numeral: 'III', title: 'The internet invents its own aesthetics', kind: 'Internet aesthetic' },
  { id: 'language', numeral: 'IV', title: 'The language of aesthetics', kind: 'Framework' },
];

export interface Subject {
  id: string;
  title: string;
  part: PartId;
  /** Has a page in this build. */
  built: boolean;
}

const s = (part: PartId, built: readonly string[]) => (title: string, id = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')): Subject => ({ id, title, part, built: built.includes(id) });

const BUILT = ['gothic', 'renaissance', 'art-nouveau', 'bauhaus', 'brutalism', 'wabi-sabi', 'cyberpunk', 'frutiger-aero', 'weirdcore'];
const h = s('history', BUILT);
const sp = s('spaces', BUILT);
const n = s('internet', BUILT);

export const SUBJECTS: readonly Subject[] = [
  h('Gothic'), h('Renaissance'), h('Baroque'), h('Rococo'), h('Neoclassicism'), h('Romanticism'), h('Victorian'),
  h('Impressionism'), h('Art Nouveau'), h('Art Deco'), h('Bauhaus'), h('Modernism'), h('Surrealism'),
  h('Mid-century Modern'), h('Pop Art'), h('Brutalism'), h('Postmodernism'),
  sp('Minimalism'), sp('Scandinavian'), sp('Japanese and wabi-sabi', 'wabi-sabi'), sp('Japandi'), sp('Industrial'),
  sp('Bohemian'), sp('Maximalism'),
  n('Dark Academia'), n('Light Academia'), n('Cottagecore'), n('Goblincore'), n('Fairycore and Fairy Grunge', 'fairycore'),
  n('Cyberpunk'), n('Steampunk'), n('Solarpunk'), n('Vaporwave'), n('Synthwave'), n('Y2K', 'y2k'), n('Frutiger Aero'),
  n('Grunge'), n('Goth'), n('Old Money and Quiet Luxury', 'old-money'), n('Clean Girl'), n('Coquette'),
  n('Coastal Grandmother'), n('Liminal Spaces'), n('Weirdcore and Dreamcore', 'weirdcore'), n('Afrofuturism'), n('Indie Sleaze'),
];

export const subject = (id: string): Subject => {
  const found = SUBJECTS.find((x) => x.id === id);
  if (!found) throw new Error(`seeing: no subject "${id}" in data/atlas.ts`);
  return found;
};

export const partOf = (id: string): Part => PARTS.find((p) => p.id === subject(id).part)!;

export const BUILT_SUBJECTS = SUBJECTS.filter((x) => x.built);

/** Position in the whole atlas, 1-based, and within its part. */
export const positionOf = (id: string) => {
  const all = SUBJECTS.findIndex((x) => x.id === id);
  const inPart = SUBJECTS.filter((x) => x.part === subject(id).part).findIndex((x) => x.id === id);
  return { all: all + 1, inPart: inPart + 1, partSize: SUBJECTS.filter((x) => x.part === subject(id).part).length };
};

/** The nearest built neighbours in canonical order: the prototype's previous and next. */
export const neighbours = (id: string) => {
  const i = BUILT_SUBJECTS.findIndex((x) => x.id === id);
  return { previous: BUILT_SUBJECTS[i - 1], next: BUILT_SUBJECTS[i + 1] };
};

export const href = (id: string) => `/seeing/${id}`;
