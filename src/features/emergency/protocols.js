// Step-by-step on-board protocols.
// ---- on-board protocols (demo content based on public guidelines; real crews use their flight medical checklists) ----
const PROTOCOLS = {
  bp: { title: "High blood pressure", source: "AHA/ACC 2025: >180 and/or >120 mmHg is severe; with symptoms it is an emergency.",
    steps: [
      { t: "Stop what you are doing. Rest quietly, restrained, for 5 minutes." },
      { t: "Re-measure: cuff on bare upper arm at heart level, 2 readings 1 minute apart.", timer: 5 },
      { t: "Check for warning signs: severe headache, chest pain, shortness of breath, vision change, weakness or confusion." },
      { t: "If ANY warning sign, or a reading above 180/120: call the crew medical officer now and treat as an emergency per the onboard medical checklist." },
      { t: "No warning signs but still well above your baseline: tell the crew medical officer, skip strenuous exercise and re-check in 30 minutes.", timer: 30 },
      { t: "Log the readings and send the report to ground.", report: true },
    ] },
  fever: { title: "Fever (above your baseline)", source: "Baseline-relative: your in-flight normal is ~1 °C higher than on Earth (Stahn et al. 2017).",
    steps: [
      { t: "Stop exercise. Move to a cool area with airflow (fan)." },
      { t: "Re-measure at rest after 30 minutes. Exercise raises core temperature above 40 °C in space.", timer: 30 },
      { t: "Go through the symptom checklist: chills, sore throat, rash or blisters, cough, headache." },
      { t: "Drink fluids. Rash or blisters: limit close contact with crewmates until the medical officer assesses you (possible virus reactivation)." },
      { t: "Notify the crew medical officer. Medication only as directed by the onboard medical checklist." },
      { t: "Send the report to ground.", report: true },
    ] },
  hypo: { title: "Low blood sugar", source: "ADA 15-15 rule: 15 g fast-acting carbs, re-check after 15 min. Below 54 mg/dL is clinically significant.",
    steps: [
      { t: "Eat or drink 15 g of fast-acting carbohydrate now (e.g. juice pouch or glucose tablets from the food/med stores)." },
      { t: "Wait 15 minutes, then re-check your blood sugar.", timer: 15 },
      { t: "Still below 70 mg/dL? Repeat 15 g and re-check after 15 minutes.", timer: 15 },
      { t: "Once above 70: eat a normal snack or meal within the hour." },
      { t: "Tell a crewmate (buddy check). If confused, drowsy or below 54 mg/dL, the crew medical officer takes over." },
      { t: "Log what you ate and how much you exercised, then send the report.", report: true },
    ] },
};
let ptimer = null;
function openProtocol(key) {
  const P = PROTOCOLS[key], e = ENV[st.env];
  const auto = e.escalation_policy === "autonomous_first";
  $("#proto-body").innerHTML = `<h3 id="proto-title" style="font-size:24px">${esc(P.title)}</h3>
    <div class="fb tier-${auto ? "red" : "amber"}" style="margin-top:6px">${auto ? `<strong>${esc(fmtDelay(e))}.</strong> Ground cannot answer in time. Work through these steps on board first; the report goes out in parallel.` : `<strong>${esc(fmtDelay(e))}.</strong> Start these steps and contact the flight surgeon in parallel.`}</div>
    <ol>${P.steps.map((s, k) => `<li id="ps-${k}"><input type="checkbox" aria-label="Step ${k + 1} done" data-ps="${k}"><div>${esc(s.t)}${s.timer ? `<div style="margin-top:6px;display:flex;gap:8px;align-items:center"><button class="btn" type="button" data-pt="${s.timer}" data-pk="${k}">Start ${s.timer}-min timer</button><span class="timer" id="pt-${k}"></span></div>` : ""}${s.report ? `<div style="margin-top:6px"><button class="btn" type="button" data-prep="1">Prepare report</button></div>` : ""}</div></li>`).join("")}</ol>
    ${disc("proto-src", "Where these steps come from", `<div class="note">${esc(P.source)} Demo content: real crews follow their flight medical checklists and the medical officer.</div>`)}`;
  $("#dlg-proto").showModal();
}
document.addEventListener("change", ev => { const c = ev.target.closest("[data-ps]"); if (c) document.getElementById("ps-" + c.dataset.ps).classList.toggle("done", c.checked); });
document.addEventListener("click", ev => {
  const p = ev.target.closest("[data-proto]"); if (p) { if ($("#dlg-wiz").open) $("#dlg-wiz").close(); openProtocol(p.dataset.proto); return; }
  const m = ev.target.closest("button[data-mode]"); if (m) { setMode(m.dataset.mode); return; }
  const t = ev.target.closest("[data-pt]"); if (t) {
    clearInterval(ptimer); let left = +t.dataset.pt * 60; const el = document.getElementById("pt-" + t.dataset.pk);
    const tick = () => { const mm = Math.floor(left / 60), ss = left % 60; el.textContent = left > 0 ? `${mm}:${String(ss).padStart(2, "0")}` : "Time: re-check now"; if (left-- <= 0) clearInterval(ptimer); };
    tick(); ptimer = setInterval(tick, 1000); return;
  }
  const r = ev.target.closest("[data-prep]"); if (r) { st.crew = am.me; st.day = Math.max(...ROWS[am.me].map(x => x.day)); $("#dlg-proto").close(); openReport(); }
});
$("#proto-close").onclick = () => { clearInterval(ptimer); $("#dlg-proto").close(); };

// Shared with other modules (see README: "How modules share code").
Object.assign(window, { PROTOCOLS, ptimer, openProtocol });
