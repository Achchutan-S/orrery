import type { SkillEntry } from '../types.ts';

export default {
  slug: 'india-product-gap-finder',
  title: 'India Product Gap Finder',
  purpose: 'Finds products that already work elsewhere but have no serious Indian equivalent, across software and physical goods.',
  shelf: 'opportunity',
  tags: ['india', 'import substitution', 'market gaps', 'manufacturing', 'research'],
  artefact: 'atlas',
  provenance: { kind: 'original', note: 'Written by the archive’s owner as a sibling to Problem Finder, which it names to keep the two apart.' },
  runs: { surfaces: ['claude-ai', 'claude-code'], note: 'Depends on live web search: it calls itself close to useless without it, because Indian market presence changes faster than training data.' },

  why: 'Pain-point mining misses a different kind of opportunity: something already proven abroad that nobody makes or sells properly in India yet, from a SaaS tool to a chemical or a machine part.',
  problem: '“X for India” lists rarely check whether a local player exists three states away, or why a gap exists at all. Some gaps are walls, not openings.',
  useWhen: [
    '“What doesn’t exist in India yet?”, localisation or import-substitution ideas.',
    'Scanning an industry (farm equipment, specialty chemicals, dev tools) for an unclaimed Indian market.',
    'Comparing explicitly against a foreign market.',
  ],
  avoidWhen: [
    'The real question is “what is annoying people?” (Problem Finder).',
    'You cannot use web search; every candidate would be marked unverified.',
  ],
  benefits: 'Founders and builders in India, including those who would need a manufacturing or regulatory partner for what they find.',

  workflow: [
    { step: 'Establish scope', detail: 'Industry anchor, sourcing direction (global scan, local signals or both) and product breadth; asks only what is missing.' },
    { step: 'Source candidates from both ends', detail: 'Abroad: YC batches, Product Hunt, trade-show lists, HS-code categories. At home: import volumes, “why is there no Indian X”, IndiaMART listings that are all resellers.' },
    { step: 'Verify the gap', detail: 'Searches Indian marketplaces and directories, and separates no presence, imports-only, and weak local players.' },
    { step: 'Root-cause the gap', detail: 'Regulatory, capital, know-how, raw materials, nascent demand, tariffs, distribution, or genuinely untried; and whether that driver still holds.' },
    { step: 'Score and recommend', detail: 'Gap confidence, barrier type and height, demand evidence and why now; then build now, investigate, avoid.' },
  ],
  decisions: ['Which sourcing direction to run.', 'Whether a gap is an absence, an imports-only market or a competitive gap.', 'Whether the reason for the gap is still true today.'],
  distinctive: [
    'The core move is comparison against a working global reference, not complaint mining.',
    'Barrier icons make the cost of entry visible at a glance: regulatory, capital-heavy, know-how, distribution-only, demand-nascent.',
    'It flags who would need to build each candidate: solo, a manufacturing partner, or a regulatory partner.',
  ],
  inputs: ['A domain (or fully open), a sourcing direction and a product breadth.', 'Web search.'],
  outputs: ['Five to ten ranked candidates with reference market, gap status and evidence, root cause, barrier type, product type and who would need to build it.', 'A forced recommendation and a question about what to dig into next.'],
  dependencies: ['Web search (effectively required).'],
  limitations: ['Calibrated for its author: the instructions describe a backend and AI engineer in India, while keeping physical and capital-heavy categories in scope.', 'Stateless: each run starts fresh.'],
  example: {
    invocation: 'Find me a product gap in Indian farm equipment',
    request: 'What specialty chemicals are big abroad but only imported here?',
    outputShape: ['Ranked candidates: product, reference market, gap status, root cause, barrier icon, product type, who would build it', 'Recommended next move: build now, investigate further, avoid for now', 'One line asking which to dig into'],
    scenario: 'A builder curious about manufacturing names a category. The skill finds candidates with high import volumes and only reseller listings locally, then marks which are blocked by certification and which only need distribution.',
  },
  related: [
    { slug: 'problem-finder', why: 'The pain-point counterpart.' },
    { slug: 'deep-dive-audio', why: 'Learning an unfamiliar industry before scanning it.' },
  ],
  claudeAiDescription: "Finds products that work elsewhere but have no serious Indian equivalent, across software and physical goods. Use for India market gaps, localization or import-substitution ideas.",
  portability: 'A single SKILL.md. Install anywhere, but run it with web search on.',
} satisfies SkillEntry;
