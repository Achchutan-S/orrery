// Production leak scan (blueprint 3.5a, 7.2). Run against a production build:
//   pnpm build:production && pnpm check:leaks
// Route-aware where it can be: draft routes are checked as file paths, flag-gated UI
// by its data-pu-flag marker, metadata by exact catalog strings.
import { CANARY } from '@pu/experience-catalog';
import {
  resolveAll, resolvePlatformFlags, type Experience, type ReleaseState,
} from '@pu/platform-schema';
import { routeFiles } from './routes.ts';
import { distArg, isMain, loadPlatform, readDist, report, type DistFile, type Finding } from './repo.ts';

const PRODUCTION_HINT = ' (is this a development or preview build? run `pnpm build:production`)';

export function scanLeaks(files: DistFile[], experiences: readonly Experience[], state: ReleaseState): Finding[] {
  const findings: Finding[] = [];
  const paths = new Set(files.map((f) => f.path));
  const texts = files.filter((f) => f.text !== undefined);
  const resolutions = new Map(resolveAll(experiences, state, 'production').map((r) => [r.id, r]));

  // 1. Routes: nothing from an unmounted experience; every static route of a mounted one.
  for (const e of experiences) {
    if (e.kind !== 'internal') continue;
    const mounted = resolutions.get(e.id)!.mounted;
    for (const { pattern } of e.routes) {
      const { exact, under } = routeFiles(pattern);
      if (mounted) {
        if (exact && !paths.has(exact)) findings.push({ file: exact, reason: `missing: "${e.id}" is published but its route ${pattern} was not built` });
        continue;
      }
      for (const p of paths) {
        if (p === exact || (under !== undefined && p.startsWith(under))) {
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
  for (const f of texts) {
    for (const s of secrets) if (f.text!.includes(s.needle)) findings.push({ file: f.path, reason: s.why });
  }

  // 4. Source maps, as files or as references.
  for (const f of files) {
    if (f.path.endsWith('.map')) findings.push({ file: f.path, reason: 'source map file' });
    else if (/\.(js|mjs|css)$/.test(f.path) && /[#@] sourceMappingURL=/.test(f.text ?? '')) {
      findings.push({ file: f.path, reason: 'references a source map' });
    }
  }

  // 5. Every publicly listed experience is linked from the discovery index.
  const index = files.find((f) => f.path === 'index.html')?.text;
  if (index === undefined) findings.push({ file: 'index.html', reason: 'missing: the discovery index was not built' });
  else {
    for (const e of experiences) {
      if (!resolutions.get(e.id)!.listed) continue;
      const href = e.kind === 'external' ? e.url : e.routes.find((r) => !r.pattern.includes('['))!.pattern;
      if (!index.includes(`href="${href}"`)) findings.push({ file: 'index.html', reason: `does not link listed experience "${e.id}" (${href})` });
    }
  }
  return findings;
}

if (isMain(import.meta)) {
  const dir = distArg();
  const { experiences, state, issues } = loadPlatform();
  if (!state || issues.length > 0) throw new Error('Catalog or release state is invalid; run `pnpm check:metadata`.');
  const files = readDist(dir);
  report('leaks', scanLeaks(files, experiences, state), `${files.length} files scanned, nothing unreleased`);
}
