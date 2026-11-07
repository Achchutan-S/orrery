// Source integrity for the Skills Archive. The files under source/<slug>/ are copies of the original
// skills; source/manifest.json records each published file's SHA-256. A file is either a byte-for-byte
// copy of its original, or edited for publication: then `edited` records the original's SHA-256 and
// what changed, and the page says so. Nothing here rewrites a file; a copy that differs from its
// record fails the build, the tests and `pnpm --filter @pu/site skills:source`.
import { createHash } from 'node:crypto';

export type SourceFile = {
  path: string;
  sha256: string;
  bytes: number;
  /** Present only when the published copy differs from the original on purpose. */
  edited?: { originalSha256: string; note: string };
};
export type ManifestSkill = {
  /** Where the original lives, in words that are safe to publish. Never a machine path. */
  origin: string;
  /** The date the original was last updated, as recorded by its source (Claude.ai's skill list). */
  updated: string;
  files: SourceFile[];
};
export type Manifest = { skills: Record<string, ManifestSkill> };

export const sha256 = (data: Uint8Array | string) => createHash('sha256').update(data).digest('hex');

/**
 * Compares the files actually present for one skill with its manifest entry. `present` maps
 * relative paths to their bytes. Returns one message per problem; empty means intact.
 */
export function checkSkill(slug: string, entry: ManifestSkill, present: ReadonlyMap<string, Uint8Array>): string[] {
  const problems: string[] = [];
  for (const f of entry.files) {
    const bytes = present.get(f.path);
    if (!bytes) { problems.push(`${slug}/${f.path}: in the manifest but missing from source/`); continue; }
    const hash = sha256(bytes);
    if (hash !== f.sha256) problems.push(`${slug}/${f.path}: SHA-256 ${hash} does not match the manifest's ${f.sha256} (the published copy changed)`);
    if (bytes.length !== f.bytes) problems.push(`${slug}/${f.path}: ${bytes.length} bytes, manifest records ${f.bytes}`);
    if (f.edited && (!/^[0-9a-f]{64}$/.test(f.edited.originalSha256) || f.edited.note.trim().length < 20)) {
      problems.push(`${slug}/${f.path}: an edited file must record its original's SHA-256 and say what changed`);
    }
    if (f.edited?.originalSha256 === f.sha256) problems.push(`${slug}/${f.path}: marked edited but identical to its original`);
  }
  const known = new Set(entry.files.map((f) => f.path));
  for (const path of present.keys()) if (!known.has(path)) problems.push(`${slug}/${path}: in source/ but not in the manifest`);
  if (!entry.files.some((f) => f.path === 'SKILL.md')) problems.push(`${slug}: does not publish SKILL.md`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(entry.updated)) problems.push(`${slug}: updated "${entry.updated}" is not YYYY-MM-DD`);
  if (/\/Users\/|\/home\/|\\Users\\|~\/\.claude/.test(entry.origin)) problems.push(`${slug}: origin names a machine path`);
  return problems;
}
