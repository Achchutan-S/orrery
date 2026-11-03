// One Node policy (ADR-021): .nvmrc names the version; every engines.node is the same range and
// accepts it; pnpm refuses to install outside it; CI installs Node from .nvmrc.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import { repoRoot } from './repo.ts';

const read = (p: string) => readFileSync(join(repoRoot, p), 'utf8');
const RANGE = '>=22.23.4 <23';

test('.nvmrc, every engines.node, pnpm and CI agree on Node 22.23.4 or a later 22', () => {
  assert.equal(read('.nvmrc').trim(), '22.23.4');
  for (const p of ['package.json', 'apps/site/package.json', 'apps/control/package.json']) {
    assert.equal(JSON.parse(read(p)).engines?.node, RANGE, p);
  }
  assert.match(read('pnpm-workspace.yaml'), /^engineStrict: true$/m);
  const ci = read('.github/workflows/ci.yml');
  const setups = [...ci.matchAll(/uses: actions\/setup-node@\S+[^]*?node-version-file: (\S+)/g)].map((m) => m[1]);
  assert.ok(setups.length > 0 && setups.every((f) => f === '.nvmrc'), 'every setup-node step reads .nvmrc');
  assert.doesNotMatch(ci, /node-version:/, 'no hard-coded Node version in CI');
});
