// The drawer: everything ever made, as the same little pieces of paper, laid out month by month
// so that looking back is looking at a calendar of your own making. It is where the table's
// overflow goes, how to find something by a few of its words, where the bin and the sealed
// envelopes are, and where copies of the whole lot go out and come back in.
import { useEffect, useMemo, useRef, useState } from 'react';
import { BIN_DAYS, anniversaries, byMonth, hasBack, isHidden, titleOf, type Scrap } from './model.ts';
import { Face, Marks } from './parts.tsx';

interface Props {
  scraps: Scrap[];
  durable: boolean;
  /** When a copy was last kept from this browser, if ever. */
  copiedAt: number;
  onPick(id: string): void;
  onRestore(id: string): void;
  onShred(ids: string[]): void;
  onUnseal(id: string): void;
  onExport(): void;
  onImport(file: File): void;
  onClose(): void;
}

type Shelf = 'all' | 'years' | 'starred' | 'written' | 'drawn' | 'sent' | 'kept' | 'sealed' | 'bin';
const SHELVES: [Shelf, string, (s: Scrap) => boolean][] = [
  ['all', 'everything', (s) => !isHidden(s)],
  ['starred', 'gold stars', (s) => !isHidden(s) && Boolean(s.starred)],
  ['written', 'written on the back', (s) => !isHidden(s) && hasBack(s)],
  ['drawn', 'doodles and pictures', (s) => !isHidden(s) && Boolean(s.strokes?.length || s.image)],
  ['sent', 'sent', (s) => !isHidden(s) && Boolean(s.sentAt)],
  ['kept', 'from other people', (s) => !isHidden(s) && Boolean(s.from)],
  ['sealed', 'sealed', (s) => Boolean(s.sealedUntil) && !s.binnedAt],
  ['bin', 'the bin', (s) => Boolean(s.binnedAt)],
];
const PAGE = 60;
const DAY = 86_400_000;
const day = (t: number) => new Date(t).toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' });
const size = (n: number) => (n > 1_073_741_824 ? `${(n / 1_073_741_824).toFixed(1)} GB` : n > 1_048_576 ? `${(n / 1_048_576).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`);

