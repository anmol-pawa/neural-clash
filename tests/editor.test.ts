import { describe, expect, it } from "vitest";
import { Workspace, validatePath, languageOf } from "@/lib/editor/workspace";
import { MemoryDraftStore, createAutosave, IdbDraftStore } from "@/lib/editor/drafts";
import { buildReport, gradGauge, parseGradDiff } from "@/lib/editor/results";

const starter = { "main.py": "x = 1\n", "util/helpers.py": "def f(): ...\n" };

describe("workspace", () => {
  it("validates paths", () => {
    for (const bad of ["", "/a.py", "../a.py", "a//b.py", "a/./b", "a b.py", "a\\b.py", "x".repeat(200)]) expect(validatePath(bad)).not.toBeNull();
    expect(validatePath("pkg/mod_1.py")).toBeNull();
  });
  it("detects language", () => {
    expect([languageOf("a.py"), languageOf("a.cpp"), languageOf("a.hpp"), languageOf("a.md")]).toEqual(["python", "cpp", "cpp", "text"]);
  });
  it("tracks edits, is immutable and resets", () => {
    const w0 = Workspace.fromStarter(starter);
    const w1 = w0.update("main.py", "x = 2\n");
    expect(w0.files["main.py"]).toBe("x = 1\n");
    expect(w1.dirtyPaths).toEqual(["main.py"]);
    expect(w1.reset("main.py").dirtyPaths).toEqual([]);
    expect(() => w1.update("nope.py", "")).toThrow();
  });
  it("creates, renames, removes and rejects conflicts", () => {
    let w = Workspace.fromStarter(starter).create("notes.py", "# hi");
    expect(w.dirtyPaths).toEqual(["notes.py"]);
    w = w.rename("notes.py", "util/notes.py");
    expect(w.paths).toContain("util/notes.py");
    expect(() => w.create("util", "")).toThrow(/conflicts/);
    expect(() => w.create("main.py/x.py")).toThrow(/conflicts/);
    expect(() => w.create("main.py")).toThrow(/exists/);
    const removed = w.remove("main.py");
    expect(removed.dirtyPaths).toContain("main.py");
    expect(removed.reset("main.py").files["main.py"]).toBe("x = 1\n");
  });
  it("builds a sorted tree with folders first", () => {
    const t = Workspace.fromStarter({ "b.py": "", "a/z.py": "", "a/y.py": "" }).tree();
    expect(t.map((n) => n.name)).toEqual(["a", "b.py"]);
    expect(t[0].children!.map((n) => n.name)).toEqual(["y.py", "z.py"]);
  });
  it("restores drafts, dropping unsafe paths", () => {
    const w = Workspace.restore(starter, { "main.py": "edited", "../evil.py": "x" });
    expect(w.paths).toEqual(["main.py"]);
    expect(w.files["main.py"]).toBe("edited");
    expect(Workspace.restore(starter, null).dirtyPaths).toEqual([]);
  });
});

describe("drafts", () => {
  it("round-trips and isolates copies", async () => {
    const s = new MemoryDraftStore();
    const f = { "a.py": "1" };
    await s.save("k", f);
    f["a.py"] = "mutated";
    expect(await s.load("k")).toEqual({ "a.py": "1" });
    await s.clear("k");
    expect(await s.load("k")).toBeNull();
  });
  it("autosave debounces and flushes", async () => {
    const s = new MemoryDraftStore();
    const a = createAutosave(s, "k", 10_000);
    a.schedule({ "a.py": "1" });
    a.schedule({ "a.py": "2" });
    expect(await s.load("k")).toBeNull();
    await a.flush();
    expect(await s.load("k")).toEqual({ "a.py": "2" });
  });
  it("IDB store degrades to null/no-op when the database cannot open", async () => {
    const broken = { open: () => { throw new Error("denied"); } } as unknown as IDBFactory;
    const s = new IdbDraftStore(broken);
    await s.save("k", { a: "1" });
    expect(await s.load("k")).toBeNull();
    await s.clear("k");
  });
});

describe("results", () => {
  const msg = "AssertionError: gradient check failed: relative error 0.5 > 1e-06";
  it("parses grad-check failures", () => {
    expect(parseGradDiff(msg)).toEqual({ relError: 0.5, tol: 1e-6 });
    expect(parseGradDiff("boom")).toBeUndefined();
  });
  it("hides hidden-test details and focuses the first visible failure", () => {
    const r = buildReport([
      { name: "test_hidden_shapes", ok: false, message: "secret values [1,2,3]", line: 9 },
      { name: "test_grad_matches", ok: false, message: msg, line: 4 },
      { name: "test_basic", ok: true, message: "" },
    ]);
    expect(r.passed).toBe(1);
    expect(r.allPassed).toBe(false);
    expect(r.focus?.name).toBe("test_grad_matches");
    expect(r.rows[0].message).not.toContain("secret");
    expect(r.rows[0].line).toBeUndefined();
    expect(r.rows[1].grad?.relError).toBe(0.5);
    expect(r.rows[1].title).toBe("grad matches");
  });
  it("an empty run is not a pass", () => {
    expect(buildReport([]).allPassed).toBe(false);
  });
  it("draws a gauge", () => {
    expect(gradGauge({ relError: 1e-9, tol: 1e-6 })).toMatch(/^\[###\.\.\.\|\.{5}\] err 1\.0e-9/);
  });
});
