// Catalog -> release resolution -> route mounting -> build output, end to end.
// Each environment is built in a child process, exactly as `VERCEL_ENV=... astro build` runs.
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readdirSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { after, before, describe, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { dev, preview } from 'astro';
import { CANARY, catalog, parseCatalog } from '@pu/experience-catalog';
import { fixtureRelease } from '@pu/experience-catalog/fixture-release';
import { parseRelease, resolveAll } from '@pu/platform-schema';
import { planMount } from '../integrations/mount-experiences.ts';
import { views } from '../src/experiences/sample-app/views.ts';
import { SHELVES } from '../src/experiences/skills/shelves.ts';
import { scanLeaks } from '@pu/checks/leaks';
import { readSources } from '@pu/checks/repo';
import { pageFindings, productionOwners } from '@pu/checks/metadata';
import { ownerOf } from '@pu/checks/routes';
import { BEACON_MARKER, evaluate, measure } from '@pu/checks/budgets';
import { publicDiscoveryIndex } from '../src/platform/discovery/index.ts';

const root = fileURLToPath(new URL('../', import.meta.url));
const astroBin = join(root, 'node_modules/astro/bin/astro.mjs');
const release = JSON.parse(readFileSync(new URL('../../../config/release.json', import.meta.url), 'utf8')) as unknown;
const tmp = mkdtempSync(join(tmpdir(), 'pu-pipeline-'));
after(() => rmSync(tmp, { recursive: true, force: true }));

function astroBuild(env: string) {
  const outDir = join(tmp, env);
  const r = spawnSync(process.execPath, [astroBin, 'build', '--outDir', outDir], {
    cwd: root, encoding: 'utf8', env: { ...process.env, VERCEL_ENV: env },
  });
  return { ...r, outDir };
}

type Output = { dir: string; files: string[]; text: (f: string) => string };
function built(env: string): Output {
  const { status, stderr, stdout, outDir } = astroBuild(env);
  assert.equal(status, 0, `${env} build failed:\n${stdout}\n${stderr}`);
  return {
    dir: outDir,
    files: readdirSync(outDir, { recursive: true }).map(String).filter((f) => /\.\w+$/.test(f)),
    text: (f) => readFileSync(join(outDir, f), 'utf8'),
  };
}

// The built files in the form the repository checks read them.
const distFiles = (o: Output) => o.files.map((path) => {
  const bytes = readFileSync(join(o.dir, path));
  return { path, bytes, text: bytes.toString('utf8') };
});
const journalPages = ['journal.html', ...readdirSync(new URL('../src/experiences/journal/chapters/', import.meta.url))
  .map((f) => `journal/${f.replace(/^\d+-/, '').replace(/\.mdx$/, '.html')}`)];
const appPages = views.map((v) => `sample-app/${v.path}.html`);
const skillsPages = ['skills.html', 'skills/guide.html', ...SHELVES.map((s) => `skills/shelf/${s.id}.html`),
  ...readdirSync(new URL('../src/experiences/skills/entries/', import.meta.url)).map((f) => `skills/${f.replace(/\.ts$/, '.html')}`)];
/** The Beacon's script, recognised by the marker the budget check uses; every other script on a page. */
const scripts = (html: string) => [...html.matchAll(/<script\b[^>]*>([^]*?)<\/script>/g)].map((m) => m[0]);
const isBeacon = (script: string) => script.includes(BEACON_MARKER);
const htmlOf = (o: Output) => o.files.filter((f) => f.endsWith('.html'));

// The builds read the real config/release.json, so what they must contain is derived from it:
// these tests hold whatever the release state is (the resume a draft or published).
const realState = parseRelease(release).state!;
const resolution = (id: string, env: 'production' | 'preview') => resolveAll(parseCatalog().experiences, realState, env).find((r) => r.id === id)!;
const mounted = (env: 'production' | 'preview') => resolveAll(parseCatalog().experiences, realState, env).filter((r) => r.mounted).map((r) => r.id);
/**
 * Exact page lists for the experiences whose pages come from a table this file can read (the Journal's
 * chapters, the sample app's views, the Archive's shelves and entries). Every other experience needs no
 * entry: its pages are whatever its routes built (decision D12).
 */
const ENUMERATED: Record<string, string[]> = { journal: journalPages, 'sample-app': ['sample-app.html', ...appPages], skills: skillsPages };
const allExperiences = parseCatalog().experiences;
const pagesOf = (id: string, o: Output): string[] => ENUMERATED[id] ?? htmlOf(o).filter((f) => ownerOf(f, allExperiences)?.id === id);

describe('planMount (pure)', () => {
  const folders = catalog.filter((e) => e.kind === 'internal').map((e) => e.id);
  const input = { catalog, release, folders, fileExists: () => true };

  test('production plans only the public internal experiences; externals are never mounted', () => {
    const { routes, issues } = planMount({ ...input, env: 'production' });
    assert.deepEqual(issues, []);
    assert.deepEqual([...new Set(routes.map((r) => r.id))], mounted('production'), 'the real release file');
    assert.deepEqual([...new Set(planMount({ ...input, release: fixtureRelease(), env: 'production' }).routes.map((r) => r.id))],
      ['index', 'journal', 'sample-content', 'sample-app'], 'the fixture state');
    assert.deepEqual(planMount({ ...input, env: 'preview' }).routes.map((r) => r.id).filter((id) => id === 'kawaiui' || id === 'devxray'), []);
  });

  test('any issue plans no routes at all', () => {
    const plan = planMount({ ...input, env: 'preview', folders: [...folders, 'stray', 'kawaiui'] });
    assert.deepEqual(plan.routes, []);
    assert.deepEqual(plan.issues.map((i) => i.rule), ['orphan-folder', 'orphan-folder']);
    const missing = planMount({ ...input, env: 'preview', fileExists: (f) => !f.startsWith('sample-app/') });
    assert.deepEqual(missing.issues.map((i) => i.rule), ['entrypoint-missing', 'entrypoint-missing']);
    const badRelease = planMount({ ...input, env: 'preview', release: { platform: {}, experiences: { ghost: {} } } });
    assert.ok(badRelease.issues.every((i) => i.rule === 'schema'));
    assert.deepEqual(badRelease.routes, []);
  });

  test('the audit reproducer (F01): a public experience cannot mount a draft\'s file through ".."', () => {
    const reproducer = catalog.map((e) => (e.id === 'sample-content' && e.kind === 'internal'
      ? { ...e, routes: [...e.routes, { pattern: '/sample-content/notes.pdf', entrypoint: 'sample-content/../resume/routes/pdf.ts' }] }
      : e));
    const plan = planMount({ ...input, catalog: reproducer, env: 'production' });
    assert.deepEqual(plan.routes, [], 'nothing is mounted, so the build fails before compiling any route');
    assert.ok(plan.issues.some((i) => i.rule === 'schema' && /routes\.1\.entrypoint$/.test(i.path)), JSON.stringify(plan.issues));
  });
});

describe('production build', () => {
  let out: Output;
  before(() => { out = built('production'); });

  test('mounts every public route; Astro emits exactly the views the React router knows', () => {
    for (const id of mounted('production')) assert.ok(pagesOf(id, out).length > 0, `${id} is mounted and built no page`);
    assert.deepEqual(htmlOf(out).sort(), ['404.html', ...mounted('production').flatMap((id) => pagesOf(id, out))].sort());
    // Every page belongs to an experience mounted in production, or is the platform's 404.
    for (const f of htmlOf(out).filter((x) => x !== '404.html')) assert.ok(mounted('production').includes(ownerOf(f, allExperiences)?.id ?? ''), f);
  });

  test('sitemap.xml lists exactly the entry page of each listed experience hosted here; robots.txt allows crawling and names it', () => {
    const listed = publicDiscoveryIndex(parseCatalog().experiences, realState, 'production').filter((e) => e.weight !== 'external').map((e) => `http://localhost:4321${e.href}`);
    const locs = [...out.text('sitemap.xml').matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
    assert.deepEqual(locs, listed);
    assert.ok(locs.length > 0 && !locs.some((l) => /canary-draft|sample-hostile|vercel\.app/.test(l!)));
    assert.equal(out.text('robots.txt'), 'User-agent: *\nAllow: /\n\nSitemap: http://localhost:4321/sitemap.xml\n');
  });

  test('each view has its own title', () => {
    for (const v of views) {
      assert.ok(out.text(`sample-app/${v.path}.html`).includes(`<title>${v.title}</title>`), v.path);
    }
  });

  test('every page runs exactly one Beacon script; React only with a React island; other scripts never on a content-class experience', () => {
    for (const f of htmlOf(out)) assert.equal(scripts(out.text(f)).filter(isBeacon).length, 1, f);
    const withScript = htmlOf(out).filter((f) => scripts(out.text(f)).some((s) => !isBeacon(s))).sort();
    for (const f of withScript) {
      const owner = ownerOf(f, allExperiences);
      assert.ok(owner?.kind === 'internal' && owner.performanceClass !== 'content', `${f}: a content-class page ships a script of its own`);
    }
    if (mounted('production').includes('sample-app')) for (const f of appPages) assert.ok(withScript.includes(f), f);
    for (const f of withScript.filter((x) => x.startsWith('sample-app'))) assert.match(out.text(f), /<astro-island/);
    // An island is a script of the experience's own: only an internal experience that is not content-class may ship one.
    for (const f of htmlOf(out).filter((x) => /<astro-island/.test(out.text(x)))) {
      const owner = ownerOf(f, allExperiences);
      assert.ok(owner?.kind === 'internal' && owner.performanceClass !== 'content', `${f}: an island on a page that may not have one`);
    }
  });

  test('the views are server-rendered, so their content is in the HTML before JavaScript runs', () => {
    assert.match(out.text('sample-app/states/beta.html'), /<h1 tabindex="-1" class="state-name">beta<\/h1>/);
    assert.match(out.text('sample-app/states.html'), /<caption>Built in each environment with (<!-- -->)?public/);
  });

  test('the Index headlines every other listed experience once; external projects are marked as leaving', () => {
    const html = out.text('index.html');
    const { experiences } = parseCatalog();
    const listed = publicDiscoveryIndex(experiences, parseRelease(release).state!, 'production').filter((e) => e.id !== 'index');
    const headlines = [...html.matchAll(/<h[23] class="headline"[^>]*><a href="([^"]+)"/g)].map((m) => m[1]);
    assert.deepEqual([...headlines].sort(), listed.map((e) => e.href).sort());
    assert.equal(headlines[0], '/journal', 'the lead is the first entry in catalog order');
    assert.equal(html.match(/\(external site\)/g)?.length, 2);
    assert.match(html, /Leaves Orrery for <span[^>]*translate="no"[^>]*>kawaiui\.vercel\.app<\/span>\./);
    assert.match(html, /Leaves Orrery for <span[^>]*translate="no"[^>]*>devxray-one\.vercel\.app<\/span>\./);
    assert.match(html, /aria-describedby="kawaiui-line"/);
    for (const draft of ['Canary draft', 'Hostile stylesheet', CANARY]) assert.ok(!html.includes(draft), draft);
    assert.match(html, /<title>Orrery<\/title>/);
    assert.match(html, /<link rel="canonical" href="http:\/\/localhost:4321\/">/);
  });

  test('every page has the head tags its release state requires (tools/checks metadata)', () => {
    const { experiences } = parseCatalog();
    const state = parseRelease(release).state!;
    assert.deepEqual(pageFindings(distFiles(out), productionOwners(experiences, state), state), []);
    for (const f of htmlOf(out)) {
      // The layer order is declared before any other stylesheet, on every page.
      assert.match(out.text(f), /^[^]*?<style>@layer platform\.reset, platform\.tokens, platform\.chrome, experience;<\/style>/, f);
      // ...and before every other style, whether inlined or linked as a file.
      const html = out.text(f);
      const firstStyle = Math.min(...[html.indexOf('@layer experience{'), html.indexOf('rel="stylesheet"')].filter((i) => i >= 0));
      assert.ok(html.indexOf('@layer platform.reset,') < firstStyle, f);
    }
    assert.match(out.text('sample-app/states/draft.html'), /<link rel="canonical" href="http:\/\/localhost:4321\/sample-app\/states\/draft">/);
  });

  test('experiences set their own scheme and chrome', () => {
    assert.match(out.text('sample-content.html'), /<html lang="en" data-experience="sample-content"><head>.*<meta name="color-scheme" content="light dark">/);
    assert.match(out.text('sample-content.html'), /class="pu-colophon"/);
    assert.match(out.text('sample-app/states.html'), /<meta name="color-scheme" content="dark">/);
    assert.doesNotMatch(out.text('sample-app/states.html'), /class="pu-colophon"/, 'beacon chrome has no colophon');
  });

  test('every page carries Astro\'s CSP; no page needs inline style attributes', () => {
    for (const f of htmlOf(out)) {
      assert.match(out.text(f), /<meta http-equiv="content-security-policy" content="default-src 'self';[^"]*script-src 'self'[^"]*style-src 'self'/, f);
      assert.doesNotMatch(out.text(f).replace(/<astro-island[^>]*>/g, ''), /\sstyle="/, f);
    }
  });

  test('the platform font is the committed file, served locally; nothing refers to Google Fonts (F15)', () => {
    const fonts = out.files.filter((f) => f.endsWith('.woff2')).map((f) => readFileSync(join(out.dir, f)));
    const platform = readFileSync(new URL('../src/platform/fonts/atkinson-hyperlegible-next-latin.woff2', import.meta.url));
    assert.equal(fonts.filter((f) => f.equals(platform)).length, 1, 'the platform font ships once');
    // Every other font is one an experience committed in its own folder (contract § 3.6, ADR-028): byte for byte.
    const experiences = new URL('../src/experiences/', import.meta.url);
    const committed = readdirSync(experiences, { recursive: true, encoding: 'utf8' }).filter((f) => f.endsWith('.woff2')).map((f) => readFileSync(new URL(f, experiences)));
    for (const f of fonts.filter((k) => !k.equals(platform))) assert.ok(committed.some((c) => c.equals(f)), 'a built font that no experience committed');
    for (const f of out.files.filter((x) => /\.(html|css|js)$/.test(x))) assert.doesNotMatch(out.text(f), /fonts\.(googleapis|gstatic)\.com/, f);
    assert.equal(out.text('index.html').match(/@font-face\{font-family:"Atkinson Hyperlegible Next-[^"]+";src:url\("\/_astro\/fonts\/[0-9a-f]{16}\.woff2"\)/g)?.length, 2, 'weights 400 and 700');
  });

  test('link previews: every page names its catalog ogImage, else the platform card, as an absolute URL to a built PNG (F08)', () => {
    const { experiences } = parseCatalog();
    assert.ok(out.files.includes('og.png'), 'the platform card ships');
    assert.deepEqual(readFileSync(join(out.dir, 'og.png')), readFileSync(new URL('../public/og.png', import.meta.url)));
    for (const id of mounted('production')) {
      const e = experiences.find((x) => x.id === id)!;
      const image = (e.kind === 'internal' && e.ogImage) || '/og.png';
      assert.ok(out.files.includes(image.slice(1)), `${id}: ${image} is built`);
      for (const f of pagesOf(id, out)) {
        assert.match(out.text(f), new RegExp(`<meta property="og:image" content="http://localhost:4321${image}"><meta property="og:image:width" content="1200"><meta property="og:image:height" content="630"><meta name="twitter:card" content="summary_large_image">`), f);
      }
    }
    // An experience that is not mounted contributes no image, whatever its catalog entry says.
    for (const e of experiences) if (e.kind === 'internal' && e.ogImage && !mounted('production').includes(e.id)) assert.ok(!out.files.includes(e.ogImage.slice(1)), e.ogImage);
  });

  test('the platform font loads on platform pages and only where an experience opts in (the fixtures do not)', () => {
    // Astro's Fonts API names the platform face _astro/fonts/<16 hex>.woff2; an experience's own font has another name.
    const withFont = htmlOf(out).filter((f) => /_astro\/fonts\/[0-9a-f]{16}\.woff2/.test(out.text(f)));
    assert.ok(withFont.includes('404.html'));
    for (const f of withFont) assert.ok(!/^sample-(content|app)/.test(f), `${f}: a fixture that never opted in loads the platform font`);
  });

  test('Journal: a cover and one page per chapter file, no scripts but the Beacon, canonical URLs', () => {
    for (const f of journalPages) {
      assert.ok(out.files.includes(f), f);
      assert.deepEqual(scripts(out.text(f)).filter((s) => !isBeacon(s)), [], f);
      const path = `/${f.replace(/\.html$/, '')}`;
      assert.match(out.text(f), new RegExp(`<link rel="canonical" href="http://localhost:4321${path}">`), f);
    }
    assert.match(out.text('journal/today.html'), /<title>7\. The platform today · The Orrery Journal<\/title>/);
  });

  test('Journal: every passage states its standing, and every chapter cites its sources', () => {
    for (const f of journalPages.filter((p) => p !== 'journal.html')) {
      const html = out.text(f);
      const standings = [...html.matchAll(/class="claim" data-standing="([a-z]+)"/g)].map((m) => m[1]);
      assert.ok(standings.length > 0, `${f} has no passages`);
      for (const s of standings) assert.ok(['intent', 'implemented', 'verified', 'deployed', 'planned'].includes(s!), `${f}: ${s}`);
      assert.match(html, /Sources in the repository<\/h2><ul><li><code>/, f);
    }
  });

  test('Journal: internal links resolve to built pages; external links are only catalog sites and the live site', () => {
    const externals = new Set([...parseCatalog().experiences.flatMap((e) => (e.kind === 'external' ? [e.url] : [])), 'https://orrery-teal.vercel.app/']);
    for (const f of journalPages) {
      for (const [, href] of out.text(f).matchAll(/<a [^>]*href="([^"]+)"/g)) {
        if (href!.startsWith('https://')) assert.ok(externals.has(href!), `${f} links ${href}`);
        else {
          const path = href!.split(/[?#]/)[0]!;
          const file = path === '/' ? 'index.html' : `${path.slice(1)}.html`;
          assert.ok(out.files.includes(file), `${f} links ${href}, which was not built`);
        }
      }
    }
  });

  test('leak scan (tools/checks): nothing unreleased, no source maps, every listed entry linked', () => {
    const { experiences } = parseCatalog();
    const state = parseRelease(release).state!;
    for (const id of ['canary-draft', 'sample-hostile']) assert.ok(!mounted('production').includes(id), `${id} is never promoted`);
    assert.deepEqual(scanLeaks(distFiles(out), experiences, state, readSources()), []);
    assert.ok(!out.files.some((f) => /^(kawaiui|devxray)/.test(f)), 'external experiences have no pages');
  });

  test('served: deep links and query strings are 200; drafts and unknown views are real 404s', async () => {
    const server = await preview({ root, outDir: out.dir, logLevel: 'error', server: { port: 0 } });
    try {
      const status = async (p: string) => (await fetch(`http://localhost:${server.port}${p}`)).status;
      assert.equal(await status('/sample-app/states/frozen'), 200);
      assert.equal(await status('/sample-app/states/frozen?access=owner'), 200);
      assert.equal(await status('/sample-app/states/live'), 404);
      assert.equal(await status('/canary-draft'), 404);
      assert.equal(await status('/sample-hostile'), 404);
    } finally {
      await server.stop();
    }
  });
});

describe('preview build', () => {
  test('the resume: page, PDF and image in preview; in production exactly when its release entry allows; one Beacon script; within the content budget', () => {
    const preview = built('preview');
    const html = preview.text('resume.html');
    for (const h of ['Summary', 'Experience', 'Projects', 'Skills', 'Education', 'Recognition and learning']) assert.match(html, new RegExp(`<h2 id="[a-z]+-h">${h}</h2>`), h);
    assert.equal(preview.text('robots.txt'), 'User-agent: *\nDisallow: /\n', 'a preview holds drafts and asks crawlers to stay out');
    assert.doesNotMatch(preview.text('sitemap.xml'), /canary-draft|sample-hostile/);
    assert.match(html, /<a href="\/resume\/resume\.pdf" download="Achchutan-S-Resume\.pdf" type="application\/pdf">Download as PDF<\/a>/);
    assert.match(html, /A4, [12] pages?, \d+ KB\./);
    assert.match(html, /<title>Achchutan S · Resume<\/title>/);
    assert.match(html, /<meta property="og:image" content="http:\/\/localhost:4321\/resume\/og\.png">/);
    assert.match(html, /<meta name="twitter:card" content="summary_large_image">/);
    // Unlisted (a draft): noindex, no canonical. Listed (published): a canonical, indexable (docs/resume.md).
    if (resolution('resume', 'preview').listed) {
      assert.match(html, /<link rel="canonical" href="http:\/\/localhost:4321\/resume">/);
      assert.doesNotMatch(html, /noindex/);
    } else {
      assert.match(html, /<meta name="robots" content="noindex">/);
      assert.doesNotMatch(html, /rel="canonical"/);
    }
    assert.deepEqual(scripts(html).filter((s) => !isBeacon(s)), []);
    assert.equal(scripts(html).filter(isBeacon).length, 1);
    assert.deepEqual(readFileSync(join(preview.dir, 'resume/resume.pdf')), readFileSync(new URL('../src/experiences/resume/assets/resume.pdf', import.meta.url)));
    assert.equal(readFileSync(join(preview.dir, 'resume/og.png')).readUInt32BE(16), 1200);
    // The production build from the describe above.
    const production = readdirSync(join(tmp, 'production'), { recursive: true }).map(String);
    const released = resolution('resume', 'production').mounted;
    for (const f of ['resume.html', 'resume/resume.pdf', 'resume/og.png']) assert.equal(production.includes(f), released, `production ${released ? 'must' : 'must not'} contain ${f}`);
    if (!released) assert.ok(!production.filter((f) => f.endsWith('.html')).some((f) => readFileSync(join(tmp, 'production', f), 'utf8').includes('Achchutan S')), 'no production page names it');
    const { experiences } = parseCatalog();
    const pages = measure(distFiles(preview).filter((f) => f.path === 'resume.html' || f.path.startsWith('_astro/')), experiences);
    const { rows, findings } = evaluate(pages.filter((p) => p.owner === 'resume'), experiences);
    assert.deepEqual(findings, []);
    assert.equal(rows.find((r) => r.metric === 'js')!.bytes, 0);
  });

  test('mounts both draft fixtures and turns the inspector on, but lists and indexes neither draft', () => {
    const out = built('preview');
    const page = out.text('canary-draft.html');
    assert.match(page, new RegExp(`${CANARY}-PAGE`));
    assert.match(page, /<meta name="robots" content="noindex"><meta name="referrer" content="no-referrer">/);
    assert.ok(out.files.some((f) => f.startsWith('_astro/') && out.text(f).includes(`${CANARY}-ISLAND`)));
    assert.match(out.text('sample-hostile.html'), /all:unset/);
    for (const f of appPages) assert.match(out.text(f), /aria-label="Inspector"/, f);
    assert.ok(!out.text('index.html').includes(CANARY));
    assert.ok(!out.text('index.html').includes('Hostile stylesheet'));
    // The hostile rule ships only in its own document.
    assert.deepEqual(out.files.filter((f) => out.text(f).includes('all:unset')), ['sample-hostile.html']);
    // The standalone leak scan rejects this output as production: it sees every draft.
    const reasons = scanLeaks(distFiles(out), parseCatalog().experiences, parseRelease(release).state!, readSources()).map((x) => `${x.file}: ${x.reason}`);
    assert.ok(reasons.some((r) => r.startsWith('canary-draft.html: route /canary-draft')));
    assert.ok(reasons.some((r) => r.startsWith('sample-hostile.html: route /sample-hostile')));
    assert.ok(reasons.some((r) => r.startsWith('sample-app/states.html: renders UI for build flag sample-app:inspector')));
    // Drafts without a canary are found by their content, not only by their routes (the hostile fixture has none).
    assert.ok(reasons.includes('sample-hostile.html: contains content of apps/site/src/experiences/sample-hostile/routes/index.astro, which belongs to "sample-hostile" (not released to production)'));
    if (!resolution('resume', 'production').mounted) {
      assert.ok(reasons.includes('resume/resume.pdf: is a copy of apps/site/src/experiences/resume/assets/resume.pdf, which belongs to "resume" (not released to production)'));
    }
  });
});

describe('failure modes', () => {
  test('a deployment build without VERCEL_ENV fails instead of mounting drafts', () => {
    const { VERCEL_ENV: _drop, ...rest } = process.env;
    const r = spawnSync(process.execPath, [astroBin, 'build', '--outDir', join(tmp, 'no-env')], {
      cwd: root, encoding: 'utf8', env: { ...rest, PU_DEPLOYMENT: '1' },
    });
    assert.notEqual(r.status, 0);
    assert.match(r.stdout + r.stderr, /PU_DEPLOYMENT is set but VERCEL_ENV is not/);
  });

  test('an unknown VERCEL_ENV fails the build instead of guessing', () => {
    const r = astroBuild('prod');
    assert.notEqual(r.status, 0);
    assert.match(r.stdout + r.stderr, /Unknown VERCEL_ENV "prod"/);
  });
});

describe('dev server (development)', () => {
  test('serves mounted routes including drafts, and 404s unknown paths', async () => {
    const server = await dev({ root, logLevel: 'error', server: { port: 0 } });
    try {
      const status = async (p: string) => (await fetch(`http://localhost:${server.address.port}${p}`)).status;
      assert.equal(await status('/'), 200);
      assert.equal(await status('/canary-draft'), 200);
      assert.equal(await status('/sample-hostile'), 200);
      assert.equal(await status('/sample-app/states/beta'), 200);
      assert.equal(await status('/sample-app/states/beta?access=owner'), 200);
      assert.equal(await status('/sample-app/states/live'), 404);
      assert.equal(await status('/nope'), 404);
    } finally {
      await server.stop();
    }
  });
});
