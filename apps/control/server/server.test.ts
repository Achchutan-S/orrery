// The running server: loopback binding, raw HTTP, startup and shutdown.
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { copyFileSync, mkdtempSync, readFileSync } from 'node:fs';
import { createServer, connect } from 'node:net';
import { networkInterfaces, tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
import { loadCatalog, start } from './main.ts';
import { newToken, portFrom, refuseToStart, tokenMatches } from './security.ts';
import { FileReleaseStore } from './store.ts';

const REAL = new URL('../../../config/release.json', import.meta.url);
const MAIN = fileURLToPath(new URL('./main.ts', import.meta.url));

async function free(): Promise<number> {
  const s = createServer();
  await new Promise<void>((r) => s.listen(0, '127.0.0.1', r));
  const { port } = s.address() as { port: number };
  await new Promise((r) => s.close(r));
  return port;
}

async function running() {
  const dir = mkdtempSync(join(tmpdir(), 'pu-server-'));
  const file = join(dir, 'release.json');
  copyFileSync(REAL, file);
  const port = await free();
  const logs: string[] = [];
  const server = await start({ store: new FileReleaseStore(file), catalog: loadCatalog(), port, log: (e, f) => logs.push(`${e} ${JSON.stringify(f)}`) });
  return { ...server, port, logs };
}

/** Sends bytes as they are, so Host and the request line can be anything. */
function raw(port: number, request: string, host = '127.0.0.1'): Promise<string> {
  return new Promise((done, failed) => {
    const socket = connect(port, host, () => socket.end(request));
    let out = '';
    socket.on('data', (d) => { out += d; });
    socket.on('end', () => done(out));
    socket.on('error', failed);
  });
}
const status = (response: string) => Number(response.split(' ')[1]);

test('the server listens on 127.0.0.1 only', async (t) => {
  const s = await running();
  t.after(s.close);
  assert.equal(s.address.address, '127.0.0.1');
  assert.equal(s.address.family, 'IPv4');
  const lan = Object.values(networkInterfaces()).flat().find((i) => i && !i.internal && i.family === 'IPv4');
  if (lan) {
    await assert.rejects(raw(s.port, 'GET /api/health HTTP/1.1\r\nHost: 127.0.0.1\r\n\r\n', lan.address), /ECONNREFUSED/, `reachable on ${lan.address}`);
  } else t.diagnostic('no non-loopback IPv4 interface on this machine; LAN reachability not tested');
  await assert.rejects(raw(s.port, 'GET /api/health HTTP/1.1\r\nHost: [::1]\r\n\r\n', '::1'), /ECONNREFUSED|EADDRNOTAVAIL|ENETUNREACH/);
});

test('raw HTTP: Host injection, absolute-form targets and duplicate Host headers are refused', async (t) => {
  const s = await running();
  t.after(s.close);
  const ok = await raw(s.port, `GET /api/health HTTP/1.1\r\nHost: 127.0.0.1:${s.port}\r\nConnection: close\r\n\r\n`);
  assert.equal(status(ok), 200);
  for (const req of [
    `GET /api/health HTTP/1.1\r\nHost: evil.example\r\nConnection: close\r\n\r\n`,
    `GET /api/health HTTP/1.1\r\nHost: evil.example:${s.port}\r\nConnection: close\r\n\r\n`,
    `GET http://127.0.0.1:${s.port}/api/health HTTP/1.1\r\nHost: evil.example\r\nConnection: close\r\n\r\n`,
    `GET /api/health HTTP/1.1\r\nHost: evil.example\r\nHost: 127.0.0.1:${s.port}\r\nConnection: close\r\n\r\n`,
    `GET /api/health HTTP/1.1\r\nHost: 127.0.0.1:${s.port}\r\nHost: evil.example\r\nConnection: close\r\n\r\n`,
    `GET /api/health HTTP/1.1\r\nConnection: close\r\n\r\n`,
    `GET /api/health HTTP/1.0\r\n\r\n`,
  ]) {
    const r = await raw(s.port, req);
    assert.ok([400, 403].includes(status(r)), `${JSON.stringify(req)} -> ${r.split('\r\n')[0]}`);
  }
});

test('end to end over HTTP: bootstrap a session, read, write, and the cookie works only for this run', async (t) => {
  const a = await running();
  t.after(a.close);
  const base = `http://127.0.0.1:${a.port}`;
  // fetch() cannot set Host, so the UI's port is irrelevant here; Host is 127.0.0.1:<port>.
  const session = await fetch(`${base}/api/session`, { method: 'POST', headers: { origin: 'http://127.0.0.1:4317', 'content-type': 'application/json' }, body: '{}' });
  assert.equal(session.status, 200);
  const cookie = session.headers.get('set-cookie')!.split(';')[0]!;
  const release = await (await fetch(`${base}/api/release`, { headers: { cookie } })).json();
  assert.equal(release.ok, true);
  const write = await fetch(`${base}/api/release`, {
    method: 'PATCH', headers: { cookie, origin: 'http://127.0.0.1:4317', 'content-type': 'application/json' },
    body: JSON.stringify({ patch: { op: 'setNote', experienceId: 'journal', note: 'via HTTP' }, baseRevision: release.data.revision }),
  });
  assert.equal(write.status, 200);
  // A restarted server has a new token; the old cookie is dead.
  const b = await running();
  t.after(b.close);
  assert.equal((await fetch(`http://127.0.0.1:${b.port}/api/release`, { headers: { cookie } })).status, 401);
  assert.ok(!a.logs.join('\n').includes(cookie.split('=')[1]!));
});

test('a port in use is an error, never a fallback to another port or interface', async (t) => {
  const s = await running();
  t.after(s.close);
  await assert.rejects(start({ store: new FileReleaseStore(fileURLToPath(REAL)), catalog: loadCatalog(), port: s.port, log: () => {} }), /EADDRINUSE/);
});

test('the server refuses to run in CI or on Vercel, and validates PU_CONTROL_PORT', () => {
  assert.match(refuseToStart({ CI: 'true' })!, /CI/);
  assert.match(refuseToStart({ VERCEL: '1' })!, /Vercel/);
  assert.equal(refuseToStart({}), undefined);
  assert.equal(portFrom(undefined), 4318);
  assert.equal(portFrom('5000'), 5000);
  for (const bad of ['0', '80', '65536', '4317', 'abc', '4318 ', '-1', '1e4']) assert.throws(() => portFrom(bad), /PU_CONTROL_PORT/, bad);
});

test('tokens are 256-bit, unique, and compared strictly', () => {
  const tokens = new Set(Array.from({ length: 1000 }, newToken));
  assert.equal(tokens.size, 1000);
  for (const t of tokens) assert.match(t, /^[A-Za-z0-9_-]{43}$/);
  const [a, b] = [...tokens] as [string, string];
  assert.equal(tokenMatches(a, a), true);
  assert.equal(tokenMatches(a, b), false);
  assert.equal(tokenMatches(a, undefined), false);
  assert.equal(tokenMatches(a, `${a}x`), false);
  assert.equal(tokenMatches(a, a.slice(1)), false);
});

/** Runs `node server/main.ts` the way `pnpm control:server` does. */
function main(env: Record<string, string>) {
  const { CI: _ci, VERCEL: _v, ...clean } = process.env;
  const child = spawn(process.execPath, [MAIN], { env: { ...clean, ...env } });
  let out = '';
  child.stdout.on('data', (d) => { out += d; });
  child.stderr.on('data', (d) => { out += d; });
  const exit = new Promise<number | null>((r) => child.on('exit', (code) => r(code)));
  return { child, output: () => out, exit };
}

test('startup: prints where it listens and how to stop, never a token; Ctrl+C shuts down cleanly', { timeout: 15_000 }, async (t) => {
  const port = await free();
  const before = readFileSync(REAL);
  const run = main({ PU_CONTROL_PORT: String(port) });
  t.after(() => run.child.kill('SIGKILL'));
  while (!run.output().includes('Press Ctrl+C')) {
    if (run.child.exitCode !== null) assert.fail(run.output());
    await new Promise((r) => setTimeout(r, 25));
  }
  assert.match(run.output(), new RegExp(`listening on http://127\\.0\\.0\\.1:${port} \\(loopback only\\)`));
  assert.equal((await fetch(`http://127.0.0.1:${port}/api/health`)).status, 200);
  run.child.kill('SIGINT');
  assert.equal(await run.exit, 0);
  assert.match(run.output(), /shutdown signal=SIGINT/);
  assert.doesNotMatch(run.output(), /[A-Za-z0-9_-]{43}/, 'something token-shaped was printed');
  assert.deepEqual(readFileSync(REAL), before);
});

test('startup refuses in CI, on a taken port and on a bad port, with a reason', async (t) => {
  const ci = main({ CI: 'true' });
  assert.equal(await ci.exit, 1);
  assert.match(ci.output(), /not started: CI is set/);
  const s = await running();
  t.after(s.close);
  const taken = main({ PU_CONTROL_PORT: String(s.port) });
  assert.equal(await taken.exit, 1);
  assert.match(taken.output(), /not started: the port \d+ is already in use/);
  const bad = main({ PU_CONTROL_PORT: 'x' });
  assert.equal(await bad.exit, 1);
  assert.match(bad.output(), /PU_CONTROL_PORT must be/);
});
