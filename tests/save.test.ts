import { describe, expect, it, vi } from "vitest";
import { exportSave, freshSave, importSave, latentMount, migrate, sanitizeLatent } from "@/lib/save/schema";
import { MemoryBackend, SaveManager, IdbBackend } from "@/lib/save/store";

describe("migrate", () => {
  it("returns defaults for junk", () => {
    for (const bad of [null, 5, "x", [], undefined]) expect(migrate(bad)).toEqual(freshSave());
  });
  it("clamps and sanitises fields", () => {
    const s = migrate({ name: "  " + "n".repeat(40), settings: { volume: 9, music: "yes" }, cleared: ["a", 3, "a"], labs: { m: { passed: 1 } } });
    expect(s.name).toHaveLength(16);
    expect(s.settings.volume).toBe(1);
    expect(s.settings.music).toBe(true);
    expect(s.cleared).toEqual(["a"]);
    expect(s.labs.m).toEqual({ passed: false, assisted: false });
  });
});

describe("latent files", () => {
  it("drops unsafe paths, non-python files and non-strings", () => {
    const out = sanitizeLatent({ "latent/value.py": "x=1", "../evil.py": "x", "/abs.py": "x", "a.txt": "x", "b.py": 4 });
    expect(Object.keys(out)).toEqual(["latent/value.py"]);
  });
  it("mounts the player's files, or the reference marked assisted", () => {
    const s = { ...freshSave(), latent: { "latent/a.py": "mine", "latent/b.py": "mine" } };
    expect(latentMount(s, null)).toEqual({ files: s.latent, assisted: false });
    const m = latentMount(s, { "latent/a.py": "ref" });
    expect(m.assisted).toBe(true);
    expect(m.files).toEqual({ "latent/a.py": "ref", "latent/b.py": "mine" });
  });
});

describe("export / import", () => {
  it("round-trips", () => {
    const s = { ...freshSave(), name: "Ada", cleared: ["x"], latent: { "latent/a.py": "1" } };
    const r = importSave(exportSave(s));
    expect(r.ok && r.save).toEqual(s);
  });
  it("rejects invalid, foreign and newer files", () => {
    expect(importSave("{nope").ok).toBe(false);
    expect(importSave(JSON.stringify({ hello: 1 })).ok).toBe(false);
    const newer = importSave(JSON.stringify({ format: "neural-clash-save", version: 99, data: {} }));
    expect(!newer.ok && newer.error).toMatch(/newer/);
  });
});

describe("SaveManager", () => {
  it("loads, updates, debounces writes and restores", async () => {
    vi.useFakeTimers();
    const backend = new MemoryBackend();
    const write = vi.spyOn(backend, "write");
    const m = new SaveManager(backend, 100, () => 42);
    await m.load();
    const seen = vi.fn();
    m.subscribe(seen);
    m.update((s) => ({ ...s, name: "A" }));
    m.update((s) => ({ ...s, cleared: ["c1"] }));
    expect(seen).toHaveBeenCalledTimes(2);
    expect(write).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(150);
    expect(write).toHaveBeenCalledTimes(1);
    vi.useRealTimers();
    const m2 = new SaveManager(backend);
    expect(await m2.load()).toMatchObject({ name: "A", cleared: ["c1"], updatedAt: 42 });
  });
  it("sanitises hostile update results and supports reset", async () => {
    const m = new SaveManager(new MemoryBackend(), 0);
    await m.load();
    m.update((s) => ({ ...s, latent: { "../x.py": "bad", "latent/ok.py": "ok" } }));
    expect(m.get().latent).toEqual({ "latent/ok.py": "ok" });
    await m.reset();
    expect(m.get().latent).toEqual({});
  });
  it("IdbBackend never throws when IndexedDB fails", async () => {
    const idb = { open: () => { throw new Error("blocked"); } } as unknown as IDBFactory;
    const b = new IdbBackend(idb);
    expect(await b.read()).toBeNull();
    await expect(b.write(freshSave())).resolves.toBeUndefined();
  });
});
