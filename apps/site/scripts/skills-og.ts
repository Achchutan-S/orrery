// Regenerates the Skills Archive's link-preview card (1200×630):
//   pnpm --filter @pu/site skills:og
// An arched window over a shelf of artefacts, drawn here as SVG and screenshotted with Chromium
// (Playwright, already a dev dependency). No network. Served by skills/routes/og.ts.
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const out = fileURLToPath(new URL('../src/experiences/skills/assets/og.png', import.meta.url));
const books = [
  ['#2f5a3c', 150, 34], ['#ecdcb0', 128, 40], ['#b98d5a', 140, 30], ['#1f4f86', 160, 36], ['#c9cf9e', 120, 44],
  ['#244a3b', 150, 32], ['#1d2b4f', 166, 38], ['#9b6a3c', 138, 34], ['#d9b56b', 110, 46], ['#5b1f1a', 172, 40],
] as const;
let x = 650;
const spines = books.map(([c, h, w]) => { const s = `<rect x="${x}" y="${470 - h}" width="${w}" height="${h}" rx="3" fill="${c}"/><rect x="${x}" y="${478 - h}" width="${w}" height="4" fill="rgba(240,210,140,.55)"/>`; x += w + 6; return s; }).join('');
const card = `<!doctype html><html><head><meta charset="utf-8"><style>
  * { margin: 0; box-sizing: border-box; }
  body { width: 1200px; height: 630px; background: #f2e9d4; color: #2a2116; font-family: 'Hoefler Text', Baskerville, 'Iowan Old Style', Palatino, Georgia, serif; position: relative; overflow: hidden; }
  svg { position: absolute; inset: 0; }
  .text { position: absolute; left: 80px; top: 92px; width: 520px; }
  .eyebrow { font: 600 22px/1 ui-monospace, Menlo, monospace; letter-spacing: .18em; text-transform: uppercase; color: #5a4b37; }
  h1 { font-size: 92px; line-height: .98; font-weight: 600; margin-top: 26px; letter-spacing: -.01em; }
  h1 span { display: block; font-size: 46px; font-style: italic; font-weight: 400; color: #4d6a37; margin-bottom: 8px; }
  p { font-size: 30px; line-height: 1.3; color: #5a4b37; margin-top: 26px; }
  footer { position: absolute; left: 80px; bottom: 56px; font: 24px ui-monospace, Menlo, monospace; color: #5a4b37; }
</style></head><body>
<svg viewBox="0 0 1200 630" width="1200" height="630">
  <defs><linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#8fbfd9"/><stop offset=".7" stop-color="#cfe3e6"/><stop offset="1" stop-color="#f4ecd2"/></linearGradient>
  <linearGradient id="shaft" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff6d8" stop-opacity=".7"/><stop offset="1" stop-color="#fff6d8" stop-opacity="0"/></linearGradient>
  <clipPath id="w"><path d="M720 400 V170 A150 150 0 0 1 1020 170 V400 Z"/></clipPath></defs>
  <g clip-path="url(#w)"><rect x="700" y="0" width="340" height="420" fill="url(#sky)"/><circle cx="820" cy="140" r="34" fill="#fff3c4"/>
    <path d="M700 330 Q800 290 900 316 T1040 300 V420 H700Z" fill="#9db8a4"/><path d="M700 360 Q830 340 1040 356 V420 H700Z" fill="#5f8a5c"/></g>
  <path d="M720 400 V170 A150 150 0 0 1 1020 170 V400 Z" fill="none" stroke="#6e4526" stroke-width="16"/>
  <line x1="870" y1="20" x2="870" y2="400" stroke="#6e4526" stroke-width="7"/><line x1="720" y1="250" x2="1020" y2="250" stroke="#6e4526" stroke-width="7"/>
  <polygon points="728,402 1012,402 1200,630 800,630" fill="url(#shaft)"/>
  ${spines}
  <rect x="630" y="470" width="570" height="22" fill="#4a2d17"/><rect x="630" y="492" width="570" height="138" fill="#6e4526"/>
  <g fill="#5b8a3c"><ellipse cx="1150" cy="300" rx="16" ry="6" transform="rotate(-30 1150 300)"/><ellipse cx="1166" cy="330" rx="16" ry="6" transform="rotate(35 1166 330)"/><ellipse cx="1146" cy="360" rx="15" ry="6" transform="rotate(-40 1146 360)"/><ellipse cx="1162" cy="392" rx="15" ry="6" transform="rotate(30 1162 392)"/></g>
  <path d="M1158 250 L1150 300 L1166 330 L1146 360 L1162 392" fill="none" stroke="#4a6a2c" stroke-width="3"/>
</svg>
<div class="text"><div class="eyebrow">A reading room in Orrery</div><h1><span>The Claude</span>Skills Archive</h1><p>Skills I’ve created for Claude, with their original instructions to read, copy and download.</p></div>
<footer>5 volumes · originals to copy and download</footer>
</body></html>`;

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1200, height: 630 } });
await page.setContent(card);
await page.screenshot({ path: out });
await browser.close();
console.log(`wrote ${out}`);
