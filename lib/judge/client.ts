import type { CompileResult } from "./compile";
import type { FromClang, FromRunner, ToClang, ToRunner } from "./protocol";
import { judgeCases, type CompareMode, type JudgeSummary, type Runner, type TestCase } from "./verdict";

export interface JudgeClientOptions {
  /** where public/clang is served, with trailing slash */
  baseURL?: string;
  onProgress?: (done: number, total: number) => void;
  /** wall-clock limit per test case */
  timeLimitMs?: number;
}

/**
 * Main-thread handle to the judge. The clang worker loads lazily and stays warm; every test case runs in its
 * own short-lived runner worker that is terminated if it exceeds the time limit.
 */
export class JudgeClient {
  private worker: Worker | null = null;
  private readyP: Promise<void> | null = null;
  private nextId = 1;
  private pending = new Map<number, { resolve: (r: CompileResult) => void; reject: (e: Error) => void }>();
  loadMs = 0;

  constructor(private opts: JudgeClientOptions = {}) {}

  private get baseURL() {
    return this.opts.baseURL ?? `${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/clang/`;
  }

  setTimeLimit(ms: number) {
    this.opts.timeLimitMs = ms;
  }

  ensureReady(): Promise<void> {
    if (this.readyP) return this.readyP;
    const w = new Worker(`${this.baseURL}clang.worker.mjs`, { type: "module" });
    this.worker = w;
    this.readyP = new Promise<void>((resolve, reject) => {
      w.onmessage = (e: MessageEvent<FromClang>) => {
        const m = e.data;
        if (m.type === "progress") this.opts.onProgress?.(m.done, m.total);
        else if (m.type === "ready") {
          this.loadMs = m.ms;
          resolve();
        } else if (m.type === "compiled") {
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
      w.onerror = (e) => reject(new Error(e.message || "The C++ compiler worker failed to start"));
      w.postMessage({ type: "init" } satisfies ToClang);
    });
    this.readyP.catch(() => this.dispose());
    return this.readyP;
  }

  async compile(source: string): Promise<CompileResult> {
    await this.ensureReady();
    const id = this.nextId++;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.worker!.postMessage({ type: "compile", id, source } satisfies ToClang);
    });
  }

  /** Runs a compiled program once, with a hard wall-clock limit. */
  run(wasm: Uint8Array, input: string, maxOutputBytes?: number): ReturnType<Runner> {
    const limit = this.opts.timeLimitMs ?? 2000;
    return new Promise((resolve, reject) => {
      const w = new Worker(`${this.baseURL}runner.mjs`, { type: "module" });
      const t0 = performance.now();
      const timer = setTimeout(() => {
        w.terminate();
        resolve({ kind: "timeout", ms: Math.round(performance.now() - t0) });
      }, limit);
      w.onmessage = (e: MessageEvent<FromRunner>) => {
        clearTimeout(timer);
        w.terminate();
        if (e.data.type === "done") resolve(e.data.outcome);
        else reject(new Error(e.data.message));
      };
      w.onerror = (e) => {
        clearTimeout(timer);
        w.terminate();
        reject(new Error(e.message || "The runner worker failed"));
      };
      w.postMessage({ type: "run", wasm: wasm.slice(), input, maxOutputBytes } satisfies ToRunner);
    });
  }

  /** Compile once, then judge every case. A compile error is returned as such. */
  async judge(source: string, cases: TestCase[], mode?: CompareMode, eps?: number): Promise<{ compile: CompileResult; summary?: JudgeSummary }> {
    const compile = await this.compile(source);
    if (!compile.ok) return { compile };
    return { compile, summary: await judgeCases((input) => this.run(compile.wasm, input), cases, mode, eps) };
  }

  dispose() {
    this.worker?.terminate();
    this.worker = null;
    this.readyP = null;
    for (const p of this.pending.values()) p.reject(new Error("judge disposed"));
    this.pending.clear();
  }
}
