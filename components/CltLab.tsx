"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { SOURCES, bayesTree, normalPdf, runClt, simulatePeeking, type SourceId } from "@/lib/prob/sim";

type Tab = "clt" | "bayes" | "peek";
const W = 420;
const H = 240;
const pct = (x: number, d = 1) => (Number.isFinite(x) ? `${(x * 100).toFixed(d)}%` : "n/a");

function drawClt(cv: HTMLCanvasElement, hist: { lo: number; hi: number; density: number }[], mu: number, sd: number) {
  const ctx = cv.getContext("2d")!;
  ctx.fillStyle = "#0f172a"; ctx.fillRect(0, 0, W, H);
  const lo = hist[0].lo, hi = hist[hist.length - 1].hi;
  const peak = Math.max(...hist.map((h) => h.density), normalPdf(mu, mu, sd));
  const X = (x: number) => ((x - lo) / (hi - lo)) * W;
  const Y = (d: number) => H - 14 - (d / peak) * (H - 30);
  for (const h of hist) {
    ctx.fillStyle = "#5eead4";
    const x0 = Math.round(X(h.lo)), x1 = Math.round(X(h.hi));
    ctx.fillRect(x0 + 1, Y(h.density), Math.max(1, x1 - x0 - 1), H - 14 - Y(h.density));
  }
  ctx.strokeStyle = "#ffd166"; ctx.lineWidth = 2; ctx.beginPath();
  for (let px = 0; px <= W; px += 3) {
    const x = lo + (px / W) * (hi - lo);
    const y = Y(normalPdf(x, mu, sd));
    if (px) ctx.lineTo(px, y); else ctx.moveTo(px, y);
  }
  ctx.stroke();
  ctx.fillStyle = "#cbd5e1"; ctx.font = "11px monospace";
  ctx.fillText(lo.toFixed(2), 2, H - 2); ctx.fillText(hi.toFixed(2), W - 34, H - 2);
}

function Clt() {
  const [src, setSrc] = useState<SourceId>("exponential");
  const [n, setN] = useState(1);
  const [seed, setSeed] = useState(1);
  const reps = 3000;
  const r = useMemo(() => runClt(src, n, reps, seed), [src, n, seed]);
  const ref = useRef<HTMLCanvasElement>(null);
  const s = SOURCES[src];
  useEffect(() => { if (ref.current) drawClt(ref.current, r.hist, s.mean, r.predictedSd); }, [r, s]);
  return (
    <div className="flex flex-col gap-4 md:flex-row">
      <canvas ref={ref} width={W} height={H} className="h-auto w-full max-w-[420px] self-start rounded border border-slate-600" style={{ imageRendering: "pixelated" }} aria-label="Histogram of sample means with the normal curve predicted by the central limit theorem" />
      <div className="flex-1 space-y-3 text-sm">
        <p className="text-slate-300">Each bar counts how many of {reps} experiments produced that average of n draws. The gold curve is the normal the theorem predicts: mean μ, spread σ/√n.</p>
        <div className="flex flex-wrap gap-2" role="group" aria-label="Source distribution">
          {Object.values(SOURCES).map((x) => (
            <button key={x.id} type="button" aria-pressed={src === x.id} onClick={() => setSrc(x.id)} className={`min-h-11 rounded border px-3 py-1 ${src === x.id ? "border-teal-300 bg-slate-700" : "border-slate-500"}`}>{x.label}</button>
          ))}
        </div>
        <label className="flex flex-col gap-1">
          <span>draws per average n = {n}</span>
          <input type="range" min={1} max={200} step={1} value={n} onChange={(e) => setN(Number(e.target.value))} aria-label="Draws per average" className="min-h-11" />
        </label>
        <button type="button" onClick={() => setSeed((x) => x + 1)} className="min-h-11 rounded border border-slate-500 px-3">Re-run with a new seed ({seed})</button>
        <ul className="space-y-1 text-slate-300" data-testid="clt-stats">
          <li>mean of averages {r.sampleMean.toFixed(3)} (μ = {s.mean.toFixed(3)})</li>
          <li data-testid="clt-sd">spread {r.sampleSd.toFixed(4)} vs σ/√n = {r.predictedSd.toFixed(4)}</li>
          <li data-testid="clt-skew">skewness {r.skewness.toFixed(2)} (a normal has 0)</li>
          <li>within ±1.96 SE of μ: {pct(r.coverage95)} (normal: 95.0%)</li>
        </ul>
        <p className="text-slate-400">Quadruple n and the spread halves, but each source needs a different n before the bell looks right: skewed and spiky sources need more. Heavy-tailed sources (Cauchy) never converge: the theorem needs a finite variance.</p>
      </div>
    </div>
  );
}

