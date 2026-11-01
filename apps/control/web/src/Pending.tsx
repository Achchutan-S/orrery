import { useState } from 'react';
import { failureOf, type Failure } from './api.ts';
import { Callout, ConfirmDialog, CopyButton, Link, PageHeading, Rev } from './components.tsx';
import { ENV_LABEL, entryRows, impactSentences, isExternal, short } from './model.ts';
import { useControl } from './state.tsx';

export function Pending() {
  const { client, data, refresh, announce, readOnly, lost, useEditing } = useControl();
  const { pending, registry } = data!;
  const [phase, setPhase] = useState<'idle' | 'confirm' | 'reverting'>('idle');
  const [failure, setFailure] = useState<Failure | null>(null);
  const [reverted, setReverted] = useState<string | null>(null);
  useEditing(phase !== 'idle');

  const titleOf = (id: string) => registry.experiences.find((i) => i.id === id)?.definition.title ?? id;
  const externalIds = new Set(registry.experiences.filter(isExternal).map((i) => i.id));

  async function revert() {
    setPhase('reverting');
    setFailure(null);
    try {
      const r = await client.revert(pending.revision);
      setReverted(r.data.revision);
      announce(`Session baseline restored. Revision ${short(r.data.revision)}.`);
      await refresh().catch(() => {});
    } catch (e) {
      setFailure(failureOf(e));
    } finally {
      setPhase('idle');
    }
  }

  const stale = failure?.kind === 'api' && (failure.code === 'STALE_REVISION' || failure.code === 'WRITE_CONFLICT');

  return (
    <section className="page">
      <PageHeading title="Pending changes" kicker="Since the server started">
        <p className="lede">
          Compared with the <strong>session baseline</strong>: <code>config/release.json</code> as it was when the Control Center server started.
          This is not <code>git status</code>: the server never runs Git, so changes you already committed this session still appear here until the server restarts.
        </p>
      </PageHeading>

      <dl className="facts compact">
        <div><dt>Session baseline</dt><dd><Rev value={pending.baselineRevision} /></dd></div>
        <div><dt>Current revision</dt><dd><Rev value={pending.revision} /></dd></div>
        <div><dt>Changed</dt><dd>{pending.changed ? `${pending.entries.length} ${pending.entries.length === 1 ? 'entry' : 'entries'}` : 'No'}</dd></div>
      </dl>

      {reverted && !pending.changed && (
        <Callout tone="ok" title={`Baseline restored. config/release.json is revision ${short(reverted)} again.`} role="status" />
      )}

      {!pending.changed ? (
        <p className="empty">No changes: the release file holds the same release state as when the server started.{pending.revision !== pending.baselineRevision && ' (Its bytes differ, for example in formatting.)'}</p>
      ) : (
        <>
          <section className="block" aria-labelledby="diff-h">
            <h2 id="diff-h">What changed</h2>
            {pending.entries.map((e) => {
              const key = e.scope === 'platform' ? 'platform' : e.experienceId;
              const rows = e.scope === 'platform'
                ? [{ field: 'Platform flags', before: JSON.stringify(e.before.flags), after: JSON.stringify(e.after.flags) }]
                : entryRows(e.before, e.after);
              return (
                <table key={key} className="delta-table">
                  <caption>{e.scope === 'platform' ? 'Platform' : <><Link to={`/experiences/${e.experienceId}`}>{titleOf(e.experienceId)}</Link> <code className="id">{e.experienceId}</code></>}</caption>
                  <thead><tr><th scope="col">Field</th><th scope="col">Baseline</th><th scope="col">Now</th></tr></thead>
                  <tbody>{rows.map((r) => <tr key={r.field}><th scope="row">{r.field}</th><td><del>{r.before}</del></td><td><ins>{r.after}</ins></td></tr>)}</tbody>
                </table>
              );
            })}
          </section>

          <section className="block" aria-labelledby="effect-h">
            <h2 id="effect-h">Effect on environments</h2>
            {pending.changes.length === 0 ? <p className="muted">No environment builds or lists anything differently.</p> : (
              <ul className="effects">
                {pending.changes.map((c) => (
                  <li key={`${c.experienceId}-${c.environment}`} data-env={c.environment}>
                    <strong>{ENV_LABEL[c.environment]}</strong> · {titleOf(c.experienceId)}: {impactSentences(c, externalIds.has(c.experienceId)).join(' ')}
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="block" aria-labelledby="commit-h">
            <h2 id="commit-h">To commit</h2>
            <p className="lede">Committing is the publishing act, so it stays with you. Run these yourself; the Control Center never does.</p>
            <div className="code-row">
              <pre><code>{pending.commands.join('\n')}</code></pre>
              <CopyButton text={pending.commands.join('\n')} label="Copy commands" />
            </div>
            <p className="small muted">Suggested message: <code>{pending.suggestedCommitMessage}</code></p>
          </section>

          <section className="block revert" aria-labelledby="revert-h">
            <h2 id="revert-h">Restore the session baseline</h2>
            <p>Overwrites <code>config/release.json</code> with the release state from revision <Rev value={pending.baselineRevision} />, discarding every change listed above. Edits you made in an editor since the server started are discarded too.</p>
            {stale && failure.kind === 'api' && (
              <Callout tone="warn" title="Nothing was restored: the release file changed after this page loaded it." role="alert">
                <p>{failure.current && <>It is now revision <Rev value={failure.current.revision} />. </>}Review the latest changes before restoring.</p>
                <button type="button" className="button" onClick={() => { setFailure(null); void refresh().catch(() => {}); }}>Load latest state</button>
              </Callout>
            )}
            {failure && !stale && (
              <Callout tone="danger" title={failure.kind === 'unavailable' ? 'The server did not confirm the restore.' : 'The baseline could not be restored.'} role="alert">
                <p>{failure.kind === 'unavailable' ? 'It is unknown whether the file was restored. Re-read it before trying again.' : failure.message}</p>
                <button type="button" className="button" onClick={() => { setFailure(null); void refresh().catch(() => {}); }}>Re-read the release file</button>
              </Callout>
            )}
            <button type="button" className="button" data-variant="danger" disabled={phase !== 'idle' || readOnly !== null || lost} onClick={() => setPhase('confirm')}>
              Restore baseline…
            </button>
          </section>
        </>
      )}

      <ConfirmDialog
        open={phase !== 'idle'}
        busy={phase === 'reverting'}
        danger
        title="Restore the session baseline?"
        confirmLabel="Restore baseline"
        onCancel={() => setPhase('idle')}
        onConfirm={() => void revert()}
      >
        <p>This replaces revision <Rev value={pending.revision} /> with the release state of revision <Rev value={pending.baselineRevision} />.</p>
        <ul>{pending.entries.map((e) => <li key={e.scope === 'platform' ? 'platform' : e.experienceId}>{e.scope === 'platform' ? 'Platform flags' : titleOf(e.experienceId)} goes back to its baseline.</li>)}</ul>
        <p className="muted">Only the local file changes. Git keeps any version you already committed.</p>
      </ConfirmDialog>
    </section>
  );
}
