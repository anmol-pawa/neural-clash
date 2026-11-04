"use client";

import Link from "next/link";
import { dojoProblems } from "@/lib/dojo/catalog";
import { useSave } from "@/lib/save/react";
import { stateOf, type MasteryState } from "@/lib/srs/srs";
import { problemKey } from "@/lib/sync/sync";
import { useNow } from "@/lib/sync/useNow";

const BADGE: Record<MasteryState, { text: string; cls: string }> = {
  new: { text: "", cls: "" },
  learning: { text: "learning", cls: "text-sky-300" },
  reviewing: { text: "reviewing", cls: "text-sky-300" },
  mastered: { text: "mastered", cls: "text-emerald-300" },
  rusted: { text: "rusted", cls: "text-amber-300" },
};

export default function DojoList() {
  const save = useSave();
  const now = useNow();
  return (
    <ul className="grid gap-2">
      {dojoProblems().map((p) => {
        const st = now === null ? "new" : stateOf(save.srs[problemKey(p.id)], now);
        const b = BADGE[st];
        return (
          <li key={p.id}>
            <Link href={`/dojo/${p.id}`} className="px-btn flex min-h-11 items-center justify-between gap-2 px-4 py-2" data-testid={`dojo-${p.id}`}>
              <span>{p.title}</span>
              <span className="text-right text-xs text-white/60">
                {p.difficulty} · {p.tags.join(", ")}
                {b.text && <span className={`ml-2 ${b.cls}`} data-testid={`dojo-mastery-${p.id}`}>{b.text}</span>}
              </span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
