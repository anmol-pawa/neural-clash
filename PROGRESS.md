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

## 2026-10-29: B4a Python Port card deck
- B4 was split: B4a (cards, this run), B4b (lessons), B4c (10 judged functions).
- `content/decks/python-port.json`: 32 cards over 20 topics (data model, closures, generators, copies, collections, heapq, bisect, itertools, functools, decorators, context managers, exceptions, dataclasses, complexity, recursion, typing, testing, floats). 21 are new `predict` MCQs (`variant: "predict"`, `code` shown in a code block) whose right choice is the **real stdout** of the snippet. The file is generated by `scripts/gen-python-deck.mjs`, which runs each snippet in native python3, refuses a distractor equal to the real output, and proves each spot-the-bug card (buggy vs fixed differ on exactly one line and change behaviour). `--check` fails if the JSON is stale.
- Card model/loader/UI: `McqCard.code` and the `predict` variant, validated by the loader (empty code lines allowed), rendered as a scrollable code block in `/battle` with the header "predict the output". `PYTHON_DECK` is exported from `lib/cards/samples.ts` and 6 random Python cards join the demo deck.
- `smoke:battle` previously relied on luck for its hit; it now answers known hand-written mcq cards from the deck JSON (including predict cards) and screenshots the first predict card.
- Verification: `lint` (warnings only), `typecheck`, `test` (149 pass; new: deck loads clean, every predict answer re-run natively and unique among choices, answer positions spread, generator `--check`), `content:verify`, `build`, `build:pages`, `smoke:battle` 10/10 at desktop and iPhone 14 (no console errors or horizontal overflow). Predict-card screenshots inspected on both.
- CI and Pages deploy confirmation skipped (Actions quota exhausted until 2026-11-01).
- Known gaps: cards are not yet linked to lessons (B4b); long code lines scroll horizontally inside the code block on iPhone; no syntax highlighting on cards; the Python deck is not yet reachable outside the demo battle mix (deck picker comes with the Python Port guardian, B8).
- Next: B4b (Python Port lessons), then B4c.

## 2026-10-29: B4b Python Port lessons
- `scripts/gen-python-lessons.mjs` generates `content/lessons/python-port.json`: 10 original lessons covering all 20 deck topics (data model/slicing/numbers, comprehensions/generators, closures/decorators/functools, aliasing/copies, collections/complexity, heapq/bisect/itertools, context managers/exceptions, dataclasses/typing, recursion, testing numerics). Each has worked examples whose output is the real stdout from native python3 (`--check` detects staleness), takeaways and a common trap.
- `lib/lessons/lessons.ts` (topic to lesson lookup), `/learn` reader (`components/Learn.tsx`, list at `/learn`, lesson at `/learn#<id>`), a "Python Port lessons" link on the title screen, and a "Lesson: ..." link in `/battle` feedback (opens in a new tab so the battle is kept).
- Verification: `lint` (warnings only), `typecheck`, `test` (153 pass; new `tests/lessons.test.ts`: every deck topic has exactly one lesson, examples re-run natively, generator `--check`), `content:verify`, `build`, `build:pages`, `smoke:learn` 8/8 and `smoke:battle` pass at desktop and iPhone 14; screenshots inspected (no console errors or overflow).
- CI and Pages deploy confirmation skipped (Actions quota exhausted until 2026-11-01).
- Known gaps: no syntax highlighting; lessons are not yet gated by progress or saved as read; "Practise" links to the generic demo battle, not a topic deck.
- Next: B4c (10 judged Python functions).

## 2026-10-29: B4c ten judged Python functions
- Added ten Lab packages under `content/labs/py-*` (phase `python-port`): top-k frequent words, two sum, merge intervals, LRU cache, moving average, group anagrams, flatten (iterative, deep-nesting safe), running mean/variance (Welford), batch iterator (lazy generator), lower bound. Each has a lesson with the interview signal, a failing starter (`spec.py`), a reference, visible and hidden tests, and three documented wrong implementations (30 in total: ties by first-seen, self-pairing, touching intervals, no-refresh LRU, partial windows, `str` recursion, naive variance cancelling at 1e9, reused batch list, `bisect_right`, O(n²) and O(n) variants...).
- Performance claims are tested without wall-clock flakiness: read-counting list subclasses (moving average, lower bound), a deep-nesting test and large inputs.
- Verification: `content:verify` (every reference passes, every starter and wrong implementation fails the hidden tests; two weak suites found and strengthened), `lint` (warnings only), `typecheck`, `test` (155 pass; new inventory test), `build`, `build:pages`. No visual changes, so no screenshots.
- CI and Pages deploy confirmation skipped (Actions quota exhausted until 2026-11-01).
- Known gaps: the packages are not yet surfaced in the editor/task list or a `/labs` index (comes with the Lab flow, B6); no hint ladder or editorial per function (lesson only); timing-based TLE checks use read counts, not the Pyodide worker timeout.
- Next: B5 (Python Port part 2: numpy, broadcasting, vectorisation).

## 2026-10-29: B5a numpy cards and lessons
- B5 was split: B5a (cards and lessons, this run), B5b (8 vectorisation challenges).
- `scripts/gen-numpy.mjs` generates `content/decks/numpy.json` (28 cards: 13 predict-the-output whose answers are real numpy stdout, 11 shape cards whose answers come from numpy and are cross-checked against `lib/solvers` broadcast/matmul in tests, 4 concept cards, a views-vs-copies multi-select, and a proven spot-the-bug) and `content/lessons/numpy.json` (5 lessons: dtypes, views/copies, broadcasting, axes/indexing, numerical stability and seeded generators; every output computed natively). `--check` detects staleness.
- Loader now accepts pre-computed `shape` cards (answer must be a size list or null); `/learn` lists 15 lessons; the demo battle mixes in numpy cards.
- Verification: `lint` (warnings only), `typecheck`, `test` (159 pass; new `tests/numpy.test.ts`, lessons test extended), `content:verify`, `build`, `build:pages`, `smoke:learn` (15 lessons) and `smoke:battle` pass at desktop and iPhone 14; list screenshot inspected (no console errors or overflow).
- CI and Pages deploy confirmation skipped (Actions quota exhausted until 2026-11-01).
- Known gaps: einsum and pandas-lite have no cards yet; shape card input accepts "error" but there is no hint ladder; numpy outputs depend on numpy 2.x printing (guarded by `--check` and the test).
- Next: B5b (numpy vectorisation challenges).

## 2026-10-29: B5b eight numpy vectorisation challenges
- Eight Lab packages under `content/labs/np-*` (phase `python-port`): pairwise distances, row softmax, column standardisation, one-hot, cosine-similarity matrix, top-k per row, max drawdown, confusion matrix. Each has a lesson with the interview signal, a failing starter, reference, visible + hidden tests and 4-5 documented wrong versions (37 total): Python loops, missing clip (NaN), unstable softmax, wrong axis, ddof, in-place mutation, `labels.max()` width, silent negative-index wrap, `C[t,p] += 1` counting duplicates once, unstable tie order, global-vs-running peak, and so on.
- "Vectorised" is proven, not asserted: new `nc_test.python_lines(fn, ...)` counts Python lines executed in the player's file via `sys.settrace` (works in Pyodide and native). Hidden tests require a handful of lines on thousands of rows, so a correct element-loop is rejected with a clear message. `nc_test.py.gen.ts` regenerated.
- `content:verify` caught three of my own mistakes and I fixed them: a test scale where the reference itself could not meet its tolerance, a top-k reference that mishandled boundary ties (now a stable `argsort`; the `argpartition` trade-off is in the lesson), and an "unordered partition" wrong version that numpy 2.x happens to return sorted (replaced by a deterministic index-order wrong version).
- Verification: `lint` (warnings only), `typecheck`, `test` (162 pass; new inventory + native verify of all `np-*` packages), `content:verify`, `build`, `build:pages` pass. No visual changes, so no screenshots.
- CI and Pages deploy confirmation skipped (Actions quota exhausted until 2026-11-01).
- Known gaps: packages are not yet surfaced in the editor or a labs index (Lab flow, B6); no hint ladder/editorial beyond the lesson; the line-count threshold is 40 lines, so tiny hand-unrolled code could pass (acceptable).
- Next: B6 (Lab flow v1 + Forge linear model module).

## 2026-11-02: B6a Lab flow v1
- B6 was split: B6a (Lab flow, this run), B6b (Forge linear-model module + companion stats).
- `scripts/gen-labs.mjs` bundles every `content/labs/*` package (lesson, starter, visible and hidden tests; no references or wrong versions) into `lib/labs/labs.gen.ts`; hidden tests are renamed `test_hidden_*` so the panel masks failing values. `lib/labs/catalog.ts` (grouping, brief, task builder). `/labs` index (19 labs by phase, solved badges) and `/labs#<id>` (lesson + multi-file editor + Run/Submit); an all-pass Submit saves `labs[id].passed`. `EditorWorkbench` gained `onResult` and `hideHeader`; mobile panel height fixed (editor overlapped the file tree). Title screen links to Labs.
- Verification: `lint` (warnings only), `typecheck`, `test` (165 pass, new `tests/labs.test.ts`), `content:verify`, `build`, `build:pages`, `smoke:labs` at desktop and iPhone 14 (reference accepted, solved state persists, no overflow or console errors); iPhone screenshot inspected.
- Env note: `/usr/local/bin/python3` here lacks numpy; run with `PATH=/usr/bin:$PATH`.
- CI/Pages: this run was committed to the designated branch `claude/wonderful-goodall-jpmlxg` and main (see below); Actions confirmation not polled.
- Known gaps: no hint ladder/editorial; Labs not yet gated by progression or tied to companion stats.
- Next: B6b.

## 2026-11-02: B6b linear-gd extended, hint ladder, companion stats
- `linear-gd` now has four functions: `mse_loss_grad`, `gd_step`, `fit` (train loop, loss recorded before each step) and `r2_score`. Hidden tests: exact history, monotone loss, match to `np.linalg.lstsq`, hand-computed R², constant-target edge cases. Three new wrong versions (loss-after-step, w starts at ones, uncentred R²) are all rejected by `content:verify`. Lesson gained a "Train it, then score it" section.
- Hint ladder: `meta.hints` is bundled into the catalog and shown one rung at a time on the lab page (`Hints` in `components/Labs.tsx`); the lesson renderer now shows `## ` headings.
- `lib/labs/companion.ts`: pure `companionStats` (Attack = test R², Defence = 1/(1+gap/0.1), Speed = log-scaled params), unit-tested. Not yet wired to the UI; B7 (Training Grounds) will feed it real test metrics.
- Fixed a mobile bug: the lab article grid expanded to the editor's content width (811px on iPhone 14); now `minmax(0,1fr)`.
- Verification: lint (warnings only), typecheck, test (170 pass), content:verify, build, build:pages, smoke:labs at desktop and iPhone 14 (hints, accepted submit, no overflow, no console errors; iPhone screenshot inspected).
- CI/Pages: Actions quota note expired (2026-11-01); confirmation attempted after push.
- Known gaps: only linear-gd has hints; stats mapping weights are a first guess to tune in B7/B8.
- Next: B7 Training Grounds v1.

