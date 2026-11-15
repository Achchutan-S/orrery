// Every scene of Divya Chakshu as GLSL ES 3.00. A full-screen program draws one triangle and
// computes the picture per pixel; a points program draws `count` points whose positions are pure
// functions of their index and time (no buffers, no state to leak). All colour is computed in
// linear light (squared sRGB) and tone-mapped once at the end.
//
// Programs share: u_res (canvas px), u_time (s, stops when motion is paused), u_alpha (layer
// opacity), u_ptr (pointer, -1..1, y up), u_px (canvas px per CSS px). The timeline sets the rest.
import type { ProgramName } from './timeline.ts';

export interface ProgramDef {
  frag: string;
  /** Points programs only: their vertex shader and how many points to draw per quality tier. */
  vert?: string;
  count?: { low: number; high: number };
  /** 'over' composites by alpha; 'add' adds light. */
  blend: 'over' | 'add';
}

export const FULLSCREEN_VERT = `#version 300 es
void main(){ vec2 p = vec2(float((gl_VertexID << 1) & 2), float(gl_VertexID & 2)); gl_Position = vec4(p * 2. - 1., 0., 1.); }`;

const HEAD = `#version 300 es
precision highp float;
uniform vec2 u_res;
uniform float u_time;
uniform float u_alpha;
uniform vec2 u_ptr;
uniform float u_px;
#define PI 3.14159265
#define TAU 6.28318531
`;

const COMMON = `
float h11(float p){ p = fract(p * .1031); p *= p + 33.33; p *= p + p; return fract(p); }
float h21(vec2 p){ vec3 q = fract(vec3(p.xyx) * .1031); q += dot(q, q.yzx + 33.33); return fract((q.x + q.y) * q.z); }
vec2 h22(vec2 p){ vec3 q = fract(vec3(p.xyx) * vec3(.1031, .1030, .0973)); q += dot(q, q.yzx + 33.33); return fract((q.xx + q.yz) * q.zy); }
float vn(vec2 p){ vec2 i = floor(p), f = fract(p); vec2 u = f * f * (3. - 2. * f);
  return mix(mix(h21(i), h21(i + vec2(1, 0)), u.x), mix(h21(i + vec2(0, 1)), h21(i + vec2(1, 1)), u.x), u.y); }
const mat2 FM = mat2(1.6, 1.2, -1.2, 1.6);
float fbm(vec2 p){ float s = 0., a = .5; for (int i = 0; i < 5; i++){ s += a * vn(p); p = FM * p; a *= .5; } return s; }
float fbm3(vec2 p){ float s = 0., a = .5; for (int i = 0; i < 3; i++){ s += a * vn(p); p = FM * p; a *= .5; } return s; }
mat2 rot(float a){ float c = cos(a), s = sin(a); return mat2(c, s, -s, c); }
vec3 lin(vec3 c){ return c * c; }
vec3 aces(vec3 x){ return clamp((x * (2.51 * x + .03)) / (x * (2.43 * x + .59) + .14), 0., 1.); }
float aspect(){ return u_res.x / u_res.y; }
vec2 suv(){ return (gl_FragCoord.xy - .5 * u_res) / u_res.y; }
float sdSeg(vec2 p, vec2 a, vec2 b){ vec2 pa = p - a, ba = b - a; float h = clamp(dot(pa, ba) / dot(ba, ba), 0., 1.); return length(pa - ba * h); }
float sdBox(vec2 p, vec2 b){ vec2 d = abs(p) - b; return length(max(d, 0.)) + min(max(d.x, d.y), 0.); }
float sdEll(vec2 p, vec2 r){ float k0 = length(p / r); float k1 = length(p / (r * r)); return k0 * (k0 - 1.) / max(k1, 1e-5); }
float sdTrap(vec2 p, float r1, float r2, float he){
  vec2 k1 = vec2(r2, he), k2 = vec2(r2 - r1, 2. * he); p.x = abs(p.x);
  vec2 ca = vec2(p.x - min(p.x, (p.y < 0.) ? r1 : r2), abs(p.y) - he);
  vec2 cb = p - k1 + k2 * clamp(dot(k1 - p, k2) / dot(k2, k2), 0., 1.);
  float s = (cb.x < 0. && ca.y < 0.) ? -1. : 1.; return s * sqrt(min(dot(ca, ca), dot(cb, cb))); }
float smin(float a, float b, float k){ float h = clamp(.5 + .5 * (b - a) / k, 0., 1.); return mix(b, a, h) - k * h * (1. - h); }
out vec4 o;
// Dither only, to stop banding in the dark gradients: under one 8-bit level and fixed in place. It used
// to be nearly three levels and re-rolled every frame, which read as grain crawling over every scene.
void finish(vec3 c){ c = sqrt(aces(c)); c += (h21(gl_FragCoord.xy) + h21(gl_FragCoord.xy + 31.7) - 1.) / 255.; o = vec4(c, u_alpha); }
void finishLight(vec3 c){ o = vec4(sqrt(aces(c)), u_alpha); }
`;

