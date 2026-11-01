import { defineExperience } from '@pu/platform-schema';

// Phase 0 architecture test: a static essay that must ship no JavaScript. Deleted in task 16.
export default defineExperience({
  kind: 'internal',
  id: 'sample-content',
  title: 'How a page reaches you',
  summary: 'A short essay on how this site decides what gets built and published. Sample static content.',
  capabilities: ['content'],
  tags: ['architecture'],
  section: 'thinking',
  headline: 'literary',
  routes: [{ pattern: '/sample-content', entrypoint: 'sample-content/routes/index.astro' }],
  performanceClass: 'content',
});
