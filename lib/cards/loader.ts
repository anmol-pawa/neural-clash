import { GENERATORS, type GeneratorId } from "./generators";
import type { Card } from "./types";

/** A deck file: hand-written cards plus references to seeded generators. */
export interface DeckFile {
  id: string;
  title: string;
  cards: unknown[];
  generate?: { generator: string; seeds: number[] }[];
}

export interface LoadedDeck {
  id: string;
  title: string;
  cards: Card[];
  errors: string[];
}

const isStr = (v: unknown): v is string => typeof v === "string" && v.trim().length > 0;
const isStrs = (v: unknown, min: number): v is string[] => Array.isArray(v) && v.length >= min && v.every(isStr);
const isInts = (v: unknown): v is number[] => Array.isArray(v) && v.every((n) => Number.isInteger(n));

/** Returns the problems with one hand-written card, or an empty list when it is well formed. */
export function validateCard(c: unknown): string[] {
  if (typeof c !== "object" || c === null) return ["not an object"];
  const x = c as Record<string, unknown>;
  const errs: string[] = [];
  for (const f of ["id", "topic", "prompt", "explanation"]) if (!isStr(x[f])) errs.push(`missing ${f}`);
  switch (x.kind) {
    case "mcq":
    case "curve":
      if (!isStrs(x.choices, 2)) errs.push("choices must be 2+ non-empty strings");
      else if (!Number.isInteger(x.answer) || (x.answer as number) < 0 || (x.answer as number) >= x.choices.length) errs.push("answer out of range");
      else if (new Set(x.choices).size !== x.choices.length) errs.push("duplicate choices");
      if (x.variant !== undefined && x.variant !== "technique" && x.variant !== "tradeoff") errs.push("bad variant");
      break;
    case "multi":
      if (!isStrs(x.choices, 2)) errs.push("choices must be 2+ non-empty strings");
      else if (!isInts(x.answers) || x.answers.length === 0 || x.answers.some((a) => a < 0 || a >= (x.choices as string[]).length)) errs.push("answers out of range");
      break;
    case "derive":
      if (!isStrs(x.fields, 1) || !Array.isArray(x.answers) || x.answers.length !== x.fields.length || !(typeof x.tol === "number" && x.tol > 0)) errs.push("derive needs fields, matching answers and tol > 0");
      break;
    case "bug":
      if (!isStrs(x.code, 1) || !Number.isInteger(x.line) || (x.line as number) < 1 || (x.line as number) > (x.code as string[]).length) errs.push("bug line outside code");
      break;
    default:
      errs.push(`card kind "${String(x.kind)}" cannot be hand-written (shape/metric cards are generated)`);
  }
  return errs;
}

/** Loads a deck file, never throwing: bad cards are dropped and reported in `errors`. */
export function loadDeck(file: DeckFile): LoadedDeck {
  const errors: string[] = [];
  const cards: Card[] = [];
  const ids = new Set<string>();
  const add = (c: Card, where: string) => {
    if (ids.has(c.id)) errors.push(`${where}: duplicate id ${c.id}`);
    else {
      ids.add(c.id);
      cards.push(c);
    }
  };
  (file.cards ?? []).forEach((c, i) => {
    const errs = validateCard(c);
    if (errs.length) errors.push(`card ${i}${isStr((c as { id?: unknown })?.id) ? ` (${(c as Card).id})` : ""}: ${errs.join("; ")}`);
    else add(c as Card, `card ${i}`);
  });
  for (const g of file.generate ?? []) {
    const gen = (GENERATORS as Record<string, (seed: number) => Card>)[g.generator as GeneratorId];
    if (!gen) errors.push(`unknown generator ${g.generator}`);
    else for (const seed of g.seeds) add(gen(seed), `generator ${g.generator}`);
  }
  return { id: file.id, title: file.title, cards, errors };
}
