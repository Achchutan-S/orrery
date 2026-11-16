// Small drawn pieces shared by the chart, the panel and the log: the chart symbols and the compass.
// Symbols follow nautical-chart convention where one exists: a position dot for a thought, a
// light (dot and magenta flare) for a question, an anchorage for a source, a flag for a release.
import type { Kind, Stroke } from './model.ts';

export function Glyph({ kind, released = false }: { kind: Kind; released?: boolean }) {
  return (
    <svg className="s-glyph" viewBox="-22 -22 44 44" width="44" height="44" aria-hidden="true" focusable="false">
      {kind === 'thought' && <><circle r="7" className="g-ring" /><circle r="2.6" className="g-dot" /></>}
      {kind === 'question' && <><path d="M0 0 L5 -19 Q0 -24 -5 -19 Z" className="g-flare" transform="rotate(32)" /><circle r="3.4" className="g-dot" /></>}
      {kind === 'source' && (
        <g className="g-line">
          <circle cy="-9" r="2.6" />
          <path d="M0 -6.4 V10 M-5 -2 H5 M-9 3 Q-8 10 0 10 Q8 10 9 3" />
        </g>
      )}
      {released && <path d="M9 -8 V-20 L18 -16.5 L9 -13" className="g-flag" />}
    </svg>
  );
}

const pointsOf = (s: Stroke) => (s.length === 2 ? [...s, ...s] : s).join(' ');

/** A drawing, small, beside its mark on the chart. */
export function Thumb({ strokes }: { strokes: readonly Stroke[] }) {
  return (
    <svg className="s-thumb" viewBox="0 0 1000 1000" width="56" height="56" aria-hidden="true" focusable="false">
      {strokes.map((s, i) => <polyline key={i} points={pointsOf(s)} />)}
    </svg>
  );
}

/** The compass rose. The needle turns to `turn` degrees; the transition is the experience's stylesheet's. */
export function Rose({ turn }: { turn: number }) {
  const ticks = Array.from({ length: 32 }, (_, i) => i);
  return (
    <svg className="s-rose" viewBox="-30 -30 60 60" width="60" height="60" aria-hidden="true" focusable="false">
      <circle r="27" className="r-ring" />
      {ticks.map((i) => <path key={i} d={i % 4 === 0 ? 'M0 -27 V-21' : 'M0 -27 V-24'} transform={`rotate(${i * 11.25})`} className="r-tick" />)}
      <g className="r-needle" style={{ transform: `rotate(${turn}deg)` }}>
        <path d="M0 -19 L4.5 0 H-4.5 Z" className="r-north" />
        <path d="M0 19 L4.5 0 H-4.5 Z" className="r-south" />
      </g>
      <circle r="1.6" className="r-pin" />
    </svg>
  );
}
