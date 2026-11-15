// The score: from the reader's position in the text to what every scene and sound layer does.
// Position `g` runs from 0 to 9: the integer part is the sequence, the fraction the progress through
// its beats, so `B(seq, beat, f)` names a moment by the beat that is on screen (content.ts). Pure
// functions only, shared by the WebGL engine, the audio and the tests.

/** Beats per sequence, as content.ts has them (a test keeps the two equal). Written out so the
 * scripts do not carry the text, which is already in the page. */
export const BEAT_COUNTS: readonly number[] = [3, 5, 5, 4, 7, 7, 6, 5, 9];

export type ProgramName = 'battlefield' | 'suns' | 'orb' | 'cosmos' | 'jaws' | 'time' | 'lamp' | 'feather' | 'dust' | 'rivers' | 'moths' | 'lives';

export interface Layer {
  program: ProgramName;
  alpha: number;
  /** Uniforms beyond the shared ones (u_res, u_time, u_alpha, u_ptr), without the `u_` prefix. */
  u: Record<string, number>;
}

export interface Frame {
  /** Drawn in this order; only layers with alpha > 0. */
  layers: Layer[];
  /** 0: light text on dark; 1: the light is white enough that text turns to dark ink. */
  ink: number;
}

export interface Moments {
  /** Opening of the prologue after "Enter", 0–1 (time-driven; entering happens once). */
  open: number;
}


export const SEQUENCE_COUNT = BEAT_COUNTS.length;

/** The position of beat `beat` (plus fraction `f` of it) in sequence `seq`. */
export const B = (seq: number, beat: number, f = 0): number => seq + (beat + f) / BEAT_COUNTS[seq]!;

const clamp01 = (x: number) => (x < 0 ? 0 : x > 1 ? 1 : x);
/** Smoothstep from a to b. */
export const ss = (a: number, b: number, x: number) => { const t = clamp01((x - a) / (b - a)); return t * t * (3 - 2 * t); };
/** Rises over a–b, holds, falls over c–d. */
export const win = (x: number, a: number, b: number, c: number, d: number) => ss(a, b, x) * (1 - ss(c, d, x));

/**
 * Divine sight, 0–1, from the reading position alone. It used to latch once its button was pressed,
 * so scrolling back never returned to the plain as it was; now the button only carries the reader
 * forward, and the picture at any position is the same whichever way it was reached.
 */
export const sightAt = (g: number): number => ss(B(2, 2, 0.7), B(2, 3, 0.6), g);
/** Where the sight button carries the reader: the eye fully open. */
export const SIGHT_OPEN = B(2, 3, 0.62);

/** Position from a beat index and the fraction of that beat scrolled past. */
export function position(seq: number, beat: number, local: number): number {
  const n = BEAT_COUNTS[seq] ?? 1;
  return Math.min(SEQUENCE_COUNT - 1e-6, seq + (Math.min(beat, n - 1) + clamp01(local)) / n);
}

/** Where a still frame sits for each beat when motion is reduced: the middle of the beat. */
export const stillPosition = (g: number): number => {
  const seq = Math.floor(g);
  const n = BEAT_COUNTS[seq] ?? 1;
  return seq + (Math.floor((g - seq) * n) + 0.5) / n;
};

/** The sequence index on screen at position g. */
export const sequenceAt = (g: number) => Math.max(0, Math.min(SEQUENCE_COUNT - 1, Math.floor(g)));

