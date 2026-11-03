import assert from 'node:assert/strict';
import { test } from 'node:test';
import { CANARY } from '@pu/experience-catalog';
import { fixtureRelease } from '@pu/experience-catalog/fixture-release';
import { decoded, phrases, scanLeaks } from './leaks.ts';
import { routeFiles } from './routes.ts';
import { loadPlatform, readSources, type DistFile } from './repo.ts';

// Synthetic fixtures against a fixed release state (resume a draft), not config/release.json.
const { experiences } = loadPlatform();
const state = fixtureRelease();
const sources = readSources();
const file = (path: string, text = ''): DistFile => ({ path, bytes: Buffer.from(text), text });
const binary = (path: string, bytes: Buffer): DistFile => ({ path, bytes });
const source = (path: string) => sources.find((s) => s.path === path)!.bytes;
const INDEX = file('index.html', ['/', '/journal', 'https://kawaiui.vercel.app/', 'https://devxray-one.vercel.app/', '/sample-content', '/sample-app']
  .map((h) => `<a href="${h}">x</a>`).join(''));
const clean = (): DistFile[] => [INDEX, file('404.html'), file('journal.html'), file('sample-content.html'), file('sample-app.html'), file('sample-app/states.html')];
const scan = (files: DistFile[], st = state!) => scanLeaks(files, experiences, st, sources).map((f) => `${f.file}: ${f.reason}`);

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
  // a page named canary-draft-notes is not a route of canary-draft (placed under the Journal's
  // dynamic route, so the output allowlist admits it).
  assert.deepEqual(scan([...clean(), file('sample-content.html', '<p>Canary draft. Hostile stylesheet.</p>'), file('journal/canary-draft-notes.html')]), []);
});

test('flag-gated UI: a rendered marker fails; compiled code that could render it does not', () => {
  const out = scan([...clean(), file('sample-app/states.html', '<aside data-pu-flag="sample-app:inspector">')]);
  assert.deepEqual(out, ['sample-app/states.html: renders UI for build flag sample-app:inspector, which is off in production']);
  // Flags are release management, not secrecy (ADR-004): the island chunk may contain the code.
  assert.deepEqual(scan([...clean(), file('_astro/App.DB9adIIN.js', 'f("aside",{"data-pu-flag":"sample-app:inspector"})')]), []);
});

test('source maps fail as files and as references', () => {
  const out = scan([...clean(), file('_astro/a.Bc12-_xY.js.map', '{}'), file('_astro/b.Bc12-_xY.js', 'x()\n//# sourceMappingURL=b.js.map')]);
  assert.deepEqual(out, ['_astro/a.Bc12-_xY.js.map: source map file', '_astro/b.Bc12-_xY.js: references a source map']);
});

// F06: encodings, copies, unreleased content without a canary, and the output allowlist.
const resumeSummary = experiences.find((e) => e.id === 'resume')!.summary;
const resumeProse = phrases(source('src/experiences/resume/content.ts').toString('utf8'))[0]!;
const pdf = source('src/experiences/resume/assets/resume.pdf');
const CONTENT = 'contains content of apps/site/src/experiences/resume/content.ts, which belongs to "resume" (not released to production)';
const SUMMARY = 'contains the summary of "resume", which is not public in production';
const COPY = 'is a copy of apps/site/src/experiences/resume/assets/resume.pdf, which belongs to "resume" (not released to production)';
const ALLOWLIST = 'not on the production output allowlist: no released route, platform file or hashed asset produces it';
const htmlEscaped = (s: string) => [...s].map((c, i) => (i % 3 === 0 ? `&#${c.codePointAt(0)};` : i % 3 === 1 ? `&#x${c.codePointAt(0)!.toString(16)};` : c.replace('&', '&amp;'))).join('');

test('decoding covers HTML entities, JSON and JavaScript escapes; bounded to one pass of each', () => {
  assert.equal(decoded('a&amp;b &lt;i&gt; &quot;q&quot; &#39;s&#x27; &apos;x&apos; &nbsp;'), 'a&b <i> "q" \'s\' \'x\' ');
  assert.equal(decoded('\\"q\\" \\u0041\\u{1F600}\\x42 back\\\\slash a\\/b line\\nbreak'), '"q" A\u{1F600}B back\\slash a/b line break');
  assert.equal(decoded('\\u0026#39;'), "'", 'a JSON-escaped entity decodes');
  assert.equal(decoded('&amp;#39;'), '&#39;', 'an entity escaped twice is decoded once');
  assert.equal(decoded('&#99999999; &#x110000;'), '&#99999999; &#x110000;', 'invalid code points stay as written');
});

test('plain unreleased prose without any canary is found, and only the source is named', () => {
  const out = scan([...clean(), file('journal/today.html', `<p>${resumeProse}</p>`)]);
  assert.deepEqual(out, [`journal/today.html: ${CONTENT}`]);
  assert.ok(!out.join('').includes(resumeProse), 'the finding does not repeat the protected text');
});

