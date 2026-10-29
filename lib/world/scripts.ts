import type { Script } from "@/lib/dialogue/dialogue";

const okafor = { speaker: "Prof. Okafor", portrait: "okafor-portrait" } as const;

/** Dialogue for the Python Port slice. Original wording; flags drive later quests. */
export const SCRIPTS: Readonly<Record<string, Script>> = {
  "okafor-intro": {
    id: "okafor-intro",
    start: "gate",
    lines: {
      gate: { ...okafor, text: "", next: null, branch: [{ if: { flag: "metOkafor" }, next: "again" }, { if: { flag: "metOkafor", is: false }, next: "hello" }] },
      hello: { ...okafor, text: "Ah, you made it. Mind the cables. This is the Lab, and that glowing thing on the rug is the Training Rig.", next: "pitch", set: { metOkafor: true } },
      pitch: {
        ...okafor,
        text: "Here is the deal: your companion is a small neural network, and you will write every line of it yourself. Nothing is handed over. Ready to hear how?",
        choices: [
          { label: "Yes, explain.", next: "explain" },
          { label: "I have never used numpy.", next: "numpy" },
          { label: "Later.", next: "later" },
        ],
      },
      explain: { ...okafor, text: "You will implement the maths in Python, the Rig runs it, and hidden tests decide how strong your companion becomes. Start with the Python Port: the town outside has what you need.", next: null, set: { briefed: true } },
      numpy: { ...okafor, text: "Good, the Port teaches it from scratch: arrays, shapes, broadcasting. Stuck on a shape? Print it. Always print the shape.", next: null, set: { briefed: true } },
      later: { ...okafor, text: "Take your time. The Rig will not go anywhere. Talk to me when you are ready.", next: null },
      again: { ...okafor, text: "Back already? Head into town and try the first lessons. I will keep the Rig warm.", next: null },
    },
  },
  "training-rig": {
    id: "training-rig",
    start: "look",
    lines: {
      look: { text: "The Training Rig hums. A tiny glowing network pulses at its core. It is waiting for weights you have not written yet.", next: null },
    },
  },
  dockhand: {
    id: "dockhand",
    start: "hi",
    lines: {
      hi: { speaker: "Dockhand Ines", text: "Folks here say Python is easy. It is, until a list of lists pretends to be a matrix. Then numpy saves you.", next: null },
    },
  },
  "port-sign": {
    id: "port-sign",
    start: "s",
    lines: { s: { text: "PYTHON PORT. Lessons ahead, Lab to the north. Sandbox rules: your code runs in a worker with no network.", next: null } },
  },
  "serpent-statue": {
    id: "serpent-statue",
    start: "s",
    lines: { s: { text: "A coiled stone serpent. Its plaque reads: \"Readability counts.\"", next: null } },
  },
};
