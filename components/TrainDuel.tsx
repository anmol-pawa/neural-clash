"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { NEURON_PUP_PERCEPTRON_BACK } from "@/game/sprites/creatures/neuron-pup-perceptron-back";
import { NOISE_MINION } from "@/game/sprites/creatures/noise-minion";
import { frameToRGBA, type SpriteDef } from "@/game/sprites/pixel";
import type { CompanionStats } from "@/lib/labs/companion";
import { getSaveManager } from "@/lib/save/react";
import { commitCompanion } from "@/lib/save/companion";
import { OVERFIT_MINION, PLAYER_HP, companionHit, foeHit, simulateDuel } from "@/lib/train/duel";

const W = 288;
const H = 150;
const STEP_MS = 650;

const sheetCache = new Map<string, HTMLCanvasElement>();
function spriteCanvas(def: SpriteDef, frame: number, white: boolean): HTMLCanvasElement {
  const frames = def.anims.idle;
  const idx = frame % frames.length;
  const key = `${def.id}:${idx}:${white}`;
  let c = sheetCache.get(key);
  if (!c) {
    c = document.createElement("canvas");
    c.width = def.w;
    c.height = def.h;
    const recolor = white ? (): [number, number, number] => [255, 255, 255] : undefined;
    c.getContext("2d")!.putImageData(new ImageData(frameToRGBA(def, frames[idx], recolor) as Uint8ClampedArray<ArrayBuffer>, def.w, def.h), 0, 0);
    sheetCache.set(key, c);
  }
  return c;
}

interface Hit {
  who: "companion" | "foe";
  dmg: number;
  at: number;
}

function scene(g: CanvasRenderingContext2D, t: number, hit: Hit | null, cHp: number, fHp: number, fMax: number) {
  g.imageSmoothingEnabled = false;
  const sky = g.createLinearGradient(0, 0, 0, 90);
  sky.addColorStop(0, "#0d1033");
  sky.addColorStop(1, "#2a1f5c");
  g.fillStyle = sky;
  g.fillRect(0, 0, W, H);
  g.fillStyle = "#1b2a3a";
  g.fillRect(0, 100, W, H - 100);
  g.fillStyle = "#274055";
  g.fillRect(0, 100, W, 3);
  const frame = Math.floor(t / 400);
  const age = hit ? t - hit.at : 9999;
  const flash = (who: Hit["who"]) => hit?.who !== who && age < 160; // the one *not* acting is the one hit
  const shake = (who: Hit["who"]) => (hit && hit.who !== who && age < 220 ? Math.round(Math.sin(age / 18) * 3) : 0);
  const lunge = (who: Hit["who"]) => (hit && hit.who === who && age < 200 ? (who === "companion" ? 10 : -10) * Math.sin((age / 200) * Math.PI) : 0);
  // Foe (front sprite) upper right, companion (back sprite) lower left, drawn at 1.5x via integer-friendly 96px.
  g.drawImage(spriteCanvas(NOISE_MINION, frame, flash("foe")), 176 + shake("foe") + lunge("foe"), 18, 96, 96);
  g.drawImage(spriteCanvas(NEURON_PUP_PERCEPTRON_BACK, frame, flash("companion")), 14 + shake("companion") + lunge("companion"), 40, 96, 96);
  const bar = (x: number, y: number, hp: number, max: number, label: string) => {
    g.fillStyle = "#0e0f1a";
    g.fillRect(x, y, 100, 12);
    g.fillStyle = hp / max > 0.5 ? "#4ade80" : hp / max > 0.25 ? "#fbbf24" : "#f87171";
    g.fillRect(x + 2, y + 2, Math.round((96 * hp) / max), 8);
    g.fillStyle = "#e5e7eb";
    g.font = "8px monospace";
    g.fillText(label, x, y - 3);
  };
  bar(176, 14, fHp, fMax, OVERFIT_MINION.name);
  bar(10, 30, cHp, PLAYER_HP, "Your companion");
  if (hit && age < 700) {
    const x = hit.who === "companion" ? 220 : 60;
    g.fillStyle = hit.who === "companion" ? "#fde68a" : "#fca5a5";
    g.font = "bold 14px monospace";
    g.fillText(`-${hit.dmg}`, x, 70 - age / 20);
  }
}

