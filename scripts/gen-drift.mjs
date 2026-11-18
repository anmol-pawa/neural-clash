// Generates content/decks/drift.json (Drift boss, CUR F9 monitoring). Every predict answer, derive answer and bug fix is
// computed by running numpy natively, never typed by hand. `--check` fails if the committed JSON is stale
// (used by tests/drift.test.ts).
import { execFileSync, spawnSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";

const OUT = new URL("../content/decks/drift.json", import.meta.url);
const PY = ["python3", "/usr/bin/python3"].find((b) => spawnSync(b, ["-I", "-c", "import numpy"]).status === 0) ?? "python3";
const py = (src) => execFileSync(PY, ["-I", "-c", src], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], timeout: 30000 }).trim();
const NP = "import numpy as np";
const PSI_FN = [
  "def psi(e, a, bins=10):",
  "    edges = np.quantile(e, np.linspace(0, 1, bins + 1)[1:-1])",
  "    pe = np.bincount(np.searchsorted(edges, e, side='right'), minlength=bins) / len(e)",
  "    pa = np.bincount(np.searchsorted(edges, a, side='right'), minlength=bins) / len(a)",
  "    pe, pa = np.maximum(pe, 1e-4), np.maximum(pa, 1e-4)",
  "    return float(np.sum((pa - pe) * np.log(pa / pe)))",
];
const PROPS_FN = ["def psi_p(pe, pa):", "    pe, pa = np.maximum(pe, 1e-4), np.maximum(pa, 1e-4)", "    return float(np.sum((pa - pe) * np.log(pa / pe)))"];
const ALARM = [
  "x = np.concatenate([np.zeros(50), np.full(50, 2.0)])",
  "w, z_limit = 10, 3.0",
  "means = np.convolve(x, np.ones(w) / w, mode='valid')",
  "z = means / (1.0 / np.sqrt(w))",
  "print(int(np.argmax(np.abs(z) > z_limit)) + w - 1)",
];

/** [id, topic, prompt, code lines, three wrong outputs, explanation] */
const PREDICT = [
  ["drift-psi-hand", "drift-psi", "What does this print? (PSI between the histograms [0.5, 0.5] and [0.7, 0.3], rounded to 4 places.)", [...PROPS_FN, "print(round(psi_p(np.array([0.5, 0.5]), np.array([0.7, 0.3])), 4))"], ["0.2", "0.0834", "0.4"], "Each bin adds (a - e) * ln(a / e). Both bins contribute a positive amount, because a bin that grows and a bin that shrinks both move the sum up. PSI is symmetric (swap the two histograms and the value is unchanged) and is zero only when the histograms match."],
  ["drift-psi-shift", "drift-psi", "What does this print? (PSI of a uniform baseline against itself, then against the same data shifted by 0.5, using ten baseline-decile bins, rounded to 2 places.)", [...PSI_FN, "x = np.linspace(0, 1, 1000)", "print(round(psi(x, x), 2), round(psi(x, x + 0.5), 2))"], ["0.0 0.5", "0.0 1.0", "0.1 6.2"], "Identical data gives exactly 0. Shifting by half the range leaves the lowest five bins empty and puts 60% of live rows in the top bin (10% in the baseline). The epsilon floor keeps the empty-bin terms finite; the total, about 4.35, is far above the usual 0.25 'major shift' rule of thumb."],
  ["drift-psi-empty", "drift-psi", "What does this print? (PSI when the live histogram is [1.0, 0.0] against a baseline of [0.5, 0.5], with proportions floored at 1e-4, rounded to 2 places.)", [...PROPS_FN, "print(round(psi_p(np.array([0.5, 0.5]), np.array([1.0, 0.0])), 2))"], ["inf", "0.35", "nan"], "A bin that goes empty would make ln(0) = -infinity. Flooring the proportions at a small epsilon turns it into a large but finite penalty. The value of epsilon changes the result, so it is part of the metric's definition and must be fixed and documented."],
  ["drift-ks-hand", "drift-ks", "What does this print? (The two-sample Kolmogorov-Smirnov statistic of a = [1, 3] and b = [2, 4].)", ["a, b = np.array([1.0, 3.0]), np.array([2.0, 4.0])", "grid = np.sort(np.concatenate([a, b]))", "fa = np.searchsorted(np.sort(a), grid, side='right') / len(a)", "fb = np.searchsorted(np.sort(b), grid, side='right') / len(b)", "print(float(np.max(np.abs(fa - fb))))"], ["0.25", "1.0", "0.0"], "The statistic is the largest vertical gap between the two empirical CDFs. They differ by 0.5 after the 1 (a has stepped, b has not) and again after the 3. It must be evaluated at every point of both samples, because the maximum gap can sit at a step of either one."],
  ["drift-alarm-index", "drift-alarm", "What does this print? (A stream of 50 zeros followed by 50 twos. A window of 10 raises an alarm when its mean is more than 3 standard errors from 0, where the standard deviation is 1. Index of the observation that completes the first alarming window.)", [NP, ...ALARM].slice(1), ["50", "59", "45"], "The standard error of a 10-point mean is 1/sqrt(10) = 0.316, so the alarm needs a window mean above 0.949. Five twos in the window give 1.0, so the alarm fires at index 54, five observations after the change started, not instantly. A longer window is steadier but reacts later: the detection-delay versus false-alarm trade-off."],
];

