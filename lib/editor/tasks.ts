import type { Files } from "./drafts";
import type { TestCase } from "@/lib/judge/verdict";

/** What the workbench runs. `visible` runs on Run, `visible + hidden` on Submit. */
export interface PythonTask {
  kind: "python";
  key: string;
  title: string;
  brief: string;
  starter: Files;
  /** the file executed as `__main__`; the other .py files are mounted as the `player` package */
  entry: string;
  visibleTests: string;
  hiddenTests: string;
}

export interface CppTask {
  kind: "cpp";
  key: string;
  title: string;
  brief: string;
  starter: Files;
  /** the single translation unit that is compiled */
  entry: string;
  sample: TestCase[];
  hidden: TestCase[];
  timeLimitMs?: number;
}

export type EditorTask = PythonTask | CppTask;

/** Python files the player did not name `entry`, as a mountable package (paths relative to the package). */
export function playerPackage(task: PythonTask, files: Files): Files {
  const pkg: Files = {};
  for (const [p, text] of Object.entries(files)) if (p !== task.entry && p.endsWith(".py")) pkg[p] = text;
  return pkg;
}
