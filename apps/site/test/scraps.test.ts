// Scraps' rules, without a browser: how a scrap is typeset, what a pile is, when the table is
// full, what a letter link accepts, and what a copy keeps.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  SPARK_LABELS, anniversaries, byMonth, clean, due, duplicate, isPicture, reconcile, scrapsOf, stale, strongRuns, visible,
  LOOKS, MAX_DRAFTS, PAPERS, SPARKS, clipTogether, decodeLetter, encodeLetter, exportCopy, faceOf, forgotten, importCopy, isEmpty, kin, letterOf, linkify,
  mergeCopy, onTable, overflow, parseBlocks, pilesOf, spark, spot, titleOf, unclip, withDraft, type Scrap,
} from '../src/experiences/scraps/model.ts';

const DAY = 86_400_000;
const NOW = Date.UTC(2026, 10, 16);
const scrap = (id: string, text: string, over: Partial<Scrap> = {}): Scrap => ({ id, text, body: '', look: 0, x: 0.5, y: 0.5, rot: 0, createdAt: NOW, updatedAt: NOW, liftedAt: NOW, ...over });
const fixed = (...values: number[]) => { let i = 0; return () => values[i++ % values.length]!; };

test('a scrap is named by its first line; a doodle and a blank sheet are named too', () => {
  assert.equal(titleOf(scrap('a', 'first line\nsecond')), 'first line');
  assert.equal(titleOf(scrap('a', '', { strokes: [[1, 2, 3, 4]] })), 'A doodle');
  assert.equal(titleOf(scrap('a', '')), 'A blank sheet');
  assert.equal(titleOf(scrap('a', '', { body: 'only a back' })), 'only a back');
  assert.ok(isEmpty(scrap('a', '  ')) && !isEmpty(scrap('a', '', { strokes: [[1, 2]] })));
});

test('every look number gives one of five compositions on one of six papers; short words are set large', () => {
  const seen = new Set<string>();
  for (let look = 0; look < LOOKS * PAPERS; look += 1) { const f = faceOf(scrap('a', 'x', { look })); seen.add(`${f.look}/${f.paper}`); }
  assert.equal(seen.size, LOOKS * PAPERS);
  assert.deepEqual(faceOf(scrap('a', 'x', { look: -1 })), { look: 4, paper: 5, size: 0 }, 'a negative look still lands in range');
  const sizes = ['tired', 'I still think about that soup', 'word '.repeat(12), 'word '.repeat(24), 'word '.repeat(80)].map((t) => faceOf(scrap('a', t)).size);
  assert.deepEqual(sizes, [0, 1, 2, 3, 4]);
  // A long word is set small enough to stay in one piece, and smaller still inside the cut-out's shape.
  assert.equal(faceOf(scrap('a', 'Buy string')).size, 1);
  assert.equal(faceOf(scrap('a', 'Buy string', { look: 3 })).size, 2);
  assert.equal(faceOf(scrap('a', 'Uncharacteristically so')).size, 4);
});

test('a pile is the scraps on one clip, the most recently picked up on top; piles lie in the order they were touched', () => {
  const scraps = [
    scrap('a', 'a', { liftedAt: 1 }), scrap('b', 'b', { clip: 'c1', liftedAt: 5 }), scrap('c', 'c', { clip: 'c1', liftedAt: 9 }), scrap('d', 'd', { liftedAt: 7, away: true }),
  ];
  assert.deepEqual(pilesOf(scraps).map((p) => p.all.map((s) => s.id).join('+')), ['a', 'd', 'c+b']);
  assert.deepEqual(onTable(scraps).map((p) => p.top.id), ['a', 'c']);
});

test('a full table sends what was touched longest ago to the drawer, whole piles at a time', () => {
  const scraps = [scrap('old', 'o', { liftedAt: 1 }), scrap('p1', 'p', { clip: 'c', liftedAt: 2 }), scrap('p2', 'p', { clip: 'c', liftedAt: 3 }), scrap('new', 'n', { liftedAt: 9 })];
  assert.deepEqual(overflow(scraps, 3), []);
  assert.deepEqual(overflow(scraps, 2), ['old']);
  assert.deepEqual(overflow(scraps, 1).sort(), ['old', 'p1', 'p2']);
});

