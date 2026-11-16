// Scraps: the island. It owns everything on the table and is the only place that talks to the
// store; the views below it (Table, Held, Back, Sketch, Drawer) get scraps and callbacks.
// Everything here is the visitor's own, from their own browser: no props, nothing from the catalog.
import { useCallback, useEffect, useMemo, useRef, useState, type SyntheticEvent } from 'react';
import { Back, type SaveState } from './Back.tsx';
import { Drawer } from './Drawer.tsx';
import { ErrorBoundary } from './ErrorBoundary.tsx';
import { Held, Send, Spread } from './Held.tsx';
import {
  LOOKS, PAPERS, SPARK_LABELS, WELCOME, ago, clipTogether, decodeLetter, due, duplicate, exportCopy, forgotten, importCopy, isEmpty, isHidden, kin, mergeCopy, newId, onTable, overflow, pilesOf,
  reconcile, scrapsOf, spark, spot, stale, titleOf, unclip, visible, withDraft,
  type Pile, type Scrap, type Snapshot, type SparkKind, type Stroke,
} from './model.ts';
import { Jar, Pencil, Photo, Sheet } from './parts.tsx';
import { Sketch } from './Sketch.tsx';
import { play, type Noise } from './sound.ts';
import { openStore, type Store } from './store.ts';
import { ARRIVED, Studio, applyPrefs, loadPrefs, savePrefs, type Prefs } from './Studio.tsx';
import { Table } from './Table.tsx';

type Slip =
  | { kind: 'spark'; text: string; spark: SparkKind; about?: string }
  | { kind: 'clip'; text: string; onto: string }
  | { kind: 'found'; text: string; id: string }
  | { kind: 'continue'; text: string; id: string }
  | { kind: 'arrived'; text: string; id: string; from: string };
interface Toast { text: string; undo?: boolean }
/** One thing done on the table: each scrap it touched, as it was and as it became (null: not there). */
type Step = Map<string, Scrap | null>;
interface Done { before: Step; after: Step }
type Wire = { ids?: string[]; gone?: string[]; all?: true };

const JOURNAL = 'scraps:unwritten';
// Scraps torn up whose removal the browser had not confirmed when the page closed.
const TORN = 'scraps:torn';
// Which sheet was being written on when the page closed. Kept in localStorage because it must be
// set down in the same instant as the click, not whenever a database transaction gets round to it.
const MIDWAY = 'scraps:midway';
// What the jar showed lately, so it does not repeat itself, and when a copy was last kept. Neither is content.
const SHOWN = 'scraps:sparks';
const COPIED = 'scraps:copied';
const shownLately = (): string[] => { try { const v: unknown = JSON.parse(localStorage.getItem(SHOWN) ?? '[]'); return Array.isArray(v) ? v.filter((t): t is string => typeof t === 'string').slice(-80) : []; } catch { return []; } };
const midway = {
  get: (): string | null => { try { return localStorage.getItem(MIDWAY); } catch { return null; } },
  set: (id: string | null) => { try { if (id) localStorage.setItem(MIDWAY, id); else localStorage.removeItem(MIDWAY); } catch { /* storage refused: no carry-on slip, nothing lost */ } },
};
const INVITES = ['Say anything. It doesn’t have to be good.', 'Half a thought is plenty.', 'What’s rattling around in there?', 'One sentence. Go on.', 'Start badly. It’s allowed.'];
const CLIP_ASKS = ['Why do these two belong together?', 'What do these have in common?', 'Interesting pair. What is the link?'];
const pick = <T,>(xs: readonly T[]): T => xs[Math.floor(Math.random() * xs.length)]!;
const day = (t: number) => new Date(t).toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' });

