// The perspective instrument in the browser: three range inputs (the accessible controls) and a
// draggable vanishing point that sets the first two. Redraws the build-time SVG with the same
// geometry (perspective.ts). Without JavaScript the inputs are hidden and the first frame stays.
import { DEFAULT_EYE, clampEye, describe, draw, type Eye } from './perspective.ts';

const root = document.querySelector<HTMLElement>('[data-perspective]');
if (root) {
  const svg = root.querySelector<SVGSVGElement>('svg')!;
  const paths = Object.fromEntries([...root.querySelectorAll<SVGPathElement>('[data-part]')].map((p) => [p.dataset.part!, p]));
  const handle = root.querySelector<SVGGElement>('[data-vp]')!;
  const dp = root.querySelector<SVGCircleElement>('[data-dp]')!;
  const inputs = {
    eyeX: root.querySelector<HTMLInputElement>('#r-eye-x')!,
    eyeHeight: root.querySelector<HTMLInputElement>('#r-eye-h')!,
    distance: root.querySelector<HTMLInputElement>('#r-dist')!,
  };
  const status = root.querySelector<HTMLElement>('[data-eye-status]')!;
  let eye: Eye = { ...DEFAULT_EYE };
  let frame = 0;

  const render = () => {
    frame = 0;
    const d = draw(eye);
    for (const [k, el] of Object.entries(paths)) el.setAttribute('d', (d as unknown as Record<string, string>)[k]!);
    handle.setAttribute('transform', `translate(${d.vp.X.toFixed(1)} ${d.vp.Y.toFixed(1)})`);
    dp.setAttribute('cx', d.distancePoint.X.toFixed(1));
    dp.setAttribute('cy', d.distancePoint.Y.toFixed(1));
    status.textContent = describe(eye);
  };
  const set = (next: Partial<Eye>) => {
    eye = clampEye({ ...eye, ...next });
    inputs.eyeX.value = String(eye.eyeX);
    inputs.eyeHeight.value = String(eye.eyeHeight);
    inputs.distance.value = String(eye.distance);
    if (!frame) frame = requestAnimationFrame(render);
  };

  for (const [k, input] of Object.entries(inputs)) input.addEventListener('input', () => set({ [k]: Number(input.value) }));

  // Dragging: the vanishing point follows the pointer; it is the eye seen from the picture.
  const toEye = (ev: PointerEvent) => {
    const m = svg.getScreenCTM();
    if (!m) return;
    const p = new DOMPoint(ev.clientX, ev.clientY).matrixTransform(m.inverse());
    set({ eyeX: (p.x - 500) / 100, eyeHeight: (750 - p.y) / 100 });
  };
  let dragging = false;
  svg.addEventListener('pointerdown', (ev) => { dragging = true; svg.setPointerCapture(ev.pointerId); toEye(ev); });
  svg.addEventListener('pointermove', (ev) => { if (dragging) toEye(ev); });
  svg.addEventListener('pointerup', () => { dragging = false; });
  svg.addEventListener('pointercancel', () => { dragging = false; });

  root.querySelector('[data-reset]')?.addEventListener('click', () => set(DEFAULT_EYE));
  root.classList.add('is-live');
}
