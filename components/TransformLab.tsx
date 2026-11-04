"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { IDENTITY, KIND_BLURB, apply, classify, compose, det, eigen, inverse, rotation, trace, unitSquareImage, type Mat2 } from "@/lib/linalg/transform";
import { singular2 } from "@/lib/solvers/linalg";

const PRESETS: { id: string; label: string; m: Mat2 }[] = [
  { id: "identity", label: "Identity", m: IDENTITY },
  { id: "rot45", label: "Rotate 45°", m: rotation(45) },
  { id: "scale", label: "Stretch x2, y½", m: [[2, 0], [0, 0.5]] },
  { id: "shear", label: "Shear", m: [[1, 1], [0, 1]] },
  { id: "flip", label: "Mirror", m: [[1, 0], [0, -1]] },
  { id: "sym", label: "Symmetric", m: [[2, 1], [1, 2]] },
  { id: "collapse", label: "Collapse", m: [[1, 2], [0.5, 1]] },
];
const NAMES = ["a", "b", "c", "d"] as const;
const fmt = (x: number) => (Math.abs(x) < 0.005 ? "0" : x.toFixed(2));
const SIZE = 420;
const RANGE = 4; // world units shown each side of the origin

function draw(cv: HTMLCanvasElement, m: Mat2, showEigen: boolean) {
  const ctx = cv.getContext("2d")!;
  const s = SIZE / (2 * RANGE);
  const P = (p: readonly [number, number]): [number, number] => [SIZE / 2 + p[0] * s, SIZE / 2 - p[1] * s];
  ctx.clearRect(0, 0, SIZE, SIZE);
  ctx.fillStyle = "#0b1020";
  ctx.fillRect(0, 0, SIZE, SIZE);
  const line = (p: readonly [number, number], q: readonly [number, number], color: string, w: number, dash: number[] = []) => {
    ctx.strokeStyle = color; ctx.lineWidth = w; ctx.setLineDash(dash);
    ctx.beginPath(); ctx.moveTo(...P(p)); ctx.lineTo(...P(q)); ctx.stroke();
  };
  for (let k = -RANGE; k <= RANGE; k++) {
    line([k, -RANGE], [k, RANGE], k === 0 ? "#3a4a73" : "#1a2340", 1);
    line([-RANGE, k], [RANGE, k], k === 0 ? "#3a4a73" : "#1a2340", 1);
  }
  const L = RANGE * 2;
  for (let k = -L; k <= L; k++) {
    const c = k === 0 ? "#5d7bd6" : "#2b3f7a";
    line(apply(m, [k, -L]), apply(m, [k, L]), c, k === 0 ? 2 : 1);
    line(apply(m, [-L, k]), apply(m, [L, k]), c, k === 0 ? 2 : 1);
  }
  if (showEigen) {
    for (const v of eigen(m).vectors) line([-v[0] * L, -v[1] * L], [v[0] * L, v[1] * L], "#ffd166", 2, [6, 5]);
  }
  ctx.setLineDash([]);
  const sq = unitSquareImage(m).map(P);
  ctx.beginPath();
  sq.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])));
  ctx.closePath();
  ctx.fillStyle = "rgba(94,234,212,0.25)";
  ctx.fill();
  ctx.strokeStyle = "#5eead4"; ctx.lineWidth = 2; ctx.stroke();
  const arrow = (to: readonly [number, number], color: string) => {
    line([0, 0], to, color, 3);
    const [x, y] = P(to);
    ctx.fillStyle = color; ctx.fillRect(x - 4, y - 4, 8, 8);
  };
  arrow(apply(m, [1, 0]), "#ff6b6b");
  arrow(apply(m, [0, 1]), "#7bd88f");
}

