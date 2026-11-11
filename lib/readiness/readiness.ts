/**
 * Readiness Report (CUR D3). Pure: maps what the player has actually done (Labs passed, deck
 * mastery, the guardian, logged experiments) onto the skills each interview loop tests.
 *
 * This measures *practice coverage inside the game*, not a hiring prediction. Skills whose content
 * has not shipped yet carry "planned" evidence: it counts as zero and is shown as "coming", so the
 * report never looks fuller than the game is.
 */
import type { SrsTable } from "@/lib/srs/srs";
import { stateOf, type MasteryState } from "@/lib/srs/srs";

export type Evidence =
  | { kind: "lab"; id: string }
  | { kind: "deck"; id: string }
  | { kind: "guardian"; id: string }
  /** Logged Training Grounds runs; full marks at `target` runs. */
  | { kind: "journal"; target: number }
  /** Content that does not exist yet. */
  | { kind: "planned"; label: string };

export interface Skill {
  id: string;
  title: string;
  evidence: readonly Evidence[];
}

export interface Round {
  id: string;
  title: string;
  /** What this round looks like in a real loop, in one line (original wording). */
  what: string;
  skills: readonly { skill: string; weight: number }[];
}

export interface Loop {
  id: string;
  title: string;
  blurb: string;
  rounds: readonly Round[];
}

export const SKILLS: readonly Skill[] = [
  { id: "python", title: "Python fluency", evidence: [{ kind: "deck", id: "python" }, { kind: "guardian", id: "guardian:python-port" }] },
  { id: "numpy", title: "numpy and vectorised thinking", evidence: [{ kind: "deck", id: "numpy" }] },
  { id: "linear-algebra", title: "Linear algebra for ML", evidence: [{ kind: "deck", id: "linalg" }, { kind: "lab", id: "pca-svd" }, { kind: "lab", id: "pca-power" }, { kind: "guardian", id: "guardian:vector-vale" }] },
  { id: "calculus-optim", title: "Calculus and optimisation for ML", evidence: [{ kind: "deck", id: "calculus" }, { kind: "lab", id: "forge-value" }, { kind: "lab", id: "forge-tensor" }, { kind: "guardian", id: "guardian:gradient-gorge" }] },
  { id: "probability-stats", title: "Probability and statistics for ML", evidence: [{ kind: "deck", id: "probability" }, { kind: "lab", id: "prob-sampling" }, { kind: "lab", id: "prob-mle" }, { kind: "guardian", id: "guardian:probability-peaks" }] },
  { id: "classical-ml", title: "Classical ML (linear models, trees, k-NN, clustering)", evidence: [{ kind: "deck", id: "classic" }, { kind: "lab", id: "classic-linear" }, { kind: "lab", id: "classic-cluster" }, { kind: "guardian", id: "guardian:classic-grove" }] },
  { id: "evaluation", title: "Evaluation and metrics (splits, thresholds, calibration, ranking)", evidence: [{ kind: "deck", id: "metrics" }, { kind: "lab", id: "metrics-classify" }, { kind: "lab", id: "metrics-rank" }, { kind: "guardian", id: "guardian:leakage" }, { kind: "guardian", id: "guardian:imbalance-swarm" }] },
  { id: "ml-basics", title: "Training and evaluation hygiene", evidence: [{ kind: "deck", id: "strategy" }, { kind: "journal", target: 4 }, { kind: "lab", id: "linear-gd" }] },
  { id: "neural-nets", title: "Neural networks by hand (backprop, init, normalisation, optimisers)", evidence: [{ kind: "deck", id: "nn" }, { kind: "lab", id: "forge-linear" }, { kind: "lab", id: "forge-activations-loss" }, { kind: "lab", id: "forge-mlp" }, { kind: "lab", id: "forge-init-norm" }, { kind: "lab", id: "forge-optim-reg" }, { kind: "lab", id: "forge-trainer" }, { kind: "guardian", id: "guardian:neuron-nest" }] },
  { id: "convnets", title: "Convolutional networks (shapes, receptive fields, cost, architecture)", evidence: [{ kind: "deck", id: "cnn" }, { kind: "lab", id: "forge-conv" }, { kind: "planned", label: "Conv Caverns guardian" }] },
  { id: "dl-scratch", title: "Deep learning from scratch", evidence: [{ kind: "lab", id: "autograd" }, { kind: "lab", id: "mlp" }, { kind: "lab", id: "conv2d" }, { kind: "lab", id: "rnn" }] },
  { id: "transformers", title: "Attention and transformers", evidence: [{ kind: "lab", id: "attention" }, { kind: "lab", id: "transformer-block" }, { kind: "lab", id: "tokenizer" }, { kind: "lab", id: "tiny-lm" }] },
  { id: "retrieval-evals", title: "Retrieval, RAG and evals", evidence: [{ kind: "planned", label: "Retrieval Reef labs: recall@k, MRR, judge calibration" }] },
  { id: "agents-safety", title: "Agents, guardrails, injection defence", evidence: [{ kind: "planned", label: "Agent Arena labs" }] },
  { id: "dsa-cpp", title: "DSA in C++ (LeetCode medium/hard)", evidence: [{ kind: "planned", label: "Code Dojo problems" }] },
  { id: "comprehension", title: "Code comprehension and debugging", evidence: [{ kind: "planned", label: "Comprehension rounds" }] },
  { id: "ai-assisted", title: "AI-assisted coding round", evidence: [{ kind: "planned", label: "Pair rounds with a simulated assistant" }] },
  { id: "ai-design", title: "AI system design and product sense", evidence: [{ kind: "planned", label: "Workshops and the Ops Observatory" }] },
  { id: "behavioural", title: "Project stories (STAR)", evidence: [{ kind: "planned", label: "Story Forge" }] },
];

