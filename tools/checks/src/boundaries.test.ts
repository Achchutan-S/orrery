import assert from 'node:assert/strict';
import { test } from 'node:test';
import { ExperienceDefinition, type Experience } from '@pu/platform-schema';
import { checkBoundaries, clientFiles, importsOf, readSources, type SourceFile } from './boundaries.ts';
import { loadPlatform, repoRoot } from './repo.ts';

const E = 'apps/site/src/experiences';
const f = (path: string, text: string): SourceFile => ({ path, text });
const exp = (id: string, exclusiveImports: string[] = []) => ExperienceDefinition.parse({
  kind: 'internal', id, title: id, summary: 'x', capabilities: ['interactive'], performanceClass: 'interactive', exclusiveImports,
  routes: [{ pattern: `/${id}`, entrypoint: `${id}/routes/index.astro` }],
}) as Experience;
const experiences = [exp('alpha', ['d3-geo']), exp('beta')];

// A small but realistic tree: an Astro page mounting an island that imports a helper.
const base = (): SourceFile[] => [
  f(`${E}/alpha/routes/index.astro`, [
    '---',
    "import { flag } from '../../../platform/release/index.ts';",
    "import { catalog } from '@pu/experience-catalog';",
    "import App from '../App.tsx';",
    '---',
    '<App client:load on={flag("alpha", "x")} />',
  ].join('\n')),
  f(`${E}/alpha/App.tsx`, "import type { Experience } from '@pu/platform-schema';\nimport { channelOf } from '@pu/platform-schema';\nimport { track } from '../../platform/analytics/track.ts';\nimport { helper } from './helper.ts';\nimport { geo } from 'd3-geo';\n// import '@pu/experience-catalog' is only a comment\n"),
  f(`${E}/alpha/helper.ts`, 'export const helper = 1;\n'),
  f(`${E}/beta/routes/index.astro`, "---\nimport Layout from '../Layout.astro';\n---\n<Layout />"),
  f(`${E}/beta/Layout.astro`, "---\nimport ExperienceRoot from '../../platform/root/ExperienceRoot.astro';\n---\n<ExperienceRoot experience=\"beta\" />"),
  f('apps/site/src/platform/release/index.ts', "import { catalog } from '@pu/experience-catalog';\nimport release from '../../../../../config/release.json';\n"),
  f('apps/site/src/platform/analytics/track.ts', 'export function track() {}\n'),
  f('apps/site/src/platform/root/ExperienceRoot.astro', "---\nimport '../tokens/platform.css';\n---\n<html />"),
  f('packages/platform-schema/src/index.ts', "export * from './release.ts';\n"),
  f('packages/platform-schema/src/release.ts', "import { z } from 'zod';\n"),
  f('packages/experience-catalog/src/index.ts', "import { validateCatalog } from '@pu/platform-schema';\nimport a from './entries/a.ts';\n"),
  f('packages/experience-catalog/src/entries/a.ts', "import { defineExperience } from '@pu/platform-schema';\n"),
  f('config/release.json', ''),
];
const run = (...extra: SourceFile[]) => {
  const files = [...base()];
  for (const e of extra) { const i = files.findIndex((x) => x.path === e.path); if (i >= 0) files[i] = e; else files.push(e); }
  return checkBoundaries(files, experiences).map((x) => `${x.file} ${x.reason.slice(0, x.reason.indexOf(']') + 1)}`);
};

test('positive: legitimate imports pass', () => {
  // Server frontmatter reads the catalog and release state; the island imports schema types
  // and values, the track() facade, its own helper and its own exclusive package.
  assert.deepEqual(run(), []);
});

test('import forms: static, type-only, side-effect, re-export and dynamic; comments ignored', () => {
  const imports = importsOf(f('x.ts', "import a from './a.ts';\nimport type { B } from './b.ts';\nimport './c.css';\nexport * from './d.ts';\nexport { e } from './e.ts';\nconst f = await import('./f.ts');\n// import './g.ts'\n/* import './h.ts' */"));
  assert.deepEqual(imports.map((i) => [i.spec, i.typeOnly]), [
    ['./a.ts', false], ['./b.ts', true], ['./c.css', false], ['./d.ts', false], ['./e.ts', false], ['./f.ts', false],
  ]);
});

test('the browser graph follows islands transitively but not server frontmatter', () => {
  const files = base();
  // Schema values the island imports really are bundled for the browser; that is allowed.
  assert.deepEqual([...clientFiles(files, new Set(files.map((x) => x.path))).keys()].sort(), [
    `${E}/alpha/App.tsx`, `${E}/alpha/helper.ts`, 'apps/site/src/platform/analytics/track.ts',
    'packages/platform-schema/src/index.ts', 'packages/platform-schema/src/release.ts',
  ].sort());
});

