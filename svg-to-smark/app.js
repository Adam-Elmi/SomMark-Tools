const { staticHighlight } = SomMarkHighlight;

// ── Elements ──────────────────────────────────────────────────────────────────
const collectionsToggle    = document.getElementById("collectionsToggle");
const collectionsBody      = document.getElementById("collectionsBody");
const collectionsSearch    = document.getElementById("collectionsSearch");
const collectionsMeta      = document.getElementById("collectionsMeta");
const collectionsGrid      = document.getElementById("collectionsGrid");
const allCollectionsToggle = document.getElementById("allCollectionsToggle");
const inputFormat          = document.getElementById("inputFormat");
const iconInput            = document.getElementById("iconInput");
const fetchBtn             = document.getElementById("fetchBtn");
const fetchStatus          = document.getElementById("fetchStatus");
const searchHint           = document.getElementById("searchHint");
const resultsWrap          = document.getElementById("resultsWrap");
const resultsGrid          = document.getElementById("resultsGrid");
const resultsCount         = document.getElementById("resultsCount");
const resultsSpinner       = document.getElementById("resultsSpinner");
const previewIcon          = document.getElementById("previewIcon");
const previewName          = document.getElementById("previewName");
const svgInput             = document.getElementById("svgInput");
const svgDisplay           = document.getElementById("svgDisplay");
const convertBtn           = document.getElementById("convertBtn");
const clearSvgBtn          = document.getElementById("clearSvgBtn");
const output               = document.getElementById("output");
const copyBtn              = document.getElementById("copyBtn");
const endToggle            = document.getElementById("endToggle");

let currentSommark  = "";
let lastSvgText     = "";
let namedEnd        = true;
let searchDebounce  = null;
let selectedResult  = null;
let selectedChip    = null;
let allCollections  = [];
let searchAllMode   = false;

// ── SomMark highlight config ──────────────────────────────────────────────────
const _esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

const highlightConfig = {
  tokens: {
    IDENTIFIER:      "#60a5fa",
    KEY:             "#34d399",
    END_KEYWORD:     { color: "#6366f1", bold: true },
    COMMENT:         { color: "#4b4f68", italic: true },
    COMMENT_BLOCK:   { color: "#4b4f68", italic: true },
    VALUE: {
      context: ({ prev, current, next }) => {
        const color = (prev?.type === "QUOTE" && next?.type === "QUOTE") ? "#fbbf24" : "#a3e635";
        return `<span style="color:${color}">${_esc(current.value)}</span>`;
      }
    },
    PREFIX_V:        "#f472b6",
    PREFIX_P:        "#fb923c",
    PREFIX_OPEN:     "#facc15",
    PREFIX_CLOSE:    "#facc15",
    LOGIC_OPEN:      "#a3e635",
    LOGIC_CLOSE:     "#a3e635",
    STATIC_KEYWORD:  "#c084fc",
    RUNTIME_KEYWORD: "#c084fc",
    FOR_EACH:        "#c084fc",
  },
  other: "#8b8fa8"
};

// ── SVG → SomMark ─────────────────────────────────────────────────────────────
function nodeToSommark(node, depth = 0) {
  const indent = "  ".repeat(depth);
  if (node.nodeType === Node.TEXT_NODE) {
    const t = node.textContent.trim();
    return t ? indent + t : null;
  }
  if (node.nodeType !== Node.ELEMENT_NODE) return null;
  // SVG elements must preserve case (clipPath ≠ clippath inside <svg>).
  // HTML elements in SVG namespace are lowercase already; HTML elements outside are uppercase → lowercase them.
  const tag = node.namespaceURI === "http://www.w3.org/2000/svg"
    ? node.tagName
    : node.tagName.toLowerCase();
  const attrs = Array.from(node.attributes)
    .map(a => {
      // Keys with colons or other non-identifier chars (e.g. xlink:href) must be quoted per SomMark props syntax
      const key = /[^a-zA-Z0-9\-_$]/.test(a.name)
        ? `"${a.name.replace(/"/g, '\\"')}"`
        : a.name;
      return `${key}: "${a.value.replace(/"/g, '\\"')}"`;
    })
    .join(", ");
  const attrStr = attrs ? ` = ${attrs}` : "";
  const children = Array.from(node.childNodes)
    .map(c => nodeToSommark(c, depth + 1))
    .filter(Boolean);
  if (children.length === 0) return `${indent}[${tag}${attrStr}!]`;
  return `${indent}[${tag}${attrStr}]\n${children.join("\n")}\n${indent}[end${namedEnd ? ":" + tag : ""}]`;
}

