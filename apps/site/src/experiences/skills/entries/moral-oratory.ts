import type { SkillEntry } from '../types.ts';

export default {
  slug: 'moral-oratory',
  title: 'Moral Oratory',
  purpose: 'A demanding rhetoric coach and quotation verifier for public argument about democracy and constitutional rights.',
  shelf: 'rhetoric',
  tags: ['rhetoric', 'public speaking', 'verification', 'constitution', 'scripture'],
  artefact: 'tome',
  provenance: { kind: 'original', note: 'Written by the archive’s owner for their own practice. Its source is kept private (see Original source below); this page describes the method only.' },
  runs: { surfaces: ['claude-ai'], note: 'Written for Claude.ai: web search to verify quotations, and optional memory for spaced revision across sessions.' },

  why: 'Words have force when they are true, carefully reasoned and well delivered. The skill trains one speaker to argue strongly without fabricated sources or anger standing in for argument.',
  problem: 'A single fake verse or misattributed quote destroys a speaker’s credibility, and arguments that attack communities instead of documented acts lose every fair-minded listener.',
  useWhen: [
    'You want to verify a quotation or find a defensible passage for a point, across many religious and literary traditions.',
    'You are building or critiquing a speech, from two minutes to a lecture.',
    'You want lessons in rhetoric, delivery drills, or a structured twelve-week programme.',
  ],
  avoidWhen: [
    'You want agreement or applause: the skill is told that praising anger would fail its user.',
    'You want a quotation used regardless of whether it can be verified; unverified material is labelled unusable in public.',
  ],
  benefits: 'Someone learning to speak publicly on civic questions who wants to be precise, fair and hard to dismiss.',

  workflow: [
    { step: 'Pick the mode', detail: 'Diagnostic, lesson, quote work, contradiction check, epic mirror, assertive register, constitution bridge, speech build, critique, delivery drill, curriculum or notebook; each loads only the reference it needs.' },
    { step: 'Make the learner try first', detail: 'Before any model answer, the user drafts their own argument; critique comes next, a model last.' },
    { step: 'Verify every quotation', detail: 'Reliable editions, exact references, a quote card with original script, translation type, context, what it supports and what it does not establish, and a confidence rating.' },
    { step: 'Keep three layers apart', detail: 'The fact layer at its true confidence, the law layer from the Constitution and courts, and the moral layer from the traditions; a verse never makes something unconstitutional.' },
    { step: 'Build and self-critique', detail: 'A ten-part speech structure ending in precise questions and a concrete demand, then the critique rubric applied to its own draft.' },
  ],
  decisions: ['Which mode, or combination, the request needs.', 'For each claim: verified, corroborated, alleged, disputed or unverified, and how strongly it may be said.'],
  distinctive: [
    'It names the two failures it exists to prevent: fabricated or bent sources, and anger without argument.',
    'It steelmans the other side and teaches precise concession.',
    'It respects copyright: classical texts quoted freely, modern lyrics never reproduced.',
  ],
  inputs: ['A speech topic, a draft, a quotation to check, or a request for a lesson.'],
  outputs: ['Lessons with a short scored check, verified quote cards, critiques, and speech drafts with confidence labels kept in margin notes.'],
  dependencies: ['Web search, to verify sources.', 'Claude.ai memory (optional), for spaced revision.', 'Nine supporting reference and template files, not published here.'],
  limitations: ['Built around one person’s goals and current events; it is not a general-purpose debate tool.', 'Its source is not available from this archive.'],
  example: {
    invocation: 'Is this quote really from the Thirukkural?',
    request: 'Help me build a two-minute speech on the right to peaceful assembly. (A request written for this archive.)',
    outputShape: ['A request that the user draft an opening first', 'Critique of that draft', 'A verified passage with its quote card', 'The ten-part structure at about 280 words, with pause marks and confidence labels'],
    scenario: 'A learner pastes a viral quotation. The skill searches reliable editions, cannot verify it, and says not to use it in public, offering a verified passage on the same theme instead.',
  },
  related: [
    { slug: 'conceptcast', why: 'Another skill that teaches through challenge and correction.' },
    { slug: 'interview-quick-answer', why: 'The same rule of no fabrication, applied to interviews.' },
  ],
  portability: 'Not available to download. The source contains personal and political context that cannot be published unchanged, and the archive never edits an original.',
} satisfies SkillEntry;
