// Import-boundary check (blueprint 3.8 rules 7-8, §5 dependency table). A small static
// checker rather than ESLint + dependency-cruiser; see ADR-014.
//   pnpm check:boundaries
//
// Reads static imports, `export ... from`, side-effect imports and dynamic import() in
// .ts/.tsx/.astro files (Astro: frontmatter and <script> blocks). Resolves relative paths
// and @pu/* workspace packages. The repository uses no tsconfig `paths` aliases; add them
// to `resolve()` if that changes. Test files are not checked.
import { readdirSync, readFileSync } from 'node:fs';
import { posix } from 'node:path';
import type { Experience } from '@pu/platform-schema';
import { isMain, loadPlatform, repoRoot, report, type Finding } from './repo.ts';

export type SourceFile = { path: string; text: string };
export type Import = { spec: string; line: number; typeOnly: boolean };

const WORKSPACE: Record<string, string> = {
  '@pu/platform-schema': 'packages/platform-schema',
  '@pu/experience-catalog': 'packages/experience-catalog',
  '@pu/checks': 'tools/checks',
};
const EXPERIENCES = 'apps/site/src/experiences/';
const SOURCE = /\.(ts|tsx|astro)$/;
const isTest = (p: string) => /\.test\.tsx?$/.test(p) || /\/(test|test-browser)\//.test(p);

const frontmatter = (text: string) => text.match(/^---\n([^]*?)\n---/)?.[1] ?? '';
const blank = (t: string) => t.replace(/[^\n]/g, ' ');

/**
 * The code of a file that can import things, at its original positions so line numbers
 * stay true. For .astro: the frontmatter and/or the bundled <script> blocks; the rest is
 * blanked. Comments are blanked too, so documentation mentioning `import "x"` is ignored.
 */
