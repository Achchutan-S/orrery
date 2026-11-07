// The Control Center API (blueprint 4.0, ADR-017). Handlers are thin: every rule comes from
// @pu/platform-schema, every file access goes through the ReleaseStore.
import { Hono, type Context } from 'hono';
import { bodyLimit } from 'hono/body-limit';
import { getCookie, setCookie } from 'hono/cookie';
import type { z } from 'zod';
import {
  API_ERRORS, applyPatch, channelOf, ENVIRONMENTS, ExperienceId, PatchRequest, releaseEntryFor, resolve, RevertRequest,
  serializeRelease, SessionRequest, validateRelease, zodIssues,
  type ApiErrorCode, type ApiSuccess, type EntryChange, type Experience, type HealthData, type Issue, type PendingData,
  type PreviewData, type RegistryData, type RegistryItem, type ReleaseData, type ReleasePatch, type ReleaseState,
  type ResolutionChange, type WriteData,
} from '@pu/platform-schema';
import { hostAllowed, originAllowed, tokenMatches, type Policy } from './security.ts';
import { StoreError, type ReleaseSnapshot, type ReleaseStore } from './store.ts';

export const SESSION_COOKIE = 'pu_control_session';
export const BODY_LIMIT = 64 * 1024;

export type Catalog = { experiences: Experience[]; issues: Issue[] };
export type Log = (event: string, fields?: Record<string, string | number | boolean>) => void;
export type AppOptions = {
  store: ReleaseStore;
  /** The validated catalog and folder coverage, loaded once at start. */
  catalog: Catalog;
  /** The release file as it was when the session started: Pending changes compares against it. */
  baseline: ReleaseSnapshot;
  token: string;
  policy: Policy;
  log: Log;
};

/** Methods per route. A known path with another method is 405, not 404. */
const ROUTES: Record<string, string[]> = {
  '/api/health': ['GET'],
  '/api/session': ['POST'],
  '/api/registry': ['GET'],
  '/api/experiences/:id': ['GET'],
  '/api/release': ['GET', 'PATCH'],
  '/api/release/preview': ['POST'],
  '/api/release/revert': ['POST'],
  '/api/release/pending': ['GET'],
};
const NO_SESSION = new Set(['/api/health', '/api/session']);
const READ = new Set(['GET', 'HEAD']);
const JSON_TYPE = /^application\/json\s*(;\s*charset=utf-8\s*)?$/i;

const HEADERS: [string, string][] = [
  ['Cache-Control', 'no-store'],
  ['Content-Security-Policy', "default-src 'none'; frame-ancestors 'none'"],
  ['Cross-Origin-Resource-Policy', 'same-origin'],
  ['Referrer-Policy', 'no-referrer'],
  ['X-Content-Type-Options', 'nosniff'],
  ['X-Frame-Options', 'DENY'],
  ['X-Robots-Tag', 'noindex'],
];

type ErrorExtra = { issues?: Issue[]; current?: { state: ReleaseState; revision: string }; allow?: string[] };

class ApiFailure extends Error {
  readonly code: ApiErrorCode;
  readonly extra: ErrorExtra;
  constructor(code: ApiErrorCode, message: string, extra: ErrorExtra = {}) {
    super(message);
    this.code = code;
    this.extra = extra;
  }
}

const fail = (code: ApiErrorCode, message: string, extra?: ErrorExtra): never => {
  throw new ApiFailure(code, message, extra);
};

const errorResponse = (c: Context, code: ApiErrorCode, message: string, { allow, current, ...extra }: ErrorExtra = {}) => {
  if (allow) c.header('Allow', allow.join(', '));
  // Only the documented fields of a snapshot leave the server.
  const snapshot = current && { current: { state: current.state, revision: current.revision } };
  return c.json({ ok: false, error: { code, message, ...extra, ...snapshot } }, API_ERRORS[code]);
};

const ok = <T>(c: Context, data: T, revision?: string) =>
  c.json({ ok: true, data, meta: revision ? { revision } : {} } satisfies ApiSuccess<T>);

async function body<T>(c: Context, schema: z.ZodType<T>): Promise<T> {
  let json: unknown;
  try {
    json = JSON.parse(await c.req.text());
  } catch {
    return fail('INVALID_JSON', 'The request body is not valid JSON.');
  }
  const parsed = schema.safeParse(json);
  return parsed.success ? parsed.data : fail('INVALID_REQUEST', 'The request body does not match its schema.', { issues: zodIssues(parsed.error, '') });
}

// ---- Views over the release state. All rules come from platform-schema. ----

const environments = (e: Experience, state: ReleaseState) =>
  Object.fromEntries(ENVIRONMENTS.map((env) => [env, resolve(e, state, env)])) as RegistryItem['environments'];

function resolutionChanges(catalog: readonly Experience[], before: ReleaseState, after: ReleaseState): ResolutionChange[] {
  return catalog.flatMap((e) => ENVIRONMENTS.flatMap((environment) => {
    const [b, a] = [resolve(e, before, environment), resolve(e, after, environment)];
    return JSON.stringify(b) === JSON.stringify(a) ? [] : [{ experienceId: e.id, environment, before: b, after: a }];
  }));
}

