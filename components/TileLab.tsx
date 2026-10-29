"use client";

import { useEffect, useRef } from "react";
import { NEURAL_LAB } from "@/game/maps/lab";
import { PORT_SQUARE } from "@/game/maps/port-square";
import { renderMap } from "@/game/maps/render";
import type { MapDef } from "@/game/maps/types";
import { PYTHON_PORT_TILES } from "@/game/sprites/tiles/python-port";
import { tileRGBA } from "@/game/sprites/tileset";

function MapView({ map, scale }: { map: MapDef; scale: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current!;
    const ctx = canvas.getContext("2d")!;
    const off = document.createElement("canvas");
    const draw = (t: number) => {
      const { w, h, data } = renderMap(map, PYTHON_PORT_TILES, t);
      off.width = w;
      off.height = h;
      off.getContext("2d")!.putImageData(new ImageData(data as Uint8ClampedArray<ArrayBuffer>, w, h), 0, 0);
      canvas.width = w * scale;
      canvas.height = h * scale;
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(off, 0, 0, canvas.width, canvas.height);
    };
    draw(0);
    const start = performance.now();
    const timer = setInterval(() => draw(performance.now() - start), 250);
    return () => clearInterval(timer);
  }, [map, scale]);
  return <canvas ref={ref} className="max-w-full" style={{ imageRendering: "pixelated" }} aria-label={map.name} />;
}

function TileCell({ name, scale }: { name: string; scale: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const t = PYTHON_PORT_TILES.tiles[name];
  useEffect(() => {
    const canvas = ref.current!;
    const off = document.createElement("canvas");
    off.width = t.w;
    off.height = t.h;
    canvas.width = t.w * scale;
    canvas.height = t.h * scale;
    const ctx = canvas.getContext("2d")!;
    let i = 0;
    const draw = () => {
      off.getContext("2d")!.putImageData(new ImageData(tileRGBA(PYTHON_PORT_TILES, name, i++) as Uint8ClampedArray<ArrayBuffer>, t.w, t.h), 0, 0);
      ctx.imageSmoothingEnabled = false;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(off, 0, 0, canvas.width, canvas.height);
    };
    draw();
    if (t.frames.length === 1) return;
    const timer = setInterval(draw, 1000 / (t.fps ?? 2));
    return () => clearInterval(timer);
  }, [name, scale, t]);
  return (
    <figure className="m-0 flex flex-col items-center gap-1">
      <canvas ref={ref} className="max-w-full bg-[#555566]" style={{ imageRendering: "pixelated" }} aria-label={name} />
      <figcaption className="text-[10px] text-slate-300">
        {name}
        {t.frames.length > 1 ? ` · ${t.frames.length}f` : ""}
      </figcaption>
    </figure>
  );
}

export default function TileLab() {
  return (
    <main className="mx-auto max-w-5xl p-4 text-slate-100">
      <h1 className="font-pixel text-lg">Tiles · dev</h1>
      <p className="mb-4 text-sm text-slate-300">The Python Port tileset, the harbour square and the Neural Lab interior. Animated tiles loop at their own rate.</p>
      {[NEURAL_LAB, PORT_SQUARE].map((m) => (
        <section key={m.id} className="mb-8" aria-label={m.id}>
          <h2 className="mb-2 text-sm text-cyan-200">{m.name}</h2>
          <MapView map={m} scale={2} />
        </section>
      ))}
      <h2 className="mb-2 text-sm text-cyan-200">All tiles ({Object.keys(PYTHON_PORT_TILES.tiles).length})</h2>
      <div className="flex flex-wrap items-end gap-4">
        {Object.keys(PYTHON_PORT_TILES.tiles).map((n) => (
          <TileCell key={n} name={n} scale={3} />
        ))}
      </div>
    </main>
  );
}
