import assert from 'node:assert/strict';
import { test } from 'node:test';
import { catalog } from '@pu/experience-catalog';
import { validatePlatform } from '@pu/platform-schema';
import { catalogFindings, pageFindings, siteOrigin } from './metadata.ts';
import { loadPlatform, type DistFile } from './repo.ts';

const real = loadPlatform();

test('the real catalog, drafts included, is valid', () => {
  assert.deepEqual(real.issues, []);
  assert.deepEqual(real.experiences.map((e) => e.id), ['index', 'journal', 'kawaiui', 'devxray', 'sample-content', 'sample-app', 'skills', 'divya-chakshu', 'seeing', 'resume', 'canary-draft', 'sample-hostile']);
});

const check = (entries: unknown[], release: unknown = { platform: {}, experiences: {} }, folders = ['good']) =>
  catalogFindings(validatePlatform({ catalog: entries, release, folders, fileExists: () => true }).issues)
    .map((f) => `${f.file} ${f.reason.slice(0, f.reason.indexOf(']') + 1)}`);
const good = { kind: 'internal', id: 'good', title: 'Good', summary: 'Fine.', capabilities: ['content'], performanceClass: 'content', routes: [{ pattern: '/good', entrypoint: 'good/routes/index.astro' }] };

test('malformed entries fail with the entry and field', () => {
  // An entry that fails the schema is not in the catalog, so its folder is reported too.
  assert.deepEqual(check([{ ...good, summary: '  ' }]), ['catalog[0].summary [schema]', 'experiences/good [orphan-folder]']);
  assert.deepEqual(check([{ ...good, title: undefined }]), ['catalog[0].title [schema]', 'experiences/good [orphan-folder]']);
  assert.deepEqual(check([{ kind: 'external', id: 'ext', title: 'Ext', summary: 'x', capabilities: ['data'], url: 'http://example.com/' }], undefined, []),
    ['catalog[0].url [schema]']);
  assert.deepEqual(check([{ ...good, routes: [{ pattern: '/me', entrypoint: 'good/routes/index.astro' }] }]), ['good.routes [reserved-prefix]']);
  assert.deepEqual(check([{ ...good, routes: [{ pattern: '/good', entrypoint: 'other/routes/index.astro' }] }]), ['good.routes [entrypoint-owner]']);
  assert.deepEqual(check([good], undefined, ['good', 'kawaiui']), ['experiences/kawaiui [orphan-folder]']);
});

test('lifecycle and visibility inconsistencies fail', () => {
  const entry = (e: object) => ({ platform: {}, experiences: { good: { lifecycle: 'published', access: { kind: 'public' }, discoverability: 'listed', ...e } } });
  assert.deepEqual(check([good], entry({ lifecycle: 'alpha' })), ['experiences.good.access [alpha-non-public]']);
  assert.deepEqual(check([good], entry({ lifecycle: 'deprecated' })), ['experiences.good.discoverability [deprecated-unlisted]']);
  assert.deepEqual(check([good], entry({ access: { kind: 'policy', policy: 'recruiters' } })), ['experiences.good.access [access-phase-4]']);
  assert.deepEqual(check([good], { platform: {}, experiences: { ghost: { lifecycle: 'draft', access: { kind: 'owner' }, discoverability: 'unlisted' } } }),
    ['experiences.ghost [unknown-experience]']);
});

const ORIGIN = 'https://site.example';
const IMAGE = (url = `${ORIGIN}/og.png`) => `<meta property="og:image" content="${url}"><meta name="twitter:card" content="summary_large_image">`;
const head = (extra: string, image = IMAGE()) => `<html lang="en"><title>T</title><meta name="description" content="D"><meta property="og:type" content="website"><meta property="og:title" content="T"><meta property="og:description" content="D">${image}${extra}`;
const LISTED = (path = '/') => `<link rel="canonical" href="${ORIGIN}${path}"><meta property="og:url" content="${ORIGIN}${path}">`;
const HIDDEN = '<meta name="robots" content="noindex"><meta name="referrer" content="no-referrer">';
const page = (path: string, html: string): DistFile => ({ path, bytes: Buffer.from(html), text: html });
const png = (path: string): DistFile => ({ path, bytes: Buffer.from('png') });
const pages = (...files: DistFile[]) => pageFindings([...files, png('og.png'), png('resume/og.png')], real.experiences, real.state!, ORIGIN).map((f) => `${f.file}: ${f.reason}`);

