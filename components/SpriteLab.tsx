"use client";

import { useEffect, useRef, useState } from "react";
import { frameToRGBA, type SpriteDef } from "@/game/sprites/pixel";
import { SPRITES } from "@/game/sprites/roster";

/** Draw one frame at an integer scale with nearest-neighbour sampling. */
function paint(canvas: HTMLCanvasElement, def: SpriteDef, anim: string, frame: number, scale: number) {
  const frames = def.anims[anim] ?? def.anims.idle;
  const off = document.createElement("canvas");
  off.width = def.w;
  off.height = def.h;
  const data = frameToRGBA(def, frames[frame % frames.length]);
  off.getContext("2d")!.putImageData(new ImageData(data as Uint8ClampedArray<ArrayBuffer>, def.w, def.h), 0, 0);
  canvas.width = def.w * scale;
  canvas.height = def.h * scale;
  const ctx = canvas.getContext("2d")!;
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(off, 0, 0, canvas.width, canvas.height);
}

function AnimCell({ def, anim, scale }: { def: SpriteDef; anim: string; scale: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const frames = def.anims[anim].length;
    const fps = def.fps?.[anim] ?? 4;
    let i = 0;
    paint(ref.current!, def, anim, 0, scale);
    const t = setInterval(() => paint(ref.current!, def, anim, ++i % frames, scale), 1000 / fps);
    return () => clearInterval(t);
  }, [def, anim, scale]);
  return (
    <figure className="m-0 flex flex-col items-center gap-1">
      <canvas ref={ref} className="h-auto max-w-full bg-[#7ab06a]" style={{ imageRendering: "pixelated" }} aria-label={`${def.name} ${anim}`} />
      <figcaption className="text-[10px] uppercase tracking-wider text-slate-300">
        {anim} · {def.anims[anim].length}f
      </figcaption>
    </figure>
  );
}

export default function SpriteLab() {
  const [scale, setScale] = useState(3);
  return (
    <main className="mx-auto max-w-5xl p-4 text-slate-100">
      <h1 className="font-pixel text-lg">Sprites · dev</h1>
      <p className="mb-3 text-sm text-slate-300">Every animation of every sprite, looping at its own frame rate. Review art here before committing.</p>
      <label className="mb-4 flex items-center gap-2 text-sm">
        Scale
        <input type="range" min={2} max={6} value={scale} onChange={(e) => setScale(Number(e.target.value))} aria-label="Scale" />
        {scale}×
      </label>
      {SPRITES.map((def) => (
        <section key={def.id} className="mb-8" aria-label={def.id}>
          <h2 className="mb-2 text-sm text-cyan-200">
            {def.id} <span className="text-slate-400">({def.w}×{def.h})</span>
          </h2>
          <div className="flex flex-wrap gap-4">
            {Object.keys(def.anims).map((a) => (
              <AnimCell key={a} def={def} anim={a} scale={scale} />
            ))}
          </div>
        </section>
      ))}
    </main>
  );
}
