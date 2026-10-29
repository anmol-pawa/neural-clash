"use client";

import { useEffect, useRef, useState } from "react";
import { MAPS } from "@/game/tiles/maps";
import { paintMap, drawTile } from "@/game/tiles/render";
import { PYTHON_PORT_TILES } from "@/game/tiles/python-port";
import { LAB_INTERIOR_TILES } from "@/game/tiles/lab-interior";
import { frameToRGBA, type SpriteDef } from "@/game/sprites/pixel";
import { PLAYER } from "@/game/sprites/characters/player";
import { OKAFOR } from "@/game/sprites/characters/okafor";
import type { TileSetDef } from "@/game/tiles/tileset";

function drawSprite(ctx: CanvasRenderingContext2D, def: SpriteDef, anim: string, cx: number, cy: number) {
  const c = document.createElement("canvas");
  c.width = def.w;
  c.height = def.h;
  c.getContext("2d")!.putImageData(new ImageData(frameToRGBA(def, def.anims[anim][0]) as Uint8ClampedArray<ArrayBuffer>, def.w, def.h), 0, 0);
  // feet at the bottom of the tile cell
  ctx.drawImage(c, cx * 16 + (16 - def.w) / 2, cy * 16 + 16 - def.h);
}

function MapView({ id, scale }: { id: string; scale: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const map = MAPS.find((m) => m.id === id)!;
    const t0 = performance.now();
    const draw = () =>
      paintMap(ref.current!, map, scale, (performance.now() - t0) / 1000, (ctx) => {
        drawSprite(ctx, OKAFOR, "stand-down", ...(map.spawns.okafor as [number, number]));
        drawSprite(ctx, PLAYER, "stand-up", ...(map.spawns.player as [number, number]));
      });
    draw();
    const t = setInterval(draw, 250);
    return () => clearInterval(t);
  }, [id, scale]);
  return <canvas ref={ref} className="max-w-full" style={{ imageRendering: "pixelated" }} aria-label={`${id} map`} />;
}

function Sheet({ set, scale }: { set: TileSetDef; scale: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const names = Object.keys(set.tiles);
    const cols = 8, T = set.tile, pad = 4;
    const rows = Math.ceil(names.length / cols);
    const c = ref.current!;
    const t0 = performance.now();
    const draw = () => {
      const off = document.createElement("canvas");
      off.width = cols * (T + pad);
      off.height = rows * (T + pad);
      const o = off.getContext("2d")!;
      o.fillStyle = "#4a4a68";
      o.fillRect(0, 0, off.width, off.height);
      names.forEach((n, i) => drawTile(o, set, n, (i % cols) * (T + pad) + pad / 2, Math.floor(i / cols) * (T + pad) + pad / 2, (performance.now() - t0) / 1000));
      c.width = off.width * scale;
      c.height = off.height * scale;
      const ctx = c.getContext("2d")!;
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(off, 0, 0, c.width, c.height);
    };
    draw();
    const t = setInterval(draw, 250);
    return () => clearInterval(t);
  }, [set, scale]);
  return <canvas ref={ref} className="max-w-full" style={{ imageRendering: "pixelated" }} aria-label={`${set.id} tiles`} />;
}

export default function TileLab() {
  const [scale, setScale] = useState(3);
  return (
    <main className="mx-auto max-w-5xl p-4 text-slate-100">
      <h1 className="font-pixel text-lg">Tiles · dev</h1>
      <p className="mb-3 text-sm text-slate-300">Python Port and the Lab: composed maps with the player and Prof. Okafor, then every tile (water, lamps, monitors, LEDs and the capsule animate). Review art here.</p>
      <label className="mb-4 flex items-center gap-2 text-sm">
        Scale
        <input type="range" min={1} max={5} value={scale} onChange={(e) => setScale(Number(e.target.value))} aria-label="Scale" />
        {scale}×
      </label>
      {MAPS.map((m) => (
        <section key={m.id} className="mb-8" aria-label={m.id}>
          <h2 className="mb-2 text-sm text-cyan-200">{m.name}</h2>
          <MapView id={m.id} scale={scale} />
        </section>
      ))}
      {[PYTHON_PORT_TILES, LAB_INTERIOR_TILES].map((set) => (
        <section key={set.id} className="mb-8" aria-label={`${set.id} sheet`}>
          <h2 className="mb-2 text-sm text-cyan-200">{set.name} tiles ({Object.keys(set.tiles).length})</h2>
          <Sheet set={set} scale={scale} />
          <p className="mt-1 text-[10px] uppercase tracking-wider text-slate-400">{Object.keys(set.tiles).join(" · ")}</p>
        </section>
      ))}
    </main>
  );
}
