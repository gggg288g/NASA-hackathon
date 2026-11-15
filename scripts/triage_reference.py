"""
Reference triage engine (idea 3) - shows how the reference JSON is meant to be used.
Port this logic to your app's language; it's also used to sanity-check the dataset.

For each reading:
  absolute tier  = lookup in indicators.json absolute_tiers
  deviation tier = compare to the astronaut's personal baseline
                   (median of their GREEN readings from 7-21 days ago)
  final tier     = worst of the two
Body-system tier = worst tier among that system's indicators (for the body map).

Usage:
    python scripts/triage_reference.py              # prints flagged days per crew
    python scripts/triage_reference.py --csv out.csv  # also writes per-reading tiers
"""
import argparse
import json
from pathlib import Path

import pandas as pd

ROOT = Path(__file__).resolve().parent.parent
RANK = {"green": 0, "amber": 1, "red": 2}
NAME = {v: k for k, v in RANK.items()}
BASELINE_WINDOW = 14


def load_indicators():
    return {i["id"]: i for i in json.load(open(ROOT / "src/data/reference/indicators.json"))["indicators"]}


def absolute_tier(ind, v):
    t = ind.get("absolute_tiers")
    if t is None or pd.isna(v):
        return None
    for tier in ("red", "amber"):
        if any(lo <= v < hi for lo, hi in t[tier]):
            return tier
    return "green"


def deviation_tier(ind, series, i, green_mask):
    """series: this crew member's values for this indicator (row order = day order).
    green_mask: list of booleans, True where an earlier reading ended up green.
    Only green readings feed the baseline, so a flagged episode doesn't become 'normal'
    and the return to normal afterwards isn't flagged as a change."""
    dev = ind.get("baseline_deviation")
    v = series.iloc[i]
    if dev is None or pd.isna(v):
        return None
    m = dev["metric"]
    if m in ("pct_change", "abs_change"):
        ok = pd.Series(green_mask[:i] + [False] * (len(series) - i), index=series.index)
        clean = series.where(ok)
        # lagged window: green readings 7-21 days ago, so slow drifts aren't absorbed
        hist = clean.iloc[max(0, i - 21):max(0, i - 7)].dropna()
        if len(hist) < 5:  # early-mission fallback: last 14 green readings
            hist = clean.iloc[:i].dropna().tail(BASELINE_WINDOW)
        if len(hist) < 5:
            return None
        base = hist.median()
        delta = abs(v - base) if m == "abs_change" else abs(v - base) / base * 100
        return "red" if delta >= dev["red"] else "amber" if delta >= dev["amber"] else "green"
    w = dev["window_days"]
    recent = series.iloc[max(0, i - w + 1):i + 1].dropna()
    if len(recent) < w:
        return None
    avg = recent.mean()
    if m == "rolling_avg_below":
        return "red" if avg < dev["red"] else "amber" if avg < dev["amber"] else "green"
    if m == "rolling_avg_above":
        return "red" if avg > dev["red"] else "amber" if avg > dev["amber"] else "green"
    return None


def worst(*tiers):
    ts = [t for t in tiers if t]
    return NAME[max(RANK[t] for t in ts)] if ts else None


def triage(df, inds):
    out = []
    for crew, g in df.sort_values("day").groupby("crew_id"):
        g = g.reset_index(drop=True)
        for col, ind in inds.items():
            if col not in g:
                continue
            s = g[col]
            green = []
            for i in range(len(g)):
                a = absolute_tier(ind, s.iloc[i])
                d = deviation_tier(ind, s, i, green)
                f = worst(a, d)
                green.append(f == "green")
                if f:
                    out.append(dict(crew_id=crew, day=g.day.iloc[i], indicator=col, value=s.iloc[i],
                                    absolute=a, deviation=d, tier=f, system=ind["body_system"]))
    return pd.DataFrame(out)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--data", default=str(ROOT / "src/data/mission_daily.csv"))
    ap.add_argument("--csv")
    args = ap.parse_args()
    df = pd.read_csv(args.data)
    inds = load_indicators()
    t = triage(df, inds)   # pre-flight rows seed the personal baseline
    t = t[t.day >= 1]      # report in-flight days only
    if args.csv:
        t.to_csv(args.csv, index=False)
    for crew, g in t.groupby("crew_id"):
        red = g[g.tier == "red"]
        print(f"\n== {crew}: {len(red)} red, {(g.tier=='amber').sum()} amber readings ==")
        for day, r in red.groupby("day"):
            print(f"  day {day:>3}: " + ", ".join(f"{x.indicator}={x.value}" for x in r.itertuples()))


if __name__ == "__main__":
    main()
