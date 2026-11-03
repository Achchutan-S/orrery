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

test('MDX: top-level imports are checked, prose mentioning imports is not', () => {
  const ok = f(`${E}/alpha/chapters/01.mdx`, "---\ntitle: x\n---\nimport Note from '../Note.astro';\n\nWrite import x from '../../beta/y.ts' in prose freely.\n");
  assert.deepEqual(run(ok), []);
  const bad = f(`${E}/alpha/chapters/02.mdx`, "import Layout from '../../beta/Layout.astro';\n\nText.\n");
  assert.deepEqual(run(bad), [`${E}/alpha/chapters/02.mdx:1 [experience-isolation]`]);
});

test('the site and the Control Center stay apart; the Control Center uses only the two packages', () => {
  assert.deepEqual(run(
    f('apps/site/src/pages/x.ts', "import { createApp } from '../../../control/server/app.ts';\n"),
    f('apps/control/server/ok.ts', "import { Hono } from 'hono';\nimport { readFile } from 'node:fs/promises';\nimport { catalog } from '@pu/experience-catalog';\nimport { resolve } from '@pu/platform-schema';\nimport { x } from './store.ts';\n"),
    f('apps/control/server/bad.ts', "import { flag } from '../../site/src/platform/release/index.ts';\nimport { readDist } from '../../../tools/checks/src/repo.ts';\n"),
  ), [
    'apps/site/src/pages/x.ts:1 [site-control]',
    'apps/control/server/bad.ts:1 [control-deps]',
    'apps/control/server/bad.ts:2 [control-deps]',
  ]);
});

test('Control Center browser code reaches the server only through the API', () => {
  assert.deepEqual(run(
    f('apps/control/web/src/ok.tsx', "import { useState } from 'react';\nimport { canTransition } from '@pu/platform-schema';\nimport type { Catalog } from '../../server/app.ts';\nimport { x } from './api.ts';\n"),
    f('apps/control/web/src/bad.tsx', "import { createApp } from '../../server/app.ts';\nimport { readFile } from 'node:fs';\nimport { catalog } from '@pu/experience-catalog';\n"),
  ), [
    'apps/control/web/src/bad.tsx:1 [control-web-client]',
    'apps/control/web/src/bad.tsx:2 [control-web-client]',
    'apps/control/web/src/bad.tsx:3 [control-web-client]',
  ]);
});

// F05: platform pages, globs, CSS, MDX islands, alternative spellings, scripts and configs.
test('platform pages may use the kernel but never an experience', () => {
  assert.deepEqual(run(
    f('apps/site/src/pages/ok.astro', "---\nimport Layout from './_PlatformLayout.astro';\nimport { publicDiscoveryIndex } from '../platform/discovery/index.ts';\n---"),
    f('apps/site/src/pages/bad.astro', "---\nimport Layout from '../experiences/alpha/Layout.astro';\n---"),
  ), ['apps/site/src/pages/bad.astro:2 [kernel-independence]']);
});

test('import.meta.glob: own folder passes; another experience, or all of them, fails', () => {
  const glob = (pattern: string) => f(`${E}/alpha/chapters.ts`, `const m = import.meta.glob<Module>(${pattern}, { eager: true });`);
  assert.deepEqual(run(glob("'./chapters/*.mdx'")), []);
  assert.deepEqual(run(glob("['./a/*.ts', '!./a/skip.ts']")), []);
  assert.deepEqual(run(glob("'../beta/*.ts'")), [`${E}/alpha/chapters.ts:1 [experience-isolation]`]);
  assert.deepEqual(run(glob("['./a/*.ts', '../beta/**/*.astro']")), [`${E}/alpha/chapters.ts:1 [experience-isolation]`]);
  assert.deepEqual(run(glob("'../*/content.ts'")), [`${E}/alpha/chapters.ts:1 [experience-isolation]`], 'spans every experience');
  assert.deepEqual(run(glob("'/src/experiences/beta/*.ts'")), [`${E}/alpha/chapters.ts:1 [experience-isolation]`], 'root-relative');
  assert.deepEqual(run(f('apps/site/src/platform/discovery/all.ts', "import.meta.glob('../../experiences/*/meta.ts');")),
    ['apps/site/src/platform/discovery/all.ts:1 [kernel-independence]']);
  assert.deepEqual(run(glob('patterns')), [`${E}/alpha/chapters.ts:1 [glob-literal]`], 'a variable cannot be checked: fail safe');
  assert.deepEqual(run(glob('`../${x}/*.ts`')), [`${E}/alpha/chapters.ts:1 [glob-literal]`]);
});

