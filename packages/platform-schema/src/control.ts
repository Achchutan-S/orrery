import { z } from 'zod';
import { Discoverability, FlagValue, Lifecycle } from './release.ts';

// Control Center V1 patch operations. Request and response schemas for the
// API itself are added with the Control Center server (Phase 1, task 12).
export const ReleasePatch = z.discriminatedUnion('op', [
  z.object({ op: z.literal('transition'), experienceId: z.string(), to: Lifecycle }),
  z.object({
    op: z.literal('setAccess'),
    experienceId: z.string(),
    // V1 subset: owner means "not released" until Phase 4.
    access: z.discriminatedUnion('kind', [
      z.object({ kind: z.literal('public') }),
      z.object({ kind: z.literal('owner') }),
    ]),
  }),
  z.object({ op: z.literal('setDiscoverability'), experienceId: z.string(), value: Discoverability }),
  z.object({
    op: z.literal('setFlag'),
    scope: z.union([z.literal('platform'), z.object({ experienceId: z.string() })]),
    flag: z.string(),
    value: FlagValue,
  }),
  z.object({ op: z.literal('setNote'), experienceId: z.string(), note: z.string().nullable() }),
]);
export type ReleasePatch = z.infer<typeof ReleasePatch>;
