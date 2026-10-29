import deckPython from "@/content/decks/python-port.json";
import deckNumpy from "@/content/decks/numpy-port.json";
import deckStrategy from "@/content/decks/foundations-strategy.json";
import { loadDeck } from "./loader";
import { GENERATORS } from "./generators";
import { shuffle, rng } from "./rng";
import type { BugCard, Card, McqCard, MultiCard } from "./types";

/** Hand-written cards for the B3 demo battle. Content slices (B4+) will move to `content/`. */

/** The buggy softmax: overflows for large logits. `SOFTMAX_BUG_SRC` is executed natively by tests to prove it. */
export const SOFTMAX_BUG_SRC = ["import numpy as np", "def softmax(z):", "    e = np.exp(z)", "    return e / e.sum()"];
export const SOFTMAX_FIXED_SRC = ["import numpy as np", "def softmax(z):", "    e = np.exp(z - np.max(z))", "    return e / e.sum()"];

const softmaxBug: BugCard = {
  id: "bug-softmax-overflow",
  kind: "bug",
  topic: "numerical-stability",
  prompt: "This softmax returns nan for logits like [1000, 1001]. Tap the line that causes it.",
  code: SOFTMAX_BUG_SRC,
  line: 3,
  explanation: "np.exp(1000) overflows to inf, and inf / inf is nan. Subtracting the max first leaves the result unchanged mathematically but keeps every exponent at or below zero.",
};

const lrMcq: McqCard = {
  id: "mcq-lr-diverge",
  kind: "mcq",
  topic: "optimisation",
  prompt: "Training loss climbs every step until it becomes nan. What is the most likely culprit?",
  choices: ["The learning rate is too high", "The model is too small", "There is too little data", "The test set leaked into training"],
  answer: 0,
  explanation: "An oversized step overshoots the minimum and each update lands higher up the bowl, so the loss grows geometrically. A small model or little data would plateau instead; leakage makes the loss look too good, not too bad.",
};

const overfitMulti: MultiCard = {
  id: "multi-overfit-fixes",
  kind: "multi",
  topic: "generalisation",
  prompt: "Training accuracy is 99% but validation accuracy is 71%. Which changes are reasonable first moves? Pick all that apply.",
  choices: ["Add weight decay or dropout", "Collect or augment more training data", "Train for many more epochs", "Evaluate on the training set to confirm"],
  answers: [0, 1],
  explanation: "A large train/validation gap means the model memorises; regularisation and more varied data both narrow it. More epochs deepen the memorisation, and training-set evaluation tells you nothing new.",
};

export const HANDWRITTEN: Card[] = [lrMcq, overfitMulti, softmaxBug];

/** Hand-written and generated cards from `content/decks/`, validated by the loader. */
export const STRATEGY_DECK = loadDeck(deckStrategy);

/** Python Port deck: Python and interview-Python cards (answers computed natively by `scripts/gen-python-deck.mjs`). */
export const PYTHON_DECK = loadDeck(deckPython);

/** Python Port part 2: numpy, broadcasting and vectorisation (answers computed natively by `scripts/gen-numpy-deck.mjs`). */
export const NUMPY_DECK = loadDeck(deckNumpy);

/** A varied deck: hand-written cards plus solver-generated ones, shuffled by a seed. */
export function demoDeck(seed: number): Card[] {
  const r = rng(seed);
  const gens = Object.values(GENERATORS);
  const generated = gens.map((g, i) => g(seed * 31 + i + 1) as Card);
  return shuffle(r, [...HANDWRITTEN, ...STRATEGY_DECK.cards.slice(0, 6), ...shuffle(r, PYTHON_DECK.cards).slice(0, 6), ...generated]);
}
