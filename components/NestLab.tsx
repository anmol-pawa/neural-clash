"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { flowByDepth, probGrid, trainXor, type Act, type Init } from "@/lib/nn/nest";

type Tab = "xor" | "flow";
const slider = "min-h-11 w-full";
const fmt = (x: number) => (x === 0 ? "0" : x.toExponential(1));

function XorPanel() {
  const [hidden, setHidden] = useState(4);
  const [steps, setSteps] = useState(800);
  const run = useMemo(() => trainXor(hidden, steps), [hidden, steps]);
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const cv = ref.current; if (!cv) return;
    const n = 40, g = probGrid(run, hidden, n), ctx = cv.getContext("2d"); if (!ctx) return;
    const px = cv.width / n;
    for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) {
      const p = g[r * n + c];
      ctx.fillStyle = `rgb(${Math.round(40 + 190 * p)},${Math.round(70 + 60 * (1 - Math.abs(2 * p - 1)))},${Math.round(40 + 190 * (1 - p))})`;
      ctx.fillRect(c * px, r * px, px + 0.5, px + 0.5);
    }
    for (const d of run.data) {
      ctx.beginPath(); ctx.arc(d.x * cv.width, (1 - d.y) * cv.height, 3.5, 0, 7);
      ctx.fillStyle = d.label ? "#ffd166" : "#7fd8ff"; ctx.fill(); ctx.strokeStyle = "#0b1020"; ctx.stroke();
    }
  }, [run, hidden]);
  const last = run.losses[run.losses.length - 1];
  return (
    <section className="space-y-3 text-sm" aria-label="XOR decision boundary">
      <p className="text-slate-300">Four noisy clusters: opposite corners share a class. Train for {steps} full-batch gradient steps. With 0 hidden units the model is plain logistic regression: one straight line cannot separate XOR.</p>
      <canvas ref={ref} width={320} height={320} role="img" aria-label="Decision boundary" className="h-auto w-full max-w-xs rounded border border-slate-500" style={{ imageRendering: "pixelated" }} />
      <label className="flex flex-col gap-1"><span>hidden tanh units = {hidden}</span><input type="range" min={0} max={8} value={hidden} onChange={(e) => setHidden(Number(e.target.value))} aria-label="Hidden units" className={slider} /></label>
      <label className="flex flex-col gap-1"><span>training steps = {steps}</span><input type="range" min={50} max={2000} step={50} value={steps} onChange={(e) => setSteps(Number(e.target.value))} aria-label="Steps" className={slider} /></label>
      <p>accuracy <strong data-testid="xor-acc">{(run.accuracy * 100).toFixed(1)}%</strong>, loss <strong data-testid="xor-loss">{last.toFixed(3)}</strong> (start {run.losses[0].toFixed(3)})</p>
      <p className="text-slate-400">Two hidden units can in principle carve XOR; more units make it easier to find from a random start. Too few steps and the boundary has not bent yet. Deterministic seed; learning rate 0.5.</p>
    </section>
  );
}

const bar = (v: number) => `${Math.max(1, Math.min(100, 50 + 10 * Math.log10(Math.max(v, 1e-30))))}%`; // 50% = std 1, 10% per decade

function Series({ title, xs, id }: { title: string; xs: number[]; id: string }) {
  return (
    <div>
      <h3 className="mb-1 font-semibold">{title} <span className="text-slate-400">(log scale, bar centre = 1; layer 1 at the top)</span></h3>
      <ul className="space-y-0.5" data-testid={id}>
        {xs.map((v, i) => (
          <li key={i} className="flex items-center gap-2"><span className="w-6 text-right text-xs text-slate-400">{i + 1}</span><div className="h-2 flex-1 rounded bg-slate-800"><div className="h-2 rounded bg-teal-400" style={{ width: bar(v) }} /></div><span className="w-14 text-xs">{fmt(v)}</span></li>
        ))}
      </ul>
    </div>
  );
}

function FlowPanel() {
  const [act, setAct] = useState<Act>("tanh");
  const [init, setInit] = useState<Init>("xavier");
  const [depth, setDepth] = useState(20);
  const f = useMemo(() => flowByDepth(depth, 64, act, init), [act, init, depth]);
  const ratio = f.grad[0] / f.grad[depth - 1];
  return (
    <section className="space-y-3 text-sm" aria-label="Signal and gradient flow">
      <p className="text-slate-300">A random {depth}-layer net, 64 units wide, batch of 64 standard-normal inputs. Bars show the standard deviation of each layer&apos;s activations going forward, and of the gradient flowing back from a unit-variance loss signal at the top.</p>
      <div className="flex flex-wrap gap-2" role="group" aria-label="Activation">
        {(["tanh", "relu"] as const).map((a) => <button key={a} type="button" aria-pressed={act === a} onClick={() => setAct(a)} className={`min-h-11 rounded border px-3 ${act === a ? "border-teal-300 bg-slate-700" : "border-slate-500"}`}>{a}</button>)}
      </div>
      <div className="flex flex-wrap gap-2" role="group" aria-label="Initialisation">
        {([["tiny", "tiny (0.01)"], ["xavier", "Xavier"], ["he", "He"], ["large", "large (1.0)"]] as const).map(([id, l]) => <button key={id} type="button" aria-pressed={init === id} onClick={() => setInit(id)} className={`min-h-11 rounded border px-3 ${init === id ? "border-teal-300 bg-slate-700" : "border-slate-500"}`}>{l}</button>)}
      </div>
      <label className="flex flex-col gap-1"><span>depth = {depth}</span><input type="range" min={2} max={30} value={depth} onChange={(e) => setDepth(Number(e.target.value))} aria-label="Depth" className={slider} /></label>
      <Series title="Forward activation std" xs={f.act} id="flow-act" />
      <Series title="Backward gradient std" xs={f.grad} id="flow-grad" />
      <p>last-layer activation <strong data-testid="flow-last">{fmt(f.act[depth - 1])}</strong>; first-layer gradient / last-layer gradient = <strong data-testid="flow-ratio">{fmt(ratio)}</strong></p>
      <p className="text-slate-400">Tiny weights shrink signals to nothing, so the first layers get a gradient of almost zero. Large weights saturate tanh (outputs pinned at ±1) while gradients blow up. Xavier suits tanh and He suits ReLU, because each keeps the variance roughly constant layer to layer. Real nets add normalisation and residuals on top. Weights are random Gaussian; no training happens here.</p>
    </section>
  );
}

export default function NestLab() {
  const [tab, setTab] = useState<Tab>("xor");
  return (
    <main className="mx-auto max-w-3xl p-4 text-slate-100">
      <h1 className="font-pixel text-lg">Neuron Nest lab · dev</h1>
      <div className="my-3 flex flex-wrap gap-2" role="tablist" aria-label="Nest interactives">
        {([["xor", "XOR boundary"], ["flow", "Depth and init"]] as const).map(([id, label]) => (
          <button key={id} role="tab" type="button" aria-selected={tab === id} onClick={() => setTab(id)} className={`min-h-11 rounded border px-3 py-1 ${tab === id ? "border-teal-300 bg-slate-700" : "border-slate-500"}`}>{label}</button>
        ))}
      </div>
      {tab === "xor" ? <XorPanel /> : <FlowPanel />}
    </main>
  );
}
