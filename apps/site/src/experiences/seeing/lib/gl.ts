// A full-screen fragment shader on a canvas, for the two chapters that need one (Cyberpunk's rain
// on glass, Frutiger Aero's water). Raw WebGL2, no dependencies. Returns null when WebGL2 or the
// shader is unavailable, so callers keep their static composition. Draws only while the canvas is
// on screen; never starts under reduced motion (callers check). The page's text is never drawn
// here: the canvas is decoration and is hidden from assistive technology.
import { onVisibility, reducedMotion } from '../house/lazy.ts';

const VERT = `#version 300 es
void main() {
  vec2 p = vec2((gl_VertexID << 1) & 2, gl_VertexID & 2);
  gl_Position = vec4(p * 2.0 - 1.0, 0.0, 1.0);
}`;

export interface Scene { stop: () => void; set: (name: string, value: number) => void }

export function shaderScene(canvas: HTMLCanvasElement, fragment: string, maxScale = 0.75): Scene | null {
  if (reducedMotion()) return null;
  const gl = canvas.getContext('webgl2', { alpha: true, antialias: false, premultipliedAlpha: true });
  if (!gl) return null;
  const compile = (type: number, src: string) => {
    const s = gl.createShader(type)!;
    gl.shaderSource(s, src);
    gl.compileShader(s);
    return gl.getShaderParameter(s, gl.COMPILE_STATUS) ? s : null;
  };
  const vs = compile(gl.VERTEX_SHADER, VERT);
  const fs = compile(gl.FRAGMENT_SHADER, fragment);
  if (!vs || !fs) return null;
  const prog = gl.createProgram()!;
  gl.attachShader(prog, vs);
  gl.attachShader(prog, fs);
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return null;
  gl.useProgram(prog);
  const uTime = gl.getUniformLocation(prog, 'uTime');
  const uRes = gl.getUniformLocation(prog, 'uRes');
  const extra = new Map<string, number>();

  let raf = 0;
  let visible = false;
  let lost = false;
  const t0 = performance.now();
  const resize = () => {
    const scale = Math.min(window.devicePixelRatio || 1, 1) * maxScale;
    const w = Math.max(1, Math.round(canvas.clientWidth * scale));
    const h = Math.max(1, Math.round(canvas.clientHeight * scale));
    if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
    gl.viewport(0, 0, w, h);
  };
  const frame = () => {
    raf = 0;
    if (!visible || lost) return;
    resize();
    gl.uniform1f(uTime, (performance.now() - t0) / 1000);
    gl.uniform2f(uRes, canvas.width, canvas.height);
    for (const [k, v] of extra) gl.uniform1f(gl.getUniformLocation(prog, k), v);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    raf = requestAnimationFrame(frame);
  };
  canvas.addEventListener('webglcontextlost', (e) => { e.preventDefault(); lost = true; canvas.hidden = true; });
  const unwatch = onVisibility(canvas, (v) => { visible = v; if (v && !raf) raf = requestAnimationFrame(frame); });
  canvas.dataset.gl = 'on';
  return {
    stop: () => { unwatch(); cancelAnimationFrame(raf); visible = false; },
    set: (name, value) => { extra.set(name, value); },
  };
}
