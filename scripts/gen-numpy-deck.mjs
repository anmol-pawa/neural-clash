// Generates content/decks/numpy-port.json. Predict-the-output answers are the real stdout of the snippets run
// under native python3 + numpy, never typed by hand; spot-the-bug cards are proven by running buggy vs fixed code.
// `--check` regenerates in memory and fails if the committed JSON is stale (used by tests).
import { execFileSync, spawnSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";

const OUT = new URL("../content/decks/numpy-port.json", import.meta.url);
const PY = ["python3", "/usr/bin/python3"].find((b) => spawnSync(b, ["-I", "-c", "import numpy"]).status === 0);
if (!PY) throw new Error("no python3 with numpy found (pip install -r requirements-dev.txt)");
const py = (src) => execFileSync(PY, ["-I", "-c", src], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], timeout: 20000 }).trim();
const NP = "import numpy as np";

/** [id, topic, prompt, code lines (after `import numpy as np`), three wrong outputs, explanation] */
const PREDICT = [
  ["np-broadcast-row-col", "np-broadcasting", "What does this print?", ["a = np.zeros((3, 1))", "b = np.zeros((1, 4))", "print((a + b).shape)"], ["(3, 4)", "(4, 3)", "(3, 1)", "(1, 4)"], "Shapes are compared from the right. A size-1 axis stretches to match the other, so (3, 1) and (1, 4) broadcast to (3, 4): a column against a row gives an outer-sum grid."],
  ["np-broadcast-error", "np-broadcasting", "What does this print?", ["a = np.zeros((3, 2))", "b = np.zeros(3)", "try:", "    print((a + b).shape)", "except ValueError:", "    print('ValueError')"], ["(3, 2)", "(3, 3)", "(2, 3)"], "Right-aligned, (3, 2) meets (3,): 2 vs 3, neither is 1, so broadcasting fails. A per-row vector needs an explicit column axis: `b[:, None]` has shape (3, 1)."],
  ["np-newaxis", "np-broadcasting", "What does this print?", ["x = np.arange(3)", "print(x[:, None].shape, x[None, :].shape)"], ["(3, 1) (1, 3)", "(1, 3) (3, 1)", "(3,) (3,)", "(1, 3) (1, 3)"], "`None` (np.newaxis) inserts a length-1 axis where it appears. This is the standard way to turn a vector into a column or row before broadcasting."],
  ["np-keepdims", "np-broadcasting", "What does this print?", ["x = np.ones((2, 5))", "print(x.sum(axis=1).shape, x.sum(axis=1, keepdims=True).shape)"], ["(2,) (2, 1)", "(5,) (1, 5)", "(2, 1) (2,)", "(2,) (2,)"], "`sum(axis=1)` removes that axis. With `keepdims=True` it stays as size 1, so the result broadcasts back against the original, as in softmax or layer-norm: `x - x.max(axis=1, keepdims=True)`."],
  ["np-matmul-shapes", "np-linear-algebra", "What does this print?", ["x = np.ones((32, 10))", "w = np.ones((10, 4))", "print((x @ w).shape)"], ["(32, 4)", "(10, 10)", "(4, 32)", "(32, 10)"], "Matrix multiply contracts the inner dimension: (32, 10) @ (10, 4) is (32, 4). A dense layer applied to a batch is exactly this."],
  ["np-matmul-batch", "np-linear-algebra", "What does this print?", ["q = np.ones((2, 5, 8))", "k = np.ones((2, 5, 8))", "print((q @ k.transpose(0, 2, 1)).shape)"], ["(2, 5, 5)", "(2, 8, 8)", "(2, 5, 8)", "(2, 8, 5)"], "`@` treats leading axes as a batch and multiplies the last two. Transposing the last two axes of k gives (2, 8, 5), so each batch item yields a 5 x 5 score matrix, the attention-scores shape."],
  ["np-1d-matmul", "np-linear-algebra", "What does this print?", ["a = np.array([1, 2, 3])", "b = np.array([4, 5, 6])", "print(a @ b, (a * b).sum() == a @ b)"], ["32 True", "[ 4 10 18] True", "32 False", "[ 4 10 18] False"], "For two 1-D arrays `@` is the dot product, a scalar. `a * b` is elementwise, and summing it gives the same number."],
  ["np-view-slice", "np-views", "What does this print?", ["a = np.arange(5)", "b = a[1:4]", "b[0] = 99", "print(a)"], ["[ 0 99  2  3  4]", "[0 1 2 3 4]", "[ 0  1  2 99  4]", "[ 0  1  2  3 99]"], "Basic slices are views over the same buffer, so writing through `b` changes `a`. Call `.copy()` when you need independence."],
  ["np-fancy-copy", "np-views", "What does this print?", ["a = np.arange(5)", "b = a[[1, 2]]", "b[0] = 99", "print(a)"], ["[0 1 2 3 4]", "[ 0 99  2  3  4]", "[99  1  2  3  4]", "[ 0  1 99  3  4]"], "Indexing with a list or integer array (fancy indexing) always copies, so `a` is unchanged. Slices view, fancy indices copy: a classic source of silent aliasing bugs."],
  ["np-boolean-mask", "np-indexing", "What does this print?", ["x = np.array([3, -1, 4, -1, 5])", "x[x < 0] = 0", "print(x)"], ["[3 0 4 0 5]", "[3 4 5]", "[0 0 0 0 0]", "[0 3 0 4 5]"], "A boolean mask selects the positions where it is True, and assigning through it writes only there. This is how ReLU can be written without a loop: `x[x < 0] = 0`."],
  ["np-reshape-minus1", "np-shape-ops", "What does this print?", ["x = np.arange(24)", "print(x.reshape(2, -1, 4).shape)"], ["(2, 3, 4)", "(2, 12, 4)", "(2, 4, 3)", "(2, 6, 2)"], "One axis may be -1, meaning \"whatever makes the total fit\": 24 / (2 * 4) = 3. Reshape never reorders data; it only reinterprets the same row-major sequence."],
  ["np-argmax-axis", "np-reductions", "What does this print?", ["s = np.array([[1, 9, 3], [7, 2, 8]])", "print(s.argmax(axis=1))"], ["[1 2]", "[1 0 1]", "[9 8]", "[0 1]"], "`argmax(axis=1)` returns, for each row, the column of its largest value: row 0 peaks at column 1, row 1 at column 2. The predicted class of a batch is exactly this."],
  ["np-int-overflow", "np-dtypes", "What does this print?", ["x = np.array([200], dtype=np.uint8)", "print((x + 100)[0])"], ["44", "300", "255", "0"], "A uint8 holds 0..255 and arithmetic wraps silently modulo 256: 300 - 256 = 44. numpy does not raise on integer overflow, so image code that adds in uint8 must cast up first."],
  ["np-float32-sum", "np-dtypes", "What does this print?", ["x = np.float32(16777216.0)", "print(x + np.float32(1.0) == x)"], ["True", "False", "Error", "None"], "float32 has a 24-bit significand, so above 2**24 it cannot represent every integer; adding 1 rounds back to the same value. Accumulating many small values in float32 loses them. This is why optimisers keep float32 master weights and losses are summed in higher precision."],
  ["np-std-ddof", "np-reductions", "What does this print?", ["x = np.array([1.0, 3.0])", "print(x.std(), x.std(ddof=1))"], ["1.0 1.4142135623730951", "1.4142135623730951 1.0", "2.0 2.0", "0.5 1.0"], "By default numpy divides by n (population std); `ddof=1` divides by n - 1 (sample std). pandas defaults to the opposite, which is a common cross-library surprise."],
  ["np-where-nan", "np-reductions", "What does this print?", ["x = np.array([1.0, np.nan, 3.0])", "print(x.sum(), np.nansum(x))"], ["nan 4.0", "4.0 4.0", "nan nan", "4.0 nan"], "NaN propagates through ordinary reductions: one bad value poisons the sum. `nansum` skips NaNs. In training, a NaN loss usually means an overflow, a log(0), or a divide by zero upstream, so find the source instead of masking it."],
  ["np-sum-vs-python", "np-vectorisation", "What does this print?", ["a = np.array([1, 2, 3])", "print(a * 2, [1, 2, 3] * 2)"], ["[2 4 6] [1, 2, 3, 1, 2, 3]", "[2 4 6] [2, 4, 6]", "[1 2 3 1 2 3] [2, 4, 6]", "[2 4 6] [2 4 6]"], "numpy operators act elementwise; Python's `*` on a list repeats it. Mixing the two types is a bug waiting to happen, so convert at the boundary."],
];

