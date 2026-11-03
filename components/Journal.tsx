"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { bestIndex, compare, setNote, type JournalEntry } from "@/lib/journal/journal";
import { getSaveManager, useSave } from "@/lib/save/react";

const pct = (x: number) => `${(x * 100).toFixed(1)}%`;
const signed = (x: number, f: (v: number) => string) => `${x >= 0 ? "+" : "−"}${f(Math.abs(x))}`;
const label = (e: JournalEntry) => `${e.config.world} · ${e.config.model} · ${pct(e.metrics.hidden)}`;

export default function Journal() {
  const save = useSave();
  const entries = save.journal;
  const [aId, setA] = useState<string | null>(null);
  const [bId, setB] = useState<string | null>(null);
  const ordered = useMemo(() => [...entries].reverse(), [entries]);
  const best = bestIndex(entries);
  const a = entries.find((e) => e.id === aId);
  const b = entries.find((e) => e.id === bId);
  const cmp = a && b ? compare(a, b) : null;

  return (
    <main className="mx-auto grid max-w-3xl gap-4 px-4 py-6" data-testid="journal">
      <nav className="flex items-center justify-between text-sm">
        <Link href="/" className="inline-flex min-h-11 items-center underline">Title</Link>
        <Link href="/train" className="inline-flex min-h-11 items-center underline">Training Grounds</Link>
      </nav>
      <h1 className="text-xl">Research journal</h1>
      <p className="text-sm text-white/70">
        Every Training Grounds run is logged here when you reveal its hidden score, never before. Pick a baseline (A) and a challenger (B) to compare. Good experiments change one thing at a time.
      </p>
      {entries.length === 0 ? (
        <p className="panel p-4 text-sm" data-testid="journal-empty">No experiments yet. Run a model in the <Link href="/train" className="underline">Training Grounds</Link> and reveal its score.</p>
      ) : (
        <ul className="grid gap-2" data-testid="journal-list">
          {ordered.map((e) => (
            <li key={e.id} className="panel grid gap-2 p-3 text-sm" data-testid="journal-entry">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <b>{label(e)}{entries[best]?.id === e.id ? " ★ best" : ""}</b>
                <span className="text-xs text-white/50">{new Date(e.at).toLocaleString()}</span>
              </div>
              <div className="text-xs text-white/70">
                lr {e.config.lr} · {e.config.epochs} epochs · L2 {e.config.l2} · degree {e.config.degree} · batch {e.config.batch || "full"} · n {e.config.nTrain} · noise {e.config.noise} · seed {e.config.seed} · gap {e.metrics.gap >= 0 ? "+" : ""}{e.metrics.gap.toFixed(3)} · {e.metrics.params} params
              </div>
              <input
                className="min-h-11 rounded border border-white/20 bg-black/30 px-2 text-sm"
                placeholder="What did you learn? (hypothesis, result)"
                aria-label="Note"
                maxLength={200}
                defaultValue={e.note}
                onBlur={(ev) => ev.target.value !== e.note && getSaveManager().update((s) => ({ ...s, journal: setNote(s.journal, e.id, ev.target.value), updatedAt: Date.now() }))}
              />
              <div className="flex gap-2">
                <button type="button" className="px-btn min-h-11 px-3" aria-pressed={aId === e.id} data-testid="pick-a" onClick={() => setA(e.id)}>{aId === e.id ? "✓ A" : "Set as A"}</button>
                <button type="button" className="px-btn min-h-11 px-3" aria-pressed={bId === e.id} data-testid="pick-b" onClick={() => setB(e.id)}>{bId === e.id ? "✓ B" : "Set as B"}</button>
              </div>
            </li>
          ))}
        </ul>
      )}
      {cmp && a && b && (
        <section className="panel grid gap-2 p-4 text-sm" data-testid="compare">
          <h2 className="text-base">A → B</h2>
          <p>
            Hidden score {pct(a.metrics.hidden)} → {pct(b.metrics.hidden)} (<b>{signed(cmp.delta.hidden, pct)}</b>) · train {signed(cmp.delta.train, pct)} · gap {signed(cmp.delta.gap, (v) => v.toFixed(3))} · params {signed(cmp.delta.params, String)}
          </p>
          <p className="text-white/70">Changed: {cmp.changed.length ? cmp.changed.join(", ") : "nothing"}</p>
          <p data-testid="verdict" data-verdict={cmp.verdict}><b>{cmp.verdict}.</b> {cmp.advice}</p>
        </section>
      )}
    </main>
  );
}