test('CSS: shared platform styles pass; another experience\'s stylesheet or font fails, in .css and <style>', () => {
  assert.deepEqual(run(
    f(`${E}/alpha/alpha.css`, "@import '../../platform/tokens/platform.css';\n@font-face { src: url('./fonts/a.woff2'); }\na { background: url(data:image/png;base64,AA); }\n"),
  ), []);
  assert.deepEqual(run(
    f(`${E}/alpha/a.css`, "/* @import '../beta/x.css'; is a comment */\n@import url(\"../beta/theme.css\");\n"),
    f(`${E}/alpha/b.css`, "@font-face {\n  src: url(../beta/fonts/b.woff2);\n}\n"),
    f(`${E}/alpha/Layout.astro`, "---\n---\n<p>x</p>\n<style>\n  @import '../beta/theme.css';\n</style>\n"),
    f('apps/site/src/platform/tokens/platform.css', "@import '../../experiences/beta/theme.css';\n"),
  ), [
    `${E}/alpha/a.css:2 [experience-isolation]`,
    `${E}/alpha/b.css:2 [experience-isolation]`,
    `${E}/alpha/Layout.astro:5 [experience-isolation]`,
    'apps/site/src/platform/tokens/platform.css:1 [kernel-independence]',
  ]);
});

test('MDX: an island used in MDX is browser code; a valid island passes, one reading the catalog fails', () => {
  const chapter = f(`${E}/alpha/chapters/03.mdx`, "import Chart from '../Chart.tsx';\n\n# Heading\n\n<Chart client:visible />\n");
  assert.deepEqual(run(chapter, f(`${E}/alpha/Chart.tsx`, "import { helper } from './helper.ts';\n")), []);
  assert.deepEqual(run(chapter, f(`${E}/alpha/Chart.tsx`, "import { catalog } from '@pu/experience-catalog';\n")), [`${E}/alpha/Chart.tsx:1 [client-server-only]`]);
  assert.deepEqual(run(f(`${E}/alpha/chapters/04.mdx`, "import Note from '../../beta/Note.astro';\n\n<Note />\n")), [`${E}/alpha/chapters/04.mdx:1 [experience-isolation]`]);
});

test('alternative spellings resolve like the canonical path', () => {
  for (const spec of ['./x/../../beta/Layout.astro', '..\\\\beta\\\\Layout.astro', '/src/experiences/beta/Layout.astro', '../beta/assets/x.pdf?inline']) {
    assert.deepEqual(run(f(`${E}/alpha/helper.ts`, `import x from '${spec}';`)), [`${E}/alpha/helper.ts:1 [experience-isolation]`], spec);
  }
});

test('scripts and configs are scanned: the Astro config and integration are platform code', () => {
  assert.deepEqual(run(
    f('apps/site/astro.config.ts', "import mdx from '@astrojs/mdx';\nimport { LAYER_ORDER } from './src/platform/tokens/layer-order.ts';\nimport x from './src/experiences/alpha/helper.ts';\n"),
    f('apps/site/scripts/build-thing.ts', "import { createApp } from '../../control/server/app.ts';\n"),
    f('apps/control/vite.config.ts', "import { defineConfig } from 'vite';\nimport { flag } from '../site/src/platform/release/index.ts';\n"),
  ), [
    'apps/site/astro.config.ts:3 [kernel-independence]',
    'apps/site/scripts/build-thing.ts:1 [site-control]',
    'apps/control/vite.config.ts:2 [control-deps]',
  ]);
  const scanned = readSources(repoRoot).map((x) => x.path);
  for (const p of ['apps/site/astro.config.ts', 'apps/site/scripts/resume-assets.ts', 'apps/control/vite.config.ts', 'apps/control/web/ui-config.ts', 'apps/site/src/platform/tokens/platform.css']) {
    assert.ok(scanned.includes(p), p);
  }
});
