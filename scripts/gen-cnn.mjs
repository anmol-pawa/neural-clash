// Generates content/decks/cnn.json and content/lessons/cnn.json (Conv Caverns, CUR F8). Every predict answer, shape
// answer, derive answer and lesson output is computed by running numpy natively, never typed by hand.
// `--check` fails if the committed JSON is stale (used by tests/cnn.test.ts).
import { execFileSync, spawnSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";

const DECK_OUT = new URL("../content/decks/cnn.json", import.meta.url);
const LESSON_OUT = new URL("../content/lessons/cnn.json", import.meta.url);
const PY = ["python3", "/usr/bin/python3"].find((b) => spawnSync(b, ["-I", "-c", "import numpy"]).status === 0) ?? "python3";
const py = (src) => execFileSync(PY, ["-I", "-c", src], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], timeout: 30000 }).trim();
const NP = "import numpy as np";
const X8 = "x = np.zeros((8, 3, 32, 32))";

/** [id, topic, prompt, code lines, three wrong outputs, explanation] */
const PREDICT = [
  ["cnn-corr-flip", "cnn-conv", "What does this print? (What deep-learning frameworks call a convolution layer is cross-correlation: the kernel is not flipped.)", ["x = np.array([1.0, 2.0, 3.0, 4.0])", "k = np.array([1.0, 0.0, -1.0])", "print(np.correlate(x, k, 'valid').tolist())"], ["[2.0, 2.0]", "[-2.0, -2.0, -2.0]", "[0.0, 0.0]"], "Each output is x[i] - x[i+2] = -2. A mathematical convolution flips the kernel first and would give [2.0, 2.0]. Frameworks skip the flip because the kernel is learned anyway; it only matters when you port hand-designed filters or compare against np.convolve."],
  ["cnn-same-size", "cnn-shapes", "What does this print? (Output side of a 5x5 convolution with padding 2 and stride 1 on a 28-pixel side.)", ["n, k, p, s = 28, 5, 2, 1", "print((n + 2 * p - k) // s + 1)"], ["27", "24", "32"], "The formula is floor((n + 2p - k) / s) + 1. With p = (k - 1) / 2 and stride 1 the size is preserved, which is what 'same' padding means for odd kernels."],
  ["cnn-stride-floor", "cnn-shapes", "What does this print? (Output side of a 3x3 convolution with stride 2, no padding, on a 32-pixel side.)", ["n, k, p, s = 32, 3, 0, 2", "print((n + 2 * p - k) // s + 1)"], ["16", "14", "17"], "(32 - 3) / 2 = 14.5 floors to 14, so there are 15 window positions. The last column is simply never read, which is why odd sizes matter when you stack strided layers."],
  ["cnn-dilated-kernel", "cnn-shapes", "What does this print? (Effective kernel size of a 3x3 convolution with dilation 2, then the output side on a 32-pixel side with no padding.)", ["k, d, n = 3, 2, 32", "ke = d * (k - 1) + 1", "print(ke, n - ke + 1)"], ["3 30", "6 27", "4 29"], "Dilation spreads the taps apart: the kernel covers d(k - 1) + 1 = 5 pixels while still having only 3 weights per row. Use it to widen the receptive field without extra parameters or downsampling."],
  ["cnn-transposed", "cnn-shapes", "What does this print? (Output side of a transposed convolution with kernel 4, stride 2, padding 1 on a 7-pixel side.)", ["n, k, s, p = 7, 4, 2, 1", "print((n - 1) * s - 2 * p + k)"], ["13", "15", "16"], "A transposed convolution inverts the size arithmetic of a strided convolution: (n - 1) s - 2p + k. Kernel 4, stride 2, padding 1 exactly doubles the side, the usual upsampling block; a kernel not divisible by the stride leaves a checkerboard pattern."],
  ["cnn-params-conv", "cnn-cost", "What does this print? (Parameters of a 3x3 convolution from 3 to 16 channels, with biases.)", ["cin, cout, k = 3, 16, 3", "print(cout * cin * k * k + cout)"], ["432", "144", "1344"], "Each of the 16 filters has 3 x 3 x 3 = 27 weights and one bias, so 448. The count does not depend on the image size at all; that is the point of weight sharing."],
  ["cnn-params-dense", "cnn-cost", "What does this print? (Parameters of a dense layer that maps a flattened 32x32x3 image to a flattened 32x32x16 output, with biases.)", ["fin, fout = 32 * 32 * 3, 32 * 32 * 16", "print(fin * fout + fout)"], ["448", "50331648", "3145728"], "About 50 million parameters, against 448 for the 3x3 convolution that computes a locally connected, weight-shared version of the same shape change. Locality and sharing are the inductive bias that makes images tractable."],
  ["cnn-macs", "cnn-cost", "What does this print? (Multiply-accumulates for a 3x3 convolution from 3 to 16 channels with 'same' padding on a 32x32 image, one example.)", ["cin, cout, k, h, w = 3, 16, 3, 32, 32", "print(cout * h * w * cin * k * k)"], ["27648", "1327104", "448"], "Every one of the 16 x 32 x 32 outputs costs 3 x 3 x 3 = 27 multiply-accumulates. Parameters did not grow with resolution but compute does, which is why early high-resolution layers dominate FLOPs and late wide layers dominate parameters."],
  ["cnn-depthwise", "cnn-cost", "What does this print? (Weights, without biases, of a depthwise 3x3 convolution on 64 channels, and of a standard 3x3 convolution from 64 to 64 channels.)", ["c, k = 64, 3", "print(c * k * k, c * c * k * k)"], ["576 576", "36864 576", "4096 36864"], "A depthwise layer filters each channel on its own (64 x 9 weights); a following 1x1 pointwise convolution (64 x 64) mixes channels. Together they cost about 1/k^2 + 1/c of a standard convolution, at some loss of expressiveness."],
  ["cnn-one-by-one", "cnn-cost", "What does this print? (Parameters, with biases, of a 1x1 convolution that squeezes 256 channels to 64, a 'bottleneck'.)", ["cin, cout = 256, 64", "print(cin * cout + cout)"], ["16384", "65600", "147520"], "A 1x1 convolution is a dense layer applied at every pixel: 256 x 64 weights plus 64 biases. It reduces channels cheaply before an expensive 3x3 convolution, the trick behind bottleneck blocks."],
  ["cnn-flatten-dim", "cnn-cost", "What does this print? (The in_features of the Linear head after flattening a 64-channel 7x7 feature map.)", ["c, h, w = 64, 7, 7", "print(c * h * w)"], ["448", "64", "49"], "Flattening ties the head to one input resolution: 64 x 7 x 7 = 3136 features. Global average pooling (64 features, any resolution) avoids that and removes most of the head's parameters."],
  ["cnn-rf-stack", "cnn-receptive", "What does this print? (Receptive field of one unit after three stacked 3x3 convolutions with stride 1.)", ["rf = 1", "for _ in range(3):", "    rf += 3 - 1", "print(rf)"], ["9", "6", "27"], "Each stride-1 layer of kernel k adds k - 1 pixels, so three 3x3 layers see 7x7, the same area as one 7x7 kernel but with 27 weights per channel pair instead of 49, plus two extra non-linearities."],
  ["cnn-rf-stride", "cnn-receptive", "What does this print? (Receptive field after conv3 stride 1, conv3 stride 2, conv3 stride 1.)", ["rf, jump = 1, 1", "for k, s in [(3, 1), (3, 2), (3, 1)]:", "    rf += (k - 1) * jump", "    jump *= s", "print(rf)"], ["7", "11", "8"], "The 'jump' is the input distance between neighbouring units. After a stride-2 layer every later 3x3 layer steps 2 input pixels, so it adds 4 rather than 2. Downsampling is how networks see large objects without huge kernels."],
  ["cnn-pool-back", "cnn-pooling", "What does this print? (The gradient reaching the input of a 2x2 max pool whose window is [[1, 5], [4, 2]] when the output gradient is 1.)", ["w = np.array([[1.0, 5.0], [4.0, 2.0]])", "g = np.zeros_like(w)", "g[np.unravel_index(w.argmax(), w.shape)] = 1.0", "print(g.tolist())"], ["[[0.25, 0.25], [0.25, 0.25]]", "[[1.0, 1.0], [1.0, 1.0]]", "[[0.0, 0.0], [1.0, 0.0]]"], "Max pooling routes the whole gradient to the arg-max position and zero elsewhere (average pooling would split it evenly). Overlapping windows add their contributions, and ties need a deterministic rule such as first-max."],
  ["cnn-pool-shift", "cnn-pooling", "What does this print? (Max pooling, size 2 stride 2, of a spike and of the same spike shifted by one pixel inside the window.)", ["a = np.array([9.0, 0.0, 0.0, 0.0])", "b = np.array([0.0, 9.0, 0.0, 0.0])", "pool = lambda v: v.reshape(-1, 2).max(axis=1).tolist()", "print(pool(a), pool(b))"], ["[9.0, 0.0] [0.0, 9.0]", "[0.0, 9.0] [9.0, 0.0]", "[9.0, 0.0] [9.0, 9.0]"], "Pooling gives small local invariance: the shift stays inside one window so the output is unchanged. A shift across a window boundary would change it, so invariance is only approximate, and strided pooling can even alias."],
  ["cnn-equivariance", "cnn-conv", "What does this print? (Index of the strongest response of the same edge filter to a pattern, and to the pattern shifted right by one pixel.)", ["x = np.array([0.0, 0.0, 1.0, 2.0, 3.0, 0.0, 0.0, 0.0])", "k = np.array([1.0, 0.0, -1.0])", "r = lambda v: int(np.correlate(v, k, 'valid').argmax())", "print(r(x), r(np.roll(x, 1)))"], ["4 4", "5 4", "4 6"], "Convolution is translation-equivariant: shift the input and the feature map shifts with it. That is different from invariance (an unchanged output), which pooling or a global reduction adds on top."],
];

