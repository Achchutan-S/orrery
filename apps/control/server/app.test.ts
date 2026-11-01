// Contract and security tests for every endpoint, against the real Hono app, the real catalog
// and a private copy of config/release.json (the real file is never written).
import assert from 'node:assert/strict';
import { copyFileSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { API_ERRORS, serializeRelease, type ReleaseState } from '@pu/platform-schema';
import { BODY_LIMIT, createApp, SESSION_COOKIE, type Catalog } from './app.ts';
import { loadCatalog } from './main.ts';
import { newToken, policy } from './security.ts';
import { FileReleaseStore, revisionOf, type ReleaseStore } from './store.ts';

const REAL = new URL('../../../config/release.json', import.meta.url);
const realBytes = readFileSync(REAL);
const CATALOG = loadCatalog();
const HOST = '127.0.0.1:4318';
const UI = 'http://127.0.0.1:4317';

type Res = { status: number; headers: Headers; json: any; text: string };

async function setup(o: { catalog?: Catalog; store?: (file: string) => ReleaseStore } = {}) {
  const dir = mkdtempSync(join(tmpdir(), 'pu-control-'));
  const file = join(dir, 'release.json');
  copyFileSync(REAL, file);
  const store = o.store?.(file) ?? new FileReleaseStore(file);
  const token = newToken();
  const logs: string[] = [];
  const app = createApp({
    store, catalog: o.catalog ?? CATALOG, baseline: await new FileReleaseStore(file).read(), token, policy: policy(4318),
    log: (event, fields) => logs.push(`${event} ${JSON.stringify(fields ?? {})}`),
  });
  const responses: Res[] = [];

  /** Sends a request with valid Host, and for writes a valid Origin and content type, unless overridden. */
  async function call(method: string, path: string, init: { body?: unknown; headers?: Record<string, string | undefined>; session?: boolean } = {}): Promise<Res> {
    const write = method !== 'GET' && method !== 'HEAD';
    const headers: Record<string, string> = {};
    const merged: Record<string, string | undefined> = {
      host: HOST,
      ...(write && { origin: UI, 'content-type': 'application/json' }),
      ...(init.session !== false && { cookie: `${SESSION_COOKIE}=${token}` }),
      ...init.headers,
    };
    for (const [k, v] of Object.entries(merged)) if (v !== undefined) headers[k] = v;
    const body = init.body === undefined ? (write ? '{}' : undefined) : typeof init.body === 'string' ? init.body : JSON.stringify(init.body);
    const r = await app.request(`http://${HOST}${path}`, { method, headers, body });
    const text = await r.text();
    const res: Res = { status: r.status, headers: r.headers, text, json: text ? JSON.parse(text) : undefined };
    responses.push(res);
    // Envelope invariants hold for every response the API sends.
    if (method !== 'HEAD') {
      assert.equal(r.headers.get('content-type'), 'application/json');
      if (res.json.ok) assert.ok('data' in res.json && 'meta' in res.json, `${path}: success envelope`);
      else {
        assert.equal(res.json.ok, false);
        assert.equal(API_ERRORS[res.json.error.code as keyof typeof API_ERRORS], r.status, `${path}: ${res.json.error.code} has status ${r.status}`);
        assert.equal(typeof res.json.error.message, 'string');
        assert.doesNotMatch(res.json.error.message, /\/(Users|home|tmp|private|var)\/|at .*\.ts:\d+/, 'no paths or stack traces in messages');
      }
    }
    assert.equal(r.headers.get('cache-control'), 'no-store');
    assert.equal(r.headers.get('x-frame-options'), 'DENY');
    assert.equal(r.headers.get('cross-origin-resource-policy'), 'same-origin');
    for (const [k] of r.headers) assert.ok(!k.startsWith('access-control-'), `${path}: no CORS header (${k})`);
    return res;
  }
  const revision = async () => (await call('GET', '/api/release')).json.data.revision as string;
  return { dir, file, token, logs, responses, call, revision };
}

const errorCode = (r: Res) => r.json?.error?.code;
const patch = (p: object, baseRevision: string) => ({ body: { patch: p, baseRevision } });

// ---- Security policy ----

test('only 127.0.0.1 and localhost on the server and UI ports are accepted as Host', async () => {
  const { call } = await setup();
  for (const host of ['127.0.0.1:4318', 'localhost:4318', 'LOCALHOST:4318', '127.0.0.1:4317', 'localhost:4317']) {
    assert.equal((await call('GET', '/api/health', { headers: { host } })).status, 200, host);
  }
  for (const host of ['evil.example', 'evil.example:4318', '127.0.0.1', 'localhost', '127.0.0.1:4319', '127.0.0.1:4318.evil.example',
    'evil.example#127.0.0.1:4318', '127.0.0.1:4318@evil.example', '0.0.0.0:4318', '[::1]:4318', '127.1:4318', '2130706433:4318', '']) {
    const r = await call('GET', '/api/health', { headers: { host } });
    assert.equal(r.status, 403, host);
    assert.equal(errorCode(r), 'INVALID_HOST', host);
  }
});

test('X-Forwarded-Host is not trusted', async () => {
  const { call } = await setup();
  assert.equal(errorCode(await call('GET', '/api/health', { headers: { host: 'evil.example', 'x-forwarded-host': HOST } })), 'INVALID_HOST');
});

test('writes need the exact UI Origin; null, foreign, look-alike or missing origins are refused', async () => {
  const { call, revision, file } = await setup();
  const base = await revision();
  const write = { patch: { op: 'transition', experienceId: 'journal', to: 'frozen' }, baseRevision: base };
  for (const origin of [undefined, 'null', 'https://evil.example', 'http://127.0.0.1:4318', 'https://127.0.0.1:4317', 'http://127.0.0.1:4317.evil.example',
    'http://127.0.0.1:4317/', 'http://evil.example:4317', 'http://127.0.0.1:8080', 'HTTP://127.0.0.1:4317']) {
    for (const [method, path] of [['PATCH', '/api/release'], ['POST', '/api/session'], ['POST', '/api/release/revert']] as const) {
      const r = await call(method, path, { body: path === '/api/release' ? write : path === '/api/session' ? {} : { baseRevision: base }, headers: { origin } });
      assert.equal(errorCode(r), 'INVALID_ORIGIN', `${method} ${path} origin=${origin}`);
      assert.equal(r.headers.get('set-cookie'), null);
    }
  }
  assert.deepEqual(readFileSync(file), realBytes);
  for (const origin of [UI, 'http://localhost:4317']) {
    assert.equal((await call('POST', '/api/session', { headers: { origin } })).status, 200, origin);
  }
});

test('a read with a foreign Origin is refused; same-origin reads without Origin are allowed', async () => {
  const { call } = await setup();
  assert.equal(errorCode(await call('GET', '/api/registry', { headers: { origin: 'https://evil.example' } })), 'INVALID_ORIGIN');
  assert.equal((await call('GET', '/api/registry', { headers: { origin: UI } })).status, 200);
  assert.equal((await call('GET', '/api/registry')).status, 200);
});

test('every endpoint except health and session bootstrap needs the session cookie', async () => {
  const { call, revision } = await setup();
  const base = await revision();
  const routes: [string, string, unknown?][] = [
    ['GET', '/api/registry'], ['GET', '/api/experiences/journal'], ['GET', '/api/release'], ['GET', '/api/release/pending'],
    ['POST', '/api/release/preview', { patch: { op: 'transition', experienceId: 'journal', to: 'frozen' }, baseRevision: base }],
    ['PATCH', '/api/release', { patch: { op: 'transition', experienceId: 'journal', to: 'frozen' }, baseRevision: base }],
    ['POST', '/api/release/revert', { baseRevision: base }],
    ['GET', '/api/nope'],
  ];
  const otherServer = newToken(); // a token from a previous run of the server
  for (const [method, path, body] of routes) {
    for (const cookie of [undefined, `${SESSION_COOKIE}=`, `${SESSION_COOKIE}=short`, `${SESSION_COOKIE}=${'x'.repeat(43)}`, `${SESSION_COOKIE}=${otherServer}`, `other=${otherServer}`, `${SESSION_COOKIE}=${otherServer}%00`]) {
      const r = await call(method, path, { body, session: false, headers: { cookie } });
      assert.equal(r.status, 401, `${method} ${path} cookie=${cookie}`);
      assert.equal(errorCode(r), 'UNAUTHORIZED');
    }
  }
  assert.equal((await call('GET', '/api/health', { session: false })).status, 200);
  assert.equal((await call('POST', '/api/session', { session: false })).status, 200);
});

test('a token is not accepted from a header or the query string, only the HttpOnly cookie', async () => {
  const { call, token } = await setup();
  assert.equal((await call('GET', `/api/registry?token=${token}`, { session: false })).status, 401);
  assert.equal((await call('GET', '/api/registry', { session: false, headers: { 'x-control-token': token, authorization: `Bearer ${token}` } })).status, 401);
});

test('the session bootstrap sets an HttpOnly, SameSite=Strict, /api-scoped cookie, and the token appears nowhere else', async () => {
  const { call, token, logs, responses, revision } = await setup();
  const r = await call('POST', '/api/session', { session: false });
  assert.deepEqual(r.json, { ok: true, data: {}, meta: {} });
  const cookie = r.headers.get('set-cookie')!;
  assert.equal(cookie, `${SESSION_COOKIE}=${token}; Path=/api; HttpOnly; SameSite=Strict`);
  // Exercise every other endpoint, including failures, then look for the token everywhere.
  const base = await revision();
  await call('GET', '/api/registry');
  await call('GET', '/api/experiences/journal');
  await call('GET', '/api/release/pending');
  await call('POST', '/api/release/preview', patch({ op: 'transition', experienceId: 'journal', to: 'frozen' }, base));
  await call('PATCH', '/api/release', patch({ op: 'transition', experienceId: 'journal', to: 'frozen' }, base));
  await call('PATCH', '/api/release', patch({ op: 'transition', experienceId: 'journal', to: 'frozen' }, base));
  await call('GET', '/api/registry', { headers: { host: 'evil.example' } });
  await call('GET', '/api/registry', { session: false });
  for (const res of responses.filter((x) => x !== r)) {
    assert.ok(!res.text.includes(token), 'token in a response body');
    for (const [, v] of res.headers) assert.ok(!v.includes(token), 'token in a response header');
  }
  assert.ok(logs.length > 10);
  assert.ok(!logs.join('\n').includes(token), 'token in the log');
  assert.ok(!logs.join('\n').toLowerCase().includes('cookie'), 'cookies in the log');
});

test('write requests must be application/json and at most 64 KB', async () => {
  const { call, revision, file } = await setup();
  const base = await revision();
  const body = { patch: { op: 'setNote', experienceId: 'journal', note: 'x' }, baseRevision: base };
  for (const type of [undefined, 'text/plain', 'application/x-www-form-urlencoded', 'multipart/form-data; boundary=x', 'application/jsonp', 'application/json; charset=latin1']) {
    const r = await call('PATCH', '/api/release', { body, headers: { 'content-type': type } });
    assert.equal(errorCode(r), 'UNSUPPORTED_MEDIA_TYPE', String(type));
  }
  const big = { ...body, patch: { ...body.patch, note: 'x'.repeat(BODY_LIMIT) } };
  assert.equal(errorCode(await call('PATCH', '/api/release', { body: big })), 'PAYLOAD_TOO_LARGE');
  assert.deepEqual(readFileSync(file), realBytes);
  assert.equal((await call('PATCH', '/api/release', { body, headers: { 'content-type': 'application/json; charset=UTF-8' } })).status, 200);
});

test('GET and HEAD never change the release file', async () => {
  const { call, file } = await setup();
  for (const path of ['/api/health', '/api/registry', '/api/experiences/journal', '/api/release', '/api/release/pending']) {
    assert.equal((await call('GET', path)).status, 200, path);
    assert.equal((await call('HEAD', path)).status, 200, path);
  }
  // A GET to a write endpoint is not a write.
  assert.equal(errorCode(await call('GET', '/api/release/revert')), 'METHOD_NOT_ALLOWED');
  assert.deepEqual(readFileSync(file), realBytes);
});

test('unsupported methods are 405 with Allow; preflight gets no CORS headers', async () => {
  const { call } = await setup();
  const r = await call('DELETE', '/api/release');
  assert.equal(errorCode(r), 'METHOD_NOT_ALLOWED');
  assert.equal(r.headers.get('allow'), 'GET, PATCH, HEAD');
  assert.equal((await call('PUT', '/api/release')).headers.get('allow'), 'GET, PATCH, HEAD');
  assert.equal((await call('POST', '/api/registry')).headers.get('allow'), 'GET, HEAD');
  assert.equal((await call('GET', '/api/session')).headers.get('allow'), 'POST');
  const preflight = await call('OPTIONS', '/api/release', { session: false, headers: { origin: 'https://evil.example', 'access-control-request-method': 'PATCH', 'content-type': undefined } });
  assert.equal(errorCode(preflight), 'INVALID_ORIGIN');
});

test('every response carries the no-store, no-frame, no-sniff headers', async () => {
  const { call } = await setup();
  const r = await call('GET', '/api/health', { session: false });
  assert.equal(r.headers.get('content-security-policy'), "default-src 'none'; frame-ancestors 'none'");
  assert.equal(r.headers.get('x-content-type-options'), 'nosniff');
  assert.equal(r.headers.get('referrer-policy'), 'no-referrer');
  assert.equal(r.headers.get('x-robots-tag'), 'noindex');
});

// ---- Read endpoints ----

test('GET /api/health: minimal status, no session needed', async () => {
  const { call } = await setup();
  assert.deepEqual((await call('GET', '/api/health', { session: false })).json, { ok: true, data: { service: 'orrery-control', status: 'ok' }, meta: {} });
});

test('GET /api/registry: every catalog entry with its release entry, channel and environment matrix', async () => {
  const { call, revision } = await setup();
  const r = await call('GET', '/api/registry');
  assert.equal(r.json.meta.revision, await revision());
  assert.deepEqual(r.json.data.issues, []);
  const items = r.json.data.experiences as any[];
  assert.deepEqual(items.map((i) => i.id), CATALOG.experiences.map((e) => e.id));
  const journal = items.find((i) => i.id === 'journal');
  assert.equal(journal.definition.title, 'The Orrery Journal');
  assert.deepEqual(journal.definition.routes.map((x: any) => x.pattern), ['/journal', '/journal/[chapter]']);
  assert.equal(journal.release.lifecycle, 'published');
  assert.equal(journal.channel, 'stable');
  assert.equal(journal.hasReleaseEntry, true);
  assert.deepEqual(journal.environments.production, { id: 'journal', deployable: true, mounted: true, listed: true, flags: {} });
  const canary = items.find((i) => i.id === 'canary-draft');
  assert.deepEqual([canary.environments.development.mounted, canary.environments.preview.mounted, canary.environments.production.mounted], [true, true, false]);
  assert.equal(canary.channel, null);
  const app = items.find((i) => i.id === 'sample-app');
  assert.deepEqual([app.environments.preview.flags, app.environments.production.flags], [{ inspector: true }, { inspector: false }]);
  const kawaiui = items.find((i) => i.id === 'kawaiui');
  assert.deepEqual([kawaiui.definition.kind, kawaiui.environments.production.mounted, kawaiui.environments.production.listed], ['external', false, true]);
});

test('GET /api/experiences/:id: one entry; unknown ids are 404, malformed ids 400', async () => {
  const { call } = await setup();
  const r = await call('GET', '/api/experiences/sample-app');
  assert.equal(r.json.data.id, 'sample-app');
  assert.deepEqual(Object.keys(r.json.data.environments), ['development', 'preview', 'production']);
  assert.equal(errorCode(await call('GET', '/api/experiences/no-such-thing')), 'NOT_FOUND');
  for (const id of ['..%2Fconfig', 'Journal', '%00', 'a', 'x'.repeat(41), '__proto__']) {
    assert.equal(errorCode(await call('GET', `/api/experiences/${id}`)), 'INVALID_REQUEST', id);
  }
  assert.equal(errorCode(await call('GET', '/api/experiences/constructor')), 'NOT_FOUND');
  assert.equal(errorCode(await call('GET', '/api/experiences/journal/extra')), 'NOT_FOUND');
});

test('GET /api/release: state, revision, session baseline and rule issues', async () => {
  const { call } = await setup();
  const r = await call('GET', '/api/release');
  assert.equal(r.json.data.revision, revisionOf(realBytes));
  assert.equal(r.json.data.baselineRevision, revisionOf(realBytes));
  assert.deepEqual(r.json.data.issues, []);
  assert.equal(r.json.data.state.experiences.journal.lifecycle, 'published');
});

test('edits made in an editor appear on the next read, and rule violations are reported per experience', async () => {
  const { call, file } = await setup();
  writeFileSync(file, readFileSync(file, 'utf8').replace(/("canary-draft": \{\n\s+"lifecycle": )"draft"/, '$1"alpha"').replace(/("canary-draft": \{[^}]+"kind": )"owner"/, '$1"public"'));
  const r = await call('GET', '/api/experiences/canary-draft');
  assert.equal(r.json.data.release.lifecycle, 'alpha');
  assert.deepEqual(r.json.data.issues.map((i: any) => i.rule), ['alpha-non-public']);
  assert.deepEqual((await call('GET', '/api/release')).json.data.issues.map((i: any) => i.rule), ['alpha-non-public']);
});

// ---- Write path ----

test('POST /api/release/preview: a dry run with issues and the resolution diff; nothing is written', async () => {
  const { call, revision, file } = await setup();
  const base = await revision();
  const r = await call('POST', '/api/release/preview', patch({ op: 'setAccess', experienceId: 'journal', access: { kind: 'owner' } }, base));
  assert.equal(r.json.data.valid, true);
  assert.equal(r.json.data.state.experiences.journal.access.kind, 'owner');
  // Owner access: still built locally and in previews, but no longer listed; gone from production.
  assert.deepEqual(r.json.data.changes.map((c: any) => `${c.experienceId}:${c.environment}:${c.after.mounted}:${c.after.listed}`),
    ['journal:development:true:false', 'journal:preview:true:false', 'journal:production:false:false']);
  const illegal = await call('POST', '/api/release/preview', patch({ op: 'transition', experienceId: 'journal', to: 'draft' }, base));
  assert.equal(illegal.status, 200);
  assert.equal(illegal.json.data.valid, false);
  assert.deepEqual(illegal.json.data.issues.map((i: any) => i.rule), ['transition']);
  assert.deepEqual(illegal.json.data.changes, []);
  assert.deepEqual(readFileSync(file), realBytes);
});

test('PATCH /api/release: applies one change, writes canonically and keeps every other entry', async () => {
  const { call, revision, file } = await setup();
  const base = await revision();
  const r = await call('PATCH', '/api/release', patch({ op: 'setDiscoverability', experienceId: 'journal', value: 'unlisted' }, base));
  assert.equal(r.status, 200);
  const before = JSON.parse(realBytes.toString()) as ReleaseState;
  const after = JSON.parse(readFileSync(file, 'utf8')) as ReleaseState;
  assert.equal(after.experiences.journal?.discoverability, 'unlisted');
  for (const id of Object.keys(before.experiences).filter((x) => x !== 'journal')) assert.deepEqual(after.experiences[id], before.experiences[id], id);
  assert.equal(readFileSync(file, 'utf8'), serializeRelease(r.json.data.state));
  assert.equal(r.json.data.revision, revisionOf(readFileSync(file)));
  assert.equal(r.json.meta.revision, r.json.data.revision);
  assert.deepEqual(r.json.data.changes.map((c: any) => `${c.environment}:${c.after.listed}`), ['development:false', 'preview:false', 'production:false']);
});

test('promotion is a transition: draft to beta with owner access reaches no environment it was not in', async () => {
  const { call, revision } = await setup();
  let base = await revision();
  const promoted = await call('PATCH', '/api/release', patch({ op: 'transition', experienceId: 'sample-hostile', to: 'beta' }, base));
  assert.equal(promoted.status, 200);
  assert.deepEqual(promoted.json.data.changes, [], 'owner access keeps it out of production');
  base = promoted.json.data.revision;
  const opened = await call('POST', '/api/release/preview', patch({ op: 'setAccess', experienceId: 'sample-hostile', access: { kind: 'public' } }, base));
  assert.deepEqual(opened.json.data.changes.map((c: any) => `${c.environment}:${c.after.mounted}`), ['production:true']);
});

test('lifecycle and release rules are enforced: ILLEGAL_TRANSITION and VALIDATION_FAILED, nothing written', async () => {
  const { call, revision, file } = await setup();
  const base = await revision();
  const illegal = await call('PATCH', '/api/release', patch({ op: 'transition', experienceId: 'journal', to: 'alpha' }, base));
  assert.equal(errorCode(illegal), 'ILLEGAL_TRANSITION');
  assert.equal(illegal.json.error.message, 'journal: published cannot move to alpha');
  const archived = await call('PATCH', '/api/release', patch({ op: 'transition', experienceId: 'canary-draft', to: 'archived' }, base));
  assert.equal(errorCode(archived), 'ILLEGAL_TRANSITION');
  const undeclared = await call('PATCH', '/api/release', patch({ op: 'setFlag', scope: { experienceId: 'journal' }, flag: 'confetti', value: { preview: true, production: true } }, base));
  assert.equal(errorCode(undeclared), 'VALIDATION_FAILED');
  assert.deepEqual(undeclared.json.error.issues.map((i: any) => [i.path, i.rule]), [['experiences.journal.flags.confetti', 'undeclared-flag']]);
  const alphaPublic = await call('PATCH', '/api/release', patch({ op: 'transition', experienceId: 'canary-draft', to: 'alpha' }, base));
  assert.equal(alphaPublic.status, 200);
  const open = await call('PATCH', '/api/release', patch({ op: 'setAccess', experienceId: 'canary-draft', access: { kind: 'public' } }, alphaPublic.json.data.revision));
  assert.equal(errorCode(open), 'VALIDATION_FAILED');
  assert.deepEqual(open.json.error.issues.map((i: any) => i.rule), ['alpha-non-public']);
  assert.equal(JSON.parse(readFileSync(file, 'utf8')).experiences['canary-draft'].access.kind, 'owner');
});

test('malformed requests: INVALID_JSON, INVALID_REQUEST with issues, unknown experience NOT_FOUND', async () => {
  const { call, revision, file } = await setup();
  const base = await revision();
  for (const body of ['{', '', 'undefined', "{'a':1}"]) assert.equal(errorCode(await call('PATCH', '/api/release', { body })), 'INVALID_JSON', body);
  const bad: [string, unknown][] = [
    ['missing revision', { patch: { op: 'transition', experienceId: 'journal', to: 'frozen' } }],
    ['bad revision', { patch: { op: 'transition', experienceId: 'journal', to: 'frozen' }, baseRevision: 'abc' }],
    ['unknown field', { patch: { op: 'transition', experienceId: 'journal', to: 'frozen' }, baseRevision: base, force: true }],
    ['unknown op', { patch: { op: 'delete', experienceId: 'journal' }, baseRevision: base }],
    ['unknown lifecycle', { patch: { op: 'transition', experienceId: 'journal', to: 'live' }, baseRevision: base }],
    ['Phase 4 access', { patch: { op: 'setAccess', experienceId: 'journal', access: { kind: 'signed-in' } }, baseRevision: base }],
    ['array', [1, 2]],
    ['null', null],
  ];
  for (const [name, body] of bad) {
    const r = await call('PATCH', '/api/release', { body });
    assert.equal(errorCode(r), 'INVALID_REQUEST', name);
    assert.ok(Array.isArray(r.json.error.issues) && r.json.error.issues.length > 0, name);
  }
  assert.equal(errorCode(await call('PATCH', '/api/release', patch({ op: 'transition', experienceId: 'not-in-catalog', to: 'beta' }, base))), 'NOT_FOUND');
  assert.equal(errorCode(await call('POST', '/api/release/preview', patch({ op: 'setNote', experienceId: 'not-in-catalog', note: null }, base))), 'NOT_FOUND');
  assert.equal(errorCode(await call('POST', '/api/session', { body: { token: 'x' } })), 'INVALID_REQUEST');
  assert.deepEqual(readFileSync(file), realBytes);
});

test('two clients, one revision: A writes, B is told its revision is stale and A survives', async () => {
  const { call, revision, file } = await setup();
  const seen = await revision(); // both clients loaded this
  const a = await call('PATCH', '/api/release', patch({ op: 'setDiscoverability', experienceId: 'journal', value: 'unlisted' }, seen));
  assert.equal(a.status, 200);
  const b = await call('PATCH', '/api/release', patch({ op: 'setAccess', experienceId: 'sample-content', access: { kind: 'owner' } }, seen));
  assert.equal(errorCode(b), 'STALE_REVISION');
  assert.equal(b.json.error.current.revision, a.json.data.revision);
  assert.equal(b.json.error.current.state.experiences.journal.discoverability, 'unlisted');
  const now = JSON.parse(readFileSync(file, 'utf8'));
  assert.equal(now.experiences.journal.discoverability, 'unlisted');
  assert.equal(now.experiences['sample-content'].access.kind, 'public');
  assert.equal(errorCode(await call('POST', '/api/release/preview', patch({ op: 'setNote', experienceId: 'journal', note: null }, seen))), 'STALE_REVISION');
});

test('simultaneous writes with one revision: exactly one succeeds', async () => {
  const { call, revision } = await setup();
  const seen = await revision();
  const results = await Promise.all([
    call('PATCH', '/api/release', patch({ op: 'setNote', experienceId: 'journal', note: 'A' }, seen)),
    call('PATCH', '/api/release', patch({ op: 'setNote', experienceId: 'journal', note: 'B' }, seen)),
    call('PATCH', '/api/release', patch({ op: 'setNote', experienceId: 'journal', note: 'C' }, seen)),
  ]);
  assert.deepEqual(results.map((r) => r.status).sort(), [200, 409, 409]);
});

test('an editor saving during a write is a WRITE_CONFLICT and the editor wins', async () => {
  let edit = () => {};
  const { call, revision, file } = await setup({ store: (f) => new FileReleaseStore(f, { beforeRename: () => edit() }) });
  const base = await revision();
  const edited = realBytes.toString().replace('"Permanent leak', '"Edited. Permanent leak');
  edit = () => writeFileSync(file, edited);
  const r = await call('PATCH', '/api/release', patch({ op: 'setNote', experienceId: 'journal', note: 'x' }, base));
  assert.equal(errorCode(r), 'WRITE_CONFLICT');
  assert.equal(r.json.error.current.revision, revisionOf(edited));
  assert.equal(readFileSync(file, 'utf8'), edited);
});

test('pending changes and revert: diff against the session baseline, commands to run, never run', async () => {
  const { call, revision, file } = await setup();
  const clean = await call('GET', '/api/release/pending');
  assert.deepEqual({ ...clean.json.data, baselineRevision: 0, revision: 0 }, { baselineRevision: 0, revision: 0, changed: false, entries: [], changes: [], suggestedCommitMessage: '', commands: [] });
  const w = await call('PATCH', '/api/release', patch({ op: 'setAccess', experienceId: 'journal', access: { kind: 'owner' } }, await revision()));
  await call('PATCH', '/api/release', patch({ op: 'setFlag', scope: 'platform', flag: 'beacon', value: { preview: true, production: false } }, w.json.data.revision));
  const p = (await call('GET', '/api/release/pending')).json.data;
  assert.equal(p.changed, true);
  assert.deepEqual(p.entries.map((e: any) => e.scope === 'platform' ? 'platform' : `${e.experienceId}:${e.before.access.kind}>${e.after.access.kind}`), ['platform', 'journal:public>owner']);
  assert.deepEqual(p.changes.map((c: any) => `${c.experienceId}:${c.environment}`), ['journal:development', 'journal:preview', 'journal:production']);
  assert.equal(p.suggestedCommitMessage, 'Release: update platform flags, journal');
  assert.deepEqual(p.commands, ['git add config/release.json', 'git commit -m "Release: update platform flags, journal"']);
  // Revert needs the current revision too.
  assert.equal(errorCode(await call('POST', '/api/release/revert', { body: { baseRevision: w.json.data.revision } })), 'STALE_REVISION');
  const r = await call('POST', '/api/release/revert', { body: { baseRevision: p.revision } });
  assert.equal(r.status, 200);
  assert.deepEqual(readFileSync(file), realBytes);
  assert.equal(r.json.data.revision, p.baselineRevision);
  assert.equal((await call('GET', '/api/release/pending')).json.data.changed, false);
  // Reverting with nothing to revert is a no-op.
  assert.equal((await call('POST', '/api/release/revert', { body: { baseRevision: r.json.data.revision } })).json.data.revision, r.json.data.revision);
});

// ---- Failure modes ----

test('a broken release file is STORE_UNAVAILABLE on reads and writes, with schema issues when it parses', async () => {
  const { call, file } = await setup();
  writeFileSync(file, '{ not json');
  const r = await call('GET', '/api/registry');
  assert.equal(errorCode(r), 'STORE_UNAVAILABLE');
  assert.match(r.json.error.message, /not valid JSON/);
  writeFileSync(file, JSON.stringify({ platform: { flags: {} }, experiences: { journal: { lifecycle: 'live' } } }));
  const s = await call('GET', '/api/release');
  assert.equal(errorCode(s), 'STORE_UNAVAILABLE');
  assert.ok(s.json.error.issues.length > 0);
  rmSync(file);
  assert.equal(errorCode(await call('GET', '/api/release/pending')), 'STORE_UNAVAILABLE');
  assert.equal(errorCode(await call('PATCH', '/api/release', patch({ op: 'setNote', experienceId: 'journal', note: null }, 'a'.repeat(64)))), 'STORE_UNAVAILABLE');
});

test('an invalid catalog makes the API read-only: CATALOG_INVALID on writes, reads still work', async () => {
  const issue = { path: 'journal.routes', rule: 'entrypoint-missing', message: 'Entrypoint missing' };
  const { call, revision, file } = await setup({ catalog: { experiences: CATALOG.experiences, issues: [issue] } });
  const base = await revision();
  const w = await call('PATCH', '/api/release', patch({ op: 'setNote', experienceId: 'journal', note: null }, base));
  assert.equal(errorCode(w), 'CATALOG_INVALID');
  assert.deepEqual(w.json.error.issues, [issue]);
  assert.equal(errorCode(await call('POST', '/api/release/revert', { body: { baseRevision: base } })), 'CATALOG_INVALID');
  const reg = await call('GET', '/api/registry');
  assert.deepEqual(reg.json.data.experiences.find((e: any) => e.id === 'journal').issues, [issue]);
  assert.deepEqual(readFileSync(file), realBytes);
});

test('an unexpected failure is a generic INTERNAL_ERROR with no detail in the response', async () => {
  const boom: ReleaseStore = { read: () => Promise.reject(new Error('EACCES /Users/owner/secret/path')), write: () => Promise.reject(new Error('x')) };
  const { call, logs } = await setup({ store: () => boom });
  const r = await call('GET', '/api/registry');
  assert.equal(r.status, 500);
  assert.deepEqual(r.json, { ok: false, error: { code: 'INTERNAL_ERROR', message: 'Unexpected server error. See the server log.' } });
  assert.ok(logs.some((l) => l.startsWith('error ')));
});

test('unknown endpoints are NOT_FOUND', async () => {
  const { call } = await setup();
  for (const path of ['/', '/api', '/api/releases', '/config/release.json', '/api/release/../../config/release.json']) {
    assert.equal(errorCode(await call('GET', path)), 'NOT_FOUND', path);
  }
});

test('the real config/release.json was never modified by these tests', () => {
  assert.deepEqual(readFileSync(REAL), realBytes);
});
