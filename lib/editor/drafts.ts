export type Files = Record<string, string>;

/** Persists in-progress work per task key; never blocks play if storage is unavailable. */
export interface DraftStore {
  load(key: string): Promise<Files | null>;
  save(key: string, files: Files): Promise<void>;
  clear(key: string): Promise<void>;
}

export class MemoryDraftStore implements DraftStore {
  private readonly data = new Map<string, Files>();
  async load(key: string) {
    const f = this.data.get(key);
    return f ? { ...f } : null;
  }
  async save(key: string, files: Files) {
    this.data.set(key, { ...files });
  }
  async clear(key: string) {
    this.data.delete(key);
  }
}

const DB = "neural-clash-drafts";
const STORE = "drafts";

function open(idb: IDBFactory): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = idb.open(DB, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function request<T>(db: IDBDatabase, mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, mode);
    const req = fn(tx.objectStore(STORE));
    tx.oncomplete = () => resolve(req.result);
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
}

/** IndexedDB-backed drafts. Errors are swallowed (private mode, quota): a lost draft must not break play. */
export class IdbDraftStore implements DraftStore {
  private db: Promise<IDBDatabase> | null = null;
  constructor(private readonly idb: IDBFactory) {}

  private get conn() {
    return (this.db ??= open(this.idb));
  }

  async load(key: string): Promise<Files | null> {
    try {
      const v = await request(await this.conn, "readonly", (s) => s.get(key));
      return v && typeof v === "object" ? (v as Files) : null;
    } catch {
      return null;
    }
  }
  async save(key: string, files: Files) {
    try {
      await request(await this.conn, "readwrite", (s) => s.put({ ...files }, key));
    } catch {
      /* ignore */
    }
  }
  async clear(key: string) {
    try {
      await request(await this.conn, "readwrite", (s) => s.delete(key));
    } catch {
      /* ignore */
    }
  }
}

export function defaultDraftStore(): DraftStore {
  return typeof indexedDB === "undefined" ? new MemoryDraftStore() : new IdbDraftStore(indexedDB);
}

/** Debounced saver: coalesces rapid edits; `flush` writes immediately (call on Run and on unload). */
export function createAutosave(store: DraftStore, key: string, delayMs = 600) {
  let timer: ReturnType<typeof setTimeout> | null = null;
  let pending: Files | null = null;
  const flush = async () => {
    if (timer) clearTimeout(timer);
    timer = null;
    const files = pending;
    pending = null;
    if (files) await store.save(key, files);
  };
  return {
    schedule(files: Files) {
      pending = files;
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => void flush(), delayMs);
    },
    flush,
  };
}
