// A scrap in the hand, a pile spread out, and the dialog that sends one to someone. All three are
// native modal dialogs: the table behind is inert, Escape puts the thing down, and focus goes back
// to where it was picked up from.
import { useEffect, useRef, useState } from 'react';
import { ago, encodeLetter, hasBack, isEmpty, letterOf, linkify, titleOf, wordCount, type Pile, type Scrap } from './model.ts';
import { Face, Marks } from './parts.tsx';

const DAY = 86_400_000;
/** A date field's value (`YYYY-MM-DD`) as the start of that day here, or 0. */
const dayOf = (v: string): number => { const [y, m, d] = v.split('-').map(Number); return y && m && d ? new Date(y, m - 1, d).getTime() : 0; };
const isoDay = (t: number): string => { const d = new Date(t); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };

function useModal(onClose: () => void) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => { if (!ref.current!.open) ref.current!.showModal(); }, []);
  return { ref, onClose, close: () => ref.current?.close() };
}

interface HeldProps {
  scrap: Scrap;
  /** How many others share its clip. */
  mates: number;
  /** Everything else, to choose something to clip it to. */
  others: Scrap[];
  /** Scraps that share words with it: an invitation to look, nothing more. */
  kin: Scrap[];
  onPickOther(id: string): void;
  onCopy(): void;
  onScale(by: number): void;
  onRotate(by: number): void;
  onTape(): void;
  onStar(): void;
  onSeal(until: number): void;
  onPicture(file: File): void;
  onNoPicture(): void;
  onLook(): void;
  onText(text: string): void;
  onTurn(): void;
  onDoodle(): void;
  onClipTo(id: string): void;
  onUnclip(): void;
  onSend(): void;
  onAway(away: boolean): void;
  onBin(): void;
  onClose(): void;
}

