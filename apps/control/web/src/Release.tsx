// Release management: compose one change, preview it on the server, confirm, write.
// The rules are the server's: this file builds a ReleasePatch and shows what the API says.
import { useEffect, useState } from 'react';
import type { PreviewData, RegistryItem, ReleaseEntry, ReleasePatch, ResolutionChange } from '@pu/platform-schema';
import { failureOf, type Failure } from './api.ts';
import { Callout, ConfirmDialog, IssueList, LifecycleMark, Link, PageHeading, Rev } from './components.tsx';
import { allowedTransitions, ENV_LABEL, ENVIRONMENTS, entryRows, formatAccess, impactSentences, isExternal, short } from './model.ts';
import { useControl } from './state.tsx';

type Op = 'transition' | 'setAccess' | 'setDiscoverability' | 'setFlag' | 'setNote';
type Prepared = { patch: ReleasePatch; base: string; data: PreviewData };

const entryOrNull = (item: RegistryItem): ReleaseEntry | null => (item.hasReleaseEntry ? item.release : null);

function Impact({ changes, titleOf, externalIds }: { changes: readonly ResolutionChange[]; titleOf: (id: string) => string; externalIds: Set<string> }) {
  const lines = (env: (typeof ENVIRONMENTS)[number]) => changes.filter((c) => c.environment === env)
    .flatMap((c) => impactSentences(c, externalIds.has(c.experienceId)).map((s) => ({ id: c.experienceId, s })));
  const prod = lines('production');
  return (
    <div className="impact">
      <section className="impact-env" data-env="production" data-changed={prod.length > 0} aria-labelledby="impact-production">
        <h4 id="impact-production">Production</h4>
        {prod.length > 0
          ? <ul>{prod.map((l, n) => <li key={n}><strong>{titleOf(l.id)}:</strong> {l.s}</li>)}</ul>
          : <p>No change. Production would build and list exactly what it does now.</p>}
      </section>
      {(['development', 'preview'] as const).map((env) => {
        const l = lines(env);
        return (
          <section key={env} className="impact-env" data-env={env} data-changed={l.length > 0} aria-labelledby={`impact-${env}`}>
            <h4 id={`impact-${env}`}>{ENV_LABEL[env]}</h4>
            {l.length > 0 ? <ul>{l.map((x, n) => <li key={n}><strong>{titleOf(x.id)}:</strong> {x.s}</li>)}</ul> : <p>No change.</p>}
          </section>
        );
      })}
    </div>
  );
}

function ChangeTable({ before, after, caption, empty = 'The release entry would not change.' }: { before: ReleaseEntry | null; after: ReleaseEntry | null; caption: string; empty?: string }) {
  const rows = entryRows(before, after);
  if (rows.length === 0) return <p className="muted">{empty}</p>;
  return (
    <table className="delta-table">
      <caption>{caption}</caption>
      <thead><tr><th scope="col">Field</th><th scope="col">Now</th><th scope="col">Proposed</th></tr></thead>
      <tbody>{rows.map((r) => <tr key={r.field}><th scope="row">{r.field}</th><td><del>{r.before}</del></td><td><ins>{r.after}</ins></td></tr>)}</tbody>
    </table>
  );
}

