import assert from 'node:assert/strict';
import { test } from 'node:test';
import { ExperienceDefinition, type Experience } from '@pu/platform-schema';
import { BUDGETS, evaluate, limitsFor, measure, measurePage, type PageSize } from './budgets.ts';
import { gzipBytes, type DistFile } from './repo.ts';

const file = (path: string, text: string): DistFile => ({ path, bytes: Buffer.from(text), text });
const app = ExperienceDefinition.parse({
  kind: 'internal', id: 'app', title: 'App', summary: 'An app.', capabilities: ['interactive'], performanceClass: 'interactive',
  routes: [{ pattern: '/app', entrypoint: 'app/routes/index.astro' }, { pattern: '/app/[...p]', entrypoint: 'app/routes/x.astro' }],
}) as Experience;

test('a page counts inline code, referenced files and their static imports, once each', () => {
  const files = [
    file('app/view.html', '<style>a{}</style><script>boot()</script><script src="/_astro/entry.js"></script>' +
      '<astro-island component-url="/_astro/entry.js"></astro-island><link rel="preload" href="/_astro/fonts/f.woff2">'),
    file('_astro/entry.js', 'import{a}from"./shared.js";import("./lazy.js")'),
    file('_astro/shared.js', 'export const a=1'),
    file('_astro/lazy.js', 'big()'.repeat(500)),
    { path: '_astro/fonts/f.woff2', bytes: Buffer.alloc(2000, 7) },
  ];
  const byPath = new Map(files.map((f) => [f.path, f]));
  const size = measurePage(files[0]!, byPath);
  const gz = (p: string) => gzipBytes(byPath.get(p)!.bytes);
  assert.equal(size.js, gzipBytes('boot()') + gz('_astro/entry.js') + gz('_astro/shared.js'), 'lazy.js is not initial');
  assert.equal(size.css, gzipBytes('a{}'));
  assert.equal(size.fonts, gz('_astro/fonts/f.woff2'));
  assert.equal(size.transfer, gzipBytes(files[0]!.bytes) + gz('_astro/entry.js') + gz('_astro/shared.js') + gz('_astro/fonts/f.woff2'));
});

test('pages are attributed by route; unknown pages belong to the platform', () => {
  const pages = measure([file('app/deep/view.html', ''), file('app.html', ''), file('index.html', '')], [app]);
  assert.deepEqual(pages.map((p) => [p.page, p.owner, p.budgetClass]), [
    ['app/deep/view.html', 'app', 'interactive'], ['app.html', 'app', 'interactive'], ['index.html', 'platform', 'platform'],
  ]);
});

const page = (js: number): PageSize => ({ page: 'app.html', owner: 'app', budgetClass: 'interactive', js, css: 0, fonts: 0, transfer: js });
const jsLimit = BUDGETS.interactive.js * 1024;

test('under budget passes and reports headroom', () => {
  const { rows, findings } = evaluate([page(jsLimit - 1)], [app]);
  assert.deepEqual(findings, []);
  assert.equal(rows.find((r) => r.metric === 'js')!.bytes, jsLimit - 1);
});

test('exactly at budget passes', () => {
  assert.deepEqual(evaluate([page(jsLimit)], [app]).findings, []);
});

test('one byte over budget fails with the page, metric and overage', () => {
  const { findings } = evaluate([page(jsLimit + 1)], [app]);
  assert.deepEqual(findings, [{ file: 'app.html', reason: 'app (interactive) js is 150.0 KB gzip, over its 150 KB budget by 1 bytes' }]);
});

test('the worst page of an experience is the one judged', () => {
  const { findings } = evaluate([page(10), { ...page(jsLimit + 2048), page: 'app/heavy.html' }], [app]);
  assert.equal(findings[0]?.file, 'app/heavy.html');
});

test('catalog budgetOverrides replace the class limits', () => {
  const heavy = { ...app, budgetOverrides: { jsKb: 200, transferMb: 1, reason: 'WebGL renderer needs the larger runtime' } } as Experience;
  assert.deepEqual(limitsFor('app', 'interactive', [heavy]), { ...BUDGETS.interactive, js: 200, transfer: 1024 });
  assert.deepEqual(evaluate([page(jsLimit + 1)], [heavy]).findings, []);
});

test('content experiences have a zero-JavaScript budget', () => {
  const content = { ...page(1), budgetClass: 'content' as const, owner: 'notes' };
  assert.equal(evaluate([content], []).findings.length, 1);
});
