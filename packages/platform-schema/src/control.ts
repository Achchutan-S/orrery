import { z } from 'zod';
import type { Experience } from './definition.ts';
import { Discoverability, FlagValue, Lifecycle, type ReleaseEntry, type ReleaseState } from './release.ts';
import type { Environment, Resolution } from './resolve.ts';
import type { Issue } from './validate.ts';

// Control Center V1: patch operations, the canonical release-file format and the API
// contract between apps/control/server and its frontend. Request schemas are strict:
// an unknown field is an error, never silently dropped.
export const ExperienceId = z.string().regex(/^[a-z][a-z0-9-]{1,39}$/);

export const ReleasePatch = z.discriminatedUnion('op', [
  z.strictObject({ op: z.literal('transition'), experienceId: ExperienceId, to: Lifecycle }),
  z.strictObject({
    op: z.literal('setAccess'),
    experienceId: ExperienceId,
    // V1 subset: owner means "not released" until Phase 4.
    access: z.discriminatedUnion('kind', [
      z.strictObject({ kind: z.literal('public') }),
      z.strictObject({ kind: z.literal('owner') }),
    ]),
  }),
  z.strictObject({ op: z.literal('setDiscoverability'), experienceId: ExperienceId, value: Discoverability }),
  z.strictObject({
    op: z.literal('setFlag'),
    scope: z.union([z.literal('platform'), z.strictObject({ experienceId: ExperienceId })]),
    flag: z.string().regex(/^[a-zA-Z][a-zA-Z0-9-]{0,39}$/),
    value: FlagValue,
  }),
  z.strictObject({ op: z.literal('setNote'), experienceId: ExperienceId, note: z.string().nullable() }),
]);
export type ReleasePatch = z.infer<typeof ReleasePatch>;

/**
 * The one way release.json is written: experience ids sorted, fixed field order, empty
 * flag maps omitted, two-space indent, trailing newline. Git diffs then show only real
 * changes, and writing an unchanged state reproduces the same bytes.
 */
export function serializeRelease(state: ReleaseState): string {
  const flags = (f: Record<string, z.output<typeof FlagValue>>) => Object.fromEntries(Object.keys(f).sort()
    .map((k) => [k, { preview: f[k]!.preview, production: f[k]!.production, ...(f[k]!.audience !== undefined && { audience: f[k]!.audience }) }]));
  const entry = (e: ReleaseEntry) => ({
    lifecycle: e.lifecycle,
    access: e.access,
    discoverability: e.discoverability,
    ...(Object.keys(e.flags).length > 0 && { flags: flags(e.flags) }),
    ...(e.archivedTo !== undefined && { archivedTo: e.archivedTo }),
    ...(e.note !== undefined && { note: e.note }),
  });
  return `${JSON.stringify({
    ...(state.$schema !== undefined && { $schema: state.$schema }),
    platform: { flags: flags(state.platform.flags) },
    experiences: Object.fromEntries(Object.keys(state.experiences).sort().map((id) => [id, entry(state.experiences[id]!)])),
  }, null, 2)}\n`;
}

// ---- API contract (apps/control/server) ----

/** SHA-256 of the release file's bytes, lowercase hex. */
export const Revision = z.string().regex(/^[0-9a-f]{64}$/);

export const SessionRequest = z.strictObject({});
export const PatchRequest = z.strictObject({ patch: ReleasePatch, baseRevision: Revision });
export const RevertRequest = z.strictObject({ baseRevision: Revision });

/** Every error the API returns, with its HTTP status. Codes are stable; messages are not. */
export const API_ERRORS = {
  INVALID_REQUEST: 400,
  INVALID_JSON: 400,
  UNAUTHORIZED: 401,
  INVALID_HOST: 403,
  INVALID_ORIGIN: 403,
  NOT_FOUND: 404,
  METHOD_NOT_ALLOWED: 405,
  STALE_REVISION: 409,
  WRITE_CONFLICT: 409,
  PAYLOAD_TOO_LARGE: 413,
  UNSUPPORTED_MEDIA_TYPE: 415,
  ILLEGAL_TRANSITION: 422,
  VALIDATION_FAILED: 422,
  INTERNAL_ERROR: 500,
  CATALOG_INVALID: 503,
  STORE_UNAVAILABLE: 503,
} as const;
export type ApiErrorCode = keyof typeof API_ERRORS;

export type ApiError = {
  ok: false;
  error: {
    code: ApiErrorCode;
    message: string;
    /** VALIDATION_FAILED, INVALID_REQUEST, STORE_UNAVAILABLE (file fails its schema), CATALOG_INVALID. */
    issues?: Issue[];
    /** STALE_REVISION and WRITE_CONFLICT: what the file holds now, so the UI can refresh. */
    current?: { state: ReleaseState; revision: string };
  };
};
export type ApiSuccess<T> = { ok: true; data: T; meta: { revision?: string } };
export type ApiResponse<T> = ApiSuccess<T> | ApiError;

export const ENVIRONMENTS = ['development', 'preview', 'production'] as const satisfies readonly Environment[];

export type RegistryItem = {
  id: string;
  /** The parsed catalog entry, read-only. */
  definition: Experience;
  /** The release entry in effect (the owner-only draft default when the file has none). */
  release: ReleaseEntry;
  hasReleaseEntry: boolean;
  channel: 'stable' | 'beta' | 'alpha' | null;
  environments: Record<Environment, Resolution>;
  /** Catalog and release issues whose path starts with this id. */
  issues: Issue[];
};

/** One experience's resolution changed in one environment. */
export type ResolutionChange = { experienceId: string; environment: Environment; before: Resolution; after: Resolution };
/** A release entry (or the platform flags, `scope: 'platform'`) that differs. `null`: no entry. */
export type EntryChange =
  | { scope: 'experience'; experienceId: string; before: ReleaseEntry | null; after: ReleaseEntry | null }
  | { scope: 'platform'; before: ReleaseState['platform']; after: ReleaseState['platform'] };

export type HealthData = { service: 'orrery-control'; status: 'ok' };
export type RegistryData = { experiences: RegistryItem[]; issues: Issue[] };
export type ReleaseData = { state: ReleaseState; revision: string; baselineRevision: string; issues: Issue[] };
export type PreviewData = { valid: boolean; issues: Issue[]; state: ReleaseState; changes: ResolutionChange[] };
export type WriteData = { state: ReleaseState; revision: string; changes: ResolutionChange[] };
export type PendingData = {
  baselineRevision: string;
  revision: string;
  /** The release state differs from the one the session started with. */
  changed: boolean;
  entries: EntryChange[];
  changes: ResolutionChange[];
  suggestedCommitMessage: string;
  /** For the owner to run; the server never runs Git. */
  commands: string[];
};
