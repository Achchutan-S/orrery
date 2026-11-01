// Small shared pieces: links, headings, marks, the environment matrix, issues and dialogs.
import { useEffect, useRef, useState, type MouseEvent, type ReactNode } from 'react';
import type { Issue, Lifecycle, RegistryItem } from '@pu/platform-schema';
import { availability, ENV_LABEL, ENVIRONMENTS, isExternal, short } from './model.ts';

// ---- Routing: the History API and nothing else. Five screens do not need a router library. ----

export function navigate(to: string) {
  history.pushState(null, '', to);
  dispatchEvent(new PopStateEvent('popstate'));
}

/** Set by in-app navigation (links, Back, Forward); the next screen's heading then takes focus. */
let moved = false;

export function usePath(): URL {
  const [href, setHref] = useState(() => location.href);
  useEffect(() => {
    const on = () => {
      moved = true;
      setHref(location.href);
    };
    addEventListener('popstate', on);
    return () => removeEventListener('popstate', on);
  }, []);
  return new URL(href);
}

export function Link({ to, children, className, current }: { to: string; children: ReactNode; className?: string; current?: boolean }) {
  const go = (e: MouseEvent<HTMLAnchorElement>) => {
    if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    e.preventDefault();
    navigate(to);
  };
  return <a href={to} onClick={go} className={className} aria-current={current ? 'page' : undefined}>{children}</a>;
}

/**
 * The page's h1. Takes focus when the owner moves to another screen, so keyboard and
 * screen-reader users land on it. Not on first load: the skip link comes first then.
 */
export function PageHeading({ title, kicker, children }: { title: string; kicker?: ReactNode; children?: ReactNode }) {
  const ref = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    document.title = `${title} · Orrery Control Center`;
    if (moved) ref.current?.focus();
  }, [title]);
  return (
    <header className="page-head">
      {kicker && <p className="kicker">{kicker}</p>}
      <h1 ref={ref} tabIndex={-1}>{title}</h1>
      {children}
    </header>
  );
}

export const Rev = ({ value, label }: { value: string | undefined; label?: string }) => (
  <code className="rev" title={value}>{label && <span className="visually-hidden">{label} </span>}{short(value)}</code>
);

/** Lifecycle as text with a shape, so the state never depends on colour. */
const SHAPE: Record<Lifecycle, string> = { draft: '○', alpha: '◔', beta: '◑', published: '●', frozen: '◆', deprecated: '◇', archived: '×' };
export const LifecycleMark = ({ value }: { value: Lifecycle }) => (
  <span className="mark" data-lifecycle={value}><span aria-hidden="true">{SHAPE[value]}</span> {value}</span>
);

export const KindMark = ({ item }: { item: RegistryItem }) =>
  isExternal(item) ? <span className="kind" data-kind="external">External link</span> : <span className="kind">Hosted here</span>;

export function Availability({ item, env }: { item: RegistryItem; env: (typeof ENVIRONMENTS)[number] }) {
  const a = availability(item, env);
  return <span className="avail" data-on={a.on}><span aria-hidden="true">{a.on ? '■' : '□'}</span> {a.label}</span>;
}

/** What each environment does with this experience, straight from the API's resolution. */
export function EnvMatrix({ item }: { item: RegistryItem }) {
  const external = isExternal(item);
  const flags = Object.keys(item.environments.production.flags);
  return (
    <table className="matrix">
      <caption className="visually-hidden">Environment matrix for {item.definition.title}</caption>
      <thead>
        <tr>
          <th scope="col">Environment</th>
          <th scope="col">Release allows it</th>
          <th scope="col">{external ? 'Built here' : 'Built'}</th>
          <th scope="col">{external ? 'Linked from discovery' : 'Listed in discovery'}</th>
          {flags.length > 0 && <th scope="col">Flags</th>}
        </tr>
      </thead>
      <tbody>
        {ENVIRONMENTS.map((env) => {
          const r = item.environments[env];
          return (
            <tr key={env} data-env={env}>
              <th scope="row">{ENV_LABEL[env]}</th>
              <td><YesNo on={r.deployable} /></td>
              <td>{external ? <span className="muted">Never (separate site)</span> : <YesNo on={r.mounted} />}</td>
              <td><YesNo on={r.listed} /></td>
              {flags.length > 0 && <td>{flags.map((f) => <span key={f} className="flag">{f} {r.flags[f] ? 'on' : 'off'}</span>)}</td>}
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

export const YesNo = ({ on }: { on: boolean }) => (
  <span className="yesno" data-on={on}><span aria-hidden="true">{on ? '■' : '□'}</span> {on ? 'Yes' : 'No'}</span>
);

export function IssueList({ issues, id }: { issues: readonly Issue[]; id?: string }) {
  if (issues.length === 0) return null;
  return (
    <ul className="issues" id={id}>
      {issues.map((i, n) => (
        <li key={n}><span className="issue-rule">{i.rule}</span> {i.message} <code className="issue-path">{i.path}</code></li>
      ))}
    </ul>
  );
}

export function Callout({ tone = 'note', title, children, role }: { tone?: 'note' | 'warn' | 'danger' | 'ok'; title: string; children?: ReactNode; role?: 'alert' | 'status' }) {
  return (
    <div className="callout" data-tone={tone} role={role}>
      <p className="callout-title">{title}</p>
      {children}
    </div>
  );
}

/**
 * A modal confirmation built on <dialog>: the browser traps focus, Escape cancels and focus
 * returns to the button that opened it. Cancel comes first, so it has initial focus.
 */
export function ConfirmDialog({ open, title, children, confirmLabel, onConfirm, onCancel, busy, danger }: {
  open: boolean; title: string; children: ReactNode; confirmLabel: string;
  onConfirm: () => void; onCancel: () => void; busy?: boolean; danger?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);
  return (
    <dialog ref={ref} className="dialog" data-danger={danger} aria-labelledby="dialog-title" onCancel={(e) => { e.preventDefault(); if (!busy) onCancel(); }}>
      <h2 id="dialog-title">{title}</h2>
      <div className="dialog-body">{children}</div>
      <div className="actions">
        <button type="button" className="button" onClick={onCancel} disabled={busy}>Cancel</button>
        <button type="button" className="button" data-variant={danger ? 'danger' : 'primary'} onClick={onConfirm} disabled={busy}>
          {busy ? 'Writing…' : confirmLabel}
        </button>
      </div>
    </dialog>
  );
}

export function CopyButton({ text, label }: { text: string; label: string }) {
  const [done, setDone] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setDone(true);
      setTimeout(() => setDone(false), 2000);
    } catch {
      setDone(false);
    }
  };
  return <button type="button" className="button" data-size="small" onClick={copy}>{done ? 'Copied' : label}</button>;
}
