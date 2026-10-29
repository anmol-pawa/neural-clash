# Neural Clash roadmap

Work top to bottom: take the **first unchecked box**, and split big boxes into run-sized sub-boxes when you start them. References: GDD = `docs/GAME_DESIGN.md`, CUR = `docs/CURRICULUM.md`, ARCH = `docs/ARCHITECTURE.md`.

**Definition of done:** works in the static build, has tests, is screenshot-verified if visual, `content:verify` passes for content, and is noted in PROGRESS.md. Time-sensitive facts are web-checked and date-stamped.

---

## Phase A: Foundation

- [x] A1. **Scaffold from Query Clash:** Next.js 16 / React 19 / Pixi 8 / Tailwind 4, PWA + service worker (keep the worker-fragment fix), `ci.yml` (also installs python3 deps from `requirements-dev.txt`) + `pages.yml` (basePath `/neural-clash`), scripts, `.routine/` lock and README. Remove all Query/SQL/PGlite references. The title screen renders.
- [x] A2. **Pyodide runtime** (ARCH §2): a worker with numpy, lazy load with progress, timeouts/respawn, stdout capture, the `nc_test` harness with a gradient checker, and a `/dev/pyodide` page. Write an ADR (version, size, load times on desktop and Playwright iPhone, offline caching, mobile policy). Add a Playwright smoke test.
- [x] A3. **C++ judge:** port from `/home/user/algo-clash/lib/judge/` if present, else run the spike + ADR. Add `/dev/judge` and a smoke test.
- [x] A4. **Content pipeline** (ARCH §4): Lab module package (`lesson`, `spec.py`, `reference/`, `tests_visible.py`, `tests_hidden.py`, `wrong/`), problem packages (the Algo Clash format), `npm run content:verify` running native python3 and g++, `requirements-dev.txt`, and one sample of each.
- [x] A5a. **Editor logic** (pure, tested): immutable multi-file `Workspace` (tree, create/rename/remove/reset, dirty tracking, path validation), draft stores (IndexedDB with graceful fallback, debounced autosave), test-report view model (hidden tests masked, gradient-check diff parsing and gauge).
- [x] A5b. **Editor UI:** CodeMirror 6 multi-file editor (file tree, tabs, Python/C++ highlighting), Run/Submit wired to Pyodide and the C++ judge, test panel with gradient-check diffs, drafts via `lib/editor/drafts.ts`, `/dev/editor`, Playwright smoke at desktop and iPhone 14.
- [x] A6. **Save system v1** (port from Algo Clash if present), including storage of the player's `latent` package files.

## Phase B: Vertical slice (Python Port → Perceptron, about 40 minutes)

