import { execFileSync } from "node:child_process";
import { expect, it } from "vitest";

it("lib/dojo/problems.gen.ts is up to date with content/problems", () => {
  expect(() => execFileSync("node", ["scripts/gen-problems.mjs", "--check"], { stdio: "pipe" })).not.toThrow();
}, 120_000);
