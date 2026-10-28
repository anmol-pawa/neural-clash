export type Language = "python" | "cpp" | "text";

export interface TreeNode {
  name: string;
  path: string;
  kind: "dir" | "file";
  children?: TreeNode[];
}

const MAX_PATH = 120;

export function languageOf(path: string): Language {
  if (/\.py$/.test(path)) return "python";
  if (/\.(cpp|cc|cxx|hpp|h)$/.test(path)) return "cpp";
  return "text";
}

/** Returns an error message, or null when `path` is a safe relative file path. */
export function validatePath(path: string): string | null {
  if (!path || path.length > MAX_PATH) return `path must be 1-${MAX_PATH} characters`;
  if (path.startsWith("/") || path.includes("\\")) return "use a relative path with /";
  const parts = path.split("/");
  if (parts.some((p) => p === "" || p === "." || p === "..")) return "path segments cannot be empty, . or ..";
  if (!/^[A-Za-z0-9._\-/]+$/.test(path)) return "use letters, digits, . _ - and / only";
  return null;
}

/**
 * An editable set of files with the starter files as baseline, so the UI can show
 * which files changed and reset them. Immutable: every operation returns a new Workspace.
 */
export class Workspace {
  private constructor(
    readonly files: Readonly<Record<string, string>>,
    readonly baseline: Readonly<Record<string, string>>,
  ) {}

  static fromStarter(starter: Record<string, string>): Workspace {
    return new Workspace({ ...starter }, { ...starter });
  }

  /** Restores a saved draft on top of the starter; unknown or unsafe paths are dropped. */
  static restore(starter: Record<string, string>, draft: Record<string, string> | null): Workspace {
    if (!draft) return Workspace.fromStarter(starter);
    const files: Record<string, string> = {};
    for (const [p, text] of Object.entries(draft)) if (!validatePath(p) && typeof text === "string") files[p] = text;
    return new Workspace(files, { ...starter });
  }

  get paths(): string[] {
    return Object.keys(this.files).sort();
  }

  isDirty(path: string): boolean {
    return this.files[path] !== this.baseline[path];
  }

  get dirtyPaths(): string[] {
    return [...new Set([...Object.keys(this.files), ...Object.keys(this.baseline)])].filter((p) => this.isDirty(p)).sort();
  }

  update(path: string, text: string): Workspace {
    if (!(path in this.files)) throw new Error(`no such file: ${path}`);
    return new Workspace({ ...this.files, [path]: text }, this.baseline);
  }

  create(path: string, text = ""): Workspace {
    const bad = validatePath(path);
    if (bad) throw new Error(bad);
    if (path in this.files) throw new Error(`already exists: ${path}`);
    if (this.paths.some((p) => p.startsWith(path + "/") || path.startsWith(p + "/"))) throw new Error(`conflicts with a folder or file: ${path}`);
    return new Workspace({ ...this.files, [path]: text }, this.baseline);
  }

  rename(from: string, to: string): Workspace {
    if (!(from in this.files)) throw new Error(`no such file: ${from}`);
    const text = this.files[from];
    return this.remove(from).create(to, text);
  }

  remove(path: string): Workspace {
    if (!(path in this.files)) throw new Error(`no such file: ${path}`);
    const files = { ...this.files };
    delete files[path];
    return new Workspace(files, this.baseline);
  }

  /** Restores one file to its starter text (re-creating it if deleted). */
  reset(path: string): Workspace {
    if (!(path in this.baseline)) return this.remove(path);
    return new Workspace({ ...this.files, [path]: this.baseline[path] }, this.baseline);
  }

  tree(): TreeNode[] {
    const root: TreeNode = { name: "", path: "", kind: "dir", children: [] };
    for (const path of this.paths) {
      let dir = root;
      const parts = path.split("/");
      parts.forEach((name, i) => {
        const full = parts.slice(0, i + 1).join("/");
        if (i === parts.length - 1) {
          dir.children!.push({ name, path: full, kind: "file" });
          return;
        }
        let next = dir.children!.find((c) => c.kind === "dir" && c.name === name);
        if (!next) {
          next = { name, path: full, kind: "dir", children: [] };
          dir.children!.push(next);
        }
        dir = next;
      });
    }
    const sort = (nodes: TreeNode[]) => {
      nodes.sort((a, b) => (a.kind === b.kind ? a.name.localeCompare(b.name) : a.kind === "dir" ? -1 : 1));
      nodes.forEach((n) => n.children && sort(n.children));
    };
    sort(root.children!);
    return root.children!;
  }
}
