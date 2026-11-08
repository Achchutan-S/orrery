// The soundscape, synthesised with the Web Audio API: no recordings, no music by anyone else.
// Loaded only when the visitor turns sound on. Each voice is a small graph whose gain follows
// soundscape(g) in timeline.ts; three cues mark the turning points. The end is silence.
import { soundscape, type Voice } from './timeline.ts';

const LEVEL: Record<Voice, number> = { wind: 0.22, rumble: 0.3, drone: 0.16, shimmer: 0.05, choir: 0.07, roar: 0.22, bells: 0.2, lamp: 0.05 };
const SA = 73.42; // D2, the drone's tonic

export type Cue = 'open' | 'sight' | 'blaze' | 'kala';

export class Score {
  private ctx = new AudioContext();
  private master = this.ctx.createGain();
  private voices = {} as Record<Voice, GainNode>;
  private noise: AudioBuffer;
  private timers: number[] = [];
  private bellsOn = 0;
  private droneOn = 0;
  private enabled = false;

  constructor() {
    const comp = this.ctx.createDynamicsCompressor();
    comp.threshold.value = -18;
    this.master.gain.value = 0;
    this.master.connect(comp).connect(this.ctx.destination);
    this.noise = this.ctx.createBuffer(1, this.ctx.sampleRate * 4, this.ctx.sampleRate);
    const d = this.noise.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    for (const v of Object.keys(LEVEL) as Voice[]) {
      const g = this.ctx.createGain();
      g.gain.value = 0;
      g.connect(this.master);
      this.voices[v] = g;
    }
    this.wind();
    this.rumble();
    this.shimmer();
    this.choir();
    this.roar();
    this.lamp();
    // The drone is plucked and the bells are struck: scheduled, while their voices are audible.
    this.timers.push(window.setInterval(() => this.pluckCycle(), 4800));
    this.timers.push(window.setInterval(() => { if (this.bellsOn > 0.05) this.bell(SA * 2, 6, 0.6); }, 3600));
  }

  private src(loop = true) { const s = this.ctx.createBufferSource(); s.buffer = this.noise; s.loop = loop; s.start(); return s; }
  private osc(type: OscillatorType, f: number) { const o = this.ctx.createOscillator(); o.type = type; o.frequency.value = f; o.start(); return o; }
  private filter(type: BiquadFilterType, f: number, q = 0.7) { const b = this.ctx.createBiquadFilter(); b.type = type; b.frequency.value = f; b.Q.value = q; return b; }
  private lfo(f: number, depth: number, target: AudioParam) { const o = this.osc('sine', f); const g = this.ctx.createGain(); g.gain.value = depth; o.connect(g).connect(target); }

  private wind() {
    const bp = this.filter('bandpass', 420, 0.6);
    this.lfo(0.07, 260, bp.frequency);
    const g = this.ctx.createGain();
    this.lfo(0.11, 0.35, g.gain);
    g.gain.value = 0.6;
    this.src().connect(bp).connect(g).connect(this.voices.wind);
  }
  private rumble() {
    const lp = this.filter('lowpass', 90);
    this.src().connect(lp).connect(this.voices.rumble);
  }
  private shimmer() {
    for (const [i, h] of [8, 12, 16, 18, 24, 32].entries()) {
      const g = this.ctx.createGain();
      g.gain.value = 0.15;
      this.lfo(0.05 + i * 0.023, 0.14, g.gain);
      this.osc('sine', SA * h).connect(g).connect(this.voices.shimmer);
    }
  }
  private choir() {
    const f1 = this.filter('bandpass', 720, 6), f2 = this.filter('bandpass', 1120, 7);
    for (const [f, det] of [[SA * 2, -6], [SA * 3, 4], [SA * 4, 7], [SA * 4, -9]] as const) {
      const o = this.osc('sawtooth', f);
      o.detune.value = det;
      o.connect(f1); o.connect(f2);
    }
    f1.connect(this.voices.choir); f2.connect(this.voices.choir);
  }
  private roar() {
    const lp = this.filter('lowpass', 260, 1.2);
    this.lfo(0.3, 120, lp.frequency);
    const shaper = this.ctx.createWaveShaper();
    const curve = new Float32Array(1024);
    for (let i = 0; i < curve.length; i++) { const x = (i / 511.5) - 1; curve[i] = Math.tanh(x * 4); }
    shaper.curve = curve;
    const trem = this.ctx.createGain();
    trem.gain.value = 0.7;
    this.lfo(5.5, 0.3, trem.gain);
    this.src().connect(lp).connect(shaper).connect(trem).connect(this.voices.roar);
    const sub = this.ctx.createGain();
    sub.gain.value = 0.8;
    this.osc('sine', SA / 2).connect(sub).connect(this.voices.roar);
  }
  private lamp() {
    const o = this.osc('sine', SA * 4);
    this.lfo(4.5, 2, o.frequency);
    const g = this.ctx.createGain();
    g.gain.value = 0.6;
    o.connect(g).connect(this.voices.lamp);
    const fifth = this.ctx.createGain();
    fifth.gain.value = 0.25;
    this.osc('triangle', SA * 6).connect(fifth).connect(this.voices.lamp);
  }

