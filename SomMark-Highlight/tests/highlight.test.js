import { describe, it, expect } from "vitest";
import { staticHighlight, defaultTokens } from "../index.js";

// ── Fixtures ──────────────────────────────────────────────────

const SIMPLE   = `[div][end]`;
const WITH_KEY = `[div = class: "hello"][end]`;
const COMMENT  = `# this is a comment`;
const PREFIXES = `v{name} p{title} js{1 + 1}`;
const LOGIC    = `static \${ const x = 1; }$`;
const MULTILINE = `[div = class: "container"]\n  Hello world\n[end]`;

// ── Helpers ───────────────────────────────────────────────────

const spanWith = (color, value) =>
  `<span style="color:${color}">${value}</span>`;

const spanWithStyle = (style, value) =>
  `<span style="${style}">${value}</span>`;

// ── staticHighlight — defaults ────────────────────────────────

describe("staticHighlight — defaults", () => {
  it("returns a string", () => {
    expect(typeof staticHighlight(SIMPLE)).toBe("string");
  });

  it("wraps IDENTIFIER in default teal span", () => {
    const out = staticHighlight(SIMPLE);
    expect(out).toContain(spanWith("#4ec9b0", "div"));
  });

  it("wraps END_KEYWORD in default purple bold span", () => {
    const out = staticHighlight(SIMPLE);
    expect(out).toContain(spanWithStyle("color:#c586c0;font-weight:bold", "end"));
  });

  it("wraps KEY in default sky-blue span", () => {
    const out = staticHighlight(WITH_KEY);
    expect(out).toContain(spanWith("#7dd3fc", "class"));
  });

  it("wraps COMMENT in default green italic span", () => {
    const out = staticHighlight(COMMENT);
    expect(out).toContain(spanWithStyle("color:#6a9955;font-style:italic", "# this is a comment"));
  });

  it("wraps PREFIX_V in default purple span", () => {
    const out = staticHighlight(PREFIXES);
    expect(out).toContain(`<span style="color:#c586c0">v</span>`);
  });

  it("wraps PREFIX_P in default purple span", () => {
    const out = staticHighlight(PREFIXES);
    expect(out).toContain(`<span style="color:#c586c0">p</span>`);
  });

  it("passes WHITESPACE through unstyled", () => {
    const out = staticHighlight(MULTILINE);
    expect(out).toContain("\n");
    expect(out).toContain("  ");
  });

  it("does not include EOF in output", () => {
    const out = staticHighlight(SIMPLE);
    expect(out).not.toContain("EOF");
  });

  it("empty string returns empty string", () => {
    expect(staticHighlight("")).toBe("");
  });
});

// ── tokens — string shorthand ─────────────────────────────────

describe("tokens — string shorthand", () => {
  it("applies color string to matching token", () => {
    const out = staticHighlight(SIMPLE, {
      tokens: { IDENTIFIER: "red" }
    });
    expect(out).toContain(spanWith("red", "div"));
  });

  it("does not affect other tokens", () => {
    const out = staticHighlight(SIMPLE, {
      tokens: { IDENTIFIER: "red" }
    });
    // END_KEYWORD still uses default
    expect(out).toContain("#c586c0");
  });
});

// ── tokens — object shapes ────────────────────────────────────

describe("tokens — { color }", () => {
  it("applies color from object", () => {
    const out = staticHighlight(SIMPLE, {
      tokens: { IDENTIFIER: { color: "#ff6b6b" } }
    });
    expect(out).toContain(spanWith("#ff6b6b", "div"));
  });
});

describe("tokens — { color, bold, italic }", () => {
  it("adds font-weight when bold is true", () => {
    const out = staticHighlight(SIMPLE, {
      tokens: { IDENTIFIER: { color: "blue", bold: true } }
    });
    expect(out).toContain("font-weight:bold");
  });

  it("adds font-style when italic is true", () => {
    const out = staticHighlight(SIMPLE, {
      tokens: { IDENTIFIER: { color: "blue", italic: true } }
    });
    expect(out).toContain("font-style:italic");
  });

  it("combines color bold italic into single span", () => {
    const out = staticHighlight(SIMPLE, {
      tokens: { IDENTIFIER: { color: "blue", bold: true, italic: true } }
    });
    expect(out).toContain("color:blue;font-weight:bold;font-style:italic");
  });
});

describe("tokens — { render }", () => {
  it("uses render function return value verbatim", () => {
    const out = staticHighlight(SIMPLE, {
      tokens: {
        IDENTIFIER: { render: (v) => `<b class="id">${v}</b>` }
      }
    });
    expect(out).toContain(`<b class="id">div</b>`);
  });

  it("render receives value and type", () => {
    let capturedValue, capturedType;
    staticHighlight(SIMPLE, {
      tokens: {
        IDENTIFIER: {
          render: (v, t) => { capturedValue = v; capturedType = t; return v; }
        }
      }
    });
    expect(capturedValue).toBe("div");
    expect(capturedType).toBe("IDENTIFIER");
  });
});

