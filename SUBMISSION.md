# Crew Health Monitor: submission text

NASA Space Apps Challenge 2026 · Health Monitoring Software · Team SixersGoToSpace

Paste each section into the matching field of the Space Apps project form. Edit freely.

---

## Project name

Crew Health Monitor

## High-level summary (short)

On a Mars mission the flight surgeon can be up to 22 minutes away each way, so the crew has to notice problems early and act on their own. Crew Health Monitor compares every astronaut with **their own normal**, not just Earth ranges, links signals across the body into plain-language early warnings ("short sleep plus stress: watch for infection"), and guides the crew through step-by-step protocols that change with the comms delay. It works offline, keeps mood data private by default, and its personal-baseline method was tested on real NASA Inspiration4 blood data. There it flagged 4 changes that normal clinical ranges missed.

## Detailed project description

**The problem.** Long missions expose crews to microgravity, radiation, isolation and a closed environment. Many changes in the body are silent at first (bone loss, eye changes, slowly rising blood pressure), and spaceflight shifts what "normal" is (core temperature runs about 1 °C warmer, blood pressure about 8–10 mmHg lower). Earth reference ranges alone miss early drift, and with a 3–22 minute delay each way to Mars, waiting for ground is not always an option.

**What it does.**

- **Personal baselines.** Every reading gets two tiers: Earth clinical ranges and deviation from the astronaut's own recent normal (median of their normal readings from 7–21 days ago). The worse of the two wins.
- **Early warnings across indicators.** Rules that look at several signals together and explain why they matter:
  - immune watch: short sleep plus stress
  - possible infection: temperature plus heart rate or symptoms
  - bone and muscle loss speeding up: missed exercise
  - kidney stone risk: low fluids plus bone loss
  - fatigue: sleep debt or slower reaction time
  - shared cause: several crew affected at once
- **Fewer false alarms.** A reading that is only unusual for the person (still inside the Earth range) must repeat on 2 of 3 readings before it becomes an alert. Until then it shows as "re-check needed". Earth-range alerts are never held back.
- **60-second reaction-time check.** A short version of the reaction-time test used to measure fatigue (the PVT). It compares each result with the astronaut's own past results and feeds the fatigue warning.
- **Self-check for space-specific problems:** vision changes (SANS) with an Amsler grid, dizziness on standing, infection, sleep, isolation, bone and muscle, CO₂, radiation dose, and the PHQ-9 mood screen.
- **Hydration log** with a target based on NASA's exploration nutrition requirement (32 ml/kg).
- **Emergency mode.** Step-by-step protocols read aloud, with escalation advice that changes for ISS, Moon or Mars delay.
- **Mission Control packet.** A 2 KB report that leads with priority and the decision needed, then answers the questions ground would ask next (since when, which direction, sleep, exercise, fluids, symptoms). One message replaces a round trip that could take 45 minutes.
- **Two views.** The astronaut sees one plain status ("You're OK today, with 1 thing to watch") and their health story. The crew medical officer sees a body map, crew cards, per-system tables, trends and a mission timeline.
- **Offline-first and private.** Check-ins stay on the device, the app works without a connection, and mood and stress scores are shared with ground only if the astronaut chooses.

**How we built it.** A static web app (Vite, plain JavaScript, no frameworks), tablet-first, with light and dark modes. Python scripts process the NASA data and generate the demo mission.

**What's validated, experimental or simulated (honest labels).**

| Part | Status |
| --- | --- |
| Personal-baseline method | Tested retrospectively on NASA Inspiration4 CBC and CMP data (OSD-569, OSD-575) |
| Earth reference ranges, PHQ-9, ADA 15-15 rule, AHA blood pressure categories | Published clinical guidelines |
| Early-warning rules and thresholds | Our proposal, based on published spaceflight findings. Demo values, not NASA medical standards |
| 60-second reaction check | Short demo version of the validated PVT, not itself validated |
| 90-day mission data (3 crew) | **Synthetic**, generated from published spaceflight findings with planted events |

**What's next.**

- A camera heart-rate scan (remote photoplethysmography from a normal webcam, about ±3–5 bpm when still and well lit), used as a no-contact backup to the chest strap. Experimental, and it never makes up a number when the signal is poor.
- Wearable sync to remove most manual entry, and heart rate variability.
- Radiation dosimeter integration.
- A return-to-gravity readiness score.
- The same app for submarines, Antarctic stations and remote clinics, by swapping the environment profile.

**The Approach**

