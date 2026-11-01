import { defineExperience } from '@pu/platform-schema';

// The front page at `/` (task 14). It lists every other public experience from
// publicDiscoveryIndex(); it is listed itself only so `/` is indexed and the Beacon finds it.
export default defineExperience({
  kind: 'internal',
  id: 'index',
  title: 'Orrery',
  summary: 'An index of independent work: writing, tools and experiments, each built and set in its own way.',
  capabilities: ['content'],
  routes: [{ pattern: '/', entrypoint: 'index/routes/index.astro' }],
  chrome: 'beacon',
  performanceClass: 'content',
});