describe("tokens — { context }", () => {
  it("context receives prev, current, next", () => {
    let ctx;
    staticHighlight(WITH_KEY, {
      tokens: {
        KEY: {
          context: (c) => { ctx = c; return c.current.value; }
        }
      }
    });
    expect(ctx.current.type).toBe("KEY");
    expect(ctx.current.value).toBe("class");
    expect(ctx.prev).not.toBeNull();
    expect(ctx.next).not.toBeNull();
  });

  it("context return value is used as output", () => {
    const out = staticHighlight(WITH_KEY, {
      tokens: {
        KEY: { context: ({ current }) => `<em>${current.value}</em>` }
      }
    });
    expect(out).toContain("<em>class</em>");
  });

  it("context returning undefined falls through to other/default", () => {
    const out = staticHighlight(WITH_KEY, {
      tokens: { KEY: { context: () => undefined } },
      other: "gray"
    });
    // KEY fell through context → other → gray span
    expect(out).toContain(spanWith("gray", "class"));
  });

  it("VALUE context can distinguish quoted vs unquoted", () => {
    const out = staticHighlight(WITH_KEY, {
      tokens: {
        VALUE: {
          context: ({ prev, current, next }) => {
            if (prev?.type === "QUOTE" && next?.type === "QUOTE")
              return `<span style="color:gold">${current.value}</span>`;
            return `<span style="color:lime">${current.value}</span>`;
          }
        }
      }
    });
    // "hello" is VALUE between two QUOTEs → gold
    expect(out).toContain(spanWith("gold", "hello"));
  });
});

describe("tokens — null disables highlight", () => {
  it("null value outputs raw escaped text", () => {
    const out = staticHighlight(SIMPLE, {
      tokens: { IDENTIFIER: null }
    });
    expect(out).toContain("div");
    // div should appear as raw text, not wrapped in any span
    expect(out).not.toMatch(/<span[^>]*>div<\/span>/);
  });
});

// ── other ─────────────────────────────────────────────────────

describe("other — fallback", () => {
  it("string shorthand applies to tokens not in tokens map", () => {
    // Use empty tokens map so everything hits `other`
    const out = staticHighlight(`[div][end]`, {
      tokens: {},
      other: "pink"
    });
    expect(out).toContain(spanWith("pink", "div"));
  });

  it("does not override tokens that ARE in the tokens map", () => {
    const out = staticHighlight(SIMPLE, {
      tokens: { IDENTIFIER: "blue" },
      other: "pink"
    });
    expect(out).toContain(spanWith("blue", "div"));
    expect(out).not.toContain(spanWith("pink", "div"));
  });

  it("object with render works as fallback", () => {
    const out = staticHighlight(`[div][end]`, {
      tokens: {},
      other: { render: (v, t) => `<i data-type="${t}">${v}</i>` }
    });
    expect(out).toContain(`<i data-type="IDENTIFIER">div</i>`);
  });
});

// ── onToken ───────────────────────────────────────────────────

describe("onToken — full override", () => {
  it("return value replaces all rendering", () => {
    const out = staticHighlight(SIMPLE, {
      onToken: ({ current }) => `[${current.type}:${current.value}]`
    });
    expect(out).toContain("[OPEN_BRACKET:[");
    expect(out).toContain("[IDENTIFIER:div]");
  });

  it("receives prev/current/next context", () => {
    const seen = [];
    staticHighlight(WITH_KEY, {
      onToken: ({ prev, current, next }) => {
        seen.push({ p: prev?.type, c: current.type, n: next?.type });
        return current.value;
      }
    });
    const keyEntry = seen.find(e => e.c === "KEY");
    expect(keyEntry).toBeDefined();
    expect(keyEntry.p).toBeDefined();
    expect(keyEntry.n).toBeDefined();
  });

  it("returning undefined falls through to tokens map", () => {
    const out = staticHighlight(SIMPLE, {
      tokens: { IDENTIFIER: "cyan" },
      onToken: ({ current }) => {
        if (current.type === "IDENTIFIER") return undefined; // fall through
        return current.value;
      }
    });
    expect(out).toContain(spanWith("cyan", "div"));
  });

  it("returning undefined falls through to other", () => {
    const out = staticHighlight(SIMPLE, {
      tokens: {},
      other: "orange",
      onToken: () => undefined
    });
    expect(out).toContain(spanWith("orange", "div"));
  });
});

// ── Priority order ────────────────────────────────────────────

