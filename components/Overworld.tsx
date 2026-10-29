"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { DialogueRunner, type DialogueView, type Flags } from "@/lib/dialogue/engine";
import { OPPOSITE, pendingTrigger, targetInFront, type Dir } from "@/lib/world/area";
import { Mover } from "@/lib/world/mover";
import { AREAS, PYTHON_PORT } from "@/game/world/areas";
import { SCRIPTS } from "@/game/world/scripts";
import { VIEW_H, VIEW_W, drawScene, frameCanvas } from "@/game/world/draw";
import { spriteById } from "@/game/sprites/roster";
import { getSaveManager } from "@/lib/save/react";

const KEY_DIR: Record<string, Dir> = { ArrowUp: "up", ArrowDown: "down", ArrowLeft: "left", ArrowRight: "right", w: "up", s: "down", a: "left", d: "right", W: "up", S: "down", A: "left", D: "right" };
const FADE_MS = 160;

function Portrait({ id, anim }: { id: string; anim: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setTick((n) => n + 1), anim === "talk" ? 140 : 600);
    return () => clearInterval(t);
  }, [anim]);
  useEffect(() => {
    const def = spriteById(id);
    const c = ref.current;
    if (!def || !c) return;
    const g = c.getContext("2d")!;
    g.imageSmoothingEnabled = false;
    g.clearRect(0, 0, c.width, c.height);
    g.drawImage(frameCanvas(def, anim, tick), 0, 0);
  }, [id, anim, tick]);
  return <canvas ref={ref} width={48} height={48} className="h-24 w-24 shrink-0 rounded border-2 border-[#0e0f1a] bg-[#1d2140]" style={{ imageRendering: "pixelated" }} aria-hidden />;
}

