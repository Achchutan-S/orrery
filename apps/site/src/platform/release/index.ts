// Server-only: catalog and release state for .astro frontmatter and kernel code.
// Never import this from an island or other client code (blueprint 3.8 rule 8):
// anything it returns that reaches the browser becomes public.
import { catalog } from '@pu/experience-catalog';
import {
  buildEnvironment, parseRelease, resolve, validateCatalog,
  type Experience, type InternalExperience, type Resolution,
} from '@pu/platform-schema';
import releaseJson from '../../../../../config/release.json';

export const env = buildEnvironment(process.env);

// The mount-experiences integration has already failed the build on any issue.
export const experiences: readonly Experience[] = validateCatalog(catalog).experiences;

const parsed = parseRelease(releaseJson);
if (!parsed.state) throw new Error('config/release.json is invalid; run the build for details');
export const releaseState = parsed.state;

export function internalExperience(id: string): InternalExperience {
  const e = experiences.find((x) => x.id === id);
  if (e?.kind !== 'internal') throw new Error(`"${id}" is not an internal experience in the catalog`);
  return e;
}

export const resolutionOf = (id: string): Resolution =>
  resolve(internalExperience(id), releaseState, env);

/** A build flag's value in this environment. Release management, not secrecy (ADR-004). */
export function flag(id: string, name: string): boolean {
  const value = resolutionOf(id).flags[name];
  if (value === undefined) throw new Error(`Flag "${name}" is not declared by "${id}"`);
  return value;
}
