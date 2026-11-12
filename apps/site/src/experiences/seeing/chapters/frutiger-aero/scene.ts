// Bubbles and water. Bubbles are buttons: popping one reveals its word in the vocabulary tray
// (a polite live region) and moves focus to the next bubble, or to the tray when none are left.
// Water caustics start only when visible, supported and motion is allowed (lib/gl.ts).
import { reducedMotion, whenVisible } from '../../house/lazy.ts';

const bubbles = [...document.querySelectorAll<HTMLButtonElement>('.f-bubble')];
const words = [...document.querySelectorAll<HTMLElement>('.f-word')];
const hint = document.querySelector<HTMLElement>('[data-tray-hint]');
const trayTitle = document.querySelector<HTMLElement>('#f-tray-title');

for (const w of words) w.hidden = true;
for (const b of bubbles) b.hidden = false;
if (hint) hint.hidden = false;

const pop = (b: HTMLButtonElement) => {
  const word = words.find((w) => w.dataset.for === b.dataset.word);
  if (word) word.hidden = false;
  if (hint) hint.hidden = words.some((w) => !w.hidden);
  const next = bubbles.find((x) => !x.hidden && x !== b && !x.classList.contains('is-popping'));
  const finish = () => { b.hidden = true; };
  b.classList.add('is-popping');
  b.disabled = true;
  if (reducedMotion()) finish(); else setTimeout(finish, 380);
  if (next) next.focus();
  else if (trayTitle) { trayTitle.tabIndex = -1; trayTitle.focus(); }
};
for (const b of bubbles) b.addEventListener('click', () => pop(b));

const canvas = document.querySelector<HTMLCanvasElement>('[data-water]');
if (canvas && !reducedMotion()) {
  whenVisible(canvas, async () => {
    const [{ shaderScene }, { WATER }] = await Promise.all([import('../../lib/gl.ts'), import('./water.ts')]);
    if (!shaderScene(canvas, WATER, 0.5)) canvas.hidden = true;
  });
} else if (canvas) canvas.hidden = true;
