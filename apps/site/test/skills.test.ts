// The Claude Skills Archive: content rules, source integrity, packages, search, and what a
// preview build emits. Browser behaviour (copy, downloads, keyboard, axe) is in
// test-browser/skills.test.ts.
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { after, before, describe, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { preview } from 'astro';
import { parseCatalog } from '@pu/experience-catalog';
import { evaluate, fileFindings, measure } from '@pu/checks/budgets';
import { checkSkill, sha256, type Manifest } from '../src/experiences/skills/integrity.ts';
import { matches } from '../src/experiences/skills/search.ts';
import { SHELVES } from '../src/experiences/skills/shelves.ts';
import type { SkillEntry } from '../src/experiences/skills/types.ts';
import { CLAUDE_AI_DESCRIPTION_MAX, declaredOf, PRIVATE, validateLibrary } from '../src/experiences/skills/validate.ts';
import { zip } from '../src/experiences/skills/zip.ts';

const root = fileURLToPath(new URL('../', import.meta.url));
const dir = join(root, 'src/experiences/skills');
const sourceDir = join(dir, 'source');
const manifest = JSON.parse(readFileSync(join(sourceDir, 'manifest.json'), 'utf8')) as Manifest;
const tmp = mkdtempSync(join(tmpdir(), 'pu-skills-'));
after(() => rmSync(tmp, { recursive: true, force: true }));

const filesUnder = (d: string) => new Map(existsSync(d)
  ? readdirSync(d, { recursive: true, withFileTypes: true }).filter((e) => e.isFile())
    .map((e) => { const rel = join(e.parentPath, e.name).slice(d.length + 1).split('\\').join('/'); return [rel, new Uint8Array(readFileSync(join(d, rel)))] as const; })
  : []);
const sources = () => new Map(readdirSync(sourceDir, { withFileTypes: true }).filter((e) => e.isDirectory()).map((e) => [e.name, filesUnder(join(sourceDir, e.name))]));
let entries: SkillEntry[];
before(async () => {
  entries = await Promise.all(readdirSync(join(dir, 'entries')).map(async (f) => (await import(join(dir, 'entries', f))).default as SkillEntry));
});
const clone = <T>(x: T): T => structuredClone(x);
const unzip = (...args: string[]) => spawnSync('unzip', args, { encoding: 'buffer' });

describe('content and integrity (no build)', () => {
  test('the ten skills, each with an editorial entry and a manifest record; the real content has no problems', () => {
    assert.deepEqual(entries.map((e) => e.slug).sort(), [
      'conceptcast', 'deep-dive-audio', 'india-product-gap-finder', 'interview-quick-answer', 'moral-oratory',
      'problem-finder', 'sidequest', 'system-design-prep', 'vedic-astrology-tamil', 'wayfinder',
    ]);
    assert.deepEqual(Object.keys(manifest.skills).sort(), entries.map((e) => e.slug).sort());
    assert.deepEqual(validateLibrary(entries, manifest, SHELVES, sources()), []);
  });

  test('every published copy matches its recorded SHA-256 and size; nothing unrecorded sits in source/', () => {
    for (const [slug, entry] of Object.entries(manifest.skills)) {
      const present = filesUnder(join(sourceDir, slug));
      assert.deepEqual(checkSkill(slug, entry, present), [], slug);
      for (const f of entry.files) assert.equal(sha256(present.get(f.path)!), f.sha256, `${slug}/${f.path}`);
    }
  });

  test('a changed byte, a missing file and an extra file are each caught', () => {
    const entry = manifest.skills.sidequest!;
    const present = filesUnder(join(sourceDir, 'sidequest'));
    const changed = new Map(present);
    const bytes = Uint8Array.from(changed.get('SKILL.md')!);
    bytes[bytes.length - 2]! ^= 1;
    changed.set('SKILL.md', bytes);
    assert.match(checkSkill('sidequest', entry, changed).join('\n'), /SKILL\.md: SHA-256 .* does not match/);
    const missing = new Map(present); missing.delete('scripts/quest.py');
    assert.match(checkSkill('sidequest', entry, missing).join('\n'), /scripts\/quest\.py: in the manifest but missing/);
    const extra = new Map(present); extra.set('notes.md', new Uint8Array([1]));
    assert.match(checkSkill('sidequest', entry, extra).join('\n'), /notes\.md: in source\/ but not in the manifest/);
  });

  test('withheld sources are absent from the repository copy: moral-oratory entirely, vedic-astrology-tamil\'s scripts', () => {
    assert.ok(!existsSync(join(sourceDir, 'moral-oratory')));
    assert.deepEqual([...filesUnder(join(sourceDir, 'vedic-astrology-tamil')).keys()], ['SKILL.md']);
    assert.equal(manifest.skills['moral-oratory']!.files.length, 0);
    assert.ok(manifest.skills['moral-oratory']!.withheld!.reason.length > 40);
    assert.deepEqual(manifest.skills['vedic-astrology-tamil']!.withheld!.paths, ['scripts/ashtakavarga.py', 'scripts/calculate_chart.py', 'scripts/chart_analysis.py', 'scripts/today_view.py']);
  });

  test('the collected skill carries its upstream MIT notice, marked as added by the archive', () => {
    const w = manifest.skills.wayfinder!;
    assert.deepEqual(w.added?.map((a) => a.path), ['LICENSE.txt']);
    assert.match(readFileSync(join(sourceDir, 'wayfinder/LICENSE.txt'), 'utf8'), /^MIT License\n\nCopyright \(c\) 2026 Matt Pocock\n/);
    const e = entries.find((x) => x.slug === 'wayfinder')!;
    assert.equal(e.provenance.kind, 'collected');
    assert.equal(e.provenance.upstream?.licence, 'MIT');
  });

  test('invalid metadata is reported, not published: unknown shelf, missing related, empty fields, collected without upstream, two featured', () => {
    const bad = clone(entries);
    const pick = (slug: string) => bad.find((e) => e.slug === slug)!;
    pick('conceptcast').shelf = 'attic';
    pick('sidequest').related = [{ slug: 'no-such-skill', why: 'x' }];
    pick('problem-finder').why = '  ';
    pick('problem-finder').useWhen = [];
    pick('wayfinder').provenance = { kind: 'collected', note: 'x' };
    pick('deep-dive-audio').featured = true;
    const problems = validateLibrary(bad, manifest, SHELVES, sources()).join('\n');
    for (const expected of ['unknown shelf "attic"', 'related skill "no-such-skill" does not exist', 'problem-finder: why is empty', 'problem-finder: useWhen needs at least one item', 'collected skill must name its upstream', 'exactly one entry is featured']) {
      assert.ok(problems.includes(expected), `${expected}\n${problems}`);
    }
  });

  test('Claude.ai\'s 200-character limit: every over-long original has a separate compliant description; the original is untouched', () => {
    const long: string[] = [];
    for (const e of entries) {
      const md = sources().get(e.slug)?.get('SKILL.md');
      const d = md && declaredOf(Buffer.from(md).toString('utf8'));
      if (!d || d.description.length <= CLAUDE_AI_DESCRIPTION_MAX) continue;
      long.push(e.slug);
      assert.ok(e.claudeAiDescription && e.claudeAiDescription.length <= CLAUDE_AI_DESCRIPTION_MAX, e.slug);
      assert.notEqual(e.claudeAiDescription, d.description, e.slug);
    }
    assert.deepEqual(long.sort(), ['deep-dive-audio', 'india-product-gap-finder', 'interview-quick-answer', 'problem-finder', 'sidequest', 'system-design-prep', 'vedic-astrology-tamil']);
    const missing = clone(entries); delete missing.find((e) => e.slug === 'sidequest')!.claudeAiDescription;
    assert.match(validateLibrary(missing, manifest, SHELVES, sources()).join('\n'), /sidequest: SKILL\.md's description is 552 characters; add a claudeAiDescription/);
    const tooLong = clone(entries); tooLong.find((e) => e.slug === 'sidequest')!.claudeAiDescription = 'x'.repeat(201);
    assert.match(validateLibrary(tooLong, manifest, SHELVES, sources()).join('\n'), /sidequest: claudeAiDescription must be/);
    const quoted = clone(entries); quoted.find((e) => e.slug === 'sidequest')!.claudeAiDescription = "it's";
    assert.match(validateLibrary(quoted, manifest, SHELVES, sources()).join('\n'), /without single quotes/);
  });

  test('an empty or unknown shelf, and an entry without a manifest record, fail', () => {
    const shelves = [...SHELVES, { id: 'empty', name: 'Empty', call: 'EM', blurb: 'Nothing here.' }];
    assert.match(validateLibrary(entries, manifest, shelves, sources()).join('\n'), /shelf "empty" is empty/);
    const m = clone(manifest); delete m.skills.conceptcast;
    assert.match(validateLibrary(entries, m, SHELVES, sources()).join('\n'), /entries\/conceptcast: no entry in source\/manifest\.json/);
  });

  test('private strings are refused wherever they appear: entries, manifest and source files', () => {
    for (const leak of ['/Users/someone/.claude/skills', '~/.claude/skills/synced/x', 'skill_01C8MkXEmqjPsNXUdSkQaELD', 'c5194207-f570-4f25-be81-deebb6baadd6', 'someone@gmail.com']) {
      assert.ok(PRIVATE.some(({ pattern }) => pattern.test(leak)), leak);
      const bad = clone(entries);
      bad[0]!.why = `see ${leak}`;
      assert.match(validateLibrary(bad, manifest, SHELVES, sources()).join('\n'), /contains/, leak);
    }
    const m = clone(manifest); m.skills.conceptcast!.origin = '/Users/me/.claude/skills/synced';
    assert.match(validateLibrary(entries, m, SHELVES, sources()).join('\n'), /origin names a machine path/);
  });
});

describe('search', () => {
  test('every word must appear; case and accents are ignored; an empty query matches everything', () => {
    const hay = 'Interview Quick Answer interview-quick-answer Java Spring Boot Café';
    assert.ok(matches(hay, ''));
    assert.ok(matches(hay, '   '));
    assert.ok(matches(hay, 'spring INTERVIEW'));
    assert.ok(matches(hay, 'cafe'));
    assert.ok(!matches(hay, 'spring python'));
  });
});

describe('ZIP packages', () => {
  test('a package unzips to the skill folder with every relative path and byte intact, deterministically', (t) => {
    if (spawnSync('unzip', ['-v']).status !== 0) { t.skip('unzip is not installed'); return; }
    const files = [...filesUnder(join(sourceDir, 'sidequest'))].map(([path, data]) => ({ path: `sidequest/${path}`, data }));
    const bytes = zip(files, '2026-10-02');
    assert.deepEqual(zip(files, '2026-10-02'), bytes, 'same input, same bytes');
    const file = join(tmp, 'sidequest.zip');
    writeFileSync(file, bytes);
    assert.equal(unzip('-tq', file).status, 0, unzip('-t', file).stdout.toString());
    assert.deepEqual(unzip('-Z1', file).stdout.toString().trim().split('\n').sort(), ['sidequest/SKILL.md', 'sidequest/config.json', 'sidequest/scripts/quest.py']);
    for (const f of files) assert.deepEqual(new Uint8Array(unzip('-p', file, f.path).stdout), f.data, f.path);
  });
});

describe('preview build', () => {
  let out: string;
  let files: string[];
  const text = (f: string) => readFileSync(join(out, f), 'utf8');
  before(() => {
    out = join(tmp, 'preview');
    const r = spawnSync(process.execPath, [join(root, 'node_modules/astro/bin/astro.mjs'), 'build', '--outDir', out], { cwd: root, encoding: 'utf8', env: { ...process.env, VERCEL_ENV: 'preview' } });
    assert.equal(r.status, 0, r.stdout + r.stderr);
    files = readdirSync(out, { recursive: true }).map(String).filter((f) => f.startsWith('skills') && /\.\w+$/.test(f)).sort();
  });

  test('routes: landing, guide, one page per shelf and per skill, the card; files and packages exactly as published', () => {
    const pages = ['skills.html', 'skills/guide.html', ...SHELVES.map((s) => `skills/shelf/${s.id}.html`), ...entries.map((e) => `skills/${e.slug}.html`)];
    const raw = Object.entries(manifest.skills).flatMap(([slug, m]) => [...m.files, ...(m.added ?? [])].map((f) => `skills/${slug}/files/${f.path}`));
    const zips = Object.entries(manifest.skills).filter(([, m]) => m.files.length > 0 && !m.withheld).map(([slug]) => `skills/${slug}/package.zip`);
    assert.deepEqual(files, [...pages, ...raw, ...zips, 'skills/og.png'].sort());
    assert.ok(!zips.includes('skills/vedic-astrology-tamil/package.zip') && !zips.includes('skills/moral-oratory/package.zip'));
  });

  test('every served file is byte-identical to the published copy', () => {
    for (const [slug, m] of Object.entries(manifest.skills)) {
      for (const f of [...m.files, ...(m.added ?? [])]) {
        assert.equal(sha256(readFileSync(join(out, `skills/${slug}/files/${f.path}`))), f.sha256, `${slug}/${f.path}`);
      }
    }
  });

  test('every built package unzips to the published files at their relative paths', (t) => {
    if (spawnSync('unzip', ['-v']).status !== 0) { t.skip('unzip is not installed'); return; }
    for (const f of files.filter((x) => x.endsWith('package.zip'))) {
      const slug = f.split('/')[1]!;
      const m = manifest.skills[slug]!;
      const zipPath = join(out, f);
      assert.equal(unzip('-tq', zipPath).status, 0, f);
      const expected = [...m.files, ...(m.added ?? [])].map((x) => `${slug}/${x.path}`).sort();
      assert.deepEqual(unzip('-Z1', zipPath).stdout.toString().trim().split('\n').sort(), expected, f);
      for (const x of [...m.files, ...(m.added ?? [])]) assert.equal(sha256(unzip('-p', zipPath, `${slug}/${x.path}`).stdout), x.sha256, `${f}: ${x.path}`);
    }
  });

  test('the source viewer\'s text is the file, character for character (what Copy takes)', () => {
    const unescape = (s: string) => s.replace(/<[^>]+>/g, '').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;|&#x27;/g, "'").replace(/&amp;/g, '&');
    for (const [slug, m] of Object.entries(manifest.skills)) {
      const html = text(`skills/${slug}.html`);
      for (const f of [...m.files, ...(m.added ?? [])]) {
        const id = `src-${slug}-${f.path.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}`;
        const inner = html.match(new RegExp(`<code id="${id}" data-text>([^]*?)</code></pre>`))?.[1];
        assert.ok(inner !== undefined, `${slug}: ${f.path} has a viewer`);
        assert.equal(sha256(Buffer.from(unescape(inner!), 'utf8')), f.sha256, `${slug}/${f.path} renders exactly`);
      }
    }
  });

  test('the compliant description is offered beside the original, labelled as the archive\'s, only where needed', () => {
    for (const e of entries) {
      const html = text(`skills/${e.slug}.html`);
      if (e.claudeAiDescription) {
        assert.match(html, /This line is written by the archive, not by the skill’s author\./, e.slug);
        assert.ok(html.includes(`<code id="desc-${e.slug}" translate="no">description: '`), e.slug);
      } else assert.doesNotMatch(html, /data-limit/, e.slug);
    }
  });

  test('withheld skills: no download, no package, the reason on the page', () => {
    const mo = text('skills/moral-oratory.html');
    assert.doesNotMatch(mo, /\/skills\/moral-oratory\/files\//);
    assert.doesNotMatch(mo, /package\.zip/);
    assert.match(mo, /Withheld: 10 files/);
    const vat = text('skills/vedic-astrology-tamil.html');
    assert.match(vat, /href="\/skills\/vedic-astrology-tamil\/files\/SKILL\.md" download="SKILL\.md"/);
    assert.doesNotMatch(vat, /vedic-astrology-tamil\/package\.zip/);
    assert.doesNotMatch(vat, /files\/scripts\//);
  });

  test('no machine path, account or skill id, or personal address anywhere in the archive\'s output', () => {
    for (const f of files) {
      const body = readFileSync(join(out, f)).toString('utf8');
      for (const { pattern, what } of PRIVATE) assert.doesNotMatch(body, pattern, `${f} contains ${what}`);
    }
  });

  test('pages: CSP, no inline style attributes, one Beacon, unlisted drafts are noindex, the archive\'s own card', () => {
    for (const f of files.filter((x) => x.endsWith('.html'))) {
      const html = text(f);
      assert.match(html, /<meta http-equiv="content-security-policy"/, f);
      assert.doesNotMatch(html, /\sstyle="/, f);
      assert.ok(html.includes('pu-palette-template'), `${f}: the Beacon`);
      assert.match(html, /<meta name="robots" content="noindex">/, f);
      assert.match(html, /<meta property="og:image" content="http:\/\/localhost:4321\/skills\/og\.png">/, f);
      assert.equal(html.match(/<h1[\s>]/g)?.length, 1, `${f}: one h1`);
    }
    assert.equal(readFileSync(join(out, 'skills/og.png')).readUInt32BE(16), 1200);
  });

  test('within the interactive budget, and every emitted file is accounted for', () => {
    const { experiences } = parseCatalog();
    const all = readdirSync(out, { recursive: true }).map(String).filter((f) => /\.\w+$/.test(f)).map((path) => {
      const bytes = readFileSync(join(out, path));
      return { path, bytes, text: bytes.toString('utf8') };
    });
    const measured = measure(all, experiences);
    const pages = measured.filter((p) => p.owner === 'skills');
    assert.equal(pages.length, files.filter((f) => f.endsWith('.html')).length);
    const { findings } = evaluate(pages, experiences);
    assert.deepEqual(findings, []);
    assert.deepEqual(fileFindings(all, measured, experiences).filter((f) => f.file.startsWith('skills')), []);
  });

  test('served: unknown skills, shelves and files are real 404s', async () => {
    const server = await preview({ root, outDir: out, logLevel: 'error', server: { port: 0 } });
    try {
      const status = async (p: string) => (await fetch(`http://localhost:${server.port}${p}`)).status;
      assert.equal(await status('/skills'), 200);
      assert.equal(await status('/skills/sidequest'), 200);
      assert.equal(await status('/skills/no-such-skill'), 404);
      assert.equal(await status('/skills/shelf/attic'), 404);
      assert.equal(await status('/skills/vedic-astrology-tamil/files/scripts/calculate_chart.py'), 404);
      assert.equal(await status('/skills/moral-oratory/files/SKILL.md'), 404);
    } finally {
      await server.stop();
    }
  });
});
