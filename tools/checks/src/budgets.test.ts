import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { test } from 'node:test';
import { ExperienceDefinition, type Experience } from '@pu/platform-schema';
import { BEACON_MARKER, BUDGETS, evaluate, fileFindings, FILE_BUDGETS, limitsFor, measure, measurePage, type PageSize } from './budgets.ts';
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
  assert.equal(size.lazy, gz('_astro/lazy.js'), 'it is the lazy chunk');
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

const page = (js: number): PageSize => ({ page: 'app.html', owner: 'app', budgetClass: 'interactive', js, beacon: 0, css: 0, fonts: 0, images: 0, lazy: 0, transfer: js });
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

test('the Beacon script has its own budget: not counted as the page\'s js, inline or as a file', () => {
  const beaconCode = `document.querySelector(".${BEACON_MARKER}")`;
  const files = [
    file('essay.html', `<script type="module">${beaconCode}</script>`),
    file('app.html', `<script>boot()</script><script type="module" src="/_astro/beacon.js"></script>`),
    file('_astro/beacon.js', beaconCode),
  ];
  const byPath = new Map(files.map((f) => [f.path, f]));
  const essay = measurePage(files[0]!, byPath);
  assert.deepEqual([essay.js, essay.beacon], [0, gzipBytes(beaconCode)]);
  const app = measurePage(files[1]!, byPath);
  assert.deepEqual([app.js, app.beacon], [gzipBytes('boot()'), gzipBytes(beaconCode)]);
  const heavy: PageSize = { page: 'essay.html', owner: 'essay', budgetClass: 'content', js: 0, beacon: BUDGETS.content.beacon * 1024 + 1, css: 0, fonts: 0, images: 0, lazy: 0, transfer: 0 };
  assert.match(evaluate([heavy], []).findings[0]!.reason, /essay \(content\) beacon is 15\.0 KB gzip, over its 15 KB budget by 1 bytes/);
});

/** Incompressible bytes, like real images and fonts. */
const bin = (path: string, n: number): DistFile => ({ path, bytes: randomBytes(n) });

test('fonts and images that a stylesheet pulls in with url() load with it; data: and other sites do not count (F13)', () => {
  const files = [
    file('essay.html', '<link rel="stylesheet" href="/_astro/site.css"><style>.hero{background:url("/hero.png")}</style>'),
    file('_astro/site.css', '@font-face{src:url(./fonts/a.woff2)}.x{background:url(data:image/png;base64,AAAA)}.y{background:url(https://cdn.example/z.png)}'),
    bin('_astro/fonts/a.woff2', 3000),
    bin('hero.png', 4000),
  ];
  const byPath = new Map(files.map((f) => [f.path, f]));
  const size = measurePage(files[0]!, byPath);
  assert.equal(size.fonts, gzipBytes(files[2]!.bytes));
  assert.equal(size.images, gzipBytes(files[3]!.bytes));
  assert.deepEqual(size.missing, []);
  assert.ok(size.transfer >= size.fonts + size.images, 'transfer includes both');
});

test('images: img src and srcset, picture sources and the icon count once; each <img> needs width and height (F13)', () => {
  const files = [
    file('photo.html', '<link rel="icon" href="/favicon.svg"><picture><source srcset="/a.webp 1x, /a2.webp 2x"><img src="/a.png" srcset="/a.png 1x, /a2.png 2x" alt="A" width="10" height="10"></picture><img src="https://elsewhere.example/b.png" alt="B">'),
    bin('favicon.svg', 300), bin('a.webp', 500), bin('a2.webp', 600), bin('a.png', 700), bin('a2.png', 800),
  ];
  const byPath = new Map(files.map((f) => [f.path, f]));
  const size = measurePage(files[0]!, byPath);
  assert.equal(size.images, files.slice(1).reduce((n, f) => n + gzipBytes(f.bytes), 0));
  assert.equal(size.unsized, 1, 'the external image has no dimensions');
});

test('lazy chunks: the largest dynamic import with its static imports, minus what the page already loaded (F13)', () => {
  const files = [
    file('app.html', '<script type="module" src="/_astro/entry.js"></script>'),
    file('_astro/entry.js', 'import"./shared.js";import("./small.js");import("./big.js")'),
    file('_astro/shared.js', 'x'.repeat(50)),
    file('_astro/small.js', 'import"./shared.js";s()'),
    file('_astro/big.js', 'import"./shared.js";import"./dep.js";b()'),
    bin('_astro/dep.js', 5000),
  ];
  const byPath = new Map(files.map((f) => [f.path, f]));
  const size = measurePage(files[0]!, byPath);
  const gz = (p: string) => gzipBytes(byPath.get(p)!.bytes);
  assert.equal(size.lazy, gz('_astro/big.js') + gz('_astro/dep.js'), 'shared.js was already loaded');
  assert.equal(size.js, gz('_astro/entry.js') + gz('_astro/shared.js'));
});

test('the lazy budget: 100 KB passes, one byte more fails; content pages may load nothing lazily (F13)', () => {
  const at = { ...page(0), lazy: BUDGETS.interactive.lazy * 1024 };
  assert.deepEqual(evaluate([at], [app]).findings, []);
  assert.match(evaluate([{ ...at, lazy: at.lazy + 1 }], [app]).findings[0]!.reason, /app \(interactive\) lazy is 100\.0 KB gzip, over its 100 KB budget by 1 bytes/);
  assert.equal(evaluate([{ ...page(0), owner: 'essay', budgetClass: 'content', lazy: 1 }], []).findings.length, 1);
  assert.equal(evaluate([{ ...page(0), images: BUDGETS.interactive.images * 1024 + 1 }], [app]).findings.length, 1);
});

test('every emitted file is accounted for: missing references, unsized images, files no page loads (F13)', () => {
  const withOg = { ...app, ogImage: '/app/og.png' } as Experience;
  const files = [
    file('app.html', '<script type="module" src="/_astro/gone.js"></script><img src="/pic.png" alt="P"><link rel="icon" href="/favicon.svg">'),
    bin('pic.png', 100), bin('favicon.svg', 100),
    bin('og.png', 40 * 1024), bin('app/og.png', 150 * 1024 + 4096),
    bin('app/doc.pdf', 1000),
    bin('_astro/orphan.js', 100),
  ];
  const pages = measure(files, [withOg]);
  assert.deepEqual(fileFindings(files, pages, [withOg]).map((f) => `${f.file}: ${f.reason.replace(/[\d.]+ KB gzip, over its 150 KB budget by [\d.]+ (KB|bytes)/, 'OVER')}`), [
    'app.html: references _astro/gone.js, which the build did not emit',
    'app.html: 1 <img> without width and height (layout shift)',
    'app/og.png: link-preview image is OVER',
    '_astro/orphan.js: emitted but loaded by no page and in no FILE_BUDGETS entry, so its size is unchecked',
  ]);
  assert.deepEqual(FILE_BUDGETS.map((b) => b.kind), ['link-preview image', 'document']);
});
