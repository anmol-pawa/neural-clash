import { gradeCard, type Answer, type Card } from "./cards";

export interface BattleConfig {
  /** Enemy hit points; each correct answer deals damage. */
  enemyHp: number;
  /** Player (companion) hit points; each wrong answer costs one counter hit. */
  playerHp: number;
  /** Damage to the enemy for a correct answer, before the streak bonus. */
  attack: number;
  /** Damage to the player for a wrong answer. */
  counter: number;
}

export const DEFAULT_CONFIG: BattleConfig = { enemyHp: 100, playerHp: 60, attack: 20, counter: 15 };

export interface BattleState {
  cfg: BattleConfig;
  queue: Card[];
  /** Index of the current card in `queue`. */
  index: number;
  enemyHp: number;
  playerHp: number;
  streak: number;
  bestStreak: number;
  /** Cards answered wrong, to be retried at the end of the queue (once each). */
  missed: string[];
  history: { id: string; topic: string; correct: boolean }[];
  phase: "asking" | "feedback" | "won" | "lost";
  last: { correct: boolean; damage: number; crit: boolean } | null;
}

export function startBattle(cards: readonly Card[], cfg: BattleConfig = DEFAULT_CONFIG): BattleState {
  if (cards.length === 0) throw new Error("a battle needs at least one card");
  return {
    cfg, queue: [...cards], index: 0, enemyHp: cfg.enemyHp, playerHp: cfg.playerHp, streak: 0, bestStreak: 0,
    missed: [], history: [], phase: "asking", last: null,
  };
}

/** Streak of 3+ gives a 50 % critical hit. Pure and deterministic, so it is easy to test and to explain. */
export function damageFor(cfg: BattleConfig, streakBefore: number): { damage: number; crit: boolean } {
  const crit = streakBefore + 1 >= 3;
  return { damage: Math.round(cfg.attack * (crit ? 1.5 : 1)), crit };
}

export const currentCard = (s: BattleState): Card | null => (s.phase === "asking" ? (s.queue[s.index] ?? null) : null);

/** Applies an answer to the current card. Returns the same state object when it is not in the asking phase. */
export function answer(s: BattleState, a: Answer): BattleState {
  const card = currentCard(s);
  if (!card) return s;
  const correct = gradeCard(card, a);
  const { damage, crit } = correct ? damageFor(s.cfg, s.streak) : { damage: s.cfg.counter, crit: false };
  const streak = correct ? s.streak + 1 : 0;
  const enemyHp = correct ? Math.max(0, s.enemyHp - damage) : s.enemyHp;
  const playerHp = correct ? s.playerHp : Math.max(0, s.playerHp - damage);
  const queue = [...s.queue];
  const missed = [...s.missed];
  // A missed card comes back once at the end, so a wrong answer is a learning event, not just a penalty.
  if (!correct && !missed.includes(card.id)) {
    missed.push(card.id);
    queue.push(card);
  }
  const phase = enemyHp === 0 ? "won" : playerHp === 0 ? "lost" : "feedback";
  return {
    ...s, queue, missed, enemyHp, playerHp, streak, bestStreak: Math.max(s.bestStreak, streak),
    history: [...s.history, { id: card.id, topic: card.topic, correct }], phase, last: { correct, damage, crit },
  };
}

/** Moves from feedback to the next card. When the queue is exhausted the enemy is "worn down": a win only if the player is ahead on HP. */
export function next(s: BattleState): BattleState {
  if (s.phase !== "feedback") return s;
  const index = s.index + 1;
  if (index >= s.queue.length) {
    const enemyFrac = s.enemyHp / s.cfg.enemyHp;
    const playerFrac = s.playerHp / s.cfg.playerHp;
    return { ...s, index, phase: playerFrac >= enemyFrac ? "won" : "lost" };
  }
  return { ...s, index, phase: "asking" };
}

export interface BattleSummary {
  won: boolean;
  correct: number;
  total: number;
  bestStreak: number;
  /** Topics to review: those answered wrong at least once, most-missed first. */
  weakTopics: string[];
}

export function summarize(s: BattleState): BattleSummary {
  const misses = new Map<string, number>();
  for (const h of s.history) if (!h.correct) misses.set(h.topic, (misses.get(h.topic) ?? 0) + 1);
  return {
    won: s.phase === "won", correct: s.history.filter((h) => h.correct).length, total: s.history.length, bestStreak: s.bestStreak,
    weakTopics: [...misses.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).map(([t]) => t),
  };
}
