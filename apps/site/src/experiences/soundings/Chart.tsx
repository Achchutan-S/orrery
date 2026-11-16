// The chart: a canvas that draws the sea, the land the marks make and the routes between them,
// under a layer of real buttons (one per mark) so everything on it is reachable by keyboard.
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type KeyboardEvent as ReactKeyboardEvent, type PointerEvent as ReactPointerEvent } from 'react';
import { isWritten, massOf, neighbours, titleOf, wordCount, type Link, type Mark } from './model.ts';
import { COAST, DEPTHS, SHOAL, heightsUpTo, level, sample, type Bump } from './terrain.ts';
import { Glyph, Thumb } from './parts.tsx';

export interface View {
  x: number;
  y: number;
  k: number;
}
export interface Point {
  x: number;
  y: number;
}
export interface Drift extends Point {
  id: string;
  text: string;
}

export const MIN_ZOOM = 0.35;
export const MAX_ZOOM = 2.5;
const clampZoom = (k: number) => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, k));
const RISE_MS = 900;

interface Props {
  marks: Mark[];
  links: Link[];
  drift: Drift[];
  selected: string | null;
  connectFrom: string | null;
  view: View;
  here: Point | null;
  hint: string;
  onView(view: View): void;
  onSize(size: { w: number; h: number }): void;
  onSelect(id: string): void;
  onMove(id: string, x: number, y: number, done: boolean): void;
  onWater(p: Point): void;
  onCapture(text: string, at: Point): void;
  onCancelHere(): void;
  onTakeDrift(d: Drift): void;
}

