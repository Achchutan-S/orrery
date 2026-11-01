// The Beacon's palette: navigation only, over destinations already in the page's HTML.
// No framework, no data fetch; it filters and moves a selection over <a role="option">.

/** Every word of the query must appear in the destination's terms (title, id, kind, section, tags). */
export const matches = (terms: string, query: string): boolean =>
  query.trim().toLowerCase().split(/\s+/).every((w) => terms.includes(w));

/** The next selection, wrapping; -1 when nothing is visible. */
export const step = (current: number, count: number, by: 1 | -1): number =>
  count === 0 ? -1 : current < 0 ? (by === 1 ? 0 : count - 1) : (current + by + count) % count;

/** ⌘K or Ctrl+K, alone: never with Alt or Shift (often taken by assistive technology). */
export const isShortcut = (e: Pick<KeyboardEvent, 'key' | 'metaKey' | 'ctrlKey' | 'altKey' | 'shiftKey'>): boolean =>
  e.key.toLowerCase() === 'k' && e.metaKey !== e.ctrlKey && !e.altKey && !e.shiftKey;

/** Typing somewhere else keeps the shortcut: inputs, text areas, selects and editable regions. */
export const isEditable = (el: EventTarget | null): boolean => {
  const e = el as Partial<HTMLElement> | null;
  return Boolean(e?.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(e?.tagName ?? ''));
};

export const isApple = (nav: Pick<Navigator, 'userAgent'>): boolean => /Mac|iPhone|iPad|iPod/.test(nav.userAgent);

export function mountBeacon(doc: Document, nav: Pick<Navigator, 'userAgent'>): void {
  const beacon = doc.querySelector<HTMLElement>('.pu-beacon');
  const trigger = beacon?.querySelector<HTMLButtonElement>('.pu-beacon-open');
  const template = beacon?.querySelector<HTMLTemplateElement>('.pu-palette-template');
  if (!beacon || !trigger || !template) return;
  if (isApple(nav)) trigger.querySelector('.pu-beacon-key')!.textContent = '⌘K';
  trigger.hidden = false;

  let dialog: HTMLDialogElement | null = null;
  let input: HTMLInputElement;
  let options: HTMLAnchorElement[] = [];
  let visible: HTMLAnchorElement[] = [];
  let active = -1;
  let empty: HTMLElement;
  let status: HTMLElement;

  const select = (i: number) => {
    options.forEach((o) => o.setAttribute('aria-selected', 'false'));
    active = i;
    const o = visible[i];
    if (o) {
      o.setAttribute('aria-selected', 'true');
      input.setAttribute('aria-activedescendant', o.id);
      o.scrollIntoView({ block: 'nearest' });
    } else input.removeAttribute('aria-activedescendant');
  };

  const filter = () => {
    visible = options.filter((o) => {
      const show = matches(o.dataset.terms ?? '', input.value);
      o.parentElement!.hidden = !show;
      return show;
    });
    empty.hidden = visible.length > 0;
    status.textContent = visible.length === 0 ? 'No destination matches.' : `${visible.length} ${visible.length === 1 ? 'destination' : 'destinations'}.`;
    select(visible.length > 0 ? 0 : -1);
  };

  const build = (): HTMLDialogElement => {
    const d = template.content.firstElementChild!.cloneNode(true) as HTMLDialogElement;
    doc.body.append(d);
    input = d.querySelector('input')!;
    options = [...d.querySelectorAll<HTMLAnchorElement>('[role="option"]')];
    empty = d.querySelector('.pu-palette-empty')!;
    status = d.querySelector('[data-pu-palette-status]')!;
    input.addEventListener('input', filter);
    input.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        select(step(active, visible.length, e.key === 'ArrowDown' ? 1 : -1));
      } else if (e.key === 'Enter' && visible[active]) {
        e.preventDefault();
        visible[active]!.click(); // a real link: the browser navigates, history works
      }
    });
    options.forEach((o) => o.addEventListener('mousemove', () => { const i = visible.indexOf(o); if (i !== active) select(i); }));
    // A click on the backdrop (the dialog box itself, outside its content) closes it.
    d.addEventListener('click', (e) => { if (e.target === d) close(); });
    d.addEventListener('close', () => trigger.focus());
    return d;
  };

  const open = () => {
    dialog ??= build();
    input.value = '';
    filter();
    dialog.showModal();
    input.focus();
  };

  const close = () => {
    dialog?.close();
    trigger.focus();
  };

  trigger.addEventListener('click', open);
  // Back to a page kept in the back/forward cache: do not come back to an open palette.
  addEventListener('pageshow', (e) => { if (e.persisted && dialog?.open) dialog.close(); });
  doc.addEventListener('keydown', (e) => {
    if (!isShortcut(e)) return;
    if (dialog?.open) {
      e.preventDefault();
      close();
    } else if (!isEditable(e.target)) {
      e.preventDefault();
      open();
    }
  });
}
