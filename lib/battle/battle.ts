import { check } from "@/lib/cards/check";
import type { Card, Response } from "@/lib/cards/types";

/**
 * Theory card battle (GDD 5.1): correct answers attack, wrong ones take a counter-hit plus an
 * explanation. Pure state machine; the stage in `game/` only renders its events.
 */

export interface BattleConfig {
  foeHp: number;
  playerHp: number;
  /** Damage dealt by a correct answer before streak bonus. */
  attack: number;
  /** Damage taken on a wrong answer. */
  counter: number;
  /** Extra damage per consecutive correct answer, capped by `maxStreakBonus`. */
  streakBonus: number;
  maxStreakBonus: number;
}

export const DEFAULT_CONFIG: BattleConfig = {
  foeHp: 100,
  playerHp: 5,
  attack: 20,
  counter: 1,
  streakBonus: 5,
  maxStreakBonus: 15,
};

export type Phase = "asking" | "feedback" | "won" | "lost";

export interface BattleState {
  config: BattleConfig;
  /** Cards still to come; a missed card is requeued a few turns later. */
  queue: Card[];
  current: Card | null;
  foeHp: number;
  playerHp: number;
  streak: number;
  bestStreak: number;
  answered: number;
  correct: number;
  phase: Phase;
  /** Result of the last answer, shown during `feedback`. */
  last: { card: Card; correct: boolean; damage: number; taken: number } | null;
  /** Card ids answered correctly first try, for mastery later. */
  firstTryCorrect: string[];
  missed: string[];
}

/** How many cards later a missed card returns (clamped to the queue length). */
export const REQUEUE_GAP = 3;

export function startBattle(deck: readonly Card[], config: Partial<BattleConfig> = {}): BattleState {
  if (deck.length === 0) throw new RangeError("a battle needs at least one card");
  const cfg = { ...DEFAULT_CONFIG, ...config };
  return {
    config: cfg,
    queue: deck.slice(1),
    current: deck[0],
    foeHp: cfg.foeHp,
    playerHp: cfg.playerHp,
    streak: 0,
    bestStreak: 0,
    answered: 0,
    correct: 0,
    phase: "asking",
    last: null,
    firstTryCorrect: [],
    missed: [],
  };
}

export function damageFor(cfg: BattleConfig, streakBefore: number): number {
  return cfg.attack + Math.min(cfg.maxStreakBonus, streakBefore * cfg.streakBonus);
}

/** Answers the current card. Ignored unless a card is awaiting an answer. */
export function answer(s: BattleState, r: Response): BattleState {
  if (s.phase !== "asking" || !s.current) return s;
  const card = s.current;
  const v = check(card, r);
  const queue = [...s.queue];
  const seen = new Set([...s.firstTryCorrect, ...s.missed]);
  let { foeHp, playerHp, streak, firstTryCorrect, missed } = s;
  let damage = 0;
  let taken = 0;
  if (v.correct) {
    damage = damageFor(s.config, streak);
    foeHp = Math.max(0, foeHp - damage);
    streak += 1;
    if (!seen.has(card.id)) firstTryCorrect = [...firstTryCorrect, card.id];
  } else {
    taken = s.config.counter;
    playerHp = Math.max(0, playerHp - taken);
    streak = 0;
    if (!missed.includes(card.id)) missed = [...missed, card.id];
    queue.splice(Math.min(REQUEUE_GAP, queue.length), 0, card);
  }
  const phase: Phase = foeHp === 0 ? "won" : playerHp === 0 ? "lost" : "feedback";
  return {
    ...s,
    queue,
    foeHp,
    playerHp,
    streak,
    bestStreak: Math.max(s.bestStreak, streak),
    answered: s.answered + 1,
    correct: s.correct + (v.correct ? 1 : 0),
    phase,
    last: { card, correct: v.correct, damage, taken },
    firstTryCorrect,
    missed,
  };
}

/** Leaves feedback and draws the next card. If the queue runs dry with the foe standing, the deck recycles missed cards. */
export function next(s: BattleState): BattleState {
  if (s.phase !== "feedback") return s;
  const [head, ...rest] = s.queue;
  if (!head) {
    // Deck exhausted without a knockout: the foe is worn down, the player wins on points.
    return { ...s, current: null, phase: s.foeHp < s.config.foeHp / 2 ? "won" : "lost" };
  }
  return { ...s, current: head, queue: rest, phase: "asking" };
}

export interface Summary {
  won: boolean;
  accuracy: number;
  bestStreak: number;
  /** Stars 0-3 from accuracy and remaining hearts. */
  stars: number;
  missed: string[];
}

export function summarize(s: BattleState): Summary {
  const accuracy = s.answered === 0 ? 0 : s.correct / s.answered;
  const won = s.phase === "won";
  const stars = !won ? 0 : accuracy >= 0.9 && s.playerHp === s.config.playerHp ? 3 : accuracy >= 0.75 ? 2 : 1;
  return { won, accuracy, bestStreak: s.bestStreak, stars, missed: s.missed };
}
