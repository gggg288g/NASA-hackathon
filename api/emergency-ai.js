// Vercel serverless function: the Emergency helper's link to an AI model.
// Order: Claude first (if ANTHROPIC_API_KEY is set), then Gemini (if GEMINI_API_KEY is set) when Claude fails or is slow.
// Keys live only here (Vercel environment settings, or .env for `npm run dev`), never in the browser bundle.
//   GET  /api/emergency-ai  -> { ok: true, providers: [...] } when at least one key is configured
//   POST /api/emergency-ai  -> { messages: [{ role: "user" | "assistant", content }], mode: "assess" | "chat" }, streams back plain text

import Anthropic from "@anthropic-ai/sdk";

const env = k => process.env[k] || "";
const CLAUDE_MODEL = () => env("ANTHROPIC_MODEL") || "claude-opus-5-5";
const GEMINI_MODELS = () => [env("GEMINI_MODEL") || "gemini-3.8-flash", ...env("GEMINI_FALLBACK_MODELS").split(",").map(s => s.trim()).filter(Boolean)].filter((m, i, a) => a.indexOf(m) === i);
const CLAUDE_FIRST_TEXT_MS = 20_000;   // give up on Claude (and try Gemini) if no answer has started by then
const GEMINI_FIRST_TEXT_MS = 12_000;  // per Gemini model: skip to the next one if no text has come by then (normal: 2-9 s)
const GEMINI_TIMEOUT_MS = 25_000;  // per Gemini model: cap for the whole answer
const MAX_MESSAGES = 30, MAX_CHARS = 8000, MAX_TOTAL = 24000;
const RATE = { windowMs: 60_000, max: 12 };   // per visitor IP, per server instance (best effort)
// models that accept server-side refusal fallbacks (fallbacks: "default")
const FALLBACK_OK = new Set(["claude-opus-5-5", "claude-opus-5", "claude-fable-5-2", "claude-fable-5-1", "claude-sonnet-5-5"]);

// Fixed rules sent with every request, so the endpoint stays an emergency helper even if someone calls it directly.
const RULES = `You are the emergency helper inside an astronaut health app (a hackathon prototype, not a medical device).
A crewmate is helping a sick or injured astronaut. Use the astronaut's data and symptoms to work out the most likely cause,
and tell the helper what to do in plain, calm words. Say "likely" or "possible", never certain: you are a guide, not a doctor.
First aid and positioning steps are fine. For any medicine say "per the onboard medical checklist, with the medical officer"; never give a drug with a dose.
If chest pain, trouble breathing, confusion, fainting or heavy bleeding comes up, the first step is to get the crew medical officer now.
Only help with the health situation described; politely decline anything unrelated.`;

// The assessment's shape. Claude is held to it with structured outputs; Gemini is asked for it and the app validates it.
const strs = { type: "array", items: { type: "string" } };
const ASSESS_SCHEMA = {
  type: "object", additionalProperties: false,
  required: ["likely_cause", "urgency", "confidence", "why", "steps", "watch_for", "escalate", "other_possibilities", "protocol"],
  properties: {
    likely_cause: { type: "string" },
    urgency: { type: "string", enum: ["act_now", "urgent", "monitor"] },
    confidence: { type: "string", enum: ["high", "medium", "low"] },
    why: strs, steps: strs, watch_for: strs,
    escalate: { type: "string" },
    other_possibilities: { type: "array", items: { type: "object", additionalProperties: false, required: ["cause", "why"], properties: { cause: { type: "string" }, why: { type: "string" } } } },
    protocol: { type: "string", enum: ["bp", "fever", "hypo", "none"] },
  },
};
const MODES = {
  assess: {
    system: RULES + "\nReply with the JSON object the user asks for and nothing else, on one line (no indentation), each item one short sentence.",
    claude: { effort: "medium", schema: ASSESS_SCHEMA },
    gemini: { responseMimeType: "application/json", maxOutputTokens: 4096, temperature: 0.2 },
  },
  chat: {
    system: RULES + "\nFor follow-up questions reply in 1 to 3 short sentences, one instruction or question at a time.",
    claude: { effort: "low" },
    gemini: { maxOutputTokens: 1024, temperature: 0.3 },
  },
};

