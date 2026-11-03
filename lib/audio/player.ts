import { SFX, effectiveGain, themeNotes, type Note, type SfxName } from "./sfx";

/** Browser-only Web Audio player. It never throws: audio is a nicety, not a dependency. */
class Player {
  private ctx: AudioContext | null = null;
  private noise: AudioBuffer | null = null;
  private musicTimer: ReturnType<typeof setTimeout> | null = null;
  volume = 0.6;
  sfxOn = true;
  musicOn = false;

  private ensure(): AudioContext | null {
    try {
      if (typeof window === "undefined") return null;
      if (!this.ctx) {
        const C = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
        if (!C) return null;
        this.ctx = new C();
      }
      if (this.ctx.state === "suspended") void this.ctx.resume().catch(() => undefined);
      return this.ctx;
    } catch {
      return null;
    }
  }

  private noiseBuffer(ctx: AudioContext): AudioBuffer {
    if (!this.noise) {
      const b = ctx.createBuffer(1, ctx.sampleRate / 2, ctx.sampleRate);
      const d = b.getChannelData(0);
      let seed = 12345;
      for (let i = 0; i < d.length; i++) {
        seed = (seed * 1664525 + 1013904223) >>> 0;
        d[i] = (seed / 0xffffffff) * 2 - 1;
      }
      this.noise = b;
    }
    return this.noise;
  }

  private schedule(ctx: AudioContext, notes: Note[], start: number): void {
    for (const nt of notes) {
      const t0 = start + nt.at;
      const g = ctx.createGain();
      const peak = Math.max(0.0001, effectiveGain(nt.gain, this.volume));
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.exponentialRampToValueAtTime(peak, t0 + 0.005);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + nt.dur);
      g.connect(ctx.destination);
      if (nt.wave === "noise") {
        const s = ctx.createBufferSource();
        s.buffer = this.noiseBuffer(ctx);
        s.connect(g);
        s.start(t0);
        s.stop(t0 + nt.dur);
      } else {
        const o = ctx.createOscillator();
        o.type = nt.wave;
        o.frequency.setValueAtTime(nt.freq, t0);
        if (nt.to) o.frequency.exponentialRampToValueAtTime(nt.to, t0 + nt.dur);
        o.connect(g);
        o.start(t0);
        o.stop(t0 + nt.dur + 0.02);
      }
    }
  }

  play(name: SfxName): void {
    if (!this.sfxOn || this.volume <= 0) return;
    const ctx = this.ensure();
    if (ctx) this.schedule(ctx, SFX[name], ctx.currentTime + 0.01);
  }

  startMusic(): void {
    if (this.musicTimer || !this.musicOn || this.volume <= 0) return;
    const ctx = this.ensure();
    if (!ctx) return;
    const { notes, length } = themeNotes();
    const loop = (when: number) => {
      // Autoplay policy keeps the context suspended until a tap: wait instead of queueing bars.
      if (ctx.state !== "running") {
        this.musicTimer = setTimeout(() => loop(ctx.currentTime + 0.05), 400);
        void ctx.resume().catch(() => undefined);
        return;
      }
      this.schedule(ctx, notes, when);
      this.musicTimer = setTimeout(() => loop(when + length), Math.max(0, (length - 0.2) * 1000));
    };
    loop(ctx.currentTime + 0.05);
  }

  stopMusic(): void {
    if (this.musicTimer) clearTimeout(this.musicTimer);
    this.musicTimer = null;
    // Notes already scheduled for the current bar (under 3 s) finish on their own.
  }
}

export const audio = new Player();
