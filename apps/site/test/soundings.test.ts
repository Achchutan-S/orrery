// Soundings' rules, without a browser: what a capture becomes, how marks relate, what a letter
// link accepts, what a copy keeps, and that the land is where the marks are.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  MAX_DRAFTS, decodeLetter, echoesFor, encodeLetter, exportCopy, freeSpot, groupsOf, heading, importCopy, inferKind, letterOf, linkify, massOf,
  mergeCopy, parseBlocks, resurface, titleOf, withDraft, type Link, type Mark,
} from '../src/experiences/soundings/model.ts';
import { COAST, level, noise, sample } from '../src/experiences/soundings/terrain.ts';

const DAY = 86_400_000;
const NOW = Date.UTC(2026, 10, 15);
const mark = (id: string, text: string, over: Partial<Mark> = {}): Mark => ({ id, kind: inferKind(text), text, body: '', x: 0, y: 0, createdAt: NOW, updatedAt: NOW, ...over });
const link = (a: string, b: string): Link => ({ id: `${a}-${b}`, a, b, createdAt: NOW });
const fixed = (...values: number[]) => { let i = 0; return () => values[i++ % values.length]!; };

test('a capture is a question, a source or a thought by what it says', () => {
  assert.equal(inferKind('Why do rivers meander? '), 'question');
  assert.equal(inferKind('see https://example.org/a?b=1 about maps'), 'source');
  assert.equal(inferKind('Maps are arguments'), 'thought');
});

test('a mark is named by its first line; a drawing with no words is still named', () => {
  assert.equal(titleOf(mark('a', 'first line\nsecond')), 'first line');
  assert.equal(titleOf(mark('a', '', { strokes: [[1, 2, 3, 4]] })), 'A drawing');
  assert.equal(titleOf(mark('a', '')), 'Untitled');
  const long = titleOf(mark('a', 'word '.repeat(40)), 40);
  assert.ok(long.length <= 41 && long.endsWith('…'), long);
});

test('writing, drawing and connecting each make more land, up to a limit', () => {
  const bare = massOf(mark('a', 'x'), 0);
  const written = massOf(mark('a', 'x', { body: 'word '.repeat(300) }), 0);
  const huge = massOf(mark('a', 'x', { body: 'word '.repeat(50_000) }), 9);
  assert.ok(written.sigma > bare.sigma && written.height > bare.height);
  assert.ok(massOf(mark('a', 'x'), 3).sigma > bare.sigma);
  assert.ok(massOf(mark('a', 'x', { strokes: [[0, 0, 1, 1]] }), 0).sigma > bare.sigma);
  assert.ok(huge.sigma <= 92, 'one long piece cannot swallow the chart');
});

test('explorations are the groups that links make', () => {
  const marks = ['a', 'b', 'c', 'd', 'e'].map((id) => mark(id, id));
  const groups = groupsOf(marks, [link('a', 'b'), link('b', 'c'), link('d', 'gone')]);
  assert.deepEqual(groups.map((g) => g.map((m) => m.id).sort()), [['a', 'b', 'c']]);
});

test('echoes share words with the piece, are not already linked, and never include it', () => {
  const piece = mark('p', 'Maps are arguments', { body: 'A map leaves the coastline out when the scale is small.' });
  const marks = [piece, mark('1', 'The coastline paradox'), mark('2', 'Every map leaves something out'), mark('3', 'Bread needs salt')];
  assert.deepEqual(echoesFor(piece, marks, []).map((m) => m.id).sort(), ['1', '2']);
  assert.deepEqual(echoesFor(piece, marks, [link('p', '2')]).map((m) => m.id), ['1']);
});

test('only a mark left alone for three days comes back, preferring one related to the latest work', () => {
  const fresh = [mark('a', 'tides'), mark('b', 'maps', { updatedAt: NOW - 2 * DAY })];
  assert.equal(resurface(fresh, NOW, fixed(0)), undefined);
  const old = [
    mark('new', 'Coastlines and measuring them'),
    mark('related', 'Measuring a coastline twice', { updatedAt: NOW - 30 * DAY }),
    mark('other', 'Bread needs salt', { updatedAt: NOW - 30 * DAY }),
  ];
  assert.equal(resurface(old, NOW, fixed(0.99))?.id, 'related');
});

test('a new mark is put in open water, never on top of another', () => {
  const marks = [{ x: 0, y: 0 }, { x: 150, y: 0 }, { x: 0, y: 150 }];
  const p = freeSpot(marks, { x: 0, y: 0 }, 150);
  for (const m of marks) assert.ok(Math.hypot(m.x - p.x, m.y - p.y) >= 150);
  assert.deepEqual(freeSpot([], { x: 5, y: 7 }), { x: 5, y: 7 });
});

test('a heading is made from marks that exist and are not already connected', () => {
  const marks = [mark('a', 'Maps are arguments'), mark('b', 'Rivers meander')];
  const pair = heading(marks, [], fixed(0.1, 0.0, 0.9));
  assert.deepEqual(pair.from.sort(), ['a', 'b']);
  assert.match(pair.text, /Maps are arguments/);
  assert.equal(heading(marks, [link('a', 'b')], fixed(0.1)).from.length <= 1, true, 'a linked pair is not proposed again');
  assert.deepEqual(heading([], [], fixed(0.3)).from, []);
});

