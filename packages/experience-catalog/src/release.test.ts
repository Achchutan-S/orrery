// config/release.json against the real catalog: the same checks the site build runs.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import {
  mountedRoutes, parseRelease, resolveAll, validateRelease,
  type Environment, type ReleaseState,
} from '@pu/platform-schema';
import { fixtureRelease } from './fixture-release.ts';
import { parseCatalog } from './index.ts';

const configDir = new URL('../../../config/', import.meta.url);
const raw = JSON.parse(readFileSync(new URL('release.json', configDir), 'utf8')) as unknown;
const { experiences } = parseCatalog();
const load = (input: unknown = raw): ReleaseState => {
  const { state, issues } = parseRelease(input);
  assert.deepEqual(issues, []);
  return state!;
};
const ids = (env: Environment, key: 'mounted' | 'listed', state = load()) =>
  resolveAll(experiences, state, env).filter((r) => r[key]).map((r) => r.id);

test('config/release.json parses and is coherent with the catalog', () => {
  assert.deepEqual(validateRelease(load(), experiences), []);
});

// Real configuration: expectations come from each entry of config/release.json, by the rule
// docs/architecture.md states, written out here independently of resolve().
test('the real release file: production mounts and lists exactly what each entry allows', () => {
  const state = load();
  const entryOf = (id: string) => state.experiences[id] ?? { lifecycle: 'draft', access: { kind: 'owner' }, discoverability: 'unlisted' };
  const ships = (id: string) => ['beta', 'published', 'frozen', 'deprecated'].includes(entryOf(id).lifecycle) && entryOf(id).access.kind === 'public';
  assert.deepEqual(ids('production', 'mounted'), experiences.filter((e) => e.kind === 'internal' && ships(e.id)).map((e) => e.id));
  assert.deepEqual(ids('production', 'listed'),
    experiences.filter((e) => ships(e.id) && entryOf(e.id).discoverability === 'listed' && entryOf(e.id).lifecycle !== 'deprecated').map((e) => e.id));
});

test('the real release file: the permanent leak and CSS fixtures are never in production', () => {
  for (const id of ['canary-draft', 'sample-hostile']) {
    assert.ok(!ids('production', 'mounted').includes(id), `${id} must never be promoted`);
  }
});

test('the fixture release state is valid; production mounts the public samples and lists them with the external projects', () => {
  const state = load(fixtureRelease());
  assert.deepEqual(validateRelease(state, experiences), []);
  assert.deepEqual(ids('production', 'mounted', state), ['index', 'journal', 'sample-content', 'sample-app']);
  assert.deepEqual(ids('production', 'listed', state), ['index', 'journal', 'kawaiui', 'devxray', 'sample-content', 'sample-app']);
  assert.deepEqual(mountedRoutes(experiences, state, 'production').map((r) => r.pattern),
    ['/', '/journal', '/journal/[chapter]', '/sample-content', '/sample-app', '/sample-app/[...path]']);
});

test('preview and development also mount the two draft fixtures, but never list them', () => {
  for (const env of ['development', 'preview'] as const) {
    assert.deepEqual(ids(env, 'mounted'), ['index', 'journal', 'sample-content', 'sample-app', 'resume', 'canary-draft', 'sample-hostile']);
    assert.ok(!ids(env, 'listed').some((id) => id === 'canary-draft' || id === 'sample-hostile'));
  }
});

test('build flags differ per environment', () => {
  const flags = (env: Environment) => resolveAll(experiences, load(), env).find((r) => r.id === 'sample-app')?.flags;
  assert.deepEqual(flags('preview'), { inspector: true });
  assert.deepEqual(flags('development'), { inspector: true });
  assert.deepEqual(flags('production'), { inspector: false });
});

// Adversarial edits a person might make to the file by hand.
const edit = (fn: (s: ReleaseState) => void) => {
  const s = structuredClone(load());
  fn(s);
  return validateRelease(s, experiences).map((i) => `${i.rule} ${i.path}`);
};

test('a missing canary entry still defaults to an unmounted draft in production', () => {
  const s = structuredClone(load());
  delete s.experiences['canary-draft'];
  assert.deepEqual(validateRelease(s, experiences), []);
  assert.ok(!ids('production', 'mounted', s).includes('canary-draft'));
});

