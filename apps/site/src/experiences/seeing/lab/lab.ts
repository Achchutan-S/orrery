// The laboratory in the browser: sliders redraw the window (window.ts) and update the readout.
import { PARAMS, PRESETS, nearest, windowSvg, type Params } from './window.ts';

const root = document.querySelector<HTMLElement>('[data-lab]');
if (root) {
  const svg = root.querySelector<SVGSVGElement>('[data-window]')!;
  const readout = root.querySelector<HTMLElement>('[data-readout]')!;
  const form = root.querySelector<HTMLFormElement>('[data-controls]')!;
  const inputs = PARAMS.map((k) => form.querySelector<HTMLInputElement>(`input[name="${k.id}"]`)!);
  form.hidden = false;
  root.querySelector<HTMLElement>('[data-nojs]')!.hidden = true;

  let frame = 0;
  const read = (): Params => Object.fromEntries(PARAMS.map((k, i) => [k.id, Number(inputs[i]!.value)])) as Params;
  const render = () => {
    frame = 0;
    const p = read();
    svg.innerHTML = windowSvg(p);
    const n = nearest(p);
    readout.textContent = n.d < 0.05
      ? `This is the curated ${n.title} composition.`
      : `Closest curated composition: ${n.title}${n.d > 0.9 ? ', though not close' : ''}. A resemblance between drawings, not an identification of a style.`;
  };
  form.addEventListener('input', () => { if (!frame) frame = requestAnimationFrame(render); });
  form.querySelectorAll<HTMLButtonElement>('[data-preset]').forEach((b) => b.addEventListener('click', () => {
    const preset = PRESETS.find((x) => x.id === b.dataset.preset)!;
    PARAMS.forEach((k, i) => { inputs[i]!.value = String(preset.p[k.id]); });
    render();
  }));
}