/** `choices[0]` is always the right one; positions are rotated below. */
const CONCEPT = [
  ["np-vectorise-why", "np-vectorisation", "mcq", "Why is `np.dot(a, b)` on two million-element arrays typically far faster than a Python `for` loop doing the same sum of products?", ["The loop runs in compiled code over contiguous memory instead of executing a Python bytecode step per element", "numpy uses less memory because it stores floats as text", "Python loops are limited to one core while numpy always uses a GPU", "numpy skips the multiplications that are zero"], "The cost in a Python loop is per-element interpreter overhead (type checks, boxing, bytecode dispatch). numpy hands the whole array to optimised C or BLAS code that streams contiguous memory, often with SIMD. It does not use a GPU by default."],
  ["np-pairwise-dist", "np-vectorisation", "mcq", "You need all pairwise distances between 1,000 points `X` of shape (1000, 3) without a Python loop. Which expression builds the difference tensor correctly?", ["`X[:, None, :] - X[None, :, :]`, shape (1000, 1000, 3)", "`X - X.T`", "`X[:, None] - X[:, None]`", "`np.dot(X, X)`"], "Inserting axes makes shapes (1000, 1, 3) and (1, 1000, 3) which broadcast to (1000, 1000, 3). Square, sum over the last axis and take a root. Note the memory cost is n^2 * d; for large n use the expansion |x|^2 + |y|^2 - 2 x.y with one matmul."],
  ["np-softmax-stable", "np-reductions", "mcq", "Which is the numerically safe way to compute a row-wise softmax of logits `z` with shape (batch, classes)?", ["Subtract the row max with `keepdims=True` before `np.exp`, then divide by the row sum", "`np.exp(z) / np.exp(z).sum()`", "Take `np.log` of `z` first", "Divide `z` by 1000 so it cannot overflow"], "`exp` overflows for logits around 710 in float64 (about 88 in float32). Subtracting the row max does not change the result (it cancels in the ratio) and keeps every exponent <= 0. Without `axis=1`/`keepdims` you normalise across the whole batch, which is a different bug."],
  ["np-loop-vs-vec-when", "np-vectorisation", "mcq", "A recurrence like `h[t] = tanh(W @ h[t-1] + x[t])` over 500 steps is hard to vectorise across time. What is the usual way to still get speed?", ["Vectorise across the batch inside each step and keep the loop over time", "Replace the loop with `np.vectorize`, which compiles it", "Run the steps in random order", "Use `np.cumsum` on the hidden states"], "Each step depends on the previous one, so time is inherently sequential. The parallelism is across independent sequences in a batch: make `h` shape (batch, hidden) and the matmul processes them all together. `np.vectorize` is a convenience wrapper that still loops in Python."],
  ["np-axis-meaning", "np-reductions", "mcq", "`x` has shape (batch, features) = (64, 10). You want each feature's mean over the batch. Which call is right, and what is the result shape?", ["`x.mean(axis=0)`, shape (10,)", "`x.mean(axis=1)`, shape (64,)", "`x.mean()`, shape (10,)", "`x.mean(axis=0)`, shape (64,)"], "`axis=` names the axis that gets collapsed. Averaging over the batch collapses axis 0 and leaves one value per feature. Batch-norm statistics are exactly this."],
  ["np-order-c-f", "np-views", "mcq", "You loop over the rows of a large C-ordered 2-D array versus its columns, doing the same work. Which is usually faster and why?", ["Rows: each row is contiguous in memory, so the CPU cache is used well", "Columns: numpy stores columns together", "They are identical; memory layout never matters", "Rows, because rows are stored as Python lists"], "The default C order stores each row contiguously. Walking along a row reads adjacent memory; walking down a column strides across memory and misses the cache. `.T` is a free view that merely swaps strides, so a transposed array is not contiguous until you `np.ascontiguousarray` it."],
  ["np-random-seed", "np-testing", "mcq", "A test of a training function compares losses to stored numbers and fails intermittently. What is the most likely fix?", ["Create a seeded generator with `np.random.default_rng(seed)` and pass it in, instead of using global unseeded randomness", "Increase the number of epochs", "Compare the losses with `==` rather than a tolerance", "Call `np.random.random()` once at import time"], "Without a fixed seed, initial weights and data shuffles differ per run, so numbers differ too. Pass an explicit `Generator` so the function is deterministic and testable; still compare with a tolerance, since results can vary across BLAS builds."],
  ["np-allclose", "np-testing", "mcq", "You compare an analytic gradient `g` with a finite-difference estimate `g_fd` in a test. Which assertion is best?", ["`np.testing.assert_allclose(g, g_fd, rtol=1e-4, atol=1e-7)`", "`assert (g == g_fd).all()`", "`assert g.sum() == g_fd.sum()`", "`assert g.shape == g_fd.shape` alone"], "Exact equality fails because finite differences carry truncation and rounding error. `assert_allclose` combines a relative and an absolute tolerance (the absolute part handles values near zero) and prints the worst mismatches. Comparing sums can hide errors that cancel."],
];

