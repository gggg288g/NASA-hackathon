// Entry point. Modules load in this order; each one shares its functions on window.
import './styles/app.css';
import './core/data.js';
import './core/triage.js';
import './core/state.js';
import './core/patterns.js';
import './core/report.js';
import './features/medical-officer/dashboard.js';
import './features/astronaut/today.js';
import './features/astronaut/checkin.js';
import './features/emergency/protocols.js';
import './app/mode.js';
import './features/emergency/emergency.js';
import './features/emergency/ai-helper.js';
import './features/self-check/selfcheck.css';
import './features/self-check/selfcheck.js';
import './features/self-check/data-link.js';
import './features/nasa-data/nasa-data.js';
import './app/events.js';

// Offline-first: cache the app after the first visit so it keeps working without a connection (built site only).
if (import.meta.env.PROD && 'serviceWorker' in navigator) navigator.serviceWorker.register('./sw.js').catch(() => {});
