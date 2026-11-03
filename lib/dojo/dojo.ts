/** The coding battle (GDD 5.6): Scout → Strategise → Code → Judge → Debrief. Pure state machine. */
export type Phase = "scout" | "strategise" | "code" | "debrief";

export const MAX_HEARTS = 3;

export interface DojoState {
  phase: Phase;
  hearts: number;
  /** wrong Strategise picks (the plan is a cheap, ungraded-by-hearts check) */
  planMisses: number;
  planned: boolean;
  /** failed Submit verdicts (compile errors are free) */
  failedSubmits: number;
  hintsUsed: number;
  solved: boolean;
  /** true when the pass came after a hint or the plan was revealed */
  assisted: boolean;
}

export const initial = (): DojoState => ({ phase: "scout", hearts: MAX_HEARTS, planMisses: 0, planned: false, failedSubmits: 0, hintsUsed: 0, solved: false, assisted: false });

export type Action =
  | { type: "scouted" }
  | { type: "plan"; correct: boolean }
  | { type: "hint" }
  | { type: "submit"; verdict: "AC" | "WA" | "RE" | "TLE" | "OLE" | "CE" }
  | { type: "retry" };

export function step(s: DojoState, a: Action): DojoState {
  switch (a.type) {
    case "scouted":
      return s.phase === "scout" ? { ...s, phase: "strategise" } : s;
    case "plan":
      if (s.phase !== "strategise") return s;
      return a.correct ? { ...s, phase: "code", planned: true } : { ...s, planMisses: s.planMisses + 1 };
    case "hint":
      return s.phase === "code" ? { ...s, hintsUsed: s.hintsUsed + 1, assisted: true } : s;
    case "submit": {
      if (s.phase !== "code" || s.hearts === 0) return s;
      if (a.verdict === "CE") return s;
      if (a.verdict === "AC") return { ...s, phase: "debrief", solved: true };
      const hearts = s.hearts - 1;
      const failedSubmits = s.failedSubmits + 1;
      return hearts === 0 ? { ...s, hearts, failedSubmits, phase: "debrief" } : { ...s, hearts, failedSubmits };
    }
    case "retry":
      // only an unsolved debrief can be retried, and it restores one fresh try
      return s.phase === "debrief" && !s.solved ? { ...s, phase: "code", hearts: MAX_HEARTS, assisted: true } : s;
  }
}

/** Interview-style grade shown in the Debrief. Hints and a retry after running out of hearts cap it. */
export function grade(s: DojoState): "clean" | "good" | "assisted" | "unsolved" {
  if (!s.solved) return "unsolved";
  if (s.assisted) return "assisted";
  return s.failedSubmits === 0 && s.planMisses === 0 ? "clean" : "good";
}
