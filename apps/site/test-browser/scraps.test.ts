// Scraps in a real browser (preview build; it is a draft until released): axe in every state it
// can be in, a keyboard-only journey from one sentence to a sent letter, piles made by dragging
// and without dragging, persistence across reloads and a tab closed mid-sentence, the letter page
// against hostile links, and no CSP violations or script errors anywhere. This proves what the
// page does, not how it feels. Screenshots land in apps/site/test-results/scraps-*.png.
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
import { encodeLetter, letterOf, type Scrap } from '../src/experiences/scraps/model.ts';

const root = fileURLToPath(new URL('../', import.meta.url));
const shots = join(root, 'test-results');
const tmp = mkdtempSync(join(tmpdir(), 'pu-scraps-browser-'));
const PATH = '/scraps';
const HELLO = /^Hello\. Nothing here has to be finished\./;
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

/** A fresh browser profile (a first visit) on the table, ready to use. */
async function open(opts: BrowserContextOptions = DESKTOP, path = PATH): Promise<Page> {
  const page = await (await browser.newContext(opts)).newPage();
  page.on('console', (m) => { if (m.type() === 'error') problems.push(m.text()); });
  page.on('pageerror', (e) => problems.push(`pageerror: ${e.message}`));
  await page.goto(base + path);
  if (path === PATH) await page.locator('.k-table').waitFor();
  return page;
}
const piles = (page: Page) => page.locator('.k-table .k-scrap');
const pile = (page: Page, name: string | RegExp) => page.locator('.k-table').getByRole('button', { name });
const say = async (page: Page, ...texts: string[]) => {
  for (const t of texts) {
    const n = await page.evaluate(() => document.querySelectorAll('.k-table .k-scrap').length);
    await page.locator('#k-say').fill(t);
    await page.locator('#k-say').press('Enter');
    await page.waitForFunction((k) => document.querySelectorAll('.k-table .k-scrap').length >= Math.min(k + 1, 6), n);
  }
  await page.waitForTimeout(650); // the landing
};
/** Picks a pile up the way a keyboard does: it may be lying partly under another. */
const pickUp = async (page: Page, name: string | RegExp) => { await pile(page, name).focus(); await page.keyboard.press('Enter'); };
const axe = async (page: Page, where: string) => {
  const { violations } = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice']).analyze();
  assert.deepEqual(violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).slice(0, 3).join(', ')}`), [], where);
};
const overflow = (page: Page) => page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
const focused = (page: Page) => page.evaluate(() => { const e = document.activeElement; return `${e?.tagName.toLowerCase()}.${e?.className}#${e?.id}`; });
const close = (page: Page) => page.context().close();
/** What a hand on a mouse does without thinking: it moves, and the writing page's bar comes back. */
const wake = async (page: Page) => { await page.mouse.move(300, 300); await page.mouse.move(340, 330); await page.mouse.move(360, 300); };
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAoAAAAKCAYAAACNMs+9AAAAFUlEQVR42mP8z8BQz0AEYBxVSF+FABJADveWkH6oAAAAAElFTkSuQmCC', 'base64');
const scrapOf = (id: string, text: string, over: Partial<Scrap> = {}): Scrap => ({ id, text, body: '', look: 3, x: 0.5, y: 0.4, rot: 2, createdAt: Date.now(), updatedAt: Date.now(), liftedAt: Date.now(), ...over });
/** Puts scraps straight into a table through "Bring a copy back", as a file would. */
const bring = async (page: Page, items: Scrap[]) => {
  const file = join(tmp, `bring-${Math.random().toString(36).slice(2)}.json`);
  writeFileSync(file, JSON.stringify({ scraps: 1, savedAt: Date.now(), items }));
  await page.getByRole('button', { name: /^the drawer/ }).click();
  await page.locator('input[aria-label="A copy to bring back"]').setInputFiles(file);
  await page.getByText(/^Brought back|already here/).waitFor();
  await page.keyboard.press('Escape');
};

