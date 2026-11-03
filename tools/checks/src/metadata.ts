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

/** The origin the site build puts in metadata URLs: the same rule as `site` in apps/site/astro.config.ts. */
export const siteOrigin = (env: NodeJS.ProcessEnv = process.env) =>
  env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${env.VERCEL_PROJECT_PRODUCTION_URL}` : 'http://localhost:4321';

const urlOf = (value: string) => { try { return new URL(value); } catch { return undefined; } };

/**
 * Required head tags for each built page. Every page has a title, description, og:type,
 * og:title, og:description, an og:image that is an absolute URL on the site's origin naming a
 * PNG or JPEG in the output (the catalog's ogImage or the platform's /og.png, ADR-022) and a
 * large-image Twitter card. Listed pages must be indexable, with a canonical URL equal to og:url
 * and to the page's own address; pages that are not listed (unlisted experiences, 404) must be
 * noindex, no-referrer and have no canonical.
 */
export function pageFindings(files: DistFile[], experiences: readonly Experience[], state: ReleaseState, origin = siteOrigin()): Finding[] {
  const findings: Finding[] = [];
  const paths = new Set(files.map((f) => f.path));
  const listed = new Map(resolveAll(experiences, state, 'production').map((r) => [r.id, r.listed]));
  for (const f of files.filter((x) => x.path.endsWith('.html'))) {
    const html = f.text ?? '';
    const miss = (what: string) => findings.push({ file: f.path, reason: `missing ${what}` });
    const wrong = (reason: string) => findings.push({ file: f.path, reason });
    if (!/<html lang="[a-z]{2}/.test(html)) miss('<html lang>');
    if (!/<title>\s*[^<\s][^<]*<\/title>/.test(html)) miss('a non-empty <title>');
    for (const [attr, key] of [['name', 'description'], ['property', 'og:type'], ['property', 'og:title'], ['property', 'og:description']] as const) {
      if (!meta(html, attr, key)?.trim()) miss(`a non-empty ${key}`);
    }
    const image = meta(html, 'property', 'og:image');
    const imageUrl = image ? urlOf(image) : undefined;
    if (!image) miss('og:image');
    else if (imageUrl?.origin !== origin) wrong(`og:image "${image}" is not an absolute URL on ${origin}`);
    else if (!/\.(png|jpe?g)$/.test(imageUrl.pathname) || !paths.has(decodeURIComponent(imageUrl.pathname.slice(1)))) {
      wrong(`og:image "${image}" does not name a PNG or JPEG in this build`);
    }
    if (meta(html, 'name', 'twitter:card') !== 'summary_large_image') miss('twitter:card summary_large_image');
    const owner = ownerOf(f.path, experiences);
    const shouldIndex = owner ? listed.get(owner.id)! : f.path !== '404.html';
    const canonical = html.match(/<link rel="canonical" href="([^"]+)"/)?.[1];
    const hasCanonical = canonical !== undefined;
    const noindex = meta(html, 'name', 'robots')?.includes('noindex') ?? false;
    const who = owner ? `"${owner.id}" is ${shouldIndex ? 'listed' : 'not listed'}` : f.path === '404.html' ? 'the 404 page' : 'a listed platform page';
    if (shouldIndex) {
      if (!hasCanonical) miss(`a canonical URL (${who})`);
      const ogUrl = meta(html, 'property', 'og:url');
      if (!ogUrl) miss(`og:url (${who})`);
      // build.format 'file': 'x/y.html' is served at '/x/y', 'index.html' at '/'.
      const own = new URL(`/${f.path.replace(/\.html$/, '').replace(/(^|\/)index$/, '')}`, origin).href;
      if (canonical !== undefined && canonical !== own) wrong(`canonical URL "${canonical}" is not the page's own address ${own}`);
      if (ogUrl && canonical !== undefined && ogUrl !== canonical) wrong(`og:url "${ogUrl}" differs from the canonical URL`);
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