Our approach was driven by a simple reality: Earth-based health metrics don't always work in space. With Mars communication delays up to 44 minutes round-trip, the crew needs an autonomous, offline tool.
Instead of treating vitals in isolation, we built a system based on three pillars:
Personal Baselines: Comparing readings against the astronaut's own recent normal, not just standard clinical ranges.
Cross-System Warnings: Linking multiple subtle signals (e.g., low fluids + bone loss) to catch space-specific hazards early.
Actionable Autonomy: Providing offline, step-by-step protocols and compressing status updates into tiny (2 KB) packets for Mission Control.

**Tools & Technologies**

We prioritized a lightweight, offline-first stack to ensure reliability in deep space:
Frontend: HTML5, CSS3, and Vanilla JavaScript (built with Vite). No heavy frameworks, ensuring fast, entirely client-side operation.
Interactive UI: Native SVG. The interactive body map, which shows each body system's status, was built from scratch without external libraries.
Data Processing: Python was used to ingest NASA datasets and generate our synthetic mission.
Datasets: NASA Open Science Data Repository (Inspiration4 OSD-569 and OSD-575).

**Solution Development**
1. Data Validation: We started by testing our concept against real spaceflight data. Using Python, we looked back at Inspiration4 blood data (4 crew) and showed that our "personal baseline" method flagged 4 post-flight changes that standard Earth ranges missed.
2. UI & Engine Build: We built a custom SVG body map and created three distinct interfaces (Astronaut, Self-check, Medical Officer) to manage cognitive load. Behind the scenes, we coded a fully offline triage engine. Readings outside Earth clinical ranges alert straight away; a reading that is only unusual for that astronaut must repeat on 2 of 3 readings before it becomes an alert, to cut false alarms.
3. Simulation Testing: To test our logic, we scripted a 90-day synthetic mission for a 3-person crew, planting subtle health events (like skipped exercise or temperature spikes) to ensure our cross-system warnings and 2 KB flight surgeon reports triggered correctly under simulated Mars communication delays.

## NASA data used

- OSD-569, SpaceX Inspiration4, Complete Blood Count (LSDS-7): https://osdr.nasa.gov/bio/repo/data/studies/OSD-569
- OSD-575, SpaceX Inspiration4, Comprehensive Metabolic Panel (LSDS-8): https://osdr.nasa.gov/bio/repo/data/studies/OSD-575
- NASA Human Research Program, five hazards of spaceflight: https://www.nasa.gov/hrp/hazards/
- NASA OCHMO technical briefs (bone loss, CO₂, radiation) and NTRS papers on SANS, renal stones and exploration nutrition (linked in the app next to each check)

## Use of AI

We used AI coding assistants (Claude) to help write and review code, analyse our design and draft text. The optional Emergency talk-through uses an LLM only to phrase guidance from our own rule-based results and protocols. It is told never to diagnose or suggest drugs or doses. All triage, early warnings and protocols run as fixed rules and work offline without AI.

## Disclaimer

Hackathon prototype for decision support. Not a medical device, not flight-certified, and not endorsed by NASA. It does not replace a flight surgeon or approved onboard medical procedures.

---

## 2-minute demo script

1. **(15 s) Hook.** "On Mars, your doctor is 22 minutes away, each way. So the crew needs to know what's wrong before it's obvious, and what to do next."
2. **(20 s) Real NASA data.** Open Medical officer. Tap **Tested on real NASA data**: on the Inspiration4 crew, comparing each person with their own pre-flight normal flagged 4 changes that normal ranges missed (platelets 356 → 185, still "normal").
3. **(30 s) Early warning.** Pick Flight Engineer 1 and set the day to **31**. Point to **Immune watch: short sleep + stress**, then tap Why. Move to **day 36**: fever and rash arrive, and **Possible infection** links straight to the fever protocol. "We warned five days earlier."
4. **(20 s) Hydration chain.** Flight Engineer 2, **day 68**: **Kidney stone risk: low fluids + bone loss**. Two quiet signals, one real spaceflight risk.
5. **(20 s) Mars delay.** Set the environment to **Mars transit** and tap **Prepare report for flight surgeon**. Priority first, the answers ground would ask for already in it, 2 KB, and "start the protocol now".
6. **(15 s) Astronaut side.** Astronaut tab: one plain sentence, the health story, then run the **60-second reaction check** live.
7. **(10 s) Close.** "Offline, private by default, explains itself. A health companion for when Earth is too far away to ask."
