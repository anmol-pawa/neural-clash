"use client";
import { useSyncExternalStore } from "react";

let first: number | null = null;
const noop = () => () => {};

/** Page-load time on the client, null during static rendering, so server and first client render agree. */
export function useNow(): number | null {
  return useSyncExternalStore(noop, () => (first ??= Date.now()), () => null);
}
