// Deployment smoke test: real HTTP requests against a deployed URL (task 11).
//   pnpm smoke <url> [--env production|preview] [--external]
// Expectations come from the catalog, config/release.json and apps/site/vercel.json, so
// nothing here names a deployment. For a protected preview, export
// VERCEL_AUTOMATION_BYPASS_SECRET; it is sent as a header and never printed.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { CANARY } from '@pu/experience-catalog';
import { resolve, type Environment, type Experience, type ReleaseState } from '@pu/platform-schema';
import { routeFiles } from './routes.ts';
import { isMain, loadPlatform, repoRoot, report, type Finding } from './repo.ts';

export type Fetch = (url: string, init?: RequestInit) => Promise<Response>;
type VercelConfig = { headers: { source: string; headers: { key: string; value: string }[] }[] };

export type SmokeInput = {
  base: string;
  env: Exclude<Environment, 'development'>;
  experiences: readonly Experience[];
  state: ReleaseState;
  vercel: VercelConfig;
  fetch: Fetch;
  /** Also request each external experience's URL (depends on those apps being up). */
  external?: boolean;
};

const MISSING = '/__pu-smoke-no-such-page';
const hrefs = (html: string) => [...html.matchAll(/href="([^"]+)"/g)].map((m) => m[1]!);

