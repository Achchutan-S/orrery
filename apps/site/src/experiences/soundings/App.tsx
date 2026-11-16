// Soundings: the island. It owns the chart's state and is the only place that talks to the store;
// the views below it (Chart, Panel, Ashore, Sketch, Log) get marks and callbacks.
// Everything here is the visitor's own data from their own browser: no props, nothing from the catalog.
import { useCallback, useEffect, useMemo, useRef, useState, type SyntheticEvent } from 'react';
import { Ashore, type SaveState } from './Ashore.tsx';
import { Chart, MAX_ZOOM, MIN_ZOOM, type Drift, type Point, type View } from './Chart.tsx';
import { ErrorBoundary } from './ErrorBoundary.tsx';
import { Log } from './Log.tsx';
import {
  FORMAT, OPEN_WATER, ago, echoesFor, exportCopy, freeSpot, heading, importCopy, inferKind, linkBetween, mergeCopy, neighbours, newId, resurface, titleOf, withDraft,
  type Kind, type Link, type Mark, type Snapshot, type Stroke,
} from './model.ts';
import { Panel, Release } from './Panel.tsx';
import { Rose } from './parts.tsx';
import { Sketch } from './Sketch.tsx';
import { openStore, type Store } from './store.ts';

type Slip =
  | { kind: 'heading'; text: string; from: string[] }
  | { kind: 'echo'; text: string; mark: string }
  | { kind: 'continue'; text: string; mark: string };
interface Toast { text: string; undo?: () => void }

const DAY = 86_400_000;
const JOURNAL = 'soundings:unwritten';
const today = () => Math.floor(Date.now() / DAY);

/** A small seeded generator: the questions adrift are the same all day and different tomorrow. */
function seeded(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function fit(marks: readonly Mark[], size: { w: number; h: number }): View {
  if (!marks.length || !size.w) return { x: 0, y: 0, k: 1 };
  const xs = marks.map((m) => m.x);
  const ys = marks.map((m) => m.y);
  const [x0, x1, y0, y1] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
  const k = Math.min(1, (size.w - 120) / (x1 - x0 + 320), (size.h - 220) / (y1 - y0 + 320));
  return { x: (x0 + x1) / 2, y: (y0 + y1) / 2, k: Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, k)) };
}

export default function App() {
  return <ErrorBoundary><Soundings /></ErrorBoundary>;
}

