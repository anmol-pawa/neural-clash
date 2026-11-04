"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { SURFACES, runDescent, stepsToReach, verdict, type OptimizerKind, type SurfaceId } from "@/lib/optim/descent";

const SIZE = 420;
const OPTS: { id: OptimizerKind; label: string; color: string }[] = [
  { id: "sgd", label: "SGD", color: "#ff6b6b" },
  { id: "momentum", label: "Momentum", color: "#ffd166" },
  { id: "adam", label: "Adam", color: "#5eead4" },
];

function draw(cv: HTMLCanvasElement, surface: SurfaceId, runs: { color: string; pts: [number, number][] }[]) {
  const s = SURFACES[surface];
  const ctx = cv.getContext("2d")!;
  const R = s.range;
  const P = (p: readonly [number, number]): [number, number] => [SIZE / 2 + (p[0] / R) * (SIZE / 2) - (surface === "valley" ? 0 : 0), SIZE / 2 - (p[1] / R) * (SIZE / 2)];
  // Valley is centred on (0.5, 0.5)-ish; shift the view so the whole banana fits.
  const centre: [number, number] = surface === "valley" ? [0, 0.5] : [0, 0];
  const Q = (p: readonly [number, number]) => P([p[0] - centre[0], p[1] - centre[1]]);
  const cell = 6;
  const f0 = s.f(s.start);
  for (let y = 0; y < SIZE; y += cell) {
    for (let x = 0; x < SIZE; x += cell) {
      const wx = ((x + cell / 2 - SIZE / 2) / (SIZE / 2)) * R + centre[0];
      const wy = (-(y + cell / 2 - SIZE / 2) / (SIZE / 2)) * R + centre[1];
      const l = s.f([wx, wy]);
      const band = Math.floor(Math.log2(1 + (l / f0) * 64) * 1.6);
      ctx.fillStyle = `hsl(${232 - Math.min(band, 10) * 5} 55% ${14 + (band % 2) * 3 + Math.min(band, 10)}%)`;
      ctx.fillRect(x, y, cell, cell);
    }
  }
  const o = Q(s.optimum);
  ctx.fillStyle = "#fff";
  ctx.fillRect(o[0] - 5, o[1] - 5, 10, 10);
  for (const r of runs) {
    ctx.strokeStyle = r.color; ctx.lineWidth = 2;
    ctx.beginPath();
    r.pts.forEach((p, i) => { const q = Q(p); if (i) ctx.lineTo(q[0], q[1]); else ctx.moveTo(q[0], q[1]); });
    ctx.stroke();
    ctx.fillStyle = r.color;
    r.pts.forEach((p, i) => { if (i % 5 === 0) { const q = Q(p); ctx.fillRect(q[0] - 2, q[1] - 2, 4, 4); } });
    const e = Q(r.pts[r.pts.length - 1]);
    ctx.fillRect(e[0] - 5, e[1] - 5, 10, 10);
  }
  const st = Q(s.start);
  ctx.strokeStyle = "#fff"; ctx.lineWidth = 2; ctx.strokeRect(st[0] - 5, st[1] - 5, 10, 10);
}

