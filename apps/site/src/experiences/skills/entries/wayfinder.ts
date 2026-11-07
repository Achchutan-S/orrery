import type { SkillEntry } from '../types.ts';

export default {
  slug: 'wayfinder',
  title: 'Wayfinder',
  purpose: 'Plans work too big for one agent session as a map of decision tickets on an issue tracker, resolved one per session.',
  shelf: 'engineering',
  tags: ['planning', 'issue tracker', 'agents', 'decisions', 'matt pocock'],
  artefact: 'map',
  provenance: {
    kind: 'collected',
    note: 'Written by Matt Pocock and published in his skills collection; this copy was uploaded to the owner’s Claude.ai account. It differs from the current upstream file, which has since been revised (for example, upstream now sets disable-model-invocation: true).',
    upstream: { label: 'mattpocock/skills', href: 'https://github.com/mattpocock/skills', licence: 'MIT' },
  },
  runs: { surfaces: ['claude-code'], note: 'Written for Claude Code working in a repository with an issue tracker, subagents and Matt Pocock’s companion skills.' },

  why: 'Some efforts arrive as a loose idea wrapped in fog: too large for one session and unclear about the route. Wayfinder charts the route first, as decisions, before anyone builds.',
  problem: 'Large, vague work tends to be either charged at directly or over-planned into tickets nobody can yet specify. Both lose the thread across sessions.',
  useWhen: [
    'An idea is too big for one session and the way to the destination is not yet visible.',
    'You want a shared, durable map that several sessions, or people, can work from in parallel.',
    'The destination is a decision, a spec or an in-place change, not yet the build itself.',
  ],
  avoidWhen: [
    'The journey fits in one session; the skill itself says to stop and ask instead of making a map.',
    'You have no issue tracker and do not want the local-markdown fallback.',
    'You want the work done now: Wayfinder plans, and the pull to “just do it” is its signal to hand off.',
  ],
  benefits: 'Developers leading multi-session efforts with coding agents, and anyone who needs decisions recorded where collaborators can see them.',

  workflow: [
    { step: 'Name the destination', detail: 'A grilling and domain-modelling session settles what the map is finding its way to, which fixes the scope.' },
    { step: 'Map the frontier breadth-first', detail: 'Surfaces open decisions and first steps; if no fog appears, there is no need for a map.' },
    { step: 'Create the map', detail: 'One issue labelled wayfinder:map with Destination, Notes, an empty Decisions-so-far index, Not yet specified and Out of scope.' },
    { step: 'Create and wire tickets', detail: 'Child issues typed research, prototype, grilling or task, each sized to one session; blocking edges wired in a second pass.' },
    { step: 'Work one ticket per session', detail: 'Claim it by assignment, resolve it, post the answer as a comment, close it, and add a one-line pointer to the map.' },
    { step: 'Clear the fog', detail: 'Graduate newly specifiable questions into tickets, and close anything that turns out to lie beyond the destination.' },
  ],
  decisions: ['Fog or ticket: can the question be stated precisely now, whether or not it can be answered?', 'Human-in-the-loop or AFK for each ticket type.', 'Whether a ticket sits past the destination and should be ruled out of scope.'],
  distinctive: [
    'The map is an index, not a store: each decision lives in exactly one ticket.',
    'Everything is referred to by name, never by a bare ticket number.',
    'A human-in-the-loop ticket resolves only through the human; an agent that answers its own grilling questions has broken it.',
  ],
  inputs: ['A loose idea (to chart a map), or an existing map’s URL or number (to work it).'],
  outputs: ['A map issue and child decision tickets with blocking edges.', 'Per session: one resolved ticket, its resolution comment and an updated map.'],
  dependencies: [
    'An issue tracker configured for the repository (or the local-markdown fallback).',
    'Matt Pocock’s companion skills, which this archive does not include: setup-matt-pocock-skills, grilling, domain-modeling, prototype and research.',
    'Subagents, for research tickets.',
  ],
  limitations: ['Not portable on its own: it calls companion skills from the same upstream collection.', 'This copy predates later upstream revisions.'],
  example: {
    invocation: '/wayfinder migrate our billing data model to multi-currency',
    request: 'Chart a map for replacing our hand-rolled auth with a provider. I don’t know yet which one.',
    outputShape: ['A map issue: Destination, Notes, Decisions so far (empty), Not yet specified, Out of scope', 'Child tickets labelled wayfinder:research, :prototype, :grilling or :task', 'Research subagents started for each research ticket', 'Stop: charting is one session’s work'],
    scenario: 'A team lead starts a large migration. Session one charts the map and fires research tickets; later sessions each take the first frontier ticket, resolve one decision and graduate the fog it clears.',
  },
  related: [
    { slug: 'system-design-prep', why: 'Practising the design thinking the map’s tickets call for.' },
    { slug: 'problem-finder', why: 'Deciding what is worth charting a map for at all.' },
  ],
  portability: 'Only SKILL.md (with the upstream MIT notice added). It expects Matt Pocock’s companion skills and a configured issue tracker; install those from github.com/mattpocock/skills for it to work as written.',
} satisfies SkillEntry;
