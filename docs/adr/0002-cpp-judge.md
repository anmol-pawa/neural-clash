# ADR 0002: In-browser C++ judge (clang to WebAssembly)

Status: accepted, 2026-10-28. Algo Clash had no judge code to port yet, so this is the spike result.

## Decision
- Compile with `@yowasp/clang` 22.0.0-git20542-10 (pinned) inside a long-lived worker. It targets wasm32-wasip1 with libc++.
- Run each test case in its own short-lived runner worker with a small WASI preview1 host (`lib/judge/wasi.ts`: stdin, stdout, stderr, clock, deterministic random, exit; no files, env or network). The client terminates the worker on timeout (a synchronous wasm loop cannot be stopped any other way).
- Flags: `-std=c++20 -O2 -fno-exceptions -Wall -Wextra`, 256 MiB max memory, 8 MiB stack.

## Findings (measured)
- Compile: about 3 s warm and 4-7 s for the first submission, in Node and in Chromium (desktop and iPhone 14 emulation). Toolchain load in the worker: about 1.5 s from localhost.
- Download: about 105 MB uncompressed (`llvm.core.wasm` 75 MB, `llvm-resources.tar` 30 MB). It is staged into `public/clang/` by `npm run stage:clang`, loaded only on judge screens, and cached on first use in the `nc-clang-v1` service-worker cache (survives deploys, like Pyodide).
- libc++ has no `<bits/stdc++.h>`: the judge supplies a shim header (`lib/judge/headers.ts`).
- The wasm libc++ has no exception runtime, so `throw`/`try`/`catch` fail to link. The judge compiles with `-fno-exceptions` and the compile-error hint says so. Problems must not require exceptions.
- Runtime errors surface as traps: abort/assert gives "unreachable", stack overflow gives a call-stack RangeError, out-of-memory gives an abort. They are all reported as RE with a plain-language reason.

## Consequences / policy
- Mobile: the first use costs about 105 MB; the UI must say so before downloading (the dev page does). Not measured on a real iPhone.
- Verdicts: AC, WA, RE, TLE, OLE and CE. Comparison modes: lines, tokens, float with a relative tolerance (for ML-flavoured problems).
- The LeetCode-style `class Solution` harness generator belongs with the problem package format (ROADMAP A4).
- The `@yowasp/clang` typings omit `runClang`, so it is cast in two places.