describe('Scraps: accessibility in every state', () => {
  for (const [name, opts] of [['desktop', DESKTOP], ['mobile', MOBILE]] as const) {
    test(`axe, ${name}: the first visit, a full table with a spark, a scrap in the hand in every look, the back, the doodle pad, sending, a pile, the drawer`, async () => {
      const page = await open(opts);
      await axe(page, 'first visit');
      await page.screenshot({ path: join(shots, `scraps-${name}-first.png`) });
      await say(page, 'I still think about that soup', 'tired', 'Why do we whisper in libraries even when nobody is there?');
      await page.getByRole('button', { name: /^Pull a spark/ }).click();
      await page.waitForTimeout(400); // the slip unfolds
      await axe(page, 'table and spark');
      assert.ok(await overflow(page) <= 0);
      await page.screenshot({ path: join(shots, `scraps-${name}-table.png`) });
      await page.getByRole('button', { name: 'Not now' }).click();

      await pickUp(page, /^Why do we whisper/);
      for (let i = 0; i < 5; i += 1) {
        await axe(page, `in the hand, look ${i}`);
        await page.getByRole('button', { name: 'Give it a new look' }).click();
      }
      await page.getByRole('button', { name: 'Give it a gold star' }).click();
      await page.getByRole('button', { name: 'More to do with it' }).click();
      await page.getByRole('button', { name: 'Bigger paper' }).click();
      await page.getByRole('button', { name: 'Tape it to the table' }).click();
      await page.getByRole('button', { name: 'Seal it for later' }).click();
      await axe(page, 'in the hand, more and the seal');
      await page.getByRole('button', { name: 'Change the words' }).click();
      await page.getByRole('button', { name: 'Clip it to another' }).click();
      await axe(page, 'in the hand, clip list');
      await page.screenshot({ path: join(shots, `scraps-${name}-held.png`) });
      await page.locator('.k-choices button').first().click();

      await page.getByRole('button', { name: 'Doodle on it' }).click();
      const pad = (await page.locator('.k-pad').boundingBox())!;
      await page.mouse.move(pad.x + 40, pad.y + 40);
      await page.mouse.down();
      await page.mouse.move(pad.x + 160, pad.y + 120, { steps: 6 });
      await page.mouse.up();
      await axe(page, 'doodle pad');
      await page.getByRole('button', { name: 'Done' }).click();

      await page.getByRole('button', { name: 'Send it to someone' }).click();
      await axe(page, 'send, before');
      await page.getByRole('button', { name: 'Make the link' }).click();
      await page.waitForFunction(() => (document.querySelector('#k-send-link') as HTMLTextAreaElement | null)?.value.includes('#'));
      await axe(page, 'send, after');
      await page.getByRole('button', { name: 'Done' }).click();

      await page.getByRole('button', { name: /^Turn it over/ }).click();
      await page.locator('.k-body').fill('# A heading\n\nA paragraph of writing.\n\n> a quotation\n\n- one\n- two');
      await axe(page, 'the back');
      await page.screenshot({ path: join(shots, `scraps-${name}-back.png`) });
      await wake(page);
      await page.getByRole('button', { name: 'Read it back' }).click();
      await axe(page, 'reading');
      await page.getByRole('button', { name: 'Back to the table' }).click();

      await pickUp(page, /clipped with 1 more/);
      await axe(page, 'a pile spread out');
      await page.screenshot({ path: join(shots, `scraps-${name}-pile.png`) });
      await page.getByRole('button', { name: 'Make a little zine of them' }).click();
      await axe(page, 'a zine, before');
      await page.getByRole('button', { name: 'Make the link' }).click();
      await page.waitForFunction(() => (document.querySelector('#k-send-link') as HTMLTextAreaElement | null)?.value.includes('#'));
      await axe(page, 'a zine, addressed');
      await page.getByRole('button', { name: 'Done' }).click();
      await page.keyboard.press('Escape');
      await say(page, 'for the bin');
      await pickUp(page, /^for the bin/);
      await page.getByRole('button', { name: 'Bin it' }).click();
      await page.getByRole('button', { name: /^Your studio/ }).click();
      await axe(page, 'the studio');
      for (const mat of ['Blue', 'Plum', 'Slate']) {
        await page.getByLabel(mat).check();
        await page.getByRole('button', { name: 'Done' }).click();
        await page.locator('.k-studio').waitFor({ state: 'detached' });
        await axe(page, `the table on a ${mat} mat`);
        await page.getByRole('button', { name: /^Your studio/ }).click();
      }
      await page.screenshot({ path: join(shots, `scraps-${name}-studio.png`) });
      await page.getByRole('button', { name: 'Done' }).click();
      await page.getByRole('button', { name: /^the drawer/ }).click();
      await page.getByRole('button', { name: /^the bin/ }).click();
      await axe(page, 'the drawer, the bin');
      await page.getByRole('button', { name: 'everything' }).click();
      await axe(page, 'the drawer');
      assert.ok(await overflow(page) <= 0);
      await page.screenshot({ path: join(shots, `scraps-${name}-drawer.png`) });
      await close(page);
    });
  }

  test('no sideways scroll at 320 px on the table, in the hand, on the back and in the drawer; every control at least 44 px on touch', async () => {
    const page = await open({ viewport: { width: 320, height: 640 }, isMobile: true, hasTouch: true });
    await say(page, 'A thought with a fairly long first line that has to wrap somewhere sensible', 'Why?');
    const small = () => page.evaluate(() => [...document.querySelectorAll('main button, main a, main input, main textarea')]
      .filter((e) => (e as HTMLElement).offsetParent !== null && !e.closest('.k-vh, .k-vh-until-focus') && (!document.querySelector('dialog[open]') || e.closest('dialog[open]')))
      .map((e) => ({ r: e.getBoundingClientRect(), name: (e.getAttribute('aria-label') || e.textContent || e.id).slice(0, 30) }))
      .filter((e) => e.r.width < 44 || e.r.height < 43.5).map((e) => `${e.name} ${Math.round(e.r.width)}x${Math.round(e.r.height)}`));
    assert.ok(await overflow(page) <= 0, 'table');
    assert.deepEqual(await small(), [], 'touch targets on the table');
    await pickUp(page, /^Why\?/);
    assert.ok(await overflow(page) <= 0, 'in the hand');
    assert.deepEqual(await small(), [], 'touch targets in the hand');
    await page.getByRole('button', { name: /^Turn it over/ }).click();
    await page.locator('.k-body').fill('word '.repeat(120));
    assert.ok(await overflow(page) <= 0, 'the back');
    assert.deepEqual(await small(), [], 'touch targets on the back: on a touch screen the bar stays put');
    await page.getByRole('button', { name: 'Back to the table' }).click();
    await page.getByRole('button', { name: /^the drawer/ }).click();
    assert.ok(await overflow(page) <= 0, 'drawer');
    await close(page);
  });

  test('without JavaScript the page says what Scraps is and why it needs scripts; the letter page says the same of itself', async () => {
    const ctx = await browser.newContext({ ...DESKTOP, javaScriptEnabled: false });
    const page = await ctx.newPage();
    await page.goto(base + PATH);
    assert.equal(await page.getByRole('heading', { level: 1 }).textContent(), 'Scraps');
    assert.match((await page.locator('main').textContent())!, /a table for whatever you have got[\s\S]*needs JavaScript[\s\S]*Nothing you make here is sent anywhere/);
    await page.goto(`${base}${PATH}/letter`);
    assert.match((await page.locator('main').textContent())!, /unfolding it needs JavaScript/);
    await ctx.close();
  });
});

