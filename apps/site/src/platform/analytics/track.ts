// Experience usage events (blueprint 2, Phase 3). Experiences call track() now so the
// real implementation can arrive later without touching them.

export type TrackProps = Readonly<Record<string, string | number | boolean>>;

/**
 * No-op until Phase 3. It sends nothing, sets no cookies, stores nothing and
 * loads no script. Safe to call from islands.
 */
export function track(_experienceId: string, _event: string, _props: TrackProps = {}): void {}
