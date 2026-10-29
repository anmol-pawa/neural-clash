/**
 * Dialogue scripts as data, plus a runner with a typewriter.
 *
 * A script is a graph of nodes. `say` shows a line (speaker, optional portrait
 * and mood), `choice` offers options (hidden when their `requires` flag is not
 * set), `set` / `branch` write and read flags, and `do` hands an effect name to
 * the game (give an item, start a battle). The runner never touches the DOM,
 * the clock or storage: the caller feeds it time and reads flags it owns.
 */

export type FlagValue = boolean | number | string;
export type Flags = Record<string, FlagValue>;

export interface SayNode {
  kind: "say";
  /** Speaker label; omit for narration. */
  speaker?: string;
  /** Portrait sprite id (see the roster). */
  portrait?: string;
  /** Portrait animation to rest on once the line is fully shown (default `idle`). */
  mood?: string;
  text: string;
  next?: string;
}
export interface ChoiceNode {
  kind: "choice";
  options: { label: string; next: string; requires?: string }[];
}
export interface SetNode {
  kind: "set";
  flag: string;
  value?: FlagValue;
  next?: string;
}
export interface BranchNode {
  kind: "branch";
  flag: string;
  /** Taken when the flag is truthy. */
  then: string;
  otherwise: string;
}
export interface DoNode {
  kind: "do";
  effect: string;
  next?: string;
}
export type DialogueNode = SayNode | ChoiceNode | SetNode | BranchNode | DoNode;

export interface DialogueScript {
  start: string;
  nodes: Readonly<Record<string, DialogueNode>>;
}

/** Problems with a script (dangling targets, missing start, empty choices); empty when valid. */
export function validateScript(script: DialogueScript): string[] {
  const errs: string[] = [];
  const has = (id: string | undefined) => id === undefined || id in script.nodes;
  if (!(script.start in script.nodes)) errs.push(`start "${script.start}" is not a node`);
  for (const [id, n] of Object.entries(script.nodes)) {
    if (n.kind === "choice") {
      if (n.options.length === 0) errs.push(`${id}: choice has no options`);
      for (const o of n.options) if (!has(o.next)) errs.push(`${id}: option "${o.label}" -> unknown "${o.next}"`);
    } else if (n.kind === "branch") {
      if (!has(n.then)) errs.push(`${id}: then -> unknown "${n.then}"`);
      if (!has(n.otherwise)) errs.push(`${id}: otherwise -> unknown "${n.otherwise}"`);
    } else if (!has(n.next)) errs.push(`${id}: next -> unknown "${n.next}"`);
    if (n.kind === "say" && n.text.trim() === "") errs.push(`${id}: empty text`);
  }
  return errs;
}

/** What the UI should show right now. */
export type DialogueView =
  | { kind: "say"; speaker?: string; portrait?: string; mood: string; shown: string; done: boolean }
  | { kind: "choice"; options: { label: string; index: number }[] }
  | { kind: "end" };

const MAX_AUTO_STEPS = 64;

export class DialogueRunner {
  private nodeId: string | null;
  private chars = 0;
  /** Effects raised so far, in order (drained by the caller). */
  readonly effects: string[] = [];

  /** `flags` is read and written in place; the caller owns it. */
  constructor(
    private readonly script: DialogueScript,
    private readonly flags: Flags,
    /** Typewriter speed. */
    private readonly charsPerSecond = 45,
  ) {
    this.nodeId = script.start;
    this.settle();
  }

  /** Runs silent nodes (set / branch / do) until a visible one or the end. */
  private settle(): void {
    for (let i = 0; i < MAX_AUTO_STEPS && this.nodeId !== null; i++) {
      const n = this.script.nodes[this.nodeId];
      if (!n) {
        this.nodeId = null;
        return;
      }
      if (n.kind === "set") {
        this.flags[n.flag] = n.value ?? true;
        this.nodeId = n.next ?? null;
      } else if (n.kind === "branch") {
        this.nodeId = this.flags[n.flag] ? n.then : n.otherwise;
      } else if (n.kind === "do") {
        this.effects.push(n.effect);
        this.nodeId = n.next ?? null;
      } else {
        this.chars = 0;
        return;
      }
    }
    if (this.nodeId !== null && this.script.nodes[this.nodeId]?.kind !== "say" && this.script.nodes[this.nodeId]?.kind !== "choice") this.nodeId = null;
  }

  get finished(): boolean {
    return this.nodeId === null;
  }

  private visibleOptions(n: ChoiceNode) {
    return n.options.filter((o) => !o.requires || !!this.flags[o.requires]);
  }

  view(): DialogueView {
    const n = this.nodeId === null ? undefined : this.script.nodes[this.nodeId];
    if (!n) return { kind: "end" };
    if (n.kind === "choice") return { kind: "choice", options: this.visibleOptions(n).map((o, index) => ({ label: o.label, index })) };
    if (n.kind !== "say") return { kind: "end" };
    const done = this.chars >= n.text.length;
    return {
      kind: "say",
      speaker: n.speaker,
      portrait: n.portrait,
      mood: done ? (n.mood ?? "idle") : "talk",
      shown: n.text.slice(0, Math.floor(this.chars)),
      done,
    };
  }

  /** Advances the typewriter by `dtMs`. */
  tick(dtMs: number): void {
    const n = this.nodeId === null ? undefined : this.script.nodes[this.nodeId];
    if (n?.kind === "say") this.chars = Math.min(n.text.length, this.chars + (dtMs / 1000) * this.charsPerSecond);
  }

  /** Confirm: finish the line if it is still typing, otherwise go on. Ignored on a choice. */
  advance(): void {
    const n = this.nodeId === null ? undefined : this.script.nodes[this.nodeId];
    if (n?.kind !== "say") return;
    if (this.chars < n.text.length) {
      this.chars = n.text.length;
      return;
    }
    this.nodeId = n.next ?? null;
    this.settle();
  }

  /** Picks the `index`th option as listed in the view; ignored when it is not offered. */
  choose(index: number): void {
    const n = this.nodeId === null ? undefined : this.script.nodes[this.nodeId];
    if (n?.kind !== "choice") return;
    const opt = this.visibleOptions(n)[index];
    if (!opt) return;
    this.nodeId = opt.next;
    this.settle();
  }
}
