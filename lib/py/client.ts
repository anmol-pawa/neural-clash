import type { RunOptions, RunResult } from "./core";
import type { FromWorker, ToWorker } from "./protocol";

export interface PyClientOptions {
  /** where public/pyodide is served, with trailing slash */
  indexURL?: string;
  onStage?: (stage: string, ms: number) => void;
  /** default per-run wall-clock limit */
  timeoutMs?: number;
}

export class PyTimeoutError extends Error {
  constructor(ms: number) {
    super(`Your code ran for more than ${ms / 1000}s and was stopped (infinite loop?).`);
  }
}

/**
 * Main-thread handle to the Pyodide worker. Loads lazily on first use. A run that
 * exceeds its timeout terminates the worker (the only way to stop a Python loop);
 * the next call respawns it and re-mounts the packages, so a stuck run costs ~1-2 s.
 */
export class PyClient {
  private worker: Worker | null = null;
  private readyP: Promise<void> | null = null;
  private nextId = 1;
  private pending = new Map<number, { resolve: (r: RunResult) => void; reject: (e: Error) => void }>();
  private packages = new Map<string, Record<string, string>>();
  loadMs = 0;

  constructor(private opts: PyClientOptions = {}) {}

  private get indexURL() {
    return this.opts.indexURL ?? `${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/pyodide/`;
  }

  private spawn(): Promise<void> {
    const w = new Worker(`${this.indexURL}worker.mjs`, { type: "module" });
    this.worker = w;
    this.readyP = new Promise<void>((resolve, reject) => {
      w.onmessage = (e: MessageEvent<FromWorker>) => {
        const m = e.data;
        if (m.type === "stage") this.opts.onStage?.(m.stage, m.ms);
        else if (m.type === "ready") {
          this.loadMs = m.ms;
          for (const [name, files] of this.packages) w.postMessage({ type: "mount", id: 0, name, files } satisfies ToWorker);
          resolve();
        } else if (m.type === "done") {
          this.pending.get(m.id)?.resolve(m.result);
          this.pending.delete(m.id);
        } else if (m.type === "failed") {
          const p = m.id === undefined ? undefined : this.pending.get(m.id);
          if (p) {
            p.reject(new Error(m.message));
            this.pending.delete(m.id!);
          } else reject(new Error(m.message));
        }
      };
      w.onerror = (e) => reject(new Error(e.message || "Python worker failed to start"));
      w.postMessage({ type: "init", indexURL: this.indexURL } satisfies ToWorker);
    });
    this.readyP.catch(() => this.kill());
    return this.readyP;
  }

  private kill() {
    this.worker?.terminate();
    this.worker = null;
    this.readyP = null;
  }

  ensureReady(): Promise<void> {
    return this.readyP ?? this.spawn();
  }

  async mountPackage(name: string, files: Record<string, string>): Promise<void> {
    this.packages.set(name, files);
    if (this.worker && this.readyP) {
      await this.readyP;
      this.worker.postMessage({ type: "mount", id: 0, name, files } satisfies ToWorker);
    }
  }

  async run(opts: RunOptions, timeoutMs = this.opts.timeoutMs ?? 10_000): Promise<RunResult> {
    await this.ensureReady();
    const w = this.worker!;
    const id = this.nextId++;
    return new Promise<RunResult>((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id);
        this.kill();
        reject(new PyTimeoutError(timeoutMs));
      }, timeoutMs);
      this.pending.set(id, {
        resolve: (r) => (clearTimeout(timer), resolve(r)),
        reject: (e) => (clearTimeout(timer), reject(e)),
      });
      w.postMessage({ type: "run", id, opts } satisfies ToWorker);
    });
  }

  dispose() {
    this.kill();
    for (const p of this.pending.values()) p.reject(new Error("disposed"));
    this.pending.clear();
  }
}
