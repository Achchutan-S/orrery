import assert from 'node:assert/strict';
import { test } from 'node:test';
import { loadPlatform } from './repo.ts';
import { pagePath, samplePages } from './routes.ts';

const { experiences } = loadPlatform();

test('page paths: index.html is /, other pages lose .html', () => {
  assert.equal(pagePath('index.html'), '/');
  assert.equal(pagePath('journal/today.html'), '/journal/today');
});

test('sampled pages: every parameter-free page, and the first and last page of each dynamic route', () => {
  const files = ['index.html', '404.html', 'journal.html', 'journal/ahead.html', 'journal/idea.html', 'journal/today.html',
    'skills.html', 'skills/guide.html', 'skills/shelf/a.html', 'skills/shelf/b.html', 'skills/shelf/c.html', 'skills/one.html', 'skills/two.html',
    'skills/one/package.zip', 'stray.html'];
  assert.deepEqual(samplePages(files, experiences).sort(), ['/', '/journal', '/journal/ahead', '/journal/today',
    '/skills', '/skills/guide', '/skills/one', '/skills/shelf/a', '/skills/shelf/c', '/skills/two']);
});

test('sampled pages cover every internal experience that built a page, with no list to maintain', () => {
  const internal = experiences.filter((e) => e.kind === 'internal');
  const files = internal.map((e) => (e.routes.find((r) => !r.pattern.includes('['))!.pattern === '/' ? 'index.html' : `${e.routes.find((r) => !r.pattern.includes('['))!.pattern.slice(1)}.html`));
  assert.equal(samplePages(files, experiences).length, internal.length);
});
