import { answer as answerCard, next as nextCard, startBattle, summarize, type BattleConfig, type BattleState, type Summary } from "@/lib/battle/battle";
import type { Card, Response } from "@/lib/cards/types";
import { fightOverfit, type RevealResult } from "@/lib/train/revealBattle";
import type { CompanionStats } from "@/lib/labs/companion";

/**
 * The Python Port guardian (GDD §5.4): three phases, each testing a different skill.
 *   1. cards    - theory duel on the Python Port deck (can you read Python?)
 *   2. lab      - a judged mini-task (can you write it?)
 *   3. training - the hidden-set fight vs Overfit's minion (can you build something that generalises?)
 * Pure and deterministic; the UI feeds it answers, the lab verdict and the companion stats.
 */

export const GUARDIAN_ID = "guardian:python-port";
export const GUARDIAN_NAME = "Warden Indent";

export type GuardianPhase = "cards" | "lab" | "training" | "won" | "lost";

export const GUARDIAN_CARD_CONFIG: Partial<BattleConfig> = { foeHp: 100, playerHp: 5, attack: 20 };

export interface GuardianState {
  phase: GuardianPhase;
  /** Which phase the player was in when they lost (for the retry message). */
  lostIn: Exclude<GuardianPhase, "won" | "lost"> | null;
  cards: BattleState;
  labId: string;
  labPassed: boolean;
  /** Lab submissions that failed, so the UI can offer hints after a few. */
  labAttempts: number;
  fight: RevealResult | null;
}

export function startGuardian(deck: readonly Card[], labId: string): GuardianState {
  return { phase: "cards", lostIn: null, cards: startBattle(deck, GUARDIAN_CARD_CONFIG), labId, labPassed: false, labAttempts: 0, fight: null };
}

/** Phase 1: answer the current card; a knockout opens phase 2, running out of hearts ends the run. */
export function guardianAnswer(s: GuardianState, r: Response): GuardianState {
  if (s.phase !== "cards") return s;
  return syncCards(s, answerCard(s.cards, r));
}

export function guardianNext(s: GuardianState): GuardianState {
  if (s.phase !== "cards") return s;
  return syncCards(s, nextCard(s.cards));
}

function syncCards(s: GuardianState, cards: BattleState): GuardianState {
  // The card battle stays on "won"/"lost" until we move on; the guardian advances immediately after feedback.
  if (cards.phase === "lost") return { ...s, cards, phase: "lost", lostIn: "cards" };
  return { ...s, cards };
}

/** Moves from a won card battle into the lab phase (after the player has seen the last feedback). */
export function guardianAdvanceFromCards(s: GuardianState): GuardianState {
  if (s.phase !== "cards" || s.cards.phase !== "won") return s;
  return { ...s, phase: "lab" };
}

/** Phase 2: report a Submit result. A pass opens the training fight; failures just count. */
export function guardianLabResult(s: GuardianState, passed: boolean): GuardianState {
  if (s.phase !== "lab") return s;
  return passed ? { ...s, labPassed: true, phase: "training" } : { ...s, labAttempts: s.labAttempts + 1 };
}

/** Phase 3: fight with the companion's measured stats. A loss sends the player back to the Training Grounds, not to the start. */
export function guardianFight(s: GuardianState, stats: CompanionStats): GuardianState {
  if (s.phase !== "training") return s;
  const fight = fightOverfit(stats);
  return fight.won ? { ...s, fight, phase: "won" } : { ...s, fight, lostIn: "training" };
}

export interface GuardianSummary {
  cleared: boolean;
  cards: Summary;
  badge: string | null;
}

export function summarizeGuardian(s: GuardianState, badge = "Indent Badge"): GuardianSummary {
  const cleared = s.phase === "won";
  return { cleared, cards: summarize(s.cards), badge: cleared ? badge : null };
}

/** 1-based phase number and label for the progress strip. */
export const PHASES: readonly { key: "cards" | "lab" | "training"; label: string }[] = [
  { key: "cards", label: "Read" },
  { key: "lab", label: "Write" },
  { key: "training", label: "Generalise" },
];

export function phaseProgress(s: GuardianState): number {
  if (s.phase === "won") return 3;
  if (s.phase === "lost") return PHASES.findIndex((p) => p.key === s.lostIn);
  return PHASES.findIndex((p) => p.key === s.phase);
}

/** What survives leaving the page (e.g. a trip to the Training Grounds): which trials are already behind the player. */
export interface GuardianProgress {
  cards: boolean;
  lab: boolean;
}

export function progressOf(s: GuardianState): GuardianProgress {
  return { cards: s.phase === "lab" || s.phase === "training" || s.phase === "won" || s.labPassed, lab: s.labPassed };
}

/** Rebuilds a run from saved progress. Cleared trials stay cleared; the training fight always has to be fought. */
export function resumeGuardian(deck: readonly Card[], labId: string, p: GuardianProgress | null): GuardianState {
  const fresh = startGuardian(deck, labId);
  if (!p || !p.cards) return fresh;
  const cards = { ...fresh.cards, foeHp: 0, current: null, phase: "won" as const };
  return p.lab ? { ...fresh, cards, labPassed: true, phase: "training" } : { ...fresh, cards, phase: "lab" };
}