const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

function entryChanges(before: ReleaseState, after: ReleaseState): EntryChange[] {
  // Compare canonical forms, so key order and empty flag maps are not changes.
  const canon = (s: ReleaseState) => JSON.parse(serializeRelease(s)) as ReleaseState;
  const [b, a] = [canon(before), canon(after)];
  const out: EntryChange[] = same(b.platform, a.platform) ? [] : [{ scope: 'platform', before: b.platform, after: a.platform }];
  for (const id of [...new Set([...Object.keys(b.experiences), ...Object.keys(a.experiences)])].sort()) {
    const [x, y] = [b.experiences[id] ?? null, a.experiences[id] ?? null];
    if (!same(x, y)) out.push({ scope: 'experience', experienceId: id, before: x, after: y });
  }
  return out;
}

export function createApp(o: AppOptions): Hono {
  const app = new Hono();
  const byId = new Map(o.catalog.experiences.map((e) => [e.id, e]));
  const issuesOf = (state: ReleaseState) => [...o.catalog.issues, ...validateRelease(state, o.catalog.experiences)];

  const item = (e: Experience, state: ReleaseState, issues: Issue[]): RegistryItem => {
    const release = releaseEntryFor(state, e.id);
    return {
      id: e.id,
      definition: e,
      release,
      hasReleaseEntry: Object.hasOwn(state.experiences, e.id),
      channel: channelOf(release.lifecycle),
      environments: environments(e, state),
      issues: issues.filter((i) => [e.id, `experiences.${e.id}`].some((p) => i.path === p || i.path.startsWith(`${p}.`))),
    };
  };

  /** The state a patch would produce from the current file, or why it cannot. */
  async function plan(patch: ReleasePatch, baseRevision: string) {
    const current = await o.store.read();
    if (current.revision !== baseRevision) {
      fail('STALE_REVISION', 'The release file changed since it was loaded. Reload before retrying.', { current });
    }
    const target = patch.op === 'setFlag' ? (patch.scope === 'platform' ? undefined : patch.scope.experienceId) : patch.experienceId;
    if (target !== undefined && !byId.has(target)) fail('NOT_FOUND', `"${target}" is not in the catalog.`);
    const result = applyPatch(current.state, patch);
    if (!result.ok) {
      return { current, next: null, illegal: result.message, issues: [{ path: `experiences.${target}.lifecycle`, rule: 'transition', message: result.message }] };
    }
    return { current, next: result.state, illegal: null, issues: issuesOf(result.state) };
  }

  const writable = () => {
    if (o.catalog.issues.length > 0) {
      fail('CATALOG_INVALID', 'The catalog fails validation; the Control Center is read-only until the code is fixed.', { issues: o.catalog.issues });
    }
  };

  // Logging and response headers, outermost so they cover every response, errors included.
  app.use(async (c, next) => {
    const started = performance.now();
    await next();
    for (const [k, v] of HEADERS) c.res.headers.set(k, v);
    o.log('request', { method: c.req.method, path: c.req.path, status: c.res.status, ms: Math.round(performance.now() - started) });
  });

  // The security policy, in order: Host, Origin, session, then body rules for writes.
  app.use(async (c, next) => {
    if (!hostAllowed(o.policy, c.req.header('host'))) fail('INVALID_HOST', 'This server answers only to 127.0.0.1 and localhost.');
    const origin = c.req.header('origin');
    const write = !READ.has(c.req.method);
    // Writes need an allowed Origin; reads may omit it (same-origin GET) but never send a foreign one.
    if ((write || origin !== undefined) && !originAllowed(o.policy, origin)) {
      fail('INVALID_ORIGIN', 'Requests must come from the Control Center page.');
    }
    if (!NO_SESSION.has(c.req.path) && !tokenMatches(o.token, getCookie(c, SESSION_COOKIE))) {
      fail('UNAUTHORIZED', 'No valid Control Center session. Reload the Control Center page.');
    }
    if (write && !JSON_TYPE.test(c.req.header('content-type') ?? '')) {
      fail('UNSUPPORTED_MEDIA_TYPE', 'Request bodies must be application/json.');
    }
    await next();
  });

  app.use(bodyLimit({
    maxSize: BODY_LIMIT,
    onError: (c) => errorResponse(c, 'PAYLOAD_TOO_LARGE', `Request bodies are limited to ${BODY_LIMIT / 1024} KB.`),
  }));

  app.get('/api/health', (c) => ok<HealthData>(c, { service: 'orrery-control', status: 'ok' }));

  app.post('/api/session', async (c) => {
    await body(c, SessionRequest);
    // HttpOnly: page scripts never see the token. SameSite=Strict: other sites never send it.
    // Not Secure: the server speaks plain HTTP on loopback (ADR-017).
    setCookie(c, SESSION_COOKIE, o.token, { httpOnly: true, sameSite: 'Strict', path: '/api' });
    return ok(c, {});
  });

  app.get('/api/registry', async (c) => {
    const { state, revision } = await o.store.read();
    const issues = issuesOf(state);
    return ok<RegistryData>(c, { experiences: o.catalog.experiences.map((e) => item(e, state, issues)), issues }, revision);
  });

  app.get('/api/experiences/:id', async (c) => {
    const id = c.req.param('id');
    if (!ExperienceId.safeParse(id).success) fail('INVALID_REQUEST', 'Experience ids are lowercase letters, digits and hyphens.');
    const e = byId.get(id) ?? fail('NOT_FOUND', `"${id}" is not in the catalog.`);
    const { state, revision } = await o.store.read();
    return ok<RegistryItem>(c, item(e, state, issuesOf(state)), revision);
  });

  app.get('/api/release', async (c) => {
    const { state, revision } = await o.store.read();
    return ok<ReleaseData>(c, { state, revision, baselineRevision: o.baseline.revision, issues: issuesOf(state) }, revision);
  });

  app.post('/api/release/preview', async (c) => {
    const { patch, baseRevision } = await body(c, PatchRequest);
    const p = await plan(patch, baseRevision);
    const state = p.next ?? p.current.state;
    return ok<PreviewData>(c, {
      valid: p.issues.length === 0,
      issues: p.issues,
      state,
      changes: resolutionChanges(o.catalog.experiences, p.current.state, state),
    }, p.current.revision);
  });

  app.patch('/api/release', async (c) => {
    writable();
    const { patch, baseRevision } = await body(c, PatchRequest);
    const p = await plan(patch, baseRevision);
    if (p.illegal !== null) fail('ILLEGAL_TRANSITION', p.illegal, { issues: p.issues });
    if (p.issues.length > 0) fail('VALIDATION_FAILED', 'The change breaks release rules; nothing was written.', { issues: p.issues });
    const written = await o.store.write(p.next!, baseRevision);
    o.log('release.write', { op: patch.op, revision: written.revision.slice(0, 12) });
    return ok<WriteData>(c, { state: written.state, revision: written.revision, changes: resolutionChanges(o.catalog.experiences, p.current.state, written.state) }, written.revision);
  });

  app.post('/api/release/revert', async (c) => {
    writable();
    const { baseRevision } = await body(c, RevertRequest);
    const current = await o.store.read();
    if (current.revision !== baseRevision) fail('STALE_REVISION', 'The release file changed since it was loaded. Reload before retrying.', { current });
    // The baseline's own bytes, not a re-serialisation: a revert leaves no formatting diff behind.
    const written = entryChanges(current.state, o.baseline.state).length === 0 ? current : await o.store.write(o.baseline.bytes, baseRevision);
    if (written !== current) o.log('release.revert', { revision: written.revision.slice(0, 12) });
    return ok<WriteData>(c, { state: written.state, revision: written.revision, changes: resolutionChanges(o.catalog.experiences, current.state, written.state) }, written.revision);
  });

  app.get('/api/release/pending', async (c) => {
    const { state, revision } = await o.store.read();
    const entries = entryChanges(o.baseline.state, state);
    const ids = entries.map((e) => (e.scope === 'platform' ? 'platform flags' : e.experienceId));
    const message = `Release: update ${ids.join(', ')}`;
    return ok<PendingData>(c, {
      baselineRevision: o.baseline.revision,
      revision,
      changed: entries.length > 0,
      entries,
      changes: resolutionChanges(o.catalog.experiences, o.baseline.state, state),
      suggestedCommitMessage: entries.length > 0 ? message : '',
      commands: entries.length > 0 ? ['git add config/release.json', `git commit -m "${message}"`] : [],
    }, revision);
  });

  for (const [path, methods] of Object.entries(ROUTES)) {
    const allow = methods.includes('GET') ? [...methods, 'HEAD'] : methods;
    app.all(path, (c) => errorResponse(c, 'METHOD_NOT_ALLOWED', `Use ${allow.join(' or ')}.`, { allow }));
  }

  app.notFound((c) => errorResponse(c, 'NOT_FOUND', 'No such endpoint.'));

  app.onError((err, c) => {
    if (err instanceof ApiFailure) {
      if (err.code !== 'UNAUTHORIZED') o.log('request.rejected', { code: err.code });
      return errorResponse(c, err.code, err.message, err.extra);
    }
    if (err instanceof StoreError) {
      const cause = (err.cause as { code?: string } | undefined)?.code;
      o.log(err.code === 'STORE_UNAVAILABLE' ? 'store.error' : 'release.conflict', { code: err.code, ...(cause && { cause }) });
      return errorResponse(c, err.code, err.message, {
        ...(err.issues && { issues: err.issues }),
        ...(err.current && { current: err.current }),
      });
    }
    o.log('error', { name: err.name, message: err.message });
    return errorResponse(c, 'INTERNAL_ERROR', 'Unexpected server error. See the server log.');
  });

  return app;
}
