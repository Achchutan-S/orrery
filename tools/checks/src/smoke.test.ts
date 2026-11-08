import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import { CANARY } from '@pu/experience-catalog';
import { fixtureRelease } from '@pu/experience-catalog/fixture-release';
import { loadPlatform, repoRoot } from './repo.ts';
import { smoke, type Fetch, type SmokeInput } from './smoke.ts';

// Synthetic deployments against a fixed release state (resume a draft), not config/release.json.
const { experiences } = loadPlatform();
const state = fixtureRelease();
const vercel = JSON.parse(readFileSync(join(repoRoot, 'apps/site/vercel.json'), 'utf8')) as SmokeInput['vercel'];
const GLOBAL = vercel.headers.find((h) => h.source === '/(.*)')!.headers;
const html = (title: string, body = '', image = '/og.png') => `<html><head><meta http-equiv="content-security-policy" content="x"><title>${title}</title><meta property="og:image" content="https://production.example${image}"></head><body>${body}</body></html>`;
const STATES = ['draft', 'alpha', 'beta', 'published', 'frozen', 'deprecated', 'archived'];

/** A fixture deployment behaving as a correct Vercel deployment of this site should. */
function site(env: 'production' | 'preview') {
  const files = new Map<string, string>([
    ['index.html', html('Orrery', ['/', '/journal', 'https://kawaiui.vercel.app/', 'https://devxray-one.vercel.app/', '/sample-content', '/sample-app'].map((h) => `<a href="${h}">x</a>`).join(''))],
    ['404.html', html('Not found')],
    ['journal.html', html('The Orrery Journal', '<a href="/journal/idea">1</a><a href="/journal/ahead">8</a>')],
    ['journal/idea.html', html('The idea')],
    ['journal/ahead.html', html('Where Orrery is going')],
    ['sample-content.html', html('Essay', '<link href="/_astro/fonts/f.woff2">')],
    ['sample-app.html', html('Explorer', ['states', ...STATES.map((s) => `states/${s}`)].map((v) => `<a href="/sample-app/${v}">x</a>`).join(''))],
    ['sample-app/states.html', html('States', `<script src="/_astro/App.js"></script>${env === 'preview' ? '<aside data-pu-flag="sample-app:inspector">' : ''}`)],
    ...STATES.map((s) => [`sample-app/states/${s}.html`, html(s)] as [string, string]),
    ['_astro/App.js', 'x()'],
    ['_astro/fonts/f.woff2', 'font'],
    ['favicon.svg', '<svg/>'],
    ['og.png', 'png'],
  ]);
  if (env === 'preview') {
    files.set('canary-draft.html', html(`${CANARY}-PAGE`));
    files.set('sample-hostile.html', html('Hostile'));
    files.set('resume.html', html('Resume', '<a href="/resume/resume.pdf">PDF</a>', '/resume/og.png'));
    files.set('resume/resume.pdf', '%PDF-1.4');
    files.set('resume/og.png', 'png');
    files.set('skills.html', html('The Claude Skills Archive', '<a href="/skills/guide">g</a><a href="/skills/shelf/learning">s</a><a href="/skills/sidequest">q</a>', '/skills/og.png'));
    files.set('skills/guide.html', html('How skills work', '', '/skills/og.png'));
    files.set('skills/og.png', 'png');
    files.set('skills/shelf/learning.html', html('Learning', '<a href="/skills/sidequest">q</a>', '/skills/og.png'));
    files.set('skills/sidequest.html', html('Side Quest', '<a href="/skills/sidequest/package.zip">zip</a><a href="/skills/sidequest/files/SKILL.md">md</a><a href="/skills/sidequest/files/scripts/quest.py">py</a>', '/skills/og.png'));
    files.set('skills/sidequest/package.zip', 'PK');
    files.set('skills/sidequest/files/SKILL.md', '---');
    files.set('skills/sidequest/files/scripts/quest.py', 'print()');
    files.set('divya-chakshu.html', html('Divya Chakshu'));
  }
  return files;
}

type Mutate = {
  files?: (f: Map<string, string>) => void; noHeaders?: boolean; noRedirects?: boolean; mutableAssets?: boolean; spaFallback?: boolean;
  /** Overrides the Content-Type for one path. */ types?: Record<string, string>; noHeadersOn404?: boolean; cachedHtml?: boolean;
};
const TYPES: Record<string, string> = { js: 'text/javascript; charset=utf-8', woff2: 'font/woff2', svg: 'image/svg+xml', png: 'image/png', pdf: 'application/pdf', md: 'text/markdown', zip: 'application/zip', py: '' };

