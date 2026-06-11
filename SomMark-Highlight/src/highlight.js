import { lexSync } from "../bundle/sommark.parser.js";
import defaults from "./defaults.js";

// ── Helpers ───────────────────────────────────────────────────

function escapeHtml(str) {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function applyStyle(value, config) {
  if (!config) return escapeHtml(value);

  const style = [];
  if (config.color)  style.push(`color:${config.color}`);
  if (config.bold)   style.push(`font-weight:bold`);
  if (config.italic) style.push(`font-style:italic`);

  if (style.length === 0) return escapeHtml(value);
  return `<span style="${style.join(";")}">${escapeHtml(value)}</span>`;
}

// ── Core renderer ─────────────────────────────────────────────

// Resolves what to render for a single token given full context.
// Priority: onToken → tokens[type] → other → default → raw
function renderToken(ctx, userTokens, other, onToken) {
  const { prev, current, next } = ctx;
  const escaped = escapeHtml(current.value);

  // 1. onToken — full override
  if (onToken) {
    const result = onToken(ctx);
    if (result !== undefined && result !== null) return result;
  }

  // 2. tokens[type] — per-token config
  const tokenConfig = userTokens?.[current.type];
  if (tokenConfig !== undefined) {
    // explicit null → no highlight
    if (tokenConfig === null) return escaped;
    // string shorthand: "red" → color
    if (typeof tokenConfig === "string") {
      return `<span style="color:${tokenConfig}">${escaped}</span>`;
    }
    // { render } — custom renderer, no context
    if (typeof tokenConfig.render === "function") {
      return tokenConfig.render(current.value, current.type);
    }
    // { context } — context-sensitive renderer
    if (typeof tokenConfig.context === "function") {
      const result = tokenConfig.context(ctx);
      if (result !== undefined && result !== null) return result;
    }
    // { color, bold?, italic? }
    if (tokenConfig.color !== undefined || tokenConfig.bold || tokenConfig.italic) {
      return applyStyle(current.value, tokenConfig);
    }
  }

  // 3. other — fallback for unspecified tokens
  if (other !== undefined) {
    if (typeof other === "string") {
      return `<span style="color:${other}">${escaped}</span>`;
    }
    if (typeof other.render === "function") {
      return other.render(current.value, current.type);
    }
    if (typeof other.context === "function") {
      const result = other.context(ctx);
      if (result !== undefined && result !== null) return result;
    }
    if (other.color !== undefined || other.bold || other.italic) {
      return applyStyle(current.value, other);
    }
    if (other === null) return escaped;
  }

  // 4. built-in defaults
  const def = defaults[current.type];
  if (def) return applyStyle(current.value, def);

  // 5. raw — no highlight
  return escaped;
}

// ── staticHighlight ───────────────────────────────────────────

export function staticHighlight(text, config = {}) {
  const { tokens: userTokens, other, onToken } = config;

  const rawTokens = lexSync(text);

  return rawTokens
    .map((current, i) => {
      if (current.type === "EOF") return "";
      if (current.type === "WHITESPACE") return current.value;

      const prev = rawTokens[i - 1] ?? null;
      const next = rawTokens[i + 1] ?? null;

      const rendered = renderToken({ prev, current, next }, userTokens, other, onToken);

      if (current.type === "LOGIC") {
        // Lexer strips ${ and }$ — restore them styled as the preceding keyword
        const kwType   = prev?.type ?? "STATIC_KEYWORD";
        const openHtml  = renderToken({ prev, current: { type: kwType, value: "${" },  next: current }, userTokens, other, onToken);
        const closeHtml = renderToken({ prev: current, current: { type: kwType, value: "}$" }, next }, userTokens, other, onToken);
        return openHtml + rendered + closeHtml;
      }

      return rendered;
    })
    .join("");
}