function svgStringToSommark(str) {
  // Use the HTML parser: more lenient than the XML parser and correctly sets up
  // SVG namespace so tagName case is preserved for SVG elements (clipPath, linearGradient, etc.)
  const doc = new DOMParser().parseFromString(str.trim(), "text/html");
  const svgEl = doc.querySelector("svg");
  if (!svgEl) throw new Error("Invalid SVG");
  return nodeToSommark(svgEl, 0);
}

// ── Display helpers ───────────────────────────────────────────────────────────
async function showSvgCode(svgText) {
  let formatted = svgText;
  try {
    formatted = await prettier.format(svgText, {
      parser: "html",
      plugins: prettierPlugins,
      printWidth: 80,
    });
  } catch { /* fall back to raw if Prettier fails */ }
  svgDisplay.innerHTML = Prism.highlight(formatted.trim(), Prism.languages.markup, "markup");
  svgInput.hidden   = true;
  convertBtn.hidden = true;
  svgDisplay.hidden = false;
  clearSvgBtn.style.display = "";
}

function clearSvgArea() {
  svgDisplay.hidden = true;
  svgDisplay.innerHTML = "";
  svgInput.hidden   = false;
  svgInput.value    = "";
  convertBtn.hidden = false;
  clearSvgBtn.style.display = "none";
  output.innerHTML  = '<span class="placeholder">Output will appear here...</span>';
  currentSommark    = "";
  lastSvgText       = "";
}

function setOutput(smark) {
  currentSommark = smark;
  output.innerHTML = staticHighlight(smark, highlightConfig);
}

function setStatus(type, msg) {
  fetchStatus.className = "status " + type;
  fetchStatus.textContent = msg;
}

// ── Load single icon ──────────────────────────────────────────────────────────
async function loadIcon(collection, name) {
  const res = await fetch(`https://api.iconify.design/${collection}/${name}.svg?color=%23e8eaf0`);
  if (!res.ok) throw new Error(`Not found: ${collection}/${name}`);
  const svgText = await res.text();
  if (!svgText.trim().startsWith("<svg")) throw new Error(`Not found: ${collection}/${name}`);

  previewIcon.innerHTML = svgText;
  const svg = previewIcon.querySelector("svg");
  if (svg) { svg.style.width = "24px"; svg.style.height = "24px"; }
  previewName.innerHTML =
    `<span style="color:var(--text-primary)">${collection}</span>` +
    `<span style="color:var(--text-muted)">/</span>` +
    `<span style="color:var(--text-secondary)">${name}</span>`;

  lastSvgText = svgText;
  await showSvgCode(svgText);
  setOutput(svgStringToSommark(svgText));
}

// ── Collections ───────────────────────────────────────────────────────────────
async function loadCollections() {
  try {
    const res  = await fetch("https://api.iconify.design/collections");
    const data = await res.json();
    allCollections = Object.entries(data).map(([prefix, info]) => ({
      prefix,
      name:     info.name     || prefix,
      total:    info.total    || 0,
      category: info.category || "Other",
    }));
    allCollections.sort((a, b) => a.name.localeCompare(b.name));
    renderCollections(allCollections);
    collectionsMeta.textContent = `${allCollections.length} collections available`;
  } catch {
    collectionsMeta.textContent = "Failed to load collections";
  }
}

function renderCollections(list) {
  collectionsGrid.innerHTML = "";
  list.forEach(col => {
    const chip = document.createElement("div");
    chip.className = "collection-chip";
    chip.dataset.prefix = col.prefix;
    chip.innerHTML =
      `<span class="chip-prefix">${col.prefix}</span>` +
      `<span class="chip-name">${col.name}</span>` +
      `<span class="chip-total">${col.total.toLocaleString()} icons</span>`;
    chip.addEventListener("click", () => {
      if (selectedChip) selectedChip.classList.remove("active");
      selectedChip = chip;
      chip.classList.add("active");
      iconInput.value = `${col.prefix}/`;
      iconInput.focus();
      searchHint.textContent = `Type an icon name to search in "${col.prefix}"`;
      searchHint.classList.add("visible");
      resultsWrap.classList.remove("visible");
      setStatus("", "");
    });
    collectionsGrid.appendChild(chip);
  });
}

