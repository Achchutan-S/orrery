// The corridor at low resolution: drawn into a tiny canvas and shown scaled up with hard pixels.
// Resolution and "something wrong with the walls" (a still, sideways displacement of rows) are
// the visitor's choices; nothing animates. Also counts this visitor's visits to the page, in
// this browser only, and says so plainly.
const canvas = document.querySelector<HTMLCanvasElement>('[data-corridor]');
const RES = { high: [192, 120], mid: [96, 60], low: [40, 25] } as const;

function corridor(ctx: CanvasRenderingContext2D, w: number, h: number) {
  const P = (x: number, y: number) => [x * w, y * h] as const;
  const poly = (pts: (readonly [number, number])[], fill: string) => {
    ctx.fillStyle = fill; ctx.beginPath();
    pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
    ctx.closePath(); ctx.fill();
  };
  poly([P(0, 0), P(1, 0), P(1, 1), P(0, 1)], '#cfc9a8');
  poly([P(0, 0), P(1, 0), P(0.65, 0.34), P(0.35, 0.34)], '#e8e4d0');
  poly([P(0, 1), P(1, 1), P(0.65, 0.66), P(0.35, 0.66)], '#9d9672');
  poly([P(0, 0), P(0.35, 0.34), P(0.35, 0.66), P(0, 1)], '#bdb78f');
  poly([P(1, 0), P(0.65, 0.34), P(0.65, 0.66), P(1, 1)], '#b2ac84');
  poly([P(0.35, 0.34), P(0.65, 0.34), P(0.65, 0.66), P(0.35, 0.66)], '#6f6a4f');
  poly([P(0.46, 0.44), P(0.54, 0.44), P(0.54, 0.66), P(0.46, 0.66)], '#2c2a20');
  for (const [y, s] of [[0.08, 0.2], [0.2, 0.12], [0.28, 0.06]] as const) poly([P(0.5 - s, y), P(0.5 + s, y), P(0.5 + s, y + 0.02), P(0.5 - s, y + 0.02)], '#fffbe6');
  for (const x of [0.1, 0.2, 0.8, 0.9]) {
    const t = x < 0.5 ? x / 0.35 : (1 - x) / 0.35;
    const top = 0.34 * t + 0.12; const bottom = 1 - 0.34 * t - 0.02;
    poly([P(x - 0.025, top), P(x + 0.025, top), P(x + 0.025, bottom), P(x - 0.025, bottom)], '#7f7a5c');
  }
}

if (canvas) {
  const still = document.querySelector<SVGElement>('.k-still');
  const ctx = canvas.getContext('2d');
  if (ctx) {
    const draw = () => {
      const res = (document.querySelector<HTMLInputElement>('input[name="k-res"]:checked')?.value ?? 'mid') as keyof typeof RES;
      const warp = Number(document.querySelector<HTMLInputElement>('input[name="k-warp"]:checked')?.value ?? 1);
      const [w, h] = RES[res];
      canvas.width = w; canvas.height = h;
      corridor(ctx, w, h);
      if (warp) {
        const img = ctx.getImageData(0, 0, w, h);
        const out = ctx.createImageData(w, h);
        for (let y = 0; y < h; y++) {
          const shift = Math.round(Math.sin(y / h * Math.PI * 3) * warp * w * 0.015);
          for (let x = 0; x < w; x++) {
            const sx = Math.min(w - 1, Math.max(0, x + shift));
            for (let c = 0; c < 4; c++) out.data[(y * w + x) * 4 + c] = img.data[(y * w + sx) * 4 + c]!;
          }
        }
        ctx.putImageData(out, 0, 0);
      }
    };
    draw();
    canvas.hidden = false;
    if (still) still.style.display = 'none';
    document.querySelectorAll<HTMLElement>('[data-needs-js]').forEach((f) => { f.hidden = false; });
    document.querySelectorAll('input[name="k-res"], input[name="k-warp"]').forEach((i) => i.addEventListener('change', draw));
  }
}

const visits = document.querySelector<HTMLElement>('[data-visits]');
if (visits) {
  try {
    const n = Number(localStorage.getItem('seeing:weirdcore-visits') ?? 0) + 1;
    localStorage.setItem('seeing:weirdcore-visits', String(n));
    if (n > 1) { visits.textContent = `You have opened this page ${n} times in this browser.`; visits.hidden = false; }
  } catch { /* storage refused: say nothing */ }
}
