// Where a chart is kept. The island talks only to the `Store` interface, so a store that
// synchronises with a server can replace this one later without touching the interface code.
// Today there is one real store: IndexedDB in this browser. Nothing is sent anywhere.
import type { Link, Mark, Snapshot } from './model.ts';

export interface Store {
  /** False when the browser refused storage: the chart then lasts only until the tab closes. */
  readonly durable: boolean;
  load(): Promise<Snapshot>;
  putMark(mark: Mark): Promise<void>;
  deleteMark(id: string): Promise<void>;
  putLink(link: Link): Promise<void>;
  deleteLink(id: string): Promise<void>;
  setMeta(key: string, value: unknown): Promise<void>;
  /** Replaces every mark and link in one transaction (bringing in a copy). */
  replaceAll(marks: Mark[], links: Link[]): Promise<void>;
}

const DB = 'soundings';
const STORES = ['marks', 'links', 'meta'] as const;
type StoreName = (typeof STORES)[number];

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

  #write(names: StoreName[], fn: (tx: IDBTransaction) => void): Promise<void> {
    const tx = this.#db.transaction(names, 'readwrite');
    fn(tx);
    return committed(tx);
  }

  async load(): Promise<Snapshot> {
    const tx = this.#db.transaction([...STORES], 'readonly');
    const [marks, links, keys, values] = await Promise.all([
      done(tx.objectStore('marks').getAll() as IDBRequest<Mark[]>),
      done(tx.objectStore('links').getAll() as IDBRequest<Link[]>),
      done(tx.objectStore('meta').getAllKeys()),
      done(tx.objectStore('meta').getAll() as IDBRequest<unknown[]>),
    ]);
    return { marks, links, meta: Object.fromEntries(keys.map((k, i) => [String(k), values[i]])) };
  }
  putMark(mark: Mark) { return this.#write(['marks'], (tx) => tx.objectStore('marks').put(mark)); }
  deleteMark(id: string) { return this.#write(['marks'], (tx) => tx.objectStore('marks').delete(id)); }
  putLink(link: Link) { return this.#write(['links'], (tx) => tx.objectStore('links').put(link)); }
  deleteLink(id: string) { return this.#write(['links'], (tx) => tx.objectStore('links').delete(id)); }
  setMeta(key: string, value: unknown) { return this.#write(['meta'], (tx) => tx.objectStore('meta').put(value, key)); }
  replaceAll(marks: Mark[], links: Link[]) {
    return this.#write(['marks', 'links'], (tx) => {
      const m = tx.objectStore('marks');
      const l = tx.objectStore('links');
      m.clear();
      l.clear();
      for (const mark of marks) m.put(mark);
      for (const link of links) l.put(link);
    });
  }
}

/** Used when IndexedDB is refused (some private windows). Honest about it: `durable` is false. */
export class MemoryStore implements Store {
  readonly durable = false;
  #marks = new Map<string, Mark>();
  #links = new Map<string, Link>();
  #meta: Record<string, unknown> = {};
  async load(): Promise<Snapshot> { return { marks: [...this.#marks.values()], links: [...this.#links.values()], meta: { ...this.#meta } }; }
  async putMark(mark: Mark) { this.#marks.set(mark.id, mark); }
  async deleteMark(id: string) { this.#marks.delete(id); }
  async putLink(link: Link) { this.#links.set(link.id, link); }
  async deleteLink(id: string) { this.#links.delete(id); }
  async setMeta(key: string, value: unknown) { this.#meta[key] = value; }
  async replaceAll(marks: Mark[], links: Link[]) {
    this.#marks = new Map(marks.map((m) => [m.id, m]));
    this.#links = new Map(links.map((l) => [l.id, l]));
  }
}

function openDb(): Promise<IDBDatabase> {
  const req = indexedDB.open(DB, 1);
  req.onupgradeneeded = () => {
    req.result.createObjectStore('marks', { keyPath: 'id' });
    req.result.createObjectStore('links', { keyPath: 'id' });
    req.result.createObjectStore('meta');
  };
  return done(req);
}

export async function openStore(): Promise<Store> {
  try {
    // One more try before concluding the browser refuses storage: an open can fail in passing.
    const db = await openDb().catch(() => new Promise<IDBDatabase>((resolve, reject) => { setTimeout(() => openDb().then(resolve, reject), 250); }));
    // Ask the browser not to evict the chart under storage pressure. It may say no; nothing depends on the answer.
    void navigator.storage?.persist?.().catch(() => false);
    return new BrowserStore(db);
  } catch {
    return new MemoryStore();
  }
}
