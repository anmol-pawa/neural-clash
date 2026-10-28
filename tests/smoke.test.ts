import { describe, expect, it } from "vitest";
import manifest from "@/app/manifest";

describe("app shell", () => {
  it("manifest is installable and scoped to the base path", () => {
    const m = manifest();
    expect(m.name).toBe("Neural Clash");
    expect(m.display).toBe("standalone");
    expect(m.icons?.length).toBeGreaterThanOrEqual(2);
  });
});
