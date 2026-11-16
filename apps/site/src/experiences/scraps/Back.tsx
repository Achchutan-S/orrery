// The back of a scrap: a full sheet for writing at length. The table is out of sight; there is a
// page, and beside it whatever is on the same clip (ready to quote), things that might belong
// with it, and earlier drafts. The text is a plain textarea on purpose: typing, selection, undo,
// spellcheck, dictation and input methods are the browser's own, and nothing can lag behind a key.
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import { ago, titleOf, wordCount, type Scrap } from './model.ts';
import { renderWriting } from './render.ts';

export type SaveState = 'saved' | 'saving' | 'failed';

interface Props {
  scrap: Scrap;
  mates: Scrap[];
  kin: Scrap[];
  save: SaveState;
  durable: boolean;
  onChange(patch: Partial<Pick<Scrap, 'text' | 'body'>>): void;
  onBack(): void;
  onClip(id: string): void;
  onSend(): void;
  /** Keep the page as it reads now among the earlier drafts. */
  onKeep(): void;
  onRestore(body: string): void;
}

const grow = (t: HTMLTextAreaElement | null) => {
  if (!t) return;
  t.style.height = 'auto';
  t.style.height = `${t.scrollHeight}px`;
};

/** Inserts text at the caret through the browser's own editing command, so Undo takes it back. */
function insert(t: HTMLTextAreaElement, text: string): void {
  t.focus();
  if (!document.execCommand?.('insertText', false, text)) {
    t.setRangeText(text, t.selectionStart, t.selectionEnd, 'end');
    t.dispatchEvent(new Event('input', { bubbles: true }));
  }
}

/** Puts `prefix` at the start of the line the caret is on, or takes it off if it is already there. */
function toggleLine(t: HTMLTextAreaElement, prefix: string): void {
  const start = t.value.lastIndexOf('\n', t.selectionStart - 1) + 1;
  const had = t.value.startsWith(prefix, start);
  const caret = t.selectionStart;
  t.setSelectionRange(start, had ? start + prefix.length : start);
  insert(t, had ? '' : prefix);
  const moved = Math.max(start, caret + (had ? -prefix.length : prefix.length));
  t.setSelectionRange(moved, moved);
}

/** Wraps the selection in `**`, or takes the marks off when they are already round it. */
function toggleStrong(t: HTMLTextAreaElement): void {
  const { selectionStart: a, selectionEnd: b, value } = t;
  if (value.slice(a - 2, a) === '**' && value.slice(b, b + 2) === '**') {
    t.setSelectionRange(a - 2, b + 2);
    insert(t, value.slice(a, b));
    t.setSelectionRange(a - 2, b - 2);
    return;
  }
  insert(t, `**${value.slice(a, b)}**`);
  t.setSelectionRange(a + 2, b + 2);
}

