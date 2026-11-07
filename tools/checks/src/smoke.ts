// Deployment smoke test: real HTTP requests against a deployed URL (task 11).
//   pnpm smoke <url> [--env production|preview] [--external] [--local]
// Expectations come from the catalog, config/release.json and apps/site/vercel.json, so
// nothing here names a deployment. For a protected preview, export
// VERCEL_AUTOMATION_BYPASS_SECRET; it is sent as a header and never printed.
// --local is for `astro preview` of a local build (localhost only): it skips exactly what only
// Vercel does (vercel.json headers, clean-URL redirects, cache headers) and says so.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { CANARY } from '@pu/experience-catalog';
import { resolve, type Environment, type Experience, type ReleaseState } from '@pu/platform-schema';
import { PLATFORM_FILES } from './leaks.ts';
import { isFileRoute, routeFiles } from './routes.ts';
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
  /** 'local': an `astro preview` server, which has none of Vercel's headers, redirects or caching. */
  target?: 'vercel' | 'local';
};

/** What only Vercel does, and so what a --local run cannot check. */
export const VERCEL_ONLY = 'vercel.json headers, clean-URL and trailing-slash redirects, Cache-Control';

/** Media types by extension; a parameter such as `; charset=utf-8` is allowed. A path without one is a page. */
const MEDIA: Record<string, string[]> = {
  html: ['text/html'], pdf: ['application/pdf'], png: ['image/png'], jpg: ['image/jpeg'], jpeg: ['image/jpeg'],
  svg: ['image/svg+xml'], css: ['text/css'], js: ['text/javascript', 'application/javascript'], mjs: ['text/javascript', 'application/javascript'],
  woff2: ['font/woff2'], json: ['application/json'], txt: ['text/plain'], xml: ['application/xml', 'text/xml'],
  // The Skills Archive's downloads. Python has no registered media type, and astro preview sends none
  // for it; what matters is that it is never an HTML fallback.
  md: ['text/markdown', 'text/plain'], zip: ['application/zip'], py: ['text/x-python', 'text/x-script.python', 'text/plain', 'application/octet-stream', ''],
};
const extension = (path: string) => new URL(path, 'http://x').pathname.match(/\.(\w+)$/)?.[1]?.toLowerCase() ?? 'html';

const MISSING = '/__pu-smoke-no-such-page';
const hrefs = (html: string) => [...html.matchAll(/href="([^"]+)"/g)].map((m) => m[1]!);

/** A request that failed below HTTP twice (connection reset, DNS, TLS): the run stops and says where. */
class Unreachable extends Error {
  readonly path: string;
  constructor(path: string, cause: unknown) { super(path, { cause }); this.path = path; }
}
const causeOf = (e: unknown) => { const c = (e as Error).cause as (Error & { code?: string }) | undefined; return c?.code ?? c?.message ?? (e as Error).message; };

export async function smoke(input: SmokeInput): Promise<Finding[]> {
  const findings: Finding[] = [];
  try {
    await checks(input, findings);
  } catch (e) {
    if (!(e instanceof Unreachable)) throw e;
    findings.push({ file: e.path, reason: `request failed twice (${causeOf(e.cause)}), a network error rather than an answer from the site; the run stopped here, so re-run it` });
  }
  return findings;
}

