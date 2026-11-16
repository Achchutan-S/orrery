// Ashore: the writing surface. The chart is gone; there is a title, a page, and in the margin the
// marks within reach (linked), the echoes (older marks that share words) and earlier drafts.
// The text is a plain textarea on purpose: typing, selection, undo, spellcheck, dictation and
// input methods are the browser's own, and nothing between a keystroke and the page can lag.
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { ago, titleOf, wordCount, type Mark } from './model.ts';
import { renderWriting } from './render.ts';

export type SaveState = 'saved' | 'saving' | 'failed';

interface Props {
  mark: Mark;
  reach: Mark[];
  echoes: Mark[];
  save: SaveState;
  durable: boolean;
  onChange(patch: Partial<Pick<Mark, 'text' | 'body'>>): void;
  onBack(): void;
  onOpen(id: string): void;
  onConnect(id: string): void;
  onDraw(): void;
  onRelease(): void;
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

export function Ashore({ mark, reach, echoes, save, durable, onChange, onBack, onOpen, onConnect, onDraw, onRelease, onRestore }: Props) {
  const title = useRef<HTMLTextAreaElement>(null);
  const body = useRef<HTMLTextAreaElement>(null);
  const reading = useRef<HTMLDivElement>(null);
  const [read, setRead] = useState(false);
  const now = Date.now();

  useLayoutEffect(() => { grow(title.current); grow(body.current); });
  useEffect(() => {
    // Start where writing happens: at the end of the page, or in the title when there is none yet.
    const t = mark.text.trim() ? body.current : title.current;
    t?.focus({ preventScroll: true });
    t?.setSelectionRange(t.value.length, t.value.length);
  }, [mark.id]);
  useEffect(() => { if (read && reading.current) renderWriting(reading.current, mark.body, mark.strokes); }, [read, mark.body, mark.strokes]);
  useEffect(() => {
    const resize = () => { grow(title.current); grow(body.current); };
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, []);

  const words = wordCount(mark.body);
  const quote = (m: Mark) => {
    const t = body.current;
    if (!t) return;
    setRead(false);
    const lead = t.value && !t.value.endsWith('\n\n') ? (t.value.endsWith('\n') ? '\n' : '\n\n') : '';
    t.setSelectionRange(t.value.length, t.value.length);
    insert(t, `${lead}> ${titleOf(m, 400)}\n\n`);
  };
  const drafts = (mark.drafts ?? []).filter((d) => d.body !== mark.body).slice().reverse();

  return (
    <div className="s-ashore" onKeyDown={(e) => { if (e.key === 'Escape' && !e.defaultPrevented) { e.preventDefault(); onBack(); } }}>
      <div className="s-ashore-bar">
        <button type="button" className="s-text-button" onClick={onBack}>Back to the chart</button>
        <p className="s-save" role="status">
          {!durable ? 'Not saved: this browser refused storage' : save === 'failed' ? 'Not saved: storage failed. Copy your text before leaving' : save === 'saving' ? 'Saving' : 'Saved in this browser'}
          {words > 0 && <span> · {words} {words === 1 ? 'word' : 'words'}</span>}
        </p>
        <div className="s-ashore-tools">
          {!read && (
            <>
              <button type="button" className="s-text-button" onClick={() => body.current && toggleLine(body.current, '# ')}>Heading</button>
              <button type="button" className="s-text-button" onClick={() => body.current && toggleLine(body.current, '> ')}>Quotation</button>
              <button type="button" className="s-text-button" onClick={() => body.current && toggleLine(body.current, '- ')}>List</button>
            </>
          )}
          <button type="button" className="s-text-button" onClick={onDraw}>{mark.strokes?.length ? 'Edit drawing' : 'Draw'}</button>
          <button type="button" className="s-text-button" aria-pressed={read} onClick={() => setRead((r) => !r)}>Read</button>
          <button type="button" className="s-text-button" onClick={onRelease}>Release</button>
        </div>
      </div>

      <div className="s-ashore-scroll">
        <div className="s-sheet">
          <div className="s-page">
            <textarea
              ref={title}
              className="s-title"
              rows={1}
              aria-label="Title, or the thought itself"
              placeholder="Untitled"
              value={mark.text}
              onChange={(e) => onChange({ text: e.target.value.replace(/\n/g, ' ') })}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); body.current?.focus(); } }}
            />
            {read ? (
              <div ref={reading} className="s-reading" />
            ) : (
              <textarea
                ref={body}
                className="s-body"
                aria-label="Writing"
                placeholder="Keep going. Nothing here has to be finished."
                value={mark.body}
                onChange={(e) => onChange({ body: e.target.value })}
              />
            )}
            {read && !mark.body.trim() && !mark.strokes?.length && <p className="s-quiet">Nothing written here yet.</p>}
          </div>

          <aside className="s-margin" aria-label="Around this piece">
            {reach.length > 0 && (
              <section>
                <h2>Within reach</h2>
                <ul>
                  {reach.map((m) => (
                    <li key={m.id}>
                      <p>{titleOf(m, 160)}</p>
                      <button type="button" className="s-text-button" onClick={() => quote(m)}>Quote<span className="s-vh"> “{titleOf(m, 40)}”</span></button>
                      <button type="button" className="s-text-button" onClick={() => onOpen(m.id)}>Open<span className="s-vh"> “{titleOf(m, 40)}”</span></button>
                    </li>
                  ))}
                </ul>
              </section>
            )}
            {echoes.length > 0 && (
              <section>
                <h2>Echoes</h2>
                <ul>
                  {echoes.map((m) => (
                    <li key={m.id}>
                      <p>{titleOf(m, 160)} <span className="s-quiet">({ago(m.createdAt, now)})</span></p>
                      <button type="button" className="s-text-button" onClick={() => onConnect(m.id)}>Connect<span className="s-vh"> “{titleOf(m, 40)}”</span></button>
                      <button type="button" className="s-text-button" onClick={() => onOpen(m.id)}>Open<span className="s-vh"> “{titleOf(m, 40)}”</span></button>
                    </li>
                  ))}
                </ul>
              </section>
            )}
            {drafts.length > 0 && (
              <section>
                <h2>Earlier drafts</h2>
                <ul>
                  {drafts.map((d) => (
                    <li key={d.at}>
                      <p>{new Date(d.at).toLocaleString(undefined, { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })}, {wordCount(d.body)} words</p>
                      <button type="button" className="s-text-button" onClick={() => onRestore(d.body)}>Bring back<span className="s-vh"> this draft</span></button>
                    </li>
                  ))}
                </ul>
              </section>
            )}
            {reach.length + echoes.length + drafts.length === 0 && (
              <p className="s-quiet">Marks you connect to this one wait here, ready to quote.</p>
            )}
          </aside>
        </div>
      </div>
    </div>
  );
}
