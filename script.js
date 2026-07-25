const textA = document.getElementById("textA");
const textB = document.getElementById("textB");
const output = document.getElementById("outputContainer");
const diffContainer = document.getElementById("diffContainer");
const resultA = document.getElementById("resultA");
const resultB = document.getElementById("resultB");
const identicalMsg = document.getElementById("identicalMsg");

const diffStats = document.getElementById("diffStats");
const diffLegend = document.getElementById("diffLegend");
const addedCountEl = document.getElementById("addedCount");
const removedCountEl = document.getElementById("removedCount");
const liveDot = document.querySelector(".sticky-dot");
const ignoreCaseCheckbox = document.getElementById("ignoreCaseCheckbox");
const ignoreLineBreaksCheckbox = document.getElementById(
  "ignoreLineBreaksCheckbox",
);
const sortAlphaCheckbox = document.getElementById("sortAlphaCheckbox");
const counterA = document.getElementById("counterA");
const counterB = document.getElementById("counterB");

/* ===== Plus button + Extras panel + Click-here nudge ===== */
const plusButton = document.getElementById("plusButton");
const plusNudge = document.getElementById("plusNudge");
const extrasPanel = document.getElementById("extrasPanel");

let hasAutoScrolled = false;
let legentAnimation = false;

/* Escape HTML */
function escapeHtml(str) {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/* Word/char counting — always on raw textarea value, independent of comparison options */
function countWords(str) {
  const trimmed = str.trim();
  return trimmed === "" ? 0 : trimmed.split(/\s+/).length;
}

function countCharacters(str) {
  return str.length;
}

function updateCounter(el, text) {
  el.textContent = `${countWords(text)} words · ${countCharacters(text)} characters`;
}

/* Collapse a line break (and surrounding horizontal whitespace) into a single space — comparison only */
function normalizeLineBreaks(str) {
  return str.replace(/\s*(?:\r\n|\r|\n)+\s*/g, " ").trim();
}

/* Sort lines alphabetically (case-insensitive, locale-aware) — comparison only.
   Order is decided from trimmed+lowercased text; the line's own content is kept as-is. */
function sortLines(str) {
  return str
    .split("\n")
    .sort((x, y) =>
      x.trim().toLowerCase().localeCompare(y.trim().toLowerCase()),
    )
    .join("\n");
}

/* DMP diff → structured + COUNTS */
function diffWithDMP(a, b, options = {}) {
  const { ignoreCase = false } = options;
  const dmp = new diff_match_patch();

  // Diff lowercased copies when ignoring case, but walk pointers over the
  // ORIGINAL strings so rendered output keeps the user's real capitalization.
  const compareA = ignoreCase ? a.toLowerCase() : a;
  const compareB = ignoreCase ? b.toLowerCase() : b;

  const diffs = dmp.diff_main(compareA, compareB);
  dmp.diff_cleanupSemantic(diffs);

  let added = 0;
  let removed = 0;
  let posA = 0;
  let posB = 0;

  const parts = diffs.map(([op, text]) => {
    const len = text.length;
    let originalA = "";
    let originalB = "";

    if (op === 0) {
      originalA = a.slice(posA, posA + len);
      originalB = b.slice(posB, posB + len);
      posA += len;
      posB += len;
    } else if (op === -1) {
      removed++;
      originalA = a.slice(posA, posA + len);
      posA += len;
    } else {
      added++;
      originalB = b.slice(posB, posB + len);
      posB += len;
    }

    return {
      type: op === 0 ? "equal" : op === -1 ? "removed" : "added",
      textA: escapeHtml(originalA),
      textB: escapeHtml(originalB),
    };
  });

  return { parts, added, removed };
}

/* Render diff with perspective */
function renderDiff(parts, perspective) {
  return parts
    .map((part) => {
      if (part.type === "equal") {
        // textA/textB only diverge when Ignore Capitalization is on
        return perspective === "A" ? part.textA : part.textB;
      }

      if (part.type === "removed") {
        const cls = perspective === "A" ? "word-removed" : "word-removed muted";

        return `<span class="${cls}" data-tooltip="Available in Text A only">${part.textA}</span>`;
      }

      if (part.type === "added") {
        const cls = perspective === "B" ? "word-added" : "word-added muted";

        return `<span class="${cls}" data-tooltip="Available in Text B only">${part.textB}</span>`;
      }
    })
    .join("");
}

/* Main compare */
function compare() {
  const a = textA.value;
  const b = textB.value;

  // Reset UI
  addedCountEl.textContent = "0";
  removedCountEl.textContent = "0";
  diffStats.hidden = true;
  liveDot.classList.remove("is-diff");
  backToTop.style.display = "none";

  if (!a.trim() && !b.trim()) {
    output.style.display = "none";
    hasAutoScrolled = false;
    return;
  }

  output.style.display = "block";
  identicalMsg.hidden = true;
  diffContainer.style.display = "grid";
  diffLegend.style.display = "flex";

  if (!legentAnimation) {
    diffLegend.style.animation = "none";
    diffLegend.offsetHeight; // force reflow
    diffLegend.style.animation = "";
    legentAnimation = true;
  }

  const ignoreCase = ignoreCaseCheckbox.checked;
  const ignoreLineBreaks = ignoreLineBreaksCheckbox.checked;
  const sortAlpha = sortAlphaCheckbox.checked;

  // Comparison-only normalization — textarea values (a, b) stay untouched
  let normA = ignoreLineBreaks ? normalizeLineBreaks(a) : a;
  let normB = ignoreLineBreaks ? normalizeLineBreaks(b) : b;

  if (sortAlpha) {
    normA = sortLines(normA);
    normB = sortLines(normB);
  }

  let isIdentical = ignoreCase
    ? normA.trim().toLowerCase() === normB.trim().toLowerCase()
    : normA.trim() === normB.trim();

  if (isIdentical) {
    diffContainer.style.display = "none";
    diffLegend.style.display = "none";
    identicalMsg.hidden = false;
    legentAnimation = false;
    return;
  }

  const linesA = normA.split("\n");
  const linesB = normB.split("\n");
  const max = Math.max(linesA.length, linesB.length);

  const outA = [];
  const outB = [];

  let totalAdded = 0;
  let totalRemoved = 0;

  for (let i = 0; i < max; i++) {
    const la = linesA[i] || "";
    const lb = linesB[i] || "";

    const diff = diffWithDMP(la, lb, { ignoreCase });

    totalAdded += diff.added;
    totalRemoved += diff.removed;

    outA.push(renderDiff(diff.parts, "A"));
    outB.push(renderDiff(diff.parts, "B"));
  }

  resultA.innerHTML = outA.join("\n");
  resultB.innerHTML = outB.join("\n");

  if (totalAdded > 0 || totalRemoved > 0) {
    addedCountEl.textContent = totalAdded;
    removedCountEl.textContent = totalRemoved;
    diffStats.hidden = false;
    liveDot.classList.add("is-diff");
  }

  // Auto-scroll once
  if (!hasAutoScrolled) {
    requestAnimationFrame(() => {
      output.scrollIntoView({ behavior: "smooth", block: "start" });
      hasAutoScrolled = true;
    });
  }
}

/* Debounced auto-compare */
let t;
const counterMap = new Map([
  [textA, counterA],
  [textB, counterB],
]);

[textA, textB].forEach((el) =>
  el.addEventListener("input", () => {
    updateCounter(counterMap.get(el), el.value);

    clearTimeout(t);
    t = setTimeout(compare, 220);
  }),
);

[ignoreCaseCheckbox, ignoreLineBreaksCheckbox, sortAlphaCheckbox].forEach(
  (el) => el.addEventListener("change", compare),
);

/* Tooltip logic */
const tooltip = document.getElementById("diffTooltip");

document.addEventListener("mouseover", (e) => {
  if (
    e.target.classList.contains("word-added") ||
    e.target.classList.contains("word-removed")
  ) {
    tooltip.textContent = e.target.dataset.tooltip;
    tooltip.style.opacity = "1";
  }
});

document.addEventListener("mousemove", (e) => {
  if (tooltip.style.opacity === "1") {
    tooltip.style.left = e.clientX + 12 + "px";
    tooltip.style.top = e.clientY + 12 + "px";
  }
});

document.addEventListener("mouseout", (e) => {
  if (
    e.target.classList.contains("word-added") ||
    e.target.classList.contains("word-removed")
  ) {
    tooltip.style.opacity = "0";
  }
});

function setExtrasOpen(open) {
  document.body.classList.toggle("extras-open", open);
  extrasPanel.hidden = !open;
  plusButton.setAttribute("aria-expanded", open ? "true" : "false");
}

plusButton.addEventListener("click", (e) => {
  e.stopPropagation();
  setExtrasOpen(extrasPanel.hidden);
});

plusNudge.addEventListener("click", (e) => {
  e.stopPropagation();
  setExtrasOpen(true);
});

/* Close on click outside */
document.addEventListener("click", (e) => {
  if (extrasPanel.hidden) return;
  if (extrasPanel.contains(e.target)) return;
  if (plusButton.contains(e.target)) return;
  setExtrasOpen(false);
});

/* Close on Esc, return focus to the + */
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && !extrasPanel.hidden) {
    setExtrasOpen(false);
    plusButton.focus();
  }
});

