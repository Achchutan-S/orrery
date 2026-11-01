import assert from 'node:assert/strict';
import { test } from 'node:test';
import { ApiFailure, createClient, failureOf } from './api.ts';

type Call = { url: string; init: RequestInit };
const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
const ok = (data: unknown, revision?: string) => json(200, { ok: true, data, meta: revision ? { revision } : {} });
const err = (status: number, code: string, extra: object = {}) => json(status, { ok: false, error: { code, message: `${code} message`, ...extra } });

/** A fetch that answers from a script, one response per call, and records every call. */
function scripted(...responses: (Response | Error)[]) {
  const calls: Call[] = [];
  const fetchImpl = (async (url: string, init: RequestInit) => {
    calls.push({ url, init });
    const next = responses.shift();
    if (!next) throw new Error('unexpected call');
    if (next instanceof Error) throw next;
    return next;
  }) as typeof fetch;
  return { calls, client: createClient(fetchImpl) };
}

const rejectsWith = async (p: Promise<unknown>) => {
  try {
    await p;
  } catch (e) {
    assert.ok(e instanceof ApiFailure);
    return e.failure;
  }
  assert.fail('expected a failure');
};

test('session bootstrap posts {} as JSON to /api/session with same-origin credentials', async () => {
  const { calls, client } = scripted(ok({}));
  assert.deepEqual((await client.session()).data, {});
  assert.equal(calls[0]!.url, '/api/session');
  assert.equal(calls[0]!.init.method, 'POST');
  assert.equal(calls[0]!.init.body, '{}');
  assert.equal(calls[0]!.init.credentials, 'same-origin');
  assert.deepEqual(calls[0]!.init.headers, { 'content-type': 'application/json' });
});

test('a successful read returns data and the revision from meta; reads send no body', async () => {
  const { calls, client } = scripted(ok({ experiences: [], issues: [] }, 'a'.repeat(64)));
  const r = await client.registry();
  assert.deepEqual(r, { data: { experiences: [], issues: [] }, revision: 'a'.repeat(64) });
  assert.equal(calls[0]!.init.method, 'GET');
  assert.equal(calls[0]!.init.body, undefined);
  assert.deepEqual(calls[0]!.init.headers, {});
});

test('error envelopes become typed failures with status, code, issues and current state', async () => {
  const current = { state: { platform: { flags: {} }, experiences: {} }, revision: 'b'.repeat(64) };
  const { client } = scripted(err(409, 'STALE_REVISION', { current }), err(422, 'VALIDATION_FAILED', { issues: [{ path: 'p', rule: 'r', message: 'm' }] }));
  assert.deepEqual(await rejectsWith(client.apply({ op: 'setNote', experienceId: 'journal', note: null }, 'a'.repeat(64))),
    { kind: 'api', status: 409, code: 'STALE_REVISION', message: 'STALE_REVISION message', current });
  const v = await rejectsWith(client.apply({ op: 'setNote', experienceId: 'journal', note: null }, 'a'.repeat(64)));
  assert.equal(v.kind === 'api' && v.issues?.[0]?.rule, 'r');
});

test('a network error, a non-JSON proxy page or a foreign JSON body all mean the server is unavailable', async () => {
  const { client } = scripted(new TypeError('fetch failed'), new Response('Internal Server Error', { status: 500 }), json(200, { hello: 1 }), new Response('', { status: 502 }));
  for (let i = 0; i < 4; i++) {
    const f = await rejectsWith(client.health());
    assert.equal(f.kind, 'unavailable');
  }
});

test('an expired session on a read: renew it and retry the read exactly once', async () => {
  const { calls, client } = scripted(err(401, 'UNAUTHORIZED'), ok({}), ok({ state: {} }, 'c'.repeat(64)));
  assert.equal((await client.release()).revision, 'c'.repeat(64));
  assert.deepEqual(calls.map((c) => `${c.init.method} ${c.url}`), ['GET /api/release', 'POST /api/session', 'GET /api/release']);
});

test('a read that is still unauthorized after renewal fails instead of looping', async () => {
  const { calls, client } = scripted(err(401, 'UNAUTHORIZED'), ok({}), err(401, 'UNAUTHORIZED'));
  const f = await rejectsWith(client.registry());
  assert.equal(f.kind === 'api' && f.code, 'UNAUTHORIZED');
  assert.equal(calls.length, 3);
});

test('a dry run is a read: it may be retried after renewal', async () => {
  const { calls, client } = scripted(err(401, 'UNAUTHORIZED'), ok({}), ok({ valid: true, issues: [], state: {}, changes: [] }, 'd'.repeat(64)));
  await client.preview({ op: 'setNote', experienceId: 'journal', note: null }, 'd'.repeat(64));
  assert.deepEqual(calls.map((c) => c.init.method), ['POST', 'POST', 'POST']);
});

test('an expired session on a write renews the session but never replays the write', async () => {
  for (const write of [
    (c: ReturnType<typeof createClient>) => c.apply({ op: 'setNote', experienceId: 'journal', note: null }, 'a'.repeat(64)),
    (c: ReturnType<typeof createClient>) => c.revert('a'.repeat(64)),
  ]) {
    const { calls, client } = scripted(err(401, 'UNAUTHORIZED'), ok({}));
    const f = await rejectsWith(write(client));
    assert.equal(f.kind, 'session-reset');
    assert.deepEqual(calls.map((c) => `${c.init.method} ${c.url}`).slice(1), ['POST /api/session']);
    assert.equal(calls.length, 2, 'the write was sent once');
  }
});

test('writes send the patch and base revision as JSON; ids are path-encoded', async () => {
  const { calls, client } = scripted(ok({ state: {}, revision: 'e'.repeat(64), changes: [] }, 'e'.repeat(64)), err(400, 'INVALID_REQUEST'));
  await client.apply({ op: 'transition', experienceId: 'journal', to: 'frozen' }, 'a'.repeat(64));
  assert.equal(calls[0]!.init.method, 'PATCH');
  assert.deepEqual(JSON.parse(calls[0]!.init.body as string), { patch: { op: 'transition', experienceId: 'journal', to: 'frozen' }, baseRevision: 'a'.repeat(64) });
  await client.experience('../x').catch(() => {});
  assert.equal(calls[1]!.url, '/api/experiences/..%2Fx');
});

test('the client never sends cookies or tokens itself; the browser does', async () => {
  const { calls, client } = scripted(ok({}), ok({}, 'a'.repeat(64)));
  await client.session();
  await client.pending();
  for (const c of calls) {
    const headers = (c.init.headers ?? {}) as Record<string, string>;
    assert.ok(!Object.keys(headers).some((h) => /cookie|authorization|token/i.test(h)));
  }
  assert.equal(failureOf(new Error('x')).kind, 'unavailable');
});
