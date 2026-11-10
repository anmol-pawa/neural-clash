import type { PythonTask } from "@/lib/editor/tasks";
import { LAB_SOURCES } from "./labs.gen";

export interface LabSource {
  id: string;
  title: string;
  phase: string;
  functions: string[];
  /** Hint ladder, gentlest first. Revealed one rung at a time. */
  hints: string[];
  lesson: string;
  spec: string;
  visibleTests: string;
  hiddenTests: string;
}

export const PHASE_TITLES: Record<string, string> = {
  "python-port": "Python Port",
  "vector-vale": "Vector Vale",
  forge: "The Forge",
  peaks: "Probability Peaks",
  grove: "Classic Grove",
  market: "Metric Market",
};

export const LABS: readonly LabSource[] = LAB_SOURCES;

export const labById = (id: string): LabSource | undefined => LABS.find((l) => l.id === id);

/** Lab ids grouped by phase, in curriculum order. */
export function labsByPhase(labs: readonly LabSource[] = LABS): { phase: string; title: string; labs: LabSource[] }[] {
  const out: { phase: string; title: string; labs: LabSource[] }[] = [];
  for (const lab of labs) {
    let g = out.find((x) => x.phase === lab.phase);
    if (!g) out.push((g = { phase: lab.phase, title: PHASE_TITLES[lab.phase] ?? lab.phase, labs: [] }));
    g.labs.push(lab);
  }
  return out;
}

/** The first paragraph after the title heading: used as the short brief. */
export function labBrief(lab: LabSource): string {
  const body = lab.lesson.split("\n").filter((l) => !l.startsWith("# "));
  const para: string[] = [];
  for (const line of body) {
    if (!line.trim()) {
      if (para.length) break;
      continue;
    }
    para.push(line.trim());
  }
  return para.join(" ");
}

export function labTask(lab: LabSource): PythonTask {
  return {
    kind: "python",
    key: `lab:${lab.id}`,
    title: lab.title,
    brief: labBrief(lab),
    starter: { "main.py": lab.spec },
    entry: "main.py",
    visibleTests: lab.visibleTests,
    hiddenTests: lab.hiddenTests,
  };
}
