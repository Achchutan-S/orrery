// A fixed release state for tests that assert one specific combination: exact front-page
// layout, exact leak-scan and smoke fixtures, the resume as an owner-only draft. They use this
// instead of config/release.json, so publishing or withdrawing something does not break them.
// Tests of the real configuration read config/release.json and derive their expectations from
// it (docs/runbooks/checks.md § Real and synthetic release tests). Never read by the build.
import type { ReleaseState } from '@pu/platform-schema';

// Functions, not shared objects: each entry must be its own copy, so a test can edit one.
const draft = () => ({ lifecycle: 'draft', access: { kind: 'owner' }, discoverability: 'unlisted', flags: {} }) as const;
const published = () => ({ lifecycle: 'published', access: { kind: 'public' }, discoverability: 'listed', flags: {} }) as const;

export const fixtureRelease = (): ReleaseState => ({
  platform: { flags: {} },
  experiences: {
    index: published(),
    journal: published(),
    kawaiui: published(),
    devxray: published(),
    'sample-content': published(),
    'sample-app': { ...published(), flags: { inspector: { preview: true, production: false } } },
    resume: draft(),
    'canary-draft': draft(),
    'sample-hostile': draft(),
  },
} as ReleaseState);