test('negative: browser code importing catalog, release state or server-only kernel fails', () => {
  assert.deepEqual(run(f(`${E}/alpha/App.tsx`, "import { catalog } from '@pu/experience-catalog';")), [`${E}/alpha/App.tsx:1 [client-server-only]`]);
  // Transitively, through a helper, by relative JSON import.
  assert.deepEqual(run(f(`${E}/alpha/helper.ts`, "import release from '../../../../../config/release.json';")), [`${E}/alpha/helper.ts:1 [client-server-only]`]);
  assert.deepEqual(run(f(`${E}/alpha/App.tsx`, "import { flag } from '../../platform/release/index.ts';")), [`${E}/alpha/App.tsx:1 [client-server-only]`]);
  assert.deepEqual(run(f(`${E}/alpha/App.tsx`, "export * from '../../platform/access/authorize.ts';")), [`${E}/alpha/App.tsx:1 [client-server-only]`]);
  assert.deepEqual(run(f(`${E}/alpha/App.tsx`, "const c = await import('@pu/experience-catalog');")), [`${E}/alpha/App.tsx:1 [client-server-only]`]);
  assert.deepEqual(run(f(`${E}/alpha/App.tsx`, "import { readFileSync } from 'node:fs';")), [`${E}/alpha/App.tsx:1 [client-server-only]`]);
});

test('negative: an Astro <script> block importing the catalog fails; its frontmatter may', () => {
  const page = f(`${E}/beta/routes/index.astro`, "---\nimport { catalog } from '@pu/experience-catalog';\n---\n<p>x</p>\n<script>\nimport { catalog } from '@pu/experience-catalog';\n</script>");
  assert.deepEqual(run(page), [`${E}/beta/routes/index.astro:6 [client-server-only]`]);
});

test('positive: type-only imports of server modules are erased and pass', () => {
  assert.deepEqual(run(f(`${E}/alpha/helper.ts`, "import type { Experience } from '@pu/experience-catalog';")), []);
});

test('negative: one experience importing another fails, even from server code', () => {
  assert.deepEqual(run(f(`${E}/beta/Layout.astro`, "---\nimport App from '../alpha/App.tsx';\n---")), [`${E}/beta/Layout.astro:2 [experience-isolation]`]);
});

test('negative: the kernel importing an experience fails', () => {
  assert.deepEqual(run(f('apps/site/src/platform/analytics/track.ts', "import { helper } from '../../experiences/alpha/helper.ts';")),
    ['apps/site/src/platform/analytics/track.ts:1 [kernel-independence]']);
});

test('negative: packages stay inside their allowed dependencies', () => {
  assert.deepEqual(run(f('packages/platform-schema/src/release.ts', "import { z } from 'zod';\nimport x from '../../../apps/site/src/platform/release/index.ts';\nimport { readFileSync } from 'node:fs';")),
    // The island imports schema values, so these would also reach the browser: both rules fire.
    ['packages/platform-schema/src/release.ts:2 [schema-deps]', 'packages/platform-schema/src/release.ts:2 [client-server-only]',
      'packages/platform-schema/src/release.ts:3 [schema-deps]', 'packages/platform-schema/src/release.ts:3 [client-server-only]']);
  assert.deepEqual(run(f('packages/experience-catalog/src/entries/a.ts', "import { defineExperience } from '@pu/platform-schema';\nimport Root from '../../../../apps/site/src/platform/root/ExperienceRoot.astro';\nimport type { AstroIntegration } from 'astro';")),
    ['packages/experience-catalog/src/entries/a.ts:2 [catalog-deps]', 'packages/experience-catalog/src/entries/a.ts:3 [catalog-deps]']);
});

test('negative: an exclusive package imported outside its owner fails', () => {
  assert.deepEqual(run(f(`${E}/beta/Layout.astro`, "---\nimport { geoPath } from 'd3-geo';\n---")), [`${E}/beta/Layout.astro:2 [exclusive-imports]`]);
});

test('test files are not checked', () => {
  assert.deepEqual(run(f(`${E}/alpha/App.test.ts`, "import '../beta/routes/index.astro';")), []);
});

test('the real repository passes', () => {
  assert.deepEqual(checkBoundaries(readSources(repoRoot), loadPlatform().experiences), []);
});
