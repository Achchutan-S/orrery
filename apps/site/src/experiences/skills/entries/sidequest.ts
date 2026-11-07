import type { SkillEntry } from '../types.ts';

export default {
  slug: 'sidequest',
  title: 'Side Quest',
  purpose: 'A daily game for learning something far outside your field, with realms, rarity rolls, XP, badges and a monthly journal.',
  shelf: 'exploration',
  tags: ['learning', 'habits', 'game', 'curiosity', 'memory'],
  artefact: 'journal',
  provenance: { kind: 'original', note: 'Written by the archive’s owner; it began as a pair of Claude Code slash commands in August 2026 and grew a game engine.' },
  runs: { surfaces: ['claude-ai'], note: 'Written for Claude.ai: it runs a Python engine in the code-execution container and saves progress with Claude.ai’s memory tools.' },

  why: 'Breadth makes better thinking, but “learn something new every day” dies quickly as a guilt-driven streak. This skill makes it a small game that celebrates coming back and never scolds a skipped day.',
  problem: 'Habit trackers punish gaps, and language models are bad at keeping score: cooldowns, probabilities and points drift when the model computes them itself.',
  useWhen: [
    '“Quest me”, “today’s quest”, “/sidequest”, or “give me something to learn outside tech”.',
    '“Reroll” to dodge today’s realm, once a day.',
    '“How am I doing on quests?” for the monthly Adventurer’s Journal.',
  ],
  avoidWhen: [
    'You want to learn about software, AI or your job: those topics are excluded on purpose.',
    'Memory is off or you are in an incognito chat; it still runs but cannot save progress, and says so.',
  ],
  benefits: 'People who want a light, playful daily habit of curiosity outside their profession.',

  workflow: [
    { step: 'Roll', detail: 'The engine (scripts/quest.py) picks a realm from eight, rolls rarity, checks cooldowns and decides whether today is an Echo day.' },
    { step: 'Write the quest card', detail: 'Claude invents a subtopic unlike recent ones, a format (Read, Watch, Listen, Do, Quiz-Recall, Reflect-Discuss), a hook that targets something you half-know, a task and a two-minute speedrun.' },
    { step: 'Collect the loot', detail: 'After you engage, one line of takeaway in your own words, optionally with “what could this connect to?”.' },
    { step: 'Log and save', detail: 'The engine scores the entry; Claude appends one line to the memory file /areas/sidequest.md and compacts it when the engine asks.' },
    { step: 'Celebrate', detail: 'The engine’s XP receipt, level, title, progress bar and any new badges, verbatim; a skip gets one kind line and nothing else.' },
  ],
  decisions: ['Echo day or ordinary quest, decided by the engine.', 'The creative choices: subtopic, format, hook and task, which belong to Claude.'],
  distinctive: [
    'An engine and creative split: the script owns every number, and Claude is told never to recompute one.',
    'Echo days resurface old takeaways and ask what connects them.',
    'Rarity changes ambition: a Legendary quest is meant to be the thing you tell people at dinner years later.',
  ],
  inputs: ['A message like “quest me”, your local date, and later one line of takeaway.'],
  outputs: ['A quest card (realm, rarity, format, hook, task, speedrun, reward), then an XP receipt and badges.', 'Monthly: completion, a calendar, a realm map, the badge shelf and one unearthed old takeaway.'],
  dependencies: [
    'Code execution with Python 3 (the engine is standard library only).',
    'Claude.ai memory tools: memory_read, memory_write and memory_append.',
    'config.json and scripts/quest.py beside SKILL.md.',
  ],
  limitations: ['It locates its engine under /mnt/skills, the Claude.ai skills mount; other surfaces need that path changed.', 'Progress lives in one memory file; without memory there is no save.'],
  example: {
    invocation: '/sidequest',
    request: 'quest me',
    outputShape: ['⚖️ THE MARKET SQUARE · 🔵 Rare · 📜 Scroll', 'A hook sentence', '🎯 Quest, ⚡ Speedrun (2 min), 💰 Reward, 🎲 Fate token', 'One line of Game Master flavour, then it waits'],
    scenario: 'On a weekday morning someone asks for a quest and rolls a Rare in the Observatory. They come back with a one-line takeaway, which the engine scores and Claude saves; the month’s journal later resurfaces it on an Echo day.',
  },
  related: [
    { slug: 'deep-dive-audio', why: 'Turn a quest you loved into a full episode.' },
    { slug: 'vedic-astrology-tamil', why: 'The other skill here with real computation behind the conversation.' },
  ],
  claudeAiDescription: "A daily game for learning outside your field: a 30-minute quest with rarity rolls, XP, levels and badges, plus a monthly journal. Use for /sidequest, \"quest me\" or a quest review.",
  portability: 'Download the whole folder: SKILL.md, config.json and scripts/quest.py. As written it expects Claude.ai with code execution and memory; it is not portable to Claude Code without changes.',
} satisfies SkillEntry;
