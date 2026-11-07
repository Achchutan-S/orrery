import type { Shelf } from './types.ts';

// The taxonomy, derived from what the skills actually do. Order is the order of the stacks.
export const SHELVES: readonly Shelf[] = [
  { id: 'learning', name: 'Learning & Explanation', call: 'LE', blurb: 'Skills that turn a topic into understanding: spoken episodes, dialogues and interview answers that teach.' },
  { id: 'engineering', name: 'Engineering & Systems', call: 'ES', blurb: 'Structured, phase-by-phase practice for system design interviews.' },
  { id: 'exploration', name: 'Personal Exploration', call: 'PE', blurb: 'A daily curiosity game, with a real game engine underneath.' },
];