/** [id, topic, setup lines, expression, explanation] -> shape answer computed by numpy. */
const SHAPES = [
  ["cnn-shape-nhwc", "cnn-shapes", [X8], "x.transpose(0, 2, 3, 1)", "Moving channels last turns NCHW into NHWC, the layout some frameworks and accelerators prefer. A transpose only permutes axes, so no values are lost, but the result is a non-contiguous view until copied."],
  ["cnn-shape-flatten", "cnn-shapes", [X8], "x.reshape(8, -1)", "Flatten everything except the batch axis: 3 x 32 x 32 = 3072 features per example. Flattening with -1 over the batch axis is a classic bug that mixes examples."],
  ["cnn-shape-bn", "cnn-arch", [X8], "x.mean(axis=(0, 2, 3))", "BatchNorm2d keeps one mean and variance per channel, pooled over the batch and both spatial axes, so the statistics have shape (C,) = (3,). Normalising over the channel axis instead would erase the very feature differences the channels carry."],
  ["cnn-shape-gap", "cnn-arch", [X8], "x.mean(axis=(2, 3))", "Global average pooling collapses each channel's map to one number: (8, 3, 32, 32) -> (8, 3). The head that follows no longer depends on the input resolution."],
];

/** [id, topic, prompt, setup lines, field labels, python expression (list of floats), tol, explanation] */
const DERIVE = [
  ["cnn-derive-stack", "cnn-shapes", "A grayscale 32x32 image goes through conv 3x3 (1->16, 'same' padding, bias), 2x2 max pool, conv 3x3 (16->32, 'same', bias), 2x2 max pool. Enter the final feature-map side, the total convolution parameters and the flattened feature size.", ["side = 32", "side = side // 2", "side = side // 2", "params = (1 * 16 * 9 + 16) + (16 * 32 * 9 + 32)"], ["side", "conv parameters", "flattened size"], "[side, params, 32 * side * side]", 0.001, "Pools halve the side twice (32 -> 16 -> 8), 'same' convolutions keep it. Parameters: 160 + 4,640 = 4,800, tiny next to the head: flattening 32 x 8 x 8 = 2,048 features into even 10 classes costs 20,490 parameters."],
  ["cnn-derive-backward", "cnn-conv", "A 1-D cross-correlation y[i] = sum_j k[j] x[i + j] with x = [1, 2, 3, 4], k = [1, -1] (valid, so y has 3 entries) and loss L = sum(y^2) / 2. Enter dL/dk[0], dL/dk[1], dL/dx[0] and dL/dx[3].", ["x = np.array([1.0, 2.0, 3.0, 4.0])", "k = np.array([1.0, -1.0])", "y = np.correlate(x, k, 'valid')", "dy = y.copy()", "dk = np.array([(dy * x[j:j + 3]).sum() for j in range(2)])", "dx = np.zeros(4)", "for i in range(3):", "    dx[i:i + 2] += dy[i] * k"], ["dk[0]", "dk[1]", "dx[0]", "dx[3]"], "[dk[0], dk[1], dx[0], dx[3]]", 0.001, "dy = y = [-1, -1, -1]. A kernel weight collects dy[i] x x[i + j] over every position (weight sharing sums the contributions), and an input pixel collects dy[i] x k[j] from every window that contained it (a full convolution of dy with the kernel). Verify any such derivation with finite differences."],
  ["cnn-derive-cost", "cnn-cost", "A 3x3 convolution maps 64 channels to 64 channels on a 56x56 feature map with 'same' padding and biases. Enter its parameter count and its multiply-accumulates for one example.", ["c, h, k = 64, 56, 3"], ["parameters", "multiply-accumulates"], "[c * c * k * k + c, c * h * h * c * k * k]", 0.001, "Parameters 36,928; MACs about 115.6 million, i.e. roughly 231 MFLOPs for one layer on one image. Halving the spatial side divides the MACs by 4 while the parameters do not change."],
];

