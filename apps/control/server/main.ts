// Starts the Control Center server on the owner's machine:
//   pnpm control:server        (or: pnpm --filter @pu/control dev)
// It listens on 127.0.0.1 only and never on Vercel or in CI. See apps/control/README.md.
import { existsSync, readdirSync } from 'node:fs';
import type { AddressInfo } from 'node:net';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createAdaptorServer } from '@hono/node-server';
import { catalog } from '@pu/experience-catalog';
import { validateCatalog, validateCoverage } from '@pu/platform-schema';
import { createApp, type Catalog, type Log } from './app.ts';
import { LOOPBACK, newToken, policy, portFrom, refuseToStart } from './security.ts';
import { FileReleaseStore, StoreError, type ReleaseStore } from './store.ts';

const repoRoot = fileURLToPath(new URL('../../../', import.meta.url));
const experiencesDir = join(repoRoot, 'apps/site/src/experiences');

/** Structured one-line logs (logfmt). Callers pass only safe fields: never tokens, cookies or bodies. */
export const logfmt: Log = (event, fields = {}) => {
  const pairs = Object.entries(fields).map(([k, v]) => `${k}=${typeof v === 'string' && /[\s"=]/.test(v) ? JSON.stringify(v) : v}`);
  console.log([new Date().toISOString(), event, ...pairs].join(' '));
};

/** The catalog and folder coverage, validated with the same functions the site build uses. */
export function loadCatalog(): Catalog {
  const { experiences, issues } = validateCatalog(catalog);
  const folders = readdirSync(experiencesDir, { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name);
  issues.push(...validateCoverage(experiences, folders, (entrypoint) => existsSync(join(experiencesDir, entrypoint))));
  return { experiences, issues };
}

/**
 * Reads the session baseline, creates a fresh session token and listens on 127.0.0.1:port.
 * Rejects (never falls back to another port or interface) if the port is taken.
 */
export async function start(o: { store: ReleaseStore; catalog: Catalog; port: number; log: Log; uiPort?: number }) {
  const baseline = await o.store.read();
  const server = createAdaptorServer({
    fetch: createApp({ ...o, baseline, token: newToken(), policy: policy(o.port, o.uiPort) }).fetch,
  });
  await new Promise<void>((done, failed) => {
    server.once('error', failed);
    server.listen(o.port, LOOPBACK, () => {
      server.off('error', failed);
      done();
    });
  });
  const close = () => new Promise<void>((done) => server.close(() => done()));
  return { address: server.address() as AddressInfo, close };
}

/**
 * The repository's own server: refuses in CI and on Vercel, validates PU_CONTROL_PORT, serves
 * config/release.json. Used by `pnpm control:server` and by the UI's `pnpm control`.
 * Throws with an owner-readable message instead of starting.
 */
export async function startLocal(env: Readonly<Record<string, string | undefined>>) {
  const refusal = refuseToStart(env);
  if (refusal) throw new Error(refusal);
  const port = portFrom(env.PU_CONTROL_PORT);
  const loaded = loadCatalog();
  let server;
  try {
    server = await start({ store: new FileReleaseStore(join(repoRoot, 'config/release.json')), catalog: loaded, port, log: logfmt });
  } catch (error) {
    const code = (error as { code?: string }).code;
    throw new Error(code === 'EADDRINUSE'
      ? `the port ${port} is already in use. Stop the other process (another \`pnpm control\`?) or set PU_CONTROL_PORT.`
      : error instanceof StoreError ? `${error.message}${error.issues ? `\n${error.issues.map((i) => `  ${i.path}: ${i.message}`).join('\n')}` : ''}`
      : (error as Error).message, { cause: error });
  }
  const { address } = server;
  logfmt('ready', { service: 'orrery-control', url: `http://${address.address}:${address.port}`, catalogIssues: loaded.issues.length });
  if (loaded.issues.length > 0) console.log('The catalog has validation issues, so writes are disabled. Run `pnpm check:metadata` for details.');
  return server;
}

if (process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const { address, close } = await startLocal(process.env);
    console.log(`Orrery Control Center server listening on http://${address.address}:${address.port} (loopback only). Press Ctrl+C to stop.`);
    for (const signal of ['SIGINT', 'SIGTERM'] as const) {
      process.once(signal, () => {
        logfmt('shutdown', { signal });
        void close().then(() => process.exit(0));
      });
    }
  } catch (error) {
    console.error(`Control Center server not started: ${(error as Error).message}`);
    process.exit(1);
  }
}
