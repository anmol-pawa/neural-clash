"use client";

import { useEffect, useRef } from "react";
import { frameToRGBA, type SpriteDef } from "@/game/sprites/pixel";
import { MAPS, TILESET } from "@/game/tiles";
import { NO_TILE, mapSize, type TileMap } from "@/game/tiles/tiles";
import { OKAFOR } from "@/game/sprites/characters/okafor";
import { PLAYER } from "@/game/sprites/characters/player";

const S = TILESET.size;

/** Cache of offscreen canvases per tile frame. */
const cache = new Map<string, HTMLCanvasElement>();
function tileCanvas(name: string, frame: number): HTMLCanvasElement {
  const t = TILESET.tiles[name];
  const f = frame % t.frames.length;
  const key = `${name}:${f}`;
  let c = cache.get(key);
  if (!c) {
    c = document.createElement("canvas");
    c.width = c.height = S;
    const def: SpriteDef = { id: name, name, w: S, h: S, palette: TILESET.palette, anims: { idle: [t.frames[f]] } };
    c.getContext("2d")!.putImageData(new ImageData(frameToRGBA(def, t.frames[f]) as Uint8ClampedArray<ArrayBuffer>, S, S), 0, 0);
    cache.set(key, c);
  }
  return c;
}
function spriteCanvas(def: SpriteDef, anim: string): HTMLCanvasElement {
  const key = `sprite:${def.id}:${anim}`;
  let c = cache.get(key);
  if (!c) {
    c = document.createElement("canvas");
    c.width = def.w;
    c.height = def.h;
    c.getContext("2d")!.putImageData(new ImageData(frameToRGBA(def, def.anims[anim][0]) as Uint8ClampedArray<ArrayBuffer>, def.w, def.h), 0, 0);
    cache.set(key, c);
  }
  return c;
}

function drawMap(canvas: HTMLCanvasElement, m: TileMap, scale: number, tick: number) {
  const { w, h } = mapSize(m);
  canvas.width = w * S * scale;
  canvas.height = h * S * scale;
  const ctx = canvas.getContext("2d")!;
  ctx.imageSmoothingEnabled = false;
  const frameOf = (n: string) => {
    const t = TILESET.tiles[n];
    return t.fps > 0 ? Math.floor((tick / 1000) * t.fps) : 0;
  };
  for (const layer of ["ground", "objects"] as const)
    for (let y = 0; y < h; y++)
      for (let x = 0; x < w; x++) {
        const ch = m[layer][y][x];
        if (ch === NO_TILE) continue;
        const name = m.legend[ch];
        ctx.drawImage(tileCanvas(name, frameOf(name)), x * S * scale, y * S * scale, S * scale, S * scale);
      }
  // NPCs and the spawn marker (the player), feet at the bottom of their tile
  const stand = (def: SpriteDef, x: number, y: number) =>
    ctx.drawImage(spriteCanvas(def, "stand-down"), x * S * scale, ((y + 1) * S - def.h) * scale, def.w * scale, def.h * scale);
  for (const n of m.npcs) if (n.id === "okafor") stand(OKAFOR, n.at[0], n.at[1]);
  stand(PLAYER, m.spawn[0], m.spawn[1]);
}

function MapView({ id, scale }: { id: string; scale: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const m = MAPS[id];
    const t0 = performance.now();
    drawMap(ref.current!, m, scale, 0);
    const t = setInterval(() => drawMap(ref.current!, m, scale, performance.now() - t0), 125);
    return () => clearInterval(t);
  }, [id, scale]);
  return <canvas ref={ref} className="max-w-full" style={{ imageRendering: "pixelated" }} aria-label={`${MAPS[id].name} map`} />;
}

function TileCell({ name }: { name: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const t = TILESET.tiles[name];
    const ctx = ref.current!.getContext("2d")!;
    ctx.imageSmoothingEnabled = false;
    const t0 = performance.now();
    const draw = () => {
      const f = t.fps > 0 ? Math.floor(((performance.now() - t0) / 1000) * t.fps) : 0;
      ctx.clearRect(0, 0, S * 4, S * 4);
      ctx.drawImage(tileCanvas(name, f), 0, 0, S * 4, S * 4);
    };
    draw();
    if (t.frames.length < 2) return;
    const i = setInterval(draw, 125);
    return () => clearInterval(i);
  }, [name]);
  return (
    <figure className="m-0 flex flex-col items-center gap-1">
      <canvas ref={ref} width={S * 4} height={S * 4} className="bg-[#ff00ff]/40" style={{ imageRendering: "pixelated" }} aria-label={name} />
      <figcaption className="max-w-[72px] truncate text-[10px] text-slate-300">
        {name}
        {TILESET.tiles[name].solid ? " ▪" : ""}
      </figcaption>
    </figure>
  );
}

export default function TileLab() {
  return (
    <main className="mx-auto max-w-5xl p-4 text-slate-100">
      <h1 className="font-pixel text-lg">Tiles · dev</h1>
      <p className="mb-4 text-sm text-slate-300">The Python Port tileset and both maps, animated. ▪ marks solid tiles. The player and Prof. Okafor are drawn for scale.</p>
      {Object.keys(MAPS).map((id) => (
        <section key={id} className="mb-8" aria-label={id}>
          <h2 className="mb-2 text-sm text-cyan-200">{MAPS[id].name}</h2>
          <div className="overflow-x-auto">
            <MapView id={id} scale={id === "lab" ? 3 : 2} />
          </div>
        </section>
      ))}
      <section aria-label="tile catalogue">
        <h2 className="mb-2 text-sm text-cyan-200">Catalogue ({Object.keys(TILESET.tiles).length} tiles)</h2>
        <div className="flex flex-wrap gap-3">
          {Object.keys(TILESET.tiles).map((n) => (
            <TileCell key={n} name={n} />
          ))}
        </div>
      </section>
    </main>
  );
}
