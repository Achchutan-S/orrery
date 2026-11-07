// Shared I/O for the repository checks. Everything else in tools/checks is pure.
import { existsSync, lstatSync, readdirSync, readFileSync, realpathSync, statSync } from 'node:fs';
import { join, resolve, sep } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { gzipSync } from 'node:zlib';
import { catalog } from '@pu/experience-catalog';
import { validatePlatform } from '@pu/platform-schema';

export const repoRoot = fileURLToPath(new URL('../../../', import.meta.url));
const experiencesDir = join(repoRoot, 'apps/site/src/experiences');

/** A problem a check found. `file` is relative to the directory the check scanned. */
export type Finding = { file: string; reason: string };

/** A built file. Text files carry their contents; binary files only their bytes. */
export type DistFile = { path: string; bytes: Buffer; text?: string };

const TEXT = /\.(html|js|mjs|css|json|xml|txt|svg|webmanifest|map)$/;

export function readDist(dir: string): DistFile[] {
  if (!existsSync(dir) || !statSync(dir).isDirectory()) {
    throw new Error(`${dir} does not exist. Run \`pnpm build:production\` first.`);
  }
  return readdirSync(dir, { recursive: true }).map(String)
    .filter((p) => statSync(join(dir, p)).isFile())
    .map((p) => {
      const bytes = readFileSync(join(dir, p));
      const path = p.split(sep).join('/');
      return TEXT.test(path) ? { path, bytes, text: bytes.toString('utf8') } : { path, bytes };
    });
}

/** A site source file (path relative to apps/site), owned by an experience or by the platform. */
export type SourceFile = { owner: string; path: string; bytes: Buffer };

/**
 * Every file under apps/site/src and apps/site/public. Files under src/experiences/<id>/ are
 * owned by <id>; everything else (kernel, platform pages, public/) by 'platform'.
 */
export function readSources(): SourceFile[] {
  const site = join(repoRoot, 'apps/site');
  return ['src', 'public'].flatMap((top) => readdirSync(join(site, top), { recursive: true }).map(String)
    .map((p) => join(top, p).split(sep).join('/'))
    .filter((p) => statSync(join(site, p)).isFile())
    .map((path) => ({ owner: /^src\/experiences\/([^/]+)\//.exec(path)?.[1] ?? 'platform', path, bytes: readFileSync(join(site, path)) })));
}

/** gzip at level 9: the one size unit every check reports (see docs/repository-checks.md). */
export const gzipBytes = (data: Buffer | string): number => (data.length === 0 ? 0 : gzipSync(data, { level: 9 }).length);

/** Same rule as the site integration: a regular file at exactly this path, no symlink in it. */
function isOwnFile(entrypoint: string): boolean {
  const path = join(experiencesDir, entrypoint);
  try {
    return lstatSync(path).isFile() && realpathSync(path) === join(realpathSync(experiencesDir), entrypoint);
  } catch {
    return false;
  }
}

/** The catalog and release state, validated exactly as the site build validates them. */
export function loadPlatform() {
  const release: unknown = JSON.parse(readFileSync(join(repoRoot, 'config/release.json'), 'utf8'));
  const folders = readdirSync(experiencesDir, { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name);
  return validatePlatform({
    catalog,
    release,
    folders,
    fileExists: isOwnFile,
  });
}

export const isMain = (meta: ImportMeta): boolean =>
  process.argv[1] !== undefined && meta.url === pathToFileURL(process.argv[1]).href;

export const distArg = (): string => resolve(repoRoot, process.argv[2] ?? 'apps/site/dist');

/** Prints findings and sets the exit code. */
export function report(name: string, findings: Finding[], okMessage: string): void {
  if (findings.length === 0) {
    console.log(`✔ ${name}: ${okMessage}`);
    return;
  }
  console.error(`✖ ${name}: ${findings.length} problem${findings.length === 1 ? '' : 's'}`);
  for (const f of findings) console.error(`  ${f.file}: ${f.reason}`);
  process.exitCode = 1;
}
