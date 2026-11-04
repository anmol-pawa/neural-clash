import type { Metadata } from "next";
import Link from "next/link";
import DojoList from "@/components/DojoList";
import { dojoProblems } from "@/lib/dojo/catalog";

export const metadata: Metadata = { title: "Code Dojo · Neural Clash" };

export default function Page() {
  return (
    <main className="mx-auto grid w-full max-w-2xl gap-3 p-4">
      <h1 className="font-display text-xl">Code Dojo</h1>
      <p className="text-sm text-slate-300">Write the C++ by hand; a real in-browser clang compiles it and judges it against hidden tests. C++ is the default language for interview problems.</p>
      <DojoList problems={dojoProblems()} />
      <Link href="/" className="text-sm underline">Back to title</Link>
    </main>
  );
}
