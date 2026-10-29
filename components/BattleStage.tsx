"use client";

import { useEffect, useRef } from "react";
import { frameToRGBA, type SpriteDef } from "@/game/sprites/pixel";

/** Plays one animation of a sprite on a canvas, nearest-neighbour scaled. `once` holds the last frame. */
export function SpriteView({ def, anim, scale, recolor, label, className }: {
  def: SpriteDef;
  anim: string;
  scale: number;
  recolor?: (rgb: [number, number, number]) => [number, number, number];
  label: string;
  className?: string;
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current!;
    const frames = def.anims[anim] ?? def.anims.idle;
    const loop = anim === "idle";
    const fps = def.fps?.[anim] ?? 6;
    const off = document.createElement("canvas");
    off.width = def.w;
    off.height = def.h;
    canvas.width = def.w * scale;
    canvas.height = def.h * scale;
    const ctx = canvas.getContext("2d")!;
    ctx.imageSmoothingEnabled = false;
    const draw = (i: number) => {
      const data = frameToRGBA(def, frames[i], recolor);
      off.getContext("2d")!.putImageData(new ImageData(data as Uint8ClampedArray<ArrayBuffer>, def.w, def.h), 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(off, 0, 0, canvas.width, canvas.height);
    };
    let i = 0;
    draw(0);
    const t = setInterval(() => {
      if (!loop && i >= frames.length - 1) return;
      i = loop ? (i + 1) % frames.length : i + 1;
      draw(i);
    }, 1000 / fps);
    return () => clearInterval(t);
  }, [def, anim, scale, recolor]);
  return <canvas ref={ref} className={className} style={{ imageRendering: "pixelated" }} role="img" aria-label={label} />;
}

export function HpBar({ label, hp, max, tone }: { label: string; hp: number; max: number; tone: "player" | "enemy" }) {
  const pct = Math.max(0, Math.min(100, (hp / max) * 100));
  const color = pct > 50 ? "bg-emerald-400" : pct > 25 ? "bg-amber-400" : "bg-rose-500";
  return (
    <div className={`w-44 border-2 border-slate-600 bg-slate-900/90 p-1.5 ${tone === "enemy" ? "" : ""}`} role="meter" aria-label={`${label} HP`} aria-valuemin={0} aria-valuemax={max} aria-valuenow={hp}>
      <div className="flex justify-between font-pixel text-[9px] text-slate-200"><span>{label}</span><span>{hp}/{max}</span></div>
      <div className="mt-1 h-2 bg-slate-700"><div className={`h-full ${color} transition-[width] duration-500`} style={{ width: `${pct}%` }} /></div>
    </div>
  );
}
