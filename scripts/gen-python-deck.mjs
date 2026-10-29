// Generates content/decks/python-port.json. Predict-the-output answers are computed by running the snippets
// in native python3, never typed by hand; spot-the-bug cards are proven by running buggy vs fixed code.
// `--check` regenerates in memory and fails if the committed JSON is stale (used by tests).
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";

const OUT = new URL("../content/decks/python-port.json", import.meta.url);
const py = (src) => execFileSync("python3", ["-I", "-c", src], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], timeout: 10000 }).trim();

/** [id, topic, prompt, code lines, three wrong outputs, explanation] */
const PREDICT = [
  ["py-mutable-default", "py-data-model", "What does the last line print?", ["def add(x, acc=[]):", "    acc.append(x)", "    return acc", "", "add(1)", "print(add(2))"], ["[2]", "[1]", "[]"], "The default list is built once, when `def` runs, and shared by every call that omits it. The second call appends to the list the first call already filled. Use `None` and create the list inside the function."],
  ["py-late-binding", "py-closures", "What does this print?", ["fs = [lambda: i for i in range(3)]", "print([f() for f in fs])"], ["[0, 1, 2]", "[3, 3, 3]", "[0, 0, 0]"], "A closure captures the variable, not its value at creation time. By the time the lambdas run, `i` has finished at 2. Bind it with a default argument (`lambda i=i: i`) to freeze each value."],
  ["py-generator-once", "py-generators", "What does this print?", ["g = (x * x for x in range(4))", "print(sum(g), sum(g))"], ["14 14", "0 14", "14 6"], "A generator is a one-shot iterator. The first `sum` consumes it, so the second sees nothing and returns 0. Keep a list if you need two passes."],
  ["py-list-aliasing", "py-copies", "What does this print?", ["a = [[0] * 2] * 2", "a[0][0] = 1", "print(a)"], ["[[1, 0], [0, 0]]", "[[0, 0], [0, 0]]", "[[1, 1], [1, 1]]"], "`[row] * 2` repeats a reference to the same inner list, so both rows are one object. Build rows independently with a comprehension: `[[0] * 2 for _ in range(2)]`."],
  ["py-iadd-vs-add", "py-copies", "What does this print?", ["a = [1, 2]", "b = a", "b = b + [3]", "c = a", "c += [4]", "print(a)"], ["[1, 2]", "[1, 2, 3]", "[1, 2, 3, 4]"], "`b + [3]` builds a new list and rebinds `b`; `a` is untouched. `c += [4]` extends the shared list in place, and `a` is the same object. `+=` on a list is `extend`."],
  ["py-counter-most-common", "py-collections", "What does this print?", ["from collections import Counter", "print(Counter('banana').most_common(2))"], ["[('b', 1), ('n', 2)]", "[('n', 2), ('a', 3)]", "[('a', 3), ('b', 1)]"], "`most_common` sorts by count, highest first: three a's, two n's, one b. It is the standard tool for frequency questions in interviews."],
  ["py-heapify-order", "py-heapq", "What does this print?", ["import heapq", "h = [5, 1, 4]", "heapq.heapify(h)", "print(h)"], ["[1, 4, 5]", "[5, 4, 1]", "[5, 1, 4]"], "`heapify` arranges the list as a binary min-heap in place: the smallest element is first, but the rest is only partially ordered. Indexing a heap is not sorted order; pop to get sorted order."],
  ["py-nlargest", "py-heapq", "What does this print?", ["import heapq", "print(heapq.nlargest(2, [5, 1, 4, 2]))"], ["[1, 2]", "[4, 5]", "[5, 4, 2]"], "`nlargest(k, xs)` returns the k largest in descending order, in O(n log k) time using a size-k heap."],
  ["py-bisect-sides", "py-bisect", "What does this print?", ["from bisect import bisect_left, bisect_right", "a = [1, 2, 2, 2, 3]", "print(bisect_left(a, 2), bisect_right(a, 2))"], ["1 3", "2 4", "0 4"], "`bisect_left` gives the first index where 2 could be inserted (before the equal run); `bisect_right` gives the index after the last 2. The difference is the count of 2s."],
  ["py-accumulate", "py-itertools", "What does this print?", ["from itertools import accumulate", "print(list(accumulate([1, 2, 3, 4])))"], ["[1, 2, 3, 4]", "[10]", "[1, 2, 6, 24]"], "`accumulate` yields running totals by default (prefix sums), the one-liner behind many range-sum problems. Pass a function such as `operator.mul` for running products."],
  ["py-groupby-unsorted", "py-itertools", "What does this print?", ["from itertools import groupby", "print([(k, len(list(g))) for k, g in groupby('aabaa')])"], ["[('a', 4), ('b', 1)]", "[('a', 2), ('b', 1)]", "[('a', 4)]"], "`groupby` groups only *consecutive* equal keys, like run-length encoding. To group everything, sort by the key first."],
  ["py-lru-cache-calls", "py-functools", "What does this print?", ["from functools import lru_cache", "calls = 0", "", "@lru_cache(maxsize=None)", "def f(n):", "    global calls", "    calls += 1", "    return n", "", "f(1); f(1); f(2)", "print(calls)"], ["3", "1", "0"], "The cache is keyed by the arguments. `f(1)` runs once and is then served from the cache; `f(2)` is a new key. Arguments must be hashable, and unbounded caches can hold memory forever."],
  ["py-decorator-name", "py-decorators", "What does this print?", ["def log(fn):", "    def wrapper(*args):", "        return fn(*args)", "    return wrapper", "", "@log", "def square(x):", "    return x * x", "", "print(square.__name__)"], ["square", "log", "fn"], "The decorator replaced `square` with `wrapper`, so metadata is lost. `functools.wraps(fn)` on the wrapper copies the name, docstring and annotations; always use it."],
  ["py-context-suppress", "py-context-managers", "What does this print?", ["log = []", "", "class C:", "    def __enter__(self):", "        log.append('in')", "        return self", "    def __exit__(self, *exc):", "        log.append('out')", "        return True", "", "with C():", "    log.append('body')", "    raise ValueError", "print(log)"], ["['in', 'body']", "['in', 'out']", "['in', 'body', 'out', 'error']"], "`__exit__` always runs, and returning a truthy value tells Python the exception was handled, so it is swallowed. Suppressing exceptions silently is rarely wise; do it deliberately."],
  ["py-finally-return", "py-exceptions", "What does this print?", ["def f():", "    try:", "        return 1", "    finally:", "        return 2", "", "print(f())"], ["1", "None", "Error"], "`finally` always runs before the function returns, and a `return` inside it overrides the earlier one (and would even discard an in-flight exception). Do not return from `finally`."],
  ["py-dataclass-eq", "py-dataclasses", "What does this print?", ["from dataclasses import dataclass, field", "", "@dataclass", "class P:", "    x: int", "    tags: list = field(default_factory=list)", "", "a, b = P(1), P(1)", "a.tags.append('t')", "print(a == b, b.tags)"], ["True []", "True ['t']", "False ['t']"], "`default_factory` gives each instance its own list, so `b.tags` stays empty. The generated `__eq__` compares fields, and `a.tags` now differs, so the instances are unequal."],
  ["py-dataclass-hash", "py-dataclasses", "What does this print?", ["from dataclasses import dataclass", "", "@dataclass", "class P:", "    x: int", "", "try:", "    print(len({P(1), P(1)}))", "except TypeError:", "    print('unhashable')"], ["1", "2", "TypeError"], "With the default `eq=True` and no `frozen=True`, a dataclass sets `__hash__` to None, so instances cannot go in sets or be dict keys. Use `@dataclass(frozen=True)` for value objects."],
  ["py-slice-step", "py-data-model", "What does this print?", ["s = 'neural'", "print(s[::-2])"], ["lan", "nua", "lrn"], "A negative step walks backwards from the end: l, then every second character. Slices never raise on out-of-range bounds, which is convenient and occasionally hides bugs."],
  ["py-sort-key-stable", "py-sorting", "What does this print?", ["print(sorted(['bb', 'a', 'cc', 'd'], key=len))"], ["['a', 'd', 'cc', 'bb']", "['d', 'a', 'bb', 'cc']", "['a', 'bb', 'cc', 'd']"], "`sorted` is stable: items with equal keys keep their original order, so 'a' stays before 'd' and 'bb' before 'cc'. That lets you sort by a secondary key first, then the primary key."],
  ["py-rounding-division", "py-data-model", "What does this print?", ["print(round(2.5), round(3.5), -7 // 2, -7 % 3)"], ["3 4 -3 -1", "2 4 -3 2", "3 3 -4 1"], "`round` uses banker's rounding (ties go to even). `//` floors toward negative infinity and `%` takes the sign of the divisor, so `-7 // 2 == -4` and `-7 % 3 == 2`. This differs from C++ truncation, a classic trap when porting solutions."],
  ["py-float-equality", "py-numerics", "What does this print?", ["import math", "print(0.1 + 0.2 == 0.3, math.isclose(0.1 + 0.2, 0.3))"], ["True True", "False False", "True False"], "Binary floats cannot represent 0.1 or 0.2 exactly, so the sum is 0.30000000000000004. Compare floats with a tolerance (`math.isclose`, `pytest.approx`, `np.allclose`), never `==`."],
];