/** What went wrong, in words, with the one sensible next step. Never retries by itself. */
function FailureView({ failure, item, prepared, onReload }: { failure: Failure; item: RegistryItem; prepared: Prepared | null; onReload: () => Promise<string | undefined> }) {
  const [reread, setReread] = useState<string | null>(null);
  if (failure.kind === 'session-reset') {
    return (
      <Callout tone="warn" title="Nothing was written: the session had expired." role="alert">
        <p>The server had restarted, so the session was renewed. Writes are never replayed automatically. Load the latest state and confirm the change again.</p>
        <button type="button" className="button" onClick={() => void onReload()}>Load latest state</button>
      </Callout>
    );
  }
  if (failure.kind === 'unavailable') {
    const check = async () => {
      const now = await onReload().catch(() => undefined);
      setReread(now === undefined ? 'The server is still not answering.'
        : prepared && now !== prepared.base
          ? `The file changed (now revision ${short(now)}). Open Pending changes to see whether it contains this change before trying again.`
          : 'The file is unchanged: the change was not written.');
    };
    return (
      <Callout tone="danger" title="The server did not confirm the write." role="alert">
        <p>The connection failed, so it is unknown whether the change reached <code>config/release.json</code>. Re-read the file before doing anything else.</p>
        <button type="button" className="button" onClick={() => void check()}>Re-read the release file</button>
        {reread && <p role="status">{reread}</p>}
      </Callout>
    );
  }
  if (failure.code === 'STALE_REVISION' || failure.code === 'WRITE_CONFLICT') {
    const current = failure.current;
    return (
      <Callout tone="warn" title="Nothing was written: the release file changed after it was loaded." role="alert">
        <p>
          {failure.code === 'WRITE_CONFLICT' ? 'Another program saved the file during the write.' : 'The file was edited since this page read it, for example in an editor.'}
          {current && <> It is now revision <Rev value={current.revision} />.</>} Review the latest state and make the change again.
        </p>
        {current && <ChangeTable caption={`What changed on disk for ${item.definition.title}`} before={entryOrNull(item)} after={current.state.experiences[item.id] ?? null}
          empty={`The entry for ${item.definition.title} is unchanged; the edit was elsewhere in the file.`} />}
        <button type="button" className="button" data-variant="primary" onClick={() => void onReload()}>Load latest state</button>
      </Callout>
    );
  }
  if (failure.code === 'CATALOG_INVALID') {
    return (
      <Callout tone="danger" title="The catalog fails validation, so the Control Center is read-only." role="alert">
        <IssueList issues={failure.issues ?? []} />
        <p>Fix the catalog code, then restart the server.</p>
      </Callout>
    );
  }
  if (failure.code === 'ILLEGAL_TRANSITION' || failure.code === 'VALIDATION_FAILED') return null; // shown at the controls
  return (
    <Callout tone="danger" title={failure.code === 'STORE_UNAVAILABLE' ? 'The release file cannot be read or written.' : 'The change could not be made.'} role="alert">
      <p>{failure.message}</p>
      <IssueList issues={failure.issues ?? []} />
    </Callout>
  );
}

export type Written = { revision: string; changes: ResolutionChange[] };

/** The confirmation after a write. Lives in the parent, because the composer remounts on the new revision. */
export function WrittenNotice({ written }: { written: Written | null }) {
  const { data } = useControl();
  if (!written) return null;
  const titleOf = (id: string) => data?.registry.experiences.find((i) => i.id === id)?.definition.title ?? id;
  const externalIds = new Set(data?.registry.experiences.filter(isExternal).map((i) => i.id));
  return (
    <Callout tone="ok" title={`Written. config/release.json is now revision ${short(written.revision)}.`} role="status">
      {written.changes.length > 0 && (
        <ul>{written.changes.flatMap((c) => impactSentences(c, externalIds.has(c.experienceId)).map((s, n) => <li key={`${c.experienceId}-${c.environment}-${n}`}>{titleOf(c.experienceId)}: {s}</li>))}</ul>
      )}
      <p>Nothing is committed or deployed. <Link to="/pending">Review pending changes</Link></p>
    </Callout>
  );
}

/**
 * One change to one experience. Keyed by experience and revision by its parent, so it always
 * starts from the state it shows. While mounted it counts as editing: polling then only flags
 * a changed file instead of refreshing under the owner.
 */
