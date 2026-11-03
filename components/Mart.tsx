"use client";

import Link from "next/link";
import { useState } from "react";
import { RustyPup } from "@/components/Sync";
import { audio } from "@/lib/audio/player";
import { buyItem, equip, isTintItem, MART, tintFor } from "@/lib/economy/economy";
import { getSaveManager, useSave } from "@/lib/save/react";

export default function Mart() {
  const save = useSave();
  const [msg, setMsg] = useState("");
  const [preview, setPreview] = useState<string | null>(null);
  const shown = preview ?? save.equipped;

  const buy = (id: string) => {
    let said = "";
    getSaveManager().update((s) => {
      const r = buyItem(s.wallet, s.owned, id);
      if (!r.ok) {
        said = r.reason === "poor" ? "Not enough Bits." : r.reason === "owned" ? "You already own that." : "Unknown item.";
        return s;
      }
      said = "Bought.";
      return { ...s, wallet: r.wallet, owned: r.owned, updatedAt: Date.now() };
    });
    setMsg(said);
    audio.play(said === "Bought." ? "correct" : "wrong");
  };
  const wear = (id: string | null) => {
    getSaveManager().update((s) => {
      const r = equip(s.owned, s.equipped, id);
      return r.ok ? { ...s, equipped: r.equipped, updatedAt: Date.now() } : s;
    });
    setPreview(null);
  };

  return (
    <main className="mx-auto grid max-w-3xl gap-4 px-4 py-6" data-testid="mart">
      <nav className="flex items-center justify-between text-sm">
        <Link href="/" className="inline-flex min-h-11 items-center underline">Title</Link>
        <Link href="/labs" className="inline-flex min-h-11 items-center underline">Labs</Link>
      </nav>
      <h1 className="text-xl">Bit Mart</h1>
      <p className="text-sm text-white/70">
        Bits come from first, unassisted passes: Labs (25), the guardian (100) and cards (2 each); Interview mode pays 1.5x. Everything here is cosmetic. Nothing sold changes grading, mastery or evolution, and spending never touches your spaced-review record.
      </p>
      <div className="panel flex items-center gap-4 p-3">
        <RustyPup level={0} tint={tintFor(shown)} size="h-24 w-24" />
        <div className="grid gap-1 text-sm">
          <b data-testid="mart-bits">{save.wallet.bits} Bits</b>
          <span className="text-white/60">{preview ? "Previewing (not worn)" : save.equipped ? `Wearing ${MART.find((m) => m.id === save.equipped)?.name}` : "Wearing no tint"}</span>
          {save.equipped && <button type="button" className="px-btn min-h-11 px-3" data-testid="unequip" onClick={() => wear(null)}>Take tint off</button>}
        </div>
      </div>
      <p role="status" className="min-h-5 text-sm" data-testid="mart-msg">{msg}</p>
      <ul className="grid gap-2">
        {MART.map((m) => {
          const owned = save.owned.includes(m.id);
          const worn = save.equipped === m.id;
          const tint = isTintItem(m.id);
          return (
            <li key={m.id} className="panel flex flex-wrap items-center justify-between gap-2 p-3 text-sm" data-testid="mart-item" data-id={m.id}>
              <div>
                <b>{m.name}</b> <span className="text-white/50">· {m.cost} Bits</span>
                <div className="text-xs text-white/70">{m.blurb}</div>
              </div>
              <div className="flex gap-2">
                {tint && !owned && <button type="button" className="px-btn min-h-11 px-3" onClick={() => setPreview(preview === m.id ? null : m.id)}>Preview</button>}
                {!owned && <button type="button" className="px-btn min-h-11 px-3" data-testid="buy" disabled={save.wallet.bits < m.cost} onClick={() => buy(m.id)}>Buy</button>}
                {owned && tint && <button type="button" className="px-btn min-h-11 px-3" aria-pressed={worn} data-testid="wear" onClick={() => wear(worn ? null : m.id)}>{worn ? "✓ Worn" : "Wear"}</button>}
                {owned && !tint && <span className="inline-flex min-h-11 items-center text-xs text-white/60">Owned (Forge decor, coming)</span>}
              </div>
            </li>
          );
        })}
      </ul>
    </main>
  );
}
