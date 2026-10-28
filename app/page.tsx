import { SpriteCanvas } from "@/components/sprites/SpriteCanvas";
import { seedSprite } from "@/lib/seedSprite";

const MENU = [
  { title: "Start", sub: "Python Port: your first neuron (coming soon)", color: "#7c8cff" },
  { title: "Lab", sub: "Implement the network from scratch", color: "#5eead4" },
  { title: "Code Dojo", sub: "C++ and Python interview problems", color: "#fbbf24" },
];

export default function Home() {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col items-center gap-6 px-4 py-10">
      <h1 className="text-center font-display text-5xl leading-none tracking-wide" style={{ textShadow: "0 4px 0 #1b1030, 0 0 24px #7c8cff88" }}>
        NEURAL
        <br />
        CLASH
      </h1>
      <p className="text-center text-sm text-white/70">Implement a neural network from scratch. Train it. Raise it. Pass the interview.</p>
      <div style={{ animation: "px-bob 1.6s steps(4) infinite" }}>
        <SpriteCanvas sprite={seedSprite()} scale={10} label="Neuron-Pup seed, a small blue creature with a golden nose" />
      </div>
      <nav className="flex w-full flex-col gap-3" aria-label="Main menu">
        {MENU.map((m) => (
          <div key={m.title} className="px-menu-item py-3 pl-9 pr-3" style={{ ["--item" as string]: m.color }} aria-disabled="true">
            <div className="font-display text-xl">{m.title}</div>
            <div className="text-xs text-white/60">{m.sub}</div>
          </div>
        ))}
      </nav>
      <p className="text-xs text-white/40">Work in progress · v0.1</p>
    </main>
  );
}