const CONCEPT = [
  ["cnn-why-conv", "cnn-conv", "mcq", "Why does a convolutional layer suit images better than a dense layer of the same output size?", ["Local connectivity and weight sharing exploit that nearby pixels matter together and the same pattern can appear anywhere, with far fewer parameters", "It can represent functions a dense layer cannot, because dense layers are linear", "It removes the need for non-linear activations", "It guarantees invariance to rotation and scale"], "A dense layer can represent anything a convolution can (a convolution is a constrained dense layer), so the gain is an inductive bias, not expressiveness: fewer parameters, translation equivariance and better sample efficiency. Rotation and scale are not handled for free."],
  ["cnn-padding-why", "cnn-conv", "mcq", "Why pad the borders of a feature map before a convolution?", ["Without padding the map shrinks every layer and border pixels take part in fewer windows than interior ones", "Padding adds learnable parameters that improve accuracy", "Padding is required for the convolution to be differentiable", "Padding makes the layer translation-invariant"], "Padding with zeros ('same') preserves the spatial size and lets edge pixels contribute about as often as central ones. It is not required for gradients; zero padding can leak absolute position, which some networks quietly exploit."],
  ["cnn-invariance", "cnn-pooling", "mcq", "A convolution plus global max pooling detects a pattern wherever it appears. Which statement is accurate?", ["The convolution is translation-equivariant and the global pooling then makes the output invariant to the pattern's position", "The convolution alone is translation-invariant", "Both are invariant to rotation", "The pooling makes the network equivariant to scale"], "Equivariant means the output moves with the input; invariant means it does not change. Interviewers like this distinction. Real networks are only approximately invariant because of strides, borders and aliasing."],
  ["cnn-rf-cheap", "cnn-receptive", "mcq", "You need a bigger receptive field at low cost. Which option is usually best?", ["Stack small 3x3 layers and downsample with stride or pooling; dilation is a further option when resolution must stay high", "Use one very large kernel such as 31x31 in the first layer", "Remove the non-linearities so the layers merge", "Increase the batch size"], "Stacking small kernels reaches the same area with fewer weights and more non-linearities; downsampling grows the receptive field fastest. Dilation widens it without extra parameters but can leave gaps (gridding) if used carelessly."],
  ["cnn-bn-conv", "cnn-arch", "mcq", "In a convolutional network, what does BatchNorm2d compute its statistics over?", ["Each channel separately, across the batch and all spatial positions", "Each example separately, across channels and positions", "Each pixel position separately, across the batch", "The whole tensor as a single group"], "One mean and variance per channel (plus a learned scale and shift), pooled over N, H and W. At inference it uses running averages, so remember eval mode. Per-example variants such as LayerNorm and GroupNorm are used when batches are tiny."],
  ["cnn-residual", "cnn-arch", "mcq", "Why do residual connections let very deep CNNs train?", ["The identity path gives gradients a short route to early layers, so each block only has to learn a correction", "They add capacity, so the network can fit the training set better", "They make every layer's weights orthogonal", "They replace the need for normalisation and good initialisation"], "y = x + f(x) has derivative 1 + f'(x) along the skip, so the signal does not vanish through depth. The motivating observation was that plain deeper networks had higher training error, an optimisation problem rather than overfitting."],
  ["cnn-flip-augment", "cnn-arch", "mcq", "You train a classifier whose classes include '/' and '\\' strokes. Which augmentation can silently corrupt the labels?", ["Random horizontal flips: they turn one class into the other", "Small random crops", "Small brightness changes", "Adding mild Gaussian noise"], "Augmentations must preserve the label. Flips are harmless for most animal photos but break handedness, text and these two classes. Check every augmentation against the task, and never augment the validation set."],
  ["cnn-transfer", "cnn-arch", "mcq", "You have 2,000 labelled images and a model pretrained on a large dataset. What is a sensible first recipe?", ["Replace the head, train it first with the backbone frozen, then fine-tune the backbone with a much smaller learning rate", "Train from random initialisation because pretrained features are always wrong for new tasks", "Fine-tune everything at the usual learning rate from step one", "Freeze the whole network including the new head"], "Early layers learn generic edges and textures; a fresh head on top of random-magnitude gradients can wreck good features if the backbone is unfrozen too early. Compare against the frozen baseline and keep the pretrained preprocessing."],
];
const MULTI = [
  ["cnn-cost-levers", "cnn-cost", "Which of these reduce the multiply-accumulates of a convolution layer for one example? Pick all that apply.", ["Using a depthwise-separable convolution", "Using stride 2", "Reducing the number of output channels", "Increasing the batch size"], [0, 1, 2], "MACs scale with output positions x output channels x input channels per group x kernel area. Batch size changes the total work per step, not the cost per example, and it does not make a layer cheaper."],
];
const BUGS = [
  { id: "cnn-bug-outsize", topic: "cnn-shapes", prompt: "`out_size(32, 3, 1, 1)` should be 32 but returns 31. Tap the line to fix.", buggy: ["def out_size(n, k, s, p):", "    return (n - k + 2 * p) // s"], fixed: ["def out_size(n, k, s, p):", "    return (n - k + 2 * p) // s + 1"], probe: ["out_size(32, 3, 1, 1)"], explanation: "The count of window positions is the number of steps plus one: floor((n + 2p - k) / s) + 1. Forgetting the +1 is the classic off-by-one, and it compounds layer by layer until the flatten size no longer matches the Linear head." },
  { id: "cnn-bug-gap", topic: "cnn-arch", prompt: "Global average pooling is meant to return one value per channel, shape (batch, channels), but returns (H, W). Tap the line to fix.", buggy: ["import numpy as np", "def gap(x):", "    return x.mean(axis=(0, 1))"], fixed: ["import numpy as np", "def gap(x):", "    return x.mean(axis=(2, 3))"], probe: ["gap(np.zeros((2, 3, 4, 4))).shape"], explanation: "In NCHW layout the spatial axes are 2 and 3. Averaging over batch and channels instead produces a map and silently mixes examples. Printing the shape after every reduction catches this at once." },
  { id: "cnn-bug-flip", topic: "cnn-conv", prompt: "A hand-written 1-D layer must match a framework's convolution layer, but its edge filter responds with the opposite sign. Tap the line to fix.", buggy: ["import numpy as np", "def corr1d(x, k):", "    return np.convolve(x, k, 'valid')"], fixed: ["import numpy as np", "def corr1d(x, k):", "    return np.correlate(x, k, 'valid')"], probe: ["corr1d(np.array([1.0, 2.0, 4.0, 8.0]), np.array([1.0, 0.0, -1.0])).tolist()"], explanation: "np.convolve flips the kernel; deep-learning layers do not (they are cross-correlations). Ported weights or hand-built filters then come out mirrored. A unit test with an asymmetric kernel exposes it." },
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
  for (const [id, topic, setup, expr, explanation] of SHAPES) {
    const answer = JSON.parse(py(`${NP}\nimport json\n${setup.join("\n")}\nprint(json.dumps(list(eval(${JSON.stringify(expr)}).shape)))`));
    const prompt = `With ${setup.map((l) => `\`${l}\``).join(" and ")}, what is the shape of \`${expr}\`? Type "error" if it raises.`;
    cards.push({ id, kind: "shape", topic, prompt, answer, explanation: `Result shape (${answer.join(", ")}${answer.length === 1 ? "," : ""}). ${explanation}` });
  }
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
    const run = (code) => py(`${code.join("\n")}\nprint(${b.probe.at(-1)})`);
    if (run(b.buggy) === run(b.fixed)) throw new Error(`${b.id}: fix does not change behaviour`);
    cards.push({ id: b.id, kind: "bug", topic: b.topic, prompt: b.prompt, code: b.buggy, line: lines[0], explanation: b.explanation });
  }
  if (cards.length < 32) throw new Error(`expected 32+ cards, got ${cards.length}`);
  return { id: "cnn", title: "Conv Caverns: convolutional networks", cards };
}

