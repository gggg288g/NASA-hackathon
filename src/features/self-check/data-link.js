// Links Self-check to the astronaut's own data:
//  - "Check these first" suggestions from recent flags
//  - numbers filled in from the latest check-in
//  - SC_DATA: per-check data line; can raise a result by one level, never lower it (see selfcheck.js)

const TIER_NUM = { green: 0, amber: 1, red: 2 };
const scDay = () => Math.max(...ROWS[am.me].map(r => r.day));
const avgOf = (id, n) => {
  const v = ROWS[am.me].filter(r => r.day <= scDay()).slice(-n).map(r => r[id]).filter(isNum);
  return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null;
};
// latest non-empty value in the last few days (a single missed reading shouldn't blank the form)
const latestVal = (id, within = 3) => { const rows = ROWS[am.me].filter(r => r.day <= scDay()).slice(-within).reverse(); const r = rows.find(x => isNum(x[id])); return r ? r[id] : null; };

// "HR 64 (usual 63)"
const SHORT_NAME = { bp_systolic: "BP", resting_hr: "HR", core_temp: "Temp", spo2: "SpO₂", vision_check: "Eye check" };
const short = (e, id) => `${SHORT_NAME[id] || e.name} ${fmt(e.v, id)}${isNum(e.base) ? ` (usual ${fmt(+(+e.base).toFixed(id === "core_temp" ? 2 : 0), id)})` : ""}`;

// One line of evidence from the astronaut's data for a Self-check condition (null = no relevant data)
function SC_DATA(cid) {
  if (!window.ROWS || !am.me) return null;
  const d = scDay(), E = id => ev(am.me, d, id);
  const pick = (parts) => { const p = parts.filter(x => x && x.e); if (!p.length) return null; const lv = Math.max(...p.map(x => TIER_NUM[x.e.tier] ?? 0)); return { lv, text: "Your data: " + p.map(x => short(x.e, x.id)).join(", ") }; };
  switch (cid) {
    case "vitals": return pick([{ e: E("bp_systolic"), id: "bp_systolic" }, { e: E("resting_hr"), id: "resting_hr" }]);
    case "sans": return pick([{ e: E("vision_check"), id: "vision_check" }, { e: E("bp_systolic"), id: "bp_systolic" }]);
    case "ortho": return pick([{ e: E("bp_systolic"), id: "bp_systolic" }, { e: E("resting_hr"), id: "resting_hr" }]);
    case "inf": return pick([{ e: E("core_temp"), id: "core_temp" }, { e: E("resting_hr"), id: "resting_hr" }]);
    case "airway": return pick([{ e: E("spo2"), id: "spo2" }]);
    case "slp": case "cog": { const e = E("sleep_hours"); return e ? { lv: TIER_NUM[e.tier] ?? 0, text: `Your data: sleep ${fmt(+(avgOf("sleep_hours", 3) || e.v).toFixed(1))} h (3-night avg)` } : null; }
    case "iso": { const e = E("stress"); return e ? { lv: TIER_NUM[e.tier] ?? 0, text: `Your data: stress ${fmt(+(avgOf("stress", 5) || e.v).toFixed(1))}/5 (5-day avg)` } : null; }
    case "bone": case "muscle": { const e = E("exercise_min"); const r = ROWS[am.me][ROWS[am.me].length - 1]; return e ? { lv: TIER_NUM[e.tier] ?? 0, text: `Your data: exercise ${Math.round(avgOf("exercise_min", 7) || e.v)} min/day, bone loss ~${fmt(r.est_bone_loss_pct)}%` } : null; }
    default: return null;
  }
}

// Which Self-check tab/condition to suggest for each flagged indicator
const SUGGEST = {
  bp_systolic: ["heart", "vitals"], bp_diastolic: ["heart", "vitals"], resting_hr: ["heart", "vitals"],
  vision_check: ["eyes", "sans"], sleep_hours: ["sleep", "slp"], mood: ["brain", "phq"], phq9: ["brain", "phq"],
  stress: ["brain", "iso"], exercise_min: ["bones", "bone"], core_temp: ["immune", "inf"], spo2: ["air", "airway"],
};
function renderSelfCheck() {
  if (!window.SC) return;
  const crew = am.me, d = scDay();
  // fill numbers from the latest data
  const s3 = avgOf("sleep_hours", 3), e7 = avgOf("exercise_min", 7);
  SC.prefill({
    vitals: { sys: latestVal("bp_systolic"), dia: latestVal("bp_diastolic"), hr: latestVal("resting_hr") },
    slp: { hrs: isNum(s3) ? Math.round(s3 * 2) / 2 : null },
    bone: { min: isNum(e7) ? Math.round(e7 / 5) * 5 : null },
  });
  SC.refreshAll();
  $("#sc-fill").textContent = `Filled in from day ${d}`;
  // suggestions
  const seen = new Set(), items = [];
  for (const it of lastFlags(crew).items) {
    const s = SUGGEST[it.id]; if (!s || seen.has(s[1])) continue; seen.add(s[1]);
    const tab = SC.tabs.find(t => t.id === s[0]), cond = tab && tab.conds.find(c => c.id === s[1]);
    if (cond) items.push({ tab: s[0], cond: s[1], name: cond.name, tier: it.tier, why: `${IND[it.id].name} ${fmt(it.value, it.id)} ${IND[it.id].unit}` });
  }
  $("#sc-suggest").innerHTML = items.length
    ? `<div class="note" style="margin-bottom:6px">Check first:</div><div class="sc-sugg">${items.slice(0, 3).map(x => `<button type="button" data-scgo="${x.tab},${x.cond}"><span>${esc(x.name)}<br><span class="why">${esc(x.why)}</span></span><span class="pill tier-${x.tier}">${TIER_LABEL[x.tier]}</span></button>`).join("")}</div>`
    : `<div class="allclear">Nothing stands out in your data.</div>`;
}
document.addEventListener("click", ev => { const b = ev.target.closest("[data-scgo]"); if (b) { const [t, c] = b.dataset.scgo.split(","); SC.show(t, c); } });

// Shared with other modules (see README: "How modules share code").
Object.assign(window, { SC_DATA, renderSelfCheck });