export function Held({ scrap, mates, others, kin, onPickOther, onCopy, onScale, onRotate, onTape, onStar, onSeal, onPicture, onNoPicture, onLook, onText, onTurn, onDoodle, onClipTo, onUnclip, onSend, onAway, onBin, onClose }: HeldProps) {
  const modal = useModal(onClose);
  const [mode, setMode] = useState<'none' | 'words' | 'clip' | 'more' | 'seal'>('none');
  const [until, setUntil] = useState('');
  const file = useRef<HTMLInputElement>(null);
  const now = Date.now();
  const links = linkify(`${scrap.text}\n${scrap.body}`).filter((r) => r.href).slice(0, 3);
  const [query, setQuery] = useState('');
  const words = wordCount(scrap.body);
  const q = query.trim().toLowerCase();
  const candidates = others.filter((s) => !(scrap.clip && s.clip === scrap.clip) && (!q || `${s.text} ${s.body}`.toLowerCase().includes(q))).slice(0, 6);
  const facts = [
    `from ${ago(scrap.createdAt, Date.now())}`,
    words ? `${words} ${words === 1 ? 'word' : 'words'} on the back` : '',
    mates ? `clipped with ${mates} more` : '',
    scrap.sentAt ? 'sent to someone' : '',
    scrap.from ? `kept from ${scrap.from}` : '',
  ].filter(Boolean).join(', ');

  return (
    <dialog ref={modal.ref} className="k-held" aria-label={`In your hand: ${titleOf(scrap, 60)}`} onClose={modal.onClose}>
      <div className="k-held-in">
        <div className="k-held-scrap"><Face scrap={scrap} /><Marks scrap={scrap} /></div>
        <p className="k-hand k-held-facts">{facts}</p>

        <div className="k-do">
          <button type="button" className="k-button" onClick={onTurn}>{hasBack(scrap) ? 'Turn it over and keep writing' : 'Turn it over and write more'}</button>
          <button type="button" className="k-button k-button--play" onClick={onLook}>Give it a new look</button>
        </div>
        <div className="k-do k-do--small">
          <button type="button" className="k-tab" aria-expanded={mode === 'words'} onClick={() => setMode(mode === 'words' ? 'none' : 'words')}>Change the words</button>
          <button type="button" className="k-tab" onClick={onDoodle}>{scrap.strokes?.length ? 'Change the doodle' : 'Doodle on it'}</button>
          <button type="button" className="k-tab" aria-expanded={mode === 'clip'} onClick={() => setMode(mode === 'clip' ? 'none' : 'clip')}>Clip it to another</button>
          {mates > 0 && <button type="button" className="k-tab" onClick={onUnclip}>Take it off the clip</button>}
          <button type="button" className="k-tab" onClick={onSend}>Send it to someone</button>
          <button type="button" className="k-tab" aria-pressed={Boolean(scrap.starred)} onClick={onStar}>{scrap.starred ? 'Take the star off' : 'Give it a gold star'}</button>
          <button type="button" className="k-tab" onClick={() => onAway(!scrap.away)}>{scrap.away ? 'Put it back on the table' : 'Put it in the drawer'}</button>
          <button type="button" className="k-tab" onClick={onBin}>Bin it</button>
          <button type="button" className="k-tab" aria-expanded={mode === 'more' || mode === 'seal'} onClick={() => setMode(mode === 'more' || mode === 'seal' ? 'none' : 'more')}>More to do with it</button>
        </div>

        {(mode === 'more' || mode === 'seal') && (
          <div className="k-do k-do--small k-more">
            <button type="button" className="k-tab" disabled={scrap.scale === 1} onClick={() => onScale(1)}>Bigger paper</button>
            <button type="button" className="k-tab" disabled={scrap.scale === -1} onClick={() => onScale(-1)}>Smaller paper</button>
            <button type="button" className="k-tab" onClick={() => onRotate(-6)}>Tilt it left</button>
            <button type="button" className="k-tab" onClick={() => onRotate(6)}>Tilt it right</button>
            <button type="button" className="k-tab" onClick={onCopy}>Make a copy</button>
            <button type="button" className="k-tab" aria-pressed={Boolean(scrap.taped)} onClick={onTape}>{scrap.taped ? 'Peel the tape off' : 'Tape it to the table'}</button>
            {scrap.image
              ? <button type="button" className="k-tab" onClick={onNoPicture}>Take the picture off</button>
              : <button type="button" className="k-tab" onClick={() => file.current?.click()}>Put a picture on it</button>}
            <input ref={file} type="file" accept="image/*" hidden aria-label="A picture for this scrap" onChange={(e) => { const f = e.target.files?.[0]; if (f) onPicture(f); e.target.value = ''; }} />
            <button type="button" className="k-tab" aria-expanded={mode === 'seal'} onClick={() => setMode(mode === 'seal' ? 'more' : 'seal')}>Seal it for later</button>
          </div>
        )}
        {mode === 'seal' && (
          <form className="k-field" onSubmit={(e) => { e.preventDefault(); const t = dayOf(until); if (t > now) onSeal(t); }}>
            <label htmlFor="k-seal">Seal it until</label>
            <input id="k-seal" type="date" required min={isoDay(now + DAY)} value={until} onChange={(e) => setUntil(e.target.value)} />
            <p className="k-hand">It goes out of sight until that day, then turns up on the table. The drawer keeps it under “sealed”, and you can open it early.</p>
            <button type="submit" className="k-button" disabled={dayOf(until) <= now}>Seal it</button>
          </form>
        )}
        {scrap.image && !scrap.text.trim() && mode === 'none' && <p className="k-hand k-held-facts">“Change the words” gives the picture a caption, which is also how a screen reader will describe it.</p>}
        {links.length > 0 && (
          <p className="k-do k-do--small">
            {links.map((l) => <a key={l.href} className="k-tab" href={l.href} target="_blank" rel="noopener noreferrer">Open {new URL(l.href!).hostname.replace(/^www\./, '')}</a>)}
          </p>
        )}
        {kin.length > 0 && mode === 'none' && (
          <div className="k-kin">
            <p className="k-hand">{Math.abs(kin[0]!.createdAt - scrap.createdAt) > 30 * DAY ? 'You were near this before:' : 'This might belong with:'}</p>
            <ul className="k-choices">
              {kin.map((k) => <li key={k.id}><button type="button" className="k-tab" onClick={() => onPickOther(k.id)}>{titleOf(k, 60)} <span className="k-kin-when">({ago(k.createdAt, now)})</span></button></li>)}
            </ul>
          </div>
        )}

        {mode === 'words' && (
          <div className="k-field">
            <label htmlFor="k-words">{scrap.image ? 'The words under the picture' : 'The words on the front'}</label>
            <textarea id="k-words" rows={3} value={scrap.text} onChange={(e) => onText(e.target.value)} placeholder="Whatever you like" />
          </div>
        )}
        {mode === 'clip' && (
          <div className="k-field">
            <label htmlFor="k-clip-find">Clip it to</label>
            <input id="k-clip-find" type="search" autoComplete="off" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Look for a few words" />
            {candidates.length > 0 ? (
              <ul className="k-choices">
                {candidates.map((s) => <li key={s.id}><button type="button" className="k-tab" onClick={() => onClipTo(s.id)}>{titleOf(s, 60)}</button></li>)}
              </ul>
            ) : (
              <p className="k-hand">{others.length ? 'Nothing like that on the table or in the drawer.' : 'There is nothing else to clip it to yet. Make another!'}</p>
            )}
          </div>
        )}

        <button type="button" className="k-tab k-down" onClick={modal.close}>Put it down</button>
      </div>
    </dialog>
  );
}

