// Generates content/lessons/python-port.json. Every example's output is computed by running the snippet in
// native python3, never typed by hand. `--check` fails if the committed JSON is stale (used by tests).
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";

const OUT = new URL("../content/lessons/python-port.json", import.meta.url);
const py = (src) => execFileSync("python3", ["-I", "-c", src], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], timeout: 10000 }).trim();

/** id, title, topics (card topic ids), intro, sections [heading, text, code lines | null], takeaways, trap */
const LESSONS = [
  ["python-data-model", "Values, slices and numbers", ["py-data-model", "py-sorting", "py-numerics"],
    "Most Python surprises in interviews come from three places: what a name refers to, how slices and sorting behave, and how numbers round. Learn the rules once and they stop being surprises.",
    [
      ["Slices are forgiving", "`s[a:b:c]` never raises for out-of-range bounds, and a negative step walks backwards. That is handy for reversing (`s[::-1]`) and risky when an off-by-one hides.", ["s = 'neural'", "print(s[::-1], s[10:], s[::-2])"]],
      ["Sorting is stable", "`sorted` and `list.sort` keep the original order of items with equal keys. To order by several criteria, sort by the least important key first, or return a tuple from `key`.", ["rows = [('b', 2), ('a', 2), ('c', 1)]", "print(sorted(rows, key=lambda r: (r[1], r[0])))"]],
      ["Integer division and rounding", "`//` floors toward negative infinity and `%` takes the sign of the divisor. `round` sends ties to the nearest even number. Both differ from C++ truncation, which matters when you port a solution between the two languages.", ["print(-7 // 2, -7 % 3, round(2.5), round(3.5))"]],
    ],
    ["Slices do not raise on bad bounds.", "Sorting is stable; use it for multi-key ordering.", "Floor division and banker's rounding are not C++ behaviour."],
    "Using `int(a / b)` to emulate C++ division is wrong for large integers because it goes through floating point. Use `a // b` with care for negatives, or `divmod`."],
  ["python-comprehensions-generators", "Comprehensions and generators", ["py-comprehensions", "py-generators"],
    "A comprehension builds a whole collection now. A generator produces values one at a time, on demand. Choosing between them is a memory and laziness decision.",
    [
      ["Comprehensions", "They read as 'for each x, keep f(x)'. The same syntax builds lists, sets and dicts. Keep them to one loop and one condition; past that, a plain loop is clearer.", ["words = ['to', 'be', 'or', 'not', 'to', 'be']", "print({w: len(w) for w in set(words) if len(w) > 2})"]],
      ["Generators are one-shot", "A generator expression yields each value once, then it is exhausted. Reusing it silently gives nothing, which is a classic source of 'my second pass is empty' bugs.", ["g = (x * x for x in range(4))", "print(list(g), list(g))"]],
      ["Why bother", "Streaming a large file or a long training set through a generator keeps memory flat. `yield` lets you write the producer as an ordinary loop.", ["def batches(xs, n):", "    for i in range(0, len(xs), n):", "        yield xs[i:i + n]", "", "print(list(batches([1, 2, 3, 4, 5], 2)))"]],
    ],
    ["Use a comprehension when you need the whole collection.", "Use a generator for streams and single passes.", "A generator can be consumed only once."],
    "Calling `len()` on a generator fails, and `sum(g)` twice returns the right answer the first time and 0 the second."],
  ["python-closures-decorators", "Closures, decorators and functools", ["py-closures", "py-decorators", "py-functools"],
    "Functions are values. A function can capture variables from where it was defined, and a decorator is a function that wraps another function.",
    [
      ["Closures capture variables, not values", "A closure looks the variable up when it runs. Lambdas created in a loop all see the loop variable's final value unless you bind it, for example with a default argument.", ["fs = [lambda i=i: i for i in range(3)]", "print([f() for f in fs])"]],
      ["Decorators wrap", "`@deco` above `def f` means `f = deco(f)`. Use `functools.wraps` so the wrapper keeps the name and docstring.", ["from functools import wraps", "", "def traced(fn):", "    @wraps(fn)", "    def wrapper(*args):", "        print('call', fn.__name__, args)", "        return fn(*args)", "    return wrapper", "", "@traced", "def add(a, b):", "    return a + b", "", "print(add(2, 3), add.__name__)"]],
      ["Memoisation", "`functools.lru_cache` stores results keyed by the arguments, which must be hashable. It turns exponential recursion into linear time, at the price of memory.", ["from functools import lru_cache", "", "@lru_cache(maxsize=None)", "def fib(n):", "    return n if n < 2 else fib(n - 1) + fib(n - 2)", "", "print(fib(80), fib.cache_info().hits)"]],
    ],
    ["A closure sees the variable at call time.", "Always use `functools.wraps` in decorators.", "`lru_cache` needs hashable arguments and unbounded caches grow forever."],
    "Caching a function that takes a list or a numpy array raises `TypeError: unhashable`. Cache on a tuple or an id instead."],
  ["python-copies-aliasing", "Aliasing and copies", ["py-copies"],
    "Assignment never copies. It makes another name for the same object. Whether a change is visible through the other name depends on whether the object is mutable and whether the operation mutates it.",
    [
      ["Two names, one list", "`b = a` binds a second name. Mutating through either shows through both.", ["a = [1, 2]", "b = a", "b.append(3)", "print(a, a is b)"]],
      ["Shallow versus deep", "`a.copy()` and `a[:]` copy only the outer list; the inner objects are shared. `copy.deepcopy` copies recursively.", ["import copy", "a = [[1], [2]]", "s, d = a.copy(), copy.deepcopy(a)", "a[0].append(9)", "print(s, d)"]],
      ["The grid trap", "`[[0] * 3] * 3` repeats one inner list three times. Build each row separately.", ["bad = [[0] * 2] * 2", "good = [[0] * 2 for _ in range(2)]", "bad[0][0] = 1; good[0][0] = 1", "print(bad, good)"]],
    ],
    ["Assignment shares; it does not copy.", "A shallow copy shares nested objects.", "Build 2-D grids with a comprehension."],
    "numpy slices are views, not copies: writing into a slice changes the original array. Use `.copy()` when you need independence (see the numpy lessons)."],
  ["python-collections-complexity", "Collections and what they cost", ["py-collections", "py-complexity"],
    "Interview Python is mostly about picking the right container and knowing its cost. The standard library already has most of what you would otherwise hand-roll.",
    [
      ["Counter, defaultdict, deque", "`Counter` counts, `defaultdict` creates missing values on first access, and `deque` gives O(1) operations at both ends.", ["from collections import Counter, defaultdict, deque", "print(Counter('banana').most_common(1))", "groups = defaultdict(list)", "for w in ['ant', 'bee', 'ape']:", "    groups[w[0]].append(w)", "print(dict(groups))", "q = deque([1, 2, 3]); q.appendleft(0); print(q.popleft(), len(q))"]],
      ["Costs worth memorising", "Appending to a list and indexing are O(1). `list.pop(0)` and `list.insert(0, x)` are O(n). `x in list` is O(n); `x in set` and `x in dict` are average O(1). Sorting is O(n log n). String `+=` in a loop can be O(n²) while `''.join` is linear.", null],
      ["A cheap fix with a big effect", "Converting a list you search repeatedly into a set is often the whole optimisation.", ["import timeit", "xs = list(range(20000)); ys = set(xs)", "slow = timeit.timeit(lambda: 19999 in xs, number=200)", "fast = timeit.timeit(lambda: 19999 in ys, number=200)", "print(slow > 20 * fast)"]],
    ],
    ["Pick the container for the operation you repeat.", "Know the O(1) versus O(n) list operations.", "A set or dict is the default for membership."],
    "Dictionaries preserve insertion order, but sets do not promise any order. Never rely on set iteration order in an answer."],
  ["python-heaps-bisect-itertools", "heapq, bisect and itertools", ["py-heapq", "py-bisect", "py-itertools"],
    "Three small modules cover a large share of coding-round patterns: priority queues, binary search on sorted lists, and iteration helpers.",
    [
      ["heapq is a min-heap on a list", "`heappush` and `heappop` cost O(log n). For a max-heap push negated values. `nlargest(k, xs)` is O(n log k).", ["import heapq", "h = []", "for x in [5, 1, 4, 2]:", "    heapq.heappush(h, -x)", "print([-heapq.heappop(h) for _ in range(2)])"]],
      ["bisect for sorted lists", "`bisect_left` returns the first insertion point and `bisect_right` the one after equal items. Their difference counts equal elements.", ["from bisect import bisect_left, bisect_right", "a = [1, 2, 2, 2, 3]", "print(bisect_left(a, 2), bisect_right(a, 2))"]],
      ["itertools", "`accumulate` gives prefix sums, `groupby` groups consecutive equal keys (sort first to group everything), `combinations` and `permutations` enumerate subsets lazily.", ["from itertools import accumulate, combinations", "print(list(accumulate([1, 2, 3, 4])), list(combinations('abc', 2)))"]],
    ],
    ["Min-heap by default; negate for max.", "bisect needs a sorted list.", "groupby only merges neighbours."],
    "Heap entries that tie on priority fall through to comparing the next tuple element. Add a counter as a tiebreaker when the payloads cannot be compared."],
  ["python-context-exceptions", "Context managers and exceptions", ["py-context-managers", "py-exceptions"],
    "Resources must be released even when code fails. `with` and `try`/`finally` are Python's RAII.",
    [
      ["with", "`__enter__` runs on the way in and `__exit__` always runs on the way out, even when an exception escapes. `contextlib.contextmanager` writes one as a generator.", ["from contextlib import contextmanager", "", "@contextmanager", "def section(name):", "    print('enter', name)", "    try:", "        yield", "    finally:", "        print('leave', name)", "", "with section('load'):", "    print('working')"]],
      ["Catch narrowly", "Catch the specific exception you can handle. A bare `except:` also hides `KeyboardInterrupt` and typos. Use `raise ... from err` to keep the cause chain.", ["try:", "    int('x')", "except ValueError as err:", "    print(type(err).__name__)"]],
      ["finally wins", "Code in `finally` runs last, and a `return` there overrides everything before it. Do not return from `finally`.", ["def f():", "    try:", "        return 1", "    finally:", "        print('cleanup')", "", "print(f())"]],
    ],
    ["Use `with` for files, locks and temporary state.", "Catch narrow, re-raise with context.", "Never return from `finally`."],
    "Returning True from `__exit__` swallows the exception. That is occasionally right and usually a hidden bug."],
  ["python-dataclasses-typing", "Dataclasses and type hints", ["py-dataclasses", "py-typing"],
    "Dataclasses remove boilerplate for plain data records, and type hints document intent for people and tools. Neither changes what the interpreter does at run time.",
    [
      ["Dataclasses", "`@dataclass` writes `__init__`, `__repr__` and `__eq__` from annotated fields. Mutable defaults need `field(default_factory=...)`. `frozen=True` makes instances hashable and read-only.", ["from dataclasses import dataclass, field", "", "@dataclass(frozen=True)", "class Point:", "    x: int", "    y: int = 0", "", "print(Point(1), Point(1) == Point(1), len({Point(1), Point(1)}))"]],
      ["Hints are not enforced", "Python stores annotations and ignores them. Static checkers (mypy, pyright) and libraries that opt in (pydantic) use them. Annotate public signatures; it pays off in review and in AI-assisted coding.", ["def scale(x: int) -> str:", "    return x * 2", "", "print(scale('ab'))"]],
    ],
    ["Use dataclasses for records.", "`default_factory` for mutable defaults.", "Type hints are for tools and readers, not for the runtime."],
    "A dataclass with `eq=True` and no `frozen` sets `__hash__` to None, so it cannot go in a set or be a dict key."],
  ["python-recursion", "Recursion and its limits", ["py-recursion"],
    "Python does not optimise tail calls and caps the stack. Deep recursion is a design choice you make knowingly.",
    [
      ["The limit", "CPython allows about a thousand nested calls by default. Raising the limit trades a clean error for the risk of crashing the interpreter.", ["import sys", "print(sys.getrecursionlimit())"]],
      ["Replace depth with a stack", "Any recursive DFS can use an explicit stack, which lives on the heap and has no fixed ceiling.", ["def depth(next_of, start):", "    d, cur = 0, start", "    while cur is not None:", "        d, cur = d + 1, next_of.get(cur)", "    return d", "", "chain = {i: i + 1 for i in range(5000)}", "print(depth(chain, 0))"]],
    ],
    ["Expect RecursionError near 1000 frames.", "Prefer an explicit stack for deep inputs.", "Memoisation does not shorten the call chain."],
    "In an interview say the limit out loud and offer the iterative version when inputs can be a long chain."],
  ["python-testing", "Testing numerical code", ["py-testing"],
    "A test that cannot fail is not a test, and floating-point equality is the quickest way to write one that fails for the wrong reason.",
    [
      ["Compare with tolerance", "Use `pytest.approx` or `math.isclose` for floats. Pick the tolerance from the problem, not from what makes the test pass.", ["import math", "print(0.1 + 0.2 == 0.3, math.isclose(0.1 + 0.2, 0.3, abs_tol=1e-9))"]],
      ["Check a gradient numerically", "A central difference `(f(x+h) - f(x-h)) / 2h` approximates the derivative to O(h²). Neural Clash labs use it to verify every hand-written gradient.", ["def f(x): return x ** 3", "h = 1e-5", "print(round((f(2 + h) - f(2 - h)) / (2 * h), 4))"]],
    ],
    ["Never compare floats with `==`.", "Finite differences verify gradients.", "Test the failing case first."],
    "Choosing h too small makes the difference dominated by rounding error; 1e-5 to 1e-6 is a good range in float64."],
];

function build() {
  return {
    id: "python-port-lessons",
    title: "Python Port lessons",
    lessons: LESSONS.map(([id, title, topics, intro, sections, takeaways, trap]) => ({
      id, title, topics, intro, takeaways, trap,
      sections: sections.map(([heading, text, code]) => {
        const s = { heading, text };
        if (code) { s.code = code; s.output = py(code.join("\n")); }
        return s;
      }),
    })),
  };
}

const json = JSON.stringify(build(), null, 2) + "\n";
if (process.argv.includes("--check")) {
  if (readFileSync(OUT, "utf8") !== json) { console.error("python-port lessons are stale: run node scripts/gen-python-lessons.mjs"); process.exit(1); }
} else {
  mkdirSync(new URL("../content/lessons/", import.meta.url), { recursive: true });
  writeFileSync(OUT, json);
  console.log(`wrote ${LESSONS.length} lessons`);
}
