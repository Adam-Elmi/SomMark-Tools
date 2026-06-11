# sommark-highlight

Syntax highlighting for [SomMark](https://github.com/Adam-Elmi/SomMark). Works in the browser and in Node.js terminals. Supports static HTML output and a live editor powered by CodeMirror 6.

---

## Install

```bash
npm install sommark-highlight
```

---

## CDN (no bundler)

Two pre-built IIFE bundles are shipped in `dist/`. Load whichever fits your use case — both expose a global `SomMarkHighlight` object.

### Static highlighting only (9 KB gzipped)

```html
<script src="https://cdn.jsdelivr.net/npm/sommark-highlight/dist/sommark-highlight.js"></script>
<script>
  const { staticHighlight } = SomMarkHighlight;

  document.getElementById("output").innerHTML = staticHighlight(`
    [div = class: "hero"]
      [h1]Hello World[end]
    [end]
  `);
</script>
```

### Full bundle — static + live editor (200 KB gzipped)

Includes `staticHighlight`, `defaultTokens`, and `attachHighlighter`. CodeMirror is bundled in — no extra scripts needed.

```html
<script src="https://cdn.jsdelivr.net/npm/sommark-highlight/dist/sommark-highlight.full.js"></script>
<script>
  const { staticHighlight, attachHighlighter } = SomMarkHighlight;

  const editor = attachHighlighter(document.getElementById("editor"), {
    tokens: {
      IDENTIFIER: "#60a5fa",
      KEY:        "#34d399",
      END_KEYWORD: { color: "#6366f1", bold: true },
    },
    other: "#8b8fa8",
    onError: (msg) => {
      document.getElementById("errors").textContent = msg ?? "";
    },
  });

  editor.setValue(`[h1]Hello World[end]`);
</script>
```

---

## Two modes

| Mode | What it does | Import |
|------|-------------|--------|
| **Static** | Turns SomMark source into highlighted HTML | `sommark-highlight` |
| **Dynamic** | Mounts a live editor with real-time highlighting | `sommark-highlight/dynamic` |

---

## Static highlighting

Takes a SomMark string and returns an HTML string with inline styles. Drop it into any `<pre>` tag.

```js
import { staticHighlight } from "sommark-highlight";

const html = staticHighlight(`
  [div = class: "container"]
    [h1]Hello World[end]
  [end]
`);

document.getElementById("output").innerHTML = html;
```

### With custom colors

Pass a `tokens` object to override colors for specific token types:

```js
const html = staticHighlight(src, {
  tokens: {
    IDENTIFIER: "#f472b6",
    KEY:        "#34d399",
    END_KEYWORD: { color: "#6366f1", bold: true },
    COMMENT:     { color: "#4b4f68", italic: true },
  }
});
```

Each token entry can be:

| Format | Example | Effect |
|--------|---------|--------|
| A color string | `"#f472b6"` | Sets the text color |
| `{ color, bold?, italic? }` | `{ color: "#f00", bold: true }` | Color with font style |
| `{ render }` | `{ render: (value) => \`<span ...>\${value}</span>\`` } | Full control over the output HTML |
| `{ context }` | `{ context: ({ prev, current, next }) => ... }` | Color based on surrounding tokens |
| `null` | `null` | No highlight — renders plain text |

### Fallback color for all other tokens

Use `other` to set a color for any token that has no specific config:

```js
const html = staticHighlight(src, {
  tokens: {
    IDENTIFIER: "#60a5fa",
  },
  other: "#8b8fa8"  // everything else gets this color
});
```

### Full control with `onToken`

`onToken` runs before everything else. Return a string to override, or `undefined` to fall through to the normal priority chain:

```js
const html = staticHighlight(src, {
  onToken: ({ prev, current, next }) => {
    if (current.type === "IDENTIFIER") {
      return `<span style="color:#60a5fa">${current.value}</span>`;
    }
    // return undefined to use normal highlighting for other tokens
  }
});
```

### Priority order

When deciding how to render a token, `staticHighlight` follows this order:

