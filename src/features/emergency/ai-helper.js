// Optional AI talk-through and read-aloud.
// ---- AI layer: Claude inside the Claude app; otherwise Gemini through our own server function (api/emergency-ai.js);
//      neither available = rules only. The Gemini key stays on the server, never in this bundle. ----
const AI = { sample: undefined, tts: undefined, dict: undefined };
// Fallback read-aloud with the device's own voice (e.g. iPhone), when Claude's voice isn't offered here
function deviceTTS() {
  const ss = window.speechSynthesis; if (!ss || !window.SpeechSynthesisUtterance) return null;
  let cb = () => { }, cur = null, voice = null;
  const pick = () => { const v = ss.getVoices(); voice = v.find(x => /^en(-|_)US/i.test(x.lang) && x.localService) || v.find(x => /^en/i.test(x.lang)) || null; };
  pick(); try { ss.addEventListener("voiceschanged", pick); } catch { }
  return { device: true,
    // iOS quirks handled: keep a reference to the utterance (else it can be dropped mid-way),
    // don't cancel() right before speak() unless something is playing, set a real voice,
    // and report "no_audio" if speech never starts (e.g. blocked inside an in-app web view).
    speak(text) { return new Promise((res, rej) => { try {
      if (ss.speaking || ss.pending) ss.cancel();
      if (ss.paused) ss.resume();
      const u = new SpeechSynthesisUtterance(text); cur = u;
      if (!voice) pick(); if (voice) { u.voice = voice; u.lang = voice.lang; } else u.lang = "en-US";
      let started = false;
      const t = setTimeout(() => { if (!started) { try { ss.cancel(); } catch { } cb({ state: "idle", reason: "no_audio" }); rej({ code: "no_audio" }); } }, 2500);
      u.onstart = () => { started = true; cb({ state: "speaking" }); };
      u.onend = () => { clearTimeout(t); cb({ state: "idle", reason: "completed" }); cur = null; res(); };
      u.onerror = e => { clearTimeout(t); cb({ state: "idle", reason: e.error }); cur = null; (e.error === "interrupted" || e.error === "canceled") ? res() : rej({ code: e.error || "error" }); };
      ss.speak(u);
    } catch (e) { rej({ code: "unavailable" }); } }); },
    stop() { try { ss.cancel(); } catch { } }, onState(f) { cb = f; } };
}
// iOS only allows speech that starts from a tap: prime it on the Assess tap
const unlockDeviceVoice = () => { try { if (AI.tts && AI.tts.device && !speechSynthesis.speaking) { const u = new SpeechSynthesisUtterance("."); u.volume = 0.01; u.rate = 2; speechSynthesis.speak(u); } } catch { } };
const isTouch = matchMedia("(pointer: coarse)").matches;
// Gemini via /api/emergency-ai: same shape as the Claude sampler (streams text through onText, resolves with { text, model })
const GEMINI_URL = "/api/emergency-ai";
async function geminiAvailable() {
  try { const r = await fetch(GEMINI_URL, { cache: "no-store" }); if (!r.ok) return null; const j = await r.json(); return j && j.ok ? j : null; }
  catch { return null; }   // e.g. plain `npm run dev`: no server function, so the helper stays hidden
}
async function geminiSample(msgs, { onText, mode = "chat" } = {}) {
  const r = await fetch(GEMINI_URL, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ messages: msgs, mode }) });
  if (!r.ok || !r.body) throw { code: r.status === 429 ? "rate_limited" : r.status === 503 ? "not_granted" : "error" };
  const reader = r.body.getReader(), dec = new TextDecoder(); let text = "";
  for (;;) { const { done, value } = await reader.read(); if (done) break; text += dec.decode(value, { stream: true }); if (onText) onText({ text }); }
  if (!text.trim()) throw { code: "error" };
  return { text, model: r.headers.get("x-model") || "Gemini" };
}
(async () => { try {
  if (window.claude) [AI.sample, AI.tts, AI.dict] = await Promise.all(["sample", "tts", "dictation"].map(n => claude.use(n).catch(() => null)));
  else if (await geminiAvailable()) AI.sample = geminiSample;
  if ((window.claude || AI.sample) && !AI.tts) AI.tts = deviceTTS();
  if (AI.tts) AI.tts.onState(({ state }) => setSpeaking(state === "speaking"));
} catch { } })();
// Everything the AI knows about this case: the person's readings vs THEIR baseline, last 7 days, symptoms, description.
const CASE_IDS = ["bp_systolic", "bp_diastolic", "resting_hr", "core_temp", "glucose", "spo2", "sleep_hours", "stress", "exercise_min", "fluid_intake_ml", "vision_check"];
function aiContext() {
  const c = em.crew, d = em.day, env = ENV[st.env], rows = ROWS[c].filter(r => r.day <= d && r.day > d - 7);
  const now = CASE_IDS.map(id => { const e = ev(c, d, id); return e ? `- ${line(e, id)} [status ${TIER_LABEL[e.tier || "none"]}]` : null; }).filter(Boolean).join("\n");
  const recent = rows.map(r => `D${r.day}: BP ${fmt(r.bp_systolic)}/${fmt(r.bp_diastolic)}, HR ${fmt(r.resting_hr)}, temp ${fmt(r.core_temp, "core_temp")}C, glucose ${fmt(r.glucose)}, SpO2 ${fmt(r.spo2)}, sleep ${fmt(r.sleep_hours)}h, exercise ${fmt(r.exercise_min)}min${r.symptoms ? ", symptoms " + r.symptoms : ""}`).join("\n");
  const rules = em.causes.slice(0, 4).map(x => `- ${x.title} (${likely(x.score)[1]}): ${x.evid.join("; ")}`).join("\n");
  const label = k => (SYMPTOMS.find(s => s[0] === k) || [k, k])[1];
  return `CASE
Patient: ${CREW_NAME[c]}, mission day ${d}.
Environment: ${env.name}, ${env.gravity_g ? env.gravity_g + " g" : "microgravity"}, ${fmtDelay(env)}. ${env.escalation_policy === "autonomous_first" ? "Ground cannot answer in time: the crew must act on board first." : "The flight surgeon can be reached in near real time: call them in parallel."}
Symptoms tapped: ${em.sym.map(label).join(", ") || "none"}
Described by the crew: ${em.desc.trim() || "(nothing typed)"}
Latest readings vs this person's own baseline (status uses their baseline, not just Earth ranges):
${now || "- no recent readings"}
Last 7 days:
${recent || "no rows"}
Simple rule-based check (may be incomplete):
${rules || "- nothing matched"}
On-board step-by-step checklists: ${Object.entries(PROTOCOLS).map(([k, p]) => `${k} = ${p.title}`).join("; ")}

RULES
- You are helping the crewmate who is treating ${CREW_NAME[c]}. Write the steps for that helper, in plain words.
- Base the cause on the data and symptoms above. Say "likely" or "possible", never certain. You are a guide, not a doctor.
- First aid and positioning steps are fine. For any medicine, say "per the onboard medical checklist, with the medical officer": never give a drug name with a dose.
- If there is chest pain, trouble breathing, confusion, fainting or heavy bleeding, step 1 is "Get the crew medical officer now".`;
}
const ASSESS_ASK = `Work out the most likely cause and tell the helper exactly what to do. Reply with JSON only (no markdown) in this shape:
{"likely_cause": "short name", "urgency": "act_now" | "urgent" | "monitor", "confidence": "high" | "medium" | "low",
 "why": ["up to 3 short reasons, citing their numbers vs baseline or the symptoms"],
 "steps": ["4 to 7 short instructions for the helper, in order, most important first"],
 "watch_for": ["up to 3 signs it is getting worse"],
 "escalate": "one sentence on contacting the flight surgeon given the comms delay",
 "other_possibilities": [{"cause": "short name", "why": "short reason"}],
 "protocol": "${Object.keys(PROTOCOLS).join('" | "')}" | "none"}`;