export const LOOPS: readonly Loop[] = [
  {
    id: "applied-ai",
    title: "Applied-AI engineer",
    blurb: "Evals are the most emphasised skill. Expect a take-home that builds and measures an LLM pipeline.",
    rounds: [
      { id: "screen", title: "Technical screen", what: "Retrieval and prompting basics, fluent Python.", skills: [{ skill: "python", weight: 2 }, { skill: "retrieval-evals", weight: 2 }] },
      { id: "takehome", title: "Take-home", what: "Build and measure a pipeline with an eval set and retrieval metrics.", skills: [{ skill: "retrieval-evals", weight: 3 }, { skill: "evaluation", weight: 2 }, { skill: "ml-basics", weight: 2 }, { skill: "python", weight: 1 }] },
      { id: "live", title: "Live coding or debugging", what: "Agent loops, tool calls and retrieval bugs without framework shortcuts.", skills: [{ skill: "agents-safety", weight: 2 }, { skill: "comprehension", weight: 2 }, { skill: "python", weight: 1 }] },
      { id: "design", title: "System design", what: "Systems around models you do not control: observability, cost and latency caps, routing.", skills: [{ skill: "ai-design", weight: 3 }, { skill: "retrieval-evals", weight: 1 }] },
      { id: "product", title: "Product sense", what: "Diagnose a feature that feels dumb, using dashboards and eval slices.", skills: [{ skill: "ai-design", weight: 2 }, { skill: "evaluation", weight: 1 }, { skill: "ml-basics", weight: 1 }] },
      { id: "behavioural", title: "Behavioural", what: "Stories about evals you built, regressions you caught, costs you cut.", skills: [{ skill: "behavioural", weight: 1 }] },
    ],
  },
  {
    id: "sde-ai",
    title: "SDE with an AI-enabled round",
    blurb: "A classic DSA round with no AI, plus a multi-file round scored on problem solving, code quality, verification and communication.",
    rounds: [
      { id: "dsa", title: "DSA round (no AI)", what: "Medium/hard problems written by hand in C++.", skills: [{ skill: "dsa-cpp", weight: 3 }] },
      { id: "ai-round", title: "AI-enabled round", what: "Fix a bug, implement a feature, optimise, and verify what an assistant suggests.", skills: [{ skill: "ai-assisted", weight: 3 }, { skill: "comprehension", weight: 2 }] },
      { id: "comp", title: "Code comprehension", what: "Read unfamiliar code, predict behaviour, spot the defect.", skills: [{ skill: "comprehension", weight: 3 }, { skill: "python", weight: 1 }] },
      { id: "design", title: "System design", what: "Design a service, including where a model fits.", skills: [{ skill: "ai-design", weight: 2 }] },
      { id: "behavioural", title: "Behavioural", what: "Project stories and handling ambiguity.", skills: [{ skill: "behavioural", weight: 1 }] },
    ],
  },
  {
    id: "ml-engineer",
    title: "ML engineer / applied scientist (lite)",
    blurb: "Weights classical ML and deep-learning theory more heavily; expects you to derive and implement.",
    rounds: [
      { id: "theory", title: "ML and DL theory", what: "Bias/variance, regularisation, backprop, attention, evaluation.", skills: [{ skill: "ml-basics", weight: 3 }, { skill: "evaluation", weight: 3 }, { skill: "neural-nets", weight: 3 }, { skill: "convnets", weight: 2 }, { skill: "dl-scratch", weight: 2 }, { skill: "transformers", weight: 2 }, { skill: "linear-algebra", weight: 2 }, { skill: "calculus-optim", weight: 2 }, { skill: "probability-stats", weight: 2 }, { skill: "classical-ml", weight: 3 }] },
      { id: "implement", title: "Implement from scratch", what: "A layer, loss or optimiser in numpy, with gradients that check out.", skills: [{ skill: "dl-scratch", weight: 3 }, { skill: "neural-nets", weight: 2 }, { skill: "convnets", weight: 1 }, { skill: "numpy", weight: 2 }, { skill: "linear-algebra", weight: 1 }, { skill: "calculus-optim", weight: 1 }, { skill: "probability-stats", weight: 1 }, { skill: "classical-ml", weight: 1 }, { skill: "evaluation", weight: 1 }, { skill: "python", weight: 1 }] },
      { id: "coding", title: "Coding round", what: "A DSA problem in C++ or Python.", skills: [{ skill: "dsa-cpp", weight: 2 }, { skill: "python", weight: 1 }] },
      { id: "design", title: "ML system design", what: "Data, training, serving and monitoring for an ML feature.", skills: [{ skill: "ai-design", weight: 2 }, { skill: "ml-basics", weight: 1 }] },
    ],
  },
];

