/** Static description of a guardian: which deck, Lab and art its three trials use. Pure data so the UI and tests share it. */
export interface GuardianDef {
  id: string;
  /** Route segment under /guardian ("" for the first guardian). */
  slug: string;
  name: string;
  badge: string;
  region: string;
  spriteId: string;
  labId: string;
  /** Battle backdrop theme. */
  theme: "grid" | "vale" | "gorge" | "peaks" | "grove" | "market" | "nest" | "caverns";
  deckLabel: string;
  trials: { read: string; write: string; generalise: string };
  lessonsHref: string;
}

export const PYTHON_GUARDIAN: GuardianDef = {
  id: "guardian:python-port",
  slug: "",
  name: "Warden Indent",
  badge: "Indent Badge",
  region: "the Python Port",
  spriteId: "warden-indent",
  labId: "py-moving-average",
  theme: "grid",
  deckLabel: "Python",
  trials: { read: "you can read Python", write: "implement the function", generalise: "build something that generalises" },
  lessonsHref: "/learn",
};

export const VALE_GUARDIAN: GuardianDef = {
  id: "guardian:vector-vale",
  slug: "vale",
  name: "Warden Basis",
  badge: "Basis Badge",
  region: "Vector Vale",
  spriteId: "warden-basis",
  labId: "pca-svd",
  theme: "vale",
  deckLabel: "linear algebra",
  trials: { read: "you can read the geometry of a matrix", write: "implement PCA with an SVD", generalise: "build something that generalises" },
  lessonsHref: "/learn",
};

export const GORGE_GUARDIAN: GuardianDef = {
  id: "guardian:gradient-gorge",
  slug: "gorge",
  name: "Warden Chain",
  badge: "Chain Badge",
  region: "Gradient Gorge",
  spriteId: "warden-chain",
  labId: "forge-value",
  theme: "gorge",
  deckLabel: "calculus and optimisation",
  trials: { read: "you can read a gradient step", write: "build reverse-mode autodiff", generalise: "build something that generalises" },
  lessonsHref: "/learn",
};

export const PEAKS_GUARDIAN: GuardianDef = {
  id: "guardian:probability-peaks",
  slug: "peaks",
  name: "Warden Bell",
  badge: "Bell Badge",
  region: "Probability Peaks",
  spriteId: "warden-bell",
  labId: "prob-mle",
  theme: "peaks",
  deckLabel: "probability and statistics",
  trials: { read: "you can reason about uncertainty", write: "implement Gaussian MLE and a bootstrap", generalise: "build something that generalises" },
  lessonsHref: "/learn",
};

export const GROVE_GUARDIAN: GuardianDef = {
  id: "guardian:classic-grove",
  slug: "grove",
  name: "Warden Split",
  badge: "Split Badge",
  region: "Classic Grove",
  spriteId: "warden-split",
  labId: "classic-cluster",
  theme: "grove",
  deckLabel: "classical machine learning",
  trials: { read: "you can choose and diagnose a classical model", write: "implement k-NN, k-means and a Gini split", generalise: "build something that generalises" },
  lessonsHref: "/learn",
};

export const LEAKAGE_BOSS: GuardianDef = {
  id: "guardian:leakage",
  slug: "leakage",
  name: "Leakage",
  badge: "Clean Split Badge",
  region: "the Metric Market",
  spriteId: "leakage",
  labId: "metrics-rank",
  theme: "market",
  deckLabel: "evaluation and metrics",
  trials: { read: "you can spot where the test set leaked", write: "implement ranking metrics and calibration error", generalise: "score honestly on data the model never saw" },
  lessonsHref: "/learn",
};

export const SWARM_BOSS: GuardianDef = {
  id: "guardian:imbalance-swarm",
  slug: "swarm",
  name: "Imbalance Swarm",
  badge: "Minority Badge",
  region: "the Metric Market",
  spriteId: "imbalance-swarm",
  labId: "metrics-classify",
  theme: "market",
  deckLabel: "evaluation and metrics",
  trials: { read: "you can see past a 99% accuracy banner", write: "implement precision, recall, AUC and a cost-based threshold", generalise: "catch the rare class on data the model never saw" },
  lessonsHref: "/learn",
};

export const NEST_GUARDIAN: GuardianDef = {
  id: "guardian:neuron-nest",
  slug: "nest",
  name: "Dimwarden",
  badge: "Live Gradient Badge",
  region: "the Neuron Nest",
  spriteId: "dimwarden",
  labId: "forge-mlp",
  theme: "nest",
  deckLabel: "neural networks",
  trials: { read: "you can diagnose a network that will not train", write: "build an MLP whose gradients check out", generalise: "keep the gradient alive through every layer" },
  lessonsHref: "/learn",
};

export const CAVERNS_GUARDIAN: GuardianDef = {
  id: "guardian:conv-caverns",
  slug: "caverns",
  name: "Scanwarden",
  badge: "Shared Kernel Badge",
  region: "the Conv Caverns",
  spriteId: "scanwarden",
  labId: "forge-conv",
  theme: "caverns",
  deckLabel: "convolutional networks",
  trials: { read: "you can read a conv stack's shapes, receptive field and cost", write: "build Conv2D and MaxPool2D whose gradients check out", generalise: "reuse one kernel at every position" },
  lessonsHref: "/learn",
};

export const GUARDIANS: readonly GuardianDef[] = [PYTHON_GUARDIAN, VALE_GUARDIAN, GORGE_GUARDIAN, PEAKS_GUARDIAN, GROVE_GUARDIAN, LEAKAGE_BOSS, SWARM_BOSS, NEST_GUARDIAN, CAVERNS_GUARDIAN];

export const guardianHref = (g: GuardianDef) => (g.slug ? `/guardian/${g.slug}` : "/guardian");

