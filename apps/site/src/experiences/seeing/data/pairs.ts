// Comparison pairs: two subjects that are easy to confuse, or that answer the same question in
// opposite ways. Each row compares one dimension; prose uses the same {source} marks as chapters.
export interface PairRow { dimension: string; a: string; b: string }

export interface Pair {
  id: string;
  a: string;
  b: string;
  /** The question the comparison answers. */
  question: string;
  rows: PairRow[];
  /** What the comparison teaches, in the atlas's own voice. */
  takeaway: string;
}

export const PAIRS: readonly Pair[] = [
  {
    id: 'gothic-renaissance', a: 'gothic', b: 'renaissance',
    question: 'Where should the eye go: up, or into the distance?',
    rows: [
      { dimension: 'Context', a: 'Twelfth- to fifteenth-century northern Europe: bishops, abbots and cathedral chapters, the cult of relics, competitive towns {met-gothic}.', b: 'Fifteenth-century Italian city-states, Florence first: merchant patrons, humanist scholars and guilds {smarthistory-perspective}.' },
      { dimension: 'Philosophy', a: 'Light as a way towards the divine; Abbot Suger had the doors of Saint-Denis inscribed: “The dull mind rises to truth through that which is material” {suger}.', b: 'The world as something to be measured; Alberti treats the picture surface as a window and builds the view with geometry {alberti}.' },
      { dimension: 'Visual grammar', a: 'Pointed arches, rib vaults, verticals that never rest; scenes stacked in glass medallions.', b: 'Round arches, columns, a single eye-point; scenes set in one continuous, measured space.' },
      { dimension: 'Material', a: 'Stone made thin, coloured glass held in lead.', b: 'Fresco, panel, and grey pietra serena against white plaster in Brunelleschi’s Florence.' },
      { dimension: 'Composition', a: 'Additive: bay after bay, window after window, each complete.', b: 'Unified: every line in the picture answers to one vanishing point.' },
      { dimension: 'Cultural meaning', a: 'The building as an image of heaven, shared by a whole town.', b: 'The picture as an image of what one person sees, from one place.' },
    ],
    takeaway: 'They are not early and late versions of one ambition. Gothic organises the world around light falling from above; the Renaissance organises it around an observer standing still. Vasari’s scorn for “Gothic” is the Renaissance describing itself.',
  },
  {
    id: 'art-nouveau-bauhaus', a: 'art-nouveau', b: 'bauhaus',
    question: 'If every object deserves design, what should design look like?',
    rows: [
      { dimension: 'Context', a: 'The 1890s and 1900s: Brussels, Paris, Vienna, Glasgow, Barcelona, Munich; luxury trades and new department stores {greenhalgh-2000}.', b: 'Weimar Germany after defeat in 1918: a state school, little money, a programme to unite art and craft {gropius-1919}.' },
      { dimension: 'Philosophy', a: 'Nature as the source of a new ornament that owes nothing to past styles.', b: 'Begin again from elementary form, material and function; ornament is no longer needed {droste}.' },
      { dimension: 'Visual grammar', a: 'The whiplash curve, the stem, the flower; line that grows.', b: 'Circle, square, triangle; the grid; type set to be read fast.' },
      { dimension: 'Material', a: 'Wrought and cast iron, glass, enamel, carved wood, silk.', b: 'Tubular steel, plywood, glass, woven textiles, photography.' },
      { dimension: 'Composition', a: 'Whole rooms designed as one organism, down to the door handle.', b: 'Modules that combine and recombine; the prototype for industry.' },
      { dimension: 'Cultural meaning', a: 'Beauty brought into daily life, mostly for those who could afford it.', b: 'Good design for the many, in principle, through mass production.' },
    ],
    takeaway: 'Both wanted to dissolve the line between fine art and the useful object. One answered with the hand and the plant, the other with the machine and the module. Adolf Loos stands between them {loos}.',
  },
  {
    id: 'bauhaus-brutalism', a: 'bauhaus', b: 'brutalism',
    question: 'What does it mean for a building to be honest?',
    rows: [
      { dimension: 'Context', a: 'A school, 1919 to 1933, in Weimar, Dessau and Berlin {droste}.', b: 'Post-war reconstruction and the welfare state, in Britain and then worldwide, from the 1950s {banham-1966} {sos-brutalism}.' },
      { dimension: 'Philosophy', a: 'Form from function and from industrial production.', b: 'Structure and materials shown “as found”, unconcealed {banham-1955}.' },
      { dimension: 'Visual grammar', a: 'Thin planes, white render, glass curtain walls, primary accents.', b: 'Massive volumes, deep voids, repetition, the board-marks of the formwork left in the concrete.' },
      { dimension: 'Material', a: 'Steel, glass, render.', b: 'Raw concrete above all, but also brick and exposed steel: the first building Banham called Brutalist is a steel-and-brick school {banham-1955}.' },
      { dimension: 'Composition', a: 'Light, open, often lifted from the ground.', b: 'Heavy, grounded, sculpted by shadow.' },
      { dimension: 'Cultural meaning', a: 'Modern life made rational.', b: 'Modern life made collective, and later blamed for its failures.' },
    ],
    takeaway: 'Bauhaus honesty is about making: a thing should show how it is made and what it is for. Brutalist honesty is about matter: a building should show what it is made of. The second inherits the first and makes it heavy.',
  },
  {
    id: 'wabi-sabi-minimalism', a: 'wabi-sabi', b: 'minimalism',
    question: 'Two empty rooms: are they empty for the same reason?',
    rows: [
      { dimension: 'Context', a: 'The tea ceremony of fifteenth- and sixteenth-century Japan; the word pair gathered into a Western design idea from the 1990s {sep-japanese} {koren-1994}.', b: 'Late-twentieth-century art and architecture in the industrial West.' },
      { dimension: 'Philosophy', a: 'Impermanence, poverty chosen as a discipline, beauty in the worn and the incomplete.', b: 'Reduction to the essential; clarity, order, control.' },
      { dimension: 'Visual grammar', a: 'Asymmetry, irregular edges, the trace of the hand.', b: 'Symmetry or the grid, crisp edges, no trace of the maker.' },
      { dimension: 'Material', a: 'Earth, straw, bamboo, iron, raku clay that ages and stains.', b: 'Glass, steel, polished concrete, lacquer that should not age.' },
      { dimension: 'Composition', a: 'Interval (ma) as something you feel: the space is charged.', b: 'Space as absence of clutter: the space is clean.' },
      { dimension: 'Cultural meaning', a: 'Acceptance of decay and of the seasons.', b: 'Resistance to decay; the new kept new.' },
    ],
    takeaway: 'Koren’s comparison with modernism makes the point: the minimalist room hides time, the wabi room shows it {koren-1994}. A bare room is not automatically either.',
  },
  {
    id: 'cyberpunk-frutiger-aero', a: 'cyberpunk', b: 'frutiger-aero',
    question: 'Two pictures of life with computers. Which future did we get?',
    rows: [
      { dimension: 'Context', a: 'Fiction and film of the early 1980s: Gibson, Blade Runner, Akira; deindustrialisation and Japan’s economic rise {gibson-1984} {blade-runner} {akira}.', b: 'Consumer software, advertising and hardware design of the mid-2000s to early 2010s, named in 2017 {cari-frutiger-aero}.' },
      { dimension: 'Philosophy', a: 'Technology concentrates power, and people repurpose it from below.', b: 'Technology is clean, friendly and in harmony with nature.' },
      { dimension: 'Visual grammar', a: 'Night, rain, neon, crowded signage, screens everywhere.', b: 'Daylight, sky, water, bubbles, glossy rounded glass.' },
      { dimension: 'Material', a: 'Wet asphalt, chrome, cheap plastic, implanted hardware.', b: 'Glass, gel, chrome highlights, grass that never needs cutting.' },
      { dimension: 'Composition', a: 'Dense layers with nowhere for the eye to rest.', b: 'Open horizons, a single focal object, soft depth of field.' },
      { dimension: 'Cultural meaning', a: 'Warning.', b: 'Promise, and now nostalgia for a promise.' },
    ],
    takeaway: 'This comparison is the atlas’s interpretation, not a historical relationship: neither aesthetic responded to the other. Set side by side, they show that a style can carry a whole attitude to technology, and that the same decade can hold both.',
  },
];

export const pair = (id: string) => {
  const found = PAIRS.find((p) => p.id === id);
  if (!found) throw new Error(`seeing: no pair "${id}"`);
  return found;
};

export const pairsOf = (id: string) => PAIRS.filter((p) => p.a === id || p.b === id);
