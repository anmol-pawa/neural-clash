/**
 * Hidden-set reveal duel (GDD §5.3): the companion's *measured* stats fight a noise minion.
 * Pure and deterministic (no RNG, no DOM) so the same stats always give the same fight.
 *
 * Why these rules teach something:
 *  - Attack (test R² / accuracy-like) sets how hard you hit, so a model that fails the hidden set is weak.
 *  - Defence (small train-to-test gap) sets how much of the minion's hit you absorb: a memoriser
 *    looks fine in training and gets crushed here, which is the lesson of overfitting.
 *  - Speed (cheap inference) decides who strikes first each round.
 */
import type { CompanionStats } from "@/lib/labs/companion";

export interface Foe {
  name: string;
  hp: number;
  /** Raw hit on a companion with 0 defence. */
  hit: number;
  /** Flat reduction of the player's hits (a noisy foe soaks some damage). */
  armour: number;
  /** Compared with the companion's speed to decide who moves first. */
  speed: number;
}

/** The Python Port minion: soft against a good model, brutal against a memoriser. */
export const OVERFIT_MINION: Foe = { name: "Overfit minion", hp: 100, hit: 16, armour: 2, speed: 40 };

export const PLAYER_HP = 60;
export const MAX_ROUNDS = 40;

export interface DuelEvent {
  round: number;
  actor: "companion" | "foe";
  damage: number;
  companionHp: number;
  foeHp: number;
}

export interface DuelResult {
  won: boolean;
  /** "ko" means someone fell; "timeout" means a stalemate (the companion hit too softly to finish). */
  ending: "ko" | "timeout";
  rounds: number;
  events: DuelEvent[];
  companionHp: number;
  foeHp: number;
  firstStrike: "companion" | "foe";
}

/** Damage per companion hit: 3 at attack 0 up to 23 at attack 100, minus the foe's armour (min 1). */
export function companionHit(attack: number, foe: Foe = OVERFIT_MINION): number {
  return Math.max(1, Math.round(3 + attack * 0.2) - foe.armour);
}

/** Damage per foe hit: full at defence 0, a quarter at defence 100 (always at least 1). */
export function foeHit(defence: number, foe: Foe = OVERFIT_MINION): number {
  return Math.max(1, Math.round(foe.hit * (1 - 0.75 * (defence / 100))));
}

export function simulateDuel(stats: CompanionStats, foe: Foe = OVERFIT_MINION): DuelResult {
  const mine = companionHit(stats.attack, foe);
  const theirs = foeHit(stats.defence, foe);
  const firstStrike = stats.speed >= foe.speed ? "companion" : "foe";
  const order: ("companion" | "foe")[] = firstStrike === "companion" ? ["companion", "foe"] : ["foe", "companion"];
  let companionHp = PLAYER_HP;
  let foeHp = foe.hp;
  const events: DuelEvent[] = [];
  let round = 0;
  while (round < MAX_ROUNDS && companionHp > 0 && foeHp > 0) {
    round++;
    for (const actor of order) {
      if (companionHp <= 0 || foeHp <= 0) break;
      if (actor === "companion") {
        foeHp = Math.max(0, foeHp - mine);
        events.push({ round, actor, damage: mine, companionHp, foeHp });
      } else {
        companionHp = Math.max(0, companionHp - theirs);
        events.push({ round, actor, damage: theirs, companionHp, foeHp });
      }
    }
  }
  const ko = companionHp <= 0 || foeHp <= 0;
  return { won: foeHp <= 0 && companionHp > 0, ending: ko ? "ko" : "timeout", rounds: round, events, companionHp, foeHp, firstStrike };
}
