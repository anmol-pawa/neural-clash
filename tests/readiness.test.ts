import { describe, expect, it } from "vitest";
import { DAY, review, type SrsTable } from "@/lib/srs/srs";
import { CALCULUS_DECK, CLASSIC_DECK, LINALG_DECK, PROBABILITY_DECK } from "@/lib/cards/samples";
import { ASSISTED_LAB_CREDIT, LOOPS, SKILLS, band, readiness, scoreSkill, type Loop, type ReadinessInput, type Skill } from "@/lib/readiness/readiness";
import { LABS } from "@/lib/labs/catalog";

const T0 = 1_000_000_000_000;
const base = (over: Partial<ReadinessInput> = {}): ReadinessInput => ({
  labs: {}, labIds: new Set(["A", "B"]), srs: {}, decks: { d: ["c1", "c2"] }, cleared: [], journalRuns: 0, now: T0, ...over,
});
const sk = (evidence: Skill["evidence"]): Skill => ({ id: "s", title: "S", evidence });

describe("scoreSkill", () => {
  it("is zero with no progress", () => {
    expect(scoreSkill(sk([{ kind: "lab", id: "A" }, { kind: "deck", id: "d" }]), base()).score).toBe(0);
  });
  it("gives an unassisted Lab full credit and an assisted one half", () => {
    const s = sk([{ kind: "lab", id: "A" }]);
    expect(scoreSkill(s, base({ labs: { A: { passed: true, assisted: false } } })).score).toBe(1);
    expect(scoreSkill(s, base({ labs: { A: { passed: true, assisted: true } } })).score).toBe(ASSISTED_LAB_CREDIT);
  });
  it("ignores a passed Lab that does not exist in the game", () => {
    const r = scoreSkill(sk([{ kind: "lab", id: "ghost" }]), base({ labs: { ghost: { passed: true, assisted: false } } }));
    expect(r.score).toBe(0);
    expect(r.coverage).toBe(0);
  });
  it("credits deck mastery by SRS state; rusted counts less than fresh", () => {
    let t: SrsTable = {};
    let at = T0;
    for (let i = 0; i < 5; i++) { t = review(t, "c1", { correct: true }, at); at = t.c1.due; } // reviewed on time, reaches a mastered box
    const last = at - 1;
    const s = sk([{ kind: "deck", id: "d" }]);
    const fresh = scoreSkill(s, base({ srs: t, now: last })).score;
    const rusted = scoreSkill(s, base({ srs: t, now: last + 400 * DAY })).score;
    expect(fresh).toBe(0.5); // c1 mastered (1) + c2 new (0), over 2
    expect(rusted).toBe(0.125); // c1 rusted (0.25) + c2 new
  });
  it("never lets assisted reviews raise deck credit", () => {
    const t = review({}, "c1", { correct: true, assisted: true }, T0);
    expect(scoreSkill(sk([{ kind: "deck", id: "d" }]), base({ srs: t })).score).toBe(0);
  });
  it("caps journal credit at the target and counts the guardian", () => {
    expect(scoreSkill(sk([{ kind: "journal", target: 4 }]), base({ journalRuns: 2 })).score).toBe(0.5);
    expect(scoreSkill(sk([{ kind: "journal", target: 4 }]), base({ journalRuns: 40 })).score).toBe(1);
    expect(scoreSkill(sk([{ kind: "guardian", id: "g" }]), base({ cleared: ["g"] })).score).toBe(1);
  });
  it("treats planned evidence as zero credit and not available", () => {
    const r = scoreSkill(sk([{ kind: "planned", label: "x" }, { kind: "lab", id: "A" }]), base({ labs: { A: { passed: true, assisted: false } } }));
    expect(r.score).toBe(0.5);
    expect(r.coverage).toBe(0.5);
  });
});

