import { describe, expect, it } from "vitest";
import { MAPS, MAP_IDS, TILESET } from "@/game/tiles";
import { isWalkable, mapSize, reachable, tileAt, validateMap, validateTileSet } from "@/game/tiles/tiles";

describe("tileset", () => {
  it("is valid", () => expect(validateTileSet(TILESET)).toEqual([]));
  it("has 16×16 tiles with a distinct look (no two tiles share frame 0)", () => {
    const seen = new Map<string, string>();
    for (const [name, t] of Object.entries(TILESET.tiles)) {
      const key = t.frames[0].join("|");
      expect(seen.get(key), `${name} duplicates ${seen.get(key)}`).toBeUndefined();
      seen.set(key, name);
    }
  });
  it("animates water, lamps, windows, monitors and servers with frames that differ", () => {
    for (const n of ["water", "lamp-top", "window", "monitor", "server"]) {
      const t = TILESET.tiles[n];
      expect(t.frames.length, n).toBeGreaterThan(1);
      expect(new Set(t.frames.map((f) => f.join("|"))).size, n).toBe(t.frames.length);
    }
    expect(TILESET.tiles.water.frames.length).toBe(4);
  });
  it("makes water, walls, trees and furniture solid but paths and doors walkable", () => {
    for (const n of ["water", "wall", "tree-trunk", "desk-l", "server", "quay"]) expect(TILESET.tiles[n].solid, n).toBe(true);
    for (const n of ["cobble", "grass", "plank", "door", "floor-wood", "rug", "doormat", "exit-door"]) expect(TILESET.tiles[n].solid, n).toBe(false);
  });
});

describe("maps", () => {
  for (const id of MAP_IDS) {
    const m = MAPS[id];
    describe(id, () => {
      it("is valid", () => expect(validateMap(m, TILESET, MAP_IDS)).toEqual([]));
      it("lets the player reach every warp from the spawn", () => {
        const r = reachable(m, TILESET, m.spawn);
        for (const w of m.warps) expect(r.has(`${w.at[0]},${w.at[1]}`), `warp ${w.at}`).toBe(true);
      });
      it("lets the player reach every NPC's neighbourhood", () => {
        const r = reachable(m, TILESET, m.spawn);
        for (const n of m.npcs) {
          const near = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => r.has(`${n.at[0] + dx},${n.at[1] + dy}`));
          expect(near, n.id).toBe(true);
        }
      });
      it("round-trips through warps: each warp target is walkable and warps back", () => {
        for (const w of m.warps) {
          const dest = MAPS[w.to.map];
          expect(isWalkable(dest, TILESET, w.to.at[0], w.to.at[1]), `${w.to.map} ${w.to.at}`).toBe(true);
          expect(dest.warps.some((b) => b.to.map === id), "return warp").toBe(true);
        }
      });
    });
  }
  it("Python Port has sea on the south edge and the Lab door as the only warp", () => {
    const m = MAPS["python-port"];
    const { w, h } = mapSize(m);
    expect(tileAt(m, "ground", 5, h - 1)).toBe("water");
    expect(m.warps).toHaveLength(1);
    expect(tileAt(m, "objects", m.warps[0].at[0], m.warps[0].at[1])).toBe("door");
    expect(w).toBe(28);
  });
  it("the water and the Lab walls block movement", () => {
    expect(isWalkable(MAPS["python-port"], TILESET, 5, 18)).toBe(false);
    expect(isWalkable(MAPS.lab, TILESET, 0, 5)).toBe(false);
    expect(isWalkable(MAPS.lab, TILESET, 6, 3)).toBe(false); // Okafor stands there
  });
});