// ---- Recognition (sequences I and V) ------------------------------------------------------------
/** The three Arjuna names (11.26, 11.34), in the order they stand. Labels only: the text names them. */
export const NAMED = ['Bhishma', 'Drona', 'Karna'] as const;
/** Where they stand in the opposing ranks on the plain, and among the teeth (shaders.ts NX0–NX2). */
export const FIELD_NAMED = [0.56, 0.65, 0.74], JAW_NAMED = [0.35, 0.51, 0.67];   // jaw: fractions of its half-width
const mix = (a: number, b: number, t: number) => a + (b - a) * t;
/** How the jaws of sequence V stand at position g: formation and closing, 0–1. */
export const jawsAt = (g: number) => ({ form: ss(B(5, 3, 0), B(5, 3, 0.45), g), close: ss(B(5, 3, 0.55), B(5, 3, 0.9), g) });
export const jawsAlpha = (g: number) => win(g, B(5, 2, 0.8), B(5, 3, 0.1), B(5, 3, 0.88), B(5, 4, 0.12));
export const namedAlpha = (g: number) => win(g, B(1, 0, 0.6), B(1, 1, 0.2), B(1, 2, 0.6), B(1, 3, 0.2));
/** The jaws' geometry, exactly as the JAWS shader computes it (screen units of the frame's height). */
export function jaw(form: number, close: number, aspect: number) {
  const A0 = Math.exp(mix(Math.log(4), Math.log(0.24), form));
  const A = A0 * mix(1, 0.07, close), W = Math.exp(mix(Math.log(80), Math.log(Math.min(0.98, aspect * 0.47)), form));
  return { A, W, yc: mix(-0.13, -0.02, form) + A, Z: mix(1, 1.75, form), k: mix(1, 2.1, form), H: (x: number) => A * Math.pow(Math.max(0, 1 - (x / W) ** 2), 0.62) };
}
export interface Name { x: number; y: number; a: number }
/**
 * Where each named figure is on screen at position g, for a frame of this aspect, in units of the
 * frame's height from its centre (y up); a is how visible its label should be. On the plain in
 * sequence I while the text speaks of them; among the teeth in sequence V.
 */
export function names(g: number, aspect: number): Name[] {
  const fov = Math.min(1, Math.max(0.55, aspect / 1.5));
  const hz = mix(-0.37, -0.13, ss(0, 0.7, ss(B(0, 2), B(1, 2), g)));
  const half = aspect / 2 - 0.03, aField = namedAlpha(g), aJaw = jawsAlpha(g);
  const { form, close } = jawsAt(g), J = jaw(form, close, aspect);
  return FIELD_NAMED.map((fx, i) => {
    if (aJaw > aField) {
      const x = JAW_NAMED[i]! * J.W;
      return { x, y: J.yc - J.H(x) + (0.059 * J.k) / J.Z, a: Math.abs(x) < half ? aJaw * (1 - ss(0.85, 1, close)) : 0 };
    }
    const x = fx * fov;
    return { x, y: (hz + 0.03) * fov, a: Math.abs(x) < half ? aField : 0 };
  });
}