// Kurukshetra at dusk (or dawn), and the gift of divine sight inside it. The plain is drawn in
// "field" coordinates (along the ground, height above it), so bending the horizon into a small
// round world bends armies, dust and chariot with it.
const BATTLEFIELD = HEAD + COMMON + `
uniform float u_open, u_near, u_sight, u_lattice, u_dawn, u_end, u_watch, u_turn, u_named;
// Where the three he names stand in the opposing ranks, along the plain (timeline.ts FIELD_NAMED).
const float NX0 = .56, NX1 = .65, NX2 = .74;

float leg(vec2 p, vec2 hip, vec2 knee, vec2 hoof, float w){ return min(sdSeg(p, hip, knee) - w, sdSeg(p, knee, hoof) - w * .7); }

// A horse side-on, facing left, standing: barrel, chest and haunch, an arched neck, a lowered head,
// a tail, and (when legs > 0) four jointed legs with one fore-hoof lifted by lift. Ground at y = 0.
float horse(vec2 p, float lift, float legs){
  float d = sdEll(p - vec2(0., .46), vec2(.25, .1));
  d = smin(d, length(p - vec2(-.2, .48)) - .11, .07);
  d = smin(d, length(p - vec2(.2, .48)) - .118, .07);
  float nk = clamp((p.y - .5) / .28, 0., 1.);
  d = smin(d, sdSeg(p, vec2(-.23, .52), vec2(-.37, .78)) - mix(.085, .046, nk), .05);
  d = smin(d, sdEll((p - vec2(-.445, .765)) * rot(1.0), vec2(.115, .046)), .035);
  d = min(d, sdSeg(p, vec2(-.365, .835), vec2(-.35, .9)) - .011);
  d = min(d, sdSeg(p, vec2(.31, .52), vec2(.39, .2)) - mix(.012, .03, clamp((.52 - p.y) / .3, 0., 1.)));
  if (legs < .5) return d;
  d = min(d, leg(p, vec2(-.22, .42), vec2(-.235, .21), vec2(-.215, 0.), .027));
  d = min(d, leg(p, vec2(-.15, .42), vec2(-.1 - .05 * lift, .23), vec2(-.15 - .04 * lift, .012 + .07 * lift), .025));
  d = min(d, leg(p, vec2(.23, .42), vec2(.29, .22), vec2(.24, 0.), .03));
  d = min(d, leg(p, vec2(.16, .42), vec2(.18, .21), vec2(.14, 0.), .027));
  return d;
}

// The chariot side-on, facing left: a team of horses under one yoke, the great eight-spoked wheel,
// the car with its curved guard, a domed canopy with a finial, the standard with its pennant, the
// charioteer seated at the reins and the archer standing behind him, his bow lowered. Ground at y = 0.
float chariot(vec2 p, float t){
  float d = 1e3;
  // The team of four, staggered back and up so each head and back reads. Only the nearest and the
  // farthest show their legs: twelve legs in a row read as a comb, not as horses.
  for (int i = 0; i < 4; i++){ float fi = float(i); d = min(d, horse(p - vec2(-1.06 + fi * .12, fi * .024), step(2.5, fi), step(abs(fi - 1.5), 1.) < .5 ? 1. : 0.)); }
  d = min(d, sdSeg(p, vec2(-.78, .56), vec2(-.28, .5)) - .013);
  d = min(d, sdSeg(p, vec2(-1.0, .62), vec2(-.62, .66)) - .012);
  // Wheel.
  vec2 w = p - vec2(.02, .34); float rw = length(w);
  float wa = atan(w.y, w.x) + t * .04;
  float spoke = max(abs(sin(wa * 4.)) * rw - .011, rw - .31);
  d = min(d, min(min(abs(rw - .315) - .024, rw - .058), spoke));
  d = min(d, abs(rw - .13) - .007);
  // Car: floor, panelled side, the guard curling up in front.
  d = min(d, sdBox(p - vec2(.1, .61), vec2(.4, .028)) - .008);
  d = min(d, sdBox(p - vec2(.13, .74), vec2(.33, .085)) - .016);
  d = min(d, sdSeg(p, vec2(-.3, .62), vec2(-.37, .86)) - .02);
  d = min(d, length(p - vec2(-.345, .9)) - .04);
  d = min(d, sdSeg(p, vec2(.5, .62), vec2(.53, .9)) - .018);
  // Canopy on two posts, with a valance and a finial.
  d = min(d, sdSeg(p, vec2(-.24, .8), vec2(-.24, 1.5)) - .012);
  d = min(d, sdSeg(p, vec2(.42, .8), vec2(.42, 1.5)) - .012);
  vec2 c = p - vec2(.09, 1.5);
  d = min(d, max(sdEll(c, vec2(.45, .2)), -c.y));
  d = min(d, sdBox(c - vec2(0., -.012), vec2(.47, .016)));
  d = min(d, max(abs(fract(c.x * 9.) - .5) * .11 - .02, max(abs(c.x) - .46, abs(c.y + .05) - .028)));
  d = min(d, length(p - vec2(.09, 1.73)) - .034);
  d = min(d, sdSeg(p, vec2(.09, 1.76), vec2(.09, 1.86)) - .008);
  // Standard and pennant, moving in the wind.
  d = min(d, sdSeg(p, vec2(.5, .8), vec2(.5, 2.22)) - .01);
  vec2 f = p - vec2(.5, 2.13);
  float wv = sin(f.x * 9. - t * 2.6) * .04 * f.x / .5;
  d = min(d, max(abs(f.y - wv) - .085 * (1. - f.x / .56), max(-f.x, f.x - .56)));
  // The charioteer, seated at the front, crowned, reins in his hands.
  d = min(d, sdSeg(p, vec2(-.14, .84), vec2(-.125, 1.04)) - .056);
  d = smin(d, sdEll(p - vec2(-.13, 1.07), vec2(.085, .04)), .03);
  d = min(d, length(p - vec2(-.135, 1.2)) - .054);
  // His face in profile, toward the horses; at the end of the chapter it turns back to the archer.
  float side = cos(u_turn * PI);
  d = min(d, length(p - vec2(-.135 - .056 * side, 1.19)) - .019 * abs(side));
  d = min(d, sdSeg(p, vec2(-.125, 1.25), vec2(-.095, 1.33)) - mix(.016, .004, clamp((p.y - 1.25) / .08, 0., 1.)));
  d = min(d, sdSeg(p, vec2(-.15, 1.02), vec2(-.36, .93)) - .018);
  d = min(d, sdSeg(p, vec2(-.36, .93), vec2(-.7, .7)) - .0045);
  d = min(d, sdSeg(p, vec2(-.36, .93), vec2(-.84, .76)) - .0045);
  // The archer, standing, the bow lowered at his side.
  d = min(d, sdSeg(p, vec2(.22, .84), vec2(.235, 1.17)) - .056);
  d = smin(d, sdEll(p - vec2(.235, 1.2), vec2(.09, .04)), .03);
  d = min(d, length(p - vec2(.24, 1.33)) - .054);
  d = min(d, sdSeg(p, vec2(.22, 1.14), vec2(.1, .96)) - .02);
  vec2 b = p - vec2(.3, 1.02);
  d = min(d, max(abs(length(b) - .3) - .009, b.x + .16));
  d = min(d, max(abs(b.x + .16) - .003, abs(b.y) - .254));
  return d;
}

float sdTri(vec2 p, float r){ const float k = sqrt(3.); p.x = abs(p.x) - r; p.y = p.y + r / k;
  if (p.x + k * p.y > 0.) p = vec2(p.x - k * p.y, -k * p.x - p.y) / 2.; p.x -= clamp(p.x, -2. * r, 0.); return -length(p) * sign(p.y); }

// The geometry that divine sight reveals: rings flowing outward without end, spokes, and nine
// interlocking triangles, centred on the small world.
vec3 lattice(vec2 q, float t, float amt, float px){
  float r = length(q) + 1e-4, a = atan(q.y, q.x);
  float dr = abs(fract(log(r) * 4. - t * .06) - .5) / 4. * r;
  float rings = smoothstep(px * 1.6, 0., dr) + .3 * exp(-dr * 160.);
  float da = abs(fract(a / TAU * 36.) - .5) / 36. * TAU * r;
  float spokes = smoothstep(px * 1.2, 0., da) * smoothstep(.12, .3, r) * .6;
  float tri = 0.;
  for (int i = 0; i < 9; i++){
    float fi = float(i);
    float on = smoothstep(fi / 9., fi / 9. + .12, amt);
    vec2 tp = q * rot(t * .02 * (mod(fi, 2.) * 2. - 1.));
    tp.y *= mod(fi, 2.) < .5 ? 1. : -1.;
    float dt = abs(sdTri(tp - vec2(0., .02 * fi - .06), .16 + .055 * fi));
    tri += on * (smoothstep(px * 1.5, 0., dt) + .25 * exp(-dt * 90.));
  }
  float fade = 1. / (1. + r * 1.5);
  return lin(vec3(1., .68, .28)) * (rings * amt + spokes * amt + tri) * fade;
}

// The plain at field coordinates s = (along the ground, height above it).
vec3 field(vec2 s, float t, float sightAmt, float px, out float silh){
  float dawn = u_dawn, open = u_open;
  float sy = s.y;
  vec3 skyTop = mix(lin(vec3(.075, .066, .06)), lin(vec3(.13, .25, .29)), dawn);
  vec3 skyLow = mix(lin(vec3(.42, .34, .24)), lin(vec3(.86, .71, .48)), dawn);
  vec3 col = mix(skyLow, skyTop, smoothstep(-.02, .5, sy));
  vec2 sp = vec2(0., mix(.05, .13, dawn));
  float sd = length(s - sp);
  vec3 sunC = mix(lin(vec3(1., .74, .42)), lin(vec3(1., .87, .64)), dawn);
  col += sunC * (smoothstep(.034 + px, .034 - px, sd) * mix(.9, 1.6, dawn) + exp(-sd * sd * 420.) * mix(.7, 1.2, dawn) + exp(-sd * 7.) * .3 + exp(-sd * 1.8) * .12);
  vec3 dustC = mix(lin(vec3(.52, .42, .30)), lin(vec3(.80, .67, .47)), dawn);
  float dz = fbm(vec2(s.x * 2.2 + t * .03, sy * 5. - t * .01));
  float dz2 = fbm3(vec2(s.x * 6. - t * .07, sy * 12.));
  float band = exp(-max(sy, 0.) * mix(6., 9., dawn));
  // Haze lies low along the horizon and thins quickly above it, so the sky above stays clear and deep.
  col = mix(col, dustC, clamp((dz * .8 + dz2 * .25 - .38) * band * mix(1.05, .6, dawn) * (.4 + .6 * open), 0., .5));
  if (sy < 0.){
    float depth = .05 / (-sy + .004);
    vec2 gp = vec2(s.x * depth * 2., depth);
    float tex = fbm3(gp * vec2(1.5, .6));
    vec3 earth = mix(lin(vec3(.10, .08, .06)), lin(vec3(.26, .21, .15)), tex * .8 + (.5 + .5 * sin(gp.x * 6.)) * .1);
    earth *= 1. + dawn * .7;
    col = mix(earth, dustC * .9, exp(sy * 18.) * .85);
    col += sunC * .22 * exp(-abs(s.x) * 3.) * exp(sy * 10.);
  }
  // The armies: two rows of figures, spears and banners, left and right of the chariot.
  silh = 0.;
  for (int row = 0; row < 2; row++){
    float fr = float(row), sc = 1. + fr * .6, y = sy + fr * .006;
    float side = smoothstep(.12, .2, abs(s.x)) * smoothstep(2.2, 1.4, abs(s.x));
    float cw = sc / 420.;
    float cell = floor(s.x / cw), dx = (fract(s.x / cw) - .5) * cw;
    float hh = h11(cell + fr * 91.);
    float top = (.004 + .012 * hh * hh) * sc;
    float hw = max(.14 * cw, px * .5);
    float spear = clamp((hw - abs(dx)) / px + .5, 0., 1.) * clamp((top - y) / px + .5, 0., 1.);
    float banner = step(.93, hh) * step(0., dx) * clamp((top - y) / px + .5, 0., 1.) * step(top * .7, y);
    float body = clamp(((.0035 + .003 * vn(vec2(s.x * 90., fr))) * sc - y) / px + .5, 0., 1.);
    float m = max(max(spear, banner), body) * side * step(-.02, y);
    vec3 armyC = mix(lin(vec3(.06, .05, .045)), dustC, .55 - fr * .25);
    col = mix(col, armyC, m);
    silh = max(silh, m);
    // With divine sight each figure is threaded to the sky.
    if (sightAmt > 0.) col += lin(vec3(1., .75, .4)) * clamp((hw * .6 - abs(dx)) / px + .5, 0., 1.) * side * step(top, y) * exp(-y * 5.) * .5 * sightAmt * step(.55, hh);
  }
  // Three he knows by sight in the opposing ranks (11.26, 11.34): a little taller, and, while the text
  // speaks of them, a faint light on each. The same three stand among the teeth in sequence V.
  for (int i = 0; i < 3; i++){
    float nx = i == 0 ? NX0 : i == 1 ? NX1 : NX2;
    vec2 q = vec2(s.x - nx, sy);
    float d = min(sdSeg(q, vec2(0., 0.), vec2(0., .011)) - .0034, length(q - vec2(0., .0158)) - .0033);
    d = min(d, sdSeg(q, vec2(.0042, 0.), vec2(.0042, .031)) - .0008);
    float m = clamp(.5 - d / px, 0., 1.) * (1. - sightAmt);
    col = mix(col, lin(vec3(.05, .04, .035)), m);
    col += lin(vec3(1., .8, .5)) * exp(-length(q - vec2(0., .016)) * 150.) * .7 * u_named * (1. - sightAmt);
    silh = max(silh, m);
  }
  return col;
}

// Divine sight begins in the plain itself: before the great eye opens, its surface is eyes. They open
// first where the reader is not looking and, open, look at the pointer. Drawn over the picture, so the
// world they open in is the one already there.
vec3 watch(vec3 c, float amt){
  if (amt <= 0.) return c;
  vec2 fc = gl_FragCoord.xy;
  float cw = 22. * u_px, chh = cw * .66;
  float row = floor(fc.y / chh), off = mod(row, 2.) * .5 * cw, ci = floor((fc.x - off) / cw);
  vec2 cen = vec2((ci + .5) * cw + off, (row + .5) * chh), q = fc - cen;
  float h = h21(vec2(ci, row));
  vec2 pp = (u_ptr * .5 + .5) * u_res;
  float dn = length(cen - pp) / length(u_res) * 1.5;
  float at = clamp(1.05 - dn, 0., 1.) * .8 + h * .08;
  float open = smoothstep(at, at + .16, amt) * (1. - smoothstep(.992, 1., sin(u_time * (.4 + h * .5) + h * 70.)));
  float ew = cw * .41, eh = chh * .4 * open;
  float prof = max(0., 1. - (q.x / ew) * (q.x / ew));
  float alm = abs(q.y) - eh * prof, inside = smoothstep(.8, -.8, alm);
  vec2 to = pp - cen; float dl = length(to);
  vec2 ic = to / max(dl, 1.) * min(1., dl / (cw * 5.)) * vec2(ew * .4, eh * .32);
  float ir = max(eh * .86, .6), rr = length(q - ic);
  vec3 eye = mix(c * 1.4 + .01, lin(vec3(.55, .36, .14)) * (.25 + c * 2.), smoothstep(ir + .7, ir - .7, rr));
  eye = mix(eye, vec3(0.), smoothstep(ir * .5 + .6, ir * .5 - .6, rr));
  eye += vec3(.6) * smoothstep(1.1, .2, length(q - ic - vec2(ir * .35, ir * .38))) * smoothstep(.3, .6, open);
  return mix(c * mix(1., .3, amt), eye, inside) + c * smoothstep(1.1, 0., abs(alm)) * .5 * smoothstep(.05, .3, open);
}

vec3 view(vec2 uv, float bendAmt, float t, float px, float hz){
  float R = mix(40., .42, bendAmt * bendAmt);
  hz += .24 * bendAmt;
  vec2 C = vec2(0., hz - R);
  vec2 q = uv - C;
  vec2 s = vec2(atan(q.x, q.y) * R, length(q) - R);
  float silh;
  vec3 col = field(s, t, bendAmt, px, silh);
  if (bendAmt > 0.){
    vec3 sky = mix(col, lin(vec3(.025, .03, .10)), smoothstep(0., .6, bendAmt) * smoothstep(-.01, .02, s.y));
    col = sky + lattice(uv - vec2(0., hz), t, u_lattice * bendAmt, px) * smoothstep(0., .02, s.y);
    col = mix(col, col * vec3(.7, .8, 1.3), bendAmt * step(s.y, 0.) * .6);
    // The plain has become a small world: it keeps a thin skin of air, lit from behind.
    col += mix(lin(vec3(1., .78, .45)), lin(vec3(.45, .62, 1.)), smoothstep(0., .05, s.y)) * exp(-max(s.y, 0.) * 46.) * smoothstep(-.004, .004, s.y) * bendAmt * bendAmt * .55;
    col *= 1. - .5 * bendAmt * smoothstep(0., -.5, s.y) * step(s.y, 0.);
  }
  // The chariot against the low sun. No halo: it is a solid thing, dark where it faces us, with a thin
  // edge of light where it turns toward the sun behind it, and a long shadow thrown toward the viewer.
  float nearE = u_near * (1. - .8 * bendAmt);
  float cs = mix(.035, .2, nearE * nearE);
  // On a wide screen it stands further right, clear of the text column; on a narrow one it stays in frame.
  vec2 org = vec2(mix(0., mix(.26, .44, smoothstep(1.05, 1.6, aspect())), nearE), -mix(0., .07, nearE));
  vec2 cp = (s - org) / cs;
  float show = smoothstep(.45, 1., u_open);
  float pc = px / cs;
  vec3 sunC = mix(lin(vec3(1., .72, .38)), lin(vec3(1., .85, .6)), u_dawn);
  if (abs(cp.x + .35) < 1.75 && cp.y > -1.1 && cp.y < 2.4 && show > 0.){
    if (cp.y < .04 && bendAmt < .5){
      float sh = chariot(vec2(cp.x + cp.y * .5, -cp.y * 2.6 + .01), t);
      col *= 1. - .62 * smoothstep(.05 + pc * 2., -.03, sh) * exp(cp.y * 1.4) * show * (1. - bendAmt * 2.);
    }
    float d = chariot(cp, t);
    float m = clamp(.5 - d / pc, 0., 1.) * show;
    if (d < .06){
      float eps = max(pc, .012);
      vec2 n = normalize(vec2(chariot(cp + vec2(eps, 0.), t) - d, chariot(cp + vec2(0., eps), t) - d) + 1e-5);
      // The sun is behind and to the left: only edges that turn that way, or up into the sky, catch it.
      float edge = exp(d / mix(.02, .009, nearE)) * step(d, 0.);
      float rim = pow(max(dot(n, normalize(vec2(-1., .45))), 0.), 2.2) * edge;
      vec3 body = mix(lin(vec3(.05, .038, .03)), lin(vec3(.2, .15, .1)), u_dawn) * (1. + .5 * smoothstep(1.2, 0., cp.y));
      col = mix(col, body + sunC * rim * mix(.85, .6, u_dawn), m);
    }
    col += sunC * exp(-max(d, 0.) / (pc * 1.2 + .003)) * (1. - m) * .14 * show;
  }
  col += lin(vec3(1., .82, .5)) * exp(-length(cp - vec2(-.135, 1.2)) * 1.6) * bendAmt * .6 * show;
  return col;
}

void main(){
  vec2 uv = suv();
  float fov = clamp(aspect() / 1.5, .55, 1.);
  uv /= fov;
  uv += u_ptr * vec2(.012, .006);
  float px = 1. / (u_res.y * fov);
  float t = u_time;
  // A low horizon under a tall sky at first; it rises to its working height as the chariot comes near.
  float hz = mix(-.37, -.13, smoothstep(0., .7, u_near));
  float s = u_sight;
  vec3 col;
  if (s <= 0.) col = watch(view(uv, 0., t, px, hz), u_watch);
  else if (s >= 1.) col = view(uv, 1., t, px, hz);
  else {
    // An eye opens along the horizon: inside it, the world as divine sight sees it.
    vec3 before = watch(view(uv, 0., t, px, hz), u_watch);
    vec3 after = view(uv, smoothstep(.25, 1., s), t, px, hz);
    float W = mix(.02, 2.6, smoothstep(0., .35, s));
    float H = smoothstep(.05, .75, s) * .9;
    vec2 q = uv - vec2(0., hz);
    float lid = abs(q.y) - H * max(0., 1. - (q.x / W) * (q.x / W));
    float inside = smoothstep(px * 2., -px * 2., lid) * smoothstep(.02, .08, s);
    col = mix(before * (1. - .88 * smoothstep(0., .15, s)), after, inside);
    col += lin(vec3(1., .8, .45)) * exp(-abs(lid) / (px * 2. + .002)) * smoothstep(0., .08, s) * (1. - smoothstep(.75, 1., s)) * 2.;
  }
  // Before entering: almost nothing, a thread of horizon.
  col *= mix(.035, 1., u_open);
  col += lin(vec3(.85, .62, .32)) * exp(-abs(uv.y - hz) * 500.) * .25 * (1. - u_open);
  col *= 1. - u_end;
  finish(col);
}`;

