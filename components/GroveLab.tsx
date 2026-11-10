"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { accuracy, biasVariance, knn, logistic, makeData, tree, type DataId, type Predictor } from "@/lib/classic/boundary";

type Tab = "boundary" | "bias";
type Model = "knn" | "tree" | "logistic";
const DATA: { id: DataId; label: string }[] = [{ id: "blobs", label: "Two blobs" }, { id: "moons", label: "Moons" }, { id: "xor", label: "XOR" }];
const MODELS: { id: Model; label: string }[] = [{ id: "knn", label: "k-NN" }, { id: "tree", label: "Decision tree" }, { id: "logistic", label: "Logistic" }];
const S = 320;
const G = 64;

function BoundaryPanel() {
  const [data, setData] = useState<DataId>("moons");
  const [model, setModel] = useState<Model>("knn");
  const [k, setK] = useState(5);
  const [depth, setDepth] = useState(3);
  const [noise, setNoise] = useState(0.1);
  const ref = useRef<HTMLCanvasElement>(null);
  const train = useMemo(() => makeData(data, 80, noise, 3), [data, noise]);
  const test = useMemo(() => makeData(data, 400, noise, 77), [data, noise]);
  const f: Predictor = useMemo(() => (model === "knn" ? knn(train, k) : model === "tree" ? tree(train, depth) : logistic(train)), [model, train, k, depth]);
  const trainAcc = accuracy(f, train), testAcc = accuracy(f, test);
  useEffect(() => {
    const cv = ref.current; if (!cv) return;
    const ctx = cv.getContext("2d")!;
    const cell = S / G;
    for (let i = 0; i < G; i++) for (let j = 0; j < G; j++) {
      ctx.fillStyle = f((i + 0.5) / G, 1 - (j + 0.5) / G) ? "#4a2f52" : "#1d3a4a";
      ctx.fillRect(i * cell, j * cell, cell + 0.5, cell + 0.5);
    }
    for (const p of train) {
      ctx.beginPath(); ctx.arc(p.x * S, (1 - p.y) * S, 4, 0, 7);
      ctx.fillStyle = p.label ? "#ff7ac6" : "#5eead4"; ctx.fill();
      ctx.strokeStyle = "#0f172a"; ctx.lineWidth = 1.5; ctx.stroke();
    }
  }, [f, train]);
  const btn = (on: boolean) => `min-h-11 rounded border px-3 py-1 ${on ? "border-teal-300 bg-slate-700" : "border-slate-500"}`;
  return (
    <section className="space-y-3 text-sm" aria-label="Decision boundaries">
      <p className="text-slate-300">Background colour is what the model predicts at every point; dots are the 80 training samples. Accuracy is measured on 400 fresh points. Watch training accuracy and test accuracy part ways as the model gets more flexible.</p>
      <div className="flex flex-wrap gap-2" role="group" aria-label="Dataset">{DATA.map((d) => <button key={d.id} type="button" aria-pressed={data === d.id} onClick={() => setData(d.id)} className={btn(data === d.id)}>{d.label}</button>)}</div>
      <div className="flex flex-wrap gap-2" role="group" aria-label="Model">{MODELS.map((m) => <button key={m.id} type="button" aria-pressed={model === m.id} onClick={() => setModel(m.id)} className={btn(model === m.id)}>{m.label}</button>)}</div>
      <canvas ref={ref} width={S} height={S} className="h-auto w-full max-w-[320px] rounded border border-slate-600" style={{ imageRendering: "pixelated" }} aria-label="Decision regions and training points" />
      {model === "knn" && <label className="flex flex-col gap-1"><span>neighbours, k = {k}</span><input type="range" min={1} max={79} value={k} onChange={(e) => setK(Number(e.target.value))} aria-label="Neighbours k" className="min-h-11" /></label>}
      {model === "tree" && <label className="flex flex-col gap-1"><span>max depth = {depth}</span><input type="range" min={0} max={8} value={depth} onChange={(e) => setDepth(Number(e.target.value))} aria-label="Max depth" className="min-h-11" /></label>}
      <label className="flex flex-col gap-1"><span>data noise = {noise.toFixed(2)}</span><input type="range" min={0.02} max={0.15} step={0.01} value={noise} onChange={(e) => setNoise(Number(e.target.value))} aria-label="Data noise" className="min-h-11" /></label>
      <ul className="space-y-1"><li>train accuracy: <strong data-testid="train-acc">{(trainAcc * 100).toFixed(1)}%</strong></li><li>test accuracy: <strong data-testid="test-acc">{(testAcc * 100).toFixed(1)}%</strong></li></ul>
      <p className="text-slate-400">Try 1-NN or a depth-8 tree on noisy moons: training accuracy hits 100% while test accuracy sags (variance). Try logistic on XOR: it can only draw one line (bias). A greedy tree needs depth 4 on XOR because the first split gains nothing.</p>
    </section>
  );
}

