import Link from "next/link";
import { TitleNetwork } from "@/components/TitleNetwork";
import { AudioControls } from "@/components/AudioControls";

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
        <button type="button" className="px-btn px-btn-primary px-4 py-3 text-lg" disabled>
          Start
        </button>
        <Link href="/learn" className="px-btn px-4 py-2 text-center">Python Port lessons</Link>
        <Link href="/sync" className="px-btn px-4 py-2 text-center">Daily Sync</Link>
        <Link href="/readiness" className="px-btn px-4 py-2 text-center">Readiness Report</Link>
        <Link href="/companion" className="px-btn px-4 py-2 text-center">Your Neuron-Pup</Link>
        <Link href="/labs" className="px-btn px-4 py-2 text-center">Labs</Link>
        <Link href="/train" className="px-btn px-4 py-2 text-center">Training Grounds</Link>
        <Link href="/mart" className="px-btn px-4 py-2 text-center">Bit Mart</Link>
        <Link href="/journal" className="px-btn px-4 py-2 text-center">Research journal</Link>
        <Link href="/guardian" className="px-btn px-4 py-2 text-center">Warden Indent (guardian)</Link>
        <AudioControls />
        <p className="text-xs text-white/50">The Python Port opens soon. Work in progress.</p>
      </div>
    </main>
  );
}