export function frame(g: number, m: Moments): Frame {
  const L: Layer[] = [];
  const add = (program: ProgramName, alpha: number, u: Record<string, number>) => { if (alpha > 0.002) L.push({ program, alpha: clamp01(alpha), u }); };

  // Kurukshetra, then divine sight opening inside it.
  const sight = sightAt(g);
  add('battlefield', 1 - ss(B(3, 1, 0.2), B(3, 2, 0), g), {
    open: Math.max(m.open, ss(0.2, 0.6, g)),
    near: ss(B(0, 2), B(1, 2), g),
    sight,
    lattice: ss(B(2, 2, 0.5), B(2, 4, 0.5), g),
    dawn: 0,
    end: 0,
    // Divine sight begins in the plain: its surface becomes eyes before the great eye opens.
    watch: ss(B(2, 1, 0.2), B(2, 2, 0.5), g) * (1 - ss(B(2, 3, 0.3), B(2, 3, 0.7), g)),
    turn: 0,
    named: namedAlpha(g),
  });
  // The return: morning on the same plain, then darkness.
  const end = ss(B(8, 7, 0.8), B(8, 8, 0.45), g);
  // At "seeing this gentle human form of yours" (11.51) the charioteer turns his head back to Arjuna.
  add('battlefield', ss(B(8, 5), B(8, 5, 0.6), g), { open: 1, near: 1, sight: 0, lattice: 0, dawn: 1, end, watch: 0, turn: ss(B(8, 5, 0.55), B(8, 6, 0.35), g), named: 0 });

  // A thousand suns.
  const white = win(g, B(3, 2, 0.15), B(3, 2, 0.4), B(3, 3, 0.55), B(3, 3, 0.95));
  add('suns', win(g, B(3, 0, 0.3), B(3, 1, 0.3), B(3, 3, 0.92), B(4, 0, 0.35)), {
    rise: ss(B(3, 1), B(3, 2, 0.4), g),
    white,
    zoom: -(g - 3) * 1.6,
  });
  // Out of the white: the plain again, and over it one small clear world holding the same plain, every
  // army and the whole sky in one point (11.13). The view flies into that point, the heart of the form.
  add('orb', win(g, B(3, 3, 0.6), B(3, 3, 0.92), B(4, 1, 0.93), B(4, 2, 0.02)), { fly: ss(B(4, 0, 0.1), B(4, 1, 0.92), g), white });

  // The universal form. It is first seen whole, a disc of worlds ringed with flame (11.13, "gathered
  // in one place"). Then its rim passes out of the frame ("not in front of him: within him") and from
  // there until the end of terror the reader is inside it, travelling inward. Depth accelerates once
  // terror begins. At 11.29 the whole burning form draws in to one point: the flame the moths fly to.
  const gather = ss(B(5, 4, 0.72), B(5, 5, 0.3), g);
  // It is entered through the white of that point (both are white where they meet, so the change is unseen).
  add('cosmos', win(g, B(4, 1, 0.89), B(4, 1, 0.93), B(5, 5, 0.25), B(5, 5, 0.55)), {
    flash: 1 - ss(B(4, 1, 0.94), B(4, 2, 0.22), g),
    reveal: ss(B(4, 1, 0.9), B(4, 2, 0.9), g),
    within: ss(B(4, 2, 0.3), B(4, 3, 0.5), g),
    depth: (g - 4) * 1.6 + Math.max(0, g - 5) * 3,
    terror: ss(B(5, 0, 0.6), B(5, 2, 0.6), g),
    emblem: win(g, B(4, 4, 0.6), B(4, 5, 0.3), B(5, 1, 0.5), B(5, 2, 0.5)),
    eyes: ss(B(4, 3, 0.3), B(4, 4, 0.4), g),
    sunmoon: ss(B(4, 5, 0.6), B(4, 6, 0.4), g),
    dim: 1,
    fold: 0,
    gather,
  });
  // The same form behind the friend's lamp: still everywhere, faint and slow. Asked to become gentle
  // again (11.45), it recedes: ring after ring falls away inward until all of it is one disc, seen
  // from outside as at first, and then that disc folds into one point.
  const recede = ss(B(8, 0, 0.5), B(8, 2, 0.3), g);
  add('cosmos', ss(B(7, 1), B(7, 2, 0.5), g) * (1 - ss(B(8, 4, 0.3), B(8, 5, 0.1), g)), {
    reveal: 1,
    within: 1 - recede,
    depth: (g - 7) * 0.6 - recede * 5,
    terror: 0,
    emblem: win(g, B(8, 2), B(8, 2, 0.5), B(8, 3, 0.5), B(8, 4, 0.3)),
    eyes: 1,
    sunmoon: 1,
    dim: 0.07 + 0.4 * ss(B(8, 0, 0.3), B(8, 2, 0.2), g),
    fold: ss(B(8, 3), B(8, 4, 0.7), g),
    gather: 0,
    flash: 0,
  });

  // Then he sees them (11.26–27): the plain once more, under the burning form, and its two armies
  // are the jaws; the three he named stand among the teeth.
  add('jaws', jawsAlpha(g), jawsAt(g));

  // Time.
  const still = win(g, B(6, 1, 0.05), B(6, 1, 0.3), B(6, 2, 0.2), B(6, 2, 0.7));
  const timeAlpha = win(g, B(5, 6, 0.4), B(6, 0, 0.4), B(7, 0, 0.2), B(7, 1, 0.2));
  add('time', timeAlpha, {
    still,
    kala: win(g, B(6, 0, 0.6), B(6, 1, 0.3), B(6, 2), B(6, 3)),
    instrument: ss(B(6, 3, 0.2), B(6, 3, 0.7), g),
    ember: 1 - ss(B(6, 0), B(6, 1, 0.2), g),
  });

  // The peacock feather: every eye of the form gathered into one.
  add('feather', win(g, B(8, 3, 0.6), B(8, 4, 0.4), B(8, 5, 0.3), B(8, 5, 0.9)), { form: ss(B(8, 3, 0.6), B(8, 4, 0.8), g) });

  // Additive light: the flame that takes the moths, kindled as the form draws in to its point;
  // later the friend's lamp.
  add('lamp', win(g, B(5, 4, 0.95), B(5, 5, 0.35), B(5, 6, 0.5), B(6, 0, 0.4)), { heat: 1 });
  add('lamp', win(g, B(7, 0, 0.4), B(7, 1, 0.4), B(8, 0, 0.6), B(8, 1, 0.6)), { heat: 0 });

  // Particles, drawn last. The plain has none until divine sight: the motes are what sight reveals,
  // rising from the ground onto the rings. (They used to drift over the opening as glitter.)
  add('dust', win(g, B(2, 2, 0.75), B(2, 3, 0.45), B(3, 1), B(3, 1, 0.6)), { align: sight, dawn: 0 });
  add('dust', ss(B(8, 5, 0.3), B(8, 6, 0.2), g) * (1 - end), { align: 0, dawn: 1 });
  // The rivers run to the same point the form draws in to, and the moths arrive along the same
  // inward spiral while the rivers are still running, so one motion carries through both verses.
  add('rivers', win(g, B(5, 3, 0.85), B(5, 4, 0.15), B(5, 4, 0.95), B(5, 5, 0.3)), { gather });
  add('moths', win(g, B(5, 4, 0.8), B(5, 5, 0.3), B(5, 6, 0.25), B(5, 6, 0.75)), {});
  add('lives', timeAlpha * (1 - 0.6 * still), { still });

  return { layers: L, ink: ss(0.45, 0.6, white) };
}

