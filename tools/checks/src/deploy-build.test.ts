import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { deploySteps } from './deploy-build.ts';

test('production runs every mandatory check around the build, source checks first', () => {
  assert.deepEqual(deploySteps('production'), ['typecheck', 'check:boundaries', 'build', 'check:metadata', 'check:leaks', 'check:budgets']);
});

test('previews and local builds only build', () => {
  assert.deepEqual(deploySteps('preview'), ['build']);
  assert.deepEqual(deploySteps('development'), ['build']);
});

test('a deployment without VERCEL_ENV, or with an unknown one, fails before any step runs', () => {
  const script = fileURLToPath(new URL('./deploy-build.ts', import.meta.url));
  const { VERCEL_ENV: _drop, ...env } = process.env;
  for (const extra of [{ PU_DEPLOYMENT: '1' }, { VERCEL_ENV: 'Production' }]) {
    const r = spawnSync(process.execPath, [script], { encoding: 'utf8', env: { ...env, ...extra } });
    assert.notEqual(r.status, 0, JSON.stringify(extra));
    assert.doesNotMatch(r.stdout, /deploy build \(/, 'no step started');
  }
});