describe('Scraps: from one sentence to a sent letter, by keyboard alone', () => {
  test('a first visit greets with one scrap and a hint; say, pick up, restyle, reword, clip, write, send', async () => {
    const page = await open();
    assert.equal(await piles(page).count(), 1, 'the greeting is already on the table');
    assert.equal(await page.locator('.k-hint').count(), 1);

    // Typing with nothing in focus goes to the strip.
    await page.keyboard.type('I still think about that soup');
    assert.equal(await focused(page), 'input.#k-say');
    await page.keyboard.press('Enter');
    await pile(page, /^I still think/).waitFor();
    assert.equal(await page.locator('.k-hint').count(), 0, 'the hint has done its job');
    await page.getByText('There. That’s one.').waitFor();
    await page.keyboard.type('tired');
    await page.keyboard.press('Enter');
    await pile(page, /^tired/).waitFor();

    // Arrows push a scrap across the table.
    await pile(page, /^tired/).focus();
    const before = (await pile(page, /^tired/).boundingBox())!;
    await page.keyboard.press('ArrowLeft');
    await page.keyboard.press('ArrowLeft');
    await page.waitForTimeout(250);
    assert.ok((await pile(page, /^tired/).boundingBox())!.x < before.x - 20, 'pushed left');

    // Enter picks it up; a new look changes how it is set and nothing else.
    await page.keyboard.press('Enter');
    const face = page.locator('.k-held-scrap .k-face');
    const looks = new Set<string>();
    for (let i = 0; i < 5; i += 1) {
      looks.add((await face.getAttribute('class'))!.match(/look-\d/)![0]);
      await page.getByRole('button', { name: 'Give it a new look' }).focus();
      await page.keyboard.press('Enter');
    }
    assert.equal(looks.size, 5, 'five different compositions');
    assert.equal(await face.locator('.k-words').textContent(), 'tired');

    await page.getByRole('button', { name: 'Change the words' }).focus();
    await page.keyboard.press('Enter');
    await page.locator('#k-words').fill('tired, but in a good way');
    assert.equal(await face.locator('.k-words').textContent(), 'tired, but in a good way');

    // Clip without dragging.
    await page.getByRole('button', { name: 'Clip it to another' }).focus();
    await page.keyboard.press('Enter');
    await page.locator('#k-clip-find').fill('soup');
    await page.keyboard.press('Tab');
    assert.equal(await page.evaluate(() => document.activeElement?.textContent), 'I still think about that soup');
    await page.keyboard.press('Enter');
    await page.getByText('clipped with 1 more').first().waitFor();

    // Turn it over, write, quote what is on the same clip, undo, come back.
    await page.getByRole('button', { name: /^Turn it over/ }).focus();
    await page.keyboard.press('Enter');
    assert.match(await focused(page), /^textarea\.k-body/);
    await page.keyboard.type('It was a long week. ');
    await page.waitForTimeout(450);
    assert.ok((await page.locator('.k-back-bar').boundingBox())!.y < 0, 'once typing starts, the bar is out of the way');
    await page.keyboard.press('Shift+Tab'); // leaving the page by keyboard brings everything back
    await page.waitForTimeout(450);
    assert.equal((await page.locator('.k-back-bar').boundingBox())!.y, 0);
    await page.getByRole('button', { name: /^Quote it/ }).focus();
    await page.keyboard.press('Enter');
    await page.waitForFunction(() => (document.querySelector('.k-body') as HTMLTextAreaElement).value.includes('> I still think about that soup'));
    assert.match(await focused(page), /^textarea\.k-body/, 'quoting returns to the page');
    await page.keyboard.press('ControlOrMeta+z');
    assert.equal((await page.locator('.k-body').inputValue()).includes('>'), false, 'the browser’s own undo takes the quotation back');
    await page.getByRole('status').filter({ hasText: /^saved/ }).waitFor();
    await page.keyboard.press('Escape');
    await pile(page, /^tired, but in a good way, clipped with 1 more, 5 words on the back/).waitFor();
    await page.waitForFunction(() => document.activeElement?.classList.contains('k-scrap'));
    assert.match(await focused(page), /^button\.k-scrap/, 'focus is back on the pile');

    // A pile opens as a spread; pick the scrap, send it.
    await page.keyboard.press('Enter');
    await page.getByRole('heading', { name: /2 things on one clip/ }).waitFor();
    await page.locator('.k-spread').getByRole('button', { name: /^tired/ }).focus();
    await page.keyboard.press('Enter');
    const sentAs = (await face.getAttribute('class'))!.replace(' has-back', '');
    await page.getByRole('button', { name: 'Send it to someone' }).focus();
    await page.keyboard.press('Enter');
    await page.getByRole('button', { name: 'Make the link' }).focus();
    await page.keyboard.press('Enter');
    await page.waitForFunction(() => (document.querySelector('#k-send-link') as HTMLTextAreaElement | null)?.value.includes('#1.'));
    const link = await page.locator('#k-send-link').inputValue();

    const letter = await open(DESKTOP, link.slice(base.length));
    await letter.locator('.k-letter-scrap .k-words').waitFor();
    assert.equal(await letter.locator('.k-letter-scrap .k-words').textContent(), 'tired, but in a good way');
    assert.equal(await letter.getByRole('heading', { level: 1 }).textContent(), 'tired, but in a good way');
    assert.equal(await letter.locator('.k-letter-scrap > div').getAttribute('class'), sentAs, 'it arrives set the way it was sent');
    assert.match((await letter.locator('.k-reading').textContent())!, /It was a long week/);
    await axe(letter, 'letter');
    await letter.screenshot({ path: join(shots, 'scraps-letter.png') });
    await close(letter);
    await close(page);
  });

  test('a spark asks something; the answer lands on the table carrying its question; another spark is a different one', async () => {
    const page = await open();
    await page.getByRole('button', { name: /^Pull a spark/ }).click();
    assert.equal(await focused(page), 'input.#k-answer', 'ready to answer');
    const first = (await page.locator('.k-slip [role=status]').textContent())!;
    assert.ok((await page.locator('.k-slip-kind').textContent())!.length > 3, 'the slip says which instrument it came from');
    await page.getByRole('button', { name: 'A different one' }).click();
    const second = (await page.locator('.k-slip [role=status]').textContent())!;
    assert.notEqual(second, first);
    await page.keyboard.type('A cheese toastie, eaten standing up');
    await page.keyboard.press('Enter');
    await pile(page, /^A cheese toastie/).waitFor();
    assert.equal(await pile(page, /^A cheese toastie/).locator('.k-prompt').textContent(), second);
    assert.equal(await page.locator('.k-slip').count(), 0);
    await close(page);
  });

  test('dropping one scrap on another clips them, and asks why; the answer joins the pile; a scrap can be taken off again', async () => {
    const page = await open();
    await page.getByRole('button', { name: 'Okay' }).or(page.locator('.k-table')).first().waitFor();
    await say(page, 'maps lie');
    const a = (await pile(page, /^maps lie/).boundingBox())!;
    const b = (await pile(page, HELLO).boundingBox())!;
    await page.mouse.move(a.x + a.width / 2, a.y + a.height / 2);
    await page.mouse.down();
    await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2, { steps: 10 });
    await page.mouse.up();
    await pile(page, /^maps lie, clipped with 1 more/).waitFor();
    assert.equal(await piles(page).count(), 1);
    assert.equal(await page.locator('.k-held').count(), 0, 'a drag is not a pick-up');
    assert.equal(await focused(page), 'input.#k-answer');
    await page.keyboard.type('Both are a bit too sure of themselves');
    await page.keyboard.press('Enter');
    await pile(page, /^Both are a bit too sure of themselves, clipped with 2 more/).waitFor();

    await pickUp(page, /clipped with 2 more/);
    await page.locator('.k-spread').getByRole('button', { name: /^maps lie/ }).focus();
    await page.keyboard.press('Enter');
    await page.getByRole('button', { name: 'Take it off the clip' }).click();
    await page.keyboard.press('Escape');
    await pile(page, /^maps lie$/).waitFor();
    await pile(page, /clipped with 1 more/).waitFor();
    assert.equal(await piles(page).count(), 2);
    await close(page);
  });

  test('doodling: strokes, undo, the doodle on the scrap; a doodle or a sheet left empty leaves nothing behind', async () => {
    const page = await open();
    await page.getByRole('button', { name: 'Doodle something' }).click();
    await page.getByRole('button', { name: 'Done' }).click();
    await page.locator('.k-sketch').waitFor({ state: 'detached' });
    await page.getByRole('button', { name: 'A fresh sheet to write on' }).click();
    await page.getByRole('button', { name: 'Back to the table' }).click();
    await page.locator('.k-table').waitFor();
    assert.equal(await piles(page).count(), 1, 'only the greeting');

    await page.getByRole('button', { name: 'Doodle something' }).click();
    const pad = (await page.locator('.k-pad').boundingBox())!;
    for (const [x, y] of [[60, 60], [200, 260]] as const) {
      await page.mouse.move(pad.x + x, pad.y + y);
      await page.mouse.down();
      await page.mouse.move(pad.x + x + 150, pad.y + y + 60, { steps: 8 });
      await page.mouse.up();
    }
    assert.equal(await page.locator('.k-pad polyline').count(), 2);
    await page.getByRole('button', { name: 'Undo stroke' }).click();
    assert.equal(await page.locator('.k-pad polyline').count(), 1);
    await page.keyboard.press('Escape');
    await pile(page, /^A doodle/).waitFor();
    assert.equal(await pile(page, /^A doodle/).locator('.k-drawing polyline').count(), 1);
    await close(page);
  });
});

