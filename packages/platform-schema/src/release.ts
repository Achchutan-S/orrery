import { z } from 'zod';

export const Lifecycle = z.enum([
  'draft', 'alpha', 'beta', 'published', 'frozen', 'deprecated', 'archived',
]);
export type Lifecycle = z.infer<typeof Lifecycle>;

export const Access = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('public') }),
  z.object({ kind: z.literal('signed-in') }), // Phase 4
  z.object({ kind: z.literal('policy'), policy: z.string() }), // Phase 4: 'recruiters'
  z.object({ kind: z.literal('owner') }), // Phase 4
]);
export type Access = z.infer<typeof Access>;

export const Discoverability = z.enum(['listed', 'unlisted']);
export type Discoverability = z.infer<typeof Discoverability>;

// Release state is hand-editable JSON, so unknown keys (typos) are errors, not silently dropped.
export const FlagValue = z.strictObject({
  preview: z.boolean(),
  production: z.boolean(),
  audience: z.string().optional(), // Phase 4: policy name; request flags only
});
export type FlagValue = z.infer<typeof FlagValue>;

export const ReleaseEntry = z.strictObject({
  lifecycle: Lifecycle,
  access: Access,
  discoverability: Discoverability,
  flags: z.record(z.string(), FlagValue).default({}),
  archivedTo: z.string().optional(), // redirect target or snapshot path
  note: z.string().optional(),
});
export type ReleaseEntry = z.output<typeof ReleaseEntry>;

export const ReleaseState = z.strictObject({
  $schema: z.string().optional(), // editor autocompletion only
  platform: z.strictObject({ flags: z.record(z.string(), FlagValue).default({}) }),
  experiences: z.record(z.string(), ReleaseEntry),
});
export type ReleaseState = z.output<typeof ReleaseState>;

/** An experience with no release entry is an owner-only, unlisted draft. */
export const defaultReleaseEntry = (): ReleaseEntry => ({
  lifecycle: 'draft',
  access: { kind: 'owner' },
  discoverability: 'unlisted',
  flags: {},
});

export const releaseEntryFor = (state: ReleaseState, id: string): ReleaseEntry =>
  state.experiences[id] ?? defaultReleaseEntry();

/** Release channels are derived from lifecycle, never stored. */
export const channelOf = (lifecycle: Lifecycle): 'stable' | 'beta' | 'alpha' | null =>
  lifecycle === 'published' || lifecycle === 'frozen' ? 'stable'
    : lifecycle === 'beta' ? 'beta'
    : lifecycle === 'alpha' ? 'alpha'
    : null;
