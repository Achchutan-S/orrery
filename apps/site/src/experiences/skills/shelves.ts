import type { Shelf } from './types.ts';

// The taxonomy, derived from what the ten skills actually do. Order is the order of the stacks.
export const SHELVES: readonly Shelf[] = [
  { id: 'learning', name: 'Learning & Explanation', call: 'LE', blurb: 'Skills that turn a topic into understanding: spoken episodes, dialogues and interview answers that teach.' },
  { id: 'engineering', name: 'Engineering & Systems', call: 'ES', blurb: 'Structured practice for system design, and a way to plan work too big for one session.' },
  { id: 'opportunity', name: 'Product & Opportunity', call: 'PO', blurb: 'Analyst pipelines for finding problems worth solving and products the Indian market lacks.' },
  { id: 'exploration', name: 'Personal Exploration', call: 'PE', blurb: 'A daily curiosity game and a traditional birth chart, both with real computation underneath.' },
  { id: 'rhetoric', name: 'Communication & Rhetoric', call: 'CR', blurb: 'Coaching for public argument built on verified sources and honest confidence levels.' },
];