// Check the AI's answer has the right shape before showing any of it (strings only, length-capped).
function parseAssessment(t) {
  const a = String(t || ""), i = a.indexOf("{"), k = a.lastIndexOf("}"); if (i < 0 || k <= i) return null;
  let j; try { j = JSON.parse(a.slice(i, k + 1)); } catch { return null; }
  const str = (v, n = 220) => typeof v === "string" ? v.trim().slice(0, n) : "";
  const list = (v, max) => (Array.isArray(v) ? v : []).map(x => str(x)).filter(Boolean).slice(0, max);
  const out = {
    likely_cause: str(j.likely_cause, 80), why: list(j.why, 3), steps: list(j.steps, 8), watch_for: list(j.watch_for, 3), escalate: str(j.escalate, 240),
    urgency: ["act_now", "urgent", "monitor"].includes(j.urgency) ? j.urgency : "urgent",
    confidence: ["high", "medium", "low"].includes(j.confidence) ? j.confidence : "low",
    other_possibilities: (Array.isArray(j.other_possibilities) ? j.other_possibilities : []).map(o => ({ cause: str(o && o.cause, 80), why: str(o && o.why, 160) })).filter(o => o.cause).slice(0, 2),
    protocol: PROTOCOLS[j.protocol] ? j.protocol : null,
  };
  return out.likely_cause && out.steps.length ? out : null;
}
async function assessAI() {
  if (!AI.sample || em.busy) return;
  em.busy = true; em.ai = { status: "loading" }; renderAssess();
  const prompt = aiContext() + "\n\n" + ASSESS_ASK, crew = em.crew;
  try {
    // one quiet retry if the answer comes back cut off or malformed
    let r, data = null;
    for (let tries = 0; tries < 2 && !data; tries++) {
      r = await AI.sample([{ role: "user", content: prompt }], { model: "claude-sonnet-5-5", modelTier: "default", cache: false, mode: "assess" });
      if (em.crew !== crew || em.stage !== "res") return;   // the user moved on
      data = parseAssessment(r.text);
    }
    if (!data) throw { code: "bad_output" };
    em.ai = { status: "done", data };
    em.model = r.modelApplied || r.model || "AI";
    // keep the case and the answer (hidden) so follow-up questions have the full context
    em.chat = [{ role: "user", content: prompt, shown: "" }, { role: "assistant", content: r.text, shown: "" }];
    renderAssess();
    const mEl = $("#ai-model"); if (mEl) mEl.textContent = em.model;
    if (em.voice && AI.tts) AI.tts.speak(plain(`Most likely: ${data.likely_cause}. First: ${data.steps[0]}`)).catch(() => { });
  } catch (e) {
    em.ai = { status: "error" }; renderEmg();
    if (e && e.code === "rate_limited") setStatus("AI busy. Try again in a moment.", true);
  } finally { em.busy = false; }
}
const svgI = d => `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
const ICON = {
  mic: svgI('<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/>'),
  spk: svgI('<path d="M4 9h3l5-4v14l-5-4H4z"/><path d="M16 9.5a3.5 3.5 0 0 1 0 5M18.5 7a7 7 0 0 1 0 10"/>'),
  mute: svgI('<path d="M4 9h3l5-4v14l-5-4H4z"/><path d="M17 10l4 4M21 10l-4 4"/>'),
  up: svgI('<path d="M12 19V5M6 11l6-6 6 6"/>'),
};
function chatHTML() {
  return em.chat.map((m, i) => ({ m, i })).filter(({ m }) => m.shown !== "").map(({ m, i }) => m.role === "user"
    ? `<div class="msg me">${esc(m.shown || m.content)}</div>`
    : m.content ? `<div class="msg ai" data-play="${i}" title="Tap to hear again">${esc(m.content)}</div>` : `<div class="msg ai typing">…</div>`).join("");
}
function renderChat() { const el = $("#chat"); if (!el) return; el.innerHTML = chatHTML(); el.scrollTop = el.scrollHeight; }
const plain = t => String(t).replace(/[*_#`>]/g, "").replace(/\s+/g, " ").trim().slice(0, 1900);
const DEFAULT_FOOT = "Guide only. Follow the medical officer.";
function setStatus(t, err) { const el = $("#ai-status"); if (!el) return; el.textContent = t || DEFAULT_FOOT; el.className = err ? "err" : ""; }
function setSpeaking(on) { const b = $("#ai-voice"); if (b) b.classList.toggle("speaking", !!on); }
async function say(i) {
  if (!AI.tts) return;
  const m = em.chat[i]; if (!m || !m.content) return;
  if (em.speakingIdx === i) { AI.tts.stop(); return; }
  try { if (AI.dict && AI._listening) await AI.dict.stop().catch(() => { }); } catch { }
  em.speakingIdx = i; setSpeaking(true);
  try { await AI.tts.speak(plain(m.content)); }
  catch (e) {
    const c = e && e.code;
    setStatus(c === "no_audio" ? (isTouch ? "No sound: check the silent switch, then tap the reply. Still silent? This phone view blocks speech." : "No sound from this browser's voice. Try Chrome or the desktop app.") : c === "not_granted" ? "Read-aloud is off for this page." : c === "rate_limited" ? "Read-aloud busy. Try again shortly." : `Couldn't read aloud${c ? " (" + c + ")" : ""}.`, true);
    if (c === "not_granted") { AI.tts = null; em.voice = false; wireAI(); }
  } finally { if (em.speakingIdx === i) { em.speakingIdx = -1; setSpeaking(false); } }
}
document.addEventListener("click", ev => { const b = ev.target.closest("[data-play]"); if (b) say(+b.dataset.play); });
async function ask(userText, shown) {
  if (!AI.sample || em.busy) return;
  em.busy = true;
  em.chat.push({ role: "user", content: userText, shown: shown === undefined ? userText : shown });
  const msgs = em.chat.map(m => ({ role: m.role, content: m.content }));
  const reply = { role: "assistant", content: "" }; em.chat.push(reply);
  renderChat();
  try {
    const r = await AI.sample(msgs, { model: "claude-sonnet-5-5", modelTier: "default", cache: false, mode: "chat", onText: ({ text }) => { reply.content = text; renderChat(); } });
    reply.content = r.text; renderChat();
    em.model = r.modelApplied || r.model || "claude-sonnet-5-5 (requested)";
    const mEl = $("#ai-model"); if (mEl) mEl.textContent = em.model;
    if (em.voice && AI.tts) say(em.chat.indexOf(reply));
  } catch (e) {
    em.chat.pop(); renderChat();
    setStatus(e && e.code === "rate_limited" ? "Helper busy. Try again in a moment." : "Helper unavailable here. Follow the steps above.", true);
    if (e && e.code === "not_granted") { AI.sample = null; wireAI(); }
  } finally { em.busy = false; }
}
function startAI() { if (AI.sample) assessAI(); }
function stopVoice() { try { AI.tts && AI.tts.stop(); } catch { } try { AI.dict && AI.dict.stop(); } catch { } }
function wireAI() {
  const box = $("#emg-ai"); if (!box) return;
  if (!AI.sample) { $("#askbar").hidden = true; $("#chat").innerHTML = ""; setStatus("AI helper isn't set up here. The steps above always work."); return; }
  const inp = $("#ai-in"), sendB = $("#ai-send");
  if (isTouch && !AI.dict) inp.placeholder = "Ask, or use the keyboard mic";
  const sync = () => { sendB.disabled = !inp.value.trim(); };
  const send = () => { const v = inp.value.trim(); if (!v) return; inp.value = ""; sync(); ask(v); };
  sendB.onclick = send; inp.onkeydown = ev => { if (ev.key === "Enter") send(); }; inp.oninput = sync; sync();
  if (AI.tts) { const b = $("#ai-voice"); b.hidden = false;
    b.onclick = () => { em.voice = !em.voice; b.setAttribute("aria-pressed", em.voice); b.innerHTML = em.voice ? ICON.spk : ICON.mute; b.setAttribute("aria-label", em.voice ? "Read replies aloud: on" : "Read replies aloud: off");
      if (!em.voice) AI.tts.stop(); else { const k = em.chat.map(m => m.role).lastIndexOf("assistant"); if (k >= 0) say(k); } }; }
  if (AI.dict) { const b = $("#ai-mic"); b.hidden = false;
    if (!AI._dictWired) { AI._dictWired = true;
      AI.dict.onFinal(({ text }) => { const i = $("#ai-in"); if (i) { i.value = (i.value + " " + text).trim(); i.dispatchEvent(new Event("input")); } });
      AI.dict.onState(({ state }) => { AI._listening = state === "listening"; const m = $("#ai-mic"); if (m) m.classList.toggle("rec", AI._listening); const i = $("#ai-in"); if (i) i.placeholder = AI._listening ? "Listening…" : "Ask what to do"; if (!AI._listening && i && i.value.trim()) $("#ai-send").click(); }); }
    b.onclick = () => { if (AI._listening) { AI.dict.stop().catch(() => { }); return; } if (AI.tts) AI.tts.stop(); AI.dict.start().catch(e => { if (e && e.code === "not_granted") { b.hidden = true; setStatus("Mic is off for this page.", true); } }); }; }
}

// Shared with other modules (see README: "How modules share code").
Object.assign(window, { CASE_IDS, ASSESS_ASK, parseAssessment, assessAI, AI, deviceTTS, geminiAvailable, geminiSample, unlockDeviceVoice, isTouch, aiContext, svgI, ICON, chatHTML, renderChat, plain, DEFAULT_FOOT, setStatus, setSpeaking, say, ask, startAI, stopVoice, wireAI });
