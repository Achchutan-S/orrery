import { defineExperience } from '@pu/platform-schema';

// Permanent CSS isolation fixture: its stylesheet sets `* { all: unset }` in its own
// experience layer. Browser tests prove no other experience changes. Never promote.
export default defineExperience({
  kind: 'internal',
  id: 'sample-hostile',
  title: 'Hostile stylesheet',
  summary: 'Test fixture whose stylesheet unsets every property on every element, to prove styles cannot leak between experiences.',
  capabilities: ['content'],
  routes: [{ pattern: '/sample-hostile', entrypoint: 'sample-hostile/routes/index.astro' }],
  performanceClass: 'content',
});
