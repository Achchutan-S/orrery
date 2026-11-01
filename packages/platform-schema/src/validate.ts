import type { z } from 'zod';
import { ExperienceDefinition, type Experience } from './definition.ts';
import { ReleaseState } from './release.ts';
import { PHASE_0, type PlatformOptions } from './resolve.ts';

export type Issue = { path: string; rule: string; message: string };

const RESERVED_PREFIXES = ['/_platform', '/auth', '/i', '/me', '/api'];

// '/x/[a]' and '/x/[b]' match the same URLs, so parameter names are ignored.
const routeShape = (pattern: string) =>
  pattern.replace(/\[\.\.\.[^\]]+\]/g, '[...]').replace(/\[[^\].]+\]/g, '[]');

const underPrefix = (pattern: string, prefix: string) =>
  pattern === prefix || pattern.startsWith(`${prefix}/`);

export const zodIssues = (error: z.ZodError, base: string): Issue[] =>
  error.issues.map((i) => ({
    path: [base, ...i.path.map(String)].filter(Boolean).join('.'),
    rule: 'schema',
    message: i.message,
  }));

/** Parses every catalog entry and checks the cross-entry rules (blueprint 3.8, rules 1, 2, 5, 6, 7). */
export function validateCatalog(
  entries: readonly unknown[],
  opts: PlatformOptions = PHASE_0,
): { experiences: Experience[]; issues: Issue[] } {
  const issues: Issue[] = [];
  const experiences: Experience[] = [];
  entries.forEach((entry, i) => {
    const parsed = ExperienceDefinition.safeParse(entry);
    if (parsed.success) experiences.push(parsed.data);
    else issues.push(...zodIssues(parsed.error, `catalog[${i}]`));
  });

  const ids = new Set<string>();
  const patterns = new Map<string, string>();
  const importOwners = new Map<string, string>();

  for (const e of experiences) {
    const at = e.id;
    if (ids.has(e.id)) issues.push({ path: at, rule: 'unique-id', message: `Duplicate experience id "${e.id}"` });
    ids.add(e.id);
    if (e.kind !== 'internal') continue;

    for (const r of e.routes) {
      const owner = patterns.get(routeShape(r.pattern));
      if (owner) issues.push({ path: `${at}.routes`, rule: 'unique-route', message: `Route ${r.pattern} conflicts with a route of "${owner}"` });
      patterns.set(routeShape(r.pattern), e.id);

      const ownApi = underPrefix(r.pattern, `/api/${e.id}`) && r.render === 'on-demand';
      const reserved = RESERVED_PREFIXES.find((p) => underPrefix(r.pattern, p));
      if (reserved && !ownApi) {
        issues.push({ path: `${at}.routes`, rule: 'reserved-prefix', message: `Route ${r.pattern} uses the reserved prefix ${reserved}` });
      }
      if (r.render === 'on-demand' && !opts.protectedRendering) {
        issues.push({ path: `${at}.routes`, rule: 'on-demand-phase-4', message: `Route ${r.pattern} is on-demand, but on-demand rendering does not exist before Phase 4` });
      }
    }

    const hasOnDemand = e.routes.some((r) => r.render === 'on-demand');
    if (!e.routes.some((r) => !r.pattern.includes('['))) {
      issues.push({ path: `${at}.routes`, rule: 'entry-route', message: 'An experience needs one route without parameters; discovery links to it' });
    }
    if (e.capabilities.includes('experimental') && !e.routes.every((r) => underPrefix(r.pattern, '/labs'))) {
      issues.push({ path: `${at}.routes`, rule: 'experimental-labs', message: 'The experimental capability requires every route under /labs/' });
    }
    if (e.capabilities.includes('api') && !hasOnDemand) {
      issues.push({ path: `${at}.capabilities`, rule: 'api-on-demand', message: 'The api capability requires an on-demand route' });
    }
    for (const [flag, decl] of Object.entries(e.flags)) {
      if (decl.evaluation === 'request' && !hasOnDemand) {
        issues.push({ path: `${at}.flags.${flag}`, rule: 'request-flag-on-demand', message: 'Request flags are allowed only on experiences with on-demand routes' });
      }
    }
    for (const pkg of e.exclusiveImports) {
      const owner = importOwners.get(pkg);
      if (owner) issues.push({ path: `${at}.exclusiveImports`, rule: 'exclusive-import-owner', message: `${pkg} is already exclusive to "${owner}"` });
      importOwners.set(pkg, e.id);
    }
  }

  for (const e of experiences) {
    if (e.variantOf && !ids.has(e.variantOf)) {
      issues.push({ path: `${e.id}.variantOf`, rule: 'unknown-variant-base', message: `variantOf names unknown experience "${e.variantOf}"` });
    }
  }
  return { experiences, issues };
}

/**
 * Matches the catalog against the experience folders in apps/site/src/experiences
 * (blueprint 3.8 rule 1). The caller does the filesystem reads, so this stays pure.
 */
