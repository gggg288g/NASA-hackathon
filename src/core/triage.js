// Triage engine: absolute tiers + personal-baseline tiers (port of scripts/triage_reference.py).
// ---------- triage engine (port of triage_reference.py) ----------
const worst = (...ts) => { const v = ts.filter(Boolean); return v.length ? v.reduce((a, b) => RANK[b] > RANK[a] ? b : a) : null; };
const isNum = v => v !== null && v !== undefined && v !== "" && !Number.isNaN(v);
function absTier(ind, v) {
  const t = ind.absolute_tiers; if (!t || !isNum(v)) return null;
  for (const tier of ["red", "amber"]) if (t[tier].some(([lo, hi]) => v >= lo && v < hi)) return tier;
  return "green";
}
const median = a => { const s = [...a].sort((x, y) => x - y), m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };
function triageSeries(ind, vals) {
  // vals: array of numbers/null in day order. Returns [{abs, dev, tier, base}]
  const out = [], green = [];
  const dev = ind.baseline_deviation;
  for (let i = 0; i < vals.length; i++) {
    const v = vals[i];
    const a = absTier(ind, v);
    let d = null, base = null;
    if (dev && isNum(v)) {
      if (dev.metric === "pct_change" || dev.metric === "abs_change") {
        const clean = (lo, hi) => { const r = []; for (let j = Math.max(0, lo); j < Math.max(0, hi); j++) if (green[j] && isNum(vals[j])) r.push(vals[j]); return r; };
        let hist = clean(i - 21, i - 7);
        if (hist.length < 5) hist = clean(0, i).slice(-14);
        if (hist.length >= 5) {
          base = median(hist);
          const delta = dev.metric === "abs_change" ? Math.abs(v - base) : Math.abs(v - base) / base * 100;
          d = delta >= dev.red ? "red" : delta >= dev.amber ? "amber" : "green";
        }
      } else {
        const w = dev.window_days, recent = [];
        for (let j = Math.max(0, i - w + 1); j <= i; j++) if (isNum(vals[j])) recent.push(vals[j]);
        if (recent.length >= w) {
          base = recent.reduce((s, x) => s + x, 0) / recent.length;
          if (dev.metric === "rolling_avg_below") d = base < dev.red ? "red" : base < dev.amber ? "amber" : "green";
          else d = base > dev.red ? "red" : base > dev.amber ? "amber" : "green";
        }
      }
    }
    const tier = worst(a, d);
    green.push(tier === "green");
    out.push({ abs: a, dev: d, tier, base });
  }
  return out;
}

let ROWS = {};   // crew -> rows sorted by day
let TRI = {};    // crew -> ind -> [{abs,dev,tier,base}]
function rebuild(crew) {
  const rows = ROWS[crew];
  TRI[crew] = {};
  for (const id of Object.keys(IND)) TRI[crew][id] = triageSeries(IND[id], rows.map(r => r[id]));
}
for (const c of CREW_IDS) { ROWS[c] = D.rows.filter(r => r.crew_id === c).sort((a, b) => a.day - b.day); rebuild(c); }

const idxOf = (crew, day) => ROWS[crew].findIndex(r => r.day === day);
// latest reading on/before day (weekly indicators look back 7 days)
function reading(crew, id, day) {
  const rows = ROWS[crew], i0 = idxOf(crew, day);
  if (i0 < 0) return null;
  const look = id === "phq9" ? 14 : WEEKLY.has(id) ? 7 : 0;
  for (let i = i0; i >= 0 && rows[i0].day - rows[i].day <= look; i--) {
    if (isNum(rows[i][id])) { const out = { value: rows[i][id], day: rows[i].day, ...TRI[crew][id][i] }; if (id === "phq9" && rows[i].phq9_flag) out.tier = "red"; return out; }
  }
  return { value: null, day, tier: null };
}
function derivedTier(id, v) { const [a, r] = DERIVED[id].tiers; return v > r ? "red" : v > a ? "amber" : "green"; }
const SYMPTOM_FLAGS = ["rash", "chills", "fever", "sore throat", "swollen glands"];
function symptoms(crew, day) { const r = ROWS[crew][idxOf(crew, day)]; return r && r.symptoms ? String(r.symptoms).split(/[;,]/).map(s => s.trim()).filter(Boolean) : []; }

function systemStatus(crew, sysId, day) {
  const s = SYS[sysId], items = [];
  for (const id of s.indicators) items.push({ id, ...reading(crew, id, day) });
  if (sysId === "musculoskeletal") {
    const r = ROWS[crew][idxOf(crew, day)];
    for (const id of Object.keys(DERIVED)) if (r) items.push({ id, derived: true, value: r[id], tier: derivedTier(id, r[id]) });
  }
  let tier = worst(...items.map(i => i.tier));
  if (sysId === "immune" && symptoms(crew, day).some(x => SYMPTOM_FLAGS.includes(x))) tier = worst(tier, "amber");
  return { tier: tier || "none", items };
}
function overall(crew, day) {
  let t = null, flags = [];
  for (const s of Object.keys(SYS)) { const st = systemStatus(crew, s, day); if (st.tier !== "none") t = worst(t, st.tier); if (st.tier === "amber" || st.tier === "red") flags.push({ sys: s, tier: st.tier }); }
  return { tier: t || "none", flags };
}

// Shared with other modules (see README: "How modules share code").
Object.assign(window, { worst, isNum, absTier, median, triageSeries, ROWS, TRI, rebuild, idxOf, reading, derivedTier, SYMPTOM_FLAGS, symptoms, systemStatus, overall });