/** [id, topic, prompt, setup lines, field labels, python expression (list of floats), tol, explanation] */
const DERIVE = [
  ["drift-derive-psi", "drift-psi", "Baseline bin proportions are [0.4, 0.4, 0.2] and live proportions are [0.2, 0.4, 0.4]. Enter the PSI, the contribution of the first bin and the contribution of the third bin.", ["e = np.array([0.4, 0.4, 0.2])", "a = np.array([0.2, 0.4, 0.4])", "terms = (a - e) * np.log(a / e)"], ["PSI", "bin 1", "bin 3"], "[terms.sum(), terms[0], terms[2]]", 0.001, "Each bin adds (a - e) ln(a / e). The unchanged middle bin adds 0. The first and third bins mirror each other, so they contribute the same amount (about 0.139) and the PSI is twice that: 0.277, over the 0.25 'major' rule of thumb."],
];

const CONCEPT = [
  ["drift-types", "drift-types", "mcq", "Which kind of drift can you detect from production inputs alone, with no labels?", ["Covariate shift: the distribution of the input features P(x) moves", "Concept drift: the relationship P(y | x) changes while the inputs look the same", "A drop in accuracy caused by changed label definitions", "Label noise that grows over time"], "Comparing the live feature distributions with the training ones needs no labels. A change in P(y | x) can leave every input histogram untouched, so it only shows up through labels, or through a proxy such as downstream outcomes, human overrides or the prediction distribution."],
  ["drift-psi-threshold", "drift-psi", "mcq", "A feature has PSI = 0.3 against the training data. What is the sound reading?", ["A large shift worth investigating; the 0.1 and 0.25 cut-offs are rules of thumb, so check the cause and how much the model depends on the feature", "Proof that the model's accuracy has fallen by about 30%", "A statistically significant result with p = 0.3, so there is nothing to see", "The feature should be dropped immediately"], "PSI measures how far a histogram moved, not what that does to the model. The bands are conventions from credit-risk practice. Treat the alarm as a prompt: find out why it moved (data bug or real change) and whether the feature carries weight in the model."],
  ["drift-ks-large-n", "drift-ks", "mcq", "With two million rows a day, a KS test flags every feature at p < 1e-10 every morning, though D is about 0.005. What should you do?", ["Alert on an effect size such as D or PSI (and its impact), because with huge samples tiny, harmless differences become significant", "Trust the p-value, since significance means the shift matters", "Switch to a smaller significance level such as 1e-20", "Stop monitoring those features"], "Significance answers 'is there any difference at all?', and with enough rows the answer is always yes. Operational alerts need a threshold on how big the shift is, ideally tied to the model's sensitivity to that feature."],
  ["drift-delayed-labels", "drift-types", "mcq", "A model's true labels arrive 30 days after the prediction. How do you monitor it in the meantime?", ["Track input and prediction distributions plus proxy signals now, and score real accuracy as the labels land", "Wait 30 days; nothing can be monitored without labels", "Monitor only the training loss", "Retrain every day on the unlabelled data"], "Label delay is the normal case. Input and output drift are early-warning signals, not accuracy. Delayed labels give the real performance with a lag, so run both: leading indicators for speed, lagging labels for truth."],
  ["drift-alarm-first", "drift-response", "mcq", "A drift alarm fires on a feature overnight. What do you check first?", ["Whether the data pipeline changed (units, a null default, a renamed category, a late join) before assuming the world changed", "Retrain immediately on the newest data", "Raise the alert threshold until it stops", "Roll back the model to last year's version"], "Sudden, sharp shifts are most often an upstream bug, not a changed world. Retraining on corrupted data bakes the bug in. Rule out the pipeline, then ask whether the change is real and persistent before retraining."],
];
const MULTI = [
  ["drift-causes", "drift-response", "Which of these can legitimately trigger a PSI alarm? Pick all that apply.", ["A pipeline change such as a new unit or a different null default", "A seasonal cycle the baseline window did not cover", "A real change in who the users are", "More live rows than baseline rows, from the same distribution"], [0, 1, 2], "A larger sample from the same distribution does not move a proportion-based histogram (it only reduces noise). The first three change the data the model sees, for different reasons that call for different responses: fix the pipeline, widen the baseline, or retrain."],
];
const BUGS = [
  { id: "drift-bug-denominator", topic: "drift-psi", prompt: "PSI of the count histograms [50, 50] and [140, 60] should be 0.1695 (proportions 0.5/0.5 and 0.7/0.3) but comes out far off. Tap the line to fix.", buggy: ["import numpy as np", "def psi(e, a):", "    e, a = np.array(e, float), np.array(a, float)", "    pe = e / e.sum()", "    pa = a / e.sum()", "    return round(float(np.sum((pa - pe) * np.log(pa / pe))), 4)"], fixed: ["import numpy as np", "def psi(e, a):", "    e, a = np.array(e, float), np.array(a, float)", "    pe = e / e.sum()", "    pa = a / a.sum()", "    return round(float(np.sum((pa - pe) * np.log(pa / pe))), 4)"], probe: ["psi([50, 50], [140, 60])"], explanation: "Each histogram must be normalised by its own total. Dividing the live counts by the baseline total only works when both samples have the same size, which production data almost never does." },
  { id: "drift-bug-grid", topic: "drift-ks", prompt: "The KS statistic of a = [1, 2] and b = [0, 0.5] should be 1.0 (every b value is below every a value) but returns 0.5. Tap the line to fix.", buggy: ["import numpy as np", "def ks(a, b):", "    a, b = np.sort(a), np.sort(b)", "    grid = a", "    fa = np.searchsorted(a, grid, side='right') / len(a)", "    fb = np.searchsorted(b, grid, side='right') / len(b)", "    return float(np.max(np.abs(fa - fb)))"], fixed: ["import numpy as np", "def ks(a, b):", "    a, b = np.sort(a), np.sort(b)", "    grid = np.concatenate([a, b])", "    fa = np.searchsorted(a, grid, side='right') / len(a)", "    fb = np.searchsorted(b, grid, side='right') / len(b)", "    return float(np.max(np.abs(fa - fb)))"], probe: ["ks([1, 2], [0, 0.5])"], explanation: "The ECDFs only change at sample points, and the largest gap can occur at a step of either sample. Checking just a's points misses gaps that peak at b's steps. Evaluate on the union of both samples." },
];

