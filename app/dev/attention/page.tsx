import type { Metadata } from "next";
import Link from "next/link";
import AttentionMap from "@/components/AttentionMap";

export const metadata: Metadata = { title: "Attention map · dev" };

export default function Page() {
  return (
    <main className="mx-auto grid max-w-2xl gap-3 px-4 py-6">
      <Link href="/learn" className="underline inline-flex min-h-11 items-center text-sm">Lessons</Link>
      <AttentionMap />
    </main>
  );
}
