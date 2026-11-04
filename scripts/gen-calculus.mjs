// Generates content/decks/calculus.json and content/lessons/calculus.json (Gradient Gorge, CUR F3). Every predict answer,
// shape answer, derive answer and lesson output is computed by running numpy natively, never typed by hand.
// `--check` fails if the committed JSON is stale (used by tests/calculus.test.ts).
import { execFileSync, spawnSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";

const DECK_OUT = new URL("../content/decks/calculus.json", import.meta.url);
const LESSON_OUT = new URL("../content/lessons/calculus.json", import.meta.url);
const PY = ["python3", "/usr/bin/python3"].find((b) => spawnSync(b, ["-I", "-c", "import numpy"]).status === 0) ?? "python3";
const py = (src) => execFileSync(PY, ["-I", "-c", src], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], timeout: 20000 }).trim();
const NP = "import numpy as np";

/** [id, topic, prompt, code lines, three wrong outputs, explanation] */
const PREDICT = [
  ["cal-central-diff", "cal-derivatives", "What does this print?", ["f = lambda x: x ** 2", "h = 1e-5", "print(round((f(3 + h) - f(3 - h)) / (2 * h), 4))"], ["9.0", "3.0", "2.0"], "A central difference estimates f'(3) = 2 x 3 = 6. It is not f(3) = 9, and not the slope of the line through the origin. Its error shrinks like h squared, which is why it is the default for gradient checks."],
  ["cal-batch-mse-grad", "cal-derivatives", "What does this print?", ["x = np.array([1.0, 2.0])", "y = np.array([2.0, 4.0])", "w = 1.0", "print(np.mean(2 * (w * x - y) * x))"], ["-10.0", "5.0", "-2.5"], "L = mean((w x - y)^2), so dL/dw = mean(2 (w x - y) x) = (-2 - 8) / 2 = -5. Note the mean: a mean loss gives a mean gradient. Using a sum instead would double it and silently rescale the learning rate."],
  ["cal-tanh-chain", "cal-chain", "What does this print?", ["x = 0.0", "t = np.tanh(2 * x)", "print(2 * (1 - t ** 2))"], ["1.0", "0.0", "4.0"], "The chain rule gives d/dx tanh(2x) = 2 (1 - tanh(2x)^2). At x = 0 the tanh is 0, so the slope is 2: the inner factor 2 must not be forgotten."],
  ["cal-sigmoid-slope", "cal-chain", "What does this print?", ["s = 1 / (1 + np.exp(-0.0))", "print(s * (1 - s))"], ["0.5", "1.0", "0.0"], "The sigmoid's derivative is s (1 - s). At z = 0, s = 0.5 so the slope is 0.25, its maximum. Every sigmoid layer therefore shrinks gradients by at least 4x, the root of the vanishing-gradient problem."],
  ["cal-softmax-ce-grad", "cal-chain", "What does this print?", ["z = np.array([2.0, 1.0, 0.0])", "p = np.exp(z) / np.exp(z).sum()", "y = np.array([1.0, 0.0, 0.0])", "print(np.round(p - y, 4).tolist())"], ["[0.6652, 0.2447, 0.09]", "[-0.6652, 0.2447, 0.09]", "[0.3348, -0.2447, -0.09]"], "For softmax followed by cross-entropy the gradient with respect to the logits collapses to p - y. The true class is pushed up by 1 - p = 0.3348 and each wrong class is pushed down in proportion to its probability."],
  ["cal-gd-step", "cal-gd", "What does this print?", ["w = 5.0", "lr = 0.1", "grad = 2 * w", "w -= lr * grad", "print(w)"], ["4.9", "6.0", "5.0"], "f(w) = w^2 has gradient 2w = 10, so one step moves w by -0.1 x 10 = -1, to 4. Gradient descent steps against the gradient, scaled by the learning rate."],
  ["cal-gd-overshoot", "cal-gd", "What does this print?", ["w = 3.0", "w -= 0.5 * 2 * w", "print(w)"], ["1.5", "-3.0", "3.0"], "On f(w) = w^2 each step multiplies w by (1 - 2 lr). With lr = 0.5 that factor is 0, so a single step lands exactly on the minimum. This is a special case: it works only because the curvature is exactly 2."],
  ["cal-gd-diverge", "cal-gd", "What does this print?", ["w = 1.0", "for _ in range(3):", "    w -= 1.1 * 2 * w", "print(round(w, 4))"], ["0.0", "0.512", "1.0"], "The factor per step is 1 - 2 x 1.1 = -1.2, and |-1.2| > 1, so w oscillates and grows: (-1.2)^3 = -1.728. Stable learning rates on a quadratic satisfy lr < 2 / curvature."],
  ["cal-ravine", "cal-gd", "What does this print?", ["w = np.array([1.0, 1.0])", "curv = np.array([1.0, 10.0])", "print((w - 0.1 * curv * w).tolist())"], ["[0.9, 0.9]", "[0.0, 0.0]", "[0.1, 1.0]"], "For f = 0.5 (x^2 + 10 y^2) the gradient is (x, 10 y). One step at lr = 0.1 kills y but only shaves 10% off x. A single learning rate must be small enough for the steepest direction, which makes the shallow direction crawl: the ravine problem."],
  ["cal-momentum", "cal-gd", "What does this print?", ["w, v = 1.0, 0.0", "for _ in range(2):", "    v = 0.9 * v - 0.1 * (2 * w)", "    w += v", "print(round(w, 4))"], ["0.64", "0.8", "0.2"], "Momentum keeps a running velocity. Step 1: v = -0.2, w = 0.8. Step 2: v = 0.9(-0.2) - 0.1(1.6) = -0.34, w = 0.46. Plain gradient descent would be at 0.64; momentum has built up speed and is already further along."],
  ["cal-clip", "cal-gd", "What does this print?", ["g = np.array([3.0, 4.0])", "scale = min(1.0, 1.0 / np.linalg.norm(g))", "print(np.round(g * scale, 4).tolist())"], ["[1.0, 1.0]", "[3.0, 4.0]", "[0.0, 1.0]"], "Clipping by global norm rescales the whole gradient to length 1 while keeping its direction: (3, 4) / 5 = (0.6, 0.8). Clipping each element separately would change the direction."],
  ["cal-adam-first-step", "cal-adam", "What does this print?", ["g = 250.0", "b1, b2, lr, eps = 0.9, 0.999, 0.001, 1e-8", "m, v = (1 - b1) * g, (1 - b2) * g ** 2", "mh, vh = m / (1 - b1), v / (1 - b2)", "print(round(lr * mh / (np.sqrt(vh) + eps), 4))"], ["0.25", "0.0001", "250.0"], "After bias correction m-hat = g and v-hat = g^2, so the first step is lr x g / |g| = lr, whatever the gradient's scale. That scale-invariance is what makes Adam forgiving to tune."],
  ["cal-adam-no-bias", "cal-adam", "What does this print?", ["g = 250.0", "b1, b2, lr, eps = 0.9, 0.999, 0.001, 1e-8", "m, v = (1 - b1) * g, (1 - b2) * g ** 2", "print(round(lr * m / (np.sqrt(v) + eps), 5))"], ["0.001", "0.01", "0.0001"], "Without bias correction, m starts at (1 - b1) g = 0.1 g and sqrt(v) at about 0.0316 |g|, a ratio of 3.16, so the first step is 3x too big. The zero initialisation of m and v is what bias correction removes."],
];

