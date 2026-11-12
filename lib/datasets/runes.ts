import { rng } from "../cards/rng";

/**
 * Runes: a seeded mini sequence dataset (token ids, one label per sequence) with a documented generating process.
 *
 * Three tasks, each chosen because a feed-forward net on a flattened window handles it badly or needs a long memory:
 *   "first"   : vocab 4 (tokens 0..3). The label is the FIRST token; the other T-1 tokens are uniform distractors.
 *               A recurrent net must carry one symbol across T-1 steps, so it is the vanishing-gradient probe.
 *   "parity"  : vocab 2. The label is the XOR (sum mod 2) of all T bits. Every position matters equally.
 *   "brackets": vocab 2 (0 = open, 1 = close). The label is 1 when the sequence is a balanced bracket string, else 0.
 *               Classes are balanced 50/50: a balanced string is built by a random walk that never goes below zero and
 *               ends at zero; an unbalanced one is a balanced string with one or two symbols flipped, rejected if the
 *               flips happen to leave it balanced. T must be even.
 * Classes are balanced (parity and first are uniform by construction). Everything is original and in-repo.
 */
export const RUNE_TASKS = ["first", "parity", "brackets"] as const;
export type RuneTask = (typeof RUNE_TASKS)[number];
export type RuneSet = {
  /** Row-major n x T token ids. */
  x: Int32Array;
  y: Int32Array;
  n: number;
  /** Sequence length. */
  T: number;
  vocab: number;
  classes: number;
  task: RuneTask;
};

export const RUNE_VOCAB: Record<RuneTask, number> = { first: 4, parity: 2, brackets: 2 };
export const RUNE_CLASSES: Record<RuneTask, number> = { first: 4, parity: 2, brackets: 2 };

/** True when `seq` (0 = open, 1 = close) is a balanced bracket string. */
export function isBalanced(seq: ArrayLike<number>): boolean {
  let depth = 0;
  for (let i = 0; i < seq.length; i++) {
    depth += seq[i] === 0 ? 1 : -1;
    if (depth < 0) return false;
  }
  return depth === 0;
}

/** The ground-truth label for one sequence under a task. */
export function runeLabel(task: RuneTask, seq: ArrayLike<number>): number {
  if (task === "first") return seq[0];
  if (task === "parity") {
    let p = 0;
    for (let i = 0; i < seq.length; i++) p ^= seq[i] & 1;
    return p;
  }
  return isBalanced(seq) ? 1 : 0;
}

function balancedString(T: number, r: () => number): number[] {
  // Random walk that must still be able to return to zero: open if forced, close if forced, else coin flip.
  const out: number[] = [];
  let depth = 0;
  for (let i = 0; i < T; i++) {
    const left = T - i;
    let open: boolean;
    if (depth === 0) open = true;
    else if (depth >= left) open = false;
    else open = r() < 0.5;
    out.push(open ? 0 : 1);
    depth += open ? 1 : -1;
  }
  return out;
}

export function makeRunes(n: number, task: RuneTask, T: number, seed = 21): RuneSet {
  if (T < 2) throw new Error("Runes need T >= 2");
  if (task === "brackets" && T % 2 !== 0) throw new Error("brackets needs an even T");
  const r = rng(seed);
  const vocab = RUNE_VOCAB[task];
  const x = new Int32Array(n * T);
  const y = new Int32Array(n);
  for (let i = 0; i < n; i++) {
    let seq: number[];
    if (task === "brackets") {
      seq = balancedString(T, r);
      if (r() < 0.5) {
        // Make a negative: flip 1-2 positions, retry until it is really unbalanced.
        for (;;) {
          const cand = seq.slice();
          const flips = 1 + Math.floor(r() * 2);
          for (let f = 0; f < flips; f++) {
            const j = Math.floor(r() * T);
            cand[j] ^= 1;
          }
          if (!isBalanced(cand)) { seq = cand; break; }
        }
      }
    } else {
      seq = Array.from({ length: T }, () => Math.floor(r() * vocab));
    }
    for (let t = 0; t < T; t++) x[i * T + t] = seq[t];
    y[i] = runeLabel(task, seq);
  }
  return { x, y, n, T, vocab, classes: RUNE_CLASSES[task], task };
}

/** One-hot encode a sequence batch to a (n, T, vocab) Float32Array for numpy/TS models. */
export function oneHotRunes(s: RuneSet): Float32Array {
  const out = new Float32Array(s.n * s.T * s.vocab);
  for (let i = 0; i < s.n * s.T; i++) out[i * s.vocab + s.x[i]] = 1;
  return out;
}