const MULTI = [
  ["np-views-multi", "np-views", "Which of these return a view that shares memory with `a = np.arange(12).reshape(3, 4)`? Pick all that apply.", ["`a[1:3]`", "`a.T`", "`a.reshape(4, 3)`", "`a[[0, 2]]`"], [0, 1, 2], "Slices, transposes and (when the layout allows, as it does here) reshapes are views. Fancy indexing with a list of rows copies. When unsure, `np.shares_memory(a, b)` tells you."],
];

/** Bug cards: `buggy` and `fixed` differ on exactly one line (the answer); `probe` is evaluated after each. */
const BUGS = [
  { id: "np-bug-normalise", topic: "np-broadcasting", prompt: "This should scale each row of `x` (shape (n, d)) to sum to 1, but raises an error or mis-scales when n != d. Which line is wrong?", buggy: ["def row_normalise(x):", "    totals = x.sum(axis=1)", "    return x / totals"], fixed: ["def row_normalise(x):", "    totals = x.sum(axis=1, keepdims=True)", "    return x / totals"], probe: ["row_normalise(np.array([[1.0, 3.0], [2.0, 2.0], [5.0, 5.0]])).tolist()"], explanation: "`sum(axis=1)` has shape (n,); dividing (n, d) by (n,) aligns the n with the last axis d. With n = d it silently divides the wrong way, otherwise it raises. `keepdims=True` gives (n, 1), which broadcasts per row." },
  { id: "np-bug-softmax-axis", topic: "np-reductions", prompt: "This softmax should normalise each row of the logits. Which line is the bug?", buggy: ["def softmax(z):", "    e = np.exp(z - z.max(axis=1, keepdims=True))", "    return e / e.sum()"], fixed: ["def softmax(z):", "    e = np.exp(z - z.max(axis=1, keepdims=True))", "    return e / e.sum(axis=1, keepdims=True)"], probe: ["softmax(np.array([[0.0, 0.0], [1.0, 3.0]])).sum(axis=1).tolist()"], explanation: "A bare `e.sum()` adds the entire batch, so each row sums to far less than 1 and a probability depends on the other examples. Reduce over the class axis only, keeping the dimension for broadcasting." },
];