function Soundings() {
  const store = useRef<Store | null>(null);
  const [ready, setReady] = useState(false);
  const [unreadable, setUnreadable] = useState(false);
  const [durable, setDurable] = useState(true);
  const [marks, setMarks] = useState<Mark[]>([]);
  const [links, setLinks] = useState<Link[]>([]);
  const [save, setSave] = useState<SaveState>('saved');
  const [screen, setScreen] = useState<'chart' | 'log'>('chart');
  const [view, setView] = useState<View>({ x: 0, y: 0, k: 1 });
  const [selected, setSelected] = useState<{ id: string; focus: boolean } | null>(null);
  const [ashore, setAshore] = useState<string | null>(null);
  const [drawing, setDrawing] = useState<string | null>(null);
  const [releasing, setReleasing] = useState<string | null>(null);
  const [connectFrom, setConnectFrom] = useState<string | null>(null);
  const [here, setHere] = useState<Point | null>(null);
  const [slip, setSlip] = useState<Slip | null>(null);
  const [toast, setToast] = useState<Toast | null>(null);
  const [said, setSaid] = useState('');
  const [turn, setTurn] = useState(0);
  const [drift, setDrift] = useState<Drift[]>([]);
  const [asOf, setAsOf] = useState(1000);
  const [size, setSize] = useState({ w: 0, h: 0 });
  const capture = useRef<HTMLInputElement>(null);
  const slipRef = useRef<HTMLElement>(null);
  const savedView = useRef<View | null>(null);
  const taken = useRef<string[]>([]);

  const marksRef = useRef(marks);
  marksRef.current = marks;
  const linksRef = useRef(links);
  linksRef.current = links;
  const viewRef = useRef(view);
  viewRef.current = view;

  // --- Storage ---------------------------------------------------------------------------
  const pending = useRef(0);
  const persist = useCallback((op: (s: Store) => Promise<void>) => {
    const s = store.current;
    if (!s) return;
    pending.current += 1;
    setSave('saving');
    op(s).then(
      () => { pending.current -= 1; if (pending.current === 0) setSave('saved'); },
      () => { pending.current -= 1; setSave('failed'); },
    );
  }, []);

  // Writes of marks and links are counted until the browser confirms them, so that leaving the page
  // can set down whatever is still in the air (see the journal below).
  const unconfirmed = useRef(new Map<string, number>());
  const tracked = useCallback((key: string, write: (s: Store) => Promise<void>) => {
    const n = (unconfirmed.current.get(key) ?? 0) + 1;
    unconfirmed.current.set(key, n);
    persist((s) => write(s).then(() => { if (unconfirmed.current.get(key) === n) unconfirmed.current.delete(key); }));
  }, [persist]);
  const writeMark = useCallback((m: Mark) => tracked(m.id, (s) => s.putMark(m)), [tracked]);
  const writeLink = useCallback((l: Link) => tracked(l.id, (s) => s.putLink(l)), [tracked]);

  // Typing changes the screen at once and is written a moment later; leaving the page writes it now.
  const dirty = useRef(new Set<string>());
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const flush = useCallback(() => {
    clearTimeout(timer.current);
    for (const id of dirty.current) {
      const m = marksRef.current.find((k) => k.id === id);
      if (m) writeMark(m);
    }
    dirty.current.clear();
  }, [writeMark]);
  const patch = useCallback((id: string, change: Partial<Mark>, touch = true) => {
    setMarks((ms) => ms.map((m) => (m.id === id ? { ...m, ...change, ...(touch ? { updatedAt: Date.now() } : {}) } : m)));
    dirty.current.add(id);
    setSave((s) => (s === 'failed' ? s : 'saving'));
    clearTimeout(timer.current);
    timer.current = setTimeout(flush, 350);
  }, [flush]);
  // Leaving the page: a write to IndexedDB begun while a page is being torn down may never finish,
  // so what is still unwritten is first set down synchronously in localStorage. The next visit
  // reads that journal before anything else (see the load below).
  useEffect(() => {
    const leave = () => {
      const open = (id: string) => dirty.current.has(id) || unconfirmed.current.has(id);
      const unwritten = { marks: marksRef.current.filter((m) => open(m.id)), links: linksRef.current.filter((l) => open(l.id)) };
      if (unwritten.marks.length + unwritten.links.length) {
        try { localStorage.setItem(JOURNAL, JSON.stringify(unwritten)); } catch { /* storage refused: the IndexedDB write below is the only chance */ }
      }
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
      // giving up, and never answer a failed read with an empty chart: that would look like loss.
      let snap: Snapshot | undefined;
      for (let attempt = 0; attempt < 4 && !snap; attempt += 1) {
        snap = await s.load().catch(() => undefined);
        if (!snap) await new Promise((r) => setTimeout(r, 200 * (attempt + 1)));
      }
      if (!live) return;
      if (!snap) { setUnreadable(true); return; }
      store.current = s;
      // The journal of a visit that ended mid-sentence: keep whichever version of each mark is newer.
      try {
        const journal = importCopy(JSON.stringify({ soundings: FORMAT, ...(JSON.parse(localStorage.getItem(JOURNAL) ?? '{}') as object) }));
        for (const j of journal.marks) {
          const i = snap.marks.findIndex((m) => m.id === j.id);
          if (i < 0) snap.marks.push(j);
          else if (j.updatedAt >= snap.marks[i]!.updatedAt) snap.marks[i] = j;
          else continue;
          void s.putMark(j);
        }
        const known = new Set(snap.marks.map((m) => m.id));
        for (const l of journal.links) {
          if (snap.links.some((k) => k.id === l.id) || !known.has(l.a) || !known.has(l.b)) continue;
          snap.links.push(l);
          void s.putLink(l);
        }
        localStorage.removeItem(JOURNAL);
      } catch { /* an unreadable journal is ignored */ }
      setDurable(s.durable);
      setMarks(snap.marks.sort((a, b) => a.createdAt - b.createdAt));
      setLinks(snap.links);
      const v = snap.meta.view as View | undefined;
      if (v && Number.isFinite(v.x) && Number.isFinite(v.y) && Number.isFinite(v.k)) savedView.current = v;
      const t = snap.meta.taken as { day: number; ids: string[] } | undefined;
      if (t?.day === today()) taken.current = t.ids;
      const last = snap.marks.find((m) => m.id === snap.meta.lastAshore);
      const back = resurface(snap.marks, Date.now(), Math.random);
      if (last) setSlip({ kind: 'continue', text: `You were writing “${titleOf(last, 80)}”.`, mark: last.id });
      else if (back) setSlip({ kind: 'echo', text: `From ${ago(back.createdAt, Date.now())}: “${titleOf(back, 140)}”`, mark: back.id });
      setReady(true);
    });
    return () => { live = false; };
  }, []);

  // --- The first view, and the questions adrift ---------------------------------------------
  const placed = useRef(false);
  useEffect(() => {
    if (!ready || !size.w || placed.current) return;
    placed.current = true;
    const v = savedView.current ?? fit(marksRef.current, size);
    setView(v);
    const ms = marksRef.current;
    const rand = seeded(today());
    const cx = ms.length ? ms.reduce((s, m) => s + m.x, 0) / ms.length : 0;
    const cy = ms.length ? ms.reduce((s, m) => s + m.y, 0) / ms.length : 0;
    const reach = ms.length ? Math.max(...ms.map((m) => Math.hypot(m.x - cx, m.y - cy))) + 210 : 0;
    // Wide enough to leave the centre clear, narrow enough that a question's full width stays on a phone screen.
    const rx = reach || Math.min(340, Math.max(60, size.w / 2 - 104));
    const ry = reach || Math.min(250, Math.max(170, size.h * 0.3));
    const pool = OPEN_WATER.map((text, i) => ({ text, i, r: rand() })).sort((a, b) => a.r - b.r).slice(0, 5);
    const spots: Point[] = [];
    const next: Drift[] = [];
    pool.forEach((q, i) => {
      const a = -Math.PI / 2 + (i * 2 * Math.PI) / 5 + (rand() - 0.5) * 0.5;
      const p = freeSpot([...ms, ...spots], { x: cx + rx * Math.cos(a), y: cy + ry * Math.sin(a) }, 110);
      spots.push(p);
      next.push({ id: `q${q.i}`, text: q.text, ...p });
    });
    setDrift(next.filter((d) => !taken.current.includes(d.id) && !ms.some((m) => m.text === d.text)));
    // An empty chart opens with a caret already in the water, where a keyboard is at hand.
    if (!ms.length && matchMedia('(pointer: fine)').matches) setHere({ x: 0, y: 0 });
  }, [ready, size]);

  useEffect(() => {
    if (!placed.current) return;
    const t = setTimeout(() => persist((s) => s.setMeta('view', view)), 600);
    return () => clearTimeout(t);
  }, [view, persist]);

  // --- Making and changing marks ----------------------------------------------------------
  const centre = () => ({ x: viewRef.current.x, y: viewRef.current.y });
  const reveal = useCallback((p: Point) => {
    const v = viewRef.current;
    if (Math.abs((p.x - v.x) * v.k) < size.w / 2 - 90 && Math.abs((p.y - v.y) * v.k) < size.h / 2 - 130) return;
    // Out of sight: step back far enough to see everything if names stay readable, otherwise go to it.
    const all = fit([...marksRef.current, { x: p.x, y: p.y } as Mark], size);
    setView(all.k >= 0.55 ? all : { ...v, x: p.x, y: p.y });
  }, [size]);

  const add = useCallback((text: string, at?: Point, kind?: Kind): Mark => {
    const now = Date.now();
    const p = at ?? freeSpot(marksRef.current, centre(), size.w && size.w < 768 ? 118 : 150);
    const m: Mark = { id: newId(), kind: kind ?? inferKind(text), text, body: '', x: p.x, y: p.y, createdAt: now, updatedAt: now };
    setMarks((ms) => [...ms, m]);
    marksRef.current = [...marksRef.current, m];
    writeMark(m);
    setAsOf(1000);
    reveal(p);
    return m;
  }, [writeMark, reveal, size.w]);

  const connect = useCallback((a: string, b: string) => {
    if (a === b || linkBetween(linksRef.current, a, b)) return;
    const l: Link = { id: newId(), a, b, createdAt: Date.now() };
    setLinks((ls) => [...ls, l]);
    linksRef.current = [...linksRef.current, l];
    writeLink(l);
  }, [writeLink]);

  const disconnect = (id: string) => {
    setLinks((ls) => ls.filter((l) => l.id !== id));
    persist((s) => s.deleteLink(id));
  };

  const remove = useCallback((id: string, quiet = false) => {
    const m = marksRef.current.find((k) => k.id === id);
    if (!m) return;
    const gone = linksRef.current.filter((l) => l.a === id || l.b === id);
    dirty.current.delete(id);
    setMarks((ms) => ms.filter((k) => k.id !== id));
    setLinks((ls) => ls.filter((l) => !gone.includes(l)));
    persist(async (s) => { await s.deleteMark(id); for (const l of gone) await s.deleteLink(l.id); });
    setSelected((s) => (s?.id === id ? null : s));
    if (quiet) return;
    setToast({
      text: `Removed “${titleOf(m, 40)}”.`,
      undo: () => {
        setMarks((ms) => [...ms, m].sort((a, b) => a.createdAt - b.createdAt));
        setLinks((ls) => [...ls, ...gone]);
        writeMark(m);
        for (const l of gone) writeLink(l);
      },
    });
  }, [persist, writeMark, writeLink]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 9000);
    return () => clearTimeout(t);
  }, [toast]);

  const narrow = size.w > 0 && size.w < 768;
  const select = useCallback((id: string | null, focus = false) => {
    setConnectFrom(null);
    setSelected(id ? { id, focus } : null);
    // On a phone the note is a sheet over the lower half: bring the mark up into what is left.
    const m = id ? marksRef.current.find((k) => k.id === id) : undefined;
    if (m && narrow) setView((v) => ({ ...v, x: m.x + 60 / v.k, y: m.y + (size.h * 0.26) / v.k }));
  }, [narrow, size.h]);

  const goTo = (id: string, focus = true) => {
    const m = marksRef.current.find((k) => k.id === id);
    if (!m) return;
    flushAshore();
    setScreen('chart');
    setAsOf(1000);
    setView((v) => ({ ...v, x: m.x, y: m.y }));
    select(id, focus);
  };

  const goAshore = (id: string) => {
    const m = marksRef.current.find((k) => k.id === id);
    if (!m) return;
    const kept = withDraft(m, Date.now());
    if (kept !== m) patch(id, { drafts: kept.drafts }, false);
    persist((s) => s.setMeta('lastAshore', id));
    setSlip(null);
    select(null);
    setAshore(id);
  };
  // Leaving the page writes it; a piece left completely empty was never started, so it is not kept.
  function flushAshore() {
    flush();
    const m = marksRef.current.find((k) => k.id === ashore);
    if (m && !m.text.trim() && !m.body.trim() && !m.strokes?.length) remove(m.id, true);
    setAshore(null);
  }
  const leaveAshore = () => {
    const id = ashore;
    flushAshore();
    persist((s) => s.setMeta('lastAshore', null));
    const m = marksRef.current.find((k) => k.id === id);
    if (m && (m.text.trim() || m.body.trim() || m.strokes?.length)) { setView((v) => ({ ...v, x: m.x, y: m.y })); select(m.id, true); }
  };

  const closeDrawing = () => {
    const id = drawing;
    setDrawing(null);
    flush();
    const m = marksRef.current.find((k) => k.id === id);
    if (m && !m.text.trim() && !m.body.trim() && !m.strokes?.length) remove(m.id, true);
  };

  // --- The capture line ---------------------------------------------------------------------
  const submit = (e: SyntheticEvent) => {
    e.preventDefault();
    const text = capture.current?.value.trim();
    if (!text) return;
    const m = add(text);
    capture.current!.value = '';
    setSaid(`On the chart: ${titleOf(m, 60)}`);
  };

  // Typing anywhere starts a capture: a printable key with nothing else in focus goes to the capture line.
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (e.key === 'Escape' && !e.defaultPrevented && !document.querySelector('dialog[open]')) {
        if (connectFrom) setConnectFrom(null);
        else if (selected && !ashore) {
          const id = selected.id;
          select(null);
          document.querySelector<HTMLElement>(`[data-mark="${id}"]`)?.focus();
        }
        return;
      }
      if (ashore || screen !== 'chart' || e.key.length !== 1 || e.key === ' ' || e.ctrlKey || e.metaKey || e.altKey || e.isComposing) return;
      if (t.closest('input, textarea, select, dialog, [contenteditable]')) return;
      capture.current?.focus();
    };
    document.addEventListener('keydown', key);
    return () => document.removeEventListener('keydown', key);
  }, [ashore, screen, selected, connectFrom, select]);

  // --- Headings, echoes, questions adrift -----------------------------------------------
  const spin = () => {
    setTurn((t) => t + 720 + Math.round(Math.random() * 360));
    setSlip({ kind: 'heading', ...heading(marksRef.current, linksRef.current, Math.random) });
  };
  // A heading was asked for, so focus goes to it and it is read out. What the chart offers unasked (an echo, a place to continue) waits.
  useEffect(() => { if (slip?.kind === 'heading') slipRef.current?.focus(); }, [slip]);
  const keepHeading = (h: Extract<Slip, { kind: 'heading' }>) => {
    const from = h.from.map((id) => marksRef.current.find((m) => m.id === id)).filter((m): m is Mark => Boolean(m));
    const near = from.length === 2 ? { x: (from[0]!.x + from[1]!.x) / 2, y: (from[0]!.y + from[1]!.y) / 2 } : from[0] ? { x: from[0].x, y: from[0].y } : centre();
    const m = add(h.text, freeSpot(marksRef.current, near, 130), 'question');
    for (const f of from) connect(m.id, f.id);
    setSlip(null);
    setView((v) => ({ ...v, x: m.x, y: m.y }));
    select(m.id, true);
  };
  const takeDrift = (d: Drift) => {
    taken.current = [...taken.current, d.id];
    persist((s) => s.setMeta('taken', { day: today(), ids: taken.current }));
    setDrift((ds) => ds.filter((k) => k.id !== d.id));
    const m = add(d.text, { x: d.x, y: d.y }, 'question');
    select(m.id, true);
  };

  // --- Copies ---------------------------------------------------------------------------
  const exportAll = () => {
    flush();
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([exportCopy({ marks: marksRef.current, links: linksRef.current, meta: {} }, Date.now())], { type: 'application/json' }));
    a.download = `soundings-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    setToast({ text: 'A copy of your chart was saved to your downloads.' });
  };
  const importFile = async (file: File) => {
    try {
      const merged = mergeCopy({ marks: marksRef.current, links: linksRef.current }, importCopy(await file.text()));
      const added = merged.marks.length - marksRef.current.length;
      setMarks(merged.marks.sort((a, b) => a.createdAt - b.createdAt));
      setLinks(merged.links);
      persist((s) => s.replaceAll(merged.marks, merged.links));
      setToast({ text: added ? `Brought in ${added} ${added === 1 ? 'mark' : 'marks'}.` : 'Everything in that copy was already here.' });
    } catch (err) {
      setToast({ text: err instanceof Error ? err.message : 'That file could not be read.' });
    }
  };

  // --- What the chart shows ----------------------------------------------------------------
  const first = marks[0]?.createdAt ?? 0;
  const span = Date.now() - first;
  const tide = marks.length > 1 && span > DAY;
  const cutoff = asOf >= 1000 || !tide ? Infinity : first + (span * asOf) / 1000;
  const shownMarks = useMemo(() => (cutoff === Infinity ? marks : marks.filter((m) => m.createdAt <= cutoff)), [marks, cutoff]);
  const shownLinks = useMemo(() => {
    if (cutoff === Infinity) return links;
    const ids = new Set(shownMarks.map((m) => m.id));
    return links.filter((l) => ids.has(l.a) && ids.has(l.b));
  }, [links, shownMarks, cutoff]);

  const sel = selected ? marks.find((m) => m.id === selected.id) : undefined;
  const writing = ashore ? marks.find((m) => m.id === ashore) : undefined;
  const drawn = drawing ? marks.find((m) => m.id === drawing) : undefined;
  const letter = releasing ? marks.find((m) => m.id === releasing) : undefined;
  const byId = (id: string) => marks.find((m) => m.id === id);
  const reachOf = (m: Mark) => neighbours(links, m.id).map(byId).filter((k): k is Mark => Boolean(k));

  const onWater = (p: Point) => {
    if (connectFrom) { setConnectFrom(null); return; }
    if (selected) { select(null); return; }
    setAsOf(1000);
    // On a short screen the on-screen keyboard covers the lower half: bring the place up first.
    const v = viewRef.current;
    if (narrow) setView({ ...v, x: p.x, y: p.y + (size.h * 0.2) / v.k });
    setHere(p);
  };
  const onSelect = (id: string) => {
    if (connectFrom && connectFrom !== id) { connect(connectFrom, id); setConnectFrom(null); setSaid('Connected.'); return; }
    select(id, document.activeElement?.matches(':focus-visible') ?? false);
  };

  useEffect(() => {
    document.documentElement.dataset.sView = writing ? 'ashore' : screen;
  }, [writing, screen]);

  if (unreadable) {
    return (
      <div className="s-error" role="alert">
        <h2>Your chart could not be opened</h2>
        <p>It is still stored in this browser; reading it failed just now. Nothing was changed.</p>
        <p><button type="button" className="s-button" onClick={() => location.reload()}>Try again</button></p>
      </div>
    );
  }
  if (!ready) return <p className="s-loading" role="status">Unrolling the chart</p>;

  return (
    <div className="s-app">
      {!writing && (
        <div className="s-bar">
          <form className="s-capture" onSubmit={submit}>
            <label htmlFor="s-capture" className="s-vh">Put something on the chart</label>
            <input id="s-capture" ref={capture} type="text" autoComplete="off" enterKeyHint="done" placeholder="A thought, a question, a link" />
            <button type="submit" className="s-vh-until-focus s-text-button">Add</button>
          </form>
          <div className="s-starts">
            <button type="button" className="s-text-button" onClick={() => { const m = add('', undefined, 'thought'); setDrawing(m.id); }}>Draw</button>
            <button type="button" className="s-text-button" onClick={() => { const m = add('', undefined, 'thought'); goAshore(m.id); }}>Write</button>
          </div>
          <div className="s-views" role="group" aria-label="View">
            <button type="button" className="s-text-button" aria-pressed={screen === 'chart'} onClick={() => setScreen('chart')}>Chart</button>
            <button type="button" className="s-text-button" aria-pressed={screen === 'log'} onClick={() => { select(null); setHere(null); setScreen('log'); }}>Log</button>
          </div>
        </div>
      )}

      {!writing && screen === 'chart' && (
        <>
          <Chart
            marks={shownMarks}
            links={shownLinks}
            drift={cutoff === Infinity ? drift : []}
            selected={selected?.id ?? null}
            connectFrom={connectFrom}
            view={view}
            here={here}
            hint={marks.length ? 'A thought, a question, a link' : 'Type one sentence. See what it becomes.'}
            onView={setView}
            onSize={setSize}
            onSelect={onSelect}
            onMove={(id, x, y, done) => { patch(id, { x, y }, false); if (done) flush(); }}
            onWater={onWater}
            onCapture={(text, at) => { setHere(null); const m = add(text, at); setSaid(`On the chart: ${titleOf(m, 60)}`); }}
            onCancelHere={() => setHere(null)}
            onTakeDrift={takeDrift}
          />

          <div className="s-helm">
            {slip && (
              <aside ref={slipRef} className="s-slip" aria-label={slip.kind === 'heading' ? 'A heading' : slip.kind === 'echo' ? 'Something of yours came back' : 'Where you left off'} tabIndex={-1}>
                <p role="status">{slip.text}</p>
                <div>
                  {slip.kind === 'heading' && <button type="button" className="s-button" onClick={() => keepHeading(slip)}>Keep it</button>}
                  {slip.kind === 'heading' && <button type="button" className="s-text-button" onClick={spin}>Another</button>}
                  {slip.kind === 'echo' && <button type="button" className="s-button" onClick={() => { setSlip(null); goTo(slip.mark); }}>Go to it</button>}
                  {slip.kind === 'continue' && <button type="button" className="s-button" onClick={() => goAshore(slip.mark)}>Continue</button>}
                  <button type="button" className="s-text-button" onClick={() => { setSlip(null); if (slip.kind === 'continue') persist((s) => s.setMeta('lastAshore', null)); }}>Let it go</button>
                </div>
              </aside>
            )}
            <div className="s-controls">
              <button type="button" className="s-compass" onClick={spin} aria-label="Give me a heading: something to think about">
                <Rose turn={turn} />
              </button>
              <button type="button" className="s-text-button s-zoom" aria-label="Closer" disabled={view.k >= MAX_ZOOM} onClick={() => setView((v) => ({ ...v, k: Math.min(MAX_ZOOM, v.k * 1.3) }))}>+</button>
              <button type="button" className="s-text-button s-zoom" aria-label="Farther" disabled={view.k <= MIN_ZOOM} onClick={() => setView((v) => ({ ...v, k: Math.max(MIN_ZOOM, v.k / 1.3) }))}>−</button>
              <button type="button" className="s-text-button" onClick={() => setView(fit(shownMarks, size))}>Whole chart</button>
              {tide && (
                <div className="s-tide">
                  <label htmlFor="s-tide">{cutoff === Infinity ? 'The chart today' : `As it was on ${new Date(cutoff).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}`}</label>
                  <input id="s-tide" type="range" min={0} max={1000} step={1} value={asOf} onChange={(e) => { select(null); setAsOf(Number(e.target.value)); }} />
                </div>
              )}
            </div>
          </div>

          {!durable && <p className="s-warning" role="alert">This browser refused storage, so nothing here will be kept after the tab closes.</p>}
          {durable && save === 'failed' && <p className="s-warning" role="alert">The last change could not be saved. Keep a copy from the log before leaving.</p>}

          {sel && (
            <Panel
              mark={sel}
              routes={links.flatMap((l) => { const o = l.a === sel.id ? byId(l.b) : l.b === sel.id ? byId(l.a) : undefined; return o ? [{ link: l, mark: o }] : []; })}
              others={marks.filter((m) => m.id !== sel.id)}
              connecting={connectFrom === sel.id}
              focusOnOpen={selected?.focus ?? false}
              onText={(text) => patch(sel.id, { text })}
              onKind={(kind) => patch(sel.id, { kind })}
              onWrite={() => goAshore(sel.id)}
              onDraw={() => setDrawing(sel.id)}
              onConnect={(on) => setConnectFrom(on ? sel.id : null)}
              onConnectTo={(id) => { connect(sel.id, id); setConnectFrom(null); setSaid('Connected.'); }}
              onDisconnect={disconnect}
              onGo={(id) => goTo(id)}
              onRelease={() => setReleasing(sel.id)}
              onRemove={() => remove(sel.id)}
              onClose={() => { const id = sel.id; select(null); document.querySelector<HTMLElement>(`[data-mark="${id}"]`)?.focus(); }}
            />
          )}
        </>
      )}

      {!writing && screen === 'log' && (
        <Log marks={marks} links={links} durable={durable} onOpen={(id) => goTo(id)} onWrite={goAshore} onExport={exportAll} onImport={(f) => void importFile(f)} />
      )}

      {writing && (
        <Ashore
          mark={writing}
          reach={reachOf(writing)}
          echoes={echoesFor(writing, marks, links)}
          save={save}
          durable={durable}
          onChange={(change) => patch(writing.id, change)}
          onBack={leaveAshore}
          onOpen={(id) => goTo(id)}
          onConnect={(id) => { connect(writing.id, id); setSaid('Connected.'); }}
          onDraw={() => setDrawing(writing.id)}
          onRelease={() => { flush(); setReleasing(writing.id); }}
          onRestore={(body) => { const kept = withDraft(writing, Date.now()); patch(writing.id, { body, drafts: kept.drafts }); }}
        />
      )}

      {drawn && (
        <Sketch title={titleOf(drawn, 60)} strokes={drawn.strokes ?? []} onChange={(strokes: Stroke[]) => patch(drawn.id, { strokes })} onClose={closeDrawing} />
      )}
      {letter && (
        <Release
          mark={letter}
          page={`${location.origin}/soundings/letter`}
          onReleased={() => patch(letter.id, { releasedAt: Date.now() }, false)}
          onPrivate={() => { patch(letter.id, { releasedAt: undefined }, false); setReleasing(null); }}
          onClose={() => { flush(); setReleasing(null); }}
        />
      )}

      <p className="s-vh" role="status">{said}</p>
      {toast && (
        <p className="s-toast" role="status">
          {toast.text}{' '}
          {toast.undo && <button type="button" className="s-text-button" onClick={() => { toast.undo!(); setToast(null); }}>Undo</button>}
        </p>
      )}
    </div>
  );
}
