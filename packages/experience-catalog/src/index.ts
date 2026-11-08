// Data only: imports platform-schema and nothing else (no Astro, React or site code).
import { validateCatalog, type ExperienceInput } from '@pu/platform-schema';
import canaryDraft from './entries/canary-draft.ts';
import devxray from './entries/devxray.ts';
import divyaChakshu from './entries/divya-chakshu.ts';
import frontPage from './entries/index.ts';
import journal from './entries/journal.ts';
import kawaiui from './entries/kawaiui.ts';
import sampleApp from './entries/sample-app.ts';
import sampleContent from './entries/sample-content.ts';
import resume from './entries/resume.ts';
import sampleHostile from './entries/sample-hostile.ts';
import skills from './entries/skills.ts';

// One line per experience. Order is the discovery order.
export const catalog: readonly ExperienceInput[] = [
  frontPage,
  journal,
  kawaiui,
  devxray,
  sampleContent,
  sampleApp,
  skills,
  divyaChakshu,
  resume,
  canaryDraft,
  sampleHostile,
];

export { CANARY } from './entries/canary-draft.ts';

/** Parses every entry and applies the cross-entry rules; never throws. */
export const parseCatalog = () => validateCatalog(catalog);
