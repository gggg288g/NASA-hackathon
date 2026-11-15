// Early Warning Chains + trend forecasts.
// The triage engine looks at one indicator at a time. This module looks at several together
// ("short sleep + high stress"), and at where a value is heading ("at this rate, Watch in ~3 days").
// Rule-based and fully offline. Thresholds are demo values, not NASA medical standards.

const avg = a => a.length ? a.reduce((s, x) => s + x, 0) / a.length : null;
const win = (crew, day, n) => ROWS[crew].filter(r => r.day <= day && r.day > day - n);
const nums = (rows, id) => rows.map(r => r[id]).filter(isNum).map(Number);
const baseAt = (crew, id, day) => { const i = idxOf(crew, day); return i < 0 ? null : TRI[crew][id][i].base; };

// ---------- trend forecast ----------
// Least-squares line over the last 7 days. Only reported while the value is still Normal,
// the line fits well (R² ≥ 0.6), the change is meaningful and the crossing is within 7 days.
const FORECAST_IDS = ["bp_systolic", "bp_diastolic", "resting_hr"];
function forecast(crew, id, day) {
  const ind = IND[id], dev = ind && ind.baseline_deviation;
  if (!dev || !["pct_change", "abs_change"].includes(dev.metric)) return null;
  const rows = ROWS[crew], i0 = idxOf(crew, day); if (i0 < 0) return null;
  const now = TRI[crew][id][i0]; if (!now || now.tier !== "green") return null;
  const pts = [];
  for (let i = Math.max(0, i0 - 6); i <= i0; i++) if (isNum(rows[i][id])) pts.push([rows[i].day, +rows[i][id]]);
  if (pts.length < 5) return null;
  let base = null; for (let i = i0; i >= 0 && !isNum(base); i--) base = TRI[crew][id][i].base;
  if (!isNum(base)) return null;
  const mx = avg(pts.map(p => p[0])), my = avg(pts.map(p => p[1]));
  const sxx = pts.reduce((s, [x]) => s + (x - mx) ** 2, 0), sxy = pts.reduce((s, [x, y]) => s + (x - mx) * (y - my), 0);
  const slope = sxy / sxx, icpt = my - slope * mx;
  const ssr = pts.reduce((s, [x, y]) => s + (y - (icpt + slope * x)) ** 2, 0), sst = pts.reduce((s, [, y]) => s + (y - my) ** 2, 0);
  const r2 = sst ? 1 - ssr / sst : 0;
  const margin = dev.metric === "pct_change" ? base * dev.amber / 100 : dev.amber;
  const [gLo, gHi] = (ind.absolute_tiers && ind.absolute_tiers.green[0]) || [-Infinity, Infinity];
  const up = slope > 0, limit = up ? Math.min(base + margin, gHi) : Math.max(base - margin, gLo);
  const fitNow = icpt + slope * day;
  const days = (limit - fitNow) / slope;
  // Strict on purpose (avoid false alarms): good fit, a real change over the week,
  // today's reading already part-way to the line, and the crossing within a week.
  const lastV = pts[pts.length - 1][1], moved = up ? lastV - base : base - lastV;
  if (r2 < 0.6 || Math.abs(slope) * 6 < 0.6 * margin || moved < 0.4 * margin || !(days > 0) || days > 7) return null;
  return { id, slope, r2, base, limit, up, days: Math.max(1, Math.round(days)) };
}

