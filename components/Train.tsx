"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { companionStats } from "@/lib/labs/companion";
import type { ToyKind } from "@/lib/train/datasets";
import { startTraining } from "@/lib/train/client";
import type { EpochPoint } from "@/lib/train/linear";
import { BOUND, GRID, type SessionEvent, type SessionRequest } from "@/lib/train/session";

const KINDS: { id: ToyKind; label: string; hint: string }[] = [
  { id: "blobs", label: "Blobs", hint: "Two clusters. A straight line is enough." },
  { id: "xor", label: "XOR", hint: "Opposite corners match. No single line works; add x1·x2 (degree 2)." },
  { id: "circles", label: "Rings", hint: "One class inside the other. Squared terms help." },
  { id: "moons", label: "Moons", hint: "Interlocking arcs. Needs a curved boundary, but not too curved." },
  { id: "line", label: "Line", hint: "Regression: predict a number, scored by R²." },
];
const LRS = [0.01, 0.03, 0.1, 0.3, 1];
const SIZE = 288;
const CELL = SIZE / GRID;
const PINK = [255, 107, 154];
const CYAN = [72, 214, 240];

/** Pixel-block heat map + training points on one canvas. */
function drawBoundary(cv: HTMLCanvasElement, grid: number[] | null, pts: { X: number[][]; y: number[] } | null, regression: boolean) {
  const g = cv.getContext("2d");
  if (!g) return;
  g.fillStyle = "#12142a";
  g.fillRect(0, 0, SIZE, SIZE);
  if (grid) {
    for (let r = 0; r < GRID; r++)
      for (let c = 0; c < GRID; c++) {
        const v = grid[r * GRID + c];
        const t = regression ? Math.min(1, Math.max(0, v / 4 + 0.5)) : v;
        const mix = (i: number) => Math.round(18 + (CYAN[i] * (1 - t) + PINK[i] * t - 18) * 0.55);
        g.fillStyle = `rgb(${mix(0)},${mix(1)},${mix(2)})`;
        g.fillRect(c * CELL, r * CELL, CELL, CELL);
      }
  }
  if (pts) {
    pts.X.forEach(([x1, x2], i) => {
      const px = ((x1 + BOUND) / (2 * BOUND)) * SIZE;
      const py = ((BOUND - x2) / (2 * BOUND)) * SIZE;
      const t = regression ? Math.min(1, Math.max(0, pts.y[i] / 4 + 0.5)) : pts.y[i];
      g.fillStyle = "#0e0f1a";
      g.fillRect(px - 5, py - 5, 10, 10);
      g.fillStyle = t > 0.5 ? "#ff6b9a" : "#48d6f0";
      g.fillRect(px - 3, py - 3, 6, 6);
    });
  }
}

/** Train (accent) and validation (amber) loss curves, y clipped to the training range so a blow-up stays legible. */
function drawLoss(cv: HTMLCanvasElement, hist: EpochPoint[], epochs: number) {
  const g = cv.getContext("2d");
  if (!g) return;
  const W = cv.width;
  const H = cv.height;
  g.fillStyle = "#12142a";
  g.fillRect(0, 0, W, H);
  g.strokeStyle = "#2a2e50";
  g.lineWidth = 1;
  for (let i = 1; i < 4; i++) {
    g.beginPath();
    g.moveTo(0, (H * i) / 4);
    g.lineTo(W, (H * i) / 4);
    g.stroke();
  }
  if (hist.length < 2) return;
  const tr = hist.map((h) => h.trainLoss);
  const top = Math.max(...tr.slice(0, 5), 1e-6) * 1.05;
  const line = (vals: (number | undefined)[], color: string) => {
    g.strokeStyle = color;
    g.lineWidth = 3;
    g.beginPath();
    let started = false;
    hist.forEach((h, i) => {
      const v = vals[i];
      if (v === undefined || !Number.isFinite(v)) return;
      const x = (h.epoch / Math.max(1, epochs - 1)) * (W - 6) + 3;
      const y = H - 4 - Math.min(1, Math.max(0, v / top)) * (H - 8);
      if (!started) g.moveTo(x, y);
      else g.lineTo(x, y);
      started = true;
    });
    g.stroke();
  };
  line(hist.map((h) => h.valLoss), "#fbbf24");
  line(tr, "#48d6f0");
}

interface Done {
  trainAcc: number;
  hidden: { score: number; loss: number; gap: number; params: number; r2: number };
}