test('writing reads as headings, quotations, lists and paragraphs; nothing else is markup', () => {
  assert.deepEqual(parseBlocks('# One\n\nfirst\nsecond\n\n> q1\n> q2\n- a\n- b\n## Two\n<b>not markup</b>'), [
    { type: 'h', level: 2, text: 'One' },
    { type: 'p', text: 'first second' },
    { type: 'quote', text: 'q1 q2' },
    { type: 'list', items: ['a', 'b'] },
    { type: 'h', level: 3, text: 'Two' },
    { type: 'p', text: '<b>not markup</b>' },
  ]);
  assert.deepEqual(linkify('see https://example.org/x, then javascript:alert(1)'), [
    { text: 'see ' }, { text: 'https://example.org/x', href: 'https://example.org/x' }, { text: ', then javascript:alert(1)' },
  ]);
});

test('a letter survives its link, and anything that is not a letter is refused', async () => {
  const m = mark('a', 'On coastlines — «ünïcödé»', { body: 'long '.repeat(500), strokes: [[1, 2, 3, 4], [5, 6]] });
  const fragment = await encodeLetter(letterOf(m, NOW));
  assert.match(fragment, /^1\.[A-Za-z0-9_-]+$/, 'safe in a URL fragment');
  assert.ok(fragment.length < 600, `repetitive text compresses (${fragment.length})`);
  assert.deepEqual(await decodeLetter(`#${fragment}`), { v: 1, t: m.text, b: m.body, s: m.strokes, d: NOW });
  for (const bad of ['', '#', '1.', '1.not-deflate', '0.e30', `0.${btoa('{"t":1,"b":"x","d":2}')}`, '9.abc', `${fragment.slice(0, 40)}`]) {
    assert.equal(await decodeLetter(bad), undefined, bad);
  }
  const hostile = btoa(JSON.stringify({ t: 'x', b: 'y', d: 1, s: [[1, 'M0 0<script>'], 'nope', [3, 4]] })).replace(/=+$/, '');
  assert.deepEqual((await decodeLetter(`0.${hostile}`))?.s, [[3, 4]], 'only strokes made of numbers are kept');
});

test('a copy round-trips, drops what is not a mark, and merges without duplicating', () => {
  const marks = [mark('a', 'one'), mark('b', 'two')];
  const links = [link('a', 'b')];
  const copy = exportCopy({ marks, links, meta: { secret: 1 } }, NOW);
  assert.ok(!copy.includes('secret'), 'meta stays out of a copy');
  assert.deepEqual(importCopy(copy), { marks, links });
  assert.throws(() => importCopy('not json'), /not JSON/);
  assert.throws(() => importCopy('{"marks":[]}'), /not a Soundings copy/);
  const dirty = JSON.stringify({ soundings: 1, marks: [marks[0], { id: 'x' }, null], links: [link('a', 'zzz'), 7] });
  assert.deepEqual(importCopy(dirty), { marks: [marks[0]], links: [] });

  const newer = { ...marks[0]!, text: 'one, revised', updatedAt: NOW + 1 };
  const merged = mergeCopy({ marks, links }, { marks: [newer, mark('c', 'three')], links: [{ ...link('b', 'a'), id: 'other' }] });
  assert.deepEqual(merged.marks.map((m) => m.text).sort(), ['one, revised', 'three', 'two']);
  assert.equal(merged.links.length, 1, 'the same route under another id is not added twice');
});

test('earlier drafts are kept when the writing changed, and only the last twelve', () => {
  let m = mark('a', 't');
  assert.equal(withDraft(m, NOW), m, 'nothing to keep before anything is written');
  for (let i = 0; i < MAX_DRAFTS + 5; i += 1) m = withDraft({ ...m, body: `version ${i}` }, NOW + i);
  assert.equal(m.drafts?.length, MAX_DRAFTS);
  assert.equal(m.drafts?.at(-1)?.body, `version ${MAX_DRAFTS + 4}`);
  assert.equal(withDraft(m, NOW), m, 'an unchanged body is not kept twice');
});

test('open water is flat; a mark makes one closed coast; two close marks make one landmass', () => {
  const sea = sample([], -100, -100, 200, 200, 5);
  assert.equal(level(sea, COAST, true).lines.length, 0);

  const one = sample([{ x: 0, y: 0, sigma: 24, height: 1 }], -120, -120, 240, 240, 4);
  const coast = level(one, COAST, true);
  assert.ok(coast.lines.length > 0 && coast.fills.length > 0);
  const radii = [];
  for (let i = 0; i < coast.lines.length; i += 2) radii.push(Math.hypot(coast.lines[i]!, coast.lines[i + 1]!));
  assert.ok(Math.min(...radii) > 12 && Math.max(...radii) < 52, `an islet about 28 units across its radius (${Math.min(...radii).toFixed(0)}–${Math.max(...radii).toFixed(0)})`);

  const at = (f: typeof one, x: number, y: number) => f.values[Math.round((y - f.y0) / f.cell) * f.cols + Math.round((x - f.x0) / f.cell)]!;
  const apart = sample([{ x: -120, y: 0, sigma: 24, height: 1 }, { x: 120, y: 0, sigma: 24, height: 1 }], -200, -100, 400, 200, 4);
  const close = sample([{ x: -22, y: 0, sigma: 24, height: 1 }, { x: 22, y: 0, sigma: 24, height: 1 }], -200, -100, 400, 200, 4);
  assert.ok(at(apart, 0, 0) < COAST, 'water between distant marks');
  assert.ok(at(close, 0, 0) >= COAST, 'land between close marks');
});

test('the coast does not move between frames: noise depends only on position', () => {
  assert.equal(noise(12.3, -4.5), noise(12.3, -4.5));
  for (let i = 0; i < 200; i += 1) { const n = noise(i * 0.37, i * -0.91); assert.ok(n >= -1 && n <= 1); }
});
