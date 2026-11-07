// Every rule the archive's content must satisfy, as one pure function. The build runs it
// (library.ts throws on any problem, so a bad entry fails `astro build`) and the tests run it on
// the real files and on broken copies of them.
import { checkSkill, type Manifest } from './integrity.ts';
import type { Shelf, SkillEntry } from './types.ts';

/** Text that must never be published: machine paths, account and sync ids, personal mail. */
export const PRIVATE: readonly { pattern: RegExp; what: string }[] = [
  { pattern: /\/Users\/[A-Za-z]|\\Users\\[A-Za-z]|\/home\/[a-z]/, what: 'a home-directory path' },
  { pattern: /~\/\.claude\/skills\/synced|\.claude\/plugins\/cache/, what: 'a local Claude install path' },
  { pattern: /skill_01[A-Za-z0-9]{10,}|plugin_01[A-Za-z0-9]{10,}/, what: 'a Claude.ai skill or plugin id' },
  { pattern: /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i, what: 'a UUID (account sync folders are named by them)' },
  { pattern: /[A-Za-z0-9._%+-]+@(?:gmail|yahoo|outlook|hotmail)\.com/i, what: 'a personal email address' },
];

export const privacyProblems = (label: string, text: string) =>
  PRIVATE.filter(({ pattern }) => pattern.test(text)).map(({ what }) => `${label}: contains ${what}`);

const nonEmpty = (s: unknown) => typeof s === 'string' && s.trim().length > 0;

/** Claude.ai's help page limit for an uploaded skill's description (support article 12512198, read 7 November 2026). */
export const CLAUDE_AI_DESCRIPTION_MAX = 200;

/** The `name` and `description` a SKILL.md declares in its frontmatter (single-line values). */
export function declaredOf(text: string): { name: string; description: string } | undefined {
  const m = text.match(/^---\n([^]*?)\n---\n/);
  if (!m) return undefined;
  const field = (k: string) => (m[1]!.match(new RegExp(`^${k}:\\s*(.*)$`, 'm'))?.[1]?.trim() ?? '').replace(/^"([^]*)"$/, '$1').replace(/\\"/g, '"');
  return { name: field('name'), description: field('description') };
}

export function validateLibrary(
  entries: readonly SkillEntry[],
  manifest: Manifest,
  shelves: readonly Shelf[],
  /** slug -> relative path -> bytes, as present under source/. */
  sources: ReadonlyMap<string, ReadonlyMap<string, Uint8Array>>,
): string[] {
  const problems: string[] = [];
  const slugs = new Set(entries.map((e) => e.slug));
  const shelfIds = new Set(shelves.map((s) => s.id));
  if (slugs.size !== entries.length) problems.push('two entries share a slug');

  for (const e of entries) {
    const at = `entries/${e.slug}`;
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(e.slug)) problems.push(`${at}: slug is not lowercase-hyphenated`);
    if (!shelfIds.has(e.shelf)) problems.push(`${at}: unknown shelf "${e.shelf}"`);
    for (const k of ['title', 'purpose', 'why', 'problem', 'benefits', 'portability'] as const) if (!nonEmpty(e[k])) problems.push(`${at}: ${k} is empty`);
    for (const k of ['useWhen', 'avoidWhen', 'workflow', 'inputs', 'outputs', 'limitations', 'distinctive', 'dependencies'] as const) {
      if (!Array.isArray(e[k]) || e[k].length === 0) problems.push(`${at}: ${k} needs at least one item`);
    }
    if (e.purpose.length > 140) problems.push(`${at}: purpose is ${e.purpose.length} characters; keep it to one line (140)`);
    if (!nonEmpty(e.example?.invocation) || !nonEmpty(e.example?.request) || !nonEmpty(e.example?.scenario) || !e.example?.outputShape?.length) {
      problems.push(`${at}: example needs an invocation, a request, an output shape and a scenario`);
    }
    if (e.runs.surfaces.length === 0) problems.push(`${at}: runs.surfaces is empty`);
    if (e.provenance.kind === 'collected' && !e.provenance.upstream) problems.push(`${at}: a collected skill must name its upstream source and licence`);
    for (const r of e.related) {
      if (r.slug === e.slug) problems.push(`${at}: relates to itself`);
      else if (!slugs.has(r.slug)) problems.push(`${at}: related skill "${r.slug}" does not exist`);
    }
    problems.push(...privacyProblems(at, JSON.stringify(e)));
    if (!manifest.skills[e.slug]) problems.push(`${at}: no entry in source/manifest.json`);
    // Claude.ai's upload limit: an over-long original gets a separate, compliant description here.
    const skillMd = sources.get(e.slug)?.get('SKILL.md');
    const declared = skillMd && declaredOf(Buffer.from(skillMd).toString('utf8'));
    const alt = e.claudeAiDescription;
    if (declared && declared.description.length > CLAUDE_AI_DESCRIPTION_MAX && !nonEmpty(alt)) {
      problems.push(`${at}: SKILL.md's description is ${declared.description.length} characters; add a claudeAiDescription of at most ${CLAUDE_AI_DESCRIPTION_MAX}`);
    }
    if (alt !== undefined && (alt.length > CLAUDE_AI_DESCRIPTION_MAX || /['\n<>]/.test(alt) || !nonEmpty(alt))) {
      problems.push(`${at}: claudeAiDescription must be 1–${CLAUDE_AI_DESCRIPTION_MAX} characters on one line, without single quotes or angle brackets (it is pasted as a single-quoted YAML value)`);
    }
  }
  for (const slug of Object.keys(manifest.skills)) if (!slugs.has(slug)) problems.push(`source/manifest.json: "${slug}" has no editorial entry`);
  for (const s of shelves) if (!entries.some((e) => e.shelf === s.id)) problems.push(`shelf "${s.id}" is empty; remove it or shelve a skill there`);
  if (entries.filter((e) => e.featured).length !== 1) problems.push('exactly one entry is featured');

  for (const [slug, entry] of Object.entries(manifest.skills)) {
    const present = sources.get(slug) ?? new Map<string, Uint8Array>();
    problems.push(...checkSkill(slug, entry, present));
    problems.push(...privacyProblems(`source/manifest.json ${slug}`, JSON.stringify(entry)));
    for (const [path, bytes] of present) problems.push(...privacyProblems(`source/${slug}/${path}`, Buffer.from(bytes).toString('utf8')));
  }
  for (const slug of sources.keys()) if (!manifest.skills[slug]) problems.push(`source/${slug}: a folder with no manifest entry`);
  return problems;
}
