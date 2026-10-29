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

## 2026-10-28: A3 C++ judge
- Algo Clash has no judge yet, so this ran the spike (ADR 0002). Added `lib/judge/`: `wasi.ts` (minimal WASI host), `compile.ts` (clang flags, `bits/stdc++.h` shim), `diagnostics.ts` (clang errors to line/column/snippet/hint), `verdict.ts` (AC/WA/RE/TLE/OLE, lines/tokens/float compare), clang and runner workers, `client.ts` (warm compiler worker, one killable runner worker per case), `scripts/fetch-clang.mjs`, `/dev/judge`, `scripts/smoke-judge.mjs`. The service worker caches `clang/` on first use.
- Findings: no `<bits/stdc++.h>` in libc++ (shimmed); no exception runtime, so the judge builds with `-fno-exceptions` and hints on throw/try; compile about 3 s warm, toolchain about 105 MB.
- Verification: `lint`, `typecheck`, `test` (17 pass, 7 new against real clang: AC/WA, compile-error hint, abort, exit code, stack overflow, output flood, compare modes), `build`, `build:pages` pass. `npm run smoke:judge` passes at desktop and iPhone 14 (AC, WA, RE, TLE, CE with hint, recovery after a TLE; no console errors or horizontal overflow); screenshots inspected.
- CI and Pages deploy confirmation skipped (Actions quota exhausted until 2026-11-01).
- Known gaps: TLE is only tested in the browser smoke (a sync loop can't be stopped in Node); no memory-limit verdict (reported as RE); no real-iPhone check; the `class Solution` harness comes with A4.
- Next: A4 (content pipeline).

## 2026-10-28: A4 content pipeline
- Added `scripts/content-verify.mjs` (`npm run content:verify`): validates and natively verifies Lab modules (reference passes visible + hidden tests incl. finite-difference gradient checks; the unmodified starter and every `wrong/*.py` must fail) and problems (reference vs brute on seeded cases from `gen.py`, every wrong solution must earn its documented verdict, mediums/hards need a TLE wrong solution, 3-rung hint ladder, complexity, editorial). Formats are documented in ARCH §4.
- Samples: Lab `content/labs/linear-gd` (MSE gradient + GD step, 3 wrong implementations) and problem `content/problems/top-k-tokens` (Hot Tokens, M, 2 WA + 1 TLE wrongs).
- `tests/content.test.ts`: the verifier accepts both samples and rejects mutated packages (wrong reference gradient, weak tests, undocumented wrong, reference/brute disagreement, missing TLE).
- Verification: `lint`, `typecheck`, `test` (24 pass), `build`, `build:pages`, `content:verify` (about 16 s) all pass. No visual change, so no screenshots.
- Environment note: in this image `python3` is 3.11 without numpy while `/usr/bin/python3` has it; the verifier probes for one (or set `$PYTHON`).
- CI and Pages deploy confirmation skipped (Actions quota exhausted until 2026-11-01). `ci.yml` does not yet run `npm run content:verify`; add that step after the quota period (workflow edits are frozen until then).
- Known gaps: no `class Solution` harness or in-browser run of packages yet (A5); Lab packages are not yet loaded by the app; hidden tests ship as files, not yet bundled as data.
- Next: A5 (editors).

## 2026-10-28: A5a editor logic
- A5 was too big for one run, so it is split (ROADMAP A5a done, A5b UI next). Added `lib/editor/`: `workspace.ts` (immutable multi-file Workspace: path validation, tree, create/rename/remove/reset, dirty tracking vs starter, draft restore that drops unsafe paths), `drafts.ts` (DraftStore with Memory and IndexedDB backends that never throw into play, debounced autosave with flush), `results.ts` (test report view model: `test_hidden_*` failures are masked so values cannot be read off, gradient-check relative error parsed from the `nc_test` message, text gauge).
- Verification: `lint`, `typecheck`, `test` (13 new in `tests/editor.test.ts`), `build`, `build:pages`, `content:verify` pass. No visual change, so no screenshots.
- CI and Pages deploy confirmation skipped (Actions quota exhausted until 2026-11-01).
- Known gaps: the IndexedDB backend is only tested for its failure path (no browser IDB in vitest); the real round trip is covered when A5b's Playwright smoke runs.
- Next: A5b (CodeMirror editor UI).
- Note: the first `npm test` run in a cold container reported 3 unhandled errors and skipped the 8 real-runtime tests (likely the cold toolchain staging); the immediate re-run passed 37/37.

## 2026-10-28: A5b editor UI
- Added `components/CodeEditor.tsx` (CodeMirror 6: Python/C++ highlighting, dark pixel-matched theme, per-file state so undo survives tab switches, failing-line marker), `components/EditorWorkbench.tsx` (file tree, tabs, new/delete/reset file with path validation, drafts via `lib/editor/drafts.ts` with autosave and restore, Run = sample checks, Submit = sample + hidden, test panel with gradient-check gauge, masked hidden checks, stdout, C++ compile errors with hints), `/dev/editor`, `lib/editor/tasks.ts` + `samples.ts` (a Python sigmoid task with a second `player` package file, a C++ sort task), `buildCppRows` (masks hidden C++ cases), `npm run smoke:editor`.
- Python: the entry file runs as `__main__`; other `.py` files are mounted as the `player` package. C++: only the entry file is compiled.
- Verification: `lint`, `typecheck`, `test` (39 pass, 2 new), `content:verify`, `build`, `build:pages` pass. `npm run smoke:editor` passes at desktop and iPhone 14 (starter fails, wrong derivative shows the gauge, correct solution accepted with hidden checks, draft restored after reload, unsafe path rejected, C++ reject/accept/compile error; no console errors or horizontal overflow); screenshots inspected.
- CI and Pages deploy confirmation skipped (Actions quota exhausted until 2026-11-01).
- Known gaps: multi-file C++ (includes between player files) is not supported yet; no rename UI (logic exists); no jump-to-definition or search (ARCH §6 later); no autocomplete.
- Next: A6 (save system v1).

## 2026-10-28: A6 save system v1
- Algo Clash has no save yet, so this adapts Query Clash's `save.ts` into `lib/save/`: `schema.ts` (versioned `SaveData`, `migrate` that rebuilds a valid save from any input, `sanitizeLatent` keeping only safe `.py` paths within size limits, tagged JSON `exportSave`/`importSave` that rejects foreign or newer files, `latentMount` for the `latent` package with the "use reference" toggle marked assisted), `store.ts` (`SaveBackend` with Memory and IndexedDB backends that never throw, `SaveManager` with subscribe, debounced persist, replace/reset/flush), `react.ts` (`useSave`, loads on first use, flushes on `pagehide`).
- Verification: `lint`, `typecheck`, `test` (48 pass, 9 new in `tests/save.test.ts`), `content:verify`, `build`, `build:pages` pass. No visual change, so no screenshots.
- CI and Pages deploy confirmation skipped (Actions quota exhausted until 2026-11-01).
- Known gaps: the IndexedDB round trip is only tested for its failure path (no browser IDB in vitest); no UI yet for export/import/reset (comes with the settings screen); the hook is not yet used by a page; the Pyodide mount of `latent` into the worker FS is wired when Lab flow lands (B6). Two of three `npm test` runs early in this session showed 3 unhandled errors and skipped the 8 real-runtime tests (cold toolchain staging while other commands ran); sequential reruns passed 48/48.
- Next: B1 (art: Neuron-Pup Perceptron, player, Professor Okafor, tileset).

## 2026-10-28: B1a Neuron-Pup Perceptron art
- B1 was too big for one run, so it is split (B1a done, B1b next: player, Professor Okafor, Python Port tileset, Lab interior).
- Added `game/sprites/pixel.ts` (palette + char-grid `SpriteDef`, adapted from Query Clash), `scripts/art/raster.mjs` (shaded ellipse/disc/line primitives, silhouette + inter-part outline pass, TS module writer), `scripts/art/neuron-pup.mjs` (the design) and `scripts/art/preview.mjs` (PNG contact sheet). Generated `game/sprites/creatures/neuron-pup-perceptron{,-back}.ts` (64×64, 4-shade fur/belly/signal ramps, outline). Front: idle 4, attack 5 (with a signal bolt), hurt 3, faint 4, evolve 4 (aura rings). Back: idle 4, attack 3, hurt 2, faint 3.
- Design reads as the concept: ears end in input nodes, the chest shows a 3-input perceptron (inputs, weighted sum, output), the tail ends in the bias knob, the forehead has a sigma gem.
- `/dev/sprites` (`components/SpriteLab.tsx`) plays every animation at its fps on plain canvas with nearest-neighbour scaling. Pixi is not needed until the battle stage (B3).
- Verification: `lint`, `typecheck`, `test` (61 pass, 13 new in `tests/sprites.test.ts`), `content:verify`, `build`, `build:pages` pass. Playwright on the static export at desktop 1280×900 and iPhone 14: no console errors, no horizontal overflow; screenshots inspected.
- CI and Pages deploy confirmation skipped (GitHub Actions quota exhausted until 2026-11-01).
- Known gaps: back view is simpler than the front (head reads large; polish later); evolve is aura-only until the Multilayer form exists for a real morph; no sprite-sheet PNG export yet; no hurt-flash tests beyond `frameToRGBA`. Cold containers need `npm run stage:pyodide && npm run stage:clang` before `npm test` or 8 runtime tests are skipped.
- Next: B1b, then B2 (overworld + dialogue engine).

## 2026-10-29: B1b-i character art
- B1b was split again (B1b-i characters done, B1b-ii tileset + Lab interior next).
- Added `scripts/art/characters.mjs` and generated `game/sprites/characters/{player,okafor}{,-portrait}.ts`: 16×24 overworld sprites (walk cycles of 4 frames in four directions, plus breathing stand frames) and 48×48 portraits (idle with blink, talk, smile, think). Player: teal hoodie, headphones, satchel. Prof. Lumen Okafor: lab coat, round glasses, curly grey hair, slate tablet. Registered in the roster; `/dev/sprites` shows them. `toModule` now quotes animation keys.
- Tests: character-specific cases in `tests/sprites.test.ts` (sizes, walk cycles differ, talk changes the mouth); creature size bar applies to creatures only.
- Verification: `lint` (warnings only), `typecheck`, `test` (81 pass), `content:verify`, `build`, `build:pages` pass. Playwright on the static export at desktop and iPhone 14: no console errors, no horizontal overflow; screenshots inspected.
- CI and Pages deploy confirmation skipped (Actions quota exhausted until 2026-11-01).
- Known gaps: the back-facing Okafor is a plain hair ball; overworld sprites are small and face detail is minimal (2px eyes); no sleeve or tablet animation; portraits have no gender-neutral variants or player customisation yet.
- Next: B1b-ii (tileset + Lab interior), then B2.

## 2026-10-29: B1b-ii tilesets
- Added `scripts/art/tiles.mjs` and generated `game/sprites/tiles/{python-port,lab}-tiles.ts`: 16×16 opaque tiles, each tile a named "animation" (1 frame static, 2–4 animated). Python Port (19 tiles): swaying grass, flowers, cobble path, 4-frame water and shoreline, trees, fence, `{}` signpost with blinking cursor, flickering lamp, roof/wall/window/door, a coiled-serpent statue with a flicking tongue, bench. Lab (18 tiles): slate floor, wall, windows, whiteboards (loss curve, equations, cursor), desks, 4-frame code monitor, blinking server racks, plants, bookshelf, the 4-frame glowing-neuron Training Rig, rug, door, coffee machine. `idle` aliases `grass` / `rig` so the validator and `/dev/sprites` treat tilesets like any sprite.
- Added `game/sprites/tilemap.ts` (pure: `validateMap`, `composeMap`, `mapSprite`) and `maps.ts` (a Python Port town and the Lab as character-grid maps with legends). `/dev/sprites` shows both composed preview scenes; B2's overworld engine will reuse the same tiles and legends.
- Verification: `lint` (warnings only), `typecheck`, `test` (93 pass; new tileset and map tests: 16×16, fully opaque, animated tiles change, seamless edges, map validation, composition), `content:verify`, `build`, `build:pages` pass. Playwright on the static export at desktop and iPhone 14: no console errors, no horizontal overflow; screenshots of both preview scenes and tilesheets inspected.
- CI and Pages deploy confirmation skipped (Actions quota exhausted until 2026-11-01).
- Known gaps: no path/shore edge or corner variants (maps use plain tiles; autotiling comes with B2), no collision/interaction metadata yet (B2), no interior props for the house, tile palettes are per-tileset (48 colours max).
- Next: B2 (overworld + dialogue engine).

## 2026-10-29: B2 overworld + dialogue engine
- B2 was split (B2a logic, B2b UI), both done. Algo Clash and Query Clash have no walkable overworld (Query's is a node map), so this is new code.
- `lib/world/world.ts` (pure): grid walker with 0.18 s steps (a step in flight always completes), solid tiles, NPC and prop blocking, warps firing on arrival, facing-tile interaction, NPCs turning to the player, clamped/centred camera. `lib/world/maps.ts` (Python Port and the Lab with warps both ways, Okafor, a dockhand, props) and `lib/world/scripts.ts` (original dialogue). `lib/dialogue/dialogue.ts`: scripts as graphs with flag effects, flag-conditioned choices and branches, router lines resolved instantly, `validateScript`, code-point typewriter.
- `game/render/{atlas,overworld}.ts` and `components/Overworld.tsx` (`/play`): canvas at 11×8 tiles scaled with nearest neighbour, animated tiles, walk cycles, y-sorted actors, dialogue box with animated portrait, keyboard (arrows/WASD, Enter/Space/E, 1-9 for choices) and touch d-pad + A button (44 px+ targets).
- Verification: `lint` (warnings only), `typecheck`, `test` (110 pass; 17 new in `tests/world.test.ts`: map validity, warp landings standable, flood-fill reachability of the Lab door, movement, interpolation, big-dt collision, warps, interaction, camera, dialogue branching, script validation), `content:verify`, `build`, `build:pages` pass. `npm run smoke:overworld` passes 20 checks at desktop and iPhone 14 (walk to the door, warp, talk to Okafor, choose, close; no console errors or horizontal overflow); screenshots inspected.
- CI and Pages deploy confirmation skipped (Actions quota exhausted until 2026-11-01).
- Known gaps: the dockhand reuses Okafor's sprite (needs its own art); dialogue flags are not saved yet (save wiring comes with B6/B8); no NPC wandering, no map-edge autotiling, no screen transitions or audio (B9); the title screen does not link to `/play` yet.
- Next: B3 (battle stage and card battles).

## 2026-10-29: B3 battle stage and card battles (B3a + B3b)
- B3 was split: B3a (logic) and B3b (UI) done; B3c (curve/technique/trade-off cards, real foe art, content loader) added.
- `lib/solvers/` (pure): stable logsumexp/softmax/softmax-CE, sigmoid, BCE-with-logits, MSE and their gradients; numpy shape rules (broadcast, matmul incl. 1-D and batch, conv output size, reshape with -1, head split, reduce); confusion/precision/recall/F1, ROC AUC, nDCG, MRR, recall@k, ECE, perplexity.
- `lib/cards/`: card types (mcq, multi, derive, shape, metric, bug), `check` (tolerances, malformed input never throws), `parseShape`, seeded generators (11: softmax-CE/BCE/MSE gradients, matmul/broadcast/conv/heads/reshape shapes, P/R/F1, AUC, nDCG), demo deck.
- `lib/battle/battle.ts`: pure state machine: streak-scaled damage, counter-hits, hearts, missed cards requeued 3 turns later, first-try tracking, win by knockout or on points, stars.
- `/battle` (`components/Battle.tsx`, `game/render/battle.ts`): illustrated stage, lunge + signal bolt, white hurt flash, recoil, faint, shake, floating damage, HP bars, forms for every card type, feedback with explanation, result screen.
- Verification: `lint` (warnings only), `typecheck`, `test` (134 pass; 24 new in `tests/cards.test.ts`: finite-difference gradient checks, numpy cross-check for gradients/shapes/nDCG, 200 seeds × 11 generators accepted by their own checker, the softmax bug card proven by running buggy and fixed code natively), `content:verify`, `build`, `build:pages` pass. `npm run smoke:battle` passes at desktop and iPhone 14 (hits, counters, loss, restart; no console errors or horizontal overflow); screenshots inspected.
- CI and Pages deploy confirmation skipped (Actions quota exhausted until 2026-11-01).
- Known gaps: the foe is the Perceptron front sprite recoloured (placeholder, needs its own art); no win-path in the smoke test (needs card answers exposed; logic is unit-tested); no intro transition, audio or keyboard shortcuts for answers; the numpy cross-check needs a python3 with numpy (`/usr/bin/python3` fallback). Win/lose does not touch the save yet.
- Next: B3c, then B4 (Python Port content, part 1).

## 2026-10-29: B3c-i curve, technique and trade-off cards + deck loader
- B3c was split: B3c-i (this) done; B3c-ii (Noise-minion sprite) remains.
- `lib/cards/curves.ts`: real full-batch gradient-descent polynomial-regression runs (noisy sine) for four diagnoses (overfitting, underfitting, learning rate too high, healthy). `classifyCurves` names a pair of curves from the numbers alone; `genCurve` scans seeds until the *displayed* (downsampled, clipped) curves classify as the intended diagnosis, so a card cannot mislabel its picture.
- New `curve` card kind (types, checker, SVG log-scale chart in `/battle`); `mcq` gains a `variant` ("technique" / "tradeoff") shown in the header.
- `lib/cards/loader.ts`: `validateCard` / `loadDeck` never throw; bad cards are dropped and reported. `content/decks/foundations-strategy.json`: 6 technique/trade-off cards (RAG vs fine-tune, LoRA, imbalance metrics, batch size, ANN recall), an LLM-judge-bias multi-select, plus 6 generated curve cards. Demo deck now includes them.
- Verification: `lint` (warnings only), `typecheck`, `test` (139 pass; new: curve label vs classifier over 40 seeds, curves are real runs, deck loads clean, loader reports malformed cards), `content:verify`, `build`, `build:pages` pass; `smoke:battle` passes; Playwright screenshots of a curve card at desktop and iPhone 14 inspected (no console errors, no overflow; first version plotted the exploded run as a flat clip, fixed with a log axis).
- CI and Pages deploy confirmation skipped (Actions quota exhausted until 2026-11-01).
- Known gaps: the "leakage" diagnosis has no curve card (indistinguishable from healthy on loss alone; needs a dataset-based card); technique/trade-off content is a starter set, CUR topic ids are provisional; no "as of" stamps needed yet (no time-sensitive facts) but the RAG/LoRA cards should be revisited with B-series LLM content; Noise-minion art still a placeholder.
- Next: B3c-ii (Noise-minion sprite), then B4.

## 2026-10-29: B3c-ii Noise-minion sprite
- Added `scripts/art/noise-minion.mjs` and generated `game/sprites/creatures/noise-minion.ts` ("Static"): 64×64, 4-shade magenta ramp, outline, spiky fuzz ring, one bloodshot eye, jagged mouth, seeded grain speckles that re-roll per frame, orbiting glitch blocks. Idle 4, attack 4+1 (crackling noise ball), hurt 3, faint 4. Registered in the roster (`/dev/sprites`); the existing sprite tests cover it.
- `/battle` now uses it as the foe (no recolour; the white hurt flash is kept). Fixed a layout bug found in the screenshots: the HP name boxes were attached to the wrong creature, so each bar now sits above its own creature (hero top-left, foe top-right).
- Verification: `lint` (warnings only), `typecheck`, `test` (145 pass after staging runtimes), `content:verify`, `build`, `build:pages` pass; `smoke:battle` 10/10 at desktop and iPhone 14 (no console errors or overflow); contact sheet and battle screenshots inspected.
- CI and Pages deploy confirmation skipped (Actions quota exhausted until 2026-11-01).
- Known gaps: the unused `"noise"` tint branch in `game/render/battle.ts` can go; the minion has no back view (not needed) and no evolve; other Noise agents (Overfit, Leakage, ...) still need their own art.
- Next: B4 (Python Port content, part 1).
