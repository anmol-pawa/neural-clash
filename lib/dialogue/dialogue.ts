/**
 * Dialogue engine: scripts are graphs of lines with optional choices, flag
 * conditions and flag effects. Pure (no DOM, no timers): the UI feeds elapsed
 * time into `visibleChars` for the typewriter and calls `advance` / `choose`.
 */

export type Flags = Readonly<Record<string, boolean | number | string>>;

export interface Condition {
  flag: string;
  /** Compared with ===; a missing flag reads as `false`. Defaults to `true`. */
  is?: boolean | number | string;
}

export interface Choice {
  label: string;
  next: string | null;
  set?: Flags;
  /** Hidden unless this holds. */
  if?: Condition;
}

export interface Line {
  /** Speaker display name; omit for narration/signs. */
  speaker?: string;
  /** Portrait sprite id (see roster) and animation, e.g. `okafor-portrait` / `talk`. */
  portrait?: string;
  text: string;
  /** Next line id, or null/omitted to end. Ignored when `choices` is present. */
  next?: string | null;
  choices?: readonly Choice[];
  set?: Flags;
  /** Fallback branch: the first `branch` entry whose condition holds replaces `next`. */
  branch?: readonly { if: Condition; next: string | null }[];
}

export interface Script {
  id: string;
  start: string;
  lines: Readonly<Record<string, Line>>;
}

export interface DialogueState {
  script: Script;
  lineId: string;
  /** Flags as of now (script effects applied). */
  flags: Flags;
  done: boolean;
}

export function holds(c: Condition | undefined, flags: Flags): boolean {
  if (!c) return true;
  return (flags[c.flag] ?? false) === (c.is ?? true);
}

/** Structural problems (dangling `next`, unreachable lines, empty choices); empty when valid. */
export function validateScript(s: Script): string[] {
  const errs: string[] = [];
  const ids = new Set(Object.keys(s.lines));
  if (!ids.has(s.start)) errs.push(`${s.id}: start "${s.start}" missing`);
  const targets = (l: Line): (string | null | undefined)[] => [l.next, ...(l.choices ?? []).map((c) => c.next), ...(l.branch ?? []).map((b) => b.next)];
  const seen = new Set<string>();
  const walk = (id: string) => {
    if (seen.has(id) || !ids.has(id)) return;
    seen.add(id);
    for (const t of targets(s.lines[id])) if (t) walk(t);
  };
  walk(s.start);
  for (const [id, l] of Object.entries(s.lines)) {
    for (const t of targets(l)) if (t && !ids.has(t)) errs.push(`${s.id}.${id}: next "${t}" missing`);
    if (l.choices && l.choices.length === 0) errs.push(`${s.id}.${id}: empty choices`);
    if (!l.text.trim() && !(l.text === "" && l.branch)) errs.push(`${s.id}.${id}: empty text`);
    if (!seen.has(id)) errs.push(`${s.id}.${id}: unreachable`);
  }
  return errs;
}

/** Enter the line `id` (applying its flag effects). Null ends the dialogue. */
function enter(s: DialogueState, id: string | null, extra?: Flags): DialogueState {
  const flags = { ...s.flags, ...extra };
  if (id === null) return { ...s, flags, done: true };
  const line = s.script.lines[id];
  if (!line) throw new Error(`dialogue ${s.script.id}: no line "${id}"`);
  const entered = { ...s, lineId: id, flags: { ...flags, ...line.set }, done: false };
  // A router line (no text, only branches) is resolved immediately so the UI never shows a blank box.
  if (line.text === "" && line.branch) {
    const hit = line.branch.find((b) => holds(b.if, entered.flags));
    return enter(entered, hit ? hit.next : (line.next ?? null));
  }
  return entered;
}

export function startDialogue(script: Script, flags: Flags = {}): DialogueState {
  return enter({ script, lineId: script.start, flags, done: false }, script.start);
}

export const currentLine = (s: DialogueState): Line => s.script.lines[s.lineId];

/** Choices that are currently visible. */
export function visibleChoices(s: DialogueState): readonly Choice[] {
  return (currentLine(s).choices ?? []).filter((c) => holds(c.if, s.flags));
}

/** Move past a line with no choices. A line with choices needs `choose`. */
export function advance(s: DialogueState): DialogueState {
  if (s.done) return s;
  const line = currentLine(s);
  if (visibleChoices(s).length > 0) return s;
  const hit = line.branch?.find((b) => holds(b.if, s.flags));
  return enter(s, hit ? hit.next : (line.next ?? null));
}

export function choose(s: DialogueState, index: number): DialogueState {
  const c = visibleChoices(s)[index];
  if (s.done || !c) return s;
  return enter(s, c.next, c.set);
}

/** Typewriter: characters visible after `elapsedMs` at `cps` (grapheme-safe via code points). */
export function visibleChars(text: string, elapsedMs: number, cps = 45): number {
  const total = [...text].length;
  return Math.min(total, Math.max(0, Math.floor((elapsedMs / 1000) * cps)));
}

export const sliceChars = (text: string, n: number): string => [...text].slice(0, n).join("");
