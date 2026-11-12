// A History of Seeing without a browser: the atlas is complete, the catalog routes match the
// chapters that exist, every citation, source, font and image has its record and its file, the
// relationship map and comparisons only name what exists, and the pure geometry behaves.
import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { describe, test } from 'node:test';
import seeingEntry, { SEEING_CHAPTERS } from '../../../packages/experience-catalog/src/entries/seeing.ts';
import { BUILT_SUBJECTS, PARTS, SUBJECTS, neighbours } from '../src/experiences/seeing/data/atlas.ts';
import { FONTS, IMAGES } from '../src/experiences/seeing/data/assets.ts';
import { PAIRS } from '../src/experiences/seeing/data/pairs.ts';
import { KINDS, NODES, RELATIONS } from '../src/experiences/seeing/data/relations.ts';
import { SOURCES } from '../src/experiences/seeing/data/sources.ts';
import { CITE, citer, type ChapterText } from '../src/experiences/seeing/house/text.ts';
import { wrapPolygon } from '../src/experiences/seeing/chapters/art-nouveau/stem.ts';
import { DEFAULT_EYE, draw, project } from '../src/experiences/seeing/chapters/renaissance/perspective.ts';
import { PARAMS, PRESETS, nearest, windowSvg } from '../src/experiences/seeing/lab/window.ts';

const dir = new URL('../src/experiences/seeing/', import.meta.url);
const read = (p: string) => readFileSync(new URL(p, dir), 'utf8');
const walk = (p: string): string[] => readdirSync(new URL(p, dir), { withFileTypes: true })
  .flatMap((e) => (e.isDirectory() ? walk(`${p}${e.name}/`) : [`${p}${e.name}`]));
const files = walk('');
const text = files.filter((f) => /\.(ts|astro|css)$/.test(f)).map(read).join('\n');
const chapters = await Promise.all(BUILT_SUBJECTS.map(async (s) => ({ id: s.id, c: (await import(new URL(`chapters/${s.id}/content.ts`, dir).href)).default as ChapterText })));

describe('the atlas', () => {
  test('keeps the full scope: 17 movements, 7 interiors, 22 internet aesthetics', () => {
    const count = (p: string) => SUBJECTS.filter((s) => s.part === p).length;
    assert.deepEqual([count('history'), count('spaces'), count('internet')], [17, 7, 22]);
    assert.equal(new Set(SUBJECTS.map((s) => s.id)).size, 46);
    assert.equal(PARTS.length, 4);
  });

  test('the nine prototype chapters are built, each with its own folder, page, content and styles', () => {
    assert.deepEqual(BUILT_SUBJECTS.map((s) => s.id), ['gothic', 'renaissance', 'art-nouveau', 'bauhaus', 'brutalism', 'wabi-sabi', 'cyberpunk', 'frutiger-aero', 'weirdcore']);
    for (const s of BUILT_SUBJECTS) for (const f of ['index.astro', 'content.ts', 'chapter.css']) assert.ok(existsSync(new URL(`chapters/${s.id}/${f}`, dir)), `${s.id}/${f}`);
    assert.deepEqual(readdirSync(new URL('chapters/', dir)).sort(), BUILT_SUBJECTS.map((s) => s.id).sort(), 'no folder for an unbuilt chapter');
  });

  test('the catalog routes exactly the built chapters', () => {
    assert.deepEqual([...SEEING_CHAPTERS], BUILT_SUBJECTS.map((s) => s.id));
    const patterns = (seeingEntry as { routes: { pattern: string }[] }).routes.map((r) => r.pattern);
    for (const id of SEEING_CHAPTERS) assert.ok(patterns.includes(`/seeing/${id}`), id);
  });

  test('previous and next walk the built chapters in canonical order', () => {
    assert.equal(neighbours('gothic').previous, undefined);
    assert.equal(neighbours('gothic').next?.id, 'renaissance');
    assert.equal(neighbours('weirdcore').next, undefined);
  });
});

describe('editorial integrity', () => {
  test('every chapter has each layer, is marked draft, and has works and a recognition line', () => {
    for (const { id, c } of chapters) {
      assert.equal(c.status, 'draft', id);
      assert.ok(c.encounter.length >= 2, `${id} encounter`);
      assert.ok(c.understand.length >= 3, `${id} understand`);
      assert.ok(c.study.length >= 2, `${id} study`);
      assert.ok(c.works.length >= 3 && c.recognise.length > 40, `${id} works and recognise`);
    }
  });

  test('every citation names a recorded source, and every recorded source is cited', () => {
    const prose = [
      ...chapters.flatMap(({ c }) => [...c.encounter, ...c.understand.flatMap((b) => b.text), ...c.study.flatMap((b) => b.text)]),
      ...PAIRS.flatMap((p) => [p.takeaway, ...p.rows.flatMap((r) => [r.a, r.b])]),
      ...[...text.matchAll(/rich\('((?:[^'\\]|\\.)*)'\)/g)].map((m) => m[1]!),
    ];
    const cited = new Set(prose.flatMap((p) => [...p.matchAll(CITE)].map((m) => m[1]!)));
    for (const r of RELATIONS) r.sources.forEach((x) => cited.add(x));
    const known = new Set(SOURCES.map((x) => x.id));
    for (const id of cited) assert.ok(known.has(id), `unknown source ${id}`);
    for (const x of SOURCES) assert.ok(cited.has(x.id), `source ${x.id} is cited nowhere`);
  });

  test('chapter prose renders: citations become numbered links, and unknown ids throw', () => {
    const { rich, notes } = citer();
    assert.match(rich('Light {suger}. More light {suger}.'), /href="#source-suger"[^>]*>1<\/a>.*>1<\/a>/s);
    assert.equal(notes().length, 1);
    assert.throws(() => citer().rich('{no-such-source}'));
    for (const { c } of chapters) for (const p of [...c.encounter, ...c.understand.flatMap((b) => b.text), ...c.study.flatMap((b) => b.text)]) citer().rich(p);
  });

  test('every chapter cites at least four distinct sources', () => {
    for (const { id, c } of chapters) {
      const ids = new Set([...c.encounter, ...c.understand.flatMap((b) => b.text), ...c.study.flatMap((b) => b.text)].flatMap((p) => [...p.matchAll(CITE)].map((m) => m[1])));
      assert.ok(ids.size >= 4, `${id} cites ${ids.size}`);
    }
  });
});

