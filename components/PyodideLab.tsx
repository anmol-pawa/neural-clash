"use client";

import { useEffect, useRef, useState } from "react";
import { PyClient, PyTimeoutError } from "@/lib/py/client";
import type { RunResult } from "@/lib/py/core";

const PRESETS: Record<string, { code: string; tests?: string; timeout?: number }> = {
  hello: { code: "import numpy as np\nx = np.linspace(0, 1, 5)\nprint('numpy', np.__version__)\nprint(x ** 2)" },
  "gradient check": {
    code: "import numpy as np\n\ndef sigmoid(x):\n    return 1 / (1 + np.exp(-x))\n\ndef sigmoid_grad(x):\n    s = sigmoid(x)\n    return s * (1 - s)\n",
    tests:
      "import numpy as np\nfrom nc_test import grad_check\n\ndef test_sigmoid_grad():\n    x = np.array([-2.0, 0.3, 1.5])\n    err = grad_check(lambda v: float(np.sum(sigmoid(v))), x, sigmoid_grad(x))\n    print('relative error', err)\n",
  },
  "wrong gradient": {
    code: "import numpy as np\n\ndef f(x):\n    return float(np.sum(x ** 2))\n\ndef grad(x):\n    return x  # forgot the factor 2\n",
    tests: "import numpy as np\nfrom nc_test import grad_check\n\ndef test_grad():\n    x = np.array([1.0, -2.0])\n    grad_check(f, x, grad(x))\n",
  },
  "infinite loop (timeout)": { code: "while True:\n    pass\n", timeout: 2000 },
  "memory bomb": { code: "import numpy as np\nnp.zeros((100000, 100000))" },
};

export default function PyodideLab() {
  const client = useRef<PyClient | null>(null);
  const t0 = useRef(0);
  const [stages, setStages] = useState<string[]>([]);
  const [preset, setPreset] = useState("hello");
  const [code, setCode] = useState(PRESETS.hello.code);
  const [tests, setTests] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<RunResult | null>(null);
  const [problem, setProblem] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    client.current = new PyClient({ onStage: (s, ms) => setStages((l) => [...l, `${s} (${ms} ms)`]) });
    return () => client.current?.dispose();
  }, []);

  const load = async () => {
    setBusy(true);
    setProblem(null);
    t0.current = performance.now();
    try {
      await client.current!.ensureReady();
      setReady(true);
    } catch (e) {
      setProblem(String(e instanceof Error ? e.message : e));
    }
    setBusy(false);
  };

  const run = async () => {
    setBusy(true);
    setProblem(null);
    setResult(null);
    try {
      const r = await client.current!.run({ code, tests }, PRESETS[preset]?.timeout);
      setResult(r);
      setReady(true);
    } catch (e) {
      setProblem(e instanceof PyTimeoutError ? e.message : String(e instanceof Error ? e.message : e));
      setReady(false); // the worker was terminated; the next run respawns it
    }
    setBusy(false);
  };

  const pick = (name: string) => {
    setPreset(name);
    setCode(PRESETS[name].code);
    setTests(PRESETS[name].tests ?? "");
    setResult(null);
    setProblem(null);
  };

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-4 px-4 py-6" data-testid="pyodide-lab">
      <h1 className="font-display text-3xl text-[var(--accent)]">Pyodide runtime</h1>
      <p className="text-sm text-white/60">Dev page. Python runs in a worker with a timeout; stuck code is terminated and the worker respawns on the next run.</p>

      <div className="flex flex-wrap gap-2">
        {Object.keys(PRESETS).map((n) => (
          <button key={n} type="button" className={`px-btn min-h-11 px-3 ${n === preset ? "px-btn-primary" : ""}`} onClick={() => pick(n)}>
            {n}
          </button>
        ))}
      </div>

      <label className="text-xs text-white/60" htmlFor="code">Code</label>
      <textarea id="code" className="panel min-h-32 w-full resize-y p-2 font-mono text-sm" value={code} onChange={(e) => setCode(e.target.value)} spellCheck={false} />
      <label className="text-xs text-white/60" htmlFor="tests">Tests (optional, test_* functions)</label>
      <textarea id="tests" className="panel min-h-20 w-full resize-y p-2 font-mono text-sm" value={tests} onChange={(e) => setTests(e.target.value)} spellCheck={false} />

      <div className="flex gap-2">
        <button type="button" className="px-btn min-h-11 px-4" onClick={load} disabled={busy || ready}>Load runtime</button>
        <button type="button" className="px-btn px-btn-primary min-h-11 px-4" onClick={run} disabled={busy}>{busy ? "Working…" : "Run"}</button>
      </div>

      <div className="panel p-3 text-xs" data-testid="stages">
        <div className="mb-1 text-white/50">Load stages {ready && <span data-testid="ready">· ready</span>}</div>
        {stages.length === 0 ? <div className="text-white/40">not loaded</div> : stages.map((s, i) => <div key={i}>{s}</div>)}
      </div>

      {problem && <div className="panel border-red-400 p-3 text-sm text-red-300" role="alert" data-testid="problem">{problem}</div>}
      {result && (
        <div className="panel p-3 text-sm" data-testid="result">
          <div className={result.ok ? "text-emerald-300" : "text-red-300"}>{result.ok ? "OK" : "Failed"} · {result.ms} ms</div>
          {result.stdout && <pre className="mt-2 whitespace-pre-wrap break-words font-mono text-xs" data-testid="stdout">{result.stdout}</pre>}
          {result.error && <pre className="mt-2 whitespace-pre-wrap break-words font-mono text-xs text-red-300" data-testid="error">{result.error}{result.errorLine ? ` (line ${result.errorLine})` : ""}</pre>}
          <ul className="mt-2 space-y-1" data-testid="tests">
            {result.tests.map((t) => (
              <li key={t.name} className={t.ok ? "text-emerald-300" : "text-red-300"}>{t.ok ? "✓" : "✗"} {t.name} {t.message && <span className="break-words text-white/60">{t.message}</span>}</li>
            ))}
          </ul>
        </div>
      )}
    </main>
  );
}
