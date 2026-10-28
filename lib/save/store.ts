import { DEFAULT_SAVE, migrate, type SaveData, freshSave } from "./schema";

/** Persistence backend. Implementations never throw: a failed write must not break play. */
export interface SaveBackend {
  read(): Promise<unknown | null>;
  write(data: SaveData): Promise<void>;
}

export class MemoryBackend implements SaveBackend {
  private data: SaveData | null = null;
  async read() {
    return this.data ? structuredClone(this.data) : null;
  }
  async write(data: SaveData) {
    this.data = structuredClone(data);
  }
}

const DB = "neural-clash-save";
const STORE = "save";
const KEY = "current";

export class IdbBackend implements SaveBackend {
  private db: Promise<IDBDatabase> | null = null;
  constructor(private readonly idb: IDBFactory) {}

  private get conn() {
    return (this.db ??= new Promise<IDBDatabase>((resolve, reject) => {
      const req = this.idb.open(DB, 1);
      req.onupgradeneeded = () => req.result.createObjectStore(STORE);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    }));
  }

  private async run<T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
    const db = await this.conn;
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, mode);
      const req = fn(tx.objectStore(STORE));
      tx.oncomplete = () => resolve(req.result);
      tx.onerror = tx.onabort = () => reject(tx.error);
    });
  }

  async read() {
    try {
      return (await this.run("readonly", (s) => s.get(KEY))) ?? null;
    } catch {
      return null;
    }
  }
  async write(data: SaveData) {
    try {
      await this.run("readwrite", (s) => s.put(data, KEY));
    } catch {
      /* private mode or quota: keep playing from memory */
    }
  }
}

export type Unsubscribe = () => void;

/** Holds the live save, notifies subscribers and persists changes after a short debounce. */
export class SaveManager {
  private state: SaveData = freshSave();
  private listeners = new Set<() => void>();
  private timer: ReturnType<typeof setTimeout> | null = null;
  private pending: Promise<void> = Promise.resolve();
  loaded = false;

  constructor(
    private readonly backend: SaveBackend,
    private readonly debounceMs = 400,
    private readonly now: () => number = Date.now,
  ) {}

  async load(): Promise<SaveData> {
    this.state = migrate(await this.backend.read());
    this.loaded = true;
    this.emit();
    return this.state;
  }

  get = (): SaveData => this.state;

  subscribe = (cb: () => void): Unsubscribe => {
    this.listeners.add(cb);
    return () => this.listeners.delete(cb);
  };

  update(fn: (s: SaveData) => SaveData): void {
    this.state = { ...migrate(fn(this.state)), updatedAt: this.now() };
    this.emit();
    if (this.timer) clearTimeout(this.timer);
    this.timer = setTimeout(() => void this.flush(), this.debounceMs);
  }

  /** Replaces the whole save (import or reset) and persists at once. */
  replace(next: SaveData): Promise<void> {
    this.state = { ...migrate(next), updatedAt: this.now() };
    this.emit();
    return this.flush();
  }

  reset(): Promise<void> {
    return this.replace(DEFAULT_SAVE);
  }

  flush(): Promise<void> {
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
    const snapshot = this.state;
    this.pending = this.pending.then(() => this.backend.write(snapshot));
    return this.pending;
  }

  private emit() {
    this.listeners.forEach((l) => l());
  }
}
