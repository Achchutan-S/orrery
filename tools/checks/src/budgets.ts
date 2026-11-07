// Per-class performance budgets (blueprint 3.12), measured on build output:
//   pnpm build:production && pnpm check:budgets
//
// Units: every size is gzip level 9 bytes; 1 KB = 1024 bytes. Raw and brotli sizes are
// never mixed in. Fonts are gzipped too (woff2 barely shrinks), so one unit covers all.
//
// Accounting, per page = what a first visit to that page downloads before interaction:
//   js        inline <script> + every /_astro/*.js the page references, plus the chunks
//             those import statically (`import ... from "./x.js"`). Island components
//             count in full (conservative). The Beacon's script is counted in `beacon`.
//   beacon    the Beacon and palette script (blueprint 3.12: its own 15 KB budget, on every
//             page that shows it). Recognised by BEACON_MARKER, inline or as a file.
//   css       inline <style> + referenced .css files.
//   fonts     referenced font files (preload links, @font-face URLs inline or inside CSS).
//   images    images the page loads: <img src|srcset>, <source srcset>, <link rel="icon">,
//             and url() in its CSS. Every <img> must also declare width and height (CLS).
//   lazy      the largest chunk loaded later by dynamic import("./x.js"), with its own static
//             imports, minus what the page already loaded (blueprint 3.12: 100 KB lazy chunks).
//   transfer  the HTML document (inline JS/CSS included once) + external js, css, fonts, images.
// Each file counts once per page. A chunk shared by two pages counts on both, because a
// first visit to either downloads it. A file a page references but the build did not emit
// is a finding.
//
// Files no page loads (link-preview images, PDFs) have their own limits in FILE_BUDGETS; any
// other emitted file that no page loads is a finding, so nothing ships unmeasured.
//
// Attribution: a page belongs to the experience whose route produced it; index.html and
// 404.html belong to the platform. Astro's output does not say which experience a shared
// chunk "belongs" to, so per-experience JS is reported per page, not split by owner.
import type { Experience } from '@pu/platform-schema';
import { posix } from 'node:path';
import { ownerOf, productionOwners } from './routes.ts';
import { distArg, gzipBytes, isMain, loadPlatform, readDist, report, type DistFile, type Finding } from './repo.ts';

export type Metric = 'js' | 'beacon' | 'css' | 'fonts' | 'images' | 'lazy' | 'transfer';
export const METRICS: readonly Metric[] = ['js', 'beacon', 'css', 'fonts', 'images', 'lazy', 'transfer'];

/** A string only the Beacon's script contains: the selector of its palette template. */
export const BEACON_MARKER = 'pu-palette-template';
export type BudgetClass = 'platform' | 'content' | 'interactive' | 'immersive';

/**
 * THE budget table. KB, gzip. Sources:
 * - js and css for content, interactive, immersive: blueprint 3.12 (content 0 KB JS).
 * - beacon 15 KB on every page: the blueprint's Beacon and palette budget. Platform pages (404)
 *   run no other script, so their js budget is 0.
 * - fonts and transfer are not in the blueprint. Set from the 1 November 2026 build:
 *   platform pages measure ~36 KB (one 33 KB font); an interactive view ~75 KB
 *   (React 64 KB). Content and interactive allow three ~35 KB font files; transfer =
 *   js + css + fonts + ~20 KB of HTML, rounded.
 * - lazy: blueprint 3.12 ("lazy chunks of 100 KB at most") for interactive; content and
 *   platform pages ship no JavaScript of their own, so nothing lazy either; immersive loads
 *   heavy assets after first paint within its declared transfer cap (blueprint default 8 MB).
 * - images: not in the blueprint, and no page has an image yet besides the 0.3 KB favicon.
 *   Provisional, conservative caps (7 November 2026, audit F13): 10 KB for platform pages
 *   (icons only), 100 KB for a content or interactive page, 250 KB for immersive. Revisit
 *   with the first real image (blueprint: through astro:assets).
 * An experience may raise its own limits with `budgetOverrides` in its catalog entry.
 */
