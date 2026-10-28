import type { CppTask, PythonTask } from "./tasks";

export const SIGMOID_TASK: PythonTask = {
  kind: "python",
  key: "dev-sigmoid",
  title: "Sigmoid and its gradient",
  brief: "Implement sigmoid(x) and sigmoid_grad(x) (the derivative at x). Hidden checks also try large negative and positive inputs.",
  entry: "main.py",
  starter: {
    "main.py": `import numpy as np
from player.helpers import clip_logits


def sigmoid(x):
    """Return 1 / (1 + e^-x), elementwise, without overflow warnings."""
    raise NotImplementedError


def sigmoid_grad(x):
    """Return d sigmoid / dx at x."""
    raise NotImplementedError
`,
    "helpers.py": `import numpy as np


def clip_logits(x, limit=60.0):
    """Keeps exp() finite. Use it if you need it."""
    return np.clip(x, -limit, limit)
`,
    "notes.txt": "Scratch notes: d/dx sigmoid = s * (1 - s)\n",
  },
  visibleTests: `import numpy as np
from nc_test import assert_close, grad_check


def test_sigmoid_of_zero_is_half():
    assert_close(sigmoid(np.array([0.0])), [0.5])


def test_gradient_matches_finite_differences():
    x = np.array([-2.0, 0.3, 1.5])
    grad_check(lambda v: float(np.sum(sigmoid(v))), x, sigmoid_grad(x))
`,
  hiddenTests: `import numpy as np
from nc_test import assert_close


def test_hidden_extreme_inputs_are_finite():
    out = sigmoid(np.array([-800.0, 800.0]))
    assert_close(out, [0.0, 1.0])
`,
};

const SORT = `#include <bits/stdc++.h>
using namespace std;

// Read n then n integers; print them in ascending order separated by spaces.
int main() {
    return 0;
}
`;

export const SORT_TASK: CppTask = {
  kind: "cpp",
  key: "dev-sort",
  title: "Sort the numbers",
  brief: "Read n and then n integers from stdin; print them sorted ascending, space separated.",
  entry: "main.cpp",
  starter: { "main.cpp": SORT },
  sample: [{ name: "three", input: "3\n3 1 2\n", expected: "1 2 3" }],
  hidden: [
    { name: "duplicates", input: "4\n2 2 1 1\n", expected: "1 1 2 2" },
    { name: "empty", input: "0\n", expected: "" },
  ],
};
