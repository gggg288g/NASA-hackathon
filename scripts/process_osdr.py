"""Process NASA OSDR Inspiration4 clinical blood data (OSD-569 CBC, OSD-575 CMP)
into src/data/nasa_osdr/i4_clinical.json for the app.

For every crew member x analyte x timepoint it records:
  value, lab reference range, lab flag (low/high/normal),
  personal baseline (median of the 3 pre-flight draws), and a personal-baseline tier:
  |value - baseline| / (ref_max - ref_min)  >= 0.4 -> amber, >= 0.75 -> red.
A sample row with any implausible value is excluded entirely for that panel (CBC or CMP).
Also runs a plausibility check that catches impossible values (data-entry/column-shift errors).
"""
import json, math
from pathlib import Path
import pandas as pd

ROOT = Path(__file__).resolve().parent.parent
D = ROOT / "src/data/nasa_osdr"
TP_ORDER = ["L-92", "L-44", "L-3", "R+1", "R+45", "R+82", "R+194"]
TP_DAY = {"L-92": -92, "L-44": -44, "L-3": -3, "R+1": 1, "R+45": 45, "R+82": 82, "R+194": 194}
PRE = ["L-92", "L-44", "L-3"]

# id, label, value col, min col, max col, unit, body system, plain meaning, plausible range (for data-quality check)
ANALYTES = [
  ("glucose", "Glucose", "glucose_value_milligram_per_deciliter", "glucose_range_min_milligram_per_deciliter", "glucose_range_max_milligram_per_deciliter", "mg/dL", "metabolic", "Blood sugar (body's main fuel).", (20, 600), "cmp"),
  ("sodium", "Sodium", "sodium_value_millimol_per_liter", "sodium_range_min_millimol_per_liter", "sodium_range_max_millimol_per_liter", "mmol/L", "metabolic", "Salt balance; tracks hydration and fluid shifts.", (110, 170), "cmp"),
  ("potassium", "Potassium", "potassium_value_millimol_per_liter", "potassium_range_min_millimol_per_liter", "potassium_range_max_millimol_per_liter", "mmol/L", "cardiovascular", "Needed for normal heart rhythm and muscle function.", (2, 8), "cmp"),
  ("calcium", "Calcium", "calcium_value_milligram_per_deciliter", "calcium_range_min_milligram_per_deciliter", "calcium_range_max_milligram_per_deciliter", "mg/dL", "musculoskeletal", "Bone mineral; rises when bone breaks down in microgravity.", (5, 15), "cmp"),
  ("creatinine", "Creatinine", "creatinine_value_milligram_per_deciliter", "creatinine_range_min_milligram_per_deciliter", "creatinine_range_max_milligram_per_deciliter", "mg/dL", "metabolic", "Kidney function and muscle mass marker.", (0.2, 10), "cmp"),
  ("bun", "Urea nitrogen (BUN)", "urea_nitrogen_bun_value_milligram_per_deciliter", "urea_nitrogen_bun_range_min_milligram_per_deciliter", "urea_nitrogen_bun_range_max_milligram_per_deciliter", "mg/dL", "metabolic", "Kidney function and hydration marker.", (2, 150), "cmp"),
  ("albumin", "Albumin", "albumin_value_gram_per_deciliter", "albumin_range_min_gram_per_deciliter", "albumin_range_max_gram_per_deciliter", "g/dL", "metabolic", "Main blood protein; reflects nutrition and fluid status.", (1, 7), "cmp"),
  ("alt", "ALT (liver enzyme)", "alt_value_units_per_liter", "alt_range_min_units_per_liter", "alt_max_units_per_liter", "U/L", "metabolic", "Liver stress marker.", (1, 1000), "cmp"),
  ("wbc", "White blood cells", "white_blood_cell_count_value_thousand_per_microliter", "white_blood_cell_count_range_min_thousand_per_microliter", "white_blood_cell_count_range_max_thousand_per_microliter", "10³/µL", "immune", "Infection-fighting cells.", (1, 50), "cbc"),
  ("lymph", "Lymphocytes", "absolute_lymphocytes_value_cells_per_microliter", "absolute_lymphocytes_range_min_cells_per_microliter", "absolute_lymphocytes_range_max_cells_per_microliter", "cells/µL", "immune", "Immune cells that control viruses; stress lowers them.", (100, 10000), "cbc"),
  ("neut", "Neutrophils", "absolute_neutrophils_value_cells_per_microliter", "absolute_neutrophils_range_min_cells_per_microliter", "absolute_neutrophils_range_max_cells_per_microliter", "cells/µL", "immune", "First-responder immune cells; rise with stress.", (300, 30000), "cbc"),
  ("hgb", "Hemoglobin", "hemoglobin_value_percent", "hemoglobin_range_min_percent", "hemoglobin_range_max_percent", "g/dL", "cardiovascular", "Oxygen-carrying protein in red cells.", (5, 22), "cbc"),
  ("hct", "Hematocrit", "hematocrit_value_percent", "hematocrit_range_min_percent", "hematocrit_range_max_percent", "%", "cardiovascular", "Share of blood volume that is red cells; shifts with fluid loss.", (15, 65), "cbc"),
  ("plt", "Platelets", "platelet_count_value_thousand_per_microliter", "platelet_count_range_min_thousand_per_microliter", "platelet_count_range_max_thousand_per_microliter", "10³/µL", "cardiovascular", "Clotting cells.", (20, 1000), "cbc"),
]

