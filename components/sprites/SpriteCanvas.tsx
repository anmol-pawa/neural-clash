"use client";
import { useEffect, useRef } from "react";
import type { GridSprite } from "@/lib/pixelGrid";

/** Draws a grid sprite with nearest-neighbour scaling (crisp pixels). */
export function SpriteCanvas({ sprite, scale, label }: { sprite: GridSprite; scale: number; label: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const ctx = ref.current?.getContext("2d");
    if (!ctx) return;
    ctx.putImageData(new ImageData(new Uint8ClampedArray(sprite.rgba), sprite.width, sprite.height), 0, 0);
  }, [sprite]);
  return (
    <canvas
      ref={ref}
      role="img"
      aria-label={label}
      width={sprite.width}
      height={sprite.height}
      style={{ width: sprite.width * scale, height: sprite.height * scale, imageRendering: "pixelated" }}
    />
  );
}
