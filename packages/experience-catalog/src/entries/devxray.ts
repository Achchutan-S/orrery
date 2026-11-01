import { defineExperience } from '@pu/platform-schema';

// Independent project, deployed and released on its own (ADR-008). Personal Universe
// only links to it; its source and deployment are never touched from this repository.
// Copy verified against the live site and its meta description on 1 November 2026.
export default defineExperience({
  kind: 'external',
  id: 'devxray',
  title: 'Dev X-Ray',
  summary: 'Developer tools that run in the browser: format, decode and convert JSON, GraphQL, YAML, SQL, JWTs and more, with no account and no upload.',
  capabilities: ['interactive', 'data'],
  tags: ['developer-tools', 'privacy', 'json', 'graphql'],
  section: 'engineering',
  headline: 'technical',
  url: 'https://devxray-one.vercel.app/',
});