function deployment(env: 'production' | 'preview', m: Mutate = {}): Fetch {
  const files = site(env);
  m.files?.(files);
  const respond = (p: string, body: string | undefined, status: number, headers: Headers, type: string) => {
    headers.set('content-type', m.types?.[p] ?? type);
    return new Response(body ?? null, { status, headers });
  };
  return async (url) => {
    const { pathname: p, search } = new URL(url);
    const headers = new Headers(m.noHeaders ? {} : Object.fromEntries(GLOBAL.map((h) => [h.key, h.value])));
    if (!m.noRedirects && p !== '/' && (p.endsWith('.html') || p.endsWith('/'))) {
      headers.set('location', `${p.replace(/\.html$|\/$/, '')}${search}`);
      return new Response(null, { status: 308, headers });
    }
    const ext = p.match(/\.(\w+)$/)?.[1]?.replace(/^html$/, '') || undefined;
    if (p.startsWith('/_astro/')) {
      if (!files.has(p.slice(1))) return respond(p, files.get('404.html'), 404, headers, 'text/html; charset=utf-8');
      headers.set('cache-control', m.mutableAssets ? 'public, max-age=0, must-revalidate' : 'public, max-age=31536000, immutable');
      return respond(p, files.get(p.slice(1)), 200, headers, TYPES[ext!]!);
    }
    headers.set('cache-control', m.cachedHtml ? 'public, max-age=3600' : 'public, max-age=0, must-revalidate');
    const body = files.get(p === '/' ? 'index.html' : ext ? p.slice(1) : `${p.slice(1)}.html`);
    if (body !== undefined) return respond(p, body, 200, headers, ext ? TYPES[ext]! : 'text/html; charset=utf-8');
    if (m.spaFallback) return respond(p, files.get('index.html'), 200, headers, 'text/html; charset=utf-8');
    if (m.noHeadersOn404) for (const { key } of GLOBAL) headers.delete(key);
    return respond(p, files.get('404.html'), 404, headers, 'text/html; charset=utf-8');
  };
}

const run = (env: 'production' | 'preview', m?: Mutate, target?: SmokeInput['target']) =>
  smoke({ base: 'https://pu.example', env, experiences, state: state!, vercel, target, fetch: deployment(env, m) })
    .then((f) => f.map((x) => `${x.file}: ${x.reason}`));

test('a listed experience must be linked from the index by its first route only; its other pages are fetched, not required on the index', async () => {
  const listed = { ...state!, experiences: { ...state!.experiences, skills: { lifecycle: 'published' as const, access: { kind: 'public' as const }, discoverability: 'listed' as const, flags: {} } } };
  const check = (link: boolean) => smoke({ base: 'https://pu.example', env: 'preview', experiences, state: listed, vercel, fetch: deployment('preview', {
    files: (f) => { if (link) f.set('index.html', f.get('index.html')!.replace('</body>', '<a href="/skills">s</a></body>')); },
  }) }).then((f) => f.map((x) => `${x.file}: ${x.reason}`));
  assert.deepEqual(await check(false), ['/: the index does not link listed "skills" (/skills)']);
  assert.deepEqual(await check(true), []);
});

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
  assert.ok(out.includes('/journal.html: expected 308 to /journal, got 404'));
  assert.ok(out.includes('/journal/?pu=1: expected 308 to /journal?pu=1, got 404'));
});

test('hashed assets that are not immutable fail', async () => {
  const out = await run('production', { mutableAssets: true });
  assert.ok(out.includes('/_astro/App.js: cache-control "public, max-age=0, must-revalidate", expected a year and immutable'));
});

test('a preview serves the draft resume\'s page, PDF and image; production 404s all three', async () => {
  assert.deepEqual(await run('preview'), []);
  const out = await run('production', { files: (f) => f.set('resume/resume.pdf', '%PDF-1.4') });
  assert.ok(out.includes('/resume/resume.pdf: status 200, expected 404 ("resume" is not released to production)'));
  const missing = await run('preview', { files: (f) => f.delete('resume/og.png') });
  assert.ok(missing.includes('/resume/og.png: status 404, expected 200 ("resume" is mounted in preview)'));
});

