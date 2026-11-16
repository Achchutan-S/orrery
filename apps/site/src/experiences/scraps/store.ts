// Where a table is kept. The island talks only to the `Store` interface, so a store that
// synchronises with a server can replace this one later without touching the interface code.
// Today there is one real store: IndexedDB in this browser. Nothing is sent anywhere.
import type { Scrap, Snapshot } from './model.ts';

export interface Store {
  /** False when the browser refused storage: the table then lasts only until the tab closes. */
  readonly durable: boolean;
  load(): Promise<Snapshot>;
  /** The stored versions of these scraps; ids that are not stored are left out. */
  get(ids: string[]): Promise<Scrap[]>;
  put(scraps: Scrap[]): Promise<void>;
  remove(ids: string[]): Promise<void>;
  setMeta(key: string, value: unknown): Promise<void>;
}

const DB = 'scraps';

const done = <T,>(req: IDBRequest<T>): Promise<T> =>
  new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error('storage request failed'));
  });
const committed = (tx: IDBTransaction): Promise<void> =>
  new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = tx.onabort = () => reject(tx.error ?? new Error('storage transaction failed'));
  });

class BrowserStore implements Store {
  readonly durable = true;
  readonly #db: IDBDatabase;
  constructor(db: IDBDatabase) { this.#db = db; }

  #write(name: 'scraps' | 'meta', fn: (store: IDBObjectStore) => void): Promise<void> {
    const tx = this.#db.transaction([name], 'readwrite');
    fn(tx.objectStore(name));
    return committed(tx);
  }

  async load(): Promise<Snapshot> {
    const tx = this.#db.transaction(['scraps', 'meta'], 'readonly');
    const [scraps, keys, values] = await Promise.all([
      done(tx.objectStore('scraps').getAll() as IDBRequest<Scrap[]>),
      done(tx.objectStore('meta').getAllKeys()),
      done(tx.objectStore('meta').getAll() as IDBRequest<unknown[]>),
    ]);
    return { scraps, meta: Object.fromEntries(keys.map((k, i) => [String(k), values[i]])) };
  }
  put(scraps: Scrap[]) { return this.#write('scraps', (st) => { for (const s of scraps) st.put(s); }); }
  async get(ids: string[]): Promise<Scrap[]> {
    const st = this.#db.transaction(['scraps'], 'readonly').objectStore('scraps');
    return (await Promise.all(ids.map((id) => done(st.get(id) as IDBRequest<Scrap | undefined>)))).filter((s): s is Scrap => Boolean(s));
  }
  remove(ids: string[]) { return this.#write('scraps', (st) => { for (const id of ids) st.delete(id); }); }
  setMeta(key: string, value: unknown) { return this.#write('meta', (st) => st.put(value, key)); }
}

/** Used when IndexedDB is refused (some private windows). Honest about it: `durable` is false. */
export class MemoryStore implements Store {
  readonly durable = false;
  #scraps = new Map<string, Scrap>();
  #meta: Record<string, unknown> = {};
  async load(): Promise<Snapshot> { return { scraps: [...this.#scraps.values()], meta: { ...this.#meta } }; }
  async put(scraps: Scrap[]) { for (const s of scraps) this.#scraps.set(s.id, s); }
  async get(ids: string[]) { return ids.map((id) => this.#scraps.get(id)).filter((s): s is Scrap => Boolean(s)); }
  async remove(ids: string[]) { for (const id of ids) this.#scraps.delete(id); }
  async setMeta(key: string, value: unknown) { this.#meta[key] = value; }
}

// The database's version. Raise it only together with an `onupgradeneeded` step that carries every
// existing scrap across (README § Changing what is stored). Version 1: stores `scraps` (by id) and `meta`.
const VERSION = 1;

function openDb(): Promise<IDBDatabase> {
  const req = indexedDB.open(DB, VERSION);
  req.onupgradeneeded = () => {
    const db = req.result;
    if (!db.objectStoreNames.contains('scraps')) db.createObjectStore('scraps', { keyPath: 'id' });
    if (!db.objectStoreNames.contains('meta')) db.createObjectStore('meta');
  };
  return done(req).catch((err: unknown) => {
    // The database was made by a later Scraps (a deployment rolled back, an old tab). Open it as it
    // is rather than treating a full table as no storage at all: its scraps are still scraps.
    if ((err as DOMException | null)?.name !== 'VersionError') throw err;
    return done(indexedDB.open(DB));
  });
}

export async function openStore(): Promise<Store> {
  try {
    // One more try before concluding the browser refuses storage: an open can fail in passing.
    const db = await openDb().catch(() => new Promise<IDBDatabase>((resolve, reject) => { setTimeout(() => openDb().then(resolve, reject), 250); }));
    // Ask the browser not to evict the table under storage pressure. It may say no; nothing depends on the answer.
    void navigator.storage?.persist?.().catch(() => false);
    // A newer Scraps in another tab wants to upgrade the database: let go, so it is never blocked.
    // This tab's later writes then fail and say so, and nothing is half-written.
    db.onversionchange = () => db.close();
    return new BrowserStore(db);
  } catch {
    return new MemoryStore();
  }
}