/** [id, topic, setup lines, expression] -> shape answer computed by numpy. */
const SHAPES = [
  ["cal-shape-dW", "cal-chain", ["X = np.zeros((32, 10))", "dY = np.zeros((32, 4))"], "X.T @ dY"],
  ["cal-shape-dX", "cal-chain", ["W = np.zeros((10, 4))", "dY = np.zeros((32, 4))"], "dY @ W.T"],
  ["cal-shape-db", "cal-chain", ["dY = np.zeros((32, 4))"], "dY.sum(axis=0)"],
  ["cal-shape-grad-fail", "cal-chain", ["X = np.zeros((32, 10))", "dY = np.zeros((32, 4))"], "X @ dY"],
  ["cal-shape-jac", "cal-derivatives", ["J = np.zeros((3, 5))", "g = np.zeros(3)"], "g @ J"],
];

/** [id, topic, prompt, setup lines, field labels, python expressions (list of floats), tol, explanation] -> answers computed by numpy. */
const DERIVE = [
  ["cal-derive-poly", "cal-derivatives", "For f(x) = x^3 - 2x at x = 2, enter f'(2), f''(2), and the value of x after one gradient-descent step with learning rate 0.05.", ["x = 2.0"], ["f'(2)", "f''(2)", "x after one step"], "[3 * x ** 2 - 2, 6 * x, x - 0.05 * (3 * x ** 2 - 2)]", 0.01, "f'(x) = 3x^2 - 2 gives 10 and f''(x) = 6x gives 12. One step moves x by -0.05 x 10 = -0.5, to 1.5. The second derivative (curvature) is what limits a safe step size."],
  ["cal-derive-chain", "cal-chain", "A neuron has z = w x + b with w = 2, x = 3, b = -5, activation a = sigmoid(z), target y = 1 and loss L = 0.5 (a - y)^2. Enter a, dL/dz and dL/dw.", ["w, x, b, y = 2.0, 3.0, -5.0, 1.0", "z = w * x + b", "a = 1 / (1 + np.exp(-z))", "dz = (a - y) * a * (1 - a)"], ["a", "dL/dz", "dL/dw"], "[a, dz, dz * x]", 0.001, "z = 1 so a = 0.7311. Chain: dL/da = a - y = -0.2689, da/dz = a(1 - a) = 0.1966, so dL/dz = -0.0529. Since dz/dw = x = 3, dL/dw = -0.1586. The gradient is small mostly because the sigmoid's slope is small."],
  ["cal-derive-stable-lr", "cal-gd", "For f(x, y) = 0.5 (x^2 + 10 y^2), enter the largest stable learning rate 2 / λmax, the condition number κ, and the per-step contraction factors of x and y at lr = 0.15.", ["curv = np.array([1.0, 10.0])", "fac = 1 - 0.15 * curv"], ["2 / λmax", "κ", "x factor", "y factor"], "[2 / curv.max(), curv.max() / curv.min(), fac[0], fac[1]]", 0.01, "The Hessian eigenvalues are 1 and 10, so lr must stay below 2/10 = 0.2 and κ = 10. At lr = 0.15 the factors are 1 - 0.15 = 0.85 (slow) and 1 - 1.5 = -0.5 (fast, flipping sign). The slow direction sets the total number of steps."],
  ["cal-derive-steps", "cal-gd", "Gradient descent on f(w) = w^2 from w = 1 with lr = 0.1. Enter the factor w is multiplied by each step, and the number of steps until |w| < 0.001.", ["f = 1 - 0.1 * 2", "n = np.ceil(np.log(1e-3) / np.log(f))"], ["factor", "steps"], "[f, n]", 0.01, "Each step multiplies w by 1 - 2 lr = 0.8. We need 0.8^n < 0.001, so n > ln(0.001) / ln(0.8) = 30.96, i.e. 31 steps. Convergence on a quadratic is geometric, and the rate is set by lr x curvature."],
  ["cal-derive-adam", "cal-adam", "Adam (β1 = 0.9, β2 = 0.999, lr = 0.1, ε = 1e-8) sees gradients g1 = 4 then g2 = 2. After step 2 enter the bias-corrected m-hat, v-hat and the step size taken.", ["b1, b2, lr, eps = 0.9, 0.999, 0.1, 1e-8", "m = 0.0; v = 0.0", "for t, g in enumerate([4.0, 2.0], start=1):", "    m = b1 * m + (1 - b1) * g", "    v = b2 * v + (1 - b2) * g * g", "mh = m / (1 - b1 ** 2); vh = v / (1 - b2 ** 2)"], ["m-hat", "v-hat", "step"], "[mh, vh, lr * mh / (np.sqrt(vh) + eps)]", 0.01, "m-hat is a weighted average of the gradients (about 2.95) and v-hat a weighted average of their squares (about 10.0), both divided by (1 - β^t) to undo the zero start. The step is lr x m-hat / sqrt(v-hat), about 0.093: close to lr when gradients are consistent."],
];

