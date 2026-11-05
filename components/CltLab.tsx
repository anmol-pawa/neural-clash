"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { DISTS, clt, freqTree, histogram, normalPdf, sampleMeans, simulatePeeking, summarise, type DistId } from "@/lib/prob/clt";

type Tab = "clt" | "bayes" | "peek";
const TABS: { id: Tab; label: string }[] = [
  { id: "clt", label: "Law of the mean (CLT)" },
  { id: "bayes", label: "Base-rate tree" },
  { id: "peek", label: "Peeking" },
];
const W = 480;
const H = 220;

function drawHist(cv: HTMLCanvasElement, means: number[], mu: number, se: number, lo: number, hi: number) {
  const ctx = cv.getContext("2d")!;
  ctx.fillStyle = "#0f172a"; ctx.fillRect(0, 0, W, H);
  const bins = 48;
  const h = histogram(means, bins, lo, hi);
  const bw = (hi - lo) / bins;
  const dens = h.map((c) => c / (means.length * bw));
  const peak = Math.max(...dens, normalPdf(mu, mu, se));
  const bx = W / bins;
  ctx.fillStyle = "#5eead4";
  dens.forEach((d, i) => { const bh = Math.round((d / peak) * (H - 20)); ctx.fillRect(Math.round(i * bx) + 1, H - bh, Math.ceil(bx) - 1, bh); });
  ctx.strokeStyle = "#ffd166"; ctx.lineWidth = 2; ctx.beginPath();
  for (let px = 0; px <= W; px += 3) {
    const x = lo + (px / W) * (hi - lo);
    const y = H - (normalPdf(x, mu, se) / peak) * (H - 20);
    if (px) ctx.lineTo(px, y); else ctx.moveTo(px, y);
  }
  ctx.stroke();
}

function CltPanel() {
  const [dist, setDist] = useState<DistId>("exponential");
  const [n, setN] = useState(5);
  const ref = useRef<HTMLCanvasElement>(null);
  const trials = 3000;
  const means = useMemo(() => sampleMeans(dist, n, trials, 11), [dist, n]);
  const sum = useMemo(() => summarise(means), [means]);
  const pred = clt(dist, n);
  const d = DISTS[dist];
  useEffect(() => {
    // Fixed per-distribution window so the narrowing with n is visible; outliers clamp into the end bins.
    const hi = dist === "exponential" ? 3 : 1;
    if (ref.current) drawHist(ref.current, means, pred.mean, pred.se, 0, hi);
  }, [means, pred.mean, pred.se, dist]);
  return (
    <section className="space-y-3 text-sm" aria-label="Central limit theorem">
      <p className="text-slate-300">Each bar is how often the <em>mean of {n} draws</em> landed there, over {trials} repeats. The gold curve is what the CLT predicts: a normal with mean μ and standard error σ/√n.</p>
      <div className="flex flex-wrap gap-2" role="group" aria-label="Source distribution">
        {Object.values(DISTS).map((x) => (
          <button key={x.id} type="button" aria-pressed={dist === x.id} onClick={() => setDist(x.id)} className={`min-h-11 rounded border px-3 py-1 ${dist === x.id ? "border-teal-300 bg-slate-700" : "border-slate-500"}`}>{x.label}</button>
        ))}
      </div>
      <p className="text-slate-300">{d.blurb}</p>
      <canvas ref={ref} width={W} height={H} className="h-auto w-full max-w-[480px] rounded border border-slate-600" style={{ imageRendering: "pixelated" }} aria-label="Histogram of sample means with the normal prediction" />
      <label className="flex flex-col gap-1"><span>draws per mean, n = {n}</span>
        <input type="range" min={1} max={100} step={1} value={n} onChange={(e) => setN(Number(e.target.value))} aria-label="Draws per mean" className="min-h-11" />
      </label>
      <ul className="space-y-1" data-testid="clt-readout">
        <li>measured sd of the means: <strong data-testid="clt-sd">{sum.sd.toFixed(4)}</strong> vs σ/√n = {pred.se.toFixed(4)}</li>
        <li>measured mean: {sum.mean.toFixed(4)} vs μ = {pred.mean}</li>
        <li>skewness: <strong data-testid="clt-skew">{sum.skew.toFixed(2)}</strong> (0 is symmetric)</li>
      </ul>
      <p className="text-slate-400">Takeaway: averaging shrinks spread by √n (to halve the noise you need 4× the data) and, for well-behaved sources, washes out the shape. Heavy-tailed data with no finite variance breaks this.</p>
    </section>
  );
}

