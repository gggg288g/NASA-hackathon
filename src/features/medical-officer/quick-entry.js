// Medical officer quick data entry.
// ---------- check-in ----------
const CI_FIELDS = ["resting_hr", "bp_systolic", "bp_diastolic", "glucose", "core_temp", "spo2", "sleep_hours", "mood", "stress", "exercise_min"];
$("#btn-checkin").onclick = () => {
  const last = ROWS[st.crew][ROWS[st.crew].length - 1];
  $("#ci-sub").textContent = `${CREW_NAME[st.crew]} · day ${last.day + 1} · pre-filled from the last day`;
  $("#ci-fields").innerHTML = CI_FIELDS.map(id => {
    const ind = IND[id], step = id === "core_temp" ? "0.01" : id === "sleep_hours" ? "0.1" : "1";
    return `<div class="field"><label for="ci-${id}">${esc(ind.name)} (${esc(ind.unit)})</label><input type="number" id="ci-${id}" step="${step}" value="${isNum(last[id]) ? last[id] : ""}"></div>`;
  }).join("");
  $("#ci-symptoms").value = "";
  $("#dlg-checkin").showModal();
};
$("#ci-cancel").onclick = () => $("#dlg-checkin").close();
$("#ci-form").addEventListener("submit", ev => {
  ev.preventDefault();
  const rows = ROWS[st.crew], last = rows[rows.length - 1];
  const r = { ...last, day: last.day + 1, phase: "inflight", environment: st.env, body_mass: null, vision_check: null };
  for (const id of CI_FIELDS) { const v = parseFloat($("#ci-" + id).value); r[id] = Number.isNaN(v) ? null : v; }
  r.symptoms = $("#ci-symptoms").value.split(",").map(s => s.trim().toLowerCase()).filter(Boolean).join(";");
  rows.push(r); rebuild(st.crew);
  st.day = r.day; $("#dlg-checkin").close(); render();
});

// Shared with other modules (see README: "How modules share code").
Object.assign(window, { CI_FIELDS });