collectionsToggle.addEventListener("click", () => {
  const open = collectionsBody.classList.toggle("open");
  collectionsToggle.textContent = open ? "hide" : "show";
  collectionsToggle.classList.toggle("open", open);
  if (open && allCollections.length === 0) loadCollections();
});

collectionsSearch.addEventListener("input", () => {
  const q = collectionsSearch.value.toLowerCase();
  const filtered = allCollections.filter(c =>
    c.prefix.includes(q) || c.name.toLowerCase().includes(q) || c.category.toLowerCase().includes(q)
  );
  renderCollections(filtered);
  collectionsMeta.textContent = `${filtered.length} of ${allCollections.length} collections`;
  if (selectedChip) {
    const match = collectionsGrid.querySelector(`[data-prefix="${selectedChip.dataset.prefix}"]`);
    if (match) { match.classList.add("active"); selectedChip = match; }
  }
});

// ── Icon search ───────────────────────────────────────────────────────────────
async function searchIcons(collection, query) {
  resultsSpinner.classList.add("visible");
  resultsCount.textContent = "";
  resultsGrid.innerHTML = "";
  selectedResult = null;
  try {
    const url = collection
      ? `https://api.iconify.design/search?query=${encodeURIComponent(query)}&prefix=${encodeURIComponent(collection)}&limit=40`
      : `https://api.iconify.design/search?query=${encodeURIComponent(query)}&limit=40`;
    const res  = await fetch(url);
    const data = await res.json();
    const icons = (data.icons || []).map(full => {
      const i = full.indexOf(":");
      return i >= 0
        ? { collection: full.slice(0, i), name: full.slice(i + 1) }
        : { collection, name: full };
    });
    resultsSpinner.classList.remove("visible");
    resultsCount.textContent = icons.length
      ? `${icons.length} result${icons.length !== 1 ? "s" : ""}`
      : "No results";
    renderResults(icons, !collection);
  } catch {
    resultsSpinner.classList.remove("visible");
    resultsCount.textContent = "Search error";
  }
}

function renderResults(icons, showCollection = false) {
  resultsGrid.innerHTML = "";
  icons.forEach(({ collection, name }) => {
    const item = document.createElement("div");
    item.className = "result-item";
    item.dataset.collection = collection;
    item.dataset.name = name;

    const iconEl = document.createElement("div");
    iconEl.className = "result-icon";
    const img = document.createElement("img");
    img.src = `https://api.iconify.design/${collection}/${name}.svg?color=%23e8eaf0&width=20&height=20`;
    img.alt = name;
    img.loading = "lazy";
    iconEl.appendChild(img);

    const nameEl = document.createElement("span");
    nameEl.className = "result-name";
    nameEl.textContent = showCollection ? `${collection}:${name}` : name;
    nameEl.title = `${collection}/${name}`;

    item.appendChild(iconEl);
    item.appendChild(nameEl);
    item.addEventListener("click", () => selectResult(item));
    resultsGrid.appendChild(item);
  });
}

async function selectResult(item) {
  if (selectedResult) selectedResult.classList.remove("selected");
  selectedResult = item;
  item.classList.add("selected");
  const { collection, name } = item.dataset;
  iconInput.value = `${collection}/${name}`;
  setStatus("", "");
  try {
    await loadIcon(collection, name);
    setStatus("ok", `✓ ${collection}/${name}`);
  } catch (e) {
    setStatus("error", e.message);
  }
}

// ── All-collections toggle ────────────────────────────────────────────────────
allCollectionsToggle.addEventListener("click", () => {
  searchAllMode = !searchAllMode;
  allCollectionsToggle.classList.toggle("open", searchAllMode);
  if (searchAllMode) {
    iconInput.placeholder = "github  or  arrow-right  to search all collections";
    inputFormat.style.display = "none";
    if (selectedChip) { selectedChip.classList.remove("active"); selectedChip = null; }
  } else {
    iconInput.placeholder = "ph/github-logo  or  ph/lua  to search";
    inputFormat.style.display = "";
  }
  iconInput.value = "";
  resultsWrap.classList.remove("visible");
  searchHint.classList.remove("visible");
  setStatus("", "");
  iconInput.focus();
});

