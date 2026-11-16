// The drawn pieces: a scrap's front, and the three things that sit on the table to make with.
// The icons are flat cut-paper shapes, coloured by the stylesheet.
import { faceClass, hasBack, type Scrap, type Stroke } from './model.ts';

const pointsOf = (s: Stroke) => (s.length === 2 ? [...s, ...s] : s).join(' ');

/** A scrap's front. render.ts builds the same markup for the letter page. */
export function Face({ scrap }: { scrap: Scrap }) {
  return (
    <span className={`${faceClass(scrap)}${hasBack(scrap) ? ' has-back' : ''}${scrap.image ? ' has-pic' : ''}`}>
      {scrap.image && <img className="k-pic" src={scrap.image} alt="" draggable={false} />}
      {scrap.from && <span className="k-prompt k-from" data-from={scrap.from} />}
      {scrap.prompt && <span className="k-prompt">{scrap.prompt}</span>}
      {scrap.text.trim() && <span className="k-words">{scrap.text}</span>}
      {!scrap.text.trim() && !scrap.strokes?.length && !scrap.image && <span className="k-words k-blank">{hasBack(scrap) ? scrap.body.trim().split('\n')[0] : ''}</span>}
      {scrap.strokes?.length ? (
        <svg className="k-drawing" viewBox="0 0 1000 1000" aria-hidden="true" focusable="false">
          {scrap.strokes.map((s, i) => <polyline key={i} points={pointsOf(s)} />)}
        </svg>
      ) : null}
    </span>
  );
}

/** What is stuck on a scrap: a strip of tape if it is taped down, a gold star if it has one. */
export function Marks({ scrap }: { scrap: Scrap }) {
  return (
    <>
      {scrap.taped && <span className="k-tape" aria-hidden="true" />}
      {scrap.starred && (
        <svg className="k-star" viewBox="0 0 24 24" width="24" height="24" aria-hidden="true" focusable="false"><path d="M12 1 l3.2 7 l7.6 .8 l-5.7 5.1 l1.6 7.5 l-6.7 -3.9 l-6.7 3.9 l1.6 -7.5 l-5.7 -5.1 l7.6 -.8 z" /></svg>
      )}
    </>
  );
}

export function Photo() {
  return (
    <svg className="k-icon" viewBox="0 0 56 56" width="56" height="56" aria-hidden="true" focusable="false">
      <path className="i-a" d="M8 10 l40 -3 l3 40 l-40 3 z" />
      <path className="i-g" d="M13 14 l31 -2 l2 26 l-31 2 z" />
      <path className="i-b" d="M30 20 a4 4 0 1 0 8 0 a4 4 0 1 0 -8 0 z" />
      <path className="i-d" d="M15 38 l9 -13 l8 9 l5 -5 l8 8 z" />
    </svg>
  );
}

export function Clip() {
  return (
    <svg className="k-clip" viewBox="0 0 20 46" width="20" height="46" aria-hidden="true" focusable="false">
      <path d="M6 12 V34 a4 4 0 0 0 8 0 V8 a6 6 0 0 0 -12 0 V36" />
    </svg>
  );
}

export function Jar() {
  return (
    <svg className="k-icon" viewBox="0 0 56 56" width="56" height="56" aria-hidden="true" focusable="false">
      <path className="i-a" d="M14 20 h28 l3 30 h-34 z" />
      <path className="i-b" d="M12 14 h32 v7 h-32 z" />
      <path className="i-c" d="M20 12 l5 -9 l6 9 z M30 12 l8 -7 l1 7 z" />
      <path className="i-d" d="M21 30 l6 -4 l8 5 l-7 6 z" />
    </svg>
  );
}

export function Pencil() {
  return (
    <svg className="k-icon" viewBox="0 0 56 56" width="56" height="56" aria-hidden="true" focusable="false">
      <path className="i-b" d="M38 6 l12 12 l-26 26 l-12 -12 z" />
      <path className="i-a" d="M12 32 l12 12 l-18 6 z" />
      <path className="i-e" d="M6 50 l3 -9 l6 6 z" />
      <path className="i-c" d="M38 6 l4 -3 l11 11 l-3 4 z" />
    </svg>
  );
}

export function Sheet() {
  return (
    <svg className="k-icon" viewBox="0 0 56 56" width="56" height="56" aria-hidden="true" focusable="false">
      <path className="i-c" d="M10 12 l30 -4 l6 40 l-30 4 z" />
      <path className="i-a" d="M12 6 h32 v42 h-32 z" />
      <path className="i-f" d="M18 16 h20 M18 23 h20 M18 30 h13" />
    </svg>
  );
}
