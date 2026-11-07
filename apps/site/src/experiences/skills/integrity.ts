// Source integrity for the Skills Archive. The files under source/<slug>/ are byte-for-byte copies of
// the original skills; source/manifest.json records each file's SHA-256. Nothing here rewrites a
// source file. It only compares bytes with recorded hashes, so a changed copy fails the build,
// the tests and `pnpm --filter @pu/site skills:source`.
import { createHash } from 'node:crypto';

export type SourceFile = { path: string; sha256: string; bytes: number };
/** A file the archive adds beside the original (a licence notice). Never part of the original skill. */
export type AddedFile = SourceFile & { why: string };
export type Withheld = { count: number; paths?: string[]; reason: string };
export type ManifestSkill = {
  /** Where the original lives, in words that are safe to publish. Never a machine path. */
  origin: string;
  /** The date the original was last updated, as recorded by its source (Claude.ai's skill list). */
  updated: string;
  files: SourceFile[];
  added?: AddedFile[];
  withheld?: Withheld;
};
export type Manifest = { skills: Record<string, ManifestSkill> };

export const sha256 = (data: Uint8Array | string) => createHash('sha256').update(data).digest('hex');

/**
 * Compares the files actually present for one skill with its manifest entry. `present` maps
 * relative paths to their bytes. Returns one message per problem; empty means intact.
 */
export function checkSkill(slug: string, entry: ManifestSkill, present: ReadonlyMap<string, Uint8Array>): string[] {
  const problems: string[] = [];
  const recorded = [...entry.files, ...(entry.added ?? [])];
  for (const f of recorded) {
    const bytes = present.get(f.path);
    if (!bytes) { problems.push(`${slug}/${f.path}: in the manifest but missing from source/`); continue; }
    const hash = sha256(bytes);
    if (hash !== f.sha256) problems.push(`${slug}/${f.path}: SHA-256 ${hash} does not match the manifest's ${f.sha256} (the published copy changed)`);
    if (bytes.length !== f.bytes) problems.push(`${slug}/${f.path}: ${bytes.length} bytes, manifest records ${f.bytes}`);
  }
  const known = new Set(recorded.map((f) => f.path));
  for (const path of present.keys()) if (!known.has(path)) problems.push(`${slug}/${path}: in source/ but not in the manifest`);
  if (entry.files.length > 0 && !entry.files.some((f) => f.path === 'SKILL.md')) problems.push(`${slug}: publishes files but not SKILL.md`);
  if (entry.files.length === 0 && !entry.withheld) problems.push(`${slug}: publishes no files and gives no reason`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(entry.updated)) problems.push(`${slug}: updated "${entry.updated}" is not YYYY-MM-DD`);
  if (/\/Users\/|\/home\/|\\Users\\|~\/\.claude/.test(entry.origin)) problems.push(`${slug}: origin names a machine path`);
  return problems;
}
