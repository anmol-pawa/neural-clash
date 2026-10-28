"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import CodeEditor from "@/components/CodeEditor";
import { PyClient, PyTimeoutError } from "@/lib/py/client";
import { JudgeClient } from "@/lib/judge/client";
import type { Diagnostic } from "@/lib/judge/diagnostics";
import { Workspace, type TreeNode } from "@/lib/editor/workspace";
import { createAutosave, defaultDraftStore } from "@/lib/editor/drafts";
import { buildCppRows, buildReport, gradGauge, type CppCaseRow, type TestReport } from "@/lib/editor/results";
import { playerPackage, type EditorTask } from "@/lib/editor/tasks";

type Mode = "run" | "submit";

type Outcome =
  | { kind: "py"; report: TestReport; stdout: string; error?: string; errorLine?: number; ms: number; mode: Mode }
  | { kind: "cpp"; rows: CppCaseRow[]; verdict: string; compileMs: number; mode: Mode }
  | { kind: "ce"; diagnostics: Diagnostic[]; errorLine?: number }
  | { kind: "problem"; message: string };

const VERDICT_COLOR: Record<string, string> = { AC: "text-emerald-300", WA: "text-red-300", RE: "text-red-300", TLE: "text-amber-300", OLE: "text-amber-300" };

function FileTree({ nodes, active, dirty, onOpen, depth = 0 }: { nodes: TreeNode[]; active: string; dirty: (p: string) => boolean; onOpen: (p: string) => void; depth?: number }) {
  return (
    <ul>
      {nodes.map((n) => (
        <li key={n.path}>
          {n.kind === "dir" ? (
            <>
              <div className="px-2 py-1 text-xs text-white/50" style={{ paddingLeft: 8 + depth * 12 }}>▾ {n.name}/</div>
              <FileTree nodes={n.children ?? []} active={active} dirty={dirty} onOpen={onOpen} depth={depth + 1} />
            </>
          ) : (
            <button
              type="button"
              className={`flex min-h-11 w-full items-center gap-1 px-2 text-left text-sm ${n.path === active ? "bg-[var(--accent)]/15 text-[var(--accent)]" : "text-white/80 hover:bg-white/5"}`}
              style={{ paddingLeft: 8 + depth * 12 }}
              onClick={() => onOpen(n.path)}
              data-testid={`file-${n.path}`}
            >
              {n.name}
              {dirty(n.path) && <span aria-label="modified" className="text-amber-300">●</span>}
            </button>
          )}
        </li>
      ))}
    </ul>
  );
}