test('every response is served as what it is: pages as HTML, files, assets and platform files by type, charset allowed', async () => {
  const out = await run('production', { types: {
    '/_astro/App.js': 'text/html; charset=utf-8', '/_astro/fonts/f.woff2': 'application/octet-stream',
    '/favicon.svg': 'text/plain', '/og.png': 'text/html', '/sample-app/states': 'text/plain', '/__pu-smoke-no-such-page': 'application/json',
  } });
  assert.deepEqual(out.filter((l) => l.includes('content-type')).sort(), [
    '/__pu-smoke-no-such-page: content-type "application/json", expected text/html',
    '/_astro/App.js: content-type "text/html; charset=utf-8", expected text/javascript or application/javascript',
    '/_astro/fonts/f.woff2: content-type "application/octet-stream", expected font/woff2',
    '/favicon.svg: content-type "text/plain", expected image/svg+xml',
    '/og.png: content-type "text/html", expected image/png',
    '/sample-app/states: content-type "text/plain", expected text/html',
    '/sample-app/states?pu-smoke=1: content-type "text/plain", expected text/html',
  ]);
  const pdf = await run('preview', { types: { '/resume/resume.pdf': 'text/html; charset=utf-8' } });
  assert.ok(pdf.includes('/resume/resume.pdf: content-type "text/html; charset=utf-8", expected application/pdf'));
});

test('platform files and link-preview images must be served', async () => {
  const out = await run('production', { files: (f) => { f.delete('og.png'); f.delete('favicon.svg'); } });
  assert.ok(out.includes('/favicon.svg: status 404, expected 200 (a platform file)'));
  assert.ok(out.includes('/og.png: og:image answered 404, expected 200'));
  const resume = await run('preview', { files: (f) => f.delete('resume/og.png') });
  assert.ok(resume.includes('/resume/og.png: og:image answered 404, expected 200'));
});

test('vercel.json headers are required on every response, 404s included; pages revalidate on every request', async () => {
  const out = await run('production', { noHeadersOn404: true, cachedHtml: true });
  assert.ok(out.includes('/__pu-smoke-no-such-page: header X-Content-Type-Options is missing, expected "nosniff"'));
  assert.ok(out.includes('/canary-draft: header Strict-Transport-Security is missing, expected "max-age=63072000; includeSubDomains"'));
  assert.ok(out.includes('/journal: cache-control "public, max-age=3600", expected max-age=0 (revalidated on every request)'));
  assert.ok(out.includes('/favicon.svg: cache-control "public, max-age=3600", expected max-age=0 (revalidated on every request)'));
});

test('a local astro preview skips only what Vercel does; releases, 404s, types and canaries are still checked', async () => {
  const local = { noHeaders: true, noRedirects: true, mutableAssets: true, cachedHtml: true };
  assert.deepEqual(await run('production', local, 'local'), []);
  assert.deepEqual(await run('preview', local, 'local'), []);
  assert.ok((await run('production', local)).length > 0, 'the same server fails a Vercel run');
  const leaky = await run('production', { ...local, files: (f) => f.set('canary-draft.html', html(`${CANARY}-PAGE`)), types: { '/_astro/App.js': 'text/html' } }, 'local');
  assert.ok(leaky.includes('/canary-draft: status 200, expected 404 ("canary-draft" is not released to production)'));
  assert.ok(leaky.includes('/canary-draft: contains the canary token in production'));
  assert.ok(leaky.includes('/_astro/App.js: content-type "text/html", expected text/javascript or application/javascript'));
});

test('a network error is retried once, then reported with its path and cause instead of crashing', async () => {
  const ok = deployment('production');
  let flaky = 0;
  const once: Fetch = async (url, init) => { if (url.endsWith('/journal') && flaky++ === 0) throw new TypeError('fetch failed', { cause: { code: 'ECONNRESET' } }); return ok(url, init); };
  assert.deepEqual(await smoke({ base: 'https://pu.example', env: 'production', experiences, state: state!, vercel, fetch: once }), []);
  const down: Fetch = async (url, init) => { if (url.endsWith('/journal')) throw new TypeError('fetch failed', { cause: { code: 'ECONNRESET' } }); return ok(url, init); };
  const out = (await smoke({ base: 'https://pu.example', env: 'production', experiences, state: state!, vercel, fetch: down })).map((x) => `${x.file}: ${x.reason}`);
  assert.equal(out.at(-1), '/journal: request failed twice (ECONNRESET), a network error rather than an answer from the site; the run stopped here, so re-run it');
});
