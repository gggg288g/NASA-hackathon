// Optional AI talk-through and read-aloud. Only active where window.claude is available.
// ---- AI layer (Claude via the page's sample capability; absent = rules only) ----
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
(async () => { try { if (window.claude) { [AI.sample, AI.tts, AI.dict] = await Promise.all(["sample", "tts", "dictation"].map(n => claude.use(n).catch(() => null)));
  if (!AI.tts) AI.tts = deviceTTS();
  if (AI.tts) AI.tts.onState(({ state }) => setSpeaking(state === "speaking")); } } catch { } })();
function aiContext() {
  const c = em.crew, d = em.day, rows = ROWS[c].filter(r => r.day <= d && r.day > d - 7);
  const recent = rows.map(r => `D${r.day}: BP ${fmt(r.bp_systolic)}/${fmt(r.bp_diastolic)}, HR ${fmt(r.resting_hr)}, temp ${fmt(r.core_temp, "core_temp")}C, glucose ${fmt(r.glucose)}, SpO2 ${fmt(r.spo2)}, sleep ${fmt(r.sleep_hours)}h, exercise ${fmt(r.exercise_min)}min${r.symptoms ? ", symptoms " + r.symptoms : ""}`).join("\n");
  const causes = em.causes.slice(0, 3).map(x => `- ${x.title} (${likely(x.score)[1]}): ${x.evid.join("; ")}${x.proto ? "\n  Steps: " + PROTOCOLS[x.proto].steps.map((s, i) => `${i + 1}. ${s.t}`).join(" ") : x.actions ? "\n  Steps: " + x.actions.join("; ") : ""}`).join("\n");
  return `You are the calm emergency helper inside an astronaut health app. Someone may be scared. Rules:
- Reply in 1 to 3 short, calm sentences. Plain words. One question or one instruction at a time.
- Only use the data and steps below. Never invent a diagnosis, a drug, or a dose. For medication say "per the onboard medical checklist, with the medical officer".
- If chest pain, trouble breathing, confusion, fainting or heavy bleeding comes up, tell them to get the crew medical officer now.
- Say "possible", never "you have". You are a guide, not a doctor.
- Environment: ${ENV[st.env].name}, ${fmtDelay(ENV[st.env])}. ${ENV[st.env].escalation_policy === "autonomous_first" ? "Ground cannot answer in time, so guide them through the on-board steps." : "They can reach the flight surgeon in near real time; encourage that in parallel."}
Person: ${CREW_NAME[c]}. Symptoms now: ${em.sym.join(", ")}.
Last 7 days of their data:
${recent}
Rule-based possible causes (already shown to them):
${causes || "none matched"}`;
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
    const r = await AI.sample(msgs, { model: "claude-sonnet-5-5", modelTier: "default", cache: false, onText: ({ text }) => { reply.content = text; renderChat(); } });
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
function startAI() { if (AI.sample) ask(aiContext() + "\n\nStart: in 2 sentences, tell them calmly what to do first, then ask one question that would help most.", ""); }
function stopVoice() { try { AI.tts && AI.tts.stop(); } catch { } try { AI.dict && AI.dict.stop(); } catch { } }
function wireAI() {
  const box = $("#emg-ai"); if (!box) return;
  if (!AI.sample) { $("#askbar").hidden = true; $("#chat").innerHTML = ""; setStatus("The helper works inside the crew's Claude app. The steps above always work."); return; }
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
Object.assign(window, { AI, deviceTTS, unlockDeviceVoice, isTouch, aiContext, svgI, ICON, chatHTML, renderChat, plain, DEFAULT_FOOT, setStatus, setSpeaking, say, ask, startAI, stopVoice, wireAI });
