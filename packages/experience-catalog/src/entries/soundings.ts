import { defineExperience } from '@pu/platform-schema';

// Soundings: a sea chart of one person's thinking. A sentence surfaces as an islet, writing at
// length grows the land, and connected thoughts are joined by routes. Everything a visitor makes
// is stored in their own browser (IndexedDB) and nowhere else; a released piece travels inside
// its own link and is read at /soundings/letter. No release entry: an owner-only draft until its
// direction record (docs/design/registry/soundings.md) has the owner's reviews.
export default defineExperience({
  kind: 'internal',
  id: 'soundings',
  title: 'Soundings',
  summary: 'A sea chart of your own thinking: a sentence surfaces as an islet, writing grows the land, and connected thoughts are joined by routes.',
  capabilities: ['interactive', 'visualization'],
  tags: ['writing', 'thinking', 'local-first'],
  section: 'thinking',
  headline: 'literary',
  routes: [
    { pattern: '/soundings', entrypoint: 'soundings/routes/index.astro' },
    { pattern: '/soundings/letter', entrypoint: 'soundings/routes/letter.astro' },
  ],
  chrome: 'beacon',
  colorScheme: 'light-dark',
  performanceClass: 'interactive',
});