export default function EditorWorkbench({ task }: { task: EditorTask }) {
  const [ws, setWs] = useState(() => Workspace.fromStarter(task.starter));
  const [active, setActive] = useState(task.entry);
  const [tabs, setTabs] = useState<string[]>([task.entry]);
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const [newName, setNewName] = useState<string | null>(null);
  const [nameError, setNameError] = useState<string | null>(null);
  const py = useRef<PyClient | null>(null);
  const judge = useRef<JudgeClient | null>(null);
  const store = useMemo(() => defaultDraftStore(), []);
  const autosave = useMemo(() => createAutosave(store, task.key), [store, task.key]);

  // restore the draft for this task
  useEffect(() => {
    let live = true;
    store.load(task.key).then((draft) => {
      if (!live) return;
      const restored = Workspace.restore(task.starter, draft);
      setWs(restored);
      const entry = restored.paths.includes(task.entry) ? task.entry : (restored.paths[0] ?? task.entry);
      setActive(entry);
      setTabs([entry]);
      setLoaded(true);
    }).catch(() => live && setLoaded(true));
    return () => {
      live = false;
      void autosave.flush();
      py.current?.dispose();
      judge.current?.dispose();
    };
  }, [store, task, autosave]);

  const edit = useCallback((next: Workspace) => {
    setWs(next);
    autosave.schedule({ ...next.files });
  }, [autosave]);

  const onType = (text: string) => {
    if (ws.files[active] === text) return;
    edit(ws.update(active, text));
  };

  const open = (p: string) => {
    setActive(p);
    setTabs((t) => (t.includes(p) ? t : [...t, p]));
  };

  const closeTab = (p: string) => {
    const left = tabs.filter((t) => t !== p);
    setTabs(left);
    if (active === p) setActive(left[left.length - 1] ?? ws.paths.find((x) => x !== p) ?? task.entry);
  };

  const addFile = () => {
    if (newName === null) return;
    try {
      edit(ws.create(newName.trim()));
      open(newName.trim());
      setNewName(null);
      setNameError(null);
    } catch (e) {
      setNameError(e instanceof Error ? e.message : String(e));
    }
  };

  const removeFile = (p: string) => {
    if (p === task.entry) return;
    edit(ws.remove(p));
    setTabs((t) => t.filter((x) => x !== p));
    if (active === p) setActive(task.entry);
  };

  const resetFile = (p: string) => edit(ws.reset(p));

  const run = async (mode: Mode) => {
    setBusy(mode);
    setOutcome(null);
    await autosave.flush();
    try {
      if (task.kind === "python") {
        py.current ??= new PyClient();
        await py.current.mountPackage("player", playerPackage(task, ws.files));
        const tests = mode === "run" ? task.visibleTests : `${task.visibleTests}\n${task.hiddenTests}`;
        const r = await py.current.run({ code: ws.files[task.entry] ?? "", tests });
        setOutcome({ kind: "py", report: buildReport(r.tests), stdout: r.stdout, error: r.error, errorLine: r.errorLine, ms: r.ms, mode });
        if (r.errorLine && active === task.entry) setActive(task.entry);
      } else {
        judge.current ??= new JudgeClient();
        judge.current.setTimeLimit(task.timeLimitMs ?? 2000);
        const cases = mode === "run" ? task.sample : [...task.sample, ...task.hidden];
        const r = await judge.current.judge(ws.files[task.entry] ?? "", cases);
        if (!r.compile.ok) {
          const errs = r.compile.diagnostics.filter((d) => d.severity === "error");
          setOutcome({ kind: "ce", diagnostics: errs, errorLine: errs[0]?.line });
        } else if (r.summary) {
          const n = task.sample.length;
          const rows = buildCppRows(r.summary.cases.slice(0, n), r.summary.cases.slice(n));
          setOutcome({ kind: "cpp", rows, verdict: r.summary.verdict, compileMs: r.compile.ms, mode });
        }
      }
    } catch (e) {
      const message = e instanceof PyTimeoutError ? e.message : String(e instanceof Error ? e.message : e);
      setOutcome({ kind: "problem", message });
    }
    setBusy(null);
  };

  const errorLine =
    outcome?.kind === "py" && outcome.errorLine && active === task.entry ? outcome.errorLine
    : outcome?.kind === "ce" && active === task.entry ? outcome.errorLine
    : outcome?.kind === "py" && outcome.report.focus?.line && active === task.entry ? outcome.report.focus.line
    : undefined;

  const dirty = (p: string) => ws.isDirty(p);
  const label = task.kind === "python" ? "Python" : "C++";

  return (
    <div className="flex flex-col gap-3" data-testid="workbench" data-loaded={loaded}>
      <div>
        <div className="font-display text-xl text-[var(--accent)]">{task.title}</div>
        <p className="text-sm text-white/70">{task.brief}</p>
      </div>

      <div className="panel flex min-h-[420px] flex-col overflow-hidden md:h-[460px] md:flex-row">
        <aside className="flex shrink-0 flex-col border-b border-white/10 md:w-52 md:border-b-0 md:border-r" aria-label="Files">
          <div className="flex-1 overflow-y-auto" data-testid="file-tree">
            <FileTree nodes={ws.tree()} active={active} dirty={dirty} onOpen={open} />
          </div>
          <div className="border-t border-white/10 p-2">
            {newName === null ? (
              <button type="button" className="px-btn w-full px-2 text-sm" onClick={() => setNewName("")}>+ New file</button>
            ) : (
              <form onSubmit={(e) => (e.preventDefault(), addFile())} className="flex flex-col gap-1">
                <input
                  autoFocus
                  aria-label="New file path"
                  className="min-h-11 rounded bg-black/40 px-2 text-sm"
                  placeholder={task.kind === "python" ? "utils.py" : "helper.hpp"}
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  data-testid="new-file-input"
                />
                {nameError && <span className="text-xs text-red-300" role="alert">{nameError}</span>}
                <div className="flex gap-1">
                  <button type="submit" className="px-btn flex-1 text-sm">Create</button>
                  <button type="button" className="px-btn flex-1 text-sm" onClick={() => (setNewName(null), setNameError(null))}>Cancel</button>
                </div>
              </form>
            )}
          </div>
        </aside>

        <div className="flex min-h-[300px] min-w-0 flex-1 flex-col">
          <div className="flex items-stretch overflow-x-auto border-b border-white/10 bg-black/30" role="tablist">
            {tabs.filter((t) => t in ws.files).map((t) => (
              <div key={t} className={`flex shrink-0 items-center border-r border-white/10 ${t === active ? "bg-[#0d0f22] text-[var(--accent)]" : "text-white/60"}`}>
                <button type="button" role="tab" aria-selected={t === active} className="min-h-11 px-3 text-sm" onClick={() => setActive(t)} data-testid={`tab-${t}`}>
                  {t}{dirty(t) ? " ●" : ""}
                </button>
                {tabs.length > 1 && <button type="button" aria-label={`Close ${t}`} className="min-h-11 px-2 text-white/40 hover:text-white" onClick={() => closeTab(t)}>×</button>}
              </div>
            ))}
            <div className="ml-auto flex shrink-0 items-center gap-1 px-2">
              {active !== task.entry && <button type="button" className="min-h-11 px-2 text-xs text-red-300" onClick={() => removeFile(active)}>Delete</button>}
              {dirty(active) && <button type="button" className="min-h-11 px-2 text-xs text-white/60" onClick={() => resetFile(active)}>Reset file</button>}
            </div>
          </div>
          <div className="min-h-0 flex-1">
            {ws.files[active] !== undefined && <CodeEditor path={active} value={ws.files[active]} onChange={onType} errorLine={errorLine} />}
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button type="button" className="px-btn min-h-11 px-4" onClick={() => run("run")} disabled={busy !== null || !loaded} data-testid="run">
          {busy === "run" ? "Running…" : "Run"}
        </button>
        <button type="button" className="px-btn px-btn-primary min-h-11 px-4" onClick={() => run("submit")} disabled={busy !== null || !loaded} data-testid="submit">
          {busy === "submit" ? "Judging…" : "Submit"}
        </button>
        <span className="text-xs text-white/50">{label} · Run shows the sample checks, Submit adds the hidden ones. {busy && "First run downloads the runtime, then it is cached."}</span>
      </div>

      <section className="panel p-3 text-sm" aria-live="polite" data-testid="results">
        {!outcome && <span className="text-white/50">Results appear here.</span>}
        {outcome?.kind === "problem" && <div className="break-words text-red-300" role="alert" data-testid="problem">{outcome.message}</div>}
        {outcome?.kind === "ce" && (
          <div data-testid="compile-error">
            <div className="text-red-300">Compile Error</div>
            {outcome.diagnostics.map((d, i) => (
              <div key={i} className="mt-2">
                <div className="break-words font-mono text-xs">line {d.line}:{d.column} {d.message}</div>
                {d.snippet && <pre className="overflow-x-auto font-mono text-xs text-white/70">{d.snippet}</pre>}
                {d.hint && <div className="mt-1 text-xs text-amber-200">Hint: {d.hint}</div>}
              </div>
            ))}
          </div>
        )}
        {outcome?.kind === "py" && (
          <div data-testid="py-results">
            {outcome.error ? (
              <div className="break-words text-red-300" data-testid="py-error">
                {outcome.error}{outcome.errorLine ? ` (line ${outcome.errorLine})` : ""}
              </div>
            ) : (
              <div className={outcome.report.allPassed ? "text-emerald-300" : "text-red-300"} data-testid="summary">
                {outcome.report.passed}/{outcome.report.total} checks passed · {outcome.ms} ms{outcome.mode === "submit" && outcome.report.allPassed ? " · accepted" : ""}
              </div>
            )}
            <ul className="mt-2 space-y-2">
              {outcome.report.rows.map((r) => (
                <li key={r.name} className={r.ok ? "text-emerald-300" : "text-red-300"}>
                  {r.ok ? "PASS" : "FAIL"} {r.title}
                  {r.message && <div className="break-words font-mono text-xs text-white/70">{r.line ? `line ${r.line}: ` : ""}{r.message}</div>}
                  {r.grad && <pre className="overflow-x-auto font-mono text-xs text-amber-200" data-testid="grad-gauge">{gradGauge(r.grad)}</pre>}
                </li>
              ))}
            </ul>
            {outcome.stdout && <pre className="mt-2 overflow-x-auto rounded bg-black/40 p-2 font-mono text-xs text-white/80" data-testid="stdout">{outcome.stdout}</pre>}
          </div>
        )}
        {outcome?.kind === "cpp" && (
          <div data-testid="cpp-results">
            <div className={VERDICT_COLOR[outcome.verdict]}>
              <span data-testid="overall">{outcome.verdict}</span> · compiled in {outcome.compileMs} ms
            </div>
            <ul className="mt-2 space-y-1">
              {outcome.rows.map((c) => (
                <li key={c.title} className={VERDICT_COLOR[c.verdict]}>
                  {c.verdict} {c.title} <span className="text-white/50">{c.ms} ms</span> {c.detail && <span className="break-words text-white/60">{c.detail}</span>}
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>
    </div>
  );
}
