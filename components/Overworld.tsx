"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { drawWorld, VIEW_H, VIEW_W } from "@/game/render/overworld";
import { frameCanvas, frameAt } from "@/game/render/atlas";
import { spriteById } from "@/game/sprites/roster";
import { TILE } from "@/game/sprites/tilemap";
import { advance, choose, currentLine, sliceChars, startDialogue, visibleChars, visibleChoices, type DialogueState, type Flags } from "@/lib/dialogue/dialogue";
import { MAPS, PYTHON_PORT } from "@/lib/world/maps";
import { SCRIPTS } from "@/lib/world/scripts";
import { createWorld, faceNpcToPlayer, interact, update, type Dir, type WorldState } from "@/lib/world/world";

const KEYS: Record<string, Dir> = { ArrowUp: "up", ArrowDown: "down", ArrowLeft: "left", ArrowRight: "right", w: "up", s: "down", a: "left", d: "right", W: "up", S: "down", A: "left", D: "right" };

function Portrait({ id, talking }: { id: string; talking: boolean }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const def = spriteById(id);
    if (!def) return;
    const anim = talking ? "talk" : "idle";
    const draw = () => {
      const ctx = ref.current!.getContext("2d")!;
      ctx.clearRect(0, 0, def.w, def.h);
      ctx.drawImage(frameCanvas(def, anim, frameAt(def, anim, performance.now() / 1000)), 0, 0);
    };
    draw();
    const timer = setInterval(draw, 120);
    return () => clearInterval(timer);
  }, [id, talking]);
  return <canvas ref={ref} width={48} height={48} className="h-24 w-24 shrink-0 border-2 border-cyan-300/60 bg-slate-900" style={{ imageRendering: "pixelated" }} aria-hidden />;
}

