// One-point perspective, honestly: a loggia projected onto a picture plane from an eye the visitor
// moves. Units are braccia (the Florentine arm, about 58 cm). The picture plane is a fixed window
// 10 braccia wide; the eye sits in front of it at `eyeX` across, `eyeHeight` up, `distance` back.
// Pure: the page renders the first frame at build time and scene.ts redraws with the same code.

export interface Eye { eyeX: number; eyeHeight: number; distance: number }
export const DEFAULT_EYE: Eye = { eyeX: 0, eyeHeight: 3, distance: 8 };
export const LIMITS = { eyeX: [-3.5, 3.5], eyeHeight: [0.5, 6.5], distance: [3, 16] } as const;

const W = 1000; // px across the picture
const H = 750;
const S = 100; // px per braccio on the picture plane
const DEPTH = 14;
const SIDE = 4; // the colonnades stand 4 braccia either side of the centre line

export const clampEye = (e: Eye): Eye => ({
  eyeX: Math.min(LIMITS.eyeX[1], Math.max(LIMITS.eyeX[0], e.eyeX)),
  eyeHeight: Math.min(LIMITS.eyeHeight[1], Math.max(LIMITS.eyeHeight[0], e.eyeHeight)),
  distance: Math.min(LIMITS.distance[1], Math.max(LIMITS.distance[0], e.distance)),
});

/** Screen position of a world point (x across, y up, z = depth behind the picture plane). */
export const project = (e: Eye, x: number, y: number, z: number) => {
  const k = e.distance / (e.distance + z);
  return { X: W / 2 + e.eyeX * S + (x - e.eyeX) * k * S, Y: H - e.eyeHeight * S + (e.eyeHeight - y) * k * S };
};

const pt = (p: { X: number; Y: number }) => `${p.X.toFixed(1)} ${p.Y.toFixed(1)}`;

export function draw(e: Eye) {
  const P = (x: number, y: number, z: number) => pt(project(e, x, y, z));
  const vp = { X: W / 2 + e.eyeX * S, Y: H - e.eyeHeight * S };

  // The pavement: 10 by DEPTH squares of one braccio, alternate squares dark.
  let dark = '';
  for (let i = -5; i < 5; i++) for (let j = 0; j < DEPTH; j++) {
    if ((i + j) % 2 === 0) continue;
    dark += `M${P(i, 0, j)} L${P(i + 1, 0, j)} L${P(i + 1, 0, j + 1)} L${P(i, 0, j + 1)}Z`;
  }
  const floor = `M${P(-5, 0, 0)} L${P(5, 0, 0)} L${P(5, 0, DEPTH)} L${P(-5, 0, DEPTH)}Z`;

  // Construction: orthogonals to the vanishing point, transversals, one diagonal to the distance point.
  let orthogonals = '';
  for (let i = -5; i <= 5; i++) orthogonals += `M${P(i, 0, 0)} L${pt(vp)}`;
  let transversals = '';
  for (let j = 0; j <= DEPTH; j++) transversals += `M${P(-5, 0, j)} L${P(5, 0, j)}`;
  const distancePoint = { X: vp.X + e.distance * S, Y: vp.Y };
  const diagonal = `M${P(-5, 0, 0)} L${pt(distancePoint)}`;

  // Columns, arches and walls of the two arcades.
  let columns = '';
  let arches = '';
  let walls = '';
  const R = 1; // half the bay: arches span 2 braccia
  const springing = 4.4;
  for (const side of [-1, 1]) {
    const x = side * SIDE;
    for (let z = 1; z <= DEPTH - 1; z += 2) {
      const r = 0.18;
      columns += `M${P(x - r, 0, z)} L${P(x + r, 0, z)} L${P(x + r, springing, z)} L${P(x - r, springing, z)}Z`;
    }
    for (let z = 1; z < DEPTH - 1; z += 2) {
      let d = `M${P(x, springing, z)}`;
      for (let t = 1; t <= 12; t++) {
        const a = Math.PI - (t / 12) * Math.PI;
        d += ` L${P(x, springing + Math.sin(a) * R, z + R + Math.cos(a) * R)}`;
      }
      arches += d;
    }
    walls += `M${P(x, springing + R + 0.3, 0)} L${P(x, springing + R + 0.3, DEPTH)}`;
    walls += `M${P(x, springing + R + 1.1, 0)} L${P(x, springing + R + 1.1, DEPTH)}`;
    walls += `M${P(x * 1.5, 0, 0)} L${P(x * 1.5, 0, DEPTH)}`;
  }
  // The end wall with a round-headed door.
  const back = `M${P(-SIDE, 0, DEPTH)} L${P(SIDE, 0, DEPTH)} L${P(SIDE, 6.6, DEPTH)} L${P(-SIDE, 6.6, DEPTH)}Z`;
  let door = `M${P(-0.8, 0, DEPTH)} L${P(-0.8, 2.4, DEPTH)}`;
  for (let t = 1; t <= 10; t++) { const a = Math.PI - (t / 10) * Math.PI; door += ` L${P(Math.cos(a) * 0.8, 2.4 + Math.sin(a) * 0.8, DEPTH)}`; }
  door += ` L${P(0.8, 0, DEPTH)}Z`;
  const horizon = `M0 ${vp.Y.toFixed(1)} L${W} ${vp.Y.toFixed(1)}`;

  return { dark, floor, orthogonals, transversals, diagonal, columns, arches, walls, back, door, horizon, vp, distancePoint };
}

export const describe = (e: Eye) => {
  const across = Math.abs(e.eyeX) < 0.25 ? 'in the centre' : `${Math.abs(e.eyeX).toFixed(1)} braccia to the ${e.eyeX < 0 ? 'left' : 'right'}`;
  return `Eye ${across}, ${e.eyeHeight.toFixed(1)} braccia above the floor, ${e.distance.toFixed(1)} braccia from the picture.`;
};
