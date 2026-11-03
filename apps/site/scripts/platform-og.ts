// Regenerates the platform's default link-preview image, public/og.png (ADR-022):
//   pnpm --filter @pu/site og:platform
// A 1200×630 card in the platform's own font and colours (docs/design/platform-identity.md),
// screenshotted with Chromium (Playwright, already a dev dependency). No network. It names
// nothing but the site, so it is safe in every build; an experience with its own image sets
// the catalog's ogImage instead.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const root = fileURLToPath(new URL('../', import.meta.url));
const font = readFileSync(`${root}src/platform/fonts/atkinson-hyperlegible-next-latin.woff2`).toString('base64');
const mark = readFileSync(`${root}public/favicon.svg`, 'utf8').replace(/<style>.*<\/style>/, '');

const card = `<!doctype html><html><head><meta charset="utf-8"><style>
  @font-face { font-family: Card; src: url(data:font/woff2;base64,${font}) format('woff2'); font-weight: 400 700; }
  * { margin: 0; box-sizing: border-box; }
  body { width: 1200px; height: 630px; background: #eef2ef; color: #17201d; font-family: Card, sans-serif;
    display: grid; grid-template-rows: 1fr auto; padding: 72px 96px 64px; gap: 40px; }
  main { align-self: center; }
  svg { width: 80px; height: 80px; } g { fill: #1f6656; stroke: #1f6656; }
  h1 { font-size: 128px; font-weight: 700; line-height: 1; letter-spacing: -0.02em; margin-top: 28px; }
  p { font-size: 40px; color: #4f5b57; margin-top: 24px; max-width: 22em; }
  footer { border-top: 3px solid #c3cdc8; padding-top: 24px; font-size: 30px; color: #4f5b57; }
</style></head><body>
  <main>${mark}<h1>Orrery</h1><p>Writing, projects and interactive experiences, each in its own design.</p></main>
  <footer>A personal universe</footer>
</body></html>`;

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1200, height: 630 } });
await page.setContent(card);
await page.evaluate(() => document.fonts.ready);
await page.screenshot({ path: `${root}public/og.png` });
await browser.close();
console.log('wrote public/og.png');
