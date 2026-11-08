// The page's own script: small, loaded with the page. It reads the reading position from the
// beats on screen, runs the controls (enter, divine sight, sound, motion, sequences, replay), and
// shows a CSS still per sequence until — or instead of — the WebGL engine, which it imports lazily.
// The text never depends on it: without JavaScript the whole chapter is there to read.
import { track } from '../../../platform/analytics/track.ts';
import { B, position, SEQUENCE_COUNT, sequenceAt, ss } from './timeline.ts';
import type { Cue, Score } from './audio.ts';

const ID = 'divya-chakshu';
const root = document.documentElement;
root.classList.add('dc-js');

const $ = <T extends Element = HTMLElement>(sel: string) => document.querySelector<T>(sel);
const $$ = <T extends Element = HTMLElement>(sel: string) => [...document.querySelectorAll<T>(sel)];

const reducedQuery = matchMedia('(prefers-reduced-motion: reduce)');
const state = {
  g: 0,
  velocity: 0,
  entered: false,
  openAt: -1,
  sightAt: -1,
  paused: false,
  ptr: [0, 0] as [number, number],
};
const reduced = () => reducedQuery.matches;

// ---- Reading position -------------------------------------------------------------------------
const beats = $$('[data-beat]');
let offsets: { top: number; height: number; seq: number; beat: number }[] = [];
function measure() {
  offsets = beats.map((b) => {
    const r = b.getBoundingClientRect();
    return { top: r.top + scrollY, height: r.height, seq: Number(b.dataset.seq), beat: Number(b.dataset.beat) };
  });
}
let lastG = 0, lastT = performance.now();
function read() {
  const line = scrollY + innerHeight * 0.5;
  let o = offsets[0];
  for (const x of offsets) { if (x.top <= line) o = x; else break; }
  if (!o) return;
  state.g = position(o.seq, o.beat, (line - o.top) / o.height);
  const now = performance.now();
  const dt = Math.max(0.016, (now - lastT) / 1000);
  state.velocity = state.velocity * 0.8 + ((state.g - lastG) / dt) * 0.2;
  lastG = state.g; lastT = now;
  if (!state.entered && state.g > 0.33) enter(false);
  onSequence(sequenceAt(state.g));
}

// ---- Stills, progress and the sequence list ---------------------------------------------------
const stage = $('[data-stage]')!;
const label = $('[data-progress-label]');
const fill = $('[data-progress-fill]');
let currentSeq = -1;
function onSequence(i: number) {
  if (fill) fill.style.transform = `scaleY(${Math.max(0.02, state.g / SEQUENCE_COUNT)})`;
  if (i === currentSeq) return;
  currentSeq = i;
  stage.dataset.seq = String(i);
  const links = $$<HTMLAnchorElement>('[data-chapter]');
  links.forEach((a, k) => { if (k === i) a.setAttribute('aria-current', 'step'); else a.removeAttribute('aria-current'); });
  if (label) label.textContent = links[i]?.textContent?.trim() ?? '';
  track(ID, 'sequence', { id: links[i]?.dataset.chapter ?? String(i) });
}

// Text arrives as its beat comes on screen.
const io = new IntersectionObserver((entries) => {
  for (const e of entries) if (e.isIntersecting) e.target.classList.add('is-in');
}, { rootMargin: '0px 0px -18% 0px' });
for (const b of beats) io.observe(b);

// ---- Moments: entering, divine sight ----------------------------------------------------------
const status = $('[data-status]');
const announce = (text: string) => { if (status) status.textContent = text; };
const now = () => performance.now();
function moments() {
  const t = now();
  const open = state.openAt < 0 ? 0 : reduced() ? 1 : ss(0, 4200, t - state.openAt);
  const sight = state.sightAt < 0 ? 0 : reduced() ? 1 : Math.min(1, (t - state.sightAt) / 5200);
  return { open, sight };
}

const enterBtn = $<HTMLButtonElement>('[data-enter]');
function enter(byButton: boolean) {
  if (state.entered) return;
  state.entered = true;
  state.openAt = now();
  root.dataset.entered = '';
  cue('open');
  track(ID, 'enter', { byButton });
  if (byButton) {
    const next = $('[data-seq="0"][data-beat="1"]');
    // Carry the visitor on only if they have not already moved on themselves.
    window.setTimeout(() => { if (state.g < 0.3) next?.scrollIntoView({ behavior: reduced() ? 'auto' : 'smooth', block: 'center' }); }, reduced() ? 0 : 2600);
  }
}
enterBtn?.addEventListener('click', () => enter(true));

const sightBtn = $<HTMLButtonElement>('[data-sight]');
sightBtn?.addEventListener('click', () => {
  if (state.sightAt >= 0) return;
  state.sightAt = now();
  sightBtn.setAttribute('aria-disabled', 'true');
  const text = sightBtn.querySelector('[data-sight-label]');
  if (text) text.textContent = 'Divine sight received';
  root.dataset.sighted = '';
  announce('Divine sight received. The view opens.');
  cue('sight');
  track(ID, 'sight', {});
});

