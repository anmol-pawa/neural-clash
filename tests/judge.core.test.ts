import { beforeAll, describe, expect, it } from "vitest";
import { compileCpp, runWasm, type ClangRunner } from "@/lib/judge/core";

let runClang: ClangRunner;
beforeAll(async () => {
  runClang = ((await import("@yowasp/clang")) as unknown as { runClang: ClangRunner }).runClang;
}, 120000);

const twoSum = `#include <bits/stdc++.h>
using namespace std;
class Solution { public:
  vector<int> twoSum(const vector<int>& nums, int target) {
    unordered_map<int,int> seen;
    for (int i = 0; i < (int)nums.size(); ++i) {
      auto it = seen.find(target - nums[i]);
      if (it != seen.end()) return {it->second, i};
      seen[nums[i]] = i;
    }
    return {};
  }
};
int main() { int n, t; cin >> n; vector<int> v(n); for (auto& x : v) cin >> x; cin >> t;
  auto r = Solution().twoSum(v, t); cout << r[0] << " " << r[1] << "\\n"; }
`;

describe("C++ judge core", () => {
  it("compiles with the bits/stdc++.h shim and runs with stdin/stdout", async () => {
    const c = await compileCpp(runClang, twoSum);
    expect(c.ok).toBe(true);
    if (!c.ok) return;
    const r = runWasm(c.wasm, "4\n2 7 11 15\n9\n");
    expect(r.verdict).toBe("OK");
    expect(r.stdout).toBe("0 1\n");
  });

  it("reports compile errors with clang diagnostics", async () => {
    const c = await compileCpp(runClang, "int main() { int x = ; }");
    expect(c.ok).toBe(false);
    expect(c.diagnostics).toMatch(/error/);
  });

  it("maps an abort to a runtime error", async () => {
    const c = await compileCpp(runClang, `#include <vector>\nint main(){ std::vector<int> v; return v.at(3); }`);
    expect(c.ok).toBe(true);
    if (!c.ok) return;
    const r = runWasm(c.wasm);
    expect(r.verdict).toBe("RE");
    expect(r.reason).toBeTruthy();
  });

  it("reports a non-zero exit code as RE", async () => {
    const c = await compileCpp(runClang, `int main(){ return 3; }`);
    if (!c.ok) throw new Error(c.diagnostics);
    const r = runWasm(c.wasm);
    expect(r).toMatchObject({ verdict: "RE", exitCode: 3 });
  });
});
