// The letter page's script: reads the piece out of the address and puts it on the page.
// The fragment is input from a stranger: decodeLetter() accepts only the expected shape, and
// render.ts writes it with textContent, so a crafted link can show odd text and nothing else.
import { decodeLetter, titleOf } from './model.ts';
import { renderWriting } from './render.ts';

export async function openLetter(): Promise<void> {
  const title = document.querySelector<HTMLElement>('[data-letter-title]');
  const date = document.querySelector<HTMLElement>('[data-letter-date]');
  const body = document.querySelector<HTMLElement>('[data-letter-body]');
  if (!title || !date || !body || location.hash.length < 4) return;
  const letter = await decodeLetter(location.hash);
  if (!letter) return;
  const name = titleOf({ text: letter.t, body: letter.b, strokes: letter.s }, 120);
  title.textContent = name;
  document.title = `${name} · a letter from Soundings`;
  date.textContent = `Released ${new Date(letter.d).toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' })}`;
  // A piece with a long first thought and no writing: the thought is the letter.
  renderWriting(body, letter.b.trim() || (letter.t.length > 120 ? letter.t : ''), letter.s);
}

// A different letter in the same tab: start from the page as it was served.
window.addEventListener('hashchange', () => location.reload());
