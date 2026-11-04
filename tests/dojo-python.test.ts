import { mkdtempSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { findPython, runPythonTests } from "../scripts/content-verify.mjs";
import { dojoProblems, hasPython, toPythonTask } from "@/lib/dojo/catalog";
import { pythonCaseTests } from "@/lib/dojo/pyTests";

const python = findPython() as string;
const tmp = mkdtempSync(join(tmpdir(), "nc-dojo-py-"));
const results = (solution: string, tests: string): { ok: boolean; name: string; message: string }[] => {
  const t = join(tmp, "tests.py");
  writeFileSync(t, tests);
  return runPythonTests(python, solution, t);
};

describe("Dojo Python variant", () => {
  const withPython = dojoProblems().filter(hasPython);

  it("exists for the core problems and builds a python task", () => {
    expect(withPython.map((p) => p.id).sort()).toEqual(["batch-packer", "context-window", "label-consensus"]);
    const task = toPythonTask(withPython[0]);
    expect(task.kind).toBe("python");
    expect(task.visibleTests).toContain("def test_");
  });

  it("generates one test per case with a time check", () => {
    const src = pythonCaseTests([{ name: "sample 1", input: "3\n1 1 2\n", expected: "1" }]);
    expect(src).toContain("def test_sample_1_0():");
    expect(src).toContain("Time limit exceeded");
  });

  for (const id of ["batch-packer", "context-window", "label-consensus"]) {
    it(`${id}: reference passes every bundled case; starter and wrong versions fail`, () => {
      const p = withPython.find((x) => x.id === id)!;
      const dir = join("content", "problems", id);
      const tests = pythonCaseTests([...p.sample, ...p.hidden]);
      const ref = results(join(dir, "solution.py"), tests);
      expect(ref.length).toBe(p.sample.length + p.hidden.length);
      expect(ref.filter((r) => !r.ok)).toEqual([]);
      expect(results(join(dir, "starter.py"), pythonCaseTests(p.sample)).some((r) => !r.ok)).toBe(true);
      for (const w of readdirSync(join(dir, "wrong_py"))) {
        expect(results(join(dir, "wrong_py", w), tests).some((r) => !r.ok), w).toBe(true);
      }
      expect(readFileSync(join(dir, "solution.py"), "utf8")).toContain("def solve(text: str) -> str");
    });
  }
});
