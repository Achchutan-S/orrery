import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { PatchRequest, ReleasePatch, serializeRelease } from './control.ts';
import { ReleaseState } from './release.ts';

const file = readFileSync(new URL('../../../config/release.json', import.meta.url), 'utf8');

test('serializeRelease reproduces config/release.json byte for byte', () => {
  assert.equal(serializeRelease(ReleaseState.parse(JSON.parse(file))), file);
});

test('serializeRelease is canonical: key order and empty flag maps do not matter', () => {
  const a = ReleaseState.parse({
    experiences: {
      zed: { note: 'n', discoverability: 'unlisted', access: { kind: 'owner' }, lifecycle: 'draft', flags: {} },
      app: { flags: { b: { production: false, preview: true }, a: { preview: false, production: true } }, discoverability: 'listed', access: { kind: 'public' }, lifecycle: 'published' },
    },
    platform: { flags: {} },
  });
  assert.equal(serializeRelease(a), `{
  "platform": {
    "flags": {}
  },
  "experiences": {
    "app": {
      "lifecycle": "published",
      "access": {
        "kind": "public"
      },
      "discoverability": "listed",
      "flags": {
        "a": {
          "preview": false,
          "production": true
        },
        "b": {
          "preview": true,
          "production": false
        }
      }
    },
    "zed": {
      "lifecycle": "draft",
      "access": {
        "kind": "owner"
      },
      "discoverability": "unlisted",
      "note": "n"
    }
  }
}
`);
  assert.deepEqual(ReleaseState.parse(JSON.parse(serializeRelease(a))), a);
});

test('patch requests reject unknown fields, bad ids and bad revisions', () => {
  const ok = { patch: { op: 'transition', experienceId: 'journal', to: 'frozen' }, baseRevision: 'a'.repeat(64) };
  assert.ok(PatchRequest.safeParse(ok).success);
  assert.ok(!PatchRequest.safeParse({ ...ok, extra: 1 }).success);
  assert.ok(!PatchRequest.safeParse({ ...ok, patch: { ...ok.patch, extra: 1 } }).success);
  assert.ok(!PatchRequest.safeParse({ ...ok, baseRevision: 'A'.repeat(64) }).success);
  assert.ok(!PatchRequest.safeParse({ ...ok, patch: { ...ok.patch, experienceId: '../config' } }).success);
  assert.ok(!ReleasePatch.safeParse({ op: 'setAccess', experienceId: 'journal', access: { kind: 'policy', policy: 'x' } }).success);
  assert.ok(!ReleasePatch.safeParse({ op: 'setFlag', scope: 'platform', flag: '__proto__', value: { preview: true, production: true } }).success);
});