/** Plain concept cards. `choices[0]` is always the right one here; positions are rotated below. */
const CONCEPT = [
  ["py-list-pop0", "py-complexity", "mcq", "You pop from the front of a Python list in a loop on a million items (`xs.pop(0)`). What is wrong, and what is the fix?", ["Each pop is O(n) because every element shifts left; use `collections.deque.popleft()` for O(1)", "Nothing; list pops are O(1) at both ends", "It is O(log n); switch to a heap", "It is O(1) but the list copies once at the end"], "A list is a contiguous array: removing at index 0 moves the other n-1 pointers, so a loop of n pops is O(n²). A deque is a block-linked structure with O(1) operations at both ends."],
  ["py-in-list-vs-set", "py-complexity", "mcq", "A function tests `x in banned` for each of a million tokens, where `banned` is a list of 50,000 words. What is the best first change?", ["Convert `banned` to a set once (average O(1) membership)", "Sort the list so `in` becomes O(log n)", "Use `banned.index(x)` instead", "Nothing: `in` on a list is already O(1)"], "`in` on a list scans linearly; on a set it hashes. Building the set costs O(m) once and saves roughly 50,000 comparisons per lookup. Sorting a list does not make `in` binary search; use `bisect` explicitly for that."],
  ["py-max-heap", "py-heapq", "mcq", "`heapq` only provides a min-heap. What is the usual way to get max-heap behaviour for numbers?", ["Push the negated values and negate again on pop", "Call `heapq.maxheap()`", "Sort the list after every push", "Use `reverse=True` in `heappush`"], "Negating reverses the order, so the smallest negated value is the largest original. For objects, push `(-priority, tiebreaker, item)` tuples; the tiebreaker avoids comparing items that cannot be ordered."],
  ["py-recursion-limit", "py-recursion", "mcq", "A recursive depth-first search works on small inputs but raises `RecursionError` on a 200,000-node chain. What is the most robust fix?", ["Rewrite it iteratively with an explicit stack", "Catch the error and retry", "Add `@lru_cache` to the function", "Convert every `int` to `float`"], "CPython caps the call stack (about 1,000 frames by default) and each recursion costs a frame. Raising the limit risks crashing the interpreter on a real stack overflow. An explicit stack uses heap memory and has no such ceiling. Caching does not shorten the call chain."],
  ["py-typing-runtime", "py-typing", "mcq", "A function is annotated `def f(x: int) -> str:` and called as `f('hello')`. What happens at runtime?", ["Nothing special: annotations are not enforced; a static checker such as mypy would flag it", "A `TypeError` is raised before the body runs", "The string is converted to an int", "The interpreter refuses to import the module"], "Python stores annotations but does not check them. They document intent and feed tools (mypy, pyright, IDEs, libraries such as pydantic that opt in to validating)."],
  ["py-approx", "py-testing", "mcq", "Which assertion is right for checking a computed gradient `g` against `0.3` in a pytest test?", ["`assert g == pytest.approx(0.3, abs=1e-6)`", "`assert g == 0.3`", "`assert str(g) == '0.3'`", "`assert int(g * 10) == 3`"], "Floating-point results carry rounding error, so tests compare within a tolerance. `int(g * 10)` truncates and fails for 0.2999999; string comparison is brittle."],
  ["py-list-vs-view-slice", "py-copies", "mcq", "In pure Python `b = a[1:3]` on a list, versus numpy `b = arr[1:3]`. Which statement is correct?", ["The list slice copies the pointers; the numpy slice is a view sharing memory with `arr`", "Both are views", "Both are copies", "The list slice is a view; the numpy slice is a copy"], "List slicing builds a new list. Basic numpy slicing returns a view on the same buffer, so writing `b[0] = 9` changes `arr`. Fancy (index-array) indexing copies instead. Use `.copy()` when you need independence."],
  ["py-bare-except", "py-exceptions", "mcq", "Why is a bare `except:` (or `except BaseException`) around a training loop a bad idea?", ["It also catches `KeyboardInterrupt` and `SystemExit`, so you cannot stop the job and real bugs vanish", "It is slower than `except Exception`", "It is a syntax error in Python 3", "It disables the garbage collector"], "`KeyboardInterrupt` and `SystemExit` derive from `BaseException`, not `Exception`. Catch the narrowest error you can handle, and log or re-raise the rest."],
];

