// The drawing pad: a modal sheet of paper. Strokes are kept as points in a 0–1000 square, so
// a drawing is a few hundred numbers that scale to any size and travel inside a letter link.
import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import type { Stroke } from './model.ts';

interface Props {
  title: string;
  strokes: Stroke[];
  onChange(strokes: Stroke[]): void;
  onClose(): void;
}

export function Sketch({ title, strokes, onChange, onClose }: Props) {
  const dialog = useRef<HTMLDialogElement>(null);
  const svg = useRef<SVGSVGElement>(null);
  const [live, setLive] = useState<Stroke | null>(null);
  const liveRef = useRef<Stroke | null>(null);

  useEffect(() => {
    const d = dialog.current!;
    if (!d.open) d.showModal();
  }, []);

  const at = (e: ReactPointerEvent): [number, number] => {
    const r = svg.current!.getBoundingClientRect();
    const clamp = (n: number) => Math.round(Math.min(1000, Math.max(0, n)));
    return [clamp(((e.clientX - r.left) / r.width) * 1000), clamp(((e.clientY - r.top) / r.height) * 1000)];
  };
  const down = (e: ReactPointerEvent<SVGSVGElement>) => {
    if (e.button !== 0) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    liveRef.current = at(e);
    setLive(liveRef.current);
  };
  const move = (e: ReactPointerEvent<SVGSVGElement>) => {
    const s = liveRef.current;
    if (!s) return;
    const [x, y] = at(e);
    if (Math.hypot(x - s.at(-2)!, y - s.at(-1)!) < 5) return;
    liveRef.current = [...s, x, y];
    setLive(liveRef.current);
  };
  const up = () => {
    const s = liveRef.current;
    liveRef.current = null;
    setLive(null);
    if (s) onChange([...strokes, s]);
  };
  const points = (s: Stroke) => (s.length === 2 ? [...s, ...s] : s).join(' ');

  return (
    <dialog ref={dialog} className="k-sketch" aria-label={`A doodle for ${title}`} onClose={onClose}>
      <div className="k-sketch-bar">
        <p>Draw with a finger, a pen or the mouse.</p>
        <button type="button" className="k-text-button" disabled={!strokes.length} onClick={() => onChange(strokes.slice(0, -1))}>Undo stroke</button>
        <button type="button" className="k-text-button" disabled={!strokes.length} onClick={() => onChange([])}>Clear</button>
        <button type="button" className="k-button" onClick={() => dialog.current?.close()}>Done</button>
      </div>
      <svg
        ref={svg}
        className="k-pad"
        viewBox="0 0 1000 1000"
        role="img"
        aria-label={strokes.length ? `A drawing of ${strokes.length} ${strokes.length === 1 ? 'stroke' : 'strokes'}` : 'An empty drawing'}
        onPointerDown={down}
        onPointerMove={move}
        onPointerUp={up}
        onPointerCancel={up}
      >
        {strokes.map((s, i) => <polyline key={i} points={points(s)} />)}
        {live && <polyline points={points(live)} />}
      </svg>
    </dialog>
  );
}
