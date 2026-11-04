"use client";

import Link from "next/link";
import { useEffect, useMemo, useReducer, useRef, useState } from "react";
import EditorWorkbench from "@/components/EditorWorkbench";
import { dojoProblem, hasPython, toPythonTask, toTask } from "@/lib/dojo/catalog";
import { MAX_HEARTS, grade, initial, step, type Phase } from "@/lib/dojo/dojo";
import { buyHint, hintCost, payReward } from "@/lib/economy/economy";
import { review } from "@/lib/srs/srs";
import { problemKey } from "@/lib/sync/sync";
import { getSaveManager, useSave } from "@/lib/save/react";

const PHASES: { id: Phase; label: string }[] = [
  { id: "scout", label: "Scout" },
  { id: "strategise", label: "Strategise" },
  { id: "code", label: "Code + Judge" },
  { id: "debrief", label: "Debrief" },
];

/** Statement / editorial markdown-lite: fenced code, paragraphs, `code` and **bold**. */
function Md({ text }: { text: string }) {
  const parts = text.replace(/^# .*\n/, "").trim().split(/```[a-z]*\n?/);
  return (
    <div className="grid gap-2 text-sm leading-relaxed text-slate-300">
      {parts.map((chunk, i) =>
        i % 2 ? (
          <pre key={i} className="overflow-x-auto rounded bg-black/50 p-2 text-xs text-indigo-100">{chunk.trimEnd()}</pre>
        ) : (
          chunk.trim().split(/\n\s*\n/).filter(Boolean).map((p, j) => (
            <p key={`${i}-${j}`}>
              {p.replace(/\n/g, " ").split("`").map((seg, k) => (k % 2 ? <code key={k} className="rounded bg-black/50 px-1 text-indigo-200">{seg}</code> : seg.replace(/\*+/g, "")))}
            </p>
          ))
        ),
      )}
    </div>
  );
}

function Hints({ hints, onTake }: { hints: string[]; onTake: () => void }) {
  const save = useSave();
  const [shown, setShown] = useState(0);
  const [msg, setMsg] = useState("");
  const cost = hintCost(save.mode, shown);
  if (cost === null) return <p className="text-xs text-white/60" data-testid="dojo-hints-off">Interview mode: no hints, like the real round.</p>;
  const take = () => {
    const r = buyHint(save.wallet, save.mode, shown);
    if (!r.ok) { setMsg(`Not enough Bits (need ${r.cost}).`); return; }
    getSaveManager().update((s) => ({ ...s, wallet: r.wallet, updatedAt: Date.now() }));
    onTake();
    setMsg("");
    setShown(shown + 1);
  };
  return (
    <div className="grid gap-1 text-sm" data-testid="dojo-hints">
      {hints.slice(0, shown).map((h, i) => <p key={i} className="rounded bg-black/40 p-2 text-amber-100">Hint {i + 1}: {h}</p>)}
      {shown < hints.length && (
        <button type="button" className="px-btn min-h-11 px-3 py-1" onClick={take} data-testid="dojo-hint">
          Hint {shown + 1} ({cost === 0 ? "free" : `${cost} Bits`}, marks this attempt assisted)
        </button>
      )}
      {msg && <p className="text-xs text-amber-300">{msg}</p>}
    </div>
  );
}

export default function Dojo({ id }: { id: string }) {
  const problem = dojoProblem(id)!;
  const [s, dispatch] = useReducer(step, undefined, initial);
  const [pick, setPick] = useState<number | null>(null);
  const paid = useRef(false);
  // C++ is the default (GDD §5.6); a Python variant exists for core problems. The choice is locked once the code phase starts.
  const [lang, setLang] = useState<"cpp" | "python">("cpp");
  const task = useMemo(() => (lang === "python" ? toPythonTask(problem) : toTask(problem)), [lang, problem]);

  // record the clear + Bits once, on the transition into a solved debrief
  useEffect(() => {
    if (!s.solved || paid.current) return;
    paid.current = true;
    const key = `dojo:${id}`;
    getSaveManager().update((st) => {
      const base = { ...st, cleared: st.cleared.includes(key) ? st.cleared : [...st.cleared, key], updatedAt: Date.now() };
      // spaced mastery: only an unaided solve counts (assisted reviews are ignored by `review`)
      const srs = review(base.srs, problemKey(id), { correct: true, assisted: s.assisted }, Date.now());
      return payReward({ ...base, srs }, "problem", id, s.assisted).state;
    });
  }, [s.solved, s.assisted, id]);

  const phaseIdx = PHASES.findIndex((p) => p.id === s.phase);
  const g = grade(s);
  const gradeText = { clean: "Clean: planned right and solved without a miss.", good: "Solved, with some misses on the way.", assisted: "Solved with help (a hint or a retry). Redo it unaided to bank the mastery.", unsolved: "Out of hearts." }[g];

  return (
    <main className="mx-auto grid w-full max-w-3xl gap-3 p-3" data-testid="dojo">
      <header className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="font-display text-lg">{problem.title} <span className="text-xs text-white/60">{problem.difficulty} · {problem.tags.join(", ")}</span></h1>
        <span aria-label={`${s.hearts} of ${MAX_HEARTS} hearts`} data-testid="dojo-hearts" className="text-lg">
          {Array.from({ length: MAX_HEARTS }, (_, i) => (i < s.hearts ? "♥" : "♡")).join(" ")}
        </span>
      </header>
      <ol className="flex flex-wrap gap-1 text-xs" aria-label="Battle phases">
        {PHASES.map((p, i) => (
          <li key={p.id} aria-current={i === phaseIdx ? "step" : undefined} className={`rounded px-2 py-1 ${i === phaseIdx ? "bg-[var(--accent)]/25 text-[var(--accent)]" : i < phaseIdx ? "text-emerald-300" : "text-white/40"}`}>
            {i + 1}. {p.label}
          </li>
        ))}
      </ol>

      {s.phase === "scout" && (
        <section className="panel grid gap-3 p-3" data-testid="dojo-scout">
          <Md text={problem.statement} />
          <p className="text-xs text-white/60">Limits matter: read them before you choose a plan. Similar to {problem.similar}.</p>
          {hasPython(problem) && (
            <div className="grid gap-1 text-sm" role="group" aria-label="Language" data-testid="dojo-lang">
              <div className="flex gap-2">
                {(["cpp", "python"] as const).map((l) => (
                  <button key={l} type="button" aria-pressed={lang === l} data-testid={`dojo-lang-${l}`} onClick={() => setLang(l)}
                    className={`px-btn min-h-11 px-4 py-2 ${lang === l ? "outline outline-2 outline-[var(--accent)]" : ""}`}>
                    {l === "cpp" ? "C++ (default)" : "Python"}
                  </button>
                ))}
              </div>
              <p className="text-xs text-white/60">
                {lang === "cpp"
                  ? "C++ is what most coding rounds expect, and it runs on the real clang judge."
                  : "Python: write solve(text) -> str (text is the whole input, return the output). It runs in Pyodide, with a 3 s limit per case. Interviews usually let you pick; C++ is the better habit for DSA."}
              </p>
            </div>
          )}
          <button type="button" className="px-btn min-h-11 px-4 py-2" onClick={() => dispatch({ type: "scouted" })} data-testid="dojo-scouted">I have read it. Choose a plan</button>
        </section>
      )}

      {s.phase === "strategise" && (
        <section className="panel grid gap-2 p-3" data-testid="dojo-strategise">
          <p className="text-sm">{problem.strategy.question}</p>
          {problem.strategy.options.map((o, i) => (
            <button key={i} type="button" className={`px-btn min-h-11 px-3 py-2 text-left text-sm ${pick === i ? "outline outline-2 outline-red-400" : ""}`} data-testid={`dojo-plan-${i}`}
              onClick={() => { const correct = i === problem.strategy.answer; setPick(i); dispatch({ type: "plan", correct }); }}>
              {o}
            </button>
          ))}
          {s.planMisses > 0 && <p className="text-sm text-amber-300" data-testid="dojo-plan-miss">Not that one. Re-check the limits and the tie rule, then pick again.</p>}
        </section>
      )}

      {s.phase === "code" && (
        <>
          <details className="panel p-3 text-sm"><summary className="min-h-11 cursor-pointer py-2">Statement</summary><Md text={problem.statement} /></details>
          <Hints hints={problem.hints} onTake={() => dispatch({ type: "hint" })} />
          <EditorWorkbench key={task.key} task={task} hideHeader onResult={(r) => {
            if (r.mode !== "submit") return;
            const verdict = r.verdict ?? (r.allPassed ? "AC" : "WA");
            dispatch({ type: "submit", verdict: verdict as "AC" });
          }} />
          <p className="text-xs text-white/60">Run checks the sample. Submit runs the hidden tests and costs a heart on a wrong verdict (compile errors are free).</p>
        </>
      )}

      {s.phase === "debrief" && (
        <section className="panel grid gap-3 p-3" data-testid="dojo-debrief">
          <h2 className="font-display text-lg" data-testid="dojo-grade">{s.solved ? "Accepted" : "Defeated"}: {gradeText}</h2>
          <p className="text-sm text-slate-300">Target complexity: time {problem.complexity.time}, space {problem.complexity.space}. {problem.strategy.why}</p>
          <details open className="text-sm"><summary className="min-h-11 cursor-pointer py-2">Editorial</summary><Md text={problem.editorial} /></details>
          <div className="flex flex-wrap gap-2">
            {!s.solved && <button type="button" className="px-btn min-h-11 px-4 py-2" onClick={() => dispatch({ type: "retry" })} data-testid="dojo-retry">Try again (counts as assisted)</button>}
            <Link href="/dojo" className="px-btn flex min-h-11 items-center px-4 py-2">All problems</Link>
          </div>
        </section>
      )}
    </main>
  );
}