1. `onToken` — if it returns a value, that is used
2. `tokens[type]` — the per-type config you provided
3. `other` — the fallback config
4. Built-in defaults
5. Plain text — no highlight

---

## Dynamic editor

Mounts a live CodeMirror 6 editor that highlights SomMark as you type. Requires `@codemirror/view`, `@codemirror/state`, and `@codemirror/commands` to be installed.

```bash
npm install @codemirror/view @codemirror/state @codemirror/commands
```

```js
import { attachHighlighter } from "sommark-highlight/dynamic";

const editor = attachHighlighter(document.getElementById("editor"), {
  tokens: {
    IDENTIFIER: "#60a5fa",
    KEY:        "#34d399",
    END_KEYWORD: { color: "#6366f1", bold: true },
  },
  other: "#8b8fa8",
});

// Set initial content
editor.setValue(`[h1]Hello[end]`);

// Read current content
const code = editor.getValue();

// Listen for changes
editor.onUpdate((code) => {
  console.log("changed:", code);
});

// Clean up when done
editor.destroy();
```

### Editor options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `tokens` | object | — | Per-token color config (same as static) |
| `other` | string \| object | — | Fallback for unspecified tokens |
| `onToken` | function | — | Full override per token |
| `caretColor` | string | `"#e8eaf0"` | Color of the text cursor |
| `showLineNumbers` | boolean | `true` | Show line numbers on the left |
| `showErrors` | boolean | `true` | Underline syntax errors with a red wavy line |
| `onError` | function | — | Called with the error message string on parse error, `null` when the document is clean |

### Editor API

| Method | Description |
|--------|-------------|
| `getValue()` | Returns the current editor content as a string |
| `setValue(code)` | Replaces the editor content |
| `onUpdate(fn)` | Calls `fn(code)` every time the content changes |
| `destroy()` | Removes the editor and cleans up |

---

## Token types

These are all the token types you can target in your `tokens` config:

| Token | What it represents |
|-------|--------------------|
| `IDENTIFIER` | Block names — `div`, `h1`, `Card`, etc. |
| `KEY` | Prop keys — `class`, `id`, `title`, etc. |
| `VALUE` | Prop values |
| `END_KEYWORD` | The `end` keyword that closes blocks |
| `TEXT` | Plain text content inside blocks |
| `COMMENT` | Single-line comments starting with `#` |
| `COMMENT_BLOCK` | Multi-line comments wrapped in `###` |
| `OPEN_BRACKET` | `[` |
| `CLOSE_BRACKET` | `]` |
| `EQUAL` | `=` |
| `COLON` | `:` |
| `COMMA` | `,` |
| `QUOTE` | `"` |
| `EXCLAMATION_MARK` | `!` in self-closing blocks `[br!]` |
| `THIN_ARROW` | `->` in inline elements |
| `OPEN_PAREN` | `(` in inline elements |
| `CLOSE_PAREN` | `)` in inline elements |
| `OPEN_AT` | `@_` in at-blocks |
| `CLOSE_AT` | `@` closing at-blocks |
| `SEMICOLON` | `;` in at-blocks |
| `PREFIX_V` | `v{...}` local variable |
| `PREFIX_P` | `p{...}` public placeholder |
| `PREFIX_JS` | `js{...}` JS data value |
| `LOGIC` | Content inside `static ${}$` or `runtime ${}$` |
| `STATIC_KEYWORD` | The `static` keyword |
| `RUNTIME_KEYWORD` | The `runtime` keyword |
| `FOR_EACH` | The `for-each` keyword |
| `IMPORT` | The `import` keyword |
| `SLOT_KEYWORD` | The `slot` keyword |
| `USE_MODULE` | The `$use-module` keyword |
| `ESCAPE` | Escaped characters |

---

## Default theme

If you call `staticHighlight(src)` with no config, built-in default colors are used. You can access them to extend or override:

```js
import { staticHighlight, defaultTokens } from "sommark-highlight";

const html = staticHighlight(src, {
  tokens: {
    ...defaultTokens,
    IDENTIFIER: "#f472b6",  // override just this one
  }
});
```

---

## License

MIT