export default function TrainDuel({ stats, world }: { stats: CompanionStats; world: string }) {
  const result = useMemo(() => simulateDuel(stats), [stats]);
  const [step, setStep] = useState(0);
  const [started, setStarted] = useState(false);
  const cvRef = useRef<HTMLCanvasElement>(null);
  const stepRef = useRef({ step: 0, at: 0 });

  const reduced = typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  const finished = started && step >= result.events.length;
  const playing = started && !finished;

  // Advance one event at a time.
  useEffect(() => {
    if (!playing) return;
    const id = setTimeout(() => {
      stepRef.current = { step: step + 1, at: performance.now() };
      setStep(step + 1);
    }, reduced ? 120 : STEP_MS);
    return () => clearTimeout(id);
  }, [playing, step, reduced]);

  // Commit the companion once, when the fight ends.
  useEffect(() => {
    if (finished) getSaveManager().update((s) => commitCompanion(s, { stats, world, won: result.won }));
  }, [finished, stats, world, result.won]);

  // Draw loop.
  useEffect(() => {
    const cv = cvRef.current;
    const g = cv?.getContext("2d");
    if (!cv || !g) return;
    let raf = 0;
    const loop = (now: number) => {
      const ev = step > 0 ? result.events[step - 1] : null;
      const cHp = ev ? ev.companionHp : PLAYER_HP;
      const fHp = ev ? ev.foeHp : OVERFIT_MINION.hp;
      const hit: Hit | null = ev && !reduced ? { who: ev.actor, dmg: ev.damage, at: stepRef.current.at } : null;
      scene(g, now, hit ? { ...hit, at: hit.at } : null, cHp, fHp, OVERFIT_MINION.hp);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [step, result, reduced]);

  const ev = step > 0 ? result.events[step - 1] : null;
  const line = ev
    ? ev.actor === "companion"
      ? `Your companion hits for ${ev.damage}.`
      : `${OVERFIT_MINION.name} hits for ${ev.damage}.`
    : `${result.firstStrike === "companion" ? "Your speed lets you strike first." : "The minion is faster and strikes first."}`;

  return (
    <div className="grid gap-2" data-testid="duel">
      <p className="text-sm text-white/70">
        Duel the Overfit minion with your <i>measured</i> stats: each hit of yours deals <b>{companionHit(stats.attack)}</b> (Attack), each of its hits deals <b>{foeHit(stats.defence)}</b> to you (Defence), and Speed decides who moves first.
      </p>
      <canvas ref={cvRef} width={W} height={H} className="mx-auto block w-full max-w-[28rem] rounded border border-white/10" style={{ imageRendering: "pixelated" }} role="img" aria-label="Duel between your companion and the Overfit minion" />
      <p className="min-h-5 text-center text-sm" aria-live="polite" data-testid="duel-log">{line}</p>
      {!started && (
        <button type="button" className="px-btn px-btn-primary justify-self-start px-4 py-2" onClick={() => { stepRef.current = { step: 0, at: performance.now() }; setStarted(true); }} data-testid="duel-start">Start duel</button>
      )}
      {finished && (
        <div className="grid gap-1" data-testid="duel-result">
          <p className="text-sm">
            <b className={result.won ? "text-emerald-300" : "text-red-300"}>{result.won ? "Victory" : result.ending === "timeout" ? "Stalemate: you cannot hurt it enough" : "Defeated"}</b> in {result.rounds} rounds. Companion saved{result.won ? "" : " (keeps your better one if you had it)"}.
          </p>
          <p className="text-xs text-white/60">
            {result.won
              ? "Generalising pays off. Try a smaller, simpler model next time to get faster too."
              : stats.defence < 50
                ? "Low Defence means a big train-to-test gap: the model memorised. Fewer features, more data or an L2 penalty."
                : "Low Attack means weak hidden-set accuracy. Give the model the features the world needs (hint on the left)."}
          </p>
        </div>
      )}
    </div>
  );
}