- [x] B1a. **Art tooling + Neuron-Pup Perceptron:** palette/char-grid `SpriteDef`, shaded-primitive rasteriser (`scripts/art/`), front + back 64×64 sprites (idle/attack/hurt/faint, front also evolve), `/dev/sprites` review page, sprite tests.
- [x] B1b-i. **Art:** the player and Professor Okafor (16×24 overworld, 4-direction walk cycles + stand, 48×48 portraits with blink/talk/smile/think).
- [ ] B1b-ii. **Art:** the Python Port tileset and the Lab interior.
- [ ] B2. **Overworld + dialogue engine** (port from Algo Clash if present).
- [ ] B3. **Battle stage and card battles:** MCQ, derive-it (numeric), shape check, metric drill, spot-the-bug. The solvers in `lib/solvers/` are tested.
- [ ] B4. **Python Port content, part 1** (CUR F1: Python + interview Python): lessons, 30 cards, 10 judged functions.
- [ ] B5. **Python Port content, part 2** (numpy, broadcasting, vectorisation): lessons, 25 cards (shape cards generated), 8 vectorisation challenges with perf thresholds.
- [ ] B6. **Lab flow v1 + Forge module "linear model + GD"** (a pre-autograd perceptron/linear regression with a hand-derived gradient). The companion stats come from its test metrics.
- [ ] B7. **Training Grounds v1** (ARCH §5): the TS trainer for linear models + 2D toys, live curves, the hidden test-set battle, and equivalence tests vs Python.
- [ ] B8. **Python Port guardian battle** (96×96 boss, three phases: cards → a Lab mini-task → a Training battle vs *Overfit*'s minion), a badge.
- [ ] B9. **Audio v1** (port the synth if present).
- [ ] B10. **Slice polish:** a Playwright playthrough on desktop and iPhone 14, screenshots, fixes, and a slice review in PROGRESS.md.

## Phase C: Core systems

- [ ] C1. SRS and mastery with rust; the Daily Sync (GDD §6).
- [ ] C2. Companion evolution system tied to Forge milestones, plus stat derivation from measured metrics.
- [ ] C3. Research journal (experiment log, comparison view).
- [ ] C4. Hints, Bits, the Mart (never mastery), and scaffolding modes (Guided/Standard/Interview).
- [ ] C5. Readiness Report mapped to interview loops (CUR D3).
- [ ] C6. **Code Dojo v1:** port the coding battle from Algo Clash (Scout → Strategise → Code → Judge → Debrief) for C++ and Python problems.

## Phase D: Act I regions (region recipe)

**Region recipe:** art (tileset, 2 trainers, guardian 96×96, backdrop, companion form if due) → lessons with full maths → about 40 cards (solver-generated where numeric) → Lab modules → Training/Data battles → guardian → music.

- [ ] D1. Vector Vale (CUR F2), with PCA labs and the transform visualiser
- [ ] D2. Gradient Gorge (F3), with Forge modules 1–2 (`Value`, `Tensor`) and gradient checks
- [ ] D3. Probability Peaks (F4)
- [ ] D4. Classic Grove (F5), with from-scratch classical ML labs and the Creature Stats dataset
- [ ] D5. Metric Market + Data Dojo (F6, GDD §5.4), with the *Leakage* and *Imbalance Swarm* bosses
- [ ] D6. Neuron Nest (F7), with Forge modules 3–8 (split across runs) and the companion → Multilayer
- [ ] D7. Conv Caverns (F8), with module 9, the Glyphs dataset and the companion → Convling
- [ ] D8. Recurrent Rapids (F9), with module 10 and the companion → Recurrent; plus the *Drift* boss

## Phase E: Act II regions

- [ ] E1. Attention Atoll (T1), with modules 11–13, the attention-map visualiser and the companion → Transformer
- [ ] E2. Token Tundra (T2), with modules 14–17, the tiny LM trained on the Lore Corpus and the companion → Foundation
- [ ] E3. Pretrain Peaks (T3), with cost solvers
- [ ] E4. Tuning Terraces (T4), with LoRA maths and the decision guide
- [ ] E5. Inference Interchange (T5), with the KV-cache lab and serving maths

## Phase F: Act III regions (applied-AI core)

- [ ] F1. Prompt Plaza (A1)
- [ ] F2. Lumen Labs Handbook corpus + golden set (about 150 docs, about 200 labelled questions; generated in-repo, original)
- [ ] F3. Retrieval Reef (A2): chunkers, BM25, LSA embeddings, hybrid + RRF, reranker, metrics, scenarios (split across runs)
- [ ] F4. Eval Courthouse (A4): the judge-bias dataset, calibration and κ, bias detection and mitigation, regression evals
- [ ] F5. Agent Arcology (A3): the scripted fake LLM, the agent-loop lab, trace-debugging puzzles, guardrails, MCP lessons (web-checked)
- [ ] F6. Safety Sanctum (A6): the attack suite and defence pipeline
- [ ] F7. Ops Observatory (A5): the LLM-app simulator, budget levels and incident drills
- [ ] F8. Multimodal Mesa (A7)

## Phase G: Coding and interview tracks

- [ ] G1. **Code Dojo core ladder:** about 150 C++ problems (port from Algo Clash where available, else author in the same package format), in batches of 6–8 per box (G1a…).
- [ ] G2. **AI-flavoured implement-from-scratch problems** (CUR K2, about 50), in batches of 6.
- [ ] G3. **Codebase viewer** (ARCH §7) with the symbol index.
- [ ] G4. **Comprehension Catacombs:** about 20 codebases (CUR K3), 2 per box.
- [ ] G5. **Pair Pavilion engine:** the assistant panel, intent matching, phases and verification scoring.
- [ ] G6. **Pair Pavilion scenarios:** about 15 (CUR K4), 2 per box.
- [ ] G7. **Design Spire engine:** port Blueprint Clash's Interview Room if present, adapt it for AI design, and run the Ops Observatory canvas inside it.
- [ ] G8. **AI system design case studies:** about 25 (CUR D1), 2 per box.
- [ ] G9. **Product-sense investigations:** about 10 (CUR D2).
- [ ] G10. **Take-home simulator** (CUR D3) and Story Forge.

## Phase H: Finale and post-game

- [ ] H1. **The Hiring Panel:** a full loop (C++ coding, comprehension, AI-assisted, ML/LLM theory, AI design, product sense), the ending "The Offer" and credits.
- [ ] H2. **Post-game:** Research Mode (implement a paper's core idea from an original written spec), Hard Mode and the Endless Arena.

## Phase I: Polish (ongoing)

- [ ] I1. Accessibility audit and fixes.
- [ ] I2. Performance (Pyodide/clang caching, trainer speed, bundle).
- [ ] I3. README with screenshots, plus an authoring guide.
- [ ] I4. **Monthly freshness pass:** re-check time-sensitive lessons (models, tools, MCP, pricing, interview formats) and update the "as of" stamps.
- [ ] I5. Depth: more problems, codebases, scenarios and case studies, guided by weak-area stats.
