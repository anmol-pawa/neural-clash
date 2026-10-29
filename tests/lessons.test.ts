import { execFileSync } from "node:child_process";
import { describe, expect, it } from "vitest";
import deck from "../content/decks/python-port.json";
import { LESSONS, lessonById, lessonForTopic } from "../lib/lessons/lessons";

const python = process.env.PYTHON ?? "python3";

describe("Python Port lessons", () => {
  it("covers every topic used by the Python deck, once", () => {
    const topics = new Set(deck.cards.map((c) => c.topic));
    for (const t of topics) expect(lessonForTopic(t), `no lesson for ${t}`).toBeDefined();
    const claimed = LESSONS.flatMap((l) => l.topics);
    expect(new Set(claimed).size).toBe(claimed.length);
    for (const t of claimed) expect(topics.has(t), `lesson claims unused topic ${t}`).toBe(true);
  });

  it("has unique ids and complete content", () => {
    expect(new Set(LESSONS.map((l) => l.id)).size).toBe(LESSONS.length);
    for (const l of LESSONS) {
      expect(lessonById(l.id)).toBe(l);
      expect(l.intro.length).toBeGreaterThan(40);
      expect(l.sections.length).toBeGreaterThanOrEqual(1);
      expect(l.takeaways.length).toBeGreaterThanOrEqual(3);
      expect(l.trap.length).toBeGreaterThan(20);
    }
  });

  it("shows the real stdout of every code example (re-run natively)", () => {
    for (const l of LESSONS) for (const s of l.sections) {
      if (!s.code) { expect(s.output).toBeUndefined(); continue; }
      const out = execFileSync(python, ["-I", "-c", s.code.join("\n")], { encoding: "utf8" }).trim();
      expect(s.output, `${l.id}: ${s.heading}`).toBe(out);
    }
  }, 60_000);

  it("generator --check passes", () => {
    execFileSync("node", ["scripts/gen-python-lessons.mjs", "--check"], { stdio: "pipe" });
  }, 60_000);
});