export default function TransformLab() {
  const [m, setM] = useState<Mat2>(PRESETS[5].m);
  const [showEigen, setShowEigen] = useState(true);
  const [then, setThen] = useState<string>("none");
  const ref = useRef<HTMLCanvasElement>(null);
  const eff = useMemo(() => {
    const p = PRESETS.find((x) => x.id === then);
    return p ? compose(p.m, m) : m;
  }, [m, then]);
  useEffect(() => { if (ref.current) draw(ref.current, eff, showEigen); }, [eff, showEigen]);

  const e = eigen(eff);
  const dt = det(eff);
  const [s1, s2] = singular2(eff);
  const inv = inverse(eff);
  const kind = classify(eff);
  const setCell = (i: number, v: number) => {
    const g = [m[0][0], m[0][1], m[1][0], m[1][1]];
    g[i] = v;
    setM([[g[0], g[1]], [g[2], g[3]]]);
  };
  const vals = [m[0][0], m[0][1], m[1][0], m[1][1]];

  return (
    <main className="mx-auto max-w-5xl p-4 text-slate-100">
      <h1 className="font-pixel text-lg">Transform lab · dev</h1>
      <p className="mb-3 text-sm text-slate-300">
        A 2×2 matrix is a machine that moves the plane. Its columns are where the red and green arrows land; the grid, the teal unit square and the
        gold eigen-directions follow. Drag the entries and watch determinant, eigenvalues and singular values react.
      </p>
      <div className="flex flex-col gap-4 md:flex-row">
        <canvas ref={ref} width={SIZE} height={SIZE} className="aspect-square h-auto w-full max-w-[420px] self-start rounded border border-slate-600" aria-label="Transformed plane" />
        <div className="flex-1 space-y-3 text-sm">
          <div className="flex flex-wrap gap-2" role="group" aria-label="Presets">
            {PRESETS.map((p) => (
              <button key={p.id} type="button" onClick={() => setM(p.m)} className="min-h-11 rounded border border-slate-500 px-3 py-1 hover:bg-slate-700">
                {p.label}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-3">
            {NAMES.map((n, i) => (
              <label key={n} className="flex flex-col gap-1">
                <span>{n} = {fmt(vals[i])}</span>
                <input type="range" min={-3} max={3} step={0.05} value={vals[i]} onChange={(ev) => setCell(i, Number(ev.target.value))} aria-label={`Entry ${n}`} className="min-h-11" />
              </label>
            ))}
          </div>
          <label className="flex items-center gap-2">
            Then apply (left-multiply)
            <select value={then} onChange={(ev) => setThen(ev.target.value)} className="min-h-11 rounded border border-slate-500 bg-slate-900 px-2" aria-label="Then apply">
              <option value="none">nothing</option>
              {PRESETS.slice(1).map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
            </select>
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={showEigen} onChange={(ev) => setShowEigen(ev.target.checked)} className="size-5" /> Show eigen-directions
          </label>
          <dl className="grid grid-cols-2 gap-x-4 gap-y-1 rounded border border-slate-700 p-3" aria-label="Readout">
            <dt>Matrix</dt><dd>[{fmt(eff[0][0])} {fmt(eff[0][1])}; {fmt(eff[1][0])} {fmt(eff[1][1])}]</dd>
            <dt>det (area scale)</dt><dd data-testid="det">{fmt(dt)}</dd>
            <dt>trace</dt><dd>{fmt(trace(eff))}</dd>
            <dt>eigenvalues</dt>
            <dd data-testid="eig">
              {e.complex ? `complex: |λ|=${fmt(e.complex.modulus)}, turns ${fmt(e.complex.angleDeg)}°` : e.values.map(fmt).join(", ")}
            </dd>
            <dt>singular values</dt><dd>{fmt(s1)}, {fmt(s2)}</dd>
            <dt>inverse</dt><dd>{inv ? `[${fmt(inv[0][0])} ${fmt(inv[0][1])}; ${fmt(inv[1][0])} ${fmt(inv[1][1])}]` : "none (det = 0)"}</dd>
          </dl>
          <p className="rounded bg-slate-800 p-3" data-testid="kind"><strong className="uppercase">{kind}</strong>: {KIND_BLURB[kind]}</p>
        </div>
      </div>
    </main>
  );
}
