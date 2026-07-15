// Default token colors — VS Code Dark+ palette (same as old SomMark-Site playground)
import { highlightJs, decorateJs } from "./js-highlight.js";

function _esc(s) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

const _BOOL_NULL = new Set(["true", "false", "null", "undefined"]);

const defaults = {
  OPEN_BRACKET:     { color: "#c586c0" },
  CLOSE_BRACKET:    { color: "#c586c0" },
  EQUAL:            { color: "#8b8fa8" },
  COLON:            { color: "#8b8fa8" },
  COMMA:            { color: "#8b8fa8" },
  SEMICOLON:        { color: "#8b8fa8" },
  QUOTE:            { color: "#ce9178" },
  THIN_ARROW:       { color: "#8b8fa8" },
  OPEN_AT:          { color: "#c586c0" },
  CLOSE_AT:         { color: "#c586c0" },
  OPEN_PAREN:       { color: "#8b8fa8" },
  CLOSE_PAREN:      { color: "#8b8fa8" },
  ESCAPE:           { color: "#fb923c" },
  EXCLAMATION_MARK: { color: "#f87171" },

  END_KEYWORD:      { color: "#c586c0", bold: true },
  IMPORT:           { color: "#c586c0" },
  USE_MODULE:       { color: "#c586c0" },
  SLOT_KEYWORD:     { color: "#c586c0" },
  FOR_EACH:         { color: "#c586c0" },
  STATIC_KEYWORD:   { color: "#c586c0" },
  RUNTIME_KEYWORD:  { color: "#c586c0" },

  IDENTIFIER:       { color: "#4ec9b0" },
  KEY:              { color: "#7dd3fc" },

  // String content between quotes → #ce9178 (same as the quote chars)
  // Numbers → #b5cea8, booleans/null → #569CD6, everything else → #fbbf24
  VALUE: {
    context: ({ prev, current, next }) => {
      const v = current.value;
      if (prev?.type === "QUOTE" && next?.type === "QUOTE")
        return `<span style="color:#ce9178">${_esc(v)}</span>`;
      if (prev?.type !== "QUOTE" && v.trim() !== "" && !isNaN(Number(v)))
        return `<span style="color:#b5cea8">${_esc(v)}</span>`;
      if (prev?.type !== "QUOTE" && _BOOL_NULL.has(v.trim()))
        return `<span style="color:#569CD6">${_esc(v)}</span>`;
      return `<span style="color:#fbbf24">${_esc(v)}</span>`;
    },
  },

  PREFIX_V:         { color: "#c586c0" },
  PREFIX_P:         { color: "#c586c0" },
  PREFIX_OPEN:      { color: "#c586c0" },
  PREFIX_CLOSE:     { color: "#c586c0" },

  LOGIC_OPEN:       { color: "#569CD6" },
  // JS inside logic blocks is highlighted with the same JS highlighter.
  // `decorate` is the efficient path for the dynamic editor (direct decorations, no HTML parsing).
  // `render` is the fallback for static HTML output.
  LOGIC:            { render: (value) => highlightJs(value), decorate: decorateJs },
  LOGIC_CLOSE:      { color: "#569CD6" },
  PIPELINE:         { color: "#8b8fa8" },

  COMMENT:          { color: "#6a9955", italic: true },
  COMMENT_BLOCK:    { color: "#6a9955", italic: true },

  TEXT:             { color: "#e8eaf0" },
  WHITESPACE:       null,
  EOF:              null,
};

export default defaults;
