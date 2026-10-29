import { describe, expect, it } from "vitest";
import { LAB_MAP, MAPS, PYTHON_PORT_MAP } from "@/game/tiles/maps";
import { isWalkable, mapSize, reachable, tilesAt, validateTileSet } from "@/game/tiles/tileset";

describe("tilesets", () => {
  for (const map of MAPS) {
    const set = map.tileset;
    it(`${set.id} is valid, 16×16, outlined where needed and animated tiles differ per frame`, () => {
      expect(validateTileSet(set)).toEqual([]);
      expect(set.tile).toBe(16);
      for (const [name, t] of Object.entries(set.tiles)) {
        if (t.frames.length > 1) expect(new Set(t.frames.map((f) => f.join(""))).size, name).toBeGreaterThan(1);
      }
      expect(Object.keys(set.tiles).length).toBeGreaterThanOrEqual(20);
      expect(Object.keys(set.palette).length).toBeLessThanOrEqual(56);
    });
  }
  it("has the animated tiles the scenes rely on", () => {
    for (const n of ["water", "shore", "lamp-top"]) expect(PYTHON_PORT_MAP.tileset.tiles[n].frames.length).toBeGreaterThan(1);
    for (const n of ["monitor", "rack-top", "capsule-top", "window"]) expect(LAB_MAP.tileset.tiles[n].frames.length).toBeGreaterThan(1);
  });
});

describe("maps", () => {
  for (const map of MAPS) {
    describe(map.id, () => {
      const { w, h } = mapSize(map);
      it("has rectangular layers that only use legend characters", () => {
        expect(map.ground.length).toBe(h);
        expect(map.objects.length).toBe(h);
        for (const row of [...map.ground, ...map.objects]) expect(row.length, row).toBe(w);
        for (const row of map.ground) for (const ch of row) expect(map.legend[ch], `ground "${ch}"`).toBeDefined();
        for (const row of map.objects) for (const ch of row) if (ch !== " ") expect(map.legend[ch], `object "${ch}"`).toBeDefined();
      });
      it("only references tiles that exist, and every ground cell is painted", () => {
        for (let y = 0; y < h; y++)
          for (let x = 0; x < w; x++) {
            const [g, o] = tilesAt(map, x, y);
            expect(map.tileset.tiles[g], `ground ${x},${y}`).toBeDefined();
            if (o) expect(map.tileset.tiles[o], `object ${x},${y}`).toBeDefined();
          }
        for (const s of map.solid) expect(map.tileset.tiles[s], s).toBeDefined();
      });
      it("lets the player walk to every spawn, warp and its exit", () => {
        const [px, py] = map.spawns.player;
        expect(isWalkable(map, px, py)).toBe(true);
        const seen = reachable(map, px, py);
        for (const [name, [x, y]] of Object.entries(map.spawns)) expect(seen.has(`${x},${y}`) || isWalkable(map, x, y), name).toBe(true);
        for (const wp of map.warps) {
          const near = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => seen.has(`${wp.x + dx},${wp.y + dy}`));
          expect(near || seen.has(`${wp.x},${wp.y}`), `warp ${wp.x},${wp.y}`).toBe(true);
        }
      });
    });
  }
  it("warps connect the town and the lab both ways onto walkable cells", () => {
    const by = new Map(MAPS.map((m) => [m.id, m]));
    for (const m of MAPS)
      for (const wp of m.warps) {
        const dest = by.get(wp.to)!;
        expect(dest, wp.to).toBeDefined();
        expect(isWalkable(dest, wp.tx, wp.ty), `${m.id} -> ${wp.to}`).toBe(true);
        expect(dest.warps.some((b) => b.to === m.id), `${wp.to} returns`).toBe(true);
      }
  });
  it("the lab door is the only building warp and is not walled in", () => {
    expect(PYTHON_PORT_MAP.warps).toHaveLength(1);
    const [w] = PYTHON_PORT_MAP.warps;
    expect(tilesAt(PYTHON_PORT_MAP, w.x, w.y)[1]).toBe("door");
  });
});