const CONCEPT = [
  ["cal-neg-gradient", "cal-gd", "mcq", "Why does gradient descent move along the negative gradient?", ["The gradient points toward the steepest increase of the loss, so its negative is the steepest local decrease", "The gradient always points at the minimum", "Negative numbers are numerically more stable", "It makes the loss convex"], "The gradient is the direction of fastest local increase. It says nothing about where the minimum is: it only describes the slope here, which is why steps must be small and repeated."],
  ["cal-lr-too-big", "cal-gd", "mcq", "Training loss jumps around, then becomes NaN after a few hundred steps. What is the most likely first fix?", ["Lower the learning rate (and consider gradient clipping)", "Add more layers", "Train for more epochs", "Remove the validation set"], "Divergence means steps overshoot the valley and amplify. A smaller learning rate is the first lever; clipping the global gradient norm and a warm-up schedule are the next. More epochs only gives it more time to blow up."],
  ["cal-reverse-mode", "cal-chain", "mcq", "Why do deep-learning frameworks use reverse-mode differentiation (backprop) rather than forward-mode?", ["There is one scalar loss and millions of parameters: one reverse pass gives all the gradients, forward mode needs one pass per parameter", "Reverse mode is less accurate but faster", "Forward mode cannot handle matrices", "Reverse mode uses no memory"], "Cost scales with the number of inputs for forward mode and the number of outputs for reverse mode. Here outputs = 1. The price of reverse mode is memory: activations must be kept for the backward pass, which is why checkpointing exists."],
  ["cal-fd-use", "cal-derivatives", "mcq", "Why use finite differences to check gradients but not to train a network?", ["It needs two loss evaluations per parameter, far too slow at scale, but it is an independent check of the analytic gradient", "It is less accurate than backprop for every function", "It cannot be computed in float64", "It only works for linear layers"], "Finite differences cost O(parameters) forward passes per gradient, so they are only for small tests. Their value is independence: they share no code with your backward pass, so a bug in one shows up as disagreement."],
  ["cal-central-vs-forward", "cal-derivatives", "mcq", "A forward difference (f(x+h) - f(x))/h has error O(h). Why is the central difference usually preferred?", ["Its error is O(h^2), so a moderate h such as 1e-5 gives much better accuracy for the same two evaluations", "It needs only one evaluation", "It is exact for all functions", "It avoids floating-point error entirely"], "The first-order error terms of f(x+h) and f(x-h) cancel in the central difference. Too small an h brings back rounding error (catastrophic cancellation), so there is a sweet spot around 1e-5 to 1e-6 in float64."],
  ["cal-vanishing", "cal-chain", "mcq", "Why do deep stacks of sigmoid layers train slowly?", ["Each layer multiplies the gradient by a slope of at most 0.25, so early layers receive vanishing gradients", "Sigmoid outputs are negative", "Sigmoid cannot be differentiated", "Sigmoid layers have no weights"], "By the chain rule the gradient to an early layer is a product of per-layer factors. If each is below 1 the product shrinks exponentially with depth. ReLU, careful initialisation, normalisation and residual connections all fight this."],
  ["cal-dead-relu", "cal-chain", "mcq", "What is a 'dead ReLU'?", ["A unit whose input is negative for every example, so its gradient is zero and it stops learning", "A ReLU with a huge positive output", "A ReLU in the output layer", "A ReLU that returns NaN"], "The ReLU gradient is 0 for negative inputs. If a large update pushes a unit's pre-activation negative for all data, no gradient flows back and it can never recover. Leaky variants and smaller learning rates help."],
  ["cal-adam-why", "cal-adam", "mcq", "What problem does Adam's division by sqrt(v-hat) address?", ["It gives each parameter its own effective step size, normalising gradients whose scales differ widely", "It removes the need for a loss function", "It guarantees convergence to a global minimum", "It makes gradients exact"], "Parameters with consistently large gradients get smaller effective steps, rarely-updated ones larger. It is a cheap diagonal preconditioner. It does not guarantee a global minimum, and on some problems well-tuned SGD with momentum generalises better."],
  ["cal-sgd-noise", "cal-gd", "mcq", "Compared with full-batch gradient descent, what does a minibatch gradient give you?", ["A noisy but unbiased estimate of the full gradient at a fraction of the cost per step", "An exact gradient with less memory", "A guaranteed lower final loss", "A larger learning-rate limit in every case"], "The expectation of the minibatch gradient equals the full gradient, so on average it points the right way; the variance falls as the batch grows. The noise can help escape sharp minima, but it also sets a floor you cut through with learning-rate decay."],
  ["cal-adamw", "cal-adam", "mcq", "What distinguishes AdamW from Adam with an L2 penalty added to the loss?", ["AdamW applies weight decay directly to the weights, decoupled from the adaptive scaling by sqrt(v-hat)", "AdamW has no momentum", "AdamW needs no learning rate", "AdamW only works for transformers"], "With a plain L2 term the penalty's gradient is divided by sqrt(v-hat) like any other, so the decay strength varies per parameter. Decoupling it (Loshchilov & Hutter) restores the intended behaviour, and AdamW is the common default for transformer training."],
];
const MULTI = [
  ["cal-ravine-help", "cal-gd", "A loss surface is a long narrow ravine (condition number around 1000). Which changes typically help? Pick all that apply.", ["Momentum", "An adaptive optimiser such as Adam", "Standardising the input features", "Making the learning rate 10x larger", "Using float16 for the loss"], [0, 1, 2], "Momentum averages out the oscillation across the ravine, adaptive scaling approximates a per-parameter preconditioner, and standardised inputs make the problem better conditioned in the first place. A larger learning rate is exactly what a steep direction cannot tolerate."],
  ["cal-gradcheck-rules", "cal-derivatives", "Which practices make a gradient check trustworthy? Pick all that apply.", ["Use central differences", "Run in float64", "Compare with a relative error, not an absolute one", "Test exactly at a ReLU kink such as x = 0", "Check only the loss value, not the gradient"], [0, 1, 2], "Central differences in float64 reduce the check's own error, and a relative error copes with gradients of very different sizes. Kinks are non-differentiable, so a finite difference there is meaningless; avoid them or move the point slightly."],
];
const BUGS = [
  { id: "cal-bug-sign", topic: "cal-gd", prompt: "`step(w, lr)` should do one gradient-descent step on f(w) = w^2, moving toward 0. The loss grows instead. Which line is wrong?", buggy: ["import numpy as np", "def step(w, lr):", "    grad = 2 * w", "    return w + lr * grad"], fixed: ["import numpy as np", "def step(w, lr):", "    grad = 2 * w", "    return w - lr * grad"], probe: ["step(3.0, 0.1)"], explanation: "Descent subtracts the gradient. Adding it is gradient ascent: the loss now grows geometrically. A one-step unit test that checks the loss goes down catches this immediately." },
  { id: "cal-bug-adam-bias", topic: "cal-adam", prompt: "`adam_step` should apply the standard bias correction on step t, but the first steps come out far too large. Which line is wrong?", buggy: ["import numpy as np", "def adam_step(g, m, v, t, lr=0.001, b1=0.9, b2=0.999, eps=1e-8):", "    m = b1 * m + (1 - b1) * g", "    v = b2 * v + (1 - b2) * g * g", "    mh = m / (1 - b1)", "    vh = v / (1 - b2 ** t)", "    return lr * mh / (np.sqrt(vh) + eps), m, v"], fixed: ["import numpy as np", "def adam_step(g, m, v, t, lr=0.001, b1=0.9, b2=0.999, eps=1e-8):", "    m = b1 * m + (1 - b1) * g", "    v = b2 * v + (1 - b2) * g * g", "    mh = m / (1 - b1 ** t)", "    vh = v / (1 - b2 ** t)", "    return lr * mh / (np.sqrt(vh) + eps), m, v"], probe: ["round(float(adam_step(2.0, 0.0, 0.0, 3)[0]), 6)"], explanation: "The correction divides by 1 - β^t, where t is the step number, not by the constant 1 - β. Only at t = 1 do they agree; as t grows, m has warmed up on its own but the wrong version still divides it by 0.1, so m-hat overshoots by up to 10x." },
  { id: "cal-bug-numgrad", topic: "cal-derivatives", prompt: "`num_grad(f, x)` should return a central-difference estimate of f'(x), but it returns twice the right answer. Which line is wrong?", buggy: ["import numpy as np", "def num_grad(f, x, h=1e-5):", "    return (f(x + h) - f(x - h)) / h"], fixed: ["import numpy as np", "def num_grad(f, x, h=1e-5):", "    return (f(x + h) - f(x - h)) / (2 * h)"], probe: ["round(num_grad(lambda t: t ** 2, 3.0), 4)"], explanation: "The two evaluation points are 2h apart, so the denominator must be 2h. A gradient check with this bug fails on every correct backward pass, with a ratio of exactly 2, a useful clue." },
];

