// Which built files belong to which route and experience (build.format 'file').
import { resolveAll, type Experience, type ReleaseState } from '@pu/platform-schema';

/** The files a route pattern can produce with build.format 'file'. */
export function routeFiles(pattern: string): { exact?: string; under?: string } {
  const dynamic = pattern.indexOf('[');
  if (dynamic === -1) return { exact: pattern === '/' ? 'index.html' : `${pattern.slice(1)}.html` };
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

