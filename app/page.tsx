import Link from "next/link";
import { TitleNetwork } from "@/components/TitleNetwork";

/** Title screen. Play/Continue arrive with the save system (ROADMAP A6) and the overworld (B2). */
export default function Home() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-xl flex-col items-center justify-center gap-6 px-4 py-10 text-center">
      <TitleNetwork />
      <h1 className="font-display text-5xl leading-none text-[var(--accent)] sm:text-6xl">NEURAL CLASH</h1>
      <p className="max-w-md text-balance text-white/70">
        Raise a companion that is a neural network you build from scratch, then train it. From first neuron to the AI-engineer interview loop.
      </p>
      <div className="panel flex w-full max-w-xs flex-col gap-3 p-4">
        <Link href="/play" className="px-btn px-btn-primary px-4 py-3 text-center text-lg leading-[1.6]">
          Start
        </Link>
        <p className="text-xs text-white/50">Explore the Python Port and meet Professor Okafor. Work in progress.</p>
      </div>
    </main>
  );
}
