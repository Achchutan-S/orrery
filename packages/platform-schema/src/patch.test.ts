import assert from 'node:assert/strict';
import { test } from 'node:test';
import { ReleasePatch } from './control.ts';
import { applyPatch, canTransition } from './patch.ts';
import { Lifecycle, type ReleaseState } from './release.ts';

const ALLOWED = new Set([
  'draft>alpha', 'draft>beta', 'draft>published', 'alpha>beta', 'alpha>draft',
  'beta>published', 'beta>draft', 'published>frozen', 'frozen>published',
  'published>deprecated', 'frozen>deprecated', 'deprecated>published', 'deprecated>archived',
]);

test('canTransition allows exactly the edges of the lifecycle diagram', () => {
  for (const from of Lifecycle.options) {
    for (const to of Lifecycle.options) {
      assert.equal(canTransition(from, to), ALLOWED.has(`${from}>${to}`), `${from} -> ${to}`);
    }
  }
});

const base = (): ReleaseState => ({
  platform: { flags: {} },
  experiences: {
    app: { lifecycle: 'published', access: { kind: 'public' }, discoverability: 'listed', flags: {}, note: 'old' },
  },
});

test('applyPatch never mutates its input', () => {
  const state = base();
  const before = structuredClone(state);
  applyPatch(state, { op: 'transition', experienceId: 'app', to: 'frozen' });
  applyPatch(state, { op: 'setFlag', scope: 'platform', flag: 'x', value: { preview: true, production: false } });
  assert.deepEqual(state, before);
});

test('an illegal transition is refused', () => {
  const r = applyPatch(base(), { op: 'transition', experienceId: 'app', to: 'draft' });
  assert.deepEqual(r, { ok: false, code: 'ILLEGAL_TRANSITION', message: 'app: published cannot move to draft' });
});

test('deprecating forces unlisted', () => {
  const r = applyPatch(base(), { op: 'transition', experienceId: 'app', to: 'deprecated' });
  assert.ok(r.ok);
  assert.equal(r.state.experiences.app!.discoverability, 'unlisted');
});

test('patching an experience without an entry starts from the draft default', () => {
  const r = applyPatch(base(), { op: 'transition', experienceId: 'fresh', to: 'beta' });
  assert.ok(r.ok);
  assert.deepEqual(r.state.experiences.fresh, {
    lifecycle: 'beta', access: { kind: 'owner' }, discoverability: 'unlisted', flags: {},
  });
});

test('setFlag targets the platform or one experience; setNote null removes the note', () => {
  const value = { preview: true, production: false };
  const p = applyPatch(base(), { op: 'setFlag', scope: 'platform', flag: 'palette-search', value });
  assert.ok(p.ok);
  assert.deepEqual(p.state.platform.flags, { 'palette-search': value });

  const e = applyPatch(base(), { op: 'setFlag', scope: { experienceId: 'app' }, flag: 'beta', value });
  assert.ok(e.ok);
  assert.deepEqual(e.state.experiences.app!.flags, { beta: value });

  const n = applyPatch(base(), { op: 'setNote', experienceId: 'app', note: null });
  assert.ok(n.ok);
  assert.equal('note' in n.state.experiences.app!, false);
});

test('the V1 patch schema rejects signed-in and policy access', () => {
  assert.equal(ReleasePatch.safeParse({ op: 'setAccess', experienceId: 'app', access: { kind: 'owner' } }).success, true);
  assert.equal(ReleasePatch.safeParse({ op: 'setAccess', experienceId: 'app', access: { kind: 'policy', policy: 'recruiters' } }).success, false);
});
