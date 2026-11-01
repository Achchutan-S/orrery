import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import { CANARY } from '@pu/experience-catalog';
import { loadPlatform, repoRoot } from './repo.ts';
import { smoke, type Fetch, type SmokeInput } from './smoke.ts';

const { experiences, state } = loadPlatform();
const vercel = JSON.parse(readFileSync(join(repoRoot, 'apps/site/vercel.json'), 'utf8')) as SmokeInput['vercel'];
const GLOBAL = vercel.headers.find((h) => h.source === '/(.*)')!.headers;
const html = (title: string, body = '') => `<html><head><meta http-equiv="content-security-policy" content="x"><title>${title}</title></head><body>${body}</body></html>`;
const STATES = ['draft', 'alpha', 'beta', 'published', 'frozen', 'deprecated', 'archived'];

/** A fixture deployment behaving as a correct Vercel deployment of this site should. */
function site(env: 'production' | 'preview') {
  const files = new Map<string, string>([
    ['index.html', html('Personal Universe', ['https://kawaiui.vercel.app/', 'https://devxray-one.vercel.app/', '/sample-content', '/sample-app'].map((h) => `<a href="${h}">x</a>`).join(''))],
    ['404.html', html('Not found')],
    ['sample-content.html', html('Essay', '<link href="/_astro/fonts/f.woff2">')],
    ['sample-app.html', html('Explorer', ['states', ...STATES.map((s) => `states/${s}`)].map((v) => `<a href="/sample-app/${v}">x</a>`).join(''))],
    ['sample-app/states.html', html('States', `<script src="/_astro/App.js"></script>${env === 'preview' ? '<aside data-pu-flag="sample-app:inspector">' : ''}`)],
    ...STATES.map((s) => [`sample-app/states/${s}.html`, html(s)] as [string, string]),
    ['_astro/App.js', 'x()'],
    ['_astro/fonts/f.woff2', 'font'],
  ]);
  if (env === 'preview') {
    files.set('canary-draft.html', html(`${CANARY}-PAGE`));
    files.set('sample-hostile.html', html('Hostile'));
  }
  return files;
}

type Mutate = { files?: (f: Map<string, string>) => void; noHeaders?: boolean; noRedirects?: boolean; mutableAssets?: boolean; spaFallback?: boolean };

function deployment(env: 'production' | 'preview', m: Mutate = {}): Fetch {
  const files = site(env);
  m.files?.(files);
  return async (url) => {
    const { pathname: p, search } = new URL(url);
    const headers = new Headers(m.noHeaders ? {} : Object.fromEntries(GLOBAL.map((h) => [h.key, h.value])));
    if (!m.noRedirects && p !== '/' && (p.endsWith('.html') || p.endsWith('/'))) {
      headers.set('location', `${p.replace(/\.html$|\/$/, '')}${search}`);
      return new Response(null, { status: 308, headers });
    }
    if (p.startsWith('/_astro/')) {
      if (!files.has(p.slice(1))) return new Response('', { status: 404, headers });
      headers.set('cache-control', m.mutableAssets ? 'public, max-age=0, must-revalidate' : 'public, max-age=31536000, immutable');
      return new Response(files.get(p.slice(1)), { status: 200, headers });
    }
    headers.set('content-type', 'text/html; charset=utf-8');
    headers.set('cache-control', 'public, max-age=0, must-revalidate');
    const body = files.get(p === '/' ? 'index.html' : `${p.slice(1)}.html`);
    if (body !== undefined) return new Response(body, { status: 200, headers });
    return m.spaFallback ? new Response(files.get('index.html'), { status: 200, headers }) : new Response(files.get('404.html'), { status: 404, headers });
  };
}

const run = (env: 'production' | 'preview', m?: Mutate) =>
  smoke({ base: 'https://pu.example', env, experiences, state: state!, vercel, fetch: deployment(env, m) })
    .then((f) => f.map((x) => `${x.file}: ${x.reason}`));

test('a correct production deployment passes', async () => {
  assert.deepEqual(await run('production'), []);
});

test('a correct preview deployment passes, drafts and inspector included', async () => {
  assert.deepEqual(await run('preview'), []);
});

test('missing security headers are reported by name and expected value', async () => {
  const out = await run('production', { noHeaders: true });
  assert.ok(out.includes(`/: header Content-Security-Policy is missing, expected "frame-ancestors 'none'; base-uri 'self'; form-action 'self'; object-src 'none'"`));
  assert.equal(out.filter((l) => l.startsWith('/: header ')).length, GLOBAL.length);
});

test('drafts served in production, inspector rendered in production, or a canary fail', async () => {
  const out = await run('production', { files: (f) => {
    f.set('canary-draft.html', html(`${CANARY}-PAGE`));
    f.set('sample-app/states.html', html('States', '<aside data-pu-flag="sample-app:inspector">'));
  } });
  assert.ok(out.includes('/canary-draft: status 200, expected 404 ("canary-draft" is not released to production)'));
  assert.ok(out.includes('/canary-draft: contains the canary token in production'));
  assert.ok(out.includes('/sample-app/states: renders flag sample-app:inspector, which is off in production'));
});

test('a preview without its preview-only flag UI fails', async () => {
  const out = await run('preview', { files: (f) => f.set('sample-app/states.html', html('States')) });
  assert.ok(out.includes('sample-app: flag sample-app:inspector is on in preview but no crawled page renders it'));
});

test('an external experience mounted locally fails', async () => {
  const out = await run('production', { files: (f) => f.set('kawaiui.html', html('KawaiUI copy')) });
  assert.ok(out.includes('/kawaiui: status 200, expected 404 ("kawaiui" is external and must never be mounted locally)'));
});

test('a single-page-app fallback (200 for everything) fails the 404 checks', async () => {
  const out = await run('production', { spaFallback: true });
  assert.ok(out.includes('/__pu-smoke-no-such-page: status 200, expected 404 (an unknown path)'));
  assert.ok(out.includes('/canary-draft: status 200, expected 404 ("canary-draft" is not released to production)'));
});

test('missing clean-URL and trailing-slash redirects fail', async () => {
  const out = await run('production', { noRedirects: true });
  assert.ok(out.includes('/sample-content.html: expected 308 to /sample-content, got 404'));
  assert.ok(out.includes('/sample-content/?pu=1: expected 308 to /sample-content?pu=1, got 404'));
});

test('hashed assets that are not immutable fail', async () => {
  const out = await run('production', { mutableAssets: true });
  assert.ok(out.includes('/_astro/App.js: cache-control "public, max-age=0, must-revalidate", expected a year and immutable'));
});
