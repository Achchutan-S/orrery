import type { SkillEntry } from '../types.ts';

export default {
  slug: 'deep-dive-audio',
  title: 'Deep Dive Audio',
  purpose: 'Turns a topic into a researched, story-shaped script for one listener, written to be heard through text-to-speech.',
  shelf: 'learning',
  tags: ['audio', 'explainer', 'text-to-speech', 'research', 'storytelling'],
  artefact: 'scroll',
  provenance: { kind: 'original', note: 'Written by the archive’s owner; the older of the two listening skills.' },
  runs: { surfaces: ['claude-ai', 'claude-code'], note: 'Needs web search; two reference files are loaded while it writes.' },

  why: 'Reading is not always possible, but walking, commuting and training are hours you could spend learning. This skill writes the thing you press play on: a friend who did the homework, explaining it to you personally.',
  problem: 'Text written for the page sounds wrong aloud. Tables, links, parentheses and symbols trip a text-to-speech voice, and an information dump loses a listener who cannot scroll back.',
  useWhen: [
    'You say “explain X like a podcast”, “something I can listen to” or “narrate this for me”.',
    'You want to learn a whole topic end to end: a technology, an empire, a company, a scientific idea.',
    'You will listen with your eyes closed and need every term explained before it is used.',
  ],
  avoidWhen: [
    'You want a two-voice conversation (that is ConceptCast).',
    'You want a research report with citations in the body: sources only appear at the end.',
    'You need a quick reference to scan; the output is continuous spoken prose.',
  ],
  benefits: 'Curious listeners who learn best from a well-told story, and anyone who wants long-form learning they can do away from a screen.',

  workflow: [
    { step: 'Find the real question', detail: '“Kafka” from a backend engineer means how it works and why everyone uses it. It picks the most useful reading, states it in one line, and asks only when two very different subjects share a name.' },
    { step: 'Research invisibly', detail: 'About five searches for a narrow concept, ten to twenty for a large field; primary sources; any claim the script leans on is cross-checked, and dates are watched.' },
    { step: 'Curate', detail: 'Chooses the twenty or thirty things that build understanding out of a hundred that could be said, and plans the teaching order privately.' },
    { step: 'Choose an arc', detail: 'A technology, a historical era, a company and a scientific idea each get a different story shape from references/topic-playbooks.md.' },
    { step: 'Write for the ear', detail: 'Follows references/spoken-style.md: short and medium sentences, spoken signposts like “Part Three. Why Everyone Adopted It.”, numbers written as said.' },
    { step: 'Fit the length to the subject', detail: 'At about 150 words a minute: 5 to 10 minutes for a narrow concept, 15 to 25 for a substantial topic, episodes beyond about 6,000 words.' },
  ],
  decisions: ['How deep to go, read from signals like “quick” or “exhaustive”.', 'Which topic playbook fits, or which two to blend.', 'Whether to split into labelled episodes rather than cut depth.'],
  distinctive: [
    'A guiding line it repeats: research deeply, think structurally, explain simply, write conversationally, make it enjoyable to listen to.',
    'It ends with three to seven points that compress the topic into a mental model, not a summary of every section.',
    'A final self-check asks whether someone could follow it with their eyes closed.',
  ],
  inputs: ['A topic, with any depth signal (“five minutes”, “in depth”).', 'Web search.'],
  outputs: ['A titled script in parts with spoken headings, a short recap of key points, a closing line, then sources and further reading.'],
  dependencies: ['Web search.', 'Its two reference files: references/spoken-style.md and references/topic-playbooks.md.'],
  limitations: ['No code blocks, tables or emoji in the body, by design.', 'It writes a script; producing audio is up to your text-to-speech tool.'],
  example: {
    invocation: 'Deep dive on how mRNA vaccines work, something I can listen to on my run',
    request: 'Explain the rise of the Chola empire like a podcast. About twenty minutes.',
    outputShape: ['A one-line note on the angle taken, if one was chosen', 'Title and a short spoken introduction', 'Part One. … Part Two. … as many parts as needed', '“Before you move on, remember these few things.” with 3 to 7 points', 'A closing sentence or two', 'Sources and further reading'],
    scenario: 'Someone about to walk for half an hour asks for a historical era. The script opens with why it matters, follows the historical playbook from the world before to the turning points, and ends with a short mental model rather than a list of kings.',
  },
  related: [
    { slug: 'conceptcast', why: 'The same listening habit, as a dialogue.' },
    { slug: 'sidequest', why: 'A daily nudge towards topics worth a deep dive.' },
  ],
  claudeAiDescription: "Turns any topic into a researched, story-shaped script for text-to-speech, like a personal podcast episode. Use for /listen, \"explain X like a podcast\" or anything to listen to.",
  portability: 'SKILL.md plus two reference files in references/. Keep the folder intact: the instructions point at those paths.',
} satisfies SkillEntry;