describe("readiness", () => {
  const loop: Loop = {
    id: "l", title: "L", blurb: "",
    rounds: [
      { id: "r1", title: "R1", what: "", skills: [{ skill: "a", weight: 1 }] },
      { id: "r2", title: "R2", what: "", skills: [{ skill: "a", weight: 1 }, { skill: "p", weight: 1 }] },
    ],
  };
  const skills: Skill[] = [{ id: "a", title: "A", evidence: [{ kind: "lab", id: "A" }] }, { id: "p", title: "P", evidence: [{ kind: "planned", label: "later" }] }];
  it("weights skills and exposes how much of the loop is buildable yet", () => {
    const [r] = readiness(base({ labs: { A: { passed: true, assisted: false } } }), [loop], skills);
    expect(r.rounds[0].score).toBe(1);
    expect(r.rounds[1].score).toBe(0.5);
    expect(r.score).toBeCloseTo((1 * 1 + 0.5 * 2) / 3);
    expect(r.coverage).toBeCloseTo(2 / 3);
    expect(r.weakest?.round.id).toBe("r2");
  });
  it("has no weakest round when nothing is trainable yet", () => {
    const [r] = readiness(base(), [loop], [{ id: "a", title: "A", evidence: [{ kind: "planned", label: "x" }] }, skills[1]]);
    expect(r.weakest).toBeNull();
  });
  it("throws on a round that names an unknown skill", () => {
    expect(() => readiness(base(), [loop], [])).toThrow(/Unknown skill/);
  });
});

describe("shipped catalogue", () => {
  it("every round references a real skill and weights are positive", () => {
    const ids = new Set(SKILLS.map((s) => s.id));
    for (const l of LOOPS) for (const r of l.rounds) for (const s of r.skills) { expect(ids.has(s.skill)).toBe(true); expect(s.weight).toBeGreaterThan(0); }
  });
  it("starts at zero everywhere and Lab evidence in use is either real or honestly unavailable", () => {
    const labIds = new Set(LABS.map((l) => l.id));
    const out = readiness({ ...base(), labIds, decks: {} });
    for (const r of out) expect(r.score).toBe(0);
    // evolution Labs not yet written must be unavailable (coverage < 1), never silently scored
    const dl = scoreSkill(SKILLS.find((s) => s.id === "dl-scratch")!, { ...base(), labIds, labs: { autograd: { passed: true, assisted: false } } });
    expect(dl.score).toBe(0);
  });
});

describe("linear algebra skill", () => {
  const skill = SKILLS.find((s) => s.id === "linear-algebra")!;
  const labIds = new Set(LABS.map((l) => l.id));
  it("is backed by real content only: the deck and both PCA labs exist", () => {
    const r = scoreSkill(skill, { ...base(), labIds, decks: { linalg: LINALG_DECK.cards.map((c) => c.id) } });
    expect(r.coverage).toBe(1);
    expect(r.score).toBe(0);
  });
  it("gains credit from each PCA lab pass and, once cleared, from the Vector Vale guardian", () => {
    const labs = { "pca-svd": { passed: true, assisted: false }, "pca-power": { passed: true, assisted: true } };
    const r = scoreSkill(skill, { ...base(), labIds, labs, decks: { linalg: LINALG_DECK.cards.map((c) => c.id) } });
    expect(r.score).toBeCloseTo((0 + 1 + ASSISTED_LAB_CREDIT) / 4, 5);
    const g = scoreSkill(skill, { ...base(), labIds, labs, cleared: ["guardian:vector-vale"], decks: { linalg: LINALG_DECK.cards.map((c) => c.id) } });
    expect(g.score).toBeCloseTo((0 + 1 + ASSISTED_LAB_CREDIT + 1) / 4, 5);
  });
  it("is tested in the theory and implement rounds of the ML-engineer loop", () => {
    const loop = LOOPS.find((l) => l.id === "ml-engineer")!;
    for (const id of ["theory", "implement"]) expect(loop.rounds.find((r) => r.id === id)!.skills.some((s) => s.skill === "linear-algebra")).toBe(true);
  });
});

