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

let hasAutoScrolled = false;
let legentAnimation = false;

/* Escape HTML */
function escapeHtml(str) {
    return str
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");
}

/* DMP diff → structured + COUNTS */
function diffWithDMP(a, b) {
    const dmp = new diff_match_patch();
    const diffs = dmp.diff_main(a, b);
    dmp.diff_cleanupSemantic(diffs);

    let added = 0;
    let removed = 0;

    const parts = diffs.map(([op, text]) => {
        if (op === 1) added++;
        if (op === -1) removed++;

        return {
            type: op === 0 ? "equal" : op === -1 ? "removed" : "added",
            text: escapeHtml(text)
        };
    });

    return { parts, added, removed };
}

/* Render diff with perspective */
function renderDiff(parts, perspective) {
    return parts.map(part => {

        if (part.type === "equal") return part.text;

        if (part.type === "removed") {
            const cls = perspective === "A"
                ? "word-removed"
                : "word-removed muted";

            return `<span class="${cls}" data-tooltip="Available in Text A only">${part.text}</span>`;
        }

        if (part.type === "added") {
            const cls = perspective === "B"
                ? "word-added"
                : "word-added muted";

            return `<span class="${cls}" data-tooltip="Available in Text B only">${part.text}</span>`;
        }

    }).join("");
}

/* Main compare */
function compare() {
    const a = textA.value;
    const b = textB.value;

    // Reset UI
    addedCountEl.textContent = "0";
    removedCountEl.textContent = "0";
    diffStats.hidden = true;

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

    if (a.trim() === b.trim()) {
        diffContainer.style.display = "none";
        diffLegend.style.display = "none";
        identicalMsg.hidden = false;
        legentAnimation = false;
        return;
    }

    const linesA = a.split("\n");
    const linesB = b.split("\n");
    const max = Math.max(linesA.length, linesB.length);

    const outA = [];
    const outB = [];

    let totalAdded = 0;
    let totalRemoved = 0;

    for (let i = 0; i < max; i++) {
        const la = linesA[i] || "";
        const lb = linesB[i] || "";

        const diff = diffWithDMP(la, lb);

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
[textA, textB].forEach(el =>
    el.addEventListener("input", () => {
        clearTimeout(t);
        t = setTimeout(compare, 220);
    })
);

/* Tooltip logic */
const tooltip = document.getElementById("diffTooltip");

document.addEventListener("mouseover", (e) => {
    if (e.target.classList.contains("word-added") ||
        e.target.classList.contains("word-removed")) {
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
    if (e.target.classList.contains("word-added") ||
        e.target.classList.contains("word-removed")) {
        tooltip.style.opacity = "0";
    }
});

/* Back to top */
const backToTop = document.getElementById("backToTop");
window.addEventListener("scroll", () => {
    backToTop.style.display = window.scrollY > 250 ? "block" : "none";
});
backToTop.onclick = () => window.scrollTo({ top: 0, behavior: "smooth" });
