// Generates content/decks/numpy.json and content/lessons/numpy.json. Every predict answer, shape answer and
// lesson output is computed by running numpy natively, never typed by hand. `--check` fails if the committed
// JSON is stale (used by tests). Shape answers are also cross-checked against lib/solvers in tests/numpy.test.ts.
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";

const DECK_OUT = new URL("../content/decks/numpy.json", import.meta.url);
const LESSON_OUT = new URL("../content/lessons/numpy.json", import.meta.url);
const py = (src) => execFileSync("python3", ["-I", "-c", src], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], timeout: 20000 }).trim();
const NP = "import numpy as np";

/** [id, topic, prompt, code lines, three wrong outputs, explanation] */
const PREDICT = [
  ["np-view-slice", "np-views", "What does this print?", ["a = np.arange(6)", "b = a[1:4]", "b[0] = 99", "print(a)"], ["[0 1 2 3 4 5]", "[99  1  2  3  4  5]", "[ 0  1  2 99  4  5]"], "Basic slicing returns a **view**: `b` shares memory with `a`, so writing through `b` changes `a`. Call `.copy()` when you need independence."],
  ["np-fancy-copy", "np-views", "What does this print?", ["a = np.arange(5)", "b = a[[1, 2]]", "b[0] = 99", "print(a)"], ["[ 0 99  2  3  4]", "[ 0  1 99  3  4]", "[99  1  2  3  4]"], "Indexing with a list or an integer array (fancy indexing) always copies. The same holds for boolean masks. Only basic slices give views."],
  ["np-uint8-wrap", "np-arrays", "What does this print?", ["a = np.array([200], dtype=np.uint8)", "print(a + np.uint8(100))"], ["[300]", "[255]", "[100]"], "A `uint8` array stays `uint8`: 300 wraps modulo 256 to 44, silently. Cast first (`a.astype(np.int32)`) when values can leave the dtype's range, as with raw image pixels."],
  ["np-true-divide", "np-arrays", "What does this print?", ["a = np.array([1, 2, 3])", "print(a / 2, a // 2)"], ["[0 1 1] [0 1 1]", "[0.5 1.  1.5] [0.5 1.  1.5]", "[0 1 1] [0.5 1.  1.5]"], "`/` is true division and always produces floats; `//` floors and keeps the integer dtype. Mixing them up changes the dtype of everything downstream."],
  ["np-axis-sums", "np-axis", "What does this print?", ["a = np.arange(6).reshape(2, 3)", "print(a.sum(axis=0), a.sum(axis=1))"], ["[ 3 12] [3 5 7]", "[3 5 7] [3 5 7]", "[ 3 12] [ 3 12]"], "`axis=k` collapses axis k. Summing over axis 0 squashes the rows into one row of column sums (shape `(3,)`); axis 1 gives one total per row (shape `(2,)`)."],
  ["np-outer-broadcast", "np-broadcast", "What does this print?", ["a = np.array([1, 2, 3])", "print((a[:, None] + a).shape)"], ["(3,)", "(1, 3)", "(3, 1)"], "`a[:, None]` has shape (3, 1) and `a` has shape (3,), which aligns as (1, 3). Broadcasting stretches both 1s, giving (3, 3): every pairwise sum. This is how pairwise distance matrices are built without loops."],
  ["np-argmax-tie", "np-axis", "What does this print?", ["print(np.argmax([3, 7, 7, 1]))"], ["2", "7", "(1, 2)"], "`argmax` returns the index of the **first** maximum. It never returns both. Ties matter when you compare a model's predictions against a reference."],
  ["np-mask-assign", "np-axis", "What does this print?", ["a = np.array([5, -1, 3, -2])", "a[a < 0] = 0", "print(a)"], ["[ 5 -1  3 -2]", "[5 3]", "[0 0 0 0]"], "A boolean mask on the left of an assignment writes in place to every selected position. This is a ReLU in one line: `np.maximum(a, 0)` is the non-mutating form."],
  ["np-reshape-infer", "np-broadcast", "What does this print?", ["print(np.arange(12).reshape(3, -1).shape)"], ["(3,)", "(12, 3)", "(3, 3)"], "A single `-1` means \"infer this axis from the element count\": 12 / 3 = 4. Two `-1`s are ambiguous and raise an error."],
  ["np-keepdims", "np-axis", "What does this print?", ["x = np.ones((2, 3))", "print(x.sum(axis=1).shape, x.sum(axis=1, keepdims=True).shape)"], ["(2, 3) (2, 1)", "(2,) (2,)", "(1, 2) (2, 1)"], "Reductions drop the axis by default, giving shape (2,). With `keepdims=True` the axis stays as size 1, so the result broadcasts back against the original. That is what makes `x / x.sum(axis=1, keepdims=True)` a row normaliser."],
  ["np-nan", "np-numerics", "What does this print?", ["print(np.nan == np.nan, np.isnan(np.nan), np.nanmax([1, np.nan, 3]))"], ["True True 3.0", "False True nan", "False False 3.0"], "NaN is not equal to anything, itself included, so test with `np.isnan`. A plain `max` over data containing NaN returns NaN; the `nan*` family skips them. A silent NaN in a loss is usually an overflow or a log(0) upstream."],
  ["np-softmax-overflow", "np-numerics", "What does this print?", ["x = np.array([1000.0, 1001.0])", "with np.errstate(all='ignore'):", "    print(np.exp(x) / np.exp(x).sum())"], ["[0.26894142 0.73105858]", "[0. 1.]", "[inf inf]"], "`exp(1000)` overflows to inf, and inf / inf is NaN. Subtracting the maximum first leaves the result mathematically identical but keeps every exponent at most 0."],
  ["np-float32-absorb", "np-numerics", "What does this print?", ["print(float(np.float32(16777216) + np.float32(1)))"], ["16777217.0", "16777218.0", "1.0"], "A float32 has a 24-bit significand, so above 2^24 = 16,777,216 it cannot represent every integer. Adding 1 is rounded away. This is why long float32 accumulations drift and why mixed-precision training keeps a float32 master copy."],
];

