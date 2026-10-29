import { describe, expect, it } from "vitest";
import { advance, choose, currentLine, sliceChars, startDialogue, validateScript, visibleChars, visibleChoices } from "@/lib/dialogue/dialogue";
import { LAB, MAPS, PYTHON_PORT } from "@/lib/world/maps";
import { SCRIPTS } from "@/lib/world/scripts";
import { camera, canStand, createWorld, faceNpcToPlayer, interact, npcFacing, playerPos, STEP_SECONDS, tileName, update, type Dir } from "@/lib/world/world";
import { validateMap } from "@/game/sprites/tilemap";
import { PYTHON_PORT_TILES } from "@/game/sprites/tiles/python-port-tiles";
import { LAB_TILES } from "@/game/sprites/tiles/lab-tiles";

const TILESETS = { "python-port-tiles": PYTHON_PORT_TILES, "lab-tiles": LAB_TILES };

describe("world data", () => {
  for (const m of Object.values(MAPS)) {
    it(`${m.id}: map is valid, solid names exist, spawn and warp targets are standable`, () => {
      expect(validateMap(TILESETS[m.tileset as keyof typeof TILESETS], m.grid, m.legend)).toEqual([]);
      const names = new Set(Object.values(m.legend));
      for (const s of m.solid) expect(names.has(s), `solid tile ${s}`).toBe(true);
      expect(canStand(m, m.spawn.x, m.spawn.y)).toBe(true);
      for (const w of m.warps) {
        expect(m.solid.has(tileName(m, w.x, w.y)!)).toBe(false);
        const dest = MAPS[w.to];
        expect(dest).toBeDefined();
        expect(canStand(dest, w.toX, w.toY), `${m.id} → ${w.to} landing`).toBe(true);
      }
      for (const n of m.npcs) {
        expect(m.solid.has(tileName(m, n.x, n.y)!)).toBe(false);
        expect(SCRIPTS[n.script]).toBeDefined();
      }
      for (const p of m.props) expect(SCRIPTS[p.script]).toBeDefined();
    });
  }
  it("every dialogue script is structurally valid", () => {
    for (const s of Object.values(SCRIPTS)) expect(validateScript(s)).toEqual([]);
  });
  it("the player can reach the Lab door from the spawn point (flood fill)", () => {
    const m = PYTHON_PORT;
    const seen = new Set<string>();
    const q: [number, number][] = [[m.spawn.x, m.spawn.y]];
    while (q.length) {
      const [x, y] = q.pop()!;
      if (seen.has(`${x},${y}`) || !canStand(m, x, y)) continue;
      seen.add(`${x},${y}`);
      q.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
    }
    const door = m.warps[0];
    expect(seen.has(`${door.x},${door.y + 1}`)).toBe(true);
  });
});

const walk = (w: ReturnType<typeof createWorld>, dir: Dir | null, seconds: number) => {
  let world = w;
  for (let t = 0; t < seconds; t += 1 / 60) world = update(world, 1 / 60, dir, MAPS).world;
  return world;
};

describe("movement", () => {
  it("a held key takes one step per STEP_SECONDS", () => {
    const w0 = createWorld(PYTHON_PORT, { x: 10, y: 5, face: "down" });
    const w1 = walk(w0, "down", STEP_SECONDS * 2 + 0.1);
    expect(w1.player.x).toBe(10);
    expect(w1.steps).toBe(2);
    expect(w1.player.y).toBeGreaterThanOrEqual(7);
  });
  it("walls only turn the player", () => {
    const w0 = createWorld(PYTHON_PORT, { x: 3, y: 4, face: "down" });
    const w1 = walk(w0, "left", 1); // (0,4) is a fence
    expect(canStand(PYTHON_PORT, 2, 4)).toBe(false);
    expect(w1.player).toMatchObject({ x: 3, face: "left", step: null });
  });
  it("cannot walk into water, an NPC or a prop", () => {
    const m = PYTHON_PORT;
    expect(canStand(m, 3, 10)).toBe(false);
    expect(canStand(m, m.npcs[0].x, m.npcs[0].y)).toBe(false);
    expect(canStand(m, m.props[0].x, m.props[0].y)).toBe(false);
    expect(canStand(m, -1, 0)).toBe(false);
  });
  it("mid-step position interpolates and a step is atomic", () => {
    const w0 = createWorld(PYTHON_PORT, { x: 10, y: 5, face: "down" });
    const w1 = update(w0, STEP_SECONDS / 2, "right", MAPS).world;
    const [px] = playerPos(w1.player);
    expect(px).toBeGreaterThan(10);
    expect(px).toBeLessThan(11);
    const w2 = update(w1, STEP_SECONDS, null, MAPS).world;
    expect(w2.player.x).toBe(11);
    expect(w2.player.step).toBeNull();
  });
  it("big dt does not skip collision", () => {
    const w0 = createWorld(PYTHON_PORT, { x: 10, y: 8, face: "down" });
    const w1 = update(w0, 5, "down", MAPS).world;
    expect(canStand(PYTHON_PORT, w1.player.x, w1.player.y)).toBe(true);
    expect(w1.player.y).toBeLessThanOrEqual(10);
  });
  it("walking into the door warps to the Lab and back out again", () => {
    let w = createWorld(PYTHON_PORT, { x: 8, y: 4, face: "up" });
    const r = update(w, STEP_SECONDS + 0.01, "up", MAPS);
    expect(r.warped).toBe(true);
    expect(r.world.map.id).toBe("lab");
    expect(r.world.player).toMatchObject({ x: 8, y: 9, face: "up" });
    w = walk(r.world, "down", STEP_SECONDS * 2);
    expect(w.map.id).toBe("python-port");
    expect(w.player).toMatchObject({ x: 8, y: 4, face: "down" });
  });
});

