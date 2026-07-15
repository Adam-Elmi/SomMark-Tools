import jsTokens from "js-tokens";

const JS_KEYWORDS = new Set([
  "break", "case", "catch", "class", "const", "continue", "debugger",
  "default", "delete", "do", "else", "export", "extends", "finally",
  "for", "function", "if", "import", "in", "instanceof", "let", "new",
  "of", "return", "static", "super", "switch", "this", "throw", "try",
  "typeof", "var", "void", "while", "with", "yield",
  "async", "await",
  "true", "false", "null", "undefined",
]);

const COLORS = {
  keyword:   "color:#c586c0",
  funcCall:  "color:#f9ee9a",
  objKey:    "color:#7dd3fc",
  property:  "color:#7dd3fc",
  string:    "color:#ce9178",
  template:  "color:#ce9178",
  number:    "color:#b5cea8",
  comment:   "color:#4b4f68;font-style:italic",
  regex:     "color:#f87171",
  operator:  "color:#d4d4d4",
  ident:     "color:#60a5fa",
};

const WHITESPACE_TYPES = new Set(["WhiteSpace", "LineTerminatorSequence"]);

function nextMeaningful(tokens, i) {
  for (let j = i + 1; j < tokens.length; j++) {
    if (!WHITESPACE_TYPES.has(tokens[j].type)) return tokens[j];
  }
  return null;
}

function prevMeaningful(tokens, i) {
  for (let j = i - 1; j >= 0; j--) {
    if (!WHITESPACE_TYPES.has(tokens[j].type)) return tokens[j];
  }
  return null;
}

function styleFor(tokens, i) {
  const token = tokens[i];

  switch (token.type) {
    case "IdentifierName": {
      if (JS_KEYWORDS.has(token.value)) return COLORS.keyword;
      const next = nextMeaningful(tokens, i);
      const prev = prevMeaningful(tokens, i);
      // function call: identifier followed by (
      if (next?.type === "Punctuator" && next.value === "(") return COLORS.funcCall;
      // object key: identifier followed by : (skip if prev is case/? to avoid ternary/switch)
      if (next?.type === "Punctuator" && next.value === ":" &&
          prev?.value !== "case" && prev?.value !== "?") return COLORS.objKey;
      // property access: identifier preceded by .
      if (prev?.type === "Punctuator" && prev.value === ".") return COLORS.property;
      return COLORS.ident;
    }
    case "StringLiteral": {
      const nextT = nextMeaningful(tokens, i);
      const prevT = prevMeaningful(tokens, i);
      if (nextT?.value === ":" && prevT?.value !== "?") return COLORS.objKey;
      return COLORS.string;
    }
    case "NoSubstitutionTemplate":
    case "TemplateHead":
    case "TemplateMiddle":
    case "TemplateTail":
      return COLORS.template;
    case "NumericLiteral":
      return COLORS.number;
    case "RegularExpressionLiteral":
      return COLORS.regex;
    case "SingleLineComment":
    case "MultiLineComment":
      return COLORS.comment;
    case "Punctuator":
      return COLORS.operator;
    default:
      return null;
  }
}

function escapeHtml(str) {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function span(style, value) {
  return `<span style="${style}">${escapeHtml(value)}</span>`;
}

export function highlightJs(code) {
  const tokens = [...jsTokens(code)];
  let out = "";
  for (let i = 0; i < tokens.length; i++) {
    const style = styleFor(tokens, i);
    out += style ? span(style, tokens[i].value) : escapeHtml(tokens[i].value);
  }
  return out;
}

// For the dynamic editor — writes decorations directly, no HTML parsing.
// mark(from, to, style) adds a CodeMirror decoration.
export function decorateJs(value, pos, mark) {
  const tokens = [...jsTokens(value)];
  let offset = 0;
  for (let i = 0; i < tokens.length; i++) {
    const len   = tokens[i].value.length;
    const style = styleFor(tokens, i);
    if (style) mark(pos + offset, pos + offset + len, style);
    offset += len;
  }
}
