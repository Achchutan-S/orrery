import assert from 'node:assert/strict';
import { test } from 'node:test';
import { catalog } from '@pu/experience-catalog';
import { validatePlatform } from '@pu/platform-schema';
import { catalogFindings, pageFindings } from './metadata.ts';
import { loadPlatform, type DistFile } from './repo.ts';

const real = loadPlatform();

test('the real catalog, drafts included, is valid', () => {
  assert.deepEqual(real.issues, []);
  assert.deepEqual(real.experiences.map((e) => e.id), ['journal', 'kawaiui', 'devxray', 'sample-content', 'sample-app', 'canary-draft', 'sample-hostile']);
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

const head = (extra: string) => `<html lang="en"><title>T</title><meta name="description" content="D"><meta property="og:title" content="T"><meta property="og:description" content="D">${extra}`;
const LISTED = '<link rel="canonical" href="https://x/"><meta property="og:url" content="https://x/">';
const HIDDEN = '<meta name="robots" content="noindex"><meta name="referrer" content="no-referrer">';
const page = (path: string, html: string): DistFile => ({ path, bytes: Buffer.from(html), text: html });
const pages = (...files: DistFile[]) => pageFindings(files, real.experiences, real.state!).map((f) => `${f.file}: ${f.reason}`);

test('complete pages pass: listed pages canonical, 404 and unlisted pages noindex', () => {
  assert.deepEqual(pages(page('index.html', head(LISTED)), page('sample-content.html', head(LISTED)), page('404.html', head(HIDDEN)),
    page('canary-draft.html', head(HIDDEN))), []);
});

test('missing or contradictory head tags fail per page', () => {
  assert.deepEqual(pages(page('sample-content.html', '<html lang="en"><title> </title>' + LISTED)), [
    'sample-content.html: missing a non-empty <title>',
    'sample-content.html: missing a non-empty description',
    'sample-content.html: missing a non-empty og:title',
    'sample-content.html: missing a non-empty og:description',
  ]);
  assert.deepEqual(pages(page('sample-app/states.html', head(HIDDEN))), [
    'sample-app/states.html: missing a canonical URL ("sample-app" is listed)',
    'sample-app/states.html: missing og:url ("sample-app" is listed)',
    'sample-app/states.html: is noindex, but "sample-app" is listed',
  ]);
  assert.deepEqual(pages(page('404.html', head(LISTED))), [
    '404.html: missing robots noindex (the 404 page)',
    '404.html: missing referrer no-referrer (the 404 page)',
    '404.html: declares a canonical URL, but the 404 page',
  ]);
});

test('catalog source stays the only definition: the checker adds no rules of its own', () => {
  assert.deepEqual(catalogFindings(validatePlatform({ catalog, release: { platform: {}, experiences: {} }, folders: [], fileExists: () => false }).issues)
    .map((f) => f.reason.match(/\[([^\]]+)\]/)![1]).filter((r, i, a) => a.indexOf(r) === i).sort(), ['entrypoint-missing']);
});
