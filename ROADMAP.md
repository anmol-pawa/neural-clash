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
- [x] B1b-ii. **Art:** the Python Port tileset and the Lab interior (16×16 tiles, animated water/lamps/servers/Training Rig, `tilemap.ts` composer, preview maps).
- [x] B2a. **Overworld + dialogue logic** (pure, tested): tile-grid walker with collision, warps, NPC/prop interaction, camera; branching dialogue scripts with flags, choices and typewriter. (Neither Algo nor Query Clash has a walkable overworld, so this is new.)
- [x] B2b. **Overworld UI:** `/play` canvas scene (animated tiles, walk cycles, y-sorted actors), dialogue box with portraits, keyboard + touch d-pad, `smoke:overworld` Playwright test.
- [x] B3a. **Solvers, card model and battle logic** (pure, tested): `lib/solvers/` (stable softmax/CE/BCE/MSE gradients, numpy shape rules, precision/recall/F1/AUC/nDCG/ECE, cross-checked against numpy), `lib/cards/` (MCQ, multi, derive-it, shape, metric, spot-the-bug; seeded generators), `lib/battle/` (streaks, counters, requeue, stars).
- [x] B3b. **Battle stage UI** (`/battle`): canvas stage with backdrop, platforms, lunge/bolt/hurt flash/faint, damage numbers, HP bars, shake; card forms for every type; `smoke:battle`. Uses a tinted Neuron-Pup as the placeholder foe.
- [x] B3c-i. **Diagnose-the-curve cards** (loss curves from real GD runs, label verified by a classifier), **technique / trade-off duel** card variants, and the deck loader + validator reading `content/decks/*.json`.
- [x] B3c-ii. **A proper Noise-minion sprite** (64×64, front, multi-frame idle/attack/hurt/faint) replacing the recoloured Neuron-Pup foe.
- [x] B4a. **Python Port cards** (CUR F1): 32-card deck `content/decks/python-port.json`, 21 predict-the-output cards whose answers are computed by running native python3 (`scripts/gen-python-deck.mjs`), 2 proven spot-the-bug cards.
- [x] B4b. **Python Port lessons** (CUR F1: Python + interview Python): short original lessons for each card topic, linked from the deck.
- [x] B4c. **10 judged Python functions** (Lab/problem packages: reference, wrong solutions, hidden tests) for interview Python.
- [x] B5a. **numpy cards and lessons:** 28-card deck `content/decks/numpy.json` (13 predict, 11 shape cards whose answers are computed by numpy and cross-checked against `lib/solvers`, concept/multi/bug) and 5 lessons, all generated by `scripts/gen-numpy.mjs`.
- [x] B5b. **8 numpy vectorisation challenges** (Lab packages with perf thresholds via read/op counts, wrong loop versions rejected).
- [x] B6a. **Lab flow v1:** `/labs` index + lesson + editor for every Lab package (`scripts/gen-labs.mjs` bundle, solved state saved, `smoke:labs`).
- [x] B6b. **Forge module "linear model + GD"** (extend `linear-gd`: a perceptron/linear regression with train loop, test metrics → companion stats; hint ladder). Original B6 text: **Lab flow v1 + Forge module "linear model + GD"** (a pre-autograd perceptron/linear regression with a hand-derived gradient). The companion stats come from its test metrics.
- [x] B7a. **Training Grounds trainer core** (ARCH §5): `lib/train/` seeded 2D toy datasets with a disjoint hidden test set, linear/logistic models (poly features, L2, mini-batch), evaluation, companion-stats bridge; equivalence tests vs numpy.
- [x] B7b-1. **Training Grounds UI** (done 2026-11-03): `/train` with a worker-run trainer, live pixel boundary canvas and loss curves, hyperparameter controls, sealed hidden score reveal + companion stats.
- [x] B7b-2a. **Save companion + pixel curves** (done 2026-11-03): `companion` record in the save (sanitised, tested), "Save as my companion" after the reveal, stepped pixel-style loss curves.
- [x] B7b-2b. **Hidden-set reveal battle** (done 2026-11-03): turn the reveal into a battle where the measured stats drive the fight (GDD §5.3), using the saved companion.
- [x] B8a. **Guardian core + art** (done 2026-11-03): pure three-phase state machine `lib/guardian/portGuardian.ts` (cards, Lab mini-task, hidden-set fight; Indent Badge), 96×96 Warden Indent sprite with idle/attack/hurt/faint.
- [x] B8b. **Guardian UI** (`/guardian`): phase strip, card duel with the Warden sprite, embedded Lab task, training fight using the saved companion, badge saved to `cleared` (`guardian:python-port`), `smoke:guardian`.
- [x] B9. **Audio v1** (done 2026-11-03): algo-clash had no synth, so a new pure `lib/audio/sfx.ts` (10 effects + looping theme as note data, tested) and a Web Audio `player.ts`; volume + music in the save; SFX in cards, guardian, labs.
- [x] B10. (done 2026-11-03) **Slice polish:** a Playwright playthrough on desktop and iPhone 14, screenshots, fixes, and a slice review in PROGRESS.md.

