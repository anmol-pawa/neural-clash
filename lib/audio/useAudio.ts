"use client";
import { useEffect } from "react";
import { getSaveManager, useSave } from "@/lib/save/react";
import { audio } from "./player";

/** Keeps the player in step with the saved volume/music settings. Call once per page that makes sound. */
export function useAudioSettings(opts: { music?: boolean } = {}): void {
  const allowMusic = opts.music ?? true;
  const { volume, music } = useSave().settings;
  useEffect(() => {
    audio.volume = volume;
    audio.musicOn = allowMusic && music;
    if (allowMusic && music && volume > 0) audio.startMusic();
    else audio.stopMusic();
  }, [volume, music, allowMusic]);
  useEffect(() => () => { if (allowMusic) audio.stopMusic(); }, [allowMusic]);
}

export const setVolume = (volume: number): void =>
  getSaveManager().update((s) => ({ ...s, settings: { ...s.settings, volume: Math.min(1, Math.max(0, volume)) } }));
export const setMusic = (music: boolean): void => getSaveManager().update((s) => ({ ...s, settings: { ...s.settings, music } }));
