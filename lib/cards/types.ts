/** Card model. Every answer is data a test can check; generated cards get their answers from `lib/solvers`. */

export interface CardBase {
  id: string;
  /** Curriculum topic id (CUR), used for mastery later. */
  topic: string;
  prompt: string;
  /** Shown after answering, right or wrong. Original wording, states the why. */
  explanation: string;
}

export interface McqCard extends CardBase {
  kind: "mcq";
  /** Flavour label for the card header; behaviour is identical. */
  variant?: "technique" | "tradeoff";
  choices: string[];
  answer: number;
}

export interface CurveCard extends CardBase {
  kind: "curve";
  /** Per-epoch losses from a real training run (see `curves.ts`), downsampled for display. */
  curves: { train: number[]; val: number[]; epochs: number };
  choices: string[];
  answer: number;
}

export interface MultiCard extends CardBase {
  kind: "multi";
  choices: string[];
  /** Sorted indices of every correct choice; all must be picked and none else. */
  answers: number[];
}

export interface DeriveCard extends CardBase {
  kind: "derive";
  /** Labels for each number the player enters (e.g. "dz[0]", "dz[1]"). */
  fields: string[];
  answers: number[];
  /** Absolute tolerance per field, also used relative to magnitude (whichever is looser). */
  tol: number;
}

export interface ShapeCard extends CardBase {
  kind: "shape";
  /** Expected shape, or null when the correct answer is "this raises an error". */
  answer: number[] | null;
}

export interface MetricCard extends CardBase {
  kind: "metric";
  /** Table rendered above the prompt. */
  table: { head: string[]; rows: (string | number)[][] };
  answer: number;
  /** Decimal places the answer is judged to. */
  places: number;
}

export interface BugCard extends CardBase {
  kind: "bug";
  /** Code lines shown with numbers from 1. */
  code: string[];
  /** 1-based line holding the bug. */
  line: number;
}

export type Card = McqCard | MultiCard | DeriveCard | ShapeCard | MetricCard | BugCard | CurveCard;

export type Response =
  | { kind: "mcq"; choice: number }
  | { kind: "multi"; choices: number[] }
  | { kind: "derive"; values: number[] }
  | { kind: "shape"; shape: number[] | null }
  | { kind: "metric"; value: number }
  | { kind: "bug"; line: number }
  | { kind: "curve"; choice: number };

export interface Verdict {
  correct: boolean;
  /** Short reason when the response was malformed or wrong in a teachable way. */
  note?: string;
}