  /** One cycle of four plucked strings, Pa Sa Sa Sa (low), like a tanpura. */
  private pluckCycle() {
    if (this.droneOn < 0.02) return;
    const t0 = this.ctx.currentTime;
    [SA * 1.5, SA * 2, SA * 2, SA].forEach((f, i) => this.pluck(f, t0 + i * 1.2));
  }
  private pluck(f: number, at: number) {
    const o = this.ctx.createOscillator();
    o.type = 'sawtooth';
    o.frequency.value = f;
    const bp = this.filter('bandpass', 2600, 1.4);
    bp.frequency.setValueAtTime(2600, at);
    bp.frequency.exponentialRampToValueAtTime(700, at + 3.5);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0, at);
    g.gain.linearRampToValueAtTime(1, at + 0.02);
    g.gain.exponentialRampToValueAtTime(0.001, at + 4.6);
    o.connect(bp).connect(g).connect(this.voices.drone);
    o.start(at);
    o.stop(at + 4.7);
  }
  /** A struck bell by FM: inharmonic, long decay. */
  private bell(f: number, decay: number, level: number, to: AudioNode = this.voices.bells) {
    const t = this.ctx.currentTime;
    const car = this.ctx.createOscillator(), mod = this.ctx.createOscillator();
    car.frequency.value = f; mod.frequency.value = f * 1.414;
    const mg = this.ctx.createGain();
    mg.gain.setValueAtTime(f * 2.2, t);
    mg.gain.exponentialRampToValueAtTime(f * 0.05, t + decay);
    mod.connect(mg).connect(car.frequency);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(level, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + decay);
    car.connect(g).connect(to);
    car.start(t); mod.start(t); car.stop(t + decay); mod.stop(t + decay);
  }
  private swell(seconds: number, from: number, to: number, level: number) {
    const t = this.ctx.currentTime;
    const s = this.src(false);
    const bp = this.filter('bandpass', from, 2);
    bp.frequency.setValueAtTime(from, t);
    bp.frequency.exponentialRampToValueAtTime(to, t + seconds);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(level, t + seconds * 0.8);
    g.gain.linearRampToValueAtTime(0, t + seconds);
    s.connect(bp).connect(g).connect(this.master);
    s.stop(t + seconds);
  }

  cue(c: Cue) {
    if (this.ctx.state !== 'running') return;
    if (c === 'open') this.swell(3.5, 200, 900, 0.12);
    if (c === 'sight') { this.swell(4.5, 300, 5000, 0.18); this.bell(SA * 8, 5, 0.12, this.master); }
    if (c === 'blaze') this.swell(2.5, 2000, 9000, 0.2);
    if (c === 'kala') { this.bell(SA / 1.5, 9, 0.9, this.master); this.bell(SA, 7, 0.5, this.master); }
  }

  /** Follow the reading position. */
  follow(g: number) {
    const now = this.ctx.currentTime;
    const mix = soundscape(g);
    this.bellsOn = mix.bells;
    this.droneOn = mix.drone;
    for (const v of Object.keys(mix) as Voice[]) this.voices[v].gain.setTargetAtTime(mix[v] * LEVEL[v], now, 0.6);
  }

  async on() { this.enabled = true; await this.ctx.resume(); this.master.gain.setTargetAtTime(0.9, this.ctx.currentTime, 0.4); }
  off() {
    this.enabled = false;
    this.master.gain.setTargetAtTime(0, this.ctx.currentTime, 0.2);
    window.setTimeout(() => { if (!this.enabled) void this.ctx.suspend(); }, 1200);
  }
}
