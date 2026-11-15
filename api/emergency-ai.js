// Vercel serverless function: the Emergency helper's link to Gemini.
// The API key lives only here (GEMINI_API_KEY in Vercel's environment settings), never in the browser bundle.
//   GET  /api/emergency-ai  -> { ok: true } when a key is configured (the app uses this to decide whether to show the helper)
//   POST /api/emergency-ai  -> { messages: [{ role: "user" | "assistant", content }] }, streams back plain text

const MODEL = process.env.GEMINI_MODEL || "gemini-3.8-flash";
const MODELS = [MODEL, ...(process.env.GEMINI_FALLBACK_MODELS || "").split(",").map(s => s.trim()).filter(Boolean)].filter((m, i, a) => a.indexOf(m) === i);
const MAX_MESSAGES = 30, MAX_CHARS = 8000, MAX_TOTAL = 24000;
const RATE = { windowMs: 60_000, max: 12 };   // per visitor IP, per server instance (best effort)

// Fixed rules sent with every request, so the endpoint stays an emergency helper even if someone calls it directly.
const RULES = `You are the emergency helper inside an astronaut health app (a hackathon prototype, not a medical device).
A crewmate is helping a sick or injured astronaut. Use the astronaut's data and symptoms to work out the most likely cause,
and tell the helper what to do in plain, calm words. Say "likely" or "possible", never certain: you are a guide, not a doctor.
First aid and positioning steps are fine. For any medicine say "per the onboard medical checklist, with the medical officer"; never give a drug with a dose.
If chest pain, trouble breathing, confusion, fainting or heavy bleeding comes up, the first step is to get the crew medical officer now.
Only help with the health situation described; politely decline anything unrelated.`;
const MODES = {
  assess: { system: RULES + "\nReply with the JSON object the user asks for and nothing else, on one line (no indentation), each item one short sentence.", config: { responseMimeType: "application/json", maxOutputTokens: 4096, temperature: 0.2 } },
  chat: { system: RULES + "\nFor follow-up questions reply in 1 to 3 short sentences, one instruction or question at a time.", config: { maxOutputTokens: 1024, temperature: 0.3 } },
};

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
  const allowed = (process.env.ALLOWED_ORIGINS || "").split(",").map(s => s.trim()).filter(Boolean);
  try { return new URL(origin).host === new URL(req.url).host || allowed.includes(origin); } catch { return false; }
}

const json = (status, body) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json", "cache-control": "no-store" } });

export function GET() {
  return json(200, { ok: Boolean(process.env.GEMINI_API_KEY), model: MODEL });
}

export async function POST(req) {
  const key = process.env.GEMINI_API_KEY;
  if (!key) return json(503, { error: "not_configured" });
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

  // Try the main model, then each GEMINI_FALLBACK_MODELS entry, when a model is missing, overloaded or rate-limited.
  const body = JSON.stringify({
    systemInstruction: { parts: [{ text: M.system }] },
    contents: messages.map(m => ({ role: m.role === "assistant" ? "model" : "user", parts: [{ text: m.content }] })),
    generationConfig: M.config,
  });
  let upstream = null, used = MODEL, lastStatus = 0;
  for (const model of MODELS) {
    upstream = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:streamGenerateContent?alt=sse`, {
      method: "POST", headers: { "content-type": "application/json", "x-goog-api-key": key }, body,
    }).catch(() => null);
    used = model; lastStatus = upstream ? upstream.status : 0;
    if (upstream && upstream.ok && upstream.body) break;
    if (upstream && ![404, 429, 500, 503].includes(upstream.status)) break;   // e.g. a bad key (400/403): another model won't help
    upstream = null;
  }
  if (!upstream || !upstream.ok || !upstream.body) {
    const status = lastStatus === 429 ? 429 : 502;
    return json(status, { error: status === 429 ? "rate_limited" : "upstream_error", upstream_status: lastStatus || undefined });
  }

  // Turn Gemini's server-sent events into a plain text stream of the reply.
  const enc = new TextEncoder(), dec = new TextDecoder();
  const stream = new ReadableStream({
    async start(controller) {
      const reader = upstream.body.getReader(); let buf = "";
      try {
        for (;;) {
          const { done, value } = await reader.read(); if (done) break;
          buf += dec.decode(value, { stream: true });
          let i;
          while ((i = buf.indexOf("\n")) >= 0) {
            const line = buf.slice(0, i).trim(); buf = buf.slice(i + 1);
            if (!line.startsWith("data:")) continue;
            try {
              const parts = JSON.parse(line.slice(5)).candidates?.[0]?.content?.parts || [];
              const text = parts.map(p => p.text || "").join("");
              if (text) controller.enqueue(enc.encode(text));
            } catch { /* ignore partial or non-JSON lines */ }
          }
        }
      } finally { controller.close(); }
    },
  });
  return new Response(stream, { headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "no-store", "x-model": used } });
}
