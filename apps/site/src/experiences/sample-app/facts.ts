// Build-time only (imported by .astro frontmatter): derives the explorer's facts from
// the same pure functions the site build uses, so the app cannot disagree with them.
import { canTransition, channelOf, isDeployable, PHASE_0 } from '@pu/platform-schema';
import { ENVIRONMENTS, MEANING, STATES, type AccessKind, type Env, type State, type StateFacts } from './lifecycles.ts';

const builtIn = (lifecycle: State, kind: AccessKind) =>
  Object.fromEntries(ENVIRONMENTS.map((env) => [env, isDeployable(
    { lifecycle, access: { kind }, discoverability: 'unlisted', flags: {} }, env, PHASE_0,
  )])) as Record<Env, boolean>;

export const stateFacts = (): StateFacts[] => STATES.map((state) => ({
  state,
  meaning: MEANING[state],
  channel: channelOf(state),
  next: STATES.filter((to) => canTransition(state, to)),
  built: { public: builtIn(state, 'public'), owner: builtIn(state, 'owner') },
}));
