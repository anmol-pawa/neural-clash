"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { demoAttention, renderMap, rowEntropy, rowPeaks } from "@/lib/viz/attentionMap";

const SENTENCES: { id: string; label: string; tokens: string[] }[] = [
  { id: "cat", label: "the cat sat on the mat", tokens: ["the", "cat", "sat", "on", "the", "mat"] },
  { id: "net", label: "train the net then test it", tokens: ["train", "the", "net", "then", "test", "it"] },
  { id: "long", label: "eight tokens make a bigger map", tokens: ["eight", "tokens", "make", "a", "bigger", "map", "to", "read"] },
];

/** Interactive attention-map explorer: toy seeded embeddings, real scaled-dot-product maths. */
export default function AttentionMap({ compact = false }: { compact?: boolean }) {
  const [sent, setSent] = useState(SENTENCES[0].id);
  const [causal, setCausal] = useState(false);
  const [scaled, setScaled] = useState(true);
  const [padding, setPadding] = useState(0);
  const [dim, setDim] = useState(16);
  const [seed, setSeed] = useState(3);
  const ref = useRef<HTMLCanvasElement>(null);
  const tokens = SENTENCES.find((s) => s.id === sent)!.tokens;
  const res = useMemo(() => demoAttention(tokens, { seed, dim, causal, scaled, padding }), [tokens, seed, dim, causal, scaled, padding]);
  const peaks = useMemo(() => rowPeaks(res.weights), [res]);
  const ent = useMemo(() => rowEntropy(res.weights), [res]);
  const meanPeak = peaks.reduce((a, b) => a + b, 0) / peaks.length;
  const meanEnt = ent.reduce((a, b) => a + b, 0) / ent.length;
  const cell = 28;
  const n = tokens.length;

  useEffect(() => {
    const cv = ref.current;
    if (!cv) return;
    const px = renderMap(res.weights, res.mask, cell);
    cv.width = px.width; cv.height = px.height;
    cv.getContext("2d")!.putImageData(new ImageData(px.data as unknown as Uint8ClampedArray<ArrayBuffer>, px.width, px.height), 0, 0);
  }, [res]);

  const btn = (on: boolean) => `min-h-11 rounded border px-3 py-1 text-sm ${on ? "border-teal-300 bg-slate-700" : "border-slate-500"}`;
  return (
    <section className="grid gap-3 rounded border-2 border-indigo-300/40 bg-slate-900/60 p-3 text-sm" aria-label="Attention map explorer" data-testid="attention-map">
      <h2 className="font-display text-base text-[var(--accent)]">Attention map</h2>
      {!compact && <p className="text-slate-300">Row = the token asking (query), column = the token it may read (key). Brighter = more weight; every row sums to 1. Hatched cells are masked, which is different from a small weight. The vectors are <strong>seeded random toys</strong>, not a trained model: the maths is real, the &ldquo;meaning&rdquo; is not.</p>}
      <div className="flex flex-wrap gap-2" role="group" aria-label="Sentence">
        {SENTENCES.map((s) => <button key={s.id} type="button" aria-pressed={sent === s.id} className={btn(sent === s.id)} onClick={() => { setSent(s.id); setPadding(0); }}>{s.label}</button>)}
      </div>
      <div className="flex flex-wrap gap-2" role="group" aria-label="Options">
        <button type="button" aria-pressed={causal} className={btn(causal)} onClick={() => setCausal(!causal)}>Causal mask</button>
        <button type="button" aria-pressed={scaled} className={btn(scaled)} onClick={() => setScaled(!scaled)}>Scale by 1/√d</button>
        <button type="button" className={btn(false)} onClick={() => setSeed(seed + 1)}>New random vectors</button>
      </div>
      <label className="flex flex-col gap-1"><span>head size d = {dim}</span>
        <input type="range" min={2} max={128} step={2} value={dim} onChange={(e) => setDim(Number(e.target.value))} aria-label="Head size" className="min-h-11" />
      </label>
      <label className="flex flex-col gap-1"><span>padding tokens at the end = {padding}</span>
        <input type="range" min={0} max={Math.min(3, n - 1)} step={1} value={padding} onChange={(e) => setPadding(Number(e.target.value))} aria-label="Padding tokens" className="min-h-11" />
      </label>
      <div className="flex items-start gap-2 overflow-x-auto">
        <div className="grid text-xs text-slate-300" style={{ gridTemplateRows: `repeat(${n}, ${cell}px)` }} aria-hidden>
          {tokens.map((t, i) => <div key={i} className="flex items-center justify-end pr-1" style={{ height: cell }}>{t}</div>)}
        </div>
        <canvas ref={ref} className="rounded border border-slate-600" style={{ imageRendering: "pixelated", width: n * cell, height: n * cell }} aria-label={`Attention weights, ${n} by ${n}`} data-testid="attention-canvas" />
      </div>
      <p className="text-xs text-slate-400">columns, left to right: {tokens.join(" · ")}</p>
      <dl className="grid grid-cols-2 gap-2">
        <div className="rounded border border-slate-600 p-2"><dt className="text-xs text-slate-400">mean peak weight</dt><dd className="font-display text-lg" data-testid="attn-peak">{meanPeak.toFixed(2)}</dd></div>
        <div className="rounded border border-slate-600 p-2"><dt className="text-xs text-slate-400">mean row entropy (bits)</dt><dd className="font-display text-lg" data-testid="attn-entropy">{meanEnt.toFixed(2)}</dd></div>
      </dl>
      <p className="text-slate-300">Try: switch off 1/√d and drag d up. Scores grow like √d, softmax saturates, rows collapse to one bright cell and entropy falls. Turn on the causal mask: the top-right triangle goes dark and row 1 is forced to look only at itself.</p>
    </section>
  );
}
