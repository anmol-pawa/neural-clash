import type { CompanionStats } from "@/lib/labs/companion";

/**
 * Hidden-set reveal battle (GDD 5.3). The companion's measured stats decide a short, fully
 * deterministic fight against Overfit's minion, a foe that is weak against models that generalise
 * and brutal against memorisers:
 *   Attack  -> damage per hit; the minion is armoured (-10), so a near-chance model (a 55% classifier)
 *              barely scratches it and cannot win inside the round limit
 *   Defence -> how much of the minion's blow is absorbed (low defence = a big train/test gap)
 *   Speed   -> who acts first each round (cheap models strike first)
 * No randomness: the same stats always give the same fight, so a player can tune and re-fight.
 */
export interface Fighter {
  name: string;
  hp: number;
}

export const FOE_BASE_HP = 120;
export const PLAYER_BASE_HP = 100;
export const FOE_SPEED = 50;
const FOE_STRIKE = 30;
/** The minion flees after this many rounds: a model that cannot finish it in time has not learned enough. */
export const MAX_ROUNDS = 8;

export interface BattleEvent {
  round: number;
  actor: "you" | "foe";
  damage: number;
  /** HP of each side after this event. */
  youHp: number;
  foeHp: number;
}

export interface RevealResult {
  won: boolean;
  events: BattleEvent[];
  rounds: number;
  youHp: number;
  foeHp: number;
  /** A one-line lesson tied to the weakest stat. */
  lesson: string;
}

export const hitDamage = (attack: number) => Math.max(1, Math.round(0.4 * clampStat(attack) - 10));
export const foeDamage = (defence: number) => Math.max(1, Math.round(FOE_STRIKE * (1 - 0.85 * (clampStat(defence) / 100))));
const clampStat = (x: number) => Math.min(100, Math.max(0, Number.isFinite(x) ? x : 0));

export function lessonFor(s: CompanionStats): string {
  const weakest = Math.min(s.attack, s.defence, s.speed);
  if (weakest === s.defence && s.defence < 50) return "Low Defence: the minion hits hard because your model fits the training set far better than the hidden one. Fewer features, more data or an L2 penalty narrow that gap.";
  if (weakest === s.attack && s.attack < 50) return "Low Attack: the model is not learning the real pattern (underfitting). Add features the world needs, or train longer.";
  if (weakest === s.speed && s.speed < 50) return "Low Speed: a large model is expensive at inference. Spend parameters only where they buy hidden-set score.";
  return "A balanced companion: it scores well on unseen data, holds up against the minion, and is cheap to run.";
}

export function fightOverfit(stats: CompanionStats): RevealResult {
  const dealt = hitDamage(stats.attack);
  const taken = foeDamage(stats.defence);
  const youFirst = stats.speed >= FOE_SPEED;
  let youHp = PLAYER_BASE_HP;
  let foeHp = FOE_BASE_HP;
  const events: BattleEvent[] = [];
  let round = 0;
  while (youHp > 0 && foeHp > 0 && round < MAX_ROUNDS) {
    round += 1;
    const order: ("you" | "foe")[] = youFirst ? ["you", "foe"] : ["foe", "you"];
    for (const actor of order) {
      if (youHp <= 0 || foeHp <= 0) break;
      if (actor === "you") foeHp = Math.max(0, foeHp - dealt);
      else youHp = Math.max(0, youHp - taken);
      events.push({ round, actor, damage: actor === "you" ? dealt : taken, youHp, foeHp });
    }
  }
  // Only a knockout wins; running out of rounds with the foe standing is a loss.
  const won = foeHp === 0 && youHp > 0;
  return { won, events, rounds: round, youHp, foeHp, lesson: lessonFor(stats) };
}