test('incoherent hand edits fail validation with the field that is wrong', () => {
  assert.deepEqual(edit((s) => { s.experiences.ghost = structuredClone(s.experiences['sample-app']!); }),
    ['unknown-experience experiences.ghost']);
  assert.deepEqual(edit((s) => { s.experiences['canary-draft']!.lifecycle = 'alpha'; s.experiences['canary-draft']!.access = { kind: 'public' }; }),
    ['alpha-non-public experiences.canary-draft.access']);
  assert.deepEqual(edit((s) => { s.experiences['canary-draft']!.access = { kind: 'policy', policy: 'recruiters' }; }),
    ['access-phase-4 experiences.canary-draft.access']);
  assert.deepEqual(edit((s) => { s.experiences['sample-content']!.lifecycle = 'deprecated'; }),
    ['deprecated-unlisted experiences.sample-content.discoverability']);
  assert.deepEqual(edit((s) => { s.experiences['sample-content']!.flags = { ghost: { preview: true, production: true } }; }),
    ['undeclared-flag experiences.sample-content.flags.ghost']);
});

test('an invalid experience id key or lifecycle fails parsing', () => {
  const bad = structuredClone(raw) as { experiences: Record<string, { lifecycle: string }> };
  bad.experiences['sample-app']!.lifecycle = 'live';
  assert.ok(parseRelease(bad).issues.some((i) => i.path === 'release.experiences.sample-app.lifecycle'));
  const unknown = { ...(raw as object), experiences: { 'Not An Id': { lifecycle: 'draft', access: { kind: 'owner' }, discoverability: 'unlisted' } } };
  const s = parseRelease(unknown).state!;
  assert.deepEqual(validateRelease(s, experiences).map((i) => i.rule), ['unknown-experience']);
});

test('the Journal is withdrawn by editing its release entry alone, never by deleting it', () => {
  for (const [change, mounted, listed] of [
    [{ access: { kind: 'owner' } }, false, false],
    [{ lifecycle: 'draft', access: { kind: 'owner' } }, false, false],
    [{ discoverability: 'unlisted' }, true, false],
  ] as const) {
    const s = structuredClone(load());
    s.experiences.journal = { ...s.experiences.journal!, ...change };
    assert.deepEqual(validateRelease(s, experiences), [], JSON.stringify(change));
    assert.equal(ids('production', 'mounted', s).includes('journal'), mounted, JSON.stringify(change));
    assert.equal(ids('production', 'listed', s).includes('journal'), listed, JSON.stringify(change));
    assert.equal(mountedRoutes(experiences, s, 'production').some((r) => r.id === 'journal'), mounted);
  }
});

test('every release combination for the resume: where it is built and listed (synthetic states)', () => {
  const routes = ['/resume', '/resume/resume.pdf', '/resume/og.png'];
  // [lifecycle, access, discoverability] -> [built in production, listed in production, built in preview]
  for (const [lifecycle, access, discoverability, production, listed, preview] of [
    ['draft', 'owner', 'unlisted', false, false, true],
    ['draft', 'public', 'listed', false, false, true],
    ['alpha', 'owner', 'unlisted', false, false, true],
    ['beta', 'public', 'listed', true, true, true],
    ['beta', 'owner', 'listed', false, false, true],
    ['published', 'public', 'listed', true, true, true],
    ['published', 'public', 'unlisted', true, false, true],
    ['published', 'owner', 'listed', false, false, true],
    ['frozen', 'public', 'listed', true, true, true],
    ['deprecated', 'public', 'unlisted', true, false, true],
    ['archived', 'public', 'listed', false, false, false],
  ] as const) {
    const s = fixtureRelease();
    s.experiences.resume = { lifecycle, access: { kind: access }, discoverability, flags: {}, ...(lifecycle === 'archived' ? { archivedTo: '/' } : {}) };
    const at = `${lifecycle}/${access}/${discoverability}`;
    assert.deepEqual(validateRelease(s, experiences), [], at);
    assert.equal(ids('production', 'mounted', s).includes('resume'), production, at);
    assert.equal(ids('production', 'listed', s).includes('resume'), listed, at);
    assert.equal(ids('preview', 'mounted', s).includes('resume'), preview, at);
    // The PDF and image routes always go with the page.
    assert.deepEqual(mountedRoutes(experiences, s, 'production').filter((r) => r.id === 'resume').map((r) => r.pattern), production ? routes : [], at);
  }
});

test('external experiences: one entry each, https, at their verified addresses', () => {
  const externals = experiences.filter((e) => e.kind === 'external');
  assert.deepEqual(externals.map((e) => [e.id, e.kind === 'external' && e.url]), [['kawaiui', 'https://kawaiui.vercel.app/'], ['devxray', 'https://devxray-one.vercel.app/']]);
  const urls = externals.map((e) => (e.kind === 'external' ? e.url : ''));
  assert.equal(new Set(urls).size, urls.length, 'no two entries for one site');
  assert.equal(new Set(experiences.map((e) => e.title.toLowerCase())).size, experiences.length, 'no duplicate titles');
});
