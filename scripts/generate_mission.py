"""
Synthetic astronaut health dataset generator.

Produces a 14-day pre-flight baseline + N flight days for a 3-person crew.
In-flight trends follow published spaceflight findings (see reference/*.json
for sources); planted events give the demo something to detect.

Usage:
    python generator/generate_mission.py                 # defaults: 90 days, seed 42
    python generator/generate_mission.py --days 120 --seed 7 --out data

Outputs (in --out):
    mission_daily.csv   one row per crew member per day (wide format)
    mission_daily.json  same rows, JSON array (easy to load in a web app)
    events.json         ground-truth list of planted events (for demo/testing)
"""
import argparse
import json
import math
from pathlib import Path

import numpy as np
import pandas as pd

PREFLIGHT_DAYS = 14

# Fictional crew. Baselines are pre-flight (on Earth) values.
CREW = [
    dict(crew_id="CDR", name="Crew A (Commander)", age=46, sex="M",
         hr=62, sys=122, dia=76, glu=88, temp=36.9, spo2=98, sleep=6.9,
         mood=4.0, stress=2.2, mass=82.0, exercise=120, fluid=2700),
    dict(crew_id="FE1", name="Crew B (Flight Engineer 1)", age=39, sex="F",
         hr=66, sys=112, dia=72, glu=84, temp=36.8, spo2=98, sleep=7.2,
         mood=4.2, stress=2.0, mass=63.0, exercise=118, fluid=2450),
    dict(crew_id="FE2", name="Crew C (Flight Engineer 2)", age=42, sex="M",
         hr=58, sys=118, dia=76, glu=90, temp=36.9, spo2=97, sleep=6.8,
         mood=3.9, stress=2.1, mass=76.0, exercise=125, fluid=2600),
]

# Planted events: (crew_id, start_day, end_day, type, description)
EVENTS = [
    ("CDR", 40, 56, "bp_drift",
     "Blood pressure climbs ~3 mmHg/day from in-flight baseline; headaches from day 46; "
     "vision self-check flags mild change on day 49. Recovers after day 56 (simulated treatment)."),
    ("FE1", 28, 36, "sleep_mood_dip",
     "Insomnia (4-5 h sleep), low mood and high stress after a comms blackout / family news."),
    ("FE1", 35, 40, "viral_reactivation",
     "Latent virus reactivation: temp ~+1.1 C above baseline, HR +15%, rash/fatigue symptoms. "
     "Follows the stress period (stress suppresses immunity)."),
    ("FE2", 62, 62, "hypoglycemia",
     "Skipped meals + long exercise session -> fasting glucose ~52 mg/dL (ADA level 2)."),
    ("FE2", 65, 80, "exercise_noncompliance",
     "Workload spike: exercise drops to ~35-50 min/day; modelled bone/muscle loss accelerates."),
    ("FE2", 66, 73, "low_hydration",
     "Same workload spike: skips drink breaks, fluid intake ~1.3-1.4 L/day for a week."),
]


def plateau(day, tau):
    """0 -> 1 exponential approach; used for gradual adaptation curves."""
    return 1 - math.exp(-max(day, 0) / tau)


def in_event(crew_id, day, etype):
    for c, s, e, t, _ in EVENTS:
        if c == crew_id and t == etype and s <= day <= e:
            return True, day - s, e - s
    return False, 0, 0