test('HTML-escaped summaries and prose are found', () => {
  assert.deepEqual(scan([...clean(), file('journal/today.html', `<p>${htmlEscaped(resumeSummary)}</p>`)]), [`journal/today.html: ${SUMMARY}`]);
  assert.deepEqual(scan([...clean(), file('journal/today.html', `<p>${htmlEscaped(resumeProse)}</p>`)]), [`journal/today.html: ${CONTENT}`]);
});

test('JSON-escaped summaries and prose are found (island props, inline data)', () => {
  const json = (s: string) => JSON.stringify(s).replace(/ /g, '\\u0020').replace(/:/g, '\\u003a');
  assert.deepEqual(scan([...clean(), file('_astro/data.Ab12Cd34.js', `x=${json(resumeSummary)}`)]), [`_astro/data.Ab12Cd34.js: ${SUMMARY}`]);
  assert.deepEqual(scan([...clean(), file('_astro/data.Ab12Cd34.js', `x=${json(resumeProse)}`)]), [`_astro/data.Ab12Cd34.js: ${CONTENT}`]);
  assert.deepEqual(scan([...clean(), file('_astro/data.Ab12Cd34.js', `x="${'Software engineer at \\"x\\"'}"`)]), [], 'escaped quotes alone are not a match');
});

test('a byte-for-byte copy of an unreleased file is found, also inside an allowed directory', () => {
  assert.deepEqual(scan([...clean(), binary('_astro/fonts/0123456789abcdef.woff2', pdf)]), [`_astro/fonts/0123456789abcdef.woff2: ${COPY}`]);
  const og = source('src/experiences/resume/assets/og.png');
  assert.deepEqual(scan([...clean(), binary('journal/today.html', og)]), [
    'journal/today.html: is a copy of apps/site/src/experiences/resume/assets/og.png, which belongs to "resume" (not released to production)',
  ]);
  assert.deepEqual(scan([...clean(), file('_astro/assets.Ab12Cd34.js', `x="data:application/pdf;base64,${pdf.toString('base64')}"`)]), [
    '_astro/assets.Ab12Cd34.js: contains content of apps/site/src/experiences/resume/assets/resume.pdf, which belongs to "resume" (not released to production)',
  ], 'inlined as a data URL');
});

test('the audit reproducer (F01): the draft PDF under a released experience\'s path fails twice over', () => {
  assert.deepEqual(scan([...clean(), binary('sample-content/notes.pdf', pdf)]), [`sample-content/notes.pdf: ${COPY}`, `sample-content/notes.pdf: ${ALLOWLIST}`]);
});

test('the output allowlist: released routes, platform files and hashed assets pass; anything else fails', () => {
  const favicon = source('public/favicon.svg');
  assert.deepEqual(scan([...clean(), binary('favicon.svg', favicon), binary('_astro/fonts/7a0defe7a878018e.woff2', Buffer.from('wOF2')),
    file('_astro/client.Cd-EeyjT.js', 'x()'), file('_astro/SeoHead.DXHcJ6_d.css', 'a{}'), file('journal/today.html', '<p>Journal</p>'), file('sample-app/states/beta.html')]), []);
  for (const path of ['robots.txt', 'notes.html', '_astro/notes.txt', '_astro/client.js', '_astro/x.Ab12Cd34.pdf', 'journal/notes.pdf', 'sample-content/notes.html', 'index/x.html']) {
    assert.deepEqual(scan([...clean(), file(path)]), [`${path}: ${ALLOWLIST}`], path);
  }
});

test('a copy placed in public/ or in a released experience\'s folder is still a copy', () => {
  const planted = [...sources, { owner: 'platform', path: 'public/cv.pdf', bytes: pdf }, { owner: 'sample-content', path: 'src/experiences/sample-content/cv.pdf', bytes: pdf }];
  const out = scanLeaks([...clean(), binary('cv.pdf', pdf)], experiences, state!, planted).map((f) => `${f.file}: ${f.reason}`);
  assert.deepEqual(out, [`cv.pdf: ${COPY}`, `cv.pdf: ${ALLOWLIST}`]);
});

test('content shared with a released experience or the platform is not protected', () => {
  // The sample fixtures share no prose with the resume; the platform's favicon is public wherever it is copied.
  assert.deepEqual(scan([...clean(), binary('favicon.svg', source('public/favicon.svg'))]), []);
  assert.ok(phrases('<p>Short label</p>\nimport { a } from "b";').length === 0, 'short text and code are not prose');
  assert.deepEqual(phrases('// A comment that is long enough to count as prose here.\n<h1>Also this heading has enough words in it</h1>'),
    ['A comment that is long enough to count as prose here.', 'Also this heading has enough words in it']);
});

test('the index never links an experience that is not listed in production', () => {
  const unlisted = structuredClone(state!);
  unlisted.experiences['sample-content']!.discoverability = 'unlisted';
  assert.deepEqual(scan(clean(), unlisted), ['index.html: links "sample-content" (/sample-content), which is not listed in production']);
});