export function Composer({ item, revision, onWritten }: { item: RegistryItem; revision: string; onWritten: (w: Written | null) => void }) {
  const { client, data, refresh, announce, readOnly, setReadOnly, lost, externalRevision, useEditing } = useControl();
  const entry = item.release;
  const external = isExternal(item);
  const flags = item.definition.kind === 'internal' ? Object.keys(item.definition.flags) : [];
  const targets = allowedTransitions(entry.lifecycle);

  const [op, setOp] = useState<Op>('transition');
  const [to, setTo] = useState(targets[0]);
  const [access, setAccess] = useState<'public' | 'owner'>(entry.access.kind === 'public' ? 'owner' : 'public');
  const [disc, setDisc] = useState(entry.discoverability === 'listed' ? 'unlisted' as const : 'listed' as const);
  const [flag, setFlag] = useState(flags[0] ?? '');
  const [flagValue, setFlagValue] = useState(() => ({ preview: false, production: false, ...entry.flags[flags[0] ?? ''] }));
  const [note, setNote] = useState(entry.note ?? '');
  const [prepared, setPrepared] = useState<Prepared | null>(null);
  const [phase, setPhase] = useState<'idle' | 'previewing' | 'confirm' | 'applying'>('idle');
  const [failure, setFailure] = useState<Failure | null>(null);
  useEditing(true);

  const titleOf = (id: string) => data?.registry.experiences.find((i) => i.id === id)?.definition.title ?? id;
  const externalIds = new Set(data?.registry.experiences.filter(isExternal).map((i) => i.id));
  const disabled = readOnly !== null || lost;

  /** Every edit invalidates the preview: what is applied is always what was previewed. */
  const edit = <A extends unknown[]>(fn: (...a: A) => void) => (...a: A) => {
    fn(...a);
    setPrepared(null);
    setFailure(null);
    onWritten(null);
  };

  const id = item.id;
  const current = entry.flags[flag];
  const patch: ReleasePatch | null =
    op === 'transition' ? (to ? { op, experienceId: id, to } : null)
    : op === 'setAccess' ? (access === entry.access.kind ? null : { op, experienceId: id, access: { kind: access } })
    : op === 'setDiscoverability' ? (disc === entry.discoverability ? null : { op, experienceId: id, value: disc })
    : op === 'setFlag' ? (!flag || (current && current.preview === flagValue.preview && current.production === flagValue.production) ? null
      : { op, scope: { experienceId: id }, flag, value: { preview: flagValue.preview, production: flagValue.production } })
    : note.trim() === '' ? (entry.note === undefined ? null : { op: 'setNote', experienceId: id, note: null })
    : note === entry.note ? null : { op: 'setNote', experienceId: id, note };

  const fieldIssues = failure?.kind === 'api' && (failure.code === 'ILLEGAL_TRANSITION' || failure.code === 'VALIDATION_FAILED')
    ? failure.issues ?? [] : prepared && !prepared.data.valid ? prepared.data.issues : [];

  async function runPreview() {
    if (!patch) return;
    setPhase('previewing');
    setFailure(null);
    onWritten(null);
    try {
      const r = await client.preview(patch, revision);
      setPrepared({ patch, base: revision, data: r.data });
      announce(r.data.valid ? 'Preview ready. Review the impact, then apply or discard.' : 'Preview ready. The change breaks release rules and cannot be applied.');
    } catch (e) {
      setFailure(failureOf(e));
    } finally {
      setPhase('idle');
    }
  }

  async function apply() {
    if (!prepared) return;
    setPhase('applying');
    try {
      const r = await client.apply(prepared.patch, prepared.base);
      onWritten({ revision: r.data.revision, changes: r.data.changes });
      setPrepared(null);
      announce(`Change written to config/release.json. Revision ${short(r.data.revision)}.`);
      await refresh().catch(() => {});
    } catch (e) {
      const f = failureOf(e);
      if (f.kind === 'api' && f.code === 'CATALOG_INVALID') setReadOnly(f.issues ?? []);
      setFailure(f);
      if (f.kind !== 'unavailable') setPrepared(null);
    } finally {
      setPhase('idle');
    }
  }

  const reload = async () => {
    const r = await refresh();
    setPrepared(null);
    setFailure(null);
    return r;
  };

  const after = prepared ? prepared.data.state.experiences[id] ?? null : null;
  const prodChanges = prepared ? prepared.data.changes.filter((c) => c.environment === 'production') : [];

  return (
    <div className="composer">
      {disabled && (
        <Callout tone="warn" title="Editing is unavailable.">
          <p>{lost ? 'The server is not responding.' : 'The catalog fails validation; fix the code and restart the server.'}</p>
          {readOnly && <IssueList issues={readOnly} />}
        </Callout>
      )}
      <form onSubmit={(e) => { e.preventDefault(); void runPreview(); }} aria-label={`Change the release entry of ${item.definition.title}`}>
        <fieldset className="segments" disabled={disabled}>
          <legend>What to change</legend>
          {([['transition', 'Lifecycle'], ['setAccess', 'Access'], ['setDiscoverability', 'Discoverability'], ...(flags.length ? [['setFlag', 'Flag']] : []), ['setNote', 'Note']] as [Op, string][])
            .map(([value, label]) => (
              <label key={value}>
                <input type="radio" name={`op-${id}`} value={value} checked={op === value} onChange={edit(() => setOp(value))} />
                <span>{label}</span>
              </label>
            ))}
        </fieldset>

        <fieldset className="choice" disabled={disabled} aria-describedby={fieldIssues.length ? `issues-${id}` : undefined}>
          {op === 'transition' && (
            <>
              <legend>Move from <LifecycleMark value={entry.lifecycle} /> to</legend>
              {targets.length === 0
                ? <p className="muted">{entry.lifecycle} is final: the lifecycle model allows no further transition.</p>
                : targets.map((t) => (
                  <label key={t} className="option">
                    <input type="radio" name={`to-${id}`} value={t} checked={to === t} onChange={edit(() => setTo(t))} />
                    <LifecycleMark value={t} />
                  </label>
                ))}
              <p className="hint">Only the moves the lifecycle diagram allows are offered.</p>
            </>
          )}
          {op === 'setAccess' && (
            <>
              <legend>Access (now {formatAccess(entry.access)})</legend>
              {(['public', 'owner'] as const).map((k) => (
                <label key={k} className="option">
                  <input type="radio" name={`access-${id}`} value={k} checked={access === k} onChange={edit(() => setAccess(k))} />
                  <span>{k}</span>
                </label>
              ))}
              <p className="hint"><code>owner</code> means not released: it never reaches production before owner sign-in exists (Phase 4).</p>
            </>
          )}
          {op === 'setDiscoverability' && (
            <>
              <legend>Discoverability (now {entry.discoverability})</legend>
              {(['listed', 'unlisted'] as const).map((d) => (
                <label key={d} className="option">
                  <input type="radio" name={`disc-${id}`} value={d} checked={disc === d} onChange={edit(() => setDisc(d))} />
                  <span>{d}</span>
                </label>
              ))}
              <p className="hint">{external ? 'Listed external projects are linked from discovery.' : 'Unlisted experiences are still built, but not linked from discovery.'}</p>
            </>
          )}
          {op === 'setFlag' && (
            <>
              <legend>Build flag</legend>
              <div className="field">
                <label htmlFor={`flag-${id}`}>Flag</label>
                <select id={`flag-${id}`} value={flag} onChange={edit((e) => {
                  setFlag(e.target.value);
                  setFlagValue({ preview: false, production: false, ...entry.flags[e.target.value] });
                })}>
                  {flags.map((f) => <option key={f} value={f}>{f}</option>)}
                </select>
              </div>
              {item.definition.kind === 'internal' && item.definition.flags[flag] && <p className="hint">{item.definition.flags[flag]!.description}</p>}
              {(['preview', 'production'] as const).map((k) => (
                <label key={k} className="option">
                  <input type="checkbox" checked={flagValue[k]} onChange={edit((e) => setFlagValue((v) => ({ ...v, [k]: e.target.checked })))} />
                  <span>On in {k}{k === 'preview' ? ' (and development)' : ''}</span>
                </label>
              ))}
            </>
          )}
          {op === 'setNote' && (
            <>
              <legend>Note</legend>
              <div className="field">
                <label htmlFor={`note-${id}`}>Note for the owner (empty removes it)</label>
                <textarea id={`note-${id}`} rows={3} value={note} onChange={edit((e) => setNote(e.target.value))} />
              </div>
            </>
          )}
          {fieldIssues.length > 0 && (
            <div className="field-issues" role="alert">
              <p className="callout-title">{failure?.kind === 'api' && failure.code === 'ILLEGAL_TRANSITION' ? 'That lifecycle move is not allowed.' : 'This change breaks release rules.'}</p>
              <IssueList id={`issues-${id}`} issues={fieldIssues} />
            </div>
          )}
        </fieldset>

        <div className="actions">
          <button type="submit" className="button" data-variant="primary" disabled={disabled || !patch || phase !== 'idle'}>
            {phase === 'previewing' ? 'Checking…' : 'Preview change'}
          </button>
          {!patch && <span className="muted small">{op === 'transition' && targets.length === 0 ? 'No change possible.' : 'Choose a value different from the current one.'}</span>}
        </div>
      </form>

      {externalRevision && externalRevision !== revision && !prepared && !failure && (
        <Callout tone="warn" title="The release file changed on disk." role="status">
          <p>It is now revision <Rev value={externalRevision} />; this form shows revision <Rev value={revision} />. Load the latest state before changing anything.</p>
          <button type="button" className="button" onClick={() => void reload()}>Load latest state</button>
        </Callout>
      )}

      {failure && <FailureView failure={failure} item={item} prepared={prepared} onReload={reload} />}

      {prepared && (
        <section className="preview" aria-labelledby={`preview-h-${id}`}>
          <h3 id={`preview-h-${id}`}>Preview <span className="muted small">checked by the server against revision <Rev value={prepared.base} /></span></h3>
          {externalRevision && externalRevision !== prepared.base && (
            <Callout tone="warn" title="The release file changed on disk after this preview." role="alert">
              <p>It is now revision <Rev value={externalRevision} />. Applying will be refused; load the latest state and preview again.</p>
              <button type="button" className="button" onClick={() => void reload()}>Load latest state</button>
            </Callout>
          )}
          <ChangeTable caption={`${item.definition.title}: release entry`} before={entryOrNull(item)} after={after} />
          {prepared.data.valid
            ? <p className="valid"><span aria-hidden="true">✓</span> Passes every release rule the build checks.</p>
            : <p className="invalid"><span aria-hidden="true">✕</span> Breaks {prepared.data.issues.length} release {prepared.data.issues.length === 1 ? 'rule' : 'rules'} (listed above). It cannot be applied.</p>}
          <h4 className="impact-title">Effect on each environment</h4>
          <Impact changes={prepared.data.changes} titleOf={titleOf} externalIds={externalIds} />
          <div className="actions">
            <button type="button" className="button" data-variant={prodChanges.length ? 'danger' : 'primary'} disabled={!prepared.data.valid || phase !== 'idle' || disabled} onClick={() => setPhase('confirm')}>
              Apply change…
            </button>
            <button type="button" className="button" onClick={edit(() => {})}>Discard preview</button>
          </div>
        </section>
      )}

      <ConfirmDialog
        open={phase === 'confirm' || phase === 'applying'}
        busy={phase === 'applying'}
        danger={prodChanges.length > 0}
        title={`Write this change for ${item.definition.title}?`}
        confirmLabel="Write to release file"
        onCancel={() => setPhase('idle')}
        onConfirm={() => void apply()}
      >
        {prepared && (
          <>
            <ul>{entryRows(entryOrNull(item), after).map((r) => <li key={r.field}>{r.field}: {r.before} → <strong>{r.after}</strong></li>)}</ul>
            {prodChanges.length > 0
              ? <p className="prod-warning"><strong>This changes production.</strong> {prodChanges.flatMap((c) => impactSentences(c, externalIds.has(c.experienceId))).join(' ')} It takes effect when the change is committed and merged.</p>
              : <p>Production is not affected.</p>}
            <p className="muted">This writes <code>config/release.json</code> on this machine. Nothing is committed, pushed or deployed.</p>
          </>
        )}
      </ConfirmDialog>
    </div>
  );
}

