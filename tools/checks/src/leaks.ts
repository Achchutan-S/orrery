// Production leak scan (blueprint 3.5a, 7.2). Run against a production build:
//   pnpm build:production && pnpm check:leaks
// Route-aware where it can be: draft routes are checked as file paths, flag-gated UI
// by its data-pu-flag marker, metadata by exact catalog strings. Every output file must
// also be on the allowlist, and nothing may copy or quote a file of an unreleased experience
// (docs/runbooks/checks.md § Leaks).
import { createHash } from 'node:crypto';
import { CANARY } from '@pu/experience-catalog';
import {
  resolveAll, resolvePlatformFlags, type Experience, type ReleaseState,
} from '@pu/platform-schema';
import { isFileRoute, routeFiles } from './routes.ts';
import { distArg, isMain, loadPlatform, readDist, readSources, report, type DistFile, type Finding, type SourceFile } from './repo.ts';

const PRODUCTION_HINT = ' (is this a development or preview build? run `pnpm build:production`)';

/** Platform output that no route produces: the Not found page and the files in apps/site/public. */
export const PLATFORM_FILES = ['404.html', 'favicon.svg', 'og.png'];
/** Vite's content-hashed assets: `_astro/<name>.<8-character hash>.js|css`, fonts as `_astro/fonts/<16 hex>.woff2`. */
const ASTRO_ASSET = /^_astro\/(?:[\w-]+\.[\w-]{8}\.(?:js|css)|fonts\/[0-9a-f]{16}\.woff2)$/;

const NAMED: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' };
const codePoint = (n: number, raw: string) => (n <= 0x10ffff ? String.fromCodePoint(n) : raw);

/**
 * Text as a reader would see it, so an escaped copy still matches. One bounded pass each, JSON and
 * JavaScript escapes first, then HTML entities, then whitespace collapsed: `&#39;` decodes,
 * `&amp;#39;` (escaped twice) does not.
 */
