// The score: from the reader's position in the text to what every scene and sound layer does.
// Position `g` runs from 0 to 9: the integer part is the sequence, the fraction the progress through
// its beats, so `B(seq, beat, f)` names a moment by the beat that is on screen (content.ts). Pure
// functions only, shared by the WebGL engine, the audio and the tests.

/** Beats per sequence, as content.ts has them (a test keeps the two equal). Written out so the
 * scripts do not carry the text, which is already in the page. */
export const BEAT_COUNTS: readonly number[] = [3, 5, 5, 4, 7, 7, 6, 5, 9];

export type ProgramName = 'battlefield' | 'suns' | 'cosmos' | 'time' | 'lamp' | 'feather' | 'dust' | 'rivers' | 'moths' | 'lives';

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
  /** Opening of the prologue after "Enter", 0–1 (time-driven). */
  open: number;
  /** The gift of divine sight after its button, 0–1 (time-driven). */
  sight: number;
}

export const SEQUENCE_COUNT = BEAT_COUNTS.length;

/** The position of beat `beat` (plus fraction `f` of it) in sequence `seq`. */
export const B = (seq: number, beat: number, f = 0): number => seq + (beat + f) / BEAT_COUNTS[seq]!;

const clamp01 = (x: number) => (x < 0 ? 0 : x > 1 ? 1 : x);
/** Smoothstep from a to b. */
export const ss = (a: number, b: number, x: number) => { const t = clamp01((x - a) / (b - a)); return t * t * (3 - 2 * t); };
/** Rises over a–b, holds, falls over c–d. */
export const win = (x: number, a: number, b: number, c: number, d: number) => ss(a, b, x) * (1 - ss(c, d, x));

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

export function frame(g: number, m: Moments): Frame {
  const L: Layer[] = [];
  const add = (program: ProgramName, alpha: number, u: Record<string, number>) => { if (alpha > 0.002) L.push({ program, alpha: clamp01(alpha), u }); };

  // Kurukshetra, then divine sight opening inside it.
  const sight = Math.max(m.sight, ss(B(2, 3, 0), B(2, 3, 0.6), g));
  add('battlefield', 1 - ss(B(3, 1, 0.2), B(3, 2, 0), g), {
    open: Math.max(m.open, ss(0.2, 0.6, g)),
    near: ss(B(0, 2), B(1, 2), g),
    sight,
    lattice: ss(B(2, 2, 0.5), B(2, 4, 0.5), g),
    dawn: 0,
    end: 0,
  });
  // The return: morning on the same plain, then darkness.
  const end = ss(B(8, 7, 0.8), B(8, 8, 0.45), g);
  add('battlefield', ss(B(8, 5), B(8, 5, 0.6), g), { open: 1, near: 1, sight: 0, lattice: 0, dawn: 1, end });

  // A thousand suns.
  const white = win(g, B(3, 2, 0.15), B(3, 2, 0.4), B(3, 3, 0.55), B(3, 3, 0.95));
  add('suns', win(g, B(3, 0, 0.3), B(3, 1, 0.3), B(4, 0, 0.5), B(4, 1, 0.1)), {
    rise: ss(B(3, 1), B(3, 2, 0.4), g),
    white,
    zoom: -(g - 3) * 1.6,
  });

  // The universal form, wonder turning to terror. Depth accelerates once terror begins.
  add('cosmos', win(g, B(4, 0, 0.3), B(4, 1, 0.2), B(5, 4, 0.85), B(5, 5, 0.25)), {
    reveal: ss(B(4, 0, 0.4), B(4, 2, 0.6), g),
    depth: (g - 4) * 1.6 + Math.max(0, g - 5) * 3,
    terror: ss(B(5, 0, 0.6), B(5, 2, 0.6), g),
    emblem: win(g, B(4, 4, 0.6), B(4, 5, 0.3), B(5, 1, 0.5), B(5, 2, 0.5)),
    eyes: ss(B(4, 3, 0.3), B(4, 4, 0.4), g),
    sunmoon: ss(B(4, 5, 0.6), B(4, 6, 0.4), g),
    dim: 1,
    fold: 0,
  });
  // The same form, far and faint behind the friend's lamp; then it folds into one point.
  add('cosmos', ss(B(7, 1), B(7, 2, 0.5), g) * (1 - ss(B(8, 4, 0.3), B(8, 5, 0.1), g)), {
    reveal: 1,
    depth: (g - 7) * 0.6,
    terror: 0,
    emblem: win(g, B(8, 2), B(8, 2, 0.5), B(8, 3, 0.5), B(8, 4, 0.3)),
    eyes: 1,
    sunmoon: 1,
    dim: 0.09 + 0.5 * ss(B(8, 0, 0.3), B(8, 1, 0.6), g),
    fold: ss(B(8, 3), B(8, 4, 0.7), g),
  });

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

  // Additive light: the flame that takes the moths, later the friend's lamp.
  add('lamp', win(g, B(5, 4, 0.85), B(5, 5, 0.2), B(5, 6, 0.5), B(6, 0, 0.4)), { heat: 1 });
  add('lamp', win(g, B(7, 0, 0.4), B(7, 1, 0.4), B(8, 0, 0.6), B(8, 1, 0.6)), { heat: 0 });

  // Particles, drawn last.
  add('dust', win(g, 0.25, 0.6, B(3, 1), B(3, 1, 0.6)), { align: sight, dawn: 0 });
  add('dust', ss(B(8, 5, 0.3), B(8, 6, 0.2), g) * (1 - end), { align: 0, dawn: 1 });
  add('rivers', win(g, B(5, 3, 0.5), B(5, 4, 0.1), B(5, 4, 0.9), B(5, 5, 0.3)), {});
  add('moths', win(g, B(5, 4, 0.95), B(5, 5, 0.3), B(5, 6, 0.2), B(5, 6, 0.7)), {});
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
