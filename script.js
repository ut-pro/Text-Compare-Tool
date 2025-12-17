const textA = document.getElementById("textA");
const textB = document.getElementById("textB");
const output = document.getElementById("outputContainer");
const diffContainer = document.getElementById("diffContainer");
const resultA = document.getElementById("resultA");
const resultB = document.getElementById("resultB");
const identicalMsg = document.getElementById("identicalMsg");

/* Escape HTML */
function escapeHtml(str) {
    return str
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");
}

/* DMP diff → structured */
function diffWithDMP(a, b) {
    const dmp = new diff_match_patch();
    const diffs = dmp.diff_main(a, b);
    dmp.diff_cleanupSemantic(diffs);

    return diffs.map(([op, text]) => ({
        type: op === 0 ? "equal" : op === -1 ? "removed" : "added",
        text: escapeHtml(text)
    }));
}

/* Render diff with perspective */
function renderDiff(diffParts, perspective) {
    return diffParts.map(part => {

        if (part.type === "equal") return part.text;

        if (part.type === "removed") {
            const cls = perspective === "A"
                ? "word-removed"
                : "word-removed muted";

            return `<span class="${cls}" data-tooltip="Available in TextA only">${part.text}</span>`;
        }

        if (part.type === "added") {
            const cls = perspective === "B"
                ? "word-added"
                : "word-added muted";

            return `<span class="${cls}" data-tooltip="Available in TextB only">${part.text}</span>`;
        }

    }).join("");
}

/* Main compare */
function compare() {
    const a = textA.value;
    const b = textB.value;

    if (!a.trim() && !b.trim()) {
        output.style.display = "none";
        return;
    }

    output.style.display = "block";
    identicalMsg.hidden = true;
    diffContainer.style.display = "grid";

    if (a.trim() === b.trim()) {
        diffContainer.style.display = "none";
        identicalMsg.hidden = false;
        return;
    }

    const linesA = a.split("\n");
    const linesB = b.split("\n");
    const max = Math.max(linesA.length, linesB.length);

    const outA = [];
    const outB = [];

    for (let i = 0; i < max; i++) {
        const la = linesA[i] || "";
        const lb = linesB[i] || "";

        const diffParts = diffWithDMP(la, lb);
        outA.push(renderDiff(diffParts, "A"));
        outB.push(renderDiff(diffParts, "B"));
    }

    resultA.innerHTML = outA.join("\n");
    resultB.innerHTML = outB.join("\n");
}

/* Debounced auto-compare */
let t;
[textA, textB].forEach(el =>
    el.addEventListener("input", () => {
        clearTimeout(t);
        t = setTimeout(compare, 220);
    })
);

const tooltip = document.getElementById("diffTooltip");

function showTooltip(e) {
    const text = e.target.getAttribute("data-tooltip");
    if (!text) return;

    tooltip.textContent = text;
    tooltip.style.opacity = "1";
    tooltip.style.transform = "translateY(0)";
}

function moveTooltip(e) {
    tooltip.style.left = e.clientX + 12 + "px";
    tooltip.style.top = e.clientY + 12 + "px";
}

function hideTooltip() {
    tooltip.style.opacity = "0";
    tooltip.style.transform = "translateY(4px)";
}

// Delegate events (important because spans are dynamic)
document.addEventListener("mouseover", (e) => {
    if (e.target.classList.contains("word-added") ||
        e.target.classList.contains("word-removed")) {
        showTooltip(e);
    }
});

document.addEventListener("mousemove", (e) => {
    if (tooltip.style.opacity === "1") {
        moveTooltip(e);
    }
});

document.addEventListener("mouseout", (e) => {
    if (e.target.classList.contains("word-added") ||
        e.target.classList.contains("word-removed")) {
        hideTooltip();
    }
});

/* Back to top */
const backToTop = document.getElementById("backToTop");
window.addEventListener("scroll", () => {
    backToTop.style.display = window.scrollY > 250 ? "block" : "none";
});
backToTop.onclick = () => window.scrollTo({ top: 0, behavior: "smooth" });