import type { Metadata } from "next";
import Link from "next/link";
import Overworld from "@/components/Overworld";

export const metadata: Metadata = { title: "Play · Neural Clash" };

export default function Page() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-4xl flex-col gap-3 px-3 py-4">
      <header className="flex items-center justify-between">
        <h1 className="font-display text-lg text-[var(--accent)]">NEURAL CLASH</h1>
        <Link href="/" className="text-xs text-white/60 underline">
          Title
        </Link>
      </header>
      <Overworld />
    </main>
  );
}
