import assert from 'node:assert/strict';
import { test } from 'node:test';
import { CANARY } from '@pu/experience-catalog';
import { scanLeaks } from './leaks.ts';
import { routeFiles } from './routes.ts';
import { loadPlatform, type DistFile } from './repo.ts';

const { experiences, state } = loadPlatform();
const file = (path: string, text = ''): DistFile => ({ path, bytes: Buffer.from(text), text });
const INDEX = file('index.html', ['/', '/journal', 'https://kawaiui.vercel.app/', 'https://devxray-one.vercel.app/', '/sample-content', '/sample-app']
  .map((h) => `<a href="${h}">x</a>`).join(''));
const clean = (): DistFile[] => [INDEX, file('404.html'), file('journal.html'), file('sample-content.html'), file('sample-app.html'), file('sample-app/states.html')];
const scan = (files: DistFile[]) => scanLeaks(files, experiences, state!).map((f) => `${f.file}: ${f.reason}`);

test('a correct production build passes', () => {
  assert.deepEqual(scan(clean()), []);
});

test('route files map exactly; dynamic patterns cover their subtree', () => {
  assert.deepEqual(routeFiles('/'), { exact: 'index.html' });
  assert.deepEqual(routeFiles('/a/b'), { exact: 'a/b.html' });
  assert.deepEqual(routeFiles('/a/[...path]'), { under: 'a/' });
  assert.deepEqual(routeFiles('/resume/resume.pdf'), { exact: 'resume/resume.pdf' }, 'a file route keeps its name');
});

test('an unreleased experience\'s files (a PDF, an image) fail like its pages', () => {
  const out = scan([...clean(), file('resume.html'), file('resume/resume.pdf'), file('resume/og.png')]);
  for (const f of ['resume.html', 'resume/resume.pdf', 'resume/og.png']) {
    assert.ok(out.some((l) => l.startsWith(`${f}: route /${f.replace(/\.html$/, '')} of "resume" is not released to production`)), f);
  }
});

test('unreleased routes fail, named by file and experience', () => {
  const out = scan([...clean(), file('canary-draft.html'), file('sample-hostile.html')]);
  assert.ok(out.some((l) => l.startsWith('canary-draft.html: route /canary-draft of "canary-draft" is not released to production')));
  assert.ok(out.some((l) => l.startsWith('sample-hostile.html: route /sample-hostile of "sample-hostile"')));
});

test('a missing published route or index link fails', () => {
  const out = scan(clean().filter((f) => f.path !== 'sample-content.html')
    .map((f) => (f.path === 'index.html' ? file('index.html', '<a href="/sample-app">') : f)));
  assert.ok(out.includes('sample-content.html: missing: "sample-content" is published but its route /sample-content was not built'));
  assert.ok(out.includes('index.html: does not link listed experience "kawaiui" (https://kawaiui.vercel.app/)'));
});

test('canary text and non-public metadata fail wherever they appear', () => {
  const summary = experiences.find((e) => e.id === 'sample-hostile')!.summary;
  const out = scan([...clean(), file('_astro/chunk.js', `x="${CANARY}-ISLAND"`), file('sample-content.html', `<p>${summary}</p>`)]);
  assert.ok(out.includes('_astro/chunk.js: contains the canary token'));
  assert.ok(out.includes('sample-content.html: contains the summary of "sample-hostile", which is not public in production'));
});

test('false positives avoided: short generic titles and look-alike file names pass', () => {
  // "Canary draft" (2 words) and "Hostile stylesheet" are too generic to be leak signals;
  // canary-draft-notes.html is not a route of canary-draft.
  assert.deepEqual(scan([...clean(), file('sample-content.html', '<p>Canary draft. Hostile stylesheet.</p>'), file('canary-draft-notes.html')]), []);
});

test('flag-gated UI: a rendered marker fails; compiled code that could render it does not', () => {
  const out = scan([...clean(), file('sample-app/states.html', '<aside data-pu-flag="sample-app:inspector">')]);
  assert.deepEqual(out, ['sample-app/states.html: renders UI for build flag sample-app:inspector, which is off in production']);
  // Flags are release management, not secrecy (ADR-004): the island chunk may contain the code.
  assert.deepEqual(scan([...clean(), file('_astro/App.js', 'f("aside",{"data-pu-flag":"sample-app:inspector"})')]), []);
});

test('source maps fail as files and as references', () => {
  const out = scan([...clean(), file('_astro/a.js.map', '{}'), file('_astro/b.js', 'x()\n//# sourceMappingURL=b.js.map')]);
  assert.deepEqual(out, ['_astro/a.js.map: source map file', '_astro/b.js: references a source map']);
});