/** [id, topic, setup lines, expression] -> shape answer computed by numpy. */
const SHAPES = [
  ["np-shape-bcast-4d", "np-broadcast", ["a = np.zeros((8, 1, 6, 1))", "b = np.zeros((7, 1, 5))"], "a + b"],
  ["np-shape-bcast-row", "np-broadcast", ["a = np.zeros((3, 4))", "b = np.zeros((4,))"], "a + b"],
  ["np-shape-bcast-fail", "np-broadcast", ["a = np.zeros((3, 4))", "b = np.zeros((3,))"], "a + b"],
  ["np-shape-bcast-col", "np-broadcast", ["a = np.zeros((5, 1))", "b = np.zeros((1, 5))"], "a * b"],
  ["np-shape-sum-axis", "np-axis", ["a = np.zeros((2, 3, 4))"], "a.sum(axis=1)"],
  ["np-shape-newaxis", "np-axis", ["x = np.zeros((4, 3))"], "x[:, None, :]"],
  ["np-shape-matvec", "np-broadcast", ["X = np.zeros((10, 3))", "w = np.zeros((3,))"], "X @ w"],
  ["np-shape-matmul-fail", "np-broadcast", ["A = np.zeros((2, 3))", "B = np.zeros((2, 3))"], "A @ B"],
  ["np-shape-fancy-rows", "np-axis", ["X = np.zeros((5, 4))"], "X[[0, 2]]"],
  ["np-shape-col-int", "np-axis", ["X = np.zeros((5, 4))"], "X[:, 0]"],
  ["np-shape-col-list", "np-axis", ["X = np.zeros((5, 4))"], "X[:, [0]]"],
];

