import assert from 'node:assert/strict';
import { chmodSync, copyFileSync, lstatSync, mkdtempSync, readdirSync, readFileSync, statSync, symlinkSync, unlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { serializeRelease, type ReleaseState } from '@pu/platform-schema';
import { FileReleaseStore, revisionOf, StoreError } from './store.ts';

const REAL = new URL('../../../config/release.json', import.meta.url);

/** A private copy of the real release file; tests never touch config/release.json. */
function copy(): { dir: string; file: string } {
  const dir = mkdtempSync(join(tmpdir(), 'pu-store-'));
  const file = join(dir, 'release.json');
  copyFileSync(REAL, file);
  return { dir, file };
}

const rejects = (p: Promise<unknown>, code: string, message?: RegExp) =>
  assert.rejects(p, (e: unknown) => {
    assert.ok(e instanceof StoreError, `expected StoreError, got ${String(e)}`);
    assert.equal(e.code, code);
    if (message) assert.match(e.message, message);
    return true;
  });

const withLifecycle = (s: ReleaseState, id: string, lifecycle: 'frozen' | 'published'): ReleaseState =>
  ({ ...s, experiences: { ...s.experiences, [id]: { ...s.experiences[id]!, lifecycle } } });

const tmpFiles = (dir: string) => readdirSync(dir).filter((f) => f.endsWith('.tmp'));

test('reads the release file with a SHA-256 revision of its bytes', async () => {
  const { file } = copy();
  const snap = await new FileReleaseStore(file).read();
  assert.equal(snap.revision, revisionOf(readFileSync(file)));
  assert.match(snap.revision, /^[0-9a-f]{64}$/);
  assert.equal(snap.state.experiences.journal?.lifecycle, 'published');
});

test('the revision is stable for identical bytes and changes with any edit', async () => {
  const { file } = copy();
  const store = new FileReleaseStore(file);
  const a = await store.read();
  assert.equal((await store.read()).revision, a.revision);
  writeFileSync(file, readFileSync(file, 'utf8').replace('"published"', '"frozen"'));
  assert.notEqual((await store.read()).revision, a.revision);
  writeFileSync(file, readFileSync(REAL));
  assert.equal((await store.read()).revision, a.revision);
});

test('a missing, malformed, schema-invalid or symlinked file is STORE_UNAVAILABLE', async () => {
  const { dir, file } = copy();
  await rejects(new FileReleaseStore(join(dir, 'missing.json')).read(), 'STORE_UNAVAILABLE', /cannot be read/);
  writeFileSync(file, '{ "platform": ');
  await rejects(new FileReleaseStore(file).read(), 'STORE_UNAVAILABLE', /not valid JSON/);
  writeFileSync(file, JSON.stringify({ platform: { flags: {} }, experiences: { x: { lifecycle: 'live' } } }));
  await assert.rejects(new FileReleaseStore(file).read(), (e: StoreError) => e.code === 'STORE_UNAVAILABLE' && (e.issues?.length ?? 0) > 0);
  const link = join(dir, 'link.json');
  symlinkSync(REAL, link);
  await rejects(new FileReleaseStore(link).read(), 'STORE_UNAVAILABLE', /not a regular file/);
  await rejects(new FileReleaseStore(link).write({ platform: { flags: {} }, experiences: {} }, 'a'.repeat(64)), 'STORE_UNAVAILABLE');
  assert.equal(readFileSync(REAL, 'utf8'), readFileSync(link, 'utf8'));
});

test('a write persists canonical bytes, keeps the file mode and returns the new revision', async () => {
  const { dir, file } = copy();
  chmodSync(file, 0o640);
  const store = new FileReleaseStore(file);
  const before = await store.read();
  const next = withLifecycle(before.state, 'journal', 'frozen');
  const after = await store.write(next, before.revision);
  assert.equal(readFileSync(file, 'utf8'), serializeRelease(next));
  assert.equal(after.revision, revisionOf(readFileSync(file)));
  assert.notEqual(after.revision, before.revision);
  assert.equal(after.state.experiences.journal?.lifecycle, 'frozen');
  assert.equal(statSync(file).mode & 0o777, 0o640);
  assert.deepEqual(tmpFiles(dir), []);
});

test('bytes are written exactly, after the same validation as a read (revert, F21)', async () => {
  const { file } = copy();
  const store = new FileReleaseStore(file);
  const original = readFileSync(file);
  const exact = Buffer.from(JSON.stringify(JSON.parse(original.toString('utf8')), null, 4));
  const w = await store.write(exact, revisionOf(original));
  assert.deepEqual(readFileSync(file), exact);
  assert.equal(w.revision, revisionOf(exact));
  assert.deepEqual(w.bytes, exact);
  await rejects(store.write(Buffer.from('{ "platform": '), w.revision), 'STORE_UNAVAILABLE', /not valid JSON/);
  await rejects(store.write(Buffer.from('{"platform":{"flags":{}},"experiences":{"x":{"lifecycle":"live"}}}'), w.revision), 'STORE_UNAVAILABLE', /schema/);
  assert.deepEqual(readFileSync(file), exact, 'invalid bytes never reach the disk');
});

test('a symlink swapped in for the file is refused at open, not after a separate check (F21)', async () => {
  const { dir, file } = copy();
  const store = new FileReleaseStore(file, {
    // Between the temporary file being complete and the final re-read, replace the file with a symlink.
    beforeRename: () => { const real = join(dir, 'elsewhere.json'); copyFileSync(file, real); unlinkSync(file); symlinkSync(real, file); },
  });
  const before = await store.read();
  await rejects(store.write(withLifecycle(before.state, 'journal', 'frozen'), before.revision), 'STORE_UNAVAILABLE', /not a regular file/);
  assert.ok(lstatSync(file).isSymbolicLink(), 'the symlink was not written through or replaced');
  assert.deepEqual(tmpFiles(dir), []);
});

test('writing an unchanged state to a canonical file keeps the revision', async () => {
  const { file } = copy();
  const store = new FileReleaseStore(file);
  const snap = await store.read();
  assert.equal((await store.write(snap.state, snap.revision)).revision, snap.revision);
});

test('a stale revision is refused with the current snapshot, and nothing is written', async () => {
  const { file } = copy();
  const store = new FileReleaseStore(file);
  const snap = await store.read();
  const bytes = readFileSync(file);
  await assert.rejects(store.write(withLifecycle(snap.state, 'journal', 'frozen'), 'b'.repeat(64)),
    (e: StoreError) => e.code === 'STALE_REVISION' && e.current?.revision === snap.revision);
  assert.deepEqual(readFileSync(file), bytes);
});

test('an invalid next state is refused before anything touches the disk', async () => {
  const { dir, file } = copy();
  const store = new FileReleaseStore(file);
  const snap = await store.read();
  const bad = { ...snap.state, experiences: { journal: { lifecycle: 'live' } } } as unknown as ReleaseState;
  await rejects(store.write(bad, snap.revision), 'STORE_UNAVAILABLE', /schema/);
  assert.deepEqual(readFileSync(file), readFileSync(REAL));
  assert.deepEqual(tmpFiles(dir), []);
});

test('concurrent writes with the same revision: exactly one wins, the other is stale', async () => {
  const { file } = copy();
  const store = new FileReleaseStore(file);
  const snap = await store.read();
  const a = withLifecycle(snap.state, 'journal', 'frozen');
  const b = withLifecycle(snap.state, 'sample-content', 'frozen');
  const results = await Promise.allSettled([store.write(a, snap.revision), store.write(b, snap.revision)]);
  assert.equal(results[0].status, 'fulfilled');
  assert.equal(results[1].status, 'rejected');
  assert.equal((results[1] as PromiseRejectedResult).reason.code, 'STALE_REVISION');
  assert.equal(readFileSync(file, 'utf8'), serializeRelease(a));
});

test('two stores on one file (two clients): the second write with the old revision is stale', async () => {
  const { file } = copy();
  const [one, two] = [new FileReleaseStore(file), new FileReleaseStore(file)];
  const seen = await one.read();
  assert.equal((await two.read()).revision, seen.revision);
  await one.write(withLifecycle(seen.state, 'journal', 'frozen'), seen.revision);
  await rejects(two.write(withLifecycle(seen.state, 'sample-content', 'frozen'), seen.revision), 'STALE_REVISION');
  const now = await two.read();
  assert.equal(now.state.experiences.journal?.lifecycle, 'frozen');
  assert.equal(now.state.experiences['sample-content']?.lifecycle, 'published');
});

test('an edit by another program during the write is a WRITE_CONFLICT; the edit survives', async () => {
  const { dir, file } = copy();
  const edited = readFileSync(file, 'utf8').replace('"Permanent', '"Edited. Permanent');
  const store = new FileReleaseStore(file, { beforeRename: () => writeFileSync(file, edited) });
  const snap = await store.read();
  await rejects(store.write(withLifecycle(snap.state, 'journal', 'frozen'), snap.revision), 'WRITE_CONFLICT');
  assert.equal(readFileSync(file, 'utf8'), edited);
  assert.deepEqual(tmpFiles(dir), []);
});

test('a failure at the rename step leaves the original intact and removes the temporary file', async () => {
  const { dir, file } = copy();
  const store = new FileReleaseStore(file, { beforeRename: () => { throw Object.assign(new Error('disk full'), { code: 'ENOSPC' }); } });
  const snap = await store.read();
  await assert.rejects(store.write(withLifecycle(snap.state, 'journal', 'frozen'), snap.revision),
    (e: StoreError) => e.code === 'STORE_UNAVAILABLE' && /original is unchanged/.test(e.message) && !e.message.includes(dir));
  assert.deepEqual(readFileSync(file), readFileSync(REAL));
  assert.deepEqual(tmpFiles(dir), []);
  // The store is still usable afterwards.
  assert.equal((await new FileReleaseStore(file).write(snap.state, snap.revision)).revision, snap.revision);
});

test('an unwritable directory fails cleanly and leaves the original intact', { skip: process.getuid?.() === 0 && 'root ignores permissions' }, async () => {
  const { dir, file } = copy();
  const store = new FileReleaseStore(file);
  const snap = await store.read();
  chmodSync(dir, 0o555);
  try {
    await rejects(store.write(withLifecycle(snap.state, 'journal', 'frozen'), snap.revision), 'STORE_UNAVAILABLE');
  } finally {
    chmodSync(dir, 0o755);
  }
  assert.deepEqual(readFileSync(file), readFileSync(REAL));
  assert.deepEqual(tmpFiles(dir), []);
});
