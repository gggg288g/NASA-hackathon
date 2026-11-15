// Medical officer view: crew strip, body map, system detail, triage column, trend chart, timeline.
// ---------- render ----------
function fmtDelay(env) {
  const [a, b] = env.one_way_delay_s;
  if (b <= 1) return "Comms: real-time";
  if (b < 60) return `Comms delay: ${a} s each way`;
  return `Comms delay: ${Math.round(a / 60)}–${Math.round(b / 60)} min each way`;
}
// one-line escalation per environment (full guidance sits behind "Why?")
const ESC_SHORT = { iss: "call the flight surgeon now", lunar: "call the flight surgeon, start first aid", mars_transit: "start the on-board protocol now", mars_surface: "start the on-board protocol now" };
const escShort = e => ESC_SHORT[e.id] || e.red_tier_guidance;
function renderHeader() {
  $("#day-label").innerHTML = st.day <= 0 ? `Pre-flight <span class="num">L${st.day - 1}</span>` : `Mission day <span class="num">${st.day}</span>`;
  const e = ENV[st.env];
  $("#envinfo").textContent = `${e.name} · ${e.gravity_g ? e.gravity_g + " g" : "microgravity"} · ${fmtDelay(e)}`;
}
function renderCrew() {
  $("#crew").innerHTML = CREW_IDS.map(c => {
    const o = overall(c, Math.min(st.day, Math.max(...ROWS[c].map(r => r.day))));
    const f = o.flags.filter(x => x.tier === "red").map(x => SYS[x.sys].name);
    const a = o.flags.filter(x => x.tier === "amber").map(x => SYS[x.sys].name);
    const nEw = patterns(c, Math.min(st.day, Math.max(...ROWS[c].map(r => r.day)))).length;
    const txt = (f.length ? "Act: " + f.join(", ") : a.length ? "Watch: " + a.join(", ") : "All systems normal") + (nEw ? ` · ${nEw} early warning${nEw > 1 ? "s" : ""}` : "");
    return `<button type="button" class="crewcard tier-${o.tier}" data-crew="${c}" aria-pressed="${c === st.crew}">
      <div style="display:flex;justify-content:space-between;gap:8px;align-items:center"><span class="nm">${esc(CREW_NAME[c])}</span><span class="pill tier-${o.tier}">${TIER_LABEL[o.tier]}</span></div>
      <div class="flags">${esc(txt)}</div></button>`;
  }).join("");
}
// Astronaut body map: suit parts come away to show the systems underneath
const AREA = { head: ["behavioral", "neuro_ocular"], chest: ["cardiovascular", "respiratory", "metabolic"], limbs: ["musculoskeletal"] };
const areaOf = sys => Object.keys(AREA).find(a => AREA[a].includes(sys)) || null;
const tierVar = t => `var(--${t === "green" ? "ok" : t === "amber" ? "warn" : t === "red" ? "crit" : "none"})`;
function renderBody() {
  const svg = $("#astro"); if (!svg) return;
  const tierOf = sid => systemStatus(st.crew, sid, st.day).tier;
  svg.querySelectorAll(".organ[data-sys]").forEach(el => {
    const t = tierOf(el.dataset.sys);
    el.style.setProperty("--t", tierVar(t));
    el.style.setProperty("--bo", t === "green" || t === "none" ? "var(--bone-lo)" : tierVar(t));
    el.classList.toggle("sel", el.dataset.sys === st.sys);
  });
  for (const [area, ids] of Object.entries(AREA)) {
    const t = worst(...ids.map(tierOf).filter(x => x !== "none")) || "none";
    svg.querySelectorAll(".dot-" + area).forEach(d => { d.setAttribute("fill", tierVar(t)); d.classList.toggle("pulse", t === "red"); });
  }
  const open = st.suited ? null : areaOf(st.sys);
  svg.classList.remove("open-head", "open-chest", "open-limbs");
  if (open) svg.classList.add("open-" + open);
  $("#astro-hint").textContent = "Tap a part";
  $("#wholebody").innerHTML = ["immune", "thermoregulation"].map(s => {
    const t = tierOf(s);
    return `<button type="button" class="chip tier-${t}" data-sys="${s}" aria-pressed="${st.sys === s}">${esc(SYS[s].name)}</button>`;
  }).join("");
}
(() => {
  const svg = $("#astro"); if (!svg) return;
  svg.querySelectorAll(".part").forEach(p => { p.setAttribute("tabindex", "0"); p.setAttribute("role", "button"); p.setAttribute("aria-label", { head: "Helmet: look at brain and eyes", chest: "Suit chest: look at heart, lungs and gut", limbs: "Suit arms and legs: look at bones" }[p.dataset.open]); });
  svg.querySelectorAll(".organ").forEach(o => o.setAttribute("tabindex", "0"));
  const openArea = area => {
    const worstSys = AREA[area].slice().sort((a, b) => (RANK[systemStatus(st.crew, b, st.day).tier] ?? -1) - (RANK[systemStatus(st.crew, a, st.day).tier] ?? -1))[0];
    st.suited = false; st.sys = worstSys; st.ind = SYS[worstSys].indicators[0]; render();
  };
  svg.addEventListener("click", ev => {
    const part = ev.target.closest(".part");
    if (part) { ev.stopPropagation(); openArea(part.dataset.open); return; }
    if (ev.target.closest(".organ")) { st.suited = false; return; } // the global [data-sys] handler selects it
    st.suited = true; render();
  });
  svg.addEventListener("keydown", ev => {
    // Escape puts the suit back on (mouse/touch users tap empty space around the astronaut instead)
    if (ev.key === "Escape" && !st.suited) { ev.preventDefault(); st.suited = true; render(); return; }
    if (ev.key !== "Enter" && ev.key !== " ") return;
    const part = ev.target.closest(".part"); if (part) { ev.preventDefault(); ev.stopPropagation(); openArea(part.dataset.open); }
  });
})();
function renderDetail() {
  const s = SYS[st.sys], ss = systemStatus(st.crew, st.sys, st.day);
  const rows = ss.items.map(it => {
    const id = it.id, v = it.value, base = it.base;
    let dtxt = "";
    if (!it.derived && isNum(v) && isNum(base)) {
      const bd = IND[id].baseline_deviation, roll = bd.metric.startsWith("rolling");
      const dp = id === "core_temp" ? 2 : roll ? 1 : 0, dlt = +(v - base).toFixed(dp);
      const tip = roll ? `${bd.window_days}-day average ${(+base).toFixed(1)}` : `Baseline ${fmt(+base.toFixed(2), id)}`;
      dtxt = `<span title="${esc(tip)}">${dlt > 0 ? "+" : dlt < 0 ? "−" : ""}${dlt === 0 ? "0" : Math.abs(dlt).toFixed(dp)}</span>`;
    }
    const what = it.derived ? DERIVED[id].what : IND[id].plain_meaning;
    const t = it.tier || "none";
    const old = it.day !== undefined && it.day !== st.day && isNum(v) ? ` <span class="muted">(day ${it.day})</span>` : "";
    return `<tr class="ind-row ${st.ind === id ? "sel" : ""}" data-ind="${id}" tabindex="0">
      <td title="${esc(what)}">${esc(nameOf(id))}</td>
      <td class="num" style="white-space:nowrap"><strong>${fmt(v, id)}</strong> <span class="muted">${esc(unitOf(id))}</span>${old}</td>
      <td class="num" style="font-size:12px">${dtxt || '<span class="muted">—</span>'}</td>
      <td><span class="pill tier-${t}">${TIER_LABEL[t]}</span></td></tr>`;
  }).join("");
  const sym = st.sys === "immune" ? symptoms(st.crew, st.day) : [];
  $("#detail").innerHTML = `
    <div class="syshead"><h3>${esc(s.name)}</h3><span class="pill tier-${ss.tier}">${TIER_LABEL[ss.tier]}</span></div>
    <div style="overflow-x:auto"><table class="ind-table"><thead><tr><th>Indicator</th><th>Today</th><th>vs personal baseline</th><th>Status</th></tr></thead><tbody>${rows}</tbody></table></div>
    ${st.sys === "immune" ? `<div class="box"><h4>Reported symptoms</h4>${sym.length ? esc(sym.join(", ")) : '<span class="muted">None reported</span>'}</div>` : ""}
    ${disc("sys-about", "In space", `<div class="note">${esc(s.function)} · Hazards: ${esc(s.hazards.join(", "))}${s.measurement_note ? `<br>${esc(s.measurement_note)}` : ""}</div><div class="cols2">
      <div class="box"><h4>What spaceflight does</h4><ul>${s.spaceflight_effects.map(x => `<li>${esc(x)}</li>`).join("")}</ul></div>
      <div class="box"><h4>Countermeasures</h4><ul>${s.countermeasures.map(x => `<li>${esc(x)}</li>`).join("")}</ul></div>
    </div>
    <div class="srcs">Sources: ${s.sources.map(u => u.startsWith("http") ? `<a href="${esc(u)}" target="_blank" rel="noopener">${esc(new URL(u).hostname.replace("www.", ""))}</a>` : esc(u)).join(" · ")}</div>`)}`;
}
function renderTriage() {
  const e = ENV[st.env], items = [];
  for (const id of Object.keys(IND)) {
    const r = reading(st.crew, id, st.day);
    if (r && (r.tier === "amber" || r.tier === "red")) items.push({ id, ...r });
  }
  const sym = symptoms(st.crew, st.day);
  items.sort((a, b) => RANK[b.tier] - RANK[a.tier]);
  const anyRed = items.some(i => i.tier === "red");
  const ews = patterns(st.crew, st.day), rc = rechecks(st.crew, st.day);
  $("#triage").innerHTML = `<h2>What to do</h2>
    ${anyRed ? `<div class="escalate"><strong>Escalate: ${esc(escShort(e))}</strong>${whyHTML("tri-esc", esc(e.red_tier_guidance))}
      <button class="btn danger" type="button" id="btn-report">Prepare report for flight surgeon</button></div>` : ""}
    ${ews.length || rc.length ? `<h3 class="ew-h">Early warnings <span class="note">patterns & trends across indicators</span></h3>${ews.map(p => patternHTML(p, "mo")).join("")}${recheckHTML(rc)}<h3 class="ew-h">Single readings</h3>` : ""}
    ${items.length ? items.map(it => `<div class="alert tier-${it.tier}">
      <div class="t"><span>${esc(IND[it.id].name)} <span class="num">${fmt(it.value, it.id)} ${esc(IND[it.id].unit)}</span></span><span class="pill tier-${it.tier}">${TIER_LABEL[it.tier]}</span></div>
      ${actsHTML(IND[it.id].actions[it.tier], "tri-" + it.id)}</div>`).join("")
      : `<div class="allclear"><strong>All normal.</strong></div>`}
    ${sym.length ? `<div class="alert tier-amber"><div class="t"><span>Symptoms reported</span></div><div class="note">${esc(sym.join(", "))}</div></div>` : ""}`;
  const b = $("#btn-report"); if (b) b.onclick = openReport;
}
function renderChart() {
  const id = st.ind, isD = !IND[id];
  const rows = ROWS[st.crew];
  const pts = rows.map((r, i) => ({ day: r.day, v: r[id], t: isD ? (isNum(r[id]) ? derivedTier(id, r[id]) : null) : TRI[st.crew][id][i].tier, base: isD ? null : TRI[st.crew][id][i].base })).filter(p => isNum(p.v));
  $("#chart-title").textContent = `${nameOf(id)} (${unitOf(id)})`;
  const ind = IND[id];
  $("#chart-sub").textContent = CREW_NAME[st.crew];
  $("#chart-sub").title = ind ? ind.how_to_measure : DERIVED[id].what;
  const svg = $("#chart"); const W = svg.clientWidth || 900, H = 260, pl = 46, pr = 14, pt = 12, pb = 26;
  const d0 = rows[0].day, d1 = rows[rows.length - 1].day;
  const green = ind && ind.absolute_tiers ? ind.absolute_tiers.green[0] : null;
  let vs = pts.map(p => p.v).concat(pts.map(p => p.base).filter(isNum));
  let lo = Math.min(...vs), hi = Math.max(...vs);
  if (green) { lo = Math.min(lo, Math.max(green[0], lo - (hi - lo) * .3)); hi = Math.max(hi, Math.min(green[1], hi + (hi - lo) * .3)); }
  const pad = (hi - lo) * .1 || 1; lo -= pad; hi += pad;
  const x = d => pl + (d - d0) / (d1 - d0 || 1) * (W - pl - pr), y = v => pt + (1 - (v - lo) / (hi - lo)) * (H - pt - pb);
  const ticks = 5, g = [];
  for (let k = 0; k <= ticks; k++) { const v = lo + (hi - lo) * k / ticks; g.push(`<line x1="${pl}" x2="${W - pr}" y1="${y(v)}" y2="${y(v)}" stroke="var(--line)" stroke-width="1"/><text x="${pl - 6}" y="${y(v) + 4}" text-anchor="end">${(+v.toFixed(hi - lo < 5 ? 1 : 0))}</text>`); }
  const xt = []; for (let d = Math.ceil(d0 / 15) * 15; d <= d1; d += 15) xt.push(`<text x="${x(d)}" y="${H - 8}" text-anchor="middle">${d <= 0 ? "L" + (d - 1) : "D" + d}</text>`);
  let band = "";
  if (green) { const a = Math.max(green[0], lo), b = Math.min(green[1], hi); if (b > a) band = `<rect x="${pl}" width="${W - pl - pr}" y="${y(b)}" height="${y(a) - y(b)}" fill="var(--ok)" opacity=".09"/>`; }
  const launch = `<line x1="${x(0.5)}" x2="${x(0.5)}" y1="${pt}" y2="${H - pb}" stroke="var(--muted)" stroke-dasharray="2 4"/><text x="${x(0.5) + 4}" y="${pt + 10}">launch</text>`;
  const line = pts.map((p, i) => `${i ? "L" : "M"}${x(p.day).toFixed(1)},${y(p.v).toFixed(1)}`).join("");
  const area = pts.length ? `${line}L${x(pts[pts.length - 1].day)},${H - pb}L${x(pts[0].day)},${H - pb}Z` : "";
  const bpts = pts.filter(p => isNum(p.base) && IND[id] && !IND[id].baseline_deviation.metric.startsWith("rolling"));
  const bline = bpts.map((p, i) => `${i ? "L" : "M"}${x(p.day).toFixed(1)},${y(p.base).toFixed(1)}`).join("");
  const col = t => t === "red" ? "var(--crit)" : t === "amber" ? "var(--warn)" : "var(--ok)";
  const dots = pts.map(p => `<circle cx="${x(p.day)}" cy="${y(p.v)}" r="${p.day === st.day ? 5.5 : (p.t === "green" ? 2.2 : 3.4)}" fill="${col(p.t)}" ${p.day === st.day ? 'stroke="var(--ink)" stroke-width="2"' : ""}><title>Day ${p.day}: ${fmt(p.v, id)} ${unitOf(id)}</title></circle>`).join("");
  const today = `<line x1="${x(st.day)}" x2="${x(st.day)}" y1="${pt}" y2="${H - pb}" stroke="var(--accent)" stroke-width="1.5" opacity=".7"/>`;
  svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
  svg.innerHTML = `${g.join("")}${band}${xt.join("")}${launch}<path d="${area}" fill="var(--accent)" opacity=".06"/><path d="${line}" fill="none" stroke="var(--accent)" stroke-width="1.5" opacity=".8"/>${bline ? `<path d="${bline}" fill="none" stroke="var(--ink)" stroke-width="1.2" stroke-dasharray="5 4" opacity=".6"/>` : ""}${today}${dots}`;
}
function renderTimeline() {
  $("#timeline").innerHTML = CREW_IDS.map(c => {
    const cells = ROWS[c].map(r => {
      const t = overall(c, r.day).tier;
      return `<button type="button" class="tl-cell tier-${t} ${r.day === st.day && c === st.crew ? "today" : ""} ${r.day <= 0 ? "pre" : ""}" data-crew="${c}" data-day="${r.day}" aria-label="${c} day ${r.day}: ${TIER_LABEL[t]}" title="${c} · ${r.day <= 0 ? "pre-flight" : "day " + r.day}: ${TIER_LABEL[t]}"></button>`;
    }).join("");
    return `<div class="tl-row"><span class="num">${c}</span><div class="tl-cells">${cells}</div></div>`;
  }).join("");
}
let OVERALL_CACHE = null;
function render() {
  const slider = $("#day"); slider.min = minDay(); slider.max = maxDay();
  if (st.day > maxDay()) st.day = maxDay();
  slider.value = st.day;
  renderHeader(); renderCrew(); renderBody(); renderDetail(); renderTriage(); renderChart(); renderTimeline();
}

// Shared with other modules (see README: "How modules share code").
Object.assign(window, { ESC_SHORT, escShort, AREA, areaOf, tierVar, fmtDelay, renderHeader, renderCrew, renderBody, renderDetail, renderTriage, renderChart, renderTimeline, OVERALL_CACHE, render });
