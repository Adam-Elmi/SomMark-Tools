// Default token colors — web CSS values
// These are used when the user doesn't specify a token config

const defaults = {
  OPEN_BRACKET:     { color: "#8b8fa8" },
  CLOSE_BRACKET:    { color: "#8b8fa8" },
  EQUAL:            { color: "#8b8fa8" },
  COLON:            { color: "#8b8fa8" },
  COMMA:            { color: "#4b4f68" },
  SEMICOLON:        { color: "#4b4f68" },
  QUOTE:            { color: "#4b4f68" },
  THIN_ARROW:       { color: "#8b8fa8" },
  OPEN_AT:          { color: "#8b8fa8" },
  CLOSE_AT:         { color: "#8b8fa8" },
  OPEN_PAREN:       { color: "#8b8fa8" },
  CLOSE_PAREN:      { color: "#8b8fa8" },
  ESCAPE:           { color: "#fb923c" },
  EXCLAMATION_MARK: { color: "#f87171" },

  END_KEYWORD:      { color: "#6366f1", bold: true },
  IMPORT:           { color: "#818cf8" },
  USE_MODULE:       { color: "#818cf8" },
  SLOT_KEYWORD:     { color: "#818cf8" },
  FOR_EACH:         { color: "#c084fc" },
  STATIC_KEYWORD:   { color: "#c084fc" },
  RUNTIME_KEYWORD:  { color: "#c084fc" },

  IDENTIFIER:       { color: "#60a5fa" },
  KEY:              { color: "#34d399" },

  // VALUE is context-sensitive — handled via the context handler in highlight.js
  // No default entry here so it falls through to `other`

  PREFIX_V:         { color: "#f472b6" },
  PREFIX_P:         { color: "#fb923c" },
  PREFIX_JS:        { color: "#facc15" },

  LOGIC:            { color: "#a3e635" },

  COMMENT:          { color: "#4b4f68", italic: true },
  COMMENT_BLOCK:    { color: "#4b4f68", italic: true },

  TEXT:             { color: "#e8eaf0" },
  WHITESPACE:       null,
  EOF:              null,
};

export default defaults;
