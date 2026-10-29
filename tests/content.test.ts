import { cpSync, existsSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import { findPython, verifyLab, verifyProblem } from "../scripts/content-verify.mjs";

const python = findPython() as string;
const tmp = mkdtempSync(join(tmpdir(), "nc-content-test-"));
afterAll(() => rmSync(tmp, { recursive: true, force: true }));

function copy(kind: "labs" | "problems", name: string): string {
  const dest = join(tmp, `${kind}-${name}-${Math.random().toString(36).slice(2)}`);
  cpSync(join(process.cwd(), "content", kind, name), dest, { recursive: true });
  return dest;
}

describe("content:verify", () => {
  it("accepts the sample Lab module", () => {
    expect(verifyLab(python, join(process.cwd(), "content/labs/linear-gd"))).toEqual([]);
  }, 60_000);

  it("rejects a Lab whose reference has a wrong gradient", () => {
    const dir = copy("labs", "linear-gd");
    const ref = join(dir, "reference", "solution.py");
    writeFileSync(ref, readFileSync(ref, "utf8").replace("(2.0 / n)", "(1.0 / n)"));
    const errors: string[] = verifyLab(python, dir);
    expect(errors.some((e) => e.includes("reference fails tests_hidden.py::test_gradient_matches_finite_differences"))).toBe(true);
  }, 60_000);

  it("rejects a Lab whose wrong implementation slips past the hidden tests", () => {
    const dir = copy("labs", "linear-gd");
    const wrong = join(dir, "wrong", "step_adds.py");
    writeFileSync(wrong, readFileSync(join(dir, "reference", "solution.py"), "utf8"));
    const errors: string[] = verifyLab(python, dir);
    expect(errors).toContain("linear-gd: wrong/step_adds.py passes every hidden test (the tests are too weak)");
  }, 60_000);

  it("rejects an undocumented wrong implementation", () => {
    const dir = copy("labs", "linear-gd");
    const meta = JSON.parse(readFileSync(join(dir, "meta.json"), "utf8"));
    delete meta.wrong["step_adds.py"];
    writeFileSync(join(dir, "meta.json"), JSON.stringify(meta));
    expect(verifyLab(python, dir).some((e: string) => e.includes("step_adds.py is not documented"))).toBe(true);
  });

  it("accepts the sample problem (reference = brute, wrongs get their documented verdicts)", () => {
    expect(verifyProblem(python, join(process.cwd(), "content/problems/top-k-tokens"))).toEqual([]);
  }, 120_000);

  it("rejects a problem whose reference disagrees with the brute force", () => {
    const dir = copy("problems", "top-k-tokens");
    const ref = join(dir, "solution.cpp");
    writeFileSync(ref, readFileSync(ref, "utf8").replace("a.second < b.second", "a.second > b.second"));
    const errors: string[] = verifyProblem(python, dir);
    expect(errors.some((e) => e.includes("reference and brute force disagree"))).toBe(true);
  }, 120_000);

  it("rejects a medium without a TLE-expected wrong solution", () => {
    const dir = copy("problems", "top-k-tokens");
    const meta = JSON.parse(readFileSync(join(dir, "meta.json"), "utf8"));
    meta.wrongExpect["tle_quadratic.cpp"] = "WA";
    writeFileSync(join(dir, "meta.json"), JSON.stringify(meta));
    expect(verifyProblem(python, dir).some((e: string) => e.includes("need a wrong solution that must TLE"))).toBe(true);
  });
});

describe("Python Port judged functions (B4c)", () => {
  const labs = readdirSync(join(process.cwd(), "content/labs")).filter((n) => n.startsWith("py-"));
  const meta = (id: string) => JSON.parse(readFileSync(join(process.cwd(), "content/labs", id, "meta.json"), "utf8"));

  it("ships ten packages, each with a lesson, a failing starter and 3+ documented wrong implementations", () => {
    expect(labs).toHaveLength(10);
    for (const id of labs) {
      const m = meta(id);
      expect(m.phase).toBe("python-port");
      expect(m.functions).toHaveLength(1);
      expect(Object.keys(m.wrong).length).toBeGreaterThanOrEqual(3);
      expect(existsSync(join(process.cwd(), "content/labs", id, "lesson.md"))).toBe(true);
    }
  });

  it("each starter defines the advertised function and is unimplemented", () => {
    for (const id of labs) {
      const spec = readFileSync(join(process.cwd(), "content/labs", id, "spec.py"), "utf8");
      expect(spec).toMatch(new RegExp(`(def|class) ${meta(id).functions[0]}\\b`));
      expect(spec).toContain("NotImplementedError");
    }
  });
});
