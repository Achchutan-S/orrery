// The relationship map's argument: which subjects are connected, how, why, and on whose authority.
// Every edge has a kind, a sentence and at least one source (tested). Kinds are drawn with
// different line patterns, so no relationship is told by colour alone.
//
// What counts as each kind:
//   succession   one follows the other in time and place, without a single cause
//   influence    documented borrowing: people, books, objects that carried ideas across
//   reaction     defined against the other, by its makers or its critics
//   revival      a deliberate return to an earlier form
//   ancestry     two subjects descend from the same source; neither caused the other
//   resemblance  they look alike or share a name; the map says so to stop the arrow being drawn

export type RelationKind = 'succession' | 'influence' | 'reaction' | 'revival' | 'ancestry' | 'resemblance';

export const KINDS: readonly { id: RelationKind; label: string; reads: string }[] = [
  { id: 'succession', label: 'Succession', reads: 'was followed, in the same places, by' },
  { id: 'influence', label: 'Documented influence', reads: 'influenced, by traceable routes,' },
  { id: 'reaction', label: 'Reaction', reads: 'provoked a reaction in' },
  { id: 'revival', label: 'Revival', reads: 'was deliberately revived by' },
  { id: 'ancestry', label: 'Shared ancestry', reads: 'shares a source, not a cause, with' },
  { id: 'resemblance', label: 'Loose resemblance', reads: 'only resembles, with no line of descent,' },
];

export interface MapNode {
  id: string;
  label: string;
  /** Position in the 1200 × 760 map, hand-placed. */
  x: number;
  y: number;
  /** A context node is not a chapter: it explains where something came from. */
  context?: boolean;
}

export interface Relation {
  from: string;
  to: string;
  kind: RelationKind;
  text: string;
  sources: string[];
}

// Part I runs left to right in time along the upper band; the twentieth century fans out below;
// interiors sit at the lower left, the internet's aesthetics at the right.
export const NODES: readonly MapNode[] = [
  { id: 'antiquity', label: 'Greek and Roman antiquity', x: 120, y: 330, context: true },
  { id: 'gothic', label: 'Gothic', x: 160, y: 110 },
  { id: 'renaissance', label: 'Renaissance', x: 290, y: 200 },
  { id: 'baroque', label: 'Baroque', x: 400, y: 110 },
  { id: 'rococo', label: 'Rococo', x: 500, y: 70 },
  { id: 'neoclassicism', label: 'Neoclassicism', x: 560, y: 200 },
  { id: 'romanticism', label: 'Romanticism', x: 660, y: 110 },
  { id: 'victorian', label: 'Victorian', x: 700, y: 250 },
  { id: 'ukiyo-e', label: 'Japanese woodblock prints', x: 820, y: 60, context: true },
  { id: 'arts-and-crafts', label: 'Arts and Crafts', x: 800, y: 330, context: true },
  { id: 'impressionism', label: 'Impressionism', x: 860, y: 170 },
  { id: 'art-nouveau', label: 'Art Nouveau', x: 900, y: 290 },
  { id: 'art-deco', label: 'Art Deco', x: 1060, y: 250 },
  { id: 'modernism', label: 'Modernism', x: 880, y: 450 },
  { id: 'bauhaus', label: 'Bauhaus', x: 720, y: 440 },
  { id: 'mid-century-modern', label: 'Mid-century Modern', x: 700, y: 560 },
  { id: 'brutalism', label: 'Brutalism', x: 900, y: 580 },
  { id: 'postmodernism', label: 'Postmodernism', x: 1080, y: 470 },
  { id: 'goth', label: 'Goth', x: 560, y: 470 },
  { id: 'wabi-sabi', label: 'Wabi-sabi', x: 170, y: 560 },
  { id: 'minimalism', label: 'Minimalism', x: 360, y: 640 },
  { id: 'cyberpunk', label: 'Cyberpunk', x: 1110, y: 630 },
  { id: 'steampunk', label: 'Steampunk', x: 1000, y: 700 },
  { id: 'solarpunk', label: 'Solarpunk', x: 1140, y: 720 },
  { id: 'y2k', label: 'Y2K', x: 620, y: 700 },
  { id: 'frutiger-aero', label: 'Frutiger Aero', x: 780, y: 700 },
  { id: 'liminal-spaces', label: 'Liminal Spaces', x: 380, y: 520 },
  { id: 'weirdcore', label: 'Weirdcore', x: 470, y: 600 },
];

