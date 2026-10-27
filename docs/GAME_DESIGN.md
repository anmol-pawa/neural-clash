# Neural Clash: Game Design Document

> Raise a neural creature, literally. Your companion is a model **you implement from scratch** (Python/numpy) and train. Battles test whether it, and you, generalise. Along the way you become interview-ready for **AI-engineer and SDE loops**: ML and LLM fundamentals, RAG, agents, evals, LLMOps, AI system design, **C++ LeetCode medium/hard**, **code-comprehension rounds** and **AI-assisted coding rounds**.

Source of truth for what the game is. `docs/CURRICULUM.md` covers what it teaches and `docs/ARCHITECTURE.md` how it's built.

---

## 1. Vision and success criteria

**Player promise.** By the end you can:

1. Derive and implement the core of modern ML by hand: autograd, MLPs, optimisers, CNN and attention layers, a small transformer, a BPE tokenizer and sampling. You'll know *why* each piece works.
2. Build, measure and debug LLM systems: chunking and retrieval with real metrics (recall@k, MRR, nDCG), eval sets, LLM-as-judge calibration and bias detection, agent loops with guardrails, and prompt-injection defences, plus cost and latency budgets.
3. Solve LeetCode medium (and many hard) problems **in C++ by hand**, and AI-flavoured "implement it from scratch" problems in Python/numpy.
4. Read an unfamiliar multi-file codebase and fix, extend and optimise it, **with or without an AI assistant**, while verifying everything the assistant says (the Meta-style AI-enabled round and the Google-style code-comprehension round).
5. Design AI systems end to end (model choice, retrieval, evals, serving, cost, safety, observability) and diagnose a vague product complaint ("the bot feels dumb") with data.

**Readiness gates:**

| Gate | Threshold |
|---|---|
| From-scratch | every Forge-your-Framework module passes its hidden tests, including gradient checks |
| ML/LLM theory | ≥ 85 % on a 60-card interleaved exam |
| RAG/evals | a Retrieval Reef final with recall@5 ≥ the target, plus a calibrated judge (κ ≥ target) |
| Coding | ≥ 80 % of a fresh 15-medium C++ sample in ≤ 25 min, and ≥ 40 % of 6 hards in ≤ 45 min |
| Comprehension and AI-assisted | two mocks each scored *Hire* or better |
| AI system design | three consecutive mocks at *Hire* or better |

**Pillars:**
1. **Build it to understand it.** The game runs *your* implementation: a buggy backprop gives you a weak creature.
2. **Generalisation is the boss.** Training-set wins don't count. Hidden test sets, distribution shift and adversarial inputs decide battles.
3. **Measure everything.** Every LLM-system decision is judged by metrics on held-out data, never by vibes.
4. **Honest simulation.** There is no live LLM. Where a model is needed, the game uses **scripted test doubles**, clearly labelled, the same way real engineers unit-test LLM code. Facts about current models and tools are web-checked and date-stamped.
5. **Spaced mastery** across theory, code and systems.

**Anti-goals:** pretending a scripted assistant is a real model, AI-grading free text, copying papers, courses or blog posts, pay-to-skip, and storing or transmitting API keys (no BYO-key mode unless the owner approves it via NEEDS OWNER APPROVAL).

---

## 2. Player, platforms and sessions

- A working engineer moving into AI-engineer or SDE-with-AI roles.
- Desktop is primary for code (Python via Pyodide, C++ via clang→WASM). The iPhone handles theory cards, metric drills, trace reading, Training Grounds tuning and case-study reading.
- Sessions:
  - 10 min: the Daily Sync (spaced theory + one metric drill + one code-reading snippet + one recognition card)
  - 45 min: a Lab module or a story beat
  - 60–90 min: a mock round

---

## 3. World and story

**Setting:** *Latentia*, a continent shaped by learning. **The Noise**, a force of corruption, spreads through models.
- Its agents: *Overfit* (memorises everything), *Leakage* (sees the answers early), *Drift* (changes the world mid-fight), *Hallucinon* (confidently wrong), *Injector* (hijacks instructions), *Mode Collapse* and *Reward Hacker*.
- **Mentor:** *Professor Lumen Okafor*, a researcher-engineer who runs the Lab hub.
- **Rival:** *Rook*, who always picks the biggest model (a foil for cost/latency trade-offs).
- **Region Guardians:** gym equivalents.
- **Final:** **the Hiring Panel**, five interviewers (coding, comprehension, AI-assisted, ML/LLM theory, AI system design) plus a product-sense round.

**Your companion: Neuron-Pup.** It evolves as *you build its parts*:

