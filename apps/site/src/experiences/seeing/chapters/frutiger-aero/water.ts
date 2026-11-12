// Fragment shader: sunlit water. Layered moving cells make the bright caustic network of light
// on a shallow surface; it is drawn only over the water band at the foot of the scene.
export const WATER = `#version 300 es
precision highp float;
uniform float uTime;
uniform vec2 uRes;
out vec4 outColor;

float caustic(vec2 p, float t) {
  vec2 i = p;
  float c = 1.0;
  for (int n = 0; n < 4; n++) {
    float tt = t * (1.0 - 3.5 / float(n + 1));
    i = p + vec2(cos(tt - i.x) + sin(tt + i.y), sin(tt - i.y) + cos(tt + i.x));
    c += 1.0 / length(vec2(p.x / (sin(i.x + tt) / 0.005), p.y / (cos(i.y + tt) / 0.005)));
  }
  c /= 4.0;
  c = 1.17 - pow(c, 1.4);
  return pow(abs(c), 8.0);
}

void main() {
  vec2 uv = gl_FragCoord.xy / uRes;
  float band = smoothstep(0.17, 0.12, uv.y);
  if (band <= 0.0) { outColor = vec4(0.0); return; }
  vec2 p = uv * vec2(uRes.x / uRes.y, 1.0) * 6.0;
  float c = caustic(mod(p, 6.2831) - 25.0, uTime * 0.35 + 23.0);
  float a = clamp(c, 0.0, 1.0) * 0.6 * band;
  outColor = vec4(vec3(0.85, 0.97, 1.0) * a, a);
}`;
