import { describe, expect, it } from "vitest";
import { DialogueRunner, validateScript, type DialogueScript, type Flags } from "@/lib/dialogue/engine";
import { isWalkable, pendingTrigger, targetInFront, validateArea } from "@/lib/world/area";
import { Mover, STEP_MS } from "@/lib/world/mover";
import { AREAS, LAB, PYTHON_PORT } from "@/game/world/areas";
import { SCRIPTS } from "@/game/world/scripts";
import { spriteById } from "@/game/sprites/roster";

const choiceScript: DialogueScript = {
  start: "a",
  nodes: {
    a: { kind: "say", text: "Hello there", next: "pick" },
    pick: { kind: "choice", options: [{ label: "yes", next: "setY" }, { label: "secret", next: "setY", requires: "key" }, { label: "no", next: "end" }] },
    setY: { kind: "set", flag: "said", value: 7, next: "fx" },
    fx: { kind: "do", effect: "ding", next: "end" },
    end: { kind: "say", text: "Bye" },
  },
};

describe("dialogue runner", () => {
  it("types out, finishes on confirm, then advances", () => {
    const r = new DialogueRunner(choiceScript, {}, 10);
    expect(r.view()).toMatchObject({ kind: "say", shown: "", done: false, mood: "talk" });
    r.tick(500);
    expect(r.view()).toMatchObject({ shown: "Hello", done: false });
    r.advance();
    expect(r.view()).toMatchObject({ shown: "Hello there", done: true, mood: "idle" });
    r.advance();
    expect(r.view().kind).toBe("choice");
  });
  it("hides options whose flag is unset and numbers the visible ones", () => {
    const r = new DialogueRunner(choiceScript, {});
    r.advance();
    r.advance();
    expect(r.view()).toEqual({ kind: "choice", options: [{ label: "yes", index: 0 }, { label: "no", index: 1 }] });
    const unlocked = new DialogueRunner(choiceScript, { key: true });
    unlocked.advance();
    unlocked.advance();
    expect(unlocked.view()).toMatchObject({ options: [{ label: "yes" }, { label: "secret" }, { label: "no" }] });
  });
  it("runs set and do nodes silently and records effects", () => {
    const flags: Flags = {};
    const r = new DialogueRunner(choiceScript, flags);
    r.advance();
    r.advance();
    r.choose(0);
    expect(flags.said).toBe(7);
    expect(r.effects).toEqual(["ding"]);
    expect(r.view()).toMatchObject({ kind: "say", speaker: undefined });
    r.advance();
    r.advance();
    expect(r.finished).toBe(true);
    expect(r.view().kind).toBe("end");
  });
  it("ignores confirm on a choice and out-of-range choices", () => {
    const r = new DialogueRunner(choiceScript, {});
    r.advance();
    r.advance();
    r.advance();
    r.choose(9);
    expect(r.view().kind).toBe("choice");
  });
  it("branches on flags and survives a cycle of silent nodes", () => {
    const s: DialogueScript = { start: "b", nodes: { b: { kind: "branch", flag: "f", then: "x", otherwise: "y" }, x: { kind: "say", text: "X" }, y: { kind: "say", text: "Y" } } };
    expect(new DialogueRunner(s, { f: true }).view()).toMatchObject({ kind: "say" });
    const loop: DialogueScript = { start: "l", nodes: { l: { kind: "set", flag: "n", next: "l" } } };
    expect(new DialogueRunner(loop, {}).finished).toBe(true);
  });
  it("validates scripts", () => {
    expect(validateScript(choiceScript)).toEqual([]);
    expect(validateScript({ start: "zz", nodes: { a: { kind: "say", text: " ", next: "nope" } } }).length).toBe(3);
  });
  it("every shipped script is valid", () => {
    for (const [id, s] of Object.entries(SCRIPTS)) expect(validateScript(s), id).toEqual([]);
  });
});

