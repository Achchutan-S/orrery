import { defineExperience } from '@pu/platform-schema';

// Phase 0 architecture test: a React app on enumerated catch-all paths with an in-app
// router, query-string state and a preview-only flag. Deleted in task 16.
export default defineExperience({
  kind: 'internal',
  id: 'sample-app',
  title: 'Release lifecycle explorer',
  summary: 'Step through the seven release states and see where each one is built. Sample interactive application.',
  capabilities: ['interactive'],
  tags: ['architecture'],
  section: 'engineering',
  headline: 'expressive',
  routes: [
    { pattern: '/sample-app', entrypoint: 'sample-app/routes/index.astro' },
    { pattern: '/sample-app/[...path]', entrypoint: 'sample-app/routes/app.astro' },
  ],
  chrome: 'beacon',
  colorScheme: 'dark',
  performanceClass: 'interactive',
  flags: {
    inspector: { description: 'Debug panel showing the parsed route and query state' },
  },
});
