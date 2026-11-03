import type { CppTask } from "@/lib/editor/tasks";
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
  sample: TestCase[];
  hidden: TestCase[];
}

export const dojoProblems = (): DojoProblem[] => DOJO_PROBLEMS;
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
