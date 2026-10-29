import type { Shape } from "@/lib/solvers/shapes";

interface CardBase {
  id: string;
  /** Topic tag used for spaced repetition and mastery. */
  topic: string;
  prompt: string;
  /** Shown after answering, right or wrong. */
  explain: string;
}

export interface McqCard extends CardBase {
  kind: "mcq";
  options: string[];
  answer: number;
}

/** Numeric entry; correct when |x - answer| <= tol (absolute) after parsing. */
export interface DeriveCard extends CardBase {
  kind: "derive";
  answer: number;
  tol: number;
  unit?: string;
}

/** The player types a shape such as "(3, 4)", or "error" if the operation fails. */
export interface ShapeCard extends CardBase {
  kind: "shape";
  answer: Shape | "error";
}

export interface MetricCard extends CardBase {
  kind: "metric";
  answer: number;
  tol: number;
}

/** Click the buggy line of a snippet. */
export interface BugCard extends CardBase {
  kind: "bug";
  code: string[];
  buggyLine: number;
}

export type Card = McqCard | DeriveCard | ShapeCard | MetricCard | BugCard;

export type Answer = { kind: "choice"; index: number } | { kind: "text"; text: string } | { kind: "line"; index: number };

/** Parses "(2, 3)", "2,3", "[2 3]" and "()" into a shape; null if it is not one. */
export function parseShape(text: string): number[] | null {
  const body = text.trim().replace(/^[([]|[)\]]$/g, "").trim();
  if (body === "") return /^[([]\s*[)\]]$/.test(text.trim()) ? [] : null;
  const parts = body.split(/[\s,]+/).filter(Boolean);
  const nums = parts.map(Number);
  return nums.every((n) => Number.isInteger(n) && n >= 0) ? nums : null;
}

export function parseNumber(text: string): number | null {
  const t = text.trim().replace(/,/g, "");
  if (t === "" || !/^[-+]?(\d+\.?\d*|\.\d+)(e[-+]?\d+)?$/i.test(t)) return null;
  return Number(t);
}

/** Grades an answer. Unparseable input is wrong, never a throw. */
export function gradeCard(card: Card, answer: Answer): boolean {
  switch (card.kind) {
    case "mcq":
      return answer.kind === "choice" && answer.index === card.answer;
    case "bug":
      return answer.kind === "line" && answer.index === card.buggyLine;
    case "derive":
    case "metric": {
      if (answer.kind !== "text") return false;
      const x = parseNumber(answer.text);
      return x !== null && Math.abs(x - card.answer) <= card.tol;
    }
    case "shape": {
      if (answer.kind !== "text") return false;
      if (card.answer === "error") return /^\s*(error|invalid|fails?)\s*$/i.test(answer.text);
      const s = parseShape(answer.text);
      return s !== null && s.length === card.answer.length && s.every((d, i) => d === (card.answer as Shape)[i]);
    }
  }
}
