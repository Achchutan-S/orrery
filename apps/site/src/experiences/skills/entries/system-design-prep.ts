import type { SkillEntry } from '../types.ts';

export default {
  slug: 'system-design-prep',
  title: 'System Design Prep',
  purpose: 'Runs a phase-by-phase system design interview session and ends with a Q&A reference document you can rehearse from.',
  shelf: 'engineering',
  tags: ['system design', 'interviews', 'architecture', 'trade-offs', 'study notes'],
  artefact: 'blueprint',
  provenance: { kind: 'original', note: 'Written by the archive’s owner after working through Ticketmaster end to end; the output format is the one that session tested and preferred. Its worked example was edited for publication (see Original source).' },
  runs: { surfaces: ['claude-ai', 'claude-code'], note: 'Written for Claude.ai’s file tools (it asks for an actual markdown file); in Claude Code the same file is written to disk. Study mode may use web search.' },

  why: 'System design rounds reward a method more than an answer, and that method needs practice in the right order. The skill keeps the order, lets you speak first, and turns the session into notes worth keeping.',
  problem: 'Self-study tends to jump straight to boxes and arrows, skip the maths, and repeat last week’s answer for a system whose hard problem is different.',
  useWhen: [
    '“/system-design Ticketmaster”, or any request to practise a design round phase by phase.',
    'You have notes or a transcript and want gaps found and a reference document made.',
    'You name an unfamiliar system with no attempt of your own and want to learn it first (study mode).',
  ],
  avoidWhen: [
    'You want a one-paragraph answer to a single concept (Interview Quick Answer).',
    'You are designing a real production system: this is interview practice, tuned for how interviewers grade.',
  ],
  benefits: 'Candidates preparing for system design interviews, from first attempts to mock rounds.',

  workflow: [
    { step: 'Pick the mode', detail: 'Build (you dictate your attempt), review (find gaps in existing notes), study (Claude writes the ideal design) or an optional mock round.' },
    { step: 'Walk the phases', detail: 'Scope and requirements, core entities, APIs, high-level design, database and schema, then deep dives, letting you dictate each phase before noting what is missing.' },
    { step: 'Do the maths aloud', detail: 'DAU to actions per day to average QPS to a peak multiplier to storage, narrated step by step, because the method is what is graded.' },
    { step: 'Apply trade-offs inline', detail: 'Checks references/tradeoffs-cheatsheet.md before any “why X over Y”: SQL vs NoSQL, push vs pull, strong vs eventual consistency, and more.' },
    { step: 'Name the distinctive hard problem', detail: 'IRCTC’s is quota allocation and a waitlist that reorders on cancellation, not just seat locking.' },
    { step: 'Close the gaps', detail: 'Writes the reference file: the interviewer’s question, a full first-person ideal answer, and a one-line “Your note” on what you covered.' },
  ],
  decisions: ['Which mode applies, asked only when the message does not make it obvious.', 'Which one to three deep dives carry the most interview signal for this system.'],
  distinctive: [
    'The output leads with the interviewer’s question, not a verdict on the candidate.',
    'Ideal answers are written to be said verbatim, in the first person.',
    'A self-check closes the document: one line per question, to say aloud in under thirty seconds.',
  ],
  inputs: ['A system name, optionally with your own attempt or existing notes.'],
  outputs: ['In build and review modes: a markdown Q&A reference with “Your note” lines and a self-check list.', 'In study mode: phase-by-phase study notes and three to five likely follow-up questions.'],
  dependencies: ['File creation, to save the reference document.', 'Web search (optional, study mode).', 'Two reference files: references/tradeoffs-cheatsheet.md and references/output-format-example.md.'],
  limitations: ['Mentions Claude.ai file tools by name (create_file, present_files); other surfaces substitute their own.', 'Tuned for interviews, not real architecture reviews.'],
  example: {
    invocation: '/system-design IRCTC',
    request: 'Duolingo system design. I have never looked at it.',
    outputShape: ['Study notes, phase by phase: requirements, entities, APIs, HLD, schema', 'Deep dive on the distinctive problem (spaced repetition, adaptive difficulty)', 'Three to five follow-up questions an interviewer would ask', 'An offer to switch into build mode'],
    scenario: 'After practising Ticketmaster, a candidate moves to IRCTC. The skill reuses the same phases and cheatsheet but steers the deep dive towards quota-based allocation and a reordering waitlist.',
  },
  related: [
    { slug: 'interview-quick-answer', why: 'For the concept questions that come up inside a design round.' },
    { slug: 'conceptcast', why: 'Hearing the trade-offs argued out loud before a mock round.' },
  ],
  claudeAiDescription: "Runs a phase-by-phase system design interview session (requirements, entities, APIs, HLD, schema, deep dives) and writes a Q&A reference doc. Use for /system-design or design-round prep.",
  portability: 'SKILL.md and two reference files. It asks for a saved file, so it works best where Claude can create files.',
} satisfies SkillEntry;
