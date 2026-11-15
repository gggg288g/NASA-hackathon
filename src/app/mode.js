// Tab switching between views.
function setMode(mode) {
  document.body.dataset.mode = mode;
  document.querySelectorAll("[data-mode]").forEach(b => { if (b.tagName === "BUTTON") b.setAttribute("aria-pressed", b.dataset.mode === mode); });
  window.scrollTo(0, 0);
  if (mode === "mo") { st.crew = am.me; st.day = Math.min(st.day, Math.max(...ROWS[st.crew].map(r => r.day))); render(); }
  else if (mode === "sc") renderSelfCheck();
  else renderAstro();
}
$("#me").innerHTML = CREW_IDS.map(c => `<option value="${c}">${esc(CREW_NAME[c])}</option>`).join("");
$("#me").onchange = ev => { am.me = ev.target.value; renderAstro(); if (document.body.dataset.mode === "sc") renderSelfCheck(); };

// Shared with other modules (see README: "How modules share code").
Object.assign(window, { setMode });