| Stage | Unlocked by |
|---|---|
| **Perceptron** | linear model + gradient descent |
| **Multilayer** | autograd + MLP |
| **Convling** | conv layers |
| **Recurrent** | sequence models |
| **Transformer** | attention + transformer block |
| **Foundation** | tokenizer + training a tiny language model + sampling |

Each stage is a new sprite set (original 64×64, full animations). Its battle stats derive from **your model's measured metrics** (§5.3).

**Arc:**
- **Act I, Foundations:** Python Port → Vector Vale → Gradient Gorge → Probability Peaks → Classic Grove → Metric Market → Neuron Nest → Conv Caverns → Recurrent Rapids.
- **Act II, The Transformer Age:** Attention Atoll → Token Tundra → Pretrain Peaks → Tuning Terraces → Inference Interchange.
- **Act III, Building with LLMs:** Prompt Plaza → Retrieval Reef → Agent Arcology → Eval Courthouse → Ops Observatory → Safety Sanctum → Multimodal Mesa.
- **Interleaved throughout:** the **Code Dojo** (C++ LeetCode), the **Comprehension Catacombs** (code reading), the **Pair Pavilion** (AI-assisted rounds) and the **Design Spire** (AI system design).
- **Finale:** the Hiring Panel → ending "The Offer".
- **Post-game:** Research Mode (implement a paper's core idea from a written spec), Hard Mode and the Endless Arena.

---

## 4. Core loops

```
LAB MICRO:      Lesson → derive (math cards, solver-checked) → implement in Python → hidden tests + gradient check → integrate into your framework → creature evolves
TRAIN MICRO:    Pick dataset → configure (arch, optimiser, LR, reg, epochs) → train (live curves) → battle on hidden test / shifted data → diagnose → iterate
LLM-SYS MICRO:  Brief → build pipeline step (chunker, retriever, reranker, judge, agent loop, guardrail) → run on eval set → metrics vs target → iterate
CODE MICRO:     (as in Algo Clash) Scout → Strategise → Code C++ → Judge → Debrief
MOCK MICRO:     Comprehension / AI-assisted / AI design / product-sense rounds with rubric scorecards
SESSION:        Daily Sync → region beat → Lab/Train/Code → rewards
META:           regions & badges → companion evolution → Hiring Panel → Offer
```

---

## 5. Modes in detail

### 5.1 Card battles (theory)
Card types:
- MCQ and multi-select
- **Derive-it** (multi-step maths with numeric entry, e.g. the gradient of softmax-CE for given logits; computed by solvers)
- **Shape check** (tensor shapes through a layer; broadcasting outcomes)
- **Metric drill** (compute precision/recall/F1/AUC/nDCG from a table)
- **Diagnose the curve** (a loss-curve image generated from real training runs → over/underfitting, LR too high, data leakage)
- **Which technique?** (RAG vs fine-tune vs prompt; LoRA vs full fine-tune)
- **Spot the bug** (a Python/numpy snippet)
- **Trade-off duel**

The wrapper is the same as the series: correct = attack, wrong = counter + explanation.

### 5.2 The Lab: Forge Your Framework (the signature mode)
Across the game, the player writes an original mini deep-learning library, **`latent`**, in Python with numpy. They do this module by module in a multi-file Python editor (Pyodide). Each module has a lesson (with the full maths), a spec (docstrings and an interface), visible tests and **hidden tests**, including:
- **finite-difference gradient checks** for every differentiable op
- shape and broadcasting tests
- numerical-stability tests (large logits → no NaN/inf)
- determinism with seeds

Modules, in order:
1. `Value` (scalar autograd: computational graph, topological sort, backward)
2. `Tensor` ops on numpy with broadcasting-aware backward
3. `nn.Linear` / activations / `Sequential`
4. Losses (MSE, stable softmax-CE, BCE-with-logits)
5. Optimisers (SGD, momentum, Adam/AdamW, LR schedules, gradient clipping)
6. Init (Xavier/He) and normalisation (BatchNorm/LayerNorm)
7. Dropout and regularisation
8. `DataLoader` (batching, shuffling, seeded)
9. `Conv2d` + pooling (im2col forward and backward)
10. RNN/GRU cell
11. Embedding + positional encodings (sinusoidal, RoPE)
12. Scaled dot-product + multi-head attention (with causal mask)
13. Transformer block (pre-LN, residuals, MLP)
14. A BPE tokenizer (train/encode/decode)
15. Sampling (greedy, temperature, top-k, top-p, beam search)
16. A KV cache for incremental decoding
17. A tiny character/BPE language model trained on an original in-repo corpus

**The game then *uses* your library:** Training Grounds and creature evolutions run your code (from the save file's stored modules). If a module regresses, the creature visibly glitches, and the Lab shows which hidden test now fails. A "Use reference implementation" toggle exists so you can keep playing, but it's marked assisted.

### 5.3 Training Grounds (the generalisation game)
- **Datasets** are all original and in-repo generated, with known generating processes:
  - 2D toys (spirals, moons, XOR, rings)
  - **Glyphs** (16×16 pixel creature icons with noise, rotation and colour jitter: a mini image dataset)
  - **Creature Stats** (tabular, with planted leakage, a confounder and class imbalance)
  - **Lore Corpus** (original text for language modelling)
- **Configure:** architecture (from your framework), optimiser, LR, batch size, regularisation, augmentation and epochs. Live loss and accuracy curves update for train vs validation.
- **The battle uses a hidden test set:** your creature's attack equals test accuracy (or F1, or perplexity for the LM), its defence equals calibration (ECE), and its speed is inference cost (parameters × FLOPs).
- **Bosses:**
  - **Overfit:** looks weak in training, but devastates memorisers on the test set.
  - **Drift:** the data distribution shifts mid-battle, so you must detect it and retrain or adapt.
  - **Leakage:** a dataset whose suspiciously high validation score collapses on clean test data. You have to find the leaking feature.
  - **Imbalance Swarm:** the accuracy trap. Pick the right metric and threshold.
  - **Adversary:** small perturbations; teaches robustness basics.
- **Interactive speed:** for responsive tuning, Training Grounds uses a fast TS trainer whose maths is **verified identical** (on fixed seeds and tolerances) to the reference Python. The "Run my code" button trains with the player's Pyodide implementation for real.

### 5.4 Data Dojo
Data quality and evaluation battles:
- split strategies (random vs time vs group; leakage across splits)
- feature engineering
- the confusion-matrix minigame
- threshold tuning against a cost matrix (fraud and medical-style scenarios)
- A/B test analysis (power, p-value misuse, peeking)
- calibration curves

### 5.5 LLM workshops (Act III)
There is no live model. Every workshop is built on deterministic, measurable components:
- **Token Tundra lab:** train BPE on the corpus; count tokens and costs; explore sampling with your own sampler over a fixed next-token distribution table produced by *your trained tiny LM*.
- **Retrieval Reef:** build a RAG retriever over the **Lumen Labs Handbook**, an original fictional company knowledge base (about 150 docs: policies, runbooks, product specs, FAQs, with deliberate near-duplicates, outdated versions and conflicting docs).
  - Steps: chunker (fixed / sentence / structure-aware, with overlap) → BM25 (implemented by you) → dense retrieval with **LSA embeddings** (SVD on TF-IDF, computed by your numpy code) → hybrid fusion (RRF) → a cross-feature reranker → metrics on a **golden set** of about 200 questions with labelled relevant chunks (recall@k, MRR, nDCG).
  - Scenarios: outdated-doc conflicts, multi-hop questions, "retrieval is the wrong tool" questions.
  - Optional ADR: real neural embeddings via transformers.js (desktop-only, lazily downloaded).
- **Eval Courthouse:** build an eval set, then calibrate an **LLM-as-judge** using provided judge scores (synthetic, generated by a documented process with planted **length bias** and **position bias**) against human labels.
  - Compute agreement (accuracy, Cohen's κ), detect each bias statistically, and fix it (swap positions, length-normalise, rubric anchoring).
  - Then use it to run regression evals.
- **Agent Arcology:** write an agent loop in Python against a **scripted fake LLM** (a test double that emits a fixed sequence of tool calls and replies per scenario, labelled as such):
  - implement tool dispatch, JSON-schema validation of tool arguments, retries, a max-iteration cap, a cost budget, a stop condition, and human-in-the-loop for risky tools
  - debug broken agents from **trace logs** (an infinite loop, a wrong tool schema, a swallowed error, a context overflow)
  - also covers the MCP concept (tool/resource/prompt servers), state machines vs free-form loops, and multi-agent trade-offs
- **Safety Sanctum:** a pipeline with untrusted documents containing **prompt-injection strings** (deterministic). Build defences (instruction hierarchy, content isolation and tagging, allow-listed tools, output filtering, least privilege) and show that attack scenarios no longer cause unsafe tool calls, measured on an attack suite.
- **Ops Observatory:** a deterministic **LLM-app simulator**: request mix, token counts, model tiers with illustrative latency/cost/quality curves, caching (exact + semantic), routing, fallbacks, rate limits.
  - Hit p95 latency, cost-per-request and quality targets. Diagnose incidents from dashboards and traces.
  - Prices and latencies are illustrative and labelled so, and the date of any real-world reference is checked.

### 5.6 The Code Dojo (C++ LeetCode)
The coding battle from Algo Clash: Scout → Strategise → Code → Judge → Debrief, using a real in-browser clang judge, hidden tests, hearts and editorials. Problems are ported from Algo Clash's format when available. It contains:
- a **core interview ladder** (about 150 essential problems across all patterns, medium-weighted, with a hard set)
- **AI-flavoured problems** (C++ or Python, whichever fits; the language and the reason are shown):
  - C++: top-k with a heap, an LRU embedding cache, a token-bucket limiter, a request-batching scheduler, interval merging for chunk spans, a trie for prefix autocomplete, Dijkstra for routing
  - Python/numpy: stable softmax, attention, k-means, cosine top-k search, a BPE merge step, beam search, the reservoir sampler, metric computations, the JSON-schema validator, a chunker

### 5.7 Comprehension Catacombs (code-comprehension round)
A Google-style round. You get a **multi-file codebase** (300–1,200 lines; Python for ML/RAG/agent services, C++ for systems pieces), all original and written in-repo, with a file explorer, search and jump-to-definition (a symbol index built at content build time). Task types:
- explain what a function or module does (MCQ with plausible distractors)
- trace the data flow
- predict the output
- find the bug(s) (seeded, documented, each confirmed by a failing test)
- fix it (tests must pass)
- optimise a hot path (a perf test with a threshold)
- name the scaling or failure risk

It's scored on accuracy, time and how much you needed to read (efficient navigation is a skill).

### 5.8 Pair Pavilion (AI-assisted round)
A Meta-style 60-minute round in a multi-file codebase with phases: **(1) fix the bug → (2) implement the feature → (3) optimise**.
- The **assistant panel is a scripted simulation (clearly labelled)**. The player picks prompt intents ("explain this file", "suggest a fix for failing test X", "write tests for Y", "optimise Z") or types free text matched to intents. The assistant answers from a scenario script.
- Some suggestions are subtly wrong: hallucinated APIs, off-by-ones, insecure code, inefficient algorithms, missing edge cases, tests that pass for the wrong reason.
- The assistant can't edit files; the player applies changes.
- **Scored like the real round:** problem solving, code quality, **verification** (did you run tests before and after accepting a suggestion? did you catch the wrong suggestion?) and communication (think-aloud checkpoints).
- Lessons cover *how to use AI well in interviews and on the job*: spec first, small asks with context, ask for tests, read every line, never paste secrets, own the result.

### 5.9 Design Spire (AI system design) and product sense
- **AI system design mock:** a 45-minute structured round, the same engine as Blueprint Clash's Interview Room, adapted:
  - clarify → success metrics → data → approach (prompt vs RAG vs fine-tune vs classical ML; build vs buy; model tiering) → architecture (on an Ops-Observatory canvas, then simulated) → **evaluation plan** → serving, cost and latency budget → safety and guardrails → observability → iteration
  - the scorecard shows level signals
- **Product-sense round:** a vague complaint ("users say the assistant feels dumb"). The player investigates simulated dashboards, traces and eval slices to locate the cause (retrieval misses on new docs, a bad chunker for tables, model downgrade on long contexts, prompt-template regression…), proposes the first change and defines how to measure success.

### 5.10 Python for interviews (Python Port)
Many AI-engineer coding rounds accept Python. Python Port teaches interview Python alongside C++:
- idioms: comprehensions, slicing, `collections` (Counter, defaultdict, deque), `heapq`, `bisect`, `itertools`, `functools.lru_cache`, generators, dataclasses, typing
- complexity of built-ins
- pitfalls: mutable defaults, shallow copies, recursion limits

The Code Dojo lets the player solve core problems in Python too (Pyodide judge), but **C++ remains the default** and is required for the coding readiness gate.

---

## 6. Progression

- **Mastery** with the same states as the series, across theory cards, Lab modules, problems, workshops and case studies. Assisted completions never advance mastery. Overdue items rust (the companion's sprite shows rust; Lab modules show "stale").
- **Badges** per region. The companion evolves at framework milestones (§3).
- **Bits** currency buys hints, cosmetics and lab decorations. **Never mastery.**
- **Daily Sync:** due theory cards, one metric drill, one code-reading snippet, one C++ problem at your frontier, and one micro-workshop step.
- **Research journal:** auto-logged experiments from Training Grounds and the workshops (config → metrics) that you can compare. It teaches experiment hygiene.

---

## 7. Presentation

- Series art bar (see `CLAUDE.md`). Neuron-Pup's six forms, region guardians and Noise agents are all original pixel art with full animation sets.
- **Training visualisation:** pixel-styled live loss curves, decision boundaries for the 2D toys, activation heatmaps and attention maps.
- **Lab UI:** a multi-file Python editor, test results with gradient-check diffs, and shapes shown inline.
- Audio, accessibility, offline and budgets follow the series. Pyodide and clang are lazy, cached, with a progress UI.
