# ADR 0002: In-browser C++ judge on `@yowasp/clang`

Status: accepted (spike measured 2026-10-28 in Node 22; browser and iPhone figures are still to be measured, see ROADMAP A3b). Algo Clash had no `lib/judge/` to port yet, so this is the spike its ARCH §2.1 asks for.

## Decision
Compile with `@yowasp/clang` (22.0.0-git20542-10: clang/lld as WASM, libc++ for `wasm32-wasip1`) and run the output with an in-repo minimal WASI shim (`lib/judge/wasi.ts`). The shim exposes only stdin/stdout/stderr buffers and `proc_exit`; there is no filesystem, clock or network.

## Measurements (Node 22, desktop)
- Package: 101 MB unpacked on disk (about 27 MB tarball). Runtime fetch is about 105 MB of wasm and resources, so the first compile in a browser needs a persistent cache (service worker) and a progress UI. Not shipped in the Pages bundle.
- Compile, 20-line STL-heavy file: about 6-8 s cold (module compile included), about 5 s warm with `-O2`; `-O1` is not faster (8.2 s vs 5.7 s, noise). Use `-O2`.
- Output about 600 KB per program (libc++ iostream). Peak Node RSS about 580 MB, which is the iPhone risk (see A3b).
- `<bits/stdc++.h>` does not exist: `lib/judge/stdcxx.ts` supplies a shim header.

## Exceptions do not work
`-fexceptions` fails at link time (`undefined symbol: __cxa_allocate_exception`, `__cxa_throw`): the package has no libc++abi exception runtime. Even code without `throw` fails, because libc++ headers contain throw paths. Therefore we compile with **`-fno-exceptions`**; library errors (`vector::at`, `stoi` on bad input) abort, which the judge reports as RE ("abort or failed assertion"). Problems must never rely on a user's `try/catch`; the harness never throws. Interview solutions rarely do. This is stated honestly in the UI.

## Stack
`-Wl,-z,stack-size=...` does not control recursion depth here: deep recursion (100000 frames) trapped with the engine's own "Maximum call stack size exceeded" (the JS engine stack, not the WASM linear stack). 8000 frames was fine. Judged problems must keep recursion within a few thousand frames, or use an explicit stack; the run worker reports a stack-overflow RE.

## Native cross-check
The same 5M-element sort ran in 0.5 s natively; WASM timing is recorded by A3b so `timeLimitMs` can be calibrated per problem (ARCH §2.2).

## Consequences
- Verdicts: AC / WA / TLE (worker terminate) / RE (trap, abort, non-zero exit) / CE (clang diagnostics).
- Fallback if iPhone memory fails (A3b): desktop-only compiled battles, with paper mode on mobile. Never a C++ interpreter.