describe('Scraps: nothing is lost', () => {
  test('scraps, looks, piles and positions survive a reload; a tab closed mid-sentence keeps the sentence and offers to carry on', async () => {
    const page = await open();
    await say(page, 'First', 'Second');
    await pickUp(page, /^First/);
    await page.getByRole('button', { name: 'Give it a new look' }).click();
    const look = await page.locator('.k-held-scrap .k-face').getAttribute('class');
    await page.keyboard.press('Escape');
    await page.reload(); // at once: nothing waits for a timer
    await pile(page, /^First/).waitFor();
    assert.equal(await piles(page).count(), 3);
    assert.equal(await pile(page, /^First/).locator('.k-face').getAttribute('class'), look);
    assert.equal(await page.locator('.k-hint').count(), 0);

    await pickUp(page, /^First/);
    await page.getByRole('button', { name: /^Turn it over/ }).click();
    await page.locator('.k-body').pressSequentially('typed and then the tab went away');
    await page.reload(); // inside the save delay
    await page.getByText('You were in the middle of “First”.').waitFor();
    await page.getByRole('button', { name: 'Carry on' }).click();
    assert.equal(await page.locator('.k-body').inputValue(), 'typed and then the tab went away');

    // The next sitting keeps the earlier version when the writing changes.
    await page.locator('.k-body').fill('rewritten');
    await page.getByRole('status').filter({ hasText: /^saved/ }).waitFor();
    await wake(page);
    await page.getByRole('button', { name: 'Back to the table' }).click();
    await pickUp(page, /^First, 1 words on the back/);
    await page.getByRole('button', { name: /^Turn it over and keep writing/ }).click();
    await page.locator('.k-body').fill('rewritten again');
    await wake(page);
    await page.getByRole('button', { name: /Bring it back/ }).last().click();
    assert.equal(await page.locator('.k-body').inputValue(), 'typed and then the tab went away');
    await close(page);
  });

  test('binning can be undone; a full table sends the oldest to the drawer, and the drawer gives it back', async () => {
    const page = await open();
    await say(page, 'One');
    await pickUp(page, /^One/);
    await page.getByRole('button', { name: 'Bin it' }).click();
    assert.equal(await piles(page).count(), 1);
    await page.getByRole('button', { name: 'Undo', exact: true }).click();
    await pile(page, /^One/).waitFor();

    await say(page, ...Array.from({ length: 11 }, (_, i) => `Thing ${i + 2}`));
    assert.equal(await piles(page).count(), 12, 'twelve piles at most on a wide table');
    assert.equal(await pile(page, HELLO).count(), 0, 'the oldest went first');
    await page.getByRole('button', { name: 'the drawer (1 tucked away)' }).click();
    await page.locator('#k-find').fill('finished');
    assert.equal(await page.locator('.k-drawer .k-scrap').count(), 1);
    await page.locator('#k-find').fill('zzz');
    assert.match((await page.locator('.k-drawer [role=status]').textContent())!, /Nothing with those words/);
    await page.locator('#k-find').fill('finished');
    await page.locator('.k-drawer .k-scrap').click();
    await page.getByRole('button', { name: 'Put it back on the table' }).click();
    await pile(page, HELLO).waitFor();
    await page.waitForFunction(() => document.querySelectorAll('.k-table .k-scrap').length === 12).catch(() => undefined);
    assert.equal(await piles(page).count(), 12, 'and something else made room');
    await close(page);
  });

  test('a copy goes out and comes back in; something old is found again on return', async () => {
    const page = await open({ ...DESKTOP, acceptDownloads: true });
    await say(page, 'Coastlines and how to measure them');
    await page.getByRole('button', { name: /^the drawer/ }).click();
    const [download] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Keep a copy' }).click()]);
    assert.match(download.suggestedFilename(), /^scraps-\d{4}-\d\d-\d\d\.json$/);
    const file = join(tmp, 'copy.json');
    await download.saveAs(file);
    const copy = JSON.parse(readFileSync(file, 'utf8')) as { items: Record<string, unknown>[] };
    assert.equal(copy.items.length, 2);
    const then = Date.now() - 40 * DAY;
    copy.items.push({ id: 'old', text: 'Measuring a coastline twice gives two answers', body: '', look: 3, x: 0.7, y: 0.3, rot: 2, createdAt: then, updatedAt: then, liftedAt: then, away: true });
    writeFileSync(file, JSON.stringify(copy));
    await page.locator('input[aria-label="A copy to bring back"]').setInputFiles(file);
    await page.getByText('Brought back 1 thing.').waitFor();
    writeFileSync(file, '{"not":"a copy"}');
    await page.locator('input[aria-label="A copy to bring back"]').setInputFiles(file);
    await page.getByText('That file is not a copy of a table.').waitFor();
    assert.equal(await page.locator('.k-drawer .k-scrap').count(), 3, 'a bad file changes nothing');

    await page.reload();
    await page.getByText(/^Found this at the bottom of the drawer\. You made it 6 weeks ago\./).waitFor();
    await pile(page, /^Measuring a coastline twice/).waitFor();
    await page.getByRole('button', { name: 'Pick it up' }).click();
    assert.equal(await page.locator('.k-held-scrap .k-words').textContent(), 'Measuring a coastline twice gives two answers');
    await close(page);
  });
});

