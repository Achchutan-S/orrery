// Per-class performance budgets (blueprint 3.12), measured on build output:
//   pnpm build:production && pnpm check:budgets
//
// Units: every size is gzip level 9 bytes; 1 KB = 1024 bytes. Raw and brotli sizes are
// never mixed in. Fonts are gzipped too (woff2 barely shrinks), so one unit covers all.
//
// Accounting, per page = what a first visit to that page downloads before interaction:
//   js        inline <script> + every /_astro/*.js the page references, plus the chunks
//             those import statically (`import ... from "./x.js"`). Dynamic import() is
//             lazy and not counted. Island components count in full (conservative).
//   css       inline <style> + referenced .css files.
//   fonts     referenced font files (preload links and @font-face URLs).
//   transfer  the HTML document (inline JS/CSS included once) + external js, css, fonts.
// Each file counts once per page. A chunk shared by two pages counts on both, because a
// first visit to either downloads it. Images are not measured yet (none exist).
//
// Attribution: a page belongs to the experience whose route produced it; index.html and
// 404.html belong to the platform. Astro's output does not say which experience a shared
// chunk "belongs" to, so per-experience JS is reported per page, not split by owner.
import type { Experience } from '@pu/platform-schema';
import { ownerOf, productionOwners } from './routes.ts';
import { distArg, gzipBytes, isMain, loadPlatform, readDist, report, type DistFile, type Finding } from './repo.ts';

export type Metric = 'js' | 'css' | 'fonts' | 'transfer';
export type BudgetClass = 'platform' | 'content' | 'interactive' | 'immersive';

/**
 * THE budget table. KB, gzip. Sources:
 * - js and css for content, interactive, immersive: blueprint 3.12 (content 0 KB JS).
 * - platform js 15 KB: the blueprint's Beacon budget (Phase 1). Today the platform pages run none.
 * - fonts and transfer are not in the blueprint. Set from the 1 November 2026 build:
 *   platform pages measure ~36 KB (one 33 KB font); an interactive view ~75 KB
 *   (React 64 KB). Content and interactive allow three ~35 KB font files; transfer =
 *   js + css + fonts + ~20 KB of HTML, rounded.
 * An experience may raise its own limits with `budgetOverrides` in its catalog entry.
 */
export const BUDGETS: Record<BudgetClass, Record<Metric, number>> = {
  platform: { js: 15, css: 30, fonts: 60, transfer: 120 },
  content: { js: 0, css: 30, fonts: 110, transfer: 160 },
  interactive: { js: 150, css: 50, fonts: 110, transfer: 330 },
  immersive: { js: 250, css: 50, fonts: 110, transfer: 430 },
};

const FONT = /\.(woff2?|ttf|otf)$/;

export type PageSize = { page: string; owner: string; budgetClass: BudgetClass } & Record<Metric, number>;

/** Measures one page's initial load in gzip bytes. */
export function measurePage(html: DistFile, byPath: Map<string, DistFile>): Record<Metric, number> {
  const text = html.text ?? '';
  const inline = (tag: string) => [...text.matchAll(new RegExp(`<${tag}(?![^>]*\\ssrc=)[^>]*>([^]*?)</${tag}>`, 'g'))]
    .map((m) => m[1]).join('\n');
  const files = new Set<string>();
  const visit = (path: string) => {
    if (files.has(path) || !byPath.has(path)) return;
    files.add(path);
    if (path.endsWith('.js')) {
      const dir = path.slice(0, path.lastIndexOf('/') + 1);
      // Static imports only: `import"./a.js"`, `from"./a.js"`. Not import("./a.js").
      for (const m of (byPath.get(path)!.text ?? '').matchAll(/(?:\bfrom|\bimport)\s*["'](\.\/[^"']+)["']/g)) visit(dir + m[1]!.slice(2));
    }
  };
  for (const m of text.matchAll(/\/(_astro\/[^"')\s]+)/g)) visit(m[1]!);
  const sum = (pred: (p: string) => boolean) =>
    [...files].filter(pred).reduce((n, p) => n + gzipBytes(byPath.get(p)!.bytes), 0);
  const js = gzipBytes(inline('script')) + sum((p) => p.endsWith('.js'));
  const css = gzipBytes(inline('style')) + sum((p) => p.endsWith('.css'));
  const fonts = sum((p) => FONT.test(p));
  const transfer = gzipBytes(html.bytes) + sum((p) => p.endsWith('.js') || p.endsWith('.css') || FONT.test(p));
  return { js, css, fonts, transfer };
}

export function measure(files: DistFile[], experiences: readonly Experience[]): PageSize[] {
  const byPath = new Map(files.map((f) => [f.path, f]));
  return files.filter((f) => f.path.endsWith('.html')).map((f) => {
    const e = ownerOf(f.path, experiences);
    const budgetClass: BudgetClass = e?.kind === 'internal' ? e.performanceClass : 'platform';
    return { page: f.path, owner: e?.id ?? 'platform', budgetClass, ...measurePage(f, byPath) };
  });
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
    for (const metric of ['js', 'css', 'fonts', 'transfer'] as const) {
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
  const { rows, findings } = evaluate(measure(readDist(distArg()), productionOwners(experiences, state)), experiences);
  console.log('experience       class        metric    gzip KB  budget KB  headroom KB  worst page');
  for (const r of rows) {
    console.log([
      r.owner.padEnd(16), r.budgetClass.padEnd(12), r.metric.padEnd(9), kb(r.bytes).padStart(7),
      String(r.budgetKb).padStart(10), kb(r.budgetKb * 1024 - r.bytes).padStart(12), ` ${r.page}`,
    ].join(' '));
  }
  report('budgets', findings, `${rows.length} limits, all within budget`);
}
