"use client";

import Link from "next/link";
import { dojoProblems } from "@/lib/dojo/catalog";
import { useSave } from "@/lib/save/react";
import { stateOf } from "@/lib/srs/srs";
import { problemKey } from "@/lib/sync/sync";
import { useNow } from "@/lib/sync/useNow";

const BADGE: Record<string, { text: string; cls: string }> = {
  learning: { text: "learning", cls: "text-sky-300" },
  reviewing: { text: "reviewing", cls: "text-sky-300" },
  mastered: { text: "mastered", cls: "text-emerald-300" },
  rusted: { text: "rusted: redo", cls: "text-amber-300" },
};

/** The ladder with each problem's spaced-mastery state (computed after mount to match static HTML). */
export default function DojoIndex() {
  const save = useSave();
  const now = useNow();
  return (
    <ul className="grid gap-2">
      {dojoProblems().map((p) => {
        const b = now === null ? undefined : BADGE[stateOf(save.srs[problemKey(p.id)], now)];
        return (
          <li key={p.id}>
            <Link href={`/dojo/${p.id}`} className="px-btn flex min-h-11 items-center justify-between gap-2 px-4 py-2" data-testid={`dojo-${p.id}`}>
              <span>{p.title}</span>
              <span className="text-right text-xs text-white/60">
                {p.difficulty} · {p.tags.join(", ")}
                {b && <span className={`ml-2 ${b.cls}`} data-testid={`dojo-state-${p.id}`}>{b.text}</span>}
              </span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