const LESSONS = [
  ["cnn-conv-lesson", "Convolution, shapes and weight sharing", ["cnn-conv", "cnn-shapes"],
    "A convolutional layer is a dense layer with two constraints: each output sees only a small window, and every window uses the same weights. This lesson covers what the layer really computes (cross-correlation), the output-size formula you must be able to apply without a framework, and why weight sharing gives translation equivariance.",
    [
      ["Cross-correlation, not convolution", "Deep-learning 'convolutions' slide the kernel over the input without flipping it. The difference is invisible for learned kernels but shows up when you port hand-made filters or compare with np.convolve.", ["x = np.array([1.0, 2.0, 4.0, 8.0])", "k = np.array([1.0, 0.0, -1.0])", "print('correlate', np.correlate(x, k, 'valid').tolist())", "print('convolve ', np.convolve(x, k, 'valid').tolist())"]],
      ["The output-size formula", "Along each axis the output has floor((n + 2p - k) / s) + 1 positions, with dilation d replacing k by d(k - 1) + 1. Work through a few cases by hand before trusting a framework error message.", ["def out(n, k, s=1, p=0, d=1):", "    return (n + 2 * p - (d * (k - 1) + 1)) // s + 1", "print([out(32, 3, 1, 1), out(32, 3, 2, 0), out(28, 5, 1, 2), out(32, 3, 1, 0, 2)])"]],
      ["Weight sharing means equivariance", "The same filter is applied at every position, so shifting the input shifts the feature map by the same amount. Pooling or a global reduction on top is what turns this into (approximate) invariance.", ["x = np.array([0.0, 0.0, 1.0, 2.0, 3.0, 0.0, 0.0, 0.0])", "k = np.array([1.0, 0.0, -1.0])", "r = lambda v: np.correlate(v, k, 'valid')", "print(r(x).tolist())", "print(r(np.roll(x, 1)).tolist())"]],
      ["Gradients of a convolution", "The kernel gradient sums dy[i] x x[i + j] over all positions; the input gradient is a full convolution of dy with the kernel. Implementations build both from the same sliding windows (im2col) and fold the result back with +=, because overlapping windows contribute to the same pixel.", ["x = np.array([1.0, 2.0, 3.0, 4.0])", "k = np.array([1.0, -1.0])", "dy = np.correlate(x, k, 'valid')", "dk = np.array([(dy * x[j:j + 3]).sum() for j in range(2)])", "dx = np.zeros(4)", "for i in range(3):", "    dx[i:i + 2] += dy[i] * k", "print('dk', dk.tolist(), 'dx', dx.tolist())"]],
    ],
    ["Framework 'convolution' = cross-correlation: no kernel flip.", "Output side = floor((n + 2p - k) / s) + 1; dilation widens the kernel to d(k - 1) + 1.", "Weight sharing: translation equivariance and far fewer parameters, with the same expressiveness limits of a constrained dense layer.", "Backward: dK sums over positions, dX is a full convolution; overlapping windows accumulate."],
    "Calling convolution 'translation invariant'. It is equivariant; invariance needs pooling or a global reduction, and even then only approximately."],
  ["cnn-cost-lesson", "Receptive fields, pooling and the cost of a conv net", ["cnn-receptive", "cnn-pooling", "cnn-cost"],
    "Interviewers ask you to size a conv net on a whiteboard: how big an area does a unit see, what does pooling do in the backward pass, and where do the parameters and the FLOPs go. All of it is arithmetic you can do exactly.",
    [
      ["Receptive field and jump", "Each layer adds (k - 1) x jump pixels to the receptive field, and a stride multiplies the jump for every later layer. Three plain 3x3 layers see 7x7; a stride-2 layer in the middle makes the last layer count double.", ["rf, jump = 1, 1", "for k, s in [(3, 1), (3, 2), (3, 1)]:", "    rf += (k - 1) * jump", "    jump *= s", "    print('k', k, 'stride', s, '-> rf', rf, 'jump', jump)"]],
      ["Max pooling routes the gradient", "Backward through a max pool sends the whole gradient to the arg-max of each window; average pooling spreads it evenly. Overlapping windows accumulate into the same pixel.", ["w = np.array([[1.0, 5.0], [4.0, 2.0]])", "g = np.zeros_like(w)", "g[np.unravel_index(w.argmax(), w.shape)] = 1.0", "print('max pool grad', g.tolist())", "print('avg pool grad', (np.ones_like(w) / w.size).tolist())"]],
      ["Parameters versus compute", "Parameters are independent of the image size; MACs are not: each output value costs (cin / groups) x kh x kw. High-resolution early layers dominate compute, wide late layers and dense heads dominate parameters.", ["cin, cout, k = 64, 64, 3", "for h in (56, 28, 14):", "    print(h, 'params', cout * cin * k * k + cout, 'MACs', cout * h * h * cin * k * k)"]],
      ["Cheaper layers", "A depthwise 3x3 plus a 1x1 pointwise convolution costs about 1/k^2 + 1/c of a standard convolution; a 1x1 bottleneck shrinks channels before an expensive 3x3. Cheaper in FLOPs does not always mean faster on hardware, where memory traffic often dominates.", ["c, k = 64, 3", "std = c * c * k * k", "sep = c * k * k + c * c", "print(std, sep, round(sep / std, 3))"]],
    ],
    ["Receptive field grows by (k - 1) x jump per layer; strides multiply the jump.", "Max pool: gradient to the arg-max only. Average pool: even split.", "Params do not depend on image size, MACs scale with H x W; 1 MAC = 2 FLOPs.", "Depthwise-separable and 1x1 bottlenecks cut FLOPs; measure real latency as well."],
    "Quoting FLOPs as if they were latency, or counting the parameters of a flattened dense head as if the conv layers were the expensive part."],
  ["cnn-arch-lesson", "Building and training a CNN", ["cnn-arch"],
    "The architecture decisions that come up in interviews: where to normalise, why skip connections work, how to end the network without tying it to one resolution, how to augment safely and how to fine-tune a pretrained backbone.",
    [
      ["Normalise per channel", "BatchNorm2d keeps one mean and variance per channel across batch and spatial axes. GroupNorm and LayerNorm avoid the batch dependence when batches are small.", ["x = np.random.default_rng(0).normal(size=(8, 3, 4, 4))", "m = x.mean(axis=(0, 2, 3))", "v = x.var(axis=(0, 2, 3))", "print(m.shape, v.shape)"]],
      ["Skip connections and global pooling", "A residual block adds its input back, so the derivative along the skip is 1 + f'. Ending with global average pooling makes the head independent of the input size and removes the huge flatten layer.", ["print('plain', round(0.5 ** 20, 8), 'residual', round(1.01 ** 20, 4))", "x = np.zeros((8, 3, 32, 32))", "print(x.mean(axis=(2, 3)).shape)"]],
      ["Augment without changing the label", "Crops, small shifts, colour jitter and noise preserve most labels; flips and rotations do not for handed shapes, text or digits like 6 and 9. Augment the training set only.", ["classes = {'slash': '/', 'backslash': '\\\\'}", "flipped = {'/': '\\\\', '\\\\': '/'}", "print({n: flipped[c] for n, c in classes.items()})"]],
    ],
    ["BatchNorm2d: statistics per channel over N, H, W; eval mode uses running stats.", "Residual: gradient 1 + f' on the skip; plain deep stacks are harder to optimise.", "Global average pooling decouples the head from input resolution.", "Fine-tune: new head first, then the backbone at a much smaller learning rate; augmentations must preserve labels."],
    "Adding a flip or rotation augmentation without asking whether it can change the class, then reading the accuracy drop as 'the model is bad'."],
];

function buildLessons() {
  return {
    id: "cnn-lessons",
    title: "Conv Caverns lessons",
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
    if (readFileSync(url, "utf8") !== json) { console.error(`${url.pathname} is stale: run node scripts/gen-cnn.mjs`); process.exit(1); }
  }
  console.log("cnn deck and lessons up to date (recomputed natively)");
} else {
  writeFileSync(DECK_OUT, deckJson);
  writeFileSync(LESSON_OUT, lessonJson);
  console.log("wrote cnn deck and lessons");
}
