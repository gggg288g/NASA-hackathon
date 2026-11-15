// Astronaut view: Today screen, habits, body status.
// ---------- ASTRONAUT MODE ----------
const FLUID_KEY = "crew-health.fluid.v1";   // drinks logged today survive a reload (offline, on this device only)
const am = { me: "CDR", shareMood: false, done: {}, fluid: (() => { try { return JSON.parse(localStorage.getItem(FLUID_KEY)) || {}; } catch { return {}; } })() };   // fluid["CREW:day"] = [ml, ml, ...] drinks logged so far
const saveFluid = () => { try { localStorage.setItem(FLUID_KEY, JSON.stringify(am.fluid)); } catch { } };
// Plain step-by-step instructions (demo wording; real crews follow their onboard medical checklists)
const HOWTO = {
  sleep_hours: ["Check your wrist sensor's sleep summary, or estimate from lights-out to wake-up.", "Count only time actually asleep."],
  resting_hr: ["Do this before breakfast and before exercise.", "Stay still (restrained) for 1 minute.", "Read the pulse from your monitor, or count your wrist pulse for 60 seconds."],
  bp: ["Wrap the cuff on your bare left upper arm, 2 cm above the elbow.", "Keep the arm at heart level and stay still for 1 minute. No talking.", "Take 2 readings 1 minute apart and enter the average."],
  core_temp: ["Use the forehead sensor at rest, not within 30 minutes after exercise.", "Hold still until the reading settles."],
  spo2: ["Clip the oximeter on a warm fingertip.", "Keep the hand still for 30 seconds until the number is steady."],
  glucose: ["Fasting: before breakfast.", "Clean the fingertip, prick the side, wipe the first drop.", "Touch the second drop to the test strip."],
  exercise_min: ["Total minutes on treadmill, cycle and resistance device today.", "The device log fills this in automatically when connected."],
  fluid_intake_ml: ["Add up every drink today: water, juice, coffee and rehydrated drinks. A standard drink pouch is about 250 ml.", "If you logged drinks on the Today screen, the total is already filled in. Change it if it is off.", "Soup and food water are not counted here."],
  mood: ["How do you feel overall today?"],
  stress: ["How stressed do you feel right now?"],
  body_mass: ["Use the mass measurement device after waking, before eating.", "Follow the device prompts; hold still during the measurement."],
  vision_check: ["Wear your usual reading correction and hold the screen at reading distance.", "Cover one eye and look only at the centre dot.", "Notice whether any lines look wavy, blurred or missing. Then do the other eye."],
};
const WHY = {
  sleep_hours: "Short sleep builds up over days and dulls attention.",
  resting_hr: "A rising resting rate can be an early sign of dehydration, infection or stress.",
  bp: "In space your blood pressure normally drops. A climb back up can mean trouble with the heart or eyes.",
  core_temp: "Your normal runs about 1 °C warmer in space, so we compare against YOUR baseline, not 37 °C.",
  spo2: "Checks that your blood carries enough oxygen in the closed cabin air.",
  glucose: "Spaceflight can make the body handle sugar differently. Low values need quick action.",
  exercise_min: "Exercise is your main defence against bone and muscle loss.",
  fluid_intake_ml: "Thirst is weaker in space and fluids shift toward the head, so crews drink less than they need. Low intake raises kidney-stone risk and makes dizziness worse on return to gravity.",
  mood: "Isolation is one of the five big hazards of spaceflight. Patterns over days matter, not one bad day.",
  stress: "Stress weakens the immune system and can wake up dormant viruses.",
  symptoms: "Early reporting of rashes, fever or headaches lets the crew act before things get worse.",
  body_mass: "Weight loss can mean muscle loss or not eating enough.",
  vision_check: "Fluid shifts toward the head can change your eyes (SANS). Most early changes can't be felt, so a quick grid test catches them.",
  phq9: "Isolation is one of the five hazards of spaceflight. This standard 9-question check spots low mood early. Answer for the last 2 weeks.",
};
const PHQ_ITEMS = ["Little interest or pleasure in doing things", "Feeling down, depressed, or hopeless", "Trouble falling or staying asleep, or sleeping too much", "Feeling tired or having little energy", "Poor appetite or overeating", "Feeling bad about yourself, or that you are a failure or have let yourself or your family down", "Trouble concentrating on things, such as reading or watching a screen", "Moving or speaking so slowly that others could notice, or being so fidgety or restless that you move around a lot more than usual", "Thoughts that you would be better off dead, or of hurting yourself in some way"];
const PHQ_LAB = ["Not at all", "Several days", "Over half the days", "Nearly every day"];
const PHQ_BAND = t => t >= 20 ? "severe" : t >= 15 ? "moderately severe" : t >= 10 ? "moderate" : t >= 5 ? "mild" : "minimal";
const PHQ_URGENT = "Thank you for answering honestly. Please talk to the crew medical officer or a crewmate you trust now, and ask for a private conference with the behavioural health team today. You don't have to handle this alone.";
function amslerSVG() { let g = ""; for (let i = 0; i <= 20; i++) g += `<line x1="${i * 10}" y1="0" x2="${i * 10}" y2="200"/><line x1="0" y1="${i * 10}" x2="200" y2="${i * 10}"/>`; return `<svg class="amsler" viewBox="0 0 200 200" role="img" aria-label="Amsler grid with a centre dot"><rect width="200" height="200" fill="#fff"/><g stroke="#1c1c1e" stroke-width=".7">${g}</g><circle cx="100" cy="100" r="3.2" fill="#1c1c1e"/></svg>`; }
function wizSteps(day) {
  const st = [
    { id: "sleep_hours", title: "Last night's sleep", group: "Morning" },
    { id: "resting_hr", title: "Resting heart rate", group: "Morning" },
    { id: "bp", title: "Blood pressure", group: "Morning", fields: ["bp_systolic", "bp_diastolic"] },
    { id: "core_temp", title: "Body temperature", group: "Morning" },
    { id: "spo2", title: "Blood oxygen", group: "Morning" },
    { id: "glucose", title: "Fasting blood sugar", group: "Morning" },
  ];
  if (day % 7 === 0) st.push({ id: "body_mass", title: "Weekly: body mass", group: "Weekly" }, { id: "vision_check", title: "Weekly: eye check", group: "Weekly", amsler: true, choice: [[0, "All lines straight"], [1, "Some lines wavy or blurred"], [2, "A patch is missing or dark"]] });
  if (day % 14 === 7) st.push({ id: "phq9", title: "Mood check", group: "Every 2 weeks", phq: true });
  st.push(
        { id: "fluid_intake_ml", title: "Fluids today", group: "Evening" },
    { id: "exercise_min", title: "Exercise today", group: "Evening" },
    { id: "mood", title: "Mood", group: "Evening", choice: [[1, "1 · Very low"], [2, "2 · Low"], [3, "3 · OK"], [4, "4 · Good"], [5, "5 · Great"]] },
    { id: "stress", title: "Stress", group: "Evening", choice: [[1, "1 · Calm"], [2, "2"], [3, "3 · Some"], [4, "4 · High"], [5, "5 · Overwhelmed"]] },
    { id: "symptoms", title: "Any symptoms?", group: "Evening", multi: ["headache", "rash", "chills", "sore throat", "nausea", "dizziness", "blurred vision", "fatigue"] },
  );
  return st;
}
function provisionalTier(crew, id, v) {
  if (!IND[id] || !isNum(v)) return null;
  const vals = ROWS[crew].map(r => r[id]).concat([v]);
  return triageSeries(IND[id], vals).pop();
}
// ---------- hydration log ----------
const HYD_STEPS = [250, 500, 750];   // quick-add sizes in ml (250 ml is about one drink pouch)
const fluidKey = (crew, day) => crew + ":" + day;
const fluidLog = (crew, day) => am.fluid[fluidKey(crew, day)] || [];
const fluidToday = (crew, day) => fluidLog(crew, day).reduce((a, b) => a + b, 0);
// Daily target: 32 ml per kg body mass, never below 2100 ml (rounded to 50).
function fluidGoal(crew) {
  const mass = [...ROWS[crew]].reverse().map(r => r.body_mass).find(isNum);
  return Math.max(2100, Math.round((isNum(mass) ? mass * 32 : 0) / 50) * 50);
}
function logFluid(crew, day, ml) {
  if (!(ml > 0 && ml <= 3000)) return;
  (am.fluid[fluidKey(crew, day)] ||= []).push(Math.round(ml));
  saveFluid();
  renderAstro();
}
function undoFluid(crew, day) { const a = am.fluid[fluidKey(crew, day)]; if (a && a.length) { a.pop(); saveFluid(); renderAstro(); } }
function hydrationHTML(crew, d, isDone) {
  const ml = fluidToday(crew, d), goal = fluidGoal(crew), n = fluidLog(crew, d).length;
  const pct = Math.min(100, Math.round(ml / goal * 100));
  const tier = ml >= 2000 ? "green" : ml >= 1500 ? "amber" : "red";
  const left = Math.max(0, goal - ml);
  return `<div class="hyd-top"><span class="big num">${ml.toLocaleString()} <small>of ${goal.toLocaleString()} ml</small></span>${isDone ? `<span class="pill tier-${tier}">${TIER_LABEL[tier]}</span>` : ""}</div>
    <div class="hydbar" role="progressbar" aria-valuemin="0" aria-valuemax="${goal}" aria-valuenow="${ml}" aria-label="Fluids today"><i style="width:${pct}%"></i></div>
    <div class="note">${isDone ? "Saved with today's check-in." : left ? `${left.toLocaleString()} ml to go. ${n} drink${n === 1 ? "" : "s"} logged.` : `Target reached. ${n} drink${n === 1 ? "" : "s"} logged.`}</div>
    ${isDone ? "" : `<div class="hyd-btns">${HYD_STEPS.map(v => `<button class="btn" type="button" data-hyd="${v}">+${v} ml</button>`).join("")}</div>
      <div class="hyd-custom"><input type="number" inputmode="numeric" id="hyd-custom" min="1" max="3000" step="10" placeholder="Other amount (ml)" aria-label="Other amount in ml"><button class="btn" type="button" id="hyd-add">Add</button><button class="btn" type="button" id="hyd-undo" ${n ? "" : "disabled"}>Undo last</button></div>`}
    ${whyHTML("as-hyd-why", `Target is 32 ml per kg of body mass, at least 2100 ml (NASA exploration nutrition requirement for food plus drinks). Only drinks are counted here, so a day just under the target is normal. Below 2000 ml shows as Watch and below 1500 ml as Act.`, "Where does the target come from?")}`;
}
const lastDay = crew => Math.max(...ROWS[crew].map(r => r.day));
const today = crew => { const m = lastDay(crew); return am.done[crew] === m ? m : m + 1; };