export function decoded(text: string): string {
  return text
    .replace(/\\u\{([0-9a-f]{1,6})\}|\\u([0-9a-f]{4})|\\x([0-9a-f]{2})/gi, (m, a, b, c) => codePoint(parseInt(a ?? b ?? c, 16), m))
    .replace(/\\[nrt]/g, ' ')
    .replace(/\\(["'\\/`])/g, '$1')
    .replace(/&#x([0-9a-f]{1,6});?|&#(\d{1,7});?|&(amp|lt|gt|quot|apos|nbsp);/gi, (m, h, d, n) =>
      n ? NAMED[n.toLowerCase()]! : codePoint(h ? parseInt(h, 16) : Number(d), m))
    .replace(/\s+/g, ' ');
}

const TEXT_SOURCE = /\.(astro|mdx?|tsx?|jsx?|css|json|txt|svg|html)$/;

/**
 * Runs of prose in a source file: the text between quotes, tags, braces and other code syntax,
 * kept when at least 32 characters and five words long, so code fragments and short generic
 * labels drop out. Comments count too; they must not ship either.
 */
export function phrases(source: string): string[] {
  return source.split(/[\n'"`<>{}()[\]*=|\\]|\.{3}|--/)
    .map((p) => decoded(p).replace(/^[\s#/>+-]+/, '').trim())
    .filter((p) => p.length >= 32 && (p.match(/\p{L}{2,}/gu)?.length ?? 0) >= 5);
}

const sha256 = (b: Buffer) => createHash('sha256').update(b).digest('hex');

/**
 * What the files of unreleased experiences look like in output: their bytes (hash), their bytes
 * as base64 (Vite inlines `?inline` imports as data URLs) and their prose. A file identical to a
 * kernel or platform-page source is the platform's, and prose a released experience also has is
 * public, so those are dropped. Never because of public/: copying a draft's file there must not
 * make it public.
 */
function protectedContent(sources: readonly SourceFile[], released: ReadonlySet<string>, unreleased: ReadonlySet<string>) {
  const kernel = (s: SourceFile) => s.owner === 'platform' && !s.path.startsWith('public/');
  const publicHashes = new Set(sources.filter(kernel).map((s) => sha256(s.bytes)));
  const publicText = sources.filter((s) => (kernel(s) || released.has(s.owner)) && TEXT_SOURCE.test(s.path))
    .map((s) => decoded(s.bytes.toString('utf8'))).join('\n');
  const hashes = new Map<string, SourceFile>();
  const base64: { needle: string; source: SourceFile }[] = [];
  const prose: { needle: string; source: SourceFile }[] = [];
  for (const s of sources) {
    if (!unreleased.has(s.owner) || s.bytes.length === 0) continue;
    const hash = sha256(s.bytes);
    if (publicHashes.has(hash)) continue;
    hashes.set(hash, s);
    if (!TEXT_SOURCE.test(s.path)) {
      base64.push({ needle: s.bytes.toString('base64'), source: s });
      continue;
    }
    for (const p of new Set(phrases(s.bytes.toString('utf8')))) {
      if (!publicText.includes(p)) prose.push({ needle: p, source: s });
    }
  }
  return { hashes, base64, prose };
}

export function scanLeaks(
  files: DistFile[], experiences: readonly Experience[], state: ReleaseState, sources: readonly SourceFile[],
): Finding[] {
  const findings: Finding[] = [];
  const paths = new Set(files.map((f) => f.path));
  const texts = files.filter((f) => f.text !== undefined);
  const resolutions = new Map(resolveAll(experiences, state, 'production').map((r) => [r.id, r]));
  const internal = experiences.filter((e) => e.kind === 'internal');
  const released = new Set(internal.filter((e) => resolutions.get(e.id)!.mounted).map((e) => e.id));
  const unreleased = new Set(internal.filter((e) => !released.has(e.id)).map((e) => e.id));

  // 1. Routes: nothing from an unmounted experience; every static route of a mounted one.
  //    `allowed` collects what mounted routes may produce, for the allowlist in step 4.
  const flagged = new Set<string>();
  const allowed: ((path: string) => boolean)[] = [(p) => PLATFORM_FILES.includes(p), (p) => ASTRO_ASSET.test(p)];
  for (const e of internal) {
    const mounted = released.has(e.id);
    for (const { pattern } of e.routes) {
      const { exact, under } = routeFiles(pattern);
      if (mounted) {
        if (exact && !paths.has(exact)) findings.push({ file: exact, reason: `missing: "${e.id}" is published but its route ${pattern} was not built` });
        // A dynamic page route produces pages under its folder; never other kinds of file.
        allowed.push(exact ? (p) => p === exact : (p) => p.startsWith(under!) && (isFileRoute(pattern) || p.endsWith('.html')));
        continue;
      }
      for (const p of paths) {
        if (p === exact || (under !== undefined && p.startsWith(under))) {
          flagged.add(p);
          findings.push({ file: p, reason: `route ${pattern} of "${e.id}" is not released to production${PRODUCTION_HINT}` });
        }
      }
    }
  }

  // 2. Text that must never ship: the canary token, and the metadata of everything not
  //    public in production (exact summary; title only when longer than three words,
  //    because short titles like "Sample app" are too generic to signal a leak).
  const secrets: { needle: string; why: string }[] = [{ needle: CANARY, why: 'contains the canary token' }];
  for (const e of experiences) {
    if (resolutions.get(e.id)!.deployable) continue;
    secrets.push({ needle: e.summary, why: `contains the summary of "${e.id}", which is not public in production` });
    if (e.title.split(/\s+/).length > 3) secrets.push({ needle: e.title, why: `contains the title of "${e.id}", which is not public in production` });
  }
  // 3. Flag-gated UI marks its root with data-pu-flag="<experience>:<flag>" (or platform:<flag>).
  const offFlags = [
    ...[...resolutions.values()].flatMap((r) => Object.entries(r.flags).filter(([, on]) => !on).map(([f]) => `${r.id}:${f}`)),
    ...Object.entries(resolvePlatformFlags(state, 'production')).filter(([, on]) => !on).map(([f]) => `platform:${f}`),
  ];
  for (const flag of offFlags) {
    secrets.push({ needle: `data-pu-flag="${flag}"`, why: `renders UI for build flag ${flag}, which is off in production` });
  }
  // The files of unreleased experiences, as prose (any encoding), base64 or exact bytes.
  const content = protectedContent(sources, released, unreleased);
  for (const f of texts) {
    const plain = decoded(f.text!);
    for (const s of secrets) if (f.text!.includes(s.needle) || plain.includes(decoded(s.needle))) findings.push({ file: f.path, reason: s.why });
    // One finding per source file, naming only the source, so the log never repeats protected text.
    const quoted = new Set<SourceFile>();
    for (const { needle, source } of content.prose) if (!quoted.has(source) && plain.includes(needle)) quoted.add(source);
    for (const { needle, source } of content.base64) if (!quoted.has(source) && f.text!.includes(needle)) quoted.add(source);
    for (const s of quoted) findings.push({ file: f.path, reason: `contains content of apps/site/${s.path}, which belongs to "${s.owner}" (not released to production)` });
  }
  for (const f of files) {
    const source = content.hashes.get(sha256(f.bytes));
    if (source) findings.push({ file: f.path, reason: `is a copy of apps/site/${source.path}, which belongs to "${source.owner}" (not released to production)` });
  }

  // 4. Source maps, as files or as references; then the allowlist for everything else.
  for (const f of files) {
    if (f.path.endsWith('.map')) findings.push({ file: f.path, reason: 'source map file' });
    else if (/\.(js|mjs|css)$/.test(f.path) && /[#@] sourceMappingURL=/.test(f.text ?? '')) {
      findings.push({ file: f.path, reason: 'references a source map' });
    }
    if (!f.path.endsWith('.map') && !flagged.has(f.path) && !allowed.some((ok) => ok(f.path))) {
      findings.push({ file: f.path, reason: 'not on the production output allowlist: no released route, platform file or hashed asset produces it' });
    }
  }

  // 5. The discovery index links every publicly listed experience, and no other experience.
  const index = files.find((f) => f.path === 'index.html')?.text;
  if (index === undefined) findings.push({ file: 'index.html', reason: 'missing: the discovery index was not built' });
  else {
    for (const e of experiences) {
      const href = e.kind === 'external' ? e.url : e.routes.find((r) => !r.pattern.includes('['))!.pattern;
      const linked = index.includes(`href="${href}"`);
      if (resolutions.get(e.id)!.listed && !linked) findings.push({ file: 'index.html', reason: `does not link listed experience "${e.id}" (${href})` });
      if (!resolutions.get(e.id)!.listed && linked) findings.push({ file: 'index.html', reason: `links "${e.id}" (${href}), which is not listed in production` });
    }
  }
  return findings;
}

if (isMain(import.meta)) {
  const dir = distArg();
  const { experiences, state, issues } = loadPlatform();
  if (!state || issues.length > 0) throw new Error('Catalog or release state is invalid; run `pnpm check:metadata`.');
  const files = readDist(dir);
  report('leaks', scanLeaks(files, experiences, state, readSources()), `${files.length} files scanned, nothing unreleased`);
}