describe('assets', () => {
  const fontFiles = readdirSync(new URL('assets/fonts/', dir));
  const imageFiles = readdirSync(new URL('assets/images/', dir));

  test('every font file has a record and a licence; every record has its file', () => {
    assert.deepEqual(fontFiles.filter((f) => f.endsWith('.woff2')).sort(), FONTS.map((f) => f.file).sort());
    for (const f of FONTS) {
      assert.ok(fontFiles.includes(f.licenceFile), f.licenceFile);
      assert.match(read(`assets/fonts/${f.licenceFile}`), /SIL OPEN FONT LICENSE Version 1\.1/i, f.licenceFile);
    }
  });

  test('every @font-face points at a recorded font served by the font route', () => {
    const urls = [...text.matchAll(/url\('\/seeing\/fonts\/([a-z0-9-]+)\/face\.woff2'\)/g)].map((m) => `${m[1]!}.woff2`);
    assert.ok(urls.length > 10);
    for (const u of urls) assert.ok(FONTS.some((f) => f.file === u), u);
    for (const f of FONTS) assert.ok(urls.includes(f.file), `${f.file} is loaded by no stylesheet`);
  });

  test('every image has a public-domain record with dimensions and alt text, and is used', () => {
    assert.deepEqual(imageFiles.sort(), IMAGES.map((i) => i.file).sort());
    for (const i of IMAGES) {
      assert.match(i.licence, /Public domain|CC0/);
      assert.ok(i.alt.length > 40 && i.width > 0 && i.height > 0 && /^https:\/\/www\.metmuseum\.org\//.test(i.url), i.file);
      assert.ok(text.includes(`'${i.file}'`), `${i.file} is used`);
    }
  });
});

describe('map and comparisons', () => {
  test('every relationship joins two nodes, has a known kind, a sentence and a source', () => {
    const ids = new Set(NODES.map((n) => n.id));
    const kinds = new Set(KINDS.map((k) => k.id));
    for (const r of RELATIONS) {
      assert.ok(ids.has(r.from) && ids.has(r.to), `${r.from} → ${r.to}`);
      assert.ok(kinds.has(r.kind) && r.text.length > 40 && r.sources.length > 0, `${r.from} → ${r.to}`);
    }
    for (const n of NODES) if (!n.context) assert.ok(SUBJECTS.some((s) => s.id === n.id), `${n.id} is a subject or marked context`);
    for (const k of KINDS) assert.ok(RELATIONS.some((r) => r.kind === k.id), `${k.id} is used`);
  });

  test('comparison pairs name subjects, and cover every dimension the brief asks for', () => {
    for (const p of PAIRS) {
      assert.ok(SUBJECTS.some((s) => s.id === p.a) && SUBJECTS.some((s) => s.id === p.b), p.id);
      assert.deepEqual(p.rows.map((r) => r.dimension), ['Context', 'Philosophy', 'Visual grammar', 'Material', 'Composition', 'Cultural meaning'], p.id);
      assert.equal(p.id, `${p.a}-${p.b}`);
    }
  });
});

describe('geometry', () => {
  test('Art Nouveau: the wrap polygons in chapter.css are the ones stem.ts computes', () => {
    const css = read('chapters/art-nouveau/chapter.css');
    assert.ok(css.includes(`shape-outside: ${wrapPolygon('left')};`), 'left');
    assert.ok(css.includes(`shape-outside: ${wrapPolygon('right')};`), 'right');
  });

  test('Renaissance: the ground line is fixed and parallels meet at the eye', () => {
    const near = { ...DEFAULT_EYE, eyeX: -2, eyeHeight: 5 };
    assert.deepEqual(project(near, 3, 0, 0), project(DEFAULT_EYE, 3, 0, 0), 'the picture plane does not move with the eye');
    const far = project(near, 1, 0, 1e9);
    const vp = draw(near).vp;
    assert.ok(Math.abs(far.X - vp.X) < 0.01 && Math.abs(far.Y - vp.Y) < 0.01);
    assert.doesNotMatch(Object.values(draw(near)).filter((v) => typeof v === 'string').join(''), /NaN|Infinity/);
  });

  test('Laboratory: each curated composition is its own nearest, and drawings are finite', () => {
    for (const p of PRESETS) assert.equal(nearest(p.p).id, p.id);
    for (const p of PRESETS) assert.doesNotMatch(windowSvg(p.p), /NaN|Infinity/);
    const extreme = Object.fromEntries(PARAMS.map((k) => [k.id, 1])) as Parameters<typeof windowSvg>[0];
    assert.doesNotMatch(windowSvg(extreme), /NaN|Infinity/);
  });
});
