import { describe, expect, it } from "vitest";
import { bounds, validateSprite } from "@/game/sprites/pixel";
import { SPRITES } from "@/game/sprites/roster";
import { PYTHON_PORT_TILES } from "@/game/sprites/tiles/python-port-tiles";
import { LAB_TILES } from "@/game/sprites/tiles/lab-tiles";
import { composeMap, TILE, validateMap } from "@/game/sprites/tilemap";
import { LAB_GRID, LAB_LEGEND, PORT_GRID, PORT_LEGEND } from "@/game/sprites/maps";

const isCharacter = (d: { id: string }) => d.id === "player" || d.id === "okafor" || d.id.endsWith("-portrait");
const isWorld = (d: { id: string }) => d.id.endsWith("-tiles") || d.id.endsWith("-preview");
const CREATURES = SPRITES.filter((d) => !isCharacter(d) && !isWorld(d));
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

describe("tilesets", () => {
  const ANIMATED: Record<string, string[]> = {
    "python-port-tiles": ["grass", "flowers", "water", "shore", "tree-top", "sign", "lamp", "window", "statue"],
    "lab-tiles": ["window", "board-left", "board-right", "monitor", "server", "plant", "rig", "door", "coffee"],
  };
  for (const def of [PYTHON_PORT_TILES, LAB_TILES]) {
    describe(def.id, () => {
      it("is a valid sprite definition of 16×16 tiles", () => {
        expect(validateSprite(def)).toEqual([]);
        expect([def.w, def.h]).toEqual([TILE, TILE]);
      });
      it("has fully opaque tiles so maps never show holes", () => {
        for (const [name, frames] of Object.entries(def.anims))
          for (const f of frames) expect(f.join("").includes("."), name).toBe(false);
      });
      it("animated tiles really change between frames", () => {
        for (const name of ANIMATED[def.id]) {
          const frames = def.anims[name];
          expect(frames.length, name).toBeGreaterThanOrEqual(2);
          expect(new Set(frames.map((f) => f.join(""))).size, name).toBe(frames.length);
        }
      });
      it("keeps a limited palette", () => {
        expect(Object.keys(def.palette).length).toBeLessThanOrEqual(48);
      });
    });
  }
  it("Python Port tiles that repeat across the map are seamless-looking (edges differ little)", () => {
    for (const name of ["grass", "path", "water"]) {
      const f = PYTHON_PORT_TILES.anims[name][0];
      const left = f.map((r) => r[0]);
      const right = f.map((r) => r[TILE - 1]);
      const same = left.filter((c, i) => c === right[i]).length;
      expect(same, name).toBeGreaterThanOrEqual(4);
    }
  });
});

describe("tile maps", () => {
  it("the Python Port and Lab preview maps only use known tiles and are rectangular", () => {
    expect(validateMap(PYTHON_PORT_TILES, PORT_GRID, PORT_LEGEND)).toEqual([]);
    expect(validateMap(LAB_TILES, LAB_GRID, LAB_LEGEND)).toEqual([]);
  });
  it("validateMap reports unknown codes, unknown tiles and ragged rows", () => {
    const errs = validateMap(LAB_TILES, ["fz", "f"], { f: "floor", z: "nope" });
    expect(errs.some((e) => e.includes('"nope"'))).toBe(true);
    expect(errs.some((e) => e.includes("1 cols"))).toBe(true);
    expect(validateMap(LAB_TILES, ["q"], { f: "floor" })[0]).toContain('"q"');
  });
  it("composeMap lays tiles out on the 16px grid and animates with t", () => {
    const f0 = composeMap(PYTHON_PORT_TILES, ["wp"], { w: "water", p: "path" }, 0);
    expect(f0).toHaveLength(TILE);
    expect(f0[0]).toHaveLength(2 * TILE);
    expect(f0.map((r) => r.slice(TILE)).join("")).toBe(PYTHON_PORT_TILES.anims.path[0].join(""));
    expect(f0.map((r) => r.slice(0, TILE)).join("")).toBe(PYTHON_PORT_TILES.anims.water[0].join(""));
    const f1 = composeMap(PYTHON_PORT_TILES, ["wp"], { w: "water", p: "path" }, 1);
    expect(f1.join("")).not.toBe(f0.join(""));
    expect(f1.map((r) => r.slice(TILE)).join("")).toBe(PYTHON_PORT_TILES.anims.path[0].join(""));
  });
});