export const BUDGETS: Record<BudgetClass, Record<Metric, number>> = {
  platform: { js: 0, beacon: 15, css: 30, fonts: 60, images: 10, lazy: 0, transfer: 120 },
  content: { js: 0, beacon: 15, css: 30, fonts: 110, images: 100, lazy: 0, transfer: 160 },
  interactive: { js: 150, beacon: 15, css: 50, fonts: 110, images: 100, lazy: 100, transfer: 330 },
  immersive: { js: 250, beacon: 15, css: 50, fonts: 110, images: 250, lazy: 8192, transfer: 430 },
};

/**
 * Emitted files no page loads, by kind: KB gzip, like everything else (PNG and PDF barely
 * shrink, so this is close to their size on disk). Measured 7 November 2026: og.png 41 KB,
 * resume/og.png 53 KB, resume/resume.pdf 211 KB.
 */
export const FILE_BUDGETS: { kind: string; kb: number; why: string; matches: (path: string, ogImages: ReadonlySet<string>) => boolean }[] = [
  { kind: 'link-preview image', kb: 150, why: 'fetched by link-preview crawlers, never by a page; about three times the generated 1200×630 cards', matches: (p, og) => og.has(p) },
  { kind: 'document', kb: 400, why: 'a download the reader asks for (the resume PDF); about twice its size today', matches: (p) => p.endsWith('.pdf') },
];

const FONT = /\.(woff2?|ttf|otf)$/;
const IMAGE = /\.(png|jpe?g|gif|webp|avif|svg|ico)$/;

export type PageSize = { page: string; owner: string; budgetClass: BudgetClass } & Record<Metric, number>;
export type PageLoad = Record<Metric, number> & { files: string[]; missing: string[]; unsized: number };

