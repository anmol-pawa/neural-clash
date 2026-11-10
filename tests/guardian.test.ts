import { describe, expect, it } from "vitest";
import { PYTHON_DECK } from "@/lib/cards/samples";
import { check } from "@/lib/cards/check";
import type { Card, Response } from "@/lib/cards/types";
import {
  GUARDIAN_ID, progressOf, resumeGuardian, guardianAdvanceFromCards, guardianAnswer, guardianFight, guardianLabResult, guardianNext, phaseProgress, startGuardian, summarizeGuardian,
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

  it("resumes a run from saved progress without skipping the training fight", () => {
    expect(resumeGuardian(mcq, "x", null).phase).toBe("cards");
    expect(resumeGuardian(mcq, "x", { cards: false, lab: false }).phase).toBe("cards");
    const inLab = resumeGuardian(mcq, "x", { cards: true, lab: false });
    expect(inLab.phase).toBe("lab");
    expect(guardianLabResult(inLab, true).phase).toBe("training");
    const inTraining = resumeGuardian(mcq, "x", { cards: true, lab: true });
    expect(inTraining.phase).toBe("training");
    expect(inTraining.fight).toBeNull();
    expect(progressOf(inTraining)).toEqual({ cards: true, lab: true });
    expect(progressOf(inLab)).toEqual({ cards: true, lab: false });
    expect(progressOf(startGuardian(mcq, "x"))).toEqual({ cards: false, lab: false });
  });
});

/** Test-only oracle: the response that `check` accepts for any card kind. */
function correctResponse(c: Card): Response {
  switch (c.kind) {
    case "mcq": return { kind: "mcq", choice: c.answer };
    case "curve": return { kind: "curve", choice: c.answer };
    case "multi": return { kind: "multi", choices: c.answers };
    case "derive": return { kind: "derive", values: c.answers };
    case "shape": return { kind: "shape", shape: c.answer };
    case "metric": return { kind: "metric", value: c.answer };
    case "bug": return { kind: "bug", line: c.line };
  }
}

describe("guardian definitions", () => {
  it("each guardian points at real content: deck cards, a Lab, a sprite and a unique id/route", async () => {
    const { GUARDIANS, VALE_GUARDIAN } = await import("@/lib/guardian/defs");
    const { spriteById } = await import("@/game/sprites/roster");
    const { LINALG_DECK } = await import("@/lib/cards/samples");
    expect(new Set(GUARDIANS.map((g) => g.id)).size).toBe(GUARDIANS.length);
    expect(new Set(GUARDIANS.map((g) => g.slug)).size).toBe(GUARDIANS.length);
    for (const g of GUARDIANS) {
      expect(labById(g.labId), g.id).toBeTruthy();
      expect(spriteById(g.spriteId), g.id).toBeTruthy();
    }
    expect(LINALG_DECK.cards.length).toBeGreaterThanOrEqual(30);
    expect(VALE_GUARDIAN.labId).toBe("pca-svd");
  });

  it("Warden Basis runs on the linalg deck and awards the Basis Badge", async () => {
    const { VALE_GUARDIAN } = await import("@/lib/guardian/defs");
    const { LINALG_DECK } = await import("@/lib/cards/samples");
    let g = startGuardian(LINALG_DECK.cards, VALE_GUARDIAN.labId);
    for (let i = 0; i < 100 && g.phase === "cards" && g.cards.current; i++) {
      g = guardianAnswer(g, correctResponse(g.cards.current));
      if (g.phase === "cards") g = guardianNext(g);
    }
    expect(g.cards.phase).toBe("won");
    g = guardianLabResult(guardianAdvanceFromCards(g), true);
    g = guardianFight(g, { attack: 95, defence: 90, speed: 80 });
    expect(summarizeGuardian(g, VALE_GUARDIAN.badge).badge).toBe("Basis Badge");
  });
});

