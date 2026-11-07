// The one client for the Control Center API (apps/control/README.md). Components never call
// fetch() themselves. The session lives in an HttpOnly cookie: this code never sees the token.
import type {
  ApiErrorCode, Issue, PendingData, PreviewData, RegistryData, RegistryItem, ReleaseData, ReleasePatch,
  ReleaseState, WriteData,
} from '@pu/platform-schema';

export type Failure =
  /** The server answered with an error envelope. */
  | { kind: 'api'; status: number; code: ApiErrorCode; message: string; issues?: Issue[]; current?: { state: ReleaseState; revision: string } }
  /** No usable answer: the server is down, the proxy cannot reach it, or the network failed. */
  | { kind: 'unavailable'; message: string }
  /** A write met an expired session. The session was renewed; the write was not replayed. */
  | { kind: 'session-reset'; message: string };

export class ApiFailure extends Error {
  readonly failure: Failure;
  constructor(failure: Failure) {
    super(failure.message);
    this.failure = failure;
  }
}

export const failureOf = (e: unknown): Failure =>
  e instanceof ApiFailure ? e.failure : { kind: 'unavailable', message: 'The request could not be completed.' };

export const isCode = (e: unknown, ...codes: ApiErrorCode[]): boolean =>
  e instanceof ApiFailure && e.failure.kind === 'api' && codes.includes(e.failure.code);

export type Ok<T> = { data: T; revision?: string };

const UNAVAILABLE = 'The Control Center server is not responding.';

export function createClient(fetchImpl: typeof fetch = (...a) => fetch(...a), base = '/api') {
  async function call<T>(method: string, path: string, body?: unknown): Promise<Ok<T>> {
    let res: Response;
    try {
      res = await fetchImpl(`${base}${path}`, {
        method,
        credentials: 'same-origin',
        headers: body === undefined ? {} : { 'content-type': 'application/json' },
        body: body === undefined ? undefined : JSON.stringify(body),
      });
    } catch {
      throw new ApiFailure({ kind: 'unavailable', message: UNAVAILABLE });
    }
    let json: any;
    try {
      json = await res.json();
    } catch {
      // A proxy error page or an empty body: the API itself did not answer.
      throw new ApiFailure({ kind: 'unavailable', message: UNAVAILABLE });
    }
    if (json?.ok === true) return { data: json.data as T, revision: json.meta?.revision };
    if (json?.ok === false && typeof json.error?.code === 'string') {
      const { code, message, issues, current } = json.error;
      throw new ApiFailure({ kind: 'api', status: res.status, code, message, ...(issues && { issues }), ...(current && { current }) });
    }
    throw new ApiFailure({ kind: 'unavailable', message: UNAVAILABLE });
  }

  const session = () => call<Record<string, never>>('POST', '/session', {});

  /** Reads (and dry runs) renew an expired session and retry once. */
  async function read<T>(method: 'GET' | 'POST', path: string, body?: unknown): Promise<Ok<T>> {
    try {
      return await call<T>(method, path, body);
    } catch (e) {
      if (!isCode(e, 'UNAUTHORIZED')) throw e;
      await session();
      return call<T>(method, path, body);
    }
  }

  /** Writes are never replayed: after a session reset the owner reviews and confirms again. */
  async function write<T>(method: 'PATCH' | 'POST', path: string, body: unknown): Promise<Ok<T>> {
    try {
      return await call<T>(method, path, body);
    } catch (e) {
      if (!isCode(e, 'UNAUTHORIZED')) throw e;
      await session().catch(() => {});
      throw new ApiFailure({ kind: 'session-reset', message: 'The session had expired (the server restarted). It has been renewed; nothing was written.' });
    }
  }

  return {
    session,
    health: () => call<{ service: string; status: string }>('GET', '/health'),
    registry: () => read<RegistryData>('GET', '/registry'),
    experience: (id: string) => read<RegistryItem>('GET', `/experiences/${encodeURIComponent(id)}`),
    release: () => read<ReleaseData>('GET', '/release'),
    pending: () => read<PendingData>('GET', '/release/pending'),
    preview: (patch: ReleasePatch, baseRevision: string) => read<PreviewData>('POST', '/release/preview', { patch, baseRevision }),
    apply: (patch: ReleasePatch, baseRevision: string) => write<WriteData>('PATCH', '/release', { patch, baseRevision }),
    revert: (baseRevision: string) => write<WriteData>('POST', '/release/revert', { baseRevision }),
  };
}

export type Client = ReturnType<typeof createClient>;