function place(correct, wrong, slot) { const choices = [...wrong]; choices.splice(slot, 0, correct); return { choices, answer: slot }; }

function buildDeck() {
  const cards = [];
  PREDICT.forEach(([id, topic, prompt, code, wrong, explanation], i) => {
    const out = py(`${NP}\n${code.join("\n")}`);
    if (out.includes("\n")) throw new Error(`${id}: output must be one line, got ${JSON.stringify(out)}`);
    if (wrong.includes(out)) throw new Error(`${id}: a distractor equals the real output (${out})`);
    cards.push({ id, kind: "mcq", variant: "predict", topic, prompt, code, ...place(out, wrong, (i * 3 + 1) % 4), explanation });
  });
  SHAPES.forEach(([id, topic, setup, expr]) => {
    const res = py(`${NP}\nimport json\n${setup.join("\n")}\ntry:\n    print(json.dumps(list(eval(${JSON.stringify(expr)}).shape)))\nexcept ValueError:\n    print('null')`);
    const answer = JSON.parse(res);
    const prompt = `With ${setup.map((l) => `\`${l}\``).join(" and ")}, what is the shape of \`${expr}\`? Type "error" if it raises.`;
    const explanation = answer === null
      ? "The inner sizes do not match, so numpy raises. For a linear layer Y = X W the gradients are dW = X^T dY and dX = dY W^T: transpose so the shared (batch) axis is the one summed away."
      : `Result shape (${answer.join(", ")}${answer.length === 1 ? "," : ""}). Every gradient has the shape of the thing it differentiates: dW matches W, dX matches X, db matches b. A bias gradient is a sum over the batch axis because the bias is broadcast across it.`;
    cards.push({ id, kind: "shape", topic, prompt, answer, explanation });
  });
  for (const [id, topic, prompt, setup, fields, expr, tol, explanation] of DERIVE) {
    const answers = JSON.parse(py(`${NP}\nimport json\n${setup.join("\n")}\nprint(json.dumps([float(x) for x in ${expr}]))`)).map((x) => Math.round(x * 1e6) / 1e6);
    if (answers.length !== fields.length) throw new Error(`${id}: fields/answers mismatch`);
    cards.push({ id, kind: "derive", topic, prompt, fields, answers, tol, explanation });
  }
  CONCEPT.forEach(([id, topic, kind, prompt, choices, explanation], i) => {
    const [right, ...wrong] = choices;
    cards.push({ id, kind, topic, prompt, ...place(right, wrong, (i * 3 + 2) % 4), explanation });
  });
  for (const [id, topic, prompt, choices, answers, explanation] of MULTI) cards.push({ id, kind: "multi", topic, prompt, choices, answers, explanation });
  for (const b of BUGS) {
    const lines = b.buggy.length === b.fixed.length ? b.buggy.map((l, i) => (l === b.fixed[i] ? 0 : i + 1)).filter(Boolean) : [];
    if (lines.length !== 1) throw new Error(`${b.id}: buggy and fixed must differ on exactly one line`);
    const run = (code) => py(`${code.join("\n")}\n${b.probe.slice(0, -1).join("\n")}\nprint(${b.probe.at(-1)})`);
    if (run(b.buggy) === run(b.fixed)) throw new Error(`${b.id}: fix does not change behaviour`);
    cards.push({ id: b.id, kind: "bug", topic: b.topic, prompt: b.prompt, code: b.buggy, line: lines[0], explanation: b.explanation });
  }
  if (cards.length < 30) throw new Error(`expected 30+ cards, got ${cards.length}`);
  return { id: "calculus", title: "Gradient Gorge: calculus and optimisation", cards };
}

