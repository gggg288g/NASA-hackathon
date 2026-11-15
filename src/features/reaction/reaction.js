// 60-second reaction-time check for fatigue (short demo version of the Psychomotor Vigilance Test, PVT).
// The full 3- and 10-minute PVT is the standard objective fatigue test, and a version runs in NASA's
// Cognition battery on the ISS. This 60-second version is a demo, not a validated test.
// Results are stored on this device and compared with the astronaut's own past results.

const RT_KEY = "crew-health.pvt.v1";
const RT_SECONDS = 60, LAPSE_MS = 500, REF_MS = 300;   // a median under ~300 ms is typical when rested
const rtLoad = () => { try { return JSON.parse(localStorage.getItem(RT_KEY)) || {}; } catch { return {}; } };
const rtHistory = crew => rtLoad()[crew] || [];
function rtSave(crew, res) { try { const s = rtLoad(); (s[crew] = s[crew] || []).push(res); localStorage.setItem(RT_KEY, JSON.stringify(s)); } catch { } }
// Personal baseline = median of the earlier results' medians (needs 3); until then a typical rested value.
function rtBaseline(crew, before) {
  const h = rtHistory(crew).filter(r => r !== before).slice(-10).map(r => r.median);
  return h.length >= 3 ? { ms: median(h), own: true } : { ms: REF_MS, own: false };
}
function rtTier(res, base) {
  const slow = res.median / base.ms;
  return res.lapses >= 4 || slow >= 1.3 ? "red" : res.lapses >= 2 || slow >= 1.15 ? "amber" : "green";
}
// Latest result for this crew member on/near a mission day (used by the fatigue early warning).
function rtLatest(crew, day) { const h = rtHistory(crew).filter(r => Math.abs(r.day - day) <= 1); return h.length ? h[h.length - 1] : null; }

