// Pure derivations for the screens. Rules (transitions, resolution) come from platform-schema;
// this file only turns API data into words and groupings.
import {
  canTransition, defaultReleaseEntry, ENVIRONMENTS, Lifecycle,
  type Environment, type ReleaseEntry, type RegistryItem, type ResolutionChange,
} from '@pu/platform-schema';

export { ENVIRONMENTS };
export const ENV_LABEL: Record<Environment, string> = { development: 'Development', preview: 'Preview', production: 'Production' };
export const LIFECYCLES = Lifecycle.options;

export const short = (revision: string | undefined) => (revision ? revision.slice(0, 8) : '—');

export const allowedTransitions = (from: Lifecycle) => LIFECYCLES.filter((to) => canTransition(from, to));

export const isExternal = (item: RegistryItem) => item.definition.kind === 'external';

/** One environment cell, in words. External projects are linked, never built here. */
export function availability(item: RegistryItem, env: Environment): { label: string; on: boolean } {
  const r = item.environments[env];
  if (isExternal(item)) return r.listed ? { label: 'Linked', on: true } : { label: 'Not linked', on: false };
  if (!r.mounted) return { label: 'Not built', on: false };
  return { label: r.listed ? 'Built · listed' : 'Built · unlisted', on: true };
}

export const formatAccess = (a: ReleaseEntry['access']) => (a.kind === 'policy' ? `policy ${a.policy}` : a.kind);

export type Filter = 'all' | Lifecycle | 'in-production' | 'external' | 'issues';
export type Sort = 'catalog' | 'name' | 'lifecycle' | 'kind';

export const FILTERS: { value: Filter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'published', label: 'Published' },
  { value: 'draft', label: 'Draft' },
  { value: 'in-production', label: 'In production' },
  { value: 'external', label: 'External' },
  { value: 'issues', label: 'With issues' },
];

export function matches(item: RegistryItem, filter: Filter, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (q && !item.id.includes(q) && !item.definition.title.toLowerCase().includes(q)) return false;
  switch (filter) {
    case 'all': return true;
    case 'in-production': return availability(item, 'production').on;
    case 'external': return isExternal(item);
    case 'issues': return item.issues.length > 0;
    default: return item.release.lifecycle === filter;
  }
}

export function sortItems(items: readonly RegistryItem[], sort: Sort): RegistryItem[] {
  const by = {
    catalog: () => 0,
    name: (a: RegistryItem, b: RegistryItem) => a.definition.title.localeCompare(b.definition.title),
    lifecycle: (a: RegistryItem, b: RegistryItem) => LIFECYCLES.indexOf(a.release.lifecycle) - LIFECYCLES.indexOf(b.release.lifecycle),
    kind: (a: RegistryItem, b: RegistryItem) => a.definition.kind.localeCompare(b.definition.kind),
  }[sort];
  return [...items].sort(by); // stable: ties keep catalog order
}

export function counts(items: readonly RegistryItem[]) {
  const byLifecycle = Object.fromEntries(LIFECYCLES.map((l) => [l, items.filter((i) => i.release.lifecycle === l).length])) as Record<Lifecycle, number>;
  return {
    total: items.length,
    hosted: items.filter((i) => !isExternal(i)).length,
    external: items.filter(isExternal).length,
    byLifecycle,
    withIssues: items.filter((i) => i.issues.length > 0).length,
  };
}

/** Which experiences each environment builds and lists, from the API's resolution. */
export const environmentView = (items: readonly RegistryItem[], env: Environment) => ({
  built: items.filter((i) => i.environments[env].mounted),
  listed: items.filter((i) => i.environments[env].listed),
  linked: items.filter((i) => isExternal(i) && i.environments[env].listed),
});

// ---- Describing changes ----

export type Row = { field: string; before: string; after: string };

const flagText = (f: ReleaseEntry['flags'][string] | undefined) => (f ? `preview ${f.preview ? 'on' : 'off'}, production ${f.production ? 'on' : 'off'}` : 'not set');

/** Field-by-field differences between two release entries. `null` means the file has no entry. */
export function entryRows(before: ReleaseEntry | null, after: ReleaseEntry | null): Row[] {
  const [b, a] = [before ?? defaultReleaseEntry(), after ?? defaultReleaseEntry()];
  const rows: Row[] = [];
  if (before === null) rows.push({ field: 'Entry', before: 'none (owner-only draft by default)', after: 'added' });
  if (after === null) rows.push({ field: 'Entry', before: 'present', after: 'removed (owner-only draft by default)' });
  const push = (field: string, x: string, y: string) => { if (x !== y) rows.push({ field, before: x, after: y }); };
  push('Lifecycle', b.lifecycle, a.lifecycle);
  push('Access', formatAccess(b.access), formatAccess(a.access));
  push('Discoverability', b.discoverability, a.discoverability);
  for (const flag of [...new Set([...Object.keys(b.flags ?? {}), ...Object.keys(a.flags ?? {})])].sort()) {
    push(`Flag ${flag}`, flagText(b.flags?.[flag]), flagText(a.flags?.[flag]));
  }
  push('Archived to', b.archivedTo ?? 'none', a.archivedTo ?? 'none');
  push('Note', b.note ?? 'none', a.note ?? 'none');
  return rows;
}

/** Plain sentences for one resolution change, e.g. "Production will now include this experience." */
export function impactSentences(change: Pick<ResolutionChange, 'environment' | 'before' | 'after'>, external: boolean): string[] {
  const { environment: env, before: b, after: a } = change;
  const where = env === 'production' ? 'Production' : `${ENV_LABEL[env]} builds`;
  const out: string[] = [];
  if (b.mounted !== a.mounted) out.push(a.mounted ? `${where} will now include this experience.` : `${where} will no longer include this experience.`);
  if (b.listed !== a.listed) {
    out.push(external
      ? (a.listed ? `${where} will now link to it from discovery.` : `${where} will no longer link to it from discovery.`)
      : (a.listed ? `${where} will now list it in discovery.` : `${where} will no longer list it in discovery.`));
  }
  if (b.deployable !== a.deployable && b.mounted === a.mounted && b.listed === a.listed) {
    out.push(a.deployable ? `Its release state now allows ${ENV_LABEL[env].toLowerCase()}.` : `Its release state no longer allows ${ENV_LABEL[env].toLowerCase()}.`);
  }
  for (const flag of [...new Set([...Object.keys(b.flags), ...Object.keys(a.flags)])].sort()) {
    if (b.flags[flag] !== a.flags[flag]) out.push(`Flag ${flag} turns ${a.flags[flag] ? 'on' : 'off'} in ${ENV_LABEL[env].toLowerCase()}.`);
  }
  return out;
}

export const touchesProduction = (changes: readonly ResolutionChange[]) => changes.some((c) => c.environment === 'production');

