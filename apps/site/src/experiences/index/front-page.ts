// How the public discovery index becomes the front page. Pure: the page passes in
// publicDiscoveryIndex(), so nothing unlisted can reach it.
import type { DiscoveryEntry } from '../../platform/discovery/index.ts';

export type SectionId = NonNullable<DiscoveryEntry['section']> | 'also';

/** Section order and the line under each heading. Empty sections are not shown. */
export const SECTIONS: { id: SectionId; label: string; note: string }[] = [
  { id: 'engineering', label: 'Engineering', note: 'Tools and systems.' },
  { id: 'civic', label: 'Civic', note: 'Public questions, examined.' },
  { id: 'thinking', label: 'Thinking', note: 'Writing.' },
  { id: 'labs', label: 'Labs', note: 'Experiments.' },
  { id: 'profile', label: 'Profile', note: 'Who made all this.' },
  { id: 'also', label: 'Also here', note: 'Not yet filed under a section.' },
];

export const sectionLabel = (e: Pick<DiscoveryEntry, 'section'>) => SECTIONS.find((s) => s.id === (e.section ?? 'also'))!.label;

export type FrontPage = {
  /** The first entry in discovery (catalog) order: the lead story. */
  lead?: DiscoveryEntry;
  /** The entry that would otherwise sit last on the page, lifted beside the lead. Needs three entries. */
  detour?: DiscoveryEntry;
  sections: { id: SectionId; label: string; note: string; entries: DiscoveryEntry[] }[];
  counts: { total: number; hosted: number; external: number };
};

export function frontPage(entries: readonly DiscoveryEntry[], self: string): FrontPage {
  const rest = entries.filter((e) => e.id !== self);
  const lead = rest[0];
  const detour = rest.length >= 3 ? rest.at(-1) : undefined;
  const placed = rest.filter((e) => e !== lead && e !== detour);
  return {
    lead,
    detour,
    sections: SECTIONS
      .map((s) => ({ ...s, entries: placed.filter((e) => (e.section ?? 'also') === s.id) }))
      .filter((s) => s.entries.length > 0),
    counts: { total: rest.length, hosted: rest.filter((e) => !e.host).length, external: rest.filter((e) => e.host).length },
  };
}

/** Other entries sharing a catalog tag, in discovery order. Tags are the only relationship the catalog states. */
export function related(entry: DiscoveryEntry, entries: readonly DiscoveryEntry[], self: string, max = 3): { tag: string; entries: DiscoveryEntry[] }[] {
  const out: { tag: string; entries: DiscoveryEntry[] }[] = [];
  const seen = new Set<string>([entry.id, self]);
  for (const tag of entry.tags) {
    const others = entries.filter((e) => !seen.has(e.id) && e.tags.includes(tag)).slice(0, max);
    others.forEach((e) => seen.add(e.id));
    if (others.length > 0) out.push({ tag, entries: others });
  }
  return out;
}
