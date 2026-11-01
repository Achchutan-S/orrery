import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { Experience, ExperienceInput } from './definition.ts';
import type { ReleaseEntry, ReleaseState } from './release.ts';
import { parseRelease, validateCatalog, validateCoverage, validatePlatform, validateRelease } from './validate.ts';

const entry = (over: Partial<Extract<ExperienceInput, { kind: 'internal' }>> = {}): ExperienceInput => ({
  kind: 'internal', id: 'sample', title: 'Sample', summary: 'A sample.',
  capabilities: ['content'], performanceClass: 'content',
  routes: [{ pattern: '/sample', entrypoint: 'sample/routes/index.astro' }],
  ...over,
});

const rules = (issues: { rule: string }[]) => issues.map((i) => i.rule).sort();

test('a valid catalog parses with defaults and no issues', () => {
  const { experiences, issues } = validateCatalog([entry()]);
  assert.deepEqual(issues, []);
  const [e] = experiences;
  assert.equal(e?.kind === 'internal' && e.chrome, 'minimal');
});

test('schema failures report the entry index and field', () => {
  const { issues } = validateCatalog([entry({ id: 'Bad Id' })]);
  assert.equal(issues[0]?.path, 'catalog[0].id');
  assert.equal(issues[0]?.rule, 'schema');
});

test('ids, routes and exclusive imports must be unique', () => {
  const a = entry({ id: 'alpha', exclusiveImports: ['d3-geo'] });
  const b = entry({ id: 'alpha', exclusiveImports: ['d3-geo'] });
  assert.deepEqual(rules(validateCatalog([a, b]).issues), ['exclusive-import-owner', 'unique-id', 'unique-route']);
});

test('reserved prefixes are rejected, including look-alike-safe matching', () => {
  for (const pattern of ['/me', '/auth/callback', '/i/abc', '/_platform/x', '/api/other/x']) {
    const { issues } = validateCatalog([entry({ routes: [{ pattern, entrypoint: 'sample/routes/x.astro' }] })]);
    assert.ok(rules(issues).includes('reserved-prefix'), pattern);
  }
  // '/media' starts with '/me' as a string but is not under the /me prefix.
  assert.deepEqual(validateCatalog([entry({ routes: [{ pattern: '/media', entrypoint: 'sample/routes/x.astro' }] })]).issues, []);
});

test('an experience may own /api/<its-id>/ on-demand routes only once Phase 4 allows on-demand', () => {
  const api = entry({
    capabilities: ['api'],
    routes: [{ pattern: '/api/sample/data', entrypoint: 'sample/routes/data.ts', render: 'on-demand' }],
  });
  assert.deepEqual(rules(validateCatalog([api]).issues), ['on-demand-phase-4']);
  assert.deepEqual(validateCatalog([api], { protectedRendering: true }).issues, []);
});

test('experimental needs /labs/, api needs on-demand, request flags need on-demand', () => {
  assert.deepEqual(rules(validateCatalog([entry({ capabilities: ['experimental'] })]).issues), ['experimental-labs']);
  assert.deepEqual(validateCatalog([entry({
    capabilities: ['experimental'], routes: [{ pattern: '/labs/x', entrypoint: 'sample/routes/x.astro' }],
  })]).issues, []);
  assert.deepEqual(rules(validateCatalog([entry({ capabilities: ['api'] })]).issues), ['api-on-demand']);
  assert.deepEqual(
    rules(validateCatalog([entry({ flags: { f: { description: 'x', evaluation: 'request' } } })]).issues),
    ['request-flag-on-demand'],
  );
});

test('variantOf must name a catalog entry', () => {
  assert.deepEqual(rules(validateCatalog([entry({ variantOf: 'missing' })]).issues), ['unknown-variant-base']);
});

test('budget overrides need a written reason', () => {
  const { issues } = validateCatalog([entry({ budgetOverrides: { jsKb: 300, reason: 'big' } })]);
  assert.equal(issues[0]?.path, 'catalog[0].budgetOverrides.reason');
});

const catalog = validateCatalog([entry({ flags: { beta: { description: 'Beta panel' } } })]).experiences as Experience[];
const release = (over: Partial<ReleaseEntry>): ReleaseState => ({
  platform: { flags: {} },
  experiences: {
    sample: { lifecycle: 'published', access: { kind: 'public' }, discoverability: 'listed', flags: {}, ...over },
  },
});

test('a coherent release state has no issues', () => {
  assert.deepEqual(validateRelease(release({}), catalog), []);
});

test('lifecycle coherence rules', () => {
  assert.deepEqual(rules(validateRelease(release({ lifecycle: 'alpha' }), catalog)), ['alpha-non-public']);
  assert.deepEqual(rules(validateRelease(release({ lifecycle: 'deprecated' }), catalog)), ['deprecated-unlisted']);
  assert.deepEqual(rules(validateRelease(release({ lifecycle: 'archived', discoverability: 'unlisted' }), catalog)), ['archived-target']);
  assert.deepEqual(validateRelease(release({ lifecycle: 'archived', discoverability: 'unlisted', archivedTo: '/' }), catalog), []);
});

test('policy and signed-in access fail before Phase 4 with a clear message', () => {
  const issues = validateRelease(release({ access: { kind: 'policy', policy: 'recruiters' } }), catalog);
  assert.deepEqual(issues, [{
    path: 'experiences.sample.access',
    rule: 'access-phase-4',
    message: 'policy access cannot be enforced before Phase 4; use public or owner',
  }]);
  assert.deepEqual(rules(validateRelease(release({ access: { kind: 'signed-in' } }), catalog)), ['access-phase-4']);
});

