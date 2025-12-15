// helpers: char-level and word-level LCS diffs
function diffChars(a, b) {
    const A = a.split(""), B = b.split("");
    const dp = [...Array(A.length + 1)].map(() => Array(B.length + 1).fill(0));
    for (let i = 1; i <= A.length; i++) {
        for (let j = 1; j <= B.length; j++) {
            dp[i][j] = A[i - 1] === B[j - 1] ? dp[i - 1][j - 1] + 1 : Math.max(dp[i - 1][j], dp[i][j - 1]);
        }
    }
    let i = A.length, j = B.length, outA = "", outB = "";
    while (i > 0 || j > 0) {
        if (i > 0 && j > 0 && A[i - 1] === B[j - 1]) {
            outA = A[i - 1] + outA; outB = B[j - 1] + outB; i--; j--;
        } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
            outB = `<span class="word-added">${escapeHtml(B[j - 1])}</span>` + outB; j--;
        } else {
            outA = `<span class="word-removed">${escapeHtml(A[i - 1])}</span>` + outA; i--;
        }
    }
    return { a: outA, b: outB };
}

function diffWords(a, b) {
    // keep spaces as tokens so we preserve spacing; tokens are escaped when rendered
    const A = a.split(/(\s+)/), B = b.split(/(\s+)/);
    const dp = [...Array(A.length + 1)].map(() => Array(B.length + 1).fill(0));
    for (let i = 1; i <= A.length; i++) {
        for (let j = 1; j <= B.length; j++) {
            dp[i][j] = A[i - 1] === B[j - 1] ? dp[i - 1][j - 1] + 1 : Math.max(dp[i - 1][j], dp[i][j - 1]);
        }
    }
    let i = A.length, j = B.length, outA = "", outB = "";
    while (i > 0 || j > 0) {
        if (i > 0 && j > 0 && A[i - 1] === B[j - 1]) {
            outA = escapeHtml(A[i - 1]) + outA; outB = escapeHtml(B[j - 1]) + outB; i--; j--;
        } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
            outB = `<span class="word-added">${escapeHtml(B[j - 1])}</span>` + outB; j--;
        } else {
            outA = `<span class="word-removed">${escapeHtml(A[i - 1])}</span>` + outA; i--;
        }
    }
    return { a: outA, b: outB };
}

// small helper to escape HTML before injecting
function escapeHtml(s) {
    if (s == null) return "";
    return String(s)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

// main compare function (auto)
function compare() {
    const outputContainer = document.getElementById("outputContainer");
    const diffContainer = document.getElementById("diffContainer");
    const resultA = document.getElementById("resultA");
    const resultB = document.getElementById("resultB");

    // clear
    resultA.innerHTML = "";
    resultB.innerHTML = "";
    const oldMsg = document.getElementById("identicalMsg");
    if (oldMsg) oldMsg.remove();
    if (diffContainer) diffContainer.style.display = "grid";

    const rawA = document.getElementById("textA").value;
    const rawB = document.getElementById("textB").value;
    const trimmedA = rawA.trim();
    const trimmedB = rawB.trim();

    // hide if both empty
    if (!trimmedA && !trimmedB) {
        outputContainer.style.display = "none"; return;
    }
    outputContainer.style.display = "block";

    // identical -> show banner, hide boxes
    if (trimmedA === trimmedB) {
        if (diffContainer) diffContainer.style.display = "none";
        outputContainer.insertAdjacentHTML("afterbegin", `
      <div id="identicalMsg">✨ Both texts are identical! No differences found. ✨</div>
    `);
        return;
    }
    if (diffContainer) diffContainer.style.display = "grid";

    const A = rawA.split("\n");
    const B = rawB.split("\n");
    let L = [], R = [];

    // line-level LCS alignment
    if (A.length === B.length) {
        L = A.slice(); R = B.slice();
    } else {
        const dp = [...Array(A.length + 1)].map(() => Array(B.length + 1).fill(0));
        for (let i = 1; i <= A.length; i++) {
            for (let j = 1; j <= B.length; j++) {
                dp[i][j] = A[i - 1] === B[j - 1] ? dp[i - 1][j - 1] + 1 : Math.max(dp[i - 1][j], dp[i][j - 1]);
            }
        }
        let i = A.length, j = B.length;
        while (i > 0 || j > 0) {
            if (i > 0 && j > 0 && A[i - 1] === B[j - 1]) {
                L.unshift(A[i - 1]); R.unshift(B[j - 1]); i--; j--;
            } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
                L.unshift(""); R.unshift(B[j - 1]); j--;
            } else {
                L.unshift(A[i - 1]); R.unshift(""); i--;
            }
        }
    }

    // Optionally: detect moved exact lines to mark as moved (not used here).
    // Now do word/char diff on aligned lines
    for (let k = 0; k < L.length; k++) {
        const lLine = L[k], rLine = R[k];
        if (lLine !== "" && rLine !== "") {
            // choose word diff for lines that contain spaces (long text), else char diff
            const diff = (lLine.includes(" ") && rLine.includes(" ")) ? diffWords(lLine, rLine) : diffChars(lLine, rLine);
            L[k] = diff.a;
            R[k] = diff.b;
        } else if (lLine === "" && rLine !== "") {
            R[k] = `<div class="line-added">${escapeHtml(rLine)}</div>`;
            L[k] = `<div class="line-added"></div>`;
        } else if (rLine === "" && lLine !== "") {
            L[k] = `<div class="line-removed">${escapeHtml(lLine)}</div>`;
            R[k] = `<div class="line-removed"></div>`;
        }
    }

    resultA.innerHTML = L.join("\n");
    resultB.innerHTML = R.join("\n");
}

// debounce & live input
let compareTimeout = null;
function scheduleCompare() {
    clearTimeout(compareTimeout);
    compareTimeout = setTimeout(compare, 220);
}
document.getElementById("textA").addEventListener("input", scheduleCompare);
document.getElementById("textB").addEventListener("input", scheduleCompare);

// back-to-top button logic
const backToTop = document.getElementById("backToTop");
window.addEventListener("scroll", () => { backToTop.style.display = window.scrollY > 250 ? "block" : "none"; });
backToTop.addEventListener("click", () => { window.scrollTo({ top: 0, behavior: "smooth" }); });
