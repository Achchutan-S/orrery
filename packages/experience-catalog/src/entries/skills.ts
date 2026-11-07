import { defineExperience } from '@pu/platform-schema';

// The Claude Skills Archive: a library of the owner's Claude skills. Each skill pairs an
// explanation written for the archive with its original files, copied byte for byte and checked
// against recorded SHA-256 hashes (apps/site/src/experiences/skills/, docs/claude-skills/).
// No release entry yet: an owner-only draft, built locally and in previews, never in production.
// Remember the repository is public: committing the source copies publishes them on GitHub.
export default defineExperience({
  kind: 'internal',
  id: 'skills',
  title: 'The Claude Skills Archive',
  summary: 'A living library of the Claude skills I have created and collected: what each does, how it works, and its original instructions to copy or download.',
  capabilities: ['content', 'interactive', 'downloads'],
  tags: ['claude', 'skills', 'ai', 'prompts'],
  section: 'labs',
  headline: 'literary',
  routes: [
    { pattern: '/skills', entrypoint: 'skills/routes/index.astro' },
    { pattern: '/skills/guide', entrypoint: 'skills/routes/guide.astro' },
    { pattern: '/skills/og.png', entrypoint: 'skills/routes/og.ts' },
    { pattern: '/skills/shelf/[shelf]', entrypoint: 'skills/routes/shelf.astro' },
    { pattern: '/skills/[skill]', entrypoint: 'skills/routes/skill.astro' },
    { pattern: '/skills/[skill]/package.zip', entrypoint: 'skills/routes/package.ts' },
    { pattern: '/skills/[skill]/files/[...path]', entrypoint: 'skills/routes/file.ts' },
  ],
  chrome: 'beacon',
  ogImage: '/skills/og.png',
  performanceClass: 'interactive',
});
