import { EditorView, ViewPlugin, Decoration, keymap, lineNumbers } from "@codemirror/view";
import { EditorState, RangeSetBuilder } from "@codemirror/state";
import { history, defaultKeymap, historyKeymap } from "@codemirror/commands";
import { lexSync, parseSync } from "../bundle/sommark.parser.js";
import defaults from "./defaults.js";

// Parse every <span style="...">text</span> from a render/context return value
// and add one Decoration per span — enabling per-character coloring of a single token.
const SPAN_RE = /<span\b[^>]*\bstyle="([^"]*)"[^>]*>([^<]*)<\/span>/g;

function addSpanDecorations(html, pos, len, builder) {
  SPAN_RE.lastIndex = 0;
  let offset = 0, matched = false, m;

  while ((m = SPAN_RE.exec(html)) !== null) {
    matched = true;
    const style    = m[1];
    const spanLen  = m[2].length;
    if (style && spanLen > 0)
      builder.add(pos + offset, pos + offset + spanLen, Decoration.mark({ attributes: { style } }));
    offset += spanLen;
  }

  if (!matched) {
    // single span or plain style="..." attribute
    const sm = html.match(/\bstyle="([^"]*)"/);
    if (sm?.[1]) builder.add(pos, pos + len, Decoration.mark({ attributes: { style: sm[1] } }));
  }
}

function addDecorations(index, tokens, config, pos, builder) {
  const { tokens: userTokens = {}, other, onToken } = config;
  const current = tokens[index];
  const prev    = tokens[index - 1] ?? null;
  const next    = tokens[index + 1] ?? null;
  const ctx     = { prev, current, next };
  const len     = current.value.length;

  const singleStyle = (s) =>
    builder.add(pos, pos + len, Decoration.mark({ attributes: { style: s } }));
  const fromObj = (o) => {
    const p = [];
    if (o.color)  p.push(`color:${o.color}`);
    if (o.bold)   p.push(`font-weight:bold`);
    if (o.italic) p.push(`font-style:italic`);
    if (p.length) singleStyle(p.join(";"));
  };

  if (onToken) {
    const r = onToken(ctx);
    if (r != null) { addSpanDecorations(r, pos, len, builder); return; }
  }

  const tc = userTokens[current.type];
  if (tc !== undefined) {
    if (tc === null) return;
    if (typeof tc === "string")          { singleStyle(`color:${tc}`); return; }
    if (typeof tc.render   === "function") { addSpanDecorations(tc.render(current.value, current.type), pos, len, builder); return; }
    if (typeof tc.context  === "function") {
      const r = tc.context(ctx);
      if (r != null) { addSpanDecorations(r, pos, len, builder); return; }
    }
    fromObj(tc);
    return;
  }

  if (other != null) {
    if (typeof other === "string")           { singleStyle(`color:${other}`); return; }
    if (typeof other.render   === "function") { addSpanDecorations(other.render(current.value, current.type), pos, len, builder); return; }
    if (typeof other.context  === "function") {
      const r = other.context(ctx);
      if (r != null) { addSpanDecorations(r, pos, len, builder); return; }
    }
    fromObj(other);
    return;
  }

  const def = defaults[current.type];
  if (def) fromObj(def);
}

function buildDecorations(view, config) {
  const text   = view.state.doc.toString();
  const tokens = lexSync(text);
  const builder = new RangeSetBuilder();

  let pos = 0;
  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    if (token.type === "EOF") break;

    if (token.type !== "WHITESPACE")
      addDecorations(i, tokens, config, pos, builder);

    pos += token.value.length;
  }

  return builder.finish();
}

// ── Error detection ───────────────────────────────────────────

