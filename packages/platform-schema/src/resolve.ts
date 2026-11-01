import type { Experience } from './definition.ts';
import { releaseEntryFor, type FlagValue, type ReleaseEntry, type ReleaseState } from './release.ts';

export type Environment = 'development' | 'preview' | 'production';

/** Platform-wide switches. `protectedRendering` turns on in Phase 4a. */
export type PlatformOptions = { protectedRendering: boolean };
export const PHASE_0: PlatformOptions = { protectedRendering: false };

/**
 * Maps Vercel's VERCEL_ENV to a platform environment. Unset means a local build.
 * Unknown values throw: guessing could mount drafts in a production build.
 */
export function environmentFrom(vercelEnv: string | undefined): Environment {
  if (vercelEnv === undefined || vercelEnv === '' || vercelEnv === 'development') return 'development';
  if (vercelEnv === 'preview' || vercelEnv === 'production') return vercelEnv;
  throw new Error(`Unknown VERCEL_ENV "${vercelEnv}"; expected development, preview or production`);
}

/**
 * The environment of the current build. Deployment builds set PU_DEPLOYMENT=1 (the build
 * command in apps/site/vercel.json); for them a missing VERCEL_ENV is an error, because
 * falling back to development would mount drafts in a public deployment. That happens if
 * "System Environment Variables" is switched off in the Vercel project.
 */
export function buildEnvironment(env: Readonly<Record<string, string | undefined>>): Environment {
  if (env.PU_DEPLOYMENT && !env.VERCEL_ENV) {
    throw new Error('PU_DEPLOYMENT is set but VERCEL_ENV is not. Enable "System Environment Variables" in the Vercel project settings so the build knows whether it is production or preview.');
  }
  return environmentFrom(env.VERCEL_ENV);
}

export type Resolution = {
  id: string;
  /** Lifecycle and access allow this experience in this environment. */
  deployable: boolean;
  /** Its routes are compiled into this build (internal experiences only). */
  mounted: boolean;
  /** It appears in public discovery: home, palette, sitemap, search, RSS. */
  listed: boolean;
  /** Build-flag values for this environment. */
  flags: Record<string, boolean>;
};

const SHIPS_PUBLICLY = new Set(['beta', 'published', 'frozen', 'deprecated']);

export function isDeployable(entry: ReleaseEntry, env: Environment, opts: PlatformOptions): boolean {
  const { lifecycle, access } = entry;
  if (lifecycle === 'archived') return false;
  if (env !== 'production') return true;
  if (opts.protectedRendering) {
    return SHIPS_PUBLICLY.has(lifecycle) || (lifecycle === 'alpha' && access.kind !== 'public');
  }
  return SHIPS_PUBLICLY.has(lifecycle) && access.kind === 'public';
}

export const flagValue = (value: FlagValue | undefined, env: Environment): boolean =>
  value ? (env === 'production' ? value.production : value.preview) : false;

export function resolve(
  experience: Experience,
  state: ReleaseState,
  env: Environment,
  opts: PlatformOptions = PHASE_0,
): Resolution {
  const entry = releaseEntryFor(state, experience.id);
  const deployable = isDeployable(entry, env, opts);
  const declared = experience.kind === 'internal' ? Object.keys(experience.flags) : [];
  return {
    id: experience.id,
    deployable,
    mounted: deployable && experience.kind === 'internal',
    // Static listings are identical for every visitor, so only public access is listed.
    listed: deployable
      && entry.discoverability === 'listed'
      && entry.lifecycle !== 'deprecated'
      && entry.access.kind === 'public',
    flags: Object.fromEntries(declared.map((f) => [f, flagValue(entry.flags[f], env)])),
  };
}

export const resolveAll = (
  catalog: readonly Experience[],
  state: ReleaseState,
  env: Environment,
  opts: PlatformOptions = PHASE_0,
): Resolution[] => catalog.map((e) => resolve(e, state, env, opts));

/** The routes to inject for this build: every route of every mounted experience. */
export function mountedRoutes(
  catalog: readonly Experience[],
  state: ReleaseState,
  env: Environment,
  opts: PlatformOptions = PHASE_0,
): { id: string; pattern: string; entrypoint: string }[] {
  return catalog.flatMap((e) =>
    e.kind === 'internal' && resolve(e, state, env, opts).mounted
      ? e.routes.map(({ pattern, entrypoint }) => ({ id: e.id, pattern, entrypoint }))
      : []);
}

export const resolvePlatformFlags = (state: ReleaseState, env: Environment): Record<string, boolean> =>
  Object.fromEntries(Object.entries(state.platform.flags).map(([f, v]) => [f, flagValue(v, env)]));
