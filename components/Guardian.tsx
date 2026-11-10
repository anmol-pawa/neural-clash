"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CardForm, primary } from "@/components/Battle";
import { audio } from "@/lib/audio/player";
import { useAudioSettings } from "@/lib/audio/useAudio";
import EditorWorkbench from "@/components/EditorWorkbench";
import { RevealFight } from "@/components/Train";
import { drawBattle, STAGE_H, STAGE_W, type StageFx, type StageOpts } from "@/game/render/battle";
import { spriteById } from "@/game/sprites/roster";
import { CALCULUS_DECK, CLASSIC_DECK, LINALG_DECK, PROBABILITY_DECK, PYTHON_DECK } from "@/lib/cards/samples";
import { PYTHON_GUARDIAN, type GuardianDef } from "@/lib/guardian/defs";
import { shuffle, rng } from "@/lib/cards/rng";
import type { Response } from "@/lib/cards/types";
import { lessonForTopic } from "@/lib/lessons/lessons";
import { labById, labTask } from "@/lib/labs/catalog";
import { PHASES, guardianAdvanceFromCards, guardianAnswer, guardianFight, guardianLabResult, guardianNext, phaseProgress, progressOf, resumeGuardian, startGuardian, summarizeGuardian, type GuardianProgress, type GuardianState } from "@/lib/guardian/portGuardian";
import { payReward } from "@/lib/economy/economy";
import { getSaveManager, useSave } from "@/lib/save/react";

/** Large (96px) foe: sits higher on its platform and moves its bar to the foot of the stage. */
const stageOpts = (def: GuardianDef): StageOpts => ({ theme: def.theme, foeLabel: def.name.toUpperCase(), foeAt: { x: 128, y: 8 }, foePlatform: { cx: 176, cy: 100 }, foeBarAt: { x: 148, y: 108 } });
const deckFor = (def: GuardianDef) => (def.id === "guardian:vector-vale" ? LINALG_DECK : def.id === "guardian:gradient-gorge" ? CALCULUS_DECK : def.id === "guardian:probability-peaks" ? PROBABILITY_DECK : def.id === "guardian:classic-grove" ? CLASSIC_DECK : PYTHON_DECK);
const freshFx = (): StageFx => ({ t: 0, attackAt: -1, hurtAt: -1, foeHitAt: -1, foeHp: 1, playerHp: 1, foeDown: false, playerDown: false, shake: 0, floaters: [] });

/** The Warden's remaining resolve: each of the three trials removes a third of its bar. */
function resolve(s: GuardianState): number {
  const cards = s.cards.foeHp / s.cards.config.foeHp;
  const cardsPart = s.phase === "cards" || (s.phase === "lost" && s.lostIn === "cards") ? cards : 0;
  const labPart = s.labPassed ? 0 : 1;
  const trainPart = s.phase === "won" ? 0 : 1;
  return (cardsPart + labPart + trainPart) / 3;
}