describe('Scraps: the letter page treats its link as a stranger’s', () => {
  test('markup in a letter is shown as text; a non-web address is not linked; a broken link shows the page as served', async () => {
    const hostile = await encodeLetter({ v: 1, t: '<img src=x onerror=alert(1)>', b: '<script>alert(1)</script>\n\njavascript:alert(1) and https://example.org/ok', k: 2, p: '<b>q</b>', d: Date.now() });
    const page = await open(DESKTOP, `${PATH}/letter#${hostile}`);
    await page.locator('.k-letter-scrap .k-words').waitFor();
    assert.equal(await page.locator('.k-letter-scrap .k-words').textContent(), '<img src=x onerror=alert(1)>');
    assert.equal(await page.locator('main img, main script, main b').count(), 0);
    assert.deepEqual(await page.locator('.k-reading a').evaluateAll((as) => as.map((a) => a.getAttribute('href'))), ['https://example.org/ok']);
    await close(page);

    for (const bad of ['', '#1.garbage', '#0.e30', '#nonsense']) {
      const broken = await open(DESKTOP, `${PATH}/letter${bad}`);
      await broken.waitForTimeout(300);
      assert.equal(await broken.getByRole('heading', { level: 1 }).textContent(), 'A scrap for you', bad);
      assert.match((await broken.locator('[data-letter-note]').textContent())!, /has none in it/, bad);
      await close(broken);
    }
  });
});

describe('Scraps 3: taking things back, the bin, the seal, two tabs', () => {
  test('undo and redo by keyboard and by button: a star, a move, a binned scrap', async () => {
    const page = await open();
    await say(page, 'One');
    await pickUp(page, /^One/);
    await page.getByRole('button', { name: 'Give it a gold star' }).click();
    await page.keyboard.press('Escape');
    await pile(page, /^One, starred/).waitFor();
    await page.keyboard.press('ControlOrMeta+z');
    await pile(page, /^One$/).waitFor();
    await page.keyboard.press('ControlOrMeta+Shift+z');
    await pile(page, /^One, starred/).waitFor();

    await pile(page, /^One/).focus();
    const before = (await pile(page, /^One/).boundingBox())!;
    await page.keyboard.press('ArrowRight');
    await page.waitForTimeout(200);
    assert.ok((await pile(page, /^One/).boundingBox())!.x > before.x + 10);
    await page.getByRole('button', { name: 'undo', exact: true }).click();
    await page.waitForTimeout(200);
    assert.ok(Math.abs((await pile(page, /^One/).boundingBox())!.x - before.x) < 2, 'the push is taken back');

    await pickUp(page, /^One/);
    await page.getByRole('button', { name: 'Bin it' }).click();
    assert.equal(await pile(page, /^One/).count(), 0);
    await page.keyboard.press('ControlOrMeta+z');
    await pile(page, /^One, starred/).waitFor();
    await page.getByRole('button', { name: 'redo', exact: true }).click();
    assert.equal(await pile(page, /^One/).count(), 0);
    await close(page);
  });

  test('a binned scrap waits in the drawer’s bin across a reload, comes out again, or is torn up for good', async () => {
    const page = await open();
    await say(page, 'Keep me', 'Tear me');
    for (const name of [/^Keep me/, /^Tear me/]) { await pickUp(page, name); await page.getByRole('button', { name: 'Bin it' }).click(); }
    await page.reload();
    await page.locator('.k-table').waitFor();
    assert.equal(await piles(page).count(), 1, 'binned scraps stay off the table');
    await page.getByRole('button', { name: /^the drawer/ }).click();
    assert.equal(await page.locator('.k-drawer .k-scrap').count(), 1, 'and out of "everything"');
    await page.getByRole('button', { name: 'the bin (2)' }).click();
    assert.match((await page.locator('.k-drawer [role=status]').textContent())!, /torn up 30 days after/);
    await page.getByRole('button', { name: /^Take it out.*Keep me/ }).click();
    await page.getByRole('button', { name: /^Tear it up now.*Tear me/ }).click();
    assert.equal(await page.locator('.k-drawer').getByText('Tear me').count() > 0, true, 'one press does not tear anything up');
    await page.getByRole('button', { name: /^No, leave it/ }).click();
    await page.getByRole('button', { name: /^Tear it up now.*Tear me/ }).click();
    await page.getByRole('button', { name: /^Yes, tear it up for good/ }).click();
    await page.keyboard.press('Escape');
    await pile(page, /^Keep me/).waitFor();
    await page.reload();
    await pile(page, /^Keep me/).waitFor();
    await page.getByRole('button', { name: /^the drawer/ }).click();
    assert.equal(await page.getByRole('button', { name: /^the bin/ }).count(), 0, 'the bin is empty, so it is not offered');
    await close(page);
  });

  test('a sealed scrap is out of sight until its day; it can be opened early; one whose day has come is on the table', async () => {
    const page = await open();
    await say(page, 'For later');
    await pickUp(page, /^For later/);
    await page.getByRole('button', { name: 'More to do with it' }).click();
    await page.getByRole('button', { name: 'Seal it for later' }).click();
    assert.equal(await page.getByRole('button', { name: 'Seal it', exact: true }).isDisabled(), true, 'no day chosen yet');
    await page.locator('#k-seal').fill('2031-03-03');
    await page.getByRole('button', { name: 'Seal it', exact: true }).click();
    await page.getByText(/^Sealed until/).waitFor();
    assert.equal(await pile(page, /^For later/).count(), 0);
    await page.getByRole('button', { name: /^the drawer/ }).click();
    assert.equal(await page.locator('.k-drawer').getByText('For later').count(), 0, 'not readable in the drawer either');
    await page.getByRole('button', { name: 'sealed (1)' }).click();
    await page.getByRole('button', { name: /^Open it early/ }).click();
    await page.keyboard.press('Escape');
    await pile(page, /^For later/).waitFor();

    const then = Date.now() - 200 * DAY;
    await bring(page, [scrapOf('capsule', 'Dear me, in the future', { sealedUntil: Date.now() - 1000, sealedAt: then, createdAt: then, updatedAt: then, liftedAt: then, away: true })]);
    await page.reload();
    await page.getByText(/^You sealed this on .+, to open today\./).waitFor();
    await pile(page, /^Dear me, in the future/).waitFor();
    await close(page);
  });

  test('two tabs on one table: what one makes appears in the other; writing on the same sheet in both loses neither version', async () => {
    const ctx = await browser.newContext(DESKTOP);
    const [a, b] = [await ctx.newPage(), await ctx.newPage()];
    for (const p of [a, b]) { p.on('pageerror', (e) => problems.push(`pageerror: ${e.message}`)); await p.goto(base + PATH); await p.locator('.k-table').waitFor(); }
    await say(a, 'Made in the first tab');
    await pile(b, /^Made in the first tab/).waitFor();
    await pickUp(b, /^Made in the first tab/);
    await b.getByRole('button', { name: 'Bin it' }).click();
    await a.waitForFunction(() => document.querySelectorAll('.k-table .k-scrap').length === 1);

    await say(a, 'Shared sheet');
    await pile(b, /^Shared sheet/).waitFor();
    for (const p of [a, b]) { await pickUp(p, /^Shared sheet/); await p.getByRole('button', { name: /^Turn it over/ }).click(); await p.locator('.k-body').waitFor(); }
    await a.locator('.k-body').pressSequentially('from the first tab');
    // The second tab is mid-sentence when the first tab's save arrives.
    await b.locator('.k-body').pressSequentially('second tab keeps typing through it', { delay: 40 });
    await b.getByText(/changed in another tab too/).waitFor();
    assert.equal(await b.locator('.k-body').inputValue(), 'second tab keeps typing through it', 'the words being typed stay');
    await wake(b);
    await b.getByRole('button', { name: /Bring it back/ }).first().click();
    assert.match(await b.locator('.k-body').inputValue(), /^from the first tab/, 'and the other tab’s are one press away');
    await ctx.close();
  });

  test('a storage write that fails is said so, with a way to try again and a way to keep a copy', async () => {
    const page = await open();
    await page.evaluate(() => { IDBObjectStore.prototype.put = () => { throw new DOMException('full', 'QuotaExceededError'); }; });
    await say(page, 'No room for this');
    await page.getByRole('alert').filter({ hasText: /did not save/ }).waitFor();
    assert.equal(await pile(page, /^No room for this/).count(), 1, 'still on screen');
    await page.getByRole('button', { name: 'Try again' }).waitFor();
    await page.getByRole('button', { name: 'Keep a copy now' }).waitFor();
    await axe(page, 'a failed save');
    await close(page);
  });

  test('a large drawer opens quickly, by month, sixty at a time', async () => {
    const page = await open();
    const items = Array.from({ length: 600 }, (_, i) => { const t = Date.now() - i * DAY; return scrapOf(`n${i}`, `Thought number ${i} about soup`, { look: i, away: true, createdAt: t, updatedAt: t, liftedAt: Date.now() }); });
    await bring(page, items);
    const t0 = Date.now();
    await page.getByRole('button', { name: /^the drawer/ }).click();
    await page.locator('.k-month').first().waitFor();
    const took = Date.now() - t0;
    assert.ok(took < 1500, `the drawer opened in ${took} ms`);
    assert.equal(await page.locator('.k-drawer .k-scrap').count(), 60);
    assert.ok(await page.locator('.k-month').count() >= 2, 'grouped by month');
    await page.getByRole('button', { name: /^Dig deeper/ }).click();
    assert.equal(await page.locator('.k-drawer .k-scrap').count(), 120);
    await page.locator('#k-find').fill('number 599');
    assert.equal(await page.locator('.k-drawer .k-scrap').count(), 1, 'search reaches everything, not only what is shown');
    await close(page);
  });
});

