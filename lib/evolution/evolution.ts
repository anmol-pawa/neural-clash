/**
 * Companion evolution (GDD §3). Pure: Neuron-Pup's form is derived from which Forge Labs the player
 * has passed *unassisted*. Stages are strictly ordered: a later form needs every earlier one.
 * Requirement ids that have no Lab yet are "planned" and block progress, shown as "coming".
 */
export interface FormDef {
  id: string;
  name: string;
  /** What building these parts means, in one line. */
  blurb: string;
  /** Lab ids that must be passed without assistance. */
  requires: readonly string[];
  /** Sprite id once art exists for this form; others show a silhouette. */
  sprite: string | null;
}

export const FORMS: readonly FormDef[] = [
  { id: "perceptron", name: "Perceptron", blurb: "One weighted sum and a bias, trained by gradient descent.", requires: ["linear-gd"], sprite: "neuron-pup-perceptron" },
  { id: "multilayer", name: "Multilayer", blurb: "Autograd lets stacked layers learn what one line cannot.", requires: ["forge-value", "forge-mlp"], sprite: "neuron-pup-multilayer" },
  { id: "convling", name: "Convling", blurb: "Shared filters that look for a pattern anywhere in the input.", requires: ["conv2d"], sprite: null },
  { id: "recurrent", name: "Recurrent", blurb: "A hidden state carries memory along a sequence.", requires: ["rnn"], sprite: null },
  { id: "transformer", name: "Transformer", blurb: "Attention lets every token look at every other token.", requires: ["attention", "transformer-block"], sprite: null },
  { id: "foundation", name: "Foundation", blurb: "A tokenizer, a tiny language model and sampling, end to end.", requires: ["tokenizer", "tiny-lm", "sampling"], sprite: null },
];

export type LabResults = Record<string, { passed: boolean; assisted: boolean }>;

export interface RequirementStatus {
  labId: string;
  done: boolean;
  /** False when the Lab does not exist in the game yet. */
  available: boolean;
}

export interface FormStatus {
  form: FormDef;
  requirements: RequirementStatus[];
  /** Every requirement met (regardless of earlier forms). */
  met: boolean;
  /** Reached: met, and every earlier form reached. */
  reached: boolean;
}

export interface EvolutionState {
  forms: FormStatus[];
  /** Index into FORMS of the current form, or -1 before the first evolution. */
  current: number;
  next: FormStatus | null;
  /** Share of the next form's requirements done, 0-1 (1 when fully evolved). */
  nextProgress: number;
}

export function evolutionState(labs: LabResults, existingLabIds: ReadonlySet<string>, forms: readonly FormDef[] = FORMS): EvolutionState {
  let reachedSoFar = true;
  const statuses: FormStatus[] = forms.map((form) => {
    const requirements = form.requires.map((labId) => {
      const r = labs[labId];
      return { labId, done: !!r && r.passed && !r.assisted, available: existingLabIds.has(labId) };
    });
    const met = requirements.every((r) => r.done);
    reachedSoFar = reachedSoFar && met;
    return { form, requirements, met, reached: reachedSoFar };
  });
  const current = statuses.reduce((acc, s, i) => (s.reached ? i : acc), -1);
  const next = statuses[current + 1] ?? null;
  const nextProgress = next ? next.requirements.filter((r) => r.done).length / next.requirements.length : 1;
  return { forms: statuses, current, next, nextProgress };
}

/** Battle sprite id for the companion's current form (back view); falls back to the Perceptron pup. */
export function heroBackSpriteId(labs: LabResults, existingLabIds: ReadonlySet<string>): string {
  const { forms, current } = evolutionState(labs, existingLabIds);
  const sprite = forms[current]?.form.sprite ?? "neuron-pup-perceptron";
  return `${sprite}-back`;
}
