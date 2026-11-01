// The Control Center in a real browser: the production UI build, served by Vite preview with its
// /api proxy, in front of the real server on a temporary copy of config/release.json.
// Run with `pnpm --filter @pu/control test:browser`. Screenshots land in apps/control/test-results/.
import assert from 'node:assert/strict';
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { after, before, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import AxeBuilder from '@axe-core/playwright';
import { chromium, type Browser, type BrowserContextOptions, type Page } from 'playwright';
import { build, preview, type PreviewServer } from 'vite';
import { loadCatalog, start } from '../server/main.ts';
import { FileReleaseStore } from '../server/store.ts';
import { uiConfig } from '../web/ui-config.ts';

const REAL = new URL('../../../config/release.json', import.meta.url);
const realBytes = readFileSync(REAL);
const shots = fileURLToPath(new URL('../test-results/', import.meta.url));
const tmp = mkdtempSync(join(tmpdir(), 'pu-control-ui-'));
const file = join(tmp, 'release.json');
const VIEWPORTS = {
  desktop: { viewport: { width: 1280, height: 900 } },
  mobile: { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true },
} satisfies Record<string, BrowserContextOptions>;

let browser: Browser;
let ui: PreviewServer;
let api: Awaited<ReturnType<typeof start>> | null = null;
let base = '';
let uiPort = 0;
let apiPort = 0;
const apiLog: string[] = [];
const cspViolations: string[] = [];

async function freePort(): Promise<number> {
  const s = createServer();
  await new Promise<void>((r) => s.listen(0, '127.0.0.1', r));
  const { port } = s.address() as { port: number };
  await new Promise((r) => s.close(r));
  return port;
}

const startApi = async () => {
  api = await start({ store: new FileReleaseStore(file), catalog: loadCatalog(), port: apiPort, uiPort, log: (e, f) => apiLog.push(`${e} ${JSON.stringify(f)}`) });
};

before(async () => {
  copyFileSync(REAL, file);
  [uiPort, apiPort] = [await freePort(), await freePort()];
  const config = { ...uiConfig({ uiPort, apiPort, outDir: join(tmp, 'dist') }), configFile: false as const };
  await build(config);
  await startApi();
  ui = await preview(config);
  base = `http://127.0.0.1:${uiPort}`;
  browser = await chromium.launch();
  mkdirSync(shots, { recursive: true });
});

after(async () => {
  await browser?.close();
  await ui?.close();
  await api?.close();
  assert.deepEqual(readFileSync(REAL), realBytes, 'the real config/release.json is untouched');
  assert.deepEqual(cspViolations, [], 'no Content Security Policy violations');
});

/** Every test starts from the original release file. The session baseline is that file too. */
async function page(opts: BrowserContextOptions = VIEWPORTS.desktop, colorScheme: 'light' | 'dark' = 'light'): Promise<Page> {
  writeFileSync(file, realBytes);
  const context = await browser.newContext({ ...opts, colorScheme });
  const p = await context.newPage();
  p.on('console', (m) => { if (m.type() === 'error' && /Content Security Policy/.test(m.text())) cspViolations.push(m.text()); });
  return p;
}

const open = async (p: Page, path: string) => {
  await p.goto(base + path);
  await p.getByRole('heading', { level: 1 }).waitFor();
};
const release = () => JSON.parse(readFileSync(file, 'utf8'));

async function axe(p: Page, label: string) {
  // Let entry fades finish: axe measures contrast as rendered, opacity included.
  await p.evaluate(() => Promise.all(document.getAnimations().map((a) => a.finished)));
  const r = await new AxeBuilder({ page: p }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']).analyze();
  assert.deepEqual(r.violations.map((v) => `${label}: ${v.id} (${v.nodes.length}) ${v.nodes[0]?.target}`), []);
}

test('overview: real release data, connection state, local session label', async () => {
  const p = await page();
  await open(p, '/');
  await p.getByText('Connected', { exact: true }).waitFor();
  assert.equal(await p.getByRole('heading', { level: 1 }).textContent(), 'Overview');
  assert.ok(await p.getByText('Local session', { exact: true }).isVisible());
  const revision = await p.locator('.session .rev').textContent();
  assert.match(revision!, /^[0-9a-f]{8}$/);
  const production = p.locator('.env[data-env="production"]');
  assert.match(await production.locator('.env-count').textContent() ?? '', /4 built here · 6 in discovery/);
  assert.ok(!(await production.textContent())!.includes('Canary draft'), 'drafts are not in production');
  assert.ok(await p.getByText('Nothing. Every release rule passes').isVisible());
  await p.screenshot({ path: join(shots, 'journey-overview.png'), fullPage: true });
  await p.context().close();
});

test('registry: search, filters, sort, external entries and the environment matrix', async () => {
  const p = await page();
  await open(p, '/');
  await p.getByRole('link', { name: 'Experiences' }).click();
  await p.getByRole('heading', { level: 1, name: 'Experiences' }).waitFor();
  const rows = p.locator('table.registry tbody tr');
  assert.equal(await rows.count(), 9);

  await p.getByLabel('Search by name or id').fill('jour');
  assert.deepEqual(await rows.evaluateAll((r) => r.map((x) => x.getAttribute('data-id'))), ['journal']);
  assert.match(await p.getByRole('status').filter({ hasText: 'Showing' }).textContent() ?? '', /Showing 1 of 9/);
  await p.getByLabel('Search by name or id').fill('');

  await p.getByRole('radio', { name: 'Draft' }).check({ force: true });
  assert.deepEqual(await rows.evaluateAll((r) => r.map((x) => x.getAttribute('data-id'))), ['resume', 'canary-draft', 'sample-hostile']);
  assert.match(p.url(), /filter=draft/);
  await p.getByRole('radio', { name: 'External' }).check({ force: true });
  assert.deepEqual(await rows.evaluateAll((r) => r.map((x) => x.getAttribute('data-id'))), ['kawaiui', 'devxray']);
  assert.equal(await rows.first().locator('.kind').textContent(), 'External link');
  assert.match(await rows.first().locator('td[data-env="production"]').innerText(), /■ Linked$/);
  await p.getByRole('radio', { name: 'In production' }).check({ force: true });
  assert.equal(await rows.count(), 6);
  await p.getByRole('radio', { name: 'All' }).check({ force: true });
  await p.getByLabel('Sort by').selectOption('name');
  assert.equal(await rows.first().getAttribute('data-id'), 'canary-draft');
  await p.getByLabel('Search by name or id').fill('nothing-matches');
  assert.ok(await p.getByText('No experience matches').isVisible());
  await p.getByRole('button', { name: 'Show all' }).click();

  // Detail: hosted experience with a flag, then an external one.
  await p.getByRole('link', { name: 'Release lifecycle explorer' }).click();
  await p.getByRole('heading', { level: 1, name: 'Release lifecycle explorer' }).waitFor();
  const matrix = p.locator('table.matrix');
  const row = (env: string) => matrix.locator(`tr[data-env="${env}"]`).innerText();
  assert.match(await row('production'), /^Production\s+■ Yes\s+■ Yes\s+■ Yes\s+inspector off$/);
  assert.match(await row('preview'), /inspector on/);
  await p.screenshot({ path: join(shots, 'journey-detail.png'), fullPage: true });
  await p.goBack();
  await p.getByRole('heading', { level: 1, name: 'Experiences' }).waitFor();
  assert.match(p.url(), /sort=name/, 'Back returns to the same list view');

  await open(p, '/experiences/kawaiui');
  assert.ok(await p.getByText('A separate site, linked from discovery.').isVisible());
  assert.match(await matrix.locator('tr[data-env="production"]').innerText(), /Never \(separate site\)/);
  await open(p, '/experiences/no-such-thing');
  assert.equal(await p.getByRole('heading', { level: 1 }).textContent(), 'No such experience');
  await p.context().close();
});

test('preview, confirm and apply a change; then pending changes and revert to the baseline', async () => {
  const p = await page();
  const writes: string[] = [];
  p.on('request', (r) => { if (r.url().includes('/api/') && ['PATCH', 'POST'].includes(r.method())) writes.push(`${r.method()} ${new URL(r.url()).pathname}`); });
  await open(p, '/experiences/journal');
  await p.getByRole('radio', { name: 'Access' }).check({ force: true });
  await p.getByRole('radio', { name: 'owner' }).check();
  await p.getByRole('button', { name: 'Preview change' }).click();
  const preview = p.locator('.preview');
  await preview.waitFor();
  assert.deepEqual(readFileSync(file), realBytes, 'preview wrote nothing');
  assert.match(await preview.locator('.impact-env[data-env="production"]').innerText(), /Production will no longer include this experience\./);
  assert.equal(await preview.locator('.impact-env[data-env="production"]').getAttribute('data-changed'), 'true');
  assert.match(await preview.locator('.delta-table').innerText(), /Access\s+public\s+owner/);
  await p.screenshot({ path: join(shots, 'journey-preview.png'), fullPage: true });

  // The dialog: Cancel has focus, Escape cancels and nothing is written.
  const applyButton = p.getByRole('button', { name: 'Apply change…' });
  await applyButton.click();
  const dialog = p.getByRole('dialog', { name: 'Write this change for The Orrery Journal?' });
  await dialog.waitFor();
  assert.equal(await p.evaluate(() => document.activeElement?.textContent), 'Cancel');
  assert.match(await dialog.innerText(), /This changes production\./);
  await p.screenshot({ path: join(shots, 'journey-confirm.png') });
  await p.keyboard.press('Escape');
  await dialog.waitFor({ state: 'hidden' });
  assert.equal(await p.evaluate(() => document.activeElement?.textContent), 'Apply change…', 'focus returns to the opener');
  assert.deepEqual(readFileSync(file), realBytes);

  await applyButton.click();
  await dialog.getByRole('button', { name: 'Write to release file' }).click();
  await p.getByText(/^Written\. config\/release\.json is now revision [0-9a-f]{8}\.$/).waitFor();
  assert.equal(release().experiences.journal.access.kind, 'owner');
  assert.equal(writes.filter((w) => w === 'PATCH /api/release').length, 1);
  await p.locator('.matrix tr[data-env="production"]').filter({ hasText: 'No' }).waitFor();
  assert.match(await p.locator('.matrix tr[data-env="production"]').innerText(), /^Production\s+□ No\s+□ No\s+□ No$/);

  // Pending changes: badge, diff, commands exactly as the API gives them.
  assert.match(await p.getByRole('link', { name: /Pending changes/ }).innerText(), /1$/);
  await p.getByRole('link', { name: /Pending changes/ }).click();
  await p.getByRole('heading', { level: 1, name: 'Pending changes' }).waitFor();
  assert.match(await p.locator('.delta-table').innerText(), /Access\s+public\s+owner/);
  assert.equal(await p.locator('pre code').innerText(), 'git add config/release.json\ngit commit -m "Release: update journal"');
  assert.ok(await p.getByText('This is not git status', { exact: false }).isVisible());
  await p.screenshot({ path: join(shots, 'journey-pending-changed.png'), fullPage: true });

  await p.getByRole('button', { name: 'Restore baseline…' }).click();
  const revert = p.getByRole('dialog', { name: 'Restore the session baseline?' });
  await revert.getByRole('button', { name: 'Cancel' }).click();
  assert.equal(release().experiences.journal.access.kind, 'owner', 'cancel restores nothing');
  await p.getByRole('button', { name: 'Restore baseline…' }).click();
  await revert.getByRole('button', { name: 'Restore baseline' }).click();
  await p.getByText(/Baseline restored\./).waitFor();
  assert.deepEqual(readFileSync(file), realBytes);
  assert.ok(await p.getByText('No changes: the release file holds the same release state').isVisible());
  await open(p, '/experiences/journal');
  assert.match(await p.locator('.matrix tr[data-env="production"]').innerText(), /^Production\s+■ Yes\s+■ Yes\s+■ Yes$/);
  await p.context().close();
});

test('a stale revision is shown, never retried, and the editor’s change survives', async () => {
  const p = await page();
  const patches: string[] = [];
  p.on('request', (r) => { if (r.method() === 'PATCH') patches.push(r.url()); });
  await open(p, '/release?experience=sample-content');
  await p.getByRole('radio', { name: 'Discoverability' }).check({ force: true });
  await p.getByRole('button', { name: 'Preview change' }).click();
  await p.locator('.preview').waitFor();
  // Meanwhile the owner edits the file in an editor.
  const edited = realBytes.toString().replace('"Permanent leak', '"Edited in an editor. Permanent leak');
  writeFileSync(file, edited);
  await p.getByRole('button', { name: 'Apply change…' }).click();
  await p.getByRole('button', { name: 'Write to release file' }).click();
  const alert = p.getByRole('alert').filter({ hasText: 'Nothing was written: the release file changed after it was loaded.' });
  await alert.waitFor();
  assert.equal(patches.length, 1, 'no automatic retry');
  assert.equal(readFileSync(file, 'utf8'), edited);
  await p.screenshot({ path: join(shots, 'journey-stale.png'), fullPage: true });
  await alert.getByRole('button', { name: 'Load latest state' }).click();
  await alert.waitFor({ state: 'detached' });
  assert.equal(patches.length, 1);
  assert.equal(readFileSync(file, 'utf8'), edited);
  await p.context().close();
});

test('rule violations are shown at the controls and cannot be applied', async () => {
  const p = await page();
  await open(p, '/experiences/canary-draft');
  // draft → alpha (owner access) is valid…
  await p.getByRole('radio', { name: /alpha/ }).check();
  await p.getByRole('button', { name: 'Preview change' }).click();
  await p.getByRole('button', { name: 'Apply change…' }).click();
  assert.match(await p.getByRole('dialog').innerText(), /Production is not affected\./);
  await p.getByRole('button', { name: 'Write to release file' }).click();
  await p.getByText(/^Written\./).waitFor();
  // …but an alpha with public access breaks a release rule.
  await p.getByRole('radio', { name: 'Access' }).check({ force: true });
  await p.getByRole('radio', { name: 'public' }).check();
  await p.getByRole('button', { name: 'Preview change' }).click();
  await p.locator('.preview').waitFor();
  const issues = p.locator('.field-issues');
  assert.match(await issues.innerText(), /alpha-non-public/);
  assert.equal(await p.locator('fieldset.choice').getAttribute('aria-describedby'), 'issues-canary-draft');
  assert.ok(await p.getByRole('button', { name: 'Apply change…' }).isDisabled());
  assert.equal(release().experiences['canary-draft'].access.kind, 'owner');
  await p.context().close();
});

test('an edit made outside the Control Center is picked up by polling', async () => {
  const p = await page();
  await open(p, '/pending');
  writeFileSync(file, realBytes.toString().replace('"Permanent leak', '"Edited. Permanent leak'));
  await p.locator('.delta-table').waitFor({ timeout: 12_000 });
  assert.match(await p.locator('.delta-table').innerText(), /Note/);
  await p.context().close();
});

test('keyboard: skip link, navigation, focus lands on each screen’s heading', async () => {
  const p = await page();
  await open(p, '/');
  await p.keyboard.press('Tab');
  assert.equal(await p.evaluate(() => document.activeElement?.textContent), 'Skip to content');
  const ring = await p.evaluate(() => getComputedStyle(document.activeElement!).outlineStyle);
  assert.equal(ring, 'solid');
  await p.keyboard.press('Tab'); // brand
  await p.keyboard.press('Tab'); // Overview
  await p.keyboard.press('Tab'); // Experiences
  assert.equal(await p.evaluate(() => document.activeElement?.textContent), 'Experiences');
  await p.keyboard.press('Enter');
  await p.getByRole('heading', { level: 1, name: 'Experiences' }).waitFor();
  assert.equal(await p.evaluate(() => document.activeElement?.tagName), 'H1');
  assert.equal(await p.title(), 'Experiences · Orrery Control Center');
  await p.context().close();
});

test('the session stays out of reach of page scripts and storage', async () => {
  const p = await page();
  await open(p, '/');
  assert.equal(await p.evaluate(() => document.cookie), '');
  assert.equal(await p.evaluate(() => localStorage.length + sessionStorage.length), 0);
  assert.ok(!p.url().includes('token'));
  const cookies = await p.context().cookies();
  assert.deepEqual(cookies.map((c) => [c.name, c.httpOnly, c.sameSite, c.path]), [['pu_control_session', true, 'Strict', '/api']]);
  assert.ok(!apiLog.join('\n').includes(cookies[0]!.value), 'the token is not in the server log');
  await p.context().close();
});

test('the UI server adds no CORS, sends a strict CSP, and the proxy keeps the API’s Origin check', async () => {
  const page = await fetch(base, { headers: { origin: 'http://localhost:9999' } });
  assert.match(page.headers.get('content-security-policy')!, /script-src 'self';/);
  assert.equal(page.headers.get('access-control-allow-origin'), null);
  const preflight = await fetch(`${base}/api/release`, { method: 'OPTIONS', headers: { origin: 'http://localhost:9999', 'access-control-request-method': 'PATCH' } });
  assert.equal(preflight.status, 403);
  assert.equal(preflight.headers.get('access-control-allow-origin'), null);
  const forged = await fetch(`${base}/api/session`, { method: 'POST', headers: { origin: 'https://evil.example', 'content-type': 'application/json' }, body: '{}' });
  assert.equal(forged.status, 403);
  assert.equal(forged.headers.get('set-cookie'), null);
});

test('axe: every screen, desktop and mobile, light and dark; no horizontal overflow on phones', async () => {
  for (const [name, opts] of Object.entries(VIEWPORTS)) {
    for (const scheme of ['light', 'dark'] as const) {
      const p = await page(opts, scheme);
      for (const path of ['/', '/experiences', '/experiences/sample-app', '/experiences/kawaiui', '/release?experience=journal', '/pending']) {
        await open(p, path);
        await axe(p, `${name} ${scheme} ${path}`);
        if (name === 'mobile') {
          assert.ok(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${path}: no horizontal scroll on ${name}`);
        }
        if (scheme === 'light') await p.screenshot({ path: join(shots, `${path.replace(/[^a-z]+/g, '-').replace(/^-|-$/g, '') || 'overview'}-${name}.png`), fullPage: true });
      }
      // The open preview and its dialog, too.
      await open(p, '/release?experience=journal');
      await p.getByRole('button', { name: 'Preview change' }).click();
      await p.locator('.preview').waitFor();
      await axe(p, `${name} ${scheme} preview`);
      await p.getByRole('button', { name: 'Apply change…' }).click();
      await p.getByRole('dialog').waitFor();
      await axe(p, `${name} ${scheme} dialog`);
      await p.context().close();
    }
  }
});

test('server unavailable: a clear screen with the start command, and recovery', async () => {
  await api!.close();
  api = null;
  const p = await page();
  await p.goto(base);
  await p.getByRole('heading', { level: 1, name: 'Server not responding' }).waitFor();
  assert.ok(await p.getByText('pnpm control', { exact: true }).isVisible());
  await axe(p, 'unavailable');
  await p.screenshot({ path: join(shots, 'journey-unavailable.png') });
  await startApi();
  await p.getByRole('button', { name: 'Try again' }).click();
  await p.getByRole('heading', { level: 1, name: 'Overview' }).waitFor();
  await p.context().close();
});
