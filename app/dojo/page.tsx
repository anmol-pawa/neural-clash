import type { Metadata } from "next";
import Link from "next/link";
import { dojoProblems } from "@/lib/dojo/catalog";

export const metadata: Metadata = { title: "Code Dojo · Neural Clash" };

export default function Page() {
  return (
    <main className="mx-auto grid w-full max-w-2xl gap-3 p-4">
      <h1 className="font-display text-xl">Code Dojo</h1>
      <p className="text-sm text-slate-300">Write the C++ by hand; a real in-browser clang compiles it and judges it against hidden tests. C++ is the default language for interview problems.</p>
      <ul className="grid gap-2">
        {dojoProblems().map((p) => (
          <li key={p.id}>
            <Link href={`/dojo/${p.id}`} className="px-btn flex min-h-11 items-center justify-between gap-2 px-4 py-2" data-testid={`dojo-${p.id}`}>
              <span>{p.title}</span>
              <span className="text-xs text-white/60">{p.difficulty} · {p.tags.join(", ")}</span>
            </Link>
          </li>
        ))}
      </ul>
      <Link href="/" className="text-sm underline">Back to title</Link>
    </main>
  );
}
