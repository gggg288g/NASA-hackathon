// Emergency: symptoms -> possible causes from personal data -> protocol.
// ---------- EMERGENCY ASSISTANT ----------
const SYMPTOMS = [
  ["chest pain", "Chest pain"], ["short of breath", "Short of breath"], ["severe headache", "Severe headache"],
  ["blurred vision", "Blurred vision"], ["dizzy or faint", "Dizzy or fainted"], ["confused", "Confused or drowsy"],
  ["shaky or sweaty", "Shaky or sweaty"], ["fever or chills", "Fever or chills"], ["rash", "Rash or blisters"],
  ["nausea", "Nausea or vomiting"], ["injury", "Injury or bleeding"], ["panic", "Panic or can't calm down"],
];
const RED_FLAGS = ["chest pain", "short of breath", "confused", "injury"];
const em = { crew: null, day: null, sym: [], desc: "", ai: null, stage: "sym", causes: [], chat: [], voice: true, busy: false, speakingIdx: -1, model: "" };

// evidence helpers: what this person's own data says
function ev(crew, day, id) {
  const r = reading(crew, id, day); if (!r || !isNum(r.value)) return null;
  const rows = ROWS[crew], i = idxOf(crew, day);
  const past = rows.slice(Math.max(0, i - 7), i).map(x => x[id]).filter(isNum);
  const wk = past.length ? past[0] : null;
  return { v: r.value, tier: r.tier, base: r.base, wk, unit: IND[id].unit, name: IND[id].name,
    up: isNum(r.base) ? r.value - r.base : null, trend: isNum(wk) ? r.value - wk : null };
}
const has = s => em.sym.includes(s);
const line = (e, id) => e ? `${e.name} ${fmt(e.v, id)} ${e.unit}${isNum(e.base) ? ` (your baseline ${fmt(+(+e.base).toFixed(id === "core_temp" ? 2 : 0), id)})` : ""}${isNum(e.trend) && Math.abs(e.trend) > 0 ? `, ${e.trend > 0 ? "up" : "down"} ${Math.abs(+e.trend.toFixed(1))} over 7 days` : ""}` : null;
function analyse(crew, day) {
  const E = id => ev(crew, day, id);
  const bs = E("bp_systolic"), bd = E("bp_diastolic"), hr = E("resting_hr"), tp = E("core_temp"), gl = E("glucose"),
    o2 = E("spo2"), sl = E("sleep_hours"), sr = E("stress"), ex = E("exercise_min"), vi = E("vision_check");
  const recentSym = ROWS[crew].filter(r => r.day <= day && r.day > day - 7).flatMap(r => String(r.symptoms || "").split(/[;,]/)).filter(Boolean);
  const out = [];
  const add = (title, score, evid, proto, actions) => { if (score > 0) out.push({ title, score, evid: evid.filter(Boolean), proto, actions }); };
  // 1. High blood pressure crisis
  { let sc = 0; const e = [];
    if (has("severe headache")) { sc += 2; e.push("Severe headache reported now"); }
    if (has("blurred vision")) { sc += 2; e.push("Blurred vision reported now"); }
    if (has("chest pain")) sc += 1;
    if (bs && (bs.tier === "red" || (isNum(bs.up) && bs.up >= 15))) { sc += 3; e.push(line(bs, "bp_systolic")); }
    else if (bs && bs.tier === "amber") { sc += 1; e.push(line(bs, "bp_systolic")); }
    if (bd && bd.tier !== "green" && bd.tier) e.push(line(bd, "bp_diastolic"));
    if (recentSym.includes("headache")) e.push("Headaches logged in the last 7 days");
    add("High blood pressure crisis", sc >= 3 ? sc : 0, e, "bp"); }
  // 2. Low blood sugar
  { let sc = 0; const e = [];
    if (has("shaky or sweaty")) { sc += 2; e.push("Shaky or sweaty now"); }
    if (has("confused")) { sc += 1; e.push("Confused or drowsy now"); }
    if (has("dizzy or faint")) sc += 1;
    if (gl && gl.v < 70) { sc += 3; e.push(line(gl, "glucose")); } else if (gl && isNum(gl.up) && gl.up < -10) { sc += 1; e.push(line(gl, "glucose")); }
    if (ex && ex.v >= 140) { sc += 1; e.push(`Long exercise today (${fmt(ex.v)} min)`); }
    add("Low blood sugar", sc >= 3 ? sc : 0, e, "hypo"); }
  // 3. Infection / virus reactivation
  { let sc = 0; const e = [];
    if (has("fever or chills")) { sc += 2; e.push("Fever or chills now"); }
    if (has("rash")) { sc += 2; e.push("Rash or blisters now (shingles-type reactivation is common in spaceflight)"); }
    if (tp && (tp.tier === "red" || (isNum(tp.up) && tp.up >= .6))) { sc += 2; e.push(line(tp, "core_temp")); }
    if (hr && isNum(hr.up) && hr.up / hr.base > .1) { sc += 1; e.push(line(hr, "resting_hr")); }
    if (sr && isNum(sr.base) && sr.base >= 3.5) { sc += 1; e.push(`High stress lately (5-day avg ${(+sr.base).toFixed(1)}), which weakens immunity`); }
    if (sl && isNum(sl.base) && sl.base < 6) e.push(`Short sleep lately (3-day avg ${(+sl.base).toFixed(1)} h)`);
    add("Infection or virus reactivation", sc >= 3 ? sc : 0, e, "fever"); }
  // 4. Fainting risk / fluid loss
  { let sc = 0; const e = [];
    if (has("dizzy or faint")) { sc += 2; e.push("Dizzy or fainted now"); }
    if (has("nausea")) { sc += 1; e.push("Nausea or vomiting (fluid loss)"); }
    if (bs && isNum(bs.up) && bs.up <= -12) { sc += 2; e.push(line(bs, "bp_systolic")); }
    if (hr && isNum(hr.up) && hr.up / hr.base > .12) { sc += 1; e.push(line(hr, "resting_hr")); }
    if (ENV[st.env].gravity_g > 0.1) { sc += 1; e.push(`Recent change in gravity (${ENV[st.env].name}): blood can pool in the legs`); }
    add("Fainting risk or fluid loss", sc >= 3 ? sc : 0, e, null, ["Lie down or restrain flat; raise the legs", "Sip fluids if not vomiting", "Re-check heart rate and blood pressure in 10 minutes", "Tell the crew medical officer"]); }
  // 5. Eye / brain pressure change (SANS)
  { let sc = 0; const e = [];
    if (has("blurred vision")) { sc += 2; e.push("Blurred vision now"); }
    if (vi && vi.v >= 1) { sc += 2; e.push("Weekly vision check flagged a change"); }
    if (has("severe headache")) sc += 1;
    add("Eye and brain pressure change (SANS)", sc >= 3 ? sc - 1 : 0, e, null, ["Stop screen and close work", "Repeat the reading card and grid test", "Crew medical officer to arrange an eye scan (ultrasound/OCT)"]); }
  // 6. Breathing / cabin air
  { let sc = 0; const e = [];
    if (has("short of breath")) { sc += 2; e.push("Short of breath now"); }
    if (o2 && o2.v < 94) { sc += 2; e.push(line(o2, "spo2")); }
    if (has("severe headache") && has("short of breath")) { sc += 1; e.push("Headache with breathlessness can point to high cabin CO2"); }
    add("Breathing problem or cabin air (CO2)", sc >= 2 ? sc : 0, e, null, ["Check the cabin CO2 and oxygen readings now", "Move to the best-ventilated module", "Put on oxygen mask if SpO2 stays below 92%", "Crew medical officer now"]); }
  // 7. Heart or lung emergency (red flag pattern, no data needed)
  if (has("chest pain")) add("Possible heart or lung emergency", 9, ["Chest pain is always treated as an emergency until ruled out", line(hr, "resting_hr"), line(bs, "bp_systolic")], null, ["Stop all activity, stay still", "Crew medical officer now; get the ECG and AED from the medical kit", "Follow the onboard chest-pain checklist"]);
  // 8. Acute stress reaction (only after physical causes)
  { let sc = 0; const e = [];
    if (has("panic")) { sc += 2; e.push("Panic now"); }
    if (sr && isNum(sr.base) && sr.base >= 3.5) { sc += 1; e.push(`Stress high lately (5-day avg ${(+sr.base).toFixed(1)})`); }
    if (sl && isNum(sl.base) && sl.base < 6) { sc += 1; e.push(`Short sleep lately (3-day avg ${(+sl.base).toFixed(1)} h)`); }
    add("Acute stress reaction", sc >= 2 ? sc - 1 : 0, e, null, ["Breathe in for 4, hold 4, out for 6. Repeat 5 times", "Rule out the physical causes above first", "Talk to a crewmate; private call with the behavioural health team when possible"]); }
  return out.sort((a, b) => b.score - a.score);
}
const likely = sc => sc >= 6 ? ["red", "Most likely"] : sc >= 4 ? ["amber", "Possible"] : ["none", "Less likely"];

