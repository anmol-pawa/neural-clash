import { describe, expect, it } from "vitest";
import { NEURAL_LAB } from "@/game/maps/lab";
import { PORT_SQUARE } from "@/game/maps/port-square";
import { renderMap } from "@/game/maps/render";
import { collisionGrid, reachable, validateMap } from "@/game/maps/types";
import { PYTHON_PORT_TILES as SET } from "@/game/sprites/tiles/python-port";
import { tileFrameAt, validateTileSet } from "@/game/sprites/tileset";

describe("python-port tileset", () => {
  it("is valid", () => expect(validateTileSet(SET)).toEqual([]));
  it("has the tiles both maps need, including animated water, racks and fans", () => {
    for (const n of ["water", "shore", "server-rack", "gpu-rig", "desk", "lamp", "boat"]) expect(SET.tiles[n].frames.length, n).toBeGreaterThan(1);
    expect(Object.keys(SET.tiles).length).toBeGreaterThanOrEqual(50);
  });
  it("animated tiles really change between frames", () => {
    for (const [n, t] of Object.entries(SET.tiles)) if (t.frames.length > 1) expect(new Set(t.frames.map((f) => f.join(""))).size, n).toBe(t.frames.length);
  });
  it("ground tiles are opaque and objects are outlined", () => {
    for (const n of ["grass", "cobble", "water", "floor-lab", "rug", "wall-lab", "roof"]) expect(SET.tiles[n].frames[0].join("").includes("."), n).toBe(false);
    for (const n of ["tree", "crate", "desk", "server-rack", "whiteboard", "bookshelf"]) expect(SET.tiles[n].frames[0].join("").includes("k"), n).toBe(true);
  });
  it("tileFrameAt cycles with time", () => {
    const w = SET.tiles.water;
    expect(new Set([0, 400, 800, 1200].map((t) => tileFrameAt(w, t))).size).toBeGreaterThan(1);
    expect(tileFrameAt(SET.tiles.grass, 99999)).toBe(0);
  });
});

describe("maps", () => {
  for (const m of [NEURAL_LAB, PORT_SQUARE]) {
    it(`${m.id} is valid and renders at 16px per cell`, () => {
      expect(validateMap(m, SET)).toEqual([]);
      const img = renderMap(m, SET);
      expect([img.w, img.h]).toEqual([m.ground[0].length * 16, m.ground.length * 16]);
      expect(img.data.every((_, i) => i % 4 !== 3 || img.data[i] === 255)).toBe(true);
    });
  }
  it("lab: player, Okafor, the pup and the exit are all reachable from each other", () => {
    const g = collisionGrid(NEURAL_LAB, SET);
    const s = NEURAL_LAB.spawns;
    for (const k of ["okafor", "pup", "exit"]) expect(reachable(g, s.player, s[k]), k).toBe(true);
  });
  it("lab: furniture blocks walking but the walls and desks are solid", () => {
    const g = collisionGrid(NEURAL_LAB, SET);
    expect(g[0][0]).toBe(true);
    expect(g[4][2] && g[4][3]).toBe(true);
    expect(g[12][9]).toBe(false);
  });
  it("port square: the player can reach Okafor and the lab door", () => {
    const g = collisionGrid(PORT_SQUARE, SET);
    const s = PORT_SQUARE.spawns;
    expect(reachable(g, s.player, s.okafor)).toBe(true);
    expect(reachable(g, s.player, { x: 15, y: 9 })).toBe(true);
  });
  it("validateMap catches unknown tiles and out-of-bounds objects", () => {
    const bad = { ...NEURAL_LAB, objects: [{ tile: "nope", x: 0, y: 0 }, { tile: "whiteboard", x: 19, y: 0 }] };
    expect(validateMap(bad, SET).length).toBe(2);
  });
});
