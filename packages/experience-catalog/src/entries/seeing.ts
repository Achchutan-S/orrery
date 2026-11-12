import { defineExperience } from '@pu/platform-schema';

// A History of Seeing: an atlas of how people have learned to see, one prerendered page per
// chapter, each art-directed on its own (apps/site/src/experiences/seeing/README.md).
// Owner-only draft: no entry in config/release.json, so it is built locally and in previews only.
// The repository is public, so the draft is off the website, not private.

/** Chapters with a page. Kept in step with seeing/data/atlas.ts by apps/site/test/seeing.test.ts. */
export const SEEING_CHAPTERS = [
  'gothic', 'renaissance', 'art-nouveau', 'bauhaus', 'brutalism',
  'wabi-sabi', 'cyberpunk', 'frutiger-aero', 'weirdcore',
] as const;

export default defineExperience({
  kind: 'internal',
  id: 'seeing',
  title: 'A History of Seeing',
  summary: 'How humanity learned to make the world beautiful: an atlas of art movements, interiors and internet aesthetics, each in its own visual language.',
  capabilities: ['content', 'interactive', 'visualization'],
  tags: ['art history', 'design', 'aesthetics'],
  section: 'thinking',
  headline: 'expressive',
  routes: [
    { pattern: '/seeing', entrypoint: 'seeing/routes/index.astro' },
    ...SEEING_CHAPTERS.map((id) => ({ pattern: `/seeing/${id}`, entrypoint: `seeing/chapters/${id}/index.astro` })),
    { pattern: '/seeing/reframing', entrypoint: 'seeing/routes/reframing.astro' },
    { pattern: '/seeing/map', entrypoint: 'seeing/routes/map.astro' },
    { pattern: '/seeing/lab', entrypoint: 'seeing/routes/lab.astro' },
    { pattern: '/seeing/compare/[pair]', entrypoint: 'seeing/routes/compare.astro' },
    { pattern: '/seeing/sources', entrypoint: 'seeing/routes/sources.astro' },
    // File routes end in an extension, so the production output allowlist accepts what they emit.
    { pattern: '/seeing/fonts/[face]/face.woff2', entrypoint: 'seeing/routes/font.ts' },
    { pattern: '/seeing/images/[image]/image.webp', entrypoint: 'seeing/routes/image.ts' },
  ],
  chrome: 'beacon',
  colorScheme: 'custom',
  performanceClass: 'immersive',
});
