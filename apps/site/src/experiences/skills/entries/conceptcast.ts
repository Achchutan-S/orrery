import type { SkillEntry } from '../types.ts';

export default {
  slug: 'conceptcast',
  title: 'ConceptCast',
  purpose: 'Turns any topic into a researched two-voice podcast in which a curious Host and an Expert build understanding together.',
  shelf: 'learning',
  tags: ['podcast', 'dialogue', 'text-to-speech', 'teaching', 'research'],
  artefact: 'book',
  featured: true,
  provenance: { kind: 'original', note: 'Written by the archive’s owner as a companion to Deep Dive Audio, which it names and deliberately does not borrow from.' },
  runs: { surfaces: ['claude-ai', 'claude-code'], note: 'Needs web search for the research step; without it the skill says the script comes from existing knowledge.' },

  why: 'A monologue read aloud explains a subject; a good conversation lets you watch someone come to understand it. ConceptCast exists to produce the second kind of episode: one where the learner’s confusion, wrong turns and corrections are part of the lesson.',
  problem: 'Most “podcast” scripts are lectures with speaker labels pasted on, where the host only says “tell me more”. Listeners hear answers but never the reasoning that makes them stick.',
  useWhen: [
    'You want to learn a topic by listening, on a walk or a commute, and prefer a dialogue to a single narrator.',
    'The subject has tempting misconceptions or surprising outcomes worth discovering rather than being told.',
    'You are preparing for an interview or exam and want the trade-offs and edge cases argued out loud.',
  ],
  avoidWhen: [
    'You want one narrator. That is Deep Dive Audio’s job, and ConceptCast is told not to imitate it.',
    'You need a short written answer, a summary or notes to read: the output is a full spoken script.',
    'You cannot check sources and the topic turns on recent facts; the skill will say it is working from memory, which limits it.',
  ],
  benefits: 'Learners who think by questioning, and anyone who wants a long, accurate episode they can feed straight into a multi-voice text-to-speech tool.',

  workflow: [
    { step: 'Set the scope', detail: 'Works out the real learning goal and audience level, chooses a scope itself for broad topics, and asks one question only if an ambiguity would change the whole episode.' },
    { step: 'Research', detail: 'Roughly five to eight searches for a focused concept, ten to twenty for a broad one; primary sources preferred; headline examples checked against official documentation.' },
    { step: 'Map the concepts privately', detail: 'Prerequisites, dependencies, common misconceptions (which become the Host’s plausible mistakes), surprising outcomes (which become prediction exercises), and rules of thumb versus guarantees.' },
    { step: 'Write in stages', detail: 'Opens on a real problem, lays foundations, develops concepts one at a time through question, example, edge case and refinement, then connects them and applies them to real situations.' },
    { step: 'Write for the ear', detail: 'Numbers and symbols spelled as spoken, code described aloud rather than printed, a standalone “…” line for each pause, and no tables or links inside the dialogue.' },
    { step: 'Check before delivering', detail: 'A final quality list: does every Host line earn its place, are predictions set up fairly, are guarantees kept apart from rules of thumb?' },
  ],
  decisions: [
    'Whether the topic needs one episode or a series with stated boundaries.',
    'Where to place the two to four prediction moments, only where intuition actually fails.',
    'For each important claim: is it a strict guarantee or a rule of thumb with conditions?',
  ],
  distinctive: [
    'The Host is written to be wrong in useful ways: incomplete mental models, plausible mistakes and noticed contradictions that the Expert resolves by addressing the reasoning, not just the question.',
    'Prediction exercises state the setup assumptions their outcome depends on, so the reveal separates the fixed mechanism from setup-dependent results.',
    'Examples are judged against the documented contract of an API or specification, not against what a name suggests.',
  ],
  inputs: ['A topic, optionally with an audience, depth, interview or exam context.', 'Web search, for the research step.'],
  outputs: ['A complete script with spoken chapter headings and bold **Host:** / **Expert:** labels, ready for text-to-speech.', 'An optional code companion for technical topics, then sources and further reading.'],
  dependencies: ['Web search (optional, but the script is weaker without it).', 'A text-to-speech tool of your choice to listen to the result.'],
  limitations: [
    'Long by design: a focused concept is about 2,500 to 3,000 words, and broad subjects become a series.',
    'For programming examples it is told to prefer Java and Spring Boot.',
    'It produces a script, not audio.',
  ],
  example: {
    invocation: '/conceptcast composition over inheritance',
    request: 'Make me a ConceptCast episode on composition over inheritance. I have an interview on Friday.',
    outputShape: ['One or two scope lines', 'Episode title', 'Chapter One. [spoken heading], then Host and Expert turns', 'Further chapters, each building on the last', 'Final Chapter. Putting It All Together', 'Optional code companion', 'Sources and further reading'],
    scenario: 'A developer heading into an interview asks for an episode on a design principle. The Host proposes that inheritance is simply bad, the Expert shows where that model is right and where it breaks, and a prediction exercise asks what a counting subclass of a collection actually counts.',
  },
  related: [
    { slug: 'deep-dive-audio', why: 'The single-narrator sibling for the same listening habit.' },
    { slug: 'interview-quick-answer', why: 'The two-minute version when the interview is tomorrow.' },
  ],
  portability: 'One self-contained SKILL.md. It works anywhere Claude can search the web; without search it still runs and says so.',
} satisfies SkillEntry;
