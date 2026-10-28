// A tiny WASI preview1 host: just enough for programs built with clang++ against wasi-libc and libc++
// (stdin/stdout/stderr, args, clock, random, exit). No filesystem, no network, no env: a submission can only
// read the test input and write output. Used by the runner worker and by Node tests alike (no node:wasi).

export type RunOutcome =
  | { kind: "exit"; code: number; stdout: string; stderr: string; ms: number }
  | { kind: "trap"; message: string; stdout: string; stderr: string; ms: number }
  | { kind: "output-limit"; stdout: string; stderr: string; ms: number };

export interface RunWasmOptions {
  /** combined stdout+stderr byte cap before the run is stopped (Output Limit Exceeded) */
  maxOutputBytes?: number;
}

const ESUCCESS = 0;
const EBADF = 8;
const ENOSYS = 52;

class ProcExit extends Error {
  constructor(readonly code: number) {
    super(`exit ${code}`);
  }
}
class OutputLimit extends Error {}

export async function runWasm(wasm: BufferSource | WebAssembly.Module, stdin: string, opts: RunWasmOptions = {}): Promise<RunOutcome> {
  const maxOut = opts.maxOutputBytes ?? 1 << 20;
  const input = new TextEncoder().encode(stdin);
  let inPos = 0;
  const out: Uint8Array[][] = [[], [], []];
  let outBytes = 0;
  let memory: WebAssembly.Memory;
  const view = () => new DataView(memory.buffer);
  const u8 = () => new Uint8Array(memory.buffer);
  const t0 = performance.now();

  const compiled = wasm instanceof WebAssembly.Module ? wasm : await WebAssembly.compile(wasm);
  const wasi: Record<string, (...a: number[]) => number | bigint | void> = {
    args_sizes_get: (argc, bufSize) => {
      view().setUint32(argc, 0, true);
      view().setUint32(bufSize, 0, true);
      return ESUCCESS;
    },
    args_get: () => ESUCCESS,
    environ_sizes_get: (count, bufSize) => {
      view().setUint32(count, 0, true);
      view().setUint32(bufSize, 0, true);
      return ESUCCESS;
    },
    environ_get: () => ESUCCESS,
    clock_res_get: (_id, res) => {
      view().setBigUint64(res, BigInt(1000), true);
      return ESUCCESS;
    },
    clock_time_get: (_id, _precision, time) => {
      view().setBigUint64(time, BigInt(Math.round((performance.timeOrigin + performance.now()) * 1e6)), true);
      return ESUCCESS;
    },
    random_get: (ptr, len) => {
      // deterministic so a submission can't depend on luck (and runs are reproducible)
      const mem = u8();
      let s = 0x9e3779b9;
      for (let i = 0; i < len; i++) {
        s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
        mem[ptr + i] = s >>> 24;
      }
      return ESUCCESS;
    },
    sched_yield: () => ESUCCESS,
    proc_exit: (code) => {
      throw new ProcExit(code);
    },
    fd_close: () => ESUCCESS,
    fd_seek: () => 70 /* ESPIPE */,
    fd_fdstat_get: (fd, ptr) => {
      if (fd > 2) return EBADF;
      const v = view();
      v.setUint8(ptr, 2); // character device
      v.setUint16(ptr + 2, 0, true);
      v.setBigUint64(ptr + 8, BigInt(0x1fffffff), true);
      v.setBigUint64(ptr + 16, BigInt(0), true);
      return ESUCCESS;
    },
    fd_fdstat_set_flags: () => ESUCCESS,
    fd_prestat_get: () => EBADF, // no preopened directories
    fd_prestat_dir_name: () => EBADF,
    fd_read: (fd, iovs, iovsLen, nread) => {
      if (fd !== 0) return EBADF;
      const v = view();
      let total = 0;
      for (let i = 0; i < iovsLen; i++) {
        const ptr = v.getUint32(iovs + i * 8, true);
        const len = v.getUint32(iovs + i * 8 + 4, true);
        const n = Math.min(len, input.length - inPos);
        u8().set(input.subarray(inPos, inPos + n), ptr);
        inPos += n;
        total += n;
        if (n < len) break;
      }
      v.setUint32(nread, total, true);
      return ESUCCESS;
    },
    fd_write: (fd, iovs, iovsLen, nwritten) => {
      if (fd !== 1 && fd !== 2) return EBADF;
      const v = view();
      let total = 0;
      for (let i = 0; i < iovsLen; i++) {
        const ptr = v.getUint32(iovs + i * 8, true);
        const len = v.getUint32(iovs + i * 8 + 4, true);
        out[fd].push(u8().slice(ptr, ptr + len));
        total += len;
        outBytes += len;
      }
      v.setUint32(nwritten, total, true);
      if (outBytes > maxOut) throw new OutputLimit();
      return ESUCCESS;
    },
    poll_oneoff: () => ENOSYS,
    path_open: () => ENOSYS,
  };
  // Any import we did not list (a newer libc may add some) fails with ENOSYS instead of failing to link.
  const imports: Record<string, () => number> = {};
  for (const imp of WebAssembly.Module.imports(compiled)) {
    if (imp.module === "wasi_snapshot_preview1" && imp.kind === "function") imports[imp.name] = (wasi[imp.name] as () => number) ?? (() => ENOSYS);
  }

  const text = (chunks: Uint8Array[]) => {
    const buf = new Uint8Array(chunks.reduce((n, c) => n + c.length, 0));
    let o = 0;
    for (const c of chunks) {
      buf.set(c, o);
      o += c.length;
    }
    return new TextDecoder().decode(buf);
  };
  const done = () => ({ stdout: text(out[1]), stderr: text(out[2]), ms: Math.round(performance.now() - t0) });

  try {
    const instance = await WebAssembly.instantiate(compiled, { wasi_snapshot_preview1: imports });
    memory = instance.exports.memory as WebAssembly.Memory;
    try {
      (instance.exports._start as () => void)();
      return { kind: "exit", code: 0, ...done() };
    } catch (e) {
      if (e instanceof ProcExit) return { kind: "exit", code: e.code, ...done() };
      throw e;
    }
  } catch (e) {
    if (e instanceof OutputLimit) return { kind: "output-limit", ...done() };
    return { kind: "trap", message: e instanceof Error ? e.message : String(e), ...done() };
  }
}

