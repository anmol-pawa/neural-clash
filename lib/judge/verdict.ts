import type { RunOutcome } from "./wasi";

export type CompareMode = "lines" | "tokens" | "float";
export interface TestCase {
  name: string;
  input: string;
  expected: string;
}
export type Verdict = "AC" | "WA" | "RE" | "TLE" | "OLE";
export interface CaseResult {
  name: string;
  verdict: Verdict;
  ms: number;
  /** first difference or failure reason, for the Debrief */
  detail?: string;
}
export interface JudgeSummary {
  verdict: Verdict;
  passed: number;
  total: number;
  cases: CaseResult[];
}

const trimEnds = (s: string) => s.replace(/[ \t\r]+$/gm, "").replace(/\s+$/, "");

/** Returns null when the output is accepted, else a short reason. */
export function compareOutput(actual: string, expected: string, mode: CompareMode = "lines", eps = 1e-6): string | null {
  if (mode === "lines") {
    const a = trimEnds(actual).split("\n");
    const e = trimEnds(expected).split("\n");
    for (let i = 0; i < Math.max(a.length, e.length); i++) {
      if (a[i] !== e[i]) return `line ${i + 1}: expected ${show(e[i])}, got ${show(a[i])}`;
    }
    return null;
  }
  const a = actual.split(/\s+/).filter(Boolean);
  const e = expected.split(/\s+/).filter(Boolean);
  for (let i = 0; i < Math.max(a.length, e.length); i++) {
    if (a[i] === e[i]) continue;
    if (mode === "float" && a[i] !== undefined && e[i] !== undefined) {
      const x = Number(a[i]);
      const y = Number(e[i]);
      if (Number.isFinite(x) && Number.isFinite(y) && Math.abs(x - y) <= eps * Math.max(1, Math.abs(y))) continue;
    }
    return `token ${i + 1}: expected ${show(e[i])}, got ${show(a[i])}`;
  }
  return null;
}

const show = (s: string | undefined) => (s === undefined ? "nothing" : JSON.stringify(s.length > 60 ? s.slice(0, 57) + "…" : s));

export type Runner = (input: string) => Promise<RunOutcome | { kind: "timeout"; ms: number }>;

export function classify(o: Awaited<ReturnType<Runner>>, expected: string, mode: CompareMode, eps?: number): { verdict: Verdict; detail?: string } {
  switch (o.kind) {
    case "timeout":
      return { verdict: "TLE", detail: `stopped after ${o.ms} ms` };
    case "output-limit":
      return { verdict: "OLE", detail: "printed far more output than any correct answer needs" };
    case "trap":
      return { verdict: "RE", detail: /unreachable/.test(o.message) ? "the program aborted (assert failed, out of memory, or an unreachable branch)" : /memory access out of bounds/.test(o.message) ? "memory access out of bounds (bad index or dangling pointer)" : /call stack/i.test(o.message) ? "stack overflow (recursion too deep)" : o.message };
    case "exit": {
      if (o.code !== 0) return { verdict: "RE", detail: `exited with code ${o.code}${o.stderr ? `: ${o.stderr.trim().slice(0, 120)}` : ""}` };
      const diff = compareOutput(o.stdout, expected, mode, eps);
      return diff ? { verdict: "WA", detail: diff } : { verdict: "AC" };
    }
  }
}

/** Runs every case (stopping at nothing: the Debrief wants all of them) and summarises. */
export async function judgeCases(run: Runner, cases: TestCase[], mode: CompareMode = "lines", eps?: number): Promise<JudgeSummary> {
  const results: CaseResult[] = [];
  for (const c of cases) {
    const o = await run(c.input);
    results.push({ name: c.name, ms: o.ms, ...classify(o, c.expected, mode, eps) });
  }
  const failing = results.find((r) => r.verdict !== "AC");
  return { verdict: failing?.verdict ?? "AC", passed: results.filter((r) => r.verdict === "AC").length, total: results.length, cases: results };
}
