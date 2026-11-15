# Crew Health Monitor

NASA Space Apps Challenge 2026 · Team SixersGoToSpace

A health monitor for astronauts on long missions, where the flight surgeon may be minutes away (Moon) or up to 20+ minutes away (Mars). It compares each astronaut against **their own normal**, not just Earth ranges, so problems show up early. It also tells the crew what to do when help is far away.

## What it does

| Tab | Who it's for | What it does |
| --- | --- | --- |
| **Astronaut** | Each crew member | One plain status ("You're OK today" / "Check in with medical"), the daily check-in and Self-check. Body, habits, today's checks and privacy sit in collapsed cards. |
| **Self-check** | Each crew member | Symptom checks for space-specific problems (vision changes/SANS, dizziness on standing, infection, sleep, isolation, bone and muscle loss, Amsler grid, PHQ-9). Answers are checked against the astronaut's own recent data, which can raise a result by one level but never lower it. |
| **Medical officer** | Crew medical officer | Astronaut body map (tap the helmet, chest or legs to open them), crew status cards, the **Tested on real NASA data** card, per-system tables against personal baseline, trend charts, a mission-day timeline and a report for the flight surgeon. |
| **Emergency** (button) | Anyone | Simple step-by-step protocols, read aloud, with escalation advice that changes with comms delay (ISS / Moon / Mars). |

### How a status is decided

Each reading gets two tiers and the app takes the worse one:

1. **Absolute tier**: Earth clinical ranges (Normal / Watch / Act).
2. **Personal tier**: how far today is from the astronaut's own baseline. The baseline is the median of their *normal* readings from 7–21 days ago, so a slow drift is still caught.

Sleep, mood, stress and exercise use rolling averages instead of single days.

## NASA data used

- **OSD-569**, SpaceX Inspiration4, Complete Blood Count (LSDS-7): https://osdr.nasa.gov/bio/repo/data/studies/OSD-569
- **OSD-575**, SpaceX Inspiration4, Comprehensive Metabolic Panel (LSDS-8): https://osdr.nasa.gov/bio/repo/data/studies/OSD-575

Used in the **Tested on real NASA data** card in the Medical officer tab. Each Inspiration4 crew member's pre-flight values form a personal baseline. A value is flagged when it moves from that baseline by 40% of the normal-range width (watch) or 75% (act). The card counts the post-flight readings flagged this way that were still inside the normal clinical range (currently 4), so normal ranges alone would have missed them. Tap the card for one chart: the clearest example (Platelets, C003: 356 to 185 by R+194, still "normal"), with each crew member's baseline against their post-flight values and the normal range shaded. This is the same method the app uses on the mission data. One CBC row (C003, L-92) is excluded as a data-quality issue.

The 90-day mission data (3 crew) is **synthetic**. It is generated from published spaceflight findings with planted events so the demo has something to catch:

- Commander: blood pressure drift, days 40–56
- Flight Engineer 1: poor sleep and low mood, days 28–36, then viral reactivation, days 35–40
- Flight Engineer 2: low blood sugar on day 62, missed exercise on days 65–80

## Run it

Needs Node 18+.

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # static site in dist/
npm run preview    # serve the build
```

The AI talk-through in Emergency only runs inside the Claude app. On localhost the step-by-step protocols and read-aloud (device voice) still work.

## Project layout

```
src/
  main.js                  imports every module in order
  styles/app.css           shared design (light/dark, tablet-first)
  core/                    shared logic: data, triage, state, flight-surgeon report
  app/                     tab switching and global events (loaded last)
  data/                    mission data, reference ranges, NASA OSDR files
  features/
    astronaut/             Today + daily check-in
    self-check/            Self-check tab and the link to the astronaut's data
    medical-officer/       body map, dashboard, quick entry
    emergency/             protocols, emergency screen, AI helper
    nasa-data/             "Tested on real NASA data" card and chart sheet
scripts/                   Python scripts that build the data in src/data/
```

### Working on a feature

One branch per feature folder:

```bash
git checkout -b feature/self-check
# edit src/features/self-check/...
git push -u origin feature/self-check   # then open a pull request into main
```

### How modules share code

Modules put what they share on `window` (`Object.assign(window, {...})`), so a function from `core/` can be called from any feature. Because of this, **the import order in `src/main.js` matters**: `core/` first, then features, and `app/events.js` last. If you add a file, import it in `main.js` after anything it depends on.

### Rebuilding the data

```bash
pip install pandas numpy
python scripts/generate_mission.py      # synthetic mission -> src/data/
python scripts/process_osdr.py          # NASA CSVs -> src/data/nasa_osdr/i4_clinical.json
python scripts/triage_reference.py      # prints the planted events the triage catches
```

## Team

- **Jordan Ong**: app, triage method, mission data, NASA OSDR processing, body map, emergency mode.
- **Teammate**: Self-check content and checks (SANS, orthostatic, infection, sleep, isolation, bone and muscle), Amsler grid, PHQ-9, NASA research references.

## Disclaimer

This is a hackathon prototype for decision support. It is not a medical device and does not replace a flight surgeon.