test('clipping joins everything on both clips where the target lies, dropped scrap on top; unclipping frees one and dissolves a clip of one', () => {
  const scraps = [scrap('a', 'a', { x: 0.1, y: 0.1 }), scrap('b', 'b', { x: 0.8, y: 0.7, clip: 'c1' }), scrap('c', 'c', { x: 0.8, y: 0.7, clip: 'c1' }), scrap('d', 'd')];
  const changed = clipTogether(scraps, 'a', 'b', NOW + 5);
  assert.deepEqual(changed.map((s) => [s.id, s.clip, s.x, s.y]), [['a', 'c1', 0.8, 0.7], ['b', 'c1', 0.8, 0.7], ['c', 'c1', 0.8, 0.7]]);
  assert.equal(pilesOf(changed)[0]!.top.id, 'a');
  assert.deepEqual(clipTogether(changed, 'a', 'c', NOW), [], 'already together');
  assert.deepEqual(clipTogether(scraps, 'a', 'a', NOW), []);
  assert.equal(clipTogether(scraps, 'a', 'd', NOW, () => 'fresh').every((s) => s.clip === 'fresh'), true);

  const three = unclip(changed, 'a', NOW);
  assert.deepEqual(three.map((s) => [s.id, s.clip]), [['a', undefined]]);
  const two = [scrap('x', 'x', { clip: 'k' }), scrap('y', 'y', { clip: 'k' })];
  assert.deepEqual(unclip(two, 'x', NOW).map((s) => [s.id, s.clip]), [['x', undefined], ['y', undefined]]);
  assert.deepEqual(unclip(two, 'nope', NOW), []);
});

test('a new scrap lands on the table, away from what is already there', () => {
  let seed = 7;
  const rand = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  const taken = [{ x: 0.2, y: 0.2 }, { x: 0.8, y: 0.2 }, { x: 0.5, y: 0.8 }];
  const p = spot(taken, rand);
  assert.ok(p.x >= 0 && p.x <= 1 && p.y >= 0 && p.y <= 1);
  assert.ok(Math.min(...taken.map((t) => Math.hypot(t.x - p.x, t.y - p.y))) > 0.2, JSON.stringify(p));
});

test('kin share words and are not on the same clip; only something left alone for three days is found again', () => {
  const piece = scrap('p', 'Maps lie', { body: 'A map leaves the coastline out when the scale is small.', clip: 'c' });
  const scraps = [piece, scrap('1', 'The coastline paradox'), scrap('2', 'Every map leaves something out', { clip: 'c' }), scrap('3', 'Bread needs salt')];
  assert.deepEqual(kin(piece, scraps).map((s) => s.id), ['1']);

  assert.equal(forgotten([scrap('a', 'tides'), scrap('b', 'maps', { updatedAt: NOW - 2 * DAY, liftedAt: NOW - 2 * DAY })], NOW, fixed(0)), undefined);
  const old = { updatedAt: NOW - 30 * DAY, liftedAt: NOW - 30 * DAY };
  const found = forgotten([scrap('new', 'Coastlines and measuring them'), scrap('related', 'Measuring a coastline twice', old), scrap('other', 'Bread needs salt', old)], NOW, fixed(0.99));
  assert.equal(found?.id, 'related');
  assert.equal(forgotten([scrap('x', 'old but picked up today', { updatedAt: NOW - 30 * DAY })], NOW, fixed(0)), undefined);
});