export function Drawer({ scraps, durable, copiedAt, onPick, onRestore, onShred, onUnseal, onExport, onImport, onClose }: Props) {
  const dialog = useRef<HTMLDialogElement>(null);
  const file = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState('');
  const [shelf, setShelf] = useState<Shelf>('all');
  const [upTo, setUpTo] = useState(PAGE);
  const [room, setRoom] = useState('');
  // Tearing up cannot be taken back, so it takes two presses: the id (or 'all') waiting for the second.
  const [sure, setSure] = useState<string | null>(null);
  useEffect(() => { if (!dialog.current!.open) dialog.current!.showModal(); }, []);
  useEffect(() => {
    void navigator.storage?.estimate?.().then((e) => { if (e.usage && e.quota) setRoom(`This site is using about ${size(e.usage)} of the ${size(e.quota)} this browser allows it.`); }).catch(() => undefined);
  }, [scraps.length]);

  const now = Date.now();
  const years = useMemo(() => new Set(anniversaries(scraps, Date.now()).map((s) => s.id)), [scraps]);
  const counts = useMemo(() => new Map<Shelf, number>([...SHELVES.map(([key, , test]) => [key, scraps.filter(test).length] as [Shelf, number]), ['years', years.size]]), [scraps, years]);
  const found = useMemo(() => {
    const q = query.trim().toLowerCase();
    const test = shelf === 'years' ? (s: Scrap) => years.has(s.id) : SHELVES.find(([key]) => key === shelf)![2];
    return scraps.filter((s) => test(s) && (!q || `${s.text}\n${s.body}\n${s.prompt ?? ''}\n${s.from ?? ''}`.toLowerCase().includes(q)));
  }, [scraps, query, shelf, years]);
  const months = useMemo(() => byMonth(found.slice().sort((a, b) => b.createdAt - a.createdAt).slice(0, upTo)), [found, upTo]);
  const thisMonth = byMonth([{ createdAt: now } as Scrap])[0]!.key;
  const heading = (key: string, at: number) => (key === thisMonth ? 'this month' : new Date(at).toLocaleDateString(undefined, { month: 'long', year: 'numeric' }));

  return (
    <dialog ref={dialog} className="k-drawer" aria-labelledby="k-drawer-h" onClose={onClose}>
      <div className="k-drawer-head">
        <h2 id="k-drawer-h">The drawer</h2>
        <button type="button" className="k-tab" onClick={() => dialog.current?.close()}>Shut it</button>
      </div>
      <div className="k-field">
        <label htmlFor="k-find">Rummage for a few words</label>
        <input id="k-find" type="search" autoComplete="off" value={query} onChange={(e) => { setQuery(e.target.value); setUpTo(PAGE); }} />
      </div>
      <div className="k-shelves" role="group" aria-label="Which part of the drawer">
        {([SHELVES[0]!, ['years', 'around now, other years'], ...SHELVES.slice(1)] as [Shelf, string][]).filter(([key]) => key === 'all' || counts.get(key)).map(([key, name]) => (
          <button key={key} type="button" className="k-tab" aria-pressed={shelf === key} onClick={() => { setShelf(key); setUpTo(PAGE); setSure(null); }}>{name}{key !== 'all' ? ` (${counts.get(key)})` : ''}</button>
        ))}
      </div>
      <p className="k-hand" role="status">
        {scraps.length === 0 ? 'Empty, for now. Everything you make ends up in here.'
          : found.length === 0 ? (query.trim() ? 'Nothing with those words. Try fewer.' : 'Nothing here.')
          : shelf === 'bin' ? `${found.length} in the bin. Each is torn up ${BIN_DAYS} days after it went in.`
          : shelf === 'years' ? `${found.length} from around this time of year, in other years`
          : shelf === 'sealed' ? `${found.length} sealed. Each turns up on the table on its day.`
          : `${found.length} ${found.length === 1 ? 'thing' : 'things'}, newest first`}
      </p>
      {months.map((m) => (
        <section key={m.key} className="k-month" aria-label={heading(m.key, m.at)}>
          <h3 className="k-hand">{heading(m.key, m.at)}</h3>
          <ul className="k-fan">
            {m.items.map((s) => (
              <li key={s.id}>
                {s.binnedAt ? (
                  <>
                    <div className="k-scrap k-scrap--still"><Face scrap={s} /></div>
                    <p className="k-hand k-tile-note">torn up in {Math.max(1, Math.ceil((s.binnedAt + BIN_DAYS * DAY - now) / DAY))} days</p>
                    <button type="button" className="k-tab" onClick={() => onRestore(s.id)}>Take it out<span className="k-vh">: {titleOf(s, 40)}</span></button>
                    {sure === s.id ? (
                      <>
                        <button type="button" className="k-tab" onClick={() => { setSure(null); onShred([s.id]); }}>Yes, tear it up for good<span className="k-vh">: {titleOf(s, 40)}</span></button>
                        <button type="button" className="k-tab" onClick={() => setSure(null)}>No, leave it<span className="k-vh">: {titleOf(s, 40)}</span></button>
                      </>
                    ) : (
                      <button type="button" className="k-tab" onClick={() => setSure(s.id)}>Tear it up now<span className="k-vh">: {titleOf(s, 40)}</span></button>
                    )}
                  </>
                ) : s.sealedUntil ? (
                  <>
                    <div className="k-envelope"><span className="k-hand">sealed until {day(s.sealedUntil)}</span></div>
                    <button type="button" className="k-tab" onClick={() => onUnseal(s.id)}>Open it early<span className="k-vh">: sealed until {day(s.sealedUntil)}</span></button>
                  </>
                ) : (
                  <button type="button" className="k-scrap" aria-label={`${titleOf(s, 80)}${s.away ? '' : ', on the table'}${s.starred ? ', starred' : ''}`} onClick={() => onPick(s.id)}><Face scrap={s} /><Marks scrap={s} /></button>
                )}
              </li>
            ))}
          </ul>
        </section>
      ))}
      {found.length > upTo && <p className="k-do"><button type="button" className="k-button" onClick={() => setUpTo(upTo + PAGE)}>Dig deeper ({found.length - upTo} more)</button></p>}
      {shelf === 'bin' && found.length > 1 && (
        <p className="k-do k-do--small">
          {sure === 'all' ? (
            <>
              <span className="k-hand" role="status">All {found.length}, for good? This cannot be taken back.</span>
              <button type="button" className="k-tab" onClick={() => { setSure(null); onShred(found.map((s) => s.id)); }}>Yes, empty it</button>
              <button type="button" className="k-tab" onClick={() => setSure(null)}>No, leave them</button>
            </>
          ) : (
            <button type="button" className="k-tab" onClick={() => setSure('all')}>Empty the bin now</button>
          )}
        </p>
      )}
      <section className="k-keeping">
        <h3>Where all this lives</h3>
        <p>
          {durable
            ? 'In this browser, on this device, and nowhere else. Nobody else can see it. Clearing this site’s data would erase it, so keep a copy now and then.'
            : 'This browser said no to storage (private windows often do), so this table disappears when the tab closes. Keep a copy before you go.'}
        </p>
        {room && <p className="k-hand">{room}</p>}
        {scraps.length > 0 && <p className="k-hand">{copiedAt ? `You last kept a copy on ${day(copiedAt)}.` : 'No copy has been kept from this browser yet.'}</p>}
        <p className="k-do k-do--small">
          <button type="button" className="k-button" onClick={onExport} disabled={!scraps.length}>Keep a copy</button>
          <button type="button" className="k-tab" onClick={() => file.current?.click()}>Bring a copy back</button>
          <input ref={file} type="file" accept="application/json,.json" hidden aria-label="A copy to bring back" onChange={(e) => { const f = e.target.files?.[0]; if (f) onImport(f); e.target.value = ''; }} />
        </p>
      </section>
    </dialog>
  );
}
