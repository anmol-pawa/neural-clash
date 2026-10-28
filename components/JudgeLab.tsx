"use client";

import { useEffect, useRef, useState } from "react";
import { JudgeClient } from "@/lib/judge/client";
import type { CompileResult } from "@/lib/judge/compile";
import type { JudgeSummary, TestCase } from "@/lib/judge/verdict";

interface Preset {
  code: string;
  cases: TestCase[];
  timeLimitMs?: number;
}

const SORT = `#include <bits/stdc++.h>
using namespace std;

int main() {
    int n;
    cin >> n;
    vector<int> v(n);
    for (auto& x : v) cin >> x;
    sort(v.begin(), v.end());
    for (int x : v) cout << x << ' ';
    cout << '\\n';
}
`;
const SORT_CASES: TestCase[] = [
  { name: "three", input: "3\n3 1 2\n", expected: "1 2 3" },
  { name: "duplicates", input: "4\n2 2 1 1\n", expected: "1 1 2 2" },
  { name: "empty", input: "0\n", expected: "" },
];

const PRESETS: Record<string, Preset> = {
  "sort (accepted)": { code: SORT, cases: SORT_CASES },
  "wrong answer": { code: SORT.replace("sort(v.begin(), v.end());", "sort(v.rbegin(), v.rend());"), cases: SORT_CASES },
  "compile error": { code: SORT.replace("cout << '\\n';", "cout << y << '\\n'"), cases: SORT_CASES },
  "runtime error": { code: "#include <cassert>\nint main() { assert(2 + 2 == 5); }\n", cases: [{ name: "any", input: "", expected: "" }] },
  "infinite loop (TLE)": { code: "int main() { volatile int x = 0; for (;;) x = x + 1; }\n", cases: [{ name: "any", input: "", expected: "" }], timeLimitMs: 1000 },
  "uses exceptions": { code: "#include <bits/stdc++.h>\nint main() { throw 1; }\n", cases: [{ name: "any", input: "", expected: "" }] },
};

const COLOR: Record<string, string> = { AC: "text-emerald-300", WA: "text-red-300", RE: "text-red-300", TLE: "text-amber-300", OLE: "text-amber-300" };

export default function JudgeLab() {
  const client = useRef<JudgeClient | null>(null);
  const [preset, setPreset] = useState("sort (accepted)");
  const [code, setCode] = useState(PRESETS["sort (accepted)"].code);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<[number, number] | null>(null);
  const [ready, setReady] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const [compile, setCompile] = useState<CompileResult | null>(null);
  const [summary, setSummary] = useState<JudgeSummary | null>(null);
  const [limit, setLimit] = useState(2000);

  useEffect(() => {
    client.current = new JudgeClient({ onProgress: (d, t) => setProgress([d, t]) });
    return () => client.current?.dispose();
  }, []);

  useEffect(() => {
    client.current?.setTimeLimit(limit);
  }, [limit]);

  const load = async () => {
    setBusy(true);
    setProblem(null);
    try {
      await client.current!.ensureReady();
      setReady(true);
    } catch (e) {
      setProblem(String(e instanceof Error ? e.message : e));
    }
    setBusy(false);
  };

  const submit = async () => {
    setBusy(true);
    setProblem(null);
    setCompile(null);
    setSummary(null);
    try {
      const r = await client.current!.judge(code, PRESETS[preset].cases);
      setReady(true);
      setCompile(r.compile);
      setSummary(r.summary ?? null);
    } catch (e) {
      setProblem(String(e instanceof Error ? e.message : e));
    }
    setBusy(false);
  };

  const pick = (name: string) => {
    setPreset(name);
    setCode(PRESETS[name].code);
    setLimit(PRESETS[name].timeLimitMs ?? 2000);
    setCompile(null);
    setSummary(null);
    setProblem(null);
  };

  const mb = (n: number) => (n / 1e6).toFixed(0);
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-4 px-4 py-6" data-testid="judge-lab">
      <h1 className="font-display text-3xl text-[var(--accent)]">C++ judge</h1>
      <p className="text-sm text-white/60">Dev page. clang++ (C++20, no exceptions) compiles to WebAssembly in a worker; each test runs in its own worker with a hard time limit.</p>

      <div className="flex flex-wrap gap-2">
        {Object.keys(PRESETS).map((n) => (
          <button key={n} type="button" className={`px-btn min-h-11 px-3 ${n === preset ? "px-btn-primary" : ""}`} onClick={() => pick(n)}>
            {n}
          </button>
        ))}
      </div>

      <label className="text-xs text-white/60" htmlFor="code">main.cpp</label>
      <textarea id="code" className="panel min-h-56 w-full resize-y p-2 font-mono text-sm" value={code} onChange={(e) => setCode(e.target.value)} spellCheck={false} />

      <div className="flex flex-wrap items-center gap-2">
        <button type="button" className="px-btn min-h-11 px-4" onClick={load} disabled={busy || ready}>Load compiler</button>
        <button type="button" className="px-btn px-btn-primary min-h-11 px-4" onClick={submit} disabled={busy}>{busy ? "Working…" : "Submit"}</button>
        <span className="text-xs text-white/50">time limit {limit} ms per case</span>
      </div>

      <div className="panel p-3 text-xs" data-testid="stages">
        {ready ? <span data-testid="ready">compiler ready</span> : progress ? `downloading toolchain ${mb(progress[0])} / ${mb(progress[1])} MB` : "not loaded (about 100 MB on first use, then cached for offline)"}
      </div>

      {problem && <div className="panel border-red-400 p-3 text-sm text-red-300" role="alert" data-testid="problem">{problem}</div>}

      {compile && !compile.ok && (
        <div className="panel p-3 text-sm" data-testid="compile-error">
          <div className="text-red-300">Compile Error · {compile.ms} ms</div>
          {compile.diagnostics.filter((d) => d.severity === "error").map((d, i) => (
            <div key={i} className="mt-2">
              <div className="break-words font-mono text-xs">line {d.line}:{d.column} {d.message}</div>
              {d.snippet && <pre className="overflow-x-auto font-mono text-xs text-white/70">{d.snippet}</pre>}
              {d.hint && <div className="mt-1 text-xs text-amber-200">Hint: {d.hint}</div>}
            </div>
          ))}
        </div>
      )}

      {summary && (
        <div className="panel p-3 text-sm" data-testid="verdict">
          <div className={COLOR[summary.verdict]}>
            <span data-testid="overall">{summary.verdict}</span> · {summary.passed}/{summary.total} cases
            {compile?.ok && <span className="text-white/50"> · compiled in {compile.ms} ms</span>}
          </div>
          <ul className="mt-2 space-y-1" data-testid="cases">
            {summary.cases.map((c) => (
              <li key={c.name} className={COLOR[c.verdict]}>
                {c.verdict} {c.name} <span className="text-white/50">{c.ms} ms</span> {c.detail && <span className="break-words text-white/60">{c.detail}</span>}
              </li>
            ))}
          </ul>
        </div>
      )}
    </main>
  );
}
