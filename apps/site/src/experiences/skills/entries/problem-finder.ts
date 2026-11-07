import type { SkillEntry } from '../types.ts';

export default {
  slug: 'problem-finder',
  title: 'Problem Finder',
  purpose: 'Finds evidenced, monetizable problems for a side project, or stress-tests an idea you already have, like an analyst would.',
  shelf: 'opportunity',
  tags: ['side projects', 'market research', 'validation', 'business', 'kill-checks'],
  artefact: 'ledger',
  provenance: { kind: 'original', note: 'Written by the archive’s owner; it began as a Claude Code slash command in August 2026 before becoming a skill.' },
  runs: { surfaces: ['claude-ai', 'claude-code'], note: 'Asks whether to use live web search first; recommended, and essential for mining a named source.' },

  why: 'Brainstorming “AI-powered X for Y” is easy and almost always useless. This skill looks for problems where money, time or effort is already being spent, and says plainly when a good tool is a weak business.',
  problem: 'Complaint lists confuse annoyance with demand, and a good idea can still fail on urgency, churn, a free chatbot substitute or an incumbent’s distribution.',
  useWhen: [
    '“What should I build?”, “find me a problem”, or mining a subreddit, forum or app-store reviews for pain points.',
    'Checking an existing idea: “is X a real business?”, “would anyone pay for this?”.',
    'Looking for side income without a problem in mind yet.',
  ],
  avoidWhen: [
    'You want what exists abroad but is missing in India (India Product Gap Finder).',
    'You want a generic list of startup ideas; it is told to refuse that shape.',
    'You need a competitor deep-dive or MVP plan; it offers those as a next step rather than doing them unprompted.',
  ],
  benefits: 'Solo builders deciding where to spend the next three months, and anyone who wants an idea honestly stress-tested.',

  workflow: [
    { step: 'Choose a mode', detail: 'Source-mining, domain-brainstorm or idea-check; idea-check skips straight to the market map and kill-checks.' },
    { step: 'Find signals, not complaints', detail: 'Workarounds, repeated questions, switching behaviour, money already flowing, and new enabling conditions; the last two are the strongest filters.' },
    { step: 'Root-cause each candidate', detail: 'From surface complaint through workflow, root cause, current workaround and existing products to the actual opportunity.' },
    { step: 'Map the market', detail: 'Incumbents, vertical tools, consultants, or very often Excel, WhatsApp or nothing at all.' },
    { step: 'Score and kill-check', detail: 'Evidence, why now, gap size and reachability, then seven business kill-checks; failing two or more keeps a candidate off the top.' },
    { step: 'Recommend', detail: 'Build now, investigate further, avoid for now, plus a rescue move that reattaches a weak idea to a group that already pays.' },
  ],
  decisions: ['Whether to use live search.', 'Which candidates survive the kill-checks.', 'The forced recommendation: one per bucket, not a list.'],
  distinctive: [
    'Seven kill-checks: urgency, measurable outcome, time-to-value against churn, novelty decay, chatbot substitution, distribution against an incumbent, and who pays.',
    'Every problem is tagged as solo-buildable or market-only, so gaps outside your stack stay visible.',
    'It ends by asking which one to dig into, then waits.',
  ],
  inputs: ['A source to mine, a domain, or an existing idea. Optionally: stay near a domain, or lean towards AI and backend work.'],
  outputs: ['A ranked list of five to ten problems, each with signal, root cause, incumbents, why now, monetization, a type tag, red flags and buildability.', 'A short “Recommended next move” section.'],
  dependencies: ['Web search (optional but recommended).'],
  limitations: [
    'Calibrated for its author: the instructions describe a backend and AI engineer working solo in India, and tag buildability against that skillset.',
    'Each run is stateless; it does not remember past runs.',
  ],
  example: {
    invocation: 'Find me a problem worth building around in r/smallbusiness',
    request: 'Is a WhatsApp bot that reminds gym members to renew a real business?',
    outputShape: ['Market map with live search for look-alikes', 'The one or two kill-checks it fails hardest, first', 'A rescue move naming a specific adjacent group', 'A one-line question about what to dig into next'],
    scenario: 'A developer brings an idea built for themselves. The skill finds incumbents, shows it fails on chatbot substitution and churn, and proposes pointing the same engine at a group with a deadline and a budget.',
  },
  related: [
    { slug: 'india-product-gap-finder', why: 'Its sibling: gaps by comparison with a working global reference.' },
    { slug: 'wayfinder', why: 'Planning the build once a problem is chosen.' },
  ],
  claudeAiDescription: "Finds real, monetizable problems worth a side project (signals, root cause, market map, scoring, kill-checks), or stress-tests an idea you already have.",
  portability: 'A single SKILL.md; works anywhere, best with web search.',
} satisfies SkillEntry;