// ── Input change → search ─────────────────────────────────────────────────────
function onInputChange() {
  const raw = iconInput.value.trim();

  if (searchAllMode) {
    if (!raw) { resultsWrap.classList.remove("visible"); return; }
    resultsWrap.classList.add("visible");
    clearTimeout(searchDebounce);
    searchDebounce = setTimeout(() => searchIcons("", raw), 320);
    return;
  }

  const slashIdx = raw.indexOf("/");
  if (slashIdx < 0) {
    resultsWrap.classList.remove("visible");
    searchHint.classList.remove("visible");
    setStatus("", "");
    return;
  }
  const collection = raw.slice(0, slashIdx);
  const query      = raw.slice(slashIdx + 1).trim();
  if (!collection) { resultsWrap.classList.remove("visible"); return; }
  if (!selectedChip || selectedChip.dataset.prefix !== collection) {
    if (selectedChip) selectedChip.classList.remove("active");
    selectedChip = collectionsGrid.querySelector(`[data-prefix="${collection}"]`) || null;
    if (selectedChip) selectedChip.classList.add("active");
  }
  if (!query) {
    searchHint.textContent = `Type an icon name to search in "${collection}"`;
    searchHint.classList.add("visible");
    resultsWrap.classList.remove("visible");
    setStatus("", "");
    return;
  }
  searchHint.classList.remove("visible");
  resultsWrap.classList.add("visible");
  clearTimeout(searchDebounce);
  searchDebounce = setTimeout(() => searchIcons(collection, query), 320);
}

// ── Fetch exact ───────────────────────────────────────────────────────────────
async function fetchExact() {
  const raw   = iconInput.value.trim();
  if (!raw) return;
  const slash = raw.indexOf("/");
  if (slash < 0) { setStatus("error", "Use format: collection/icon-name"); return; }
  const collection = raw.slice(0, slash);
  const name       = raw.slice(slash + 1).trim();
  if (!name) { setStatus("error", "Missing icon name after /"); return; }
  fetchBtn.disabled = true;
  setStatus("", "");
  try {
    await loadIcon(collection, name);
    setStatus("ok", `✓ ${collection}/${name} loaded`);
    resultsWrap.classList.remove("visible");
  } catch (e) {
    setStatus("error", e.message);
    previewIcon.innerHTML = "";
    previewName.innerHTML = `<span class="preview-empty">No icon loaded</span>`;
  } finally {
    fetchBtn.disabled = false;
  }
}

// ── Paste convert ─────────────────────────────────────────────────────────────
async function convertPasted() {
  const raw = svgInput.value.trim();
  if (!raw) return;
  try {
    lastSvgText = raw;
    await showSvgCode(raw);
    setOutput(svgStringToSommark(raw));
    previewIcon.innerHTML = raw;
    const svg = previewIcon.querySelector("svg");
    if (svg) { svg.style.width = "24px"; svg.style.height = "24px"; }
    previewName.innerHTML = `<span style="color:var(--text-secondary)">pasted SVG</span>`;
    setStatus("", "");
  } catch (e) {
    output.innerHTML = `<span class="placeholder">${e.message}</span>`;
  }
}

// ── Copy ──────────────────────────────────────────────────────────────────────
function copyOutput() {
  if (!currentSommark) return;
  navigator.clipboard.writeText(currentSommark).then(() => {
    copyBtn.textContent = "Copied!";
    copyBtn.classList.add("copied");
    setTimeout(() => { copyBtn.textContent = "Copy"; copyBtn.classList.remove("copied"); }, 1800);
  });
}

// ── Events ────────────────────────────────────────────────────────────────────
iconInput.addEventListener("input", onInputChange);
iconInput.addEventListener("keydown", e => { if (e.key === "Enter") fetchExact(); });
fetchBtn.addEventListener("click", fetchExact);
convertBtn.addEventListener("click", convertPasted);
clearSvgBtn.addEventListener("click", clearSvgArea);
copyBtn.addEventListener("click", copyOutput);
endToggle.addEventListener("click", () => {
  namedEnd = !namedEnd;
  endToggle.textContent = namedEnd ? "[end:name]" : "[end]";
  endToggle.classList.toggle("open", namedEnd);
  if (lastSvgText) setOutput(svgStringToSommark(lastSvgText));
});
