"use client";
import { useSave } from "@/lib/save/react";
import { audio } from "@/lib/audio/player";
import { setMusic, setVolume, useAudioSettings } from "@/lib/audio/useAudio";

/** Volume + music toggle. Music only starts after a tap (browsers block autoplay), which this control provides. */
export function AudioControls() {
  useAudioSettings();
  const { volume, music } = useSave().settings;
  return (
    <div className="flex items-center justify-between gap-3 text-sm" role="group" aria-label="Sound">
      <label className="flex flex-1 items-center gap-2">
        <span>Volume</span>
        <input
          type="range" min={0} max={100} value={Math.round(volume * 100)}
          aria-label="Volume"
          className="min-h-11 flex-1"
          onChange={(e) => setVolume(Number(e.target.value) / 100)}
          onPointerUp={() => audio.play("select")}
        />
      </label>
      <button type="button" className="px-btn min-h-11 whitespace-nowrap px-3" aria-pressed={music} onClick={() => { setMusic(!music); audio.play("select"); }}>
        Music {music ? "on" : "off"}
      </button>
    </div>
  );
}
