import { readFileSync } from "node:fs";
import { expect, it } from "vitest";
import { NC_TEST_PY } from "@/lib/py/nc_test.py.gen";

it("the embedded nc_test source matches lib/py/nc_test.py (run `node scripts/gen-py-sources.mjs`)", () => {
  expect(NC_TEST_PY).toBe(readFileSync("lib/py/nc_test.py", "utf8"));
});