describe("calculus and optimisation skill", () => {
  const skill = SKILLS.find((s) => s.id === "calculus-optim")!;
  const labIds = new Set(LABS.map((l) => l.id));
  const decks = { calculus: CALCULUS_DECK.cards.map((c) => c.id) };
  it("is backed by real content only: the deck and both Forge labs exist", () => {
    const r = scoreSkill(skill, { ...base(), labIds, decks });
    expect(r.coverage).toBe(1);
    expect(r.score).toBe(0);
  });
  it("gains credit from each Forge lab pass, with assisted passes discounted", () => {
    const labs = { "forge-value": { passed: true, assisted: false }, "forge-tensor": { passed: true, assisted: true } };
    const r = scoreSkill(skill, { ...base(), labIds, labs, decks });
    expect(r.score).toBeCloseTo((0 + 1 + ASSISTED_LAB_CREDIT) / 4, 5);
    const g = scoreSkill(skill, { ...base(), labIds, labs, cleared: ["guardian:gradient-gorge"], decks });
    expect(g.score).toBeCloseTo((0 + 1 + ASSISTED_LAB_CREDIT + 1) / 4, 5);
  });
  it("is tested in the theory and implement rounds of the ML-engineer loop", () => {
    const loop = LOOPS.find((l) => l.id === "ml-engineer")!;
    for (const id of ["theory", "implement"]) expect(loop.rounds.find((r) => r.id === id)!.skills.some((s) => s.skill === "calculus-optim")).toBe(true);
  });
});

describe("probability and statistics skill", () => {
  const skill = SKILLS.find((s) => s.id === "probability-stats")!;
  const labIds = new Set(LABS.map((l) => l.id));
  const decks = { probability: PROBABILITY_DECK.cards.map((c) => c.id) };
  it("is backed by real content only: the deck and both Probability Peaks labs exist", () => {
    const r = scoreSkill(skill, { ...base(), labIds, decks });
    expect(r.coverage).toBe(1);
    expect(r.score).toBe(0);
  });
  it("gains credit from each lab pass, with assisted passes discounted", () => {
    const labs = { "prob-sampling": { passed: true, assisted: false }, "prob-mle": { passed: true, assisted: true } };
    const r = scoreSkill(skill, { ...base(), labIds, labs, decks });
    expect(r.score).toBeCloseTo((0 + 1 + ASSISTED_LAB_CREDIT) / 4, 5);
    const g = scoreSkill(skill, { ...base(), labIds, labs, cleared: ["guardian:probability-peaks"], decks });
    expect(g.score).toBeCloseTo((0 + 1 + ASSISTED_LAB_CREDIT + 1) / 4, 5);
  });
  it("is tested in the theory and implement rounds of the ML-engineer loop", () => {
    const loop = LOOPS.find((l) => l.id === "ml-engineer")!;
    for (const id of ["theory", "implement"]) expect(loop.rounds.find((r) => r.id === id)!.skills.some((s) => s.skill === "probability-stats")).toBe(true);
  });
});

describe("classical ML skill", () => {
  const skill = SKILLS.find((s) => s.id === "classical-ml")!;
  const labIds = new Set(LABS.map((l) => l.id));
  const decks = { classic: CLASSIC_DECK.cards.map((c) => c.id) };
  it("is backed by real content only: the deck and both Grove labs exist", () => {
    const r = scoreSkill(skill, { ...base(), labIds, decks });
    expect(r.coverage).toBe(1);
    expect(r.score).toBe(0);
  });
  it("gains credit from each lab pass, with assisted passes discounted", () => {
    const labs = { "classic-linear": { passed: true, assisted: false }, "classic-cluster": { passed: true, assisted: true } };
    const r = scoreSkill(skill, { ...base(), labIds, labs, decks });
    expect(r.score).toBeCloseTo((0 + 1 + ASSISTED_LAB_CREDIT) / 3, 5);
  });
  it("is tested in the theory and implement rounds of the ML-engineer loop", () => {
    const loop = LOOPS.find((l) => l.id === "ml-engineer")!;
    for (const id of ["theory", "implement"]) expect(loop.rounds.find((r) => r.id === id)!.skills.some((s) => s.skill === "classical-ml")).toBe(true);
  });
});

describe("band", () => {
  it("is coarse", () => {
    expect([0, 0.1, 0.4, 0.7, 0.9].map(band)).toEqual(["not started", "early", "building", "solid", "interview-ready"]);
  });
});
