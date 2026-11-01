import type { ReleasePatch } from './control.ts';
import { releaseEntryFor, type Lifecycle, type ReleaseEntry, type ReleaseState } from './release.ts';

// Blueprint 3.4 lifecycle state diagram.
const TRANSITIONS: Record<Lifecycle, readonly Lifecycle[]> = {
  draft: ['alpha', 'beta', 'published'],
  alpha: ['beta', 'draft'],
  beta: ['published', 'draft'],
  published: ['frozen', 'deprecated'],
  frozen: ['published', 'deprecated'],
  deprecated: ['published', 'archived'],
  archived: [],
};

export const canTransition = (from: Lifecycle, to: Lifecycle): boolean =>
  TRANSITIONS[from].includes(to);

export type PatchResult =
  | { ok: true; state: ReleaseState }
  | { ok: false; code: 'ILLEGAL_TRANSITION'; message: string };

/**
 * Applies one patch without mutating `state`. Rule checks beyond lifecycle
 * transitions belong to validateRelease, which callers run on the result.
 */
export function applyPatch(state: ReleaseState, patch: ReleasePatch): PatchResult {
  if (patch.op === 'setFlag' && patch.scope === 'platform') {
    return { ok: true, state: { ...state, platform: { flags: { ...state.platform.flags, [patch.flag]: patch.value } } } };
  }
  // The platform scope returned above, so a setFlag scope here names an experience.
  const id = patch.op === 'setFlag' ? (patch.scope as { experienceId: string }).experienceId : patch.experienceId;
  const entry = releaseEntryFor(state, id);
  let next: ReleaseEntry;

  switch (patch.op) {
    case 'transition':
      if (!canTransition(entry.lifecycle, patch.to)) {
        return { ok: false, code: 'ILLEGAL_TRANSITION', message: `${id}: ${entry.lifecycle} cannot move to ${patch.to}` };
      }
      // Deprecation forces unlisted (blueprint 3.4), so the transition carries it.
      next = { ...entry, lifecycle: patch.to, ...(patch.to === 'deprecated' && { discoverability: 'unlisted' }) };
      break;
    case 'setAccess':
      next = { ...entry, access: patch.access };
      break;
    case 'setDiscoverability':
      next = { ...entry, discoverability: patch.value };
      break;
    case 'setFlag':
      next = { ...entry, flags: { ...entry.flags, [patch.flag]: patch.value } };
      break;
    case 'setNote': {
      const { note: _old, ...rest } = entry;
      next = patch.note === null ? rest : { ...rest, note: patch.note };
      break;
    }
  }
  return { ok: true, state: { ...state, experiences: { ...state.experiences, [id]: next } } };
}