export default function Overworld() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [view, setView] = useState<DialogueView | null>(null);
  const [banner, setBanner] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const game = useRef<{
    areaId: string;
    mover: Mover;
    flags: Flags;
    runner: DialogueRunner | null;
    npcFacing: Record<string, Dir>;
    held: Dir[];
    fade: number;
    pendingWarp: { to: string; tx: number; ty: number; facing: Dir } | null;
    time: number;
  }>({ areaId: PYTHON_PORT.id, mover: new Mover(PYTHON_PORT.spawn.x, PYTHON_PORT.spawn.y, PYTHON_PORT.spawn.facing), flags: {}, runner: null, npcFacing: {}, held: [], fade: 0, pendingWarp: null, time: 0 });

  const sync = useCallback(() => setView(game.current.runner?.view() ?? null), []);

  const showBanner = useCallback((name: string) => {
    setBanner(name);
    window.setTimeout(() => setBanner((b) => (b === name ? null : b)), 1800);
  }, []);

  const persistFlags = useCallback(() => {
    const flags = { ...game.current.flags };
    getSaveManager().update((s) => ({ ...s, extra: { ...s.extra, flags } }));
  }, []);

  const startDialogue = useCallback(
    (scriptId: string, npcId?: string) => {
      const g = game.current;
      const script = SCRIPTS[scriptId];
      if (!script || g.runner) return;
      if (npcId) g.npcFacing[npcId] = OPPOSITE[g.mover.facing];
      g.runner = new DialogueRunner(script, g.flags);
      sync();
    },
    [sync],
  );

  const interact = useCallback(() => {
    const g = game.current;
    if (g.runner) {
      g.runner.advance();
      if (g.runner.finished) {
        g.runner = null;
        persistFlags();
      }
      sync();
      return;
    }
    if (g.mover.moving || g.fade > 0) return;
    const t = targetInFront(AREAS[g.areaId], g.mover.x, g.mover.y, g.mover.facing);
    if (t?.kind === "npc") startDialogue(t.npc.script, t.npc.id);
    else if (t?.kind === "object") startDialogue(t.script);
  }, [persistFlags, startDialogue, sync]);

  const choose = useCallback(
    (i: number) => {
      const g = game.current;
      g.runner?.choose(i);
      if (g.runner?.finished) {
        g.runner = null;
        persistFlags();
      }
      sync();
    },
    [persistFlags, sync],
  );

  // load the save, then run the loop
  useEffect(() => {
    let alive = true;
    const m = getSaveManager();
    void (m.loaded ? Promise.resolve() : m.load()).then(() => {
      if (!alive) return;
      const raw = m.get().extra.flags;
      if (raw && typeof raw === "object") game.current.flags = { ...(raw as Flags) };
      setReady(true);
      showBanner(PYTHON_PORT.name);
    });
    return () => {
      alive = false;
    };
  }, [showBanner]);

  useEffect(() => {
    if (!ready) return;
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let last = performance.now();
    let raf = 0;
    const frame = (now: number) => {
      const dt = Math.min(64, now - last);
      last = now;
      const g = game.current;
      g.time += dt / 1000;
      const area = AREAS[g.areaId];
      if (g.pendingWarp) {
        g.fade += reduce ? 1 : dt / FADE_MS;
        if (g.fade >= 1) {
          const w = g.pendingWarp;
          g.pendingWarp = null;
          g.areaId = w.to;
          g.mover.place(w.tx, w.ty, w.facing);
          showBanner(AREAS[w.to].name);
        }
      } else if (g.fade > 0) g.fade = Math.max(0, g.fade - (reduce ? 1 : dt / FADE_MS));
      else {
        const held = g.held.length ? g.held[g.held.length - 1] : null;
        for (const ev of g.mover.update(dt, held, area, g.runner !== null)) {
          if (ev.kind === "warp") g.pendingWarp = { to: ev.to, tx: ev.tx, ty: ev.ty, facing: ev.facing };
          else if (ev.kind === "arrived") {
            const t = pendingTrigger(area, ev.x, ev.y, g.flags);
            if (t) {
              g.runner = new DialogueRunner(SCRIPTS[t.script], g.flags);
              sync();
            }
          }
        }
      }
      if (g.runner) {
        const before = g.runner.view();
        g.runner.tick(dt);
        const after = g.runner.view();
        if (before.kind === "say" && after.kind === "say" && (before.shown !== after.shown || before.done !== after.done)) sync();
      }
      drawScene(ctx, { area: AREAS[g.areaId], mover: g.mover, npcFacing: g.npcFacing, time: g.time, fade: g.fade });
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);

    const press = (d: Dir) => {
      const h = game.current.held;
      if (!h.includes(d)) h.push(d);
    };
    const release = (d: Dir) => {
      game.current.held = game.current.held.filter((x) => x !== d);
    };
    const down = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const g = game.current;
      const view = g.runner?.view();
      if (view?.kind === "choice") {
        const n = Number(e.key);
        if (n >= 1 && n <= view.options.length) return void (e.preventDefault(), choose(n - 1));
      }
      const d = KEY_DIR[e.key];
      if (d) {
        e.preventDefault();
        press(d);
      } else if ([" ", "Enter", "z", "Z", "e", "E"].includes(e.key)) {
        e.preventDefault();
        if (!e.repeat && view?.kind !== "choice") interact();
      }
    };
    const up = (e: KeyboardEvent) => {
      const d = KEY_DIR[e.key];
      if (d) release(d);
    };
    const blur = () => (game.current.held = []);
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    window.addEventListener("blur", blur);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
      window.removeEventListener("blur", blur);
    };
  }, [ready, interact, choose, showBanner, sync]);

  const touchDir = (d: Dir) => ({
    onPointerDown: (e: React.PointerEvent) => {
      e.preventDefault();
      (e.target as Element).setPointerCapture?.(e.pointerId);
      const h = game.current.held;
      if (!h.includes(d)) h.push(d);
    },
    onPointerUp: () => (game.current.held = game.current.held.filter((x) => x !== d)),
    onPointerCancel: () => (game.current.held = game.current.held.filter((x) => x !== d)),
  });

  return (
    <div className="mx-auto flex w-full max-w-[960px] flex-col gap-3">
      <div className="relative w-full select-none overflow-hidden rounded border-4 border-[#0e0f1a] bg-black shadow-[0_0_0_2px_#3a3f63]" style={{ aspectRatio: `${VIEW_W} / ${VIEW_H}` }}>
        <canvas ref={canvasRef} width={VIEW_W} height={VIEW_H} className="block h-full w-full" style={{ imageRendering: "pixelated" }} aria-label="Overworld" data-testid="overworld" />
        {banner && (
          <div className="pointer-events-none absolute left-2 top-2 rounded border-2 border-[#0e0f1a] bg-[#151831]/90 px-3 py-1 font-display text-xs tracking-wider text-[var(--accent)]" data-testid="area-banner">
            {banner}
          </div>
        )}
        {view && view.kind !== "end" && (
          <div className="panel absolute inset-x-2 bottom-2 flex gap-3 !bg-[#12142a] p-3 text-sm" data-testid="dialogue" onClick={() => view.kind === "say" && interact()}>
            {view.kind === "say" ? (
              <>
                {view.portrait && <Portrait id={view.portrait} anim={view.mood} />}
                <div className="min-w-0 flex-1">
                  {view.speaker && <div className="mb-1 font-display text-[11px] tracking-wider text-[var(--accent)]">{view.speaker}</div>}
                  <p className="min-h-[3.5em] leading-snug" aria-live="polite">
                    {view.shown}
                  </p>
                  {view.done && <div className="mt-1 text-right text-[10px] text-white/50" style={{ animation: "nc-pulse 1s infinite" }}>▼ tap / Space</div>}
                </div>
              </>
            ) : (
              <div className="flex w-full flex-col gap-2" role="menu">
                {view.options.map((o) => (
                  <button key={o.index} type="button" role="menuitem" className="px-btn px-3 py-1.5 text-left text-xs" onClick={(e) => (e.stopPropagation(), choose(o.index))}>
                    <span className="mr-2 text-[var(--accent)]">{o.index + 1}</span>
                    {o.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
      <div className="flex items-center justify-between gap-4 md:hidden" aria-label="Touch controls">
        <div className="grid grid-cols-3 grid-rows-3 gap-1" style={{ touchAction: "none" }}>
          {(
            [
              ["up", 2, "▲"],
              ["left", 4, "◀"],
              ["right", 6, "▶"],
              ["down", 8, "▼"],
            ] as const
          ).map(([d, cell, label]) => (
            <button key={d} type="button" aria-label={d} className="px-btn h-14 w-14 text-lg" style={{ gridColumn: ((cell - 1) % 3) + 1, gridRow: Math.floor((cell - 1) / 3) + 1, touchAction: "none" }} {...touchDir(d)}>
              {label}
            </button>
          ))}
        </div>
        <button type="button" aria-label="Interact" className="px-btn px-btn-primary h-20 w-20 rounded-full text-xl" onPointerDown={(e) => (e.preventDefault(), interact())}>
          A
        </button>
      </div>
      <p className="hidden text-center text-xs text-white/50 md:block">Arrows / WASD to walk · Space / Enter / Z to talk and confirm · 1–9 to pick an answer</p>
    </div>
  );
}
