import type { TestResult } from "@/lib/py/core";

export interface GradDiff {
  relError: number;
  tol: number;
}

export interface TestRow {
  name: string;
  title: string;
  ok: boolean;
  hidden: boolean;
  message: string;
  line?: number;
  grad?: GradDiff;
}

export interface TestReport {
  rows: TestRow[];
  passed: number;
  total: number;
  allPassed: boolean;
  /** the first failing visible row, else the first failing row */
  focus?: TestRow;
}

const GRAD_RE = /gradient check failed: relative error ([0-9.eE+-]+) > ([0-9.eE+-]+)/;

export function parseGradDiff(message: string): GradDiff | undefined {
  const m = GRAD_RE.exec(message);
  return m ? { relError: Number(m[1]), tol: Number(m[2]) } : undefined;
}

const title = (name: string) => name.replace(/^test_/, "").replace(/^hidden_/, "").replace(/_/g, " ");

/**
 * Turns raw test results into rows for the panel. Tests named `test_hidden_*` are hidden:
 * the player sees pass/fail and a hint, never the failing values (so they cannot be read off).
 */
export function buildReport(results: TestResult[]): TestReport {
  const rows: TestRow[] = results.map((r, i) => {
    const hidden = r.name.startsWith("test_hidden_");
    return {
      name: r.name,
      title: hidden ? `hidden check ${i + 1}` : title(r.name),
      ok: r.ok,
      hidden,
      message: r.ok ? "" : hidden ? "A hidden check failed. Re-read the spec and try other inputs." : r.message,
      line: hidden ? undefined : r.line,
      grad: r.ok || hidden ? undefined : parseGradDiff(r.message),
    };
  });
  const passed = rows.filter((r) => r.ok).length;
  const failing = rows.filter((r) => !r.ok);
  return {
    rows,
    passed,
    total: rows.length,
    allPassed: rows.length > 0 && passed === rows.length,
    focus: failing.find((r) => !r.hidden) ?? failing[0],
  };
}

/** A one-line log-scale gauge for a gradient check, e.g. `1e-9 ▕██·····▏ tol 1e-6`. */
export function gradGauge(g: GradDiff, width = 12): string {
  const lo = -12;
  const hi = 0;
  const pos = (v: number) => Math.round(((Math.min(hi, Math.max(lo, Math.log10(Math.max(v, 1e-300)))) - lo) / (hi - lo)) * width);
  const e = pos(g.relError);
  const t = pos(g.tol);
  let bar = "";
  for (let i = 0; i < width; i++) bar += i === t ? "|" : i < e ? "#" : ".";
  return `[${bar}] err ${g.relError.toExponential(1)} (limit ${g.tol.toExponential(0)})`;
}

export interface CppCaseRow {
  title: string;
  verdict: string;
  ms: number;
  hidden: boolean;
  detail?: string;
}

/** Sample cases show their first difference; hidden cases only show the verdict, so inputs cannot be read off. */
export function buildCppRows(sample: { name: string; verdict: string; ms: number; detail?: string }[], hidden: { verdict: string; ms: number }[]): CppCaseRow[] {
  return [
    ...sample.map((c) => ({ title: c.name, verdict: c.verdict, ms: c.ms, hidden: false, detail: c.detail })),
    ...hidden.map((c, i) => ({
      title: `hidden check ${i + 1}`,
      verdict: c.verdict,
      ms: c.ms,
      hidden: true,
      detail: c.verdict === "AC" ? undefined : "A hidden check failed. Re-read the statement and try other inputs.",
    })),
  ];
}
