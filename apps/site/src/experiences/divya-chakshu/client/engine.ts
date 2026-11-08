// The WebGL2 renderer. One canvas, one context, one draw per visible layer. Programs compile on
// demand (ahead of the reader, using KHR_parallel_shader_compile when present) and are deleted
// once unused for a while, so only the scenes near the reader hold GPU memory. Resolution adapts
// to the frame time. Nothing is drawn when nothing changed (paused or reduced motion).
import { PROGRAMS, FULLSCREEN_VERT } from './shaders.ts';
import { frame, stillPosition, type Layer, type Moments, type ProgramName } from './timeline.ts';

export interface Inputs {
  /** Reading position 0–9. */
  position(): number;
  moments(): Moments;
  /** Scene time stops. */
  paused(): boolean;
  /** Prefers reduced motion: still frames per beat, no pointer response. */
  reduced(): boolean;
  pointer(): [number, number];
  /** Reading speed in positions per second (signed). */
  velocity(): number;
  onInk(ink: number): void;
  /** WebGL stopped working (compile failure or lost context): show the stills. */
  onFail(reason: string): void;
  onRecover(): void;
}

interface Compiled { prog: WebGLProgram; shaders: WebGLShader[]; locs: Map<string, WebGLUniformLocation | null>; lastUsed: number; ready: boolean }

const UNUSED_MS = 8000;

