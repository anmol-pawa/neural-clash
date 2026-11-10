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
  theme: "grid" | "vale" | "gorge" | "peaks" | "grove";
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

export const GUARDIANS: readonly GuardianDef[] = [PYTHON_GUARDIAN, VALE_GUARDIAN, GORGE_GUARDIAN, PEAKS_GUARDIAN];

export const guardianHref = (g: GuardianDef) => (g.slug ? `/guardian/${g.slug}` : "/guardian");