export type Voice = 'wind' | 'rumble' | 'drone' | 'shimmer' | 'choir' | 'roar' | 'bells' | 'lamp';

/** Target gain (0–1) of each sound layer at position g. The end is silence. */
export function soundscape(g: number): Record<Voice, number> {
  const fadeOut = 1 - ss(B(8, 7, 0.5), B(8, 8, 0.3), g);
  return {
    wind: (1 - ss(B(2, 3), B(3, 1), g) + 0.5 * ss(B(8, 5), B(8, 6), g)) * fadeOut,
    rumble: 0.7 * (1 - ss(B(1, 4), B(2, 2), g)) + 0.2 * win(g, B(8, 5), B(8, 6), B(8, 7), B(8, 8)),
    drone: (0.8 * win(g, B(2, 1), B(2, 3), B(5, 0), B(5, 2)) + 0.5 * win(g, B(5, 0), B(5, 2), B(6, 0), B(6, 1)) + 0.6 * win(g, B(6, 0), B(6, 1), B(7, 0), B(7, 1)) + 0.3 * win(g, B(7, 0), B(7, 1), B(8, 0), B(8, 1)) + 0.45 * ss(B(8, 0), B(8, 1), g)) * fadeOut,
    shimmer: win(g, B(2, 2), B(3, 1), B(4, 2), B(4, 4)),
    choir: win(g, B(4, 0), B(4, 2), B(5, 1), B(5, 3)),
    roar: win(g, B(5, 0, 0.5), B(5, 2), B(5, 5, 0.5), B(6, 0, 0.5)),
    bells: win(g, B(5, 6), B(6, 0, 0.5), B(7, 0), B(7, 1)),
    lamp: win(g, B(7, 0), B(7, 1), B(8, 1), B(8, 2)),
  };
}
