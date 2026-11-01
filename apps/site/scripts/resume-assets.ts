// Regenerates the resume's PDF and link-preview image from the page itself:
//   pnpm --filter @pu/site resume:assets
// Builds the site as a preview (where the draft resume is mounted), serves it, prints /resume to
// A4 with Chromium (Playwright, already a dev dependency) and screenshots a 1200×630 card set in
// the same font. Writes src/experiences/resume/assets/{resume.pdf,og.png,source.sha256}.
// No network, no external service. Re-run after every change to content.ts; a test fails until you do.
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { preview } from 'astro';
import { chromium } from 'playwright';
import { resume } from '../src/experiences/resume/content.ts';

const root = fileURLToPath(new URL('../', import.meta.url));
const assets = join(root, 'src/experiences/resume/assets');
const content = join(root, 'src/experiences/resume/content.ts');

/** The SHA-256 of content.ts, recorded beside the assets so a test can tell when they are stale. */
export const contentHash = () => createHash('sha256').update(readFileSync(content)).digest('hex');

const escape = (s: string) => s.replace(/[&<>"]/g, (c) => `&#${c.charCodeAt(0)};`);

/** The link-preview card: name, role, what the page holds, and where it lives. */
function card(fontUrl: string): string {
  return `<!doctype html><html><head><meta charset="utf-8"><style>
    @font-face { font-family: Card; src: url(${fontUrl}) format('woff2'); font-weight: 400 700; }
    * { margin: 0; box-sizing: border-box; }
    body { width: 1200px; height: 630px; background: #fbfaf6; color: #14171a; font-family: Card, sans-serif;
      display: grid; grid-template-rows: auto 1fr auto; padding: 64px 80px; border-top: 14px solid #1d4e89; }
    .mark { display: flex; align-items: center; gap: 14px; font-size: 30px; font-weight: 700; }
    .mark svg { width: 40px; height: 40px; fill: #1d4e89; stroke: #1d4e89; stroke-width: 1.5; }
    main { align-self: center; }
    .kicker { color: #1d4e89; font-size: 30px; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase; }
    h1 { font-size: 112px; line-height: 1; letter-spacing: -0.02em; margin-top: 18px; }
    .role { font-size: 44px; color: #50565c; margin-top: 18px; }
    footer { display: flex; justify-content: space-between; font-size: 28px; color: #50565c; border-top: 2px solid #14171a; padding-top: 22px; }
  </style></head><body>
    <div class="mark"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><circle cx="12" cy="12" r="9" fill="none"/><circle cx="19.8" cy="7.5" r="1.8"/></svg>Orrery</div>
    <main><p class="kicker">Resume</p><h1>${escape(resume.name)}</h1><p class="role">${escape(resume.role)}</p></main>
    <footer><span>Experience · Projects · Skills · Education</span><span>PDF available</span></footer>
  </body></html>`;
}

async function main() {
  // The page imports the assets, so they must exist (even empty) before the first build.
  for (const f of ['resume.pdf', 'og.png']) if (!existsSync(join(assets, f))) writeFileSync(join(assets, f), '');

  const tmp = mkdtempSync(join(tmpdir(), 'pu-resume-'));
  const outDir = join(tmp, 'dist');
  const built = spawnSync(process.execPath, [join(root, 'node_modules/astro/bin/astro.mjs'), 'build', '--outDir', outDir], {
    cwd: root, encoding: 'utf8', env: { ...process.env, VERCEL_ENV: 'preview', PU_DEPLOYMENT: '' },
  });
  if (built.status !== 0) throw new Error(`build failed:\n${built.stdout}${built.stderr}`);

  const server = await preview({ root, outDir, logLevel: 'error', server: { port: 0 } });
  const browser = await chromium.launch();
  try {
    const base = `http://localhost:${server.port}`;
    const page = await browser.newPage();
    await page.goto(`${base}/resume`, { waitUntil: 'networkidle' });
    await page.evaluate(() => document.fonts.ready);
    await page.emulateMedia({ media: 'print', colorScheme: 'light' });
    const pdf = await page.pdf({ format: 'A4', preferCSSPageSize: true, printBackground: true, tagged: true, outline: true });
    writeFileSync(join(assets, 'resume.pdf'), pdf);

    const font = await page.locator('link[rel="preload"][as="font"]').first().getAttribute('href');
    if (!font) throw new Error('no preloaded font on /resume');
    await page.emulateMedia({ media: 'screen' });
    await page.setViewportSize({ width: 1200, height: 630 });
    // Served on the preview's own origin (so the font loads) but not from the site, so the
    // card's inline styles are not subject to the site's CSP. Nothing of it is in the build.
    await page.route('**/__resume-og-card', (r) => r.fulfill({ contentType: 'text/html; charset=utf-8', body: card(font) }));
    await page.goto(`${base}/__resume-og-card`, { waitUntil: 'networkidle' });
    await page.evaluate(() => document.fonts.ready);
    writeFileSync(join(assets, 'og.png'), await page.screenshot({ type: 'png' }));

    writeFileSync(join(assets, 'source.sha256'), `${contentHash()}\n`);
    console.log(`resume.pdf ${Math.round(pdf.length / 1024)} KB, og.png 1200×630, from content.ts ${contentHash().slice(0, 12)}`);
  } finally {
    await browser.close();
    await server.stop();
    rmSync(tmp, { recursive: true, force: true });
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) await main();