def gen_crew(c, flight_days, rng, env, frng):
    rows = []
    bone_loss = 0.0
    muscle_loss = 0.0
    for day in range(-PREFLIGHT_DAYS + 1, flight_days + 1):
        flight = day >= 1
        phase = "inflight" if flight else "preflight"
        d = max(day, 0)

        # ---- baseline adaptation curves (published effects) ----
        # BP: ~-8..-10 sys, ~-5 dia within first 2 weeks (Norsk 2015; Shuttle data)
        bp_shift_sys = -9 * plateau(d, 5) if flight else 0
        bp_shift_dia = -5 * plateau(d, 5) if flight else 0
        # HR: small reduction
        hr_shift = -2 * plateau(d, 7) if flight else 0
        # Core temp: +~1.0 C, plateau ~day 75 (Stahn 2017) -> tau ~25
        temp_shift = 1.0 * plateau(d, 25) if flight else 0
        # Sleep: historic ISS average ~6.1 h; recent, more regular schedules do better -> use ~6.5 h
        sleep_mean = 6.5 + (c["sleep"] - 6.9) * 0.5 if flight else c["sleep"]
        # Glucose: slow upward drift (insulin-resistance signal), ~+6 mg/dL over 90 d
        glu_shift = 6 * (d / 90) if flight else 0
        # Body mass: slow loss ~2% over 90 d
        mass_shift = -0.02 * c["mass"] * (d / 90) if flight else 0
        # Mood: mild mid-mission dip ("third-quarter" effect), not an alarm
        mood_shift = -0.3 * math.sin(math.pi * min(d, flight_days) / flight_days) if flight else 0

        hr = c["hr"] + hr_shift + rng.normal(0, 2.5)
        sys = c["sys"] + bp_shift_sys + rng.normal(0, 4)
        dia = c["dia"] + bp_shift_dia + rng.normal(0, 3)
        glu = c["glu"] + glu_shift + rng.normal(0, 5)
        temp = c["temp"] + temp_shift + rng.normal(0, 0.12)
        spo2 = c["spo2"] + rng.normal(0, 0.7)
        sleep = sleep_mean + rng.normal(0, 0.5)
        mood = c["mood"] + mood_shift + rng.normal(0, 0.45)
        stress = c["stress"] + (0.3 if flight else 0) + rng.normal(0, 0.45)
        exercise = c["exercise"] + rng.normal(0, 10) if flight else c["exercise"] * 0.9 + rng.normal(0, 10)
        fluid = c["fluid"] * (0.95 if flight else 1.0) + frng.normal(0, 180)
        symptoms = []
        vision = 0

        # ---- planted events ----
        on, k, n = in_event(c["crew_id"], day, "bp_drift")
        if on:
            ramp = min(k, 10) * 3.0 - max(0, k - 12) * 7  # up ~30 by day 50, recovering after day 52
            sys += ramp
            dia += ramp * 0.55
            if k >= 6 and k <= 13:
                symptoms.append("headache")
        if c["crew_id"] == "CDR" and day in (49, 56):
            vision = 1

        on, k, n = in_event(c["crew_id"], day, "sleep_mood_dip")
        if on:
            sleep = 4.6 + rng.normal(0, 0.4)
            mood = 1.9 + rng.normal(0, 0.35)
            stress = 4.3 + rng.normal(0, 0.3)
            hr += 4

        on, k, n = in_event(c["crew_id"], day, "viral_reactivation")
        if on:
            peak = math.sin(math.pi * (k + 0.5) / (n + 1))  # rises then falls
            temp += 1.2 * peak
            hr *= 1 + 0.16 * peak
            exercise *= 1 - 0.6 * peak
            sleep -= 0.6 * peak
            symptoms += ["fatigue"] + (["rash"] if 1 <= k <= 3 else []) + (["chills"] if peak > 0.8 else [])

        on, k, n = in_event(c["crew_id"], day, "hypoglycemia")
        if on:
            glu = 52 + rng.normal(0, 1.5)
            symptoms += ["shaky", "sweating"]
            exercise = 160

        on, k, n = in_event(c["crew_id"], day, "exercise_noncompliance")
        if on:
            exercise = 42 + rng.normal(0, 6)
            stress += 0.6
        on, k, n = in_event(c["crew_id"], day, "low_hydration")
        if on:
            fluid = 1350 + frng.normal(0, 90)

        # ---- modelled bone / muscle loss (only in microgravity) ----
        if flight and env["gravity_g"] < 0.1:
            compliance = float(np.clip(exercise / 120.0, 0, 1))
            # 1.5%/month unprotected; exercise protects up to ~1/3 of loss -> ~1%/month typical
            bone_loss += (1.5 / 30) * (1 - 0.35 * compliance)
            # ~13% calf loss in 6 months with exercise -> ~0.072%/day; worse when skipping
            muscle_loss += (13 / 180) * (1.4 - 0.4 * compliance)

        weekly = (day % 7 == 0)
        mass = c["mass"] + mass_shift + rng.normal(0, 0.3) if weekly else None
        if c["crew_id"] == "FE2" and weekly and 65 <= day <= 84:
            mass -= 0.6  # under-eating during workload spike

        rows.append(dict(
            crew_id=c["crew_id"], crew_name=c["name"], day=day, phase=phase,
            environment=env["id"] if flight else "earth",
            resting_hr=round(hr), bp_systolic=round(sys), bp_diastolic=round(dia),
            glucose=round(glu), core_temp=round(temp, 2),
            spo2=int(np.clip(round(spo2), 85, 100)),
            sleep_hours=round(float(np.clip(sleep, 2.5, 10)), 1),
            mood=int(np.clip(round(mood), 1, 5)),
            stress=int(np.clip(round(stress), 1, 5)),
            exercise_min=int(max(0, round(exercise))),
            fluid_intake_ml=int(max(0, round(fluid / 50) * 50)),
            body_mass=round(mass, 1) if mass is not None else None,
            vision_check=vision if weekly or vision else None,
            # PHQ-9 total every 2 weeks (days 7, 21, 35...), derived from that day's mood and stress
            phq9=int(np.clip(round((4.2 - mood) * 2.5 + (stress - 2) * 1.5), 0, 27)) if flight and day % 14 == 7 else None,
            symptoms=";".join(dict.fromkeys(symptoms)),
            est_bone_loss_pct=round(bone_loss, 2),
            est_calf_muscle_loss_pct=round(muscle_loss, 2),
        ))
    return rows