const rotate = (i, n) => i % n;
function place(correct, wrong, slot) {
  const choices = [...wrong];
  choices.splice(slot, 0, correct);
  return { choices, answer: slot };
}

const cards = [];
PREDICT.forEach(([id, topic, prompt, code, wrong, explanation], i) => {
  const out = py([NP, ...code].join("\n"));
  if (out.includes("\n")) throw new Error(`${id}: output must be one line`);
  // Distractor lists may include the right answer as a 4th entry; it is dropped, and the real output decides.
  const wrong3 = wrong.filter((w) => w !== out).slice(0, 3);
  if (wrong3.length !== 3) { console.error(`${id}: ${wrong3.length} distractors; real output ${out}`); process.exitCode = 1; return; }
  if (new Set([out, ...wrong3]).size !== 4) throw new Error(`${id}: duplicate choices`);
  cards.push({ id, kind: "mcq", variant: "predict", topic, prompt, code: [NP, ...code], ...place(out, wrong3, rotate(i * 3 + 1, 4)), explanation });
});
CONCEPT.forEach(([id, topic, kind, prompt, choices, explanation], i) => {
  const [right, ...wrong] = choices;
  cards.push({ id, kind, topic, prompt, ...place(right, wrong, rotate(i * 3 + 2, 4)), explanation });
});
for (const [id, topic, prompt, choices, answers, explanation] of MULTI) {
  // prove the claim: the first three are views, fancy indexing is a copy
  const proof = py([NP, "a = np.arange(12).reshape(3, 4)", "print([np.shares_memory(a, v) for v in (a[1:3], a.T, a.reshape(4, 3), a[[0, 2]])])"].join("\n"));
  if (proof !== "[True, True, True, False]") throw new Error(`${id}: view claim not true: ${proof}`);
  cards.push({ id, kind: "multi", topic, prompt, choices, answers, explanation });
}
for (const b of BUGS) {
  const lines = b.buggy.length === b.fixed.length ? b.buggy.map((l, i) => (l === b.fixed[i] ? 0 : i + 1)).filter(Boolean) : [];
  if (lines.length !== 1) throw new Error(`${b.id}: buggy and fixed must differ on exactly one line`);
  const run = (code) => {
    const r = spawnSync(PY, ["-I", "-c", [NP, ...code, ...b.probe.slice(0, -1), `print(${b.probe.at(-1)})`].join("\n")], { encoding: "utf8" });
    return r.status === 0 ? r.stdout.trim() : "ERROR";
  };
  const fixedOut = run(b.fixed);
  if (fixedOut === "ERROR") throw new Error(`${b.id}: fixed code must run`);
  if (run(b.buggy) === fixedOut) throw new Error(`${b.id}: fix does not change behaviour`);
  cards.push({ id: b.id, kind: "bug", topic: b.topic, prompt: b.prompt, code: b.buggy, line: lines[0], explanation: b.explanation });
}

const deck = { id: "numpy-port", title: "Python Port: numpy and vectorisation", cards };
if (cards.length < 25) throw new Error(`expected 25+ cards, got ${cards.length}`);
const json = JSON.stringify(deck, null, 2) + "\n";
if (process.argv.includes("--check")) {
  if (readFileSync(OUT, "utf8") !== json) {
    console.error("content/decks/numpy-port.json is stale; run node scripts/gen-numpy-deck.mjs");
    process.exit(1);
  }
  console.log(`numpy-port deck up to date (${cards.length} cards, answers recomputed natively)`);
} else {
  writeFileSync(OUT, json);
  console.log(`wrote ${cards.length} cards`);
}