export function Back({ scrap, mates, kin, save, durable, onChange, onBack, onClip, onSend, onKeep, onRestore }: Props) {
  const title = useRef<HTMLTextAreaElement>(null);
  const body = useRef<HTMLTextAreaElement>(null);
  const reading = useRef<HTMLDivElement>(null);
  const [read, setRead] = useState(false);
  // Absorbed: once typing starts, everything but the page gets out of the way. Moving the
  // pointer, leaving the page with Tab, or pressing a button brings it all back.
  const [absorbed, setAbsorbed] = useState(false);
  const now = Date.now();
  const keep = useRef(onKeep);
  keep.current = onKeep;
  // A long sitting leaves a trail: the page as it read every few minutes, among the earlier drafts.
  useEffect(() => { const t = setInterval(() => keep.current(), 240_000); return () => clearInterval(t); }, []);
  const print = () => { flushSync(() => { setRead(true); setAbsorbed(false); }); requestAnimationFrame(() => window.print()); };

  useLayoutEffect(() => { grow(title.current); grow(body.current); });
  useEffect(() => {
    const t = body.current;
    t?.focus({ preventScroll: true });
    t?.setSelectionRange(t.value.length, t.value.length);
  }, [scrap.id]);
  useEffect(() => { if (read && reading.current) renderWriting(reading.current, scrap.body); }, [read, scrap.body]);
  useEffect(() => {
    const resize = () => { grow(title.current); grow(body.current); };
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, []);

  const words = wordCount(scrap.body);
  const quote = (m: Scrap) => {
    const t = body.current;
    if (!t) return;
    const lead = t.value && !t.value.endsWith('\n\n') ? (t.value.endsWith('\n') ? '\n' : '\n\n') : '';
    t.setSelectionRange(t.value.length, t.value.length);
    insert(t, `${lead}> ${titleOf(m, 400)}\n\n`);
  };
  const drafts = (scrap.drafts ?? []).filter((d) => d.body !== scrap.body).slice().reverse();

  return (
    <div
      className={`k-back${absorbed ? ' is-absorbed' : ''}`}
      onPointerMove={(e) => { if (absorbed && e.pointerType !== 'touch' && Math.hypot(e.movementX, e.movementY) > 2) setAbsorbed(false); }}
      onPointerDown={(e) => { if (absorbed && !(e.target as HTMLElement).closest('.k-page')) setAbsorbed(false); }}
      onKeyDown={(e) => {
        if (e.key === 'Tab' && absorbed) flushSync(() => setAbsorbed(false));
        if (e.key === 'Escape' && !e.defaultPrevented) { e.preventDefault(); onBack(); }
      }}
    >
      <div className="k-back-bar">
        <button type="button" className="k-tab" onClick={onBack}>Back to the table</button>
        <p className="k-hand k-save" role="status">
          {!durable ? 'not saved: this browser said no to storage' : save === 'failed' ? 'not saved! copy your words before you go' : save === 'saving' ? 'saving' : 'saved'}
          {words > 0 && <span>, {words} {words === 1 ? 'word' : 'words'}</span>}
        </p>
        <div className="k-back-tools">
          {!read && (
            <>
              <button type="button" className="k-tab" onClick={() => body.current && toggleLine(body.current, '# ')}>Heading</button>
              <button type="button" className="k-tab" onClick={() => body.current && toggleLine(body.current, '> ')}>Quote</button>
              <button type="button" className="k-tab" onClick={() => body.current && toggleLine(body.current, '- ')}>List</button>
              <button type="button" className="k-tab" onClick={() => body.current && toggleStrong(body.current)}>Bold</button>
            </>
          )}
          <button type="button" className="k-tab" aria-pressed={read} onClick={() => setRead((r) => !r)}>Read it back</button>
          <button type="button" className="k-tab" onClick={print}>Print</button>
          <button type="button" className="k-tab" onClick={onSend}>Send</button>
        </div>
      </div>

      <div className="k-back-scroll">
        <div className="k-sheet">
          <div className="k-page">
            <textarea
              ref={title}
              className="k-title"
              rows={1}
              aria-label="The words on the front"
              placeholder="No title needed"
              value={scrap.text}
              onChange={(e) => onChange({ text: e.target.value.replace(/\n/g, ' ') })}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); body.current?.focus(); } }}
            />
            {scrap.prompt && <p className="k-hand k-page-prompt">{scrap.prompt}</p>}
            {read ? (
              <div ref={reading} className="k-reading" />
            ) : (
              <textarea
                ref={body}
                className="k-body"
                aria-label="The back"
                placeholder="Go on. Nobody is reading over your shoulder."
                value={scrap.body}
                onChange={(e) => {
                  onChange({ body: e.target.value });
                  setAbsorbed(true);
                  // Writing at the end of a long page: keep the last line well clear of the bottom edge
                  // (the page has room below it for exactly this), instead of typing along the edge of the window.
                  const t = e.currentTarget;
                  if (t.selectionEnd < t.value.length - 1) return;
                  requestAnimationFrame(() => {
                    const scroller = t.closest<HTMLElement>('.k-back-scroll');
                    if (!scroller) return;
                    const low = t.getBoundingClientRect().bottom - scroller.getBoundingClientRect().top - scroller.clientHeight * 0.62;
                    if (low > 0) scroller.scrollTop += low;
                  });
                }}
                onKeyDown={(e) => { if ((e.ctrlKey || e.metaKey) && !e.altKey && e.key.toLowerCase() === 'b') { e.preventDefault(); toggleStrong(e.currentTarget); } }}
                onBlur={() => setAbsorbed(false)}
              />
            )}
            {read && !scrap.body.trim() && <p className="k-hand">Nothing on the back yet.</p>}
          </div>

          <aside className="k-margin" aria-label="Beside the page">
            {mates.length > 0 && (
              <section>
                <h2 className="k-hand">On the same clip</h2>
                <ul>
                  {mates.map((m) => (
                    <li key={m.id}>
                      <p>{titleOf(m, 160)}</p>
                      <button type="button" className="k-tab" onClick={() => { setRead(false); requestAnimationFrame(() => quote(m)); }}>Quote it<span className="k-vh">: {titleOf(m, 40)}</span></button>
                    </li>
                  ))}
                </ul>
              </section>
            )}
            {kin.length > 0 && (
              <section>
                <h2 className="k-hand">These might belong with it</h2>
                <ul>
                  {kin.map((m) => (
                    <li key={m.id}>
                      <p>{titleOf(m, 160)} <span className="k-hand">({ago(m.createdAt, now)})</span></p>
                      <button type="button" className="k-tab" onClick={() => onClip(m.id)}>Clip it on<span className="k-vh">: {titleOf(m, 40)}</span></button>
                    </li>
                  ))}
                </ul>
              </section>
            )}
            {drafts.length > 0 && (
              <section>
                <h2 className="k-hand">How it read before</h2>
                <ul>
                  {drafts.map((d) => (
                    <li key={d.at}>
                      <p>{new Date(d.at).toLocaleString(undefined, { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })}, {wordCount(d.body)} words</p>
                      <button type="button" className="k-tab" onClick={() => onRestore(d.body)}>Bring it back<span className="k-vh"> as it was then</span></button>
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </aside>
        </div>
      </div>
    </div>
  );
}