## Phase C: Core systems

- [x] C1a. (done 2026-11-03) **SRS core:** pure `lib/srs/srs.ts` (Leitner ladder, rust, assisted never advances, daily plan), `srs` in the save, recorded from card battles and Lab passes.
- [x] C1b. (done 2026-11-03) **Daily Sync UI** (`/sync`): due/rusted reviews + new cards from the deck, mastery summary, rust shown on the companion and "stale" on Labs (GDD §6).
- [x] C2. (done 2026-11-03) **Companion evolution:** pure `lib/evolution/evolution.ts` (form ladder from unassisted Forge Lab passes, planned Labs shown as coming) and `/companion` page. Stat derivation from metrics already lives in `lib/labs/companion.ts`. Follow-up C2b: art for forms 2-6 and glitch on regressed Labs, as their Labs land.
- [x] C3. (done 2026-11-03) Research journal: `lib/journal`, `journal` in the save, auto-logged on hidden-score reveal, `/journal` with notes and A/B comparison.
- [x] C4a. (done 2026-11-03) **Bits, hint pricing and scaffolding modes:** pure `lib/economy` (rewards once per item and never when assisted, rung-priced hints, Mart catalogue and purchase rules, sanitisers), `wallet`/`owned`/`mode` in the save, mode picker + Bits on `/labs`, hints cost Bits and mark the attempt assisted.
- [x] C4b. (done 2026-11-03) **Mart page** (`/mart`: spend Bits on cosmetics, apply tints to the Pup/Forge) and Bits rewards from card battles and the guardian (pass `assisted` through, interview 1.5x).
- [x] C5. (done 2026-11-03) Readiness Report mapped to interview loops (CUR D3): pure `lib/readiness`, `/readiness` page. Follow-up C5b: take-home simulator (needs Retrieval Reef).
- [x] C6a. (done 2026-11-03) **Code Dojo core:** pure `lib/dojo` (Scout → Strategise → Code + Judge → Debrief, 3 hearts, grades), `scripts/gen-problems.mjs` → `lib/dojo/problems.gen.ts` (expected outputs from the native reference), `/dojo` and `/dojo/[id]` on the existing clang workbench, Bits for a first unaided solve; Hot Tokens is the first problem.
- [x] C6b1. (done 2026-11-03) **Code Dojo ladder, part 1:** two more full packages (Context Window: sliding window; Batch Packer: binary search on the answer) beside Hot Tokens, each with brute, 3 wrongs incl. TLE, generator, hints, editorial.
- [x] C6b2a. (done 2026-11-03) **Code Dojo ladder, part 2a:** graph + hard packages (Pipeline Order: Kahn with a min-heap; Peak Window: monotonic deque, H) and `/dojo` ordered by difficulty.
- [x] C6b2b1. (done 2026-11-03) **Code Dojo ladder, part 2b-1:** an easy AI-flavoured package (Label Consensus: majority vote, E) and a DP package (Fewest Tokens: min-token segmentation, M).
- [x] C6b2b2a. (done 2026-11-03) **Code Dojo ladder, part 2b-2a:** a tree package (Worst Hop: weighted tree diameter, bottom-up DP) and play-throughs of Worst Hop and Fewest Tokens in `smoke:dojo`.
- [x] C6b2b2b. (done 2026-11-04) **Code Dojo ladder, part 2b-2b:** a second hard package (Steady Latency: sliding-window median with an ordered multiset), played end to end in `smoke:dojo`.
- [x] C6b3a. (done 2026-11-04) **SRS entries for solved Dojo problems:** unaided solves are tracked (`problem:<id>`), shown on the ladder, queued in Daily Sync and counted for companion rust.
- [x] C6b3b. (done 2026-11-04) **Python (Pyodide) variant of the Dojo battle** (GDD §5.6): Python reference + judge for core problems; C++ stays the default. Done for Label Consensus, Context Window, Batch Packer; follow-up C6b3c: more problems get a Python variant as they are added.

## Phase D: Act I regions (region recipe)

**Region recipe:** art (tileset, 2 trainers, guardian 96×96, backdrop, companion form if due) → lessons with full maths → about 40 cards (solver-generated where numeric) → Lab modules → Training/Data battles → guardian → music.

