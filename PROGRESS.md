# Neural Clash progress

Append a dated entry after every run: what changed, how it was verified (commands, screenshot notes), known gaps, what's next. Newest at the bottom.

## 2026-10-28: Project seeded
- Added `CLAUDE.md`, `ROADMAP.md` (phases A–I), `docs/GAME_DESIGN.md`, `docs/CURRICULUM.md` and `docs/ARCHITECTURE.md`.
- Interview-format research checked 2026-10-28:
  - Meta's AI-enabled round (since Oct 2025) uses a multi-file codebase with phases bug fix → implement → optimise, scored on problem solving, code quality, verification and communication.
  - Google is piloting AI-assisted code-comprehension rounds.
  - Applied-AI loops emphasise RAG, evals (LLM-as-judge calibration and biases), agent debugging and system design around models you don't control.
- The C++ judge should be ported from Algo Clash once it exists (`@yowasp/clang` ships libc++ for wasm32-wasip1).
- Next: ROADMAP A1.

## 2026-10-28: A1 scaffold
- Scaffolded from Query Clash: Next.js 16 / React 19 / Tailwind 4 (Pixi and CodeMirror are added by the boxes that need them), static export with basePath `/neural-clash`, the PWA manifest, generated icons and `scripts/gen-sw.mjs` (precaching service worker, keeps the worker-fragment fix), `ci.yml` (installs `requirements-dev.txt`, runs lint, typecheck, test, build, `build:pages`) and `pages.yml`. No SQL/PGlite code carried over.
- Title screen: pixel title, animated SVG network, disabled Start (the Python Port opens with B2). Smoke test for the manifest.
- Verification: `npm run lint`, `typecheck`, `test` (1 passed), `build`, `build:pages` all pass locally. Playwright on the static export at desktop 1280×800 and iPhone 14: no console errors, no horizontal overflow, text readable, tap target ≥ 44 px.
- CI and Pages deploy confirmation skipped (GitHub Actions quota exhausted until 2026-11-01).
- Pushed to both `main` (the repo's protocol) and the session branch `claude/wonderful-goodall-jaadqf`.
- Known gaps: no Play route, no Pixi, icons are a simple generated network glyph (replace in B1).
- Next: A2 (Pyodide runtime).

## 2026-10-28: A2 Pyodide runtime
- Added `lib/py/` (`core.ts` PyCore, `client.ts` PyClient with timeout + respawn, `pyodide.worker.ts`, `nc_test.py` harness with finite-difference `grad_check`, allocation guard, per-run fresh namespace, package mounting), `scripts/fetch-pyodide.mjs` (stages Pyodide 314.0.7 + numpy and bundles the worker with esbuild), `/dev/pyodide` page, `scripts/smoke-pyodide.mjs` (Playwright), ADR 0001.
- Service worker: `pyodide/` is cached on first use in a persistent `nc-pyodide-v1` cache instead of precached.
- Finding: Pyodide 314 rejects classic workers, which Next/Turbopack emits, so the worker is an esbuild-bundled module worker (see ADR).
- Verification: `lint`, `typecheck`, `test` (10 passed, incl. 8 real-Pyodide-in-Node tests: stdout, error lines, fresh namespace, test runner, gradient check accepts right and rejects wrong, memory guard, package reload, path traversal), `build`, `build:pages` pass. `npm run smoke:pyodide` passes at desktop and iPhone 14 (load about 3-4 s, timeout stops an infinite loop, worker respawns, no console errors, no horizontal overflow); screenshots inspected.
- CI and Pages deploy confirmation skipped (Actions quota exhausted until 2026-11-01).
- Known gaps: load progress is by stage, not bytes; no real-iPhone memory check; CI downloads a ~340 MB tarball when `.cache/` is cold (owner may prefer hosting the wheel; see ADR). The session runs on branch `claude/wonderful-goodall-n5g3zi` as well as `main`.
- Next: A3 (C++ judge).
