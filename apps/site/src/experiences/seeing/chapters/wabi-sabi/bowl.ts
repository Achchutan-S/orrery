// A hand-shaped bowl, drawn at build time: an irregular profile (no two sides alike), a glaze
// line, and crazing cracks that appear as the page ages. Seeded, so every build is identical.
import { rng } from '../../lib/random.ts';

export function bowl(seed = 3) {
  const r = rng(seed);
  const wob = (n: number) => (r() - 0.5) * n;
  // Profile: rim to foot, left and right drawn separately so the bowl is not symmetrical.
  const L: [number, number][] = [[52 + wob(4), 70], [46 + wob(5), 120], [70 + wob(6), 178], [104, 196], [108, 210]];
  const R: [number, number][] = [[248 + wob(4), 66], [256 + wob(5), 118], [232 + wob(6), 180], [196, 196], [192, 210]];
  const path = `M${L[0]![0]} ${L[0]![1]} C ${L[1]![0]} ${L[1]![1]}, ${L[2]![0]} ${L[2]![1]}, ${L[3]![0]} ${L[3]![1]} L${L[4]![0]} ${L[4]![1]} H${R[4]![0]} L${R[3]![0]} ${R[3]![1]} C ${R[2]![0]} ${R[2]![1]}, ${R[1]![0]} ${R[1]![1]}, ${R[0]![0]} ${R[0]![1]} C 200 ${58 + wob(6)}, 110 ${76 + wob(6)}, ${L[0]![0]} ${L[0]![1]}Z`;
  const rim = `M${L[0]![0]} ${L[0]![1]} C 110 ${84 + wob(5)}, 200 ${80 + wob(5)}, ${R[0]![0]} ${R[0]![1]}`;
  const glaze = `M${L[1]![0] + 4} ${L[1]![1] + 18} C 110 ${150 + wob(10)}, 160 ${128 + wob(10)}, 196 ${150 + wob(10)} S 240 ${136 + wob(8)}, ${R[1]![0] - 6} ${R[1]![1] + 14}`;
  const cracks = Array.from({ length: 14 }, () => {
    let x = 70 + r() * 160; let y = 90 + r() * 90;
    let d = `M${x.toFixed(1)} ${y.toFixed(1)}`;
    for (let i = 0; i < 4; i++) { x += wob(26); y += wob(22); d += ` L${x.toFixed(1)} ${y.toFixed(1)}`; }
    return d;
  });
  return { path, rim, glaze, cracks };
}