// ---- providers: each is an async generator of text chunks. It must throw BEFORE its first chunk if it can't answer,
//      so the next provider can take over without the user seeing a half answer. ----
async function* claude(messages, M) {
  const client = new Anthropic({ apiKey: env("ANTHROPIC_API_KEY"), maxRetries: 1, timeout: 60_000 });
  const model = CLAUDE_MODEL();
  const stream = client.beta.messages.stream({
    model, max_tokens: 16000, system: M.system,
    messages: messages.map(m => ({ role: m.role, content: m.content })),
    output_config: { effort: M.claude.effort, ...(M.claude.schema ? { format: { type: "json_schema", schema: M.claude.schema } } : {}) },
    // if a safety classifier declines, the API re-runs the request on a fallback Claude model inside the same call
    ...(FALLBACK_OK.has(model) ? { betas: ["server-side-fallback-2026-07-01"], fallbacks: "default" } : {}),
  });
  const timer = setTimeout(() => stream.abort(), CLAUDE_FIRST_TEXT_MS);
  let any = false;
  try {
    for await (const ev of stream) {
      if (ev.type === "content_block_delta" && ev.delta.type === "text_delta" && ev.delta.text) {
        if (!any) { any = true; clearTimeout(timer); }
        yield ev.delta.text;
      }
    }
    const final = await stream.finalMessage();
    if (!any) throw new Error(`claude: no text (stop_reason ${final.stop_reason})`);
  } finally { clearTimeout(timer); }
}

