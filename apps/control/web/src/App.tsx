import type { ReactNode } from 'react';
import { Callout, Link, PageHeading, Rev, usePath } from './components.tsx';
import { ExperienceDetail } from './Experience.tsx';
import { Overview } from './Overview.tsx';
import { Pending } from './Pending.tsx';
import { Registry } from './Registry.tsx';
import { Release } from './Release.tsx';
import { useControl } from './state.tsx';

const NAV = [
  { to: '/', label: 'Overview', match: (p: string) => p === '/' },
  { to: '/experiences', label: 'Experiences', match: (p: string) => p.startsWith('/experiences') },
  { to: '/release', label: 'Release', match: (p: string) => p === '/release' },
  { to: '/pending', label: 'Pending changes', match: (p: string) => p === '/pending' },
];

function Glyph() {
  // An orrery in three strokes: the sun, one orbit, one body.
  return (
    <svg className="glyph" viewBox="0 0 32 32" aria-hidden="true" focusable="false">
      <circle cx="16" cy="16" r="4" />
      <circle cx="16" cy="16" r="12" fill="none" />
      <circle cx="26.4" cy="10" r="2.4" />
    </svg>
  );
}

function Shell({ children }: { children: ReactNode }) {
  const { data, connection, lost } = useControl();
  const { pathname } = usePath();
  const pending = data?.pending.entries.length ?? 0;
  const status = connection === 'connecting' ? 'Connecting…' : connection === 'unavailable' || lost ? 'Server not responding' : 'Connected';
  return (
    <>
      <a className="skip" href="#main">Skip to content</a>
      <header className="shell">
        <Link to="/" className="brand">
          <Glyph />
          <span className="brand-name">Orrery</span>
          <span className="brand-sub">Control Center</span>
        </Link>
        <nav aria-label="Control Center">
          <ul>
            {NAV.map((n) => (
              <li key={n.to}>
                <Link to={n.to} current={n.match(pathname)}>
                  {n.label}
                  {n.to === '/pending' && pending > 0 && <span className="count"><span className="visually-hidden">, </span>{pending}</span>}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <dl className="session">
          <div><dt className="visually-hidden">Session</dt><dd className="chip">Local session</dd></div>
          <div><dt className="visually-hidden">Server</dt><dd data-state={lost || connection === 'unavailable' ? 'down' : connection}>{status}</dd></div>
          {data && <div><dt>Revision</dt><dd><Rev value={data.release.revision} /></dd></div>}
        </dl>
      </header>
      <main id="main">{children}</main>
      <footer className="foot">
        <p>Runs on this machine only and edits <code>config/release.json</code>. It never commits, pushes or deploys. The local session is not a sign-in.</p>
      </footer>
    </>
  );
}

function Unavailable() {
  const { connect, connection } = useControl();
  return (
    <section className="page narrow">
      <PageHeading title="Server not responding" kicker="Orrery Control Center" />
      <p>The Control Center server did not answer, so there is nothing to show. Nothing has been changed.</p>
      <p>Start it from the repository root with <code>pnpm control</code> (interface and server together) or <code>pnpm control:server</code> (server only), then try again.</p>
      <button type="button" className="button" data-variant="primary" onClick={() => void connect()} disabled={connection === 'connecting'}>
        {connection === 'connecting' ? 'Connecting…' : 'Try again'}
      </button>
    </section>
  );
}

function Screen() {
  const { pathname, searchParams } = usePath();
  if (pathname === '/') return <Overview />;
  if (pathname === '/experiences') return <Registry />;
  const detail = pathname.match(/^\/experiences\/([a-z0-9-]+)$/);
  if (detail) return <ExperienceDetail id={detail[1]!} key={detail[1]} />;
  if (pathname === '/release') return <Release initial={searchParams.get('experience')} />;
  if (pathname === '/pending') return <Pending />;
  return (
    <section className="page narrow">
      <PageHeading title="No such screen" />
      <p><Link to="/">Back to the overview</Link></p>
    </section>
  );
}

export function App() {
  const { connection, data, lost } = useControl();
  return (
    <Shell>
      {lost && (
        <div className="banner">
          <Callout tone="danger" title="The server stopped responding." role="alert">
            <p>What you see is the last state it reported. Editing is paused until it answers again; restart it with <code>pnpm control</code>.</p>
          </Callout>
        </div>
      )}
      {connection === 'unavailable' ? <Unavailable />
        : !data ? <p className="page loading" role="status">Reading the registry and release file…</p>
        : <Screen />}
    </Shell>
  );
}
