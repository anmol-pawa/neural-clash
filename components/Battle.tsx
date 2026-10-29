"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { drawBattle, STAGE_H, STAGE_W, type StageFx } from "@/game/render/battle";
import { spriteById } from "@/game/sprites/roster";
import { answer, next, startBattle, summarize, type BattleState } from "@/lib/battle/battle";
import { parseShape } from "@/lib/cards/check";
import { demoDeck } from "@/lib/cards/samples";
import type { Card, Response } from "@/lib/cards/types";

const btn = "min-h-11 rounded border-2 border-indigo-300/40 bg-slate-900/80 px-3 py-2 text-left text-sm hover:border-cyan-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-300";
const primary = "min-h-11 rounded border-2 border-cyan-300 bg-cyan-400/20 px-4 py-2 font-semibold text-cyan-100 hover:bg-cyan-400/30";

/** Pixel-styled train/validation loss chart; values are already clipped by the card generator. */
function CurveChart({ train, val }: { train: number[]; val: number[] }) {
  const W = 240, H = 120;
  const lg = (v: number) => Math.log10(Math.max(v, 1e-6));
  const all = [...train, ...val].map(lg), lo = Math.min(...all), hi = Math.max(...all, lo + 0.1);
  const path = (ys: number[]) => ys.map((y, i) => `${i ? "L" : "M"}${((i / (ys.length - 1)) * W).toFixed(1)} ${(H - 8 - ((lg(y) - lo) / (hi - lo)) * (H - 20)).toFixed(1)}`).join("");
  return (
    <svg viewBox={`-2 -2 ${W + 4} ${H + 4}`} role="img" aria-label="Training and validation loss against epochs" className="w-full max-w-md rounded border-2 border-indigo-300/40 bg-slate-950" shapeRendering="crispEdges">
      <path d={path(train)} fill="none" stroke="#38bdf8" strokeWidth="2" />
      <path d={path(val)} fill="none" stroke="#fb923c" strokeWidth="2" />
      <text x="4" y="12" fontSize="9" fill="#38bdf8">train</text>
      <text x="34" y="12" fontSize="9" fill="#fb923c">validation</text>
      <text x={W - 4} y={H - 4} fontSize="8" fill="#94a3b8" textAnchor="end">epochs → · loss on a log scale</text>
    </svg>
  );
}

