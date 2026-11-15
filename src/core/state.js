// Shared UI state and small helpers.
// ---------- state ----------
const st = { crew: "CDR", day: 48, env: "iss", sys: "cardiovascular", ind: "bp_systolic", suited: true };
const $ = s => document.querySelector(s);
const fmt = (v, id) => !isNum(v) ? "—" : (id === "core_temp" ? v.toFixed(2) : (Number.isInteger(v) ? v : (+v).toFixed(1)));
const unitOf = id => IND[id] ? IND[id].unit : DERIVED[id].unit;
const nameOf = id => IND[id] ? IND[id].name : DERIVED[id].name;
const maxDay = () => Math.max(...ROWS[st.crew].map(r => r.day));
const minDay = () => Math.min(...ROWS[st.crew].map(r => r.day));
const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

// ---------- disclosure helpers ----------
const OPEN = {};
document.addEventListener("toggle", ev => { const k = ev.target.dataset && ev.target.dataset.k; if (k) OPEN[k] = ev.target.open; }, true);
const disc = (k, summary, body, cls = "") => `<details class="disc ${cls}" data-k="${k}" ${OPEN[k] ? "open" : ""}><summary><span>${summary}</span></summary><div class="disc-b">${body}</div></details>`;
// small tappable "Why?" that hides an explanation
const whyHTML = (k, body, label = "Why?") => `<details class="why" data-k="${k}" ${OPEN[k] ? "open" : ""}><summary>${label}</summary><div>${body}</div></details>`;
const actsHTML = (list, k) => `<div class="note">${esc(list[0])}</div>${list.length > 1 ? `<details class="more" data-k="${k}" ${OPEN[k] ? "open" : ""}><summary>${list.length - 1} more step${list.length > 2 ? "s" : ""}</summary><ul>${list.slice(1).map(a => `<li>${esc(a)}</li>`).join("")}</ul></details>` : ""}`;

// Shared with other modules (see README: "How modules share code").
Object.assign(window, { st, $, fmt, unitOf, nameOf, maxDay, minDay, esc, OPEN, disc, whyHTML, actsHTML });
