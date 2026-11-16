// Paper noises, made on the spot from filtered noise: nothing is downloaded and nothing plays
// unless the visitor turned sound on in the studio. They are approximations of paper, not recordings.
export type Noise = 'land' | 'pick' | 'clip' | 'turn' | 'bin' | 'spark';

// [length in seconds, filter centre in Hz, filter sharpness, loudness, sweep of the centre]
const SHAPES: Record<Noise, [number, number, number, number, number]> = {
  land: [0.09, 900, 0.8, 0.5, 0.5],
  pick: [0.07, 2600, 1.2, 0.3, 1.6],
  clip: [0.03, 5200, 6, 0.45, 1],
  turn: [0.32, 1800, 0.7, 0.35, 2.2],
  bin: [0.22, 1200, 0.9, 0.5, 0.4],
  spark: [0.12, 3800, 3, 0.25, 1.4],
};

let ctx: AudioContext | undefined;

export function play(noise: Noise): void {
  try {
    ctx ??= new AudioContext();
    if (ctx.state === 'suspended') void ctx.resume();
    const [len, hz, q, gain, sweep] = SHAPES[noise];
    const buffer = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * len), ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length) ** 2;
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.Q.value = q;
    filter.frequency.setValueAtTime(hz, ctx.currentTime);
    filter.frequency.exponentialRampToValueAtTime(hz * sweep, ctx.currentTime + len);
    const vol = ctx.createGain();
    vol.gain.value = gain;
    src.connect(filter).connect(vol).connect(ctx.destination);
    src.start();
  } catch { /* no audio here: silence is fine */ }
}