const CONCEPT = [
  ["np-vectorise-why", "np-arrays", "mcq", "`np.sum(x * x)` beats a Python `for` loop over a million floats by a large factor. What is the main reason?", ["The loop runs in compiled code over one contiguous typed buffer, with no per-element Python object or interpreter overhead", "numpy uses a smarter O(log n) algorithm for sums", "numpy always runs on the GPU", "Python loops are slow only because of the garbage collector"], "Both versions do O(n) arithmetic. numpy removes the interpreter from the inner loop and walks a packed array of machine floats. The speed-up is a constant factor, often 10 to 100 times, not a better big-O."],
  ["np-copy-explicit", "np-views", "mcq", "You need a normalised version of `X[:, :3]` and must not modify `X`. What is the safest approach?", ["Take `X[:, :3].copy()` (or build a new array) before editing", "Edit the slice directly; slices are always copies", "Use `X[:, :3].view()` to be safe", "Call `del X` first"], "A basic slice is a view of `X`, so an in-place edit such as `/=` rewrites the original. Copy explicitly, or use non-mutating operations that return new arrays."],
  ["np-logsumexp", "np-numerics", "mcq", "Why does a stable `logsumexp(x)` compute `m + log(sum(exp(x - m)))` with `m = max(x)`?", ["The shifted exponents are at most 0, so exp cannot overflow, and the identity keeps the value exact", "It makes the sum run faster", "It rounds the result to the nearest integer", "It removes negative inputs"], "log(sum(exp(x))) = m + log(sum(exp(x - m))) for any m. Choosing the maximum guarantees the largest term is exp(0) = 1, which avoids overflow and keeps at least one term from underflowing to zero."],
  ["np-rng", "np-numerics", "mcq", "Which is the better way to get reproducible randomness in new numpy code?", ["Create `rng = np.random.default_rng(seed)` and pass it around", "Call `np.random.seed(0)` at the top of every module", "Use `time.time()` as the seed", "Avoid seeds so that results are unbiased"], "A `Generator` object carries its own state, so code that shares one is reproducible and independent code can use separate streams. The legacy global `np.random.seed` is shared mutable state that any import can disturb."],
];
const MULTI = [
  ["np-views-which", "np-views", "Which of these return a view (shared memory) rather than a copy? Pick all that apply.", ["`a[1:3]`", "`a.T`", "`a.reshape(2, 3)` on a contiguous 1-D array of 6", "`a[[0, 2]]`", "`a[a > 0]`"], [0, 1, 2], "Basic slices, transposes and reshapes of contiguous data reuse the same buffer. List/array indexing and boolean masks gather elements into a new array."],
];
const BUGS = [
  { id: "np-bug-center", topic: "np-axis", prompt: "`center(X)` should subtract each column's mean so every column has mean 0. Which line is wrong?", buggy: ["import numpy as np", "def center(X):", "    return X - X.mean()"], fixed: ["import numpy as np", "def center(X):", "    return X - X.mean(axis=0)"], probe: ["X = np.array([[1.0, 2.0], [3.0, 6.0]])", "center(X)"], explanation: "Without `axis=0`, `mean()` averages every element into one scalar, so only the global mean is removed. `X.mean(axis=0)` has shape (n_features,) and broadcasts across rows. Check results with `Z.mean(axis=0)`, which should be about 0." },
];

function place(correct, wrong, slot) { const choices = [...wrong]; choices.splice(slot, 0, correct); return { choices, answer: slot }; }

function buildDeck() {
  const cards = [];
  PREDICT.forEach(([id, topic, prompt, code, wrong, explanation], i) => {
    const out = py(`${NP}\n${code.join("\n")}`);
    if (out.includes("\n")) throw new Error(`${id}: output must be one line, got ${JSON.stringify(out)}`);
    if (wrong.includes(out)) throw new Error(`${id}: a distractor equals the real output (${out})`);
    cards.push({ id, kind: "mcq", variant: "predict", topic, prompt, code, ...place(out, wrong, (i * 3 + 1) % 4), explanation });
  });
  SHAPES.forEach(([id, topic, setup, expr]) => {
    const res = py(`${NP}\nimport json\n${setup.join("\n")}\ntry:\n    print(json.dumps(list(eval(${JSON.stringify(expr)}).shape)))\nexcept ValueError:\n    print('null')`);
    const answer = JSON.parse(res);
    const prompt = `With ${setup.map((l) => `\`${l.replace(/np\.zeros/, "np.zeros")}\``).join(" and ")}, what is the shape of \`${expr}\`? Type "error" if it raises.`;
    const explanation = answer === null
      ? "numpy aligns shapes from the right, and each pair of sizes must be equal or contain a 1. Here a pair differs without a 1, so numpy raises. Read the error message: it names the axes."
      : `Result shape (${answer.join(", ")}${answer.length === 1 ? "," : ""}). Broadcasting aligns trailing axes, matmul needs matching inner sizes, reductions drop their axis, and \`None\` or a size-1 list index keeps one.`;
    cards.push({ id, kind: "shape", topic, prompt, answer, explanation });
  });
  CONCEPT.forEach(([id, topic, kind, prompt, choices, explanation], i) => {
    const [right, ...wrong] = choices;
    cards.push({ id, kind, topic, prompt, ...place(right, wrong, (i * 3 + 2) % 4), explanation });
  });
  for (const [id, topic, prompt, choices, answers, explanation] of MULTI) cards.push({ id, kind: "multi", topic, prompt, choices, answers, explanation });
  for (const b of BUGS) {
    const lines = b.buggy.length === b.fixed.length ? b.buggy.map((l, i) => (l === b.fixed[i] ? 0 : i + 1)).filter(Boolean) : [];
    if (lines.length !== 1) throw new Error(`${b.id}: buggy and fixed must differ on exactly one line`);
    const run = (code) => py(`${code.join("\n")}\n${b.probe.slice(0, -1).join("\n")}\nprint(${b.probe.at(-1)})`);
    if (run(b.buggy) === run(b.fixed)) throw new Error(`${b.id}: fix does not change behaviour`);
    cards.push({ id: b.id, kind: "bug", topic: b.topic, prompt: b.prompt, code: b.buggy, line: lines[0], explanation: b.explanation });
  }
  if (cards.length < 25) throw new Error(`expected 25+ cards, got ${cards.length}`);
  return { id: "numpy", title: "Python Port: numpy", cards };
}

