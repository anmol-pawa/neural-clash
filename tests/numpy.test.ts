import { describe, it, expect } from "vitest";
import { execFileSync, spawnSync } from "node:child_process";
import { loadDeck } from "@/lib/cards/loader";
import { NUMPY_DECK } from "@/lib/cards/samples";
import { broadcast, matmul } from "@/lib/solvers/shapes";
import deckJson from "../content/decks/numpy.json";

const py = ["python3", "/usr/bin/python3"].find((b) => spawnSync(b, ["-I", "-c", "import numpy"]).status === 0) ?? "python3";

describe("numpy deck", () => {
  it("loads cleanly with 25+ unique cards on several topics", () => {
    expect(NUMPY_DECK.errors).toEqual([]);
    expect(NUMPY_DECK.cards.length).toBeGreaterThanOrEqual(25);
    expect(new Set(NUMPY_DECK.cards.map((c) => c.id)).size).toBe(NUMPY_DECK.cards.length);
    expect(new Set(NUMPY_DECK.cards.map((c) => c.topic)).size).toBe(5);
    expect(loadDeck(deckJson).errors).toEqual([]);
  });

  it("every predict answer is the real stdout of its snippet under numpy", () => {
    const predicts = NUMPY_DECK.cards.filter((c) => c.kind === "mcq" && c.variant === "predict");
    expect(predicts.length).toBeGreaterThanOrEqual(12);
    for (const c of predicts) {
      if (c.kind !== "mcq" || !c.code) throw new Error("unreachable");
      const out = execFileSync(py, ["-I", "-c", `import numpy as np\n${c.code.join("\n")}`], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
      expect(c.choices[c.answer], c.id).toBe(out);
      expect(c.choices.filter((x) => x === out), c.id).toHaveLength(1);
    }
  }, 60_000);

  it("shape-card answers agree with the TypeScript solvers", () => {
    const byId = new Map(NUMPY_DECK.cards.map((c) => [c.id, c]));
    const expectShape = (id: string, res: ReturnType<typeof broadcast>) => {
      const c = byId.get(id);
      if (!c || c.kind !== "shape") throw new Error(`missing shape card ${id}`);
      expect(c.answer, id).toEqual(res.ok ? res.shape : null);
    };
    expectShape("np-shape-bcast-4d", broadcast([8, 1, 6, 1], [7, 1, 5]));
    expectShape("np-shape-bcast-row", broadcast([3, 4], [4]));
    expectShape("np-shape-bcast-fail", broadcast([3, 4], [3]));
    expectShape("np-shape-bcast-col", broadcast([5, 1], [1, 5]));
    expectShape("np-shape-matvec", matmul([10, 3], [3]));
    expectShape("np-shape-matmul-fail", matmul([2, 3], [2, 3]));
    expect(NUMPY_DECK.cards.filter((c) => c.kind === "shape").length).toBeGreaterThanOrEqual(8);
  });

  it("answer positions are spread and the generated JSON is not stale", () => {
    const idx = NUMPY_DECK.cards.filter((c) => c.kind === "mcq").map((c) => (c as { answer: number }).answer);
    expect(new Set(idx).size).toBe(4);
    const r = spawnSync("node", ["scripts/gen-numpy.mjs", "--check"], { encoding: "utf8" });
    expect(r.stderr).toBe("");
    expect(r.status).toBe(0);
  }, 60_000);
});
