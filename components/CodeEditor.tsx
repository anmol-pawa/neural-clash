"use client";

import { useEffect, useRef } from "react";
import { EditorState, StateEffect, StateField, type Extension } from "@codemirror/state";
import { Decoration, EditorView, drawSelection, highlightActiveLine, highlightActiveLineGutter, keymap, lineNumbers } from "@codemirror/view";
import { defaultKeymap, history, historyKeymap, indentWithTab } from "@codemirror/commands";
import { HighlightStyle, bracketMatching, indentOnInput, syntaxHighlighting } from "@codemirror/language";
import { python } from "@codemirror/lang-python";
import { cpp } from "@codemirror/lang-cpp";
import { tags as t } from "@lezer/highlight";
import { languageOf } from "@/lib/editor/workspace";

const theme = EditorView.theme(
  {
    "&": { backgroundColor: "#0d0f22", color: "#e7e9f6", fontSize: "14px", height: "100%" },
    ".cm-scroller": { fontFamily: "var(--font-jetbrains), ui-monospace, monospace", lineHeight: "1.5" },
    ".cm-content": { caretColor: "#5eead4", padding: "8px 0" },
    ".cm-cursor": { borderLeftColor: "#5eead4" },
    ".cm-gutters": { backgroundColor: "#12142a", color: "#6b7194", border: "none" },
    ".cm-activeLine": { backgroundColor: "rgba(94, 234, 212, 0.06)" },
    ".cm-activeLineGutter": { backgroundColor: "rgba(94, 234, 212, 0.1)", color: "#e7e9f6" },
    "&.cm-focused .cm-selectionBackground, .cm-selectionBackground": { backgroundColor: "rgba(94, 234, 212, 0.25)" },
    ".cm-errorLine": { backgroundColor: "rgba(248, 113, 113, 0.18)" },
  },
  { dark: true },
);

const setErrorLine = StateEffect.define<number | null>();
const errorLineField = StateField.define({
  create: () => Decoration.none,
  update(deco, tr) {
    deco = deco.map(tr.changes);
    for (const e of tr.effects) {
      if (!e.is(setErrorLine)) continue;
      deco = e.value && e.value <= tr.state.doc.lines ? Decoration.set([Decoration.line({ class: "cm-errorLine" }).range(tr.state.doc.line(e.value).from)]) : Decoration.none;
    }
    return deco;
  },
  provide: (f) => EditorView.decorations.from(f),
});

const highlight = HighlightStyle.define([
  { tag: [t.keyword, t.controlKeyword, t.definitionKeyword, t.modifier], color: "#c4a7ff" },
  { tag: [t.string, t.special(t.string)], color: "#fde68a" },
  { tag: [t.number, t.bool, t.null], color: "#fdba74" },
  { tag: [t.comment, t.lineComment, t.blockComment], color: "#6b7194", fontStyle: "italic" },
  { tag: [t.function(t.variableName), t.function(t.propertyName)], color: "#7dd3fc" },
  { tag: [t.typeName, t.className], color: "#5eead4" },
  { tag: [t.operator, t.punctuation], color: "#a8aed6" },
  { tag: t.meta, color: "#f9a8d4" },
]);

function languageExtension(path: string): Extension {
  const lang = languageOf(path);
  return lang === "python" ? python() : lang === "cpp" ? cpp() : [];
}

export interface CodeEditorProps {
  path: string;
  value: string;
  onChange: (text: string) => void;
  /** 1-based line to mark as the failing line */
  errorLine?: number;
}

/**
 * One CodeMirror view for the active file. Each file keeps its own EditorState while the tab is
 * switched, so undo history and the cursor survive tab changes.
 */
export default function CodeEditor({ path, value, onChange, errorLine }: CodeEditorProps) {
  const host = useRef<HTMLDivElement>(null);
  const view = useRef<EditorView | null>(null);
  const states = useRef(new Map<string, EditorState>());
  const onChangeRef = useRef(onChange);
  const current = useRef(path);
  useEffect(() => {
    onChangeRef.current = onChange;
  });

  const make = (p: string, doc: string) =>
    EditorState.create({
      doc,
      extensions: [
        lineNumbers(),
        highlightActiveLineGutter(),
        history(),
        drawSelection(),
        indentOnInput(),
        bracketMatching(),
        highlightActiveLine(),
        keymap.of([indentWithTab, ...defaultKeymap, ...historyKeymap]),
        syntaxHighlighting(highlight),
        languageExtension(p),
        theme,
        errorLineField,
        EditorState.tabSize.of(4),
        EditorView.contentAttributes.of({ "aria-label": `Code editor for ${p}`, autocapitalize: "off", autocorrect: "off", spellcheck: "false" }),
        EditorView.updateListener.of((u) => {
          if (u.docChanged) onChangeRef.current(u.state.doc.toString());
        }),
      ],
    });

  useEffect(() => {
    const v = new EditorView({ state: make(path, value), parent: host.current! });
    view.current = v;
    const map = states.current;
    return () => {
      v.destroy();
      view.current = null;
      map.clear();
    };
    // the view is created once; later path/value changes are handled below
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const v = view.current;
    if (!v) return;
    if (current.current !== path) {
      states.current.set(current.current, v.state);
      current.current = path;
      v.setState(states.current.get(path) ?? make(path, value));
    }
    // external change (reset, restored draft): replace the document
    if (v.state.doc.toString() !== value) v.dispatch({ changes: { from: 0, to: v.state.doc.length, insert: value } });
  }, [path, value]);

  useEffect(() => {
    view.current?.dispatch({ effects: setErrorLine.of(errorLine ?? null) });
  }, [errorLine, path]);

  return <div ref={host} className="h-full min-h-0 overflow-hidden" data-testid="code-editor" />;
}
