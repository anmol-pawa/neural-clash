import { describe, expect, it } from "vitest";
import * as yowasp from "@yowasp/clang";
import { compileCpp, type RunClang } from "@/lib/judge/compile";
import { parseClangOutput, errorsOf } from "@/lib/judge/diagnostics";
import { compareOutput, judgeCases } from "@/lib/judge/verdict";
import { runWasm } from "@/lib/judge/wasi";

// the package's .d.ts omits runClang, which the bundle exports
const clang = (yowasp as unknown as { runClang: RunClang }).runClang;

async function build(src: string) {
  const r = await compileCpp(clang, src);
  if (!r.ok) throw new Error(r.raw);
  return r.wasm;
}

describe("compareOutput", () => {
  it("ignores trailing whitespace but not content in lines mode", () => {
    expect(compareOutput("1 2 3  \n\n", "1 2 3\n")).toBeNull();
    expect(compareOutput("1 2 3\n4", "1 2 3\n5")).toMatch(/line 2: expected "5", got "4"/);
    expect(compareOutput("1\n", "1\n2\n")).toMatch(/line 2/);
  });
  it("tokens mode ignores layout", () => {
    expect(compareOutput("1   2\n3", "1 2 3", "tokens")).toBeNull();
    expect(compareOutput("1 2", "1 2 3", "tokens")).toMatch(/token 3: expected "3", got nothing/);
  });
  it("float mode uses a relative tolerance", () => {
    expect(compareOutput("0.3333333", "0.33333333", "float", 1e-6)).toBeNull();
    expect(compareOutput("0.34", "0.33333333", "float", 1e-6)).not.toBeNull();
    expect(compareOutput("1000000.4", "1000000", "float", 1e-6)).toBeNull();
    expect(compareOutput("nan", "1", "float")).not.toBeNull();
  });
});

describe("parseClangOutput", () => {
  it("extracts line, column, snippet and hints", () => {
    const raw = "main.cpp:2:33: error: use of undeclared identifier 'y'\n    2 | int main(){ return y; }\n      |                    ^\n1 error generated.\n";
    const [d] = parseClangOutput(raw);
    expect(d).toMatchObject({ line: 2, column: 33, severity: "error", message: "use of undeclared identifier 'y'" });
    expect(d.hint).toMatch(/spelling/);
    expect(d.snippet).toContain("return y");
    expect(errorsOf(parseClangOutput(raw))).toHaveLength(1);
  });
});

describe("C++ judge (real clang→WASM, native Node)", () => {
  it("compiles with the bits/stdc++.h shim and judges AC / WA", async () => {
    const wasm = await build(`#include <bits/stdc++.h>
using namespace std;
int main() { int n; cin >> n; vector<int> v(n); for (auto& x : v) cin >> x; sort(v.begin(), v.end()); for (int x : v) cout << x << " "; cout << "\\n"; }`);
    const run = (input: string) => runWasm(wasm, input);
    const summary = await judgeCases(run, [
      { name: "sorted", input: "3\n3 1 2\n", expected: "1 2 3" },
      { name: "wrong on purpose", input: "2\n2 1\n", expected: "2 1" },
    ]);
    expect(summary.cases.map((c) => c.verdict)).toEqual(["AC", "WA"]);
    expect(summary.passed).toBe(1);
    expect(summary.verdict).toBe("WA");
    expect(summary.cases[1].detail).toMatch(/expected "2 1", got "1 2"/);
  });

  it("reports compile errors with a hint and rejects exceptions clearly", async () => {
    const r = await compileCpp(clang, "#include <bits/stdc++.h>\nint main() { throw 1; }");
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(errorsOf(r.diagnostics)[0].hint).toMatch(/exceptions/);
      expect(r.diagnostics[0].line).toBe(2);
    }
  });

  it("classifies runtime errors, stack overflow and output floods", async () => {
    const abort = await build("#include <cassert>\nint main() { assert(false && \"boom\"); }");
    const aborted = await judgeCases((i) => runWasm(abort, i), [{ name: "a", input: "", expected: "" }]);
    expect(aborted.cases[0].verdict).toBe("RE");

    const code = await build("int main() { return 3; }");
    const exited = await judgeCases((i) => runWasm(code, i), [{ name: "a", input: "", expected: "" }]);
    expect(exited.cases[0]).toMatchObject({ verdict: "RE", detail: "exited with code 3" });

    const deep = await build("#include <cstdio>\nint f(volatile int n) { volatile int pad[64]; pad[0] = n; return n == 0 ? 0 : 1 + f(n - 1) + pad[0] * 0; }\nint main() { std::printf(\"%d\", f(100000000)); }");
    const overflow = await judgeCases((i) => runWasm(deep, i), [{ name: "a", input: "", expected: "" }]);
    expect(overflow.cases[0].verdict).toBe("RE");
    expect(overflow.cases[0].detail).toMatch(/stack overflow/);

    const flood = await build("#include <cstdio>\nint main() { for (;;) std::puts(\"spam spam spam spam\"); }");
    const ole = await judgeCases((i) => runWasm(flood, i, { maxOutputBytes: 4096 }), [{ name: "a", input: "", expected: "" }]);
    expect(ole.cases[0].verdict).toBe("OLE");
  });
});