export function Release({ initial }: { initial: string | null }) {
  const { data } = useControl();
  const { registry, release } = data!;
  const items = registry.experiences;
  const [id, setId] = useState(items.some((i) => i.id === initial) ? initial! : items[0]?.id ?? '');
  const [written, setWritten] = useState<Written | null>(null);
  useEffect(() => { history.replaceState(null, '', id ? `/release?experience=${id}` : '/release'); }, [id]);
  const item = items.find((i) => i.id === id);

  return (
    <section className="page">
      <PageHeading title="Release" kicker="Change one release entry at a time">
        <p className="lede">Every change is checked by the server before anything is written, and written only after you confirm. Committing stays with you.</p>
      </PageHeading>
      <dl className="facts compact">
        <div><dt>Working from revision</dt><dd><Rev value={release.revision} /></dd></div>
        <div><dt>Session baseline</dt><dd><Rev value={release.baselineRevision} /></dd></div>
        <div><dt>Rule issues now</dt><dd>{release.issues.length}</dd></div>
      </dl>
      {items.length === 0 ? <p className="empty">No experiences are registered, so there is nothing to release.</p> : (
        <>
          <div className="field picker">
            <label htmlFor="experience">Experience</label>
            <select id="experience" value={id} onChange={(e) => { setId(e.target.value); setWritten(null); }}>
              {items.map((i) => <option key={i.id} value={i.id}>{i.definition.title} ({i.id})</option>)}
            </select>
          </div>
          {item && (
            <>
              <p className="current">
                Now: <LifecycleMark value={item.release.lifecycle} /> · {formatAccess(item.release.access)} · {item.release.discoverability}
                {' '}<Link to={`/experiences/${item.id}`}>Details and environment matrix</Link>
              </p>
              <WrittenNotice written={written} />
              <Composer key={`${item.id}@${release.revision}`} item={item} revision={release.revision} onWritten={setWritten} />
            </>
          )}
        </>
      )}
    </section>
  );
}
