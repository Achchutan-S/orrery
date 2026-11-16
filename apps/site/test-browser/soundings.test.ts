// Soundings in a real browser (preview build; it is a draft until released): axe in every state
// it can be in, a keyboard-only journey from one sentence to a released letter, persistence
// across reloads and a tab closed mid-sentence, the letter page against hostile links, and no
// CSP violations or script errors anywhere. The canvas is drawn by software here: this proves
// what the page does, not how it feels. Screenshots land in apps/site/test-results/soundings-*.png.
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { after, before, describe, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import AxeBuilder from '@axe-core/playwright';
import { preview } from 'astro';
import { chromium, type Browser, type BrowserContextOptions, type Page } from 'playwright';
import { encodeLetter } from '../src/experiences/soundings/model.ts';

const root = fileURLToPath(new URL('../', import.meta.url));
const shots = join(root, 'test-results');
const tmp = mkdtempSync(join(tmpdir(), 'pu-soundings-browser-'));
const PATH = '/soundings';
const DESKTOP = { viewport: { width: 1280, height: 800 } } satisfies BrowserContextOptions;
const MOBILE = { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true } satisfies BrowserContextOptions;
const DAY = 86_400_000;

let browser: Browser;
let server: Awaited<ReturnType<typeof preview>>;
let base = '';
const problems: string[] = [];

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

/** A fresh browser profile (an empty chart) on the chart page, ready to use. */
async function open(opts: BrowserContextOptions = DESKTOP, path = PATH): Promise<Page> {
  const page = await (await browser.newContext(opts)).newPage();
  page.on('console', (m) => { if (m.type() === 'error') problems.push(m.text()); });
  page.on('pageerror', (e) => problems.push(`pageerror: ${e.message}`));
  await page.goto(base + path);
  if (path === PATH) await ready(page);
  return page;
}
const ready = async (page: Page) => { await page.locator('.s-chart .s-drifts, .s-log, .s-ashore').first().waitFor({ state: 'attached' }); };
const marks = (page: Page) => page.locator('.s-mark');
const capture = async (page: Page, ...texts: string[]) => {
  for (const t of texts) {
    const n = await marks(page).count();
    await page.locator('#s-capture').fill(t);
    await page.locator('#s-capture').press('Enter');
    await assert.doesNotReject(page.waitForFunction((k) => document.querySelectorAll('.s-mark').length === k + 1, n));
  }
};
const axe = async (page: Page, where: string) => {
  const { violations } = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice']).analyze();
  assert.deepEqual(violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).slice(0, 3).join(', ')}`), [], where);
};
const overflow = (page: Page) => page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
const focused = (page: Page) => page.evaluate(() => { const e = document.activeElement; return `${e?.tagName.toLowerCase()}.${e?.className}#${e?.id}`; });
const close = (page: Page) => page.context().close();

describe('Soundings: accessibility in every state', () => {
  for (const [name, opts] of [['desktop', DESKTOP], ['mobile', MOBILE]] as const) {
    for (const colorScheme of ['light', 'dark'] as const) {
      test(`axe, ${name}, ${colorScheme}: chart with a note open, a heading offered, the log, the writing page, the drawing pad, the release dialog`, async () => {
        const page = await open({ ...opts, colorScheme });
        await capture(page, 'Maps are arguments about what matters', 'Why do rivers meander?', 'https://example.org/exactitude on a map as large as the land');
        await page.getByRole('button', { name: /Give me a heading/ }).click();
        await page.getByRole('button', { name: /^Thought: Maps are arguments/ }).click();
        await page.getByRole('button', { name: 'Connect', exact: true }).click();
        await axe(page, 'chart, note, connect list, heading');
        assert.ok(await overflow(page) <= 0);
        await page.screenshot({ path: join(shots, `soundings-${name}-${colorScheme}-chart.png`) });

        await page.getByRole('button', { name: 'Write at length' }).click();
        await page.locator('.s-body').fill('# A heading\n\nA paragraph of writing.\n\n> a quotation\n\n- one\n- two');
        await axe(page, 'writing');
        await page.screenshot({ path: join(shots, `soundings-${name}-${colorScheme}-writing.png`) });
        await page.getByRole('button', { name: 'Read', exact: true }).click();
        await axe(page, 'reading');

        await page.getByRole('button', { name: 'Draw', exact: true }).click();
        const pad = (await page.locator('.s-pad').boundingBox())!;
        await page.mouse.move(pad.x + 40, pad.y + 40);
        await page.mouse.down();
        await page.mouse.move(pad.x + 160, pad.y + 120, { steps: 6 });
        await page.mouse.up();
        await axe(page, 'drawing pad');
        await page.getByRole('button', { name: 'Done' }).click();

        await page.getByRole('button', { name: 'Release', exact: true }).click();
        await axe(page, 'release, before');
        await page.getByRole('button', { name: 'Make the link' }).click();
        await page.waitForFunction(() => (document.querySelector('#s-release-link') as HTMLTextAreaElement | null)?.value.includes('#'));
        await axe(page, 'release, after');
        await page.screenshot({ path: join(shots, `soundings-${name}-${colorScheme}-release.png`) });
        await page.getByRole('button', { name: 'Done' }).click();

        await page.getByRole('button', { name: 'Back to the chart' }).click();
        await page.getByRole('button', { name: 'Log', exact: true }).click();
        await axe(page, 'log');
        assert.ok(await overflow(page) <= 0);
        await page.screenshot({ path: join(shots, `soundings-${name}-${colorScheme}-log.png`) });
        await close(page);
      });
    }
  }

  test('no sideways scroll at 320 px with marks, a note, the writing page and the log; every control at least 44 px on touch', async () => {
    const page = await open({ viewport: { width: 320, height: 640 }, isMobile: true, hasTouch: true });
    await capture(page, 'A thought with a fairly long first line that has to wrap somewhere', 'Why?');
    await marks(page).first().click();
    assert.ok(await overflow(page) <= 0, 'chart and note');
    const small = await page.evaluate(() => [...document.querySelectorAll('main button, main a, main input, main textarea')]
      .filter((e) => (e as HTMLElement).offsetParent !== null && !e.closest('.s-vh, .s-vh-until-focus'))
      .map((e) => ({ r: e.getBoundingClientRect(), name: (e.textContent || e.getAttribute('aria-label') || e.id).slice(0, 30) }))
      .filter((e) => e.r.width < 44 || e.r.height < 43.5).map((e) => `${e.name} ${Math.round(e.r.width)}x${Math.round(e.r.height)}`));
    assert.deepEqual(small, [], 'touch targets');
    await page.getByRole('button', { name: 'Write at length' }).click();
    await page.locator('.s-body').fill('word '.repeat(120));
    assert.ok(await overflow(page) <= 0, 'writing');
    await page.getByRole('button', { name: 'Back to the chart' }).click();
    await page.getByRole('button', { name: 'Log', exact: true }).click();
    assert.ok(await overflow(page) <= 0, 'log');
    await close(page);
  });

  test('without JavaScript the page says what Soundings is and why it needs scripts; the letter page says the same of itself', async () => {
    const ctx = await browser.newContext({ ...DESKTOP, javaScriptEnabled: false });
    const page = await ctx.newPage();
    await page.goto(base + PATH);
    assert.equal(await page.getByRole('heading', { level: 1 }).textContent(), 'Soundings');
    assert.match((await page.locator('main').textContent())!, /sea chart of your own thinking[\s\S]*needs JavaScript[\s\S]*Nothing you write here is sent anywhere/);
    await page.goto(`${base}${PATH}/letter`);
    assert.match((await page.locator('main').textContent())!, /unfolding it needs JavaScript/);
    await ctx.close();
  });
});

describe('Soundings: from one sentence to a released letter, by keyboard alone', () => {
  test('type, travel, connect, write, release', async () => {
    const page = await open();
    // An empty chart has a caret waiting in the water.
    assert.match(await focused(page), /^textarea\./);
    await page.keyboard.type('Maps are arguments about what matters');
    await page.keyboard.press('Enter');
    await marks(page).first().waitFor();
    // Typing with nothing in focus goes to the capture line.
    await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
    await page.keyboard.type('Why do rivers meander?');
    assert.equal(await focused(page), 'input.#s-capture');
    await page.keyboard.press('Enter');
    await page.keyboard.type('Every map leaves something out');
    await page.keyboard.press('Enter');
    assert.equal(await marks(page).count(), 3);
    assert.equal(await page.locator('.s-mark--question').count(), 1, 'the question mark made it a question');

    // Tab reaches the marks; arrows travel between them by direction; Alt and an arrow nudges one.
    await marks(page).first().focus();
    const start = (await marks(page).first().boundingBox())!;
    await page.keyboard.press('Alt+ArrowRight');
    await page.waitForTimeout(450);
    assert.ok(Math.abs((await marks(page).first().boundingBox())!.x - start.x - 24) < 2, 'nudged by 24 units');
    for (const key of ['ArrowUp', 'ArrowRight', 'ArrowDown', 'ArrowLeft']) await page.keyboard.press(key);
    assert.match(await focused(page), /^button\.s-mark/, 'arrows keep focus among the marks');

    // Enter opens the note and moves focus into it; Escape closes it and gives focus back.
    await marks(page).first().focus();
    await page.keyboard.press('Enter');
    assert.match(await focused(page), /^aside\.s-panel/);
    await page.keyboard.press('Escape');
    assert.match(await focused(page), /^button\.s-mark/);
    await page.keyboard.press('Enter');

    // Connect, from the list.
    await page.getByRole('button', { name: 'Connect', exact: true }).focus();
    await page.keyboard.press('Enter');
    await page.locator('#s-connect-find').focus();
    await page.keyboard.type('leaves');
    await page.keyboard.press('Tab');
    assert.equal(await page.evaluate(() => document.activeElement?.textContent), 'Every map leaves something out');
    await page.keyboard.press('Enter');
    assert.match((await marks(page).first().getAttribute('aria-label'))!, /1 route/);
    assert.equal(await page.getByRole('heading', { name: 'Routes from here' }).count(), 1);

    // Write at length; Escape comes back; the land is larger and the name is upright.
    await page.getByRole('button', { name: 'Write at length' }).focus();
    await page.keyboard.press('Enter');
    assert.match(await focused(page), /^textarea\.s-body/);
    await page.keyboard.type('A map is never the territory. ');
    await page.getByRole('button', { name: /^Quote/ }).focus();
    await page.keyboard.press('Enter');
    assert.match(await page.locator('.s-body').inputValue(), /^A map is never the territory\.\s+> Every map leaves something out\n\n$/);
    assert.match(await focused(page), /^textarea\.s-body/, 'quoting returns to the page');
    await page.keyboard.press('ControlOrMeta+z');
    assert.equal((await page.locator('.s-body').inputValue()).includes('>'), false, 'the browser\'s own undo takes the quotation back');
    await page.getByRole('status').filter({ hasText: 'Saved in this browser' }).waitFor();
    await page.keyboard.press('Escape');
    await page.locator('.s-mark.is-written').waitFor();
    assert.match((await page.locator('.s-mark.is-written').getAttribute('aria-label'))!, /6 words/);

    // Release.
    await page.getByRole('button', { name: 'Release', exact: true }).focus();
    await page.keyboard.press('Enter');
    await page.getByRole('button', { name: 'Make the link' }).focus();
    await page.keyboard.press('Enter');
    await page.waitForFunction(() => (document.querySelector('#s-release-link') as HTMLTextAreaElement | null)?.value.includes('#1.'));
    const link = await page.locator('#s-release-link').inputValue();
    await page.keyboard.press('Escape');
    assert.match((await page.locator('.s-mark.is-written').getAttribute('aria-label'))!, /Released/);

    const letter = await open(DESKTOP, link.slice(base.length));
    await letter.getByRole('heading', { level: 1, name: 'Maps are arguments about what matters' }).waitFor();
    assert.match((await letter.locator('.s-reading').textContent())!, /A map is never the territory/);
    assert.match(await letter.title(), /Maps are arguments.*letter from Soundings/);
    await axe(letter, 'letter');
    await letter.screenshot({ path: join(shots, 'soundings-letter.png') });
    await close(letter);
    await close(page);
  });

  test('the compass makes a heading from the chart; keeping it adds a question joined to what it came from', async () => {
    const page = await open();
    await capture(page, 'Maps are arguments', 'Rivers meander');
    let kept = false;
    for (let i = 0; i < 12 && !kept; i += 1) {
      await page.getByRole('button', { name: i ? 'Another' : /Give me a heading/ }).click();
      const text = (await page.locator('.s-slip p').textContent())!;
      if (!/Maps are arguments|Rivers meander/.test(text)) continue;
      assert.match(await focused(page), /^aside\.s-slip/, 'the heading has focus, so it is read out');
      await page.getByRole('button', { name: 'Keep it' }).click();
      kept = true;
      assert.equal(await page.locator('.s-mark--question').count(), 1);
      assert.match((await page.locator('.s-mark--question').getAttribute('aria-label'))!, /[12] routes?/);
      assert.equal(await page.locator('.s-panel-text').inputValue(), text);
    }
    assert.ok(kept, 'a heading drawn from the marks came up within twelve turns');
    await close(page);
  });

  test('a question adrift becomes the visitor\'s own when chosen, and does not come back that day', async () => {
    const page = await open();
    const adrift = page.locator('.s-drift button');
    const n = await adrift.count();
    assert.equal(n, 5);
    const text = (await adrift.first().textContent())!;
    await adrift.first().click();
    assert.equal(await page.locator('.s-panel-text').inputValue(), text);
    await page.reload();
    await ready(page);
    await marks(page).first().waitFor();
    assert.equal(await page.locator('.s-drift button', { hasText: text }).count(), 0);
    await close(page);
  });

  test('drawing: strokes, undo, a thumbnail on the chart; a drawing left empty leaves nothing behind', async () => {
    const page = await open();
    await page.getByRole('button', { name: 'Draw', exact: true }).click();
    await page.getByRole('button', { name: 'Done' }).click();
    await page.locator('.s-sketch').waitFor({ state: 'detached' });
    assert.equal(await marks(page).count(), 0, 'an empty drawing is not kept');
    await page.getByRole('button', { name: 'Draw', exact: true }).click();
    const pad = (await page.locator('.s-pad').boundingBox())!;
    for (const [x, y] of [[60, 60], [200, 260]] as const) {
      await page.mouse.move(pad.x + x, pad.y + y);
      await page.mouse.down();
      await page.mouse.move(pad.x + x + 150, pad.y + y + 60, { steps: 8 });
      await page.mouse.up();
    }
    assert.equal(await page.locator('.s-pad polyline').count(), 2);
    await page.getByRole('button', { name: 'Undo stroke' }).click();
    assert.equal(await page.locator('.s-pad polyline').count(), 1);
    await page.keyboard.press('Escape');
    await page.locator('.s-sketch').waitFor({ state: 'detached' });
    assert.match((await marks(page).first().getAttribute('aria-label'))!, /A drawing\. Has a drawing/);
    assert.equal(await page.locator('.s-mark .s-thumb polyline').count(), 1);
    await close(page);
  });
});

describe('Soundings: nothing is lost', () => {
  test('marks, routes, positions and the view survive a reload; a tab closed mid-sentence keeps the sentence and offers to continue', async () => {
    const page = await open();
    await capture(page, 'First', 'Second');
    await marks(page).first().click();
    await page.getByRole('button', { name: 'Connect', exact: true }).click();
    await marks(page).nth(1).click();
    await page.getByRole('button', { name: 'Close', exact: true }).click();
    const box = (await marks(page).first().boundingBox())!;
    await page.mouse.move(box.x + 22, box.y + 22);
    await page.mouse.down();
    await page.mouse.move(box.x + 142, box.y + 92, { steps: 6 });
    await page.mouse.up();
    assert.equal(await page.locator('.s-panel').count(), 0, 'a drag is not a click');
    const moved = (await marks(page).first().boundingBox())!;
    assert.ok(Math.abs(moved.x - box.x - 120) < 3 && Math.abs(moved.y - box.y - 70) < 3);
    // Where the first mark is relative to the second: the same before and after, whatever the view.
    const apart = async () => { const [a, b] = [(await marks(page).first().boundingBox())!, (await marks(page).nth(1).boundingBox())!]; return [a.x - b.x, a.y - b.y] as const; };
    const before = await apart();

    await page.reload();
    await marks(page).first().waitFor();
    assert.equal(await marks(page).count(), 2);
    assert.match((await marks(page).first().getAttribute('aria-label'))!, /1 route/);
    const now = await apart();
    assert.ok(Math.abs(now[0] - before[0]) < 3 && Math.abs(now[1] - before[1]) < 3, `the place it was dragged to (${before} then ${now})`);

    await marks(page).first().click();
    await page.getByRole('button', { name: 'Write at length' }).click();
    await page.locator('.s-body').pressSequentially('typed and then the tab went away');
    await page.reload(); // inside the save delay
    await page.getByText('You were writing “First”.').waitFor();
    await page.getByRole('button', { name: 'Continue', exact: true }).click();
    assert.equal(await page.locator('.s-body').inputValue(), 'typed and then the tab went away');

    // The next session keeps the earlier version when the writing changes.
    await page.locator('.s-body').fill('rewritten');
    await page.getByRole('status').filter({ hasText: 'Saved in this browser' }).waitFor();
    await page.getByRole('button', { name: 'Back to the chart' }).click();
    await page.getByRole('button', { name: 'Continue writing' }).click();
    await page.locator('.s-body').fill('rewritten again');
    await page.getByRole('button', { name: /Bring back/ }).last().click();
    assert.equal(await page.locator('.s-body').inputValue(), 'typed and then the tab went away');
    await close(page);
  });

  test('remove can be undone, with its routes', async () => {
    const page = await open();
    await capture(page, 'First', 'Second');
    await marks(page).first().click();
    await page.getByRole('button', { name: 'Connect', exact: true }).click();
    await marks(page).nth(1).click();
    await marks(page).first().click();
    await page.getByRole('button', { name: 'Remove' }).click();
    assert.equal(await marks(page).count(), 1);
    await page.getByRole('button', { name: 'Undo' }).click();
    assert.equal(await marks(page).count(), 2);
    assert.match((await page.getByRole('button', { name: /^Thought: First/ }).getAttribute('aria-label'))!, /1 route/);
    await close(page);
  });

  test('the log finds and filters; a copy goes out and comes back in; the tide and an echo appear once there is a past', async () => {
    const page = await open({ ...DESKTOP, acceptDownloads: true });
    await capture(page, 'Coastlines and how to measure them', 'Why is bread salted?');
    await page.getByRole('button', { name: 'Log', exact: true }).click();
    await page.locator('#s-find').fill('bread');
    assert.equal(await page.locator('.s-entry').count(), 1);
    await page.locator('#s-find').fill('zzz');
    assert.match((await page.locator('.s-log [role=status]').textContent())!, /Nothing matches/);
    await page.locator('#s-find').fill('');
    await page.getByRole('button', { name: 'Questions' }).click();
    assert.equal(await page.locator('.s-entry').count(), 1);
    await page.getByRole('button', { name: 'Everything' }).click();

    const [download] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Keep a copy' }).click()]);
    assert.match(download.suggestedFilename(), /^soundings-\d{4}-\d\d-\d\d\.json$/);
    const file = join(tmp, 'copy.json');
    await download.saveAs(file);
    const copy = JSON.parse(readFileSync(file, 'utf8')) as { marks: Record<string, unknown>[] };
    assert.equal(copy.marks.length, 2);
    const then = Date.now() - 40 * DAY;
    copy.marks.push({ id: 'old', kind: 'thought', text: 'Measuring a coastline twice gives two answers', body: '', x: 380, y: -260, createdAt: then, updatedAt: then });
    writeFileSync(file, JSON.stringify(copy));
    await page.locator('input[type=file]').setInputFiles(file);
    await page.getByText('Brought in 1 mark.').waitFor();
    writeFileSync(file, '{"not":"a copy"}');
    await page.locator('input[type=file]').setInputFiles(file);
    await page.getByText('That file is not a Soundings copy.').waitFor();
    assert.equal(await page.locator('.s-entry').count(), 3, 'a bad file changes nothing');

    await page.getByRole('button', { name: 'Chart', exact: true }).click();
    await page.locator('#s-tide').fill('0');
    await page.waitForFunction(() => document.querySelectorAll('.s-mark').length === 1);
    assert.match((await page.locator('.s-tide label').textContent())!, /^As it was on /);
    await page.locator('#s-tide').fill('1000');
    await page.waitForFunction(() => document.querySelectorAll('.s-mark').length === 3);

    await page.reload();
    await page.getByText(/^From 6 weeks ago: “Measuring a coastline twice/).waitFor();
    await page.getByRole('button', { name: 'Go to it' }).click();
    assert.equal(await page.locator('.s-panel-text').inputValue(), 'Measuring a coastline twice gives two answers');
    await close(page);
  });
});

describe('Soundings: the letter page treats its link as a stranger\'s', () => {
  test('markup in a letter is shown as text; a non-web address is not linked; a broken link shows the page as served', async () => {
    const hostile = await encodeLetter({ v: 1, t: '<img src=x onerror=alert(1)>', b: '<script>alert(1)</script>\n\njavascript:alert(1) and https://example.org/ok', d: Date.now() });
    const page = await open(DESKTOP, `${PATH}/letter#${hostile}`);
    await page.getByRole('heading', { level: 1, name: '<img src=x onerror=alert(1)>' }).waitFor();
    assert.equal(await page.locator('.s-reading img, .s-reading script').count(), 0);
    assert.deepEqual(await page.locator('.s-reading a').evaluateAll((as) => as.map((a) => a.getAttribute('href'))), ['https://example.org/ok']);
    await close(page);

    for (const bad of ['', '#1.garbage', '#0.e30', '#nonsense']) {
      const broken = await open(DESKTOP, `${PATH}/letter${bad}`);
      await broken.waitForTimeout(300);
      assert.equal(await broken.getByRole('heading', { level: 1 }).textContent(), 'A letter from Soundings', bad);
      assert.equal(await broken.locator('[data-letter-empty]').count(), 1, bad);
      await close(broken);
    }
  });
});

describe('Soundings: clean', () => {
  test('no script errors and no CSP violations in any test above', () => {
    assert.deepEqual(problems, []);
  });
});
