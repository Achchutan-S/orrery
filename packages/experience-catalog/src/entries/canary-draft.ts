import { defineExperience } from '@pu/platform-schema';

// Permanent leak-check fixture (blueprint task 16: never deleted, never promoted).
// The summary is a canary: if it appears in a production dist/, the build has leaked
// non-public metadata. The implementation folder carries its own canaries.
export const CANARY = 'PU-CANARY-7f3a9c';

export default defineExperience({
  kind: 'internal',
  id: 'canary-draft',
  title: 'Canary draft',
  summary: `${CANARY}-SUMMARY unpublished experience whose metadata must never ship.`,
  capabilities: ['content'],
  routes: [{ pattern: '/canary-draft', entrypoint: 'canary-draft/routes/index.astro' }],
  performanceClass: 'content',
});