test('complete pages pass: listed pages canonical, 404 and unlisted pages noindex', () => {
  assert.deepEqual(pages(page('index.html', head(LISTED('/'))), page('sample-content.html', head(LISTED('/sample-content'))), page('404.html', head(HIDDEN)),
    page('sample-app/states.html', head(LISTED('/sample-app/states'), IMAGE(`${ORIGIN}/resume/og.png`))), page('canary-draft.html', head(HIDDEN))), []);
});

test('the site origin follows the Vercel production host, as astro.config.ts does', () => {
  assert.equal(siteOrigin({}), 'http://localhost:4321');
  assert.equal(siteOrigin({ VERCEL_PROJECT_PRODUCTION_URL: 'orrery.example' }), 'https://orrery.example');
});

test('og:image is required on every page, absolute on the site origin, and names a PNG or JPEG that was built', () => {
  assert.deepEqual(pages(page('journal.html', head(LISTED('/journal'), ''))), [
    'journal.html: missing og:image',
    'journal.html: missing twitter:card summary_large_image',
  ]);
  for (const [url, why] of [
    ['/og.png', 'is not an absolute URL on https://site.example'],
    ['og.png', 'is not an absolute URL on https://site.example'],
    ['http://localhost:4321/og.png', 'is not an absolute URL on https://site.example'],
    ['https://elsewhere.example/og.png', 'is not an absolute URL on https://site.example'],
    [`${ORIGIN}/missing.png`, 'does not name a PNG or JPEG in this build'],
    [`${ORIGIN}/favicon.svg`, 'does not name a PNG or JPEG in this build'],
  ]) {
    assert.deepEqual(pages(page('index.html', head(LISTED('/'), IMAGE(url)))), [`index.html: og:image "${url}" ${why}`], url);
  }
  assert.deepEqual(pages(page('index.html', head(LISTED('/'), `<meta property="og:image" content="${ORIGIN}/og.png"><meta name="twitter:card" content="summary">`))),
    ['index.html: missing twitter:card summary_large_image']);
});

test('canonical and og:url are the page\'s own address', () => {
  assert.deepEqual(pages(page('journal/today.html', head(LISTED('/journal')))), [
    'journal/today.html: canonical URL "https://site.example/journal" is not the page\'s own address https://site.example/journal/today',
  ]);
  assert.deepEqual(pages(page('journal.html', head(`<link rel="canonical" href="${ORIGIN}/journal"><meta property="og:url" content="${ORIGIN}/elsewhere">`))), [
    'journal.html: og:url "https://site.example/elsewhere" differs from the canonical URL',
  ]);
});

test('missing or contradictory head tags fail per page', () => {
  assert.deepEqual(pages(page('sample-content.html', '<html lang="en"><title> </title>' + IMAGE() + LISTED('/sample-content'))), [
    'sample-content.html: missing a non-empty <title>',
    'sample-content.html: missing a non-empty description',
    'sample-content.html: missing a non-empty og:type',
    'sample-content.html: missing a non-empty og:title',
    'sample-content.html: missing a non-empty og:description',
  ]);
  assert.deepEqual(pages(page('sample-app/states.html', head(HIDDEN))), [
    'sample-app/states.html: missing a canonical URL ("sample-app" is listed)',
    'sample-app/states.html: missing og:url ("sample-app" is listed)',
    'sample-app/states.html: is noindex, but "sample-app" is listed',
  ]);
  assert.deepEqual(pages(page('404.html', head(LISTED('/404')))), [
    '404.html: missing robots noindex (the 404 page)',
    '404.html: missing referrer no-referrer (the 404 page)',
    '404.html: declares a canonical URL, but the 404 page',
  ]);
});

test('catalog source stays the only definition: the checker adds no rules of its own', () => {
  assert.deepEqual(catalogFindings(validatePlatform({ catalog, release: { platform: {}, experiences: {} }, folders: [], fileExists: () => false }).issues)
    .map((f) => f.reason.match(/\[([^\]]+)\]/)![1]).filter((r, i, a) => a.indexOf(r) === i).sort(), ['entrypoint-missing']);
});