def num(x):
    try:
        v = float(x)
        return None if math.isnan(v) else v
    except (TypeError, ValueError):
        return None

def load(path):
    df = pd.read_csv(path, dtype=str)
    parts = df["Sample Name"].str.extract(r"^(C\d{3})_.*?_(L-\d+|R\+\d+)")
    df["crew"], df["tp"] = parts[0], parts[1]
    return df

cmp = load(D / "OSD-575_LSDS-8_Comprehensive_Metabolic_Panel_CMP_TRANSFORMED.csv")
cbc = load(D / "OSD-569_LSDS-7_Complete_Blood_Count_CBC_TRANSFORMED.csv")
SRC = {"cmp": cmp, "cbc": cbc}

BAD_ROWS = set()
for aid, label, vc, mnc, mxc, unit, sysid, what, (plo, phi), src in ANALYTES:
    df = SRC[src]
    for _, rr in df.iterrows():
        v = num(rr[vc])
        if v is not None and not (plo <= v <= phi):
            BAD_ROWS.add((src, rr["crew"], rr["tp"]))

out = {"timepoints": [{"id": t, "day": TP_DAY[t], "phase": "pre-flight" if t.startswith("L") else "post-flight"} for t in TP_ORDER],
       "crew": sorted(cmp.crew.unique()), "analytes": [], "data_quality": []}
for aid, label, vc, mnc, mxc, unit, sysid, what, (plo, phi), src in ANALYTES:
    df = SRC[src]
    a = {"id": aid, "label": label, "unit": unit, "system": sysid, "what": what,
         "source": "OSD-575 (CMP)" if src == "cmp" else "OSD-569 (CBC)", "series": {}}
    for crew in out["crew"]:
        rows = {r.tp: r for r in df[df.crew == crew].itertuples(index=False)}
        pts = []
        for tp in TP_ORDER:
            if tp not in rows: continue
            rr = df[(df.crew == crew) & (df.tp == tp)].iloc[0]
            v, lo, hi = num(rr[vc]), num(rr[mnc]), num(rr[mxc])
            if (src, crew, tp) in BAD_ROWS:
                if v is not None and not (plo <= v <= phi):
                    out["data_quality"].append({"crew": crew, "timepoint": tp, "panel": src.upper(), "analyte": label, "value": v, "unit": unit})
                v = None
            pts.append({"tp": tp, "v": v, "lo": lo, "hi": hi})
        pre = [p["v"] for p in pts if p["tp"] in PRE and p["v"] is not None]
        base = float(pd.Series(pre).median()) if len(pre) >= 2 else None
        for p in pts:
            v, lo, hi = p["v"], p["lo"], p["hi"]
            p["lab"] = None if v is None or lo is None or hi is None else ("low" if v < lo else "high" if v > hi else "normal")
            if v is not None and base is not None and lo is not None and hi is not None and hi > lo:
                z = abs(v - base) / (hi - lo)
                p["dev_pct"] = round((v - base) / base * 100, 1)
                p["personal"] = "red" if z >= 0.75 else "amber" if z >= 0.4 else "green"
            else:
                p["personal"] = None
        a["series"][crew] = {"baseline": base, "points": pts}
    out["analytes"].append(a)

# summary findings (computed, not hand-written)
def count(fn):
    return sum(1 for a in out["analytes"] for c, s in a["series"].items() for p in s["points"] if fn(a, c, p))
out["summary"] = {
    "n_values": count(lambda a, c, p: p["v"] is not None),
    "lab_flags": count(lambda a, c, p: p["lab"] in ("low", "high")),
    "personal_flags": count(lambda a, c, p: p["personal"] in ("amber", "red")),
    "personal_only": count(lambda a, c, p: p["personal"] in ("amber", "red") and p["lab"] == "normal"),
    "lab_only": count(lambda a, c, p: p["lab"] in ("low", "high") and p["personal"] == "green"),
}
# crew-wide events: same analyte + timepoint flagged in >=3 of 4 crew
cw = []
for a in out["analytes"]:
    for tp in TP_ORDER:
        flagged = [c for c, s in a["series"].items() for p in s["points"] if p["tp"] == tp and (p["lab"] in ("low", "high") or p["personal"] in ("amber", "red"))]
        if len(flagged) >= 3:
            vals = [p["v"] for c, s in a["series"].items() for p in s["points"] if p["tp"] == tp and c in flagged]
            cw.append({"analyte": a["label"], "timepoint": tp, "crew": flagged, "values": vals})
out["crew_wide"] = cw
out["sources"] = [
    {"id": "OSD-569", "title": "SpaceX Inspiration4 – Complete Blood Count (LSDS-7)", "url": "https://osdr.nasa.gov/bio/repo/data/studies/OSD-569",
     "file": "LSDS-7_Complete_Blood_Count_CBC_TRANSFORMED.csv"},
    {"id": "OSD-575", "title": "SpaceX Inspiration4 – Comprehensive Metabolic Panel (LSDS-8)", "url": "https://osdr.nasa.gov/bio/repo/data/studies/OSD-575",
     "file": "LSDS-8_Comprehensive_Metabolic_Panel_CMP_TRANSFORMED.csv"},
]
json.dump(out, open(D / "i4_clinical.json", "w"), indent=1)
print(json.dumps(out["summary"], indent=1)); print("crew-wide:", json.dumps(cw, indent=1)); print("DQ:", json.dumps(out["data_quality"], indent=1))