function code(file: SourceFile, part: 'all' | 'scripts'): string {
  let text = file.text;
  if (file.path.endsWith('.astro')) {
    const keep: [number, number][] = [];
    const fm = text.match(/^---\n([^]*?)\n---/);
    if (fm && part === 'all') keep.push([4, 4 + fm[1]!.length]);
    for (const m of text.matchAll(/(<script(?![^>]*is:inline)[^>]*>)([^]*?)<\/script>/g)) {
      const start = m.index + m[1]!.length;
      keep.push([start, start + m[2]!.length]);
    }
    let out = '';
    let pos = 0;
    for (const [a, b] of keep.sort((x, y) => x[0] - y[0])) { out += blank(text.slice(pos, a)) + text.slice(a, b); pos = b; }
    text = out + blank(text.slice(pos));
  }
  return text.replace(/\/\*[^]*?\*\//g, blank).replace(/(^|[^:'"`\\])\/\/.*$/gm, (m, pre: string) => pre + blank(m.slice(pre.length)));
}

export function importsOf(file: SourceFile, part: 'all' | 'scripts' = 'all'): Import[] {
  const src = code(file, part);
  const lineAt = (i: number) => src.slice(0, i).split('\n').length;
  const out: Import[] = [];
  for (const m of src.matchAll(/\b(import|export)\s+(type\s+)?(?:[^'";]*?\sfrom\s*)?['"]([^'"]+)['"]/g)) {
    out.push({ spec: m[3]!, line: lineAt(m.index), typeOnly: Boolean(m[2]) });
  }
  for (const m of src.matchAll(/\bimport\s*\(\s*['"]([^'"]+)['"]\s*\)/g)) {
    out.push({ spec: m[1]!, line: lineAt(m.index), typeOnly: false });
  }
  return out;
}

/** A repository path, a `node:` builtin, or an npm package name. */
export function resolve(from: string, spec: string, known: Set<string>): { path?: string; pkg?: string } {
  if (spec.startsWith('node:')) return { pkg: spec };
  let base: string | undefined;
  if (spec.startsWith('.')) base = posix.normalize(posix.join(posix.dirname(from), spec));
  else {
    const name = spec.startsWith('@') ? spec.split('/').slice(0, 2).join('/') : spec.split('/')[0]!;
    const root = WORKSPACE[name];
    if (!root) return { pkg: name };
    base = spec === name ? `${root}/src/index.ts` : `${root}/src/${spec.slice(name.length + 1)}.ts`;
  }
  for (const p of [base, `${base}.ts`, `${base}.tsx`, `${base}/index.ts`]) if (known.has(p)) return { path: p };
  return { path: base }; // unknown file: still useful for location rules
}

const experienceOf = (p: string) => (p.startsWith(EXPERIENCES) ? p.slice(EXPERIENCES.length).split('/')[0] : undefined);
const packageOf = (p: string) => Object.values(WORKSPACE).find((root) => p.startsWith(`${root}/`));

/** Server-only modules: their data is not public, so client code may not import them. */
const SERVER_ONLY: { test: (p: { path?: string; pkg?: string }) => boolean; why: string }[] = [
  { test: (r) => r.path?.startsWith('packages/experience-catalog/') ?? false, why: 'the experience catalog (non-public metadata)' },
  { test: (r) => r.path?.startsWith('config/') ?? false, why: 'release configuration' },
  { test: (r) => r.path?.startsWith('apps/site/src/platform/release/') ?? false, why: 'server-only release state (platform/release)' },
  { test: (r) => r.path?.startsWith('apps/site/src/platform/access/') ?? false, why: 'authorization, which never runs in the browser' },
  { test: (r) => r.path?.startsWith('apps/site/integrations/') ?? false, why: 'build integration code' },
  { test: (r) => r.pkg?.startsWith('node:') ?? false, why: 'a Node built-in' },
];

const isServerOnlyFile = (path: string) => SERVER_ONLY.some((x) => x.test({ path }));

/**
 * Files that run in the browser: island components and what they import, plus whatever
 * .astro <script> blocks import. Maps each file to the island or script that pulls it in.
 */
export function clientFiles(files: SourceFile[], known: Set<string>): Map<string, string> {
  const byPath = new Map(files.map((f) => [f.path, f]));
  const queue: [string, string][] = [];
  const follow = (from: SourceFile, via: string, part: 'all' | 'scripts' = 'all') => {
    for (const imp of importsOf(from, part)) {
      if (imp.typeOnly) continue; // erased at build time
      const r = resolve(from.path, imp.spec, known).path;
      // Stop at server-only modules: importing one is reported once, where it happens.
      if (r && byPath.has(r) && !isServerOnlyFile(r)) queue.push([r, via]);
    }
  };
  for (const f of files.filter((x) => x.path.endsWith('.astro'))) {
    const fm = frontmatter(f.text);
    for (const m of f.text.matchAll(/<([A-Z][\w.]*)\b[^>]*\sclient:(?:load|idle|visible|media|only)\b/g)) {
      const name = m[1]!.split('.')[0]!;
      const spec = fm.match(new RegExp(`import\\s+(?:${name}|\\{[^}]*\\b${name}\\b[^}]*\\})\\s+from\\s*['"]([^'"]+)['"]`))?.[1];
      const r = spec && resolve(f.path, spec, known).path;
      if (r) queue.push([r, `island <${m[1]}> in ${f.path}`]);
    }
    follow(f, `<script> in ${f.path}`, 'scripts');
  }
  const seen = new Map<string, string>();
  while (queue.length > 0) {
    const [path, via] = queue.shift()!;
    if (seen.has(path)) continue;
    seen.set(path, via);
    if (!path.endsWith('.astro')) follow(byPath.get(path)!, via);
  }
  return seen;
}

export function checkBoundaries(files: SourceFile[], experiences: readonly Experience[]): Finding[] {
  const known = new Set(files.map((f) => f.path));
  const findings: Finding[] = [];
  const client = clientFiles(files, known);
  const exclusive = new Map(experiences.flatMap((e) => (e.kind === 'internal' ? e.exclusiveImports.map((p) => [p, e.id] as const) : [])));

  for (const file of files.filter((f) => SOURCE.test(f.path) && !isTest(f.path))) {
    const own = experienceOf(file.path);
    const pkg = packageOf(file.path);
    // An .astro file is browser code only in its <script> blocks, checked separately below.
    const via = file.path.endsWith('.astro') ? undefined : client.get(file.path);
    const scriptImports = new Set(file.path.endsWith('.astro') ? importsOf(file, 'scripts').map((i) => i.line) : []);
    for (const imp of importsOf(file)) {
      const at = `${file.path}:${imp.line}`;
      const fail = (rule: string, reason: string) => findings.push({ file: at, reason: `[${rule}] imports "${imp.spec}": ${reason}` });
      const r = resolve(file.path, imp.spec, known);

      // Packages depend only on what the blueprint allows and never reach into apps or tools.
      if (pkg === 'packages/platform-schema' && (r.pkg ? r.pkg !== 'zod' : !r.path?.startsWith(`${pkg}/`))) {
        fail('schema-deps', 'platform-schema may import only zod and its own files');
      }
      if (pkg === 'packages/experience-catalog' && (r.pkg || !(r.path?.startsWith(`${pkg}/`) || r.path?.startsWith('packages/platform-schema/')))) {
        fail('catalog-deps', 'the catalog is data only: it may import only @pu/platform-schema and its own files');
      }
      // An experience never imports another experience.
      const target = r.path && experienceOf(r.path);
      if (own && target && target !== own) fail('experience-isolation', `"${own}" may not import code of experience "${target}"`);
      // The kernel does not depend on any experience.
      if (file.path.startsWith('apps/site/src/platform/') && target) fail('kernel-independence', `the platform kernel may not depend on experience "${target}"`);
      if (file.path.startsWith('apps/site/') && r.path?.startsWith('apps/control/')) fail('site-control', 'the public site never imports the Control Center');
      // Packages owned by one experience (catalog exclusiveImports).
      const owner = r.pkg && exclusive.get(r.pkg);
      if (owner && own !== owner) fail('exclusive-imports', `${r.pkg} is exclusive to "${owner}"`);
      // Browser code never sees server-only data.
      const browser = via ?? (scriptImports.has(imp.line) ? `<script> in ${file.path}` : undefined);
      if (browser && !imp.typeOnly && !isServerOnlyFile(file.path)) {
        const bad = SERVER_ONLY.find((x) => x.test(r));
        if (bad) fail('client-server-only', `${bad.why}, from browser code (${browser})`);
      }
    }
  }
  return findings;
}

const SCAN = ['apps/site/src', 'apps/site/integrations', 'packages/platform-schema/src', 'packages/experience-catalog/src', 'tools/checks/src', 'config'];

export function readSources(root: string): SourceFile[] {
  return SCAN.flatMap((dir) => readdirSync(posix.join(root, dir), { recursive: true }).map(String)
    .map((p) => posix.join(dir, p.split('\\').join('/')))
    .filter((p) => SOURCE.test(p) || p.endsWith('.json'))
    .map((p) => ({ path: p, text: SOURCE.test(p) ? readFileSync(posix.join(root, p), 'utf8') : '' })));
}

if (isMain(import.meta)) {
  const files = readSources(repoRoot);
  const { experiences } = loadPlatform();
  const client = clientFiles(files, new Set(files.map((f) => f.path)));
  report('boundaries', checkBoundaries(files, experiences),
    `${files.filter((f) => SOURCE.test(f.path)).length} source files, ${client.size} in browser code, no boundary crossed`);
}
