# ADR 0001: Pyodide runtime for the player's Python

Status: accepted, 2026-10-28.

## Decision
- **Pyodide 314.0.7** (Python 3.14, numpy 2.4.6) from the `pyodide` npm package, served same-origin from `public/pyodide/` (git-ignored, staged by `scripts/fetch-pyodide.mjs` before dev, build and build:pages). No CDN at runtime.
- The npm package has the core but not the numpy wheel, so the script extracts it once from the official GitHub release tarball (about 340 MB download, cached in `.cache/`) and verifies it against `pyodide-lock.json`. Only numpy is staged; add packages to `WHEELS` in that script.
- **The worker is bundled by esbuild** to `public/pyodide/worker.mjs` and started as a module worker. Pyodide 314 throws "Classic web workers are not supported", and Next/Turbopack emits classic workers, so `new Worker(new URL(...))` cannot be used.
- Runtime logic lives in `lib/py/core.ts` (`PyCore`, depends only on a small Pyodide interface) so the Node tests exercise the same code as the browser. `lib/py/client.ts` (`PyClient`) is the main-thread handle.
- **Execution model:** each run executes in a fresh `__main__` namespace; mounted packages (`latent`, reference) are purged from `sys.modules` before each run so edits take effect. Stuck code is stopped by `worker.terminate()` after a timeout (default 10 s) and the next call respawns the worker and re-mounts packages. stdout/stderr are captured per run. `nc_test.guard_arrays` rejects numpy allocations above 5 M elements.
- **Harness:** `lib/py/nc_test.py` (`assert_close`, central-difference `grad_check`, `run_tests`), embedded into the worker via the generated `nc_test.py.gen.ts`; a test checks that it is in sync. The same file runs natively under python3 + numpy for `content:verify` (A4).

## Measured (Chromium headless, this container, static export)
- Runtime + numpy + harness ready in about 3.0-3.9 s from a cold click (local server, so no network cost); respawn after a timeout about 2.9-3.4 s.
- Download: about 9.6 MB wasm + 1.25 MB glue + 2.5 MB stdlib + 3.0 MB numpy, roughly 16 MB before compression.

## Offline caching
The service worker does not precache `pyodide/` on install (that would add ~16 MB to every first visit). It caches those files on first use in the `nc-pyodide-v1` cache, which is not wiped on deploys (the app cache is `neural-clash-<hash>`). Bump the suffix when Pyodide is upgraded.

## iPhone policy
Pyodide loads only on screens that run Python, never on the title or overworld. Expected heap about 100-150 MB, within iPhone 14 limits, but a real-device check is still owed (Playwright's iPhone profile emulates viewport and touch, not Safari's memory limits). If loading fails the UI shows the error and the Lab falls back to reading the lesson. Long-running training uses the Training screen's own budgets, not this path.

## Consequences
- CI must download the release tarball when `.cache/` is cold (it cannot cache, since workflow edits are out of scope during the Actions quota). If this hurts, host the numpy wheel as a release asset of this repo and fetch that instead: owner decision.
- Upgrading Pyodide changes the numpy ABI tag and the Python version; re-run the tests and the smoke script.
