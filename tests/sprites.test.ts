import { describe, expect, it } from "vitest";
import { bounds, validateSprite } from "@/game/sprites/pixel";
import { SPRITES } from "@/game/sprites/roster";

const isCharacter = (d: { id: string }) => d.id === "player" || d.id === "okafor" || d.id.endsWith("-portrait");
const CREATURES = SPRITES.filter((d) => !isCharacter(d));
const CHARACTERS = SPRITES.filter(isCharacter);

describe("sprite roster", () => {
  for (const def of CREATURES) {
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
  for (const def of CHARACTERS) {
    describe(`character ${def.id}`, () => {
      const portrait = def.id.endsWith("-portrait");
      it("is a valid sprite definition", () => {
        expect(validateSprite(def)).toEqual([]);
      });
      it(portrait ? "is a 48×48 portrait with talk, smile and think frames" : "is 16×24 with a 4-frame walk cycle in every direction", () => {
        if (portrait) {
          expect([def.w, def.h]).toEqual([48, 48]);
          for (const a of ["idle", "talk", "smile", "think"]) expect(def.anims[a]?.length).toBeGreaterThanOrEqual(2);
        } else {
          expect([def.w, def.h]).toEqual([16, 24]);
          for (const d of ["down", "up", "left", "right"]) {
            expect(def.anims[`walk-${d}`]).toHaveLength(4);
            expect(def.anims[`stand-${d}`]?.length).toBeGreaterThanOrEqual(2);
          }
        }
      });
      it("is outlined and fits the canvas", () => {
        for (const [name, frames] of Object.entries(def.anims))
          for (const f of frames) {
            expect(bounds(f), name).not.toBeNull();
            expect(f.join("").includes("k"), name).toBe(true);
          }
      });
      it("walk frames differ so the cycle visibly animates", () => {
        if (portrait) return;
        for (const d of ["down", "up", "left", "right"]) {
          const w = def.anims[`walk-${d}`];
          expect(new Set(w.map((f) => f.join(""))).size, d).toBeGreaterThanOrEqual(3);
        }
      });
      it("talking changes the mouth", () => {
        if (!portrait) return;
        expect(def.anims.talk[0].join("")).not.toBe(def.anims.talk[1].join(""));
      });
    });
  }
  it("ids are unique", () => {
    expect(new Set(SPRITES.map((s) => s.id)).size).toBe(SPRITES.length);
  });
});