- [x] D1. Vector Vale (CUR F2), split into:
  - [x] D1a. (done 2026-11-04) Lessons (5) and a 41-card deck, all numeric answers computed by numpy and cross-checked by `lib/solvers/linalg.ts`; wired into Learn and Daily Sync.
  - [x] D1b. (done 2026-11-04) PCA Lab modules (via SVD and via power iteration): reference, visible + hidden tests, known-wrong versions.
  - [x] D1c. (done 2026-11-04) Interactive 2D transform visualiser at `/dev/transform` (pure matrix maths in `lib/linalg/transform.ts`). Lesson embedding is a follow-up.
  - [x] D1d1. (done 2026-11-04) Readiness skill "linear algebra" (linalg deck + both PCA labs), tested in the ML-engineer theory and implement rounds.
  - [x] D1d2a. (done 2026-11-04) Vector Vale tileset (20 tiles, `scripts/art/vector-vale.mjs`), a preview map and the 96x96 guardian Warden Basis (idle 4, attack 5, hurt 3, faint 4; `scripts/art/warden-basis.mjs`), reviewed on `/dev/sprites`.
  - [x] D1d2b. (done 2026-11-04) Region art, part 2: Cadet Shear and Ranger Axis (16x24 walk cycles + 48x48 portraits, `scripts/art/vale-trainers.mjs`) and the Vector Vale battle backdrop (`theme: "vale"`, preview at `/battle?theme=vale`).
  - [x] D1d3. (done 2026-11-04) Vector Vale guardian fight (`/guardian/vale`: linalg deck duel, `pca-svd` Lab, hidden-set fight) and its readiness evidence.
- [x] D2. Gradient Gorge (F3), with Forge modules 1–2 (`Value`, `Tensor`) and gradient checks
  - [x] D2a. (done 2026-11-04) Forge 1 Lab `forge-value`: scalar reverse-mode autodiff `Value` with finite-difference hidden tests and 8 known-wrong versions.
  - [x] D2b. (done 2026-11-04) Forge 2 Lab `forge-tensor`: numpy `Tensor` with broadcasting-aware backward (unbroadcast), matmul, sum/mean, gradient checks.
  - [x] D2c. (done 2026-11-04) Calculus/optimisation deck (38 cards: derivatives, chain rule, GD step sizes, Adam bias correction; numpy-computed, solver-checked) and 4 lessons.
  - [x] D2d. (done 2026-11-04) Gradient descent visualiser (`/dev/descent`: SGD, momentum, Adam on a bowl, ravine and Rosenbrock valley; pure maths in `lib/optim/`, `smoke:descent`).
  - [x] D2e1. (done 2026-11-04) Readiness skill "calculus & optimisation" (calculus deck + `forge-value` + `forge-tensor`), tested in the ML-engineer theory and implement rounds.
  - [x] D2e2. (done 2026-11-04) Gradient Gorge tileset (`scripts/art/gradient-gorge.mjs`, canyon palette, contour-etched ground, descent arrows, preview map) and the 96x96 guardian Warden Chain (idle 4, attack 5, hurt 3, faint 4; `scripts/art/warden-chain.mjs`), reviewed on `/dev/sprites`.
  - [x] D2e3. (done 2026-11-04) Gorge trainers Climber Delta and Surveyor Hess (16x24 walk cycles + 48x48 portraits, `scripts/art/gorge-trainers.mjs`) and the Gradient Gorge battle backdrop (`theme: "gorge"`, preview at `/battle?theme=gorge`).
  - [x] D2e4. (done 2026-11-04) Gradient Gorge guardian fight (`/guardian/gorge`: calculus deck duel, Forge Lab, hidden-set fight) and its readiness evidence.
- [x] D3. Probability Peaks (F4), split into:
  - [x] D3a. (done 2026-11-04) Lessons (4) and a 47-card deck (Bayes and base rates, expectation/variance/CLT, MLE/MAP and losses as likelihoods, entropy/KL, A/B testing, power, peeking, bootstrap), numpy-computed and cross-checked by `lib/solvers/probability.ts`; wired into Learn and Daily Sync.
  - [x] D3b. (done 2026-11-04) Labs `prob-sampling` (inverse CDF, categorical, rejection, Box-Muller) and `prob-mle` (Gaussian MLE/NLL, Beta-Bernoulli MAP, bootstrap means and percentile CI) in a new "Probability Peaks" Lab phase, with hidden tests and 8 known-wrong versions each.
  - [x] D3c. (done 2026-11-05) Interactive visualiser `/dev/clt` (CLT, base-rate frequency tree, peeking simulator; pure maths in `lib/prob/clt.ts`) with `smoke:clt`.
  - [x] D3d. (done 2026-11-05) Readiness skill "probability and statistics" (deck + labs), tested in the theory rounds.
  - [x] D3e. Region art, split into:
    - [x] D3e1. (done 2026-11-05) Probability Peaks tileset (`scripts/art/probability-peaks.mjs`: snowy slate ground with dice-pip scatter, ice histogram columns as trees, bell-curve signs/door/obelisks, glacial stream, arena pad) and preview map.
    - [x] D3e2. (done 2026-11-09) Guardian Warden Bell (96x96, idle 4, attack 5, hurt 3, faint 4; `scripts/art/warden-bell.mjs`): a bell-curve ice golem with sigma bands, a mean line and two re-rolling dice.
    - [x] D3e3. (done 2026-11-09) Two trainers, Analyst Quill and Analyst Brun (16x24 walks + 48x48 portraits; `scripts/art/peaks-trainers.mjs`) and the Peaks battle backdrop (`theme: "peaks"`, bell-curve mountain with sigma bands).
  - [x] D3f. (done 2026-11-09) Guardian fight `/guardian/peaks` (Warden Bell: probability deck duel, `prob-mle` Lab, hidden-set fight, Bell Badge) and its readiness evidence.
