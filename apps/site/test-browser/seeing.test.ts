// A History of Seeing in a real browser (preview build; it is a draft): axe on every page at
// desktop and mobile, structure, 320 px reflow, keyboard operation of every interaction, the
// pages without JavaScript, the scenes without WebGL and under reduced motion, deep links, and no
// CSP violations or script errors. WebGL runs on SwiftShader: this proves the shaders compile and
// draw, not how fast they run on a real phone. Screenshots land in apps/site/test-results/seeing-*.
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
import { BUILT_SUBJECTS } from '../src/experiences/seeing/data/atlas.ts';
import { PAIRS } from '../src/experiences/seeing/data/pairs.ts';

const root = fileURLToPath(new URL('../', import.meta.url));
const shots = join(root, 'test-results');
const tmp = mkdtempSync(join(tmpdir(), 'pu-seeing-browser-'));
const DESKTOP = { viewport: { width: 1280, height: 800 } } satisfies BrowserContextOptions;
const MOBILE = { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true } satisfies BrowserContextOptions;
const GL_ARGS = ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'];
const PAGES = ['/seeing', ...BUILT_SUBJECTS.map((s) => `/seeing/${s.id}`), '/seeing/reframing', '/seeing/map', '/seeing/lab', '/seeing/sources', ...PAIRS.map((p) => `/seeing/compare/${p.id}`)];

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
  assert.deepEqual(problems, [], 'no console errors, page errors or CSP violations');
});