export function start(canvas: HTMLCanvasElement, gl: WebGL2RenderingContext, input: Inputs): () => void {
  const parallel = gl.getExtension('KHR_parallel_shader_compile');
  const lowTier = matchMedia('(pointer: coarse)').matches || Math.min(screen.width, screen.height) < 600;
  const maxScale = Math.min(devicePixelRatio || 1, lowTier ? 1 : 1.5);
  let scale = Math.min(1, maxScale);
  const cache = new Map<ProgramName, Compiled>();
  let vao = gl.createVertexArray();
  let failed = false;
  let raf = 0;
  let last = performance.now();
  let time = 0, spin = 0, ltime = 0;
  let gs = input.position();
  let px = [0, 0];
  let lastKey = '';
  const frameTimes: number[] = [];

  function shader(type: number, src: string): WebGLShader {
    const s = gl.createShader(type)!;
    gl.shaderSource(s, src);
    gl.compileShader(s);
    return s;
  }
  function compile(name: ProgramName): Compiled {
    const def = PROGRAMS[name];
    const vs = shader(gl.VERTEX_SHADER, def.vert ?? FULLSCREEN_VERT);
    const fs = shader(gl.FRAGMENT_SHADER, def.frag);
    const prog = gl.createProgram()!;
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.linkProgram(prog);
    return { prog, shaders: [vs, fs], locs: new Map(), lastUsed: performance.now(), ready: false };
  }
  /** True once the program linked; throws on a compile or link error. */
  function ready(name: ProgramName, c: Compiled): boolean {
    if (c.ready) return true;
    if (parallel && !gl.getProgramParameter(c.prog, parallel.COMPLETION_STATUS_KHR)) return false;
    if (!gl.getProgramParameter(c.prog, gl.LINK_STATUS)) {
      const [vs, fs] = c.shaders;
      throw new Error(`${name}: ${gl.getShaderInfoLog(vs!) || ''} ${gl.getShaderInfoLog(fs!) || ''} ${gl.getProgramInfoLog(c.prog) || ''}`.trim());
    }
    for (const s of c.shaders) { gl.detachShader(c.prog, s); gl.deleteShader(s); }
    c.ready = true;
    return true;
  }
  function ensure(name: ProgramName): Compiled {
    let c = cache.get(name);
    if (!c) { c = compile(name); cache.set(name, c); }
    c.lastUsed = performance.now();
    return c;
  }
  function loc(c: Compiled, n: string) {
    if (!c.locs.has(n)) c.locs.set(n, gl.getUniformLocation(c.prog, n));
    return c.locs.get(n)!;
  }
  function release(now: number) {
    for (const [name, c] of cache) {
      if (now - c.lastUsed > UNUSED_MS) { gl.deleteProgram(c.prog); cache.delete(name); }
    }
  }

  function resize() {
    const w = Math.max(1, Math.round(canvas.clientWidth * scale));
    const h = Math.max(1, Math.round(canvas.clientHeight * scale));
    if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
    px = [w, h];
  }
  const ro = new ResizeObserver(() => { lastKey = ''; });
  ro.observe(canvas);

  /** Every 45 frames, trade resolution for frame rate (or back) in steps. */
  function adapt(dt: number) {
    frameTimes.push(dt);
    if (frameTimes.length < 45) return;
    const avg = frameTimes.reduce((a, b) => a + b, 0) / frameTimes.length;
    frameTimes.length = 0;
    const next = avg > 0.024 ? Math.max(0.35, scale - 0.12) : avg < 0.0145 ? Math.min(maxScale, scale + 0.08) : scale;
    if (next !== scale) { scale = next; lastKey = ''; }
  }

  function draw(layer: Layer, c: Compiled, extra: Record<string, number>) {
    const def = PROGRAMS[layer.program];
    gl.useProgram(c.prog);
    if (def.blend === 'add') gl.blendFunc(gl.SRC_ALPHA, gl.ONE);
    else gl.blendFuncSeparate(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA, gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    gl.uniform2f(loc(c, 'u_res'), px[0]!, px[1]!);
    gl.uniform1f(loc(c, 'u_time'), time);
    gl.uniform1f(loc(c, 'u_alpha'), layer.alpha);
    const [x, y] = input.reduced() ? [0, 0] : input.pointer();
    gl.uniform2f(loc(c, 'u_ptr'), x, y);
    gl.uniform1f(loc(c, 'u_px'), scale);
    for (const k in layer.u) gl.uniform1f(loc(c, `u_${k}`), layer.u[k]!);
    for (const k in extra) gl.uniform1f(loc(c, `u_${k}`), extra[k]!);
    if (def.vert) gl.drawArrays(gl.POINTS, 0, lowTier ? def.count!.low : def.count!.high);
    else gl.drawArrays(gl.TRIANGLES, 0, 3);
  }

  function tick(now: number) {
    raf = requestAnimationFrame(tick);
    if (failed) return;
    const dt = Math.min(0.1, (now - last) / 1000);
    last = now;
    const reduced = input.reduced();
    const moving = !input.paused() && !reduced;
    const target = input.position();
    gs = reduced ? stillPosition(target) : gs + (target - gs) * (1 - Math.exp(-dt * 5));
    if (Math.abs(target - gs) < 1e-4) gs = target;
    const fr = frame(gs, input.moments());
    input.onInk(fr.ink);
    const still = fr.layers.find((l) => l.program === 'time')?.u.still ?? 0;
    if (moving) {
      time += dt;
      spin += dt * (0.35 + Math.min(4, Math.abs(input.velocity())) * 2.5) * (1 - still);
      ltime += dt * (1 - still);
    }
    const [x, y] = input.pointer();
    const key = moving ? '' : `${gs.toFixed(5)}|${canvas.clientWidth}x${canvas.clientHeight}|${reduced ? '' : `${x.toFixed(3)},${y.toFixed(3)}`}|${JSON.stringify(input.moments())}`;
    if (key && key === lastKey) return;
    lastKey = key;
    try {
      resize();
      // Compile what the next stretch of reading will need, so it is linked before it is seen.
      for (const l of [...frame(gs + 0.3, input.moments()).layers, ...frame(gs - 0.15, input.moments()).layers]) ready(l.program, ensure(l.program));
      gl.viewport(0, 0, px[0]!, px[1]!);
      gl.clearColor(0.02, 0.018, 0.03, 1);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.enable(gl.BLEND);
      gl.bindVertexArray(vao);
      const extra = { spin, ltime };
      let incomplete = false;
      for (const layer of fr.layers) {
        const c = ensure(layer.program);
        if (ready(layer.program, c)) draw(layer, c, extra);
        else incomplete = true;
      }
      if (incomplete) lastKey = '';
      release(now);
      if (moving) adapt(dt);
    } catch (e) {
      failed = true;
      input.onFail(e instanceof Error ? e.message : String(e));
    }
  }

  function onLost(e: Event) { e.preventDefault(); failed = true; cache.clear(); input.onFail('context lost'); }
  function onRestored() {
    cache.clear();
    vao = gl.createVertexArray();
    failed = false;
    lastKey = '';
    input.onRecover();
  }
  canvas.addEventListener('webglcontextlost', onLost);
  canvas.addEventListener('webglcontextrestored', onRestored);
  const onVisibility = () => { if (document.hidden) cancelAnimationFrame(raf); else { last = performance.now(); raf = requestAnimationFrame(tick); } };
  document.addEventListener('visibilitychange', onVisibility);
  raf = requestAnimationFrame(tick);

  return function stop() {
    cancelAnimationFrame(raf);
    ro.disconnect();
    document.removeEventListener('visibilitychange', onVisibility);
    canvas.removeEventListener('webglcontextlost', onLost);
    canvas.removeEventListener('webglcontextrestored', onRestored);
    for (const c of cache.values()) gl.deleteProgram(c.prog);
    cache.clear();
    gl.deleteVertexArray(vao);
  };
}
