"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import EditorWorkbench from "@/components/EditorWorkbench";
import { LABS, labById, labTask, labsByPhase } from "@/lib/labs/catalog";
import { getSaveManager, useSave } from "@/lib/save/react";

function Rich({ text }: { text: string }) {
  return <>{text.split("`").map((part, i) => (i % 2 ? <code key={i} className="rounded bg-black/50 px-1 text-indigo-200">{part}</code> : part.replace(/\*+/g, "")))}</>;
}

/** Lesson markdown-lite: `# ` title is dropped, blank-line separated paragraphs, `inline code` and **bold** kept simple. */
function Lesson({ text }: { text: string }) {
  const paras = text.replace(/^# .*\n/, "").trim().split(/\n\s*\n/);
  return (
    <div className="grid gap-2 text-sm leading-relaxed text-slate-300">
      {paras.map((p, i) =>
        p.startsWith("## ") ? (
          <h2 key={i} className="font-display text-lg text-white">{p.slice(3).split("\n")[0]}</h2>
        ) : (
          <p key={i}><Rich text={p.replace(/\n/g, " ")} /></p>
        ),
      )}
    </div>
  );
}

/** Hint ladder: one rung at a time, so the player chooses how much help to take. */
function Hints({ hints }: { hints: string[] }) {
  const [shown, setShown] = useState(0);
  if (!hints.length) return null;
  return (
    <div className="panel grid gap-2 p-3 text-sm" data-testid="lab-hints">
      {hints.slice(0, shown).map((h, i) => (
        <p key={i} className="text-amber-100" data-testid="lab-hint"><b>Hint {i + 1}.</b> <Rich text={h} /></p>
      ))}
      {shown < hints.length && (
        <button type="button" className="min-h-11 justify-self-start rounded border border-white/20 px-3 hover:bg-white/10" onClick={() => setShown(shown + 1)} data-testid="lab-hint-next">
          {shown === 0 ? "Need a hint?" : "Another hint"} ({shown}/{hints.length})
        </button>
      )}
    </div>
  );
}

/** Lab index at /labs and one lab at /labs#<id> (static export friendly). */
export default function Labs() {
  const save = useSave();
  const [id, setId] = useState<string | null>(null);
  useEffect(() => {
    const read = () => setId(window.location.hash.slice(1) || null);
    read();
    window.addEventListener("hashchange", read);
    return () => window.removeEventListener("hashchange", read);
  }, []);
  const lab = id ? labById(id) : undefined;

  const onResult = useCallback((labId: string, r: { mode: "run" | "submit"; allPassed: boolean }) => {
    if (r.mode !== "submit" || !r.allPassed) return;
    getSaveManager().update((s) => ({ ...s, labs: { ...s.labs, [labId]: { passed: true, assisted: s.labs[labId]?.assisted ?? false } }, updatedAt: Date.now() }));
  }, []);

  const solved = LABS.filter((l) => save.labs[l.id]?.passed).length;

  return (
    <main className="mx-auto grid max-w-5xl gap-4 px-4 py-6" data-testid="labs">
      <nav className="flex items-center justify-between text-sm">
        <Link href="/" className="underline inline-flex min-h-11 items-center">Title</Link>
        {lab ? <a href="#" className="underline inline-flex min-h-11 items-center" onClick={() => setId(null)}>All labs</a> : <Link href="/learn" className="underline inline-flex min-h-11 items-center">Lessons</Link>}
      </nav>
      {lab ? (
        <article className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-4" aria-label={lab.title}>
          <h1 className="font-display text-2xl text-[var(--accent)]">{lab.title}</h1>
          <Lesson text={lab.lesson} />
          {save.labs[lab.id]?.passed && <div className="text-emerald-300" data-testid="lab-solved">Solved: all hidden checks passed.</div>}
          <Hints key={`h:${lab.id}`} hints={lab.hints} />
          <EditorWorkbench key={lab.id} task={labTask(lab)} hideHeader onResult={(r) => onResult(lab.id, r)} />
        </article>
      ) : (
        <>
          <h1 className="font-display text-3xl text-[var(--accent)]">Labs</h1>
          <p className="text-sm text-white/60">Write the function, Run for the visible checks, Submit for the hidden ones. {solved}/{LABS.length} solved. Gradients are verified against finite differences.</p>
          {labsByPhase().map((g) => (
            <section key={g.phase} className="grid gap-2" aria-label={g.title}>
              <h2 className="font-display text-lg">{g.title}</h2>
              <ul className="grid gap-2 sm:grid-cols-2">
                {g.labs.map((l) => (
                  <li key={l.id}>
                    <a href={`#${l.id}`} className="panel flex min-h-11 items-center justify-between gap-2 p-3 text-sm hover:bg-white/5" data-testid={`lab-${l.id}`}>
                      <span>{l.title}</span>
                      <span className={save.labs[l.id]?.passed ? "text-emerald-300" : "text-white/40"}>{save.labs[l.id]?.passed ? "✓ solved" : l.functions.length ? `${l.functions.length} fn` : ""}</span>
                    </a>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </>
      )}
    </main>
  );
}