/** A same-site URL as a dist path ('/a/b.png' from '/x/y.css' or 'b.png' from 'x/y.css'); undefined for data:, http:, //. */
function localPath(url: string, from: string): string | undefined {
  const u = url.trim().replace(/^['"]|['"]$/g, '').split(/[?#]/)[0]!;
  if (!u || /^(?:[a-z][a-z0-9+.-]*:|\/\/|#)/i.test(u)) return undefined;
  const path = u.startsWith('/') ? u.slice(1) : posix.join(posix.dirname(from), u);
  try { return decodeURIComponent(posix.normalize(path)); } catch { return path; }
}
const attr = (tag: string, name: string) => tag.match(new RegExp(`\\s${name}="([^"]*)"`))?.[1];
const srcsetUrls = (v: string | undefined) => (v ?? '').split(',').map((c) => c.trim().split(/\s+/)[0]!).filter(Boolean);

/** Measures one page's initial load (and its largest lazy chunk) in gzip bytes. */
export function measurePage(html: DistFile, byPath: Map<string, DistFile>): PageLoad {
  const text = html.text ?? '';
  const inlineAll = (tag: string) => [...text.matchAll(new RegExp(`<${tag}(?![^>]*\\ssrc=)[^>]*>([^]*?)</${tag}>`, 'g'))].map((m) => m[1]!);
  const inline = (tag: string) => inlineAll(tag).join('\n');
  const isBeacon = (code: string) => code.includes(BEACON_MARKER);
  const files = new Set<string>();
  const missing = new Set<string>();
  const lazyRoots = new Set<string>();
  const cssUrls = (css: string, from: string) => [...css.matchAll(/url\(\s*([^)]+?)\s*\)/g)].map((m) => localPath(m[1]!, from)).filter((p): p is string => p !== undefined);
  const visit = (path: string, into: Set<string> = files) => {
    if (into.has(path)) return;
    if (!byPath.has(path)) { missing.add(path); return; }
    into.add(path);
    const body = byPath.get(path)!.text ?? '';
    if (path.endsWith('.js')) {
      const dir = path.slice(0, path.lastIndexOf('/') + 1);
      // Static imports load now: `import"./a.js"`, `from"./a.js"`. import("./a.js") loads later.
      for (const m of body.matchAll(/(?:\bfrom|\bimport)\s*["'](\.\/[^"']+)["']/g)) visit(dir + m[1]!.slice(2), into);
      for (const m of body.matchAll(/\bimport\(\s*["'](\.\/[^"']+)["']\s*\)/g)) lazyRoots.add(dir + m[1]!.slice(2));
    }
    // Fonts and images a stylesheet pulls in load with it.
    if (path.endsWith('.css')) for (const p of cssUrls(body, path)) visit(p, into);
  };
  for (const m of text.matchAll(/\/(_astro\/[^"')\s]+)/g)) visit(m[1]!);
  for (const p of cssUrls(inline('style'), html.path)) visit(p);
  const unsized = [...text.matchAll(/<img\b[^>]*>/g)].filter((m) => !attr(m[0], 'width') || !attr(m[0], 'height')).length;
  for (const tag of text.match(/<(?:img|source|link)\b[^>]*>/g) ?? []) {
    const urls = tag.startsWith('<link') ? (/\srel="[^"]*\bicon\b/.test(tag) ? [attr(tag, 'href')] : []) : [attr(tag, 'src'), ...srcsetUrls(attr(tag, 'srcset'))];
    for (const u of urls) { const p = u && localPath(u, html.path); if (p && IMAGE.test(p)) visit(p); }
  }
  // Each lazy chunk with its own static imports, minus what the page already has.
  let lazy = 0;
  for (const root of lazyRoots) {
    if (files.has(root)) continue;
    const later = new Set<string>();
    visit(root, later);
    lazy = Math.max(lazy, [...later].filter((p) => !files.has(p)).reduce((n, p) => n + gzipBytes(byPath.get(p)!.bytes), 0));
  }
  const sum = (pred: (p: string) => boolean) =>
    [...files].filter(pred).reduce((n, p) => n + gzipBytes(byPath.get(p)!.bytes), 0);
  const scripts = inlineAll('script');
  const beaconFile = (p: string) => p.endsWith('.js') && isBeacon(byPath.get(p)!.text ?? '');
  const js = gzipBytes(scripts.filter((c) => !isBeacon(c)).join('\n')) + sum((p) => p.endsWith('.js') && !beaconFile(p));
  const beacon = gzipBytes(scripts.filter(isBeacon).join('\n')) + sum(beaconFile);
  const css = gzipBytes(inline('style')) + sum((p) => p.endsWith('.css'));
  const fonts = sum((p) => FONT.test(p));
  const images = sum((p) => IMAGE.test(p));
  const transfer = gzipBytes(html.bytes) + sum((p) => p.endsWith('.js') || p.endsWith('.css') || FONT.test(p) || IMAGE.test(p));
  return { js, beacon, css, fonts, images, lazy, transfer, files: [...files], missing: [...missing], unsized };
}

export function measure(files: DistFile[], experiences: readonly Experience[]): (PageSize & PageLoad)[] {
  const byPath = new Map(files.map((f) => [f.path, f]));
  return files.filter((f) => f.path.endsWith('.html')).map((f) => {
    const e = ownerOf(f.path, experiences);
    const budgetClass: BudgetClass = e?.kind === 'internal' ? e.performanceClass : 'platform';
    return { page: f.path, owner: e?.id ?? 'platform', budgetClass, ...measurePage(f, byPath) };
  });
}

/**
 * Everything emitted is accounted for: what pages reference exists, every <img> has
 * dimensions, and every file no page loads is within its FILE_BUDGETS limit or reported.
 */
export function fileFindings(files: DistFile[], pages: readonly (PageSize & PageLoad)[], experiences: readonly Experience[]): Finding[] {
  const findings: Finding[] = [];
  const loaded = new Set(pages.flatMap((p) => p.files));
  const ogImages = new Set(['og.png', ...experiences.flatMap((e) => (e.kind === 'internal' && e.ogImage ? [e.ogImage.slice(1)] : []))]);
  for (const p of pages) {
    for (const m of p.missing) findings.push({ file: p.page, reason: `references ${m}, which the build did not emit` });
    if (p.unsized > 0) findings.push({ file: p.page, reason: `${p.unsized} <img> without width and height (layout shift)` });
  }
  for (const f of files) {
    if (f.path.endsWith('.html') || loaded.has(f.path)) continue;
    const budget = FILE_BUDGETS.find((b) => b.matches(f.path, ogImages));
    if (!budget) {
      findings.push({ file: f.path, reason: 'emitted but loaded by no page and in no FILE_BUDGETS entry, so its size is unchecked' });
      continue;
    }
    const bytes = gzipBytes(f.bytes);
    if (bytes > budget.kb * 1024) findings.push({ file: f.path, reason: `${budget.kind} is ${kb(bytes)} KB gzip, over its ${budget.kb} KB budget by ${overage(bytes - budget.kb * 1024)}` });
  }
  return findings;
}

/** An experience's limits: its class budget with any catalog overrides applied. */
export function limitsFor(owner: string, budgetClass: BudgetClass, experiences: readonly Experience[]): Record<Metric, number> {
  const base = { ...BUDGETS[budgetClass] };
  const e = experiences.find((x) => x.id === owner);
  const o = e?.kind === 'internal' ? e.budgetOverrides : undefined;
  if (o?.jsKb !== undefined) base.js = o.jsKb;
  if (o?.cssKb !== undefined) base.css = o.cssKb;
  if (o?.transferMb !== undefined) base.transfer = o.transferMb * 1024;
  return base;
}

export type Row = { owner: string; budgetClass: BudgetClass; metric: Metric; bytes: number; budgetKb: number; page: string };

/** The worst page per experience and metric, with its budget. Equal to the budget passes. */
export function evaluate(pages: PageSize[], experiences: readonly Experience[]): { rows: Row[]; findings: Finding[] } {
  const rows: Row[] = [];
  for (const owner of [...new Set(pages.map((p) => p.owner))]) {
    const own = pages.filter((p) => p.owner === owner);
    const limits = limitsFor(owner, own[0]!.budgetClass, experiences);
    for (const metric of METRICS) {
      const worst = own.reduce((a, b) => (b[metric] > a[metric] ? b : a));
      rows.push({ owner, budgetClass: worst.budgetClass, metric, bytes: worst[metric], budgetKb: limits[metric], page: worst.page });
    }
  }
  const findings = rows.filter((r) => r.bytes > r.budgetKb * 1024).map((r) => ({
    file: r.page,
    reason: `${r.owner} (${r.budgetClass}) ${r.metric} is ${kb(r.bytes)} KB gzip, over its ${r.budgetKb} KB budget by ${overage(r.bytes - r.budgetKb * 1024)}`,
  }));
  return { rows, findings };
}

const kb = (bytes: number) => (bytes / 1024).toFixed(1);
const overage = (bytes: number) => (bytes < 1024 ? `${bytes} bytes` : `${kb(bytes)} KB`);

if (isMain(import.meta)) {
  const { experiences, state } = loadPlatform();
  if (!state) throw new Error('config/release.json is invalid; run `pnpm check:metadata`.');
  const files = readDist(distArg());
  const owners = productionOwners(experiences, state);
  const pages = measure(files, owners);
  const { rows, findings } = evaluate(pages, experiences);
  findings.push(...fileFindings(files, pages, owners));
  console.log('experience       class        metric    gzip KB  budget KB  headroom KB  worst page');
  for (const r of rows) {
    console.log([
      r.owner.padEnd(16), r.budgetClass.padEnd(12), r.metric.padEnd(9), kb(r.bytes).padStart(7),
      String(r.budgetKb).padStart(10), kb(r.budgetKb * 1024 - r.bytes).padStart(12), ` ${r.page}`,
    ].join(' '));
  }
  report('budgets', findings, `${rows.length} page limits and ${files.length} emitted files, all within budget`);
}
