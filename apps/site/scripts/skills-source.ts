// The Skills Archive's source pipeline (docs/claude-skills/publication-decisions.md):
//   pnpm --filter @pu/site skills:source                 verify
//   pnpm --filter @pu/site skills:source --import <slug>  copy an approved skill's files, byte for byte
//
// Verify checks every published copy against the SHA-256 in source/manifest.json and, where the
// private origin map exists (docs/claude-skills/private/origins.json, gitignored, machine-specific),
// compares each original with the hash it was published from (its own, or for a file edited for
// publication, the `edited.originalSha256` recorded with the edit), reporting any that changed. It never writes.
// Import is the only writer: it copies the files the origin map lists for one skill, unmodified, and
// records their hashes. It never overwrites a file edited for publication: those are maintained by hand.
import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { checkSkill, sha256, type Manifest } from '../src/experiences/skills/integrity.ts';

const root = fileURLToPath(new URL('../', import.meta.url));
const sourceDir = join(root, 'src/experiences/skills/source');
const manifestPath = join(sourceDir, 'manifest.json');
const originsPath = join(root, '../../docs/claude-skills/private/origins.json');

type Origins = Record<string, { dir: string; files: string[] }>;
const manifest = JSON.parse(readFileSync(manifestPath, 'utf8')) as Manifest;
const origins: Origins | undefined = existsSync(originsPath) ? JSON.parse(readFileSync(originsPath, 'utf8')) : undefined;

const filesUnder = (dir: string): Map<string, Uint8Array> => new Map(existsSync(dir)
  ? readdirSync(dir, { recursive: true, withFileTypes: true }).filter((d) => d.isFile())
    .map((d) => { const rel = join(d.parentPath, d.name).slice(dir.length + 1).split('\\').join('/'); return [rel, readFileSync(join(dir, rel))] as const; })
  : []);

const args = process.argv.slice(2);
if (args[0] === '--import') {
  const slug = args[1];
  const origin = slug && origins?.[slug];
  if (!slug || !origin || !manifest.skills[slug]) {
    console.error(`usage: skills:source --import <slug>; the slug must be in the manifest and in ${originsPath}`);
    process.exit(2);
  }
  const previous = manifest.skills[slug]!.files;
  const files = origin.files.map((path) => {
    const kept = previous.find((f) => f.path === path && f.edited);
    if (kept) { console.log(`  ${slug}/${path}  edited for publication: kept as is (${kept.edited!.note})`); return kept; }
    const from = join(origin.dir, path);
    const to = join(sourceDir, slug, path);
    mkdirSync(dirname(to), { recursive: true });
    copyFileSync(from, to); // bytes, not text: no newline or encoding changes
    const bytes = readFileSync(to);
    console.log(`  ${slug}/${path}  ${bytes.length} bytes  ${sha256(bytes)}`);
    return { path, sha256: sha256(bytes), bytes: bytes.length };
  });
  manifest.skills[slug]!.files = files;
  writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
  console.log(`imported ${files.length} file(s) for ${slug}; manifest updated`);
  process.exit(0);
}

let failures = 0;
for (const [slug, entry] of Object.entries(manifest.skills)) {
  const problems = checkSkill(slug, entry, filesUnder(join(sourceDir, slug)));
  for (const p of problems) console.error(`FAIL ${p}`);
  failures += problems.length;
  if (!origins) continue;
  const origin = origins[slug];
  if (!origin) { console.log(`?    ${slug}: no origin recorded, cannot compare`); continue; }
  for (const f of entry.files) {
    const from = join(origin.dir, f.path);
    if (!existsSync(from)) { console.log(`?    ${slug}/${f.path}: original not found on this machine`); continue; }
    const now = sha256(readFileSync(from));
    const expected = f.edited?.originalSha256 ?? f.sha256;
    if (now === expected) console.log(`ok   ${slug}/${f.path}${f.edited ? ' (edited for publication from this original)' : ''}`);
    else { console.error(`OUT OF DATE ${slug}/${f.path}: the original changed (${now}); review it, then ${f.edited ? 'redo the edit by hand' : `--import ${slug}`}`); failures++; }
  }
  // Files the original has now that the archive does not publish.
  const published = new Set(entry.files.map((f) => f.path));
  for (const path of filesUnder(origin.dir).keys()) {
    if (!published.has(path)) { console.error(`NEW  ${slug}/${path}: in the original, not published`); failures++; }
  }
}
console.log(origins ? 'compared with the originals on this machine' : 'no private origin map here: checked published copies against their hashes only');
if (failures) { console.error(`${failures} problem(s)`); process.exit(1); }
console.log('skills sources intact');
