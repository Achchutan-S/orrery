// Review captures for one experience (docs/design/creative-process.md § Evidence):
//   pnpm capture <id> [--label slice-1] [--url https://preview.example --paths /x,/x/y]
// Builds the preview output (drafts included), serves it, and photographs every page of the
// experience at four widths, in each colour scheme it offers, with motion on and reduced: the
// first viewport and the full page. Writes PNGs and a contact sheet (index.html) to
// apps/site/test-results/capture/<id>/<label>/, which Git ignores. With --url it photographs a
// deployment instead (for example a branch's Vercel preview) at the given paths.
// These are aids for a person's design review, not proof: WebGL runs on a software renderer here.
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { preview } from 'astro';
import { chromium } from 'playwright';
import { parseCatalog } from '@pu/experience-catalog';
import { ownerOf, pagePath } from '@pu/checks/routes';

export const WIDTHS = [360, 768, 1280, 1920] as const;
export type Shot = { width: number; scheme: 'light' | 'dark'; motion: 'motion' | 'reduced' };

/** Every combination to photograph for an experience with this catalog `colorScheme`. */
export function captureMatrix(colorScheme: 'light' | 'dark' | 'light-dark' | 'custom'): Shot[] {
  const schemes = colorScheme === 'light' || colorScheme === 'dark' ? [colorScheme] as const : ['light', 'dark'] as const;
  return WIDTHS.flatMap((width) => schemes.flatMap((scheme) => (['motion', 'reduced'] as const).map((motion) => ({ width, scheme, motion }))));
}

export const shotName = (path: string, s: Shot, part: 'first' | 'full'): string =>
  `${path === '/' ? 'index' : path.slice(1).replace(/[^a-z0-9]+/gi, '_')}-${s.width}-${s.scheme}-${s.motion}-${part}.png`;

/** The contact sheet: one section per page, one row per width, every capture side by side. */
export function contactSheet(id: string, label: string, paths: readonly string[], shots: readonly Shot[]): string {
  const cell = (path: string, s: Shot) => `<figure><a href="${shotName(path, s, 'full')}"><img src="${shotName(path, s, 'first')}" alt="${path} at ${s.width}px, ${s.scheme}, ${s.motion}: first viewport" loading="lazy"></a><figcaption>${s.width}px · ${s.scheme} · ${s.motion} (click: full page)</figcaption></figure>`;
  const page = (path: string) => `<section><h2>${path}</h2>${WIDTHS.map((w) => `<div class="row">${shots.filter((s) => s.width === w).map((s) => cell(path, s)).join('')}</div>`).join('')}</section>`;
  return `<!doctype html><html lang="en"><meta charset="utf-8"><title>${id} · ${label} · review captures</title>
<style>body{font:14px/1.4 system-ui,sans-serif;margin:1.5rem;background:#1b1b1b;color:#eee}h2{margin:2.5rem 0 .5rem;font-size:1rem}.row{display:flex;gap:1rem;align-items:flex-start;overflow-x:auto;margin-bottom:1rem}figure{margin:0;flex:none}img{display:block;max-height:70vh;max-width:none;border:1px solid #444}figcaption{font-size:12px;color:#aaa;margin-top:.25rem}a{color:inherit}</style>
<h1>${id} · ${label}</h1><p>Captured ${new Date().toISOString()}. Review against the experience's direction record in docs/design/registry/. Software-rendered: judge composition, type and colour here, and motion and WebGL on a real device.</p>
${paths.map(page).join('\n')}</html>`;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  const opt = (name: string) => { const i = args.indexOf(`--${name}`); return i === -1 ? undefined : args[i + 1]; };
  const id = args.find((a, i) => !a.startsWith('--') && !args[i - 1]?.startsWith('--'));
  const { experiences } = parseCatalog();
  const experience = experiences.find((e) => e.id === id);
  const url = opt('url');
  if (!id || (!url && experience?.kind !== 'internal')) {
    console.error(`usage: pnpm capture <id> [--label name] [--url <deployment> --paths /a,/b]\ninternal experiences: ${experiences.filter((e) => e.kind === 'internal').map((e) => e.id).join(', ')}`);
    process.exit(2);
  }
  const root = fileURLToPath(new URL('../', import.meta.url));
  const label = opt('label') ?? 'latest';
  const out = join(root, 'test-results', 'capture', id, label);
  rmSync(out, { recursive: true, force: true });
  mkdirSync(out, { recursive: true });

  let base = url?.replace(/\/$/, '');
  let paths = opt('paths')?.split(',') ?? [];
  let stop = async () => {};
  if (!base) {
    const outDir = mkdtempSync(join(tmpdir(), 'pu-capture-'));
    const r = spawnSync(process.execPath, [join(root, 'node_modules/astro/bin/astro.mjs'), 'build', '--outDir', outDir], { cwd: root, encoding: 'utf8', env: { ...process.env, VERCEL_ENV: 'preview' } });
    if (r.status !== 0) { console.error(r.stdout + r.stderr); process.exit(1); }
    const server = await preview({ root, outDir, logLevel: 'error', server: { port: 0 } });
    base = `http://localhost:${server.port}`;
    stop = async () => { await server.stop(); rmSync(outDir, { recursive: true, force: true }); };
    if (paths.length === 0) {
      paths = readdirSync(outDir, { recursive: true }).map((f) => String(f).split(sep).join('/'))
        .filter((f) => f.endsWith('.html') && ownerOf(f, experiences)?.id === id).sort().map(pagePath);
    }
  }
  if (paths.length === 0) { console.error('no pages to capture: pass --paths with --url'); await stop(); process.exit(2); }

  const shots = captureMatrix(experience?.kind === 'internal' ? experience.colorScheme : 'light-dark');
  const browser = await chromium.launch();
  for (const s of shots) {
    const context = await browser.newContext({ viewport: { width: s.width, height: s.width < 600 ? 740 : 900 }, colorScheme: s.scheme, reducedMotion: s.motion === 'reduced' ? 'reduce' : 'no-preference', isMobile: s.width < 600, hasTouch: s.width < 600 });
    const page = await context.newPage();
    for (const path of paths) {
      await page.goto(base + path, { waitUntil: 'load' });
      await page.waitForTimeout(1500); // entrances and the first frames of a scene
      await page.screenshot({ path: join(out, shotName(path, s, 'first')) });
      await page.screenshot({ path: join(out, shotName(path, s, 'full')), fullPage: true });
    }
    await context.close();
  }
  await browser.close();
  await stop();
  writeFileSync(join(out, 'index.html'), contactSheet(id, label, paths, shots));
  console.log(`✔ capture: ${paths.length} page(s) × ${shots.length} settings → ${join(out, 'index.html')}`);
}
