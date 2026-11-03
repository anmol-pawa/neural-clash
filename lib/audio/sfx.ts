/**
 * Pure sound definitions: every effect is a short list of oscillator "notes".
 * No Web Audio here, so the data is unit-testable. `player.ts` turns it into sound.
 */
export type Wave = "square" | "triangle" | "sawtooth" | "sine" | "noise";

export interface Note {
  wave: Wave;
  /** Start frequency in Hz (ignored for noise). */
  freq: number;
  /** End frequency for a glide; defaults to `freq`. */
  to?: number;
  /** Seconds after the effect starts. */
  at: number;
  /** Length in seconds. */
  dur: number;
  /** Peak gain 0..1 before master volume. */
  gain: number;
}

export type SfxName = "select" | "correct" | "wrong" | "hit" | "hurt" | "win" | "lose" | "pass" | "fail" | "badge";

const n = (wave: Wave, freq: number, at: number, dur: number, gain = 0.25, to?: number): Note => ({ wave, freq, to, at, dur, gain });

/** Equal-tempered frequency of a MIDI note number (A4 = 69 = 440 Hz). */
export const midiToHz = (m: number): number => 440 * Math.pow(2, (m - 69) / 12);

const arp = (wave: Wave, midis: number[], step: number, dur: number, gain = 0.22): Note[] =>
  midis.map((m, i) => n(wave, midiToHz(m), i * step, dur, gain));

export const SFX: Record<SfxName, Note[]> = {
  select: [n("square", 660, 0, 0.05, 0.15)],
  correct: arp("square", [72, 76, 79], 0.07, 0.1),
  wrong: [n("sawtooth", 220, 0, 0.18, 0.2, 140), n("sawtooth", 165, 0.1, 0.22, 0.2, 90)],
  hit: [n("noise", 0, 0, 0.12, 0.3), n("square", 300, 0, 0.12, 0.18, 90)],
  hurt: [n("noise", 0, 0, 0.18, 0.28), n("triangle", 180, 0, 0.2, 0.25, 70)],
  win: arp("square", [60, 64, 67, 72, 76, 79, 84], 0.09, 0.16),
  lose: arp("triangle", [67, 64, 60, 55], 0.16, 0.26, 0.3),
  pass: arp("triangle", [67, 72, 76], 0.08, 0.14, 0.3),
  fail: [n("square", 196, 0, 0.14, 0.18), n("square", 147, 0.14, 0.24, 0.18)],
  badge: [...arp("square", [72, 76, 79, 84], 0.1, 0.18), n("triangle", midiToHz(88), 0.4, 0.5, 0.25)],
};

/** Total length of an effect in seconds. */
export const sfxLength = (name: SfxName): number => Math.max(...SFX[name].map((x) => x.at + x.dur));

/** A looping title/world theme: a pentatonic melody over a bass pulse, as steps of one beat. */
export interface Theme {
  bpm: number;
  /** MIDI notes per step; `null` is a rest. */
  melody: (number | null)[];
  bass: (number | null)[];
}

export const THEME: Theme = {
  bpm: 96,
  melody: [69, null, 72, 74, 76, null, 74, 72, 69, null, 67, 69, 72, null, null, null],
  bass: [45, null, 45, null, 41, null, 41, null, 43, null, 43, null, 40, null, 40, null],
};

/** Notes for one pass of the theme, starting at t = 0. */
export function themeNotes(t: Theme = THEME): { notes: Note[]; length: number } {
  const beat = 60 / t.bpm / 2; // two steps per beat
  const notes: Note[] = [];
  t.melody.forEach((m, i) => m !== null && notes.push(n("square", midiToHz(m), i * beat, beat * 0.9, 0.07)));
  t.bass.forEach((m, i) => m !== null && notes.push(n("triangle", midiToHz(m), i * beat, beat * 1.6, 0.12)));
  return { notes, length: Math.max(t.melody.length, t.bass.length) * beat };
}

/** The effective gain for a note: master volume squared feels linear to the ear. */
export const effectiveGain = (noteGain: number, volume: number): number => {
  const v = Math.min(1, Math.max(0, volume));
  return noteGain * v * v;
};