// A thousand suns, rising at once at every scale. Five layers of suns zoom outward forever:
// each cluster of suns resolves, from further away, into one point among countless others.
const SUNS = HEAD + COMMON + `
uniform float u_rise, u_white, u_zoom;

vec3 suns(vec2 p, float scale, float seed, float rise, float px){
  vec2 g = p * scale, id = floor(g), f = fract(g);
  vec3 acc = vec3(0.);
  for (int j = -1; j <= 1; j++) for (int i = -1; i <= 1; i++){
    vec2 o2 = vec2(i, j), cid = id + o2;
    vec2 h = h22(cid + seed * 13.1);
    float th = h21(cid * 1.37 + seed * 7.7) * .85;
    float born = smoothstep(th, th + .12, rise);
    if (born <= 0.) continue;
    vec2 d = (f - (o2 + .2 + .6 * h - vec2(0., (1. - born) * .5))) / scale;
    float r = length(d);
    float rc = .045 / scale + px;
    float b = born * (.25 + 1.6 * pow(h.x, 4.));
    vec3 tint = mix(lin(vec3(1., .72, .38)), lin(vec3(1., .95, .85)), h.y);
    if (h.x * h.y > .85) tint = lin(vec3(.75, .85, 1.));
    float spikes = (exp(-abs(d.x) / (rc * .12)) * exp(-abs(d.y) / (rc * 7.)) + exp(-abs(d.y) / (rc * .12)) * exp(-abs(d.x) / (rc * 7.))) * step(.6, h.x);
    acc += tint * b * (exp(-(r * r) / (rc * rc)) * 2. + rc * rc / (r * r + rc * rc) * .6 + spikes * .4);
  }
  return acc;
}

void main(){
  vec2 uv = suv();
  float px = 1. / u_res.y;
  float rise = u_rise;
  vec3 col = mix(lin(vec3(.02, .022, .07)), lin(vec3(.22, .13, .06)), rise * .6);
  float z = u_zoom - u_time * .012, fz = fract(z), iz = floor(z);
  for (int k = 0; k < 5; k++){
    float lk = float(k) - fz;
    float w = sin(PI * clamp((lk + 1.) / 5., 0., 1.));
    col += suns(uv + u_ptr * .01 * float(k), 1.5 * exp2(lk), float(k) + iz, rise, px) * w;
  }
  vec2 rp = uv - vec2(0., .9);
  float ra = atan(rp.x, -rp.y);
  col += lin(vec3(1., .8, .5)) * pow(fbm3(vec2(ra * 9., u_time * .05)), 2.) * exp(-length(rp) * .8) * rise * 1.4;
  float edge = smoothstep(.3, .95, max(abs(uv.x) / (aspect() * .5), abs(uv.y) * 2.));
  col += lin(vec3(1., .85, .6)) * edge * rise * rise * .9;
  col *= 1. + rise * 1.5;
  col = mix(col, vec3(7.), u_white);
  finish(col);
}`;