describe("interaction", () => {
  it("talks to the NPC in front, and the NPC turns to face the player", () => {
    let w = createWorld(LAB, { x: 10, y: 7, face: "right" });
    const hit = interact(w);
    expect(hit).toMatchObject({ kind: "npc", script: "okafor-intro" });
    w = faceNpcToPlayer(w, "okafor");
    expect(npcFacing(w, LAB.npcs[0])).toBe("left");
  });
  it("reads a prop in front, and nothing when facing empty floor or mid-step", () => {
    const w = createWorld(LAB, { x: 8, y: 7, face: "up" });
    expect(interact(w)).toMatchObject({ kind: "prop", script: "training-rig" });
    expect(interact(createWorld(LAB, { x: 8, y: 9, face: "down" }))).toBeNull();
    expect(interact({ ...w, player: { ...w.player, step: { dir: "up", t: 0.3 } } })).toBeNull();
  });
});

describe("camera", () => {
  it("clamps to the map and centres small maps", () => {
    expect(camera(PYTHON_PORT, [0, 0], 10, 8)).toEqual([0, 0]);
    expect(camera(PYTHON_PORT, [19, 11], 10, 8)).toEqual([10, 4]);
    expect(camera(PYTHON_PORT, [10, 6], 30, 8)[0]).toBe(-5);
  });
});

describe("dialogue", () => {
  it("branches on flags: first visit introduces, second visit is short", () => {
    let s = startDialogue(SCRIPTS["okafor-intro"]);
    expect(currentLine(s).text).toMatch(/you made it/);
    expect(s.flags.metOkafor).toBe(true);
    s = advance(s);
    expect(visibleChoices(s)).toHaveLength(3);
    expect(advance(s)).toBe(s); // choices need choose()
    s = choose(s, 0);
    expect(s.flags.briefed).toBe(true);
    s = advance(s);
    expect(s.done).toBe(true);
    const again = advance(startDialogue(SCRIPTS["okafor-intro"], s.flags));
    expect(currentLine(again).text).toMatch(/Back already/);
  });
  it("choice conditions hide options and invalid indexes are ignored", () => {
    const script = {
      id: "t", start: "a",
      lines: { a: { text: "x", choices: [{ label: "A", next: null }, { label: "B", next: null, if: { flag: "key" } }] } },
    };
    expect(visibleChoices(startDialogue(script))).toHaveLength(1);
    expect(visibleChoices(startDialogue(script, { key: true }))).toHaveLength(2);
    const s = startDialogue(script);
    expect(choose(s, 5)).toBe(s);
  });
  it("validateScript catches dangling and unreachable lines", () => {
    const bad = { id: "b", start: "a", lines: { a: { text: "x", next: "zzz" }, orphan: { text: "y" } } };
    const errs = validateScript(bad);
    expect(errs.some((e) => e.includes("zzz"))).toBe(true);
    expect(errs.some((e) => e.includes("unreachable"))).toBe(true);
  });
  it("typewriter reveals by code point at the given rate", () => {
    expect(visibleChars("hello", 0)).toBe(0);
    expect(visibleChars("hello", 100, 20)).toBe(2);
    expect(visibleChars("hello", 10_000)).toBe(5);
    expect(sliceChars("a😀b", 2)).toBe("a😀");
  });
});