## 2026-11-02: B7a Training Grounds trainer core
- B7 was split: B7a (pure trainer, this run), B7b (UI: worker, live curves, decision boundary, hidden-set battle).
- `lib/train/datasets.ts`: seeded toys (blobs, xor, circles, moons, noisy line), `makeSplit` with independent train/test streams (the test set is the hidden one), `polyFeatures`. `lib/train/linear.ts`: linear (MSE) and logistic (stable BCE) models with analytic gradients, polynomial features, L2 on non-bias weights, full-batch or seeded mini-batch SGD, per-epoch train (and optional validation) loss, `evaluate`/`score`, and `companionMetrics` feeding `companionStats` from measured hidden-set metrics.
- Tests (`tests/train.test.ts`, 16 new): finite-difference gradient checks for both models with L2; stability at logit ±1000; bit-for-bit seeded determinism; **equivalence with a native numpy reference** (`tests/helpers/train_ref.py`) on four configs, weights and full loss history within 1e-9; behaviour tests (planted line recovered, logistic fails XOR until degree 2 adds x1·x2, degree-5 overfits a 12-point set and L2 narrows the gap, overfit companion has weaker defence).
- Verification: lint (warnings only), typecheck, test (186 pass, with `PATH=/usr/bin:$PATH` for numpy and `npm run stage:pyodide`), content:verify, build, build:pages. No visual changes, so no screenshots.
- CI/Pages: not polled this run (no Actions confirmation attempted).
- Known gaps: no UI yet; no MLP (arrives with autograd phase); stats weights still a first guess.
- Next: B7b.

## 2026-11-03: B7b-1 Training Grounds UI
- B7b was split: B7b-1 (this run), B7b-2 (reveal battle, stat saving).
- `train()` gained an `onEpoch` observer (numerics unchanged). `lib/train/session.ts`: pure `runSession` (train/validation/hidden-test as three independent streams, bounded boundary frames, final sealed hidden metrics). `train.worker.ts` + `client.ts` + `scripts/stage-train.mjs` (esbuild to `public/train/worker.mjs`, chained into `stage:pyodide` so CI/dev/build pick it up).
- `/train` (`components/Train.tsx`): world picker (blobs/XOR/rings/moons/line), degree, learning rate, epochs, L2, data size, noise, batch, seed; live pixel-block decision boundary with training points, train/validation loss curves, "Reveal hidden score" then measured companion stats. Title screen links to it.
- Verification: lint (warnings only), typecheck, test (190 pass; 4 new session tests: frame bound, determinism vs `train()`, sealed score equals `evaluate`, grid orientation), content:verify, build, build:pages, `smoke:train` at desktop and iPhone 14 (XOR: line 54.8% vs degree 2 99.5% hidden; sealed before reveal; no overflow/console errors); screenshots inspected. One full-suite run showed a transient failed test file that did not recur on rerun (likely Pyodide worker flake).
- CI/Pages: Actions quota note expired 2026-11-01; not polled this run.
- Known gaps: regression heat-map scale is fixed; no save of trained stats yet; curves are plain canvas lines, not yet pixel-art styled.
- Next: B7b-2.

## 2026-11-03: B7b-2a Save companion and pixel curves
- B7b-2 was split: B7b-2a (this run), B7b-2b (reveal battle).
- Save schema gained `companion` (world, attack/defence/speed clamped to 0-100 ints, hidden score, savedAt) with `sanitizeCompanion` (malformed records become null; round-trips through export/import). `/train` shows "Save as my companion" after the reveal and the currently saved companion. Loss curves are now stepped 3px pixel blocks with a dotted grid.
- Verification: lint (warnings only), typecheck, test (192 pass; 2 new save tests), content:verify, build, build:pages, `smoke:train` at desktop and iPhone 14 (save works, no overflow or console errors); iPhone screenshot inspected.
- Env note: run `npm run stage:pyodide` (downloads ~340 MB once) and use `PATH=/usr/bin:$PATH` before tests.
- CI/Pages confirmation not polled this run.
- Known gaps: saved stats are not yet used in a battle; save keeps only the latest companion (no best-of).
- Next: B7b-2b.

## 2026-11-03: B7b-2b Hidden-set reveal battle
- `lib/train/revealBattle.ts`: pure, deterministic fight vs Overfit's minion driven by measured companion stats (Attack = damage, Defence = absorbs its blow, Speed = initiative; 8-round limit so near-chance models cannot win; lesson keyed to the weakest stat). `/train` shows an "Overfit's minion" panel after the reveal with pixel-stepped HP bars, round-by-round playback, skip and fight-again. GDD §5.3 updated.
- Tests (`tests/revealBattle.test.ts`, 7): determinism, monotonicity, speed order, consistent log, lessons, and end to end on measured models (XOR: degree 2 wins, a straight line does not). `smoke:train` extended at desktop and iPhone 14; iPhone screenshot inspected.
- Verification: lint (0 errors), typecheck, test (199 pass), content:verify, build, build:pages, smoke:train.
- Known gaps: the minion has no sprite or move animation yet (B8 boss art); balance is a first guess; the fight uses the current run's stats, not the saved companion on its own.
- Next: B8 Python Port guardian battle.

