import type { Card, Response, Verdict } from "./types";

const same = (a: readonly number[], b: readonly number[]) => a.length === b.length && a.every((v, i) => v === b[i]);

export const within = (got: number, want: number, tol: number): boolean =>
  Number.isFinite(got) && Math.abs(got - want) <= Math.max(tol, tol * Math.abs(want));

/** Checks a response against a card. A response of the wrong kind is simply wrong, never a throw. */
export function check(card: Card, r: Response): Verdict {
  if (r.kind !== card.kind) return { correct: false, note: "wrong kind of answer" };
  switch (card.kind) {
    case "mcq":
      return { correct: (r as Extract<Response, { kind: "mcq" }>).choice === card.answer };
    case "multi": {
      const picked = [...new Set((r as Extract<Response, { kind: "multi" }>).choices)].sort((a, b) => a - b);
      return { correct: same(picked, card.answers) };
    }
    case "derive": {
      const v = (r as Extract<Response, { kind: "derive" }>).values;
      if (v.length !== card.answers.length) return { correct: false, note: `enter all ${card.answers.length} values` };
      return { correct: v.every((x, i) => within(x, card.answers[i], card.tol)) };
    }
    case "shape": {
      const s = (r as Extract<Response, { kind: "shape" }>).shape;
      if (card.answer === null) return { correct: s === null };
      return { correct: s !== null && same(s, card.answer) };
    }
    case "metric": {
      const x = (r as Extract<Response, { kind: "metric" }>).value;
      const half = 0.5 * 10 ** -card.places;
      return { correct: Number.isFinite(x) && Math.abs(x - card.answer) <= half + 1e-12 };
    }
    case "bug":
      return { correct: (r as Extract<Response, { kind: "bug" }>).line === card.line };
  }
}

/** Parses "(3, 4)", "3,4", "[3 4]", or "error" into a shape answer; undefined when unparseable. */
export function parseShape(text: string): number[] | null | undefined {
  const t = text.trim().toLowerCase();
  if (/^(error|err|raises|invalid|none)$/.test(t)) return null;
  const parts = t.replace(/[()[\]]/g, " ").split(/[\s,]+/).filter(Boolean);
  if (parts.length === 0 && /^[([]\s*[)\]]$/.test(t)) return [];
  if (parts.length === 0) return undefined;
  const nums = parts.map(Number);
  return nums.every((n) => Number.isInteger(n) && n >= 0) ? nums : undefined;
}
