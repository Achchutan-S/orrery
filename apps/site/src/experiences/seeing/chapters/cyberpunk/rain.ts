// Fragment shader: rain on a window at night. Drops on a jittered grid slide down at their own
// speeds, leave faint trails and refract a few coloured lights; static droplets sit between them.
// Density (0.25–1) thickens the rain with the city. Output is premultiplied alpha over the page.
export const RAIN = `#version 300 es
precision highp float;
uniform float uTime;
uniform vec2 uRes;
uniform float uDensity;
out vec4 outColor;

float hash(vec2 p) { p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }

vec3 neon(vec2 uv) {
  vec3 c = vec3(0.0);
  c += vec3(1.0, 0.25, 0.4) * smoothstep(0.35, 0.0, length(uv - vec2(0.2, 0.55)));
  c += vec3(0.2, 0.9, 1.0) * smoothstep(0.3, 0.0, length(uv - vec2(0.75, 0.45)));
  c += vec3(1.0, 0.65, 0.2) * smoothstep(0.4, 0.0, length(uv - vec2(0.5, 0.15)));
  return c;
}

vec2 drops(vec2 uv, float t, float scale) {
  vec2 a = vec2(6.0, 1.0);
  vec2 st = uv * scale * a;
  vec2 id = floor(st);
  float n = hash(id);
  st.y += t * (0.2 + n * 0.25);
  id = floor(st);
  n = hash(id);
  vec2 f = fract(st) - 0.5;
  float x = (n - 0.5) * 0.7;
  float y = sin(t * 0.7 + n * 6.283) * 0.35;
  vec2 d = (f - vec2(x, y)) / a;
  float drop = smoothstep(0.05, 0.03, length(d));
  float trail = smoothstep(0.03, 0.0, abs(f.x - x) / a.x * 6.0) * smoothstep(-0.05, 0.5, f.y - y) * smoothstep(0.5, y, f.y) * 0.5;
  return vec2(drop + trail * 0.4, drop);
}

void main() {
  vec2 uv = gl_FragCoord.xy / uRes;
  vec2 p = uv * vec2(uRes.x / uRes.y, 1.0);
  float t = uTime * 0.6;
  vec2 d1 = drops(p, t, 4.0);
  vec2 d2 = drops(p * 1.7 + 7.3, t * 1.2, 5.0) * step(0.4, uDensity);
  vec2 d3 = drops(p * 2.6 + 3.1, t * 1.5, 6.0) * step(0.7, uDensity);
  float statics = smoothstep(0.997, 1.0, hash(floor(p * 90.0))) * 0.5;
  float m = clamp(d1.x + d2.x + d3.x + statics, 0.0, 1.0);
  vec3 light = neon(uv + vec2(m * 0.05, m * 0.08));
  vec3 col = mix(vec3(0.75, 0.85, 1.0), light, 0.7) * m;
  float a = m * 0.4;
  outColor = vec4(col * 0.9, a);
}`;
