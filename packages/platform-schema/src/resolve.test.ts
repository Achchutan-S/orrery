import assert from 'node:assert/strict';
import { test } from 'node:test';
import { ExperienceDefinition } from './definition.ts';
import type { Access, Lifecycle, ReleaseState } from './release.ts';
import { buildEnvironment, environmentFrom, mountedRoutes, resolve, resolvePlatformFlags, type Environment } from './resolve.ts';

const internal = ExperienceDefinition.parse({
  kind: 'internal', id: 'sample', title: 'Sample', summary: 'A sample.',
  capabilities: ['content'], performanceClass: 'content',
  routes: [{ pattern: '/sample', entrypoint: 'sample/routes/index.astro' }],
  flags: { beta: { description: 'Beta panel' } },
});
const external = ExperienceDefinition.parse({
  kind: 'external', id: 'devxray', title: 'Dev X-Ray', summary: 'External app.',
  capabilities: ['interactive'], url: 'https://devxray.example.com',
});

const stateWith = (lifecycle: Lifecycle, access: Access, id = 'sample'): ReleaseState => ({
  platform: { flags: {} },
  experiences: { [id]: { lifecycle, access, discoverability: 'listed', flags: {} } },
});

const LIFECYCLES: Lifecycle[] = ['draft', 'alpha', 'beta', 'published', 'frozen', 'deprecated', 'archived'];
const ENVS: Environment[] = ['development', 'preview', 'production'];

// Expected `mounted`, per lifecycle, in the order of LIFECYCLES (blueprint 3.4 table).
const PHASE_0_MATRIX: Record<Environment, Record<'public' | 'owner', number[]>> = {
  development: { public: [1, 1, 1, 1, 1, 1, 0], owner: [1, 1, 1, 1, 1, 1, 0] },
  preview: { public: [1, 1, 1, 1, 1, 1, 0], owner: [1, 1, 1, 1, 1, 1, 0] },
  production: { public: [0, 0, 1, 1, 1, 1, 0], owner: [0, 0, 0, 0, 0, 0, 0] },
};
const PHASE_4_PRODUCTION = { public: [0, 0, 1, 1, 1, 1, 0], owner: [0, 1, 1, 1, 1, 1, 0] };

test('Phase 0-3: every lifecycle x environment x access cell', () => {
  for (const env of ENVS) {
    for (const access of ['public', 'owner'] as const) {
      LIFECYCLES.forEach((lifecycle, i) => {
        const r = resolve(internal, stateWith(lifecycle, { kind: access }), env);
        assert.equal(r.mounted, PHASE_0_MATRIX[env][access][i] === 1, `${lifecycle} ${access} in ${env}`);
      });
    }
  }
});

test('Phase 4+: production mounts alphas with non-public access and any later stage', () => {
  for (const access of ['public', 'owner'] as const) {
    LIFECYCLES.forEach((lifecycle, i) => {
      const r = resolve(internal, stateWith(lifecycle, { kind: access }), 'production', { protectedRendering: true });
      assert.equal(r.mounted, PHASE_4_PRODUCTION[access][i] === 1, `${lifecycle} ${access}`);
    });
  }
});

test('a missing release entry is an owner-only draft: mounted locally, never in production', () => {
  const empty: ReleaseState = { platform: { flags: {} }, experiences: {} };
  assert.equal(resolve(internal, empty, 'development').mounted, true);
  assert.equal(resolve(internal, empty, 'preview').mounted, true);
  assert.deepEqual(resolve(internal, empty, 'production'), {
    id: 'sample', deployable: false, mounted: false, listed: false, flags: { beta: false },
  });
});

test('listing requires deployable, listed, public and not deprecated', () => {
  assert.equal(resolve(internal, stateWith('published', { kind: 'public' }), 'production').listed, true);
  assert.equal(resolve(internal, stateWith('deprecated', { kind: 'public' }), 'production').listed, false);
  assert.equal(resolve(internal, stateWith('draft', { kind: 'owner' }), 'preview').listed, false);
  const unlisted = stateWith('published', { kind: 'public' });
  unlisted.experiences.sample!.discoverability = 'unlisted';
  assert.equal(resolve(internal, unlisted, 'production').listed, false);
});

test('external experiences are listed but never mounted', () => {
  const r = resolve(external, stateWith('published', { kind: 'public' }, 'devxray'), 'production');
  assert.equal(r.deployable, true);
  assert.equal(r.mounted, false);
  assert.equal(r.listed, true);
});

test('flags resolve per environment; development follows preview; undeclared values are ignored', () => {
  const state = stateWith('published', { kind: 'public' });
  state.experiences.sample!.flags = {
    beta: { preview: true, production: false },
    stray: { preview: true, production: true },
  };
  state.platform.flags = { 'palette-search': { preview: true, production: false } };
  assert.deepEqual(resolve(internal, state, 'development').flags, { beta: true });
  assert.deepEqual(resolve(internal, state, 'preview').flags, { beta: true });
  assert.deepEqual(resolve(internal, state, 'production').flags, { beta: false });
  assert.deepEqual(resolvePlatformFlags(state, 'production'), { 'palette-search': false });
  assert.deepEqual(resolvePlatformFlags(state, 'preview'), { 'palette-search': true });
});

test('environmentFrom maps VERCEL_ENV and refuses unknown values', () => {
  assert.equal(environmentFrom(undefined), 'development');
  assert.equal(environmentFrom(''), 'development');
  assert.equal(environmentFrom('preview'), 'preview');
  assert.equal(environmentFrom('production'), 'production');
  assert.throws(() => environmentFrom('prod'), /Unknown VERCEL_ENV/);
});

test('mountedRoutes lists only routes of mounted internal experiences', () => {
  const state = stateWith('published', { kind: 'public' });
  assert.deepEqual(mountedRoutes([internal, external], state, 'production'), [
    { id: 'sample', pattern: '/sample', entrypoint: 'sample/routes/index.astro' },
  ]);
  assert.deepEqual(mountedRoutes([internal], stateWith('draft', { kind: 'owner' }), 'production'), []);
  assert.equal(mountedRoutes([internal], stateWith('draft', { kind: 'owner' }), 'preview').length, 1);
});

test('deployment builds fail closed when VERCEL_ENV is missing', () => {
  assert.equal(buildEnvironment({}), 'development');
  assert.equal(buildEnvironment({ PU_DEPLOYMENT: '1', VERCEL_ENV: 'production' }), 'production');
  assert.equal(buildEnvironment({ PU_DEPLOYMENT: '1', VERCEL_ENV: 'preview' }), 'preview');
  assert.throws(() => buildEnvironment({ PU_DEPLOYMENT: '1' }), /System Environment Variables/);
  assert.throws(() => buildEnvironment({ PU_DEPLOYMENT: '1', VERCEL_ENV: '' }), /System Environment Variables/);
  assert.throws(() => buildEnvironment({ PU_DEPLOYMENT: '1', VERCEL_ENV: 'staging' }), /Unknown VERCEL_ENV/);
});
