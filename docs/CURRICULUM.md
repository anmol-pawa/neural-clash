# Neural Clash: Curriculum

What Neural Clash teaches. **Language policy:**
- **Python 3 + numpy** for ML, data, LLM systems and agents (the industry standard, and accepted in most AI-engineer coding rounds).
- **C++17/20** for DSA coding rounds (the owner's goal: write LeetCode medium/hard in C++ by hand).
- When a problem could go either way, the game states which language it uses and why.

All writing is original. Papers, docs and courses are named as *further reading* only. **Time-sensitive facts** (model families, context sizes, prices, frameworks, protocols, benchmarks) must be web-checked when written, stamped "as of <month year>", and kept separate from timeless principles.

Teaching method: the series method (worked → faded → independent; blocked → interleaved; retrieval; spacing; elaboration; calibration), plus **derive → implement → verify**: every model component is derived on paper (solver-checked numbers), implemented, and verified with gradient checks.

---

## Act I: Foundations

### F1 Python Port: Python and numpy for ML and interviews
- **Python:** data model basics, comprehensions, generators, decorators, context managers, dataclasses, typing, exceptions, modules and packaging, virtual environments, pytest, and performance pitfalls (loops vs vectorisation, copies).
- **Interview Python:** `collections`, `heapq`, `bisect`, `itertools`, `functools`, built-in complexities, recursion limits.
- **numpy:** arrays, dtypes, views vs copies, **broadcasting rules** (solver-checked shape cards), fancy indexing, `axis` semantics, `einsum`, random generators with seeds, and numerical stability (log-sum-exp).
- **pandas-lite:** groupby/merge/pivot concepts, kept light.
- Exercises: 20 judged Python functions, 15 numpy vectorisation challenges (with perf thresholds: the loop version must be slower than the threshold allows).

### F2 Vector Vale: linear algebra
Vectors, norms, dot products and cosine similarity, matrices as linear maps, matrix multiplication (shapes!), transpose, inverse and why we avoid it, rank, orthogonality and projections, eigenvectors (intuition), SVD (and its use for low-rank approximation, LSA and PCA), positive (semi-)definite matrices, and the Jacobian as a matrix. Includes an interactive 2D transform visualiser. Lab: PCA via SVD and via power iteration.

### F3 Gradient Gorge: calculus and optimisation
Derivatives, partial derivatives, gradients, the chain rule on computational graphs, Jacobian-vector products, why backprop is reverse-mode autodiff (cost argument), convexity, gradient descent (step-size analysis on a quadratic), SGD and noise, momentum, RMSProp, Adam/AdamW (with bias correction derived), LR schedules (warm-up, cosine), gradient clipping, saddle points and plateaus. Lab: Forge modules 1–2 (`Value`, `Tensor`).

### F4 Probability Peaks: probability and statistics
Random variables, expectation, variance, common distributions, joint/marginal/conditional, Bayes' rule (base-rate cards), independence, the law of large numbers and the CLT (simulation), MLE and MAP (deriving MSE and cross-entropy as negative log-likelihoods), entropy, cross-entropy and KL divergence, sampling methods, hypothesis tests and confidence intervals, **A/B testing** (power, peeking, multiple comparisons), and bootstrap.

### F5 Classic Grove: classical ML
Linear regression (normal equation and GD), logistic regression, regularisation (L1/L2 geometry), the bias–variance trade-off, k-NN, Naive Bayes, decision trees (entropy/Gini splits, solver-checked), ensembles (bagging, random forests, gradient boosting: the idea of fitting residuals), SVMs (margin intuition, kernels at a conceptual level), k-means (and k-means++), GMM/EM (intuition), PCA, feature engineering, scaling, missing data, class imbalance (resampling, class weights), cross-validation and hyperparameter search. Lab: implement linear and logistic regression, a decision-tree split, k-means and k-NN from scratch.

### F6 Metric Market: evaluation
Train/validation/test splits and leakage (random vs time vs group splits), the confusion matrix, precision/recall/F1/Fβ, ROC-AUC vs PR-AUC (and when each misleads), thresholds and cost matrices, calibration (reliability diagrams, ECE), regression metrics (MAE/RMSE/R²/MAPE pitfalls), ranking metrics (precision@k, recall@k, MRR, nDCG), offline vs online evaluation, and statistical significance of metric differences. All metric cards are computed by solvers.

### F7 Neuron Nest: neural networks
The perceptron and its limits (XOR), MLPs as function approximators, activations (sigmoid/tanh/ReLU/GELU, and why), loss functions, **backprop by hand** on a 2-layer net (solver-checked), initialisation (variance arguments for Xavier/He), normalisation (BatchNorm vs LayerNorm; train vs eval mode), dropout, weight decay, early stopping, vanishing and exploding gradients, residual connections, and debugging training (overfit a single batch first; LR range tests). Lab: Forge modules 3–8. **Companion evolves to Multilayer.**

### F8 Conv Caverns: CNNs
Convolution as weight sharing, padding/stride/dilation (output-shape solver), receptive fields, pooling, im2col, backprop through conv, classic architectures (conceptual lineage up to ResNet), data augmentation, transfer learning and fine-tuning. Lab: Forge module 9, trained on Glyphs. **Companion → Convling.**

### F9 Recurrent Rapids: sequence models and embeddings
Sequence tasks, RNNs and BPTT, vanishing gradients, LSTM/GRU gates (why they help), seq2seq and the bottleneck that motivated attention, word embeddings (word2vec intuition, skip-gram with negative sampling as an idea), embedding similarity, contrastive learning (InfoNCE intuition). Lab: Forge module 10 and a char-level RNN. **Companion → Recurrent.**

---

## Act II: The Transformer Age

### T1 Attention Atoll
Scaled dot-product attention (the √d derivation), Q/K/V intuition, masking (padding, causal), multi-head attention, positional information (sinusoidal, learned, **RoPE**), the transformer block (pre-LN vs post-LN, residual stream view, MLP), encoder vs decoder vs encoder-decoder, **parameter and FLOP counting** (solver), memory of attention (O(n²)), and efficient attention ideas (FlashAttention as IO-awareness, sliding window, GQA/MQA: concepts). Lab: Forge modules 11–13, plus an attention-map visualiser. **Companion → Transformer.**

### T2 Token Tundra: tokenisation and language modelling
Characters vs words vs subwords, **BPE** (training merges, encoding; solver-checked), WordPiece and Unigram (conceptual), token counts and cost, next-token prediction, perplexity, teacher forcing, decoding (greedy, beam, temperature, top-k, top-p, repetition penalties; all solver-checked), context windows and truncation strategies. Lab: Forge modules 14–17. Train a tiny LM on the Lore Corpus. **Companion → Foundation.**

### T3 Pretrain Peaks: how LLMs are trained
Pre-training data pipelines (dedup, filtering, mixtures), scaling laws (intuition: compute-optimal trade-offs), mixed precision (fp16/bf16/fp8 concepts), parallelism (data, tensor, pipeline, ZeRO/FSDP), mixture-of-experts (routing, load balancing), checkpointing, and the cost-estimate solver (tokens × params → FLOPs → GPU-hours, labelled illustrative).

### T4 Tuning Terraces: adaptation and alignment
Instruction tuning / SFT, preference optimisation (RLHF pipeline overview, reward models, PPO at a conceptual level, **DPO** and its loss derived), RLAIF and constitutional-style approaches (conceptual), **parameter-efficient fine-tuning** (LoRA maths: low-rank updates, rank and alpha; QLoRA concepts; adapters), the **decision guide: prompt vs RAG vs fine-tune vs train** (data, cost, latency, freshness, control), catastrophic forgetting, distillation, and evaluating tuned models. A memory calculator solver covers full vs LoRA.

### T5 Inference Interchange: serving
The prefill vs decode phases, the **KV cache** (memory solver), batching (static vs continuous), quantisation (int8/int4; quality trade-offs), speculative decoding (concept + an acceptance-rate toy), throughput vs latency (TTFT, TPOT, p95), GPU memory budgeting, streaming, prompt caching, model routing/cascades, and on-device vs cloud. Lab: Forge module 16 (the KV cache), with a speed-up measurement.

---

## Act III: Building with LLMs (the applied-AI interview core)

### A1 Prompt Plaza: prompting as engineering
Instruction clarity, role/system vs user content, few-shot selection, structured outputs and schema validation (with retries), decomposition and chaining, chain-of-thought (when it helps, and the cost), self-consistency (concept), prompt templates and versioning, regression-testing prompts with eval sets, prompt injection basics (preview of S1), and the cost/latency effects of prompt length. Exercises are deterministic: template assembly, schema-validation code, picking the best prompt revision given eval results.

### A2 Retrieval Reef: RAG (deep)
When retrieval is the right tool (and when it isn't), document parsing and cleaning, **chunking** (fixed / recursive / structure-aware / semantic; overlap; table handling), lexical retrieval (**BM25** derived and implemented), dense retrieval (embeddings, cosine/dot, normalisation), **LSA embeddings** implemented, ANN indexes (HNSW, IVF, PQ: concepts and trade-offs), vector stores including **pgvector** (index types, filtering), hybrid search and RRF, reranking (cross-encoder concept; the game's feature-based reranker), query rewriting/expansion, metadata filtering, freshness and versioning (outdated docs), citations and grounding, top-k and context-budget trade-offs, failure modes (missed retrieval, wrong chunk granularity, conflicting sources, lost-in-the-middle), and **RAG evaluation** (retrieval: recall@k/MRR/nDCG; generation: faithfulness and answer relevance as concepts plus judge-based workflows).

### A3 Agent Arcology: agents and tools
Function/tool calling and JSON schemas, the ReAct-style loop, planning vs reactive loops, state machines vs free-form agents, memory (short-term context, long-term stores), **MCP** (servers exposing tools, resources and prompts; transports; security considerations; web-checked and date-stamped), multi-agent patterns and when they're worth it, **guardrails** (max iterations, budgets, timeouts, allow-lists, confirmations for side effects), error handling and retries, idempotent tools, sandboxed code execution, observability (traces, spans, tool-call logs), and testing agents with scripted fakes and recorded traces.

### A4 Eval Courthouse: evaluation of LLM systems (heavily emphasised in interviews)
Eval-driven development, golden sets (sourcing, labelling guidelines, inter-annotator agreement), task-specific metrics, **LLM-as-judge** (rubrics, pairwise vs pointwise, **calibration against human labels**, Cohen's κ, **known biases** such as length, position and self-preference, and mitigations), regression suites in CI, online metrics and A/B tests for LLM features, slicing (by query type, language, doc type), red-teaming, and cost of evals.

### A5 Ops Observatory: LLMOps and production
Gateways, rate limits and quotas, retries with backoff, timeouts, fallbacks across models/providers, caching (exact, semantic, prompt caching), routing small→large models, cost accounting per feature, latency budgets (TTFT/TPOT), streaming UX, observability (traces, token usage, eval scores in prod), incident playbooks, data privacy (PII redaction, retention), versioning of prompts, models and indexes, and rollouts (shadow, canary).

### A6 Safety Sanctum: security and responsible AI
Prompt injection (direct and indirect), data exfiltration via tools, **least privilege** and allow-listed tools, content isolation, output validation, jailbreak awareness, PII handling, hallucination mitigation (grounding, abstention, citations), bias and fairness basics, copyright/licensing awareness for data and code, model and system cards, and a regulatory awareness overview (web-checked and date-stamped).

### A7 Multimodal Mesa
Vision-language models (concept: image encoders + projection), speech pipelines (ASR → LLM → TTS; latency), diffusion models (denoising intuition), image/text embeddings for search, document AI (OCR + layout), recommender systems (two-tower retrieval + ranking), time-series basics, and "when **not** to use an LLM" (rules, classical ML, search).

---

## Coding tracks (interleaved through all acts)

### K1 Code Dojo: C++ LeetCode core ladder (about 150 problems)
Pattern-first, medium-weighted, with an E→M→H ladder per pattern: arrays & hashing, two pointers, sliding window, stack/monotonic stack, binary search (incl. on answer), linked lists, trees/BST, heaps, backtracking, tries, graphs (BFS/DFS/topo), DSU, shortest paths, 1-D/2-D/knapsack DP, greedy, intervals, bits/math, design structures (LRU/LFU, time-based KV). Problems are ported from Algo Clash's package format when available (original statements, reference + brute + wrong solutions, generated tests). Includes the C++ syntax refresher cards from Algo Clash's Syntax Shores (CUR §2 there).

### K2 AI-flavoured implement-from-scratch (about 50 problems)
- **Python/numpy:** stable softmax/log-softmax, cross-entropy + gradient, a GD training loop, linear/logistic regression, k-means(++), k-NN, a decision-tree split, PCA (power iteration), attention, multi-head attention, positional encoding, layer norm, a BPE merge step, cosine top-k search, MMR diversification, top-k/top-p sampling, beam search, BM25, RRF fusion, metric functions (F1, AUC, nDCG, MRR), a chunker with overlap, a JSON-schema validator, retry with exponential backoff + jitter, a minimal agent loop with tool dispatch, a sliding-window rate limiter, reservoir sampling, a streaming mean/variance (Welford).
- **C++:** an LRU embedding cache, a top-k heap over a stream, a request batcher (time/size), a token bucket, a trie autocomplete, interval merging, a consistent-hash ring, a fixed-size ring buffer for logs.

### K3 Comprehension Catacombs (about 20 codebases, 4–8 tasks each)
Original multi-file codebases: a RAG service (ingest/chunk/index/query), an agent runner with tools, a training script with a data loader, a feature pipeline with leakage, an eval harness, an LLM gateway with caching and retries, a C++ rate limiter, a C++ LRU + metrics module, a Python async job queue, a tokenizer, a vector index (brute + IVF), and a log processor. Each has seeded, documented bugs confirmed by tests, plus perf tasks.

### K4 Pair Pavilion (about 15 AI-assisted scenarios)
Multi-file codebases with three phases (fix → implement → optimise) and scripted assistant scripts containing deliberate wrong suggestions (each catalogued with why it's wrong and which test exposes it).

---

## Design and interview craft

### D1 Design Spire: AI system design case studies (about 25)
Customer-support assistant (RAG + tools), enterprise search over private docs (permissions-aware retrieval), code assistant, meeting summariser, document-processing pipeline (OCR → extraction → validation), content-moderation system, recommendation feed, semantic search for e-commerce, fraud detection, ad CTR prediction, an LLM gateway/router with a semantic cache, a multi-agent workflow platform, an evaluation platform, a fine-tuning pipeline, a feature store, real-time anomaly detection, voice assistant, translation service, personalised email generation with guardrails, data-labelling platform with active learning, "chat with your database" (text-to-SQL with safety), on-device assistant, a model-serving platform, an AI-generated-code review bot, and a knowledge-graph-augmented QA system.

Each has requirements variants, success metrics, an eval plan, a reference architecture with alternatives, a cost/latency budget (solver), failure modes, and deep-dive banks.

### D2 Product sense and debugging with data
About 10 "it feels dumb" investigations using simulated dashboards, traces and eval slices (Ops Observatory simulator).

### D3 Interview loops and readiness (recruiter lens)
- **Applied-AI loop as of 2026 (web-checked):** recruiter screen → technical screen on retrieval and prompting → take-home (build and measure an LLM pipeline with an eval set and retrieval metrics) → live coding or debugging (agent loops, tool calls, retrieval bugs, without framework shortcuts) → system design around models you don't control (observability, cost and latency caps, routing) → product sense. Evals are the most emphasised skill.
- **SDE loops with AI:** a classic DSA round (no AI) plus an AI-enabled round (multi-file codebase: bug fix → implement → optimise; scored on problem solving, code quality, verification and communication), and code-comprehension pilots.
- **ML-engineer and applied-scientist-lite variants** weight classical ML and DL theory more heavily.
- **Readiness Report** maps the player's progress to each loop. A **take-home simulator** offers a 3-hour timed build-and-measure project in the Retrieval Reef with a rubric.
- **Behavioural:** project stories (STAR) for AI work (an eval you built, a quality regression you caught, a cost you cut), explaining trade-offs to non-experts, and handling ambiguity. The player writes them in Story Forge; they stay local.
