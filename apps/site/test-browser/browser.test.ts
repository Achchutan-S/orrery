// Real-browser checks against production and preview builds: layout, keyboard, focus,
// axe, in-app routing, the preview-only flag, external links and CSS isolation.
// Run with `pnpm test:browser` (first time: `pnpm --filter @pu/site exec playwright install chromium`).
// Screenshots land in apps/site/test-results/ for manual review.
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { after, before, describe, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import AxeBuilder from '@axe-core/playwright';
import { preview } from 'astro';
import { chromium, type Browser, type BrowserContext, type BrowserContextOptions, type Page } from 'playwright';
import { views } from '../src/experiences/sample-app/views.ts';

const root = fileURLToPath(new URL('../', import.meta.url));
const shots = join(root, 'test-results');
const tmp = mkdtempSync(join(tmpdir(), 'pu-browser-'));
const VIEWPORTS = {
  desktop: { viewport: { width: 1280, height: 900 } },
  mobile: { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 },
} satisfies Record<string, BrowserContextOptions>;
const ROUTES = ['/', '/journal', '/journal/today', '/sample-content', '/sample-app', '/sample-app/states', '/sample-app/states/beta?access=owner', '/no-such-page'];
const EXTERNAL = [
  { title: 'KawaiUI', href: 'https://kawaiui.vercel.app/', host: 'kawaiui.vercel.app' },
  { title: 'Dev X-Ray', href: 'https://devxray-one.vercel.app/', host: 'devxray-one.vercel.app' },
];

let browser: Browser;
const openContexts = new Set<BrowserContext>();
const cspViolations: string[] = [];
let traces = 0;

/**
 * Every test context comes from here. With PU_TRACE=1 (set in CI) each one records a
 * Playwright trace, saved to test-results/traces/ when it closes. Contexts a failing
 * test never closed are closed in after(), so the failure's trace is kept too.
 * Open one with `pnpm exec playwright show-trace <file>`.
 */
async function newContext(opts: BrowserContextOptions = {}, label = 'context'): Promise<BrowserContext> {
  const context = await browser.newContext(opts);
  openContexts.add(context);
  context.on('console', (m) => {
    if (m.type() === 'error' && /Content Security Policy/.test(m.text())) cspViolations.push(`${m.location().url}: ${m.text()}`);
  });
  if (process.env.PU_TRACE) await context.tracing.start({ screenshots: true, snapshots: true });
  const close = context.close.bind(context);
  context.close = async (options) => {
    openContexts.delete(context);
    if (process.env.PU_TRACE) {
      const name = `${String(++traces).padStart(3, '0')}-${label.replace(/[^a-z0-9]+/gi, '_')}.zip`;
      await context.tracing.stop({ path: join(shots, 'traces', name) });
    }
    return close(options);
  };
  return context;
}
const servers: Awaited<ReturnType<typeof preview>>[] = [];
const base: Record<'production' | 'preview', string> = { production: '', preview: '' };

async function serve(env: 'production' | 'preview') {
  const outDir = join(tmp, env);
  const r = spawnSync(process.execPath, [join(root, 'node_modules/astro/bin/astro.mjs'), 'build', '--outDir', outDir], {
    cwd: root, encoding: 'utf8', env: { ...process.env, VERCEL_ENV: env },
  });
  assert.equal(r.status, 0, r.stdout + r.stderr);
  const server = await preview({ root, outDir, logLevel: 'error', server: { port: 0 } });
  servers.push(server);
  base[env] = `http://localhost:${server.port}`;
}

before(async () => {
  await serve('production');
  await serve('preview');
  browser = await chromium.launch();
  mkdirSync(shots, { recursive: true });
});

after(async () => {
  for (const context of [...openContexts]) await context.close();
  await browser?.close();
  for (const s of servers) await s.stop();
  rmSync(tmp, { recursive: true, force: true });
});

const hydrated = (page: Page) => page.waitForSelector('astro-island:not([ssr])', { state: 'attached' });

async function open(path: string, opts: BrowserContextOptions = VIEWPORTS.desktop, env: keyof typeof base = 'production'): Promise<Page> {
  const page = await (await newContext(opts, `${env}${path}`)).newPage();
  await page.goto(base[env] + path);
  if (/^\/sample-app\/./.test(path)) await hydrated(page);
  return page;
}

/** Counts full document loads after the call, to prove navigation stayed in-app. */
function documentLoads(page: Page) {
  const loads: string[] = [];
  page.on('request', (r) => { if (r.resourceType() === 'document') loads.push(r.url()); });
  return loads;
}

const slug = (path: string) => (path === '/' ? 'index' : path.slice(1).replace(/[/?=]/g, '_'));
const h1 = (page: Page) => page.getByRole('heading', { level: 1 }).textContent();

describe('axe (WCAG 2.2 A/AA rules) and screenshots', () => {
  for (const [name, vp] of Object.entries(VIEWPORTS)) {
    for (const colorScheme of ['light', 'dark'] as const) {
      test(`${name}, ${colorScheme}: no axe violations; no horizontal scroll`, async () => {
        for (const path of ROUTES) {
          const page = await open(path, { ...vp, colorScheme });
          const { violations } = await new AxeBuilder({ page })
            .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']).analyze();
          assert.deepEqual(violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target).join(', ')}`), [], path);
          const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
          assert.ok(overflow <= 0, `${path} scrolls horizontally by ${overflow}px`);
          await page.screenshot({ path: join(shots, `${slug(path)}-${name}-${colorScheme}.png`), fullPage: true });
          await page.context().close();
        }
      });
    }
  }

  test('preview-only pages pass axe too (inspector panel)', async () => {
    const page = await open('/sample-app/states/draft', VIEWPORTS.desktop, 'preview');
    const { violations } = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag22aa']).analyze();
    assert.deepEqual(violations.map((v) => v.id), []);
    await page.screenshot({ path: join(shots, 'preview-sample-app_states_draft-desktop.png'), fullPage: true });
    await page.context().close();
  });
});

describe('discovery index', () => {
  test('keyboard: Tab reaches each entry in catalog order with a visible two-band focus ring', async () => {
    const page = await open('/');
    const order: string[] = [];
    for (let i = 0; i < 5; i++) {
      await page.keyboard.press('Tab');
      const focus = await page.evaluate(() => {
        const el = document.activeElement as HTMLElement;
        const s = getComputedStyle(el);
        return { href: el.getAttribute('href'), outline: `${s.outlineStyle} ${s.outlineWidth}`, shadow: s.boxShadow };
      });
      assert.equal(focus.outline, 'solid 3px', `${focus.href} outline`);
      assert.match(focus.shadow, /rgb\(242, 193, 78\)/, `${focus.href} inner band`);
      order.push(focus.href!);
    }
    assert.deepEqual(order, ['/journal', 'https://kawaiui.vercel.app/', 'https://devxray-one.vercel.app/', '/sample-content', '/sample-app']);
    await page.keyboard.press('Shift+Tab');
    await page.screenshot({ path: join(shots, 'index-focus-desktop.png') });
    await page.keyboard.press('Enter');
    await page.waitForURL(`${base.production}/sample-content`);
    await page.context().close();
  });

  for (const ext of EXTERNAL) {
    test(`${ext.title}: exact URL, announced as leaving, opens in the same tab`, async () => {
      const page = await open('/');
      const link = page.getByRole('link', { name: `${ext.title} (external site)`, exact: true });
      assert.equal(await link.getAttribute('href'), ext.href);
      assert.equal(await link.getAttribute('target'), null);
      assert.equal(await link.evaluate((el) => document.getElementById(el.getAttribute('aria-describedby')!)?.textContent),
        `Leaves Personal Universe for ${ext.host}.`);
      // Follow the link without depending on the live app: answer the request locally.
      await page.route(`${ext.href}**`, (r) => r.fulfill({ status: 200, contentType: 'text/html', body: '<title>stub</title>' }));
      await link.click();
      await page.waitForURL(ext.href);
      await page.context().close();
    });
  }

  test('internal entries are not marked external', async () => {
    const page = await open('/');
    for (const name of ['The Orrery Journal', 'How a page reaches you', 'Release lifecycle explorer']) {
      assert.equal(await page.getByRole('link', { name, exact: true }).count(), 1, name);
    }
    assert.equal(await page.locator('[data-weight="external"]').count(), 2);
    await page.context().close();
  });

  test('desktop hangs titles left of summaries; mobile stacks them', async () => {
    for (const [name, vp] of Object.entries(VIEWPORTS)) {
      const page = await open('/', vp);
      const title = (await page.locator('.entry h2').first().boundingBox())!;
      const summary = (await page.locator('.entry .summary').first().boundingBox())!;
      if (name === 'desktop') assert.ok(summary.x > title.x + title.width, 'summary right of title');
      else assert.ok(summary.y >= title.y + title.height, 'summary below title');
      await page.context().close();
    }
  });

  test('entry links meet the 44px target height on mobile', async () => {
    const page = await open('/', VIEWPORTS.mobile);
    for (const h of await page.locator('.entry h2 a').evaluateAll((els) => els.map((e) => e.getBoundingClientRect().height))) {
      assert.ok(h >= 44, `link height ${h}`);
    }
    await page.context().close();
  });

  test('the platform font actually loads', async () => {
    const page = await open('/');
    const families = await page.evaluate(async () => {
      await document.fonts.ready;
      return [...document.fonts].filter((f) => f.status === 'loaded').map((f) => f.family);
    });
    assert.ok(families.some((f) => f.includes('Atkinson Hyperlegible Next')), families.join(', '));
    await page.context().close();
  });

  test('reduced motion zeroes the platform duration token and transitions', async () => {
    for (const path of ['/', '/sample-app/states']) {
      const page = await open(path, { ...VIEWPORTS.desktop, reducedMotion: 'reduce' });
      const { duration, transition } = await page.evaluate(() => ({
        duration: getComputedStyle(document.documentElement).getPropertyValue('--pu-duration').trim(),
        transition: getComputedStyle(document.querySelector('a')!).transitionDuration,
      }));
      assert.equal(duration, '0s', path);
      assert.ok(parseFloat(transition) <= 0.00001, `${path} transition ${transition}`);
      await page.context().close();
    }
  });
});

describe('The Orrery Journal', () => {
  test('opens from the index and reads front to back with the keyboard', async () => {
    const page = await open('/');
    await page.getByRole('link', { name: 'The Orrery Journal', exact: true }).click();
    await page.waitForURL('**/journal');
    await page.getByRole('link', { name: 'The idea', exact: true }).click();
    await page.waitForURL('**/journal/idea');
    const visited = [await h1(page)];
    for (;;) {
      const next = page.getByRole('navigation', { name: 'Chapters' }).getByRole('link', { name: /^Next chapter/ });
      if (await next.count() === 0) break;
      await next.focus();
      await page.keyboard.press('Enter');
      await page.waitForLoadState();
      visited.push(await h1(page));
    }
    assert.equal(visited.length, 8);
    assert.match(visited[0]!, /The idea$/);
    assert.match(visited[7]!, /Where Orrery is going$/);
    await page.context().close();
  });

  test('every passage announces its standing to assistive technology', async () => {
    const page = await open('/journal/going-live');
    const marks = await page.locator('.claim .mark').allInnerTexts();
    assert.ok(marks.length > 0);
    // Screen readers hear "Standing: Deployed"; the prefix is visually hidden.
    for (const m of marks) assert.match(m.replace(/\s+/g, ' ').trim(), /^Standing: (Intent|Implemented|Verified|Deployed|Planned)$/);
    const spoken = await page.locator('.claim .mark').first().textContent();
    assert.match(spoken!, /^Standing: /);
    await page.context().close();
  });

  test('desktop puts standings in the margin; phones put them above the passage', async () => {
    for (const [name, vp] of Object.entries(VIEWPORTS)) {
      const page = await open('/journal/foundation', vp);
      const mark = (await page.locator('.claim .mark').first().boundingBox())!;
      const body = (await page.locator('.claim .claim-body').first().boundingBox())!;
      if (name === 'desktop') assert.ok(mark.x + mark.width <= body.x, 'mark left of the passage');
      else assert.ok(mark.y + mark.height <= body.y + 1, 'mark above the passage');
      await page.context().close();
    }
  });
});

describe('JavaScript footprint (network)', () => {
  for (const [path, expectReact] of [['/', false], ['/journal', false], ['/journal/foundation', false], ['/sample-content', false], ['/sample-app', false], ['/sample-app/states', true]] as const) {
    test(`${path} ${expectReact ? 'loads React' : 'loads no JavaScript'}`, async () => {
      const page = await (await newContext({}, `js-footprint${path}`)).newPage();
      const scripts: string[] = [];
      page.on('request', (r) => { if (r.resourceType() === 'script') scripts.push(new URL(r.url()).pathname); });
      await page.goto(base.production + path, { waitUntil: 'networkidle' });
      if (expectReact) assert.ok(scripts.some((s) => /\/_astro\/client\..*\.js$/.test(s)), scripts.join(', '));
      else assert.deepEqual(scripts, []);
      await page.context().close();
    });
  }
});

describe('in-app routing (production build)', () => {
  test('direct navigation to every enumerated view: right title and heading', async () => {
    const page = await (await newContext({}, 'every-view')).newPage();
    for (const v of views) {
      const res = await page.goto(`${base.production}/sample-app/${v.path}`);
      assert.equal(res?.status(), 200, v.path);
      await hydrated(page);
      assert.equal(await page.title(), v.title);
      assert.equal(await h1(page), v.path === 'states' ? 'Lifecycle states' : v.path.slice('states/'.length));
    }
    await page.context().close();
  });

  test('client-side navigation: no document load, title and focus move to the new heading', async () => {
    const page = await open('/sample-app/states');
    const loads = documentLoads(page);
    await page.getByRole('navigation', { name: 'Lifecycle states' }).getByRole('link', { name: 'beta' }).click();
    await page.waitForURL('**/sample-app/states/beta');
    assert.equal(await page.title(), 'Beta · Lifecycle states');
    assert.equal(await h1(page), 'beta');
    assert.equal(await page.evaluate(() => document.activeElement?.tagName), 'H1');
    assert.deepEqual(loads, []);
    await page.context().close();
  });

  test('back and forward restore views without reloading', async () => {
    const page = await open('/sample-app/states');
    const loads = documentLoads(page);
    await page.getByRole('navigation', { name: 'Lifecycle states' }).getByRole('link', { name: 'beta' }).click();
    await page.waitForURL('**/states/beta');
    await page.locator('.next').getByRole('link', { name: 'published' }).click();
    await page.waitForURL('**/states/published');
    assert.equal(await h1(page), 'published');
    await page.goBack();
    await page.waitForURL('**/states/beta');
    assert.equal(await h1(page), 'beta');
    await page.goBack();
    await page.waitForURL('**/sample-app/states');
    assert.equal(await h1(page), 'Lifecycle states');
    await page.goForward();
    await page.waitForURL('**/states/beta');
    assert.equal(await h1(page), 'beta');
    assert.deepEqual(loads, []);
    await page.context().close();
  });

  test('query-string state: switching access updates the URL in-app and survives reload and back', async () => {
    const page = await open('/sample-app/states/draft');
    const loads = documentLoads(page);
    const caption = () => page.locator('caption').textContent();
    assert.match((await caption())!, /public access/);
    await page.locator('.access').getByRole('link', { name: 'owner' }).click();
    await page.waitForURL('**/states/draft?access=owner');
    assert.match((await caption())!, /owner access/);
    assert.deepEqual(loads, []);
    await page.reload();
    await hydrated(page);
    await page.waitForFunction(() => document.querySelector('caption')?.textContent?.includes('owner'));
    assert.equal(await h1(page), 'draft');
    await page.goBack();
    await page.waitForURL(/states\/draft$/);
    assert.match((await caption())!, /public access/);
    await page.context().close();
  });

  test('refresh on a nested route serves the same view', async () => {
    const page = await open('/sample-app/states/frozen');
    for (let i = 0; i < 2; i++) {
      await page.reload();
      await hydrated(page);
      assert.equal(await page.title(), 'Frozen · Lifecycle states');
      assert.equal(await h1(page), 'frozen');
    }
    await page.context().close();
  });

  test('unknown route reached in-app shows the in-app not-found view', async () => {
    const page = await open('/sample-app/states');
    await page.evaluate(() => {
      history.pushState(null, '', '/sample-app/states/live');
      dispatchEvent(new PopStateEvent('popstate'));
    });
    await page.getByRole('heading', { level: 1, name: 'No such view' }).waitFor();
    assert.equal(await page.title(), 'No such view · Lifecycle states');
    await page.context().close();
  });

  test('unknown views and unpublished experiences are real 404s with the site page', async () => {
    const page = await (await newContext({}, '404s')).newPage();
    for (const path of ['/sample-app/states/live', '/sample-app/overview', '/canary-draft', '/sample-hostile', '/no-such-page']) {
      const res = await page.goto(base.production + path);
      assert.equal(res?.status(), 404, path);
      assert.equal(await h1(page), 'Not found');
    }
    await page.context().close();
  });
});

describe('preview-only flag (inspector)', () => {
  test('preview shows the inspector and it follows in-app navigation; production has none', async () => {
    const page = await open('/sample-app/states', VIEWPORTS.desktop, 'preview');
    const inspector = page.getByRole('complementary', { name: 'Inspector' });
    assert.match((await inspector.textContent())!, /Pathstates/);
    await page.getByRole('navigation', { name: 'Lifecycle states' }).getByRole('link', { name: 'alpha' }).click();
    await page.waitForURL('**/states/alpha');
    assert.match((await inspector.textContent())!, /Pathstates\/alpha/);
    await page.context().close();

    const prod = await open('/sample-app/states');
    assert.equal(await prod.getByRole('complementary', { name: 'Inspector' }).count(), 0);
    await prod.context().close();
  });
});

describe('CSS isolation (adversarial)', () => {
  // Computed styles that make up each experience's look, read from the live page.
  const PROBES: Record<string, Record<string, string[]>> = {
    '/sample-content': {
      body: ['font-family', 'font-size', 'line-height', 'color', 'background-color', '--sc-ink'],
      h1: ['font-size', 'font-weight', 'display', 'margin-bottom'],
      main: ['max-width', 'padding-top', 'display'],
      'main a': ['color', 'text-decoration-line'],
      pre: ['background-color', 'padding-left', 'display'],
      '.pu-colophon': ['font-size', 'padding-top', 'max-width'],
    },
    '/sample-app/states': {
      body: ['font-family', 'color', 'background-color', '--sa-bg'],
      '.explorer': ['display', 'grid-template-columns'],
      table: ['border-collapse', 'font-variant-numeric'],
      'nav a': ['color', 'display', 'text-transform'],
    },
    '/journal/experiences': {
      body: ['font-family', 'color', 'background-color', '--j-ink'],
      '.chapter-number': ['font-size', 'color'],
      '.claim-body': ['border-left-style', 'padding-left'],
      '.mark': ['color', 'font-size'],
    },
    '/': {
      body: ['font-family', 'font-size', 'color', 'background-color'],
      h1: ['font-size', 'font-weight'],
      '.entry': ['display', 'grid-template-columns'],
      '.entry h2 a': ['color', 'text-decoration-style', 'padding-top'],
    },
  };

  async function fingerprint(page: Page, path: string) {
    return page.evaluate((probes) => {
      const out: Record<string, string> = {};
      for (const [sel, props] of Object.entries(probes)) {
        const el = document.querySelector(sel);
        if (!el) { out[sel] = 'missing'; continue; }
        const cs = getComputedStyle(el);
        for (const p of props) out[`${sel} ${p}`] = cs.getPropertyValue(p).trim();
      }
      const first = document.styleSheets[0]?.cssRules[0];
      out['layer order'] = first instanceof CSSLayerStatementRule ? first.nameList.join(',') : 'missing';
      return out;
    }, PROBES[path]!);
  }

  async function focusRing(page: Page, selector: string) {
    await page.locator(selector).first().focus();
    return page.evaluate(() => {
      const s = getComputedStyle(document.activeElement!);
      return `${s.outlineStyle} ${s.outlineWidth} ${s.outlineColor} | ${s.boxShadow}`;
    });
  }

  test('the hostile rule really applies on its own page, but cannot remove the focus ring', async () => {
    const page = await open('/sample-hostile', VIEWPORTS.desktop, 'preview');
    const h = await page.evaluate(() => {
      const cs = getComputedStyle(document.querySelector('h1')!);
      return { display: cs.display, weight: cs.fontWeight, size: cs.fontSize, margin: cs.marginTop };
    });
    assert.deepEqual(h, { display: 'inline', weight: '400', size: '16px', margin: '0px' }, 'all: unset took effect');
    assert.match(await focusRing(page, 'a'), /^solid 3px rgb\(11, 19, 16\) \| rgb\(242, 193, 78\)/);
    await page.screenshot({ path: join(shots, 'preview-sample-hostile-desktop.png'), fullPage: true });
    await page.context().close();
  });

  // Absolute anchors, so a rule present in both builds cannot pass by comparison alone.
  const ANCHORS: Record<string, Record<string, string | RegExp>> = {
    '/sample-content': { 'h1 display': 'block', 'body font-family': /^"Iowan Old Style"/, 'main max-width': '608px', 'main a color': 'rgb(122, 52, 24)' },
    '/sample-app/states': { '.explorer display': 'grid', 'body background-color': 'rgb(16, 20, 28)', 'table border-collapse': 'collapse' },
    '/journal/experiences': { '.claim-body border-left-style': 'double', 'body background-color': 'rgb(238, 242, 239)' },
    '/': { '.entry display': 'grid', 'body background-color': 'rgb(238, 242, 239)', '.entry h2 a padding-top': '9.6px' },
  };

  test('after visiting the hostile page, other experiences render exactly as in a build without it', async () => {
    for (const path of Object.keys(PROBES)) {
      const clean = await open(path); // production: sample-hostile is not even built
      const expected = await fingerprint(clean, path);
      assert.deepEqual(Object.keys(expected).filter((k) => expected[k] === 'missing'), [], `${path}: every probe must match an element`);
      for (const [key, want] of Object.entries(ANCHORS[path]!)) {
        if (typeof want === 'string') assert.equal(expected[key], want, `${path} ${key}`);
        else assert.match(expected[key]!, want, `${path} ${key}`);
      }
      const expectedRing = await focusRing(clean, 'a');
      await clean.context().close();

      const page = await open('/sample-hostile', VIEWPORTS.desktop, 'preview');
      await page.goto(base.preview + path);
      if (path.startsWith('/sample-app/')) await hydrated(page);
      assert.deepEqual(await fingerprint(page, path), expected, path);
      assert.equal(await focusRing(page, 'a'), expectedRing, `${path} focus ring`);
      assert.equal((await fingerprint(page, path))['layer order'], 'platform.reset,platform.tokens,platform.chrome,experience');
      await page.context().close();
    }
  });

  test('following a link out of the hostile page lands on an unaffected document', async () => {
    const page = await open('/sample-hostile', VIEWPORTS.desktop, 'preview');
    await page.getByRole('link', { name: 'Open another experience' }).click();
    await page.waitForURL('**/sample-content');
    const h = await page.evaluate(() => getComputedStyle(document.querySelector('h1')!).display);
    assert.equal(h, 'block');
    await page.context().close();
  });
});

// Runs last: every page every test above opened, production and preview, under Astro's CSP.
describe('Content Security Policy', () => {
  test('no page loaded by this suite violated its CSP', () => {
    assert.deepEqual(cspViolations, []);
  });

  test('a script the policy does not allow is really blocked (the check above can fail)', async () => {
    const page = await (await newContext({}, 'csp-probe')).newPage();
    await page.goto(`${base.production}/sample-content`);
    const ran = await page.evaluate(async () => {
      const s = document.createElement('script');
      s.textContent = 'window.__injected = true';
      document.head.append(s);
      await new Promise((r) => setTimeout(r, 50));
      return (window as unknown as { __injected?: boolean }).__injected === true;
    });
    assert.equal(ran, false, 'an injected inline script executed');
    assert.ok(cspViolations.some((v) => /inline script/i.test(v)), 'the violation was reported');
    cspViolations.length = 0;
    await page.context().close();
  });
});