/** What the report needs to know about the save; plain data so tests need no storage. */
export interface ReadinessInput {
  labs: Record<string, { passed: boolean; assisted: boolean }>;
  /** Existing Lab ids (evidence for a Lab that does not exist is "planned"). */
  labIds: ReadonlySet<string>;
  srs: SrsTable;
  decks: Record<string, readonly string[]>;
  cleared: readonly string[];
  journalRuns: number;
  now: number;
}

/** Credit per mastery state: a rusted item is partly forgotten, a new one is nothing. */
export const STATE_CREDIT: Record<MasteryState, number> = { mastered: 1, reviewing: 0.5, learning: 0.5, rusted: 0.25, new: 0 };
/** An assisted Lab pass counts, but half as much as one done unaided. */
export const ASSISTED_LAB_CREDIT = 0.5;

export interface EvidenceResult {
  evidence: Evidence;
  /** 0-1 credit earned. */
  credit: number;
  /** False when the content does not exist in the game yet. */
  available: boolean;
  label: string;
}

export function scoreEvidence(e: Evidence, inp: ReadinessInput): EvidenceResult {
  switch (e.kind) {
    case "lab": {
      const available = inp.labIds.has(e.id);
      const r = inp.labs[e.id];
      const credit = available && r?.passed ? (r.assisted ? ASSISTED_LAB_CREDIT : 1) : 0;
      return { evidence: e, credit, available, label: `Lab ${e.id}` };
    }
    case "deck": {
      const ids = inp.decks[e.id] ?? [];
      const sum = ids.reduce((s, id) => s + STATE_CREDIT[stateOf(inp.srs[id], inp.now)], 0);
      return { evidence: e, credit: ids.length ? sum / ids.length : 0, available: ids.length > 0, label: `${e.id} deck mastery` };
    }
    case "guardian":
      return { evidence: e, credit: inp.cleared.includes(e.id) ? 1 : 0, available: true, label: "Guardian" };
    case "journal":
      return { evidence: e, credit: Math.min(1, inp.journalRuns / e.target), available: true, label: `${Math.min(inp.journalRuns, e.target)} of ${e.target} logged experiments` };
    case "planned":
      return { evidence: e, credit: 0, available: false, label: e.label };
  }
}

