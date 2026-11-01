import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import { releaseJsonSchema } from './release-schema.ts';
import { repoRoot } from './repo.ts';

test('config/release.schema.json is up to date (run `pnpm gen:release-schema`)', () => {
  assert.equal(readFileSync(join(repoRoot, 'config/release.schema.json'), 'utf8'), releaseJsonSchema());
});
