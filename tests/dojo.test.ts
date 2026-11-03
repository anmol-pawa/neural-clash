import { describe, expect, it } from "vitest";
import { dojoProblem, dojoProblems, ladder, toTask } from "@/lib/dojo/catalog";
import { MAX_HEARTS, grade, initial, step, type Action, type DojoState } from "@/lib/dojo/dojo";

const run = (actions: Action[], s: DojoState = initial()) => actions.reduce(step, s);
const toCode: Action[] = [{ type: "scouted" }, { type: "plan", correct: true }];

describe("dojo state machine", () => {
  it("walks scout → strategise → code → debrief on a clean pass", () => {
    const s = run([...toCode, { type: "submit", verdict: "AC" }]);
    expect(s.phase).toBe("debrief");
    expect(s.hearts).toBe(MAX_HEARTS);
    expect(grade(s)).toBe("clean");
  });

  it("a wrong plan stays in Strategise and downgrades a clean pass to good", () => {
    let s = run([{ type: "scouted" }, { type: "plan", correct: false }]);
    expect(s.phase).toBe("strategise");
    s = run([{ type: "plan", correct: true }, { type: "submit", verdict: "AC" }], s);
    expect(grade(s)).toBe("good");
  });

  it("compile errors are free; wrong verdicts cost a heart; zero hearts ends the battle", () => {
    let s = run([...toCode, { type: "submit", verdict: "CE" }]);
    expect(s.hearts).toBe(MAX_HEARTS);
    s = run([{ type: "submit", verdict: "WA" }, { type: "submit", verdict: "TLE" }, { type: "submit", verdict: "RE" }], s);
    expect(s.hearts).toBe(0);
    expect(s.phase).toBe("debrief");
    expect(grade(s)).toBe("unsolved");
    expect(step(s, { type: "submit", verdict: "AC" }).solved).toBe(false);
  });

  it("a hint marks the pass assisted; a retry after defeat is assisted too", () => {
    expect(grade(run([...toCode, { type: "hint" }, { type: "submit", verdict: "AC" }]))).toBe("assisted");
    const lost = run([...toCode, ...Array(3).fill({ type: "submit", verdict: "WA" })]);
    const again = run([{ type: "retry" }, { type: "submit", verdict: "AC" }], lost);
    expect(grade(again)).toBe("assisted");
  });

  it("ignores actions in the wrong phase", () => {
    expect(step(initial(), { type: "submit", verdict: "AC" })).toEqual(initial());
    expect(step(initial(), { type: "hint" })).toEqual(initial());
    expect(step(initial(), { type: "retry" })).toEqual(initial());
  });
});

describe("dojo catalog", () => {
  it("bundles Hot Tokens with a consistent strategy question and sample test", () => {
    const p = dojoProblem("top-k-tokens");
    expect(p).toBeDefined();
    expect(p!.hints).toHaveLength(3);
    expect(p!.strategy.answer).toBeLessThan(p!.strategy.options.length);
    expect(p!.sample[0].expected).toBe("5 9");
    expect(p!.hidden.some((h) => h.name.startsWith("perf"))).toBe(true);
    expect(toTask(p!).hidden.length).toBe(p!.hidden.length);
    expect(dojoProblems().length).toBeGreaterThan(0);
  });

  it("every bundled problem is a consistent package with the documented samples", () => {
    const ids = dojoProblems().map((p) => p.id);
    expect(ids).toEqual(expect.arrayContaining(["top-k-tokens", "context-window", "batch-packer", "pipeline-order", "peak-window"]));
    for (const p of dojoProblems()) {
      expect(p.hints).toHaveLength(3);
      expect(p.strategy.answer).toBeLessThan(p.strategy.options.length);
      expect(p.sample.length).toBeGreaterThan(0);
      expect(p.hidden.some((h) => h.name.startsWith("perf"))).toBe(true);
    }
    expect(dojoProblem("context-window")!.sample[0].expected).toBe("4");
    expect(dojoProblem("batch-packer")!.sample[0].expected).toBe("18");
  });

  it("the samples of the new packages come from the native reference", () => {
    expect(dojoProblem("pipeline-order")!.sample[0].expected).toBe("2 3 4 1");
    expect(dojoProblem("peak-window")!.sample[0].expected).toBe("3 3 5 5 6 7");
    // cycle and self-loop edge cases print -1
    expect(dojoProblem("pipeline-order")!.hidden.filter((h) => h.expected === "-1").length).toBeGreaterThanOrEqual(2);
  });

  it("the ladder lists easier problems first, then by title", () => {
    const ranks = { E: 0, M: 1, H: 2 } as const;
    const list = dojoProblems();
    for (let i = 1; i < list.length; i++) {
      const a = list[i - 1];
      const b = list[i];
      expect(ranks[a.difficulty]).toBeLessThanOrEqual(ranks[b.difficulty]);
      if (a.difficulty === b.difficulty) expect(a.title.localeCompare(b.title)).toBeLessThan(0);
    }
    expect(list[list.length - 1].difficulty).toBe("H");
    const shuffled = [...list].reverse();
    expect(ladder(shuffled).map((p) => p.id)).toEqual(list.map((p) => p.id));
  });
});
