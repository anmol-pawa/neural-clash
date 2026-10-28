import { beforeAll, describe, expect, it } from "vitest";
import { nodeCore } from "./helpers/pyodide-node";
import type { PyCore } from "@/lib/py/core";

let core: PyCore;
beforeAll(async () => {
  core = await nodeCore();
});

describe("PyCore", () => {
  it("runs code and captures stdout", async () => {
    const r = await core.run({ code: "import numpy as np\nprint(np.arange(3).sum())\nprint('hi')" });
    expect(r.ok).toBe(true);
    expect(r.stdout).toBe("3\nhi");
  });

  it("reports errors with the player's line number", async () => {
    const r = await core.run({ code: "x = 1\ny = 1 / 0\n" });
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/ZeroDivisionError/);
    expect(r.errorLine).toBe(2);
  });

  it("uses a fresh namespace per run", async () => {
    await core.run({ code: "leak = 42" });
    const r = await core.run({ code: "print('leak' in globals())" });
    expect(r.stdout).toBe("False");
  });

  it("runs test_* functions and reports each", async () => {
    const r = await core.run({
      code: "def double(x):\n    return 2 * x\n",
      tests: "def test_ok():\n    assert double(2) == 4\ndef test_bad():\n    assert double(2) == 5\n",
    });
    expect(r.ok).toBe(false);
    expect(r.tests.map((t) => [t.name, t.ok])).toEqual([["test_ok", true], ["test_bad", false]]);
    expect(r.tests[1].message).toMatch(/AssertionError/);
  });

  it("accepts a correct gradient and rejects a wrong one (finite differences)", async () => {
    const tests = `
import numpy as np
from nc_test import grad_check, GradCheckError
def f(x): return float(np.sum(x ** 3))
def test_right():
    x = np.array([0.5, -1.0, 2.0])
    assert grad_check(f, x, 3 * x ** 2) < 1e-8
def test_wrong_is_caught():
    x = np.array([0.5, -1.0, 2.0])
    try:
        grad_check(f, x, 2 * x ** 2)
    except GradCheckError:
        return
    raise AssertionError("wrong gradient was accepted")
`;
    const r = await core.run({ code: "", tests });
    expect(r.tests.map((t) => t.ok)).toEqual([true, true]);
  });

  it("blocks giant allocations", async () => {
    const r = await core.run({ code: "import numpy as np\nnp.zeros((100000, 100000))" });
    expect(r.error).toMatch(/MemoryError/);
    const ok = await core.run({ code: "import numpy as np\nprint(np.zeros((10, 10)).shape)" });
    expect(ok.stdout).toBe("(10, 10)");
  });

  it("mounts a package, and reloads it after it changes", async () => {
    core.mountPackage("latent", { "__init__.py": "from .ops import relu\n", "ops.py": "def relu(x):\n    return max(x, 0)\n" });
    expect((await core.run({ code: "from latent import relu\nprint(relu(-3), relu(2))" })).stdout).toBe("0 2");
    core.mountPackage("latent", { "__init__.py": "from .ops import relu\n", "ops.py": "def relu(x):\n    return -1\n" });
    expect((await core.run({ code: "from latent import relu\nprint(relu(5))" })).stdout).toBe("-1");
  });

  it("rejects path traversal when mounting", () => {
    expect(() => core.mountPackage("evil", { "../x.py": "" })).toThrow();
  });
});