- [x] D4. Classic Grove (F5), with from-scratch classical ML labs and the Creature Stats dataset, split into:
  - [x] D4a. (done 2026-11-10) Lessons (4) and a ~40-card deck (linear/logistic/regularisation, trees and ensembles, k-NN/k-means/Naive Bayes/SVM, bias-variance/CV/leakage/imbalance), numpy-computed and cross-checked by `lib/solvers/classic.ts`; wired into Learn and Daily Sync.
  - [x] D4b. (done 2026-11-10) Labs `classic-linear` (normal equation, ridge, stable logistic loss/grad, GD) and `classic-cluster` (z-score, k-NN, k-means, Gini stump) with hidden tests and 8 known-wrong versions each; Creature Stats dataset generator (`lib/datasets/creatureStats.ts`).
  - [x] D4c. (done 2026-11-10) Interactive visualiser `/dev/grove` (decision boundaries for k-NN, tree, logistic; bias-variance slider).
  - [x] D4d. (done 2026-11-10) Readiness skill "classical ML" (deck + labs).
  - [x] D4e. Region art, split into:
    - [x] D4e1. (done 2026-11-10) Classic Grove tileset (`scripts/art/classic-grove.mjs`: mossy ground with scatter-plot clusters, decision-tree canopies, boundary signposts, node obelisks, brook, arena pad) and preview map.
    - [x] D4e2. (done 2026-11-10) Guardian Warden Split (96x96 oak golem built as a decision tree; `scripts/art/warden-split.mjs`; idle/attack/hurt/faint).
    - [x] D4e3. (done 2026-11-10) Two trainers (16x24 walks + 48x48 portraits) and the Grove battle backdrop (`theme: "grove"`).
  - [x] D4f. (done 2026-11-10) Guardian fight `/guardian/grove` (Warden Split: classic deck duel, `classic-cluster` Lab, hidden-set fight, Split Badge) and its readiness evidence.
- [ ] D5. Metric Market + Data Dojo (F6, GDD §5.4), with the *Leakage* and *Imbalance Swarm* bosses, split into:
  - [x] D5a. (done 2026-11-10) Lessons (3) and a 34-card deck (confusion matrix, ROC/PR, calibration, splits and significance, ranking and regression metrics), numpy-computed and cross-checked by `lib/solvers/evalMetrics.ts`; wired into Learn and Daily Sync.
  - [x] D5b. (done 2026-11-10) Labs `metrics-classify` (precision/recall/F1/Fβ, ROC-AUC, PR-AUC, best-cost threshold) and `metrics-rank` (P@k, recall@k, MRR, nDCG, ECE) with hidden tests and known-wrong versions.
  - [x] D5c. (done 2026-11-10) Data Dojo interactive: confusion-matrix minigame with cost-matrix threshold tuning, split-leakage demo, A/B peeking simulator (`/dev/dojo`).
  - [x] D5d. (done 2026-11-10) Readiness skill "evaluation" (deck + labs).
  - [x] D5e. Region art, split into:
    - [x] D5e1. (done 2026-11-10) Metric Market tileset (`scripts/art/metric-market.mjs`: sandstone bazaar, striped awnings and stalls, confusion-matrix mosaic floor, ROC signboards, balance-scale pillars, threshold-dial pad) and preview map.
    - [x] D5e2. (done 2026-11-10) Imbalance Swarm and Leakage boss sprites (96x96, `scripts/art/market-bosses.mjs`).
    - [x] D5e3. (done 2026-11-10) Two trainers (Vendor Pip, Appraiser Lode: 16x24 walks + 48x48 portraits, `scripts/art/market-trainers.mjs`) and the Market battle backdrop (`theme: "market"`).
  - [ ] D5f. Boss fights (Leakage, Imbalance Swarm) and their readiness evidence.
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