async function* gemini(messages, M) {
  const body = JSON.stringify({
    systemInstruction: { parts: [{ text: M.system }] },
    contents: messages.map(m => ({ role: m.role === "assistant" ? "model" : "user", parts: [{ text: m.content }] })),
    generationConfig: M.gemini,
  });
  let lastStatus = 0, sawRateLimit = false;
  // Main model, then each GEMINI_FALLBACK_MODELS entry. A model is skipped when it errors (missing, busy, rate-limited)
  // or when it hasn't produced any text within GEMINI_FIRST_TEXT_MS (some models open the connection, then sit silent).
  for (const model of GEMINI_MODELS()) {
    const t0 = Date.now(), ctl = new AbortController();
    const firstTimer = setTimeout(() => ctl.abort(), GEMINI_FIRST_TEXT_MS);
    const capTimer = setTimeout(() => ctl.abort(), GEMINI_TIMEOUT_MS);   // cap for the whole answer
    const skip = why => { clearTimeout(firstTimer); clearTimeout(capTimer); ctl.abort(); console.warn(`[emergency-ai] gemini ${model}: ${why} after ${((Date.now() - t0) / 1000).toFixed(1)}s, trying next`); };
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:streamGenerateContent?alt=sse`, {
      method: "POST", headers: { "content-type": "application/json", "x-goog-api-key": env("GEMINI_API_KEY") }, body, signal: ctl.signal,
    }).catch(() => null);
    lastStatus = res ? res.status : 0;
    if (lastStatus === 429) sawRateLimit = true;
    if (!res || !res.ok || !res.body) {
      skip(res ? `HTTP ${res.status}` : "no response");
      if (res && ![404, 429, 500, 503].includes(res.status)) break;   // e.g. a bad key: another model won't help
      continue;
    }
    const chunks = sseText(res.body);
    let first;
    try { const r = await chunks.next(); if (r.done) throw new Error("empty"); first = r.value; }
    catch { skip("no text"); continue; }
    clearTimeout(firstTimer);
    gemini.used = model;
    try { yield first; yield* chunks; } finally { clearTimeout(capTimer); }
    return;
  }
  throw Object.assign(new Error(`gemini: no model answered (last HTTP ${lastStatus || "none"})`), { status: sawRateLimit ? 429 : lastStatus });
}

// Turn Gemini's server-sent events into plain text chunks.
async function* sseText(stream) {
  const reader = stream.getReader(), dec = new TextDecoder(); let buf = "";
  for (;;) {
    const { done, value } = await reader.read(); if (done) return;
    buf += dec.decode(value, { stream: true });
    let i;
    while ((i = buf.indexOf("\n")) >= 0) {
      const line = buf.slice(0, i).trim(); buf = buf.slice(i + 1);
      if (!line.startsWith("data:")) continue;
      let parts = [];
      try { parts = JSON.parse(line.slice(5)).candidates?.[0]?.content?.parts || []; } catch { /* partial line */ }
      const text = parts.map(p => p.text || "").join("");
      if (text) yield text;
    }
  }
}

function providers() {
  const list = [];
  if (env("ANTHROPIC_API_KEY")) list.push({ name: "claude", run: claude, label: () => CLAUDE_MODEL() });
  if (env("GEMINI_API_KEY")) list.push({ name: "gemini", run: gemini, label: () => gemini.used || GEMINI_MODELS()[0] });
  return list;
}

const hits = new Map();
function limited(ip) {
  const now = Date.now(), h = (hits.get(ip) || []).filter(t => now - t < RATE.windowMs);
  h.push(now); hits.set(ip, h);
  if (hits.size > 5000) hits.clear();
  return h.length > RATE.max;
}

// Only answer pages served from this site (or origins listed in ALLOWED_ORIGINS, comma separated).
// Browsers always send Origin on these requests; non-browser callers can fake it, so the rate limit is the real backstop.
function originOk(req) {
  const origin = req.headers.get("origin");
  if (!origin) return false;
  const allowed = env("ALLOWED_ORIGINS").split(",").map(s => s.trim()).filter(Boolean);
  try { return new URL(origin).host === new URL(req.url).host || allowed.includes(origin); } catch { return false; }
}

const json = (status, body) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json", "cache-control": "no-store" } });

export function GET() {
  const p = providers();
  return json(200, { ok: p.length > 0, providers: p.map(x => x.name) });
}

export async function POST(req) {
  const list = providers();
  if (!list.length) return json(503, { error: "not_configured" });
  if (!originOk(req)) return json(403, { error: "forbidden" });
  const ip = (req.headers.get("x-forwarded-for") || "").split(",")[0].trim() || "unknown";
  if (limited(ip)) return json(429, { error: "rate_limited" });

  let messages, mode;
  try { ({ messages, mode } = await req.json()); } catch { return json(400, { error: "bad_json" }); }
  const M = MODES[mode] || MODES.chat;
  if (!Array.isArray(messages) || !messages.length || messages.length > MAX_MESSAGES) return json(400, { error: "bad_messages" });
  let total = 0;
  for (const m of messages) {
    if (!m || (m.role !== "user" && m.role !== "assistant") || typeof m.content !== "string" || m.content.length > MAX_CHARS) return json(400, { error: "bad_messages" });
    total += m.content.length;
  }
  if (total > MAX_TOTAL || messages[0].role !== "user") return json(400, { error: "bad_messages" });

  // Try each provider until one starts answering; only then start streaming to the browser.
  let gen = null, first = "", used = null, rateLimited = false;
  for (const p of list) {
    const g = p.run(messages, M);
    try {
      const r = await g.next();
      if (r.done) throw new Error(`${p.name}: empty reply`);
      gen = g; first = r.value; used = p; break;
    } catch (e) {
      if (e && (e.status === 429 || e instanceof Anthropic.RateLimitError)) rateLimited = true;
      console.warn(`[emergency-ai] ${p.name} failed, trying next: ${e && e.message}`);
    }
  }
  if (!gen) return json(rateLimited ? 429 : 502, { error: rateLimited ? "rate_limited" : "upstream_error" });

  const enc = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      controller.enqueue(enc.encode(first));
      try { for await (const t of gen) controller.enqueue(enc.encode(t)); }
      catch (e) { console.warn(`[emergency-ai] ${used.name} stream ended early: ${e && e.message}`); }
      finally { controller.close(); }
    },
  });
  return new Response(stream, { headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "no-store", "x-model": used.label(), "x-provider": used.name } });
}
