/** Frame → canvas cache for the overworld (browser only). Nearest-neighbour is applied when drawing. */
import { frameToRGBA, type SpriteDef } from "@/game/sprites/pixel";

const cache = new Map<string, HTMLCanvasElement>();

export function frameCanvas(def: SpriteDef, anim: string, index: number): HTMLCanvasElement {
  const frames = def.anims[anim] ?? def.anims.idle;
  const i = ((index % frames.length) + frames.length) % frames.length;
  const key = `${def.id}:${anim}:${i}`;
  let c = cache.get(key);
  if (!c) {
    c = document.createElement("canvas");
    c.width = def.w;
    c.height = def.h;
    const data = frameToRGBA(def, frames[i]);
    c.getContext("2d")!.putImageData(new ImageData(data as Uint8ClampedArray<ArrayBuffer>, def.w, def.h), 0, 0);
    cache.set(key, c);
  }
  return c;
}

/** Frame index at time `t` seconds for an animation of `def`. */
export const frameAt = (def: SpriteDef, anim: string, t: number): number => Math.floor(t * (def.fps?.[anim] ?? 4));
