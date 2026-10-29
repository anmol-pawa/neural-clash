"use client";

import { useCallback, useState } from "react";
import { answer, currentCard, next, startBattle, summarize, DEFAULT_CONFIG, type BattleState } from "@/lib/battle/battle";
import type { Answer, Card } from "@/lib/battle/cards";
import { generatedDeck } from "@/lib/battle/deck";
import { NEURON_PUP_PERCEPTRON } from "@/game/sprites/creatures/neuron-pup-perceptron";
import { NEURON_PUP_PERCEPTRON_BACK } from "@/game/sprites/creatures/neuron-pup-perceptron-back";
import { HpBar, SpriteView } from "./BattleStage";

/** The sparring partner is the Perceptron pup with its colour channels rotated, until the Noise agents have their own art. */
const sparRecolor = ([r, g, b]: [number, number, number]): [number, number, number] => [b, r, g];
const DECK_SIZE = 11;

function CardInput({ card, onAnswer, disabled }: { card: Card; onAnswer: (a: Answer) => void; disabled: boolean }) {
  const [text, setText] = useState("");
  if (card.kind === "mcq") {
    return (
      <div className="flex flex-col gap-2">
        {card.options.map((o, i) => (
          <button key={o} type="button" disabled={disabled} className="px-btn px-3 text-left text-sm" onClick={() => onAnswer({ kind: "choice", index: i })}>
            <span className="mr-2 text-cyan-300">{i + 1}</span>{o}
          </button>
        ))}
      </div>
    );
  }
  if (card.kind === "bug") {
    return (
      <div className="flex flex-col gap-1 font-mono text-xs">
        {card.code.map((l, i) => (
          <button key={i} type="button" disabled={disabled} className="px-btn px-2 text-left" onClick={() => onAnswer({ kind: "line", index: i })}>
            <span className="mr-2 text-slate-400">{i + 1}</span>{l}
          </button>
        ))}
      </div>
    );
  }
  const submit = () => text.trim() && onAnswer({ kind: "text", text });
  return (
    <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); submit(); }}>
      <input
        autoFocus value={text} onChange={(e) => setText(e.target.value)} disabled={disabled} aria-label="Your answer"
        inputMode={card.kind === "shape" ? "text" : "decimal"} autoComplete="off" autoCapitalize="off" spellCheck={false}
        placeholder={card.kind === "shape" ? "(3, 4) or error" : "number"}
        className="min-h-11 min-w-0 flex-1 border-2 border-slate-600 bg-slate-950 px-3 font-mono text-base text-slate-100"
      />
      <button type="submit" disabled={disabled || !text.trim()} className="px-btn px-4 text-sm">Attack</button>
    </form>
  );
}

export default function CardBattle() {
  const [seed, setSeed] = useState(1);
  const [state, setState] = useState<BattleState>(() => startBattle(generatedDeck(1, DECK_SIZE)));
  const [fx, setFx] = useState<"idle" | "attack" | "hurt">("idle");

  const rematch = useCallback(() => {
    const s = seed + 1;
    setSeed(s);
    setState(startBattle(generatedDeck(s, DECK_SIZE)));
    setFx("idle");
  }, [seed]);

  const card = currentCard(state);
  const shownCard = state.queue[Math.min(state.index, state.queue.length - 1)];
  const submit = (a: Answer) => {
    const nx = answer(state, a);
    setState(nx);
    setFx(nx.last?.correct ? "attack" : "hurt");
  };
  const advance = () => { setState(next(state)); setFx("idle"); };
  const over = state.phase === "won" || state.phase === "lost";
  const sum = summarize(state);

  return (
    <main className="mx-auto flex min-h-dvh max-w-2xl flex-col gap-3 p-3 text-slate-100">
      <h1 className="font-pixel text-sm text-cyan-200">Card battle · Python Port sparring</h1>
      <section aria-label="Battle stage" className="relative flex h-60 items-end justify-between overflow-hidden border-4 border-slate-600 bg-gradient-to-b from-sky-900 via-indigo-950 to-emerald-950 p-3">
        <div className="flex flex-col items-start gap-2 self-end">
          <HpBar label="You" hp={state.playerHp} max={state.cfg.playerHp} tone="player" />
          <SpriteView def={NEURON_PUP_PERCEPTRON_BACK} anim={fx === "hurt" ? "hurt" : fx === "attack" ? "attack" : "idle"} scale={2} label="Your Neuron-Pup" className="-mb-1" />
        </div>
        <div className="flex flex-col items-end gap-2 self-start">
          <HpBar label="Spar-Pup" hp={state.enemyHp} max={state.cfg.enemyHp} tone="enemy" />
          <SpriteView def={NEURON_PUP_PERCEPTRON} anim={over && state.phase === "won" ? "faint" : fx === "attack" ? "hurt" : "idle"} scale={2} recolor={sparRecolor} label="Spar-Pup" />
        </div>
        {state.last && state.phase !== "asking" && (
          <p className={`absolute left-1/2 top-3 -translate-x-1/2 font-pixel text-xs ${state.last.correct ? "text-amber-300" : "text-rose-400"}`} aria-live="polite">
            {state.last.correct ? `${state.last.crit ? "CRIT! " : ""}-${state.last.damage}` : `Counter! -${state.last.damage}`}
          </p>
        )}
      </section>

      {!over && shownCard && (
        <section aria-label="Card" className="border-4 border-slate-500 bg-slate-900 p-3">
          <p className="font-pixel text-[10px] text-cyan-300">{shownCard.kind.toUpperCase()} · streak {state.streak}</p>
          <p className="my-2 text-base leading-snug" data-testid="prompt">{shownCard.prompt}</p>
          {card ? (
            <CardInput key={card.id + state.index} card={card} onAnswer={submit} disabled={false} />
          ) : (
            <div>
              <p className={`font-pixel text-xs ${state.last?.correct ? "text-emerald-300" : "text-rose-300"}`} data-testid="verdict">{state.last?.correct ? "Correct!" : "Not quite."}</p>
              <p className="my-2 text-sm leading-snug text-slate-200" data-testid="explain">{shownCard.explain}</p>
              <button type="button" className="px-btn px-4 text-sm" onClick={advance}>Next ▶</button>
            </div>
          )}
        </section>
      )}

      {over && (
        <section aria-label="Result" className="border-4 border-slate-500 bg-slate-900 p-3" data-testid="result">
          <p className={`font-pixel text-sm ${sum.won ? "text-emerald-300" : "text-rose-300"}`}>{sum.won ? "Victory!" : "Defeated…"}</p>
          <p className="mt-2 text-sm">{sum.correct}/{sum.total} correct · best streak {sum.bestStreak}</p>
          {sum.weakTopics.length > 0 && <p className="mt-1 text-sm text-slate-300">Review: {sum.weakTopics.join(", ")}</p>}
          <button type="button" className="px-btn mt-3 px-4 text-sm" onClick={rematch}>Rematch (new cards)</button>
        </section>
      )}
      <p className="text-xs text-slate-400">Every answer is computed by tested solver code. Config: enemy {DEFAULT_CONFIG.enemyHp} HP, you {DEFAULT_CONFIG.playerHp} HP.</p>
    </main>
  );
}