interface SpreadProps {
  pile: Pile;
  onPick(id: string): void;
  onWrite(): void;
  onAway(): void;
  onZine(): void;
  onClose(): void;
}

/** A pile, unclipped for a moment and laid side by side. */
export function Spread({ pile, onPick, onWrite, onAway, onZine, onClose }: SpreadProps) {
  const modal = useModal(onClose);
  return (
    <dialog ref={modal.ref} className="k-spread" aria-labelledby="k-spread-h" onClose={modal.onClose}>
      <h2 id="k-spread-h" className="k-hand">{pile.all.length} things on one clip. Pick one up.</h2>
      <ul className="k-fan">
        {pile.all.map((s) => (
          <li key={s.id}>
            <button type="button" className="k-scrap" aria-label={titleOf(s, 80)} onClick={() => onPick(s.id)}><Face scrap={s} /></button>
          </li>
        ))}
      </ul>
      <div className="k-do k-do--small">
        <button type="button" className="k-button" onClick={onWrite}>Write something from these</button>
        <button type="button" className="k-button k-button--play" onClick={onZine}>Make a little zine of them</button>
        <button type="button" className="k-tab" onClick={onAway}>Put the pile in the drawer</button>
        <button type="button" className="k-tab" onClick={modal.close}>Clip them back up</button>
      </div>
    </dialog>
  );
}

interface SendProps {
  /** One scrap is a note; several are a zine, in reading order. */
  scraps: Scrap[];
  /** The address of the letter page, without a fragment. */
  page: string;
  /** How the last letter was signed. */
  sign: string;
  onSign(name: string): void;
  onSent(): void;
  onUnsent(): void;
  onClose(): void;
}

