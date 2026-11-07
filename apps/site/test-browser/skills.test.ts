// The Claude Skills Archive in a real browser (preview build; it is a draft until released):
// copy really puts the exact original on the clipboard, downloads are the original bytes, search,
// keyboard, the lanterns, reduced motion, no JavaScript, reflow and axe. Screenshots land in
// apps/site/test-results/skills-*.png for review.
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { after, before, describe, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import AxeBuilder from '@axe-core/playwright';
import { preview } from 'astro';
import { chromium, type Browser, type BrowserContextOptions, type Page } from 'playwright';
import { sha256, type Manifest } from '../src/experiences/skills/integrity.ts';

const root = fileURLToPath(new URL('../', import.meta.url));
const shots = join(root, 'test-results');
const sourceDir = join(root, 'src/experiences/skills/source');
const manifest = JSON.parse(readFileSync(join(sourceDir, 'manifest.json'), 'utf8')) as Manifest;
const original = (slug: string, path: string) => readFileSync(join(sourceDir, slug, path), 'utf8');
const tmp = mkdtempSync(join(tmpdir(), 'pu-skills-browser-'));
const DESKTOP = { viewport: { width: 1280, height: 900 } } satisfies BrowserContextOptions;
const MOBILE = { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true } satisfies BrowserContextOptions;

let browser: Browser;
let server: Awaited<ReturnType<typeof preview>>;
let base = '';
const csp: string[] = [];

before(async () => {
  const outDir = join(tmp, 'preview');
  const r = spawnSync(process.execPath, [join(root, 'node_modules/astro/bin/astro.mjs'), 'build', '--outDir', outDir], { cwd: root, encoding: 'utf8', env: { ...process.env, VERCEL_ENV: 'preview' } });
  assert.equal(r.status, 0, r.stdout + r.stderr);
  server = await preview({ root, outDir, logLevel: 'error', server: { port: 0 } });
  base = `http://localhost:${server.port}`;
  browser = await chromium.launch();
});
after(async () => {
  await browser?.close();
  await server?.stop();
  rmSync(tmp, { recursive: true, force: true });
});

async function open(path: string, opts: BrowserContextOptions = DESKTOP): Promise<Page> {
  const context = await browser.newContext(opts);
  const page = await context.newPage();
  page.on('console', (m) => { if (m.type() === 'error' && /Content Security Policy/.test(m.text())) csp.push(`${path}: ${m.text()}`); });
  page.on('pageerror', (e) => csp.push(`${path}: ${e.message}`));
  await page.goto(base + path);
  return page;
}
const visibleTitles = (page: Page) => page.locator('.bookcase [data-volume]:visible .volume__title').allInnerTexts();
const PAGES = ['/skills', '/skills/guide', '/skills/shelf/learning', '/skills/sidequest', '/skills/interview-quick-answer', '/skills/system-design-prep', '/skills/conceptcast'];

describe('Skills Archive: axe, layout and structure', () => {
  test('axe (WCAG 2.2 A/AA) by day and by lantern, desktop and mobile; no horizontal scroll at 320 px', async () => {
    for (const path of PAGES) {
      for (const [name, opts] of [['desktop', DESKTOP], ['mobile', MOBILE]] as const) {
        for (const colorScheme of ['light', 'dark'] as const) {
          const page = await open(path, { ...opts, colorScheme });
          const { violations } = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']).analyze();
          assert.deepEqual(violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).slice(0, 3).join(', ')}`), [], `${path} ${name} ${colorScheme}`);
          if (path === '/skills' || path === '/skills/sidequest') await page.screenshot({ path: join(shots, `skills${path.replace(/\//g, '-')}-${name}-${colorScheme}.png`), fullPage: true });
          await page.context().close();
        }
      }
      const narrow = await open(path, { viewport: { width: 320, height: 640 } });
      assert.ok(await narrow.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${path} scrolls sideways at 320 px`);
      await narrow.context().close();
    }
  });

  test('every page: one h1, one main, a skip link to it, headings that never skip a level', async () => {
    for (const path of PAGES) {
      const page = await open(path);
      const r = await page.evaluate(() => ({
        h1: document.querySelectorAll('h1').length,
        main: document.querySelectorAll('main').length,
        skip: document.querySelector<HTMLAnchorElement>('a.skip')?.getAttribute('href'),
        levels: [...document.querySelectorAll('h1,h2,h3,h4,h5,h6')].map((h) => Number(h.tagName[1])),
      }));
      assert.equal(r.h1, 1, path); assert.equal(r.main, 1, path); assert.equal(r.skip, '#main', path);
      r.levels.forEach((l, i) => { if (i > 0) assert.ok(l <= r.levels[i - 1]! + 1, `${path}: h${r.levels[i - 1]} then h${l}`); });
      await page.context().close();
    }
  });
});

describe('Skills Archive: accessibility beyond axe (automated; manual rows 17–19 in docs/accessibility.md)', () => {
  test('keyboard: Tab from the top reaches the skip link, the nameplate actions, every volume once in shelf order, then the Beacon', async () => {
    const page = await open('/skills');
    const seen: string[] = [];
    for (let i = 0; i < 80; i++) {
      await page.keyboard.press('Tab');
      const el = await page.evaluate(() => {
        const a = document.activeElement as HTMLElement;
        const r = a.getBoundingClientRect();
        return { text: (a.getAttribute('aria-label') ?? a.textContent ?? '').trim().replace(/\s+/g, ' '), visible: r.width > 0 && r.height > 0, beacon: !!a.closest('.pu-beacon') };
      });
      assert.ok(el.visible, `focus stop ${i} (${el.text}) is invisible`);
      if (el.beacon) break;
      seen.push(el.text);
    }
    assert.equal(seen[0], 'Skip to content');
    assert.ok(seen.indexOf('Enter the archive') < seen.indexOf('Light the lanterns'));
    const order = await page.locator('.bookcase .volume__title a').allInnerTexts();
    // The recent-updates list after the bookcase links some volumes again; their first stops follow shelf order.
    assert.deepEqual([...new Set(seen.filter((t) => order.includes(t)))], order, 'every volume, in shelf order');
  });

  test('a long source file is a focusable, labelled region; the copy announcement is a polite status', async () => {
    const page = await open('/skills/sidequest');
    const region = page.getByRole('region', { name: 'SKILL.md, original text' });
    assert.equal(await region.getAttribute('tabindex'), '0');
    assert.equal(await page.locator('[data-toast]').getAttribute('role'), 'status');
    assert.equal(await page.locator('[data-toast]').getAttribute('aria-live'), 'polite');
    await page.context().close();
  });

  test('text spacing (WCAG 1.4.12) loses nothing sideways; forced colours keep the focus outline', async () => {
    for (const path of ['/skills', '/skills/sidequest']) {
      const page = await open(path, MOBILE);
      // Through the CSSOM: the CSP rightly blocks an injected <style>.
      await page.evaluate(() => {
        for (const el of document.querySelectorAll<HTMLElement>('body *')) { el.style.lineHeight = '1.5'; el.style.letterSpacing = '0.12em'; el.style.wordSpacing = '0.16em'; }
        for (const p of document.querySelectorAll<HTMLElement>('p')) p.style.marginBottom = '2em';
      });
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${path} scrolls sideways with WCAG text spacing`);
      await page.context().close();
      const forced = await open(path, { ...DESKTOP, forcedColors: 'active' });
      await forced.locator('main a').first().focus();
      assert.notEqual(await forced.evaluate(() => getComputedStyle(document.activeElement!).outlineStyle), 'none', path);
      await forced.context().close();
    }
  });
});

describe('Skills Archive: copy and download', () => {
  test('Copy SKILL.md puts the exact original on the clipboard (every line break and character)', async () => {
    for (const slug of ['sidequest', 'conceptcast', 'interview-quick-answer']) {
      const page = await open(`/skills/${slug}`);
      await page.context().grantPermissions(['clipboard-read', 'clipboard-write'], { origin: base });
      await page.getByRole('button', { name: 'Copy SKILL.md' }).first().click();
      await assert.doesNotReject(page.locator('[data-toast].is-shown').waitFor());
      assert.match(await page.locator('[data-toast]').innerText(), /^Copied SKILL\.md: \d+ lines, exactly as written\.$/);
      const copied = await page.evaluate(() => navigator.clipboard.readText());
      assert.equal(sha256(copied), manifest.skills[slug]!.files.find((f) => f.path === 'SKILL.md')!.sha256, slug);
      await page.context().close();
    }
  });

  test('copying a supporting file, one section, and the example invocation', async () => {
    const page = await open('/skills/sidequest');
    await page.context().grantPermissions(['clipboard-read', 'clipboard-write'], { origin: base });
    const read = () => page.evaluate(() => navigator.clipboard.readText());
    await page.locator('details.source > summary').filter({ has: page.locator('code', { hasText: /^scripts\/quest\.py$/ }) }).click();
    await page.getByRole('button', { name: 'Copy quest.py' }).click();
    assert.equal(await read(), original('sidequest', 'scripts/quest.py'));
    await page.getByRole('button', { name: 'Frontmatter' }).click();
    const text = original('sidequest', 'SKILL.md');
    assert.equal(await read(), text.slice(0, text.indexOf('\n---\n', 4) + 5));
    await page.getByRole('button', { name: 'Copy invocation' }).click();
    assert.equal(await read(), '/sidequest');
    await page.locator('details.more > summary', { hasText: 'Step by step' }).click();
    await page.getByRole('button', { name: 'Copy this line' }).click();
    assert.match(await read(), /^description: '[^'\n]{1,200}'$/);
    await page.context().close();
  });

  test('without clipboard permission, copy says so and selects the text instead', async () => {
    const page = await open('/skills/deep-dive-audio');
    await page.evaluate(() => { Object.defineProperty(navigator, 'clipboard', { value: { writeText: () => Promise.reject(new Error('denied')) } }); });
    await page.getByRole('button', { name: 'Copy SKILL.md' }).first().click();
    assert.match(await page.locator('[data-toast]').innerText(), /Could not reach the clipboard\. The text is selected/);
    // A browser's selection text drops the final newline; the clipboard path above is the exact one.
    assert.equal(await page.evaluate(() => getSelection()?.toString()), original('deep-dive-audio', 'SKILL.md').replace(/\n$/, ''));
    await page.context().close();
  });

  test('Download SKILL.md and Download the whole skill give the original bytes and the folder structure', async () => {
    const page = await open('/skills/sidequest');
    const [file] = await Promise.all([page.waitForEvent('download'), page.getByRole('link', { name: 'Download SKILL.md' }).first().click()]);
    assert.equal(file.suggestedFilename(), 'SKILL.md');
    assert.equal(sha256(readFileSync((await file.path())!)), manifest.skills.sidequest!.files[0]!.sha256);
    const [pkg] = await Promise.all([page.waitForEvent('download'), page.getByRole('link', { name: /Download the whole skill/ }).click()]);
    assert.equal(pkg.suggestedFilename(), 'sidequest.zip');
    const zipPath = (await pkg.path())!;
    if (spawnSync('unzip', ['-v']).status === 0) {
      assert.deepEqual(spawnSync('unzip', ['-Z1', zipPath], { encoding: 'utf8' }).stdout.trim().split('\n').sort(), ['sidequest/SKILL.md', 'sidequest/config.json', 'sidequest/scripts/quest.py']);
    }
    await page.context().close();
  });

  test('the header jump and collapsible blocks: closed by default, open on demand, reachable by keyboard', async () => {
    const page = await open('/skills/conceptcast');
    await page.getByRole('link', { name: 'Source & downloads' }).click();
    await page.waitForURL(/#source$/);
    for (const name of ['Design notes', 'Step by step']) {
      const block = page.locator('details.more', { hasText: name });
      assert.equal(await block.evaluate((d) => (d as HTMLDetailsElement).open), false, name);
      await block.locator('summary').focus();
      await page.keyboard.press('Enter');
      assert.equal(await block.evaluate((d) => (d as HTMLDetailsElement).open), true, name);
    }
    await page.context().close();
  });

  test('a file edited for publication says so, and Copy gives the published text', async () => {
    const page = await open('/skills/interview-quick-answer');
    await page.context().grantPermissions(['clipboard-read', 'clipboard-write'], { origin: base });
    assert.match(await page.locator('.source__note').first().innerText(), /^Edited for publication\. Line 132 was reworded/);
    assert.ok(await page.getByRole('region', { name: 'SKILL.md, copy edited for publication' }).isVisible());
    await page.getByRole('button', { name: 'Copy SKILL.md' }).first().click();
    const copied = await page.evaluate(() => navigator.clipboard.readText());
    assert.equal(copied, original('interview-quick-answer', 'SKILL.md'));
    assert.match(copied, /^Questions may be dictated\. Read terms/m);
    await page.context().close();
  });
});

describe('Skills Archive: discovery and interaction', () => {
  test('search filters by name, words in the purpose, shelf and tags; empty results say so; the URL keeps the query', async () => {
    const page = await open('/skills');
    const box = page.getByRole('searchbox', { name: 'Search the archive' });
    await box.fill('audio');
    assert.deepEqual(await visibleTitles(page), ['Deep Dive Audio']);
    assert.match(await page.locator('[data-finder-count]').innerText(), /^1 volume matches “audio”$/);
    await box.fill('podcast');
    assert.deepEqual((await visibleTitles(page)).sort(), ['ConceptCast']);
    await box.fill('personal exploration');
    assert.deepEqual((await visibleTitles(page)).sort(), ['Side Quest']);
    assert.match(page.url(), /\?q=personal\+exploration$/);
    await box.fill('zzzz nothing');
    assert.deepEqual(await visibleTitles(page), []);
    assert.ok(await page.locator('[data-finder-empty]').isVisible());
    await box.fill('');
    assert.equal((await visibleTitles(page)).length, 5);
    await page.goto(`${base}/skills?q=interview`);
    assert.deepEqual((await visibleTitles(page)).sort(), ['Interview Quick Answer', 'System Design Prep']);
    await page.context().close();
  });

  test('keyboard: "/" focuses search; Enter on a volume title opens it; the focus ring is the platform\'s', async () => {
    const page = await open('/skills');
    await page.keyboard.press('/');
    assert.equal(await page.evaluate(() => document.activeElement?.id), 'finder-q');
    await page.locator('.volume__title a').first().focus();
    const ring = await page.evaluate(() => getComputedStyle(document.activeElement!).outlineStyle);
    assert.equal(ring, 'solid');
    const title = await page.evaluate(() => document.activeElement!.textContent);
    await page.keyboard.press('Enter');
    await page.waitForURL(/\/skills\/[a-z-]+$/);
    assert.equal(await page.locator('h1').innerText(), title);
    await page.context().close();
  });

  test('the lanterns switch day and night, are announced as a toggle, and are remembered', async () => {
    const page = await open('/skills', { ...DESKTOP, colorScheme: 'light' });
    const lantern = page.getByRole('button', { name: 'Light the lanterns' });
    assert.equal(await lantern.getAttribute('aria-pressed'), 'false');
    await lantern.click();
    assert.equal(await page.evaluate(() => document.documentElement.dataset.theme), 'night');
    assert.equal(await page.getByRole('button', { name: 'Let in the daylight' }).getAttribute('aria-pressed'), 'true');
    const bg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
    await page.reload();
    assert.equal(await page.evaluate(() => getComputedStyle(document.body).backgroundColor), bg);
    await page.context().close();
  });

  test('reduced motion: no drifting dust, breathing light or parallax', async () => {
    const page = await open('/skills', { ...DESKTOP, reducedMotion: 'reduce' });
    const anim = await page.evaluate(() => [...document.querySelectorAll('.sc-dust circle, .sc-shaft, .sc-owl-lids ellipse')].map((e) => getComputedStyle(e).animationName));
    assert.ok(anim.length > 0 && anim.every((a) => a === 'none'), anim.join());
    await page.mouse.move(100, 100);
    await page.mouse.move(900, 500);
    assert.equal(await page.evaluate(() => document.querySelector<SVGElement>('[data-scene]')!.style.getPropertyValue('--px')), '');
    await page.context().close();
  });

  test('without JavaScript every volume, link and download is there; controls that need a script stay hidden', async () => {
    const page = await open('/skills', { ...DESKTOP, javaScriptEnabled: false });
    assert.equal(await page.locator('.bookcase [data-volume]').count(), 5);
    assert.equal(await page.locator('[data-finder]').isVisible(), false);
    assert.equal(await page.getByRole('button', { name: 'Light the lanterns' }).count(), 0);
    await page.goto(`${base}/skills/sidequest`);
    assert.equal(await page.getByRole('button', { name: /^Copy/ }).count(), 0);
    assert.ok(await page.getByRole('link', { name: /Download the whole skill/ }).isVisible());
    await page.context().close();
  });

  test('related volumes and shelves link to built pages; back-to-library links work', async () => {
    const page = await open('/skills/conceptcast');
    const hrefs = await page.locator('main a[href^="/skills"]').evaluateAll((as) => as.map((a) => a.getAttribute('href')!));
    for (const href of new Set(hrefs)) {
      const res = await page.request.get(base + href.split('#')[0]!);
      assert.equal(res.status(), 200, href);
    }
    await page.getByRole('link', { name: 'Back to the stacks' }).click();
    await page.waitForURL(/\/skills#stacks$/);
    await page.context().close();
  });

  test('no page loaded here violated its Content Security Policy or threw', () => {
    assert.deepEqual(csp, []);
  });
});
