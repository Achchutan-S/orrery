// Search over the stacks. Shared by the page script and the tests, so what is tested is what runs.

/** Lower case, accents folded, so "Café" matches "cafe". */
export const fold = (s: string) => s.toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '');

/** True when every word of the query appears somewhere in the haystack. An empty query matches all. */
export function matches(haystack: string, query: string): boolean {
  const h = fold(haystack);
  return fold(query).split(/\s+/).filter(Boolean).every((w) => h.includes(w));
}