export function validateCoverage(
  experiences: readonly Experience[],
  folders: readonly string[],
  fileExists: (entrypoint: string) => boolean,
): Issue[] {
  const issues: Issue[] = [];
  for (const e of experiences) {
    if (e.kind !== 'internal') continue;
    for (const { entrypoint } of e.routes) {
      if (!entrypoint.startsWith(`${e.id}/`)) {
        issues.push({ path: `${e.id}.routes`, rule: 'entrypoint-owner', message: `Entrypoint ${entrypoint} must live in the experience's own folder ${e.id}/` });
      } else if (!fileExists(entrypoint)) {
        issues.push({ path: `${e.id}.routes`, rule: 'entrypoint-missing', message: `Entrypoint src/experiences/${entrypoint} does not exist` });
      }
    }
  }
  const byId = new Map(experiences.map((e) => [e.id, e]));
  for (const folder of folders) {
    const e = byId.get(folder);
    if (e?.kind === 'internal') continue;
    issues.push({
      path: `experiences/${folder}`,
      rule: 'orphan-folder',
      message: e
        ? `"${folder}" is an external experience; it must not have a local folder`
        : `Folder src/experiences/${folder} has no catalog entry; add packages/experience-catalog/src/entries/${folder}.ts`,
    });
  }
  return issues;
}

/**
 * Everything the build checks before mounting anything: catalog, release state and
 * folder coverage. The site integration and the repository checks both call this,
 * so there is one definition of a valid platform.
 */
export function validatePlatform(input: {
  catalog: readonly unknown[];
  release: unknown;
  folders: readonly string[];
  fileExists: (entrypoint: string) => boolean;
  opts?: PlatformOptions;
}): { experiences: Experience[]; state: ReleaseState | null; issues: Issue[] } {
  const { experiences, issues } = validateCatalog(input.catalog, input.opts);
  const release = parseRelease(input.release);
  issues.push(...release.issues, ...validateCoverage(experiences, input.folders, input.fileExists));
  if (release.state) issues.push(...validateRelease(release.state, experiences, input.opts));
  return { experiences, state: release.state, issues };
}

export function parseRelease(input: unknown): { state: ReleaseState | null; issues: Issue[] } {
  const parsed = ReleaseState.safeParse(input);
  return parsed.success
    ? { state: parsed.data, issues: [] }
    : { state: null, issues: zodIssues(parsed.error, 'release') };
}

/** Checks release state against the catalog (blueprint 3.8, rules 1, 3, 4, 5). */
export function validateRelease(
  state: ReleaseState,
  catalog: readonly Experience[],
  opts: PlatformOptions = PHASE_0,
): Issue[] {
  const issues: Issue[] = [];
  const byId = new Map(catalog.map((e) => [e.id, e]));

  for (const [flag, value] of Object.entries(state.platform.flags)) {
    if (value.audience !== undefined) {
      issues.push({ path: `platform.flags.${flag}.audience`, rule: 'audience-request-flag', message: 'Platform flags are build flags and cannot carry an audience' });
    }
  }

  for (const [id, entry] of Object.entries(state.experiences)) {
    const at = `experiences.${id}`;
    const experience = byId.get(id);
    if (!experience) {
      issues.push({ path: at, rule: 'unknown-experience', message: `"${id}" is not in the catalog` });
      continue;
    }
    const { lifecycle, access } = entry;
    if (lifecycle === 'alpha' && access.kind === 'public') {
      issues.push({ path: `${at}.access`, rule: 'alpha-non-public', message: 'An alpha requires non-public access' });
    }
    if (lifecycle === 'deprecated' && entry.discoverability !== 'unlisted') {
      issues.push({ path: `${at}.discoverability`, rule: 'deprecated-unlisted', message: 'A deprecated experience must be unlisted' });
    }
    if (lifecycle === 'archived' && !entry.archivedTo) {
      issues.push({ path: `${at}.archivedTo`, rule: 'archived-target', message: 'An archived experience requires archivedTo' });
    }
    if ((access.kind === 'signed-in' || access.kind === 'policy') && !opts.protectedRendering) {
      issues.push({ path: `${at}.access`, rule: 'access-phase-4', message: `${access.kind} access cannot be enforced before Phase 4; use public or owner` });
    }
    if (opts.protectedRendering && access.kind !== 'public' && experience.kind === 'internal'
      && experience.routes.some((r) => r.render !== 'on-demand')) {
      issues.push({ path: `${at}.access`, rule: 'non-public-on-demand', message: 'Non-public access requires every route to be on-demand' });
    }

    const declared = experience.kind === 'internal' ? experience.flags : {};
    for (const [flag, value] of Object.entries(entry.flags)) {
      const decl = declared[flag];
      if (!decl) {
        issues.push({ path: `${at}.flags.${flag}`, rule: 'undeclared-flag', message: `Flag "${flag}" is not declared in the catalog entry` });
      } else if (value.audience !== undefined && decl.evaluation !== 'request') {
        issues.push({ path: `${at}.flags.${flag}.audience`, rule: 'audience-request-flag', message: 'An audience is allowed only on request flags' });
      }
    }
  }
  return issues;
}