async function openEmergency() {
  em.crew = document.body.dataset.mode === "mo" ? st.crew : am.me;
  em.day = document.body.dataset.mode === "mo" ? st.day : Math.max(...ROWS[em.crew].map(r => r.day));
  Object.assign(em, { sym: [], desc: "", ai: null, stage: "sym", causes: [], chat: [] });
  renderEmg(); $("#dlg-emg").showModal();
}
const EMG_DEMOS = [["CDR", 50, ["severe headache", "blurred vision"], "BP crisis"], ["FE1", 38, ["fever or chills", "rash"], "Virus"], ["FE2", 62, ["shaky or sweaty", "confused"], "Low sugar"]];
function renderEmg() {
  const e = ENV[st.env], crewOpts = CREW_IDS.map(c => `<option value="${c}" ${c === em.crew ? "selected" : ""}>${esc(CREW_NAME[c])}</option>`).join("");
  const head = `<div class="emg-head"><h3 id="emg-title">Emergency</h3><button class="btn" type="button" id="emg-close">Close</button></div>`;
  if (em.stage === "sym") {
    $("#emg-body").innerHTML = `${head}<p class="calm">You're doing the right thing. Tap what you notice. Nothing is sent until you say so.</p>
      <div class="who"><label for="emg-who" class="note">Who needs help</label><select id="emg-who">${crewOpts}</select><span class="note">Data up to day ${em.day}</span></div>
      <div class="symgrid">${SYMPTOMS.map(([k, l]) => `<button type="button" data-es="${k}" aria-pressed="${em.sym.includes(k)}">${esc(l)}</button>`).join("")}</div>
      <label class="describe"><span class="note">Describe what's happening (optional)</span><textarea id="emg-desc" rows="2" maxlength="600" placeholder="e.g. collapsed after exercise, pale, says the room is spinning">${esc(em.desc)}</textarea></label>
      <div class="wiz-nav"><div class="demo-row"><span class="note">Demo:</span>${EMG_DEMOS.map(([c, d, sy, l], k) => `<button class="btn" type="button" data-ed="${k}">${l}</button>`).join("")}</div>
      <button class="btn danger" type="button" id="emg-go" ${em.sym.length || em.desc.trim() ? "" : "disabled"}>Assess</button></div>`;
    $("#emg-who").onchange = ev => { em.crew = ev.target.value; em.day = Math.max(...ROWS[em.crew].map(r => r.day)); renderEmg(); };
    $("#emg-desc").oninput = ev => { em.desc = ev.target.value; $("#emg-go").disabled = !(em.sym.length || em.desc.trim()); };
  } else {
    const flags = em.sym.filter(x => RED_FLAGS.includes(x));
    const auto = e.escalation_policy === "autonomous_first";
    const delay = fmtDelay(e).replace("Comms delay: ", "").replace("Comms: ", "").replace(" each way", "");
    const [top, ...rest] = em.causes;
    const [tt, tl] = top ? likely(top.score) : ["amber", ""];
    const topHTML = top ? `<div class="topc tier-${tt}"><span class="lk">${tl}</span><h4>${esc(top.title)}</h4>
        <ul class="evd">${[...top.evid].sort((a, b) => /baseline|mg\/dL|%/.test(b) - /baseline|mg\/dL|%/.test(a)).slice(0, 2).map(x => `<li>${esc(x)}</li>`).join("")}</ul>
        ${top.proto ? `<button class="btn danger bigbtn" type="button" data-proto="${top.proto}">Start steps</button>` : `<ol class="steps">${top.actions.slice(0, 3).map(a => `<li>${esc(a)}</li>`).join("")}</ol>`}</div>`
      : `<div class="topc tier-amber"><h4>No clear match</h4><p class="ctx">Take the symptoms seriously and get the crew medical officer.</p></div>`;
    const row = c => `<div class="orow"><span>${esc(c.title)} <span class="note">· ${likely(c.score)[1]}</span></span>${c.proto ? `<button class="tl" type="button" data-proto="${c.proto}">Steps</button>` : ""}</div>`;
    // With AI: the AI assessment leads and the rule-based check sits underneath as a cross-check.
    // Without AI (or if it fails): the rule-based result leads, exactly as before.
    const rulesLead = `${topHTML}${rest.length ? disc("emg-more", `Other possibilities<span class="count">${Math.min(rest.length, 3)}</span>`, rest.slice(0, 3).map(row).join("")) : ""}`;
    const aiLead = AI.sample && (!em.ai || em.ai.status !== "error");
    $("#emg-body").innerHTML = `${head}
      <div style="display:grid;gap:12px">
      ${flags.length ? `<div class="redflag">Get the crew medical officer now.</div>` : ""}
      <p class="ctx">${esc(CREW_NAME[em.crew])} · ${auto ? `Ground is ${esc(delay)} away. Act on board first.` : `Ground is ${esc(delay)}. Call them in parallel.`}</p>
      ${aiLead ? `<div id="emg-assess" aria-live="polite">${assessHTML()}</div>
        ${em.causes.length ? disc("emg-rules", `Rule-based check<span class="count">${Math.min(em.causes.length, 4)}</span>`, em.causes.slice(0, 4).map(row).join("")) : ""}`
      : `${em.ai && em.ai.status === "error" ? `<p class="note" style="margin:0">AI assessment unavailable. Showing the rule-based check.</p>` : ""}${rulesLead}`}
      <div class="linkrow"><button class="tl" type="button" id="emg-back">Change symptoms</button><button class="tl" type="button" id="emg-rep">Send report</button></div>
      <section class="askwrap" id="emg-ai">
        <div class="chat" id="chat" aria-live="polite">${chatHTML()}</div>
        <div class="ask" id="askbar">
          <button class="ib" type="button" id="ai-mic" aria-label="Speak" hidden>${ICON.mic}</button>
          <input type="text" id="ai-in" placeholder="Ask a follow-up question" aria-label="Ask the helper" enterkeyhint="send">
          <button class="ib" type="button" id="ai-voice" aria-label="Read replies aloud" aria-pressed="${em.voice}" hidden>${em.voice ? ICON.spk : ICON.mute}</button>
          <button class="ib send" type="button" id="ai-send" aria-label="Send">${ICON.up}</button>
        </div>
        <div class="foot"><span id="ai-status">Guide only. Follow the medical officer.</span><span id="ai-model">${em.model ? esc(em.model) : ""}</span></div>
      </section></div>`;
    $("#emg-back").onclick = () => { em.stage = "sym"; renderEmg(); };
    $("#emg-rep").onclick = () => {
      const a = em.ai && em.ai.status === "done" ? em.ai.data : null;
      st.crew = em.crew; st.day = em.day; $("#dlg-emg").close();
      openReport(["EMERGENCY · symptoms: " + (em.sym.join(", ") || "none tapped"), ...(em.desc.trim() ? ["Described: " + em.desc.trim()] : []),
        ...(a ? [`AI assessment (${em.model || "AI"}): most likely ${a.likely_cause} (${a.confidence} confidence)`, ...a.why.map(w => "  - " + w), "Steps given to crew:", ...a.steps.map((x, i) => `  ${i + 1}. ${x}`)] : []),
        ...em.causes.slice(0, 3).map(c => `Rule-based: possible ${c.title} — ${c.evid.slice(0, 3).join("; ")}`)]);
    };
    wireAI();
  }
  $("#emg-close").onclick = () => { stopVoice(); $("#dlg-emg").close(); };
}
document.addEventListener("click", ev => {
  const b = ev.target.closest("[data-es]"); if (b) { const k = b.dataset.es, i = em.sym.indexOf(k); i >= 0 ? em.sym.splice(i, 1) : em.sym.push(k); renderEmg(); return; }
  const d = ev.target.closest("[data-ed]"); if (d) { const [c, day, sy] = EMG_DEMOS[+d.dataset.ed]; Object.assign(em, { crew: c, day, sym: [...sy], desc: "" }); renderEmg(); return; }
  if (ev.target.closest("#emg-go")) { unlockDeviceVoice(); em.causes = analyse(em.crew, em.day); em.stage = "res"; em.chat = []; em.ai = AI.sample ? { status: "loading" } : null; renderEmg(); startAI(); }
});
$("#btn-emg").onclick = openEmergency;
// ticking a step in the AI care plan greys it out, like the onboard checklists
document.addEventListener("change", ev => { const c = ev.target.closest("#emg-assess input[type=checkbox]"); if (c) c.closest("li").classList.toggle("done", c.checked); });

