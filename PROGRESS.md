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
- Scaffolded from Query Clash: Next.js 16 / React 19 / Tailwind 4 / Pixi 8 / CodeMirror deps, PWA manifest + generated service worker (`scripts/gen-sw.mjs`, worker-fragment fix kept, no PGlite), `ci.yml` (node + python, installs `requirements-dev.txt` if present) and `pages.yml` (basePath `/neural-clash`), `scripts/gen-icons.mjs` (dependency-free PNG icons from the seed sprite).
- Title screen: pixel title, placeholder "seed" Neuron-Pup (16×13 character-grid sprite via `lib/pixelGrid.ts`, tested) and a handheld-style menu (disabled stubs).
- Verification: `npm run lint`, `typecheck`, `test` (3 tests), `build`, `build:pages` all pass. Playwright on the static export at 1280×800 and iPhone 14: no console errors, no horizontal overflow; viewed the iPhone screenshot, text readable.
- CI/Pages deploy confirmation skipped (GitHub Actions quota exhausted until 2026-11-01).
- Branch note: work was committed to the session branch `claude/wonderful-goodall-mxvn6g` as instructed by the harness, not `main`.
- Known gaps: the seed sprite is a placeholder (real 64×64 animated form is B1); menu items are not links yet; the algo-clash judge/overworld don't exist yet.
- Next: A2 (Pyodide runtime).
