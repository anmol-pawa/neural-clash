import { describe, expect, it } from "vitest";
import { PYTHON_DECK } from "@/lib/cards/samples";
import { check } from "@/lib/cards/check";
import type { Card, Response } from "@/lib/cards/types";
import {
  GUARDIAN_ID, guardianAdvanceFromCards, guardianAnswer, guardianFight, guardianLabResult, guardianNext, phaseProgress, startGuardian, summarizeGuardian,
  type GuardianState,
} from "@/lib/guardian/portGuardian";
import { labById } from "@/lib/labs/catalog";

const mcq = PYTHON_DECK.cards.filter((c): c is Extract<Card, { kind: "mcq" }> => c.kind === "mcq");
const right = (c: Card): Response => ({ kind: "mcq", choice: (c as Extract<Card, { kind: "mcq" }>).answer }) as Response;
const wrong = (c: Card): Response => ({ kind: "mcq", choice: ((c as Extract<Card, { kind: "mcq" }>).answer + 1) % (c as Extract<Card, { kind: "mcq" }>).choices.length }) as Response;

function playCards(s: GuardianState, pick: (c: Card) => Response): GuardianState {
  let g = s;
  for (let i = 0; i < 200 && g.phase === "cards" && g.cards.current; i++) {
    g = guardianAnswer(g, pick(g.cards.current));
    if (g.phase === "cards") g = guardianNext(g);
  }
  return g;
}

describe("Python Port guardian", () => {
  it("the deck used here has MCQ cards and the helpers answer them correctly", () => {
    expect(mcq.length).toBeGreaterThan(10);
    expect(check(mcq[0], right(mcq[0])).correct).toBe(true);
    expect(check(mcq[0], wrong(mcq[0])).correct).toBe(false);
  });

  it("every phase, in order, ends in a badge", () => {
    let g = startGuardian(mcq, "np-softmax-rows");
    expect(g.phase).toBe("cards");
    expect(phaseProgress(g)).toBe(0);
    g = playCards(g, right);
    expect(g.cards.phase).toBe("won");
    g = guardianAdvanceFromCards(g);
    expect(g.phase).toBe("lab");
    g = guardianLabResult(g, false);
    expect(g.phase).toBe("lab");
    expect(g.labAttempts).toBe(1);
    g = guardianLabResult(g, true);
    expect(g.phase).toBe("training");
    expect(phaseProgress(g)).toBe(2);
    g = guardianFight(g, { attack: 95, defence: 90, speed: 80 });
    expect(g.phase).toBe("won");
    const sum = summarizeGuardian(g);
    expect(sum.cleared).toBe(true);
    expect(sum.badge).toBe("Indent Badge");
    expect(GUARDIAN_ID).toBe("guardian:python-port");
  });

  it("running out of hearts in the cards phase loses and cannot be advanced", () => {
    let g = playCards(startGuardian(mcq, "np-softmax-rows"), wrong);
    expect(g.phase).toBe("lost");
    expect(g.lostIn).toBe("cards");
    expect(guardianAdvanceFromCards(g)).toBe(g);
    expect(guardianLabResult(g, true)).toBe(g);
    expect(summarizeGuardian(g).badge).toBeNull();
    g = guardianNext(g);
    expect(g.phase).toBe("lost");
  });

  it("phases cannot be skipped", () => {
    const g = startGuardian(mcq, "np-softmax-rows");
    expect(guardianLabResult(g, true)).toBe(g);
    expect(guardianFight(g, { attack: 100, defence: 100, speed: 100 })).toBe(g);
    expect(guardianAdvanceFromCards(g)).toBe(g);
  });

  it("a weak companion loses the training fight but may retry with better stats", () => {
    let g = startGuardian(mcq, "np-softmax-rows");
    g = guardianAdvanceFromCards(playCards(g, right));
    g = guardianLabResult(g, true);
    g = guardianFight(g, { attack: 20, defence: 5, speed: 80 });
    expect(g.phase).toBe("training");
    expect(g.lostIn).toBe("training");
    expect(g.fight?.won).toBe(false);
    g = guardianFight(g, { attack: 95, defence: 90, speed: 80 });
    expect(g.phase).toBe("won");
  });

  it("the lab phase uses a real Python Port lab package", () => {
    const lab = labById("np-softmax-rows");
    expect(lab?.phase).toBe("python-port");
  });
});

import { spriteById } from "@/game/sprites/roster";
describe("Warden Indent sprite", () => {
  it("is a registered 96×96 boss sprite with the full animation set", () => {
    const s = spriteById("warden-indent");
    expect(s).toBeDefined();
    expect(s!.w).toBe(96);
    expect(s!.h).toBe(96);
    for (const a of ["idle", "attack", "hurt", "faint"]) expect(s!.anims[a].length).toBeGreaterThanOrEqual(3);
  });
});