def add_missing(df, rng, rate=0.03):
    """Simulate missed measurements (astronauts are busy). Never blanks event days."""
    event_mask = np.zeros(len(df), dtype=bool)
    for c, s, e, *_ in EVENTS:
        event_mask |= (df.crew_id == c) & df.day.between(s, e)
    for col in ["resting_hr", "bp_systolic", "glucose", "core_temp", "spo2", "mood", "stress"]:
        m = (rng.random(len(df)) < rate) & ~event_mask & (df.phase == "inflight")
        df.loc[m, col] = None
    # keep BP pair consistent
    df.loc[df.bp_systolic.isna(), "bp_diastolic"] = None
    return df


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--days", type=int, default=90)
    ap.add_argument("--seed", type=int, default=42)
    ap.add_argument("--env", default="iss", help="environment id from reference/environments.json")
    ap.add_argument("--out", default=str(Path(__file__).resolve().parent.parent / "src/data"))
    args = ap.parse_args()

    root = Path(__file__).resolve().parent.parent
    envs = {e["id"]: e for e in json.load(open(root / "src/data/reference/environments.json"))["environments"]}
    env = envs[args.env]

    rng = np.random.default_rng(args.seed)
    frng = np.random.default_rng(args.seed + 1000)   # separate stream for fluid intake
    rows = []
    for c in CREW:
        rows += gen_crew(c, args.days, rng, env, frng)
    df = add_missing(pd.DataFrame(rows), rng)

    out = Path(args.out)
    out.mkdir(parents=True, exist_ok=True)
    df.to_csv(out / "mission_daily.csv", index=False)
    df.to_json(out / "mission_daily.json", orient="records", indent=1)
    json.dump(
        [dict(crew_id=c, start_day=s, end_day=e, type=t, description=d)
         for c, s, e, t, d in EVENTS if s <= args.days],
        open(out / "events.json", "w"), indent=2)
    print(f"Wrote {len(df)} rows for {len(CREW)} crew ({PREFLIGHT_DAYS} pre-flight + {args.days} flight days) to {out}")


if __name__ == "__main__":
    main()