/** The answer form for one card. Remounted per card (keyed by id) so its local state resets. */
function CardForm({ card, onSubmit }: { card: Card; onSubmit: (r: Response) => void }) {
  const [picked, setPicked] = useState<number[]>([]);
  const [text, setText] = useState<string[]>(() => (card.kind === "derive" ? card.fields.map(() => "") : [""]));
  const [err, setErr] = useState("");

  if (card.kind === "curve")
    return (
      <div className="grid gap-2">
        <CurveChart train={card.curves.train} val={card.curves.val} />
        <div className="grid gap-2" role="group" aria-label="Choices">
          {card.choices.map((c, i) => (
            <button key={i} className={btn} onClick={() => onSubmit({ kind: "curve", choice: i })}>
              <span className="mr-2 text-cyan-300">{String.fromCharCode(65 + i)}</span>
              {c}
            </button>
          ))}
        </div>
      </div>
    );

  if (card.kind === "mcq")
    return (
      <div className="grid gap-2" role="group" aria-label="Choices">
        {card.choices.map((c, i) => (
          <button key={i} className={btn} onClick={() => onSubmit({ kind: "mcq", choice: i })}>
            <span className="mr-2 text-cyan-300">{String.fromCharCode(65 + i)}</span>
            {c}
          </button>
        ))}
      </div>
    );
  if (card.kind === "multi")
    return (
      <div className="grid gap-2">
        {card.choices.map((c, i) => (
          <label key={i} className={`${btn} flex cursor-pointer items-center gap-2`}>
            <input type="checkbox" checked={picked.includes(i)} onChange={() => setPicked((p) => (p.includes(i) ? p.filter((x) => x !== i) : [...p, i]))} className="h-5 w-5" />
            {c}
          </label>
        ))}
        <button className={primary} onClick={() => onSubmit({ kind: "multi", choices: picked })}>Attack</button>
      </div>
    );
  if (card.kind === "bug")
    return (
      <pre className="overflow-x-auto rounded border-2 border-indigo-300/40 bg-slate-950 p-2 font-mono text-sm" aria-label="Code">
        {card.code.map((l, i) => (
          <button key={i} onClick={() => onSubmit({ kind: "bug", line: i + 1 })} className="block min-h-9 w-full whitespace-pre px-1 text-left hover:bg-cyan-400/20" aria-label={`Line ${i + 1}: ${l}`}>
            <span className="mr-3 inline-block w-4 text-right text-slate-500">{i + 1}</span>
            {l}
          </button>
        ))}
      </pre>
    );

  const submit = () => {
    if (card.kind === "derive") {
      const vals = text.map((t) => (t.trim() === "" ? NaN : Number(t)));
      if (vals.some((v) => !Number.isFinite(v))) return setErr("Enter a number in every box.");
      onSubmit({ kind: "derive", values: vals });
    } else if (card.kind === "shape") {
      const s = parseShape(text[0]);
      if (s === undefined) return setErr('Type a shape like (3, 4) or "error".');
      onSubmit({ kind: "shape", shape: s });
    } else if (card.kind === "metric") {
      const v = Number(text[0]);
      if (text[0].trim() === "" || !Number.isFinite(v)) return setErr("Enter a number.");
      onSubmit({ kind: "metric", value: v });
    }
  };
  return (
    <form onSubmit={(e) => { e.preventDefault(); submit(); }} className="grid gap-2">
      {card.kind === "metric" && (
        <div className="overflow-x-auto"><table className="min-w-full border-collapse font-mono text-xs"><thead><tr>{card.table.head.map((h, i) => <th key={i} className="border border-indigo-300/30 px-2 py-1 text-slate-400">{h}</th>)}</tr></thead><tbody>{card.table.rows.map((r, i) => <tr key={i}>{r.map((c, j) => <td key={j} className="border border-indigo-300/30 px-2 py-1 text-center">{c}</td>)}</tr>)}</tbody></table></div>
      )}
      <div className="flex flex-wrap gap-2">
        {(card.kind === "derive" ? card.fields : [card.kind === "shape" ? "shape" : "answer"]).map((f, i) => (
          <label key={f} className="grid gap-1 text-xs text-slate-300">{f}
            <input inputMode={card.kind === "shape" ? "text" : "decimal"} value={text[i]} onChange={(e) => { setErr(""); setText((t) => t.map((x, j) => (j === i ? e.target.value : x))); }} className="min-h-11 w-32 rounded border-2 border-indigo-300/40 bg-slate-950 px-2 font-mono text-base text-white" autoComplete="off" />
          </label>
        ))}
      </div>
      {err && <p role="alert" className="text-sm text-amber-300">{err}</p>}
      <button type="submit" className={primary}>Attack</button>
    </form>
  );
}

