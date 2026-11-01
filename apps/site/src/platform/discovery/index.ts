import { resolve, type Environment, type Experience, type ReleaseState } from '@pu/platform-schema';

/** What opening an entry involves, in the visitor's terms. */
export type Weight = 'static' | 'interactive' | 'immersive' | 'external';

export type DiscoveryEntry = {
  id: string;
  title: string;
  summary: string;
  href: string;
  weight: Weight;
  /** Only for external entries: the host the link leaves for. */
  host?: string;
  /** Editorial placement on the Index, from the catalog (optional there). */
  section?: Experience['section'];
  headline?: Experience['headline'];
  tags: readonly string[];
};

const WEIGHT_BY_CLASS = { content: 'static', interactive: 'interactive', immersive: 'immersive' } as const;

export const weightOf = (e: Experience): Weight =>
  e.kind === 'external' ? 'external' : WEIGHT_BY_CLASS[e.performanceClass];

export function weightLine(entry: Pick<DiscoveryEntry, 'weight' | 'host'>): string {
  switch (entry.weight) {
    case 'static': return 'Static page. No JavaScript of its own.';
    case 'interactive': return 'Interactive. Loads its own JavaScript.';
    case 'immersive': return 'Immersive. Loads large media and JavaScript.';
    case 'external': return `Leaves Orrery for ${entry.host}.`;
  }
}

/**
 * Globally public metadata (blueprint 3.5a): the only list the static home page,
 * palette, sitemap and feeds may use. It contains listed experiences only, so
 * draft, owner-only, unlisted and deprecated metadata never reaches it.
 */
export function publicDiscoveryIndex(
  experiences: readonly Experience[],
  state: ReleaseState,
  env: Environment,
): DiscoveryEntry[] {
  return experiences
    .filter((e) => resolve(e, state, env).listed)
    .map((e) => {
      const base = { id: e.id, title: e.title, summary: e.summary, weight: weightOf(e), section: e.section, headline: e.headline, tags: e.tags };
      if (e.kind === 'external') return { ...base, href: e.url, host: new URL(e.url).host };
      // validateCatalog guarantees one parameter-free route (rule entry-route).
      return { ...base, href: e.routes.find((r) => !r.pattern.includes('['))!.pattern };
    });
}
