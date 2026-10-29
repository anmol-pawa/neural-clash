import type { DialogueScript, DialogueNode, SayNode } from "@/lib/dialogue/engine";

type Line = Omit<SayNode, "kind" | "next">;

/** A straight run of lines: `id` is the start, later nodes are `id.1`, `id.2`… */
function run(id: string, lines: Line[], tail?: DialogueNode, tailId?: string): Record<string, DialogueNode> {
  const nodes: Record<string, DialogueNode> = {};
  lines.forEach((l, i) => {
    const key = i === 0 ? id : `${id}.${i}`;
    const nextKey = i + 1 < lines.length ? `${id}.${i + 1}` : tail ? tailId : undefined;
    nodes[key] = { kind: "say", ...l, next: nextKey };
  });
  if (tail && tailId) nodes[tailId] = tail;
  return nodes;
}

const O = { speaker: "PROF. OKAFOR", portrait: "okafor-portrait" } as const;

const sign = (id: string, text: string): DialogueScript => ({ start: id, nodes: run(id, [{ text }]) });

/** Okafor: the first meeting plays once (`met_okafor`); afterwards she greets and offers the menu. */
const intro: DialogueScript = {
  start: "entry",
  nodes: {
    entry: { kind: "branch", flag: "met_okafor", then: "again", otherwise: "a" },
    again: { kind: "say", ...O, mood: "smile", text: "Back already? The first Lab, a linear model trained by gradient descent with a hand-derived gradient, opens soon. Ask me anything meanwhile.", next: "menu" },
    ...run(
      "a",
      [
        { ...O, mood: "smile", text: "There you are! I'm Professor Okafor. Welcome to the Lab, and to Latentia." },
        { ...O, text: "Across this continent a force called the Noise corrupts models. It memorises when it should learn, peeks at answers, and bluffs with total confidence." },
        { ...O, mood: "think", text: "The cure is an engineer who understands every line of the thing they train. So we won't hand you a framework. You will write yours." },
        { ...O, mood: "smile", text: "Your companion, Neuron-Pup, grows as you build its parts. First a single neuron, then the tools to train it. Step up to the Training Rig when you are ready." },
      ],
      { kind: "set", flag: "met_okafor", next: "menu" },
      "met",
    ),
    menu: { kind: "choice", options: [{ label: "Why write it from scratch?", next: "why" }, { label: "What is a perceptron?", next: "perceptron" }, { label: "See you later.", next: "bye" }] },
    ...run(
      "why",
      [
        { ...O, mood: "think", text: "Interviews, and incidents, reward people who can reason about gradients, shapes and failure modes without a library to lean on." },
        { ...O, text: "Libraries are for speed once you understand what they do. Here you earn that understanding first." },
      ],
      { kind: "say", ...O, text: "Anything else?", next: "menu" },
      "why.back",
    ),
    ...run(
      "perceptron",
      [
        { ...O, mood: "think", text: "A perceptron takes some inputs, multiplies each by a weight, adds them up with a bias, and squashes the sum into an output." },
        { ...O, text: "It draws one straight line through your data. That is little, but stack enough of them and you get the networks behind everything else here." },
      ],
      { kind: "say", ...O, text: "Anything else?", next: "menu" },
      "perceptron.back",
    ),
    bye: { kind: "say", ...O, mood: "smile", text: "Good. The Rig hums when you are near. Go on.", next: undefined },
  },
};

export const SCRIPTS: Readonly<Record<string, DialogueScript>> = {
  "okafor.intro": intro,
  "sign.port": sign("p", "PYTHON PORT. Everything starts here: syntax, then numpy. Professor Okafor's Lab is the building with the green door."),
  "sign.statue": sign("s", "A coiled serpent carved in stone. Plaque: \"Readability counts.\""),
  "sign.bench": sign("b", "A bench facing the water. Good for thinking about off-by-one errors."),
  "sign.rig": {
    start: "r",
    nodes: {
      r: { kind: "say", text: "The Training Rig glows softly. It will wake once your first Lab module is ready.", next: undefined },
    },
  },
  "sign.board1": sign("w1", "Whiteboard: loss(w) = mean((Xw - y)^2). Below it, a curve sliding down toward a minimum."),
  "sign.board2": sign("w2", "Whiteboard: dL/dw = (2/n) Xᵀ(Xw - y). Check shapes first: (d,n)(n,) gives (d,)."),
  "sign.coffee": sign("c", "The coffee machine is labelled \"stochastic\". It is correct more often than not."),
  "sign.servers": sign("v", "Server racks hum along. A sticky note reads: \"Never train on the test set.\""),
};
