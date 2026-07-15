# Changelog

## 1.1.0 — 2026-07-16

### Added

**JS syntax highlighting inside logic blocks** — `static ${}$` and `runtime ${}$` blocks are now highlighted by default, no config needed.

```js
// Before — logic content was a flat gray (#d4d4d4)
staticHighlight(`static \${ const x = 1 + 2; }\$`);

// After — full JS highlighting applied automatically
staticHighlight(`static \${ const x = 1 + 2; }\$`);
// const  → keyword  #c586c0
// x      → ident    #60a5fa
// 1, 2   → number   #b5cea8
// +, ;   → operator #d4d4d4
```

The same JS highlighter also runs in the live editor (`attachHighlighter`) — no extra setup.

**Context-sensitive VALUE colors** — prop values are now colored by type out of the box.

```js
staticHighlight(`[img = src: "hero.png", width: 100, lazy: true][end]`);
// "hero.png" → string  #ce9178  (same color as the quote chars)
//  100       → number  #b5cea8
//  true      → boolean #569CD6
```

```
// cursor at column 4, tabSize 2
// before: "    [div]"
// one Backspace → "  [div]"   (deleted 2 spaces, back to previous stop)
```

### Changed

**New default color theme** — built-in colors now match the VS Code Dark+ palette used in the SomMark playground.

```js
// Before
// IDENTIFIER → #60a5fa   END_KEYWORD → #6366f1   KEY → #34d399

// After
// IDENTIFIER → #4ec9b0   END_KEYWORD → #c586c0   KEY → #7dd3fc
// QUOTE → #ce9178   COMMENT → #6a9955
// Keywords, prefixes, brackets → #c586c0
// Logic delimiters (${ }$) → #569CD6
```

Your own `tokens` config is unaffected — these are the fallback colors when no config is passed.

**Tab key now inserts indentation** — previously Tab moved focus out of the editor (browser default). Now Tab indents and Shift-Tab unindents.

### Fixed

- `browser/index.html`: two `<script type="module">` blocks both declared `const highlightConfig`, causing a "Cannot redeclare block-scoped variable" error. Merged into one script.
- Dynamic editor: `VALUE` and `LOGIC` tokens were not highlighted by default because the defaults step only handled `{ color }` shapes. Defaults now support `render`, `context`, and `decorate` shapes, the same as user-provided `tokens`.
- Dynamic editor: `other: { decorate }` was silently ignored — `decorate` check was missing from the `other` branch.