export async function smoke(input: SmokeInput): Promise<Finding[]> {
  const { base, env, experiences, state, vercel } = input;
  const findings: Finding[] = [];
  const fail = (file: string, reason: string) => findings.push({ file, reason });
  const get = (path: string) => input.fetch(new URL(path, base).href, { redirect: 'manual' });
  const crawled = new Map<string, string>(); // path -> html of every 200 page fetched

  async function page(path: string, expect: 200 | 404, why: string): Promise<Response | undefined> {
    const res = await get(path);
    const html = await res.text();
    // Every 200 body is scanned for flags and canaries, including ones that should have been 404.
    if (res.status === 200) crawled.set(path, html);
    if (res.status !== expect) { fail(path, `status ${res.status}, expected ${expect} (${why})`); return undefined; }
    if (!(res.headers.get('content-type') ?? '').startsWith('text/html')) fail(path, `content-type "${res.headers.get('content-type')}", expected text/html`);
    if (/immutable/.test(res.headers.get('cache-control') ?? '')) fail(path, 'an HTML response is cached as immutable');
    if (expect === 404 && !/<title>Not found<\/title>/.test(html)) fail(path, 'the 404 response is not the site\'s Not found page');
    return res;
  }

  // 1. The index, and the headers vercel.json promises on every response.
  const index = await page('/', 200, 'the discovery index');
  if (index) {
    for (const { key, value } of vercel.headers.find((h) => h.source === '/(.*)')?.headers ?? []) {
      const got = index.headers.get(key);
      if (got !== value) fail('/', `header ${key} is ${got === null ? 'missing' : `"${got}"`}, expected "${value}"`);
    }
    if (!/<meta http-equiv="content-security-policy"/.test(crawled.get('/') ?? '')) fail('/', 'no CSP <meta> from Astro');
  }

  // 2. Every experience, as the release state says it should be in this environment.
  for (const e of experiences) {
    const r = resolve(e, state, env);
    if (e.kind === 'external') {
      await page(`/${e.id}`, 404, `"${e.id}" is external and must never be mounted locally`);
      if (r.listed && !hrefs(crawled.get('/') ?? '').includes(e.url)) fail('/', `the index does not link "${e.id}" to ${e.url}`);
      if (r.listed && input.external) {
        const res = await input.fetch(e.url, { redirect: 'follow' });
        if (!res.ok) fail(e.url, `external experience "${e.id}" answered ${res.status}`);
      }
      continue;
    }
    for (const { pattern } of e.routes) {
      const { exact, under } = routeFiles(pattern);
      if (exact !== undefined) {
        const path = pattern;
        await page(path, r.mounted ? 200 : 404, r.mounted ? `"${e.id}" is mounted in ${env}` : `"${e.id}" is not released to ${env}`);
        if (r.listed && !hrefs(crawled.get('/') ?? '').includes(path)) fail('/', `the index does not link listed "${e.id}" (${path})`);
      } else if (r.mounted) {
        // Enumerated views: follow the links the experience's own pages make into its subtree.
        const views = [...new Set([...crawled.values()].flatMap(hrefs).filter((h) => h.startsWith(`/${under}`)))];
        if (views.length === 0) fail(pattern, `no links into ${pattern} found on "${e.id}" pages`);
        for (const v of views) await page(v, 200, `enumerated view of "${e.id}"`);
        if (views[0]) {
          await page(`${views[0]}?pu-smoke=1`, 200, 'a query string serves the same view');
          await page(`/${under}__pu-smoke-no-such-view`, 404, 'an unknown view is a real 404');
        }
      }
    }
  }

  // 3. Unknown paths are real 404s.
  await page(MISSING, 404, 'an unknown path');

  // 4. Clean URLs and trailing slashes redirect permanently, keeping the query string.
  const entry = experiences.flatMap((e) => (e.kind === 'internal' && resolve(e, state, env).mounted
    ? e.routes.filter((x) => !x.pattern.includes('[')).map((x) => x.pattern) : []))[0];
  if (entry) {
    for (const [from, to] of [[`${entry}.html`, entry], [`${entry}/`, entry], [`${entry}/?pu=1`, `${entry}?pu=1`]] as const) {
      const res = await get(from);
      const location = res.headers.get('location');
      const target = location ? new URL(location, base) : undefined;
      if (res.status !== 308 || !target || `${target.pathname}${target.search}` !== to) {
        fail(from, `expected 308 to ${to}, got ${res.status}${location ? ` to ${location}` : ''}`);
      }
    }
  }

  // 5. Hashed assets are immutable; everything a page references is served.
  const assets = [...new Set([...crawled.values()].flatMap((html) => [...html.matchAll(/\/_astro\/[^"')\s]+/g)].map((m) => m[0])))];
  for (const a of assets) {
    const res = await get(a);
    if (res.status !== 200) { fail(a, `asset answered ${res.status}`); continue; }
    if (!/max-age=31536000/.test(res.headers.get('cache-control') ?? '') || !/immutable/.test(res.headers.get('cache-control') ?? '')) {
      fail(a, `cache-control "${res.headers.get('cache-control')}", expected a year and immutable`);
    }
  }

  // 6. Flags and canaries in what was actually served.
  const all = [...crawled].map(([p, html]) => ({ p, html }));
  for (const e of experiences) {
    if (e.kind !== 'internal' || !resolve(e, state, env).mounted) continue;
    for (const [flag, on] of Object.entries(resolve(e, state, env).flags)) {
      const marker = `data-pu-flag="${e.id}:${flag}"`;
      const where = all.filter((x) => x.html.includes(marker)).map((x) => x.p);
      if (!on && where.length > 0) fail(where[0]!, `renders flag ${e.id}:${flag}, which is off in ${env}`);
      if (on && where.length === 0) fail(e.id, `flag ${e.id}:${flag} is on in ${env} but no crawled page renders it`);
    }
  }
  if (env === 'production') {
    for (const { p, html } of all) if (html.includes(CANARY)) fail(p, 'contains the canary token in production');
  }
  return findings;
}

if (isMain(import.meta)) {
  const args = process.argv.slice(2);
  const base = args.find((a) => !a.startsWith('--')) ?? process.env.PU_SMOKE_URL;
  const env = (args.includes('--env') ? args[args.indexOf('--env') + 1] : process.env.PU_SMOKE_ENV) ?? 'production';
  if (!base || !/^https?:\/\//.test(base) || (env !== 'production' && env !== 'preview')) {
    console.error('Usage: pnpm smoke <https://deployment-url> [--env production|preview] [--external]');
    process.exit(2);
  }
  const { experiences, state, issues } = loadPlatform();
  if (!state || issues.length > 0) throw new Error('Catalog or release state is invalid; run `pnpm check:metadata`.');
  const bypass = process.env.VERCEL_AUTOMATION_BYPASS_SECRET;
  const vercel = JSON.parse(readFileSync(join(repoRoot, 'apps/site/vercel.json'), 'utf8')) as VercelConfig;
  const reachable = await fetch(base, { redirect: 'manual' }).then(() => true, (e: Error) => { const cause = e.cause as (Error & { code?: string }) | undefined;
    console.error(`✖ smoke: cannot reach ${base}: ${cause?.code ?? cause?.message ?? e.message}`);
    return false; });
  if (!reachable) process.exit(1);
  const findings = await smoke({
    base, env, experiences, state, vercel, external: args.includes('--external'),
    fetch: (url, init) => fetch(url, bypass && url.startsWith(base) ? { ...init, headers: { 'x-vercel-protection-bypass': bypass } } : init),
  });
  report(`smoke (${env})`, findings, `${new URL(base).host} serves what the ${env} release state promises`);
}