export default function Overworld() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const worldRef = useRef<WorldState>(createWorld(PYTHON_PORT));
  const heldRef = useRef<Dir[]>([]);
  const dialogueRef = useRef<DialogueState | null>(null);
  const flagsRef = useRef<Flags>({});
  const [dialogue, setDialogue] = useState<DialogueState | null>(null);
  const [mapName, setMapName] = useState(PYTHON_PORT.name);
  /** Milliseconds since the current line appeared (drives the typewriter). */
  const [elapsed, setElapsed] = useState(0);
  const elapsedRef = useRef(0);
  const setElapsedBoth = useCallback((ms: number) => {
    elapsedRef.current = ms;
    setElapsed(ms);
  }, []);

  const setD = useCallback((d: DialogueState | null) => {
    dialogueRef.current = d;
    if (d) flagsRef.current = d.flags;
    setDialogue(d && !d.done ? d : null);
    if (d?.done) dialogueRef.current = null;
    setElapsedBoth(0);
  }, [setElapsedBoth]);

  const press = useCallback(() => {
    const d = dialogueRef.current;
    if (d) {
      const line = currentLine(d);
      if (visibleChars(line.text, elapsedRef.current) < [...line.text].length) return setElapsedBoth(1e6); // finish typing first
      if (visibleChoices(d).length === 0) setD(advance(d));
      return;
    }
    const hit = interact(worldRef.current);
    if (!hit) return;
    if (hit.kind === "npc") worldRef.current = faceNpcToPlayer(worldRef.current, hit.npc.id);
    setD(startDialogue(SCRIPTS[hit.script], flagsRef.current));
  }, [setD, setElapsedBoth]);

  const pressRef = useRef(press);
  useEffect(() => {
    pressRef.current = press;
  }, [press]);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      const dir = KEYS[e.key];
      if (dir) {
        e.preventDefault();
        if (!heldRef.current.includes(dir)) heldRef.current.push(dir);
      } else if (e.key === "Enter" || e.key === " " || e.key === "e" || e.key === "E") {
        e.preventDefault();
        if (!e.repeat) pressRef.current();
      } else if (/^[1-9]$/.test(e.key) && dialogueRef.current) {
        const next = choose(dialogueRef.current, Number(e.key) - 1);
        if (next !== dialogueRef.current) setD(next);
      }
    };
    const up = (e: KeyboardEvent) => {
      const dir = KEYS[e.key];
      if (dir) heldRef.current = heldRef.current.filter((d) => d !== dir);
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  }, [setD]);

  useEffect(() => {
    const ctx = canvasRef.current!.getContext("2d")!;
    let raf = 0;
    let last = performance.now();
    const loop = (now: number) => {
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      const held = dialogueRef.current ? null : (heldRef.current[heldRef.current.length - 1] ?? null);
      const r = update(worldRef.current, dt, held, MAPS);
      worldRef.current = r.world;
      if (r.warped) setMapName(r.world.map.name);
      drawWorld(ctx, worldRef.current, now / 1000);
      const { x, y } = worldRef.current.player;
      const ds = ctx.canvas.dataset;
      ds.tx = String(x);
      ds.ty = String(y);
      ds.map = worldRef.current.map.id;
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  // Typewriter re-render while a dialogue is open.
  useEffect(() => {
    if (!dialogue) return;
    const t = setInterval(() => setElapsedBoth(elapsedRef.current + 40), 40);
    return () => clearInterval(t);
  }, [dialogue, setElapsedBoth]);

  const hold = (dir: Dir, on: boolean) => {
    heldRef.current = heldRef.current.filter((d) => d !== dir);
    if (on) heldRef.current.push(dir);
  };
  const pad = (dir: Dir, label: string, cls: string) => (
    <button
      type="button"
      aria-label={dir}
      className={`absolute h-14 w-14 touch-none select-none rounded-md border-2 border-slate-500 bg-slate-800 text-xl text-slate-100 active:bg-cyan-700 ${cls}`}
      onPointerDown={(e) => { e.currentTarget.setPointerCapture(e.pointerId); hold(dir, true); }}
      onPointerUp={() => hold(dir, false)}
      onPointerCancel={() => hold(dir, false)}
      onLostPointerCapture={() => hold(dir, false)}
    >
      {label}
    </button>
  );

  const line = dialogue ? currentLine(dialogue) : null;
  const shown = line ? visibleChars(line.text, elapsed) : 0;
  const choices = dialogue ? visibleChoices(dialogue) : [];
  const typing = line ? shown < [...line.text].length : false;

  return (
    <main className="mx-auto flex min-h-dvh max-w-3xl flex-col items-center gap-3 p-3 text-slate-100">
      <h1 className="font-pixel text-sm text-cyan-200">{mapName}</h1>
      <canvas
        ref={canvasRef}
        width={VIEW_W * TILE}
        height={VIEW_H * TILE}
        aria-label={`Overworld: ${mapName}`}
        className="w-full max-w-[704px] border-4 border-slate-600 bg-black"
        style={{ imageRendering: "pixelated", aspectRatio: `${VIEW_W} / ${VIEW_H}` }}
        onClick={() => pressRef.current()}
      />
      {dialogue && line ? (
        <section aria-label="Dialogue" className="w-full max-w-[704px] border-4 border-slate-500 bg-slate-900 p-3" role="dialog">
          <div className="flex gap-3">
            {line.portrait && <Portrait id={line.portrait} talking={typing} />}
            <div className="min-w-0 flex-1">
              {line.speaker && <p className="font-pixel text-[11px] text-cyan-300">{line.speaker}</p>}
              <p className="min-h-[3.5rem] text-base leading-snug" data-testid="dialogue-text">{sliceChars(line.text, shown)}</p>
            </div>
          </div>
          <div className="mt-2 flex flex-col gap-2">
            {!typing && choices.map((c, i) => (
              <button key={c.label} type="button" className="min-h-11 rounded border-2 border-cyan-400/60 bg-slate-800 px-3 text-left text-sm hover:bg-slate-700" onClick={() => setD(choose(dialogue, i))}>
                <span className="mr-2 text-cyan-300">{i + 1}</span>{c.label}
              </button>
            ))}
            {!typing && choices.length === 0 && (
              <button type="button" className="min-h-11 self-end rounded border-2 border-cyan-400/60 bg-slate-800 px-4 text-sm" onClick={() => pressRef.current()}>Next ▶</button>
            )}
          </div>
        </section>
      ) : (
        <p className="text-xs text-slate-400">Arrows / WASD to move · Enter, Space or E to talk and read</p>
      )}
      <div className="relative mt-1 h-44 w-48 touch-none" aria-label="Touch controls">
        {pad("up", "▲", "left-[72px] top-0")}
        {pad("left", "◀", "left-0 top-14")}
        {pad("right", "▶", "left-[144px] top-14")}
        {pad("down", "▼", "left-[72px] top-28")}
      </div>
      <button type="button" className="min-h-12 w-24 rounded-full border-2 border-cyan-300 bg-cyan-800 font-pixel text-sm" onClick={() => pressRef.current()}>A</button>
    </main>
  );
}
