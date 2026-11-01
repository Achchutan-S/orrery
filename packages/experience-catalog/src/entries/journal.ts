import { defineExperience } from '@pu/platform-schema';

// The platform's own history. Content lives in apps/site/src/experiences/journal/chapters;
// whether it is mounted or listed is decided only by its entry in config/release.json.
export default defineExperience({
  kind: 'internal',
  id: 'journal',
  title: 'The Orrery Journal',
  summary: 'The idea, architecture and evolution of a personal universe: how this platform was conceived, built, tested and deployed.',
  capabilities: ['content'],
  tags: ['architecture', 'history'],
  routes: [
    { pattern: '/journal', entrypoint: 'journal/routes/index.astro' },
    { pattern: '/journal/[chapter]', entrypoint: 'journal/routes/chapter.astro' },
  ],
  performanceClass: 'content',
});
