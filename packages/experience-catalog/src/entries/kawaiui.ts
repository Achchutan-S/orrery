import { defineExperience } from '@pu/platform-schema';

// Independent project, deployed and released on its own (ADR-008). Personal Universe
// only links to it; its source and deployment are never touched from this repository.
// Copy verified against the live site on 1 November 2026 (it calls itself "UI Lab").
export default defineExperience({
  kind: 'external',
  id: 'kawaiui',
  title: 'KawaiUI',
  summary: 'UI Lab, a museum of interface experiments in rooms: physics toys, motion, WebGL liquids, cursor tricks, games and a synth.',
  capabilities: ['interactive', 'multimedia', 'experimental'],
  tags: ['ui', 'motion', 'webgl', 'sound'],
  section: 'labs',
  headline: 'expressive',
  url: 'https://kawaiui.vercel.app/',
});
