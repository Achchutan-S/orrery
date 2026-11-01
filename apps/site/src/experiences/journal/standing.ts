// The five kinds of evidence a Journal passage can rest on.
export const STANDING = {
  intent: { label: 'Intent', meaning: 'Why the platform exists and what it is meant to become.' },
  implemented: { label: 'Implemented', meaning: 'Exists in the repository.' },
  verified: { label: 'Verified', meaning: 'Exists and passed its tests or checks.' },
  deployed: { label: 'Deployed', meaning: 'Observed on the live site.' },
  planned: { label: 'Planned', meaning: 'Designed in the blueprint, not built yet.' },
} as const;

export type Standing = keyof typeof STANDING;
