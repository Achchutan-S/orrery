// Release-state persistence. Route handlers never touch the filesystem; they go through a
// ReleaseStore (blueprint 4.0). V1 ships FileReleaseStore; V2 replaces it with a store that
// commits through the GitHub API and uses the blob SHA as its revision.
import { createHash, randomUUID } from 'node:crypto';
import { lstat, open, readFile, rename, unlink } from 'node:fs/promises';
import { basename, dirname, join } from 'node:path';
import { parseRelease, serializeRelease, type Issue, type ReleaseState } from '@pu/platform-schema';

export type ReleaseSnapshot = { state: ReleaseState; revision: string };

export interface ReleaseStore {
  read(): Promise<ReleaseSnapshot>;
  /** Compare-and-swap: persists `next` only if the stored revision is still `expectedRevision`. */
  write(next: ReleaseState, expectedRevision: string): Promise<ReleaseSnapshot>;
}

export type StoreErrorCode = 'STORE_UNAVAILABLE' | 'STALE_REVISION' | 'WRITE_CONFLICT';

export class StoreError extends Error {
  readonly code: StoreErrorCode;
  readonly issues?: Issue[];
  readonly current?: ReleaseSnapshot;
  constructor(code: StoreErrorCode, message: string, extra: { issues?: Issue[]; current?: ReleaseSnapshot; cause?: unknown } = {}) {
    super(message, { cause: extra.cause });
    this.code = code;
    this.issues = extra.issues;
    this.current = extra.current;
  }
}

/** The revision is the SHA-256 of the file's bytes: any edit, even whitespace, is a new revision. */
export const revisionOf = (bytes: Buffer | string): string => createHash('sha256').update(bytes).digest('hex');

const parse = (bytes: Buffer): ReleaseSnapshot => {
  let json: unknown;
  try {
    json = JSON.parse(bytes.toString('utf8'));
  } catch {
    throw new StoreError('STORE_UNAVAILABLE', 'The release file is not valid JSON. Fix it in your editor, then reload.');
  }
  const { state, issues } = parseRelease(json);
  if (!state) throw new StoreError('STORE_UNAVAILABLE', 'The release file does not match its schema. Fix it in your editor, then reload.', { issues });
  return { state, revision: revisionOf(bytes) };
};

/**
 * config/release.json on the local disk. Writes go to a temporary file in the same directory,
 * are flushed, then renamed over the original, so the file is always either the old or the new
 * version. One process, one writer: writes are serialised in-process.
 * ponytail: no cross-process lock; two servers on one checkout would race between the final
 * re-check and the rename (a window of microseconds). Add a lock file if that ever happens.
 */
export class FileReleaseStore implements ReleaseStore {
  readonly #path: string;
  readonly #beforeRename: () => void | Promise<void>;
  #queue: Promise<unknown> = Promise.resolve();

  /** `beforeRename` is a test seam: it runs after the temporary file is complete. */
  constructor(path: string, options: { beforeRename?: () => void | Promise<void> } = {}) {
    this.#path = path;
    this.#beforeRename = options.beforeRename ?? (() => {});
  }

  async #bytes(): Promise<{ bytes: Buffer; mode: number }> {
    let info;
    try {
      info = await lstat(this.#path);
    } catch (cause) {
      throw new StoreError('STORE_UNAVAILABLE', 'The release file cannot be read.', { cause });
    }
    // A symlink could point the writer anywhere on disk.
    if (!info.isFile()) throw new StoreError('STORE_UNAVAILABLE', 'The release file is not a regular file.');
    try {
      return { bytes: await readFile(this.#path), mode: info.mode & 0o777 };
    } catch (cause) {
      throw new StoreError('STORE_UNAVAILABLE', 'The release file cannot be read.', { cause });
    }
  }

  async read(): Promise<ReleaseSnapshot> {
    return parse((await this.#bytes()).bytes);
  }

  write(next: ReleaseState, expectedRevision: string): Promise<ReleaseSnapshot> {
    const run = this.#queue.then(() => this.#write(next, expectedRevision));
    this.#queue = run.catch(() => {});
    return run;
  }

  async #write(next: ReleaseState, expectedRevision: string): Promise<ReleaseSnapshot> {
    const checked = parseRelease(next);
    if (!checked.state) throw new StoreError('STORE_UNAVAILABLE', 'The new release state does not match its schema.', { issues: checked.issues });
    const text = serializeRelease(checked.state);
    const { bytes, mode } = await this.#bytes();
    const current = parse(bytes);
    if (current.revision !== expectedRevision) {
      throw new StoreError('STALE_REVISION', 'The release file changed since it was loaded. Reload before retrying.', { current });
    }

    const tmp = join(dirname(this.#path), `.${basename(this.#path)}.${randomUUID()}.tmp`);
    let renamed = false;
    try {
      const handle = await open(tmp, 'wx', mode);
      try {
        await handle.writeFile(text, 'utf8');
        await handle.sync();
      } finally {
        await handle.close();
      }
      await this.#beforeRename();
      // The file may have been edited (in an editor) while this write was in progress.
      const now = await this.#bytes();
      if (revisionOf(now.bytes) !== expectedRevision) {
        throw new StoreError('WRITE_CONFLICT', 'The release file was changed by another program during the write. Nothing was written; reload before retrying.', { current: parse(now.bytes) });
      }
      await rename(tmp, this.#path);
      renamed = true;
    } catch (error) {
      throw error instanceof StoreError ? error : new StoreError('STORE_UNAVAILABLE', 'The release file could not be written. The original is unchanged.', { cause: error });
    } finally {
      if (!renamed) await unlink(tmp).catch(() => {});
    }
    return this.read();
  }
}
