// Which built files belong to which route and experience (build.format 'file').
import { resolveAll, type Experience, type ReleaseState } from '@pu/platform-schema';

/** A route that is a file, not a page: an endpoint such as `/resume/resume.pdf` keeps its name. */
export const isFileRoute = (pattern: string): boolean => /\.[a-z0-9]+$/i.test(pattern);

/** The files a route pattern can produce with build.format 'file'. */
export function routeFiles(pattern: string): { exact?: string; under?: string } {
  const dynamic = pattern.indexOf('[');
  if (dynamic === -1) return { exact: pattern === '/' ? 'index.html' : isFileRoute(pattern) ? pattern.slice(1) : `${pattern.slice(1)}.html` };
  return { under: pattern.slice(1, dynamic) }; // '/x/[...p]' -> every file under 'x/'
}

/** Which experience (or the platform) produced each HTML page. */
export function ownerOf(page: string, experiences: readonly Experience[]): Experience | undefined {
  return experiences.find((e) => e.kind === 'internal' && e.routes.some(({ pattern }) => {
    const { exact, under } = routeFiles(pattern);
    return page === exact || (under !== undefined && page.startsWith(under));
  }));
}

/** Experiences mounted in production: the only owners production output can have. */
export const productionOwners = (experiences: readonly Experience[], state: ReleaseState) =>
  experiences.filter((e) => resolveAll([e], state, 'production')[0]!.mounted);


/** The URL path of a built page: 'index.html' is '/', 'a/b.html' is '/a/b'. */
export const pagePath = (file: string): string => (file === 'index.html' ? '/' : `/${file.replace(/\.html$/, '')}`);

/**
 * The pages a browser suite visits, derived from a build's HTML files so that a new experience is
 * covered without anyone listing its pages (decision D12, ADR-027). Every page of a parameter-free
 * route is included; a dynamic route contributes its first and last page by name, which keeps the
 * run inside CI's time limit while still visiting every kind of page. 404.html is left to the caller.
 */
export function samplePages(htmlFiles: readonly string[], experiences: readonly Experience[]): string[] {
  const groups = new Map<string, string[]>();
  for (const file of htmlFiles.filter((f) => f.endsWith('.html') && f !== '404.html')) {
    const owner = ownerOf(file, experiences);
    if (owner?.kind !== 'internal') continue;
    // The route that produced it: an exact match, else the dynamic route with the longest folder.
    const route = owner.routes.map(({ pattern }) => ({ pattern, ...routeFiles(pattern) }))
      .filter((r) => r.exact === file || (r.under !== undefined && file.startsWith(r.under)))
      .sort((a, b) => Number(b.exact !== undefined) - Number(a.exact !== undefined) || (b.under?.length ?? 0) - (a.under?.length ?? 0))[0]!;
    const key = `${owner.id} ${route.pattern}`;
    groups.set(key, [...(groups.get(key) ?? []), file]);
  }
  return [...groups.values()].flatMap((files) => {
    const sorted = [...files].sort();
    return [...new Set([sorted[0]!, sorted.at(-1)!])].map(pagePath);
  });
}
