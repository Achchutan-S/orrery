import assert from 'node:assert/strict';
import { test } from 'node:test';
import { ExperienceDefinition, validateCatalog } from '@pu/platform-schema';
import { CANARY, catalog, parseCatalog } from './index.ts';

test('the catalog parses with no issues', () => {
  const { experiences, issues } = parseCatalog();
  assert.deepEqual(issues, []);
  assert.deepEqual(experiences.map((e) => e.id), ['index', 'journal', 'kawaiui', 'devxray', 'sample-content', 'sample-app', 'skills', 'divya-chakshu', 'seeing', 'resume', 'canary-draft', 'sample-hostile']);
});

test('every entry passes the shared definition schema (no local schema copies)', () => {
  for (const entry of catalog) assert.ok(ExperienceDefinition.safeParse(entry).success, entry.id);
});

test('the canary entry carries its canary in the summary', () => {
  const canary = catalog.find((e) => e.id === 'canary-draft');
  assert.ok(canary?.summary.includes(CANARY));
});

test('KawaiUI and Dev X-Ray are external, https, at their verified URLs, with no routes', () => {
  const external = parseCatalog().experiences.filter((e) => e.kind === 'external');
  assert.deepEqual(external.map((e) => [e.id, e.kind === 'external' && e.url]), [
    ['kawaiui', 'https://kawaiui.vercel.app/'],
    ['devxray', 'https://devxray-one.vercel.app/'],
  ]);
  for (const e of external) assert.equal('routes' in e, false, e.id);
});

test('adding a duplicate or conflicting entry fails with actionable issues', () => {
  const sampleApp = catalog.find((e) => e.id === 'sample-app')!;
  const thief = { ...sampleApp, id: 'thief', routes: [{ pattern: '/sample-app/[...rest]', entrypoint: 'thief/routes/app.astro' }] };
  const issues = validateCatalog([...catalog, sampleApp, thief]).issues.filter((i) => i.rule !== 'entry-route');
  assert.deepEqual(issues.map((i) => i.rule).sort(), ['unique-id', 'unique-route', 'unique-route', 'unique-route']);
  assert.ok(issues.some((i) => i.message === 'Duplicate experience id "sample-app"'));
  assert.ok(issues.some((i) => i.message === 'Route /sample-app/[...rest] conflicts with a route of "sample-app"'));
});

test('an invalid entry names the entry and field', () => {
  const at = `catalog[${catalog.length}]`;
  const issues = validateCatalog([...catalog, { kind: 'internal', id: 'x', title: 'X' }]).issues;
  assert.ok(issues.length > 0);
  assert.ok(issues.every((i) => i.path.startsWith(`${at}.`) && i.rule === 'schema'));
  assert.ok(issues.some((i) => i.path === `${at}.id`), 'id "x" is too short');
  assert.ok(issues.some((i) => i.path === `${at}.routes`));
});

test('an entry with an unimplemented chrome fails catalog validation, not the build', () => {
  const journal = catalog.find((e) => e.id === 'journal')!;
  const { issues } = validateCatalog(catalog.map((e) => (e === journal ? { ...journal, chrome: 'full' } as unknown as typeof e : e)));
  assert.deepEqual(issues.map((i) => `${i.rule} ${i.path}`), [`schema catalog[${catalog.indexOf(journal)}].chrome`]);
});

test('sample-app stays the React-island regression fixture (ADR-021): shape pinned so drift or deletion fails', () => {
  const app = parseCatalog().experiences.find((e) => e.id === 'sample-app');
  assert.ok(app && app.kind === 'internal', 'sample-app is a permanent fixture: move its coverage before removing it');
  assert.equal(app.performanceClass, 'interactive');
  assert.deepEqual(app.routes.map((r) => r.pattern), ['/sample-app', '/sample-app/[...path]']);
  assert.deepEqual(Object.keys(app.flags), ['inspector']);
});
