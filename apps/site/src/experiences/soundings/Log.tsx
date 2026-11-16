// The log: everything on the chart as a list in time, newest first. It is the way to find
// something by its words, the way back through months of marks, and the chart's equal for
// anyone who would rather not navigate a picture. Copies in and out live here too.
import { useMemo, useRef, useState } from 'react';
import { isWritten, neighbours, titleOf, wordCount, type Link, type Mark } from './model.ts';
import { Glyph } from './parts.tsx';

type Filter = 'all' | 'question' | 'written' | 'released';
const FILTERS: [Filter, string][] = [['all', 'Everything'], ['question', 'Questions'], ['written', 'Written at length'], ['released', 'Released']];

interface Props {
  marks: Mark[];
  links: Link[];
  durable: boolean;
  onOpen(id: string): void;
  onWrite(id: string): void;
  onExport(): void;
  onImport(file: File): void;
}

const day = (t: number) => new Date(t).toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

export function Log({ marks, links, durable, onOpen, onWrite, onExport, onImport }: Props) {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const file = useRef<HTMLInputElement>(null);

  const days = useMemo(() => {
    const q = query.trim().toLowerCase();
    const shown = marks
      .filter((m) => filter === 'all' || (filter === 'question' ? m.kind === 'question' : filter === 'written' ? isWritten(m) : Boolean(m.releasedAt)))
      .filter((m) => !q || `${m.text}\n${m.body}`.toLowerCase().includes(q))
      .sort((a, b) => b.createdAt - a.createdAt);
    const out: { day: string; marks: Mark[] }[] = [];
    for (const m of shown) {
      const d = day(m.createdAt);
      if (out.at(-1)?.day === d) out.at(-1)!.marks.push(m); else out.push({ day: d, marks: [m] });
    }
    return { out, count: shown.length };
  }, [marks, query, filter]);

  return (
    <div className="s-log">
      <div className="s-log-in">
        <div className="s-log-find">
          <label htmlFor="s-find">Find in your chart</label>
          <input id="s-find" type="search" value={query} onChange={(e) => setQuery(e.target.value)} autoComplete="off" />
          <div className="s-filters" role="group" aria-label="Show">
            {FILTERS.map(([f, name]) => (
              <button key={f} type="button" className="s-text-button" aria-pressed={filter === f} onClick={() => setFilter(f)}>{name}</button>
            ))}
          </div>
        </div>

        <p className="s-quiet" role="status">
          {marks.length === 0 ? 'Nothing on the chart yet. The first thing you type starts the log.'
            : days.count === 0 ? 'Nothing matches. Try fewer words, or show everything.'
            : `${days.count} ${days.count === 1 ? 'mark' : 'marks'}`}
        </p>

        {days.out.map((d) => (
          <section key={d.day} className="s-day">
            <h2>{d.day}</h2>
            <ul>
              {d.marks.map((m) => {
                const words = wordCount(m.body);
                const routes = neighbours(links, m.id).length;
                const facts = [words ? `${words} words` : '', m.strokes?.length ? 'drawing' : '', routes ? `${routes} ${routes === 1 ? 'route' : 'routes'}` : '', m.releasedAt ? 'released' : ''].filter(Boolean);
                return (
                  <li key={m.id} className={`s-entry s-mark--${m.kind}${isWritten(m) ? ' is-written' : ''}`}>
                    <Glyph kind={m.kind} released={Boolean(m.releasedAt)} />
                    <div>
                      <p className="s-entry-text">{titleOf(m, 220)}</p>
                      {facts.length > 0 && <p className="s-quiet">{facts.join(', ')}</p>}
                    </div>
                    <div className="s-entry-do">
                      <button type="button" className="s-text-button" onClick={() => onOpen(m.id)}>Show on chart<span className="s-vh">: {titleOf(m, 40)}</span></button>
                      <button type="button" className="s-text-button" onClick={() => onWrite(m.id)}>{isWritten(m) ? 'Continue' : 'Write'}<span className="s-vh">: {titleOf(m, 40)}</span></button>
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>
        ))}

        <section className="s-keeping">
          <h2>Where this is kept</h2>
          <p>
            {durable
              ? 'Your chart is stored in this browser, on this device, and nowhere else. Nobody else can read it, and clearing this site’s data erases it. Keep a copy now and then.'
              : 'This browser refused storage (a private window often does), so this chart will be gone when the tab closes. Keep a copy before you leave.'}
          </p>
          <p>
            <button type="button" className="s-button" onClick={onExport} disabled={!marks.length}>Keep a copy</button>{' '}
            <button type="button" className="s-button" onClick={() => file.current?.click()}>Bring in a copy</button>
            <input
              ref={file}
              type="file"
              accept="application/json,.json"
              hidden
              aria-label="A Soundings copy to bring in"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) onImport(f); e.target.value = ''; }}
            />
          </p>
        </section>
      </div>
    </div>
  );
}
