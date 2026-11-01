// Metadata completeness. Two layers, one definition of validity each:
//  - catalog and release state: platform-schema's validatePlatform(), the same function
//    the site build runs (schema, cross-entry rules, lifecycle rules, folder coverage);
//  - built pages: every production page has the head tags its release state requires.
//   pnpm build:production && pnpm check:metadata
import { resolveAll, type Experience, type Issue, type ReleaseState } from '@pu/platform-schema';
import { ownerOf, productionOwners } from './routes.ts';

export { productionOwners };
import { distArg, isMain, loadPlatform, readDist, report, type DistFile, type Finding } from './repo.ts';

/** Catalog issues as findings, named by experience id (or catalog index) and field. */
export const catalogFindings = (issues: Issue[]): Finding[] =>
  issues.map((i) => ({ file: i.path, reason: `[${i.rule}] ${i.message}` }));

const meta = (html: string, attr: 'name' | 'property', key: string) =>
  html.match(new RegExp(`<meta ${attr}="${key}" content="([^"]*)"`))?.[1];

/**
 * Required head tags for each built page. Listed pages must be indexable and canonical;
 * pages that are not listed (unlisted experiences, 404) must be noindex, no-referrer and
 * have no canonical. og:image is not required yet: no page has one (Phase 2, ADR-014).
 */
export function pageFindings(files: DistFile[], experiences: readonly Experience[], state: ReleaseState): Finding[] {
  const findings: Finding[] = [];
  const listed = new Map(resolveAll(experiences, state, 'production').map((r) => [r.id, r.listed]));
  for (const f of files.filter((x) => x.path.endsWith('.html'))) {
    const html = f.text ?? '';
    const miss = (what: string) => findings.push({ file: f.path, reason: `missing ${what}` });
    if (!/<html lang="[a-z]{2}/.test(html)) miss('<html lang>');
    if (!/<title>\s*[^<\s][^<]*<\/title>/.test(html)) miss('a non-empty <title>');
    for (const [attr, key] of [['name', 'description'], ['property', 'og:title'], ['property', 'og:description']] as const) {
      if (!meta(html, attr, key)?.trim()) miss(`a non-empty ${key}`);
    }
    const owner = ownerOf(f.path, experiences);
    const shouldIndex = owner ? listed.get(owner.id)! : f.path !== '404.html';
    const hasCanonical = /<link rel="canonical" href="[^"]+"/.test(html);
    const noindex = meta(html, 'name', 'robots')?.includes('noindex') ?? false;
    const who = owner ? `"${owner.id}" is ${shouldIndex ? 'listed' : 'not listed'}` : f.path === '404.html' ? 'the 404 page' : 'a listed platform page';
    if (shouldIndex) {
      if (!hasCanonical) miss(`a canonical URL (${who})`);
      if (!meta(html, 'property', 'og:url')) miss(`og:url (${who})`);
      if (noindex) findings.push({ file: f.path, reason: `is noindex, but ${who}` });
    } else {
      if (!noindex) miss(`robots noindex (${who})`);
      if (meta(html, 'name', 'referrer') !== 'no-referrer') miss(`referrer no-referrer (${who})`);
      if (hasCanonical) findings.push({ file: f.path, reason: `declares a canonical URL, but ${who}` });
    }
  }
  return findings;
}

if (isMain(import.meta)) {
  const { experiences, state, issues } = loadPlatform();
  const findings = catalogFindings(issues);
  if (state && issues.length === 0) {
    findings.push(...pageFindings(readDist(distArg()), productionOwners(experiences, state), state));
  }
  report('metadata', findings, `${experiences.length} catalog entries valid; every built page has its required head tags`);
}