export interface SkillResult {
  skill: Skill;
  /** 0-1: mean credit over all evidence, planned evidence included as zero. */
  score: number;
  evidence: EvidenceResult[];
  /** Share of this skill's evidence that exists in the game, 0-1. */
  coverage: number;
}

export function scoreSkill(skill: Skill, inp: ReadinessInput): SkillResult {
  const evidence = skill.evidence.map((e) => scoreEvidence(e, inp));
  const n = evidence.length;
  return {
    skill,
    score: n ? evidence.reduce((s, e) => s + e.credit, 0) / n : 0,
    evidence,
    coverage: n ? evidence.filter((e) => e.available).length / n : 0,
  };
}

export interface RoundResult {
  round: Round;
  score: number;
  skills: { result: SkillResult; weight: number }[];
}

export interface LoopResult {
  loop: Loop;
  score: number;
  rounds: RoundResult[];
  /** Weighted share of the loop's skill content that exists in the game yet, 0-1. */
  coverage: number;
  /** The round that most limits readiness among rounds the game can already train (or null). */
  weakest: RoundResult | null;
}

const weightedMean = (xs: readonly { v: number; w: number }[]): number => {
  const total = xs.reduce((s, x) => s + x.w, 0);
  return total === 0 ? 0 : xs.reduce((s, x) => s + x.v * x.w, 0) / total;
};

export function readiness(inp: ReadinessInput, loops: readonly Loop[] = LOOPS, skills: readonly Skill[] = SKILLS): LoopResult[] {
  const skillResults = new Map(skills.map((s) => [s.id, scoreSkill(s, inp)]));
  return loops.map((loop) => {
    const rounds: RoundResult[] = loop.rounds.map((round) => {
      const ss = round.skills.map(({ skill, weight }) => {
        const result = skillResults.get(skill);
        if (!result) throw new Error(`Unknown skill "${skill}" in round ${loop.id}/${round.id}`);
        return { result, weight };
      });
      return { round, skills: ss, score: weightedMean(ss.map((s) => ({ v: s.result.score, w: s.weight }))) };
    });
    const roundWeight = (r: RoundResult) => r.skills.reduce((s, x) => s + x.weight, 0);
    const score = weightedMean(rounds.map((r) => ({ v: r.score, w: roundWeight(r) })));
    const coverage = weightedMean(rounds.flatMap((r) => r.skills.map((s) => ({ v: s.result.coverage, w: s.weight }))));
    // Only rounds with some trainable content can be "weakest"; otherwise the advice would be "build content".
    const trainable = rounds.filter((r) => r.skills.some((s) => s.result.coverage > 0));
    const weakest = trainable.length ? trainable.reduce((a, b) => (b.score < a.score ? b : a)) : null;
    return { loop, score, rounds, coverage, weakest };
  });
}

export type Band = "not started" | "early" | "building" | "solid" | "interview-ready";

/** Bands are deliberately coarse: a number like 63% would imply precision the model does not have. */
export function band(score: number): Band {
  if (score < 0.05) return "not started";
  if (score < 0.3) return "early";
  if (score < 0.6) return "building";
  if (score < 0.85) return "solid";
  return "interview-ready";
}
