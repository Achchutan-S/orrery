// Divya Chakshu without a browser: the text table's integrity rules, the score (timeline) that
// drives every scene and sound, and the agreement between the score and the shaders it names.
import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { SEQUENCES } from '../src/experiences/divya-chakshu/content.ts';
import { PROGRAMS } from '../src/experiences/divya-chakshu/client/shaders.ts';
import { B, BEAT_COUNTS, frame, position, SEQUENCE_COUNT, soundscape, stillPosition } from '../src/experiences/divya-chakshu/client/timeline.ts';

const verses = SEQUENCES.flatMap((s) => s.beats.flatMap((b) => (b.kind === 'verse' ? [b.verse] : [])));
const DEVANAGARI = /^[ऀ-ॿ\s।॥’‘]+$/;
const samples = (step = 0.004) => Array.from({ length: Math.ceil(SEQUENCE_COUNT / step) }, (_, i) => i * step);

describe('content', () => {
  test('the timeline addresses exactly the beats the page renders', () => {
    assert.deepEqual(BEAT_COUNTS, SEQUENCES.map((s) => s.beats.length));
  });

  test('nine sequences, the prologue first and silence last', () => {
    assert.equal(SEQUENCES.length, 9);
    assert.equal(SEQUENCES[0]!.beats[0]!.kind, 'title');
    assert.equal(SEQUENCES.at(-1)!.beats.at(-1)!.kind, 'end');
    for (const s of SEQUENCES) assert.equal(s.beats[0]!.kind, 'title', `${s.id} opens with its card`);
    assert.equal(SEQUENCES.flatMap((s) => s.beats).filter((b) => b.kind === 'sight').length, 1);
  });

  test('every verse is in chapter 11, in order, with an English adaptation and a speaker', () => {
    let last = 0;
    for (const v of verses) {
      const m = /^11\.(\d+)(?:–(\d+))?$/.exec(v.ref);
      assert.ok(m, `${v.ref} is a chapter 11 reference`);
      const first = Number(m[1]);
      assert.ok(first > last, `${v.ref} comes after 11.${last}`);
      last = Number(m[2] ?? m[1]);
      assert.ok(v.en.length > 20, v.ref);
    }
  });

  test('Sanskrit is Devanagari, paired line for line with its transliteration', () => {
    for (const v of verses.filter((x) => x.sa)) {
      assert.equal(v.sa!.length, v.iast?.length, `${v.ref}: one IAST line per Devanagari line`);
      for (const line of v.sa!) assert.match(line, DEVANAGARI, v.ref);
      for (const line of v.iast!) assert.doesNotMatch(line, /[ऀ-ॿ]/, v.ref);
      // A partial quotation says which part; a full one has two half-verse lines.
      if (!v.part) assert.equal(v.sa!.length, 2, `${v.ref} quotes a whole verse, or says which part`);
    }
  });

  test('the key passages are present', () => {
    const refs = verses.map((v) => v.ref);
    for (const r of ['11.8', '11.12', '11.13', '11.16', '11.17', '11.28', '11.29', '11.32', '11.33', '11.41', '11.45', '11.51', '11.55']) assert.ok(refs.includes(r), r);
  });
});