const MULTI = [
  ["py-o1-ops", "py-complexity", "Which operations are O(1) on average? Pick all that apply.", ["`d[key]` on a dict", "`s.add(x)` on a set", "`dq.appendleft(x)` on a deque", "`xs.insert(0, x)` on a list"], [0, 1, 2], "Dicts and sets hash their keys; a deque is built for both ends. Inserting at the front of a list shifts every element: O(n)."],
];

/** Bug cards: `buggy` and `fixed` differ on exactly one line (the answer); `probe` is evaluated after each. */
const BUGS = [
  { id: "py-bug-moving-average", topic: "py-comprehensions", prompt: "This should return the average of every full window of size k. Which line is wrong?", buggy: ["def moving_avg(xs, k):", "    return [sum(xs[i:i + k]) / k", "            for i in range(len(xs))]"], fixed: ["def moving_avg(xs, k):", "    return [sum(xs[i:i + k]) / k", "            for i in range(len(xs) - k + 1)]"], probe: ["moving_avg([1, 2, 3, 4], 2)"], explanation: "Near the end the slice is shorter than k, but it is still divided by k, so the last windows are wrong. Only start indices up to `len(xs) - k` give full windows: `range(len(xs) - k + 1)`. Off-by-one bounds are the most common slicing bug." },
  { id: "py-bug-make-grid", topic: "py-copies", prompt: "After `g = make_grid(2); g[0][0] = 1`, every row changes. Which line is the bug?", buggy: ["def make_grid(n):", "    return [[0] * n] * n"], fixed: ["def make_grid(n):", "    return [[0] * n for _ in range(n)]"], probe: ["g = make_grid(2)", "g[0][0] = 1", "g"], explanation: "`[row] * n` repeats a reference to one row, so all rows alias each other. Build each row separately with a comprehension." },
];

