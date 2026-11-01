// Client-safe data for the lifecycle explorer. No imports, so the island bundle stays
// small; a unit test checks STATES against platform-schema's Lifecycle.
export const STATES = ['draft', 'alpha', 'beta', 'published', 'frozen', 'deprecated', 'archived'] as const;
export type State = (typeof STATES)[number];
export const ENVIRONMENTS = ['development', 'preview', 'production'] as const;
export type Env = (typeof ENVIRONMENTS)[number];
export type AccessKind = 'public' | 'owner';

// Wording from the blueprint's lifecycle table (3.4).
export const MEANING: Record<State, string> = {
  draft: 'Work in progress.',
  alpha: 'Early, for a restricted audience.',
  beta: 'Feature-complete, may still change.',
  published: 'Stable.',
  frozen: 'Finished; no dependency updates.',
  deprecated: 'Still reachable, being retired.',
  archived: 'Code deleted; the URL redirects or serves a snapshot.',
};

/** Facts computed at build time from platform-schema and passed to the island as props. */
export type StateFacts = {
  state: State;
  meaning: string;
  channel: 'stable' | 'beta' | 'alpha' | null;
  next: State[];
  built: Record<AccessKind, Record<Env, boolean>>;
};