const ANSI_RE = /\x1b\[[0-9;]*m/g;

function parseErrorPosition(errorStr) {
  const clean = String(errorStr).replace(ANSI_RE, "");
  // single-line: "at line 3, from column 5 to 12"
  const single = clean.match(/at line (\d+), from column (\d+) to (\d+)/);
  if (single) {
    return { startLine: +single[1], startChar: +single[2], endLine: +single[1], endChar: +single[3] };
  }
  // multi-line: "at line 3, from line 3, column 5 to line 4, column 12"
  const multi = clean.match(/at line \d+, from line (\d+), column (\d+) to line (\d+), column (\d+)/);
  if (multi) {
    return { startLine: +multi[1], startChar: +multi[2], endLine: +multi[3], endChar: +multi[4] };
  }
  return null;
}

const ERROR_STYLE = "text-decoration-line:underline;text-decoration-style:wavy;text-decoration-color:#ef4444";

function buildErrorDecorations(view, onError) {
  const builder = new RangeSetBuilder();
  try {
    parseSync(view.state.doc.toString());
    onError?.(null);
  } catch (e) {
    const message = String(e).replace(ANSI_RE, "").trim();
    onError?.(message);
    const pos = parseErrorPosition(e);
    if (pos) {
      try {
        const maxLine = view.state.doc.lines;
        if (pos.startLine > maxLine || pos.endLine > maxLine) return builder.finish();
        const sl = view.state.doc.line(pos.startLine);
        const el = pos.startLine === pos.endLine ? sl : view.state.doc.line(pos.endLine);
        const from = Math.min(sl.from + pos.startChar, sl.to);
        const to   = Math.min(el.from + pos.endChar, el.to);
        if (from < to)
          builder.add(from, to, Decoration.mark({ attributes: { style: ERROR_STYLE } }));
      } catch (_) { /* line number out of range */ }
    } else {
      // error thrown but no position in message — mark first non-whitespace token
      const firstToken = view.state.doc.toString().search(/\S/);
      if (firstToken !== -1)
        builder.add(firstToken, firstToken + 1, Decoration.mark({ attributes: { style: ERROR_STYLE } }));
    }
  }
  return builder.finish();
}

function errorPlugin(onError) {
  return ViewPlugin.fromClass(
    class {
      constructor(view) { this.decorations = buildErrorDecorations(view, onError); }
      update(update) {
        if (update.docChanged) this.decorations = buildErrorDecorations(update.view, onError);
      }
    },
    { decorations: v => v.decorations }
  );
}

function sommarkPlugin(config) {
  return ViewPlugin.fromClass(
    class {
      constructor(view) { this.decorations = buildDecorations(view, config); }
      update(update) {
        if (update.docChanged) this.decorations = buildDecorations(update.view, config);
      }
    },
    { decorations: v => v.decorations }
  );
}

export function attachHighlighter(element, config = {}) {
  const { caretColor = "#e8eaf0", showLineNumbers = true, showErrors = true, onError, ...highlightConfig } = config;

  let onUpdateCallback = null;

  const theme = EditorView.theme({
    "&":                  { height: "100%", background: "transparent" },
    ".cm-scroller":       { fontFamily: "inherit", fontSize: "inherit", lineHeight: "inherit", overflow: "auto" },
    ".cm-content":        { padding: "1rem 0", caretColor },
    ".cm-line":           { padding: "0 1.25rem" },
    ".cm-cursor, .cm-dropCursor": { borderLeftColor: caretColor },
    ".cm-selectionBackground, .cm-content ::selection": { background: "rgba(99,102,241,0.3) !important" },
    ".cm-focused":        { outline: "none" },
    ".cm-gutters":        { background: "transparent", border: "none", borderRight: "1px solid rgba(255,255,255,0.07)", color: "#4b4f68" },
    ".cm-gutterElement":  { padding: "0 0.75rem 0 0.5rem", textAlign: "right" },
    ".cm-activeLineGutter": { background: "transparent", color: "#8b8fa8" },
    ".cm-activeLine":     { background: "rgba(99,102,241,0.04)" },
  });

  const extensions = [
    history(),
    keymap.of([...defaultKeymap, ...historyKeymap]),
    sommarkPlugin(highlightConfig),
    theme,
    EditorView.lineWrapping,
    EditorView.updateListener.of(update => {
      if (update.docChanged && onUpdateCallback)
        onUpdateCallback(update.view.state.doc.toString());
    }),
  ];

  if (showLineNumbers) extensions.push(lineNumbers());
  if (showErrors) extensions.push(errorPlugin(onError));

  const view = new EditorView({
    state: EditorState.create({ doc: "", extensions }),
    parent: element,
  });

  return {
    getValue: ()     => view.state.doc.toString(),
    setValue: (code) => view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: code } }),
    onUpdate: (fn)   => { onUpdateCallback = fn; },
    destroy:  ()     => view.destroy(),
  };
}