const rotate = (i, n) => i % n;

function place(correct, wrong, slot) {
  const choices = [...wrong];
  choices.splice(slot, 0, correct);
  return { choices, answer: slot };
}

const cards = [];
PREDICT.forEach(([id, topic, prompt, code, wrong, explanation], i) => {
  const out = py(code.join("\n"));
  if (out.includes("\n")) throw new Error(`${id}: output must be one line`);
  if (wrong.includes(out)) throw new Error(`${id}: a distractor equals the real output (${out})`);
  if (new Set([out, ...wrong]).size !== 4) throw new Error(`${id}: duplicate choices`);
  cards.push({ id, kind: "mcq", variant: "predict", topic, prompt, code, ...place(out, wrong, rotate(i * 3 + 1, 4)), explanation });
});
CONCEPT.forEach(([id, topic, kind, prompt, choices, explanation], i) => {
  const [right, ...wrong] = choices;
  cards.push({ id, kind, topic, prompt, ...place(right, wrong, rotate(i * 3 + 2, 4)), explanation });
});
for (const [id, topic, prompt, choices, answers, explanation] of MULTI) cards.push({ id, kind: "multi", topic, prompt, choices, answers, explanation });
for (const b of BUGS) {
  const lines = b.buggy.length === b.fixed.length ? b.buggy.map((l, i) => (l === b.fixed[i] ? 0 : i + 1)).filter(Boolean) : [];
  if (lines.length !== 1) throw new Error(`${b.id}: buggy and fixed must differ on exactly one line`);
  const run = (code) => py(`${code.join("\n")}\n${b.probe.slice(0, -1).join("\n")}\nprint(${b.probe.at(-1)})`);
  if (run(b.buggy) === run(b.fixed)) throw new Error(`${b.id}: fix does not change behaviour`);
  cards.push({ id: b.id, kind: "bug", topic: b.topic, prompt: b.prompt, code: b.buggy, line: lines[0], explanation: b.explanation });
}

const deck = { id: "python-port", title: "Python Port: Python and interview Python", cards };
if (cards.length < 30) throw new Error(`expected 30+ cards, got ${cards.length}`);
const json = JSON.stringify(deck, null, 2) + "\n";
if (process.argv.includes("--check")) {
  if (readFileSync(OUT, "utf8") !== json) {
    console.error("content/decks/python-port.json is stale; run node scripts/gen-python-deck.mjs");
    process.exit(1);
  }
  console.log(`python-port deck up to date (${cards.length} cards, answers recomputed natively)`);
} else {
  writeFileSync(OUT, json);
  console.log(`wrote ${cards.length} cards`);
}
