"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef } from "react";
import { frameAt, frameCanvas } from "@/game/render/atlas";
import { spriteById } from "@/game/sprites/roster";
import { evolutionState } from "@/lib/evolution/evolution";
import { LABS, labById } from "@/lib/labs/catalog";
import { useSave } from "@/lib/save/react";

const LAB_IDS = new Set(LABS.map((l) => l.id));

/** A form's sprite, animated; unreached forms are drawn as a flat silhouette, forms with no art yet as a "?" tile. */
function FormSprite({ spriteId, locked, label }: { spriteId: string | null; locked: boolean; label: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const g = ref.current!.getContext("2d")!;
    g.imageSmoothingEnabled = false;
    const def = spriteId ? spriteById(spriteId) : undefined;
    if (!def) {
      g.clearRect(0, 0, 64, 64);
      g.fillStyle = "rgba(255,255,255,0.08)";
      g.fillRect(8, 8, 48, 48);
      g.fillStyle = "rgba(255,255,255,0.35)";
      g.font = "bold 28px monospace";
      g.textAlign = "center";
      g.fillText("?", 32, 42);
      return;
    }
    let raf = 0;
    const t0 = performance.now();
    const loop = (now: number) => {
      g.globalCompositeOperation = "source-over";
      g.clearRect(0, 0, 64, 64);
      g.drawImage(frameCanvas(def, "idle", frameAt(def, "idle", (now - t0) / 1000)), 0, 0);
      if (locked) {
        g.globalCompositeOperation = "source-atop";
        g.fillStyle = "#0b0a14";
        g.fillRect(0, 0, 64, 64);
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [spriteId, locked]);
  return <canvas ref={ref} width={64} height={64} className="h-20 w-20 shrink-0" style={{ imageRendering: "pixelated" }} role="img" aria-label={label} />;
}

export default function Companion() {
  const save = useSave();
  const state = useMemo(() => evolutionState(save.labs, LAB_IDS), [save.labs]);
  const cur = state.current >= 0 ? state.forms[state.current]!.form : null;

  return (
    <main className="mx-auto grid max-w-3xl gap-4 px-4 py-6" data-testid="companion">
      <nav className="flex items-center justify-between text-sm">
        <Link href="/" className="inline-flex min-h-11 items-center underline">Title</Link>
        <Link href="/labs" className="inline-flex min-h-11 items-center underline">Labs</Link>
      </nav>
      <h1 className="font-display text-3xl text-[var(--accent)]">Your Neuron-Pup</h1>
      <p className="text-sm text-white/70" data-testid="companion-form">
        {cur ? <>Current form: <strong>{cur.name}</strong>. {cur.blurb}</> : "Not evolved yet. Pass the Forge Lab below without hints or the reference toggle to unlock the Perceptron form."}
      </p>
      {state.next && (
        <p className="text-sm text-white/60" data-testid="companion-next">
          Next: <strong>{state.next.form.name}</strong> ({Math.round(state.nextProgress * 100)}% of its Labs done).
        </p>
      )}
      <ol className="grid gap-3" aria-label="Evolution ladder">
        {state.forms.map((s, i) => (
          <li key={s.form.id} data-testid={`form-${s.form.id}`} data-reached={s.reached} className={`panel flex items-center gap-3 p-3 ${s.reached ? "" : "opacity-80"}`}>
            <FormSprite spriteId={s.form.sprite} locked={!s.reached} label={s.reached ? `${s.form.name} form` : `${s.form.name} form, locked`} />
            <div className="grid min-w-0 gap-1 text-sm">
              <h2 className="font-display text-lg">{i + 1}. {s.form.name} {s.reached ? <span className="text-emerald-300">unlocked</span> : <span className="text-white/40">locked</span>}</h2>
              <p className="text-white/60">{s.form.blurb}</p>
              <ul className="flex flex-wrap gap-x-3 gap-y-1">
                {s.requirements.map((r) => (
                  <li key={r.labId} className={r.done ? "text-emerald-300" : "text-white/50"}>
                    {r.done ? "✓ " : "○ "}
                    {r.available ? <Link href="/labs" className="underline">{labById(r.labId)?.title ?? r.labId}</Link> : <>{r.labId} (coming)</>}
                  </li>
                ))}
              </ul>
            </div>
          </li>
        ))}
      </ol>
      <p className="text-xs text-white/50">Assisted passes (hints, revealed answers, reference toggle) never evolve your Pup. Art for the later forms is still to come.</p>
    </main>
  );
}
