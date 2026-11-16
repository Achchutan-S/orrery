// The note beside a selected mark (a docked slip on wide screens, a bottom sheet on phones), and
// the release dialog. Both edit one mark; neither knows about storage.
import { useEffect, useRef, useState } from 'react';
import { ago, encodeLetter, isWritten, letterOf, titleOf, urlIn, wordCount, type Kind, type Link, type Mark } from './model.ts';
import { Thumb } from './parts.tsx';

const KINDS: [Kind, string][] = [['thought', 'Thought'], ['question', 'Question'], ['source', 'Source']];

interface PanelProps {
  mark: Mark;
  routes: { link: Link; mark: Mark }[];
  others: Mark[];
  connecting: boolean;
  focusOnOpen: boolean;
  onText(text: string): void;
  onKind(kind: Kind): void;
  onWrite(): void;
  onDraw(): void;
  onConnect(on: boolean): void;
  onConnectTo(id: string): void;
  onDisconnect(linkId: string): void;
  onGo(id: string): void;
  onRelease(): void;
  onRemove(): void;
  onClose(): void;
}

export function Panel({ mark, routes, others, connecting, focusOnOpen, onText, onKind, onWrite, onDraw, onConnect, onConnectTo, onDisconnect, onGo, onRelease, onRemove, onClose }: PanelProps) {
  const root = useRef<HTMLElement>(null);
  const text = useRef<HTMLTextAreaElement>(null);
  const [query, setQuery] = useState('');
  const url = urlIn(mark.text);
  const words = wordCount(mark.body);

  useEffect(() => { if (focusOnOpen) root.current?.focus(); }, [mark.id, focusOnOpen]);
  useEffect(() => {
    const t = text.current;
    if (t) { t.style.height = 'auto'; t.style.height = `${t.scrollHeight}px`; }
  }, [mark.text, mark.id]);
  useEffect(() => { if (!connecting) setQuery(''); }, [connecting]);

  const q = query.trim().toLowerCase();
  const linked = new Set(routes.map((r) => r.mark.id));
  const candidates = others.filter((m) => !linked.has(m.id) && (!q || `${m.text} ${m.body}`.toLowerCase().includes(q))).slice(0, 8);

  return (
    <aside ref={root} className="s-panel" aria-label={`Selected: ${titleOf(mark, 60)}`} tabIndex={-1}>
      <div className="s-panel-head">
        <div className="s-kinds" role="group" aria-label="What kind of mark this is">
          {KINDS.map(([k, name]) => (
            <button key={k} type="button" className="s-text-button" aria-pressed={mark.kind === k} onClick={() => onKind(k)}>{name}</button>
          ))}
        </div>
        <button type="button" className="s-text-button" onClick={onClose}>Close</button>
      </div>

      <textarea
        ref={text}
        className="s-panel-text"
        rows={1}
        aria-label="The words of this mark"
        placeholder="Say what this is, or leave it unsaid"
        value={mark.text}
        onChange={(e) => onText(e.target.value)}
      />
      {url && <p><a href={url} rel="noopener noreferrer">Open the address</a></p>}
      {mark.strokes?.length ? <Thumb strokes={mark.strokes} /> : null}
      <p className="s-quiet">
        Surfaced {ago(mark.createdAt, Date.now())}
        {words > 0 && `, ${words} ${words === 1 ? 'word' : 'words'} written`}
        {mark.releasedAt ? ', released' : ''}
      </p>

      <div className="s-panel-do">
        <button type="button" className="s-button" onClick={onWrite}>{isWritten(mark) ? 'Continue writing' : 'Write at length'}</button>
        <button type="button" className="s-text-button" onClick={onDraw}>{mark.strokes?.length ? 'Edit drawing' : 'Draw'}</button>
        <button type="button" className="s-text-button" aria-expanded={connecting} onClick={() => onConnect(!connecting)}>Connect</button>
        <button type="button" className="s-text-button" onClick={onRelease}>Release</button>
        <button type="button" className="s-text-button" onClick={onRemove}>Remove</button>
      </div>

      {connecting && (
        <div className="s-connect">
          <label htmlFor="s-connect-find">Connect to</label>
          <input id="s-connect-find" type="search" autoComplete="off" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Find a mark, or choose one on the chart" />
          {candidates.length > 0 ? (
            <ul>
              {candidates.map((m) => (
                <li key={m.id}><button type="button" className="s-text-button" onClick={() => onConnectTo(m.id)}>{titleOf(m, 70)}</button></li>
              ))}
            </ul>
          ) : (
            <p className="s-quiet">{others.length ? 'No other mark matches.' : 'There is no other mark to connect to yet.'}</p>
          )}
        </div>
      )}

      {routes.length > 0 && (
        <section className="s-routes">
          <h2>Routes from here</h2>
          <ul>
            {routes.map(({ link, mark: m }) => (
              <li key={link.id}>
                <button type="button" className="s-text-button s-route-go" onClick={() => onGo(m.id)}>{titleOf(m, 70)}</button>
                <button type="button" className="s-text-button" onClick={() => onDisconnect(link.id)}>Disconnect<span className="s-vh"> from “{titleOf(m, 40)}”</span></button>
              </li>
            ))}
          </ul>
        </section>
      )}
    </aside>
  );
}