/** id, title, topics, intro, sections [heading, text, code lines | null], takeaways, trap. numpy snippets start with the import (not shown). */
const LESSONS = [
  ["numpy-arrays-dtypes", "Arrays and dtypes", ["np-arrays"],
    "An ndarray is a block of memory holding one fixed type, plus a shape that says how to read it. Almost every numpy surprise is the dtype or the shape doing exactly what it was told.",
    [
      ["One type per array", "Integers stay integers until something forces a float. `/` always yields floats; `//` keeps integers. The result dtype is the 'widest' of the operands.", ["a = np.array([1, 2, 3])", "print(a.dtype, (a / 2).dtype, (a // 2).dtype, (a * 1.5).dtype)"]],
      ["Fixed width means wrap-around", "Small integer dtypes do not grow. A `uint8` image array that overflows wraps silently, so cast before arithmetic.", ["p = np.array([200, 250], dtype=np.uint8)", "print(p + np.uint8(100), p.astype(np.int32) + 100)"]],
      ["Why vectorise", "A loop in Python pays interpreter cost per element. A numpy call runs one compiled loop over packed numbers. The algorithm is the same, so the gain is a constant factor, usually large.", ["x = np.arange(5)", "print(np.sum(x * x), sum(int(v) ** 2 for v in x))"]],
    ],
    ["Every array has one dtype and one shape.", "`/` gives floats, `//` keeps ints, small ints wrap around.", "Vectorising removes interpreter overhead, not algorithmic work."],
    "Treating a `uint8` or `int32` array like Python's unbounded integers: overflow is silent and gives plausible wrong numbers."],
  ["numpy-views-copies", "Views and copies", ["np-views"],
    "numpy avoids copying whenever it can describe the result as a different way of reading the same memory. That makes it fast, and it means editing one name can change another.",
    [
      ["Basic slicing is a view", "Slices, `.T`, and `reshape` of contiguous data share the buffer. Writing through one name shows up in every other.", ["a = np.arange(6)", "b = a[1:4]", "b[:] = 0", "print(a, b.base is a)"]],
      ["Fancy and boolean indexing copy", "Indexing with lists, integer arrays or masks gathers elements into a new array, so edits to the result do not touch the source.", ["a = np.arange(6)", "c = a[[1, 2]]", "c[:] = 0", "print(a, np.shares_memory(a, c))"]],
      ["Ask when unsure", "`np.shares_memory(a, b)` answers it directly. Call `.copy()` before mutating anything you did not just create.", ["x = np.arange(4.0)", "y = x[:2].copy()", "y += 10", "print(x, y)"]],
    ],
    ["Basic slices, transposes and reshapes are views.", "List, integer-array and boolean indexing copy.", "Copy before mutating a slice you do not own."],
    "Normalising `X[:, :3] /= s` in place when `X` is the caller's training data: you have just rewritten their dataset."],
  ["numpy-broadcasting", "Broadcasting and shapes", ["np-broadcast"],
    "Broadcasting is the rule that lets arrays of different shapes combine without loops. Learn the rule and shape errors become readable instead of mysterious.",
    [
      ["The rule", "Line the shapes up from the right. Each pair of sizes must be equal, or one of them must be 1 (that axis is stretched). Missing leading axes count as 1.", ["a = np.zeros((8, 1, 6, 1))", "b = np.zeros((7, 1, 5))", "print((a + b).shape)"]],
      ["Pairwise tables for free", "Adding an axis with `None` turns a vector into a column, so a single expression builds every pairwise difference. This is the core of distance matrices and attention scores.", ["x = np.array([1.0, 4.0, 6.0])", "print(np.abs(x[:, None] - x[None, :]))"]],
      ["When it fails", "A mismatch with no 1 to stretch raises. Fix it by reshaping on purpose, not by guessing: `(3, 4) + (3,)` fails because the 3 aligns with the 4.", ["a = np.zeros((3, 4))", "try:", "    a + np.zeros(3)", "except ValueError as e:", "    print('error')", "print((a + np.zeros((3, 1))).shape)"]],
    ],
    ["Align from the right; sizes must match or be 1.", "`None` / `keepdims=True` add the size-1 axes that make broadcasting do what you mean.", "Write the expected shape in a comment, and assert it."],
    "A silent broadcast: subtracting a `(n,)` vector from a `(n, 1)` column gives `(n, n)`, not an error and not what you wanted."],
  ["numpy-axis-indexing", "Axes, reductions and indexing", ["np-axis"],
    "`axis` names the dimension a reduction collapses. Once you can say that sentence for any call, indexing and reductions stop needing trial and error.",
    [
      ["axis means 'collapse this one'", "Summing over axis 0 of a `(2, 3)` array collapses the rows and leaves three column totals; axis 1 leaves two row totals.", ["a = np.arange(6).reshape(2, 3)", "print(a.sum(axis=0), a.sum(axis=1))"]],
      ["keepdims for normalising", "Keeping the collapsed axis as size 1 lets the result broadcast straight back. This is the row-normalisation idiom.", ["a = np.array([[1.0, 3.0], [2.0, 2.0]])", "print(a / a.sum(axis=1, keepdims=True))"]],
      ["Masks and arg-functions", "A boolean mask selects (and, on the left of `=`, edits) elements. `argmax` returns the first maximum.", ["a = np.array([5, -1, 3, -2])", "a[a < 0] = 0", "print(a, np.argmax([3, 7, 7, 1]))"]],
    ],
    ["`axis=k` removes axis k from the shape.", "`keepdims=True` keeps it as size 1 so results broadcast back.", "Masks select and assign; `argmax` takes the first tie."],
    "Taking the mean over the wrong axis still returns an array of plausible shape. Check the shape and a hand-computed row."],
  ["numpy-numerics-random", "Numerical stability and random numbers", ["np-numerics"],
    "Floats are finite approximations. Most ML bugs that print `nan` or drift slowly are one of three things: overflow, absorption or catastrophic cancellation.",
    [
      ["Overflow and the max trick", "`exp` overflows for inputs around 710 in float64 (far sooner in float16). Subtract the maximum and the largest exponent becomes 0.", ["x = np.array([1000.0, 1001.0])", "z = np.exp(x - x.max())", "print(z / z.sum())"]],
      ["Absorption and NaN", "Small numbers vanish next to large ones, and a NaN poisons everything it touches. Use `np.isnan`, never `==`.", ["print(float(np.float32(16777216) + np.float32(1)), np.float64(2**53) + 1 == np.float64(2**53))", "print(np.nan == np.nan, np.isnan(np.nan))"]],
      ["Seeded generators", "Create one `Generator` per experiment and pass it down. The same seed gives the same stream, on any machine, for the same numpy version.", ["rng = np.random.default_rng(7)", "print(rng.integers(0, 10, size=5))", "print(np.random.default_rng(7).integers(0, 10, size=5))"]],
    ],
    ["Subtract the max before `exp`; use `logsumexp` for logs of sums.", "Compare floats with a tolerance and detect NaN with `isnan`.", "Pass a seeded `Generator`; avoid global seeds."],
    "Assuming a seed fixes results across numpy versions: stream details can change between releases, so assert properties, not exact draws, in long-lived tests."],
];

