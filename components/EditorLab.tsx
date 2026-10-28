"use client";

import { useState } from "react";
import EditorWorkbench from "@/components/EditorWorkbench";
import { SIGMOID_TASK, SORT_TASK } from "@/lib/editor/samples";

const TASKS = [SIGMOID_TASK, SORT_TASK];

export default function EditorLab() {
  const [i, setI] = useState(0);
  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-4 px-4 py-6" data-testid="editor-lab">
      <h1 className="font-display text-3xl text-[var(--accent)]">Code editor</h1>
      <p className="text-sm text-white/60">Dev page. A multi-file CodeMirror workbench: Python runs in Pyodide with finite-difference checks, C++ is judged by the in-browser clang. Drafts autosave to this browser.</p>
      <div className="flex gap-2">
        {TASKS.map((t, n) => (
          <button key={t.key} type="button" className={`px-btn min-h-11 px-3 ${n === i ? "px-btn-primary" : ""}`} onClick={() => setI(n)}>
            {t.kind === "python" ? "Python task" : "C++ task"}
          </button>
        ))}
      </div>
      <EditorWorkbench key={TASKS[i].key} task={TASKS[i]} />
    </main>
  );
}
