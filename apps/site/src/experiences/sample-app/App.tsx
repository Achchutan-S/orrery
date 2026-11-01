import { useEffect, useRef } from 'react';
import { ENVIRONMENTS, STATES, type AccessKind, type StateFacts } from './lifecycles.ts';
import { Link, useRouter, type Location, type Navigate } from './router.tsx';
import { BASE, NOT_FOUND_TITLE, views } from './views.ts';

type Props = {
  /** The prerendered view's path, e.g. 'states/draft'. */
  path: string;
  facts: StateFacts[];
  /** Build flag `inspector`: on in preview, off in production. Not a secret. */
  inspector: boolean;
};

export default function App({ path, facts, inspector }: Props) {
  const [loc, navigate] = useRouter(BASE, { path, search: '' });
  const view = views.find((v) => v.path === loc.path);
  const access: AccessKind = new URLSearchParams(loc.search).get('access') === 'owner' ? 'owner' : 'public';
  const heading = useRef<HTMLHeadingElement>(null);
  const firstRender = useRef(true);

  // After an in-app navigation: update the title and move focus to the new heading,
  // so screen readers announce the change a full page load would have announced.
  useEffect(() => {
    if (firstRender.current) { firstRender.current = false; return; }
    document.title = view?.title ?? NOT_FOUND_TITLE;
    heading.current?.focus();
  }, [loc.path]);

  const link = (to: string) => ({ base: BASE, to, navigate });
  const selected = loc.path.startsWith('states/') ? loc.path.slice('states/'.length) : null;
  const fact = facts.find((f) => f.state === selected);

  return (
    <div className="explorer">
      <nav aria-label="Lifecycle states">
        <ul role="list">
          <li><Link {...link('states')} aria-current={loc.path === 'states' ? 'page' : undefined}>All states</Link></li>
          {STATES.map((s) => (
            <li key={s}><Link {...link(`states/${s}`)} aria-current={selected === s ? 'page' : undefined}>{s}</Link></li>
          ))}
        </ul>
      </nav>

      <div className="view">
        {!view ? (
          <>
            <h1 ref={heading} tabIndex={-1}>No such view</h1>
            <p>This explorer has no view at <code>{loc.path}</code>. <Link {...link('states')}>See all states</Link>.</p>
          </>
        ) : !fact ? (
          <>
            <h1 ref={heading} tabIndex={-1}>Lifecycle states</h1>
            <p>Where an experience is built, by lifecycle state, for the selected access.</p>
            <AccessSwitch loc={loc} access={access} navigate={navigate} />
            <BuiltTable rows={facts} access={access} navigate={navigate} search={loc.search} />
          </>
        ) : (
          <>
            <h1 ref={heading} tabIndex={-1} className="state-name">{fact.state}</h1>
            <p>{fact.meaning} {fact.channel ? `Release channel: ${fact.channel}.` : 'No release channel.'}</p>
            <h2>Can move to</h2>
            {fact.next.length === 0 ? <p>Nothing. Archived is final.</p> : (
              <ul role="list" className="next">
                {fact.next.map((n) => <li key={n}><Link {...link(`states/${n}${loc.search}`)}>{n}</Link></li>)}
              </ul>
            )}
            <h2>Where it is built</h2>
            <AccessSwitch loc={loc} access={access} navigate={navigate} />
            <BuiltTable rows={[fact]} access={access} navigate={navigate} search={loc.search} />
          </>
        )}
      </div>

      {inspector && (
        <aside className="inspector" aria-label="Inspector" data-pu-flag="sample-app:inspector">
          <h2>Inspector</h2>
          <dl>
            <dt>Path</dt><dd><code>{loc.path || '(none)'}</code></dd>
            <dt>Query</dt><dd><code>{loc.search || '(none)'}</code></dd>
            <dt>Access</dt><dd>{access}</dd>
          </dl>
        </aside>
      )}
    </div>
  );
}

function AccessSwitch({ loc, access, navigate }: { loc: Location; access: AccessKind; navigate: Navigate }) {
  return (
    <p className="access">
      Access:{' '}
      {(['public', 'owner'] as const).map((kind, i) => (
        <span key={kind}>
          {i > 0 && ' or '}
          <Link base={BASE} navigate={navigate} to={kind === 'public' ? loc.path : `${loc.path}?access=owner`}
            aria-current={access === kind ? 'true' : undefined}>{kind}</Link>
        </span>
      ))}
    </p>
  );
}

function BuiltTable({ rows, access, navigate, search }: { rows: StateFacts[]; access: AccessKind; navigate: Navigate; search: string }) {
  // A focusable, labelled region so keyboard users can scroll the table on narrow screens.
  return (
    <div className="table-scroll" role="region" aria-label="Where it is built" tabIndex={0}>
    <table>
      <caption>Built in each environment with {access} access (Phases 0–3)</caption>
      <thead>
        <tr><th scope="col">State</th>{ENVIRONMENTS.map((e) => <th scope="col" key={e}>{e}</th>)}</tr>
      </thead>
      <tbody>
        {rows.map((r) => (
          <tr key={r.state}>
            <th scope="row"><Link base={BASE} navigate={navigate} to={`states/${r.state}${search}`}>{r.state}</Link></th>
            {ENVIRONMENTS.map((e) => <td key={e}>{r.built[access][e] ? 'Built' : 'Not built'}</td>)}
          </tr>
        ))}
      </tbody>
    </table>
    </div>
  );
}
