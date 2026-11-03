import { describe, expect, it } from "vitest";
import { SFX, THEME, effectiveGain, midiToHz, sfxLength, themeNotes, type SfxName } from "@/lib/audio/sfx";

describe("audio definitions", () => {
  it("maps MIDI to Hz (A4 = 440, octave doubles)", () => {
    expect(midiToHz(69)).toBeCloseTo(440, 6);
    expect(midiToHz(81)).toBeCloseTo(880, 6);
    expect(midiToHz(60)).toBeCloseTo(261.626, 2);
  });

  it("keeps every effect short, audible and well-formed", () => {
    for (const name of Object.keys(SFX) as SfxName[]) {
      expect(SFX[name].length).toBeGreaterThan(0);
      expect(sfxLength(name)).toBeLessThan(1.5);
      for (const nt of SFX[name]) {
        expect(nt.dur).toBeGreaterThan(0);
        expect(nt.at).toBeGreaterThanOrEqual(0);
        expect(nt.gain).toBeGreaterThan(0);
        expect(nt.gain).toBeLessThanOrEqual(0.5);
        if (nt.wave !== "noise") expect(nt.freq).toBeGreaterThan(20);
        if (nt.to !== undefined) expect(nt.to).toBeGreaterThan(0); // exponential ramps need > 0
      }
    }
  });

  it("makes success rise and failure fall", () => {
    const first = (s: SfxName) => SFX[s][0].freq;
    const last = (s: SfxName) => SFX[s][SFX[s].length - 1].freq;
    expect(last("correct")).toBeGreaterThan(first("correct"));
    expect(last("win")).toBeGreaterThan(first("win"));
    expect(last("lose")).toBeLessThan(first("lose"));
    expect(last("fail")).toBeLessThan(first("fail"));
  });

  it("builds a loopable theme whose notes all fit inside the loop", () => {
    const { notes, length } = themeNotes();
    expect(length).toBeCloseTo((THEME.melody.length * 60) / THEME.bpm / 2, 9);
    for (const nt of notes) expect(nt.at).toBeLessThan(length);
    expect(THEME.bass.length).toBe(THEME.melody.length);
  });

  it("scales gain with volume and clamps", () => {
    expect(effectiveGain(0.2, 0)).toBe(0);
    expect(effectiveGain(0.2, 1)).toBeCloseTo(0.2, 9);
    expect(effectiveGain(0.2, 2)).toBeCloseTo(0.2, 9);
    expect(effectiveGain(0.2, 0.5)).toBeLessThan(0.2);
  });
});