describe("Warden Chain", () => {
  it("runs on the calculus deck with the forge-value Lab and awards the Chain Badge", async () => {
    const { GORGE_GUARDIAN } = await import("@/lib/guardian/defs");
    const { CALCULUS_DECK } = await import("@/lib/cards/samples");
    expect(CALCULUS_DECK.cards.length).toBeGreaterThanOrEqual(30);
    expect(labById(GORGE_GUARDIAN.labId)).toBeTruthy();
    let g = startGuardian(CALCULUS_DECK.cards, GORGE_GUARDIAN.labId);
    for (let i = 0; i < 100 && g.phase === "cards" && g.cards.current; i++) {
      g = guardianAnswer(g, correctResponse(g.cards.current));
      if (g.phase === "cards") g = guardianNext(g);
    }
    expect(g.cards.phase).toBe("won");
    g = guardianLabResult(guardianAdvanceFromCards(g), true);
    g = guardianFight(g, { attack: 95, defence: 90, speed: 80 });
    expect(summarizeGuardian(g, GORGE_GUARDIAN.badge).badge).toBe("Chain Badge");
  });
});

describe("Warden Bell", () => {
  it("runs on the probability deck with the prob-mle Lab and awards the Bell Badge", async () => {
    const { PEAKS_GUARDIAN } = await import("@/lib/guardian/defs");
    const { PROBABILITY_DECK } = await import("@/lib/cards/samples");
    expect(PROBABILITY_DECK.cards.length).toBeGreaterThanOrEqual(30);
    expect(labById(PEAKS_GUARDIAN.labId)).toBeTruthy();
    let g = startGuardian(PROBABILITY_DECK.cards, PEAKS_GUARDIAN.labId);
    for (let i = 0; i < 100 && g.phase === "cards" && g.cards.current; i++) {
      g = guardianAnswer(g, correctResponse(g.cards.current));
      if (g.phase === "cards") g = guardianNext(g);
    }
    expect(g.cards.phase).toBe("won");
    g = guardianLabResult(guardianAdvanceFromCards(g), true);
    g = guardianFight(g, { attack: 95, defence: 90, speed: 80 });
    expect(summarizeGuardian(g, PEAKS_GUARDIAN.badge).badge).toBe("Bell Badge");
  });
});

describe("Warden Split sprite", () => {
  it("is a registered 96×96 boss sprite with distinct animation frames", () => {
    const s = spriteById("warden-split");
    expect(s).toBeDefined();
    expect(s!.w).toBe(96);
    expect(s!.h).toBe(96);
    for (const a of ["idle", "attack", "hurt", "faint"]) expect(s!.anims[a].length).toBeGreaterThanOrEqual(3);
    expect(new Set(s!.anims.idle.map((f) => f.join("\n"))).size).toBe(s!.anims.idle.length);
  });
});

describe("Metric Market boss sprites", () => {
  for (const id of ["leakage", "imbalance-swarm"]) {
    it(`${id} is a registered 96×96 sprite with distinct animation frames`, () => {
      const s = spriteById(id);
      expect(s).toBeDefined();
      expect(s!.w).toBe(96);
      expect(s!.h).toBe(96);
      for (const a of ["idle", "attack", "hurt", "faint"]) expect(s!.anims[a].length).toBeGreaterThanOrEqual(3);
      for (const a of Object.values(s!.anims)) expect(new Set(a.map((f) => f.join("\n"))).size).toBe(a.length);
    });
  }
});

describe("Warden Split", () => {
  it("runs on the classic deck with the classic-cluster Lab and awards the Split Badge", async () => {
    const { GROVE_GUARDIAN } = await import("@/lib/guardian/defs");
    const { CLASSIC_DECK } = await import("@/lib/cards/samples");
    expect(CLASSIC_DECK.cards.length).toBeGreaterThanOrEqual(30);
    expect(labById(GROVE_GUARDIAN.labId)).toBeTruthy();
    let g = startGuardian(CLASSIC_DECK.cards, GROVE_GUARDIAN.labId);
    for (let i = 0; i < 100 && g.phase === "cards" && g.cards.current; i++) {
      g = guardianAnswer(g, correctResponse(g.cards.current));
      if (g.phase === "cards") g = guardianNext(g);
    }
    expect(g.cards.phase).toBe("won");
    g = guardianLabResult(guardianAdvanceFromCards(g), true);
    g = guardianFight(g, { attack: 95, defence: 90, speed: 80 });
    expect(summarizeGuardian(g, GROVE_GUARDIAN.badge).badge).toBe("Split Badge");
  });
});
