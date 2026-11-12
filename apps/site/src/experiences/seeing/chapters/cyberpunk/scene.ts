// Rain on the glass in front of the city: drops that slide, streak and catch the neon. Loaded only
// when the city is on screen; never under reduced motion or without WebGL2 (the static city stays).
import { whenVisible, reducedMotion } from '../../house/lazy.ts';

const canvas = document.querySelector<HTMLCanvasElement>('[data-rain]');
if (canvas && !reducedMotion()) {
  whenVisible(canvas, async () => {
    const [{ shaderScene }, { RAIN }] = await Promise.all([import('../../lib/gl.ts'), import('./rain.ts')]);
    const scene = shaderScene(canvas, RAIN, 0.6);
    if (!scene) { canvas.hidden = true; return; }
    const density = () => {
      const level = Number(document.querySelector<HTMLInputElement>('input[name="c-density"]:checked')?.id.slice(3) ?? 2);
      scene.set('uDensity', level / 4);
    };
    density();
    document.querySelectorAll('input[name="c-density"]').forEach((i) => i.addEventListener('change', density));
  });
} else if (canvas) canvas.hidden = true;
