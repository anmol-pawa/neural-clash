"use client";

import Link from "next/link";
import type { DojoProblem } from "@/lib/dojo/catalog";
import { stateOf } from "@/lib/srs/srs";
import { useNow } from "@/lib/sync/useNow";
import { problemKey } from "@/lib/sync/sync";
import { useSave } from "@/lib/save/react";

const LABEL = { new: "", learning: "learning", reviewing: "reviewing", mastered: "mastered", rusted: "rusty: re-solve" } as const;

/** The Dojo ladder with each problem's spaced-mastery state (GDD §6). */
export default function DojoList({ problems }: { problems: DojoProblem[] }) {
  const save = useSave();
  const now = useNow();
  return (
    <ul className="grid gap-2">
      {problems.map((p) => {
        const st = now === null ? "new" : stateOf(save.srs[problemKey(p.id)], now);
        return (
          <li key={p.id}>
            <Link href={`/dojo/${p.id}`} className="px-btn flex min-h-11 items-center justify-between gap-2 px-4 py-2" data-testid={`dojo-${p.id}`}>
              <span>{p.title}</span>
              <span className="text-right text-xs text-white/60">
                {p.difficulty} · {p.tags.join(", ")}
                {LABEL[st] && <span data-testid={`dojo-mastery-${p.id}`} className={st === "rusted" ? "ml-2 text-amber-300" : "ml-2 text-emerald-300"}>{LABEL[st]}</span>}
              </span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
