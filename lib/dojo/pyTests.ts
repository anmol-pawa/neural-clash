import type { TestCase } from "@/lib/judge/verdict";

/** Per-case wall-clock limit for the Python variant (Pyodide is slower than the clang judge). */
export const PY_LIMIT_MS = 3000;

const lit = (s: string) => JSON.stringify(s);

/**
 * nc_test source for a Dojo problem's Python variant. The player writes `solve(text: str) -> str`
 * (the exact stdin text in, the stdout text out); each case is one test, compared token by token,
 * with a wall-clock check so a quadratic solution fails the perf case instead of hanging the tab.
 */
export function pythonCaseTests(cases: TestCase[], limitMs = PY_LIMIT_MS): string {
  const lines = [
    "import time",
    "",
    "def _same(a, b):",
    "    return a.split() == b.split()",
    "",
    "def _case(text, expected):",
    "    start = time.perf_counter()",
    "    got = solve(text)",
    "    ms = (time.perf_counter() - start) * 1000",
    "    assert isinstance(got, str), f'solve must return a str, got {type(got).__name__}'",
    "    assert _same(got, expected), f'expected {expected.strip()!r}, got {got.strip()[:60]!r}'",
    `    assert ms <= ${limitMs}, f'Time limit exceeded: {ms:.0f} ms (limit ${limitMs} ms)'`,
    "",
  ];
  cases.forEach((c, i) => {
    const name = c.name.replace(/[^A-Za-z0-9]+/g, "_").replace(/^_|_$/g, "") || `case_${i}`;
    lines.push(`def test_${name}_${i}():`, `    _case(${lit(c.input)}, ${lit(c.expected)})`, "");
  });
  return lines.join("\n");
}
