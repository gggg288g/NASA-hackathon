// Report for ground / flight surgeon.
// ---------- report dialog ----------
// Written as a Mission Control packet: with a 5-20+ min delay each way, a back-and-forth costs most of an hour,
// so the packet leads with priority and the decision needed, then answers the questions ground would ask next.
function onsetOf(crew, id, day) {   // first day of the current run of Watch/Act for this indicator
  const rows = ROWS[crew], i0 = idxOf(crew, day); let i = i0;
  while (i > 0 && TRI[crew][id][i - 1] && ["amber", "red"].includes(TRI[crew][id][i - 1].tier)) i--;
  return rows[i] ? rows[i].day : day;
}
function trendOf(crew, id, day) {
  const rows = ROWS[crew], i0 = idxOf(crew, day), v = rows[i0] && rows[i0][id];
  let p = null; for (let i = i0 - 1; i >= 0 && i >= i0 - 3 && !isNum(p); i--) p = rows[i][id];
  if (!isNum(v) || !isNum(p)) return "no earlier value";
  const d = v - p; return Math.abs(d) < 1e-9 ? "unchanged since last reading" : `${d > 0 ? "up" : "down"} ${fmt(+Math.abs(d).toFixed(2), id)} since last reading`;
}
function openReport(extra) {
  const e = ENV[st.env], lines = [], c = st.crew, d = st.day;
  const hidden = id => !am.shareMood && ["mood", "stress", "phq9"].includes(id);
  const flagged = [];
  for (const s of Object.keys(SYS)) { const ss = systemStatus(c, s, d); if (ss.tier === "amber" || ss.tier === "red") flagged.push({ s, ss }); }
  const ews = patterns(c, d).filter(p => am.shareMood || p.sys !== "behavioral")
    .map(p => am.shareMood ? p : { ...p, evidence: p.evidence.filter(x => !/mood|stress/i.test(x)) });
  const top = [...flagged.map(f => f.ss.tier), ...ews.map(p => p.tier)].reduce((a, t) => RANK[t] > RANK[a] ? t : a, "green");
  const [a, b] = e.one_way_delay_s;
  lines.push(`CREW HEALTH PACKET · ${CREW_NAME[c]} · ${d <= 0 ? "pre-flight" : "Mission day " + d}`);
  lines.push(`PRIORITY: ${top === "red" ? "ACT. Reply needed on the next pass" : top === "amber" ? "WATCH. Advice welcome, crew is monitoring" : "ROUTINE. No action needed"}`);
  lines.push(`Environment: ${e.name} (${fmtDelay(e)})${b > 1.5 && top === "red" ? `. Crew is starting the onboard protocol without waiting for ground.` : ""}`, "");
  if (ews.length) { lines.push("EARLY WARNINGS (patterns across indicators):"); ews.forEach(p => lines.push(`  [${TIER_LABEL[p.tier].toUpperCase()}] ${p.title}: ${p.evidence.join("; ")}`)); lines.push(""); }
  if (flagged.length) {
    lines.push("FLAGGED READINGS (value, personal baseline, since when, direction):");
    for (const { s, ss } of flagged) {
      lines.push(`  [${TIER_LABEL[ss.tier].toUpperCase()}] ${SYS[s].name}`);
      ss.items.filter(i => (i.tier === "amber" || i.tier === "red") && !i.derived && !hidden(i.id)).forEach(i => {
        const bl = isNum(i.base) ? `, baseline ${(+i.base).toFixed(1)}` : "";
        lines.push(`    - ${nameOf(i.id)}: ${fmt(i.value, i.id)} ${unitOf(i.id)}${bl}, since day ${onsetOf(c, i.id, d)}, ${trendOf(c, i.id, d)}`);
      });
      ss.items.filter(i => i.derived && (i.tier === "amber" || i.tier === "red")).forEach(i => lines.push(`    - ${nameOf(i.id)}: ${fmt(i.value)}${unitOf(i.id)} (modelled)`));
    }
    lines.push("");
  }
  const rc = rechecks(c, d); if (rc.length) lines.push("Awaiting re-check (seen once only): " + rc.map(r => `${nameOf(r.id)} ${fmt(r.value, r.id)} ${unitOf(r.id)}`).join(", "), "");
  lines.push("ANSWERS TO LIKELY QUESTIONS:");
  const sym = symptoms(c, d); lines.push(`  Symptoms today: ${sym.length ? sym.join(", ") : "none reported"}`);
  const w3 = ROWS[c].filter(r => r.day <= d && r.day > d - 3), av = id => { const v = w3.map(r => r[id]).filter(isNum); return v.length ? (v.reduce((x, y) => x + y, 0) / v.length) : null; };
  const sl = av("sleep_hours"), ex = av("exercise_min"), fl = av("fluid_intake_ml");
  lines.push(`  Last 3 days: sleep ${sl === null ? "—" : sl.toFixed(1) + " h/night"}, exercise ${ex === null ? "—" : Math.round(ex) + " min/day"}, fluids ${fl === null ? "—" : Math.round(fl) + " ml/day"}`);
  const rtr = window.rtLatest && rtLatest(c, d); if (rtr) lines.push(`  Reaction check: ${rtr.median} ms median (normal ${rtr.baseline} ms), ${rtr.lapses} lapses`);
  lines.push("  Last 7 days (systolic/diastolic, HR, temp, sleep):");
  ROWS[c].filter(r => r.day <= d && r.day > d - 7).forEach(r => lines.push(`    D${r.day}: ${fmt(r.bp_systolic)}/${fmt(r.bp_diastolic)} mmHg, ${fmt(r.resting_hr)} bpm, ${fmt(r.core_temp, "core_temp")} C, ${fmt(r.sleep_hours)} h`));
  if (extra && extra.length) lines.push("", ...extra);
  const scFlags = window.SC ? SC.flags().filter(f => am.shareMood || !/PHQ|Isolation/.test(f.name)) : [];
  if (scFlags.length) { lines.push("", "Self-check:"); scFlags.forEach(f => lines.push(`  [${f.lv === 2 ? "RED" : "AMBER"}] ${f.name}: ${f.notes.join("; ")}`)); }
  lines.push("", "Crew actions taken: (add notes)", "Requested from ground: (add notes, e.g. confirm protocol, medication per checklist)");
  if (!am.shareMood) lines.push("", "Mood and stress scores withheld at the astronaut's choice.");
  $("#rp-text").textContent = lines.join("\n");
  const kb = (new TextEncoder().encode($("#rp-text").textContent).length / 1024).toFixed(1);
  $("#rp-delay").textContent = b <= 1.5 ? `${kb} KB · Near real-time: send, then call.` :
    `${kb} KB · Arrives in ${Math.round(a / 60)}–${Math.round(b / 60)} min · reply in ${Math.round(2 * a / 60)}–${Math.round(2 * b / 60)} min. Start the protocol now.`;
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