function BiasPanel() {
  const [n, setN] = useState(20);
  const [noise, setNoise] = useState(0.3);
  const ref = useRef<HTMLCanvasElement>(null);
  const bv = useMemo(() => biasVariance(n, noise, 12), [n, noise]);
  const best = bv.reduce((a, b) => (b.testMse < a.testMse ? b : a));
  useEffect(() => {
    const cv = ref.current; if (!cv) return;
    const ctx = cv.getContext("2d")!; const W = 480, H = 220;
    ctx.fillStyle = "#0f172a"; ctx.fillRect(0, 0, W, H);
    const top = Math.min(2, Math.max(...bv.map((p) => p.testMse)));
    const X = (d: number) => 20 + (d / 12) * (W - 40), Y = (v: number) => H - 20 - (Math.min(v, top) / top) * (H - 40);
    const line = (key: "trainMse" | "testMse", c: string) => { ctx.strokeStyle = c; ctx.lineWidth = 2; ctx.beginPath(); bv.forEach((p, i) => (i ? ctx.lineTo(X(p.degree), Y(p[key])) : ctx.moveTo(X(p.degree), Y(p[key])))); ctx.stroke(); };
    line("trainMse", "#5eead4"); line("testMse", "#ff7ac6");
    ctx.fillStyle = "#ffd166"; ctx.beginPath(); ctx.arc(X(best.degree), Y(best.testMse), 5, 0, 7); ctx.fill();
  }, [bv, best]);
  return (
    <section className="space-y-3 text-sm" aria-label="Bias and variance">
      <p className="text-slate-300">Fit polynomials of degree 0-12 to {n} noisy samples of a sine wave. Teal is error on the data it was fitted to; pink is error on 400 fresh points; the gold dot is the best degree.</p>
      <canvas ref={ref} width={480} height={220} className="h-auto w-full max-w-[480px] rounded border border-slate-600" style={{ imageRendering: "pixelated" }} aria-label="Train and test error against polynomial degree" />
      <label className="flex flex-col gap-1"><span>training samples = {n}</span><input type="range" min={10} max={200} value={n} onChange={(e) => setN(Number(e.target.value))} aria-label="Training samples" className="min-h-11" /></label>
      <label className="flex flex-col gap-1"><span>noise sd = {noise.toFixed(2)}</span><input type="range" min={0.05} max={0.8} step={0.05} value={noise} onChange={(e) => setNoise(Number(e.target.value))} aria-label="Noise sd" className="min-h-11" /></label>
      <ul className="space-y-1"><li>best degree by test error: <strong data-testid="best-degree">{best.degree}</strong> (test MSE {best.testMse.toFixed(3)})</li><li>degree 12: train {bv[12].trainMse.toFixed(3)} vs test {bv[12].testMse.toFixed(3)}</li></ul>
      <p className="text-slate-400">Low degree: high bias (underfits, both errors high). High degree: high variance (train error keeps falling, test error rises). More data pushes the best degree up; more noise pulls it down. Test error here is estimated on one fixed draw, so small gaps are noise.</p>
    </section>
  );
}

export default function GroveLab() {
  const [tab, setTab] = useState<Tab>("boundary");
  return (
    <main className="mx-auto max-w-3xl p-4 text-slate-100">
      <h1 className="font-pixel text-lg">Classic Grove lab · dev</h1>
      <div className="my-3 flex flex-wrap gap-2" role="tablist" aria-label="Visualiser">
        {([["boundary", "Decision boundaries"], ["bias", "Bias-variance"]] as const).map(([id, label]) => (
          <button key={id} role="tab" type="button" aria-selected={tab === id} onClick={() => setTab(id)} className={`min-h-11 rounded border px-3 py-1 ${tab === id ? "border-teal-300 bg-slate-700" : "border-slate-500"}`}>{label}</button>
        ))}
      </div>
      {tab === "boundary" ? <BoundaryPanel /> : <BiasPanel />}
    </main>
  );
}