describe("areas", () => {
  it("shipped areas validate against their tilesets and scripts", () => {
    for (const a of Object.values(AREAS)) {
      const tiles = spriteById(a.tiles)!;
      expect(tiles, a.id).toBeDefined();
      expect(validateArea(a, Object.keys(tiles.anims), Object.keys(SCRIPTS)), a.id).toEqual([]);
    }
  });
  it("warps lead to real walkable tiles in real areas", () => {
    for (const a of Object.values(AREAS))
      for (const w of a.warps) {
        const dest = AREAS[w.to];
        expect(dest, `${a.id} -> ${w.to}`).toBeDefined();
        expect(isWalkable(dest, w.tx, w.ty), `${a.id} -> ${w.to} (${w.tx},${w.ty})`).toBe(true);
      }
  });
  it("blocks water, walls, NPCs and the map edge", () => {
    expect(isWalkable(PYTHON_PORT, 0, 10)).toBe(false); // water
    expect(isWalkable(PYTHON_PORT, -1, 5)).toBe(false);
    expect(isWalkable(PYTHON_PORT, 11, 7)).toBe(true);
    expect(isWalkable(LAB, 9, 7)).toBe(false); // Okafor
    expect(isWalkable(LAB, 0, 0)).toBe(false); // wall
  });
  it("finds what is in front, and one-shot triggers", () => {
    expect(targetInFront(LAB, 8, 7, "up")).toEqual({ kind: "object", script: "sign.rig" });
    expect(targetInFront(LAB, 8, 7, "right")).toMatchObject({ kind: "npc" });
    expect(targetInFront(LAB, 8, 7, "left")).toBeUndefined();
    expect(pendingTrigger(LAB, 8, 8, {})?.script).toBe("okafor.intro");
    expect(pendingTrigger(LAB, 8, 8, { met_okafor: true })).toBeUndefined();
  });
  it("every reachable interact tile can be faced from a walkable tile", () => {
    for (const a of Object.values(AREAS))
      for (const i of a.interacts) {
        const around = [[0, -1], [0, 1], [-1, 0], [1, 0]].some(([dx, dy]) => isWalkable(a, i.x + dx, i.y + dy));
        expect(around, `${a.id} (${i.x},${i.y})`).toBe(true);
      }
  });
});

describe("mover", () => {
  it("slides one tile in STEP_MS and reports arrival", () => {
    const m = new Mover(11, 7, "down");
    expect(m.update(STEP_MS / 2, "up", PYTHON_PORT)).toEqual([]);
    expect(m.moving).toBe(true);
    expect(m.position().y).toBeCloseTo(6.5, 1);
    expect(m.update(STEP_MS / 2, null, PYTHON_PORT)).toEqual([{ kind: "arrived", x: 11, y: 6 }]);
    expect(m.moving).toBe(false);
    expect(m.facing).toBe("up");
  });
  it("chains steps while a direction is held, and carries leftover time", () => {
    const m = new Mover(11, 7, "down");
    m.update(STEP_MS * 2.5, "up", PYTHON_PORT);
    expect(m.y).toBe(4); // third tile, half slid
    expect(m.position().y).toBeCloseTo(4.5, 1);
    expect(m.distance).toBe(3);
  });
  it("turns and bumps against solid tiles without moving", () => {
    const m = new Mover(1, 6, "down");
    const ev = m.update(50, "up", PYTHON_PORT); // (1,5) is the sign
    expect(ev).toEqual([{ kind: "bump", x: 1, y: 5 }]);
    expect(m.facing).toBe("up");
    expect(m.moving).toBe(false);
  });
  it("stands still while locked, but finishes a step in progress", () => {
    const m = new Mover(11, 7, "down");
    expect(m.update(50, "up", PYTHON_PORT, true)).toEqual([]);
    expect(m.moving).toBe(false);
    m.update(50, "up", PYTHON_PORT);
    m.update(STEP_MS, "up", PYTHON_PORT, true);
    expect(m.moving).toBe(false);
    expect(m.y).toBe(6);
  });
  it("emits a warp on reaching a door", () => {
    const m = new Mover(8, 4, "up");
    const ev = m.update(STEP_MS, null, PYTHON_PORT);
    expect(ev).toEqual([]);
    m.update(1, "up", PYTHON_PORT);
    const ev2 = m.update(STEP_MS, null, PYTHON_PORT);
    expect(ev2.at(-1)).toEqual({ kind: "warp", to: "lab", tx: 8, ty: 9, facing: "up" });
  });
});