export default function Guardian({ def = PYTHON_GUARDIAN }: { def?: GuardianDef }) {
  const LAB_ID = def.labId;
  const GUARDIAN_ID = def.id;
  const GUARDIAN_NAME = def.name;
  const PROGRESS_KEY = `neural-clash:guardian-progress:${def.slug || "port"}`;
  const DECK = deckFor(def);
  const OPTS = useMemo(() => stageOpts(def), [def]);
  const save = useSave();
  useAudioSettings({ music: false });
  // fixed order on first render so the static HTML and the client agree; restarts reshuffle
  const [state, setState] = useState<GuardianState>(() => startGuardian(shuffle(rng(7), DECK.cards), LAB_ID));
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(PROGRESS_KEY);
      // resume after mount (not in the initial state) so the static HTML and first client render match
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (raw) setState(resumeGuardian(shuffle(rng(7), DECK.cards), LAB_ID, JSON.parse(raw) as GuardianProgress));
    } catch { /* no storage: start fresh */ }
  }, []);
  useEffect(() => {
    try {
      const p = progressOf(state);
      if (state.phase === "won") sessionStorage.removeItem(PROGRESS_KEY);
      else if (p.cards) sessionStorage.setItem(PROGRESS_KEY, JSON.stringify(p));
    } catch { /* ignore */ }
  }, [state]);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fxRef = useRef<StageFx>(freshFx());
  const [live, setLive] = useState("");
  const lab = labById(LAB_ID);
  const companion = save.companion;
  const stats = useMemo(() => (companion ? { attack: companion.attack, defence: companion.defence, speed: companion.speed } : null), [companion]);

  useEffect(() => {
    const foe = spriteById(def.spriteId)!;
    const hero = spriteById("neuron-pup-perceptron-back")!;
    const g = canvasRef.current!.getContext("2d")!;
    let last = performance.now();
    let raf = 0;
    const loop = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const fx = fxRef.current;
      fx.t += dt;
      if (fx.attackAt >= 0) fx.attackAt += dt;
      if (fx.hurtAt >= 0) fx.hurtAt += dt;
      if (fx.foeHitAt >= 0) fx.foeHitAt += dt;
      fx.shake = Math.max(0, fx.shake - dt * 5);
      fx.floaters = fx.floaters.map((f) => ({ ...f, age: f.age + dt })).filter((f) => f.age < 1);
      drawBattle(g, foe, hero, fx, OPTS);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [OPTS, def.spriteId]);

  // keep the stage bars in step with the state machine
  useEffect(() => {
    const fx = fxRef.current;
    fx.foeHp = resolve(state);
    fx.playerHp = state.cards.playerHp / state.cards.config.playerHp;
    fx.playerDown = state.phase === "lost" && state.lostIn === "cards";
    if (state.phase === "won" && !fx.foeDown) { fx.foeDown = true; fx.foeHitAt = 0; }
  }, [state]);

  // the badge is stored the moment the guardian falls
  useEffect(() => {
    if (state.phase !== "won") return;
    audio.play("badge");
    getSaveManager().update((s) => {
      if (s.cleared.includes(GUARDIAN_ID)) return s;
      const base = { ...s, cleared: [...s.cleared, GUARDIAN_ID], updatedAt: Date.now() };
      return payReward(base, "guardian", GUARDIAN_ID, false).state;
    });
  }, [state.phase]);

  const submit = useCallback((r: Response) => {
    setState((s) => {
      const n = guardianAnswer(s, r);
      const last = n.cards.last;
      if (n === s || !last) return s;
      const fx = fxRef.current;
      if (last.correct) {
        fx.attackAt = 0;
        audio.play("correct");
        setTimeout(() => { audio.play("hit"); fx.foeHitAt = 0; fx.shake = 1; fx.floaters.push({ text: `-${last.damage}`, x: 190, y: 40, age: 0, color: "#fde047" }); }, 280);
      } else {
        audio.play("wrong");
        setTimeout(() => audio.play("hurt"), 120);
        fx.hurtAt = 0;
        fx.shake = 0.8;
        fx.floaters.push({ text: `-${last.taken}♥`, x: 50, y: 70, age: 0, color: "#f87171" });
      }
      setLive(last.correct ? `Correct. ${last.damage} damage.` : "Not quite. You take a hit.");
      return n;
    });
  }, []);

  const onLab = useCallback((r: { mode: "run" | "submit"; allPassed: boolean }) => {
    if (r.mode !== "submit") return;
    if (r.allPassed) {
      getSaveManager().update((s) => ({ ...s, labs: { ...s.labs, [LAB_ID]: { passed: true, assisted: s.labs[LAB_ID]?.assisted ?? false } }, updatedAt: Date.now() }));
    }
    setState((s) => guardianLabResult(s, r.allPassed));
  }, []);

  const restart = () => {
    try { sessionStorage.removeItem(PROGRESS_KEY); } catch { /* ignore */ }
    fxRef.current = freshFx();
    setState(startGuardian(shuffle(rng(Date.now() % 100000), DECK.cards), LAB_ID));
  };

  const progress = phaseProgress(state);
  const sum = summarizeGuardian(state);
  const c = state.cards;
  const cleared = save.cleared.includes(GUARDIAN_ID);

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-4xl flex-col gap-3 px-3 py-3" data-testid="guardian" data-phase={state.phase}>
      <nav className="mx-auto flex w-full max-w-2xl items-center justify-between text-sm">
        <Link href="/" className="underline inline-flex min-h-11 items-center">Title</Link>
        <h1 className="font-display text-base text-cyan-200">{GUARDIAN_NAME}</h1>
        <span aria-label={`${c.playerHp} hearts`} className="text-lg text-rose-400">{"♥".repeat(c.playerHp)}<span className="text-slate-600">{"♥".repeat(c.config.playerHp - c.playerHp)}</span></span>
      </nav>
      <ol className="mx-auto w-full max-w-2xl grid grid-cols-3 gap-1 text-center text-xs" aria-label="Trials" data-testid="phase-strip">
        {PHASES.map((p, i) => (
          <li key={p.key} aria-current={i === progress && state.phase !== "won" ? "step" : undefined} className={`rounded border-2 px-1 py-2 ${i < progress ? "border-emerald-400/60 bg-emerald-500/10 text-emerald-200" : i === progress && state.phase !== "won" ? "border-cyan-300 bg-cyan-400/10 text-cyan-100" : "border-indigo-300/20 text-slate-500"}`}>
            {i < progress ? "✓ " : `${i + 1}. `}{p.label}
          </li>
        ))}
      </ol>
      <canvas ref={canvasRef} width={STAGE_W} height={STAGE_H} data-testid="stage" className="mx-auto w-full max-w-2xl border-4 border-indigo-300/40 bg-black" style={{ imageRendering: "pixelated", aspectRatio: `${STAGE_W}/${STAGE_H}` }} aria-label={`Battle stage: your Neuron-Pup against ${GUARDIAN_NAME}, the ${def.region} guardian`} role="img" />
      <div aria-live="polite" className="sr-only">{live}</div>
      {cleared && state.phase !== "won" && <p className="mx-auto w-full max-w-2xl text-xs text-emerald-300" data-testid="already-cleared">{def.badge} already earned. A rematch is just for practice.</p>}

      {state.phase === "lost" && (
        <section className="mx-auto w-full max-w-2xl grid gap-2 rounded border-2 border-rose-400/60 bg-slate-900/80 p-3" aria-label="Result" data-testid="guardian-lost">
          <h2 className="font-display text-lg">Out of hearts.</h2>
          <p className="text-sm text-slate-300">{GUARDIAN_NAME} holds {def.region}. Accuracy {Math.round(sum.cards.accuracy * 100)}%{sum.cards.missed.length > 0 && <> · review: {sum.cards.missed.join(", ")}</>}. Read the lessons, then try again.</p>
          <div className="flex flex-wrap gap-2"><button className={primary} onClick={restart} data-testid="retry">Try again</button><Link href={def.lessonsHref} className="min-h-11 rounded border-2 border-indigo-300/40 px-4 py-2 text-sm underline">{def.region} lessons</Link></div>
        </section>
      )}

      {state.phase === "cards" && c.phase === "won" && c.last && (
        <section className="mx-auto w-full max-w-2xl grid gap-2 rounded border-2 border-emerald-400/70 p-3" aria-label="Trial one cleared" data-testid="cards-cleared">
          <h2 className="font-display">Trial 1 cleared: {def.trials.read}.</h2>
          <p className="text-sm text-slate-200">{c.last.card.explanation}</p>
          <button className={primary} onClick={() => setState(guardianAdvanceFromCards)} autoFocus data-testid="to-lab">On to the Write trial</button>
        </section>
      )}
      {state.phase === "cards" && c.phase === "feedback" && c.last && (
        <section className="mx-auto w-full max-w-2xl grid gap-2 rounded border-2 p-3" style={{ borderColor: c.last.correct ? "#4ade80" : "#f87171" }} aria-label="Feedback">
          <h2 className="font-display">{c.last.correct ? `Hit! ${c.last.damage} damage` : "Counter-hit"}</h2>
          <p className="text-sm text-slate-200">{c.last.card.explanation}</p>
          {(() => { const l = lessonForTopic(c.last.card.topic); return l ? <Link href={`/learn#${l.id}`} className="text-sm underline" target="_blank" rel="noreferrer">Lesson: {l.title}</Link> : null; })()}
          <button className={primary} onClick={() => setState(guardianNext)} autoFocus data-testid="next-card">Next card</button>
        </section>
      )}
      {state.phase === "cards" && c.phase === "asking" && c.current && (
        <section className="mx-auto w-full max-w-2xl grid gap-3 rounded border-2 border-indigo-300/40 bg-slate-900/60 p-3" aria-label="Card" data-testid="card">
          <p className="text-xs uppercase tracking-wide text-slate-400">Trial 1 · Read · {c.current.topic}</p>
          <p className="text-base leading-snug">{c.current.prompt}</p>
          <CardForm key={c.current.id} card={c.current} onSubmit={submit} />
        </section>
      )}

      {state.phase === "lab" && lab && (
        <section className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-3" aria-label="Write trial" data-testid="lab-phase">
          <h2 className="font-display text-lg text-cyan-200">Trial 2 · Write: {lab.title}</h2>
          <p className="text-sm text-slate-300">Implement the function, Run for the visible checks, then Submit. All hidden checks must pass to move on.{state.labAttempts > 0 && <> Attempts so far: {state.labAttempts}. <Link href={`/labs#${lab.id}`} className="underline" target="_blank" rel="noreferrer">Open the lesson and hints</Link>.</>}</p>
          <EditorWorkbench key={lab.id} task={labTask(lab)} hideHeader onResult={onLab} />
        </section>
      )}

      {(state.phase === "training" || state.phase === "won") && (
        <section className="mx-auto w-full max-w-2xl grid gap-3 rounded border-2 border-indigo-300/40 bg-slate-900/60 p-3" aria-label="Generalise trial" data-testid="training-phase">
          <h2 className="font-display text-lg text-cyan-200">Trial 3 · Generalise</h2>
          {stats && companion ? (
            <>
              <p className="text-sm text-slate-300">Your saved companion (world: {companion.world}, hidden score {Math.round(companion.score * 100)}%) faces Overfit&apos;s minion, the guardian&apos;s last line. Attack {companion.attack} · Defence {companion.defence} · Speed {companion.speed}.</p>
              <RevealFight stats={stats} onFinish={() => setState((s) => guardianFight(s, stats))} />
              {state.fight && !state.fight.won && (
                <p className="text-sm text-amber-200" data-testid="training-retry">Not yet. Train a better companion in the <Link href="/train" className="underline">Training Grounds</Link>, save it, and come back. Your first two trials stay cleared.</p>
              )}
            </>
          ) : (
            <p className="text-sm text-slate-300" data-testid="no-companion">You need a trained companion first. Open the <Link href="/train" className="underline">Training Grounds</Link>, reveal a hidden score and save it as your companion, then return here. Your cleared trials are remembered for this browser session.</p>
          )}
        </section>
      )}

      {state.phase === "won" && (
        <section className="mx-auto w-full max-w-2xl grid gap-2 rounded border-2 border-amber-300 bg-amber-300/10 p-3" aria-label="Victory" data-testid="guardian-won">
          <h2 className="font-display text-xl text-amber-200">{def.badge} earned!</h2>
          <p className="text-sm text-slate-200">You read it, wrote it, and built something that generalises. {def.region} is open.</p>
          <div className="flex flex-wrap gap-2"><Link href="/" className={primary}>Back to title</Link><button className="min-h-11 rounded border-2 border-indigo-300/40 px-4 py-2 text-sm" onClick={restart}>Rematch for practice</button></div>
        </section>
      )}
    </main>
  );
}