test('the jar is several instruments: open questions with nothing here, and ones made from your own scraps once there are some', () => {
  const rand = () => { let n = 7; return () => { n = (n * 16807) % 2147483647; return n / 2147483647; }; };
  const r = rand();
  for (let i = 0; i < 60; i += 1) {
    const s = spark([], r);
    assert.ok(['small', 'notice', 'whatif', 'other', 'against', 'pair'].includes(s.kind), s.kind);
    assert.equal(s.about, undefined);
    assert.ok(SPARK_LABELS[s.kind]);
  }
  const old = scrap('old', 'Maps lie a little', { createdAt: NOW - 40 * DAY });
  const table = [scrap('a', 'I still think about that soup.'), scrap('b', 'tired, in a good way'), old, scrap('bin', 'thrown away', { binnedAt: NOW })];
  const kinds = new Set<string>();
  for (let i = 0; i < 400; i += 1) {
    const s = spark(table, r, undefined, NOW);
    kinds.add(s.kind);
    assert.doesNotMatch(s.text, /thrown away/, 'nothing is made from the bin');
    if (s.kind === 'again') assert.match(s.text, /Maps lie a little.*6 weeks ago|6 weeks ago.*Maps lie a little/s);
  }
  assert.deepEqual([...kinds].sort(), ['again', 'against', 'more', 'notice', 'other', 'pair', 'small', 'turn', 'whatif']);
  const pair = spark(table, r, undefined, NOW, 'pair');
  assert.equal(pair.kind, 'pair');
  assert.equal((pair.text.match(/“/g) ?? []).length, 2, 'two of your own, side by side');
  assert.equal(spark([], r, undefined, NOW, 'more').about, undefined, 'a kind that needs scraps falls back when there are none');
  const first = spark([], fixed(0, 0));
  assert.notEqual(spark([], fixed(0, 0, 0, 0.99), first.text).text, first.text, 'never the one just shown');
  assert.equal(new Set(SPARKS).size, SPARKS.length);
});

