import type { Issue } from '@pu/platform-schema';
import { Link, PageHeading, Rev } from './components.tsx';
import { counts, ENV_LABEL, ENVIRONMENTS, entryRows, environmentView, LIFECYCLES } from './model.ts';
import { useControl } from './state.tsx';

export function Overview() {
  const { data, externalRevision } = useControl();
  const { registry, release, pending } = data!;
  const items = registry.experiences;
  const c = counts(items);
  const titleOf = (id: string) => items.find((i) => i.id === id)?.definition.title ?? id;
  const lifecycles = LIFECYCLES.filter((l) => c.byLifecycle[l] > 0);
  const same = (a: Issue, b: Issue) => a.path === b.path && a.rule === b.rule && a.message === b.message;
  const ownerOf = (i: Issue) => items.find((x) => x.issues.some((j) => same(i, j)))?.id;

  return (
    <section className="page">
      <PageHeading title="Overview" kicker="The universe as config/release.json describes it" />

      <section aria-labelledby="summary-h" className="block">
        <h2 id="summary-h">Release file</h2>
        <dl className="facts">
          <div><dt>Current revision</dt><dd><Rev value={release.revision} /></dd></div>
          <div><dt>Session baseline</dt><dd><Rev value={release.baselineRevision} /> {release.revision === release.baselineRevision ? <span className="muted">same as now</span> : <span className="muted">changed since</span>}</dd></div>
          <div><dt>Experiences</dt><dd><strong>{c.total}</strong> <span className="muted">{c.hosted} hosted here, {c.external} external</span></dd></div>
          <div><dt>Lifecycle</dt><dd>{lifecycles.map((l) => <span key={l} className="tally">{c.byLifecycle[l]} {l}</span>)}</dd></div>
          <div><dt>Rule issues</dt><dd><strong>{registry.issues.length}</strong></dd></div>
          <div><dt>Pending changes</dt><dd><strong>{pending.entries.length}</strong> <span className="muted">since the server started</span></dd></div>
        </dl>
      </section>

      <section aria-labelledby="env-h" className="block">
        <h2 id="env-h">Environments</h2>
        <p className="lede">What each build would contain under the current release file. This is the release model, not the health of a live deployment.</p>
        <div className="envs">
          {ENVIRONMENTS.map((env) => {
            const v = environmentView(items, env);
            return (
              <section key={env} className="env" data-env={env} aria-labelledby={`env-${env}`}>
                <h3 id={`env-${env}`}>{ENV_LABEL[env]}</h3>
                <p className="env-count"><strong>{v.built.length}</strong> built here · <strong>{v.listed.length}</strong> in discovery</p>
                <ul className="names">
                  {v.built.map((i) => <li key={i.id}><Link to={`/experiences/${i.id}`}>{i.definition.title}</Link>{!i.environments[env].listed && <span className="muted"> unlisted</span>}</li>)}
                  {v.linked.map((i) => <li key={i.id}><Link to={`/experiences/${i.id}`}>{i.definition.title}</Link><span className="muted"> external link</span></li>)}
                </ul>
              </section>
            );
          })}
        </div>
      </section>

      <section aria-labelledby="attention-h" className="block">
        <h2 id="attention-h">Needs attention</h2>
        {registry.issues.length === 0 && pending.entries.length === 0 && !externalRevision ? (
          <p className="muted">Nothing. Every release rule passes and the file matches the session baseline.</p>
        ) : (
          <ul className="attention">
            {externalRevision && <li data-tone="warn">The release file changed on disk (revision <Rev value={externalRevision} />) while a change was being prepared.</li>}
            {registry.issues.map((i, n) => {
              const owner = ownerOf(i);
              return (
                <li key={n} data-tone="danger">
                  <span className="issue-rule">{i.rule}</span> {i.message}{' '}
                  {owner ? <Link to={`/experiences/${owner}`}>{titleOf(owner)}</Link> : <code>{i.path}</code>}
                </li>
              );
            })}
            {pending.entries.length > 0 && (
              <li data-tone="note">
                {pending.entries.length} uncommitted {pending.entries.length === 1 ? 'change' : 'changes'} since the server started. <Link to="/pending">Review pending changes</Link>
              </li>
            )}
          </ul>
        )}
      </section>

      {pending.entries.length > 0 && (
        <section aria-labelledby="recent-h" className="block">
          <h2 id="recent-h">Changed this session</h2>
          <ul className="changes">
            {pending.entries.map((e) => (
              <li key={e.scope === 'platform' ? 'platform' : e.experienceId}>
                <strong>{e.scope === 'platform' ? 'Platform flags' : titleOf(e.experienceId)}</strong>{' '}
                {e.scope === 'platform'
                  ? <span className="muted">platform flags changed</span>
                  : entryRows(e.before, e.after).map((r) => <span key={r.field} className="delta">{r.field.toLowerCase()} {r.before} → {r.after}</span>)}
              </li>
            ))}
          </ul>
        </section>
      )}
    </section>
  );
}
