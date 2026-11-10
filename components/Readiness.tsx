"use client";

import Link from "next/link";
import { useMemo } from "react";
import { CALCULUS_DECK, CLASSIC_DECK, LINALG_DECK, NUMPY_DECK, PROBABILITY_DECK, PYTHON_DECK, STRATEGY_DECK } from "@/lib/cards/samples";
import { LABS } from "@/lib/labs/catalog";
import { band, readiness, type LoopResult } from "@/lib/readiness/readiness";
import { useSave } from "@/lib/save/react";
import { useNow } from "@/lib/sync/useNow";

const LAB_IDS = new Set(LABS.map((l) => l.id));
const DECKS = {
  python: PYTHON_DECK.cards.map((c) => c.id),
  numpy: NUMPY_DECK.cards.map((c) => c.id),
  linalg: LINALG_DECK.cards.map((c) => c.id),
  calculus: CALCULUS_DECK.cards.map((c) => c.id),
  probability: PROBABILITY_DECK.cards.map((c) => c.id),
  classic: CLASSIC_DECK.cards.map((c) => c.id),
  strategy: STRATEGY_DECK.cards.map((c) => c.id),
};

const pct = (x: number) => `${Math.round(x * 100)}%`;

function Bar({ value, label, color = "bg-sky-400" }: { value: number; label: string; color?: string }) {
  return (
    <div className="h-3 overflow-hidden rounded bg-white/10" role="img" aria-label={label}>
      <div className={`h-full ${color}`} style={{ width: pct(value) }} />
    </div>
  );
}

function LoopCard({ r }: { r: LoopResult }) {
  return (
    <section className="panel grid gap-3 p-3" aria-label={r.loop.title} data-testid={`loop-${r.loop.id}`} data-score={r.score.toFixed(3)}>
      <div>
        <h2 className="font-display text-xl">{r.loop.title}</h2>
        <p className="text-sm text-white/60">{r.loop.blurb}</p>
      </div>
      <div className="grid gap-1">
        <div className="flex justify-between text-sm">
          <span data-testid={`band-${r.loop.id}`} className="font-display text-[var(--accent)]">{band(r.score)}</span>
          <span className="text-white/60">{pct(r.score)} of the loop</span>
        </div>
        <Bar value={r.score} label={`${r.loop.title}: ${pct(r.score)} of the loop practised`} color="bg-emerald-400" />
        <p className="text-xs text-white/50">The game can train {pct(r.coverage)} of this loop so far. The rest is marked coming.</p>
      </div>
      {r.weakest && r.score < 0.85 && (
        <p className="text-sm text-amber-200" data-testid={`next-${r.loop.id}`}>Biggest gap you can act on now: <b>{r.weakest.round.title}</b>.</p>
      )}
      <ul className="grid gap-2">
        {r.rounds.map((rd) => (
          <li key={rd.round.id} className="grid gap-1 rounded border border-white/10 p-2">
            <div className="flex justify-between gap-2 text-sm"><span>{rd.round.title}</span><span className="text-white/60">{pct(rd.score)}</span></div>
            <Bar value={rd.score} label={`${rd.round.title}: ${pct(rd.score)}`} />
            <p className="text-xs text-white/60">{rd.round.what}</p>
            <ul className="flex flex-wrap gap-1 text-xs">
              {rd.skills.map(({ result }) => (
                <li key={result.skill.id} className={`rounded px-2 py-1 ${result.coverage === 0 ? "bg-white/5 text-white/40" : "bg-white/10"}`}>
                  {result.skill.title}: {result.coverage === 0 ? "coming" : pct(result.score)}
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ul>
    </section>
  );
}

export default function Readiness() {
  const save = useSave();
  const now = useNow();
  const results = useMemo(
    () => (now === null ? null : readiness({ labs: save.labs, labIds: LAB_IDS, srs: save.srs, decks: DECKS, cleared: save.cleared, journalRuns: save.journal.length, now })),
    [now, save.labs, save.srs, save.cleared, save.journal.length],
  );
  if (!results) return <main className="mx-auto max-w-3xl px-4 py-6 text-sm text-white/60">Loading your report…</main>;
  return (
    <main className="mx-auto grid max-w-3xl gap-4 px-4 py-6" data-testid="readiness">
      <nav className="flex items-center justify-between text-sm">
        <Link href="/" className="inline-flex min-h-11 items-center underline">Title</Link>
        <Link href="/sync" className="inline-flex min-h-11 items-center underline">Daily Sync</Link>
      </nav>
      <h1 className="font-display text-3xl text-[var(--accent)]">Readiness Report</h1>
      <p className="panel p-3 text-sm text-white/70">
        How much of each interview loop you have practised in this game. It counts Labs passed without help (helped passes count half),
        card mastery (rusted cards count less), the guardian and logged experiments. It is practice coverage, not a prediction of any
        interview result. Loop shapes follow the 2026 formats summarised in the curriculum (checked November 2026) and will drift; treat them as a guide.
      </p>
      {results.map((r) => <LoopCard key={r.loop.id} r={r} />)}
    </main>
  );
}