$('[data-replay]')?.addEventListener('click', () => {
  state.entered = false; state.openAt = -1; state.sightAt = -1;
  delete root.dataset.entered; delete root.dataset.sighted;
  if (sightBtn) { sightBtn.removeAttribute('aria-disabled'); const t = sightBtn.querySelector('[data-sight-label]'); if (t) t.textContent = 'Receive divine sight'; }
  for (const b of beats) b.classList.remove('is-in');
  scrollTo({ top: 0, behavior: 'auto' });
  enterBtn?.focus({ preventScroll: true });
  track(ID, 'replay', {});
});

// ---- Pointer (depth and the eyes that follow) -------------------------------------------------
addEventListener('pointermove', (e) => {
  state.ptr = [(e.clientX / innerWidth) * 2 - 1, 1 - (e.clientY / innerHeight) * 2];
}, { passive: true });

// ---- Controls ---------------------------------------------------------------------------------
const controls = $('[data-controls]');
if (controls) controls.hidden = false;
for (const el of $$('[data-js-only]')) el.hidden = false;
for (const el of $$('[data-nojs-only]')) el.hidden = true;

const motionBtn = $<HTMLButtonElement>('[data-motion]');
motionBtn?.addEventListener('click', () => {
  state.paused = !state.paused;
  motionBtn.setAttribute('aria-pressed', String(state.paused));
  root.toggleAttribute('data-paused', state.paused);
});

let score: Score | undefined;
let soundOn = false;
const soundBtn = $<HTMLButtonElement>('[data-sound]');
soundBtn?.addEventListener('click', async () => {
  soundOn = !soundOn;
  soundBtn.setAttribute('aria-pressed', String(soundOn));
  if (soundOn) {
    try {
      if (!score) score = new (await import('./audio.ts')).Score();
      await score.on();
      score.follow(state.g);
    } catch {
      soundOn = false;
      soundBtn.setAttribute('aria-pressed', 'false');
      announce('Sound is not available in this browser.');
    }
  } else score?.off();
});
function cue(c: Cue) { if (soundOn) score?.cue(c); }
let lastInk = 0, lastStill = 0;
setInterval(() => {
  if (!soundOn || !score) return;
  score.follow(state.g);
}, 250);

const listBtn = $<HTMLButtonElement>('[data-chapters-toggle]');
const list = $('#dc-chapters');
function setList(open: boolean) {
  listBtn?.setAttribute('aria-expanded', String(open));
  if (list) list.hidden = !open;
}
listBtn?.addEventListener('click', () => setList(listBtn.getAttribute('aria-expanded') !== 'true'));
list?.addEventListener('click', (e) => {
  const a = (e.target as Element).closest<HTMLAnchorElement>('a[href^="#"]');
  if (!a) return;
  e.preventDefault();
  const target = document.getElementById(a.hash.slice(1));
  setList(false);
  target?.scrollIntoView({ behavior: reduced() ? 'auto' : 'smooth' });
  (target?.querySelector('h1, h2') as HTMLElement | null)?.focus({ preventScroll: true });
});
addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && listBtn?.getAttribute('aria-expanded') === 'true') { setList(false); listBtn.focus(); }
});

// Controls step back when the visitor is still; any movement or focus brings them forward.
let idle = 0;
const wake = () => { controls?.classList.remove('is-idle'); clearTimeout(idle); idle = window.setTimeout(() => controls?.classList.add('is-idle'), 3500); };
for (const ev of ['pointermove', 'keydown', 'focusin', 'touchstart'] as const) addEventListener(ev, wake, { passive: true });
wake();

// ---- WebGL --------------------------------------------------------------------------------------
const canvas = $<HTMLCanvasElement>('[data-canvas]');
const gl = canvas?.getContext('webgl2', { alpha: false, antialias: false, depth: false, stencil: false, powerPreference: 'high-performance' }) ?? null;
function fallback(reason: string) {
  root.classList.remove('dc-gl');
  root.classList.add('dc-still');
  console.warn(`[divya-chakshu] showing stills: ${reason}`);
}
if (!canvas || !gl) fallback('WebGL2 is not available');
else {
  import('./engine.ts').then(({ start }) => {
    start(canvas, gl, {
      position: () => state.g,
      moments,
      paused: () => state.paused,
      reduced,
      pointer: () => state.ptr,
      velocity: () => state.velocity,
      onInk: (ink) => {
        if ((ink > 0.5) !== (lastInk > 0.5)) { root.toggleAttribute('data-ink', ink > 0.5); if (ink > 0.5) cue('blaze'); }
        lastInk = ink;
      },
      onFail: fallback,
      onRecover: () => { root.classList.add('dc-gl'); root.classList.remove('dc-still'); },
    });
    root.classList.add('dc-gl');
  }).catch((e: unknown) => fallback(e instanceof Error ? e.message : String(e)));
}

// The declaration of Time sounds once each time it is reached.
setInterval(() => {
  const still = state.g > B(6, 1, 0.05) && state.g < B(6, 2, 0.2) ? 1 : 0;
  if (still && !lastStill) cue('kala');
  lastStill = still;
}, 200);

// Start reading only once everything above exists.
new ResizeObserver(() => { measure(); read(); }).observe($('main')!);
addEventListener('scroll', read, { passive: true });
setInterval(() => { state.velocity *= 0.85; }, 100);
measure();
read();
