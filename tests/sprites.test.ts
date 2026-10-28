import { describe, expect, it } from "vitest";
import { bounds, validateSprite } from "@/game/sprites/pixel";
import { SPRITES } from "@/game/sprites/roster";

describe("sprite roster", () => {
  for (const def of SPRITES) {
    describe(def.id, () => {
      it("is a valid sprite definition", () => {
        expect(validateSprite(def)).toEqual([]);
      });
      it("meets the size bar (at least 64×64)", () => {
        expect(def.w).toBeGreaterThanOrEqual(64);
        expect(def.h).toBeGreaterThanOrEqual(64);
      });
      it("has the full animation set", () => {
        for (const a of ["idle", "attack", "hurt", "faint"]) expect(def.anims[a]?.length).toBeGreaterThan(0);
        expect(def.anims.idle.length).toBeGreaterThanOrEqual(2);
        expect(def.anims.faint.length).toBeGreaterThanOrEqual(3);
      });
      it("keeps every frame inside the canvas with a clear margin and uses an outline", () => {
        for (const [name, frames] of Object.entries(def.anims))
          for (const f of frames) {
            const b = bounds(f);
            expect(b, name).not.toBeNull();
            expect(b!.w, name).toBeGreaterThan(24);
            expect(b!.h, name).toBeGreaterThan(20);
            expect(b!.y + b!.h, name).toBeLessThanOrEqual(def.h);
            expect(f.join("").includes("k"), name).toBe(true);
          }
      });
      it("animates: no two consecutive idle frames are identical", () => {
        const idle = def.anims.idle;
        idle.forEach((f, i) => expect(f.join("")).not.toBe(idle[(i + 1) % idle.length].join("")));
      });
      it("uses a limited palette", () => {
        expect(Object.keys(def.palette).length).toBeLessThanOrEqual(28);
      });
    });
  }
  it("ids are unique", () => {
    expect(new Set(SPRITES.map((s) => s.id)).size).toBe(SPRITES.length);
  });
});
