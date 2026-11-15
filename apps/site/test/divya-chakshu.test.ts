// Divya Chakshu without a browser: the text table's integrity rules, the score (timeline) that
// drives every scene and sound, and the agreement between the score and the shaders it names.
import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { SEQUENCES } from '../src/experiences/divya-chakshu/content.ts';
import { PROGRAMS } from '../src/experiences/divya-chakshu/client/shaders.ts';
import { jaw, jawsAt, NAMED, names, sightAt, SIGHT_OPEN, B, BEAT_COUNTS, frame, position, SEQUENCE_COUNT, soundscape, stillPosition } from '../src/experiences/divya-chakshu/client/timeline.ts';

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
  const none = { open: 0 };
  const full = { open: 1 };

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

  test('before entering the plain is dark; divine sight belongs to a place in the text, so it opens and closes with the scroll', () => {
    assert.equal(frame(0, none).layers[0]!.u.open, 0);
    assert.equal(frame(B(0, 2), none).layers[0]!.u.open, 1);
    assert.equal(frame(B(2, 2, 0.5), full).layers[0]!.u.sight, 0, 'closed at the button');
    assert.equal(frame(B(2, 4), full).layers[0]!.u.sight, 1, 'open after it');
    assert.equal(frame(B(1, 2), full).layers[0]!.u.sight, 0, 'and closed again for a reader who scrolls back to the chariot');
    assert.equal(sightAt(SIGHT_OPEN), 1, 'the button carries the reader to where the eye is fully open');
    let prev = 0;
    for (const g of samples()) { const v = sightAt(g); assert.ok(v >= prev, 'sight never flickers'); prev = v; }
  });

  test('the picture is a function of the reading position: nothing remembers which way the reader came', () => {
    const forward = samples().map((g) => JSON.stringify(frame(g, full)));
    const backward = [...samples()].reverse().map((g) => JSON.stringify(frame(g, full))).reverse();
    assert.deepEqual(backward, forward);
    assert.equal(frame.length, 2, 'frame takes the position and the one-time opening, nothing else');
  });

  test('the plain has no drifting motes before divine sight: they are what sight reveals', () => {
    for (const g of [0.3, B(0, 2), B(1, 2), B(2, 1)]) assert.ok(!frame(g, full).layers.some((l) => l.program === 'dust'), String(g));
    assert.ok(frame(B(2, 4), full).layers.some((l) => l.program === 'dust'));
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
    // Seen whole first, then from inside: the rim has left the frame before the eyes open.
    assert.equal(cosmos(B(4, 2))[0]!.u.within, 0);
    assert.equal(cosmos(B(4, 4))[0]!.u.within, 1);
    // At 11.29 the burning form draws in to the point where the flame stands, and the flame is lit.
    assert.equal(cosmos(B(5, 4))[0]!.u.gather, 0);
    assert.equal(cosmos(B(5, 5, 0.3))[0]!.u.gather, 1);
    assert.ok(frame(B(5, 5, 0.4), full).layers.some((l) => l.program === 'lamp' && l.u.heat === 1));
    assert.ok(frame(B(5, 5), full).layers.some((l) => l.program === 'moths'), 'the moths are already arriving while the form draws in');
    // Asked to be gentle again, it recedes to a disc seen from outside before it folds.
    assert.equal(cosmos(B(7, 3))[0]!.u.within, 1);
    assert.equal(cosmos(B(8, 2, 0.5))[0]!.u.within, 0);
    assert.equal(cosmos(B(8, 4, 0.7))[0]?.u.fold ?? 1, 1);
    assert.ok(!frame(B(8, 6), full).layers.some((l) => l.program === 'cosmos'));
  });

  test('out of the white, the whole universe in one place: the orb, flown into, opens on the form', () => {
    const has = (g: number, p: string) => frame(g, full).layers.some((l) => l.program === p);
    assert.ok(has(B(4, 0, 0.5), 'orb') && !has(B(4, 0, 0.5), 'cosmos'), 'the small world over the plain, before the form');
    assert.ok(has(B(4, 1, 0.95), 'orb') && has(B(4, 1, 0.95), 'cosmos'), 'the point flown into is the heart of the form');
    assert.ok(!has(B(4, 2, 0.5), 'orb'));
    const orb = (g: number) => frame(g, full).layers.find((l) => l.program === 'orb')!.u;
    assert.equal(orb(B(3, 3, 0.7)).white, frame(B(3, 3, 0.7), full).layers.find((l) => l.program === 'suns')!.u.white, 'it comes out of the same white');
    assert.ok(orb(B(3, 3, 0.95)).fly === 0 && orb(B(4, 1, 0.92)).fly === 1);
    const cos = frame(B(4, 1, 0.91), full).layers.find((l) => l.program === 'cosmos')!.u;
    assert.equal(cos.flash, 1, 'the form starts white where the orb ends white');
  });

  test('recognition: the three he names are on the plain in sequence I and among the teeth in sequence V', () => {
    const shown = (g: number) => names(g, 1.6).filter((n) => n.a > 0.5).length;
    assert.equal(NAMED.length, 3);
    assert.equal(shown(B(1, 1, 0.5)), 3, 'labelled while the text speaks of his grandfather and teachers');
    assert.equal(shown(B(0, 2)), 0);
    assert.equal(shown(B(5, 3, 0.4)), 3, 'labelled among the teeth');
    assert.equal(shown(B(5, 1)), 0);
    const bf = frame(B(1, 1, 0.5), full).layers.find((l) => l.program === 'battlefield')!;
    assert.ok(bf.u.named! > 0.9);
    // the labels sit where the shader draws the jaws: on the lower lip, inside the frame, above the lip
    for (const n of names(B(5, 3, 0.4), 1.6)) { const J = jaw(jawsAt(B(5, 3, 0.4)).form, jawsAt(B(5, 3, 0.4)).close, 1.6); assert.ok(n.y > J.yc - J.H(n.x)); assert.ok(Math.abs(n.x) < 0.8); }
    // on a phone the jaws narrow to fit, and the names on the plain, which are off-frame, are hidden
    assert.ok(jaw(1, 0, 0.46).W <= 0.46 * 0.47 + 1e-9);
    assert.ok(names(B(1, 1, 0.5), 0.46).every((n) => n.a === 0));
    assert.equal(names(B(5, 3, 0.4), 0.46).filter((n) => n.a > 0.5).length, 3, 'all three stay among the teeth on a phone');
  });

  test('the jaws form, close, then give way to the rivers; the cosmos is the fire inside them', () => {
    const at = (g: number) => frame(g, full).layers.map((l) => l.program);
    const iC = at(B(5, 3, 0.5)).indexOf('cosmos'), iJ = at(B(5, 3, 0.5)).indexOf('jaws');
    assert.ok(iC >= 0 && iJ > iC, 'drawn over the burning form');
    assert.equal(jawsAt(B(5, 3, 0.5)).form, 1);
    assert.equal(jawsAt(B(5, 3, 0.95)).close, 1);
    assert.ok(!at(B(5, 3, 0.5)).includes('rivers') && at(B(5, 4, 0.5)).includes('rivers'));
  });

  test('divine sight begins as eyes in the plain, then the great eye opens; the friend turns back at 11.51', () => {
    const bf = (g: number) => frame(g, full).layers.find((l) => l.program === 'battlefield')!.u;
    assert.equal(bf(B(2, 0)).watch, 0);
    assert.equal(bf(B(2, 2, 0.6)).watch, 1);
    assert.equal(bf(B(2, 4)).watch, 0);
    const dawn = (g: number) => frame(g, full).layers.filter((l) => l.program === 'battlefield').at(-1)!.u;
    assert.equal(dawn(B(8, 5, 0.5)).turn, 0);
    assert.equal(dawn(B(8, 6, 0.5)).turn, 1);
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
    for (const g of samples(0.02)) for (const l of frame(g, { open: 1 }).layers) {
      const set = seen.get(l.program) ?? new Set();
      for (const k of [...Object.keys(l.u), ...(extra[l.program] ?? [])]) set.add(k);
      seen.set(l.program, set);
    }
    for (const [program, keys] of seen) {
      const src = PROGRAMS[program as keyof typeof PROGRAMS].frag + (PROGRAMS[program as keyof typeof PROGRAMS].vert ?? '');
      for (const k of keys) assert.match(src, new RegExp(`uniform float [^;]*\\bu_${k}\\b`), `${program} declares u_${k}`);
    }
  });

  test('no scene carries animated grain: the dither is fixed in place and under one 8-bit level', () => {
    for (const [name, p] of Object.entries(PROGRAMS)) {
      const finish = /void finish\(vec3 c\)\{([^}]*)\}/.exec(p.frag)?.[1];
      if (finish === undefined) continue;
      assert.doesNotMatch(finish, /u_time/, `${name}: the dither must not change from frame to frame`);
      assert.match(finish, /\/ 255\./, name);
    }
  });

  test('every program is GLSL ES 3.00 with no texture or external resource', () => {
    for (const [name, p] of Object.entries(PROGRAMS)) {
      for (const src of [p.frag, p.vert ?? '#version 300 es']) assert.ok(src.startsWith('#version 300 es'), name);
      assert.doesNotMatch(p.frag + (p.vert ?? ''), /sampler2D|texture\(/, name);
    }
  });
});
