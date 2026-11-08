import { defineExperience } from '@pu/platform-schema';

// Divya Chakshu: a scroll-driven cinematic reading of Bhagavad Gita chapter 11, Arjuna's vision of
// the universal form. Raw WebGL2 scenes over a fully readable text; a CSS still for every sequence
// when WebGL, JavaScript or motion is unavailable (apps/site/src/experiences/divya-chakshu/README.md).
// Released by its entry in config/release.json. The narration is interpretation; every English
// verse is an adaptation written for this experience (content.ts states the rules).
export default defineExperience({
  kind: 'internal',
  id: 'divya-chakshu',
  title: 'Divya Chakshu',
  summary: 'The infinite revealed: Arjuna’s vision of the universal form in Bhagavad Gita chapter 11, as an immersive journey of light, scale and time.',
  capabilities: ['visualization', 'interactive', 'multimedia'],
  tags: ['bhagavad gita', 'sanskrit', 'webgl'],
  section: 'thinking',
  headline: 'literary',
  routes: [{ pattern: '/divya-chakshu', entrypoint: 'divya-chakshu/routes/index.astro' }],
  chrome: 'beacon',
  colorScheme: 'dark',
  performanceClass: 'immersive',
});
