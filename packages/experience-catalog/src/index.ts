// Data only: imports platform-schema and nothing else (no Astro, React or site code).
import { validateCatalog, type ExperienceInput } from '@pu/platform-schema';
import canaryDraft from './entries/canary-draft.ts';
import devxray from './entries/devxray.ts';
import kawaiui from './entries/kawaiui.ts';
import sampleApp from './entries/sample-app.ts';
import sampleContent from './entries/sample-content.ts';
import sampleHostile from './entries/sample-hostile.ts';

// One line per experience. Order is the discovery order.
export const catalog: readonly ExperienceInput[] = [
  kawaiui,
  devxray,
  sampleContent,
  sampleApp,
  canaryDraft,
  sampleHostile,
];

export { CANARY } from './entries/canary-draft.ts';

/** Parses every entry and applies the cross-entry rules; never throws. */
export const parseCatalog = () => validateCatalog(catalog);