function BayesPanel() {
  const [prior, setPrior] = useState(0.01);
  const [sens, setSens] = useState(0.9);
  const [fpr, setFpr] = useState(0.05);
  const t = freqTree(prior, sens, fpr, 10000);
  const pct = (x: number) => `${(x * 100).toFixed(1)}%`;
  const box = (label: string, n: number, tone: string) => (
    <div className={`rounded border p-2 text-center ${tone}`}><div className="text-xs text-slate-300">{label}</div><div className="font-pixel text-base">{n}</div></div>
  );
  return (
    <section className="space-y-3 text-sm" aria-label="Base-rate tree">
      <p className="text-slate-300">Think in natural frequencies: out of 10,000 people, how many fall into each box? The answer to “I tested positive, am I sick?” is just the green box divided by both positive boxes.</p>
      {[["Prevalence (prior)", prior, setPrior, 0.001, 0.5, 0.001], ["Sensitivity P(+ | sick)", sens, setSens, 0.5, 0.999, 0.001], ["False-positive rate P(+ | healthy)", fpr, setFpr, 0.001, 0.5, 0.001]].map(([name, val, set, lo, hi, st]) => (
        <label key={name as string} className="flex flex-col gap-1"><span>{name as string} = {pct(val as number)}</span>
          <input type="range" min={lo as number} max={hi as number} step={st as number} value={val as number} onChange={(e) => (set as (v: number) => void)(Number(e.target.value))} aria-label={name as string} className="min-h-11" /></label>
      ))}
      <div className="grid grid-cols-2 gap-2" data-testid="tree">
        {box(`sick (${pct(prior)})`, t.sick, "border-rose-400")}{box("healthy", t.healthy, "border-sky-400")}
        {box("sick, test + (true positive)", t.truePos, "border-emerald-400 bg-emerald-950")}{box("healthy, test + (false positive)", t.falsePos, "border-amber-400 bg-amber-950")}
        {box("sick, test − (miss)", t.falseNeg, "border-slate-600")}{box("healthy, test − (true negative)", t.trueNeg, "border-slate-600")}
      </div>
      <p>P(sick | positive) = {t.truePos} / ({t.truePos} + {t.falsePos}) = <strong data-testid="posterior">{pct(t.posterior)}</strong></p>
      <p className="text-slate-400">When the condition is rare, even a good test produces mostly false alarms, because healthy people vastly outnumber sick ones. Counts are rounded to whole people.</p>
    </section>
  );
}

function PeekPanel() {
  const [looks, setLooks] = useState(10);
  const r = useMemo(() => simulatePeeking({ nPerArm: 1000, looks, rate: 0.1, experiments: 1500, seed: 21 }), [looks]);
  const pct = (x: number) => `${(x * 100).toFixed(1)}%`;
  return (
    <section className="space-y-3 text-sm" aria-label="Peeking simulator">
      <p className="text-slate-300">1,500 A/A tests: both arms have the <em>same</em> 10% conversion rate, so every “significant” result is a false alarm. You check the p-value {looks} time{looks === 1 ? "" : "s"} and stop at the first |z| &gt; 1.96.</p>
      <label className="flex flex-col gap-1"><span>number of looks = {looks}</span>
        <input type="range" min={1} max={20} step={1} value={looks} onChange={(e) => setLooks(Number(e.target.value))} aria-label="Number of looks" className="min-h-11" /></label>
      <ul className="space-y-1">
        <li>false-positive rate if you stop at the first hit: <strong data-testid="peek-fpr">{pct(r.falsePositiveRate)}</strong></li>
        <li>if you only read the final look: {pct(r.finalLookOnlyRate)} (the planned 5%)</li>
        <li>naive independent-looks bound 1 − 0.95^{looks}: {pct(r.independentBound)} (an overestimate, since looks share data)</li>
      </ul>
      <div className="h-6 w-full rounded bg-slate-800" aria-hidden><div className="h-6 rounded bg-rose-400" style={{ width: `${Math.min(100, r.falsePositiveRate * 100 * 2)}%` }} /></div>
      <p className="text-slate-400">Fixes: decide the sample size up front, or use a sequential method built for repeated looks (alpha-spending or always-valid tests). Monte-Carlo estimate with 1,500 runs, so about ±1 point of noise.</p>
    </section>
  );
}

export default function CltLab() {
  const [tab, setTab] = useState<Tab>("clt");
  return (
    <main className="mx-auto max-w-3xl p-4 text-slate-100">
      <h1 className="font-pixel text-lg">Probability lab · dev</h1>
      <div className="my-3 flex flex-wrap gap-2" role="tablist" aria-label="Visualiser">
        {TABS.map((t) => (
          <button key={t.id} role="tab" type="button" aria-selected={tab === t.id} onClick={() => setTab(t.id)} className={`min-h-11 rounded border px-3 py-1 ${tab === t.id ? "border-teal-300 bg-slate-700" : "border-slate-500"}`}>{t.label}</button>
        ))}
      </div>
      {tab === "clt" ? <CltPanel /> : tab === "bayes" ? <BayesPanel /> : <PeekPanel />}
    </main>
  );
}
