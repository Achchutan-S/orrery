// The archive's data at build time: the editorial entries, the exact original files and their
// manifest, joined and validated. Any problem fails the build (validate.ts lists the rules).
// Imported only from frontmatter and routes, never from browser code.
import type { Manifest, ManifestSkill } from './integrity.ts';
import { sha256 } from './integrity.ts';
import manifestJson from './source/manifest.json';
import { SHELVES } from './shelves.ts';
import type { Shelf, SkillEntry } from './types.ts';
import { declaredOf, validateLibrary } from './validate.ts';

const manifest = manifestJson as Manifest;
const entryModules = import.meta.glob<SkillEntry>('./entries/*.ts', { eager: true, import: 'default' });
// The originals, as text exactly as stored (Vite's ?raw reads the file without transforming it).
const rawFiles = import.meta.glob<string>(['./source/**/*', '!./source/manifest.json'], { eager: true, query: '?raw', import: 'default' });

export type PublishedFile = {
  path: string;
  text: string;
  sha256: string;
  bytes: number;
  lines: number;
  /** Set when the copy was edited for publication: what changed, and the original's SHA-256. */
  edited?: { originalSha256: string; note: string };
  /** Top-level sections of a Markdown file, as character ranges of `text`, for copying one. */
  sections: { title: string; start: number; end: number }[];
};
export type Skill = SkillEntry & {
  shelfInfo: Shelf;
  call: string;
  source: ManifestSkill;
  files: PublishedFile[];
  /** The skill's own frontmatter `name` and `description`, read from its SKILL.md when published. */
  declared?: { name: string; description: string };
};

const sourcesBySkill = new Map<string, Map<string, Uint8Array>>();
const textOf = new Map<string, string>();
for (const [key, text] of Object.entries(rawFiles)) {
  const [slug, ...rest] = key.replace(/^\.\/source\//, '').split('/');
  const path = rest.join('/');
  if (!sourcesBySkill.has(slug!)) sourcesBySkill.set(slug!, new Map());
  sourcesBySkill.get(slug!)!.set(path, Buffer.from(text, 'utf8'));
  textOf.set(`${slug}/${path}`, text);
}

const entries = Object.entries(entryModules).map(([file, e]) => {
  const expected = file.replace(/^\.\/entries\/|\.ts$/g, '');
  if (e.slug !== expected) throw new Error(`skills: ${file} declares slug "${e.slug}"; the file name says "${expected}"`);
  return e;
});
const problems = validateLibrary(entries, manifest, SHELVES, sourcesBySkill);
if (problems.length > 0) throw new Error(`skills archive content is invalid:\n  ${problems.join('\n  ')}`);

/** Markdown sections at heading level 1–2, outside fenced code; the frontmatter is its own section. */
function sectionsOf(text: string): PublishedFile['sections'] {
  const out: PublishedFile['sections'] = [];
  let offset = 0;
  let fenced = false;
  const starts: { title: string; start: number }[] = [];
  const lines = text.split('\n');
  if (lines[0] === '---') {
    const close = lines.indexOf('---', 1);
    if (close > 0) {
      const end = lines.slice(0, close + 1).join('\n').length + 1;
      out.push({ title: 'Frontmatter', start: 0, end });
    }
  }
  for (const line of lines) {
    if (/^\s*(```|~~~)/.test(line)) fenced = !fenced;
    const m = !fenced && line.match(/^#{1,2}\s+(.+)$/);
    if (m) starts.push({ title: m[1]!.replace(/[*_`]/g, ''), start: offset });
    offset += line.length + 1;
  }
  starts.forEach((s, i) => out.push({ title: s.title, start: s.start, end: i + 1 < starts.length ? starts[i + 1]!.start : text.length }));
  return out;
}

const order = new Map(SHELVES.map((s, i) => [s.id, i]));
const byShelf = [...entries].sort((a, b) => order.get(a.shelf)! - order.get(b.shelf)! || a.title.localeCompare(b.title));
const counters = new Map<string, number>();

export const skills: readonly Skill[] = byShelf.map((e) => {
  const shelfInfo = SHELVES.find((s) => s.id === e.shelf)!;
  const n = (counters.get(e.shelf) ?? 0) + 1;
  counters.set(e.shelf, n);
  const source = manifest.skills[e.slug]!;
  const file = ({ path, edited }: ManifestSkill['files'][number]): PublishedFile => {
    const text = textOf.get(`${e.slug}/${path}`)!;
    const bytes = Buffer.from(text, 'utf8');
    return {
      path, text, sha256: sha256(bytes), bytes: bytes.length, edited,
      lines: text.split('\n').length - (text.endsWith('\n') ? 1 : 0),
      sections: path.endsWith('.md') ? sectionsOf(text) : [],
    };
  };
  const files = source.files.map(file);
  const skill = files.find((f) => f.path === 'SKILL.md');
  return {
    ...e, shelfInfo, source, files,
    call: `${shelfInfo.call}·${String(n).padStart(2, '0')}`,
    declared: skill && declaredOf(skill.text),
  };
});

export const skillBySlug = (slug: string) => skills.find((s) => s.slug === slug);
export const shelves = SHELVES.map((s) => ({ ...s, skills: skills.filter((k) => k.shelf === s.id) }));
export const featured = skills.find((s) => s.featured)!;
/** Most recently updated first; ties by title. Dates come from the source, never invented. */
export const recent = [...skills].sort((a, b) => b.source.updated.localeCompare(a.source.updated) || a.title.localeCompare(b.title));
export const totals = {
  skills: skills.length,
  shelves: SHELVES.length,
  files: skills.reduce((n, s) => n + s.source.files.length, 0),
  lines: skills.reduce((n, s) => n + s.files.reduce((m, f) => m + f.lines, 0), 0),
};

/** Human date, in English, from YYYY-MM-DD (UTC, so the build machine's zone cannot shift it). */
export const longDate = (day: string) => new Date(`${day}T00:00:00Z`).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });

export const SURFACE_LABEL = { 'claude-ai': 'Claude.ai', 'claude-code': 'Claude Code' } as const;