export default function Battle() {
  const seed = useMemo(() => 7, []);
  const [state, setState] = useState<BattleState>(() => startBattle(demoDeck(seed)));
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fxRef = useRef<StageFx>({ t: 0, attackAt: -1, hurtAt: -1, foeHitAt: -1, foeHp: 1, playerHp: 1, foeDown: false, playerDown: false, shake: 0, floaters: [] });
  const [live, setLive] = useState("");

  useEffect(() => {
    const foe = spriteById("neuron-pup-perceptron")!;
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
      drawBattle(g, foe, hero, fx);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  const submit = useCallback((r: Response) => {
    setState((s) => {
      const n = answer(s, r);
      if (n === s || !n.last) return s;
      const fx = fxRef.current;
      fx.foeHp = n.foeHp / n.config.foeHp;
      fx.playerHp = n.playerHp / n.config.playerHp;
      if (n.last.correct) {
        fx.attackAt = 0;
        // the hit lands when the bolt arrives
        setTimeout(() => { fx.foeHitAt = 0; fx.shake = 1; fx.floaters.push({ text: `-${n.last!.damage}`, x: 190, y: 60, age: 0, color: "#fde047" }); }, 280);
        if (n.phase === "won") setTimeout(() => (fx.foeDown = true), 300);
      } else {
        fx.hurtAt = 0;
        fx.shake = 0.8;
        fx.floaters.push({ text: `-${n.last.taken}♥`, x: 50, y: 70, age: 0, color: "#f87171" });
        if (n.phase === "lost") fx.playerDown = true;
      }
      setLive(n.last.correct ? `Correct. ${n.last.damage} damage.` : "Not quite. You take a hit.");
      return n;
    });
  }, []);

  const restart = () => {
    const fx = fxRef.current;
    Object.assign(fx, { attackAt: -1, hurtAt: -1, foeHitAt: -1, foeHp: 1, playerHp: 1, foeDown: false, playerDown: false, floaters: [] });
    setState(startBattle(demoDeck(seed + Math.floor(Math.random() * 1000))));
  };

  const card = state.current;
  const over = state.phase === "won" || state.phase === "lost";
  const sum = summarize(state);

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-2xl flex-col gap-3 px-3 py-3">
      <header className="flex items-center justify-between text-sm">
        <h1 className="font-display text-base text-cyan-200">Card Battle <span className="text-xs text-slate-400">(demo deck)</span></h1>
        <span aria-label={`${state.playerHp} hearts`} className="text-lg text-rose-400">{"♥".repeat(state.playerHp)}<span className="text-slate-600">{"♥".repeat(state.config.playerHp - state.playerHp)}</span></span>
        <span className="text-amber-300" aria-label={`streak ${state.streak}`}>🔥 {state.streak}</span>
      </header>
      <canvas ref={canvasRef} width={STAGE_W} height={STAGE_H} data-testid="stage" data-foe-hp={state.foeHp} className="w-full border-4 border-indigo-300/40 bg-black" style={{ imageRendering: "pixelated", aspectRatio: `${STAGE_W}/${STAGE_H}` }} aria-label="Battle stage: your Neuron-Pup against a Noise minion" role="img" />
      <div aria-live="polite" className="sr-only">{live}</div>

      {over ? (
        <section className="grid gap-2 rounded border-2 border-indigo-300/40 bg-slate-900/80 p-3" aria-label="Result">
          <h2 className="font-display text-lg">{sum.won ? "Noise cleared!" : "Your Pup is out of hearts."}</h2>
          <p className="text-sm text-slate-300">Accuracy {Math.round(sum.accuracy * 100)}% · best streak {sum.bestStreak} · {"★".repeat(sum.stars)}{"☆".repeat(3 - sum.stars)}</p>
          {sum.missed.length > 0 && <p className="text-sm text-slate-300">Review: {sum.missed.join(", ")}</p>}
          <button className={primary} onClick={restart}>Battle again</button>
        </section>
      ) : state.phase === "feedback" && state.last ? (
        <section className="grid gap-2 rounded border-2 p-3" style={{ borderColor: state.last.correct ? "#4ade80" : "#f87171" }} aria-label="Feedback">
          <h2 className="font-display">{state.last.correct ? `Hit! ${state.last.damage} damage` : "Counter-hit"}</h2>
          <p className="text-sm text-slate-200">{state.last.card.explanation}</p>
          <button className={primary} onClick={() => setState(next)} autoFocus>Next card</button>
        </section>
      ) : card ? (
        <section className="grid gap-3 rounded border-2 border-indigo-300/40 bg-slate-900/60 p-3" aria-label="Card">
          <p className="text-xs uppercase tracking-wide text-slate-400">{card.kind === "mcq" && card.variant ? (card.variant === "tradeoff" ? "trade-off duel" : "which technique?") : card.kind.replace("mcq", "multiple choice").replace("multi", "pick all").replace("curve", "diagnose the curve")} · {card.topic}</p>
          <p className="text-base leading-snug">{card.prompt}</p>
          <CardForm key={card.id} card={card} onSubmit={submit} />
        </section>
      ) : null}
    </main>
  );
}