export default function DescentLab() {
  const [surface, setSurface] = useState<SurfaceId>("ravine");
  const [lr, setLr] = useState(0.05);
  const [beta, setBeta] = useState(0.8);
  const [steps, setSteps] = useState(150);
  const [show, setShow] = useState<Record<OptimizerKind, boolean>>({ sgd: true, momentum: true, adam: false });
  const ref = useRef<HTMLCanvasElement>(null);
  const s = SURFACES[surface];

  const results = useMemo(
    () => OPTS.map((o) => {
      const cfg = { surface, optimizer: o.id, lr, beta1: o.id === "adam" ? 0.9 : beta, steps } as const;
      return { ...o, cfg, tr: runDescent(cfg) };
    }),
    [surface, lr, beta, steps],
  );
  useEffect(() => {
    if (ref.current) draw(ref.current, surface, results.filter((r) => show[r.id]).map((r) => ({ color: r.color, pts: r.tr.points })));
  }, [results, show, surface]);

  return (
    <main className="mx-auto max-w-5xl p-4 text-slate-100">
      <h1 className="font-pixel text-lg">Descent lab · dev</h1>
      <p className="mb-3 text-sm text-slate-300">
        Three optimisers walk the same landscape from the same start (outlined square) toward the minimum (white). Contours are loss levels. The same
        learning rate is used for all three, so try the stability limit on the ravine: plain gradient descent diverges above 2/L.
      </p>
      <div className="flex flex-col gap-4 md:flex-row">
        <canvas ref={ref} width={SIZE} height={SIZE} className="aspect-square h-auto w-full max-w-[420px] self-start rounded border border-slate-600" style={{ imageRendering: "pixelated" }} aria-label="Loss landscape with optimiser paths" />
        <div className="flex-1 space-y-3 text-sm">
          <div className="flex flex-wrap gap-2" role="group" aria-label="Landscape">
            {Object.values(SURFACES).map((x) => (
              <button key={x.id} type="button" onClick={() => { setSurface(x.id); setLr(x.id === "valley" ? 0.001 : x.id === "bowl" ? 0.3 : 0.05); setSteps(x.id === "valley" ? 600 : 150); }}
                aria-pressed={surface === x.id} className={`min-h-11 rounded border px-3 py-1 ${surface === x.id ? "border-teal-300 bg-slate-700" : "border-slate-500"}`}>
                {x.label}
              </button>
            ))}
          </div>
          <p className="text-slate-300">{s.blurb}</p>
          <label className="flex flex-col gap-1">
            <span>learning rate = {lr.toFixed(4)}{s.maxCurvature ? ` (SGD limit 2/L = ${(2 / s.maxCurvature).toFixed(3)})` : ""}</span>
            <input type="range" min={surface === "valley" ? 0.0001 : 0.005} max={surface === "valley" ? 0.004 : 0.5} step={surface === "valley" ? 0.0001 : 0.005} value={lr} onChange={(e) => setLr(Number(e.target.value))} aria-label="Learning rate" className="min-h-11" />
          </label>
          <label className="flex flex-col gap-1">
            <span>momentum coefficient = {beta.toFixed(2)} (Adam fixed at β₁ 0.9, β₂ 0.999)</span>
            <input type="range" min={0} max={0.99} step={0.01} value={beta} onChange={(e) => setBeta(Number(e.target.value))} aria-label="Momentum coefficient" className="min-h-11" />
          </label>
          <label className="flex flex-col gap-1">
            <span>steps = {steps}</span>
            <input type="range" min={10} max={1000} step={10} value={steps} onChange={(e) => setSteps(Number(e.target.value))} aria-label="Steps" className="min-h-11" />
          </label>
          <ul className="space-y-2" aria-label="Optimisers">
            {results.map((r) => (
              <li key={r.id} className="rounded border border-slate-700 p-2" data-testid={`run-${r.id}`}>
                <label className="flex min-h-11 items-center gap-2">
                  <input type="checkbox" checked={show[r.id]} onChange={(e) => setShow({ ...show, [r.id]: e.target.checked })} className="size-5" />
                  <span className="inline-block size-3" style={{ background: r.color }} />
                  <strong>{r.label}</strong>
                  <span className="text-slate-400">loss {r.tr.losses[r.tr.losses.length - 1].toExponential(1)}{stepsToReach(r.tr.losses, 1e-6) !== null ? `, <1e-6 at step ${stepsToReach(r.tr.losses, 1e-6)}` : ""}</span>
                </label>
                <p className="text-slate-300" data-testid={`verdict-${r.id}`}>{verdict(r.cfg, r.tr)}</p>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </main>
  );
}