/** Sending makes a link that carries the scraps inside it. Nothing is uploaded, and the dialog says so. */
export function Send({ scraps, page, sign, onSign, onSent, onUnsent, onClose }: SendProps) {
  const modal = useModal(onClose);
  const field = useRef<HTMLTextAreaElement>(null);
  const [link, setLink] = useState('');
  const [copied, setCopied] = useState(false);
  const [to, setTo] = useState('');
  const [open, setOpen] = useState('');
  const [name, setName] = useState('');
  const first = scraps[0]!;
  const zine = scraps.length > 1;
  const sent = scraps.every((s) => s.sentAt);
  const nothing = scraps.every((s) => isEmpty({ ...s, image: undefined }));
  const pictures = scraps.some((s) => s.image);
  const stamp = first.sentAt ?? 0;
  const what = scraps.map((s) => `${s.text}\u0000${s.body}\u0000${s.look}\u0000${s.prompt ?? ''}\u0000${s.strokes?.length ?? 0}`).join('\u0001');

  useEffect(() => {
    if (!sent) { setLink(''); return; }
    let live = true;
    void encodeLetter(letterOf(scraps, stamp || Date.now(), { to, from: sign, open: dayOf(open), ...(zine ? { name } : {}) })).then((f) => { if (live) { setLink(`${page}#${f}`); setCopied(false); } });
    return () => { live = false; };
    // `what` stands for the scraps' content: the array itself is new on every render.
  }, [sent, what, stamp, page, to, sign, open, name, zine]);

  const copy = async () => {
    try { await navigator.clipboard.writeText(link); } catch { field.current?.select(); document.execCommand?.('copy'); }
    setCopied(true);
  };

  return (
    <dialog ref={modal.ref} className="k-send" aria-labelledby="k-send-h" onClose={modal.onClose}>
      <h2 id="k-send-h">{sent ? 'Here is the link' : zine ? 'Make these into a little zine?' : 'Send this to someone?'}</h2>
      {!sent ? (
        <>
          <p>{zine
            ? `This makes a link with all ${scraps.length} folded up inside it, in the order you made them: each front, its doodle and whatever is on its back. Whoever has the link can read it, and print it as a booklet.`
            : 'This makes a link with the scrap folded up inside it: the front, the doodle and whatever is on the back. Whoever you give the link to can read it.'}</p>
          <p>Nothing gets uploaded anywhere, and nothing else on your table goes with it.</p>
          {pictures && <p>Pictures stay behind: a link cannot carry them. The words under them still go.</p>}
          {nothing && <p role="alert">There is nothing on {zine ? 'these' : 'this one'} to send yet.</p>}
          <p className="k-do k-do--small">
            <button type="button" className="k-button" disabled={nothing} onClick={onSent}>Make the link</button>
            <button type="button" className="k-tab" onClick={modal.close}>Keep it to myself</button>
          </p>
        </>
      ) : (
        <>
          <div className="k-send-who">
            {zine && <div><label htmlFor="k-send-name">What is it called? (if anything)</label><input id="k-send-name" type="text" autoComplete="off" maxLength={80} value={name} onChange={(e) => setName(e.target.value)} /></div>}
            <div><label htmlFor="k-send-to">Who is it for? (if you like)</label><input id="k-send-to" type="text" autoComplete="off" maxLength={60} value={to} onChange={(e) => setTo(e.target.value)} /></div>
            <div><label htmlFor="k-send-from">Sign it</label><input id="k-send-from" type="text" autoComplete="off" maxLength={60} value={sign} onChange={(e) => onSign(e.target.value)} /></div>
            <div><label htmlFor="k-send-open">Keep it folded until</label><input id="k-send-open" type="date" min={isoDay(Date.now() + DAY)} value={open} onChange={(e) => setOpen(e.target.value)} /></div>
          </div>
          {open && <p className="k-hand">The page will keep it folded until that day. That is a courtesy between friends, not a lock: someone determined could still read it.</p>}
          <label htmlFor="k-send-link">The link to “{titleOf(first, 60)}”{zine ? ` and ${scraps.length - 1} more` : ''}</label>
          <textarea id="k-send-link" ref={field} readOnly rows={3} value={link} onFocus={(e) => e.currentTarget.select()} />
          <p className="k-hand" role="status">
            {copied ? 'Copied. ' : ''}
            {link.length > 6000 ? `That is a long one (${link.length.toLocaleString()} characters). Some chat apps cut long links short, so try it first.` : 'The link carries it as it is right now. One you already gave out keeps what it had.'}
          </p>
          <p className="k-do k-do--small">
            <button type="button" className="k-button" disabled={!link} onClick={() => void copy()}>Copy the link</button>
            {link && <a className="k-tab" href={link} target="_blank" rel="noopener">See what they will see</a>}
            <button type="button" className="k-tab" onClick={onUnsent}>Stop calling it sent</button>
            <button type="button" className="k-tab" onClick={modal.close}>Done</button>
          </p>
          <p className="k-hand">Only people you give the link to can open it. A link someone already has cannot be taken back.</p>
        </>
      )}
    </dialog>
  );
}