interface ReleaseProps {
  mark: Mark;
  /** The address of the letter page, without a fragment. */
  page: string;
  onReleased(): void;
  onPrivate(): void;
  onClose(): void;
}

/** Releasing makes a link that carries the piece inside it. Nothing is uploaded, and the dialog says so. */
export function Release({ mark, page, onReleased, onPrivate, onClose }: ReleaseProps) {
  const dialog = useRef<HTMLDialogElement>(null);
  const field = useRef<HTMLTextAreaElement>(null);
  const [link, setLink] = useState('');
  const [copied, setCopied] = useState(false);
  const released = Boolean(mark.releasedAt);

  useEffect(() => { if (!dialog.current!.open) dialog.current!.showModal(); }, []);
  useEffect(() => {
    if (!released) { setLink(''); return; }
    let live = true;
    void encodeLetter(letterOf(mark, mark.releasedAt ?? Date.now())).then((f) => { if (live) setLink(`${page}#${f}`); });
    return () => { live = false; };
  }, [released, mark.text, mark.body, mark.strokes, mark.releasedAt, page]);

  const copy = async () => {
    try { await navigator.clipboard.writeText(link); } catch { field.current?.select(); document.execCommand?.('copy'); }
    setCopied(true);
  };
  const empty = !mark.text.trim() && !mark.body.trim() && !mark.strokes?.length;

  return (
    <dialog ref={dialog} className="s-release" aria-labelledby="s-release-h" onClose={onClose}>
      <h2 id="s-release-h">{released ? 'Released as a letter' : 'Release as a letter'}</h2>
      {!released ? (
        <>
          <p>Releasing makes a link that carries this one piece inside it: its words, its writing and its drawing. Anyone you give the link to can read it.</p>
          <p>Nothing is uploaded. The rest of your chart stays in this browser, and this piece stays yours to change.</p>
          {empty && <p role="alert">There is nothing in this mark to release yet.</p>}
          <p className="s-dialog-do">
            <button type="button" className="s-button" disabled={empty} onClick={onReleased}>Make the link</button>
            <button type="button" className="s-text-button" onClick={() => dialog.current?.close()}>Keep it private</button>
          </p>
        </>
      ) : (
        <>
          <label htmlFor="s-release-link">The link to “{titleOf(mark, 60)}”</label>
          <textarea id="s-release-link" ref={field} readOnly rows={3} value={link} onFocus={(e) => e.currentTarget.select()} />
          <p className="s-quiet" role="status">
            {copied ? 'Copied. ' : ''}
            {link.length > 6000 ? `This link is ${link.length.toLocaleString()} characters long. Some messaging apps cut long links short, so try it before you rely on it.` : 'The link always carries the piece as it is now. A link you already gave out keeps the version it was made with.'}
          </p>
          <p className="s-dialog-do">
            <button type="button" className="s-button" disabled={!link} onClick={() => void copy()}>Copy the link</button>
            {link && <a href={link} target="_blank" rel="noopener">Open the letter</a>}
            <button type="button" className="s-text-button" onClick={onPrivate}>Mark as private again</button>
            <button type="button" className="s-text-button" onClick={() => dialog.current?.close()}>Done</button>
          </p>
          <p className="s-quiet">Marking it private removes the flag here. It cannot recall a link someone already has.</p>
        </>
      )}
    </dialog>
  );
}