/** A picture shrunk to fit a scrap, as a data address: small enough to keep hundreds of. */
async function shrink(file: Blob): Promise<string> {
  const bmp = await createImageBitmap(file);
  const k = Math.min(1, 900 / Math.max(bmp.width, bmp.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(bmp.width * k));
  canvas.height = Math.max(1, Math.round(bmp.height * k));
  const g = canvas.getContext('2d')!;
  g.fillStyle = '#fff';
  g.fillRect(0, 0, canvas.width, canvas.height);
  g.drawImage(bmp, 0, 0, canvas.width, canvas.height);
  const webp = canvas.toDataURL('image/webp', 0.82);
  return webp.startsWith('data:image/webp') ? webp : canvas.toDataURL('image/jpeg', 0.82);
}

export default function App() {
  return <ErrorBoundary><Scraps /></ErrorBoundary>;
}

function Scraps() {
  const store = useRef<Store | null>(null);
  const [ready, setReady] = useState(false);
  const [unreadable, setUnreadable] = useState(false);
  const [durable, setDurable] = useState(true);
  const [scraps, setScraps] = useState<Scrap[]>([]);
  const [save, setSave] = useState<SaveState>('saved');
  const [held, setHeld] = useState<string | null>(null);
  const [spread, setSpread] = useState<string | null>(null);
  const [back, setBack] = useState<string | null>(null);
  const [drawing, setDrawing] = useState<string | null>(null);
  const [sending, setSending] = useState<string[] | null>(null);
  const [drawer, setDrawer] = useState(false);
  const [studio, setStudio] = useState(false);
  const [prefs, setPrefs] = useState<Prefs>(loadPrefs);
  const [, setTurns] = useState(0);
  const [copiedAt, setCopiedAt] = useState(() => { try { return Number(localStorage.getItem(COPIED)) || 0; } catch { return 0; } });
  const [slip, setSlip] = useState<Slip | null>(null);
  const [toast, setToast] = useState<Toast | null>(null);
  const [found, setFound] = useState<string | null>(null);
  const [said, setSaid] = useState('');
  const [narrow, setNarrow] = useState(() => matchMedia('(max-width: 47.99rem)').matches);
  const [invite] = useState(() => pick(INVITES));
  const strip = useRef<HTMLInputElement>(null);
  const picture = useRef<HTMLInputElement>(null);
  const noise = useRef<(n: Noise) => void>(() => undefined);
  noise.current = (n) => { if (prefs.sound) play(n); };
  useEffect(() => { applyPrefs(prefs); savePrefs(prefs); }, [prefs]);
  const answer = useRef<HTMLInputElement>(null);
  const returnTo = useRef<string | null>(null);
  const dragFrom = useRef<Scrap[] | null>(null);

  const all = useRef(scraps);
  all.current = scraps;
  const room = narrow ? 6 : 12;

  useEffect(() => {
    const mq = matchMedia('(max-width: 47.99rem)');
    const on = () => setNarrow(mq.matches);
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, []);

  // --- Storage ---------------------------------------------------------------------------
  const pending = useRef(0);
  /** Scraps changed on screen and not yet handed to storage. */
  const dirty = useRef(new Set<string>());
  const persist = useCallback((op: (s: Store) => Promise<void>) => {
    const s = store.current;
    if (!s) return;
    pending.current += 1;
    setSave('saving');
    // Inside a promise, so a store that throws at once (no room, a closed database) is a failed save and not a crash.
    Promise.resolve().then(() => op(s)).then(
      () => { pending.current -= 1; if (pending.current === 0 && !dirty.current.size) setSave('saved'); },
      () => { pending.current -= 1; setSave('failed'); },
    );
  }, []);

  // Writes are counted until the browser confirms them, so that leaving the page can set down
  // whatever is still in the air (the journal below).
  const unconfirmed = useRef(new Map<string, number>());
  /** Removals begun and not yet confirmed. */
  const going = useRef(new Set<string>());
  // Other tabs on the same table are told what was saved, and read it from storage themselves.
  const wire = useRef<BroadcastChannel | null>(null);
  const tell = (m: Wire) => { try { wire.current?.postMessage(m); } catch { /* no channel: the other tab catches up on reload */ } };
  const write = useCallback((list: Scrap[]) => {
    if (!list.length) return;
    const marks = list.map((s) => { const n = (unconfirmed.current.get(s.id) ?? 0) + 1; unconfirmed.current.set(s.id, n); return [s.id, n] as const; });
    persist((st) => st.put(list).then(() => {
      for (const [id, n] of marks) if (unconfirmed.current.get(id) === n) unconfirmed.current.delete(id);
      tell({ ids: list.map((s) => s.id) });
    }));
  }, [persist]);

  /** Takes scraps off the screen and out of storage for good. Nothing with words on it comes here without having been in the bin. */
  const drop = useCallback((ids: string[]) => {
    if (!ids.length) return;
    for (const id of ids) { dirty.current.delete(id); unconfirmed.current.delete(id); going.current.add(id); }
    const next = all.current.filter((s) => !ids.includes(s.id));
    all.current = next;
    setScraps(next);
    persist((st) => st.remove(ids).then(() => { for (const id of ids) going.current.delete(id); tell({ gone: ids }); }));
  }, [persist]);

  // What was done, so it can be taken back (Ctrl or Cmd+Z, or "undo" by the tools).
  const past = useRef<Done[]>([]);
  const future = useRef<Done[]>([]);
  const record = useCallback((before: (Scrap | undefined)[], after: Scrap[]) => {
    const step: Done = { before: new Map(after.map((s, i) => [s.id, before[i] ?? null])), after: new Map(after.map((s) => [s.id, s])) };
    past.current = [...past.current.slice(-59), step];
    future.current = [];
    setTurns((n) => n + 1);
  }, []);

  /** Puts changed scraps on screen and into storage at once. */
  const set = useCallback((changed: Scrap[], remember = true) => {
    if (!changed.length) return;
    if (remember) record(changed.map((c) => all.current.find((k) => k.id === c.id)), changed);
    const by = new Map(changed.map((s) => [s.id, s]));
    const next = all.current.map((s) => by.get(s.id) ?? s);
    for (const s of changed) if (!all.current.some((k) => k.id === s.id)) next.push(s);
    all.current = next;
    setScraps(next);
    write(changed);
  }, [write, record]);

  const replay = useCallback((step: Step) => {
    set([...step.values()].filter((v): v is Scrap => Boolean(v)), false);
    drop([...step].filter(([, v]) => !v).map(([id]) => id));
  }, [set, drop]);
  const undo = useCallback(() => {
    const step = past.current.pop();
    if (!step) return;
    future.current.push(step);
    replay(step.before);
    setTurns((n) => n + 1);
    setToast(null);
    setSaid('Taken back.');
  }, [replay]);
  const redo = useCallback(() => {
    const step = future.current.pop();
    if (!step) return;
    past.current.push(step);
    replay(step.after);
    setTurns((n) => n + 1);
    setSaid('Done again.');
  }, [replay]);

  // Typing changes the screen at once and is written a moment later; leaving the page writes it now.
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const flush = useCallback(() => {
    clearTimeout(timer.current);
    write(all.current.filter((s) => dirty.current.has(s.id)));
    dirty.current.clear();
  }, [write]);
  const patch = useCallback((id: string, change: Partial<Scrap>, touch = true) => {
    const next = all.current.map((s) => (s.id === id ? { ...s, ...change, ...(touch ? { updatedAt: Date.now() } : {}) } : s));
    all.current = next;
    setScraps(next);
    dirty.current.add(id);
    setSave((s) => (s === 'failed' ? s : 'saving'));
    clearTimeout(timer.current);
    timer.current = setTimeout(flush, 350);
  }, [flush]);

  // Leaving the page: a write to IndexedDB begun while a page is being torn down may never finish,
  // so what is still unwritten is first set down synchronously in localStorage. The next visit
  // reads that journal before anything else.
  useEffect(() => {
    const leave = () => {
      const unwritten = all.current.filter((s) => dirty.current.has(s.id) || unconfirmed.current.has(s.id));
      if (unwritten.length) {
        try { localStorage.setItem(JOURNAL, exportCopy(unwritten, Date.now())); } catch {
          // Too big for the journal (pictures): set the words down without them. The merge on the next visit keeps the stored picture.
          try { localStorage.setItem(JOURNAL, exportCopy(unwritten.map(({ image: _image, ...rest }) => rest as Scrap), Date.now())); } catch { /* storage refused: the IndexedDB write below is the only chance */ }
        }
      }
      if (going.current.size) { try { localStorage.setItem(TORN, JSON.stringify([...going.current])); } catch { /* the removal itself is still under way */ } }
      flush();
    };
    const hidden = () => { if (document.visibilityState === 'hidden') leave(); };
    document.addEventListener('visibilitychange', hidden);
    window.addEventListener('pagehide', leave);
    return () => { document.removeEventListener('visibilitychange', hidden); window.removeEventListener('pagehide', leave); };
  }, [flush]);

  useEffect(() => {
    let live = true;
    void openStore().then(async (s) => {
      // A read can fail while a previous page is still letting go of the database. Try again before
      // giving up, and never answer a failed read with an empty table: that would look like loss.
      let snap: Snapshot | undefined;
      for (let attempt = 0; attempt < 4 && !snap; attempt += 1) {
        snap = await s.load().catch(() => undefined);
        if (!snap) await new Promise((r) => setTimeout(r, 200 * (attempt + 1)));
      }
      if (!live) return;
      if (!snap) { setUnreadable(true); return; }
      store.current = s;
      try {
        const raw = localStorage.getItem(JOURNAL);
        const rescued: Scrap[] = [];
        for (const j of raw ? importCopy(raw) : []) {
          const i = snap.scraps.findIndex((k) => k.id === j.id);
          let kept = j;
          if (i < 0) snap.scraps.push(j);
          else if (j.updatedAt >= snap.scraps[i]!.updatedAt) kept = snap.scraps[i] = { ...j, ...(snap.scraps[i]!.image && !j.image ? { image: snap.scraps[i]!.image } : {}) };
          else continue;
          rescued.push(kept);
        }
        if (rescued.length) void s.put(rescued);
        localStorage.removeItem(JOURNAL);
      } catch { /* an unreadable journal is ignored */ }

      const now = Date.now();
      // The bin empties itself after thirty days; and what was torn up as the page closed stays torn up.
      const torn = stale(snap.scraps, now);
      try {
        const left: unknown = JSON.parse(localStorage.getItem(TORN) ?? '[]');
        if (Array.isArray(left)) torn.push(...left.filter((id): id is string => typeof id === 'string' && snap!.scraps.some((k) => k.id === id && k.binnedAt)));
        localStorage.removeItem(TORN);
      } catch { /* an unreadable list is ignored: those scraps are still in the bin */ }
      if (torn.length) { snap.scraps = snap.scraps.filter((k) => !torn.includes(k.id)); void s.remove(torn); }
      // The first visit: one scrap is already on the table, so it is plain what a scrap is.
      if (!snap.meta.welcomed && !snap.scraps.length) {
        const hello: Scrap = { id: newId(), text: WELCOME, body: '', look: 1, x: 0.2, y: 0.24, rot: -4, createdAt: now, updatedAt: now, liftedAt: now };
        snap.scraps.push(hello);
        void s.put([hello]);
        void s.setMeta('welcomed', true);
      }
      const wasWriting = midway.get();
      const last = snap.scraps.find((k) => k.id === wasWriting);
      // A sealed scrap whose day has come is back on the table, on top.
      const opened = due(snap.scraps, now).map((k) => { const { sealedUntil: _until, ...rest } = k; return { ...rest, away: false, liftedAt: now }; });
      for (const o of opened) snap.scraps[snap.scraps.findIndex((k) => k.id === o.id)] = o;
      if (opened.length) void s.put(opened);
      // A letter the visitor chose to keep (the letter page left its link here).
      let arrived: Scrap[] = [];
      let sender = '';
      try {
        const link = localStorage.getItem(ARRIVED);
        localStorage.removeItem(ARRIVED);
        const letter = link ? await decodeLetter(link) : undefined;
        if (letter) {
          arrived = scrapsOf(letter, now, spot(onTable(snap.scraps).map((p) => p.top), Math.random, innerHeight / innerWidth));
          sender = letter.from ?? '';
          snap.scraps.push(...arrived);
          void s.put(arrived);
        }
      } catch { /* nothing arrived */ }
      if (!live) return;
      const old = last || opened.length || arrived.length ? undefined : forgotten(snap.scraps, now, Math.random);
      if (old) {
        // Found at the bottom of the drawer: it goes back on top of the table.
        const i = snap.scraps.indexOf(old);
        const clipMates = old.clip ? snap.scraps.filter((k) => k.clip === old.clip) : [old];
        const back = clipMates.map((k) => ({ ...k, away: false, liftedAt: k.id === old.id ? now : k.liftedAt }));
        for (const b of back) snap.scraps[snap.scraps.findIndex((k) => k.id === b.id)] = b;
        void s.put(back);
        setFound(snap.scraps[i]!.id);
        setSlip({ kind: 'found', id: old.id, text: `Found this at the bottom of the drawer. You made it ${ago(old.createdAt, now)}.` });
      }
      if (opened[0]) {
        setFound(opened[0].id);
        setSlip({ kind: 'found', id: opened[0].id, text: `You sealed this${opened[0].sealedAt ? ` on ${day(opened[0].sealedAt)}` : ''}, to open today.` });
      }
      if (last) setSlip({ kind: 'continue', id: last.id, text: `You were in the middle of “${titleOf(last, 70)}”.` });
      if (arrived[0]) {
        setFound(arrived[0].id);
        setSlip({ kind: 'arrived', id: arrived[0].id, from: sender, text: `Kept: “${titleOf(arrived[0], 60)}”${sender ? `, from ${sender}` : ''}. It is yours now. Write something back?` });
      }
      setDurable(s.durable);
      all.current = snap.scraps;
      setScraps(snap.scraps);
      setReady(true);
    });
    return () => { live = false; };
  }, []);

  // Two tabs, one table: what another tab saved appears here. If this tab is in the middle of
  // changing the same scrap, both versions survive (reconcile() in model.ts).
  useEffect(() => {
    if (typeof BroadcastChannel === 'undefined') return;
    const ch = new BroadcastChannel('scraps');
    wire.current = ch;
    ch.onmessage = (e: MessageEvent<Wire>) => {
      const st = store.current;
      if (!st) return;
      const m = e.data;
      void (async () => {
        if (m.all) { const snap = await st.load(); all.current = snap.scraps; setScraps(snap.scraps); return; }
        const theirs = m.ids?.length ? await st.get(m.ids) : [];
        const busy = new Set([...dirty.current, ...unconfirmed.current.keys()]);
        const r = reconcile(all.current, theirs, m.gone ?? [], busy, Date.now());
        all.current = r.scraps;
        setScraps(r.scraps);
        if (r.resave.length) {
          write(r.resave);
          setToast({ text: 'This sheet was changed in another tab too. That version is kept beside the page, under “How it read before”.' });
        }
      })().catch(() => undefined);
    };
    return () => { ch.close(); wire.current = null; };
  }, [write]);

  // The table only holds so much: when it is full, what was touched longest ago slides into the drawer.
  useEffect(() => {
    if (!ready) return;
    const ids = new Set(overflow(scraps, room));
    if (!ids.size) return;
    set(scraps.filter((s) => ids.has(s.id)).map((s) => ({ ...s, away: true })), false);
    setSaid('The table was getting full, so the oldest things went into the drawer.');
  }, [ready, scraps, room, set]);

  // --- Making things ---------------------------------------------------------------------------
  const make = useCallback((text: string, extra: Partial<Scrap> = {}): Scrap => {
    const now = Date.now();
    const s: Scrap = {
      id: newId(), text, body: '', look: Math.floor(Math.random() * LOOKS * PAPERS),
      ...spot(onTable(all.current).map((p) => p.top), Math.random, innerHeight / innerWidth),
      rot: Math.round((Math.random() * 10 - 5) * 10) / 10, createdAt: now, updatedAt: now, liftedAt: now, ...extra,
    };
    set([s]);
    if (!isEmpty(s)) noise.current('land');
    return s;
  }, [set]);

  const addPicture = useCallback(async (file: Blob, onto?: string) => {
    try {
      const image = await shrink(file);
      const target = all.current.find((k) => k.id === onto);
      if (target) set([{ ...target, image, updatedAt: Date.now() }]);
      else { const s = make('', { image }); setSaid('A picture is on the table. Pick it up to write on it.'); returnTo.current = s.id; }
    } catch {
      setToast({ text: 'That picture could not be read. Try a JPEG or a PNG.' });
    }
  }, [make, set]);
  // A picture pasted while nothing is being typed lands on the table.
  useEffect(() => {
    const paste = (e: ClipboardEvent) => {
      const file = [...(e.clipboardData?.files ?? [])].find((f) => f.type.startsWith('image/'));
      if (!file || back || document.querySelector('dialog[open]')) return;
      e.preventDefault();
      void addPicture(file);
    };
    document.addEventListener('paste', paste);
    return () => document.removeEventListener('paste', paste);
  }, [addPicture, back]);

  const say = (e: SyntheticEvent) => {
    e.preventDefault();
    const text = strip.current?.value.trim();
    if (!text) return;
    const first = all.current.length <= 1;
    const s = make(text);
    strip.current!.value = '';
    setSaid(`On the table: ${titleOf(s, 60)}`);
    if (first) setToast({ text: 'There. That’s one. Pick it up if you like.' });
  };

  const lift = (id: string) => patch(id, { liftedAt: Date.now() }, false);
  const byId = (id: string | null) => scraps.find((s) => s.id === id);
  const matesOf = (s: Scrap) => (s.clip ? scraps.filter((k) => k.clip === s.clip && k.id !== s.id) : []);

  const open = (pile: Pile) => {
    returnTo.current = pile.top.id;
    setFound(null);
    if (pile.all.length > 1) setSpread(pile.top.clip ?? null);
    else { lift(pile.top.id); setHeld(pile.top.id); }
    noise.current('pick');
  };
  const refocus = () => {
    const id = returnTo.current;
    // One frame later, once the dialog is gone; and only if focus has not already gone somewhere on purpose.
    requestAnimationFrame(() => {
      if (document.activeElement && document.activeElement !== document.body) return;
      (document.querySelector<HTMLElement>(`[data-pile="${id}"]`) ?? strip.current)?.focus();
    });
  };

  const clip = useCallback((a: string, b: string, ask: boolean) => {
    const changed = clipTogether(all.current, a, b, Date.now());
    if (!changed.length) return;
    set(changed);
    noise.current('clip');
    setSaid('Clipped together.');
    if (ask) setSlip({ kind: 'clip', text: pick(CLIP_ASKS), onto: a });
  }, [set]);

  const bin = (id: string) => {
    const s = all.current.find((k) => k.id === id);
    if (!s) return;
    const now = Date.now();
    const loosened = unclip(all.current, id, now).filter((k) => k.id !== id);
    // Nothing on it: it simply goes. Anything else waits in the bin, in the drawer, for thirty days.
    if (isEmpty(s)) { drop([id]); if (loosened.length) set(loosened, false); return; }
    flush();
    const { clip: _clip, taped: _taped, ...free } = all.current.find((k) => k.id === id)!;
    set([{ ...free, binnedAt: now }, ...loosened]);
    noise.current('bin');
    setToast({ text: 'Binned. It waits in the drawer’s bin for 30 days.', undo: true });
  };
  /** Changes one scrap as a single step that can be taken back. */
  const change = (id: string, fn: (s: Scrap) => Scrap) => {
    flush();
    const s = all.current.find((k) => k.id === id);
    if (s) set([fn(s)]);
  };
  const seal = (id: string, until: number) => {
    flush();
    const s = all.current.find((k) => k.id === id);
    if (!s) return;
    const now = Date.now();
    const loosened = unclip(all.current, id, now).filter((k) => k.id !== id);
    const { clip: _clip, taped: _taped, ...free } = s;
    set([{ ...free, sealedUntil: until, sealedAt: now, away: true }, ...loosened]);
    setHeld(null);
    noise.current('turn');
    setToast({ text: `Sealed until ${day(until)}. It will be on the table that day.`, undo: true });
  };

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 9000);
    return () => clearTimeout(t);
  }, [toast]);

  // --- The back, the doodle pad ---------------------------------------------------------------
  const turnOver = (id: string) => {
    const s = all.current.find((k) => k.id === id);
    if (!s) return;
    const kept = withDraft(s, Date.now());
    if (kept !== s) patch(id, { drafts: kept.drafts }, false);
    midway.set(id);
    setSlip(null);
    setToast(null);
    setHeld(null);
    setSpread(null);
    setDrawer(false);
    returnTo.current = id;
    setBack(id);
    noise.current('turn');
  };
  const leaveBack = () => {
    const id = back;
    flush();
    midway.set(null);
    setBack(null);
    const s = all.current.find((k) => k.id === id);
    if (s && isEmpty(s)) bin(s.id); else if (s) set([{ ...s, away: false, liftedAt: Date.now() }], false);
    noise.current('turn');
    refocus();
  };
  const closeDrawing = () => {
    const id = drawing;
    setDrawing(null);
    flush();
    const s = all.current.find((k) => k.id === id);
    if (s && isEmpty(s)) bin(s.id);
  };

  // --- Sparks and other slips -------------------------------------------------------------------
  const pull = (only?: SparkKind) => {
    noise.current('spark');
    const lately = shownLately();
    const s = spark(all.current, Math.random, new Set(lately), Date.now(), only);
    try { localStorage.setItem(SHOWN, JSON.stringify([...lately, s.text].slice(-80))); } catch { /* the jar may repeat itself sooner; nothing else changes */ }
    setSlip({ kind: 'spark', text: s.text, spark: s.kind, about: s.about });
  };
  useEffect(() => { if (slip?.kind === 'spark' || slip?.kind === 'clip') answer.current?.focus(); }, [slip]);
  const answerSlip = (e: SyntheticEvent) => {
    e.preventDefault();
    const text = answer.current?.value.trim();
    if (!text || !slip) return;
    if (slip.kind === 'spark') {
      const s = make(text, { prompt: slip.text });
      setSaid(`On the table: ${titleOf(s, 60)}`);
    } else if (slip.kind === 'clip') {
      const onto = all.current.find((k) => k.id === slip.onto);
      const s = make(text, { prompt: slip.text });
      if (onto) clip(s.id, onto.id, false);
    } else if (slip.kind === 'arrived') {
      // The reply is a scrap of its own, and the next thing offered is sending it.
      const s = make(text, { prompt: `Back to ${slip.from || 'whoever sent it'}:` });
      setSlip(null);
      setSending([s.id]);
      return;
    }
    setSlip(null);
    strip.current?.focus();
  };

  // Typing with nothing in focus goes to the strip.
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      const typing = (e.target as HTMLElement).closest('input, textarea, select, [contenteditable]');
      if (!back && !typing && (e.ctrlKey || e.metaKey) && !e.altKey && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) redo(); else undo();
        return;
      }
      if (!back && !typing && (e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') { e.preventDefault(); redo(); return; }
      if (back || e.key.length !== 1 || e.key === ' ' || e.ctrlKey || e.metaKey || e.altKey || e.isComposing) return;
      if ((e.target as HTMLElement).closest('input, textarea, select, dialog, [contenteditable]') || document.querySelector('dialog[open]')) return;
      strip.current?.focus();
    };
    document.addEventListener('keydown', key);
    return () => document.removeEventListener('keydown', key);
  }, [back, undo, redo]);

  // --- Copies ---------------------------------------------------------------------------
  const exportAll = () => {
    flush();
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([exportCopy(all.current, Date.now())], { type: 'application/json' }));
    a.download = `scraps-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    const now = Date.now();
    try { localStorage.setItem(COPIED, String(now)); } catch { /* only the reminder of when is lost */ }
    setCopiedAt(now);
    setToast({ text: 'A copy is in your downloads.' });
  };
  const importFile = async (file: File) => {
    let incoming: Scrap[];
    try { incoming = importCopy(await file.text()); } catch (err) {
      setToast({ text: err instanceof Error ? err.message : 'That file could not be read.' });
      return;
    }
    flush();
    const before = new Map(all.current.map((s) => [s.id, s]));
    const merged = mergeCopy(all.current, incoming);
    // Only what the copy adds or has in a newer version is written: nothing already here is cleared to make room.
    const changed = merged.filter((s) => before.get(s.id) !== s);
    const added = merged.length - before.size;
    if (!changed.length) { setToast({ text: 'Everything in that copy was already here.' }); return; }
    // The table says "brought back" only once the browser has stored it: a large copy takes a moment,
    // and a page closed in that moment must not have been told its copy was safe.
    setToast({ text: 'Bringing it back…' });
    setSave('saving');
    try {
      await store.current?.put(changed);
      tell({ all: true });
      all.current = mergeCopy(all.current, changed);
      setScraps(all.current);
      past.current = [];
      future.current = [];
      setSave('saved');
      setToast({ text: added ? `Brought back ${added} ${added === 1 ? 'thing' : 'things'}.` : 'Brought back newer versions of what was already here.' });
    } catch {
      setSave('failed');
      setToast({ text: 'The copy could not be stored: this browser may be out of room. Nothing here was changed.' });
    }
  };

  const piles = useMemo(() => onTable(scraps), [scraps]);
  const inHand = byId(held);
  const writing = byId(back);
  const drawn = byId(drawing);
  const letters = sending?.map(byId).filter((s): s is Scrap => Boolean(s)) ?? [];
  const shown = useMemo(() => visible(scraps), [scraps]);
  const tucked = shown.filter((s) => s.away).length;
  const fan = spread ? pilesOf(scraps).find((p) => p.top.clip === spread) : undefined;

  useEffect(() => { document.documentElement.dataset.kView = writing ? 'back' : 'table'; }, [writing]);

  if (unreadable) {
    return (
      <div className="k-error" role="alert">
        <h2>Your table would not open</h2>
        <p>Everything is still stored in this browser; reading it failed just now. Nothing was changed.</p>
        <p><button type="button" className="k-button" onClick={() => location.reload()}>Try again</button></p>
      </div>
    );
  }
  if (!ready) return <p className="k-loading k-hand" role="status">clearing a space for you</p>;

  return (
    <div className="k-app">
      {!writing && (
        <>
          <Table
            piles={piles}
            found={found}
            onOpen={open}
            onMove={(pile, x, y, done) => {
              const now = Date.now();
              const mine = (s: Scrap) => pile.all.some((k) => k.id === s.id);
              dragFrom.current ??= all.current.filter(mine);
              const next = all.current.map((s) => (mine(s) ? { ...s, x, y, ...(s.id === pile.top.id ? { liftedAt: now } : {}) } : s));
              all.current = next;
              setScraps(next);
              if (!done) return;
              const moved = next.filter(mine);
              record(moved.map((m) => dragFrom.current!.find((k) => k.id === m.id)), moved);
              dragFrom.current = null;
              write(moved);
              noise.current('land');
            }}
            onPicture={(file) => void addPicture(file)}
            onDrop={(dragged, onto) => clip(dragged.top.id, onto.top.id, true)}
          />

          {scraps.length <= 1 && <p className="k-hint k-hand" aria-hidden="true">type anything here, then press enter</p>}
          <form className="k-strip" onSubmit={say}>
            <label htmlFor="k-say" className="k-vh">Say something, and it lands on the table</label>
            <input id="k-say" ref={strip} type="text" autoComplete="off" enterKeyHint="done" placeholder={invite} />
            <button type="submit" className="k-vh-until-focus k-tab">Put it on the table</button>
          </form>

          <div className="k-tray">
            {slip && (
              <aside className={`k-slip k-slip--${slip.kind}`} aria-label={slip.kind === 'spark' ? 'A spark' : slip.kind === 'clip' ? 'About that pile' : slip.kind === 'found' ? 'Found again' : slip.kind === 'arrived' ? 'A letter you kept' : 'Where you left off'}>
                {slip.kind === 'spark' && <p className="k-hand k-slip-kind">{SPARK_LABELS[slip.spark]}</p>}
                <p className="k-hand" role="status">{slip.text}</p>
                {(slip.kind === 'spark' || slip.kind === 'clip' || slip.kind === 'arrived') && (
                  <form onSubmit={answerSlip}>
                    <label htmlFor="k-answer" className="k-vh">Your answer</label>
                    <input id="k-answer" ref={answer} type="text" autoComplete="off" enterKeyHint="done" placeholder="Answer however you like" />
                    <button type="submit" className="k-vh-until-focus k-tab">Put it on the table</button>
                  </form>
                )}
                <div className="k-do k-do--small">
                  {slip.kind === 'spark' && <button type="button" className="k-tab" onClick={() => pull()}>A different one</button>}
                  {slip.kind === 'spark' && <button type="button" className="k-tab" onClick={() => pull(slip.spark)}>More like this</button>}
                  {slip.kind === 'spark' && <button type="button" className="k-tab" onClick={() => { const s = make('', { prompt: slip.text }); turnOver(s.id); }}>Take a whole sheet for it</button>}
                  {slip.kind === 'found' && <button type="button" className="k-button" onClick={() => { const id = slip.id; setSlip(null); returnTo.current = id; lift(id); setHeld(id); }}>Pick it up</button>}
                  {slip.kind === 'continue' && <button type="button" className="k-button" onClick={() => turnOver(slip.id)}>Carry on</button>}
                  <button type="button" className="k-tab" onClick={() => { if (slip.kind === 'continue') midway.set(null); setSlip(null); }}>
                    {slip.kind === 'clip' ? 'They just do' : slip.kind === 'spark' || slip.kind === 'arrived' ? 'Not now' : 'Okay'}
                  </button>
                </div>
              </aside>
            )}
            <div className="k-tools">
              <button type="button" className="k-tool" aria-label="Pull a spark: a question to answer" onClick={() => pull()}><Jar /><span className="k-hand">{narrow ? 'spark' : 'pull a spark'}</span></button>
              <button type="button" className="k-tool" aria-label="Doodle something" onClick={() => { const s = make(''); returnTo.current = s.id; setDrawing(s.id); }}><Pencil /><span className="k-hand">doodle</span></button>
              <button type="button" className="k-tool" aria-label="A fresh sheet to write on" onClick={() => { const s = make(''); turnOver(s.id); }}><Sheet /><span className="k-hand">{narrow ? 'sheet' : 'a fresh sheet'}</span></button>
              <button type="button" className="k-tool" aria-label="Add a picture" onClick={() => picture.current?.click()}><Photo /><span className="k-hand">picture</span></button>
              <input ref={picture} type="file" accept="image/*" hidden aria-label="A picture to put on the table" onChange={(e) => { const f = e.target.files?.[0]; if (f) void addPicture(f); e.target.value = ''; }} />
            </div>
            {(past.current.length > 0 || future.current.length > 0) && (
              <div className="k-again">
                <button type="button" className="k-tab" disabled={!past.current.length} onClick={undo}>undo</button>
                <button type="button" className="k-tab" disabled={!future.current.length} onClick={redo}>redo</button>
              </div>
            )}
          </div>

          <button type="button" className="k-drawer-pull k-hand" aria-label={`the drawer${tucked ? ` (${tucked} tucked away)` : ''}`} onClick={() => { returnTo.current = null; setDrawer(true); }}>
            the drawer{tucked ? (narrow ? ` (${tucked})` : ` (${tucked} tucked away)`) : ''}
          </button>
          <button type="button" className="k-tab k-studio-pull" aria-label="Your studio: the mat, sound and motion" onClick={() => setStudio(true)}>{narrow ? 'studio' : 'your studio'}</button>

          {!durable && <p className="k-warning" role="alert">This browser said no to storage, so this table will be gone when the tab closes.</p>}
          {durable && save === 'failed' && (
            <p className="k-warning" role="alert">
              The last change did not save: this browser may be out of room. Everything is still on screen.{' '}
              <button type="button" className="k-tab" onClick={() => write(all.current.filter((s) => unconfirmed.current.has(s.id)))}>Try again</button>
              <button type="button" className="k-tab" onClick={exportAll}>Keep a copy now</button>
            </p>
          )}
        </>
      )}

      {writing && (
        <Back
          scrap={writing}
          mates={matesOf(writing)}
          kin={kin(writing, scraps)}
          save={save}
          durable={durable}
          onChange={(change) => patch(writing.id, change)}
          onBack={leaveBack}
          onClip={(id) => clip(id, writing.id, false)}
          onSend={() => { flush(); setSending([writing.id]); }}
          onKeep={() => { const kept = withDraft(writing, Date.now()); if (kept !== writing) patch(writing.id, { drafts: kept.drafts }, false); }}
          onRestore={(body) => { const kept = withDraft(writing, Date.now()); patch(writing.id, { body, drafts: kept.drafts }); }}
        />
      )}

      {drawer && !writing && (
        <Drawer
          scraps={scraps}
          durable={durable}
          copiedAt={copiedAt}
          onPick={(id) => { setDrawer(false); returnTo.current = id; setHeld(id); noise.current('pick'); }}
          onRestore={(id) => change(id, ({ binnedAt: _binned, ...s }) => ({ ...s, away: false, liftedAt: Date.now() }))}
          onShred={(ids) => { drop(ids); past.current = []; future.current = []; setTurns((n) => n + 1); }}
          onUnseal={(id) => change(id, ({ sealedUntil: _until, sealedAt: _at, ...s }) => ({ ...s, away: false, liftedAt: Date.now() }))}
          onExport={exportAll}
          onImport={(f) => void importFile(f)}
          onClose={() => { setDrawer(false); if (!held) refocus(); }}
        />
      )}
      {studio && <Studio prefs={prefs} onChange={(p) => { setPrefs(p); if (p.sound && !prefs.sound) play('land'); }} onClose={() => setStudio(false)} />}

      {fan && !inHand && !letters.length && (
        <Spread
          pile={fan}
          onPick={(id) => { setSpread(null); lift(id); setHeld(id); }}
          onWrite={() => { const s = make('', { clip: fan.top.clip, x: fan.top.x, y: fan.top.y }); turnOver(s.id); }}
          onAway={() => { set(fan.all.map((s) => ({ ...s, away: true }))); setSpread(null); }}
          onZine={() => { flush(); setSending([...fan.all].sort((a, b) => a.createdAt - b.createdAt).map((s) => s.id)); }}
          onClose={() => { setSpread(null); if (!held && !back) refocus(); }}
        />
      )}
      {inHand && !isHidden(inHand) && !drawn && !letters.length && (
        <Held
          key={inHand.id}
          scrap={inHand}
          mates={matesOf(inHand).length}
          others={shown.filter((s) => s.id !== inHand.id && !isEmpty(s))}
          kin={kin(inHand, scraps, 2)}
          onPickOther={(id) => { flush(); returnTo.current = id; lift(id); setHeld(id); }}
          onCopy={() => { flush(); const twin = duplicate(all.current.find((k) => k.id === inHand.id)!, Date.now()); set([twin]); setHeld(null); setToast({ text: 'A copy is on the table.', undo: true }); noise.current('land'); }}
          onScale={(d) => change(inHand.id, (s) => ({ ...s, scale: Math.max(-1, Math.min(1, (s.scale ?? 0) + d)) }))}
          onRotate={(d) => change(inHand.id, (s) => ({ ...s, rot: Math.max(-30, Math.min(30, s.rot + d)) }))}
          onTape={() => change(inHand.id, (s) => ({ ...s, taped: !s.taped }))}
          onStar={() => change(inHand.id, (s) => ({ ...s, starred: !s.starred }))}
          onSeal={(until) => seal(inHand.id, until)}
          onPicture={(file) => void addPicture(file, inHand.id)}
          onNoPicture={() => change(inHand.id, ({ image: _image, ...s }) => s)}
          onLook={() => change(inHand.id, (s) => ({ ...s, look: s.look + 1 + Math.floor(Math.random() * 3) * LOOKS }))}
          onText={(text) => patch(inHand.id, { text })}
          onTurn={() => turnOver(inHand.id)}
          onDoodle={() => setDrawing(inHand.id)}
          onClipTo={(id) => { clip(inHand.id, id, false); setToast({ text: 'Clipped together.' }); }}
          onUnclip={() => set(unclip(all.current, inHand.id, Date.now()))}
          onSend={() => { flush(); setSending([inHand.id]); }}
          onAway={(away) => { flush(); const s = all.current.find((k) => k.id === inHand.id)!; set((s.clip ? all.current.filter((k) => k.clip === s.clip) : [s]).map((k) => ({ ...k, away, liftedAt: k.id === s.id ? Date.now() : k.liftedAt }))); setHeld(null); setToast({ text: away ? 'In the drawer.' : 'Back on the table.' }); }}
          onBin={() => { const id = inHand.id; setHeld(null); bin(id); }}
          onClose={() => { flush(); setHeld(null); if (!back && !drawing && !sending) refocus(); }}
        />
      )}
      {drawn && <Sketch title={titleOf(drawn, 60)} strokes={drawn.strokes ?? []} onChange={(strokes: Stroke[]) => patch(drawn.id, { strokes })} onClose={closeDrawing} />}
      {letters.length > 0 && (
        <Send
          scraps={letters}
          page={`${location.origin}/scraps/letter`}
          sign={prefs.sign}
          onSign={(sign) => setPrefs((p) => ({ ...p, sign }))}
          onSent={() => { const now = Date.now(); for (const l of letters) patch(l.id, { sentAt: now }, false); }}
          onUnsent={() => { for (const l of letters) patch(l.id, { sentAt: undefined }, false); setSending(null); }}
          onClose={() => { flush(); setSending(null); }}
        />
      )}

      <p className="k-vh" role="status">{said}</p>
      {toast && (
        <p className="k-toast k-hand" role="status">
          {toast.text}{' '}
          {toast.undo && <button type="button" className="k-tab" onClick={undo}>Undo</button>}
        </p>
      )}
    </div>
  );
}
