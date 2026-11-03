import { defineExperience } from '@pu/platform-schema';

// Permanent regression fixture (ADR-021; owner decision, 2 November 2026): the only React
// island, on enumerated catch-all paths with an in-app router, query-string state, a
// preview-only flag and an error boundary. Published so the production checks (React only on
// island pages, the interactive budget, the leak scan) run against real island output.
// Do not delete it in task 16 or later unless its coverage moves to another island first.
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
