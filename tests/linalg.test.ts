import { describe, it, expect } from "vitest";
import { execFileSync, spawnSync } from "node:child_process";
import { loadDeck } from "@/lib/cards/loader";
import { LINALG_DECK } from "@/lib/cards/samples";
import { broadcast, matmul } from "@/lib/solvers/shapes";
import { cosine, dot, eigSym2, norm, pca2, project, singular2 } from "@/lib/solvers/linalg";
import deckJson from "../content/decks/linalg.json";

const py = ["python3", "/usr/bin/python3"].find((b) => spawnSync(b, ["-I", "-c", "import numpy"]).status === 0) ?? "python3";
const byId = new Map(LINALG_DECK.cards.map((c) => [c.id, c]));
const derive = (id: string) => {
  const c = byId.get(id);
  if (!c || c.kind !== "derive") throw new Error(`missing derive card ${id}`);
  return c.answers;
};

describe("Vector Vale deck", () => {
  it("loads cleanly: 40+ unique cards across five topics and every card kind used", () => {
    expect(LINALG_DECK.errors).toEqual([]);
    expect(LINALG_DECK.cards.length).toBeGreaterThanOrEqual(40);
    expect(new Set(LINALG_DECK.cards.map((c) => c.id)).size).toBe(LINALG_DECK.cards.length);
    expect(new Set(LINALG_DECK.cards.map((c) => c.topic)).size).toBe(5);
    expect(new Set(LINALG_DECK.cards.map((c) => c.kind))).toEqual(new Set(["mcq", "shape", "derive", "multi", "bug"]));
    expect(loadDeck(deckJson).errors).toEqual([]);
  });

  it("every predict answer is the real stdout of its snippet under numpy, with one matching choice", () => {
    const predicts = LINALG_DECK.cards.filter((c) => c.kind === "mcq" && c.variant === "predict");
    expect(predicts.length).toBeGreaterThanOrEqual(15);
    for (const c of predicts) {
      if (c.kind !== "mcq" || !c.code) throw new Error("unreachable");
      const out = execFileSync(py, ["-I", "-c", `import numpy as np\n${c.code.join("\n")}`], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
      expect(c.choices[c.answer], c.id).toBe(out);
      expect(c.choices.filter((x) => x === out), c.id).toHaveLength(1);
    }
  }, 60_000);

  it("shape answers agree with the TypeScript shape solvers", () => {
    const shape = (id: string) => { const c = byId.get(id); if (!c || c.kind !== "shape") throw new Error(id); return c.answer; };
    const ok = (r: ReturnType<typeof matmul>) => (r.ok ? r.shape : null);
    expect(shape("la-shape-layer")).toEqual(ok(matmul([100, 5], [5, 3])));
    expect(shape("la-shape-gram")).toEqual(ok(matmul([6, 2], [2, 6])));
    expect(shape("la-shape-cov")).toEqual(ok(matmul([4, 50], [50, 4])));
    expect(shape("la-shape-batch")).toEqual(ok(matmul([8, 10, 4], [4, 6])));
    expect(shape("la-shape-matmul-fail")).toEqual(ok(matmul([4, 3], [4, 3])));
    expect(shape("la-shape-matvec-fail")).toEqual(ok(matmul([3, 4], [3])));
    expect(shape("la-shape-outer")).toEqual([3, 5]);
    expect(broadcast([3, 1], [1, 5])).toBeTruthy();
  });

  it("derive answers (numpy) match independent TypeScript solvers", () => {
    const [d, n, c] = derive("la-derive-cos");
    expect(d).toBeCloseTo(dot([1, 2, 2], [2, 0, 1]), 5);
    expect(n).toBeCloseTo(norm([1, 2, 2]), 5);
    expect(c).toBeCloseTo(cosine([1, 2, 2], [2, 0, 1]), 5);
    const p = project([3, 4], [1, 1]);
    expect(derive("la-derive-proj")).toEqual([expect.closeTo(p.c, 5), expect.closeTo(norm(p.residual), 5)]);
    expect(derive("la-derive-eig")).toEqual(eigSym2(4, 1, 4).map((x) => expect.closeTo(x, 5)));
    const s = singular2([[3, 0], [0, -4]]);
    expect(derive("la-derive-lowrank")).toEqual([expect.closeTo(s[0], 5), expect.closeTo(s[1], 5), expect.closeTo(s[1], 5)]);
    const pca = pca2([[2, 1], [-2, -1], [1, 2], [-1, -2]]);
    expect(derive("la-derive-pca")).toEqual([expect.closeTo(pca.eigenvalues[0], 5), expect.closeTo(pca.eigenvalues[1], 5), expect.closeTo(pca.share, 5)]);
  });

  it("the buggy snippets really misbehave and the generated JSON is not stale", () => {
    for (const id of ["la-bug-cosine", "la-bug-center"]) expect(byId.get(id)?.kind).toBe("bug");
    const r = spawnSync("node", ["scripts/gen-linalg.mjs", "--check"], { encoding: "utf8" });
    expect(r.stderr).toBe("");
    expect(r.status).toBe(0);
    const idx = LINALG_DECK.cards.filter((c) => c.kind === "mcq").map((c) => (c as { answer: number }).answer);
    expect(new Set(idx).size).toBe(4);
  }, 60_000);
});

describe("linalg solvers", () => {
  it("sanity", () => {
    expect(norm([3, 4])).toBe(5);
    expect(cosine([1, 2], [-2, 1])).toBeCloseTo(0, 12);
    expect(singular2([[1, 2], [3, 4]])[0]).toBeCloseTo(5.4649857, 6);
  });
});
