"use client";

import { useMemo, useState } from "react";
import {
  accuracyOf, bestThreshold, confusionAt, costOf, makeRows, sampleSizePerArm, scoredPopulation, simulatePeeking, splitAccuracy, type SplitKind,
} from "@/lib/metrics/dojo";

type Tab = "cost" | "split" | "ab";
const pct = (x: number) => `${(x * 100).toFixed(1)}%`;
const slider = "min-h-11 w-full";

function CostPanel() {
  const [prev, setPrev] = useState(0.05);
  const [sep, setSep] = useState(2.2);
  const [fnCost, setFnCost] = useState(20);
  const [t, setT] = useState(0.5);
  const pop = useMemo(() => scoredPopulation(4000, prev, sep, 5), [prev, sep]);
  const m = { fp: 1, fn: fnCost };
  const c = confusionAt(pop, t);
  const best = useMemo(() => bestThreshold(pop, m), [pop, fnCost]); // eslint-disable-line react-hooks/exhaustive-deps
  const none = confusionAt(pop, Infinity);
  const cell = "rounded border border-slate-500 p-2 text-center";
  return (
    <section className="space-y-3 text-sm" aria-label="Confusion matrix and cost">
      <p className="text-slate-300">A fraud-style detector scores 4,000 transactions. Everything at or above your threshold is flagged. A false alarm costs 1; a missed case costs the amount you set. Find the threshold that minimises total cost.</p>
      <div className="grid max-w-sm grid-cols-2 gap-2" aria-label="Confusion matrix">
        <div className={cell}>caught (TP)<br /><strong data-testid="tp">{c.tp}</strong></div>
        <div className={cell}>false alarms (FP)<br /><strong data-testid="fp">{c.fp}</strong></div>
        <div className={cell}>missed (FN)<br /><strong data-testid="fn">{c.fn}</strong></div>
        <div className={cell}>correctly ignored (TN)<br /><strong>{c.tn}</strong></div>
      </div>
      <label className="flex flex-col gap-1"><span>threshold = {t.toFixed(2)}</span><input type="range" min={0.01} max={0.99} step={0.01} value={t} onChange={(e) => setT(Number(e.target.value))} aria-label="Threshold" className={slider} /></label>
      <label className="flex flex-col gap-1"><span>cost of a miss = {fnCost}x a false alarm</span><input type="range" min={1} max={100} value={fnCost} onChange={(e) => setFnCost(Number(e.target.value))} aria-label="Miss cost" className={slider} /></label>
      <label className="flex flex-col gap-1"><span>fraud rate = {pct(prev)}</span><input type="range" min={0.01} max={0.3} step={0.01} value={prev} onChange={(e) => setPrev(Number(e.target.value))} aria-label="Fraud rate" className={slider} /></label>
      <label className="flex flex-col gap-1"><span>model separation = {sep.toFixed(1)}</span><input type="range" min={0.5} max={4} step={0.1} value={sep} onChange={(e) => setSep(Number(e.target.value))} aria-label="Separation" className={slider} /></label>
      <ul className="space-y-1">
        <li>accuracy: <strong data-testid="acc">{pct(accuracyOf(c))}</strong>, total cost: <strong data-testid="cost">{costOf(c, m)}</strong></li>
        <li>flag-nothing baseline: accuracy {pct(accuracyOf(none))}, cost {costOf(none, m)}. High accuracy, zero value.</li>
        <li>best threshold: <strong data-testid="best-t">{Number.isFinite(best.t) ? best.t.toFixed(3) : "flag nothing"}</strong>, cost {best.cost} ({best.counts.tp} caught, {best.counts.fp} false alarms)</li>
      </ul>
      <p className="text-slate-400">Raise the miss cost and the best threshold falls (flag more). Lower the fraud rate and accuracy climbs while the model gets no better: that is the accuracy trap. Scores here are simulated.</p>
    </section>
  );
}