// The universal form. Rings of cells in log-polar space (conformal, so every cell is near-square)
// hold eyes, spiral worlds and lotuses, and the pattern repeats at every scale, so depth dives in
// without end. At first it is seen whole, bounded by a circle of flame. u_within carries that rim out
// past the edges of the frame: from then on there is no outside, the nearest ring is wider than the
// view, light pours out from the heart through the rings, and the reader is in it. Terror re-colours
// the same structure: eyes become mouths, rings grow teeth, fire pours inward. u_gather draws the
// whole burning form in to one point (the flame of 11.29); u_fold gathers the gentle one (the feather).
const COSMOS = HEAD + COMMON + `
uniform float u_reveal, u_depth, u_terror, u_emblem, u_eyes, u_sunmoon, u_dim, u_fold, u_within, u_gather, u_flash;
const float N = 12.;
const float P = TAU / N;

vec3 cGold(){ return mix(lin(vec3(1., .74, .32)), lin(vec3(1., .42, .12)), u_terror); }
vec3 cWhite(){ return mix(lin(vec3(1., .96, .86)), lin(vec3(1., .72, .42)), u_terror); }
vec3 cCrimson(){ return mix(lin(vec3(.56, .07, .13)), lin(vec3(.36, .02, .02)), u_terror); }
vec3 cBlue(){ return mix(lin(vec3(.22, .42, .80)), lin(vec3(.55, .08, .04)), u_terror); }

vec3 eye(vec2 cp, vec2 look, float h, float px, float t){
  float W = .44, H = .2 * (1. - smoothstep(.985, 1., sin(t * .6 + h * 40.)));
  float prof = max(0., 1. - (cp.x / W) * (cp.x / W));
  float lid = abs(cp.y) - H * prof;
  float inside = clamp(.5 - lid / px, 0., 1.);
  vec2 ic = look * vec2(.12, .06);
  float ir = length(cp - ic);
  vec3 c = cWhite() * .42;
  vec3 irisC = mix(cBlue(), cGold(), smoothstep(.04, .13, ir)) * (1. + .3 * sin(atan(cp.y - ic.y, cp.x - ic.x) * 18.));
  c = mix(c, irisC, smoothstep(.13 + px, .13 - px, ir));
  c = mix(c, vec3(0.), smoothstep(.05 + px, .05 - px, ir));
  c += cWhite() * 2. * exp(-length(cp - ic - vec2(.03)) * 90.);
  if (u_terror > 0.){
    float tooth = (1. - abs(fract(cp.x * 9.) * 2. - 1.)) * .075;
    float inner = abs(cp.y) - (H * prof - tooth);
    vec3 fire = mix(cCrimson(), cGold() * 1.6, fbm3(vec2(cp.x * 6., cp.y * 6. - t * 3.)));
    c = mix(c, mix(lin(vec3(.86, .78, .62)) * (.5 + 2. * abs(cp.y)), fire, smoothstep(px, -px, inner)), u_terror);
  }
  return c * inside + cGold() * exp(-abs(lid) / (px * 1.5 + .004)) * .8;
}

vec3 world(vec2 cp, float h, float px, float t){
  vec2 q = cp * 2.2; float r = length(q), a = atan(q.y, q.x);
  float disc = smoothstep(1., .85, r);
  float arms = .5 + .5 * sin(2. * a - log(r + .05) * 5. + t * .3 + h * 6.);
  float gal = pow(arms, 3.) * exp(-r * 2.2) * .8 + exp(-r * r * 40.) * .9;
  float stars = step(.985, h21(floor(cp * 90.) + h * 7.)) * disc;
  vec3 c = mix(cBlue() * .6, cWhite(), clamp(gal, 0., 1.)) * gal + cWhite() * stars;
  c = mix(c, mix(cCrimson(), cGold(), clamp(gal, 0., 1.)) * (gal + .3 * fbm3(q * 3. - t)), u_terror);
  return c * disc + cGold() * exp(-abs(r - .98) / (px * 2.2 + .01)) * .5;
}

vec3 lotus(vec2 cp, float h, float px, float t){
  float r = length(cp) * 2.4, a = atan(cp.x, cp.y);
  float pr = .55 + .45 * pow(abs(cos(a * 4.)), .6);
  float d = r - pr;
  float fill = smoothstep(px * 3., -px * 3., d);
  float line = exp(-abs(d) / (px * 4. + .01)) + exp(-abs(r - pr * .55) / (px * 4. + .01)) * .6;
  vec3 c = cCrimson() * fill * (1. - r * .6) + cGold() * line * .6 + cWhite() * exp(-r * r * 30.) * .7;
  if (u_terror > 0.){ float fl = fbm3(vec2(a * 2., r * 3. - t * 4.)); c = mix(c, mix(cCrimson(), cGold(), fl) * smoothstep(1.1, .2, r - fl * .4) * 1.5, u_terror); }
  return c;
}

// The emblems of verse 11.17, drawn as engraved gold: crown, discus, mace.
vec4 emblems(vec2 e, float t, float px){
  const float CS = .62;
  vec2 k = (e - vec2(0., .30)) / CS; k.x = abs(k.x); px /= CS;
  float d = sdTrap(k - vec2(0., .03), .11, .095, .03);
  d = min(d, sdTrap(k - vec2(0., .09), .09, .07, .03));
  d = min(d, sdTrap(k - vec2(0., .15), .068, .045, .03));
  d = min(d, sdTrap(k - vec2(0., .225), .044, .0, .045));
  d = min(d, length(k - vec2(0., .285)) - .013);
  d = min(d, sdTrap((k - vec2(.125, .06)) * rot(-.45), .022, .0, .05));
  float crown = smoothstep(px, -px, d);
  float lines = smoothstep(px * 1.5, 0., abs(fract(k.y / .06 + .5) - .5) * .06) * crown + smoothstep(px * 1.5, 0., abs(d));
  float jewels = smoothstep(px, -px, length(vec2(k.x, mod(k.y + .03, .06) - .03)) - .011) * crown * step(k.y, .19);
  px *= CS;
  vec2 dq = (e - vec2(.37, .24)) * rot(t * 1.6);
  float dr = length(dq), da = atan(dq.y, dq.x);
  float teeth = .085 + .016 * (1. - fract(da / TAU * 16.));
  float disc = smoothstep(px, -px, dr - teeth) * (1. - smoothstep(px, -px, dr - .055) * (1. - smoothstep(px * 1.5, 0., abs(sin(da * 4.)) * dr - .004) - smoothstep(px, -px, dr - .016)));
  vec2 mq = (e - vec2(-.38, -.02)) * rot(-.3);
  float shaft = smoothstep(px, -px, sdSeg(mq, vec2(0., -.3), vec2(0., .05)) - .008);
  float head = smoothstep(px, -px, length(mq - vec2(0., .09)) - .055);
  float ribs = head * smoothstep(.3, .0, abs(fract(atan(mq.x, mq.y - .09) / TAU * 10. + .5) - .5));
  float pommel = smoothstep(px, -px, length(mq - vec2(0., -.31)) - .014);
  float m = clamp(crown + disc + shaft + head + pommel, 0., 1.);
  vec3 gold = mix(cGold() * .35, cGold() * 1.1, smoothstep(-.1, .45, e.y));
  vec3 c = gold * m + mix(cGold(), cWhite(), .5) * (lines * .55 + jewels * .5 + ribs * .3) + cGold() * exp(-max(dr - teeth, 0.) * 40.) * .5;
  return vec4(c, m);
}

void main(){
  vec2 uv = suv();
  float fit = min(1., aspect() * 1.05);
  float T = u_terror, t = u_time, W = u_within;
  // Inside, the heart is not pinned to the screen: it drifts, and leans away from the pointer, so the
  // rings slide over one another like things at different distances.
  vec2 heart = vec2(0., -.04) + W * (vec2(sin(t * .11), cos(t * .083)) * .018 - u_ptr * vec2(.035, .022));
  vec2 p0 = uv / fit + vec2(sin(t * 37.), cos(t * 29.)) * T * T * .003;
  float F = exp(u_fold * 7.);
  vec2 e = (p0 - heart) * F;
  float r = length(e), a = atan(e.y, e.x), lr = log(max(r, 1e-6));
  float depth = u_depth + t * (.025 + T * .12);
  float z = lr / P - depth, ring = floor(z), fz = fract(z);
  float dir = mod(ring, 2.) * 2. - 1.;
  float spin = t * .03 * dir * (1. + T * 3.) + ring * .37;
  float ang = a / P + spin, fa = fract(ang), seg = mod(floor(ang), N);
  vec2 cp = vec2(fa - .5, fz - .5);
  float cellPix = r * P * fit * u_res.y / F;
  float px = 1. / max(cellPix, 1e-3);
  float detail = smoothstep(3., 10., cellPix);
  float h = h21(vec2(ring, seg));
  float kind = mod(ring, 3.);
  vec3 cc;
  if (detail > 0.){
    if (kind < .5 && u_eyes > h * .9){
      float ac = (seg + .5 - spin) * P, rc = exp((ring + .5 + depth) * P);
      vec2 ptr = (u_ptr * vec2(aspect(), 1.) * .5 / fit - heart) * F;
      vec2 lw = ptr - rc * vec2(cos(ac), sin(ac));
      vec2 look = normalize(lw + 1e-5) * smoothstep(0., .25 * F, length(lw));
      cc = eye(cp, vec2(dot(look, vec2(-sin(ac), cos(ac))), dot(look, vec2(cos(ac), sin(ac)))), h, px, t);
    } else if (kind < 1.5) cc = world(cp, h, px, t);
    else cc = lotus(cp, h, px, t);
  } else cc = vec3(0.);
  vec3 avg = mix(cGold() * .12, cCrimson() * .3, T);
  cc = mix(avg, cc, detail);
  float gd = min(min(fa, 1. - fa), min(fz, 1. - fz));
  vec3 col = cc + cGold() * smoothstep(px * 1.5, 0., gd) * .3 * detail;
  float prof = 1. - abs(fract(fa * 3.) * 2. - 1.);
  float teeth = smoothstep(px, -px, fz - prof * .28) * T * detail;
  col = mix(col, lin(vec3(.88, .80, .64)) * (.2 + 1.3 * fz), teeth);
  float arm = abs(fract(a / TAU * 7. + lr * .9 - t * .02) - .5);
  float arm2 = abs(fract(a / TAU * 5. - lr * .7 + t * .015) - .5);
  col += cGold() * (exp(-arm * 40.) + exp(-arm2 * 50.) * .7) * .22 * (1. - T * .5);
  // Inside the form, between its cells: deep space, indigo turning to blood-dark.
  vec3 deep = mix(lin(vec3(.035, .04, .12)), lin(vec3(.03, .004, .003)), T) * (.5 + fbm3(e * 4. / F + t * .02));
  col = deep + col * mix(.75, .45, T);
  if (T > 0.){
    float f = fbm(vec2(cos(a), sin(a)) * 1.6 + vec2(lr * 1.6 + t * 1.8, lr * .4));
    vec3 fire = mix(lin(vec3(.02, .003, .002)), cCrimson() * .9, smoothstep(.3, .62, f)) + cGold() * pow(f, 4.) * 3.5;
    col = mix(col, fire, T * .6);
  }
  col += cWhite() * (exp(-r * 30. / F) * 2. + exp(-r * 6. / F) * .12);
  if (W > 0.){
    // Light from the heart, travelling outward through the rings: shafts that turn slowly, brightest
    // where they leave, and a wide bloom. Then air: what is deep is veiled, what is near is clear.
    float rn = r / F;
    // Distance first: the rings nearest the eye are in shadow, deep blue between their cells; the
    // light is all ahead, at the heart, and everything is seen against it.
    float near = smoothstep(.12, 1.05, rn);
    col = mix(col, col * mix(vec3(.5, .56, .9), vec3(.9, .4, .3), T) * .34, W * near * (1. - T * .6));
    float shaft = pow(fbm3(vec2(a * 3.5 + lr * .35, t * .04 + lr * .2)), 3.4);
    col += mix(cWhite(), cGold(), smoothstep(0., .6, rn)) * shaft * exp(-rn * 2.1) * 2.4 * W * (1. - T * .7);
    col += cWhite() * (exp(-rn * 3.4) * .3 + exp(-rn * 11.) * .5) * W;
    col *= 1. - W * (1. - T) * .5 * smoothstep(.5, 1.2, length(uv * vec2(.82, 1.)));
  }
  float revealR = max(mix(0., 3.6, u_reveal * u_reveal), 1e-3) * F;
  col *= smoothstep(revealR, revealR * .6, r);
  // The circle of flame that bounds the form; outside it there is nothing.
  vec2 ea = p0 - heart;
  float as = atan(ea.x, ea.y);
  float RA = mix(.46, 2.8, max(W * W, T * T * .6)) * mix(1., .012, u_gather * u_gather * (3. - 2. * u_gather)) * F;
  float flick = fbm3(vec2(as * 6., t * (1.5 + T * 3.)));
  float rimR = RA + .05 * F * pow(1. - abs(fract(as / TAU * 44. + flick * .6) * 2. - 1.), 2.) * (.2 + 1.4 * flick * flick) * (1. + T * 2.) * clamp(RA / (.46 * F), .12, 1.);
  float epx = F / (u_res.y * fit);
  float inside = smoothstep(rimR + epx * 2., rimR - epx * 2., r);
  vec3 voidC = mix(lin(vec3(.012, .012, .03)), lin(vec3(.07, .01, .004)), T * (1. - u_gather)) * (.6 + .8 * fbm3(ea * 3. + t * .05)) * (1. - .85 * u_gather);
  col = mix(voidC, col, inside);
  col += mix(cGold(), lin(vec3(1., .35, .06)), T) * (exp(-abs(r - rimR) / (epx * 3. + .006 * F)) * .9 + exp(-max(r - RA, 0.) * 12. / F) * .18) * (.7 + .6 * flick) * smoothstep(0., .5, u_reveal);
  // The moon and the sun, its eyes (11.19).
  if (u_sunmoon > 0.){
    vec2 ms = e - vec2(-.17, .15) * F, ss2 = e - vec2(.17, .15) * F;
    float moon = smoothstep(.03 * F, .026 * F, length(ms)) * (1. - smoothstep(.03 * F, .026 * F, length(ms - vec2(.013, .006) * F)));
    vec3 moonC = mix(lin(vec3(.78, .86, 1.)), lin(vec3(1., .35, .1)), T);
    col += (moonC * moon * 2.5 + moonC * exp(-length(ms) * 18. / F) * .5) * u_sunmoon;
    float sd = length(ss2);
    col += (cWhite() * smoothstep(.03 * F, .026 * F, sd) * 3. + cGold() * exp(-sd * 14. / F) * .9) * u_sunmoon;
    // And they are eyes: lids open round them, the moon and the sun are the irises, each with a pupil
    // of night, and both look where the reader's pointer is.
    float lpx = epx / F;
    for (int i = 0; i < 2; i++){
      vec2 q = e / F - vec2(i == 0 ? -.17 : .17, .15);
      float open = smoothstep(0., .7, u_sunmoon);
      float lid = abs(q.y) - .052 * open * pow(max(0., 1. - (q.x / .1) * (q.x / .1)), .75);
      float ins = smoothstep(lpx * 1.5, -lpx * 1.5, lid);
      float ir = length(q - u_ptr * vec2(.008, .005));
      col = mix(col, col * .3 + mix(cWhite(), cGold(), .4) * .1, ins * u_sunmoon);
      col += (i == 0 ? moonC * .9 : cWhite() * 2.2) * smoothstep(.034 + lpx, .034 - lpx, ir) * ins * u_sunmoon;
      col = mix(col, vec3(0.), smoothstep(.012 + lpx, .012 - lpx, ir) * ins * u_sunmoon);
      col += cGold() * exp(-abs(lid) / (lpx * 2. + .002)) * .9 * u_sunmoon;
    }
  }
  if (u_emblem > 0.){
    vec4 em = emblems(e, t, epx);
    col = mix(col, em.rgb, em.a * u_emblem) + em.rgb * (1. - em.a) * u_emblem * .5;
  }
  col = mix(col, col * col * 2.4, T * .7);
  // Terror compresses the view: the dark closes in from every edge.
  col *= mix(1., smoothstep(.95, .12, length(uv * vec2(.8, 1.))), T * .85 * (1. - u_gather));
  float lum = dot(col, vec3(.3, .5, .2));
  col = mix(vec3(lum), col, .4 + .6 * u_dim) * u_dim;
  col = mix(col, col * lin(vec3(1., .88, .66)), u_fold) + lin(vec3(1., .86, .6)) * exp(-length(p0 - heart) * mix(60., 9., u_fold)) * u_fold * 1.2;
  // Out of the white of the point flown into: the form unfolds from its own heart.
  finish(mix(col * .8, vec3(7.), u_flash * u_flash * u_flash));
}`;