function buildLessons() {
  return {
    id: "numpy-lessons",
    title: "numpy lessons",
    lessons: LESSONS.map(([id, title, topics, intro, sections, takeaways, trap]) => ({
      id, title, topics, intro, takeaways, trap,
      sections: sections.map(([heading, text, code]) => {
        const s = { heading, text };
        if (code) { s.code = code; s.output = py(`${NP}\n${code.join("\n")}`); }
        return s;
      }),
    })),
  };
}

const deckJson = JSON.stringify(buildDeck(), null, 2) + "\n";
const lessonJson = JSON.stringify(buildLessons(), null, 2) + "\n";
if (process.argv.includes("--check")) {
  for (const [url, json] of [[DECK_OUT, deckJson], [LESSON_OUT, lessonJson]]) {
    if (readFileSync(url, "utf8") !== json) { console.error(`${url.pathname} is stale: run node scripts/gen-numpy.mjs`); process.exit(1); }
  }
  console.log("numpy deck and lessons up to date (recomputed natively)");
} else {
  mkdirSync(new URL("../content/lessons/", import.meta.url), { recursive: true });
  writeFileSync(DECK_OUT, deckJson);
  writeFileSync(LESSON_OUT, lessonJson);
  console.log("wrote numpy deck and lessons");
}