describe("priority: onToken > tokens > other > default > raw", () => {
  it("onToken wins over tokens", () => {
    const out = staticHighlight(SIMPLE, {
      tokens: { IDENTIFIER: "red" },
      onToken: ({ current }) =>
        current.type === "IDENTIFIER" ? `<b>${current.value}</b>` : undefined
    });
    expect(out).toContain("<b>div</b>");
    expect(out).not.toContain("red");
  });

  it("tokens wins over other", () => {
    const out = staticHighlight(SIMPLE, {
      tokens: { IDENTIFIER: "red" },
      other: "blue"
    });
    expect(out).toContain(spanWith("red", "div"));
    expect(out).not.toContain(spanWith("blue", "div"));
  });

  it("other wins over default", () => {
    const out = staticHighlight(SIMPLE, {
      tokens: {},
      other: "purple"
    });
    // IDENTIFIER default is #4ec9b0 — other should override
    expect(out).toContain(spanWith("purple", "div"));
    expect(out).not.toContain("#4ec9b0");
  });
});

// ── LOGIC token — JS inside logic blocks ─────────────────────

describe("LOGIC token — JS inside static/runtime blocks", () => {
  const JS_BLOCK = `static \${ const x = 1 + 2; }\$`;
  const JS_MULTILINE = `runtime \${
  const user = { name: "Adam", active: true };
  return user.active ? user.name : null;
}\$`;

  it("renders LOGIC content with JS highlighting by default", () => {
    const out = staticHighlight(JS_BLOCK);
    // 'const' inside logic → JS keyword color
    expect(out).toContain("color:#c586c0");
    // numbers → JS number color
    expect(out).toContain("color:#b5cea8");
  });

  it("LOGIC token value is the raw JS content", () => {
    let captured;
    staticHighlight(JS_BLOCK, {
      tokens: {
        LOGIC: { render: (value) => { captured = value; return value; } }
      }
    });
    expect(captured).toContain("const x = 1 + 2;");
  });

  it("custom render replaces LOGIC output", () => {
    const out = staticHighlight(JS_BLOCK, {
      tokens: {
        LOGIC: { render: (value) => `<code class="js">${value}</code>` }
      }
    });
    expect(out).toContain(`<code class="js">`);
    expect(out).toContain("const x = 1 + 2;");
  });

  it("onToken can intercept LOGIC and inject custom highlight", () => {
    const out = staticHighlight(JS_BLOCK, {
      onToken: ({ current }) => {
        if (current.type === "LOGIC")
          return `<span style="color:#92d400">${current.value}</span>`;
      }
    });
    expect(out).toContain(`<span style="color:#92d400">`);
    expect(out).toContain("const x = 1 + 2;");
  });

  it("onToken returning undefined falls through to JS-highlighted default for LOGIC", () => {
    const out = staticHighlight(JS_BLOCK, {
      onToken: () => undefined
    });
    // JS highlighting still applied through the default
    expect(out).toContain("color:#c586c0");
  });

  it("works with runtime blocks too", () => {
    const out = staticHighlight(JS_MULTILINE);
    // LOGIC_OPEN and LOGIC_CLOSE should be highlighted with default blue
    expect(out).toContain("#569CD6");
    // LOGIC content uses default gray
    expect(out).toContain("#d4d4d4");
  });

  it("VALUE default colors string content same as QUOTE (#ce9178)", () => {
    // [div = class: "hello"][end] — VALUE "hello" is between two QUOTEs
    const out = staticHighlight(WITH_KEY);
    // QUOTE chars are #ce9178, VALUE between quotes should also be #ce9178
    const quoteMatches  = [...out.matchAll(/color:#ce9178/g)];
    expect(quoteMatches.length).toBeGreaterThanOrEqual(3); // two QUOTEs + the value
    expect(out).toContain(`<span style="color:#ce9178">hello</span>`);
  });

  it("VALUE default colors numbers as #b5cea8", () => {
    const out = staticHighlight(`[div = width: 100][end]`);
    expect(out).toContain(`<span style="color:#b5cea8">100</span>`);
  });

  it("VALUE default colors booleans/null as #569CD6", () => {
    const outTrue  = staticHighlight(`[input = disabled: true][end]`);
    const outNull  = staticHighlight(`[img = src: null][end]`);
    expect(outTrue).toContain(`<span style="color:#569CD6">true</span>`);
    expect(outNull).toContain(`<span style="color:#569CD6">null</span>`);
  });

  it("STATIC_KEYWORD and RUNTIME_KEYWORD use default purple", () => {
    const staticOut  = staticHighlight(JS_BLOCK);
    const runtimeOut = staticHighlight(JS_MULTILINE);
    expect(staticOut).toContain(`<span style="color:#c586c0">static `);
    expect(runtimeOut).toContain(`<span style="color:#c586c0">runtime`);
  });
});

// ── defaultTokens export ──────────────────────────────────────

describe("defaultTokens export", () => {
  it("is an object", () => {
    expect(typeof defaultTokens).toBe("object");
  });

  it("contains expected token keys", () => {
    expect(defaultTokens).toHaveProperty("IDENTIFIER");
    expect(defaultTokens).toHaveProperty("KEY");
    expect(defaultTokens).toHaveProperty("END_KEYWORD");
    expect(defaultTokens).toHaveProperty("COMMENT");
  });

  it("IDENTIFIER has a color property", () => {
    expect(defaultTokens.IDENTIFIER.color).toBeDefined();
  });
});
