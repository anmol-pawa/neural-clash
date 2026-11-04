import type { CppTask, PythonTask } from "@/lib/editor/tasks";
import { pythonCaseTests } from "./pyTests";
import type { TestCase } from "@/lib/judge/verdict";
import { DOJO_PROBLEMS } from "./problems.gen";

export interface Strategy {
  question: string;
  options: string[];
  answer: number;
  why: string;
}

/** A Code Dojo problem as bundled by scripts/gen-problems.mjs (no reference solution, no wrong versions). */
export interface DojoProblem {
  id: string;
  title: string;
  difficulty: "E" | "M" | "H";
  tags: string[];
  similar: string;
  timeLimitMs: number;
  complexity: { time: string; space: string };
  hints: string[];
  strategy: Strategy;
  statement: string;
  editorial: string;
  starter: string;
  /** present when the problem also has a Python variant: `solve(text: str) -> str` */
  starterPy?: string;
  sample: TestCase[];
  hidden: TestCase[];
}

const RANK = { E: 0, M: 1, H: 2 } as const;

/** The ladder: easiest first, then by title so the order is stable. */
export const ladder = (problems: readonly DojoProblem[]): DojoProblem[] =>
  [...problems].sort((a, b) => RANK[a.difficulty] - RANK[b.difficulty] || a.title.localeCompare(b.title));

export const dojoProblems = (): DojoProblem[] => ladder(DOJO_PROBLEMS);
export const dojoProblem = (id: string): DojoProblem | undefined => DOJO_PROBLEMS.find((p) => p.id === id);

export function toTask(p: DojoProblem): CppTask {
  return {
    kind: "cpp",
    key: `dojo-${p.id}`,
    title: p.title,
    brief: `${p.title} (${p.difficulty}). Read stdin, print to stdout.`,
    starter: { "main.cpp": p.starter },
    entry: "main.cpp",
    sample: p.sample,
    hidden: p.hidden,
    timeLimitMs: p.timeLimitMs,
  };
}

export const hasPython = (p: DojoProblem): boolean => typeof p.starterPy === "string";

/** The Python variant: same cases as the C++ judge, run as `solve(text) -> str` in Pyodide. */
export function toPythonTask(p: DojoProblem): PythonTask {
  return {
    kind: "python",
    key: `dojo-py-${p.id}`,
    title: `${p.title} (Python)`,
    brief: `${p.title} (${p.difficulty}). Implement solve(text) -> str: text is the whole stdin, return the stdout text.`,
    starter: { "main.py": p.starterPy ?? "" },
    entry: "main.py",
    visibleTests: pythonCaseTests(p.sample),
    hiddenTests: pythonCaseTests(p.hidden),
  };
}