// "Here, in one place, the whole universe" (11.7, 11.13), made literal by geometry. Space is inverted
// through one sphere hanging over the plain: whatever is outside it appears inside it, so inside it the
// same plain with every army is rolled into a small world, and everything infinitely far away (the
// whole sky) is gathered into one point at its centre. The camera rises from the plain and flies into
// that point, which is the heart of the universal form. Ray-marched; the inverted distance is scaled by
// the inversion's local magnification.
const ORB = HEAD + COMMON + `
uniform float u_fly, u_white;
const vec3 C = vec3(0., 1.3, 7.);
const vec3 SUN = normalize(vec3(.25, .09, 1.));
vec3 inv(vec3 p){ vec3 d = p - C; return C + d / dot(d, d); }
float soldier(vec3 p){
  float b = length(p - vec3(0., clamp(p.y, .02, .3), 0.)) - .055;
  b = min(b, length(p - vec3(0., .39, 0.)) - .05);
  return min(b, length(p - vec3(.08, clamp(p.y, 0., .78), 0.)) - .007);
}
float army(vec3 p){
  float ax = abs(p.x);
  if (ax < 1.1 || ax > 9. || p.z < 1.5 || p.z > 40. || p.y > 1.) return max(max(1.1 - ax, ax - 9.), max(max(1.5 - p.z, p.z - 40.), p.y - 1.)) + .05;
  vec2 id = floor(p.xz / .62);
  vec2 q = (fract(p.xz / .62) - .5) * .62 + (vec2(h21(id), h21(id + 7.)) - .5) * .18;
  return soldier(vec3(q.x, p.y, q.y));
}
float real(vec3 p, out float m){ float g = p.y, a = army(p); m = a < g ? 1. : 0.; return min(g, a); }
float map(vec3 p, out float m){ vec3 d = p - C; float r2 = dot(d, d); if (r2 > 1.) return real(p, m); return real(inv(p), m) * r2 * .8; }
vec3 sky(vec3 rd){
  vec3 c = mix(lin(vec3(.78, .54, .32)), lin(vec3(.08, .07, .09)), smoothstep(-.02, .5, rd.y));
  float sd = acos(clamp(dot(rd, SUN), -1., 1.));
  return c + lin(vec3(1., .8, .5)) * (smoothstep(.02, .016, sd) * 3. + exp(-sd * 9.) * .5 + exp(-sd * 2.) * .1);
}
void main(){
  vec2 uv = suv();
  float a = smoothstep(.1, .65, u_fly), b = smoothstep(.6, 1., u_fly);
  vec3 near = C + vec3(0., .05, -1.35);
  vec3 ro = mix(mix(vec3(0., .48, 0.), near, a), C + vec3(0., .02, -.03), b);
  // at first looking a little down the plain, so the small world hangs high, clear of the title
  vec3 fw = normalize(mix(vec3(0., -.07, 1.), normalize(C - near), a));
  vec3 rt = normalize(cross(vec3(0., 1., 0.), fw)), up = cross(fw, rt);
  vec3 rd = normalize(uv.x * rt + uv.y * up + 1.25 * fw);
  vec3 p = ro; float t = 0., m = 0., glow = 0.; bool hit = false, inside = false;
  for (int i = 0; i < 170; i++){
    float r = length(p - C), d = map(p, m);
    if (r < 1.) glow += exp(-r * 22.) * .02 + exp(-r * 5.) * .0015;
    if (d < .0006 * (r < 1. ? r * r : 1. + t * .5)){ hit = true; inside = r < 1.; break; }
    t += min(d, max(abs(r - 1.), .004)); p = ro + rd * t;
    if (t > 90.) break;
  }
  vec3 col = sky(rd);
  if (hit){
    vec2 e = vec2(.0007, 0.) * (inside ? max(dot(p - C, p - C), .01) : 1. + t * .01);
    float mm;
    vec3 n = normalize(vec3(map(p + e.xyy, mm) - map(p - e.xyy, mm), map(p + e.yxy, mm) - map(p - e.yxy, mm), map(p + e.yyx, mm) - map(p - e.yyx, mm)));
    vec3 q = inside ? inv(p) : p;
    vec3 base = m < .5 ? mix(lin(vec3(.16, .12, .085)), lin(vec3(.30, .23, .15)), .4 * (.5 + .5 * sin(q.x * 9. + fbm(q.xz * .7) * 4.)) + .6 * fbm(q.xz * 3.)) : lin(vec3(.06, .045, .04));
    col = base * (lin(vec3(1., .75, .45)) * max(dot(n, SUN), 0.) * 1.1 + lin(vec3(.35, .3, .3)) * (.5 + .5 * n.y) * .5);
    col = mix(col, sky(normalize(q - ro)) * .9, 1. - exp(-(inside ? length(q - ro) : t) * .045));
  }
  // the surface itself is invisible; light only bends faintly at its rim
  vec3 oc = ro - C; float bq = dot(oc, rd), cq = dot(oc, oc) - 1., disc = bq * bq - cq;
  if (cq > 0. && disc > 0. && -bq - sqrt(disc) > 0.) col += lin(vec3(1., .85, .6)) * exp(-sqrt(disc) * 28.) * .5;
  col += lin(vec3(1., .88, .66)) * glow * 3.;
  // the last of the flight is into the point where all the sky is gathered: it fills the view with light
  finish(mix(col, vec3(7.), max(u_white, smoothstep(.82, 1., u_fly))));
}`;