function Bayes() {
  const [prev, setPrev] = useState(0.01);
  const [sens, setSens] = useState(0.9);
  const [spec, setSpec] = useState(0.95);
  const t = bayesTree(prev, sens, spec);
  const R = (x: number) => Math.round(x).toLocaleString();
  const bar = (label: string, v: number, color: string) => (
    <div className="flex items-center gap-2"><span className="inline-block h-4" style={{ background: color, width: `${Math.max(2, (v / t.population) * 100)}%` }} /><span>{label}: <strong>{R(v)}</strong></span></div>
  );
  return (
    <div className="flex flex-col gap-4 md:flex-row">
      <div className="flex-1 space-y-2 text-sm" aria-label="Frequency tree">
        <p className="text-slate-300">Imagine {t.population.toLocaleString()} people. Count the groups instead of multiplying probabilities.</p>
        <p>Sick: <strong>{R(t.sick)}</strong> · Healthy: <strong>{R(t.healthy)}</strong></p>
        {bar("sick, test positive (true +)", t.truePositives, "#5eead4")}
        {bar("sick, test negative (missed)", t.falseNegatives, "#94a3b8")}
        {bar("healthy, test positive (false +)", t.falsePositives, "#ff6b6b")}
        {bar("healthy, test negative", t.trueNegatives, "#334155")}
        <p className="rounded border border-slate-600 p-2" data-testid="bayes-ppv">Of everyone who tests positive ({R(t.truePositives + t.falsePositives)}), only <strong>{pct(t.ppv)}</strong> are sick. That is P(sick | positive) = TP / (TP + FP).</p>
        <p className="text-slate-400" data-testid="bayes-npv">A negative result is right {pct(t.npv, 2)} of the time. Same test, different base rate, different answer: that is why precision on a rare class collapses.</p>
      </div>
      <div className="flex-1 space-y-3 text-sm">
        <label className="flex flex-col gap-1"><span>prevalence (base rate) = {pct(prev, 2)}</span>
          <input type="range" min={0.001} max={0.5} step={0.001} value={prev} onChange={(e) => setPrev(Number(e.target.value))} aria-label="Prevalence" className="min-h-11" /></label>
        <label className="flex flex-col gap-1"><span>sensitivity (true positive rate) = {pct(sens, 0)}</span>
          <input type="range" min={0.5} max={1} step={0.01} value={sens} onChange={(e) => setSens(Number(e.target.value))} aria-label="Sensitivity" className="min-h-11" /></label>
        <label className="flex flex-col gap-1"><span>specificity (true negative rate) = {pct(spec, 0)}</span>
          <input type="range" min={0.5} max={1} step={0.01} value={spec} onChange={(e) => setSpec(Number(e.target.value))} aria-label="Specificity" className="min-h-11" /></label>
        <p className="text-slate-400">ML link: a fraud model with 99% specificity on a 0.1% fraud rate still flags about ten innocent transactions for each real one.</p>
      </div>
    </div>
  );
}

function Peek() {
  const [looks, setLooks] = useState(10);
  const [seed, setSeed] = useState(7);
  const perLook = 150;
  const r = useMemo(() => simulatePeeking(800, looks, perLook, 0.1, 0.05, seed), [looks, seed]);
  return (
    <div className="space-y-3 text-sm">
      <p className="text-slate-300">800 A/A experiments: both arms convert at 10%, so every “winner” is a false alarm. Each experiment collects {perLook} users per arm between looks. A fixed-horizon test checks once at the end; a peeker stops the first time p &lt; 0.05.</p>
      <label className="flex flex-col gap-1"><span>number of looks = {looks}</span>
        <input type="range" min={1} max={20} step={1} value={looks} onChange={(e) => setLooks(Number(e.target.value))} aria-label="Number of looks" className="min-h-11" /></label>
      <button type="button" onClick={() => setSeed((x) => x + 1)} className="min-h-11 rounded border border-slate-500 px-3">New seed ({seed})</button>
      <div className="space-y-2" data-testid="peek-rates">
        <div className="flex items-center gap-2"><span className="inline-block h-5 bg-teal-300" style={{ width: `${r.fixedHorizonRate * 300}px` }} /> <span>fixed horizon false positives: <strong data-testid="peek-fixed">{pct(r.fixedHorizonRate)}</strong></span></div>
        <div className="flex items-center gap-2"><span className="inline-block h-5 bg-red-400" style={{ width: `${r.peekingRate * 300}px` }} /> <span>peeking false positives: <strong data-testid="peek-peeking">{pct(r.peekingRate)}</strong></span></div>
        <div className="flex items-center gap-2"><span className="inline-block h-5 bg-slate-500" style={{ width: `${r.independentBound * 300}px` }} /> <span>if looks were independent: {pct(r.independentBound)} (an upper bound; looks overlap, so reality is lower)</span></div>
      </div>
      <p className="text-slate-400">Fixes in practice: pre-register the sample size, or use a sequential method built for repeated looks (alpha-spending / group-sequential boundaries, or always-valid inference). Simulated with a seeded generator; rerun with another seed to see the Monte Carlo wobble.</p>
    </div>
  );
}

export default function CltLab() {
  const [tab, setTab] = useState<Tab>("clt");
  return (
    <main className="mx-auto max-w-5xl p-4 text-slate-100">
      <h1 className="font-pixel text-lg">Probability lab · dev</h1>
      <div className="my-3 flex flex-wrap gap-2" role="tablist" aria-label="Simulator">
        {([["clt", "Central limit"], ["bayes", "Base rates"], ["peek", "Peeking"]] as [Tab, string][]).map(([id, label]) => (
          <button key={id} type="button" role="tab" aria-selected={tab === id} onClick={() => setTab(id)} className={`min-h-11 rounded border px-3 py-1 ${tab === id ? "border-teal-300 bg-slate-700" : "border-slate-500"}`}>{label}</button>
        ))}
      </div>
      {tab === "clt" && <Clt />}
      {tab === "bayes" && <Bayes />}
      {tab === "peek" && <Peek />}
    </main>
  );
}
