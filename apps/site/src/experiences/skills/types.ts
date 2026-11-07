// The editorial layer of the Skills Archive: what this archive says about a skill. It never holds
// the skill itself; the original files live, unmodified, under source/<slug>/ (integrity.ts).

/** The look of a skill's artefact on the shelf. Each skill has its own. */
export type Artefact = 'book' | 'tome' | 'scroll' | 'notebook' | 'blueprint' | 'map' | 'ledger' | 'atlas' | 'journal' | 'palmleaf';
export type Surface = 'claude-ai' | 'claude-code';

export type SkillEntry = {
  slug: string;
  /** Display name. The skill's own `name` stays in its SKILL.md. */
  title: string;
  /** One line: what it is for. */
  purpose: string;
  shelf: string;
  tags: string[];
  artefact: Artefact;
  featured?: boolean;
  provenance: {
    kind: 'original' | 'collected';
    /** Who wrote it and what it builds on, in a sentence. */
    note: string;
    upstream?: { label: string; href: string; licence: string };
  };
  /** Where it was written to run, and what that depends on. */
  runs: { surfaces: Surface[]; note: string };

  // Understanding
  why: string;
  problem: string;
  useWhen: string[];
  avoidWhen: string[];
  benefits: string;

  // How it works (read from the source, explained)
  workflow: { step: string; detail: string }[];
  decisions: string[];
  distinctive: string[];
  inputs: string[];
  outputs: string[];
  dependencies: string[];
  limitations: string[];

  // Practical use: examples written for this archive, never recorded runs
  example: {
    invocation: string;
    request: string;
    outputShape: string[];
    scenario: string;
  };

  related: { slug: string; why: string }[];
  /** Before-download warnings: what the skill needs that a ZIP cannot carry. */
  portability: string;
  /**
   * Written by this archive, never part of the skill: a description of at most 200 characters for
   * Claude.ai's custom-skill upload, required when the original's is longer (validate.ts). The
   * original SKILL.md, its download and its ZIP keep their own description unchanged.
   */
  claudeAiDescription?: string;
};

export type Shelf = { id: string; name: string; call: string; blurb: string };