// AI assessment card: most likely cause + why (from their data) + steps for the crewmate who is helping
const URGENCY = { act_now: ["red", "Act now"], urgent: ["amber", "Urgent"], monitor: ["green", "Monitor"] };
function assessHTML() {
  const name = esc(CREW_NAME[em.crew]);
  if (!em.ai || em.ai.status === "loading") return `<div class="topc tier-none"><span class="lk">AI is reviewing ${name}'s data and symptoms…</span><h4 class="thinking">Working out the likely cause</h4></div>`;
  const a = em.ai.data, [tier, label] = URGENCY[a.urgency] || URGENCY.urgent;
  return `<div class="topc tier-${tier}"><span class="lk">${label} · most likely (${esc(a.confidence)} confidence)</span><h4>${esc(a.likely_cause)}</h4>
      ${a.why.length ? `<ul class="evd">${a.why.map(w => `<li>${esc(w)}</li>`).join("")}</ul>` : ""}</div>
    <section class="care proto"><h4>What to do for ${name}</h4>
      <ol>${a.steps.map((x, i) => `<li><input type="checkbox" aria-label="Done: step ${i + 1}"><span><strong class="num">${i + 1}.</strong> ${esc(x)}</span></li>`).join("")}</ol>
      ${a.protocol ? `<button class="btn danger bigbtn" type="button" data-proto="${a.protocol}">Open onboard checklist: ${esc(PROTOCOLS[a.protocol].title)}</button>` : ""}
      ${a.escalate ? `<p class="ctx"><strong>Flight surgeon:</strong> ${esc(a.escalate)}</p>` : ""}
    </section>
    ${a.watch_for.length ? disc("emg-watch", "Watch for (getting worse)", `<ul class="evd">${a.watch_for.map(w => `<li>${esc(w)}</li>`).join("")}</ul>`) : ""}
    ${a.other_possibilities.length ? disc("emg-alt", `Other possibilities<span class="count">${a.other_possibilities.length}</span>`, a.other_possibilities.map(o => `<div class="orow"><span>${esc(o.cause)}${o.why ? ` <span class="note">· ${esc(o.why)}</span>` : ""}</span></div>`).join("")) : ""}`;
}
function renderAssess() { const el = $("#emg-assess"); if (el) el.innerHTML = assessHTML(); else if (em.stage === "res") renderEmg(); }

// Shared with other modules (see README: "How modules share code").
Object.assign(window, { SYMPTOMS, RED_FLAGS, em, ev, has, line, analyse, likely, openEmergency, EMG_DEMOS, renderEmg, URGENCY, assessHTML, renderAssess });
