import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-4 px-4 text-center">
      <div className="font-display text-5xl text-[var(--accent)]">404</div>
      <p className="text-white/60">shape mismatch: this route has no tensor to broadcast to.</p>
      <Link href="/" className="px-btn px-5 py-3 text-sm">
        Back to the title screen
      </Link>
    </main>
  );
}