describe('timeline', () => {
  const none = { open: 0, sight: 0 };
  const full = { open: 1, sight: 1 };

  test('position runs from 0 to 9 through every beat in order', () => {
    assert.equal(position(0, 0, 0), 0);
    assert.ok(position(8, 8, 1) < 9);
    let prev = -1;
    BEAT_COUNTS.forEach((n, s) => { for (let b = 0; b < n; b++) { const g = position(s, b, 0.5); assert.ok(g > prev); prev = g; } });
    assert.equal(B(2, 0), 2);
  });

  test('still frames sit in the middle of each beat', () => {
    assert.equal(stillPosition(B(4, 2, 0.1)), B(4, 2, 0.5));
    assert.equal(stillPosition(B(4, 2, 0.9)), B(4, 2, 0.5));
  });

  test('every layer is a known program with alpha in (0, 1], and a full-screen scene is always drawn until the end', () => {
    for (const g of samples()) {
      const f = frame(g, full);
      for (const l of f.layers) {
        assert.ok(l.program in PROGRAMS, l.program);
        assert.ok(l.alpha > 0 && l.alpha <= 1, `${l.program} at ${g}`);
        for (const v of Object.values(l.u)) assert.ok(Number.isFinite(v), `${l.program} at ${g}`);
      }
      if (g < B(8, 7)) assert.ok(f.layers.filter((l) => !PROGRAMS[l.program].vert).reduce((n, l) => n + l.alpha, 0) > 0.5, `no scene at ${g.toFixed(3)}`);
    }
  });

  test('at most three full-screen programs at once (the cost ceiling)', () => {
    for (const g of samples()) assert.ok(frame(g, full).layers.filter((l) => !PROGRAMS[l.program].vert).length <= 3, String(g));
  });

  test('before entering the plain is dark; divine sight comes by itself if the visitor scrolls past the button', () => {
    assert.equal(frame(0, none).layers[0]!.u.open, 0);
    assert.equal(frame(B(0, 2), none).layers[0]!.u.open, 1);
    assert.equal(frame(B(2, 2, 0.5), none).layers[0]!.u.sight, 0);
    assert.equal(frame(B(2, 2, 0.5), full).layers[0]!.u.sight, 1);
    assert.equal(frame(B(2, 4), none).layers[0]!.u.sight, 1);
  });

  test('the thousand suns turn the text to dark ink only while the light is white', () => {
    assert.equal(frame(B(3, 1, 0.5), full).ink, 0);
    assert.equal(frame(B(3, 2, 0.5), full).ink, 1);
    assert.equal(frame(B(4, 1), full).ink, 0);
  });

  test('wonder turns to terror in the same form, and the form folds away before the morning', () => {
    const cosmos = (g: number) => frame(g, full).layers.filter((l) => l.program === 'cosmos');
    assert.equal(cosmos(B(4, 3))[0]!.u.terror, 0);
    assert.equal(cosmos(B(5, 3))[0]!.u.terror, 1);
    assert.equal(cosmos(B(8, 4, 0.7))[0]?.u.fold ?? 1, 1);
    assert.ok(!frame(B(8, 6), full).layers.some((l) => l.program === 'cosmos'));
  });

  test('the end is darkness and silence', () => {
    const last = frame(8.999, full);
    assert.ok(last.layers.every((l) => l.program !== 'battlefield' || l.u.end === 1));
    assert.deepEqual(Object.values(soundscape(8.999)).filter((v) => v > 0.001), []);
  });
});

describe('shaders', () => {
  test('every uniform the timeline sets is declared by its program', () => {
    const extra = { time: ['spin'], lives: ['spin', 'still', 'ltime'] } as Record<string, string[]>;
    const seen = new Map<string, Set<string>>();
    for (const g of samples(0.02)) for (const l of frame(g, { open: 1, sight: 1 }).layers) {
      const set = seen.get(l.program) ?? new Set();
      for (const k of [...Object.keys(l.u), ...(extra[l.program] ?? [])]) set.add(k);
      seen.set(l.program, set);
    }
    for (const [program, keys] of seen) {
      const src = PROGRAMS[program as keyof typeof PROGRAMS].frag + (PROGRAMS[program as keyof typeof PROGRAMS].vert ?? '');
      for (const k of keys) assert.match(src, new RegExp(`uniform float [^;]*\\bu_${k}\\b`), `${program} declares u_${k}`);
    }
  });

  test('every program is GLSL ES 3.00 with no texture or external resource', () => {
    for (const [name, p] of Object.entries(PROGRAMS)) {
      for (const src of [p.frag, p.vert ?? '#version 300 es']) assert.ok(src.startsWith('#version 300 es'), name);
      assert.doesNotMatch(p.frag + (p.vert ?? ''), /sampler2D|texture\(/, name);
    }
  });
});