async function checks(input: SmokeInput, findings: Finding[]): Promise<void> {
  const { base, env, experiences, state, vercel } = input;
  const onVercel = (input.target ?? 'vercel') === 'vercel';
  // A path can be requested twice (the index is also an experience route); report each problem once.
  const fail = (file: string, reason: string) => { if (!findings.some((x) => x.file === file && x.reason === reason)) findings.push({ file, reason }); };
  // One retry for a network error only; any HTTP answer, whatever its status, is taken as it is.
  const get = async (path: string) => {
    const url = new URL(path, base).href;
    try {
      return await input.fetch(url, { redirect: 'manual' });
    } catch {
      await new Promise((done) => setTimeout(done, 1000));
      try { return await input.fetch(url, { redirect: 'manual' }); } catch (e) { throw new Unreachable(path, e); }
    }
  };
  const crawled = new Map<string, string>(); // path -> html of every 200 page fetched
  const GLOBAL = vercel.headers.find((h) => h.source === '/(.*)')?.headers ?? [];

  /** The media type a path must be served as; an asset answered with an HTML fallback fails here. */
  function served(path: string, res: Response, as = extension(path)) {
    const got = res.headers.get('content-type');
    const want = MEDIA[as];
    if (!want) fail(path, `no expected media type for ".${as}" files; add it to MEDIA in smoke.ts`);
    else if (!want.includes((got ?? '').split(';')[0]!.trim().toLowerCase())) fail(path, `content-type ${got === null ? 'missing' : `"${got}"`}, expected ${want.join(' or ')}`);
  }
  /** Every header vercel.json promises on every response, at its exact value; and the cache policy. */
  function vercelHeaders(path: string, res: Response, cache: 'immutable' | 'revalidate') {
    if (!onVercel) return;
    for (const { key, value } of GLOBAL) {
      const got = res.headers.get(key);
      if (got !== value) fail(path, `header ${key} is ${got === null ? 'missing' : `"${got}"`}, expected "${value}"`);
    }
    const cc = res.headers.get('cache-control') ?? '';
    if (cache === 'immutable' && !(/max-age=31536000/.test(cc) && /immutable/.test(cc))) fail(path, `cache-control "${cc}", expected a year and immutable`);
    if (cache === 'revalidate' && !/max-age=0\b/.test(cc)) fail(path, `cache-control "${cc}", expected max-age=0 (revalidated on every request)`);
  }

  async function page(path: string, expect: 200 | 404, why: string): Promise<Response | undefined> {
    const res = await get(path);
    const html = await res.text();
    // Every 200 body is scanned for flags and canaries, including ones that should have been 404.
    if (res.status === 200) crawled.set(path, html);
    if (res.status !== expect) { fail(path, `status ${res.status}, expected ${expect} (${why})`); return undefined; }
    // A file route (a PDF, an image) is served as what it is; every other 200 or 404 is a page.
    served(path, res, expect === 200 && isFileRoute(path) ? extension(path) : 'html');
    if (/immutable/.test(res.headers.get('cache-control') ?? '')) fail(path, `a ${expect} response at a stable address is cached as immutable`);
    vercelHeaders(path, res, 'revalidate');
    if (expect === 404 && !/<title>Not found<\/title>/.test(html)) fail(path, 'the 404 response is not the site\'s Not found page');
    return res;
  }

  // 1. The index, with Astro's CSP <meta>.
  const index = await page('/', 200, 'the discovery index');
  if (index && !/<meta http-equiv="content-security-policy"/.test(crawled.get('/') ?? '')) fail('/', 'no CSP <meta> from Astro');

  // Platform files from apps/site/public, in every environment.
  for (const file of PLATFORM_FILES.filter((p) => p !== '404.html')) {
    const res = await get(`/${file}`);
    if (res.status !== 200) { fail(`/${file}`, `status ${res.status}, expected 200 (a platform file)`); continue; }
    served(`/${file}`, res);
    vercelHeaders(`/${file}`, res, 'revalidate');
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
        // Discovery links each listed experience once, to its first parameter-free route (src/platform/discovery).
        const discoveryRoute = e.routes.find((x) => !x.pattern.includes('['))?.pattern;
        if (r.listed && path === discoveryRoute && !hrefs(crawled.get('/') ?? '').includes(path)) fail('/', `the index does not link listed "${e.id}" (${path})`);
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

  // 4. Clean URLs and trailing slashes redirect permanently, keeping the query string (Vercel only).
  // `/` has no `.html` or trailing-slash form of its own, so the first route below it is used.
  const entry = experiences.flatMap((e) => (e.kind === 'internal' && resolve(e, state, env).mounted
    ? e.routes.filter((x) => !x.pattern.includes('[') && x.pattern !== '/').map((x) => x.pattern) : []))[0];
  if (entry && onVercel) {
    for (const [from, to] of [[`${entry}.html`, entry], [`${entry}/`, entry], [`${entry}/?pu=1`, `${entry}?pu=1`]] as const) {
      const res = await get(from);
      const location = res.headers.get('location');
      const target = location ? new URL(location, base) : undefined;
      if (res.status !== 308 || !target || `${target.pathname}${target.search}` !== to) {
        fail(from, `expected 308 to ${to}, got ${res.status}${location ? ` to ${location}` : ''}`);
      }
    }
  }

  // 5. Hashed assets are immutable; everything a page references is served as what it is.
  const assets = [...new Set([...crawled.values()].flatMap((html) => [...html.matchAll(/\/_astro\/[^"')\s]+/g)].map((m) => m[0])))];
  for (const a of assets) {
    const res = await get(a);
    if (res.status !== 200) { fail(a, `asset answered ${res.status}`); continue; }
    served(a, res);
    vercelHeaders(a, res, 'immutable');
  }
  // Link-preview images named by the pages (absolute on the production origin; requested here).
  const images = [...new Set([...crawled.values()].flatMap((html) => [...html.matchAll(/<meta property="og:image" content="([^"]+)"/g)].map((m) => new URL(m[1]!).pathname)))];
  for (const i of images) {
    const res = await get(i);
    if (res.status !== 200) fail(i, `og:image answered ${res.status}, expected 200`);
    else served(i, res);
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
}

if (isMain(import.meta)) {
  const args = process.argv.slice(2);
  const base = args.find((a) => !a.startsWith('--')) ?? process.env.PU_SMOKE_URL;
  const env = (args.includes('--env') ? args[args.indexOf('--env') + 1] : process.env.PU_SMOKE_ENV) ?? 'production';
  const target = args.includes('--local') ? 'local' : 'vercel';
  if (!base || !/^https?:\/\//.test(base) || (env !== 'production' && env !== 'preview')) {
    console.error('Usage: pnpm smoke <https://deployment-url> [--env production|preview] [--external] [--local]');
    process.exit(2);
  }
  // A deployment is always checked in full: --local cannot relax a run against a real host.
  if (target === 'local' && !['localhost', '127.0.0.1', '[::1]'].includes(new URL(base).hostname)) {
    console.error('✖ smoke: --local is only for a local `astro preview` (localhost); a deployment is always checked in full.');
    process.exit(2);
  }
  const { experiences, state, issues } = loadPlatform();
  if (!state || issues.length > 0) throw new Error('Catalog or release state is invalid; run `pnpm check:metadata`.');
  const bypass = process.env.VERCEL_AUTOMATION_BYPASS_SECRET;
  const vercel = JSON.parse(readFileSync(join(repoRoot, 'apps/site/vercel.json'), 'utf8')) as VercelConfig;
  const reachable = await fetch(base, { redirect: 'manual' }).then(() => true, (e: Error) => {
    console.error(`✖ smoke: cannot reach ${base}: ${causeOf(e)}`);
    return false; });
  if (!reachable) process.exit(1);
  const findings = await smoke({
    base, env, experiences, state, vercel, target, external: args.includes('--external'),
    fetch: (url, init) => fetch(url, bypass && url.startsWith(base) ? { ...init, headers: { 'x-vercel-protection-bypass': bypass } } : init),
  });
  if (target === 'local') console.log(`ℹ smoke: local server, not Vercel; not checked: ${VERCEL_ONLY}. Run without --local against a Vercel deployment.`);
  report(`smoke (${env}, ${target})`, findings, `${new URL(base).host} serves what the ${env} release state promises`);
}