const LESSONS = [
  ["cal-derivatives-lesson", "Derivatives and gradient checking", ["cal-derivatives"],
    "A derivative is the slope of a function at a point; a gradient stacks one slope per input. Training is nothing more than following those slopes, so the first skill is being able to trust a gradient you computed.",
    [
      ["The slope, numerically", "Nudge the input both ways and divide the change by the gap. The central difference has error proportional to h squared, so a modest h such as 1e-5 is accurate.", ["f = lambda x: x ** 3 - 2 * x", "h = 1e-5", "print(round((f(2 + h) - f(2 - h)) / (2 * h), 4))"]],
      ["Check analytic against numeric", "Your hand-derived f'(x) = 3x^2 - 2 and the finite difference must agree to several digits. This is the single best test for a backward pass, and the Forge labs rely on it.", ["x = 2.0", "analytic = 3 * x ** 2 - 2", "numeric = ((x + 1e-5) ** 3 - 2 * (x + 1e-5) - ((x - 1e-5) ** 3 - 2 * (x - 1e-5))) / 2e-5", "print(analytic, round(numeric, 4), abs(analytic - numeric) / max(1, abs(analytic)) < 1e-6)"]],
    ],
    ["A gradient is one slope per parameter; the Jacobian generalises it to vector outputs.", "Central differences (error h squared) in float64 are the standard independent check.", "Compare with relative error and avoid kinks such as ReLU at 0."],
    "Gradient-checking a function exactly at a non-differentiable point, or with an h so small that rounding error dominates."],
  ["cal-chain-lesson", "The chain rule and backprop", ["cal-chain"],
    "A network is a composition of simple functions. The chain rule multiplies the local slope of each link, and backprop is that multiplication organised from the loss backwards so every parameter's gradient is found in one sweep.",
    [
      ["Multiply local slopes", "For a neuron L = 0.5 (sigmoid(w x + b) - y)^2 the gradient to w is the product of three local derivatives: loss to activation, activation to pre-activation, pre-activation to weight.", ["w, x, b, y = 2.0, 3.0, -5.0, 1.0", "a = 1 / (1 + np.exp(-(w * x + b)))", "dz = (a - y) * a * (1 - a)", "print(round(a, 4), round(dz, 4), round(dz * x, 4))"]],
      ["Softmax plus cross-entropy collapses", "The two derivatives combine into p - y, which is why frameworks fuse them. It is cheap and numerically stable, and the shape lesson is that every gradient has the shape of its variable.", ["z = np.array([2.0, 1.0, 0.0])", "p = np.exp(z) / np.exp(z).sum()", "y = np.array([1.0, 0.0, 0.0])", "print(np.round(p - y, 4))"]],
      ["Slopes below 1 vanish", "The sigmoid's slope is at most 0.25, so a stack of them multiplies many small numbers. This is why early layers of deep sigmoid networks barely learn.", ["s = np.linspace(-6, 6, 7)", "slope = 1 / (1 + np.exp(-s)) * (1 - 1 / (1 + np.exp(-s)))", "print(np.round(slope, 4), 0.25 ** 10)"]],
    ],
    ["Backprop is the chain rule evaluated from the loss backwards, reusing intermediate results.", "Softmax + cross-entropy has gradient p - y.", "Gradients multiply, so slopes below 1 vanish and above 1 explode with depth."],
    "Forgetting an inner factor, such as the 2 in tanh(2x), or mixing up whether a gradient needs a transpose."],
  ["cal-gd-lesson", "Gradient descent, step size and curvature", ["cal-gd"],
    "Gradient descent repeatedly steps against the gradient. How far to step is the whole art: curvature, the second derivative, tells you the largest step that is safe.",
    [
      ["Stable step sizes", "On a quadratic with curvature c each step multiplies the distance by 1 - lr c. It converges only when |1 - lr c| < 1, that is lr < 2/c. Just below the limit it oscillates; far below it crawls.", ["for lr in (0.1, 0.5, 1.1):", "    w = 1.0", "    for _ in range(5):", "        w -= lr * 2 * w", "    print(lr, round(w, 4))"]],
      ["Ravines and momentum", "When curvature differs a lot between directions (a big condition number) the steepest one caps lr and the shallow one crawls. Momentum accumulates velocity along the consistent direction (here the shallow one, with the same learning rate) and cancels the zig-zag across the steep one.", ["w = u = 1.0; v = 0.0", "for _ in range(20):", "    w -= 0.05 * w", "    v = 0.9 * v - 0.05 * u; u += v", "print(round(w, 4), round(abs(u), 4))"]],
    ],
    ["lr must stay below 2 / curvature along the steepest direction.", "The condition number sets how slow the shallow direction is.", "Momentum, adaptive methods and feature standardisation all attack ill-conditioning."],
    "Raising the learning rate to speed up a loss that is already oscillating."],
  ["cal-adam-lesson", "Adam and bias correction", ["cal-adam"],
    "Adam keeps a running mean of gradients (m) and of squared gradients (v) and divides one by the root of the other. That gives each parameter its own step size, and a small correction makes the early steps honest.",
    [
      ["Per-parameter scaling", "The step is about lr times a ratio close to plus or minus 1 when gradients are consistent, so the update size is set by lr, not by how large the gradient happens to be.", ["b1, b2, lr, eps = 0.9, 0.999, 0.001, 1e-8", "for g in (0.01, 1.0, 250.0):", "    m, v = (1 - b1) * g, (1 - b2) * g * g", "    mh, vh = m / (1 - b1), v / (1 - b2)", "    print(g, round(lr * mh / (np.sqrt(vh) + eps), 6))"]],
      ["Why the correction", "m and v start at 0, so early on they underestimate the true averages. Dividing by 1 - β^t cancels that bias. Without it the very first step is about three times too large.", ["g = 250.0", "m, v = 0.1 * g, 0.001 * g * g", "print(round(0.001 * m / np.sqrt(v), 5), round(0.001 * (m / 0.1) / np.sqrt(v / 0.001), 5))"]],
    ],
    ["Adam = momentum on the gradient plus per-parameter scaling by the root of a running squared gradient.", "Bias correction divides by 1 - beta^t, with t the step count.", "AdamW decouples weight decay from the adaptive scaling."],
    "Reading the correction as a constant 1 - beta, or setting epsilon so large that it, rather than the gradient, controls the step."],
];

function buildLessons() {
  return {
    id: "calculus-lessons",
    title: "Gradient Gorge lessons",
    lessons: LESSONS.map(([id, title, topics, intro, sections, takeaways, trap]) => ({
      id, title, topics, intro, takeaways, trap,
      sections: sections.map(([heading, text, code]) => {
        const s = { heading, text };
        if (code) { s.code = code; s.output = py(`${NP}\n${code.join("\n")}`); }
        return s;
      }),
    })),
  };
}

const deckJson = JSON.stringify(buildDeck(), null, 2) + "\n";
const lessonJson = JSON.stringify(buildLessons(), null, 2) + "\n";
if (process.argv.includes("--check")) {
  for (const [url, json] of [[DECK_OUT, deckJson], [LESSON_OUT, lessonJson]]) {
    if (readFileSync(url, "utf8") !== json) { console.error(`${url.pathname} is stale: run node scripts/gen-calculus.mjs`); process.exit(1); }
  }
  console.log("calculus deck and lessons up to date (recomputed natively)");
} else {
  writeFileSync(DECK_OUT, deckJson);
  writeFileSync(LESSON_OUT, lessonJson);
  console.log("wrote calculus deck and lessons");
}
