// Local-server security policy (blueprint 4.0, ADR-017). Pure functions; app.ts applies them.
import { randomBytes, timingSafeEqual } from 'node:crypto';

/** The only interface the server listens on. Not configurable. */
export const LOOPBACK = '127.0.0.1';
export const DEFAULT_PORT = 4318;
/** The Control Center frontend (task 13), which proxies /api to this server. */
export const UI_PORT = 4317;

export type Policy = { hosts: ReadonlySet<string>; origins: ReadonlySet<string> };

/**
 * Host values the server answers to: 127.0.0.1 or localhost on its own port (direct calls)
 * or the UI's port (requests forwarded by the UI's dev proxy). Anything else, including a
 * DNS-rebinding domain that resolves to 127.0.0.1, is refused. Origins: the UI only.
 */
export function policy(port: number, uiPort = UI_PORT): Policy {
  const names = [LOOPBACK, 'localhost'];
  return {
    hosts: new Set(names.flatMap((n) => [`${n}:${port}`, `${n}:${uiPort}`])),
    origins: new Set(names.map((n) => `http://${n}:${uiPort}`)),
  };
}

export const hostAllowed = (p: Policy, host: string | undefined): boolean =>
  host !== undefined && p.hosts.has(host.toLowerCase());

/** Exact match only: no "null", no other scheme or port, no suffix tricks. */
export const originAllowed = (p: Policy, origin: string | undefined): boolean =>
  origin !== undefined && p.origins.has(origin);

/** 32 random bytes from the OS CSPRNG, base64url: 43 characters. */
export const newToken = (): string => randomBytes(32).toString('base64url');

const TOKEN = /^[A-Za-z0-9_-]{43}$/;

export function tokenMatches(expected: string, given: string | undefined): boolean {
  if (given === undefined || !TOKEN.test(given)) return false;
  // Both are 43 ASCII characters here, so the lengths match and the comparison is constant-time.
  return timingSafeEqual(Buffer.from(expected), Buffer.from(given));
}

/**
 * The server is a tool for the owner's machine. It refuses to start in CI or on Vercel,
 * where nothing should ever run it (blueprint 4.0, "Excluded from production").
 */
export function refuseToStart(env: Readonly<Record<string, string | undefined>>): string | undefined {
  if (env.VERCEL) return 'VERCEL is set: the Control Center server never runs on Vercel.';
  if (env.CI) return 'CI is set: the Control Center server never runs in CI.';
  return undefined;
}

export function portFrom(value: string | undefined): number {
  if (value === undefined || value === '') return DEFAULT_PORT;
  const port = Number(value);
  if (!/^\d+$/.test(value) || port < 1024 || port > 65535 || port === UI_PORT) {
    throw new Error(`PU_CONTROL_PORT must be a port number from 1024 to 65535 other than ${UI_PORT}; got "${value}".`);
  }
  return port;
}
