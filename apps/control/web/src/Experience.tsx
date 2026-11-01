import { useEffect, useState } from 'react';
import type { RegistryItem } from '@pu/platform-schema';
import { failureOf, type Failure } from './api.ts';
import { Callout, EnvMatrix, IssueList, KindMark, LifecycleMark, Link, PageHeading } from './components.tsx';
import { formatAccess } from './model.ts';
import { Composer, WrittenNotice, type Written } from './Release.tsx';
import { useControl } from './state.tsx';

export function ExperienceDetail({ id }: { id: string }) {
  const { client, data } = useControl();
  const [loaded, setLoaded] = useState<{ item: RegistryItem; revision: string } | null>(null);
  const [failure, setFailure] = useState<Failure | null>(null);
  const [written, setWritten] = useState<Written | null>(null);
  const appRevision = data?.release.revision;

  // Re-read whenever the app's view of the release file moves (a write here, or a refresh).
  useEffect(() => {
    let live = true;
    client.experience(id)
      .then((r) => { if (live) { setLoaded({ item: r.data, revision: r.revision! }); setFailure(null); } })
      .catch((e) => { if (live) setFailure(failureOf(e)); });
    return () => { live = false; };
  }, [client, id, appRevision]);

  if (failure && !loaded) {
    const missing = failure.kind === 'api' && (failure.code === 'NOT_FOUND' || failure.code === 'INVALID_REQUEST');
    return (
      <section className="page narrow">
        <PageHeading title={missing ? 'No such experience' : 'Experience unavailable'} />
        <p>{missing ? <>The catalog has no experience with the id <code>{id}</code>.</> : failure.message}</p>
        <p><Link to="/experiences">All experiences</Link></p>
      </section>
    );
  }
  if (!loaded) return <p className="page loading" role="status">Reading {id}…</p>;

  const { item, revision } = loaded;
  const d = item.definition;
  const r = item.release;
  return (
    <section className="page">
      <nav aria-label="Breadcrumb" className="crumbs"><Link to="/experiences">Experiences</Link> <span aria-hidden="true">/</span> <code>{item.id}</code></nav>
      <PageHeading title={d.title}>
        <p className="lede">{d.summary}</p>
        <p className="meta-line"><KindMark item={item} /> <code className="id">{item.id}</code> <LifecycleMark value={r.lifecycle} /></p>
      </PageHeading>

      {d.kind === 'external' && (
        <Callout title="A separate site, linked from discovery.">
          <p>It lives at <a href={d.url} rel="noopener noreferrer">{new URL(d.url).host}</a>. Nothing of it is built or managed here; its release entry only decides whether discovery links to it.</p>
        </Callout>
      )}

      {item.issues.length > 0 && (
        <Callout tone="danger" title={`${item.issues.length} release ${item.issues.length === 1 ? 'rule fails' : 'rules fail'} for this experience.`}>
          <IssueList issues={item.issues} />
        </Callout>
      )}

      <section className="block" aria-labelledby="matrix-h">
        <h2 id="matrix-h">Environments</h2>
        <p className="lede">Resolved by the server from the release entry below. Development follows preview for flags.</p>
        <EnvMatrix item={item} />
      </section>

      <div className="two">
        <section className="block" aria-labelledby="release-h">
          <h2 id="release-h">Release entry</h2>
          <dl className="facts">
            <div><dt>In config/release.json</dt><dd>{item.hasReleaseEntry ? 'Yes' : 'No: the owner-only draft default applies'}</dd></div>
            <div><dt>Lifecycle</dt><dd><LifecycleMark value={r.lifecycle} /> {item.channel && <span className="muted">{item.channel} channel</span>}</dd></div>
            <div><dt>Access</dt><dd>{formatAccess(r.access)}</dd></div>
            <div><dt>Discoverability</dt><dd>{r.discoverability}</dd></div>
            {Object.keys(r.flags).length > 0 && (
              <div><dt>Flags</dt><dd>{Object.entries(r.flags).map(([f, v]) => <span key={f} className="flag">{f}: preview {v.preview ? 'on' : 'off'}, production {v.production ? 'on' : 'off'}</span>)}</dd></div>
            )}
            {r.archivedTo && <div><dt>Archived to</dt><dd><code>{r.archivedTo}</code></dd></div>}
            {r.note && <div><dt>Note</dt><dd>{r.note}</dd></div>}
          </dl>
        </section>

        <section className="block" aria-labelledby="catalog-h">
          <h2 id="catalog-h">Catalog entry</h2>
          <p className="hint">Read-only here: it changes in code, in <code>packages/experience-catalog/src/entries/{item.id}.ts</code>.</p>
          <dl className="facts">
            <div><dt>Kind</dt><dd>{d.kind === 'external' ? 'External' : 'Internal (hosted here)'}</dd></div>
            <div><dt>Capabilities</dt><dd>{d.capabilities.join(', ')}</dd></div>
            {d.tags.length > 0 && <div><dt>Tags</dt><dd>{d.tags.join(', ')}</dd></div>}
            {d.kind === 'internal' && (
              <>
                <div><dt>Performance class</dt><dd>{d.performanceClass}</dd></div>
                <div>
                  <dt>Routes</dt>
                  <dd><ul className="routes">{d.routes.map((x) => <li key={x.pattern}><code>{x.pattern}</code> <span className="muted">{x.render} · {x.entrypoint}</span></li>)}</ul></dd>
                </div>
                {Object.keys(d.flags).length > 0 && (
                  <div><dt>Declared flags</dt><dd>{Object.entries(d.flags).map(([f, x]) => <span key={f} className="flag"><code>{f}</code> {x.description}</span>)}</dd></div>
                )}
              </>
            )}
            {d.kind === 'external' && <div><dt>Address</dt><dd><code>{d.url}</code></dd></div>}
          </dl>
        </section>
      </div>

      <section className="block" aria-labelledby="change-h">
        <h2 id="change-h">Change release entry</h2>
        <WrittenNotice written={written} />
        <Composer key={`${item.id}@${revision}`} item={item} revision={revision} onWritten={setWritten} />
      </section>
    </section>
  );
}