const rt = { crew: null, day: 0, times: [], fs: 0, end: 0, shownAt: 0, timer: null, tick: null, state: "idle" };
function rtDialog() {
  let d = document.getElementById("dlg-rt");
  if (!d) { d = document.createElement("dialog"); d.id = "dlg-rt"; d.setAttribute("aria-labelledby", "rt-title"); document.body.appendChild(d); d.addEventListener("close", rtStop); }
  return d;
}
function openReaction(crew, day) {
  Object.assign(rt, { crew, day });
  const d = rtDialog(), base = rtBaseline(crew), n = rtHistory(crew).length;
  d.innerHTML = `<h3 id="rt-title" style="font-size:24px">Reaction-time check</h3>
    <p style="margin:6px 0">60 seconds. A dot will appear at random moments. Tap the box (or press Space) as fast as you can when it does. Don't tap early.</p>
    <p class="note" style="margin:0 0 12px">Why: tiredness from short sleep slows reactions before you feel it. ${n >= 3 ? `Compared with your own normal (${Math.round(base.ms)} ms, from ${n} earlier checks).` : `After 3 checks this compares with your own normal. Until then it uses a typical rested value (${REF_MS} ms).`} Short demo version of the PVT fatigue test, not a validated measurement.</p>
    <div class="row" style="display:flex;gap:8px;justify-content:flex-end"><button class="btn" type="button" id="rt-cancel">Cancel</button><button class="btn primary" type="button" id="rt-go">Start</button></div>`;
  d.querySelector("#rt-cancel").onclick = () => d.close();
  d.querySelector("#rt-go").onclick = rtStart;
  d.showModal();
}
function rtStart() {
  const d = rtDialog();
  Object.assign(rt, { times: [], fs: 0, end: performance.now() + RT_SECONDS * 1000, state: "wait" });
  d.innerHTML = `<div class="rt-head"><span class="note" id="rt-left">${RT_SECONDS} s left</span><span class="note" id="rt-n">0 taps</span></div>
    <button type="button" class="rt-pad" id="rt-pad" aria-label="Tap when the dot appears"><span class="rt-dot" id="rt-dot"></span><span class="rt-ms num" id="rt-ms">Wait for the dot</span></button>
    <div class="row" style="display:flex;justify-content:flex-end;margin-top:10px"><button class="btn" type="button" id="rt-stop">Stop</button></div>`;
  d.querySelector("#rt-pad").onpointerdown = ev => { ev.preventDefault(); rtTap(); };
  d.querySelector("#rt-stop").onclick = () => d.close();
  d.onkeydown = ev => { if (ev.code === "Space") { ev.preventDefault(); rtTap(); } };
  rt.tick = setInterval(() => { const left = Math.max(0, Math.ceil((rt.end - performance.now()) / 1000)); const el = document.getElementById("rt-left"); if (el) el.textContent = `${left} s left`; if (left <= 0 && rt.state !== "idle") { if (rt.state === "go") rt.times.push(performance.now() - rt.shownAt); rtFinish(); } }, 250);
  rtArm();
}
function rtArm() {
  clearTimeout(rt.timer);
  const wait = 2000 + Math.random() * 4000;
  if (performance.now() + wait > rt.end) { rt.timer = setTimeout(rtFinish, Math.max(0, rt.end - performance.now())); return; }
  rt.state = "wait";
  rt.timer = setTimeout(() => { rt.state = "go"; rt.shownAt = performance.now(); const dot = document.getElementById("rt-dot"); if (dot) dot.classList.add("on"); const ms = document.getElementById("rt-ms"); if (ms) ms.textContent = "Tap!"; }, wait);
}
function rtTap() {
  const ms = document.getElementById("rt-ms"), dot = document.getElementById("rt-dot");
  if (rt.state === "go") {
    const t = performance.now() - rt.shownAt; rt.times.push(t);
    if (dot) dot.classList.remove("on"); if (ms) ms.textContent = `${Math.round(t)} ms`;
    const n = document.getElementById("rt-n"); if (n) n.textContent = `${rt.times.length} tap${rt.times.length === 1 ? "" : "s"}`;
    rtArm();
  } else if (rt.state === "wait") { rt.fs++; if (ms) ms.textContent = "Too early: wait for the dot"; rtArm(); }
}
function rtStop() { clearTimeout(rt.timer); clearInterval(rt.tick); rt.state = "idle"; }
function rtFinish() {
  rtStop();
  const d = rtDialog();
  if (rt.times.length < 5) {
    d.innerHTML = `<h3 id="rt-title">Not enough taps</h3><p>We need at least 5 reactions to give a result. Try again when you have a quiet minute.</p><div class="row" style="display:flex;justify-content:flex-end"><button class="btn" type="button" id="rt-close">Close</button></div>`;
    d.querySelector("#rt-close").onclick = () => d.close(); return;
  }
  const res = { t: Date.now(), day: rt.day, median: Math.round(median(rt.times)), lapses: rt.times.filter(t => t >= LAPSE_MS).length, falseStarts: rt.fs, n: rt.times.length };
  const base = rtBaseline(rt.crew); res.tier = rtTier(res, base); res.baseline = Math.round(base.ms);
  rtSave(rt.crew, res);
  const diff = Math.round((res.median / base.ms - 1) * 100);
  const msg = { green: "Your reactions are normal for you.", amber: "Slower than your normal. Possible fatigue.", red: "Much slower than your normal. Likely fatigue." }[res.tier];
  const act = { green: "No action needed.", amber: "Check last night's sleep. Ask a crewmate to double-check safety-critical steps today.", red: "Avoid safety-critical tasks (EVA, robotics, piloting) until you have rested, and tell the crew medical officer." }[res.tier];
  d.innerHTML = `<h3 id="rt-title" style="font-size:24px">Reaction-time result</h3>
    <div class="fb tier-${res.tier}" style="margin:8px 0"><strong>${msg}</strong><div>${esc(act)}</div></div>
    <div class="rt-stats"><div><span class="big num">${res.median}</span><small> ms median</small></div><div><span class="big num">${res.lapses}</span><small> lapses (≥ 500 ms)</small></div><div><span class="big num">${res.falseStarts}</span><small> too early</small></div></div>
    <p class="note">${base.own ? "Your normal" : "Typical rested value"}: ${res.baseline} ms (${diff >= 0 ? "+" : ""}${diff}%). ${res.n} reactions. Saved on this device and added to your health story.</p>
    <div class="row" style="display:flex;justify-content:flex-end"><button class="btn primary" type="button" id="rt-close">Done</button></div>`;
  d.querySelector("#rt-close").onclick = () => { d.close(); if (window.renderAstro) renderAstro(); if (window.render) render(); };
}

// Shared with other modules (see README: "How modules share code").
Object.assign(window, { RT_KEY, rtHistory, rtBaseline, rtLatest, openReaction });