function place(correct, wrong, slot) { const choices = [...wrong]; choices.splice(slot, 0, correct); return { choices, answer: slot }; }

function buildDeck() {
  const cards = [];
  PREDICT.forEach(([id, topic, prompt, code, wrong, explanation], i) => {
    const out = py(`${NP}\n${code.join("\n")}`);
    if (out.includes("\n")) throw new Error(`${id}: output must be one line, got ${JSON.stringify(out)}`);
    if (wrong.includes(out)) throw new Error(`${id}: a distractor equals the real output (${out})`);
    cards.push({ id, kind: "mcq", variant: "predict", topic, prompt, code: code.filter((l) => l !== NP), ...place(out, wrong, (i * 3 + 1) % 4), explanation });
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
    const run = (code) => py(`${code.join("\n")}\nprint(${b.probe.at(-1)})`);
    if (run(b.buggy) === run(b.fixed)) throw new Error(`${b.id}: fix does not change behaviour`);
    cards.push({ id: b.id, kind: "bug", topic: b.topic, prompt: b.prompt, code: b.buggy, line: lines[0], explanation: b.explanation });
  }
  if (cards.length < 12) throw new Error(`expected 12+ cards, got ${cards.length}`);
  return { id: "drift", title: "Drift: monitoring data and model health", cards };
}

const deckJson = JSON.stringify(buildDeck(), null, 2) + "\n";
if (process.argv.includes("--check")) {
  if (readFileSync(OUT, "utf8") !== deckJson) { console.error(`${OUT.pathname} is stale: run node scripts/gen-drift.mjs`); process.exit(1); }
  console.log("drift deck up to date (recomputed natively)");
} else {
  writeFileSync(OUT, deckJson);
  console.log("wrote drift deck");
}