export const RELATIONS: readonly Relation[] = [
  { from: 'gothic', to: 'renaissance', kind: 'reaction', text: 'Renaissance writers measured their art against classical antiquity and found the pointed arch barbarous; Vasari’s Lives fixed “Gothic” as a word of contempt for the manner that came before.', sources: ['vasari', 'met-gothic'] },
  { from: 'antiquity', to: 'renaissance', kind: 'revival', text: 'Renaissance architects and humanists studied Roman ruins and texts, Vitruvius above all, and rebuilt with columns, round arches and proportion.', sources: ['britannica-renaissance-architecture'] },
  { from: 'antiquity', to: 'neoclassicism', kind: 'revival', text: 'Neoclassicism returned to antiquity a second time, sharpened by excavation at Herculaneum and Pompeii: archaeology rather than legend.', sources: ['britannica-neoclassicism'] },
  { from: 'renaissance', to: 'neoclassicism', kind: 'ancestry', text: 'Both drew on Greek and Roman antiquity, three centuries apart. Neither is the other’s cause; they share a source.', sources: ['britannica-neoclassicism'] },
  { from: 'renaissance', to: 'baroque', kind: 'succession', text: 'Baroque grew out of late-Renaissance Rome, keeping the classical orders but setting them in motion.', sources: ['britannica-baroque'] },
  { from: 'baroque', to: 'rococo', kind: 'succession', text: 'Rococo took Baroque ornament out of the church and the state room and into the salon, lighter and asymmetrical.', sources: ['britannica-rococo'] },
  { from: 'rococo', to: 'neoclassicism', kind: 'reaction', text: 'Neoclassical critics attacked Rococo frivolity in the name of reason and civic virtue.', sources: ['britannica-neoclassicism'] },
  { from: 'neoclassicism', to: 'romanticism', kind: 'reaction', text: 'Romanticism answered rule and reason with feeling, the sublime and the individual imagination.', sources: ['britannica-romanticism'] },
  { from: 'gothic', to: 'victorian', kind: 'revival', text: 'The Gothic Revival, argued for by A. W. N. Pugin, rebuilt Britain’s parliament, churches and colleges in pointed arches.', sources: ['britannica-gothic-revival'] },
  { from: 'victorian', to: 'arts-and-crafts', kind: 'reaction', text: 'William Morris and the Arts and Crafts movement set hand-work and honest materials against the machine-made ornament of Victorian industry.', sources: ['morris-arts-crafts'] },
  { from: 'arts-and-crafts', to: 'art-nouveau', kind: 'influence', text: 'Art Nouveau inherited Arts and Crafts’ belief that a chair, a book and a building deserve the same care.', sources: ['greenhalgh-2000'] },
  { from: 'ukiyo-e', to: 'impressionism', kind: 'influence', text: 'Japanese prints reached Paris in quantity after the 1850s; their cropped views, flat colour and high horizons are visible in Impressionist painting.', sources: ['met-japonisme'] },
  { from: 'ukiyo-e', to: 'art-nouveau', kind: 'influence', text: 'The dealer Siegfried Bing sold Japanese art before he opened his Paris gallery L’Art Nouveau in 1895; the flat, flowing line passed from one to the other.', sources: ['met-japonisme', 'greenhalgh-2000'] },
  { from: 'art-nouveau', to: 'art-deco', kind: 'succession', text: 'Art Deco followed in the same decorative-arts trades and capitals, trading the curve for the zigzag and the stepped line.', sources: ['britannica-art-deco'] },
  { from: 'art-nouveau', to: 'modernism', kind: 'reaction', text: 'Adolf Loos lectured in 1910 that ornament was a waste of labour and material. Modernism took him at his word.', sources: ['loos'] },
  { from: 'bauhaus', to: 'modernism', kind: 'influence', text: 'The Bauhaus was one of modernism’s schools rather than its source, but its teachers and teaching travelled further than any other.', sources: ['droste'] },
  { from: 'bauhaus', to: 'mid-century-modern', kind: 'influence', text: 'After 1933 Gropius, Breuer, Mies van der Rohe, Albers and Moholy-Nagy taught in the United States, and their students furnished the post-war house.', sources: ['droste'] },
  { from: 'modernism', to: 'brutalism', kind: 'influence', text: 'Le Corbusier’s béton brut at the Unité d’habitation in Marseille gave the post-war generation its material and its scale.', sources: ['banham-1966', 'unesco-corbusier'] },
  { from: 'modernism', to: 'postmodernism', kind: 'reaction', text: 'Robert Venturi answered Mies van der Rohe’s “less is more” with “less is a bore”, and asked architecture for complexity and contradiction.', sources: ['venturi-1966'] },
  { from: 'bauhaus', to: 'goth', kind: 'resemblance', text: 'A post-punk band named itself Bauhaus in 1978 and became one of goth’s founding sounds. The name is borrowed; the look is not. No line of descent.', sources: ['wikipedia-bauhaus-band'] },
  { from: 'wabi-sabi', to: 'minimalism', kind: 'resemblance', text: 'Both are spare, so they are often confused. Leonard Koren sets wabi-sabi beside modernism, the family minimalist interiors belong to, to show the differences: the made by hand against the machine-made, the passing against the permanent.', sources: ['koren-1994'] },
  { from: 'cyberpunk', to: 'steampunk', kind: 'influence', text: 'K. W. Jeter coined “steampunk” in 1987 as a joke on “cyberpunk”, for fiction that set the same dark machinery in Victorian London.', sources: ['jeter-1987'] },
  { from: 'cyberpunk', to: 'solarpunk', kind: 'reaction', text: 'Solarpunk was proposed in the 2010s as an answer to dystopia: technology after the crisis, in the service of ecology and community.', sources: ['flynn-2014'] },
  { from: 'y2k', to: 'frutiger-aero', kind: 'resemblance', text: 'Both are glossy, both are about consumer technology, and both are remembered with longing. But Y2K looks to chrome and outer space; Frutiger Aero to sky, water and grass.', sources: ['cari-frutiger-aero'] },
  { from: 'liminal-spaces', to: 'weirdcore', kind: 'ancestry', text: 'Both grew in the image boards and Tumblr feeds of the late 2010s, from the same photographs of empty rooms. Liminal spaces keep the room; weirdcore writes on it.', sources: ['wikipedia-weirdcore', 'screenshot-weirdcore'] },
];

export const relationsOf = (id: string) => RELATIONS.filter((r) => r.from === id || r.to === id);
export const node = (id: string) => NODES.find((n) => n.id === id);
