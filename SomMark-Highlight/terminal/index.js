import { staticHighlight } from "../index.js";

const sample = `[Layout = title: "Home", lang: "en"]
  [div = class: "hero"]
    # page heading
    [h1 = class: "title"]v{name}[end]
    [p = class: "bio"]p{description}[end]
    static \${
      const x = 1 + 1;
    }\$
  [end]
[end]`;

const RESET  = "\x1b[0m";
const BOLD   = "\x1b[1m";
const ITALIC = "\x1b[3m";
const DIM    = "\x1b[2m";

// Map token types to ANSI codes
const ANSI = {
  OPEN_BRACKET:     "\x1b[90m",  // dark gray
  CLOSE_BRACKET:    "\x1b[90m",
  EQUAL:            "\x1b[90m",
  COLON:            "\x1b[90m",
  COMMA:            "\x1b[90m",
  QUOTE:            "\x1b[90m",
  IDENTIFIER:       "\x1b[34m",  // blue
  KEY:              "\x1b[32m",  // green
  END_KEYWORD:      "\x1b[35m",  // magenta
  IMPORT:           "\x1b[95m",  // bright magenta
  USE_MODULE:       "\x1b[95m",
  SLOT_KEYWORD:     "\x1b[95m",
  FOR_EACH:         "\x1b[95m",
  STATIC_KEYWORD:   "\x1b[95m",
  RUNTIME_KEYWORD:  "\x1b[95m",
  PREFIX_V:         "\x1b[35m",  // magenta
  PREFIX_P:         "\x1b[33m",  // yellow
  PREFIX_JS:        "\x1b[93m",  // bright yellow
  PREFIX_OPEN:      "\x1b[35m",  // magenta
  PREFIX_CLOSE:     "\x1b[35m",
  LOGIC_OPEN:       "\x1b[34m",  // blue
  LOGIC_CLOSE:      "\x1b[34m",
  LOGIC:            "\x1b[92m",  // bright green
  ESCAPE:           "\x1b[33m",
  EXCLAMATION_MARK: "\x1b[31m",  // red
  TEXT:             RESET,
};

// ── Test 1: onToken with raw ANSI ─────────────────────────────
console.log("\n── Test 1: onToken (raw ANSI) ─────────────────────\n");

const out1 = staticHighlight(sample, {
  onToken: ({ prev, current, next }) => {
    if (current.type === "COMMENT" || current.type === "COMMENT_BLOCK")
      return `${DIM}${ITALIC}${current.value}${RESET}`;

    if (current.type === "END_KEYWORD")
      return `${BOLD}${ANSI.END_KEYWORD}${current.value}${RESET}`;

    if (current.type === "VALUE") {
      // quoted string content
      if (prev?.type === "QUOTE" && next?.type === "QUOTE")
        return `\x1b[33m${current.value}${RESET}`;
      return `\x1b[92m${current.value}${RESET}`;
    }

    const code = ANSI[current.type];
    if (code) return `${code}${current.value}${RESET}`;

    return undefined; // fall through to defaults
  }
});

process.stdout.write(out1 + "\n");

// ── Test 2: other fallback ────────────────────────────────────
console.log("\n── Test 2: other fallback ─────────────────────────\n");

const out2 = staticHighlight(`[div = class: "hello"][end]`, {
  tokens: {
    IDENTIFIER:  { render: (v) => `\x1b[34m${v}${RESET}` },
    END_KEYWORD: { render: (v) => `${BOLD}\x1b[35m${v}${RESET}` },
    KEY:         { render: (v) => `\x1b[32m${v}${RESET}` },
  },
  other: { render: (v) => `\x1b[90m${v}${RESET}` }
});

process.stdout.write(out2 + "\n");

// ── Test 3: tokens map with ANSI colors ──────────────────────
console.log("\n── Test 3: tokens map (ANSI colors) ───────────────\n");


const out3 = staticHighlight(sample, {
  tokens: Object.fromEntries(
    Object.entries(ANSI).map(([type, code]) => [
      type,
      { render: (v) => `${code}${v}${RESET}` },
    ])
  ),
  other: { render: (v) => `${DIM}${v}${RESET}` },
});

process.stdout.write(out3 + "\n");

// ── Test 4: JS code inside logic blocks ──────────────────────
console.log("\n── Test 4: JS inside logic blocks ─────────────────\n");

// A simple JS tokenizer for ANSI output.
// Handles keywords, strings, numbers, comments, and operators.
function highlightJsAnsi(js) {
  const KEYWORD = "\x1b[95m"; // bright magenta — const/let/if/return/etc.
  const STRING  = "\x1b[33m"; // yellow — string literals
  const NUMBER  = "\x1b[36m"; // cyan — numbers
  const COMMENT = `${DIM}${ITALIC}`; // dim italic — // and /* */
  const OP      = "\x1b[90m"; // dark gray — operators and punctuation

  const KEYWORDS = new Set([
    "const", "let", "var", "if", "else", "return", "true", "false", "null",
    "undefined", "function", "class", "new", "typeof", "instanceof", "for",
    "while", "do", "break", "continue", "throw", "try", "catch", "finally",
  ]);

  // Tokenize with a single regex alternation
  const re = /(\/\/[^\n]*)|(\/\*[\s\S]*?\*\/)|("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|`(?:[^`\\]|\\.)*`)|(\b\d+\.?\d*\b)|([A-Za-z_$][\w$]*)|([+\-*/=<>!&|^~%?:,.;()[\]{}])/g;

  let result = "";
  let last = 0;
  let m;
  while ((m = re.exec(js)) !== null) {
    // unstyled gap before this match
    if (m.index > last) result += js.slice(last, m.index);
    last = m.index + m[0].length;

    if (m[1] || m[2]) {
      result += `${COMMENT}${m[0]}${RESET}`;
    } else if (m[3]) {
      result += `${STRING}${m[0]}${RESET}`;
    } else if (m[4]) {
      result += `${NUMBER}${m[0]}${RESET}`;
    } else if (m[5]) {
      result += KEYWORDS.has(m[0])
        ? `${KEYWORD}${m[0]}${RESET}`
        : m[0];
    } else if (m[6]) {
      result += `${OP}${m[0]}${RESET}`;
    }
  }
  if (last < js.length) result += js.slice(last);
  return result;
}

const jsLogicSample = `[Layout = title: "Home", lang: "en"]
  [div = class: "hero"]
    # heading
    [h1]v{name}[end]
    static \${
      // fetch user profile
      const user = { name: "Adam", age: 25, active: true };

      /* check eligibility */
      const eligible = user.age >= 18 && user.active;

      if (eligible) {
        return \`Welcome, \${user.name}!\`;
      }

      return null;
    }\$
  [end]
[end]`;

const out4 = staticHighlight(jsLogicSample, {
  onToken: ({ prev, current, next }) => {
    if (current.type === "LOGIC")
      return highlightJsAnsi(current.value);

    if (current.type === "COMMENT" || current.type === "COMMENT_BLOCK")
      return `${DIM}${ITALIC}${current.value}${RESET}`;

    if (current.type === "END_KEYWORD")
      return `${BOLD}${ANSI.END_KEYWORD}${current.value}${RESET}`;

    if (current.type === "VALUE") {
      if (prev?.type === "QUOTE" && next?.type === "QUOTE")
        return `\x1b[33m${current.value}${RESET}`;
      return `\x1b[92m${current.value}${RESET}`;
    }

    const code = ANSI[current.type];
    if (code) return `${code}${current.value}${RESET}`;

    return undefined;
  }
});

process.stdout.write(out4 + "\n");
