"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { CardForm, primary } from "@/components/Battle";
import { frameAt, frameCanvas } from "@/game/render/atlas";
import { spriteById } from "@/game/sprites/roster";
import { audio } from "@/lib/audio/player";
import { useAudioSettings } from "@/lib/audio/useAudio";
import { check } from "@/lib/cards/check";
import { NUMPY_DECK, PYTHON_DECK, STRATEGY_DECK } from "@/lib/cards/samples";
import type { Card, Response } from "@/lib/cards/types";
import { LABS } from "@/lib/labs/catalog";
import { getSaveManager, useSave } from "@/lib/save/react";
import { review } from "@/lib/srs/srs";
import { useNow } from "@/lib/sync/useNow";
import { buildSync, syncCards, type SyncDeck } from "@/lib/sync/sync";

const DECKS: SyncDeck[] = [PYTHON_DECK, NUMPY_DECK, STRATEGY_DECK].map((d) => ({ id: d.id, title: d.title, cards: d.cards }));
const LAB_LIST = LABS.map((l) => ({ id: l.id, title: l.title }));

/** Deterministic 0-1 hash so the rust speckles do not flicker between frames. */
const hash = (x: number, y: number) => {
  let h = (x * 374761393 + y * 668265263) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
};

/** The companion with a rust overlay: tinted sprite pixels only (source-atop), speckled orange as rust grows. */
function RustyPup({ level }: { level: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const def = spriteById("neuron-pup-perceptron")!;
    const g = ref.current!.getContext("2d")!;
    g.imageSmoothingEnabled = false;
    let raf = 0;
    const t0 = performance.now();
    const loop = (now: number) => {
      g.clearRect(0, 0, def.w, def.h);
      g.globalCompositeOperation = "source-over";
      g.drawImage(frameCanvas(def, "idle", frameAt(def, "idle", (now - t0) / 1000)), 0, 0);
      if (level > 0) {
        g.globalCompositeOperation = "source-atop";
        g.fillStyle = `rgba(120,70,30,${0.45 * level})`;
        g.fillRect(0, 0, def.w, def.h);
        for (let y = 0; y < def.h; y++)
          for (let x = 0; x < def.w; x++) {
            const h = hash(x, y);
            if (h < 0.3 * level) { g.fillStyle = h < 0.12 * level ? "#b4541a" : "#8a4a22"; g.fillRect(x, y, 1, 1); }
          }
        g.globalCompositeOperation = "source-over";
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [level]);
  return <canvas ref={ref} width={64} height={64} data-testid="sync-pup" data-rust={level.toFixed(2)} className="h-32 w-32 shrink-0" style={{ imageRendering: "pixelated" }} role="img" aria-label={level > 0 ? `Your Neuron-Pup, ${Math.round(level * 100)}% rusty` : "Your Neuron-Pup, shiny"} />;
}

interface Session {
  cards: Card[];
  i: number;
  last: { correct: boolean; card: Card } | null;
  right: number;
}

export default function Sync() {
  useAudioSettings({ music: false });
  const save = useSave();
  const base = useNow();
  const [refreshed, setNow] = useState<number | null>(null);
  const now = refreshed ?? base;
  // The queue is fixed when the page opens (and when the save finishes loading); reviews done in a session do not reshuffle it.
  const state = useMemo(() => (now === null ? null : buildSync(save.srs, DECKS, LAB_LIST, now)), [now, save.srs]);
  const [sess, setSess] = useState<Session | null>(null);

  if (!state) return <main className="mx-auto max-w-3xl px-4 py-6 text-sm text-white/60">Loading your sync…</main>;

  const queued = state.plan.reviews.length + state.plan.fresh.length;
  const start = () => setSess({ cards: syncCards(state.plan, DECKS), i: 0, last: null, right: 0 });
  const submit = (r: Response) =>
    setSess((s) => {
      if (!s || s.last) return s;
      const card = s.cards[s.i];
      const correct = check(card, r).correct;
      audio.play(correct ? "correct" : "wrong");
      getSaveManager().update((sv) => ({ ...sv, srs: review(sv.srs, card.id, { correct }, Date.now()), updatedAt: Date.now() }));
      return { ...s, last: { correct, card }, right: s.right + (correct ? 1 : 0) };
    });
  const advance = () => setSess((s) => (s ? { ...s, i: s.i + 1, last: null } : s));

  const card = sess && !sess.last ? sess.cards[sess.i] : undefined;
  const done = sess !== null && !sess.last && sess.i >= sess.cards.length;

  return (
    <main className="mx-auto grid max-w-3xl gap-4 px-4 py-6" data-testid="sync">
      <nav className="flex items-center justify-between text-sm">
        <Link href="/" className="inline-flex min-h-11 items-center underline">Title</Link>
        <Link href="/labs" className="inline-flex min-h-11 items-center underline">Labs</Link>
      </nav>
      <h1 className="font-display text-3xl text-[var(--accent)]">Daily Sync</h1>

      {!sess && (
        <>
          <section className="panel flex items-center gap-4 p-3" aria-label="Companion">
            <RustyPup level={state.rustLevel} />
            <div className="grid gap-1 text-sm">
              <p data-testid="sync-rust" className={state.rustLevel > 0 ? "text-amber-300" : "text-emerald-300"}>
                {state.trackedCount === 0 ? "Nothing reviewed yet." : state.rustLevel > 0 ? `Rusty: ${state.rustedCount} of ${state.trackedCount} reviewed items are overdue.` : "Shiny: nothing is overdue."}
              </p>
              <p className="text-white/60">Reviews you skip rust your Pup. A correct refresher polishes an item back to where it was.</p>
            </div>
          </section>

          <section className="panel grid gap-2 p-3" aria-label="Today">
            <h2 className="font-display text-lg">Today</h2>
            <p className="text-sm" data-testid="sync-queue">{state.plan.reviews.length} to review · {state.plan.fresh.length} new · {state.labs.length} Lab{state.labs.length === 1 ? "" : "s"} due</p>
            <button type="button" className={`${primary} justify-self-start`} onClick={start} disabled={queued === 0} data-testid="sync-start">
              {queued === 0 ? "All caught up" : "Start sync"}
            </button>
            <p className="text-xs text-white/50">Hints or revealed answers never count towards mastery, so you cannot buy a shiny Pup.</p>
          </section>

          {state.labs.length > 0 && (
            <section className="grid gap-2" aria-label="Labs due">
              <h2 className="font-display text-lg">Labs to refresh</h2>
              <ul className="grid gap-2 sm:grid-cols-2">
                {state.labs.map((l) => (
                  <li key={l.id}>
                    <Link href={`/labs#${l.id}`} className="panel flex min-h-11 items-center justify-between gap-2 p-3 text-sm hover:bg-white/5" data-testid={`sync-lab-${l.id}`}>
                      <span>{l.title}</span>
                      <span className={l.stale ? "text-amber-300" : "text-white/50"}>{l.stale ? "stale" : "due"}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section className="grid gap-2" aria-label="Mastery">
            <h2 className="font-display text-lg">Mastery</h2>
            {state.decks.map((d) => (
              <div key={d.id} className="panel grid gap-1 p-3 text-sm" data-testid={`sync-deck-${d.id}`}>
                <div className="flex justify-between gap-2"><span>{d.title}</span><span className="text-white/60">{d.total} cards</span></div>
                <div className="flex h-3 overflow-hidden rounded bg-white/10" role="img" aria-label={`${d.mastery.counts.mastered} mastered, ${d.mastery.counts.reviewing + d.mastery.counts.learning} in progress, ${d.mastery.counts.rusted} rusted, ${d.mastery.counts.new} new`}>
                  <span style={{ width: `${(d.mastery.counts.mastered / d.total) * 100}%` }} className="bg-emerald-400" />
                  <span style={{ width: `${((d.mastery.counts.reviewing + d.mastery.counts.learning) / d.total) * 100}%` }} className="bg-sky-400" />
                  <span style={{ width: `${(d.mastery.counts.rusted / d.total) * 100}%` }} className="bg-amber-600" />
                </div>
                <p className="text-xs text-white/60">{d.mastery.counts.mastered} mastered · {d.mastery.counts.reviewing + d.mastery.counts.learning} learning · {d.mastery.counts.rusted} rusted · {d.mastery.counts.new} new</p>
              </div>
            ))}
          </section>
        </>
      )}

      {sess && card && (
        <section className="panel grid gap-3 p-3" aria-label="Card">
          <p className="text-xs uppercase tracking-wide text-white/50" data-testid="sync-progress">Card {sess.i + 1} of {sess.cards.length} · {card.topic}</p>
          <p className="text-base leading-snug">{card.prompt}</p>
          <CardForm key={card.id} card={card} onSubmit={submit} />
        </section>
      )}
      {sess?.last && (
        <section className="panel grid gap-2 border-2 p-3" style={{ borderColor: sess.last.correct ? "#4ade80" : "#f87171" }} aria-label="Feedback">
          <h2 className="font-display">{sess.last.correct ? "Polished" : "Rusty. Look at why"}</h2>
          <p className="text-sm text-slate-200">{sess.last.card.explanation}</p>
          <button className={primary} onClick={advance} autoFocus data-testid="sync-next">{sess.i + 1 < sess.cards.length ? "Next card" : "Finish"}</button>
        </section>
      )}
      {done && (
        <section className="panel grid gap-2 p-3" aria-label="Result" data-testid="sync-done">
          <h2 className="font-display text-xl">Sync complete</h2>
          <p className="text-sm">{sess.right} of {sess.cards.length} correct. Missed cards come back within the day.</p>
          <button className={primary} onClick={() => { setNow(Date.now()); setSess(null); }}>Back to summary</button>
        </section>
      )}
    </main>
  );
}
