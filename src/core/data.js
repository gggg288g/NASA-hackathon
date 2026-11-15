// Reference data and lookups shared by every feature.
import rows from '../data/mission_daily.json';
import indicators from '../data/reference/indicators.json';
import systems from '../data/reference/body_systems.json';
import environments from '../data/reference/environments.json';
import real from '../data/nasa_osdr/i4_clinical.json';
const D = { rows, indicators, systems, environments, real };

// ---------- reference lookups ----------
const IND = Object.fromEntries(D.indicators.indicators.map(i => [i.id, i]));
const SYS = Object.fromEntries(D.systems.systems.map(s => [s.id, s]));
const ENV = Object.fromEntries(D.environments.environments.map(e => [e.id, e]));
const RANK = { green: 0, amber: 1, red: 2 };
const TIER_LABEL = { green: "Normal", amber: "Watch", red: "Act", none: "No data" };
const CREW_IDS = [...new Set(D.rows.map(r => r.crew_id))];
const CREW_NAME = Object.fromEntries(D.rows.map(r => [r.crew_id, r.crew_name]));
const DERIVED = {
  est_bone_loss_pct: { name: "Estimated bone loss (hip/spine)", unit: "%", what: "Modelled from days in microgravity and exercise done. Watch above ~6% (a typical 6-month ISS loss). Confirm with a scan after flight.", tiers: [6, 10] },
  est_calf_muscle_loss_pct: { name: "Estimated calf muscle loss", unit: "%", what: "Modelled from days in microgravity and exercise done. Watch above ~10% (6-month ISS calf loss was ~13%).", tiers: [10, 15] },
};
const WEEKLY = new Set(D.indicators.indicators.filter(i => i.frequency === "weekly").map(i => i.id));

// Shared with other modules (see README: "How modules share code").
Object.assign(window, { D, IND, SYS, ENV, RANK, TIER_LABEL, CREW_IDS, CREW_NAME, DERIVED, WEEKLY });