export function Chart({ marks, links, drift, selected, connectFrom, view, here, hint, onView, onSize, onSelect, onMove, onWater, onCapture, onCancelHere, onTakeDrift }: Props) {
  const wrap = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  const [scheme, setScheme] = useState(0);
  const viewRef = useRef(view);
  viewRef.current = view;

  // Marks that appeared after the chart was first drawn rise out of the water.
  const known = useRef<Set<string> | null>(null);
  const rising = useRef(new Map<string, number>());
  const [, tick] = useState(0);
  if (known.current === null && size.w) known.current = new Set(marks.map((m) => m.id));
  if (known.current) {
    for (const m of marks) {
      if (!known.current.has(m.id)) { known.current.add(m.id); rising.current.set(m.id, performance.now()); }
    }
  }

  useLayoutEffect(() => {
    const el = wrap.current!;
    const ro = new ResizeObserver(() => {
      const next = { w: el.clientWidth, h: el.clientHeight };
      setSize(next);
      onSize(next);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [onSize]);

  useEffect(() => {
    const mq = matchMedia('(prefers-color-scheme: dark)');
    const fc = matchMedia('(forced-colors: active)');
    const bump = () => setScheme((n) => n + 1);
    mq.addEventListener('change', bump);
    fc.addEventListener('change', bump);
    return () => { mq.removeEventListener('change', bump); fc.removeEventListener('change', bump); };
  }, []);

  const degree = useMemo(() => {
    const d = new Map<string, number>();
    for (const l of links) { d.set(l.a, (d.get(l.a) ?? 0) + 1); d.set(l.b, (d.get(l.b) ?? 0) + 1); }
    return d;
  }, [links]);

  // --- Drawing ---------------------------------------------------------------------------
  useEffect(() => {
    const cv = canvas.current!;
    const { w, h } = size;
    if (!w || !h) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    if (cv.width !== Math.round(w * dpr) || cv.height !== Math.round(h * dpr)) { cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr); }
    const ctx = cv.getContext('2d')!;
    const css = getComputedStyle(cv);
    const ink = (name: string) => css.getPropertyValue(name).trim();
    const still = matchMedia('(prefers-reduced-motion: reduce)').matches;

    let frame = 0;
    const draw = () => {
      const now = performance.now();
      const { x, y, k } = view;
      const left = x - w / 2 / k;
      const top = y - h / 2 / k;
      // Cells are a fixed size in chart units per zoom octave, and aligned to the chart, so coasts hold still while panning.
      const cell = 6 * 2 ** Math.round(-Math.log2(k));
      const x0 = Math.floor(left / cell) * cell;
      const y0 = Math.floor(top / cell) * cell;

      let animating = false;
      let peak = 0;
      const bumps: Bump[] = marks.map((m) => {
        const mass = massOf(m, degree.get(m.id) ?? 0);
        const start = rising.current.get(m.id);
        let grow = 1;
        if (start !== undefined) {
          const t = still ? 1 : Math.min(1, (now - start) / RISE_MS);
          grow = 1 - (1 - t) ** 3;
          if (t >= 1) rising.current.delete(m.id); else animating = true;
        }
        peak = Math.max(peak, mass.height * 1.4);
        return { x: m.x, y: m.y, sigma: mass.sigma * (0.55 + 0.45 * grow), height: mass.height * grow };
      });
      const field = sample(bumps, x0, y0, w / k + cell, h / k + cell, cell);

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.fillStyle = ink('--s-sea');
      ctx.fillRect(0, 0, w, h);
      ctx.setTransform(dpr * k, 0, 0, dpr * k, dpr * (w / 2 - x * k), dpr * (h / 2 - y * k));
      const px = 1 / k;

      // The graticule: a fixed grid in chart units, so there is something to measure movement against.
      ctx.beginPath();
      const step = 240;
      for (let gx = Math.floor(left / step) * step; gx < left + w / k; gx += step) { ctx.moveTo(gx, top); ctx.lineTo(gx, top + h / k); }
      for (let gy = Math.floor(top / step) * step; gy < top + h / k; gy += step) { ctx.moveTo(left, gy); ctx.lineTo(left + w / k, gy); }
      ctx.strokeStyle = ink('--s-grid');
      ctx.lineWidth = px;
      ctx.stroke();

      const fill = (threshold: number, colour: string) => {
        const { fills, lines } = level(field, threshold, true);
        ctx.beginPath();
        for (const p of fills) {
          ctx.moveTo(p[0]!, p[1]!);
          for (let i = 2; i < p.length; i += 2) ctx.lineTo(p[i]!, p[i + 1]!);
          ctx.closePath();
        }
        ctx.fillStyle = colour;
        ctx.fill();
        return lines;
      };
      const stroke = (lines: number[], colour: string, width: number) => {
        ctx.beginPath();
        for (let i = 0; i < lines.length; i += 4) { ctx.moveTo(lines[i]!, lines[i + 1]!); ctx.lineTo(lines[i + 2]!, lines[i + 3]!); }
        ctx.strokeStyle = colour;
        ctx.lineWidth = width * px;
        ctx.lineCap = 'round';
        ctx.stroke();
      };

      for (const d of DEPTHS) stroke(level(field, d, false).lines, ink('--s-depth'), 0.8);
      stroke(fill(SHOAL, ink('--s-shoal')), ink('--s-depth'), 0.8);
      const coast = fill(COAST, ink('--s-land'));
      for (const hgt of heightsUpTo(peak)) stroke(level(field, hgt, false).lines, ink('--s-contour'), 0.8);
      stroke(coast, ink('--s-coast'), 1.4);

      // Routes: dashed, slightly bowed, in the magenta charts keep for things people added.
      const at = new Map(marks.map((m) => [m.id, m]));
      ctx.setLineDash([7 * px, 5 * px]);
      ctx.beginPath();
      for (const l of links) {
        const a = at.get(l.a);
        const b = at.get(l.b);
        if (!a || !b) continue;
        const mx = (a.x + b.x) / 2 - (b.y - a.y) * 0.1;
        const my = (a.y + b.y) / 2 + (b.x - a.x) * 0.1;
        ctx.moveTo(a.x, a.y);
        ctx.quadraticCurveTo(mx, my, b.x, b.y);
      }
      ctx.strokeStyle = ink('--s-route');
      ctx.lineWidth = 1.5 * px;
      ctx.stroke();
      ctx.setLineDash([]);

      if (animating) frame = requestAnimationFrame(draw);
    };
    draw();
    return () => cancelAnimationFrame(frame);
  });
  // A new mark needs one more render after its rise ends, so the map of rising marks is cleared; harmless otherwise.
  useEffect(() => {
    if (!rising.current.size) return;
    const t = setTimeout(() => tick((n) => n + 1), RISE_MS + 50);
    return () => clearTimeout(t);
  });

  // --- Moving around --------------------------------------------------------------------
  const toChart = useCallback((clientX: number, clientY: number): Point => {
    const r = wrap.current!.getBoundingClientRect();
    const v = viewRef.current;
    return { x: v.x + (clientX - r.left - r.width / 2) / v.k, y: v.y + (clientY - r.top - r.height / 2) / v.k };
  }, []);

  const zoomAt = useCallback((factor: number, clientX: number, clientY: number) => {
    const v = viewRef.current;
    const k = clampZoom(v.k * factor);
    const p = toChart(clientX, clientY);
    const r = wrap.current!.getBoundingClientRect();
    // Keep the chart point under the pointer where it is.
    onView({ k, x: p.x - (clientX - r.left - r.width / 2) / k, y: p.y - (clientY - r.top - r.height / 2) / k });
  }, [onView, toChart]);

  useEffect(() => {
    const el = wrap.current!;
    const wheel = (e: WheelEvent) => {
      if ((e.target as HTMLElement).closest('textarea')) return;
      e.preventDefault();
      const mouseWheel = e.deltaX === 0 && Number.isInteger(e.deltaY) && Math.abs(e.deltaY) >= 40;
      if (e.ctrlKey || e.metaKey || mouseWheel) zoomAt(Math.exp(-e.deltaY * (e.ctrlKey ? 0.012 : 0.0022)), e.clientX, e.clientY);
      else { const v = viewRef.current; onView({ ...v, x: v.x + e.deltaX / v.k, y: v.y + e.deltaY / v.k }); }
    };
    el.addEventListener('wheel', wheel, { passive: false });
    return () => el.removeEventListener('wheel', wheel);
  }, [onView, zoomAt]);

  const pointers = useRef(new Map<number, Point>());
  const gesture = useRef<{ sx: number; sy: number; vx: number; vy: number; moved: boolean; pinch?: { dist: number; k: number } } | null>(null);

  const seaDown = (e: ReactPointerEvent<HTMLCanvasElement>) => {
    if (e.button !== 0) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const v = viewRef.current;
    const pts = [...pointers.current.values()];
    gesture.current = { sx: e.clientX, sy: e.clientY, vx: v.x, vy: v.y, moved: pts.length > 1 };
    if (pts.length === 2) gesture.current.pinch = { dist: Math.hypot(pts[0]!.x - pts[1]!.x, pts[0]!.y - pts[1]!.y), k: v.k };
  };
  const seaMove = (e: ReactPointerEvent<HTMLCanvasElement>) => {
    const g = gesture.current;
    if (!g || !pointers.current.has(e.pointerId)) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const pts = [...pointers.current.values()];
    if (g.pinch && pts.length === 2) {
      const dist = Math.hypot(pts[0]!.x - pts[1]!.x, pts[0]!.y - pts[1]!.y);
      zoomAt((g.pinch.k * dist) / g.pinch.dist / viewRef.current.k, (pts[0]!.x + pts[1]!.x) / 2, (pts[0]!.y + pts[1]!.y) / 2);
      return;
    }
    const dx = e.clientX - g.sx;
    const dy = e.clientY - g.sy;
    if (!g.moved && Math.hypot(dx, dy) < 5) return;
    g.moved = true;
    const k = viewRef.current.k;
    onView({ k, x: g.vx - dx / k, y: g.vy - dy / k });
  };
  const seaUp = (e: ReactPointerEvent<HTMLCanvasElement>) => {
    const g = gesture.current;
    pointers.current.delete(e.pointerId);
    if (pointers.current.size) return;
    gesture.current = null;
    if (g && !g.moved && e.type === 'pointerup') onWater(toChart(e.clientX, e.clientY));
  };

  // --- Marks: drag to move, arrows to travel between them, Alt and arrows to nudge ----------
  const held = useRef<{ id: string; sx: number; sy: number; mx: number; my: number; moved: boolean } | null>(null);
  const suppressClick = useRef(false);
  const markDown = (e: ReactPointerEvent<HTMLButtonElement>, m: Mark) => {
    if (e.button !== 0) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    held.current = { id: m.id, sx: e.clientX, sy: e.clientY, mx: m.x, my: m.y, moved: false };
  };
  const markMove = (e: ReactPointerEvent<HTMLButtonElement>) => {
    const hd = held.current;
    if (!hd) return;
    const dx = e.clientX - hd.sx;
    const dy = e.clientY - hd.sy;
    if (!hd.moved && Math.hypot(dx, dy) < 6) return;
    hd.moved = true;
    onMove(hd.id, hd.mx + dx / viewRef.current.k, hd.my + dy / viewRef.current.k, false);
  };
  const markUp = (e: ReactPointerEvent<HTMLButtonElement>) => {
    const hd = held.current;
    held.current = null;
    if (!hd?.moved) return;
    suppressClick.current = true;
    setTimeout(() => { suppressClick.current = false; }, 0);
    onMove(hd.id, hd.mx + (e.clientX - hd.sx) / viewRef.current.k, hd.my + (e.clientY - hd.sy) / viewRef.current.k, true);
  };
  const markKey = (e: ReactKeyboardEvent<HTMLButtonElement>, m: Mark) => {
    const dir = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[e.key];
    if (!dir) return;
    e.preventDefault();
    const [ux, uy] = dir as [number, number];
    if (e.altKey) { onMove(m.id, m.x + ux * 24, m.y + uy * 24, true); return; }
    // The nearest mark inside a quarter-turn cone in that direction.
    let best: Mark | undefined;
    let bestScore = Infinity;
    for (const o of marks) {
      if (o.id === m.id) continue;
      const dx = o.x - m.x;
      const dy = o.y - m.y;
      const along = dx * ux + dy * uy;
      const across = Math.abs(dx * uy - dy * ux);
      if (along <= 0 || across > along) continue;
      const score = along + across * 2;
      if (score < bestScore) { bestScore = score; best = o; }
    }
    if (best) wrap.current!.querySelector<HTMLElement>(`[data-mark="${best.id}"]`)?.focus();
  };
  // A mark focused by keyboard is brought into view.
  const markFocus = (m: Mark) => {
    const v = viewRef.current;
    const sx = (m.x - v.x) * v.k;
    const sy = (m.y - v.y) * v.k;
    if (Math.abs(sx) > size.w / 2 - 60 || Math.abs(sy) > size.h / 2 - 90) onView({ ...v, x: m.x, y: m.y });
  };

  const place = (p: Point) => ({ transform: `translate(${Math.round((p.x - view.x) * view.k + size.w / 2)}px, ${Math.round((p.y - view.y) * view.k + size.h / 2)}px)` });
  const far = view.k < 0.5;

  return (
    <div ref={wrap} className={`s-chart${far ? ' is-far' : ''}${connectFrom ? ' is-connecting' : ''}`} data-scheme={scheme}>
      <canvas ref={canvas} className="s-sea" aria-hidden="true" onPointerDown={seaDown} onPointerMove={seaMove} onPointerUp={seaUp} onPointerCancel={seaUp} />
      {size.w > 0 && (
        <>
          <ul className="s-drifts" aria-label="Questions adrift: choose one to keep it">
            {drift.filter((d) => !marks.some((m) => d.x > m.x - 150 && d.x < m.x + 300 && Math.abs(d.y - m.y) < 64)).map((d) => (
              <li key={d.id} className="s-drift" style={place(d)}>
                <button type="button" onClick={() => onTakeDrift(d)}>{d.text}</button>
              </li>
            ))}
          </ul>
          <ul className="s-marks" aria-label="Your chart">
            {marks.map((m) => {
              const n = neighbours(links, m.id).length;
              const words = wordCount(m.body);
              const kind = m.kind === 'source' ? 'Source' : m.kind === 'question' ? 'Question' : 'Thought';
              return (
                <li key={m.id} className="s-at" style={place(m)}>
                  <button
                    type="button"
                    data-mark={m.id}
                    className={`s-mark s-mark--${m.kind}${isWritten(m) ? ' is-written' : ''}${selected === m.id ? ' is-selected' : ''}${connectFrom === m.id ? ' is-origin' : ''}`}
                    aria-label={`${kind}: ${titleOf(m)}${words ? `. ${words} words` : ''}${m.strokes?.length ? '. Has a drawing' : ''}${n ? `. ${n} ${n === 1 ? 'route' : 'routes'}` : ''}${m.releasedAt ? '. Released' : ''}`}
                    aria-pressed={selected === m.id}
                    onPointerDown={(e) => markDown(e, m)}
                    onPointerMove={markMove}
                    onPointerUp={markUp}
                    onPointerCancel={markUp}
                    onKeyDown={(e) => markKey(e, m)}
                    onFocus={() => markFocus(m)}
                    onClick={() => { if (!suppressClick.current) onSelect(m.id); }}
                  >
                    <Glyph kind={m.kind} released={Boolean(m.releasedAt)} />
                    <span className="s-label">{titleOf(m, 44)}</span>
                    {m.strokes?.length ? <Thumb strokes={m.strokes} /> : null}
                  </button>
                </li>
              );
            })}
          </ul>
          {here && <Here key={`${here.x},${here.y}`} style={place(here)} hint={hint} onCapture={(t) => onCapture(t, here)} onCancel={onCancelHere} />}
        </>
      )}
    </div>
  );
}

/** A caret in open water: type, press Enter, and it is on the chart. Leaving it with text in it keeps the text. */
function Here({ style, hint, onCapture, onCancel }: { style: { transform: string }; hint: string; onCapture(text: string): void; onCancel(): void }) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const finished = useRef(false);
  useEffect(() => { ref.current?.focus({ preventScroll: true }); }, []);
  const finish = (keep: boolean) => {
    if (finished.current) return;
    finished.current = true;
    const text = ref.current?.value.trim() ?? '';
    if (keep && text) onCapture(text); else onCancel();
  };
  return (
    <div className="s-here" style={style}>
      <textarea
        ref={ref}
        rows={1}
        aria-label="A new mark at this place"
        placeholder={hint}
        onInput={(e) => { const t = e.currentTarget; t.style.height = 'auto'; t.style.height = `${t.scrollHeight}px`; }}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); finish(true); }
          if (e.key === 'Escape') { e.preventDefault(); finish(false); }
        }}
        onBlur={() => finish(true)}
      />
    </div>
  );
}