// 11.26–27: the plain again, under the burning form, and the two armies are its jaws. The horizon the
// armies stand on curves into a lower lip; its mirror image comes down as the upper, the soldiers
// are the teeth, and the three named in sequence I stand among them. Sky and throat are left
// transparent, so the burning form behind shows through as the fire inside the mouth.
const JAWS = HEAD + COMMON + `
uniform float u_form, u_close;
// Where the three named stand, as fractions of the mouth's half-width (timeline.ts JAW_NAMED).
const float NX0 = .35, NX1 = .51, NX2 = .67;
float A0(){ return exp(mix(log(4.), log(.24), u_form)); }
float jA(){ return A0() * mix(1., .07, u_close); }
float jW(){ return exp(mix(log(80.), log(min(.98, aspect() * .47)), u_form)); }
float H(float x){ float w = jW(); return jA() * pow(max(0., 1. - (x / w) * (x / w)), .62); }
float soldier(vec2 q, float k){
  float body = min(sdSeg(q, vec2(0.), vec2(0., .012 * k)) - .0032 * k, length(q - vec2(0., .017 * k)) - .0034 * k);
  return min(body, sdSeg(q, vec2(.0042 * k, 0.), vec2(.0042 * k, .04 * k)) - mix(.0011, .0003, clamp(q.y / (.04 * k), 0., 1.)) * k);
}
void main(){
  vec2 p = suv();
  float Z = mix(1., 1.75, u_form), k = mix(1., 2.1, u_form), px = Z / u_res.y;
  float yc = mix(-.13, -.02, u_form) + jA(), hx = H(p.x);
  float upper = step(yc, p.y);
  float s = (upper > .5 ? (yc + hx) - p.y : p.y - (yc - hx)) * Z, x = p.x * Z;
  // the teeth: rank on rank of soldiers; the three named among them, taller
  float cw = .016 * k, cell = floor(x / cw), dx = (fract(x / cw) - .5) * cw, hh = h11(cell + 3.);
  float d = soldier(vec2(dx, s), k * (.8 + .4 * hh));
  d = abs(x) < .06 ? 1. : d;
  for (int i = 0; i < 3; i++){ float nx = (i == 0 ? NX0 : i == 1 ? NX1 : NX2) * jW() * Z; float di = soldier(vec2(x - nx, s), k * 1.35); d = abs(x - nx) < .012 * k ? di : min(d, di); }
  float m = clamp(.5 - d / px, 0., 1.);
  float gum = step(s, 0.);
  vec3 col = mix(lin(vec3(.05, .02, .018)), lin(vec3(.24, .1, .05)), exp(min(s, 0.) * 16.));
  vec3 fig = lin(vec3(.04, .02, .018));
  col = mix(col, fig, m);
  // firelight from inside the mouth, catching the lips and the edges of the teeth
  col += lin(vec3(1., .45, .12)) * exp(-max(d, 0.) / (px * 2.5 + .002)) * (1. - m) * .5 * (1. - gum);
  col += lin(vec3(1., .5, .16)) * exp(-abs(s) / (px * 3. + .003)) * .6;
  float cover = max(gum, m);
  // beyond the corners of the mouth there is nothing
  cover = max(cover, smoothstep(jW() * .9, jW() * 1.02, abs(p.x)) * u_form);
  o = vec4(sqrt(aces(col)) + (h21(gl_FragCoord.xy) - .5) / 255., u_alpha * cover);
}`;

// Time: a wheel of concentric dials, each marked like an astronomical instrument and turning at its
// own pace. u_spin is integrated by the engine (and quickened by scrolling); u_still halts it.
const TIME = HEAD + COMMON + `
uniform float u_spin, u_still, u_kala, u_instrument, u_ember;
float speedOf(float i){ return (mod(i, 2.) * 2. - 1.) / (1. + i * i * .35); }
void main(){
  vec2 uv = suv();
  float fit = min(1., aspect() * 1.1);
  vec2 p = uv / fit + u_ptr * .008;
  float r = length(p), a = atan(p.y, p.x);
  float px = 1.2 / (u_res.y * fit);
  vec3 gold = lin(vec3(.95, .78, .45));
  vec3 col = mix(lin(vec3(.012, .016, .045)), lin(vec3(.05, .012, .006)), u_ember);
  float breathe = 1. + .05 * sin(u_time * .25);
  float rb = r / breathe;
  float lr = log(rb / .06) / log(1.42);
  float i = floor(lr), f = fract(lr);
  if (i >= 0. && i < 10.){
    float ang = a + u_spin * speedOf(i);
    float n = i < 1. ? 12. : i < 2. ? 27. : i < 3. ? 60. : i < 4. ? 108. : i < 5. ? 12. : i < 6. ? 360. : i < 7. ? 28. : 60.;
    float grp = n > 59. ? 5. : 3.;
    float dt = abs(fract(ang / TAU * n) - .5) * TAU / n * rb;
    float dm = abs(fract(ang / TAU * n / grp) - .5) * TAU / n * grp * rb;
    float ringW = rb * .351;
    float band = smoothstep(.55, .62, f) * smoothstep(.98, .9, f);
    float ticks = smoothstep(px * 1.2, 0., dt) * band * .7 + smoothstep(px * 1.6, 0., dm) * smoothstep(.4, .5, f) * smoothstep(.98, .9, f);
    float circ = smoothstep(px * 1.5, 0., min(f, 1. - f) * ringW) + smoothstep(px * 1.2, 0., abs(f - .5) * ringW) * .35;
    // One body riding each ring: a small bright disc with a little light around it, as on an orrery.
    // (These were soft smears a twentieth of the screen wide.)
    float pa = fract(ang / TAU + h11(i) * 7.) - .5;
    vec2 mk = vec2(pa * TAU * rb, (f - .3) * ringW);
    float md = length(mk), mr = .0045 + .0035 * h11(i * 5.3);
    float marker = (smoothstep(mr + px, mr - px, md) * 1.6 + exp(-md * 150.) * .5) * step(.4, h11(i * 3.1));
    col += gold * (ticks * .8 + circ * .9 + marker) * (.4 + .6 * exp(-i * .12)) * (1. - u_kala * .55);
  }
  // The hand: one fine line sweeping the dials, with a short wake of light behind it. (It used to
  // drag a filled wedge a quarter of the wheel wide.)
  float hand = fract((a - u_spin * .6) / TAU);
  col += gold * (pow(hand, 260.) * .16 + smoothstep(px * 1.6, 0., (1. - hand) * TAU * r) * .9) * smoothstep(1.4, .05, r) * (1. - u_still);
  // Depth: the wheel is lit from its centre and falls into dark at its rim; nothing floats flat.
  col *= .55 + .75 * exp(-r * 1.5);
  col += gold * exp(-r * 9.) * .1;
  vec2 sp = vec2(cos(-u_spin * .21), sin(-u_spin * .21)) * .06 * pow(1.42, 6.5) * breathe;
  col += lin(vec3(1., .82, .5)) * (smoothstep(.022, .018, length(p - sp)) * 2. + exp(-length(p - sp) * 22.) * .5);
  vec2 mp = vec2(cos(u_spin * .37 + 2.), sin(u_spin * .37 + 2.)) * .06 * pow(1.42, 5.5) * breathe;
  float moon = smoothstep(.016, .012, length(p - mp)) * (1. - smoothstep(.016, .012, length(p - mp - vec2(.007, .003))));
  col += lin(vec3(.8, .86, 1.)) * moon * 1.6;
  float kr = .43;
  col += lin(vec3(1., .93, .8)) * u_kala * (exp(-abs(r - kr) / (px * 2. + .003)) * 3. + exp(-abs(r - kr) * 8.) * .45);
  col += lin(vec3(.9, .25, .05)) * u_ember * pow(fbm(p * 3. + u_time * .1), 3.) * .9 * exp(-r * 1.2);
  if (u_instrument > 0.){
    float ia = PI * .62 - u_spin * speedOf(5.);
    vec2 ip = vec2(cos(ia), sin(ia)) * .06 * pow(1.42, 5.55) * breathe;
    float d = length(p - ip);
    float trail = smoothstep(.004, 0., abs(r - length(ip))) * smoothstep(.35, 0., mod(atan(ip.y, ip.x) - a + TAU * 4., TAU)) * .6;
    col += lin(vec3(1., .86, .5)) * (smoothstep(.009, .006, d) * 3. + exp(-d * 40.) * .9 + trail) * u_instrument;
  }
  finish(col);
}`;