/* ===== Active-extras status chips (under the subtitle) ===== */
const EXTRA_OPTIONS = [
  {
    id: "ignoreCaseCheckbox",
    chip: "ignore caps",
    full: "Ignore Capitalization",
  },
  {
    id: "ignoreLineBreaksCheckbox",
    chip: "remove line breaks",
    full: "Remove line breaks",
  },
  {
    id: "sortAlphaCheckbox",
    chip: "sort A–Z",
    full: "Sort lines alphabetically",
  },
];

const activeExtras = document.getElementById("activeExtras");

function renderActiveExtras() {
  activeExtras.innerHTML = "";
  const active = EXTRA_OPTIONS.filter(
    (o) => document.getElementById(o.id).checked,
  );

  if (active.length === 0) {
    activeExtras.hidden = true;
    return;
  }

  activeExtras.hidden = false;

  active.forEach((o, i) => {
    if (i > 0) {
      const sep = document.createElement("span");
      sep.className = "active-extra-sep";
      sep.setAttribute("aria-hidden", "true");
      sep.textContent = "|";
      activeExtras.appendChild(sep);
    }

    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "active-extra";
    btn.textContent = o.chip;
    btn.title = "Turn off: " + o.full; /* native hover tooltip = full label */
    btn.setAttribute("aria-label", "Turn off " + o.full);
    btn.addEventListener("click", () => {
      const cb = document.getElementById(o.id);
      cb.checked = false;
      cb.dispatchEvent(
        new Event("change"),
      ); /* reuses the existing compare + render path */
    });
    activeExtras.appendChild(btn);
  });
}

/* Re-render the chips whenever any toggle changes (panel or chip) */
EXTRA_OPTIONS.forEach((o) => {
  document.getElementById(o.id).addEventListener("change", renderActiveExtras);
});

/* Initial paint (empty → stays hidden) */
renderActiveExtras();

/* Back to top */
const backToTop = document.getElementById("backToTop");
function updateBackToTopVisibility() {
  const hasVerticalScroll =
    document.documentElement.scrollHeight >
    document.documentElement.clientHeight;

  const userScrolledDown = window.scrollY > 200;

  backToTop.style.display =
    hasVerticalScroll && userScrolledDown ? "flex" : "none";
}

window.addEventListener("scroll", updateBackToTopVisibility);
window.addEventListener("resize", updateBackToTopVisibility);

backToTop.onclick = () => window.scrollTo({ top: 0, behavior: "smooth" });
