// Minimal WASI preview1 shim for judged programs: stdin/stdout/stderr as in-memory buffers.
// No filesystem, network or clock access is exposed, so user code cannot reach the host.
// Works in a Worker and in Node (the tests); it only needs the WebAssembly global.

export class ExitSignal {
  constructor(readonly code: number) {}
}

export interface WasiIO {
  stdout: Uint8Array[];
  stderr: Uint8Array[];
}

const ESUCCESS = 0;
const EBADF = 8;

export function makeWasiImports(stdin: Uint8Array, io: WasiIO, getMemory: () => WebAssembly.Memory) {
  let inPos = 0;
  const view = () => new DataView(getMemory().buffer);
  const bytes = () => new Uint8Array(getMemory().buffer);
  return {
    environ_sizes_get(countPtr: number, sizePtr: number) {
      view().setUint32(countPtr, 0, true);
      view().setUint32(sizePtr, 0, true);
      return ESUCCESS;
    },
    environ_get: () => ESUCCESS,
    fd_close: () => ESUCCESS,
    fd_seek: () => 70, // ESPIPE: standard streams are not seekable
    fd_prestat_get: () => EBADF,
    fd_prestat_dir_name: () => EBADF,
    fd_fdstat_get(fd: number, ptr: number) {
      if (fd > 2) return EBADF;
      const v = view();
      v.setUint8(ptr, 2); // character device
      v.setUint16(ptr + 2, 0, true);
      v.setBigUint64(ptr + 8, BigInt(0), true);
      v.setBigUint64(ptr + 16, BigInt(0), true);
      return ESUCCESS;
    },
    fd_write(fd: number, iovs: number, iovsLen: number, nwrittenPtr: number) {
      if (fd !== 1 && fd !== 2) return EBADF;
      const v = view();
      const m = bytes();
      let total = 0;
      for (let i = 0; i < iovsLen; i++) {
        const ptr = v.getUint32(iovs + i * 8, true);
        const len = v.getUint32(iovs + i * 8 + 4, true);
        (fd === 1 ? io.stdout : io.stderr).push(m.slice(ptr, ptr + len));
        total += len;
      }
      v.setUint32(nwrittenPtr, total, true);
      return ESUCCESS;
    },
    fd_read(fd: number, iovs: number, iovsLen: number, nreadPtr: number) {
      if (fd !== 0) return EBADF;
      const v = view();
      const m = bytes();
      let total = 0;
      for (let i = 0; i < iovsLen; i++) {
        const ptr = v.getUint32(iovs + i * 8, true);
        const len = v.getUint32(iovs + i * 8 + 4, true);
        const n = Math.min(len, stdin.length - inPos);
        m.set(stdin.subarray(inPos, inPos + n), ptr);
        inPos += n;
        total += n;
        if (n < len) break;
      }
      v.setUint32(nreadPtr, total, true);
      return ESUCCESS;
    },
    proc_exit(code: number): never {
      throw new ExitSignal(code);
    },
  };
}