function SplitPanel() {
  const [groups, setGroups] = useState(60);
  const rows = useMemo(() => makeRows(groups, 12, 11), [groups]);
  const accs = useMemo(() => (["random", "group", "time"] as SplitKind[]).map((k) => [k, splitAccuracy(rows, k)] as const), [rows]);
  const label: Record<SplitKind, string> = { random: "Random rows", group: "Held-out users", time: "Train early, test late" };
  return (
    <section className="space-y-3 text-sm" aria-label="Split leakage">
      <p className="text-slate-300">{rows.length} events from {groups} users. Each user has a personal base rate and a fingerprint, so one user&apos;s rows look alike. The real signal flips sign halfway through time. The model is 1-nearest-neighbour. Only the way we cut train from test changes.</p>
      <ul className="space-y-2">
        {accs.map(([k, a]) => (
          <li key={k}>
            <div className="flex justify-between"><span>{label[k]}</span><strong data-testid={`split-${k}`}>{pct(a)}</strong></div>
            <div className="h-3 rounded bg-slate-700"><div className="h-3 rounded bg-teal-400" style={{ width: pct(a) }} /></div>
          </li>
        ))}
      </ul>
      <label className="flex flex-col gap-1"><span>users = {groups}</span><input type="range" min={20} max={120} step={10} value={groups} onChange={(e) => setGroups(Number(e.target.value))} aria-label="Users" className={slider} /></label>
      <p className="text-slate-400">A random split puts the same user on both sides, so the model recognises people instead of learning the signal: the score is flattered. Holding out whole users drops it to roughly chance. Splitting by time alone still shares users, so it is only partly honest; split by both when you can. Chance is 50%.</p>
    </section>
  );
}

function AbPanel() {
  const [looks, setLooks] = useState(10);
  const [effect, setEffect] = useState(0);
  const n = 1000;
  const one = useMemo(() => simulatePeeking({ experiments: 2000, nPerArm: n, looks: 1, effect, seed: 9 }), [effect]);
  const peek = useMemo(() => simulatePeeking({ experiments: 2000, nPerArm: n, looks, effect, seed: 9 }), [looks, effect]);
  const fixed = useMemo(() => simulatePeeking({ experiments: 2000, nPerArm: n, looks, effect, seed: 9, bonferroni: true }), [looks, effect]);
  const word = effect === 0 ? "false-positive rate" : "power";
  return (
    <section className="space-y-3 text-sm" aria-label="A/B peeking">
      <p className="text-slate-300">2,000 simulated A/B tests with {n} users per arm. With the effect at 0 there is nothing to find, so every &quot;win&quot; is a false positive. The analyst checks the p-value {looks} times and stops at the first win.</p>
      <label className="flex flex-col gap-1"><span>looks at the data = {looks}</span><input type="range" min={1} max={20} value={looks} onChange={(e) => setLooks(Number(e.target.value))} aria-label="Looks" className={slider} /></label>
      <label className="flex flex-col gap-1"><span>true effect = {effect.toFixed(2)} sd</span><input type="range" min={0} max={0.3} step={0.05} value={effect} onChange={(e) => setEffect(Number(e.target.value))} aria-label="True effect" className={slider} /></label>
      <ul className="space-y-1">
        <li>one planned look: {word} <strong data-testid="ab-one">{pct(one.rate)}</strong></li>
        <li>peeking {looks}x, stop at first win: {word} <strong data-testid="ab-peek">{pct(peek.rate)}</strong>, average stop at {Math.round(peek.avgStop)} per arm</li>
        <li>{looks} looks with alpha divided by {looks}: {word} <strong data-testid="ab-fixed">{pct(fixed.rate)}</strong></li>
        <li>planning: a 0.2 sd effect needs <strong>{sampleSizePerArm(0.2)}</strong> per arm for 80% power at alpha 0.05</li>
      </ul>
      <p className="text-slate-400">Each extra look is another chance for noise to cross the line, so peeking inflates false positives well past the nominal 5%. Fixes: fix the sample size in advance, or use a sequential method built for repeated looks. A split alpha is simple but conservative. Simulated with a normal approximation.</p>
    </section>
  );
}

export default function DataDojoLab() {
  const [tab, setTab] = useState<Tab>("cost");
  return (
    <main className="mx-auto max-w-3xl p-4 text-slate-100">
      <h1 className="font-pixel text-lg">Data Dojo lab · dev</h1>
      <div className="my-3 flex flex-wrap gap-2" role="tablist" aria-label="Dojo interactives">
        {([["cost", "Cost matrix"], ["split", "Split leakage"], ["ab", "A/B peeking"]] as const).map(([id, label]) => (
          <button key={id} role="tab" type="button" aria-selected={tab === id} onClick={() => setTab(id)} className={`min-h-11 rounded border px-3 py-1 ${tab === id ? "border-teal-300 bg-slate-700" : "border-slate-500"}`}>{label}</button>
        ))}
      </div>
      {tab === "cost" ? <CostPanel /> : tab === "split" ? <SplitPanel /> : <AbPanel />}
    </main>
  );
}
