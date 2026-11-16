// The letter page's script: reads the scraps out of the address and puts them on the page.
// The fragment is input from a stranger: decodeLetter() accepts only the expected shape, and
// render.ts writes it with textContent, so a crafted link can show odd text and nothing else.
import { decodeLetter, titleOf } from './model.ts';
import { renderFace, renderWriting } from './render.ts';

/** Where the table looks for a letter the visitor chose to keep (the same key as Studio.tsx's ARRIVED). */
const ARRIVED = 'scraps:arrived';
const day = (t: number) => new Date(t).toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' });
const el = <K extends keyof HTMLElementTagNameMap>(tag: K, cls: string, text?: string): HTMLElementTagNameMap[K] => {
  const e = document.createElement(tag);
  e.className = cls;
  if (text !== undefined) e.textContent = text;
  return e;
};

export async function openLetter(): Promise<void> {
  const q = <T extends HTMLElement>(name: string) => document.querySelector<T>(`[data-letter-${name}]`);
  const title = q('title');
  const note = q('note');
  const leaves = q('leaves');
  const foot = q('doing');
  if (!title || !note || !leaves || !foot || location.hash.length < 4) return;
  const letter = await decodeLetter(location.hash);
  if (!letter) return;
  const first = letter.items[0]!;
  const name = titleOf({ text: first.t, body: first.b, strokes: first.s }, 120);
  const zine = letter.items.length > 1;
  const who = letter.from ?? 'Someone';
  document.title = `${letter.to ? `For ${letter.to}: ` : ''}${name} · ${zine ? 'a little zine' : 'a scrap'} ${letter.from ? `from ${letter.from}` : 'someone sent you'}`;

  if (letter.open && letter.open > Date.now()) {
    // Asked to stay folded. The page keeps the courtesy; it does not pretend to be a lock.
    title.textContent = letter.to ? `For ${letter.to}` : 'Something for you';
    note.textContent = `${who} folded this on ${day(letter.d)} and asked that it stay folded until ${day(letter.open)}. Come back then: the same link will open it.`;
    document.documentElement.dataset.kLetter = 'folded';
    return;
  }

  // The scraps themselves are the picture; the heading names the letter for the tab, the outline and screen readers.
  title.textContent = letter.to ? `For ${letter.to}` : name;
  if (!letter.to) title.classList.add('k-vh');
  note.textContent = `${who} made ${zine ? `these ${letter.items.length}` : 'this'} on ${day(letter.d)} and wanted you to have ${zine ? 'them' : 'it'}.`;
  leaves.replaceChildren();
  if (letter.name) leaves.append(el('p', 'k-zine-name', letter.name));
  for (const [i, l] of letter.items.entries()) {
    const leaf = el('section', 'k-leaf');
    leaf.setAttribute('aria-label', zine ? `Page ${i + 1} of ${letter.items.length}` : 'The scrap');
    if (l.t.trim() || l.s?.length) {
      const holder = el('div', 'k-letter-scrap');
      const face = el('div', '');
      renderFace(face, { text: l.t, body: l.b, look: l.k, prompt: l.p, strokes: l.s });
      holder.append(face);
      leaf.append(holder);
    }
    if (l.b.trim()) { const body = el('div', 'k-reading'); renderWriting(body, l.b); leaf.append(body); }
    // Several scraps that belong together: each says where it comes in the whole.
    if (zine) leaf.append(el('p', 'k-hand k-leaf-n', `${i + 1} of ${letter.items.length}`));
    leaves.append(leaf);
  }
  if (letter.from) leaves.append(el('p', 'k-hand k-letter-sign', `from ${letter.from}`));
  document.documentElement.dataset.kLetter = zine ? 'zine' : 'note';

  // Something addressed to you is opened by you: it waits in its envelope for one press.
  const seal = q<HTMLButtonElement>('open');
  const show = () => { title.classList.toggle('k-vh', !letter.to); leaves.hidden = false; foot.hidden = false; note.hidden = false; if (seal) seal.hidden = true; };
  if (letter.to && seal) {
    leaves.hidden = true;
    note.hidden = true;
    title.classList.add('k-vh'); // the envelope says who it is for; the heading says it again once it is open
    seal.hidden = false;
    seal.querySelector('[data-letter-for]')!.textContent = `For ${letter.to}`;
    seal.querySelector('[data-letter-by]')!.textContent = letter.from ? `from ${letter.from}` : '';
    title.tabIndex = -1;
    seal.addEventListener('click', () => { show(); title.focus(); }, { once: true });
  } else show();

  // Keeping it, and writing back: the link goes to the visitor's own table, in their own browser.
  q<HTMLButtonElement>('keep')?.addEventListener('click', () => {
    try { localStorage.setItem(ARRIVED, location.hash); location.href = '/scraps'; } catch { note.textContent = 'This browser said no to storage, so it could not be kept. The link itself still works.'; }
  });
  q<HTMLButtonElement>('print')?.addEventListener('click', () => window.print());
}

// A different letter in the same tab: start from the page as it was served.
window.addEventListener('hashchange', () => location.reload());