test('the back reads as headings, quotations, lists and paragraphs; nothing else is markup', () => {
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

test('a letter survives its link with its look, and anything that is not a letter is refused', async () => {
  const s = scrap('a', 'On soup — «ünïcödé»', { body: 'long '.repeat(500), look: 17, prompt: 'What did you eat?', strokes: [[1, 2, 3, 4], [5, 6]] });
  const fragment = await encodeLetter(letterOf([s], NOW));
  assert.match(fragment, /^1\.[A-Za-z0-9_-]+$/, 'safe in a URL fragment');
  assert.ok(fragment.length < 700, `repetitive text compresses (${fragment.length})`);
  assert.deepEqual(await decodeLetter(`#${fragment}`), { v: 2, d: NOW, items: [{ t: s.text, b: s.body, k: 17, p: 'What did you eat?', s: s.strokes }] });
  for (const bad of ['', '#', '1.', '1.not-deflate', '0.e30', `0.${btoa('{"t":1,"b":"x","d":2}')}`, '9.abc', fragment.slice(0, 40)]) {
    assert.equal(await decodeLetter(bad), undefined, bad);
  }
  const hostile = btoa(JSON.stringify({ t: 'x', b: 'y', d: 1, k: 'look-9 onload', p: 5, s: [[1, 'M0 0<script>'], 'nope', [3, 4]] })).replace(/=+$/, '');
  assert.deepEqual(await decodeLetter(`0.${hostile}`), { v: 2, d: 1, items: [{ t: 'x', b: 'y', k: 0, s: [[3, 4]] }] }, 'the first format still opens, and only numbers become a look or a stroke');
  assert.equal((await decodeLetter(`0.${btoa(JSON.stringify({ t: 'x', b: '', d: 1, k: 1e9 })).replace(/=+$/, '')}`))?.items[0]?.k, 1e9 % (LOOKS * PAPERS));
});

test('a copy round-trips, drops what is not a scrap, and merges keeping the newer version', () => {
  const scraps = [scrap('a', 'one'), scrap('b', 'two', { clip: 'c' })];
  assert.deepEqual(importCopy(exportCopy(scraps, NOW)), scraps);
  assert.throws(() => importCopy('not json'), /not JSON/);
  assert.throws(() => importCopy('{"items":[]}'), /not a copy of a table/);
  assert.deepEqual(importCopy(JSON.stringify({ scraps: 1, items: [scraps[0], { id: 'x' }, null, 7] })), [scraps[0]]);
  const merged = mergeCopy(scraps, [{ ...scraps[0]!, text: 'one, revised', updatedAt: NOW + 1 }, { ...scraps[1]!, text: 'older', updatedAt: NOW - 1 }, scrap('c', 'three')]);
  assert.deepEqual(merged.map((s) => s.text).sort(), ['one, revised', 'three', 'two']);
});

test('earlier drafts of the back are kept when it changed, and only the last twelve', () => {
  let s = scrap('a', 't');
  assert.equal(withDraft(s, NOW), s, 'nothing to keep before anything is written');
  for (let i = 0; i < MAX_DRAFTS + 5; i += 1) s = withDraft({ ...s, body: `version ${i}` }, NOW + i);
  assert.equal(s.drafts?.length, MAX_DRAFTS);
  assert.equal(s.drafts?.at(-1)?.body, `version ${MAX_DRAFTS + 4}`);
  assert.equal(withDraft(s, NOW), s, 'an unchanged back is not kept twice');
});

test('a zine is several scraps in one link, addressed and signed; pictures stay behind; a kept letter becomes scraps of your own', async () => {
  const pic = 'data:image/png;base64,AAAA';
  const pile = [scrap('a', 'One'), scrap('b', '', { image: pic }), scrap('c', 'Three', { body: 'the back' })];
  const letter = letterOf(pile, NOW, { to: '  Mira ', from: 'A', open: NOW + DAY });
  assert.deepEqual(letter.items.map((l) => l.t), ['One', 'Three'], 'a picture with no words has nothing a link can carry');
  const back = (await decodeLetter(await encodeLetter(letter)))!;
  assert.deepEqual(back, { v: 2, d: NOW, items: [{ t: 'One', b: '', k: 0 }, { t: 'Three', b: 'the back', k: 0 }], to: 'Mira', from: 'A', open: NOW + DAY });
  assert.equal(letterOf(pile, NOW, { open: NOW - 1 }).open, undefined, 'a day already past is no seal');
  let n = 0;
  const mine = scrapsOf(back, NOW + 5, { x: 0.3, y: 0.4 }, () => `id${n += 1}`);
  assert.equal(mine.length, 2);
  assert.ok(mine.every((s) => s.from === 'A' && s.clip === mine[0]!.clip && s.clip), 'kept together, and marked as from someone');
  const many = { v: 2, d: 1, items: Array.from({ length: 90 }, () => ({ t: 'x', b: '' })), to: 7, from: 'n'.repeat(500) };
  const capped = (await decodeLetter(`0.${btoa(JSON.stringify(many)).replace(/=+$/, '')}`))!;
  assert.equal(capped.items.length, 40);
  assert.equal(capped.to, undefined);
  assert.equal(capped.from!.length, 60);
});

test('what is read from outside is cleaned: only a scrap’s own fields, each of its own type', () => {
  const dirty = { ...scrap('a', 'Hi'), x: 7, rot: 900, scale: 5, image: 'javascript:alert(1)', taped: 'yes', starred: true, strokes: [[1, 2], 'x', [3, 'y']], drafts: [{ at: 1, body: 'b' }, { at: 'x' }], evil: '<script>', from: 9, binnedAt: 'soon' };
  assert.deepEqual(clean(dirty), { ...scrap('a', 'Hi'), x: 1, rot: 30, starred: true, strokes: [[1, 2]], drafts: [{ at: 1, body: 'b' }] });
  assert.equal(clean({ id: 'x' }), undefined);
  assert.ok(isPicture('data:image/webp;base64,AAAA'));
  assert.ok(!isPicture('data:image/svg+xml;base64,AAAA'), 'no SVG: it can carry script');
  assert.ok(!isPicture('data:text/html;base64,AAAA'));
});

test('the bin and the seal hide a scrap from the table, the piles and every suggestion; the bin empties after thirty days', () => {
  const a = scrap('a', 'soup again tonight');
  const binned = scrap('b', 'soup yesterday too', { binnedAt: NOW - 31 * DAY, clip: 'c' });
  const fresh = scrap('f', 'soup for ever', { binnedAt: NOW - DAY });
  const sealed = scrap('s', 'soup in the future', { sealedUntil: NOW - 1, sealedAt: NOW - 9 * DAY, away: true });
  const waiting = scrap('w', 'not yet', { sealedUntil: NOW + DAY });
  const all = [a, binned, fresh, sealed, waiting];
  assert.deepEqual(visible(all).map((s) => s.id), ['a']);
  assert.deepEqual(onTable(all).map((p) => p.top.id), ['a']);
  assert.deepEqual(kin(a, all), []);
  assert.deepEqual(stale(all, NOW), ['b']);
  assert.deepEqual(due(all, NOW).map((s) => s.id), ['s']);
  assert.equal(forgotten([scrap('o', 'old', { binnedAt: 1, createdAt: 0, updatedAt: 0, liftedAt: 0 })], NOW, () => 0), undefined);
});

test('a taped pile never slides into the drawer, even on a full table', () => {
  const scraps = Array.from({ length: 5 }, (_, i) => scrap(`s${i}`, `n${i}`, { liftedAt: NOW + i, ...(i === 0 ? { taped: true } : {}) }));
  assert.deepEqual(overflow(scraps, 3), ['s1', 's2']);
  assert.deepEqual(overflow(scraps.map((s) => ({ ...s, taped: true })), 3), []);
});

test('two tabs: another tab’s save is taken, unless this tab is writing the same scrap, and then both versions survive', () => {
  const mine = [scrap('a', 'A', { body: 'mine' }), scrap('b', 'B'), scrap('c', 'C')];
  const theirs = [scrap('a', 'A', { body: 'theirs' }), scrap('b', 'B changed'), scrap('n', 'New')];
  const r = reconcile(mine, theirs, ['c'], new Set(['a']), NOW);
  assert.deepEqual(r.scraps.map((s) => s.id), ['a', 'b', 'n']);
  assert.equal(r.scraps[0]!.body, 'mine', 'the words being typed stay on the page');
  assert.deepEqual(r.scraps[0]!.drafts, [{ at: NOW, body: 'theirs' }], 'and the other tab’s are kept beside it');
  assert.deepEqual(r.clashed, ['a']);
  assert.deepEqual(r.resave.map((s) => s.id), ['a']);
  assert.equal(r.scraps[1]!.text, 'B changed');
  assert.deepEqual(reconcile(mine, [], ['a'], new Set(['a']), NOW).scraps.map((s) => s.id), ['a', 'b', 'c'], 'a scrap being written is not torn up from elsewhere');
});

test('a copy of a scrap is its own thing; the drawer runs by month; bold runs are marked', () => {
  const s = scrap('a', 'Hi', { clip: 'c', sentAt: 5, taped: true, drafts: [{ at: 1, body: 'x' }], starred: true });
  const twin = duplicate(s, NOW + 1, () => 'twin');
  assert.deepEqual([twin.id, twin.clip, twin.sentAt, twin.taped, twin.drafts, twin.starred, twin.text], ['twin', undefined, undefined, undefined, undefined, true, 'Hi']);
  const at = (y: number, m: number, d: number) => new Date(y, m, d, 12).getTime();
  const months = byMonth([scrap('1', 'a', { createdAt: at(2026, 10, 2) }), scrap('2', 'b', { createdAt: at(2026, 4, 9) }), scrap('3', 'c', { createdAt: at(2026, 10, 20) })]);
  assert.deepEqual(months.map((m) => [m.key, m.items.map((k) => k.id)]), [['2026-11', ['3', '1']], ['2026-05', ['2']]]);
  assert.deepEqual(strongRuns('a **b c** d ** e'), [{ text: 'a ' }, { text: 'b c', strong: true }, { text: ' d ** e' }]);
});

// --- Kept for ever: what was written by an earlier Scraps must still open ---------------------------
// These are literal bytes from past formats. If one of these tests fails, the change that broke it
// would lose somebody's work or kill a link they were sent: fix the change, never the fixture.

test('a copy file from the first Scraps (16 November 2026) still comes back whole', () => {
  const file = '{"scraps":1,"savedAt":1794700800000,"items":[{"id":"a1","text":"I still think about that soup","body":"It was in a place with four tables.","prompt":"What did you eat today that was good?","look":17,"x":0.31,"y":0.62,"rot":-3.5,"createdAt":1794700000000,"updatedAt":1794700500000,"liftedAt":1794700600000,"strokes":[[10,20,30,40]],"clip":"c1","away":true,"sentAt":1794700700000,"drafts":[{"at":1794700400000,"body":"It was"}]}]}';
  assert.deepEqual(importCopy(file), [{
    id: 'a1', text: 'I still think about that soup', body: 'It was in a place with four tables.', look: 17, x: 0.31, y: 0.62, rot: -3.5,
    createdAt: 1794700000000, updatedAt: 1794700500000, liftedAt: 1794700600000, prompt: 'What did you eat today that was good?',
    strokes: [[10, 20, 30, 40]], clip: 'c1', away: true, sentAt: 1794700700000, drafts: [{ at: 1794700400000, body: 'It was' }],
  }]);
  assert.throws(() => importCopy('{"scraps":2,"items":[]}'), /newer Scraps/, 'a copy from a later format is refused out loud, never half-read');
});

test('letter links of both formats still open: the first (one scrap) and the second (several, addressed)', async () => {
  const b64 = (o: unknown) => btoa(JSON.stringify(o)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  const first = `0.${b64({ v: 1, t: 'tired, but in a good way', b: 'It was a long week.', k: 7, p: 'How are you?', d: 1794700000000 })}`;
  assert.deepEqual(await decodeLetter(first), { v: 2, d: 1794700000000, items: [{ t: 'tired, but in a good way', b: 'It was a long week.', k: 7, p: 'How are you?' }] });
  // A deflated link exactly as the first Scraps made it.
  // A deflated link, byte for byte as the first Scraps made it.
  assert.deepEqual(await decodeLetter('#1.q1YqU7Iy1FEqUbJSyk0sKFbIyUxV0lFKAnIdgeySkpxUPSA_G6jISEcpBUiZW5qYG0BBLQA'), { v: 2, d: 1794700000000, items: [{ t: 'maps lie', b: 'A little.', k: 12 }] });
  const second = `0.${b64({ v: 2, d: 1794700000000, items: [{ t: 'Page one', b: '', k: 0 }, { t: 'Page two', b: 'back', k: 3 }], to: 'Mira', from: 'Ash', name: 'Soup', open: 1 })}`;
  assert.deepEqual(await decodeLetter(second), { v: 2, d: 1794700000000, items: [{ t: 'Page one', b: '', k: 0 }, { t: 'Page two', b: 'back', k: 3 }], to: 'Mira', from: 'Ash', name: 'Soup', open: 1 });
  const round = await decodeLetter(await encodeLetter(letterOf([scrap('a', 'One'), scrap('b', 'Two')], NOW, { name: '  A week of soup ' })));
  assert.equal(round?.name, 'A week of soup');
});

test('the jar does not repeat itself while it has something new; around this time in other years', () => {
  const seen = new Set<string>();
  let n = 11;
  const rand = () => { n = (n * 16807) % 2147483647; return n / 2147483647; };
  for (let i = 0; i < SPARKS.length; i += 1) { const s = spark([], rand, seen, NOW, 'small'); assert.ok(!seen.has(s.text), `repeat after ${i}`); seen.add(s.text); }
  assert.ok(spark([], rand, seen, NOW, 'small').text, 'with everything shown, it still answers');
  const year = 365.25 * DAY;
  const found = anniversaries([scrap('y1', 'last year', { createdAt: NOW - year + DAY }), scrap('y3', 'three years', { createdAt: NOW - 3 * year }), scrap('m', 'last month', { createdAt: NOW - 30 * DAY }), scrap('now', 'today'), scrap('bin', 'x', { createdAt: NOW - year, binnedAt: 1 })], NOW);
  assert.deepEqual(found.map((s) => s.id), ['y1', 'y3']);
});
