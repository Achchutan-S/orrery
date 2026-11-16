// The table: piles of paper you can pick up, push around and drop on each other. Every pile is a
// real button, so the keyboard does everything a hand does: Enter picks one up, arrows push it.
import { useRef, useState, type CSSProperties, type KeyboardEvent as ReactKeyboardEvent, type PointerEvent as ReactPointerEvent } from 'react';
import { titleOf, wordCount, type Pile } from './model.ts';
import { Clip, Face, Marks } from './parts.tsx';

interface Props {
  piles: Pile[];
  /** A scrap just found again in the drawer: it gets a wiggle so the eye lands on it. */
  found: string | null;
  onOpen(pile: Pile): void;
  onMove(pile: Pile, x: number, y: number, done: boolean): void;
  onDrop(dragged: Pile, onto: Pile): void;
  /** A picture file dropped onto the table from outside the page. */
  onPicture(file: File): void;
}

const clamp = (n: number) => Math.min(1, Math.max(0, n));

export function Table({ piles, found, onOpen, onMove, onDrop, onPicture }: Props) {
  const root = useRef<HTMLUListElement>(null);
  // Scraps that arrive after the table was first laid drop onto it.
  const known = useRef<Set<string> | null>(null);
  const fresh = useRef(new Set<string>());
  if (known.current === null) known.current = new Set(piles.flatMap((p) => p.all.map((s) => s.id)));
  for (const p of piles) for (const s of p.all) if (!known.current.has(s.id)) { known.current.add(s.id); fresh.current.add(s.id); }

  const held = useRef<{ pile: Pile; sx: number; sy: number; x: number; y: number; w: number; h: number; moved: boolean } | null>(null);
  const suppressClick = useRef(false);
  // What the hand is doing, for the eye: which pile is in the air, which one it is over, which was just put down.
  const [air, setAir] = useState<{ id: string; over?: string } | null>(null);
  const [settled, setSettled] = useState<string | null>(null);
  const under = (e: ReactPointerEvent, mine: string) => document.elementsFromPoint(e.clientX, e.clientY).map((el) => el.closest<HTMLElement>('[data-pile]')?.dataset.pile).find((id) => id && id !== mine);

  const down = (e: ReactPointerEvent<HTMLButtonElement>, pile: Pile) => {
    if (e.button !== 0) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    const table = root.current!.getBoundingClientRect();
    const me = e.currentTarget.parentElement!.getBoundingClientRect();
    held.current = { pile, sx: e.clientX, sy: e.clientY, x: pile.top.x, y: pile.top.y, w: Math.max(1, table.width - me.width), h: Math.max(1, table.height - me.height), moved: false };
  };
  const at = (e: ReactPointerEvent, h: NonNullable<typeof held.current>) => {
    return { x: clamp(h.x + (e.clientX - h.sx) / h.w), y: clamp(h.y + (e.clientY - h.sy) / h.h) };
  };
  const move = (e: ReactPointerEvent<HTMLButtonElement>) => {
    const h = held.current;
    if (!h) return;
    if (!h.moved && Math.hypot(e.clientX - h.sx, e.clientY - h.sy) < 6) return;
    h.moved = true;
    const p = at(e, h);
    onMove(h.pile, p.x, p.y, false);
    const over = under(e, h.pile.top.id);
    if (air?.id !== h.pile.top.id || air.over !== over) setAir({ id: h.pile.top.id, over });
  };
  const up = (e: ReactPointerEvent<HTMLButtonElement>) => {
    const h = held.current;
    held.current = null;
    setAir(null);
    if (!h?.moved) return;
    setSettled(h.pile.top.id);
    // The click that follows a drag is not a pick-up. It may arrive a moment after this handler, so
    // the flag is cleared by the click itself (or shortly after, if no click comes).
    suppressClick.current = true;
    setTimeout(() => { suppressClick.current = false; }, 400);
    const p = at(e, h);
    onMove(h.pile, p.x, p.y, true);
    // Dropped on another pile: the two are clipped together.
    const below = under(e, h.pile.top.id);
    const onto = piles.find((k) => k.top.id === below);
    if (onto) onDrop(h.pile, onto);
  };
  const key = (e: ReactKeyboardEvent<HTMLButtonElement>, pile: Pile) => {
    const dir = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[e.key];
    if (!dir) return;
    e.preventDefault();
    onMove(pile, clamp(pile.top.x + dir[0]! * 0.04), clamp(pile.top.y + dir[1]! * 0.04), true);
  };

  return (
    <ul
      ref={root}
      className="k-table"
      aria-label="Your table"
      onDragOver={(e) => { if (e.dataTransfer.types.includes('Files')) e.preventDefault(); }}
      onDrop={(e) => { const f = [...e.dataTransfer.files].find((k) => k.type.startsWith('image/')); if (f) { e.preventDefault(); onPicture(f); } }}
    >
      {[...piles.keys()].sort((a, b) => piles[a]!.top.createdAt - piles[b]!.top.createdAt || (piles[a]!.top.id < piles[b]!.top.id ? -1 : 1)).map((rank) => {
        const pile = piles[rank]!;
        const s = pile.top;
        const words = wordCount(s.body);
        const label = `${titleOf(s, 80)}${pile.all.length > 1 ? `, clipped with ${pile.all.length - 1} more` : ''}${words ? `, ${words} words on the back` : ''}${s.sentAt ? ', sent' : ''}${s.from ? `, from ${s.from}` : ''}${s.starred ? ', starred' : ''}${s.taped ? ', taped down' : ''}`;
        return (
          <li
            key={s.id}
            className={`k-at${fresh.current.has(s.id) ? ' is-new' : ''}${found === s.id ? ' is-found' : ''}${air?.id === s.id ? ' is-air' : ''}${air?.over === s.id ? ' is-target' : ''}${settled === s.id ? ' is-settling' : ''}`}
            style={{ '--x': s.x, '--y': s.y, '--z': rank + 1 } as CSSProperties}
            onAnimationEnd={() => { fresh.current.delete(s.id); if (settled === s.id) setSettled(null); }}
          >
            <button
              type="button"
              className={`k-scrap${pile.all.length > 1 ? ' is-pile' : ''}`}
              data-pile={s.id}
              style={{ '--r': `${s.rot}deg`, '--s': s.scale === 1 ? 1.35 : s.scale === -1 ? 0.72 : 1 } as CSSProperties}
              aria-label={label}
              onPointerDown={(e) => down(e, pile)}
              onPointerMove={move}
              onPointerUp={up}
              onPointerCancel={up}
              onKeyDown={(e) => key(e, pile)}
              onClick={(e) => { if (suppressClick.current && e.detail > 0) { suppressClick.current = false; return; } onOpen(pile); }}
            >
              <Face scrap={s} />
              {pile.all.length > 1 && <Clip />}
              <Marks scrap={s} />
            </button>
          </li>
        );
      })}
    </ul>
  );
}
