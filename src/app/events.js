// Global event wiring. Loaded last.
// ---------- events ----------
$("#env").innerHTML = Object.values(ENV).map(e => `<option value="${e.id}">${esc(e.name)}</option>`).join("");
$("#env").onchange = e => { st.env = e.target.value; render(); renderAstro(); };
$("#day").oninput = e => { st.day = +e.target.value; render(); };
document.addEventListener("click", ev => {
  const c = ev.target.closest("[data-crew]");
  if (c && c.classList.contains("crewcard")) { st.crew = c.dataset.crew; render(); return; }
  if (c && c.classList.contains("tl-cell")) { st.crew = c.dataset.crew; st.day = +c.dataset.day; render(); return; }
  const s = ev.target.closest("[data-sys]");
  if (s) { st.sys = s.dataset.sys; const first = SYS[st.sys].indicators[0]; st.ind = first; render(); return; }
  const r = ev.target.closest(".ind-row");
  if (r) { st.ind = r.dataset.ind; renderDetail(); renderChart(); return; }
  const j = ev.target.closest("[data-jump]");
  if (j) { const [cr, dy, sy, ind] = j.dataset.jump.split(","); Object.assign(st, { crew: cr, day: +dy, sys: sy, ind, suited: false }); render(); document.getElementById("body").scrollIntoView({ behavior: "smooth", block: "start" }); }
});
document.addEventListener("keydown", ev => {
  if (ev.key !== "Enter" && ev.key !== " ") return;
  const s = ev.target.closest("#astro .organ[data-sys]"); if (s) { ev.preventDefault(); st.suited = false; st.sys = s.dataset.sys; st.ind = SYS[st.sys].indicators[0]; render(); }
  const r = ev.target.closest(".ind-row"); if (r) { ev.preventDefault(); st.ind = r.dataset.ind; renderDetail(); renderChart(); }
});
let timer = null;
$("#btn-play").onclick = () => {
  if (timer) { clearInterval(timer); timer = null; $("#btn-play").textContent = "▶ Play"; return; }
  if (st.day >= maxDay()) st.day = 1;
  $("#btn-play").textContent = "❚❚ Pause";
  timer = setInterval(() => { if (st.day >= maxDay()) { $("#btn-play").click(); return; } st.day++; render(); }, 220);
};

// First paint.
renderAstro();
window.addEventListener("resize", () => { renderChart(); if ($("#dlg-nasa").open) renderNasaChart(); });
render();

// Shared with other modules (see README: "How modules share code").
Object.assign(window, { timer });
