// The single route table, shared by getStaticPaths (routes/app.astro) and the in-app
// router (App.tsx), so Astro and React agree on which views exist.
import { STATES } from './lifecycles.ts';

export const BASE = '/sample-app';

export const views: { path: string; title: string }[] = [
  { path: 'states', title: 'Lifecycle states' },
  ...STATES.map((s) => ({ path: `states/${s}`, title: `${s[0]!.toUpperCase()}${s.slice(1)} · Lifecycle states` })),
];

export const NOT_FOUND_TITLE = 'No such view · Lifecycle states';