// One flame. Tall and fierce (heat 1) for the moths of 11.29: it stands where the burning form drew
// in to a point, and it is the only light, so everything that moves is moving toward it. Small and
// steady on a clay lamp (heat 0) for the friend, with the pool of light a lamp makes on the ground
// it stands on. Additive light.
const LAMP = HEAD + COMMON + `
uniform float u_heat;
void main(){
  vec2 uv = suv();
  float H = u_heat, t = u_time;
  vec2 F = vec2(0., mix(-.26, -.13, H));
  float s = mix(.058, .13, H);
  vec2 q = (uv - F) / s;
  q.x += (fbm3(vec2(q.y * 1.5 - t * (2. + 3. * H), t * .9)) - .5) * .6 * smoothstep(-.4, 1.6, q.y) * (.45 + .9 * H);
  q.x *= 1. + .06 * sin(t * 13.) * H;
  float d = q.y < 0. ? length(q * vec2(1., 1.25)) - .42 : abs(q.x) - .42 * pow(max(0., 1. - q.y / 1.9), 1.3);
  d = max(d, q.y - 1.9);
  float body = smoothstep(.08, -.12, d);
  float core = smoothstep(0., -.3, d) * smoothstep(1.3, .2, q.y);
  vec3 c = lin(vec3(1., .42, .08)) * body * 1.4 + lin(vec3(1., .85, .5)) * core * 2.5;
  c += lin(vec3(.25, .4, 1.)) * exp(-length(q - vec2(0., -.25)) * 7.) * .6 * (1. - H * .5);
  // Its light on the air: close and falling off fast, so the dark around it stays dark.
  float rr = length(uv - F - vec2(0., s * .5));
  c += lin(vec3(1., .55, .2)) * (exp(-rr * mix(11., 6.5, H)) * mix(.34, .5, H) + exp(-rr * mix(40., 16., H)) * .5 + exp(-rr * 2.2) * .06 * H);
  if (H > .5){
    // Embers going up from it: few, small, round.
    vec2 sp = vec2(uv.x * 52. + sin(uv.y * 7. + t) * .7, uv.y * 52. - t * 5.);
    vec2 cell = floor(sp);
    float spark = step(.988, h21(cell)) * smoothstep(.2, 0., length(fract(sp) - .5)) * exp(-length((uv - F) * vec2(3.2, 1.3)) * 2.2) * smoothstep(-.02, .1, uv.y - F.y);
    c += lin(vec3(1., .62, .22)) * spark * 2.4 * H;
  } else {
    vec2 lq = (uv - F - vec2(0., -s * .72)) / s;
    float bowl = max(sdEll(lq, vec2(1.7, .62)), lq.y - .02);
    bowl = min(bowl, max(sdEll(lq - vec2(-1.55, .02), vec2(.5, .16)), lq.y - .05));
    float bm = smoothstep(.04, -.04, bowl);
    c += lin(vec3(.62, .34, .17)) * bm * (.12 + .7 * exp(-length(lq - vec2(0., .1)) * .9));
    c += lin(vec3(1., .75, .4)) * smoothstep(.05, 0., abs(lq.y - .0)) * step(abs(lq.x), 1.3) * .25;
    // The ground it stands on: a pool of warm light, wide and shallow, darker under the bowl.
    vec2 gq = (uv - F - vec2(0., -s * 1.42)) / s;
    float pool = exp(-dot(gq * vec2(.17, 1.05), gq * vec2(.17, 1.05)) * 1.6) * smoothstep(.5, -.2, gq.y);
    float under = 1. - .75 * exp(-dot(gq * vec2(.6, 3.), gq * vec2(.6, 3.)));
    c += lin(vec3(1., .6, .28)) * pool * under * (.34 + .05 * sin(t * 2.3) * fbm3(vec2(t * .7, 0.)));
  }
  finishLight(c);
}`;

// The eye of a peacock feather: every eye of the form gathered into one familiar thing.
const FEATHER = HEAD + COMMON + `
uniform float u_form;
void main(){
  vec2 uv = suv();
  float fit = min(1., aspect() * 1.2);
  float grow = mix(.03, 1., u_form * u_form * (3. - 2. * u_form));
  vec2 p = (uv / fit - vec2(0., .04)) / grow;
  p *= rot(.05 * sin(u_time * .2));
  float px = 1. / (u_res.y * fit * grow);
  float irid = dot(normalize(p + 1e-4), u_ptr) * .5;
  vec3 navy = lin(vec3(.04, .06, .20)), blue = lin(vec3(.09, .24, .55)), teal = lin(vec3(.06, .44, .43));
  vec3 bronze = lin(vec3(.62, .45, .22)), green = lin(vec3(.20, .38, .20)), gold = lin(vec3(.84, .70, .42));
  // The ocellus: a dark heart in nested teardrops of blue, turquoise, bronze and green.
  vec2 e = vec2(p.x, p.y * (p.y > 0. ? 1.2 : .82));
  float b = length(e) / .2;
  float heart = length(vec2(abs(p.x) * 1.15 + .012, (p.y + .012) * .9 + abs(p.x) * .3)) / .2;
  vec3 c = mix(navy, blue, smoothstep(.34, .42, heart));
  c = mix(c, teal, smoothstep(.5, .58, b));
  c = mix(c, bronze, smoothstep(.68, .74, b));
  c = mix(c, green, smoothstep(.82, .9, b));
  c *= .85 + .3 * smoothstep(.4, .9, sin(b * 26. + irid * 5. + u_time * .25) * .5 + .5);
  float eyeM = smoothstep(1. + px * 8., 1. - px * 8., b);
  // The vane: fine barbs leaving the rachis at an angle, thinning toward a ragged edge.
  float vane = length(vec2(p.x / .36, (p.y + .06) / .5)) + (fbm3(p * 14.) - .5) * .12;
  float barb = abs(fract((p.y + abs(p.x) * 1.25) * 70.) - .5) / 70.;
  float barbs = smoothstep(px * 1.6, 0., barb);
  vec3 vaneC = mix(green, gold, .45 + .45 * sin(p.y * 7. + irid * 3.)) * (.18 + .55 * barbs) * smoothstep(1., .45, vane);
  float vaneM = smoothstep(1., .9, vane) * (1. - eyeM);
  float rach = smoothstep(px * 1.5, 0., abs(p.x) - .002) * step(p.y, -.18) * smoothstep(-1.3, -.25, p.y);
  vec3 bg = mix(lin(vec3(.02, .035, .04)), lin(vec3(.22, .18, .12)), smoothstep(-.6, .7, uv.y) * .6);
  vec3 col = bg * (1. - max(eyeM, vaneM * .8)) + c * eyeM + vaneC * vaneM + gold * rach * .7;
  col += gold * exp(-length(p) * 4.) * .08 * grow;
  finish(col);
}`;

// Points. Positions are functions of gl_VertexID and time.
const POINT_HEAD = `#version 300 es
precision highp float;
uniform vec2 u_res;
uniform float u_time;
uniform float u_alpha;
uniform vec2 u_ptr;
uniform float u_px;
#define TAU 6.28318531
uint hu(uint x){ x ^= x >> 16; x *= 0x7feb352dU; x ^= x >> 15; x *= 0x846ca68bU; x ^= x >> 16; return x; }
float hf(uint x){ return float(hu(x)) / 4294967295.; }
float aspect(){ return u_res.x / u_res.y; }
vec4 clip(vec2 p){ return vec4(p.x * 2. / aspect(), p.y * 2., 0., 1.); }
out float v_b;
out vec3 v_c;
`;

