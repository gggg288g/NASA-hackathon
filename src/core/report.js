// Report for ground / flight surgeon.
// ---------- report dialog ----------
function openReport(extra) {
  const e = ENV[st.env], lines = [];
  lines.push(`CREW HEALTH REPORT · ${CREW_NAME[st.crew]} · ${st.day <= 0 ? "pre-flight" : "Mission day " + st.day}`);
  lines.push(`Environment: ${e.name} (${fmtDelay(e)})`, "");
  for (const s of Object.keys(SYS)) {
    const ss = systemStatus(st.crew, s, st.day);
    if (ss.tier === "amber" || ss.tier === "red") {
      lines.push(`[${TIER_LABEL[ss.tier].toUpperCase()}] ${SYS[s].name}`);
      ss.items.filter(i => (i.tier === "amber" || i.tier === "red") && (am.shareMood || !["mood", "stress", "phq9"].includes(i.id))).forEach(i => {
        const b = isNum(i.base) ? ` (baseline ${(+i.base).toFixed(1)})` : "";
        lines.push(`  - ${nameOf(i.id)}: ${fmt(i.value, i.id)} ${unitOf(i.id)}${b}`);
      });
    }
  }
  const ews = patterns(st.crew, st.day).filter(p => am.shareMood || p.sys !== "behavioral");
  if (ews.length) { lines.push("", "Early warnings (patterns and trends):"); ews.forEach(p => lines.push(`  [${TIER_LABEL[p.tier].toUpperCase()}] ${p.title}: ${p.evidence.join("; ")}`)); }
  const rc = rechecks(st.crew, st.day); if (rc.length) lines.push("", "Awaiting re-check (once only): " + rc.map(r => `${nameOf(r.id)} ${fmt(r.value, r.id)} ${unitOf(r.id)}`).join(", "));
  const sym = symptoms(st.crew, st.day); if (sym.length) lines.push("", "Symptoms: " + sym.join(", "));
  lines.push("", "Last 7 days (systolic/diastolic, HR, temp, sleep):");
  ROWS[st.crew].filter(r => r.day <= st.day && r.day > st.day - 7).forEach(r => lines.push(`  D${r.day}: ${fmt(r.bp_systolic)}/${fmt(r.bp_diastolic)} mmHg, ${fmt(r.resting_hr)} bpm, ${fmt(r.core_temp, "core_temp")} C, ${fmt(r.sleep_hours)} h`));
  if (extra && extra.length) lines.push("", ...extra);
  const scFlags = window.SC ? SC.flags().filter(f => am.shareMood || !/PHQ|Isolation/.test(f.name)) : [];
  if (scFlags.length) { lines.push("", "Self-check:"); scFlags.forEach(f => lines.push(`  [${f.lv === 2 ? "RED" : "AMBER"}] ${f.name}: ${f.notes.join("; ")}`)); }
  lines.push("", "Crew actions taken: (add notes)");
  $("#rp-text").textContent = lines.join("\n");
  const [a, b] = e.one_way_delay_s;
  $("#rp-delay").textContent = b <= 1.5 ? "Near real-time: send, then call." :
    `Arrives in ${Math.round(a / 60)}–${Math.round(b / 60)} min · reply in ${Math.round(2 * a / 60)}–${Math.round(2 * b / 60)} min. Start the protocol now.`;
  $("#rp-status").textContent = "";
  $("#dlg-report").showModal();
}
$("#rp-close").onclick = () => $("#dlg-report").close();
$("#rp-copy").onclick = async () => {
  try { await navigator.clipboard.writeText($("#rp-text").textContent); $("#rp-status").textContent = "Copied."; }
  catch { $("#rp-status").textContent = "Copy blocked here: select the text and copy it manually."; }
};

// Shared with other modules (see README: "How modules share code").
Object.assign(window, { openReport });
