// The UI's API client against the real Task 12 server on a temporary copy of the release file.
// The fetch below behaves like the browser on the UI origin: it sends that Origin and keeps the
// HttpOnly cookie the server sets, without the client ever seeing it.
import assert from 'node:assert/strict';
import { copyFileSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { serializeRelease } from '@pu/platform-schema';
import { loadCatalog, start } from '../../server/main.ts';
import { FileReleaseStore } from '../../server/store.ts';
import { ApiFailure, createClient, type Failure } from './api.ts';

const REAL = new URL('../../../../config/release.json', import.meta.url);
const realBytes = readFileSync(REAL);

async function freePort(): Promise<number> {
  const s = createServer();
  await new Promise<void>((r) => s.listen(0, '127.0.0.1', r));
  const { port } = s.address() as { port: number };
  await new Promise((r) => s.close(r));
  return port;
}

async function server(file: string, uiPort: number) {
  const port = await freePort();
  const s = await start({ store: new FileReleaseStore(file), catalog: loadCatalog(), port, uiPort, log: () => {} });
  return { ...s, port };
}

/** A browser on http://127.0.0.1:<uiPort>: sends its Origin, stores and returns the cookie. */
function browser(apiPort: () => number, uiPort: number) {
  let cookie = '';
  const fetchImpl = (async (url: string, init: RequestInit = {}) => {
    const headers = new Headers(init.headers);
    headers.set('origin', `http://127.0.0.1:${uiPort}`);
    if (cookie) headers.set('cookie', cookie);
    const res = await fetch(`http://127.0.0.1:${apiPort()}${url}`, { ...init, headers });
    const set = res.headers.get('set-cookie');
    if (set) cookie = set.split(';')[0]!;
    return res;
  }) as typeof fetch;
  return createClient(fetchImpl);
}

const failure = async (p: Promise<unknown>): Promise<Failure> => {
  try { await p; } catch (e) { assert.ok(e instanceof ApiFailure); return e.failure; }
  return assert.fail('expected a failure');
};

test('the UI client drives the real server: session, reads, preview, write, stale write, pending, revert', async (t) => {
  const dir = mkdtempSync(join(tmpdir(), 'pu-ui-int-'));
  const file = join(dir, 'release.json');
  copyFileSync(REAL, file);
  const uiPort = await freePort();
  const s = await server(file, uiPort);
  t.after(s.close);
  const client = browser(() => s.port, uiPort);

  await client.session();
  const registry = await client.registry();
  assert.ok(registry.data.experiences.some((e) => e.id === 'journal'));
  const detail = await client.experience('journal');
  assert.equal(detail.data.environments.production.mounted, true);
  const release = await client.release();
  const base = release.data.revision;
  assert.equal(release.data.baselineRevision, base);

  const patch = { op: 'setAccess', experienceId: 'journal', access: { kind: 'owner' } } as const;
  const preview = await client.preview(patch, base);
  assert.equal(preview.data.valid, true);
  assert.ok(preview.data.changes.some((c) => c.environment === 'production' && !c.after.mounted));
  assert.deepEqual(readFileSync(file), realBytes, 'a preview writes nothing');

  const written = await client.apply(patch, base);
  assert.equal(JSON.parse(readFileSync(file, 'utf8')).experiences.journal.access.kind, 'owner');
  assert.equal(readFileSync(file, 'utf8'), serializeRelease(written.data.state));

  // The same patch again with the old revision: refused, with the current state, nothing replayed.
  const stale = await failure(client.apply(patch, base));
  assert.equal(stale.kind === 'api' && stale.code, 'STALE_REVISION');
  assert.equal(stale.kind === 'api' && stale.current?.revision, written.data.revision);

  const pending = await client.pending();
  assert.equal(pending.data.changed, true);
  assert.deepEqual(pending.data.commands, ['git add config/release.json', 'git commit -m "Release: update journal"']);

  const reverted = await client.revert(pending.data.revision);
  assert.equal(reverted.data.revision, base);
  assert.deepEqual(readFileSync(file), realBytes);
  assert.equal((await client.pending()).data.changed, false);
  assert.equal((await client.registry()).data.experiences.find((e) => e.id === 'journal')!.environments.production.mounted, true);
});

test('after a server restart: reads renew the session and succeed; writes are not replayed', async (t) => {
  const dir = mkdtempSync(join(tmpdir(), 'pu-ui-int-'));
  const file = join(dir, 'release.json');
  copyFileSync(REAL, file);
  const uiPort = await freePort();
  let s = await server(file, uiPort);
  const client = browser(() => s.port, uiPort);
  await client.session();
  const base = (await client.release()).data.revision;

  const restart = async () => {
    await s.close();
    s = await server(file, uiPort); // new process, new token: the old cookie is now invalid
  };
  t.after(() => s.close());

  await s.close();
  assert.equal((await failure(client.registry())).kind, 'unavailable', 'server down');
  s = await server(file, uiPort);

  const before = readFileSync(file);
  const w = await failure(client.apply({ op: 'setNote', experienceId: 'journal', note: 'x' }, base));
  assert.equal(w.kind, 'session-reset');
  assert.deepEqual(readFileSync(file), before, 'the write was not replayed');
  // The write renewed the session, so the owner's next, confirmed attempt works.
  assert.equal((await client.apply({ op: 'setNote', experienceId: 'journal', note: 'x' }, base)).data.state.experiences.journal?.note, 'x');

  await restart();
  assert.ok((await client.registry()).data.experiences.length > 0, 'a read renews the session and is retried once');
});

test('an edit made in an editor surfaces as STALE_REVISION with the edited state', async (t) => {
  const dir = mkdtempSync(join(tmpdir(), 'pu-ui-int-'));
  const file = join(dir, 'release.json');
  copyFileSync(REAL, file);
  const uiPort = await freePort();
  const s = await server(file, uiPort);
  t.after(s.close);
  const client = browser(() => s.port, uiPort);
  await client.session();
  const base = (await client.release()).data.revision;
  const edited = realBytes.toString().replace('"Permanent leak', '"Edited. Permanent leak');
  writeFileSync(file, edited);
  const f = await failure(client.apply({ op: 'setDiscoverability', experienceId: 'journal', value: 'unlisted' }, base));
  assert.equal(f.kind === 'api' && f.code, 'STALE_REVISION');
  assert.match(f.kind === 'api' ? f.current!.state.experiences['canary-draft']!.note! : '', /^Edited/);
  assert.equal(readFileSync(file, 'utf8'), edited);
});

test('the real config/release.json was not touched', () => {
  assert.deepEqual(readFileSync(REAL), realBytes);
});