// ---------- cross-indicator rules ----------
const IMMUNE_SYM = ["rash", "chills", "fever", "sore throat", "swollen glands", "fatigue"];
const RULES = [
  { key: "immune", sys: "immune", title: "Immune watch: short sleep + stress",
    test(crew, day) {
      const w = win(crew, day, 5), short = w.filter(r => isNum(r.sleep_hours) && r.sleep_hours < 6).length;
      const stress = avg(nums(w, "stress")), mood = avg(nums(w, "mood"));
      if (short < 3 || !((stress !== null && stress >= 3.5) || (mood !== null && mood <= 2.5))) return null;
      return { tier: "amber", evidence: [`${short} of the last 5 nights under 6 h sleep`, stress !== null ? `stress averaging ${stress.toFixed(1)}/5` : null, mood !== null && mood <= 2.5 ? `mood averaging ${mood.toFixed(1)}/5` : null].filter(Boolean),
        why: "Short sleep and stress together weaken immune defences. In astronauts, stress is linked to dormant viruses (such as the ones behind cold sores and shingles) waking up again.",
        next: "Protect 8 h of sleep tonight. Check temperature morning and evening for the next 3 days. Report any rash, chills or sore throat straight away." };
    } },
  { key: "infection", sys: "immune", title: "Possible infection: temperature + heart rate / symptoms",
    test(crew, day) {
      const r = ROWS[crew][idxOf(crew, day)]; if (!r || !isNum(r.core_temp)) return null;
      const tb = baseAt(crew, "core_temp", day); if (!isNum(tb)) return null;
      const dT = r.core_temp - tb; if (dT < 0.5) return null;
      const hb = baseAt(crew, "resting_hr", day), dHR = isNum(hb) && isNum(r.resting_hr) ? (r.resting_hr - hb) / hb * 100 : null;
      const sym = symptoms(crew, day).filter(s => IMMUNE_SYM.includes(s));
      if (!(dHR !== null && dHR >= 8) && !sym.length) return null;
      return { tier: dT >= 1 && sym.length ? "red" : "amber",
        evidence: [`temperature +${dT.toFixed(1)} °C above your normal`, dHR !== null && dHR >= 8 ? `resting heart rate +${dHR.toFixed(0)}%` : null, sym.length ? `symptoms: ${sym.join(", ")}` : null].filter(Boolean),
        why: "A raised temperature on its own can come from exercise. Together with a faster resting heart rate or symptoms, infection becomes more likely.",
        next: "Re-measure at rest in 30 minutes, limit close contact with crewmates and tell the crew medical officer.", proto: "fever" };
    } },
  { key: "exercise", sys: "musculoskeletal", title: "Bone & muscle loss speeding up",
    test(crew, day) {
      const w = win(crew, day, 7).filter(r => r.day >= 1), low = w.filter(r => isNum(r.exercise_min) && r.exercise_min < 60).length;
      if (w.length < 5 || low < 4) return null;
      return { tier: low >= 6 ? "red" : "amber", evidence: [`${low} of the last ${w.length} days under 60 min exercise (target 90)`, `average ${avg(nums(w, "exercise_min")).toFixed(0)} min/day`],
        why: "Exercise is the main defence against microgravity bone loss (about 1–1.5% a month) and calf muscle loss. Missed days add up and are slow to win back.",
        next: "Book the treadmill and resistance device in today's schedule. If pain, time or equipment is stopping you, tell the medical officer." };
    } },
  { key: "fatigue", sys: "behavioral", title: "Fatigue building up",
    test(crew, day) {
      const w = win(crew, day, 7), sl = nums(w, "sleep_hours"); if (sl.length < 5) return null;
      const debt = sl.reduce((s, h) => s + Math.max(0, 7 - h), 0);
      if (debt < 8) return null;
      return { tier: debt >= 12 ? "red" : "amber", evidence: [`about ${debt.toFixed(0)} h of sleep debt this week (against 7 h a night)`],
        why: "Sleep debt builds quietly. After about a week of short nights, reaction time and judgement drop, even when you feel fine. That matters for EVAs and robotics work.",
        next: "Avoid safety-critical tasks without a crewmate double-check. Ask the medical officer about adjusting tomorrow's schedule." };
    } },
];