describe('Scraps 3: pictures, the studio, the writing page, things for other people', () => {
  test('a picture becomes a scrap; its caption is its name; pictures do not go into a link, and the dialog says so', async () => {
    const page = await open();
    await page.locator('input[aria-label="A picture to put on the table"]').setInputFiles({ name: 'p.png', mimeType: 'image/png', buffer: PNG });
    await pile(page, /^A picture/).waitFor();
    assert.match((await pile(page, /^A picture/).locator('img').getAttribute('src'))!, /^data:image\/(webp|jpeg);base64,/);
    await pickUp(page, /^A picture/);
    await axe(page, 'a picture in the hand');
    await page.getByRole('button', { name: 'Change the words' }).click();
    await page.locator('#k-words').fill('The pink square');
    await page.getByRole('button', { name: 'Send it to someone' }).click();
    await page.getByText('Pictures stay behind').waitFor();
    await page.keyboard.press('Escape');
    await page.keyboard.press('Escape');
    await page.reload();
    await pile(page, /^The pink square/).waitFor();
    assert.equal(await pile(page, /^The pink square/).locator('img').count(), 1, 'the picture is stored');
    await page.screenshot({ path: join(shots, 'scraps-picture.png') });
    await close(page);
  });

  test('the studio: a mat colour and stillness are applied at once and remembered', async () => {
    const page = await open();
    await page.getByRole('button', { name: /^Your studio/ }).click();
    await page.getByLabel('Plum').check();
    await page.getByLabel(/^Keep everything still/).check();
    await page.getByRole('button', { name: 'Done' }).click();
    const state = () => page.evaluate(() => ({ kMat: document.documentElement.dataset.kMat, kStill: document.documentElement.dataset.kStill, bg: getComputedStyle(document.body).backgroundColor }));
    assert.deepEqual([(await state()).kMat, (await state()).kStill, (await state()).bg], ['plum', 'true', 'rgb(74, 31, 61)']);
    await page.reload();
    await page.locator('.k-table').waitFor();
    assert.deepEqual([(await state()).kMat, (await state()).kStill], ['plum', 'true']);
    await page.locator('#k-say').fill('still');
    await page.locator('#k-say').press('Enter');
    await pile(page, /^still/).waitFor();
    assert.equal(await page.evaluate(() => getComputedStyle(document.querySelector('.k-at.is-new')!).animationName), 'none');
    await close(page);
  });

  test('the writing page: the bar leaves while typing and returns with the pointer; bold; print shows the page alone', async () => {
    const page = await open();
    await page.getByRole('button', { name: 'A fresh sheet to write on' }).click();
    await page.locator('.k-body').pressSequentially('An hour here should be easy. ');
    await page.waitForTimeout(450);
    assert.ok((await page.locator('.k-back-bar').boundingBox())!.y < -20, 'the bar is gone');
    assert.equal(await page.locator('.k-margin').evaluate((e) => getComputedStyle(e).visibility), 'hidden');
    await page.screenshot({ path: join(shots, 'scraps-absorbed.png') });
    await wake(page);
    await page.waitForTimeout(450);
    assert.equal((await page.locator('.k-back-bar').boundingBox())!.y, 0, 'and back');
    await page.locator('.k-body').focus();
    await page.keyboard.type('bold');
    for (let i = 0; i < 4; i += 1) await page.keyboard.press('Shift+ArrowLeft');
    await page.keyboard.press('ControlOrMeta+b');
    assert.match(await page.locator('.k-body').inputValue(), /\*\*bold\*\*$/);
    await wake(page);
    await page.getByRole('button', { name: 'Read it back' }).click();
    assert.equal(await page.locator('.k-reading strong').textContent(), 'bold');
    await axe(page, 'reading, with bold');
    await page.emulateMedia({ media: 'print' });
    assert.equal(await page.locator('.k-back-bar').isVisible(), false);
    assert.equal(await page.locator('.k-reading').isVisible(), true);
    assert.equal(await page.locator('.pu-beacon').isVisible(), false);
    await page.screenshot({ path: join(shots, 'scraps-print.png') });
    await page.emulateMedia({ media: 'screen' });
    await close(page);
  });

  test('a spark can take a whole sheet: the question heads the page', async () => {
    const page = await open();
    await page.getByRole('button', { name: /^Pull a spark/ }).click();
    const q = (await page.locator('.k-slip [role=status]').textContent())!;
    await page.getByRole('button', { name: 'More like this' }).click();
    assert.notEqual(await page.locator('.k-slip [role=status]').textContent(), q);
    await page.getByRole('button', { name: 'Take a whole sheet for it' }).click();
    assert.match(await focused(page), /^textarea\.k-body/);
    assert.ok((await page.locator('.k-page-prompt').textContent())!.length > 8);
    await close(page);
  });

  test('a pile becomes a zine for someone: addressed, signed, read in order, kept by its reader, and answered', async () => {
    const page = await open();
    await say(page, 'Page one', 'Page two');
    await pickUp(page, /^Page two/);
    await page.getByRole('button', { name: 'Clip it to another' }).click();
    await page.locator('#k-clip-find').fill('Page one');
    await page.locator('.k-choices button').first().click();
    await page.keyboard.press('Escape');
    await pickUp(page, /clipped with 1 more/);
    await page.getByRole('button', { name: 'Make a little zine of them' }).click();
    await page.getByRole('heading', { name: 'Make these into a little zine?' }).waitFor();
    await page.getByRole('button', { name: 'Make the link' }).click();
    await page.locator('#k-send-name').fill('Two pages about nothing');
    await page.locator('#k-send-to').fill('Mira');
    await page.locator('#k-send-from').fill('Ash');
    await page.waitForFunction(() => ((document.querySelector('#k-send-link') as HTMLTextAreaElement | null)?.value.length ?? 0) > 60);
    await page.waitForTimeout(250); // the link is remade as the names are typed
    const link = await page.locator('#k-send-link').inputValue();
    await close(page);

    // Mira opens it in a browser of her own.
    const letter = await open(DESKTOP, link.slice(base.length));
    // It is addressed, so it waits in its envelope until she opens it.
    const envelope = letter.getByRole('button', { name: /^For Mira\s*from Ash\s*open it/ });
    await envelope.waitFor();
    assert.equal(await letter.locator('.k-leaf').first().isVisible(), false);
    await axe(letter, 'a letter in its envelope');
    await letter.screenshot({ path: join(shots, 'scraps-envelope.png') });
    await envelope.focus();
    await letter.keyboard.press('Enter');
    await letter.locator('.k-leaf').first().waitFor();
    assert.equal(await letter.getByRole('heading', { level: 1 }).textContent(), 'For Mira');
    assert.equal(await letter.evaluate(() => document.activeElement?.tagName), 'H1', 'focus moves to the letter, not into nowhere');
    assert.equal(await letter.locator('.k-zine-name').textContent(), 'Two pages about nothing');
    assert.deepEqual(await letter.locator('.k-leaf-n').allTextContents(), ['1 of 2', '2 of 2']);
    assert.deepEqual(await letter.locator('.k-leaf .k-words').allTextContents(), ['Page one', 'Page two'], 'in the order they were made');
    assert.equal(await letter.locator('.k-letter-sign').textContent(), 'from Ash');
    await letter.waitForTimeout(500);
    await axe(letter, 'a zine, received');
    await letter.screenshot({ path: join(shots, 'scraps-zine.png'), fullPage: true });
    await letter.emulateMedia({ media: 'print' });
    assert.equal(await letter.getByRole('button', { name: /^Keep it/ }).isVisible(), false, 'on paper there are no buttons');
    await letter.emulateMedia({ media: 'screen' });
    await letter.getByRole('button', { name: /^Keep it on my table/ }).click();
    await letter.locator('.k-slip--arrived').waitFor();
    await pile(letter, /^Page one, clipped with 1 more, from Ash/).waitFor();
    await letter.waitForTimeout(400);
    await axe(letter, 'a kept letter');
    await letter.locator('#k-answer').fill('I read it twice');
    await letter.keyboard.press('Enter');
    await letter.getByRole('heading', { name: 'Send this to someone?' }).waitFor();
    await letter.keyboard.press('Escape');
    assert.equal(await pile(letter, /^I read it twice/).locator('.k-prompt').textContent(), 'Back to Ash:');
    await letter.reload();
    await pile(letter, /^Page one, clipped with 1 more/).waitFor();
    assert.equal(await letter.locator('.k-slip--arrived').count(), 0, 'kept once, not again on every visit');
    await close(letter);
  });

  test('a letter asked to stay folded stays folded, and says until when', async () => {
    const folded = await encodeLetter(letterOf([scrapOf('x', 'A secret for your birthday')], Date.now(), { to: 'Sam', from: 'Jo', open: Date.now() + 30 * DAY }));
    const page = await open(DESKTOP, `${PATH}/letter#${folded}`);
    await page.getByRole('heading', { level: 1, name: 'For Sam' }).waitFor();
    assert.match((await page.locator('[data-letter-note]').textContent())!, /^Jo folded this on .+ and asked that it stay folded until /);
    assert.equal(await page.locator('.k-leaf').count(), 0);
    assert.equal(await page.getByText('A secret for your birthday').count(), 0);
    await axe(page, 'a folded letter');
    await page.screenshot({ path: join(shots, 'scraps-folded.png') });
    await close(page);
  });
});