test('in Phase 4, non-public access requires on-demand routes', () => {
  const issues = validateRelease(release({ access: { kind: 'owner' } }), catalog, { protectedRendering: true });
  assert.deepEqual(rules(issues), ['non-public-on-demand']);
});

test('release entries must name catalog ids and declared flags; audiences need request flags', () => {
  const state = release({ flags: { stray: { preview: true, production: false }, beta: { preview: true, production: false, audience: 'friends' } } });
  state.experiences.ghost = { lifecycle: 'draft', access: { kind: 'owner' }, discoverability: 'unlisted', flags: {} };
  state.platform.flags = { p: { preview: true, production: true, audience: 'x' } };
  assert.deepEqual(rules(validateRelease(state, catalog)), [
    'audience-request-flag', 'audience-request-flag', 'undeclared-flag', 'unknown-experience',
  ]);
});

test('parseRelease reports schema errors with paths', () => {
  const { state, issues } = parseRelease({ platform: {}, experiences: { x: { lifecycle: 'live' } } });
  assert.equal(state, null);
  assert.ok(issues.some((i) => i.path === 'release.experiences.x.lifecycle'));
});

test('routes that differ only by parameter names conflict', () => {
  const a = entry({ id: 'one', routes: [{ pattern: '/x/[a]', entrypoint: 'one/routes/x.astro' }] });
  const b = entry({ id: 'two', routes: [{ pattern: '/x/[b]', entrypoint: 'two/routes/x.astro' }] });
  const c = entry({ id: 'three', routes: [{ pattern: '/y/[...rest]', entrypoint: 'three/routes/y.astro' }] });
  const d = entry({ id: 'four', routes: [{ pattern: '/y/[...path]', entrypoint: 'four/routes/y.astro' }] });
  const conflicts = validateCatalog([a, b, c, d]).issues.filter((i) => i.rule === 'unique-route');
  assert.deepEqual(conflicts.map((i) => i.path), ['two.routes', 'four.routes']);
});

test('release state rejects unknown keys, so typos fail instead of vanishing', () => {
  const { issues } = parseRelease({
    platform: { flags: {} },
    experiences: { x: { lifecycle: 'draft', access: { kind: 'owner' }, discoverability: 'unlisted', archivedto: '/' } },
  });
  assert.ok(issues.some((i) => i.path === 'release.experiences.x' && /archivedto/.test(i.message)));
  assert.deepEqual(parseRelease({ $schema: './release.schema.json', platform: {}, experiences: {} }).issues, []);
});

test('coverage: folders and internal entries match one to one; externals have no folder', () => {
  const { experiences } = validateCatalog([
    entry({ id: 'alpha', routes: [{ pattern: '/alpha', entrypoint: 'alpha/routes/index.astro' }] }),
    entry({ id: 'beta', routes: [{ pattern: '/beta', entrypoint: 'beta/routes/index.astro' }] }),
    entry({ id: 'gamma', routes: [{ pattern: '/gamma', entrypoint: 'alpha/routes/gamma.astro' }] }),
    { kind: 'external', id: 'ext', title: 'Ext', summary: 'x', capabilities: ['interactive'], url: 'https://example.com' },
  ]);
  const files = new Set(['alpha/routes/index.astro', 'alpha/routes/gamma.astro']);
  const issues = validateCoverage(experiences, ['alpha', 'stray', 'ext'], (f) => files.has(f));
  assert.deepEqual(issues.map((i) => `${i.rule} ${i.path}`), [
    'entrypoint-missing beta.routes',
    'entrypoint-owner gamma.routes',
    'orphan-folder experiences/stray',
    'orphan-folder experiences/ext',
  ]);
  assert.match(issues[2]!.message, /add packages\/experience-catalog\/src\/entries\/stray\.ts/);
});

test('an experience needs a parameter-free entry route for discovery to link to', () => {
  const onlyDynamic = entry({ routes: [{ pattern: '/sample/[...path]', entrypoint: 'sample/routes/app.astro' }] });
  assert.deepEqual(rules(validateCatalog([onlyDynamic]).issues), ['entry-route']);
});

test('external URLs must be https', () => {
  const ext = (url: string) => ({ kind: 'external', id: 'ext', title: 'Ext', summary: 'x', capabilities: ['interactive'], url });
  for (const bad of ['javascript:alert(1)', 'data:text/html,hi', 'http://example.com/']) {
    assert.deepEqual(rules(validateCatalog([ext(bad)]).issues), ['schema'], bad);
  }
  assert.deepEqual(validateCatalog([ext('https://example.com/')]).issues, []);
});

test('titles and summaries must not be blank', () => {
  assert.deepEqual(validateCatalog([entry({ title: '   ' })]).issues.map((i) => i.path), ['catalog[0].title']);
  assert.deepEqual(validateCatalog([entry({ summary: '' })]).issues.map((i) => i.path), ['catalog[0].summary']);
});

test('validatePlatform combines catalog, release and coverage issues', () => {
  const { issues, state } = validatePlatform({
    catalog: [entry()],
    release: { platform: {}, experiences: { ghost: { lifecycle: 'draft', access: { kind: 'owner' }, discoverability: 'unlisted' } } },
    folders: ['sample', 'stray'],
    fileExists: () => true,
  });
  assert.ok(state);
  assert.deepEqual(rules(issues), ['orphan-folder', 'unknown-experience']);
});
