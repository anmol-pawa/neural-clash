// Turn clang's stderr into structured, beginner-friendly diagnostics.
export interface Diagnostic {
  line: number;
  column: number;
  severity: "error" | "warning" | "note";
  message: string;
  /** a plain-language nudge, when we recognise the pattern */
  hint?: string;
  /** the offending source line and caret line, as clang printed them */
  snippet?: string;
}

const HEAD = /^(?:[^:\n]+):(\d+):(\d+): (error|warning|note): (.*)$/;

const HINTS: [RegExp, string][] = [
  [/use of undeclared identifier '(\w+)'/, "Clang can't find that name. Check the spelling, declare it before use, or add the #include / `std::` it needs."],
  [/no member named '(\w+)' in namespace 'std'/, "That std name isn't declared. You may be missing its #include, or it needs a newer standard than the judge's C++20."],
  [/expected ';'/, "A statement is missing its semicolon (look at the line above the one reported)."],
  [/cannot use '(throw|try)' with exceptions disabled|cannot use '(throw|try|catch)'/, "The judge builds without C++ exceptions. Return an error value or use a sentinel instead of throw/try/catch."],
  [/no matching function for call to '(\w+)'/, "The arguments don't match any overload. Compare their types with the function's parameters."],
  [/cannot initialize a variable of type '([^']+)' with an (?:lvalue|rvalue) of type '([^']+)'/, "The two types differ. Convert explicitly, or change the variable's type."],
  [/non-void function does not return a value/, "Every path through a non-void function must return a value."],
  [/member access into incomplete type|incomplete type/, "The type is declared but not defined here. Include its header or define it before this use."],
  [/call to implicitly-deleted|use of deleted function/, "That operation is deleted (for example copying a unique_ptr). Move it with std::move instead."],
  [/expected unqualified-id|expected expression/, "The parser hit something it didn't expect. Check brackets, braces and commas nearby."],
];

export function parseClangOutput(stderr: string): Diagnostic[] {
  const lines = stderr.split("\n");
  const out: Diagnostic[] = [];
  for (let i = 0; i < lines.length; i++) {
    const m = HEAD.exec(lines[i]);
    if (!m) continue;
    const [, line, column, severity, message] = m;
    const snippet: string[] = [];
    while (i + 1 < lines.length && !HEAD.test(lines[i + 1]) && /^\s*(\d+ \||\|)/.test(lines[i + 1])) snippet.push(lines[++i]);
    const hint = HINTS.find(([re]) => re.test(message))?.[1];
    out.push({ line: Number(line), column: Number(column), severity: severity as Diagnostic["severity"], message, hint, snippet: snippet.length ? snippet.join("\n") : undefined });
  }
  return out;
}

export const errorsOf = (d: Diagnostic[]) => d.filter((x) => x.severity === "error");
