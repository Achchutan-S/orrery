// The archive's only script (browser code: imports nothing but search.ts). Everything it adds is an
// enhancement: without it every volume, file and download link is still on the page, and the
// controls that need it (copy, search, lanterns) stay hidden.
import { matches } from './search.ts';

const $$ = <T extends Element>(sel: string, root: ParentNode = document) => [...root.querySelectorAll<T>(sel)];
for (const el of $$<HTMLElement>('[data-copy][hidden], [data-needs-js][hidden], [data-finder][hidden], [data-lanterns][hidden]')) el.hidden = false;

// --- Announcements -------------------------------------------------------------------------
const toast = document.querySelector<HTMLElement>('[data-toast]');
let toastTimer: number | undefined;
function announce(message: string, tone: 'ok' | 'error' = 'ok') {
  if (!toast) return;
  toast.textContent = message;
  toast.dataset.tone = tone;
  toast.classList.add('is-shown');
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => toast.classList.remove('is-shown'), 5000);
}

// --- Copy: the exact text of an element, or a character range of it ----------------------------
document.addEventListener('click', async (event) => {
  const button = (event.target as Element).closest<HTMLButtonElement>('button[data-copy]');
  if (!button) return;
  const target = document.getElementById(button.dataset.copy!);
  if (!target) return;
  const full = target.textContent ?? '';
  const [a, b] = (button.dataset.range ?? '').split(':').map(Number);
  const text = button.dataset.range ? full.slice(a, b) : full;
  const label = button.dataset.label ?? 'text';
  try {
    await navigator.clipboard.writeText(text);
    const lines = text.split('\n').length - (text.endsWith('\n') ? 1 : 0);
    announce(`Copied ${label}: ${lines} line${lines === 1 ? '' : 's'}, exactly as written.`);
  } catch {
    // No clipboard access (permissions, an old browser): select the text so it can be copied by hand.
    const selection = window.getSelection();
    if (selection && !button.dataset.range) {
      const range = document.createRange();
      range.selectNodeContents(target);
      selection.removeAllRanges();
      selection.addRange(range);
    }
    announce(`Could not reach the clipboard. ${button.dataset.range ? 'Use Copy on the whole file instead.' : 'The text is selected: press Ctrl+C or ⌘C.'}`, 'error');
  }
});

// --- Search the stacks ------------------------------------------------------------------------------
const finder = document.querySelector<HTMLFormElement>('[data-finder]');
const input = finder?.querySelector<HTMLInputElement>('input[type="search"]');
const count = document.querySelector<HTMLElement>('[data-finder-count]');
const empty = document.querySelector<HTMLElement>('[data-finder-empty]');
const initialCount = count?.textContent ?? '';
function filter(query: string) {
  let shown = 0;
  for (const shelf of $$<HTMLElement>('[data-shelf]')) {
    let onShelf = 0;
    for (const v of $$<HTMLElement>('[data-volume]', shelf)) {
      const hit = matches(v.dataset.search ?? '', query);
      v.hidden = !hit;
      if (hit) onShelf++;
    }
    shelf.hidden = onShelf === 0;
    shown += onShelf;
  }
  if (empty) empty.hidden = shown > 0;
  if (count) count.textContent = query.trim() ? `${shown} ${shown === 1 ? 'volume matches' : 'volumes match'} “${query.trim()}”` : initialCount;
}
if (finder && input) {
  finder.addEventListener('submit', (e) => { e.preventDefault(); filter(input.value); });
  input.addEventListener('input', () => {
    filter(input.value);
    const url = new URL(location.href);
    if (input.value.trim()) url.searchParams.set('q', input.value.trim()); else url.searchParams.delete('q');
    history.replaceState(history.state, '', url);
  });
  const q = new URL(location.href).searchParams.get('q');
  if (q) { input.value = q; filter(q); }
  document.addEventListener('keydown', (e) => {
    const typing = (e.target as Element).closest('input, textarea, select, [contenteditable="true"]');
    if (e.key === '/' && !typing && !e.metaKey && !e.ctrlKey && !e.altKey) { e.preventDefault(); input.focus(); }
  });
}

// --- The lanterns: night and day, remembered per browser --------------------------------------------
const root = document.documentElement;
const night = window.matchMedia('(prefers-color-scheme: dark)');
const stored = (() => { try { return localStorage.getItem('skills-archive-theme'); } catch { return null; } })();
if (stored === 'night' || stored === 'day') root.dataset.theme = stored;
const lantern = document.querySelector<HTMLButtonElement>('[data-lanterns]');
const isNight = () => (root.dataset.theme ? root.dataset.theme === 'night' : night.matches);
function syncLantern() {
  if (!lantern) return;
  lantern.setAttribute('aria-pressed', String(isNight()));
  lantern.textContent = isNight() ? 'Let in the daylight' : 'Light the lanterns';
}
syncLantern();
night.addEventListener('change', syncLantern);
lantern?.addEventListener('click', () => {
  root.dataset.theme = isNight() ? 'day' : 'night';
  try { localStorage.setItem('skills-archive-theme', root.dataset.theme); } catch { /* private mode: not remembered */ }
  syncLantern();
});

// --- A volume at random --------------------------------------------------------------------------
document.querySelector<HTMLAnchorElement>('[data-random]')?.addEventListener('click', (e) => {
  const slugs = JSON.parse((e.currentTarget as HTMLElement).dataset.random ?? '[]') as string[];
  if (slugs.length === 0) return;
  e.preventDefault();
  location.href = `/skills/${slugs[Math.floor(Math.random() * slugs.length)]}`;
});

// --- The room leans a little towards the pointer (never with reduced motion) -------------------------
const scene = document.querySelector<SVGElement>('[data-scene]');
const still = window.matchMedia('(prefers-reduced-motion: reduce)');
if (scene && !still.matches) {
  let frame = 0;
  document.querySelector('[data-entrance]')?.addEventListener('pointermove', (e) => {
    const { clientX, clientY } = e as PointerEvent;
    cancelAnimationFrame(frame);
    frame = requestAnimationFrame(() => {
      scene.style.setProperty('--px', ((clientX / innerWidth) * 2 - 1).toFixed(3));
      scene.style.setProperty('--py', ((clientY / innerHeight) * 2 - 1).toFixed(3));
    });
  });
}