const GLOW_FRAG = `#version 300 es
precision highp float;
uniform float u_alpha;
in float v_b;
in vec3 v_c;
out vec4 o;
void main(){ vec2 c = gl_PointCoord * 2. - 1.; float d = dot(c, c); o = vec4(v_c * v_b * exp(-d * 3.) * (1. - smoothstep(.7, 1., d)), u_alpha); }`;

// Dust over the plain; under divine sight it settles onto rings around the small world.
const DUST_VERT = POINT_HEAD + `
uniform float u_align, u_dawn;
void main(){
  uint id = uint(gl_VertexID);
  float h1 = hf(id * 3u + 1u), h2 = hf(id * 3u + 2u), h3 = hf(id * 5u + 7u);
  float ax = aspect();
  vec2 free = vec2((fract(h1 + u_time * (.004 + .01 * h2)) - .5) * ax * 1.1, mix(-.5, .3, pow(h3, 1.5)) + .02 * sin(u_time * .3 + h1 * 20.));
  float k = floor(h2 * 6.);
  float ang = h1 * TAU + u_time * .05 * (mod(k, 2.) * 2. - 1.);
  vec2 ring = vec2(0., -.03) + .08 * pow(1.45, k) * vec2(cos(ang), sin(ang));
  gl_Position = clip(mix(free, ring, smoothstep(0., 1., u_align)));
  gl_PointSize = (1.4 + 2.2 * h3 * h3) * u_px;
  v_b = (.1 + .34 * h2) * mix(.75, .55, u_dawn);
  v_c = mix(vec3(.85, .7, .45), vec3(1., .82, .5), u_align);
}`;

// 11.28: currents of light running from every direction through ever fewer, broader channels into
// the mouth, like tributaries into rivers into the sea.
const RIVERS_VERT = POINT_HEAD + `
uniform float u_gather;
void main(){
  uint id = uint(gl_VertexID);
  float h1 = hf(id * 3u + 1u), h2 = hf(id * 3u + 2u), h3 = hf(id * 7u + 5u);
  float th0 = h1 * TAU;
  float ph = fract(u_time * (.035 + .03 * h2) + h3);
  float th = th0;
  float lv[4] = float[4](96., 28., 9., 3.);
  float ed[4] = float[4](.12, .38, .62, .82);
  for (int i = 0; i < 4; i++){ float q = TAU / lv[i]; th = mix(th, (floor(th0 / q) + .5) * q, smoothstep(ed[i] - .08, ed[i] + .08, ph)); }
  float r = 1.25 * pow(1. - ph, 1.35) + .002;
  th += sin(r * 22. + h1 * 40.) * .025 * (1. - ph) + ph * ph * ph * 1.4;
  float fit = min(1., aspect() * 1.05);
  gl_Position = clip((vec2(0., -.04) + r * vec2(cos(th), sin(th))) * fit);
  gl_PointSize = (1.2 + 1.3 * h2) * u_px * (1. + ph);
  v_b = smoothstep(0., .15, ph) * (.25 + .55 * ph);
  v_c = mix(mix(vec3(.45, .65, 1.), vec3(1., .82, .55), smoothstep(.5, .95, ph)), vec3(1., .5, .18), u_gather);
}`;

// 11.29: moths flying into the flame. They come from the dark beyond the frame on the same inward
// spiral the rivers ran, nearly all turning the same way, faster the closer they are; each is lit on
// the flame's side as it nears, flares, and is gone. Positions are functions of index and time.
const MOTHS_VERT = `#version 300 es
precision highp float;
uniform vec2 u_res;
uniform float u_time;
uniform float u_px;
#define TAU 6.28318531
uint hu(uint x){ x ^= x >> 16; x *= 0x7feb352dU; x ^= x >> 15; x *= 0x846ca68bU; x ^= x >> 16; return x; }
float hf(uint x){ return float(hu(x)) / 4294967295.; }
out float v_flap;
out float v_burn;
out float v_fade;
out float v_lit;
out vec2 v_dir;
vec2 path(float ph, float h3, float h4, float turn, float h1){
  float r = (.5 + .95 * h3) * pow(1. - ph, 1.55);
  float ang = h4 * TAU + turn * (2.4 * log(1.4 / (r + .06)) + .25 * sin(u_time * 2.3 + h1 * 20.));
  return vec2(0., -.03) + r * vec2(cos(ang), sin(ang) * .86);
}
void main(){
  uint id = uint(gl_VertexID);
  float h1 = hf(id * 5u + 1u), h2 = hf(id * 5u + 2u), h3 = hf(id * 5u + 3u), h4 = hf(id * 5u + 4u), h5 = hf(id * 5u + 5u);
  float ph = fract(u_time * (.05 + .04 * h2) + h1);
  float turn = h5 > .14 ? 1. : -1.;
  vec2 pos = path(ph, h3, h4, turn, h1);
  vec2 ahead = path(min(ph + .012, 1.), h3, h4, turn, h1);
  pos += .006 * vec2(sin(u_time * 15. + h3 * 40.), cos(u_time * 12. + h4 * 30.));
  float r = length(pos - vec2(0., -.03));
  gl_Position = vec4(pos.x * 2. * u_res.y / u_res.x, pos.y * 2., 0., 1.);
  // Size as distance from the eye: a few are near and large, most are small.
  gl_PointSize = mix(15., 46., pow(h2, 2.6)) * u_px * (.75 + .25 * (1. - ph));
  v_dir = normalize(ahead - pos + 1e-5);
  v_flap = u_time * (20. + 12. * h3) + h1 * 30.;
  v_burn = smoothstep(.93, .995, ph);
  v_fade = smoothstep(0., .08, ph) * (1. - smoothstep(.99, 1., ph));
  v_lit = exp(-r * 3.4);
}`;

const MOTHS_FRAG = `#version 300 es
precision highp float;
uniform float u_alpha;
in float v_flap;
in float v_burn;
in float v_fade;
in float v_lit;
in vec2 v_dir;
out vec4 o;
void main(){
  // The sprite turns to face the way the moth is flying: head along +y.
  vec2 c0 = gl_PointCoord * 2. - 1.; c0.y = -c0.y;
  vec2 c = vec2(c0.x * v_dir.y - c0.y * v_dir.x, c0.x * v_dir.x + c0.y * v_dir.y);
  float flap = .3 + .7 * abs(sin(v_flap));
  vec2 w = vec2(abs(c.x), c.y);
  float fore = length(vec2((w.x - .4 * flap) / (.46 * flap + .05), (w.y - .14 - w.x * .25) / .36));
  float hind = length(vec2((w.x - .26 * flap) / (.3 * flap + .04), (w.y + .26) / .26));
  float wing = smoothstep(1., .82, min(fore, hind));
  float body = smoothstep(.1, .04, abs(c.x)) * smoothstep(.62, .42, abs(c.y - .02));
  float m = max(wing * (.55 + .3 * v_lit), body);
  // Unlit they are only darker shapes against the dark; the flame gives them colour as they near it.
  vec3 col = mix(vec3(.2, .16, .13), vec3(1., .82, .55), v_lit) * (.5 + .7 * v_lit);
  col = mix(col, vec3(1.2, .62, .2), v_burn);
  o = vec4(col, m * u_alpha * v_fade * (.4 + .6 * smoothstep(0., .25, v_lit) + v_burn));
}`;

// Lives on the wheel of time: brief sparks born on the rings, going out; a few stars flaring.
const LIVES_VERT = POINT_HEAD + `
uniform float u_spin, u_still, u_ltime;
void main(){
  uint id = uint(gl_VertexID);
  float h1 = hf(id * 5u + 1u), h2 = hf(id * 5u + 2u), h3 = hf(id * 5u + 3u), h4 = hf(id * 5u + 4u), h5 = hf(id * 5u + 5u);
  float i = floor(h1 * 9.);
  float speed = (mod(i, 2.) * 2. - 1.) / (1. + i * i * .35);
  float rr = .06 * pow(1.42, i + .5 + (h2 - .5) * .6) * (1. + .05 * sin(u_time * .25));
  float ang = h3 * TAU - u_spin * speed;
  float star = step(.95, h4);
  float ph = fract(u_ltime * mix(.08, .25, h5) * (star > 0. ? .4 : 1.) + h2 * 7.);
  float env = smoothstep(0., .04, ph) * pow(1. - ph, star > 0. ? 1.5 : 3.);
  float fit = min(1., aspect() * 1.1);
  gl_Position = clip(rr * vec2(cos(ang), sin(ang)) * fit);
  gl_PointSize = (star > 0. ? 3. + 7. * env : 1.6 + 1.8 * env) * u_px;
  v_b = env * (star > 0. ? 1.1 : .7);
  v_c = star > 0. ? vec3(.8, .88, 1.) : vec3(1., .85, .55);
}`;

export const PROGRAMS: Record<ProgramName, ProgramDef> = {
  battlefield: { frag: BATTLEFIELD, blend: 'over' },
  suns: { frag: SUNS, blend: 'over' },
  cosmos: { frag: COSMOS, blend: 'over' },
  time: { frag: TIME, blend: 'over' },
  feather: { frag: FEATHER, blend: 'over' },
  orb: { frag: ORB, blend: 'over' },
  jaws: { frag: JAWS, blend: 'over' },
  lamp: { frag: LAMP, blend: 'add' },
  dust: { frag: GLOW_FRAG, vert: DUST_VERT, count: { low: 600, high: 1600 }, blend: 'add' },
  rivers: { frag: GLOW_FRAG, vert: RIVERS_VERT, count: { low: 12000, high: 40000 }, blend: 'add' },
  moths: { frag: MOTHS_FRAG, vert: MOTHS_VERT, count: { low: 110, high: 260 }, blend: 'over' },
  lives: { frag: GLOW_FRAG, vert: LIVES_VERT, count: { low: 700, high: 1600 }, blend: 'add' },
};
