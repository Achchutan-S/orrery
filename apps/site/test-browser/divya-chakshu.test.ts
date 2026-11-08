// Divya Chakshu in a real browser (preview build; it is a draft until released): axe, structure,
// reflow, keyboard operation of every control, the text without JavaScript, the CSS stills
// without WebGL, reduced motion, and no CSP violations or script errors. WebGL runs on
// SwiftShader, so this proves the shaders compile and draw, not how fast. Screenshots land in
// apps/site/test-results/divya-chakshu-*.png for review.
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { after, before, describe, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import AxeBuilder from '@axe-core/playwright';
import { preview } from 'astro';
import { chromium, type Browser, type BrowserContextOptions, type Page } from 'playwright';
import { SEQUENCES } from '../src/experiences/divya-chakshu/content.ts';

const root = fileURLToPath(new URL('../', import.meta.url));
const shots = join(root, 'test-results');
const tmp = mkdtempSync(join(tmpdir(), 'pu-divya-browser-'));
const PATH = '/divya-chakshu';
const DESKTOP = { viewport: { width: 1280, height: 800 } } satisfies BrowserContextOptions;
const MOBILE = { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true } satisfies BrowserContextOptions;
const GL_ARGS = ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'];

let browser: Browser;
let noGl: Browser;
let server: Awaited<ReturnType<typeof preview>>;
let base = '';
const problems: string[] = [];

before(async () => {
  const outDir = join(tmp, 'preview');
  const r = spawnSync(process.execPath, [join(root, 'node_modules/astro/bin/astro.mjs'), 'build', '--outDir', outDir], { cwd: root, encoding: 'utf8', env: { ...process.env, VERCEL_ENV: 'preview' } });
  assert.equal(r.status, 0, r.stdout + r.stderr);
  server = await preview({ root, outDir, logLevel: 'error', server: { port: 0 } });
  base = `http://localhost:${server.port}`;
  browser = await chromium.launch({ args: GL_ARGS });
  noGl = await chromium.launch({ args: ['--disable-webgl', '--disable-3d-apis'] });
});
after(async () => {
  await browser?.close();
  await noGl?.close();
  await server?.stop();
  rmSync(tmp, { recursive: true, force: true });
});

async function open(opts: BrowserContextOptions = DESKTOP, b: Browser = browser): Promise<Page> {
  const page = await (await b.newContext(opts)).newPage();
  page.on('console', (m) => { if (m.type() === 'error') problems.push(`${m.text()}`); });
  page.on('pageerror', (e) => problems.push(`pageerror: ${e.message}`));
  await page.goto(base + PATH);
  return page;
}
const toBeat = (page: Page, seq: number, beat: number) =>
  page.evaluate(([s, b]) => document.querySelector(`[data-seq="${s}"][data-beat="${b}"]`)!.scrollIntoView({ block: 'center' }), [seq, beat]);

describe('Divya Chakshu: accessibility and structure', () => {
  test('axe (WCAG 2.2 A/AA) at the start and inside the vision, desktop and mobile; no sideways scroll at 320 px', async () => {
    for (const [name, opts] of [['desktop', DESKTOP], ['mobile', MOBILE]] as const) {
      const page = await open(opts);
      await page.waitForTimeout(800);
      for (const [s, b] of [[0, 0], [3, 2], [4, 4], [6, 1]] as const) {
        await toBeat(page, s, b);
        await page.waitForTimeout(1600);
        const { violations } = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']).analyze();
        assert.deepEqual(violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).slice(0, 3).join(', ')}`), [], `${name} at ${s}:${b}`);
        await page.screenshot({ path: join(shots, `divya-chakshu-${name}-${s}-${b}.png`) });
      }
      await page.context().close();
    }
    const narrow = await open({ viewport: { width: 320, height: 640 } });
    assert.ok(await narrow.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'scrolls sideways at 320 px');
    await narrow.context().close();
  });

  test('one h1, one main, a heading per sequence, no skipped levels; the canvas is hidden and every scene is described', async () => {
    const page = await open();
    const r = await page.evaluate(() => ({
      h1: document.querySelectorAll('h1').length,
      main: document.querySelectorAll('main').length,
      levels: [...document.querySelectorAll('h1, h2, h3, h4')].map((h) => Number(h.tagName[1])),
      canvasHidden: document.querySelector('canvas')?.getAttribute('aria-hidden'),
      scenes: [...document.querySelectorAll('.dc-vh')].map((e) => e.textContent ?? '').filter((t) => t.startsWith('In the picture')).length,
    }));
    assert.equal(r.h1, 1);
    assert.equal(r.main, 1);
    assert.equal(r.levels.filter((l) => l === 2).length, SEQUENCES.length - 1);
    r.levels.forEach((l, i) => { if (i > 0) assert.ok(l <= r.levels[i - 1]! + 1, `heading level skips at ${i}`); });
    assert.equal(r.canvasHidden, 'true');
    assert.equal(r.scenes, SEQUENCES.length);
    await page.context().close();
  });

  test('without JavaScript the whole chapter is readable and no control pretends to work', async () => {
    const page = await open({ ...DESKTOP, javaScriptEnabled: false });
    const text = await page.locator('main').innerText();
    for (const s of SEQUENCES) for (const b of s.beats) if (b.kind === 'verse') assert.ok(text.includes(b.verse.en.slice(0, 40)), b.verse.ref);
    for (const sel of ['[data-enter]', '[data-sight]', '[data-replay]', '[data-controls]']) assert.equal(await page.locator(sel).isVisible(), false, sel);
    assert.ok(await page.getByText('Scroll to begin.').isVisible());
    await page.screenshot({ path: join(shots, 'divya-chakshu-no-js.png') });
    await page.context().close();
  });
});

describe('Divya Chakshu: interaction', () => {
  test('keyboard: enter, receive divine sight, pause motion, sound, the sequence list (Escape returns focus)', async () => {
    const page = await open();
    await page.keyboard.press('Tab');
    assert.equal(await page.evaluate(() => document.activeElement?.hasAttribute('data-enter')), true, 'Enter is the first stop');
    await page.keyboard.press('Enter');
    assert.equal(await page.evaluate(() => document.documentElement.hasAttribute('data-entered')), true);

    await toBeat(page, 2, 2);
    await page.locator('[data-sight]').focus();
    await page.keyboard.press('Enter');
    assert.equal(await page.locator('[data-sight]').getAttribute('aria-disabled'), 'true');
    assert.match(await page.locator('[data-status]').textContent() ?? '', /Divine sight received/);
    await page.waitForTimeout(5600);
    await page.screenshot({ path: join(shots, 'divya-chakshu-sight.png') });

    const motion = page.locator('[data-motion]');
    await motion.focus();
    await page.keyboard.press('Space');
    assert.equal(await motion.getAttribute('aria-pressed'), 'true');
    await page.keyboard.press('Space');
    assert.equal(await motion.getAttribute('aria-pressed'), 'false');

    const sound = page.locator('[data-sound]');
    await sound.focus();
    await page.keyboard.press('Enter');
    await page.waitForTimeout(300);
    assert.equal(await sound.getAttribute('aria-pressed'), 'true');
    await page.keyboard.press('Enter');
    assert.equal(await sound.getAttribute('aria-pressed'), 'false');

    const toggle = page.locator('[data-chapters-toggle]');
    await toggle.focus();
    await page.keyboard.press('Enter');
    assert.equal(await page.locator('#dc-chapters').isVisible(), true);
    await page.keyboard.press('Escape');
    assert.equal(await page.locator('#dc-chapters').isVisible(), false);
    assert.equal(await page.evaluate(() => document.activeElement?.hasAttribute('data-chapters-toggle')), true);

    await page.keyboard.press('Enter');
    await page.locator('#dc-chapters a[href="#seq-time"]').click();
    assert.equal(await page.evaluate(() => document.activeElement?.id), 'h-time');
    // Smooth scrolling takes a moment over this distance; the label follows the reading position.
    await page.waitForFunction(() => /I am Time/.test(document.querySelector('[data-progress-label]')?.textContent ?? ''), null, { timeout: 10000 });
    await page.context().close();
  });

  test('replay returns to the battlefield with focus on Enter', async () => {
    const page = await open();
    await page.locator('[data-enter]').click();
    await toBeat(page, 8, 8);
    await page.waitForTimeout(1200);
    await page.locator('[data-replay]').click();
    await page.waitForTimeout(400);
    assert.ok(await page.evaluate(() => scrollY < 10));
    assert.equal(await page.evaluate(() => document.activeElement?.hasAttribute('data-enter')), true);
    assert.equal(await page.evaluate(() => document.documentElement.hasAttribute('data-entered')), false);
    await page.context().close();
  });

  test('WebGL draws; without WebGL the CSS stills follow the reader', async () => {
    const page = await open();
    await page.waitForFunction(() => document.documentElement.classList.contains('dc-gl'), null, { timeout: 15000 });
    await page.context().close();

    const still = await open(DESKTOP, noGl);
    await still.waitForTimeout(800);
    assert.ok(await still.evaluate(() => document.documentElement.classList.contains('dc-still')));
    await toBeat(still, 4, 2);
    await still.waitForTimeout(400);
    assert.equal(await still.locator('[data-stage]').getAttribute('data-seq'), '4');
    await still.screenshot({ path: join(shots, 'divya-chakshu-still-4.png') });
    await still.context().close();
  });

  test('reduced motion: no transitions on the text, no pointer response, still the full journey', async () => {
    const page = await open({ ...DESKTOP, reducedMotion: 'reduce' });
    await page.locator('[data-enter]').click();
    for (const [s, b] of [[2, 1], [5, 4], [8, 5]] as const) { await toBeat(page, s, b); await page.waitForTimeout(700); }
    assert.match(await page.evaluate(() => getComputedStyle(document.querySelector('[data-seq="8"][data-beat="5"] .beat__in')!).translate), /^(none|0px)$/);
    await page.screenshot({ path: join(shots, 'divya-chakshu-reduced.png') });
    await page.context().close();
  });

  test('no CSP violations or script errors on any visit above', () => {
    assert.deepEqual(problems.filter((p) => !/GPU stall|GL Driver/.test(p)), []);
  });
});