export default function Train() {
  const [kind, setKind] = useState<ToyKind>("xor");
  const [degree, setDegree] = useState(1);
  const [lr, setLr] = useState(0.3);
  const [epochs, setEpochs] = useState(200);
  const [l2, setL2] = useState(0);
  const [noise, setNoise] = useState(0.35);
  const [nTrain, setNTrain] = useState(80);
  const [seed, setSeed] = useState(7);
  const [batch, setBatch] = useState(0);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [last, setLast] = useState<EpochPoint | null>(null);
  const [done, setDone] = useState<Done | null>(null);
  const [revealed, setRevealed] = useState(false);
  const boundaryRef = useRef<HTMLCanvasElement>(null);
  const lossRef = useRef<HTMLCanvasElement>(null);
  const cancelRef = useRef<(() => void) | null>(null);
  const histRef = useRef<EpochPoint[]>([]);
  const ptsRef = useRef<{ X: number[][]; y: number[] } | null>(null);
  const regression = kind === "line";

  const run = useCallback(() => {
    cancelRef.current?.();
    histRef.current = [];
    ptsRef.current = null;
    setDone(null);
    setRevealed(false);
    setError(null);
    setRunning(true);
    const req: SessionRequest = { kind, nTrain, nTest: 400, noise, seed, frames: 80, cfg: { model: regression ? "linear" : "logistic", lr: regression ? Math.min(lr, 0.3) : lr, epochs, l2, degree, batchSize: batch, seed } };
    cancelRef.current = startTraining(
      req,
      (e: SessionEvent) => {
        if (e.type === "epoch") {
          histRef.current.push(e.point);
          setLast(e.point);
          if (boundaryRef.current) drawBoundary(boundaryRef.current, e.grid, null, regression);
          if (lossRef.current) drawLoss(lossRef.current, histRef.current, e.epochs);
        } else {
          ptsRef.current = e.points;
          if (boundaryRef.current) drawBoundary(boundaryRef.current, e.grid, e.points, regression);
          const t = e.sealed.test;
          const s = Number.isNaN(t.accuracy) ? t.r2 : t.accuracy;
          setDone({ trainAcc: Number.isNaN(e.trainMetrics.accuracy) ? e.trainMetrics.r2 : e.trainMetrics.accuracy, hidden: { score: Math.max(0, Math.min(1, s)), loss: t.loss, gap: e.sealed.gap, params: e.sealed.params, r2: e.sealed.r2 } });
          setRunning(false);
        }
      },
      (m) => {
        setError(m);
        setRunning(false);
      },
    );
  }, [kind, nTrain, noise, seed, regression, lr, epochs, l2, degree, batch]);

  useEffect(() => {
    const id = setTimeout(run, 0);
    return () => {
      clearTimeout(id);
      cancelRef.current?.();
    };
    // First run only; later runs are explicit.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const stats = done ? companionStats({ r2: done.hidden.r2, generalisationGap: done.hidden.gap, params: done.hidden.params }) : null;
  const sel = "min-h-11 rounded border border-white/20 bg-black/40 px-2 text-sm";
  const lab = "grid gap-1 text-xs text-white/70";

  return (
    <main className="mx-auto grid max-w-5xl gap-4 px-4 py-6">
      <header className="flex items-center justify-between gap-2">
        <h1 className="font-display text-3xl text-[var(--accent)]">TRAINING GROUNDS</h1>
        <Link href="/" className="px-btn px-3 py-2 text-sm">Title</Link>
      </header>
      <p className="max-w-2xl text-sm text-white/70">
        Train a companion on a toy world. You see the training points and a validation curve; the <b>hidden test set</b> stays sealed until you commit.
        Watch the boundary move, then try to make it generalise.
      </p>
      <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <section className="panel grid gap-3 p-3" aria-label="Controls">
          <div className="flex flex-wrap gap-2" role="group" aria-label="World">
            {KINDS.map((k) => (
              <button key={k.id} type="button" className={`px-btn px-3 text-sm ${kind === k.id ? "px-btn-primary" : ""}`} aria-pressed={kind === k.id} onClick={() => setKind(k.id)} data-testid={`kind-${k.id}`}>{k.label}</button>
            ))}
          </div>
          <p className="text-xs text-amber-100">{KINDS.find((k) => k.id === kind)?.hint}</p>
          <div className="grid grid-cols-2 gap-3">
            <label className={lab}>Feature degree
              <select className={sel} value={degree} onChange={(e) => setDegree(+e.target.value)} data-testid="degree">{[1, 2, 3, 4, 5, 6].map((d) => <option key={d} value={d}>{d}{d === 1 ? " (x1, x2)" : ""}</option>)}</select>
            </label>
            <label className={lab}>Learning rate
              <select className={sel} value={lr} onChange={(e) => setLr(+e.target.value)} data-testid="lr">{LRS.map((v) => <option key={v} value={v}>{v}</option>)}</select>
            </label>
            <label className={lab}>Epochs
              <select className={sel} value={epochs} onChange={(e) => setEpochs(+e.target.value)}>{[50, 100, 200, 500, 1000].map((v) => <option key={v} value={v}>{v}</option>)}</select>
            </label>
            <label className={lab}>L2 penalty
              <select className={sel} value={l2} onChange={(e) => setL2(+e.target.value)} data-testid="l2">{[0, 0.001, 0.01, 0.1].map((v) => <option key={v} value={v}>{v}</option>)}</select>
            </label>
            <label className={lab}>Training points
              <select className={sel} value={nTrain} onChange={(e) => setNTrain(+e.target.value)}>{[12, 30, 80, 200].map((v) => <option key={v} value={v}>{v}</option>)}</select>
            </label>
            <label className={lab}>Noise
              <select className={sel} value={noise} onChange={(e) => setNoise(+e.target.value)}>{[0.1, 0.2, 0.35, 0.6].map((v) => <option key={v} value={v}>{v}</option>)}</select>
            </label>
            <label className={lab}>Batch size
              <select className={sel} value={batch} onChange={(e) => setBatch(+e.target.value)}><option value={0}>full batch</option><option value={8}>8</option><option value={32}>32</option></select>
            </label>
            <label className={lab}>World seed
              <select className={sel} value={seed} onChange={(e) => setSeed(+e.target.value)}>{[1, 7, 13, 42].map((v) => <option key={v} value={v}>{v}</option>)}</select>
            </label>
          </div>
          <button type="button" className="px-btn px-btn-primary px-4 py-3 text-lg" onClick={run} data-testid="train-run">{running ? "Restart training" : "Train"}</button>
          {error && <p role="alert" className="text-sm text-red-300">Trainer error: {error}</p>}
        </section>
        <section className="grid gap-3" aria-label="Live view">
          <div className="panel p-2">
            <canvas ref={boundaryRef} width={SIZE} height={SIZE} className="mx-auto block aspect-square w-full max-w-[22rem]" style={{ imageRendering: "pixelated" }} role="img" aria-label="Decision boundary with training points" data-testid="boundary" />
            <p className="mt-1 text-center text-xs text-white/60">Boundary (cyan = class 0, pink = class 1). Training points only.</p>
          </div>
          <div className="panel p-2">
            <canvas ref={lossRef} width={320} height={140} className="block h-auto w-full" style={{ imageRendering: "pixelated" }} role="img" aria-label="Loss curves" data-testid="loss" />
            <p className="mt-1 text-xs text-white/60"><span className="text-cyan-300">■</span> train loss <span className="ml-2 text-amber-300">■</span> validation loss{last ? <span data-testid="epoch"> · epoch {last.epoch + 1}/{epochs} · train {last.trainLoss.toFixed(3)}{last.valLoss !== undefined ? ` · val ${last.valLoss.toFixed(3)}` : ""}</span> : null}</p>
          </div>
        </section>
      </div>
      <section className="panel grid gap-2 p-3" aria-label="Hidden test set">
        {!done ? (
          <p className="text-sm text-white/60">Training{running ? "…" : " not started."} The hidden test set unlocks when the run finishes.</p>
        ) : !revealed ? (
          <>
            <p className="text-sm">Run finished. Train {regression ? "R²" : "accuracy"}: <b data-testid="train-score">{(done.trainAcc * 100).toFixed(1)}%</b>. Ready to face the hidden test set?</p>
            <button type="button" className="px-btn px-btn-primary justify-self-start px-4 py-2" onClick={() => setRevealed(true)} data-testid="reveal">Reveal hidden score</button>
          </>
        ) : (
          <div className="grid gap-2" data-testid="revealed">
            <p className="text-sm">Hidden test {regression ? "R²" : "accuracy"}: <b data-testid="hidden-score">{(done.hidden.score * 100).toFixed(1)}%</b> · train-to-test loss gap {done.hidden.gap >= 0 ? "+" : ""}{done.hidden.gap.toFixed(3)} · {done.hidden.params} parameters</p>
            {stats && (
              <p className="text-sm" data-testid="stats">Companion stats (from measured results): Attack <b>{stats.attack}</b> · Defence <b>{stats.defence}</b> · Speed <b>{stats.speed}</b></p>
            )}
            <p className="text-xs text-white/60">{done.hidden.gap > 0.1 ? "A big gap means memorising: try fewer features, more data or an L2 penalty." : "Small gap: the model carries over to unseen points."}</p>
          </div>
        )}
      </section>
    </main>
  );
}
