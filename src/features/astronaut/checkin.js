// Guided daily check-in (incl. Amsler grid and PHQ-9).
// ---- wizard ----
const wz = { crew: null, day: 0, steps: [], i: 0, vals: {} };
function openWizard(crew) {
  const last = ROWS[crew][ROWS[crew].length - 1];
  Object.assign(wz, { crew, day: last.day + 1, steps: wizSteps(last.day + 1), i: 0, vals: { symptoms: [] } });
    const logged = fluidToday(crew, wz.day);   // drinks logged on the Today screen pre-fill the fluids step
  if (logged > 0) wz.vals.fluid_intake_ml = logged;
  renderWizStep(); $("#dlg-wiz").showModal();
}
function stepFeedback(step) {
  const ids = step.fields || [step.id];
  if (step.phq) {
    const a = wz.vals.phqItems || []; const done = a.filter(isNum).length;
    if (a[8] > 0) return { t: "red", html: `<strong>${esc(PHQ_URGENT)}</strong>` };
    if (done < 9) return { t: "none", html: `<span class="muted">${done} of 9 answered.</span>` };
    const tot = a.reduce((x, y) => x + y, 0), t = tot >= 10 ? "red" : tot >= 5 ? "amber" : "green";
    return { t, html: `<strong>Score ${tot} of 27: ${PHQ_BAND(tot)}.</strong> ${t === "green" ? "Keep up your routines." : esc(IND.phq9.actions[t][0])}` };
  }
  if (step.id === "symptoms") {
    const sy = wz.vals.symptoms; if (!sy.length) return { t: "green", html: "No symptoms. Good." };
    const serious = sy.filter(x => ["rash", "chills", "blurred vision", "dizziness"].includes(x));
    return serious.length ? { t: "amber", html: `Noted: ${esc(sy.join(", "))}. ${serious.includes("blurred vision") ? "Vision changes go to the medical officer today." : "Your medical officer will see this in today's summary."}` } : { t: "green", html: `Noted: ${esc(sy.join(", "))}.` };
  }
  let worstT = null, parts = [];
  for (const id of ids) {
    const v = wz.vals[id]; if (!isNum(v)) return null;
    const r = provisionalTier(wz.crew, id, v); if (!r) continue;
    worstT = worst(worstT, r.tier);
    if (isNum(r.base)) {
      const bd = IND[id].baseline_deviation;
      parts.push(bd.metric.startsWith("rolling") ? `${bd.window_days}-day avg ${(+r.base).toFixed(1)}` : `usual ${fmt(+(+r.base).toFixed(2), id)}`);
    }
  }
  if (!worstT) return null;
  const head = worstT === "red" ? "Needs action." : worstT === "amber" ? "Worth watching." : "Normal for you.";
  const act = worstT !== "green" ? IND[ids[0]].actions[worstT][0] : "";
  return { t: worstT, html: `<strong>${head}</strong> ${parts.length ? `<span class="muted">${esc(parts.join(" / "))}</span>` : ""} ${act ? `<div>${esc(act)}</div>` : ""}` };
}
function renderWizStep() {
  const step = wz.steps[wz.i], n = wz.steps.length;
  $("#wiz-prog").style.gridTemplateColumns = `repeat(${n + 1}, 1fr)`;
  $("#wiz-prog").innerHTML = Array.from({ length: n + 1 }, (_, k) => `<i class="${k <= wz.i ? "on" : ""}"></i>`).join("");
  $("#wiz-count").textContent = wz.i < n ? `${step.group} · step ${wz.i + 1} of ${n}` : "Summary";
  $("#wiz-back").style.visibility = wz.i === 0 || wz.i >= n ? "hidden" : "visible";
  if (wz.i >= n) return renderWizSummary();
  $("#wiz-next").textContent = wz.i === n - 1 ? "See results" : "Next";
  const how = HOWTO[step.id] || [];
  let input = "";
  if (step.phq) { const a = wz.vals.phqItems || (wz.vals.phqItems = Array(9).fill(null));
    input = `<div class="phq">${PHQ_ITEMS.map((q, k) => `<div class="phq-q"><div class="phq-t"><span class="num muted">${k + 1}</span> ${esc(q)}</div><div class="seg phq-seg" role="group" aria-label="${esc(q)}">${PHQ_LAB.map((l, v) => `<button type="button" data-phq="${k}" data-v="${v}" aria-pressed="${a[k] === v}">${esc(l)}</button>`).join("")}</div></div>`).join("")}</div><p class="note" style="margin:0">PHQ-9 (Kroenke et al.), a validated screen used in primary care.</p>`; }
  else if (step.choice) input = (step.amsler ? `<div class="amsler-wrap">${amslerSVG()}</div>` : "") + `<div class="choice">${step.choice.map(([v, l]) => `<button type="button" class="btn" data-wc="${v}" aria-pressed="${wz.vals[step.id] === v}">${esc(l)}</button>`).join("")}</div>`;
  else if (step.multi) input = `<div class="choice">${step.multi.map(x => `<button type="button" class="btn" data-wm="${x}" aria-pressed="${wz.vals.symptoms.includes(x)}">${esc(x)}</button>`).join("")}</div>`;
  else input = `<div class="wiz-in">${(step.fields || [step.id]).map(id => { const ind = IND[id], stepv = id === "core_temp" ? "0.1" : id === "sleep_hours" || id === "body_mass" ? "0.1" : id === "fluid_intake_ml" ? "50" : "1"; return `<div class="field"><label for="w-${id}">${esc(step.fields ? (id === "bp_systolic" ? "Top number" : "Bottom number") : ind.name)}</label><input type="number" inputmode="decimal" id="w-${id}" step="${stepv}" value="${isNum(wz.vals[id]) ? wz.vals[id] : ""}"></div>`; }).join("")}<span class="unit">${esc(IND[(step.fields || [step.id])[0]].unit)}</span></div>`;
  const showHow = how.length && !step.choice;
  const whyBody = `${WHY[step.id] ? `<div>${esc(WHY[step.id])}</div>` : ""}${showHow ? `<ol>${how.map(h => `<li>${esc(h)}</li>`).join("")}</ol>` : ""}`;
  $("#wiz-body").innerHTML = `<div class="wiz-step"><h3 id="wiz-title">${esc(step.title)}</h3>
    ${whyBody ? whyHTML("how", whyBody, showHow ? "How and why?" : "Why?") : ""}
    ${input}<div class="fb tier-none" id="wiz-fb" aria-live="polite"><span class="muted">${step.choice || step.phq ? "Choose an answer." : "Enter a value."}</span></div></div>`;
  const upd = () => { const f = stepFeedback(step); const el = $("#wiz-fb"); if (f) { el.className = `fb tier-${f.t}`; el.innerHTML = f.html; } };
  (step.fields || [step.id]).forEach(id => { const el = document.getElementById("w-" + id); if (el) { el.oninput = () => { const v = parseFloat(el.value); wz.vals[id] = Number.isNaN(v) ? null : v; upd(); }; } });
  document.querySelectorAll("[data-wc]").forEach(b => b.onclick = () => { wz.vals[step.id] = +b.dataset.wc; renderWizStep(); });
  document.querySelectorAll("[data-phq]").forEach(b => b.onclick = () => { wz.vals.phqItems[+b.dataset.phq] = +b.dataset.v; const keep = $("#dlg-wiz").scrollTop; renderWizStep(); $("#dlg-wiz").scrollTop = keep; });
  document.querySelectorAll("[data-wm]").forEach(b => b.onclick = () => { const x = b.dataset.wm, a = wz.vals.symptoms; const k = a.indexOf(x); k >= 0 ? a.splice(k, 1) : a.push(x); renderWizStep(); });
  upd();
  const first = document.querySelector("#wiz-body input"); if (first && !step.phq) first.focus();
}
function saveWizard() {
  const rows = ROWS[wz.crew], last = rows[rows.length - 1];
  const r = { ...last, day: wz.day, phase: "inflight", environment: st.env, body_mass: null, vision_check: null, symptoms: wz.vals.symptoms.join(";") };
  for (const id of Object.keys(IND)) r[id] = isNum(wz.vals[id]) ? wz.vals[id] : null;
  r.est_bone_loss_pct = last.est_bone_loss_pct; r.est_calf_muscle_loss_pct = last.est_calf_muscle_loss_pct;
  const pa = wz.vals.phqItems; r.phq9 = pa && pa.some(isNum) ? pa.reduce((x, y) => x + (y || 0), 0) : null; r.phq9_flag = pa && pa[8] > 0 ? 1 : 0;
  rows.push(r); rebuild(wz.crew); am.done[wz.crew] = wz.day;
}
function renderWizSummary() {
  if (am.done[wz.crew] !== wz.day) saveWizard();
  const flags = lastFlags(wz.crew);
  const sym = (wz.vals.symptoms || []);
  const protos = [...new Set(flags.items.map(i => PROTOCOL_FOR(i.id, i.value, i.tier)).filter(Boolean))];
  const reds = flags.items.filter(i => i.tier === "red");
  $("#wiz-next").textContent = "Done";
  const urgent = wz.vals.phqItems && wz.vals.phqItems[8] > 0;
  $("#wiz-body").innerHTML = `<h3 id="wiz-title" style="font-size:26px">Day ${wz.day} results</h3>
    ${urgent ? `<div class="fb tier-red" style="margin-top:8px"><strong>${esc(PHQ_URGENT)}</strong></div>` : ""}
    ${flags.items.length ? flags.items.map(i => `<div class="act tier-${i.tier}" style="margin-top:8px"><div class="t"><span>${esc(IND[i.id].name)} <span class="num">${fmt(i.value, i.id)} ${esc(IND[i.id].unit)}</span></span><span class="pill tier-${i.tier}">${TIER_LABEL[i.tier]}</span></div>${actsHTML(IND[i.id].actions[i.tier], "wz-" + i.id)}</div>`).join("") : `<div class="fb tier-green"><strong>All normal for you today.</strong></div>`}
    ${sym.length ? `<div class="act tier-amber" style="margin-top:8px"><div class="t">Symptoms logged</div><div class="note">${esc(sym.join(", "))}</div></div>` : ""}
    ${protos.map(p => `<button class="btn danger" type="button" data-proto="${p}" style="margin-top:10px;width:100%">Step by step: ${PROTOCOLS[p].title}</button>`).join("")}
    ${reds.length && !protos.length ? `<div class="fb tier-red" style="margin-top:10px">Escalate: ${esc(escShort(ENV[st.env]))}</div>` : ""}`;
}
$("#wiz-next").onclick = () => {
  if (wz.i >= wz.steps.length) { $("#dlg-wiz").close(); renderAstro(); render(); return; }
  wz.i++; renderWizStep();
};
$("#wiz-back").onclick = () => { if (wz.i > 0 && am.done[wz.crew] !== wz.day) { wz.i--; renderWizStep(); } };
$("#dlg-wiz").addEventListener("close", () => { renderAstro(); });

// Shared with other modules (see README: "How modules share code").
Object.assign(window, { wz, openWizard, stepFeedback, renderWizStep, saveWizard, renderWizSummary });