## 2026-11-03: B8a Guardian core and Warden Indent art
- B8 was split: B8a (this run), B8b (guardian UI).
- `lib/guardian/portGuardian.ts`: pure, deterministic three-phase Python Port guardian (cards duel reusing `lib/battle`, then a judged Lab task, then the hidden-set fight vs Overfit's minion via `fightOverfit`). Phases cannot be skipped; hearts out in phase 1 loses; a weak companion loses phase 3 but can retry with better stats without redoing phases 1-2. Clearing yields the "Indent Badge" (`guardian:python-port`, to be stored in `cleared` by the UI).
- Art: `scripts/art/warden-indent.mjs` generates `WARDEN_INDENT` (96×96): a hooded serpent on three coils each indented one step further, four floating blocks (Python's four-space indent), fangs and forked tongue; 4 idle, 5 attack (lunge + `>>>` bolt), 3 hurt, 4 faint frames. Registered in the roster (shows on `/dev/sprites`); contact sheet inspected.
- Verification: lint (0 errors), typecheck, test (212 pass; new `tests/guardian.test.ts`, 7 tests), content:verify, build, build:pages. No UI change, so no Playwright screenshots this run.
- Env note: after `npm ci`, run `npm run stage:pyodide` before `npm test`, with `PATH=/usr/bin:$PATH`.
- Known gaps: no UI yet; lab phase uses `np-softmax-rows` by default (id is a parameter); back sprite not needed for a foe.
- Next: B8b (`/guardian` UI, badge saved to `cleared`, `smoke:guardian`).

## 2026-11-03: B8b Guardian UI
- `/guardian` (`components/Guardian.tsx`): phase strip (Read / Write / Generalise), Warden Indent (96×96) on the battle stage with a resolve bar that loses a third per trial, the Python Port card duel (reuses `CardForm`), the judged `py-moving-average` lab in the embedded editor, and the hidden-set fight (reuses `RevealFight`) using the saved companion. Winning stores `guardian:python-port` in `cleared`. Title screen links to it.
- `drawBattle` gained optional `StageOpts` for big foes. Trials already cleared are remembered per browser session (`resumeGuardian`/`progressOf`, tested) so a trip to the Training Grounds does not reset the run; the training fight is never skipped.
- Fixed a mobile bug: the lab section grew to the editor's width (needed `minmax(0,1fr)`).
- Verification: lint (0 errors), typecheck, test (213 pass, with `PATH=/usr/bin:$PATH` and `npm run stage:pyodide`), content:verify, build, build:pages, `smoke:guardian` at desktop and iPhone 14 (wrong lab submit stays, resume after training, win, badge persists, no overflow or console errors); screenshots inspected.
- CI/Pages: not polled this run (no `gh` CLI in this session).
- Known gaps: the lost-in-cards screen and a failed training fight are covered by unit tests but not screenshotted; the guardian is not yet an overworld encounter.
- Next: B9 Audio v1.

## 2026-11-03: B9 Audio v1
- Algo Clash has no audio code yet, so this is a new, original chiptune synth. `lib/audio/sfx.ts` (pure, tested): 10 effects (select, correct, wrong, hit, hurt, win, lose, pass, fail, badge) as oscillator/noise note lists plus a 16-step looping theme; `player.ts` renders them with Web Audio (seeded noise buffer, no assets, never throws). `useAudioSettings` syncs the saved `volume`/`music` settings; `AudioControls` (title screen: volume slider + music toggle, tap targets 44px).
- Wired: card battle and guardian (correct bolt then hit, wrong + hurt, win/lose, badge), lab Submit (pass/fail, in `EditorWorkbench`). Battle/guardian/lab pages are SFX-only; music plays only from the title toggle. Music waits for the browser's autoplay unlock instead of queueing bars.
- Verification: lint (0 errors), typecheck, test (218 pass; 5 new in `tests/audio.test.ts`), content:verify, build, build:pages; Playwright on the built static site at desktop and iPhone 14 (title controls work, /battle loads, no console errors or overflow); iPhone title screenshot inspected. Actual audio output cannot be heard in this headless environment, so the sounds are untuned by ear.
- CI/Pages: no `gh` CLI in this session; confirmation not done.
- Known gaps: sounds need an ear-pass by the owner; no overworld/train sounds yet; music stops at the end of the current bar.
- Next: B10 Slice polish.

## 2026-11-03: B10 Slice polish and review
- New `npm run smoke:slice` (`scripts/smoke-slice.mjs`): visits title, /play, /learn, /battle, /labs, /train, /guardian on the static export at desktop 1280×800 and iPhone 14, screenshots each, and fails on console/page errors, horizontal overflow (scrollWidth > clientWidth) and reports buttons/links under 30px tall.
- Result: 14/14 page loads clean (no console errors, no overflow). Screenshots inspected (title, lessons, overworld): pixel font, nav and cards read well on iPhone; the overworld shows the tile city, NPCs and d-pad.
- Fix: the "Title / Card battle / Lessons / All labs" header links on /learn, /labs, /guardian were ~20px tall on iPhone; now `min-h-11` (44px). The smoke now reports 0 sub-30px targets.
- Verification: lint (0 errors), typecheck, test (218 pass), content:verify, build, build:pages, smoke:slice.
- Slice review (Phase B): the loop works end to end: Python lessons → card battle → numpy/Python Labs judged in Pyodide → Training Grounds (worker trainer, hidden-set reveal, saved companion) → Warden Indent guardian (cards, lab, hidden-set fight, badge) with chiptune SFX. Gaps carried forward: no single guided path linking the stages (the overworld doesn't yet trigger the guardian or Training Grounds), the lesson/lab pages have no mastery or SRS yet (C1), audio untuned by ear, only one guardian and one companion form, saved companion keeps only the latest run.
- CI/Pages: Actions quota note expired 2026-11-01; no `gh` CLI in this session, so confirmation was done via the commit status API only (see final summary).
- Next: C1 SRS and mastery with rust; the Daily Sync.

## 2026-11-03: C1a SRS core
- C1 was split: C1a (this run), C1b (Daily Sync UI, rust display).
- `lib/srs/srs.ts` (pure, clock-injected): 6-box ladder (6h, 1d, 3d, 7d, 16d, 35d); a miss halves the box and counts a lapse; items rust when overdue past max(1 day, half the interval), and a correct refresher on a rusted item restores its box without promoting it; assisted reviews are ignored entirely (GDD §6); `dailyPlan` (most-overdue reviews first, capped, plus a few new items) and `summarise`. Save gained a sanitised `srs` table (round-trips through export/import).
- Wired: card battles record the first attempt at each card (retries after a miss do not count; StrictMode-safe); Lab submit passes record `lab:<id>`.
- Verification: lint (0 errors), typecheck, test (230 pass; 12 new in `tests/srs.test.ts`), content:verify, build, build:pages, smoke:battle at desktop and iPhone 14 (no overflow or console errors). No new UI, so no new screenshots.
- Intervals are a first guess, not tuned on real recall data.
- CI/Pages: not polled (no `gh` CLI in this session).
- Next: C1b.

## 2026-11-03: C1b Daily Sync UI
- `lib/sync/sync.ts` (pure, tested: `tests/sync.test.ts`, 6 tests): `buildSync` merges the SRS table with the Python/numpy/strategy decks and the Labs into today's queue (due reviews, then new cards), per-deck mastery, due/stale Labs and a companion `rustLevel` (share of tracked items rusted). `useNow` gives a hydration-safe page-load time.
- `/sync` (`components/Sync.tsx`): the Neuron-Pup drawn with a rust overlay that grows with `rustLevel` (source-atop tint plus deterministic speckles), queue summary, "Start sync" card session reusing `CardForm`/`check` and recording each first attempt to SRS, mastery bars per deck, due Labs linked. `/labs` marks stale Labs ("stale · redo"). Title screen links to Daily Sync; `/sync` added to `smoke:slice`.
- Verification: lint (0 errors), typecheck, test (236 pass), content:verify, build, build:pages, `smoke:sync` (fresh queue, 4-card session, seeded overdue save rusts the Pup and flags the Lab on /sync and /labs) at desktop and iPhone 14, `smoke:slice`; screenshots inspected (fresh, rusty iPhone).
- Known gaps: the daily plan has only cards and Labs (GDD also lists a metric drill, code snippet, C++ problem and micro-workshop step; those need C6/D content); missed cards are not requeued in-session; rust look is a first pass and the Pup has one form.
- Next: C2 companion evolution tied to Forge milestones.

## 2026-11-03: C2 Companion evolution
- `lib/evolution/evolution.ts` (pure, `tests/evolution.test.ts`, 7 tests): six forms (GDD §3), each needing specific Labs passed **unassisted**; strictly ordered; requirement ids without a Lab yet are "coming" and block progress. `/companion` shows the ladder (animated sprite for unlocked forms, silhouette or "?" for the rest), current form, next-form progress. Title links to it. Stat derivation from measured metrics was already done (`companionStats`).
- Verification: lint (0 errors), typecheck, test (243 pass), content:verify, build, build:pages, `smoke:companion` (fresh, assisted pass does not evolve, unassisted pass unlocks Perceptron) at desktop and iPhone 14; iPhone screenshot inspected; `smoke:slice` with `/companion` added.
- Known gaps: only the Perceptron has art; forms 2-6 need sprites and Labs (autograd, mlp, conv2d, rnn, attention, ...); the "glitch when a Lab regresses" behaviour (GDD 5.2) is not built; Lab ids for later forms are provisional.
- CI/Pages: not polled (no `gh` CLI in this session).
- Next: C3 Research journal.

## 2026-11-03: C3 Research journal
- `lib/journal/journal.ts` (pure, `tests/journal.test.ts`, 6 tests): entry model, hostile-input sanitiser, capped log (100), notes, best run, and `compare(a, b)` which teaches experiment hygiene: one changed knob is "controlled", several is "confounded" (data changes called out), seed-only measures noise, different worlds are incomparable. Save gained a sanitised `journal` (round-trips through export/import).
- Training Grounds logs each run when the hidden score is revealed (never before). `/journal` lists runs (newest first, best starred), editable notes, pick A/B for the comparison. Title links to it; `smoke:journal` added and `/journal` in `smoke:slice`.
- Verification: lint (0 errors), typecheck, test (249 pass), content:verify, build, build:pages, `smoke:journal` and `smoke:slice` at desktop and iPhone 14; iPhone screenshot inspected (no overflow, 0 small targets).
- Env note: `python3` here is 3.11 while pip defaulted to 3.13; use `python3 -m pip install --break-system-packages -r requirements-dev.txt`.
- Known gaps: only Training Grounds runs are logged (workshops later); no charts or export of the journal; the second-run write relies on the 400ms save debounce plus pagehide flush.
- Next: C4 Hints, Bits, the Mart and scaffolding modes.

## 2026-11-03: C4a Bits, hints and scaffolding modes
- C4 was split: C4a (this run), C4b (Mart page, Bits from cards/guardian).
- `lib/economy/economy.ts` (pure, `tests/economy.test.ts`, 9 tests): three modes, rung-priced hints, first-unassisted-pass rewards paid once per item (Lab 25, card 2, guardian 100 Bits; interview 1.5x), Mart catalogue with purchase rules, hostile-data sanitisers. Save gained `wallet`, `owned`, `mode` (old saves migrate to Standard, 0 Bits). Tests prove spending never touches the SRS table.
- `/labs`: Bits balance and mode picker; the hint ladder is priced per rung, refuses when Bits are short, is off in Interview mode, and a hint marks that attempt assisted (a clean earlier pass keeps its status). Lab passes pay Bits via `reward`.
- Verification: lint (0 errors), typecheck, test (257 pass), content:verify, build, build:pages, `smoke:economy` (new) and `smoke:labs` (now selects Guided first) and `smoke:slice` at desktop and iPhone 14; iPhone screenshot inspected (picker wraps, no overflow).
- CI/Pages: not polled (no `gh` CLI in this session).
- Known gaps: Bits are earned only from Labs so far, so Standard mode starts with no way to afford hints until one lab is passed (only one lab has hints today); prices are a first guess; no Mart UI.
- Next: C4b.

## 2026-11-03: C4b Mart page and Bits from cards and the guardian
- `lib/economy`: `equip`/`sanitizeEquipped`/`tintFor` (two Pup tints; decor items cannot be worn), `payReward` (pays a state carrying wallet + mode; once per item, 1.5x in Interview, nothing when assisted). Save gained `equipped` (must be owned, else null). 3 new tests (260 pass).
- `/mart`: balance, live Pup preview, Preview/Buy/Wear/Take off, honest notice that nothing affects grading, mastery or evolution. The worn tint shows on the Pup in `/sync` (RustyPup takes a tint). Title links to it.
- Bits now also come from first-try-correct cards (Battle, Sync; 2 each) and the guardian (100).
- Verification: lint (0 errors), typecheck, test (260), content:verify, build, build:pages, new `smoke:mart` (buy, wear, persistence, overflow, console) plus `smoke:slice` (now with /mart), `smoke:economy`, `smoke:battle`, `smoke:guardian` at desktop and iPhone 14; iPhone screenshot inspected.
- Known gaps: Forge decor (fern, poster) is purchasable but not yet rendered; tint is not shown on `/companion` or in battles; no daily card cap on Bits (replays pay nothing, so farming is bounded by deck size); prices are a first guess.
- CI/Pages confirmation: not checked (no `gh` CLI in this session).
- Next: C5 Readiness Report.

## 2026-11-03: C5 Readiness Report
- `lib/readiness/readiness.ts` (pure, `tests/readiness.test.ts`, 13 tests): 12 skills and 3 loops (Applied-AI engineer, SDE with AI-enabled round, ML engineer), each loop a set of weighted rounds. Evidence: Labs (unaided 1, assisted 0.5), deck mastery by SRS state (mastered 1, learning/reviewing 0.5, rusted 0.25, assisted reviews never count), guardian, logged experiments, and "planned" evidence (zero, shown as "coming") for content that does not exist yet. Reports coarse bands, loop coverage ("the game can train N% of this loop") and the biggest gap among trainable rounds.
- `/readiness` page and title link; `smoke:readiness` (fresh = "not started", helped pass < unaided pass, next gap named) and `/readiness` in `smoke:slice`.
- Verification: lint (0 errors), typecheck, test (273 pass), content:verify, build, build:pages, smoke:readiness and smoke:slice at desktop and iPhone 14; iPhone screenshot inspected (no overflow, readable).
- Env notes: run only one `npm run build*` at a time (concurrent runs both download the 340 MB Pyodide tarball and corrupt it); numpy for `python3` needs `python3 -m pip install ...`.
- Known gaps: loop shapes come from CUR D3 (not re-searched this run); most skills are "coming" until Retrieval Reef, Code Dojo, comprehension and pair content land; take-home simulator not built (C5b); weights are a first guess.
- CI/Pages: Actions quota note expired, but no `gh` CLI here; confirmed via commit status only.
- Next: C6 Code Dojo v1.

## 2026-11-03: C6a Code Dojo core
- C6 was split: C6a (this run), C6b (more problems, Python variant, SRS).
- `lib/dojo/dojo.ts` (pure, `tests/dojo.test.ts`): Scout → Strategise (plan question, wrong picks are free but downgrade the grade) → Code + Judge (3 hearts; a wrong Submit verdict costs one, compile errors are free; hints and a retry mark the attempt assisted) → Debrief (grade, complexity, editorial).
- `scripts/gen-problems.mjs` bundles `content/problems/*` into `lib/dojo/problems.gen.ts` (no reference or wrong solutions; expected outputs from the native reference; `--check` is a test). The browser perf case is generated at `browserPerfN` (40k) to keep the bundle at ~480 KB; native `content:verify` still uses the full sizes.
- `/dojo` index and `/dojo/[id]` reuse `EditorWorkbench` (now reports the C++ verdict via `onResult`). A first unassisted solve records `dojo:<id>` in `cleared` and pays 40 Bits (`problem` reward kind, 1.5x in Interview). Hints follow the Labs pricing.
- Verification: lint (0 errors), typecheck, test (280+), content:verify, build, build:pages, new `smoke:dojo` (wrong plan refused, empty program costs a heart, correct solution accepted) at desktop and iPhone 14; iPhone debrief screenshot inspected (no overflow, readable).
- Known gaps: one problem only; no Python variant; SRS not fed by problems; the browser perf case is smaller than native, so a borderline-slow solution may pass in-browser; smoke clicks Submit with `dispatchEvent` on iPhone because Playwright reports the editor panel intercepting the scroll-to-click (real touch not reproduced, worth a look); hearts glyphs sit tight to the right edge on small phones.
- CI/Pages: no `gh` CLI in this session; not confirmed.
- Next: C6b.

## 2026-11-03: C6b1 Code Dojo ladder, part 1
- C6b was split into C6b1 (this run), C6b2 (more problems and ladder order), C6b3 (Python variant, SRS).
- Added `content/problems/context-window` (longest span with at most k distinct ids: sliding window; LC 340 pointer) and `batch-packer` (minimise the largest consecutive batch sum: binary search on the answer + greedy check; LC 410 pointer). Each: reference, brute (O(n^2) / DP), three documented wrongs (WA x2 + TLE), seeded generator, 4 test groups, 3-rung hints, strategy question, house-style editorial. `content:verify` passes; `gen:problems` regenerated `problems.gen.ts`; new catalog test checks every bundled package.
- Lesson recorded: my first wrong for Context Window (shrink with `if` instead of `while`) is actually a correct, known non-shrinking-window variant, and `content:verify` correctly flagged it as AC. Replaced with a real bug (reset window).
- Verification: lint (0 errors), typecheck, test (281), content:verify, build, build:pages, smoke:dojo at desktop and iPhone 14; iPhone `/dojo` screenshot inspected (3 cards, no overflow).
- Known gaps: `/dojo` lists alphabetically, not by difficulty; both problems are M; the in-browser solve flow of the new problems was not played end to end (the smoke plays Hot Tokens; expected outputs come from the native reference); no SRS or Python yet.
- CI/Pages: ran after the Actions-quota period but no `gh` CLI here; not confirmed.
- Next: C6b2.

## 2026-11-03: C6b2a Code Dojo ladder, part 2a
- C6b2 was split into C6b2a (this run) and C6b2b.
- Two new full packages: `pipeline-order` (M, graph: Kahn's algorithm with a min-heap for the lexicographically smallest order, -1 on a cycle; brute = permutations in order; wrongs: FIFO queue (WA), no cycle check (WA), O(n^2) ready scan (TLE)) and `peak-window` (H, LC 239 pointer: monotonic deque; brute O(nk); wrongs: no front eviction (WA), prefix max (WA), rescan (TLE)). Each has a seeded generator, 4 test groups, 3-rung hints, a strategy question and a house-style editorial. `content:verify` passes; `gen:problems` regenerated the bundle.
- `lib/dojo/catalog.ts`: `ladder()` orders problems E, M, H then by title; `/dojo` uses it. Tests: new problems present, samples from the native reference, cycle cases print -1, ladder order.
- Verification: lint (0 errors), typecheck, test (283 pass), content:verify, build, build:pages, smoke:dojo at desktop and iPhone 14; `/dojo` screenshot inspected (5 cards, M's then H, no overflow, no console errors).
- Env note: a fresh clone needs `npm run build` once (fetches Pyodide) before `npm test` passes py.core tests.
- Known gaps: the new problems were not played end to end in the browser (smoke plays Hot Tokens; expected outputs come from the native reference); browser perf cases use n=40000, so a quadratic solution on Peak Window might pass in-browser; no easy (E) problem yet; no tree/DP problem yet.
- CI/Pages: no `gh` CLI in this session; confirm via commit status only.
- Next: C6b2b.

## 2026-11-03: C6b2b1 Code Dojo ladder, part 2b-1
- C6b2b was split into C6b2b1 (this run) and C6b2b2 (tree problem, second hard, more AI-flavoured problems, play-throughs).
- `label-consensus` (E, LC 169 pointer): majority vote. Reference = Boyer-Moore candidate plus a confirming pass; brute = map count; wrongs: mode only (plurality, WA), no confirm pass (WA), O(n^2) count (TLE). Editorial gives the hash-map baseline, the O(1)-space vote, and an honest note on label aggregation in real ML pipelines.
- `fewest-tokens` (M, LC 139 pointer, minimum-count variant): prefix DP over a tokenizer vocabulary (up to 2000 pieces, length <= 8). Brute = exhaustive recursion; wrongs: greedy longest-first (WA; edge case `ab abc cd` / `abcd` is the documented trap), unreachable-as-zero (WA), try-every-piece DP (TLE on the 2000-piece perf case). Editorial states that real tokenizers apply learned merges, so this is an efficiency bound, not what they return.
- Both: seeded generators, 4 test groups, 3-rung hints, strategy question, house-style editorial. `gen:problems` regenerated the bundle; `tests/dojo.test.ts` checks samples from the native reference, tie/impossible cases and difficulty.
- `smoke:dojo` now also plays Label Consensus end to end (plan, code, submit, Accepted) at desktop and iPhone 14.
- Verification: lint (0 errors), typecheck, test (284 pass), content:verify (all `ok`), build, build:pages, smoke:dojo at desktop and iPhone 14; iPhone `/dojo` screenshot inspected (7 cards, E first, no overflow, no console errors).
- Known gaps: Fewest Tokens is not played in-browser (its expected outputs come from the native reference); browser perf cases use n=40000 so borderline-slow solutions may pass in-browser; no tree problem or second hard yet; no Python variant or SRS for problems.
- CI/Pages: checked via commit status only (no `gh` CLI).
- Next: C6b2b2.

## 2026-11-03: C6b2b2a Code Dojo ladder, part 2b-2a
- C6b2b2 was split into C6b2b2a (this run) and C6b2b2b (second hard, more AI-flavoured problems).
- `worst-hop` (M, LC 543 pointer, weighted general tree): service-latency tree with `p_i < i`, answer = largest pairwise path latency. Reference = reverse-order DP keeping the two best child branches (no recursion, `long long`); brute = DFS from every node; wrongs: root-only paths (WA), 32-bit sums (WA), traversal from every node (TLE). Seeded generator (heavy chain perf case, 10^9 weights), 4 test groups, 3-rung hints, strategy question, house-style editorial. `content:verify` passes; `gen:problems` regenerated the bundle.
- The native reference corrected my hand-computed sample (12 -> 14) before it shipped; statement, generator comment and test were fixed. A new catalog test pins the sample and checks a hidden answer beyond 32 bits.
- `smoke:dojo` now plays Worst Hop and Fewest Tokens end to end (right plan, reference solution, Accepted) at desktop and iPhone 14.
- Verification: lint (0 errors), typecheck, test (285 pass), content:verify, build:pages, build, smoke:dojo at desktop and iPhone 14; iPhone `/dojo` screenshot inspected (8 cards, E first then M's then H, no overflow).
- Env note: `pip install` with the default `pip` targeted python 3.13 while `python3` is 3.11; use `python3 -m pip install --break-system-packages -r requirements-dev.txt` or the lessons tests fail on numpy.
- Known gaps: one iPhone smoke run timed out once waiting for `dojo-plan-1` on Label Consensus (passed on rerun; likely a click before hydration, worth hardening); browser perf cases use n=40000; no Python variant or SRS for problems yet.
- CI/Pages: from 2026-11-01 CI should be confirmed, but this session has no `gh` CLI; checked via commit status only.
- Next: C6b2b2b.

## 2026-11-04: C6b2b2b Code Dojo ladder, part 2b-2b
- `steady-latency` (H, LC 480 pointer, lower-median variant): sliding-window median over inference latencies. Reference = `multiset` plus one median iterator that moves at most one step per slide (`erase(lower_bound(v))`); brute = sort each window; wrongs: upper median for even k (WA), missing step-back on insert (WA), `nth_element` per window (TLE). Seeded generator (duplicates, k=1, k=n, ascending perf), 4 test groups, 3-rung hints, strategy question, house-style editorial with heap and Fenwick alternatives. `content:verify` ok; `gen:problems` regenerated; catalog test added; `smoke:dojo` plays it end to end.
- Verification: lint (0 errors), typecheck, test (286 pass), content:verify, build, build:pages, smoke:dojo at desktop and iPhone 14 (all PASS, no overflow, no console errors); iPhone debrief screenshot inspected.
- Known gaps: browser perf cases use n=40000; no Python variant or SRS for problems yet; only one new problem this run (the box asked for "more").
- CI/Pages: no `gh` CLI in this session; not confirmed.
- Next: C6b3.

## 2026-11-04: C6b3a SRS entries for solved Dojo problems
- C6b3 was split into C6b3a (this run) and C6b3b (Python/Pyodide variant of the Dojo battle).
- Pure: `problemKey` and an optional `problems` list in `buildSync` (due and stale problems, included in companion rust); tests added in `tests/sync.test.ts` (due, stale, assisted ignored, rust).
- UI: `Dojo.tsx` records an SRS review on an unaided solve (assisted ones are ignored by `review`); `/dojo` ladder (new `DojoList`) shows learning/reviewing/mastered/"rusty: re-solve"; Daily Sync lists "Dojo problems to re-solve".
- Verification: lint (0 errors), typecheck, test (289 pass), content:verify, build, build:pages, smoke:dojo at desktop and iPhone 14 (new checks for mastery labels, all PASS); iPhone ladder screenshot inspected (no overflow, labels readable).
- Env note: run `npm run stage:pyodide` before `npm test` on a fresh clone (py.core test needs the staged assets).
- Known gaps: a hard navigation right after a solve can lose the debounced (400 ms) save, so the smoke waits 900 ms; worth a sturdier flush later. No Python variant yet.
- CI/Pages: no `gh` CLI in this session; not confirmed.
- Next: C6b3b.

## 2026-11-04: C6b3b Python variant of the Dojo battle
- Added a Python (Pyodide) variant for three core problems: `label-consensus`, `context-window`, `batch-packer`. Each has `solution.py`, `starter.py`, a documented `wrong_py/*.py` (WA) and a `python.wrong` entry in `meta.json`. Contract: `solve(text: str) -> str`.
- Pure `lib/dojo/pyTests.ts` turns the bundled cases into nc_test source (token-wise compare, 3 s wall-clock check per case). `catalog.ts` gains `starterPy`, `hasPython`, `toPythonTask`; `gen-problems.mjs` bundles `starterPy`; `Dojo.tsx` shows a C++ (default) / Python toggle in Scout and maps Python results to AC/WA for hearts, grades, Bits and SRS.
- `content:verify` now runs every `solution.py` against the C++ reference output on all groups (including native-size perf) and requires each `wrong_py` to earn its expected verdict. GDD §5.6 documents the contract.
- Verification: lint (0 errors), typecheck, test (294 pass, incl. new `tests/dojo-python.test.ts`), content:verify (all ok), build, build:pages, smoke:dojo at desktop and iPhone 14 (new Python checks: wrong solve costs a heart, reference Accepted; no overflow, no console errors); iPhone Scout screenshot with the toggle inspected.
- Known gaps: Python wall-clock limits are checked after a case finishes (a truly infinite loop is stopped by the worker timeout instead); a Python exception outside the tests counts as WA; only 3 of 9 problems have Python variants; the smoke's first iPhone run flaked once on a pre-hydration click (passed on rerun).
- CI/Pages: no `gh` CLI in this session; not confirmed via Actions.
- Next: D1 (Vector Vale).

## 2026-11-04: D1a Vector Vale lessons and deck
- D1 split into D1a-D1d (ROADMAP). D1a: `scripts/gen-linalg.mjs` generates `content/decks/linalg.json` (41 cards: 17 predict, 9 shape, 5 derive, concept/multi, 2 proven bug cards) and `content/lessons/linalg.json` (5 lessons: vectors/cosine, matrices as maps, inverse/rank/solve, orthogonality/projection/least squares, eigen/SVD/PCA/power iteration). Every output and numeric answer comes from native numpy.
- New pure `lib/solvers/linalg.ts` (dot, norm, cosine, project, 2x2 eigen/singular values, 2-D PCA) cross-checks the derive and shape cards in `tests/linalg.test.ts`. Deck added to Daily Sync; lessons listed on `/learn` (heading now "Lessons", smoke expects 20).
- Verification: lint (0 errors), typecheck, test (300 pass), content:verify, build, build:pages, smoke:learn and smoke:sync at desktop and iPhone 14 (pass); iPhone lesson screenshot inspected (readable, no overflow).
- Known gaps: Readiness report has no linear-algebra skill yet (D1d); no Battle deck picker for the new deck; no Lab, visualiser or art yet.
- Branch note: the harness designated branch `claude/wonderful-goodall-ii2hbu`; repo protocol says main. Pushed to both.
- CI/Pages: no `gh` CLI in this session; not confirmed.
- Next: D1b.

## 2026-11-04: D1b PCA Lab modules
- Two new Lab modules in a new "Vector Vale" phase (listed between Python Port and The Forge): `pca-svd` (`pca_fit`, `pca_transform`, `pca_inverse`, `explained_ratio`; thin SVD of centred data, variance s²/(n-1), sign rule: largest-magnitude entry positive) and `pca-power` (`power_iteration`, `deflate`, `top_k_eigs`, `pca_power` from the covariance matrix).
- Hidden tests check against `np.linalg.eigh`/`svd`, orthonormality, zero-mean uncorrelated scores, exact full-rank round trip, truncation error = discarded variance, no input mutation, overflow safety and the all-ones-start trap. Six documented known-wrong versions per lab, all rejected by `content:verify`.
- Verification: lint (0 errors), typecheck, test (300 pass), content:verify (all ok), build, build:pages, smoke:labs at desktop and iPhone 14 (21 labs, reference accepted, no overflow, no console errors).
- Known gaps: no lesson link from the Vector Vale lessons to these labs yet; PCA labs are not yet part of the readiness skill (D1d).
- CI/Pages: not polled; none required until Actions quota resets confirmed (no `gh` CLI in this session).
- Next: D1c (2D transform visualiser).

## 2026-11-04: D1c 2D transform visualiser
- New pure `lib/linalg/transform.ts` (apply, det, trace, compose, inverse, rotation, general 2x2 `eigen` incl. repeated/defective/complex cases, `classify`, unit-square image) with `tests/transform.test.ts` (eigenvalues cross-checked against numpy on 30 random matrices, A·v = λ·v, det = product of eigenvalues, |det| = product of singular values, composition order).
- New `/dev/transform` (`components/TransformLab.tsx`): canvas with the warped grid, teal unit square, red/green basis arrows (the matrix columns), dashed gold eigen-directions; presets, four entry sliders, "then apply" composition; readouts for det, trace, eigenvalues, singular values, inverse and a plain-language classification (collapse = det 0, shear = defective, etc.). `npm run smoke:transform` covers desktop and iPhone 14.
- Env note: on this image `python3` resolved to 3.11 without numpy; run with `PATH=/usr/bin:$PATH` (3.13 + numpy) for tests and content:verify.
- Known gaps: not yet linked from the Vector Vale lessons; no touch-drag of basis vectors (sliders only); text labels on the canvas omitted for legibility.
- Branch note: harness branch `claude/wonderful-goodall-j5moxf`; pushed to it and to main.
- Next: D1d (region art, guardian, readiness skill "linear algebra").

## 2026-11-04: D1d1 Readiness skill "linear algebra"
- D1d was split into D1d1 (this run), D1d2 (region art) and D1d3 (guardian fight) in ROADMAP.
- New readiness skill `linear-algebra` (evidence: `linalg` deck mastery, Labs `pca-svd` and `pca-power`), weighted into the ML-engineer loop's theory (2) and implement (1) rounds; Readiness page passes the linalg deck ids. Tests in `tests/readiness.test.ts` (full coverage, zero score at start, assisted-lab half credit, round wiring).
- Verification: lint (0 errors), typecheck, test (310 pass), content:verify (all ok), build, build:pages, smoke:readiness at desktop and iPhone 14 (all PASS, no overflow, no console errors).
- Known gaps: the guardian is not yet evidence for this skill (D1d3); no art yet (D1d2); no screenshot inspected since the page layout is unchanged (a skill row was added).
- Branch note: harness branch `claude/wonderful-goodall-5igaz0`; pushed to it and to main.
- CI/Pages: Actions quota note has lapsed (after 2026-11-01) but this session has no `gh` CLI; not confirmed.
- Next: D1d2.

## 2026-11-04: D1d2a Vector Vale tileset and guardian art
- D1d2 was split into D1d2a (this run) and D1d2b (trainers, portraits, battle backdrop).
- New tileset `vector-vale-tiles` (20 tiles: gridded twilight meadow, glow-bells, lattice slab path, light stream with arrow ripples, crystal clusters as trees, axis rail, basis signpost, crystal lamps, slate roof, shrine door with a matrix glyph, basis obelisk, pulsing arena pad) and `VALE_PREVIEW` map. New guardian **Warden Basis**, 96x96: a crystal golem whose torso is the unit square sheared by a matrix, holding the gold x-axis and rose y-axis arrows; idle (4), attack (5, with beam), hurt (3), faint (4). Generated by `scripts/art/vector-vale.mjs` and `scripts/art/warden-basis.mjs`.
- Sprite tests extended to cover both.
- Verification: lint (0 errors), typecheck, test (320 pass), content:verify, build, build:pages; Playwright on `/dev/sprites` at desktop and iPhone 14 (no console errors, no overflow); screenshots inspected.
- Known gaps: no trainers or backdrop yet; tileset not yet used by the live overworld.
- Branch note: pushed to main (protocol); the harness branch `claude/wonderful-goodall-629qy4` is updated by fast-forward only.
- CI/Pages: no `gh` CLI in this session; not confirmed.
- Next: D1d2b.

## 2026-11-04: D1d2b Vector Vale trainers and battle backdrop
- Two original trainers generated by `scripts/art/vale-trainers.mjs`: Cadet Shear (rose spiky hair, gold scarf, indigo jacket) and Ranger Axis (wide-brim hat, moss coat, crystal lantern). Each has 16x24 overworld sprites (stand, 4-frame walks in four directions) and a 48x48 portrait (idle with blink, talk, smile, think). Registered in the roster; sprite tests extended.
- `game/render/battle.ts`: `StageOpts.theme` (`"grid"` default, `"vale"`): twilight sky, stars, a moon with turning basis axes, crystal ridge, lattice floor, swaying glow-bells. `/battle?theme=vale` previews it; the guardian fight will use it in D1d3.
- Verification: lint (0 errors), typecheck, test (340 pass), content:verify, build, build:pages; Playwright at desktop and iPhone 14 on `/dev/sprites` and `/battle?theme=vale`: no console errors, no overflow; screenshots inspected.
- Known gaps: trainers are not yet placed in the Vector Vale map or given dialogue; no trainer battle uses them yet.
- CI/Pages: no `gh` CLI in this session; not confirmed.
- Next: D1d3.

## 2026-11-04: D1d3 Vector Vale guardian (D1 complete)
- New `lib/guardian/defs.ts` (`GuardianDef`: id, route, deck, Lab, sprite, backdrop theme, badge). `components/Guardian.tsx` now takes a `def`; `/guardian` is unchanged (Warden Indent), new `/guardian/vale` fights Warden Basis on the Vale backdrop: Read (41-card linalg deck), Write (`pca-svd` Lab), Generalise (hidden-set fight with the saved companion). Awards the Basis Badge (`guardian:vector-vale`), saved progress is keyed per guardian. `summarizeGuardian` takes the badge name.
- Readiness: the guardian is now evidence for the `linear-algebra` skill (test updated). Home links to both guardians.
- Tests: guardian defs point at real content; a full Vale run with a test-only correct-response oracle ends in the Basis Badge.
- Verification: lint (0 errors), typecheck, test (342 pass; `py.core` flaked once under parallel load, passed on rerun and alone), content:verify, build, build:pages, new `smoke:guardian-vale` at desktop and iPhone 14 (14 checks pass, no overflow, no console errors); screenshots inspected. The full duel is played by `smoke:guardian`; the Vale smoke resumes from saved progress to reach the Lab.
- Known gaps: the third trial reuses Overfit's minion; the card duel is not played end to end in the Vale smoke.
- CI/Pages: no `gh` CLI here, so not confirmed.
- Next: D2 (Gradient Gorge).

## 2026-11-04: D2a Forge 1 Lab `forge-value`
- D2 was split into D2a–D2e in ROADMAP. This run: Lab `forge-value` (scalar reverse-mode autodiff `Value`: + - * / ** neg, tanh/relu/exp/log, reverse numbers, topological `backward`), lesson with the cost argument for reverse mode, visible tests, 10 hidden tests (finite-difference checks on diamond, deep chain, pow/div, log/exp, random graphs, relu gating, long chain) and 8 documented known-wrong versions (assign vs accumulate, no topo order, wrong pow/tanh/div/mul derivatives, relu always passes, no seed). Bundled via `gen-labs`.
- Verification: lint (0 errors), typecheck, test (342 pass; needed `node scripts/fetch-pyodide.mjs` on this fresh image), content:verify (all ok, incl. every wrong version rejected and the starter failing), build, build:pages. No visual change, so no screenshots.
- Known gaps: not yet wired into Readiness or the world (comes with D2e).
- CI/Pages: no `gh` CLI in this session; not confirmed.
- Next: D2b (Forge 2 `Tensor`).

## 2026-11-04: D2b Forge 2 Lab `forge-tensor`
- New Lab `forge-tensor`: numpy `Tensor` with broadcasting-aware backward (`unbroadcast`), `@`, `.T`, `sum`/`mean` with axis and keepdims, tanh/relu/exp/log/pow, iterative topological `backward`. Lesson (shape invariant, why bias gradients are sums, matmul/sum derivations, interview signal), visible tests, 16 hidden tests (finite-difference checks via `grad_check` on bias/column/scalar/leading-axis broadcasts, matmul, linear layer, softmax cross-entropy, diamonds, reuse; value assertions for mean) and 12 documented known-wrong versions, all rejected.
- Lesson learned: a finite-difference check cannot catch a wrong *forward* (mean dividing by the wrong count), so value assertions sit beside the gradient checks.
- Verification: lint (0 errors), typecheck, content:verify (all ok), build, build:pages, vitest 342 pass. Note: this image's `python3` is 3.11 without numpy; the numpy-based tests need `PATH=/usr/bin:$PATH` (`/usr/bin/python3` has numpy). No visual change, no screenshots.
- Known gaps: not yet wired into Readiness or the world (D2e). No `gh` CLI in this session; CI/Pages not confirmed.
- Next: D2c (calculus/optimisation deck).

## 2026-11-04: D2c Gradient Gorge calculus and optimisation deck
- New `scripts/gen-calculus.mjs` generates `content/decks/calculus.json` (38 cards, topics cal-derivatives / cal-chain / cal-gd / cal-adam; predict, shape, derive, mcq, multi, bug) and `content/lessons/calculus.json` (4 lessons). Every predict, shape, derive answer and lesson output is computed by running numpy natively; bug cards are checked to change behaviour when fixed.
- New `lib/solvers/calculus.ts` (central difference, quadratic GD with momentum, stable-lr bound, Adam step with bias correction, norm clipping) cross-checks the deck in `tests/calculus.test.ts`. Deck wired into `samples.ts`, lessons, Daily Sync and the Readiness deck map (skill comes in D2e).
- Verification: lint (0 errors), typecheck, test (349 pass), content:verify, build, build:pages. No visual change, so no screenshots. Use `PATH=/usr/bin:$PATH` so python3 has numpy.
- Known gaps: deck not yet tied to a Readiness skill or the world (D2e).
- CI/Pages: skipped (Actions quota note does not apply after 2026-11-01, but no `gh` CLI in this session; not confirmed).
- Next: D2d (gradient descent visualiser).

## 2026-11-04: D2d Gradient descent visualiser
- New pure `lib/optim/descent.ts` (surfaces with analytic gradients: round bowl, narrow ravine with condition number 20, Rosenbrock valley; SGD, momentum and Adam trajectories; divergence detection; plain-language verdict) and `/dev/descent` (`components/DescentLab.tsx`): pixel-banded contour canvas, three optimisers on one landscape, learning-rate / momentum / steps sliders, per-optimiser readout.
- `tests/descent.test.ts` (10): gradients vs finite differences, zero gradient at the optimum, SGD matches `gdQuadratic`, the 2/L bound (0.099 stable, 0.101 diverges), momentum beats SGD at its best stable rate, Adam's first step matches `adamStep` and moves about lr per coordinate.
- Verification: lint (0 errors), typecheck, test (359 pass), content:verify, build, build:pages, new `smoke:descent` at desktop and iPhone 14; screenshots inspected (no overflow, no console errors). Use `PATH=/usr/bin:$PATH` for numpy.
- Known gaps: not yet linked from the world or lessons (D2e). CI/Pages not confirmed (no `gh` CLI).
- Next: D2e (region art, guardian, readiness skill "calculus & optimisation").

## 2026-11-04: D2e1 Readiness skill "calculus & optimisation"
- D2e was split into D2e1–D2e4 in ROADMAP. This run: new Readiness skill `calculus-optim` (evidence: `calculus` deck, Labs `forge-value` and `forge-tensor`), weighted into the ML-engineer theory (2) and implement (1) rounds. Tests: content exists (coverage 1), lab credit incl. discounted assisted pass, round membership.
- Verification: lint (0 errors), typecheck, test (362 pass), content:verify, build, build:pages. No visual change, so no screenshots. Use `PATH=/usr/bin:$PATH` for numpy.
- Known gaps: Gradient Gorge guardian not yet an evidence item (D2e4); no region art yet (D2e2–D2e3).
- CI/Pages: no `gh` CLI in this session; not confirmed.
- Next: D2e2 (Gorge tileset and guardian art).

## 2026-11-04: D2e2 Gradient Gorge tileset and Warden Chain
- New `scripts/art/gradient-gorge.mjs` -> `game/sprites/tiles/gradient-gorge-tiles.ts`: 20 tiles with the same names as the Vale so maps share a legend (dusk-amber canyon, contour-etched ground, rock spires, meltwater river, sandstone shrine with a nabla door, green/orange descent-arrow signs and obelisks, pulsing arena pad) plus `GORGE_PREVIEW` map.
- New `scripts/art/warden-chain.mjs` -> `warden-chain.ts`: 96x96 guardian. Bowl-shaped torso with a glowing ball rolling down it (gradient descent), arms are chains of three rings (chain rule), green nabla on the brow. Idle 4, attack 5 (chain whip + shock rings), hurt 3, faint 4.
- Both registered in the roster and sprite/tileset/map tests.
- Verification: lint (0 errors), typecheck, test (372 pass), content:verify, build, build:pages; Playwright on `/dev/sprites` at desktop and iPhone 14: no console errors, no overflow; contact sheet and the preview map inspected. Use `PATH=/usr/bin:$PATH` for numpy.
- Known gaps: the attack whip is small at the sprite edge; no trainers or backdrop yet.
- CI/Pages: no `gh` CLI in this session; not confirmed.
- Next: D2e3 (Gorge trainers and battle backdrop).

## 2026-11-04: D2e3 Gorge trainers and battle backdrop
- New `scripts/art/gorge-trainers.mjs` generates Climber Delta (teal headband, ponytail, sand jacket, rope sash/pack) and Surveyor Hess (orange hard hat, hi-vis vest, level-staff with flag): 16x24 overworld sprites (stand, 4-frame walks in four directions) and 48x48 portraits (idle with blink, talk, smile, think). Registered in the roster; sprite tests extended.
- `game/render/battle.ts`: `StageTheme` gains `"gorge"` (dusk canyon, three stepped cliff layers, descent arrows on the far wall, contour-ring floor, shimmering meltwater, a ball rolling down a bowl). `/battle?theme=gorge` previews it; `GuardianDef.theme` accepts it for D2e4. Theme parsing moved into `stageTheme()` in `components/Battle.tsx`.
- Verification: lint (0 errors), typecheck, test (all pass after `node scripts/fetch-pyodide.mjs`; use `PATH=/usr/bin:$PATH` for numpy), content:verify, build, build:pages; Playwright on `/battle?theme=gorge` and `/dev/sprites` at desktop and iPhone 14: no console errors, no overflow; contact sheets and battle screenshots inspected.
- Known gaps: trainers are not yet placed in a Gorge map or given dialogue; the rolling ball is small.
- CI/Pages: Actions quota note ended 2026-11-01, but no `gh` CLI here, so CI and deploy are not confirmed.
- Next: D2e4 (Gradient Gorge guardian fight).

## 2026-11-04: D2e4 Gradient Gorge guardian fight (D2 complete)
- `GORGE_GUARDIAN` in `lib/guardian/defs.ts` (Warden Chain, Chain Badge, calculus deck, `forge-value` Lab, gorge backdrop); `/guardian/gorge` reuses `Guardian` with the calculus deck; linked from the title; guardian added as evidence for the `calculus-optim` Readiness skill.
- Tests: guardian run-through (deck, Lab, hidden-set fight, badge) and readiness credit from the cleared guardian. New `smoke:guardian-gorge` plays the Write trial with the reference autodiff, fights and checks badge persistence; `smoke-slice` includes the route.
- Verification: lint (0 errors), typecheck, test (393 pass; run `node scripts/fetch-pyodide.mjs` first), content:verify, build, build:pages, smoke at desktop and iPhone 14: no console errors or overflow; screenshots inspected.
- Known gaps: no Gorge overworld map or trainer dialogue yet. CI/Pages not confirmed (no `gh` CLI; MCP actions not checked).
- Next: D3 (Probability Peaks).

## 2026-11-04: D3a Probability Peaks lessons and deck
- D3 was split into D3a-D3f in ROADMAP. This run: `scripts/gen-probability.mjs` generates `content/decks/probability.json` (47 cards over prob-bayes / prob-dist / prob-mle / prob-ab: 17 predict, 4 shape, 6 derive, 15 concept, 2 multi, 3 bug) and `content/lessons/probability.json` (4 lessons incl. seeded CLT, peeking and bootstrap simulations). Every predict, shape and derive answer and every lesson output is computed natively with numpy; bug cards are checked to change behaviour when fixed; `--check` guards staleness.
- New `lib/solvers/probability.ts` (Bayes posterior, moments, erf/p-values, two-proportion z, sample size, family-wise error, entropy/cross-entropy/KL, perplexity, log-loss, Bernoulli MLE/MAP) and `tests/probability.test.ts` (9 tests cross-checking the deck; erf checked against known values). Deck wired into samples, lessons and Daily Sync (Readiness skill comes in D3d).
- Honesty notes in content: the peeking card states the independent-looks figure (22.6%) and that real correlated looks inflate less (about 14-15%, confirmed by the lesson's seeded simulation: 0.15); the sample-size card is labelled the simplified formula and gives the exact figure.
- Also fixed `smoke:learn`, which hard-coded the lesson count (now `>= 28`).
- Verification: lint (0 errors), typecheck, test (402 pass; `node scripts/fetch-pyodide.mjs` first; `PATH=/usr/bin:$PATH` for numpy), content:verify, build, build:pages, smoke:learn and smoke:sync at desktop and iPhone 14 (no console errors or overflow; lesson list screenshot inspected).
- Known gaps: no Readiness skill, Labs, visualiser or art yet (D3b-D3f).
- Next: D3b (probability Lab modules).

## 2026-11-04: D3b Probability Peaks Labs
- New Lab phase `peaks` ("Probability Peaks") with two Python/numpy Labs. `prob-sampling`: `exp_inverse_cdf`, `sample_categorical` (boundary and tail-clipping rules), `rejection_sample` (envelope M, acceptance rate 1/M), `box_muller`. `prob-mle`: `gaussian_mle` (divisor n), `gaussian_nll`, `bernoulli_map` (posterior mode), `bootstrap_means`, `percentile_ci`. All randomness is passed in as uniforms or indices, so tests are deterministic (evenly spaced uniform grids check moments and acceptance rate; a seeded coverage test checks a 90% interval).
- Hidden tests include value checks, a numerical zero-gradient check of the NLL at the MLE, "MLE minimises the NLL" perturbations, MAP maximising the posterior density on a grid, and bootstrap SE vs sigma/sqrt(n). 8 documented known-wrong versions per Lab; `content:verify` shows no errors for either (every wrong is rejected, the starter fails).
- Verification: lint (0 errors), typecheck, test (402 pass), build, build:pages, `smoke:labs` at desktop and iPhone 14 (25 labs listed, no console errors or overflow). `gen:labs --check` fresh. Use `PATH=/usr/bin:$PATH` for numpy; `npm ci` and `node scripts/fetch-pyodide.mjs` first.
- Known gaps: `content:verify` reports `problems/fewest-tokens` failing (`wrong/tle_every_piece.cpp` earned AC, not TLE) in this sandbox; pre-existing and likely timing-dependent, not touched this run. Labs are not yet Readiness evidence (D3d). CI/Pages not confirmed (no `gh` CLI).
- Next: D3c (`/dev/clt` visualiser).

## 2026-11-05: D3c Probability visualiser
- New pure `lib/prob/clt.ts`: seeded sampling distributions (uniform, exponential, two-spike, rare-event) with sample-mean generator, summary/skew, CLT prediction (mu, sigma/sqrt(n)), histogram, natural-frequency Bayes tree, and a Monte-Carlo peeking simulator (A/A tests, stop at first |z|>1.96) with the independent-looks bound for comparison. `tests/clt.test.ts` (12 tests): measured sd matches sigma/sqrt(n) per distribution, skew fades like 2/sqrt(n), tree agrees with `bayesPosterior`, one look holds ~5%, ten looks inflate to ~18% (below the 40% independent bound).
- New `/dev/clt` (`components/CltLab.tsx`): three tabs (CLT histogram vs normal curve, base-rate tree with sliders, peeking slider). `npm run smoke:clt` checks all three at desktop and iPhone 14.
- Verification: lint (0 errors), typecheck, test (414 pass), build, build:pages, smoke:clt at desktop and iPhone 14 (no console errors or overflow; screenshots inspected). content:verify result noted in the commit run below.
- Known gaps: visualiser is a dev page, not yet linked from lessons. CI/Pages not confirmed (no `gh` CLI in this session).
- Next: D3d (Readiness skill "probability and statistics").

## 2026-11-05: D3d Readiness skill "probability and statistics"
- New Readiness skill `probability-stats` (evidence: `probability` deck, Labs `prob-sampling` and `prob-mle`), weighted into the ML-engineer theory (2) and implement (1) rounds; the `probability` deck is passed to the report in `components/Readiness.tsx`. Three new tests in `tests/readiness.test.ts` (content exists, lab credit with assisted discount, round membership).
- Verification: lint (0 errors), typecheck, test (417 pass), content:verify (all ok in the full run), build, build:pages. No visual change, so no screenshots. Use `PATH=/usr/bin:$PATH` for numpy.
- Known gaps: Peaks guardian not yet evidence (D3f). CI/Pages not confirmed (no `gh` CLI in this session).
- Next: D3e (Probability Peaks region art).

## 2026-11-05: D3e1 Probability Peaks tileset
- D3e was split into D3e1-D3e3 in ROADMAP. This run: `scripts/art/probability-peaks.mjs` -> `game/sprites/tiles/probability-peaks-tiles.ts`, 20 tiles with the Vale's names so maps share a legend: snowy slate ground with dice-pip scatter, ice histogram columns (a bell of bars, peak star) as trees on an axis plinth, bell-curve signs, door glyph and obelisks (teal curve, magenta mean marker), glacial stream, indigo roofs, arena pad. `PEAKS_PREVIEW` map registered in the roster; tileset and map validity tests extended.
- Verification: lint (0 errors), typecheck, test (421 pass), build; Playwright on `/dev/sprites` at desktop and iPhone 14: no console errors, no overflow; tile sheet and preview map inspected. build:pages and content:verify not re-run (art and test-only change; no content touched).
- Known gaps: the tree-top tile shows only the top of the bell; no guardian, trainers or backdrop yet.
- CI/Pages: not confirmed (no `gh` CLI in this session).
- Next: D3e2 (Peaks guardian art).

## 2026-11-09: D3e2 Probability Peaks guardian art
- New `scripts/art/warden-bell.mjs` -> `game/sprites/creatures/warden-bell.ts`: Warden Bell, 96x96 ice golem whose body is a bell curve (silhouette follows 1-exp(-t^2)); etched sigma bands, teal curve, magenta mean line and crown star; two floating dice are its fists and re-roll every frame. Idle 4, attack 5 (a die is thrown with pip bursts), hurt 3, faint 4 (sinks, ice shards). Registered in the roster, so the roster-driven sprite tests cover it.
- Verification: lint (0 errors), typecheck, test (427 pass), build, build:pages; Playwright on `/dev/sprites` (static export) at desktop and iPhone 14: no console errors, no overflow; contact sheet and the page inspected. content:verify: only the known timing-dependent `fewest-tokens/wrong/tle_every_piece.cpp` failure (pre-existing, sandbox CPU speed).
- Known gaps: no Peaks trainers or backdrop yet. CI/Pages not confirmed (no `gh` CLI in this session).
- Next: D3e3 (Peaks trainers and battle backdrop).

## 2026-11-09: D3e3 Peaks trainers and battle backdrop (D3e complete)
- New `scripts/art/peaks-trainers.mjs`: Analyst Quill (fur-hooded ice-blue parka, round glasses, magenta scarf) and Analyst Brun (red pompom beanie, silver moustache, teal coat, clipboard); 16x24 overworld (stand, 4-frame walks in four directions) and 48x48 portraits (idle with blink, talk, smile, think). Registered in the roster; sprite tests extended.
- `game/render/battle.ts`: `StageTheme` gains `"peaks"` (dawn sky, ridge, a bell-curve mountain banded at 1/2/3 sigma with a magenta mean line, snowfield with contour rings, glacial stream, drifting pip-snow). `/battle?theme=peaks` previews it; `GuardianDef.theme` accepts it for D3f.
- Verification: lint (0 errors), typecheck, test (447 pass), build, build:pages; Playwright on `/battle?theme=peaks` and `/dev/sprites` at desktop and iPhone 14: no console errors, no overflow; backdrop, walk sheets and portraits inspected. content:verify not run (no content touched).
- Known gaps: trainers are not yet placed in a Peaks map or given dialogue; Quill's hood reads slightly beret-like at 16x24.
- CI/Pages: no `gh` CLI here; not confirmed.
- Next: D3f (guardian fight `/guardian/peaks` and its readiness evidence).

## 2026-11-09: D3f Probability Peaks guardian fight (D3 complete)
- `PEAKS_GUARDIAN` in `lib/guardian/defs.ts` (Warden Bell, Bell Badge, probability deck, `prob-mle` Lab, peaks backdrop); `/guardian/peaks` reuses `Guardian`; linked from the title; guardian added as evidence for the `probability-stats` Readiness skill.
- Tests: guardian run-through (deck, Lab, hidden-set fight, badge) and readiness credit from the cleared guardian. New `smoke:guardian-peaks` plays the Write trial with the reference MLE/bootstrap, fights and checks badge persistence; `smoke-slice` includes the route.
- Verification: lint (0 errors), typecheck, test (448 pass), build, build:pages, smoke:guardian-peaks and smoke:slice at desktop and iPhone 14: no console errors or overflow; screenshots inspected. content:verify: all ok.
- Known gaps: no Peaks overworld map or trainer dialogue yet. CI/Pages not confirmed (no `gh` CLI here).
- Next: D4 (Classic Grove).

## 2026-11-10: D4a Classic Grove lessons and deck
- D4 was split into D4a-D4f in ROADMAP. This run: `scripts/gen-classic.mjs` generates `content/decks/classic.json` (41 cards over classic-linear / classic-tree / classic-cluster / classic-eval: 18 predict, 4 shape, 5 derive, 12 concept, 2 multi, 3 bug) and `content/lessons/classic.json` (4 lessons incl. normal equation vs GD, logistic regression, ridge, split search, bagging variance floor, boosting, k-NN scaling, k-means, Naive Bayes smoothing, bias-variance, a feature-selection leakage demo on pure noise, imbalance). Every predict/shape/derive answer and lesson output is computed natively with numpy; bug cards are checked to change behaviour when fixed; `--check` guards staleness.
- New `lib/solvers/classic.ts` (Gini/entropy/gain, best threshold, OLS, ridge slope, logistic point, 1D k-means, ensemble variance, class weights, SVM margin, Naive Bayes posterior) and `tests/classic.test.ts` cross-checking the deck. Wired into Learn (32 lessons) and Daily Sync; `smoke:learn` now opens the newest lesson.
- Verification: lint (0 errors), typecheck, test (all pass; `node scripts/fetch-pyodide.mjs` first, `PATH=/usr/bin:$PATH` for numpy), build, build:pages, smoke:learn and smoke:sync at desktop and iPhone 14 (no console errors or overflow; iPhone lesson screenshot inspected). content:verify: see commit notes below.
- Known gaps: no Labs, visualiser, Readiness skill or art for Classic Grove yet (D4b-D4f). CI/Pages not checked (no `gh` CLI here; Actions quota period has ended, so this should be confirmed next run).
- Next: D4b (classic Labs).

## 2026-11-10: D4b Classic Grove Labs and Creature Stats
- New Lab phase `grove` ("Classic Grove") with two Python/numpy Labs. `classic-linear`: `normal_equation` (design matrix + solve), `ridge_fit` (unpenalised intercept), stable `sigmoid`, `logistic_loss` (logaddexp form), `logistic_grad`, `logistic_gd`. `classic-cluster`: `zscore` (train statistics only), `knn_predict` (stable tie rules), `kmeans` (empty cluster keeps its center), `gini`, `best_split` (midpoints, size-weighted gain, smallest-threshold tie rule). Hidden tests include closed-form checks, ridge shrinkage monotonicity, finite-difference gradient check, no-overflow under `np.errstate`, inertia non-increase, and a scaling demonstration for k-NN. 8 documented known-wrong versions per Lab; all are rejected and the starters fail.
- New `lib/datasets/creatureStats.ts`: seeded tabular generator with a documented process (about 8% rare base rate, habitat confounding level and rarity, a leaky `caught_by_rare_ranger` flag, an informative `shimmer`, a noise `speed`) and `tests/creatureStats.test.ts` that measures each planted property.
- Verification: lint (0 errors), typecheck, test (459 pass; `npm ci` + `node scripts/fetch-pyodide.mjs` first, `PATH=/usr/bin:$PATH` for numpy), content:verify (all ok), build, build:pages, `smoke:labs` at desktop and iPhone 14 (27 labs listed, no console errors or overflow; iPhone list screenshot inspected).
- Known gaps: Labs are not yet Readiness evidence (D4d); the dataset is not yet used by the Training Grounds or a lesson (D4c/D5).
- Next: D4c (`/dev/grove` visualiser).

## 2026-11-10: D4c Classic Grove visualiser
- New pure `lib/classic/boundary.ts` (seeded blobs/moons/XOR data, k-NN, greedy Gini tree, stable logistic GD, polynomial fit and a bias-variance sweep) with `tests/boundary.test.ts` (7 tests: 1-NN memorises, linear fails XOR, a greedy tree needs depth 4 on XOR because the first split has no gain, polyFit recovers an exact quadratic, train error falls while test error is U-shaped).
- New `/dev/grove` (`components/GroveLab.tsx`): decision-boundary canvas with model/dataset/k/depth/noise controls and live train vs test accuracy, plus a bias-variance tab. `npm run smoke:grove` at desktop and iPhone 14.
- Verification: lint (0 errors), typecheck, test (all pass; `PATH=/usr/bin:$PATH` for numpy), build, build:pages, smoke:grove at desktop and iPhone 14 (no console errors or overflow; screenshots inspected). Caught and fixed a moons generator whose arcs crossed. content:verify not re-run (no content touched).
- Known gaps: dev page only, not linked from lessons. CI/Pages not confirmed (no `gh` CLI in this session).
- Next: D4d (Readiness skill "classical ML").

## 2026-11-10: D4d Readiness skill "classical ML"
- New Readiness skill `classical-ml` (evidence: `classic` deck, Labs `classic-linear` and `classic-cluster`), weighted into the ML-engineer theory (3) and implement (1) rounds; `classic` deck passed to the report in `components/Readiness.tsx`. Three new tests in `tests/readiness.test.ts` (content exists, assisted-lab discount, round membership).
- Verification: lint (0 errors), typecheck, test (469 pass), build, build:pages, `smoke:readiness` at desktop and iPhone 14 (all PASS; no console errors or overflow; no screenshots viewed, since the change adds one list row). content:verify not run (no content touched).
- Known gaps: Grove guardian not yet evidence (D4f). CI/Pages confirmation: no `gh` CLI here.
- Next: D4e (Classic Grove region art).

## 2026-11-10: D4e1 Classic Grove tileset
- D4e was split into D4e1-D4e3 in ROADMAP. This run: `scripts/art/classic-grove.mjs` -> `game/sprites/tiles/classic-grove-tiles.ts`, 20 tiles using the Vale's names: mossy ground with scatter-plot clusters (cyan/magenta data points), decision-tree canopies (root, two children, four leaves; the root node blinks), forking trunks, boundary signposts, a door with a split glyph, node obelisks, brook, clay roofs, fork-glyph arena pad. `GROVE_PREVIEW` map registered in the roster; tileset and map validity tests extended.
- Verification: lint (0 errors), typecheck, test (473 pass after `node scripts/fetch-pyodide.mjs`; `PATH=/usr/bin:$PATH`), build, build:pages; Playwright on `/dev/sprites` at desktop and iPhone 14: no console errors, no overflow; preview map and tile sheet inspected. content:verify not run (art only).
- Known gaps: canopy is slightly small against its trunk tile; no guardian, trainers or backdrop yet. CI/Pages not confirmed (no `gh` CLI here).
- Next: D4e2 (Grove guardian art).

## 2026-11-10: D4e2 Classic Grove guardian art
- `scripts/art/warden-split.mjs` -> `game/sprites/creatures/warden-split.ts`: Warden Split, a 96x96 ancient-oak golem built as a decision tree (root-node rune with cyan/magenta class leaves on the trunk, boughs forking into child-node fists, canopy of class-coloured data points cut by a dashed split line). Idle 4, attack 5 (slams a dashed boundary across the ground), hurt 3, faint 4 (wilts, leaves fall). Registered in the roster; sprite test added in `tests/guardian.test.ts`.
- Verification: lint (0 errors), typecheck, test (480 pass), build, build:pages; `/dev/sprites` at desktop and iPhone 14: no console errors or overflow; guardian frames inspected (reads as a tree, eyes/runes animate).
- Known gaps: not yet used by a fight (D4f); trainers and backdrop pending (D4e3). CI/Pages not confirmed (no `gh` CLI here).
- Next: D4e3 (Grove trainers and battle backdrop).

## 2026-11-10: D4e3 Grove trainers and battle backdrop (D4e complete)
- `scripts/art/grove-trainers.mjs`: Botanist Fern (moss-green leaf hood, freckles, amber scarf) and Forester Birch (brown felt cap with feather, grey beard, forest-green coat, clipboard); 16x24 walks (4 directions) and 48x48 portraits (idle/talk/smile/think). Registered in the roster; sprite tests extended.
- `game/render/battle.ts`: `StageTheme` gains `"grove"` (dappled glade, a big decision tree whose root node blinks, cyan/magenta scatter clusters on the moss, dashed boundary, drifting leaves). `/battle?theme=grove` previews it; `GuardianDef.theme` accepts it for D4f.
- Verification: lint (0 errors), typecheck, test (500 pass; `PATH=/usr/bin:$PATH`), build, build:pages; Playwright on `/battle/?theme=grove` and `/dev/sprites/` at desktop and iPhone 14: no console errors, no overflow; backdrop and trainer sheets inspected. content:verify not run (art only).
- Known gaps: Fern's hair reads a little like a beret under the hood; trainers not yet placed in a map. CI/Pages not confirmed (no `gh` CLI here).
- Next: D4f (guardian fight `/guardian/grove` and its readiness evidence).

## 2026-11-10: D4f Warden Split guardian fight (D4 complete)
- `GROVE_GUARDIAN` (Warden Split, Split Badge) in `lib/guardian/defs.ts`; `/guardian/grove` runs on `CLASSIC_DECK` with the `classic-cluster` Lab as the Write trial, then the hidden-set fight. Home link added; the guardian is now evidence for the `classical-ml` Readiness skill. Tests: guardian full-flow and readiness credit.
- Verification: lint (0 errors), typecheck, test (501 pass; `PATH=/usr/bin:$PATH`), build, build:pages, `smoke:guardian-grove` at desktop and iPhone 14 (all PASS; no console errors or overflow; iPhone cards screenshot inspected, boss reads as a tree on the Grove backdrop). content:verify not run (no content changed).
- Known gaps: the Grove is not yet reachable on the overworld map (trainers not placed). CI/Pages confirmation skipped (no `gh` CLI here). Pushed to `main` and the session branch.
- Next: D5 (Metric Market + Data Dojo), to be split into sub-boxes first.

## 2026-11-10: D5a Metric Market lessons and deck
- D5 was split into D5a-D5f in ROADMAP. This run: `scripts/gen-metrics.mjs` generates `content/decks/metrics.json` (34 cards over metric-confusion / metric-curves / metric-calibration / metric-splits / metric-ranking: 16 predict, 3 shape, 3 derive, 8 concept, 1 multi, 3 bug) and `content/lessons/metrics.json` (3 lessons: confusion matrix + ROC vs PR + base rate + cost thresholds; calibration + time/group splits + significance; ranking and regression metrics). Every answer and lesson output is computed natively with numpy; bug cards are checked to change behaviour when fixed; `--check` guards staleness. Two explanation numbers I had typed (9.1%, R^2 -11.71) were caught by reading the computed outputs and corrected (9.0%, -14).
- New `lib/solvers/evalMetrics.ts` and `tests/metrics.test.ts` cross-check the deck (precision/recall/F-beta, Bayes PPV/NPV, pairwise AUC, AP, P@k, MRR, nDCG, R^2, standard error). Wired into Learn (35 lessons) and Daily Sync.
- Verification: lint (0 errors), typecheck, test (506 pass; `PATH=/usr/bin:$PATH` for numpy), build, build:pages, content:verify (all ok), smoke:learn and smoke:sync at desktop and iPhone 14 (all PASS; no console errors or overflow; no new visual surface, so no screenshots viewed).
- Known gaps: no Labs, Dojo interactives, Readiness skill, art or bosses yet (D5b-D5f). CI/Pages confirmation not attempted (no `gh` CLI here).
- Next: D5b (metric Labs).

## 2026-11-10: D5b Metric Market Labs
- New Lab phase `market` ("Metric Market") with two Python/numpy Labs. `metrics-classify`: `prf` (precision/recall/F-beta, zero-division is 0.0), `roc_auc` (pair-counting, ties half), `average_precision` (tied scores share a threshold), `best_threshold` (cost-minimising cut, `score >= t`, "flag nothing" candidate, ties keep the higher threshold). `metrics-rank`: `precision_at_k`, `recall_at_k`, `mrr`, `ndcg_at_k` (2^g-1 gain, ideal from the whole list), `ece` (equal-width, count-weighted, absolute gaps). Hidden tests include brute-force cost search, AUC vs pair counting, rescaling invariance, a base-rate demonstration (ROC unchanged, AP collapses with 20x negatives) and calibration of simulated well- and mis-calibrated probabilities. 8 documented known-wrong versions per Lab, all rejected; starters fail.
- Verification: lint (0 errors), typecheck, test (506 pass; `PATH=/usr/bin:$PATH`), content:verify (labs ok), build, build:pages, `smoke:labs` at desktop and iPhone 14 (29 labs listed, no console errors or overflow; no new visual surface, no screenshots viewed). CI/Pages confirmation skipped (no `gh` CLI here).
- Known gaps: Labs are not yet Readiness evidence (D5d); no Dojo interactive, art or bosses (D5c, D5e, D5f).
- Next: D5c (Data Dojo interactives, `/dev/dojo`).

## 2026-11-10: D5c Data Dojo interactives
- New pure `lib/metrics/dojo.ts` (seeded): scored population + confusion counts + cost-matrix best threshold; user/time-structured rows with random/group/time splits and a 1-NN memoriser; normal helpers, sample-size formula and an A/B peeking simulator (optional Bonferroni). `tests/dojoLab.test.ts` (9 tests): best threshold equals brute force and falls as miss cost rises; random split beats group split by >15 points and group is near chance; one look holds alpha, ten looks more than double it, split alpha restores it; a planned-size test reaches about 80% power.
- New `/dev/dojo` (`components/DataDojoLab.tsx`) with Cost matrix, Split leakage and A/B peeking tabs; `npm run smoke:dojolab`.
- Honest finding kept in the copy: a time split alone still shares users, so it is only partly honest.
- Verification: lint (0 errors), typecheck, test (515 pass; `PATH=/usr/bin:$PATH`), build, build:pages, smoke:dojolab at desktop and iPhone 14 (all PASS, no console errors or overflow; cost and A/B screenshots inspected). content:verify not run (no content changed).
- Known gaps: dev page only, not yet linked from lessons or the overworld. CI/Pages confirmation: no `gh` CLI/Actions access in this session.
- Next: D5d (Readiness skill "evaluation").
