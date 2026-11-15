// "Tested on real NASA data" card (Medical officer) and its chart sheet.
// Data: NASA OSDR Inspiration4 blood tests (OSD-569 CBC, OSD-575 CMP), flagged against each person's pre-flight baseline.
const R = D.real;
const isFlag = p => p.personal === "amber" || p.personal === "red";
const isPost = tp => R.timepoints.find(t => t.id === tp).phase === "post-flight";

// Post-flight readings far from the person's own baseline but still inside the normal range.
function missedByRange() {
  const out = [];
  for (const a of R.analytes) for (const [c, s] of Object.entries(a.series)) for (const p of s.points)
    if (p.v !== null && isPost(p.tp) && isFlag(p) && p.lab === "normal") out.push({ a, c, s, p });
  return out.sort((x, y) => Math.abs(y.p.dev_pct) - Math.abs(x.p.dev_pct));
}
const MISSED = missedByRange();

function renderNasaCard() {
  const n = MISSED.length;
  $("#nasa-line").textContent = `On the Inspiration4 crew, our personal-baseline check flagged ${n} change${n === 1 ? "" : "s"} that normal ranges missed.`;
}

function renderNasaChart() {
  const ex = MISSED[0]; if (!ex) return;
  const a = ex.a, ref = ex.p;
  $("#nasa-title").textContent = `${a.label} (${a.unit})`;
  const sign = ref.dev_pct > 0 ? "+" : "−";
  $("#nasa-say").textContent = `${ex.c} went from ${fmt(ex.s.baseline)} to ${fmt(ref.v)} (${sign}${Math.abs(ref.dev_pct)}%) by ${ref.tp}: still "normal", but far from their own baseline.`;

  const svg = $("#nasachart"), W = svg.clientWidth || 500, rowH = 44, pt = 8, pb = 26, pl = 46, pr = 16;
  const H = pt + R.crew.length * rowH + pb;
  const all = [ref.lo, ref.hi];
  for (const c of R.crew) { const s = a.series[c]; if (s.baseline !== null) all.push(s.baseline); s.points.forEach(p => p.v !== null && all.push(p.v)); }
  let lo = Math.min(...all), hi = Math.max(...all); const pad = (hi - lo) * .06; lo -= pad; hi += pad;
  const x = v => pl + (v - lo) / (hi - lo) * (W - pl - pr);
  const yc = i => pt + i * rowH + rowH / 2;

  let g = `<rect x="${x(ref.lo)}" width="${x(ref.hi) - x(ref.lo)}" y="${pt}" height="${H - pt - pb}" fill="var(--ok)" opacity=".1" rx="4"/>`;
  for (let k = 0; k <= 4; k++) { const v = lo + (hi - lo) * k / 4; g += `<text x="${x(v)}" y="${H - 8}" text-anchor="middle">${Math.round(v)}</text>`; }
  R.crew.forEach((c, i) => {
    const s = a.series[c], y = yc(i);
    g += `<line x1="${pl}" x2="${W - pr}" y1="${y}" y2="${y}" stroke="var(--line)"/><text x="${pl - 8}" y="${y + 4}" text-anchor="end">${c}</text>`;
    const post = s.points.filter(p => p.v !== null && isPost(p.tp));
    for (const p of post) {
      const flag = isFlag(p) && p.lab === "normal";
      if (flag) g += `<line x1="${x(s.baseline)}" x2="${x(p.v)}" y1="${y}" y2="${y}" stroke="var(--warn)" stroke-width="2"/>`;
      g += `<circle cx="${x(p.v)}" cy="${y}" r="${flag ? 6 : 4.5}" fill="${flag ? "var(--warn)" : "var(--muted)"}" opacity="${flag ? 1 : .55}" stroke="var(--panel)" stroke-width="2"><title>${c} ${p.tp}: ${p.v} ${a.unit}</title></circle>`;
      if (flag) g += `<text x="${x(p.v)}" y="${y - 11}" text-anchor="middle" class="lbl">${p.tp}</text>`;
    }
    if (s.baseline !== null) g += `<circle cx="${x(s.baseline)}" cy="${y}" r="6" fill="var(--panel)" stroke="var(--ink)" stroke-width="2"><title>${c} pre-flight baseline: ${fmt(s.baseline)} ${a.unit}</title></circle>`;
  });
  svg.setAttribute("viewBox", `0 0 ${W} ${H}`); svg.style.height = H + "px";
  svg.setAttribute("aria-label", `${a.label} for the four Inspiration4 crew: pre-flight baseline versus post-flight values, normal range ${ref.lo} to ${ref.hi}.`);
  svg.innerHTML = g;
}

$("#nasa-open").onclick = () => { $("#dlg-nasa").showModal(); renderNasaChart(); };
$("#nasa-close").onclick = () => $("#dlg-nasa").close();
renderNasaCard();

// Shared with other modules (see README: "How modules share code").
Object.assign(window, { MISSED, renderNasaCard, renderNasaChart });
