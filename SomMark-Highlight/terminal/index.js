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