describe('Scraps: kept for ever', () => {
  test('a database left by a later Scraps still opens: a rolled-back deployment never shows a full table as an empty one', async () => {
    const page = await open();
    await say(page, 'Still here after the rollback');
    await page.getByRole('status').filter({ hasText: /On the table/ }).waitFor({ state: 'attached' });
    // A later version upgrades the database (this tab lets go of it when asked), then this version returns.
    await page.evaluate(() => new Promise<void>((resolve, reject) => {
      const req = indexedDB.open('scraps', 7);
      req.onupgradeneeded = () => { req.result.createObjectStore('something-new'); };
      req.onsuccess = () => { req.result.close(); resolve(); };
      req.onerror = () => reject(req.error);
      req.onblocked = () => reject(new Error('the open tab did not let go of the database'));
    }));
    await page.reload();
    await pile(page, /^Still here after the rollback/).waitFor();
    assert.equal(await page.locator('.k-warning').count(), 0, 'and it is still real storage, not the in-memory fallback');
    await say(page, 'And still writable');
    await page.reload();
    await pile(page, /^And still writable/).waitFor();
    await close(page);
  });

  test('a device that asks for less motion gets none; a long word is not broken in two', async () => {
    const page = await open({ ...DESKTOP, reducedMotion: 'reduce' });
    await page.locator('#k-say').fill('Unquestionably');
    await page.locator('#k-say').press('Enter');
    await pile(page, /^Unquestionably/).waitFor();
    assert.equal(await page.evaluate(() => getComputedStyle(document.querySelector('.k-at.is-new')!).animationName), 'none');
    await pickUp(page, /^Unquestionably/);
    for (let i = 0; i < 5; i += 1) {
      const lines = await page.locator('.k-held-scrap .k-words').evaluate((e) => { const r = document.createRange(); r.selectNodeContents(e); return new Set([...r.getClientRects()].map((k) => Math.round(k.top))).size; });
      assert.equal(lines, 1, `one word, one line (${await page.locator('.k-held-scrap .k-face').getAttribute('class')})`);
      await page.getByRole('button', { name: 'Give it a new look' }).click();
    }
    assert.equal(await page.evaluate(() => getComputedStyle(document.querySelector('.k-held-scrap')!).animationName), 'none');
    await close(page);
  });

  test('paper in the hand: a dragged scrap is lifted, the pile under it says it will take it, and both stop when it is put down', async () => {
    const page = await open();
    await say(page, 'carried');
    const a = (await pile(page, /^carried/).boundingBox())!;
    const b = (await pile(page, HELLO).boundingBox())!;
    await page.mouse.move(a.x + a.width / 2, a.y + a.height / 2);
    await page.mouse.down();
    await page.mouse.move(a.x + a.width / 2 + 30, a.y + a.height / 2 + 30, { steps: 4 });
    assert.equal(await page.locator('.k-at.is-air').count(), 1);
    assert.equal(await page.locator('.k-at.is-target').count(), 0);
    await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2, { steps: 8 });
    assert.equal(await page.locator('.k-at.is-target').getByRole('button').getAttribute('aria-label'), 'Hello. Nothing here has to be finished.');
    await page.mouse.move(b.x + b.width + 260, b.y + b.height + 120, { steps: 8 });
    assert.equal(await page.locator('.k-at.is-target').count(), 0, 'moved off it again');
    await page.mouse.up();
    assert.equal(await page.locator('.k-at.is-air').count(), 0);
    assert.equal(await piles(page).count(), 2, 'put down beside it, not clipped');
    await close(page);
  });

  test('an hour of writing: the line being written stays clear of the bottom edge; three thousand scraps still open at once', async () => {
    const page = await open();
    await page.getByRole('button', { name: 'A fresh sheet to write on' }).click();
    await page.locator('.k-body').fill('A line of the long piece.\n\n'.repeat(70));
    await page.locator('.k-body').press('End');
    await page.keyboard.type('and one more line at the very end');
    await page.waitForTimeout(200);
    const at = await page.evaluate(() => (document.querySelector('.k-body')!.getBoundingClientRect().bottom) / innerHeight);
    assert.ok(at > 0.3 && at < 0.75, `the end of the writing sits at ${Math.round(at * 100)}% of the window`);
    await wake(page);
    await page.getByRole('button', { name: 'Back to the table' }).click();

    const year = 365 * DAY;
    const items = Array.from({ length: 3000 }, (_, i) => { const t = Date.now() - 20 * DAY - i * DAY; return scrapOf(`k${i}`, `Kept thought ${i} about the weather`, { look: i, away: true, createdAt: t, updatedAt: t, liftedAt: Date.now() }); });
    items.push(scrapOf('lastyear', 'This time last year', { away: true, createdAt: Date.now() - year, updatedAt: Date.now() - year }));
    await bring(page, items);
    const t0 = Date.now();
    await page.reload();
    await page.locator('.k-table').waitFor();
    const load = Date.now() - t0;
    const t1 = Date.now();
    await page.getByRole('button', { name: /^the drawer/ }).click();
    await page.locator('.k-month').first().waitFor();
    const drawer = Date.now() - t1;
    assert.ok(load < 3000 && drawer < 1500, `3,000 scraps: the table in ${load} ms, the drawer in ${drawer} ms`);
    await page.getByRole('button', { name: /^around now, other years/ }).click();
    assert.ok(await page.locator('.k-drawer').getByRole('button', { name: /^This time last year/ }).count() >= 1);
    await page.locator('#k-find').fill('thought 2999');
    await page.getByRole('button', { name: 'everything' }).click();
    assert.equal(await page.locator('.k-drawer .k-scrap').count(), 1);
    await close(page);
  });
});

describe('Scraps: clean', () => {
  test('no script errors and no CSP violations in any test above', () => {
    assert.deepEqual(problems, []);
  });
});
