"use client";
import { useEffect, useSyncExternalStore } from "react";
import { freshSave, type SaveData } from "./schema";
import { IdbBackend, MemoryBackend, SaveManager } from "./store";

let manager: SaveManager | null = null;

/** The app-wide save. IndexedDB in the browser, memory when it is unavailable (SSR, private mode). */
export function getSaveManager(): SaveManager {
  if (!manager) {
    const backend = typeof indexedDB !== "undefined" ? new IdbBackend(indexedDB) : new MemoryBackend();
    manager = new SaveManager(backend);
  }
  return manager;
}

const SERVER_SNAPSHOT: SaveData = freshSave();

/** Subscribes to the save and loads it from storage on first use. */
export function useSave(): SaveData {
  const m = getSaveManager();
  useEffect(() => {
    if (!m.loaded) void m.load();
    const flush = () => void m.flush();
    window.addEventListener("pagehide", flush);
    return () => window.removeEventListener("pagehide", flush);
  }, [m]);
  return useSyncExternalStore(m.subscribe, m.get, () => SERVER_SNAPSHOT);
}