async function open(path: string, opts: BrowserContextOptions = DESKTOP, b: Browser = browser): Promise<Page> {
  const page = await (await b.newContext(opts)).newPage();
  page.on('console', (m) => { if (m.type() === 'error') problems.push(`${path}: ${m.text()}`); });
  page.on('pageerror', (e) => problems.push(`${path}: pageerror: ${e.message}`));
  await page.goto(base + path);
  return page;
}
const axe = async (page: Page) => (await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']).analyze())
  .violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).slice(0, 3).join(', ')}`);

describe('A History of Seeing: every page', () => {
  test('axe (WCAG 2.2 A/AA) at desktop and mobile, with the atlas closed and open', async () => {
    for (const path of PAGES) {
      for (const [name, opts] of [['desktop', DESKTOP], ['mobile', MOBILE]] as const) {
        const page = await open(path, { ...opts, reducedMotion: 'reduce' });
        await page.waitForTimeout(300);
        assert.deepEqual(await axe(page), [], `${path} ${name}`);
        if (name === 'desktop') await page.screenshot({ path: join(shots, `seeing${path.replace(/\//g, '-')}.png`) });
        await page.context().close();
      }
    }
    const page = await open('/seeing/gothic');
    await page.getByRole('button', { name: /atlas/i }).click();
    assert.ok(await page.locator('#see-atlas').isVisible());
    assert.deepEqual(await axe(page), [], 'atlas open');
    await page.context().close();
  });

  test('structure: one h1, one main, no skipped heading levels, scenes hidden from assistive technology', async () => {
    for (const path of PAGES) {
      const page = await open(path);
      const r = await page.evaluate(() => ({
        h1: document.querySelectorAll('h1').length,
        main: document.querySelectorAll('main').length,
        levels: [...document.querySelectorAll('main h1, main h2, main h3, main h4, footer h2, footer h3, footer h4')].filter((h) => (h as HTMLElement).offsetParent !== null || h.closest('details')).map((h) => Number(h.tagName[1])),
        canvases: [...document.querySelectorAll('canvas')].every((c) => c.getAttribute('aria-hidden') === 'true' || c.closest('[aria-hidden="true"]')),
      }));
      assert.equal(r.h1, 1, path);
      assert.equal(r.main, 1, path);
      r.levels.forEach((l, i) => { if (i > 0) assert.ok(l <= r.levels[i - 1]! + 1, `${path}: heading level skips at ${i}`); });
      assert.ok(r.canvases, `${path}: canvas exposed`);
      await page.context().close();
    }
  });

  test('no sideways scrolling at 320 px', async () => {
    for (const path of PAGES) {
      const page = await open(path, { viewport: { width: 320, height: 640 } });
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${path} scrolls sideways at 320 px`);
      await page.context().close();
    }
  });

  test('without JavaScript every page keeps its text, and controls that need a script stay hidden', async () => {
    for (const path of PAGES) {
      const page = await open(path, { ...DESKTOP, javaScriptEnabled: false });
      const text = await page.locator('main').innerText();
      assert.ok(text.length > 800, `${path} has its text`);
      await page.context().close();
    }
    const lab = await open('/seeing/lab', { ...DESKTOP, javaScriptEnabled: false });
    assert.equal(await lab.locator('[data-controls]').isVisible(), false);
    assert.ok(await lab.getByText('The instrument needs JavaScript').isVisible());
    await lab.context().close();
    const aero = await open('/seeing/frutiger-aero', { ...DESKTOP, javaScriptEnabled: false });
    assert.equal(await aero.locator('.f-bubble').first().isVisible(), false, 'bubbles need a script');
    assert.ok(await aero.locator('.f-word').first().isVisible(), 'the vocabulary is a plain list');
    await aero.context().close();
  });

  test('deep links and wayfinding: the atlas lists only real pages, and previous/next walk the chapters', async () => {
    const page = await open('/seeing/bauhaus');
    const links = await page.locator('#see-atlas a').evaluateAll((as) => as.map((a) => (a as HTMLAnchorElement).pathname));
    for (const l of links) {
      const res = await page.request.get(base + l);
      assert.equal(res.status(), 200, l);
    }
    assert.equal(await page.locator('#see-atlas a[aria-current="page"]').textContent(), 'Bauhaus');
    assert.equal(await page.locator('a[rel="prev"]').getAttribute('href'), '/seeing/art-nouveau');
    assert.equal(await page.locator('a[rel="next"]').getAttribute('href'), '/seeing/brutalism');
    await page.context().close();
  });
});

describe('A History of Seeing: interactions by keyboard', () => {
  test('opening: the instrument changes the optics; the reading follows', async () => {
    const page = await open('/seeing', { ...DESKTOP, reducedMotion: 'reduce' });
    await page.locator('#ob-wide').focus();
    await page.keyboard.press('Space');
    assert.ok(await page.locator('.ob-r--wide').isVisible());
    await page.locator('#ob-lens').focus();
    await page.keyboard.press('Space');
    assert.ok(await page.locator('.ob-r--lens').isVisible());
    assert.equal(await page.locator('.ob-image').evaluate((g) => getComputedStyle(g).filter), 'none');
    await page.locator('#ob-mirror').focus();
    await page.keyboard.press('Space');
    assert.ok(await page.locator('.ob-r--mirror').isVisible());
    await page.context().close();
  });

  test('Gothic: the hour moves the light', async () => {
    const page = await open('/seeing/gothic', { ...DESKTOP, reducedMotion: 'reduce' });
    await page.locator('#g-hour-noon').focus();
    await page.keyboard.press('Space');
    assert.ok(await page.locator('.g-beams--noon').evaluate((g) => getComputedStyle(g).display !== 'none'));
    assert.ok(await page.locator('.g-beams--morning').evaluate((g) => getComputedStyle(g).display === 'none'));
    await page.context().close();
  });

  test('Renaissance: arrow keys on the eye controls move the vanishing point', async () => {
    const page = await open('/seeing/renaissance');
    const before = await page.locator('[data-vp]').getAttribute('transform');
    await page.locator('#r-eye-x').focus();
    for (let i = 0; i < 8; i++) await page.keyboard.press('ArrowRight');
    await page.waitForTimeout(100);
    assert.notEqual(await page.locator('[data-vp]').getAttribute('transform'), before);
    assert.match(await page.locator('[data-eye-status]').textContent() ?? '', /to the right/);
    await page.locator('#r-lines').focus();
    await page.keyboard.press('Space');
    await page.waitForTimeout(600);
    assert.equal(await page.locator('.r-construction').evaluate((g) => getComputedStyle(g).opacity), '0');
    await page.context().close();
  });

  test('Art Nouveau, Bauhaus, Brutalism, Wabi-sabi, Cyberpunk: choices change the composition', async () => {
    const cases: [string, string, string][] = [
      ['/seeing/art-nouveau', '#n-m-glass', '.n-ctx--glass'],
      ['/seeing/brutalism', '#x-r-photographed', '.x-cap--photographed'],
      ['/seeing/wabi-sabi', '#w-word-yugen', '.w-gloss--yugen'],
      ['/seeing/cyberpunk', '#c-d4', '.c-watch span'],
    ];
    for (const [path, input, shown] of cases) {
      const page = await open(path, { ...DESKTOP, reducedMotion: 'reduce' });
      await page.locator(input).focus();
      await page.keyboard.press('Space');
      assert.ok(await page.locator(shown).first().isVisible(), `${path}: ${shown}`);
      await page.context().close();
    }
    const page = await open('/seeing/bauhaus', { ...DESKTOP, reducedMotion: 'reduce' });
    for (const id of ['#b-tri-y', '#b-sq-r', '#b-ci-b']) { await page.locator(id).focus(); await page.keyboard.press('Space'); }
    await page.locator('.b-answer summary').focus();
    await page.keyboard.press('Enter');
    // Poll: the :has() rule depends on the disclosure opening, which restyles on the next frame.
    let shown = 0;
    for (let i = 0; i < 20 && shown < 3; i++) {
      await page.waitForTimeout(50);
      shown = await page.locator('.b-q__match').evaluateAll((els) => els.filter((e) => getComputedStyle(e).visibility === 'visible').length);
    }
    assert.equal(shown, 3, 'all three answers match Kandinsky');
    await page.locator('#b-lower').focus();
    await page.keyboard.press('Space');
    assert.equal(await page.locator('main').evaluate((m) => getComputedStyle(m).textTransform), 'none');
    await page.context().close();
  });

  test('Frutiger Aero: popping a bubble with the keyboard adds its word and moves focus on', async () => {
    const page = await open('/seeing/frutiger-aero', { ...DESKTOP, reducedMotion: 'reduce' });
    const first = page.locator('.f-bubble').first();
    const word = await first.getAttribute('data-word');
    await first.focus();
    await page.keyboard.press('Enter');
    assert.ok(await page.locator(`.f-word[data-for="${word}"]`).isVisible());
    assert.equal(await first.isVisible(), false);
    assert.equal(await page.evaluate(() => document.activeElement?.classList.contains('f-bubble')), true);
    await page.context().close();
  });

  test('Weirdcore: the caption changes, the picture is redrawn at a lower resolution', async () => {
    const page = await open('/seeing/weirdcore');
    await page.locator('#k-c-2').focus();
    await page.keyboard.press('Space');
    assert.ok(await page.locator('.k-caption--2').isVisible());
    await page.locator('input[name="k-res"][value="low"]').focus();
    await page.keyboard.press('Space');
    assert.equal(await page.locator('[data-corridor]').evaluate((c) => (c as HTMLCanvasElement).width), 40);
    await page.context().close();
  });

  test('Reframing, the lab, the map and a comparison respond to the keyboard', async () => {
    const rf = await open('/seeing/reframing', { ...DESKTOP, reducedMotion: 'reduce' });
    await rf.locator('#rf-s-cyberpunk').focus();
    await rf.keyboard.press('Space');
    assert.ok(await rf.locator('.rf-read--cyberpunk').isVisible());
    assert.ok(await rf.locator('.rf-style--cyberpunk').isVisible());
    await rf.context().close();

    const lab = await open('/seeing/lab');
    await lab.locator('[data-preset="brutalism"]').focus();
    await lab.keyboard.press('Enter');
    assert.match(await lab.locator('[data-readout]').textContent() ?? '', /curated Brutalism composition/);
    await lab.locator('input[name="arch"]').focus();
    for (let i = 0; i < 18; i++) await lab.keyboard.press('ArrowRight');
    assert.match(await lab.locator('[data-readout]').textContent() ?? '', /not an identification/);
    await lab.context().close();

    const map = await open('/seeing/map', { ...DESKTOP, reducedMotion: 'reduce' });
    await map.locator('#mp-k-resemblance').focus();
    await map.keyboard.press('Space');
    assert.equal(await map.locator('.mp-group--resemblance').isVisible(), false);
    await map.locator('.mp-node.is-open').first().focus();
    assert.ok(await map.locator('.mp-edge.is-lit').count() > 0, 'focusing a node lights its edges');
    await map.context().close();

    const cp = await open('/seeing/compare/gothic-renaissance');
    const slider = cp.locator('[data-wipe-control] input');
    await slider.focus();
    await cp.keyboard.press('Home');
    assert.equal(await cp.locator('[data-wipe]').evaluate((w) => (w as HTMLElement).style.getPropertyValue('--cp-split')), '0%');
    await cp.context().close();
  });
});

describe('A History of Seeing: motion and fallbacks', () => {
  test('WebGL scenes start when visible; without WebGL or under reduced motion they never start, and the page still reads', async () => {
    for (const path of ['/seeing/cyberpunk', '/seeing/frutiger-aero']) {
      const gl = await open(path);
      await gl.locator('canvas').first().scrollIntoViewIfNeeded();
      await gl.waitForTimeout(1500);
      assert.equal(await gl.locator('canvas').first().getAttribute('data-gl'), 'on', `${path} with WebGL`);
      await gl.screenshot({ path: join(shots, `seeing${path.replace(/\//g, '-')}-webgl.png`) });
      await gl.context().close();

      for (const [label, page] of [['no WebGL', await open(path, DESKTOP, noGl)], ['reduced motion', await open(path, { ...DESKTOP, reducedMotion: 'reduce' })]] as const) {
        await page.waitForTimeout(1200);
        assert.notEqual(await page.locator('canvas').first().getAttribute('data-gl'), 'on', `${path} ${label}`);
        assert.ok((await page.locator('main').innerText()).length > 800, `${path} ${label} reads`);
        await page.context().close();
      }
    }
  });

  test('reduced motion: the opening shows its projection at once and Wabi-sabi is already aged', async () => {
    const page = await open('/seeing', { ...DESKTOP, reducedMotion: 'reduce' });
    await page.waitForTimeout(200);
    assert.equal(await page.locator('.ob-intro').evaluate((e) => getComputedStyle(e).opacity), '1');
    await page.context().close();
    const w = await open('/seeing/wabi-sabi', { ...DESKTOP, reducedMotion: 'reduce' });
    await w.waitForTimeout(200);
    assert.ok(Number(await w.locator('.w-patina').evaluate((e) => getComputedStyle(e).opacity)) > 0.5);
    await w.context().close();
  });
});
