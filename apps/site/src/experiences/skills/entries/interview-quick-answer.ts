import type { SkillEntry } from '../types.ts';

export default {
  slug: 'interview-quick-answer',
  title: 'Interview Quick Answer',
  purpose: 'Answers technical interview questions in short, memorable points that a beginner follows and an expert cannot fault.',
  shelf: 'learning',
  tags: ['interviews', 'java', 'spring boot', 'explanation', 'analogies'],
  artefact: 'notebook',
  provenance: { kind: 'original', note: 'Written by the archive’s owner for their own interview preparation; the topic list follows their working stack.' },
  runs: { surfaces: ['claude-ai', 'claude-code'], note: 'Self-contained instructions; no tools required.' },

  why: 'Interview preparation happens under time pressure, and short answers that only make sense to someone who already knows them do not help. This skill keeps answers short where brevity helps and full where clarity needs room.',
  problem: 'Typical quick answers compress a concept into a slogan (“a stub gives fake inputs; a mock checks calls”) that is technically right but leaves a beginner asking: inputs to what? calls from where?',
  useWhen: [
    'Any “what is X”, “X vs Y”, “how does X work” or “how would you design or debug X” question during preparation.',
    'Rapid-fire batches of questions, each answered in order.',
    'Behavioural questions, where you need a structure to fill with your own story.',
  ],
  avoidWhen: [
    'You want a deep, long explanation (ConceptCast or Deep Dive Audio).',
    'You want a full system design walkthrough (System Design Prep).',
    'You want Claude to invent your project history: it is explicitly told never to.',
  ],
  benefits: 'Engineers preparing for interviews across Java, Spring Boot, WebFlux, React, Python, databases, testing, DevOps, GenAI and networking.',

  workflow: [
    { step: 'Classify the question', detail: 'Concept, comparison, scenario or behavioural; each has its own format.' },
    { step: 'Set the scene, then define', detail: 'Starts from a situation a beginner can picture, then names the term; plain words first, jargon second.' },
    { step: 'Teach with a story', detail: 'An analogy of two to four sentences in which every important part of the concept appears, and the mapping is named if it is not obvious.' },
    { step: 'Compress where it helps', detail: 'Bullets under fifteen words, a memory hook of eight words or fewer, and the two follow-ups an interviewer most naturally asks next.' },
    { step: 'Check silently', detail: 'An eight-point accuracy list: canonical definitions, look-alikes kept distinct, version-sensitive facts carry the version, no invented identifiers.' },
  ],
  decisions: ['Which of the four formats fits the question.', 'Whether a dictated term means what it sounds like (“jay unit” is JUnit) and showing the reading in the heading when it is not literal.'],
  distinctive: [
    '“Clarity beats brevity”: brevity lives in the bullets, table and hook, never in the definition.',
    'For behavioural questions it gives a STAR structure to fill in rather than a made-up story.',
    'It reads voice-typed questions in a software-interview context.',
  ],
  inputs: ['One question or a batch, typed or dictated. Say “short” for a compressed form.'],
  outputs: ['A formatted answer: What it is, key points or a comparison table, an analogy, an optional example, a memory hook, and two follow-ups with one-line answers.'],
  dependencies: ['None.'],
  limitations: ['Optimised for spoken interview answers, not for documentation or study notes.', 'The listed domains reflect one engineer’s stack; other domains work but are not called out.'],
  example: {
    invocation: 'mock vs stub',
    request: 'quick: 401 vs 403',
    outputShape: ['### 401 vs 403', 'What they are (2–4 plain sentences)', 'A 3–5 row comparison table', 'Analogy', 'Remember: a short hook', 'Follow-ups: two questions with one-line answers'],
    scenario: 'The night before an interview, a candidate fires off eight questions in one message. Each comes back in its own format, separated by a rule, with no introduction or closing.',
  },
  related: [
    { slug: 'system-design-prep', why: 'For the design round rather than the quick-fire one.' },
    { slug: 'conceptcast', why: 'When a topic needs an hour, not two minutes.' },
  ],
  claudeAiDescription: "Answers technical interview questions in short, clear, technically exact points with an analogy, a memory hook and follow-ups. Use for interview prep: what is X, X vs Y, how does X work.",
  portability: 'A single SKILL.md with no dependencies; it works in any Claude surface that supports skills.',
} satisfies SkillEntry;
