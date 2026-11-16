import { defineExperience } from '@pu/platform-schema';

// Scraps: a cutting-mat table for whatever a visitor has got. A sentence becomes a small typeset
// piece of coloured paper to pick up, restyle, doodle on, write on the back of, or clip to another.
// Everything is stored in the visitor's own browser (IndexedDB) and nowhere else; a scrap sent to
// someone travels inside its own link and is read at /scraps/letter. A permanent experience, published
// on the owner's instruction of 16 November 2026; its contract is in docs/design/registry/scraps.md.
export default defineExperience({
  kind: 'internal',
  id: 'scraps',
  title: 'Scraps',
  summary: 'A table for whatever you have got. Say something and it becomes a small piece of coloured paper to pick up, restyle, write on the back of, or clip to another.',
  capabilities: ['interactive'],
  tags: ['writing', 'play', 'local-first'],
  section: 'thinking',
  headline: 'expressive',
  routes: [
    { pattern: '/scraps', entrypoint: 'scraps/routes/index.astro' },
    { pattern: '/scraps/letter', entrypoint: 'scraps/routes/letter.astro' },
  ],
  chrome: 'beacon',
  colorScheme: 'light',
  performanceClass: 'interactive',
});