// More than one crew member running a temperature or immune symptoms at the same time points to a shared cause.
function crewWide(day) {
  const hit = CREW_IDS.filter(c => {
    for (let d = day; d > day - 3; d--) {
      const r = ROWS[c][idxOf(c, d)]; if (!r) continue;
      const tb = baseAt(c, "core_temp", d);
      if ((isNum(tb) && isNum(r.core_temp) && r.core_temp - tb >= 0.5) || symptoms(c, d).some(s => IMMUNE_SYM.includes(s) && s !== "fatigue")) return true;
    }
    return false;
  });
  if (hit.length < 2) return null;
  return { key: "crew", sys: "immune", kind: "Crew", title: "Shared cause? Several crew affected", tier: "amber",
    evidence: [`${hit.map(c => CREW_NAME[c]).join(", ")}: raised temperature or immune symptoms in the last 3 days`],
    why: "When several people change at once, the cause is often shared: something going round the crew, a food or water batch, or cabin air (CO₂).",
    next: "Check cabin CO₂ and water readings, limit close contact and send a crew-wide report to ground." };
}

// All early warnings for one astronaut on one day (worst first).
function patterns(crew, day) {
  const out = [];
  for (const rule of RULES) { const r = rule.test(crew, day); if (r) out.push({ key: rule.key, sys: rule.sys, kind: "Pattern", title: rule.title, ...r }); }
  for (const id of FORECAST_IDS) {
    const f = forecast(crew, id, day); if (!f) continue;
    const u = IND[id].unit, rate = Math.abs(f.slope);
    out.push({ key: "fc-" + id, sys: IND[id].body_system, kind: "Trend", tier: "amber", title: `${IND[id].name} heading for Watch in about ${f.days} day${f.days > 1 ? "s" : ""}`,
      evidence: [`${f.up ? "rising" : "falling"} ${fmt(+rate.toFixed(id === "core_temp" ? 2 : 1))} ${u} a day over the last week`, `your normal ${fmt(+(+f.base).toFixed(id === "core_temp" ? 2 : 1), id)} ${u}, Watch at ${fmt(+f.limit.toFixed(id === "core_temp" ? 2 : 1), id)} ${u}`],
      why: "Still in your normal range today, but the 7-day trend is steady enough to project. Catching it now leaves time for simple fixes before it becomes an alert.",
      next: `Re-measure ${id.startsWith("bp") ? "morning and evening" : "daily"} and review salt, fluids and sleep with the medical officer.` });
  }
  const cw = crewWide(day); if (cw && out.every(p => p.key !== "crew")) out.push(cw);
  return out.sort((a, b) => RANK[b.tier] - RANK[a.tier]);
}
// Readings that crossed the personal baseline once but have not repeated yet.
function rechecks(crew, day) {
  const i = idxOf(crew, day); if (i < 0) return [];
  return Object.keys(IND).filter(id => TRI[crew][id] && TRI[crew][id][i] && TRI[crew][id][i].recheck).map(id => ({ id, value: ROWS[crew][i][id], base: TRI[crew][id][i].base }));
}

// Shared HTML for a warning card (used by Today, the medical officer view and the report).
function patternHTML(p, k) {
  return `<div class="alert ew tier-${p.tier}">
    <div class="t"><span>${esc(p.title)}</span><span class="pill tier-${p.tier}">${esc(p.kind)}</span></div>
    <div class="note">${p.evidence.map(esc).join(" · ")}</div>
    <div>${esc(p.next)}</div>
    ${whyHTML("ew-" + k + p.key, esc(p.why))}
    ${p.proto && window.PROTOCOLS && PROTOCOLS[p.proto] ? `<button class="btn" type="button" data-proto="${p.proto}">Step by step: ${esc(PROTOCOLS[p.proto].title)}</button>` : ""}</div>`;
}
function recheckHTML(list) {
  return list.length ? `<div class="alert tier-none"><div class="t"><span>Re-check needed</span></div><div class="note">${list.map(r => `${esc(IND[r.id].name)} ${fmt(r.value, r.id)} ${esc(IND[r.id].unit)}${isNum(r.base) ? ` (usual ${fmt(+(+r.base).toFixed(1), r.id)})` : ""}`).join(" · ")}</div><div>Away from your normal once. Re-measure. It only becomes an alert if it repeats.</div></div>` : "";
}

// Shared with other modules (see README: "How modules share code").
Object.assign(window, { forecast, RULES, crewWide, patterns, rechecks, patternHTML, recheckHTML });
