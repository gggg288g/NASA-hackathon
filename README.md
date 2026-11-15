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

**Alarm-fatigue guard:** a flag that comes only from the personal baseline (the Earth range is still normal) has to repeat on 2 of the last 3 readings before it counts. Until then it shows as "Re-check needed". Earth clinical Watch/Act tiers are never held back.

### Early warnings (`src/core/patterns.js`)

Single readings miss stories that span several indicators, so a second layer looks across them and explains each finding in plain words:

| Warning | Fires when | Demo |
| --- | --- | --- |
| Immune watch | 3+ of 5 nights under 6 h sleep, and stress ≥ 3.5 or mood ≤ 2.5 | FE1 from day 31, five days before the rash and fever (day 36) |
| Fatigue building up | 8+ h of sleep debt in a week (against 7 h a night) | FE1 day 30 |
| Possible infection | temperature ≥ 0.5 °C over personal normal, plus heart rate +8% or immune symptoms | FE1 day 36, links to the fever protocol |
| Bone & muscle loss speeding up | 4+ of 7 days under 60 min exercise | FE2 from day 68 |
| Kidney stone risk | 3-day fluid average under 1,900 ml, plus low exercise or estimated bone loss ≥ 6% | FE2 from day 67 (low hydration, days 66–73) |
| Shared cause? | 2+ crew with raised temperature or immune symptoms within 3 days | (cabin air, food, water or something going round the crew) |
| Trend forecast | blood pressure or heart rate still Normal but on a steady 7-day line (R² ≥ 0.6) that reaches Watch within 7 days | strict on purpose, to avoid false alarms |

These appear on the astronaut's Today screen ("Your health story"), in the medical officer's What to do column, on the crew cards and in the report to ground. Thresholds are demo values, not NASA medical standards.

### Offline-first

Check-ins are saved on the device (`localStorage`) and survive reloads. Privacy → "Clear saved check-ins" removes them. The built site registers a service worker (`public/sw.js`) so it keeps working without a connection after the first visit.

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

### Emergency AI helper (optional)

The step-by-step protocols in Emergency always work. On top of them, an AI helper can talk the crew through it: Claude when the app runs inside the Claude app, otherwise **Gemini** through a small server function, [`api/emergency-ai.js`](api/emergency-ai.js). The Gemini key stays on the server and is never in the browser bundle or in git.

Deploy on Vercel (it detects Vite and the `api/` folder automatically):

1. Import the GitHub repo in Vercel.
2. In **Project Settings → Environment Variables**, add `GEMINI_API_KEY` (from Google AI Studio). Optional: `GEMINI_MODEL` (default `gemini-3.8-flash`) and `ALLOWED_ORIGINS` for extra domains.
3. Deploy. The helper appears in Emergency once the key is set.

To use it locally:

```bash
cp .env.example .env     # Windows: copy .env.example .env
# open .env and paste your key after GEMINI_API_KEY=
npm run dev
```

The dev server runs the same function as Vercel, so the helper works straight away. Without a key, the helper stays hidden and the protocols still work. `.env` is git-ignored: never commit it or paste keys in chat.

The function only answers pages from the same site, limits each visitor to 12 requests a minute (per server instance), caps message size and reply length, and adds fixed safety rules to every request. For a public launch, add a spending cap on the Google key as well.

## Project layout

```
src/
  main.js                  imports every module in order
  styles/app.css           shared design (light/dark, tablet-first)
  core/                    shared logic: data, triage, state, flight-surgeon report
  app/                     tab switching and global events (loaded last)
  data/                    mission data, reference ranges, NASA OSDR files
api/
  emergency-ai.js          Vercel function: Emergency helper -> Gemini (holds the key)
  features/
    astronaut/             Today + daily check-in
    self-check/            Self-check tab and the link to the astronaut's data
    medical-officer/       body map, dashboard
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