function lastFlags(crew) {
  const d = Math.max(...ROWS[crew].map(r => r.day)), items = [];
  for (const id of Object.keys(IND)) { const r = reading(crew, id, d); if (r && (r.tier === "amber" || r.tier === "red")) items.push({ id, ...r }); }
  return { day: d, items: items.sort((a, b) => RANK[b.tier] - RANK[a.tier]) };
}
function streak(crew, test) {
  const rows = ROWS[crew].filter(r => r.day >= 1); let n = 0;
  for (let i = rows.length - 1; i >= 0; i--) { if (test(rows[i], i, rows)) n++; else break; }
  return n;
}
function last14(crew, test) { return ROWS[crew].filter(r => r.day >= 1).slice(-14).map(r => test(r)); }
const PROTOCOL_FOR = (id, v, tier) => {
  if (id === "bp_systolic" && tier === "red") return "bp";
  if (id === "bp_diastolic" && tier === "red") return "bp";
  if (id === "core_temp" && tier === "red") return "fever";
  if (id === "glucose" && isNum(v) && v < 70) return "hypo";
  return null;
};
function renderAstro() {
  const crew = am.me, d = today(crew), isDone = am.done[crew] === d;
  const e = ENV[st.env];
  const flags = lastFlags(crew);
  const o = overall(crew, flags.day);
  const reds = flags.items.filter(i => i.tier === "red"), ambers = flags.items.filter(i => i.tier === "amber");
  const t = reds.length ? "red" : ambers.length ? "amber" : "green";
  const ews = patterns(crew, flags.day), rc = rechecks(crew, flags.day);
  const status = t !== "green" || ews.some(p => p.tier === "red") ? "Check in with medical" : ews.length ? `You're OK today, with ${ews.length} thing${ews.length > 1 ? "s" : ""} to watch` : "You're OK today";
  const steps = wizSteps(d);
  const groups = [...new Set(steps.map(s => s.group))];
  const exStreak = streak(crew, r => r.exercise_min >= 90);
  const sleepOK = last14(crew, r => r.sleep_hours >= 6.5);
  const ciStreak = streak(crew, r => [r.resting_hr, r.bp_systolic, r.core_temp].filter(isNum).length >= 2);
  const protoBtns = [...new Set(flags.items.map(i => PROTOCOL_FOR(i.id, i.value, i.tier)).filter(Boolean))];
  const sysAll = Object.keys(SYS).map(sid => ({ sid, tier: systemStatus(crew, sid, flags.day).tier }));
  const sysFlag = sysAll.filter(x => x.tier === "amber" || x.tier === "red");
  const sysRow = x => `<div><span>${esc(SYS[x.sid].name)}</span><span class="pill tier-${x.tier}">${TIER_LABEL[x.tier]}</span></div>`;
  const ex14 = last14(crew, r => r.exercise_min >= 90);
  const hydMl = fluidToday(crew, d);
  $("#astro-view").innerHTML = `
    <section class="hero tier-${t}">
      <div class="eyebrow">${esc(CREW_NAME[crew])} · ${esc(e.name)} · Day <span class="num">${d}</span>${isDone ? " · check-in done" : ""}</div>
      <h2>${esc(status)}</h2>
      ${isDone ? `<button class="btn bigbtn" type="button" id="astro-next">Start next day</button>` : `<button class="btn primary bigbtn" type="button" id="astro-start">Daily check-in</button>`}
      <button class="btn bigbtn" type="button" data-mode="sc">Self-check</button>
      <button class="btn bigbtn" type="button" id="astro-rt">Reaction check · 60 s</button>
    </section>
    ${ews.length || rc.length ? `<section class="card ew-card"><h3 class="ew-h">Your health story <span class="note">patterns across your data, before they become alerts</span></h3>${ews.map(p => patternHTML(p, "as")).join("")}${recheckHTML(rc)}</section>` : ""}
    ${flags.items.length ? disc("as-act", `What to do<span class="count">${flags.items.length}</span>`, `
      ${flags.items.slice(0, 4).map(i => `<div class="act tier-${i.tier}"><div class="t"><span>${esc(IND[i.id].name)} <span class="num">${fmt(i.value, i.id)} ${esc(IND[i.id].unit)}</span></span><span class="pill tier-${i.tier}">${TIER_LABEL[i.tier]}</span></div>${actsHTML(IND[i.id].actions[i.tier], "as-" + i.id)}</div>`).join("")}
      ${protoBtns.map(p => `<button class="btn danger bigbtn" type="button" data-proto="${p}">Step by step: ${PROTOCOLS[p].title}</button>`).join("")}
      ${reds.length ? `<button class="btn bigbtn" type="button" id="astro-report">Report to ground</button>` : ""}`, "card") : ""}
    ${disc("as-body", "Your body", `
      ${sysFlag.length ? `<div class="sysl">${sysFlag.map(sysRow).join("")}</div>` : `<div class="allclear"><strong>All ${sysAll.length} systems normal.</strong></div>`}
      ${disc("as-sys", "All systems", `<div class="sysl">${sysAll.map(sysRow).join("")}</div>`)}`, "card")}
      ${disc("as-hyd", `Hydration<span class="count">${hydMl.toLocaleString()} / ${fluidGoal(crew).toLocaleString()} ml</span>`, hydrationHTML(crew, d, isDone), "card")}
      ${disc("as-habits", "Habits", `
      <div class="habits">
        <div class="habit"><span class="note">Exercise</span><span class="big num">${exStreak} <small>day streak</small></span><div class="dots">${ex14.map(x => `<i class="${x ? "on" : ""}"></i>`).join("")}</div></div>
        <div class="habit"><span class="note">Sleep 6.5 h+</span><span class="big num">${sleepOK.filter(Boolean).length} <small>of 14 nights</small></span><div class="dots">${sleepOK.map(x => `<i class="${x ? "on" : ""}"></i>`).join("")}</div></div>
        <div class="habit"><span class="note">Vitals logged</span><span class="big num">${ciStreak} <small>day streak</small></span></div>
      </div>
      ${whyHTML("as-bone", `Estimated bone loss so far: <span class="num">${fmt(ROWS[crew][ROWS[crew].length - 1].est_bone_loss_pct)}%</span>. Bones lose about 1 to 1.5% a month in microgravity. Each full exercise day slows it.`, "Why exercise?")}`, "card")}
    ${disc("as-checks", `Today's checks<span class="count">${steps.length}</span>`, `<div class="todo">${groups.map(g => `<div class="note">${g}</div><ul>${steps.filter(s => s.group === g).map(s => `<li><span class="tick ${isDone ? "done" : ""}"></span><span>${esc(s.title)}</span><span class="note">${isDone ? "Done" : ""}</span></li>`).join("")}</ul>`).join("")}</div>`, "card")}
    ${disc("as-priv", "Privacy", `<label class="privacy"><input type="checkbox" id="share-mood" ${am.shareMood ? "checked" : ""}><span>Share my mood and stress scores with ground.</span></label>${whyHTML("as-priv-why", "Off by default, so only you and the crew medical officer see them.")}
      <p class="note" style="margin:10px 0 6px">Works offline. Your check-ins are stored on this device only (${window.savedCount ? savedCount() : 0} saved).</p>
      <button class="btn" type="button" id="clear-saved">Clear saved check-ins</button>`, "card")}`;
  const cs = $("#clear-saved"); if (cs) cs.onclick = () => { if (confirm("Delete the check-ins saved on this device?")) clearSaved(); };
  const rtb = $("#astro-rt"); if (rtb) rtb.onclick = () => openReaction(crew, flags.day);
  const s1 = $("#astro-start"); if (s1) s1.onclick = () => openWizard(crew);
  const s2 = $("#astro-next"); if (s2) s2.onclick = () => { delete am.done[crew]; renderAstro(); };
  const s3 = $("#astro-report"); if (s3) s3.onclick = () => { st.crew = crew; st.day = flags.day; openReport(); };
    document.querySelectorAll("[data-hyd]").forEach(b => b.onclick = () => logFluid(crew, d, +b.dataset.hyd));
  const hc = $("#hyd-custom"), ha = $("#hyd-add");
  if (ha) { const add = () => { const v = parseFloat(hc.value); if (v > 0 && v <= 3000) logFluid(crew, d, v); else hc.value = ""; }; ha.onclick = add; hc.onkeydown = ev => { if (ev.key === "Enter") add(); }; }
  const hu = $("#hyd-undo"); if (hu) hu.onclick = () => undoFluid(crew, d);
  $("#share-mood").onchange = ev => { am.shareMood = ev.target.checked; };
}

// Shared with other modules (see README: "How modules share code").
Object.assign(window, { am, HOWTO, WHY, PHQ_ITEMS, PHQ_LAB, PHQ_BAND, PHQ_URGENT, amslerSVG, wizSteps, provisionalTier, lastDay, today, lastFlags, streak, last14, PROTOCOL_FOR, renderAstro, fluidToday, fluidGoal, fluidLog, logFluid, undoFluid });
