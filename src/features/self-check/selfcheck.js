// Self-check: 9 body systems, 18 checks, NASA research links (teammate's Astro Health Check).
// Scoped to #sc so it can't clash with the rest of the app. Public API: window.SC.
/* ---------- SELF-CHECK (teammate's Astro Health Check, scoped into this app) ---------- */
(function(){
const root=document.getElementById("sc");

/* ---------- sources ---------- */
const SRC={
 hazards:["NASA HRP: 5 hazards","https://www.nasa.gov/hrp/hazards/"],
 radStd:["NASA radiation standards","https://www.nasa.gov/sites/default/files/atoms/files/ochmo_standards_overview_sept_15_2021_francisco.pdf"],
 radBrief:["NASA radiation brief","https://www.nasa.gov/wp-content/uploads/2023/03/radiation-protection-technical-brief-ochmo.pdf"],
 co2:["NASA CO₂ brief","https://nasa.gov/wp-content/uploads/2023/03/co2-technical-brief-ochmo.pdf"],
 co2ops:["CO₂ on the ISS (NTRS)","https://ntrs.nasa.gov/archive/nasa/casi.ntrs.nasa.gov/20150019624.pdf"],
 bone:["NASA bone loss brief","https://www.nasa.gov/wp-content/uploads/2023/12/ochmo-tb-030-bone-loss.pdf"],
 boneN:["Bone loss models (NTRS)","https://ntrs.nasa.gov/citations/20150010417"],
 renal:["Bone loss & renal stones (NTRS)","https://ntrs.nasa.gov/api/citations/20080014283/downloads/20080014283.pdf"],
 sansQ:["NASA vision questionnaire","https://ntrs.nasa.gov/citations/20100039152"],
 sansEye:["SANS overview (EyeWiki)","https://eyewiki.aao.org/Spaceflight-Associated_Neuro-Ocular_Syndrome_(SANS)"],
 sansHealio:["SANS research (Healio)","https://cm.healio.com/news/ophthalmology/20180515/nasa-research-progresses-toward-understanding-ocular-consequences-of-longduration-spaceflights"],
 sansISS:["ISS ocular tests (NTRS)","https://ntrs.nasa.gov/api/citations/20170009173/downloads/20170009173.pdf"],
 sleep:["Sleep in astronauts (Barger 2014)","https://www.news-medical.net/news/20140810/Space-missions-affect-sleep-patterns-in-astronauts.aspx"],
 phq:["PHQ-9 (Kroenke)","https://jacobimed.org/public/Ambulatory_files/mlove/CurriculumWomenandGeri/Depression/Depression%20articles/PHQ-9ReviewKroenke.pdf"],
 phq2:["PHQ-9 scoring (UW)","https://www.hivprep.uw.edu/page/mental-health-screening/phq-9"],
 bp:["ACC/AHA 2017 BP categories","https://acc.org/Latest-in-Cardiology/Articles/2017/11/08/11/47/mon-5pm-bp-guideline-aha-2017"],
 hr:["Mayo Clinic: resting heart rate","https://www.mayoclinic.org/healthy-lifestyle/fitness/expert-answers/heart-rate/faq-20057979"],
 cvl:["NASA: Ensuring Astronaut Health","https://www.nasa.gov/?p=207552"],
 ortho:["Orthostatic intolerance study (PMC)","https://pmc.ncbi.nlm.nih.gov/articles/PMC6789148"],
 apex:["NASA APEX behavioral suite","https://ntrs.nasa.gov/citations/20250011721"]
};

/* ---------- icons ---------- */
const IC={
 eye:'<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
 heart:'<path d="M12 21s-8-5.5-8-11a4.5 4.5 0 0 1 8-2.5A4.5 4.5 0 0 1 20 10c0 5.5-8 11-8 11z"/>',
 bone:'<path d="M7 7a2.5 2.5 0 1 1-3.5-3.5A2.5 2.5 0 0 1 7 7l10 10a2.5 2.5 0 1 1 3.5 3.5A2.5 2.5 0 0 1 17 17L7 7z"/>',
 brain:'<path d="M9 4a3 3 0 0 0-3 3 3 3 0 0 0-2 5 3 3 0 0 0 2 5 3 3 0 0 0 6 1V5a2 2 0 0 0-3-1zM15 4a3 3 0 0 1 3 3 3 3 0 0 1 2 5 3 3 0 0 1-2 5 3 3 0 0 1-6 1"/>',
 moon:'<path d="M20 14.5A8.5 8.5 0 1 1 9.5 4 7 7 0 0 0 20 14.5z"/>',
 orbit:'<circle cx="12" cy="12" r="2"/><ellipse cx="12" cy="12" rx="10" ry="4" transform="rotate(30 12 12)"/>',
 wind:'<path d="M3 8h11a3 3 0 1 0-3-3M3 12h15a3 3 0 1 1-3 3M3 16h8"/>',
 shield:'<path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6l8-3z"/>',
 rad:'<circle cx="12" cy="12" r="1.6"/><path d="M12 10.4V3.5a9 9 0 0 1 7.8 4.5l-6.4 3.7M10.6 12.8 4.2 16.5A9 9 0 0 1 3 12M13.4 12.8l6.4 3.7A9 9 0 0 1 12 21v-7.4"/>',
 sum:'<path d="M9 4h6v3H9zM7 5H5v16h14V5h-2M9 12h6M9 16h6"/>'
};
const CHECK='<svg viewBox="0 0 24 24"><path d="M5 12l5 5 9-10"/></svg>';
const CHEV='<svg class="chev" viewBox="0 0 24 24"><path d="M6 9l6 6 6-6"/></svg>';

/* ---------- data ---------- */
const TABS=[
{id:"eyes",label:"Eyes",icon:"eye",hz:["Gravity fields (fluid shift)","Closed environment (CO₂)"],
 intro:"Fluids shift toward the head in microgravity.",
 conds:[
 {id:"sans",name:"Blurred or changing vision (SANS)",sum:"Spaceflight-associated neuro-ocular syndrome",ev:"sourced",amberAny:true,redAt:2,
  about:"SANS is a group of eye changes seen in long-duration crews: swelling of the optic disc, flattening of the eyeball and a shift toward far-sightedness. Most people do not notice the swelling, which is why regular checks matter. About 60% of long-duration astronauts show at least one sign.",
  tool:"amsler",
  ind:[
   {id:"near",l:"Blurred vision when reading or at near"},
   {id:"focus",l:"Difficulty focusing"},
   {id:"dist",l:"Worse distance vision"},
   {id:"scot",l:"Blind spot or missing patch in my vision",crit:1},
   {id:"dbl",l:"Double vision",crit:1},
   {id:"cont",l:"Difficulty with contrast or lighting"},
   {id:"head",l:"Headache"},
   {id:"naus",l:"Nausea"},
   {id:"loss",l:"Any loss of vision",crit:1},
   {id:"amsler",l:"Wavy, blurred or missing lines on the Amsler grid",crit:1}],
  guide:["No vision changes reported. Keep up your scheduled vision checks so you have a baseline to compare against.",
   "A single near-vision or focus symptom is the most commonly reported change on long missions. Repeat the check weekly and log it. Risk factors you can influence: high-salt diet, intensive resistive exercise and high cabin CO₂ are associated with SANS.",
   "A blind spot, double vision, vision loss, a severe rating, or two or more symptoms together needs medical review. Report to the flight surgeon; they may ask for an acuity test or eye imaging."],
  tips:["Do your scheduled near and distance acuity checks and the Amsler grid","Log any change in reading ability. Plus-power reading glasses are available on the ISS for near-vision change","Check the Air & Lungs tab if headaches accompany vision change"],
  src:["sansQ","sansEye","sansHealio","sansISS"]},
 {id:"irr",name:"Eye irritation or foreign particles",sum:"Redness, grit, pain",ev:"draft",
  about:"Loose particles float in microgravity and can reach the eye.",
  ind:[{id:"red",l:"Redness or itching"},{id:"wat",l:"Watering eyes"},{id:"grit",l:"Feels like something is in my eye"},{id:"photo",l:"Light sensitivity"},{id:"pain",l:"Eye pain",crit:1}],
  guide:["No irritation reported.","Avoid rubbing. Clean or rinse per onboard procedure and re-check in 24 hours.","Eye pain, a stuck particle that will not clear, or any vision change should be reported to the flight surgeon."],
  tips:["Wash hands before touching your face","Wear eye protection for dusty tasks"],src:["hazards"]}
 ]},
{id:"heart",label:"Heart & Vessels",icon:"heart",hz:["Gravity fields (fluid shift)"],
 intro:"Blood shifts to the upper body. Exercise keeps the heart fit.",
 conds:[
 {id:"vitals",name:"Blood pressure & heart rate",sum:"Enter your readings (Earth reference ranges)",ev:"sourced",
  about:"Use seated, rested readings. Ranges are the same as on Earth: normal blood pressure is below 120/80 and resting heart rate is 60–100 beats per minute. Compare with your own pre-flight baseline.",
  ex:[{id:"sys",t:"num",l:"Systolic (top number)",u:"mmHg",min:50,max:260,step:1},
      {id:"dia",t:"num",l:"Diastolic (bottom number)",u:"mmHg",min:30,max:160,step:1},
      {id:"hr",t:"num",l:"Resting heart rate",u:"bpm",min:20,max:220,step:1}],
  ind:[{id:"chest",l:"Chest pain or pressure",crit:1},{id:"faint",l:"Fainting or near-fainting",crit:1},{id:"sob",l:"Shortness of breath"},{id:"palp",l:"Palpitations or skipped beats"},{id:"dizz",l:"Dizziness"},{id:"fat",l:"Unusual fatigue"}],
  evalEx(ex,sel){let lv=-1;const notes=[];const s=+ex.sys,d=+ex.dia,h=+ex.hr;
   if(ex.sys&&ex.dia){let c,l;
    if(s>180||d>120){c="Hypertensive crisis";l=2}
    else if(s>=140||d>=90){c="Stage 2 hypertension range";l=2}
    else if(s>=130||d>=80){c="Stage 1 hypertension range";l=1}
    else if(s>=120){c="Elevated";l=1}
    else{c="Normal";l=0}
    lv=Math.max(lv,l);notes.push(`BP ${s}/${d}: ${c}`)}
   if(ex.hr){const out=h<60||h>100;const sym=["chest","faint","sob","dizz"].some(k=>sel[k]);
    let l=out?(sym?2:1):0;lv=Math.max(lv,l);
    notes.push(`HR ${h} bpm: ${h>100?"high":h<60?"low (can be normal if very fit)":"normal"}`)}
   return{lv,notes}},
  guide:["Within Earth reference ranges. Keep measuring at the same time each day so you can see trends.",
   "Outside the normal range. Recheck after five minutes of seated rest, compare with your pre-flight baseline and log it.",
   "A stage 2-range or crisis reading, or an abnormal heart rate with symptoms, should be reported to the flight surgeon now."],
  tips:["Measure seated and rested, same arm, same time each day","Keep up prescribed exercise","Limit sodium"],src:["bp","hr","cvl"]},
 {id:"ortho",name:"Dizzy when standing (orthostatic intolerance)",sum:"Lightheaded after moving upright or returning to gravity",ev:"sourced",
  about:"More than 60% of astronauts can be affected by orthostatic intolerance, which is the main reason people feel faint when they stand after time in microgravity. Try a 3-minute quiet stand and note what you feel.",
  ind:[{id:"dz",l:"Dizzy or lightheaded when standing"},{id:"nf",l:"Near-fainting or fainting",crit:1},{id:"rh",l:"Racing heart when standing"},{id:"gv",l:"Vision greys out or narrows when standing"},{id:"wk",l:"Weak or shaky when standing"},{id:"nu",l:"Nausea when standing"}],
  guide:["No orthostatic symptoms reported.","Mild symptoms. Stand up slowly, stay hydrated and tell the flight surgeon before re-entry or any gravity transition.","Fainting or severe symptoms need medical review before any activity that needs you upright."],
  tips:["Countermeasures studied before return to gravity: lower-body negative pressure, high-intensity exercise, fluid loading and compression garments","In a NASA-linked study, heart rate rose about 25 bpm on a sit/stand test after flight"],src:["cvl","ortho"]},
 {id:"fluid",name:"Head fullness & facial puffiness",sum:"Fluid shift towards the head",ev:"partial",
  about:"Many astronauts describe a sensation of fullness in the face and head when they first reach space.",
  ind:[{id:"puff",l:"Puffy face"},{id:"full",l:"Head fullness or pressure"},{id:"nose",l:"Stuffy nose"},{id:"hd",l:"Headache"},{id:"vis",l:"Vision changes with the fullness",crit:1}],
  guide:["No fluid-shift symptoms reported.","Common in microgravity. Log the pattern and mention it at your next medical conference.","Vision change together with head fullness should be reported; see the Eyes tab for SANS."],
  tips:["Report headaches that persist or worsen"],src:["cvl"]}
 ]},
{id:"bones",label:"Bones & Muscles",icon:"bone",hz:["Gravity fields"],
 intro:"Bones lose about 1–1.5% a month without exercise.",
 conds:[
 {id:"bone",name:"Bone loss & fracture risk",sum:"Mostly silent, so track exercise and pain",ev:"sourced",
  about:"Bone loss usually has no symptoms. Hip and spine are most affected. Because you can't feel it, the best indicators are how much resistance and aerobic exercise you actually do and any new bone pain.",
  ex:[{id:"min",t:"num",l:"Typical exercise per workday",u:"minutes",min:0,max:400,step:5}],
  ind:[{id:"miss",l:"Missed or shortened exercise sessions"},{id:"back",l:"Back pain"},{id:"hip",l:"Hip or leg bone pain"},{id:"tend",l:"New tenderness in a bone"}],
  evalEx(ex){let lv=-1;const notes=[];if(ex.min!=null&&ex.min!==""){const m=+ex.min;lv=m>=150?0:1;notes.push(`${m} min/day (target 150)`)}return{lv,notes}},
  guide:["Exercise is on target and you have no bone pain. Keep logging sessions.",
   "Exercise is below the 2.5 h/day level or you have mild pain. Both resistance and aerobic work are needed to protect bone.",
   "New or severe bone pain should be reported. Your medical team may also prescribe medication such as bisphosphonates."],
  tips:["Do resistive and aerobic exercise as prescribed","Take diet and supplements as directed by the flight surgeon"],src:["bone","boneN"]},
 {id:"stone",name:"Kidney stone warning signs",sum:"Calcium leaves bone and passes through the kidneys",ev:"partial",
  about:"NASA bone research lists renal stones as one of the health risks of bone loss.",
  ind:[{id:"flank",l:"Sharp pain in the side or lower back",crit:1},{id:"blood",l:"Blood in urine",crit:1},{id:"burn",l:"Painful urination"},{id:"nausea",l:"Nausea with the pain"},{id:"fluid",l:"Not drinking enough fluids"}],
  guide:["No kidney-stone signs reported.","Drink fluids as per protocol and report if it continues.","Flank pain or blood in the urine should be reported promptly to the flight surgeon."],
  tips:["Keep up fluid intake as per your nutrition plan"],src:["renal"]},
 {id:"muscle",name:"Muscle weakness",sum:"Loss of strength from unloading",ev:"draft",
  about:"Muscles that no longer work against gravity shrink and weaken.",
  ind:[{id:"leg",l:"Leg weakness"},{id:"load",l:"Strength on resistance machine has dropped"},{id:"cramp",l:"Muscle cramps"},{id:"sore",l:"Prolonged muscle soreness"}],
  guide:["No muscle symptoms reported.","Keep to your resistance programme and log your loads so you can spot drops.","Severe weakness or pain that does not settle should be reported."],
  tips:["Protein and exercise timing as advised by the team"],src:["bone"]}
 ]},
{id:"brain",label:"Brain & Mood",icon:"brain",hz:["Isolation & confinement","Distance from Earth"],
 intro:"Close quarters and distance affect mood and thinking.",
 conds:[
 {id:"phq",name:"Mood check (PHQ-9)",sum:"Validated 9-question depression screen",ev:"sourced",type:"phq",
  about:"The PHQ-9 is a free, validated questionnaire. A total of 10 or more had 88% sensitivity and 88% specificity for major depression in primary care patients. It was validated on the general population, not astronauts. NASA uses its own APEX behavioral suite on missions.",
  guide:["Minimal or no symptoms. Repeat every two weeks to track changes.",
   "Mild symptoms: watchful waiting. Repeat the questionnaire in two weeks and keep up routines, exercise, sleep and contact with family.",
   "A score of 10 or more is the standard screening cutpoint. Please contact the flight surgeon or behavioral health support."],
  tips:["Keep up social time and private calls","Exercise and sleep both help mood"],src:["phq","phq2","apex"]},
 {id:"iso",name:"Isolation & crew stress",sum:"Loneliness, conflict, feeling confined",ev:"draft",
  about:"Isolation and confinement is one of NASA's five hazards.",
  ind:[{id:"lone",l:"Loneliness or homesickness"},{id:"irr",l:"Irritability with crewmates"},{id:"conf",l:"Conflict that is not resolving"},{id:"wd",l:"Withdrawing from crew time"},{id:"anx",l:"Anxiety or constant worry"},{id:"trap",l:"Feeling trapped"}],
  guide:["No stress signs reported.","Schedule a private call, join crew social time and keep your routine.","Ongoing conflict or severe distress should be raised with ground behavioral health support."],
  tips:["Protect private time and keep a routine"],src:["hazards"]},
 {id:"cog",name:"Mental fog & slowed thinking",sum:"Concentration, memory, mistakes",ev:"partial",
  about:"Crews have described 'mental viscosity' during missions, and poor sleep and CO₂ are suspected contributors.",
  ind:[{id:"conc",l:"Trouble concentrating"},{id:"mem",l:"Memory lapses"},{id:"slow",l:"Slow thinking or reactions"},{id:"err",l:"Mistakes on routine tasks",crit:1},{id:"hd",l:"Headache"}],
  guide:["No cognitive symptoms reported.","Check sleep and cabin CO₂ first. They are common contributors.","Mistakes on routine tasks are a safety issue. Report to the flight surgeon."],
  tips:["Look at the Sleep and Air & Lungs tabs"],src:["co2ops"]}
 ]},
{id:"sleep",label:"Sleep",icon:"moon",hz:["Isolation & confinement","Closed environment (light, noise)"],
 intro:"ISS crews average about 6 h of sleep (8.5 h scheduled).",
 conds:[
 {id:"slp",name:"Not sleeping enough",sum:"Hours and quality",ev:"sourced",
  about:"Only about 24% of ISS sleep episodes reached 7 hours or more. Three-quarters of ISS crew used sleep medication at some point. Enter your average for the last three nights.",
  ex:[{id:"hrs",t:"num",l:"Average sleep, last 3 nights",u:"hours",min:0,max:14,step:.5}],
  ind:[{id:"fall",l:"Trouble falling asleep"},{id:"wake",l:"Waking during the night"},{id:"unref",l:"Wake up unrefreshed"},{id:"sleepy",l:"Daytime sleepiness"},{id:"meds",l:"Needed a sleep medication"},{id:"nod",l:"Nodded off or microsleeps during tasks",crit:1},{id:"env",l:"Light or noise keeps me awake"}],
  evalEx(ex){let lv=-1;const notes=[];if(ex.hrs!=null&&ex.hrs!==""){const h=+ex.hrs;lv=h>=7?0:h>=6?1:2;notes.push(`${h} h average (target 7+)`)}return{lv,notes}},
  guide:["7 hours or more is good. Keep a regular sleep schedule.","6–7 hours. Protect your sleep window, dim lights before bed and limit screens.","Under 6 hours, or microsleeps during tasks, is a performance and safety risk. Report to the flight surgeon. Be cautious with sleep medication because it can slow your response to an emergency alarm."],
  tips:["Timed light exposure and schedule adjustments help","Behavioral strategies and consistent timing"],src:["sleep"]}
 ]},
{id:"balance",label:"Balance",icon:"orbit",hz:["Gravity fields"],
 intro:"The inner ear re-learns after every gravity change.",
 conds:[
 {id:"motion",name:"Space motion sickness & unsteadiness",sum:"Nausea, spinning, disorientation",ev:"partial",
  about:"NASA's hazards page notes that the inner ear must adjust to new gravity loads.",
  ind:[{id:"naus",l:"Nausea"},{id:"vom",l:"Vomiting",crit:1},{id:"vert",l:"Dizziness or spinning"},{id:"dis",l:"Disorientation"},{id:"sweat",l:"Cold sweats"},{id:"hd",l:"Headache"},{id:"unst",l:"Unsteady when moving after a gravity change"}],
  guide:["No balance symptoms reported.","Move slowly, limit sudden head movements, and keep a fixed visual reference.","Repeated vomiting risks dehydration. Report to the flight surgeon."],
  tips:["Give yourself time to adapt after each gravity transition"],src:["hazards"]}
 ]},
{id:"air",label:"Air & Lungs",icon:"wind",hz:["Closed environment"],
 intro:"Cabin CO₂ runs higher than on Earth.",
 conds:[
 {id:"co2",name:"High cabin CO₂",sum:"Headache, tiredness, poor concentration",ev:"sourced",
  about:"Outdoor Earth air is about 0.23 mmHg CO₂. NASA's current standard limits the 1-hour average to 3 mmHg. Crews have reported symptoms starting at about 2.3 mmHg, headaches between 2.8 and 4.5 mmHg, and more severe symptoms above that.",
  ex:[{id:"pp",t:"num",l:"Cabin CO₂ reading (if you have it)",u:"mmHg",min:0,max:15,step:.1}],
  ind:[{id:"hd",l:"Headache"},{id:"lat",l:"Tired or lethargic"},{id:"slp",l:"Poor sleep"},{id:"nau",l:"Nausea"},{id:"vis",l:"Blurred vision"},{id:"cog",l:"Hard to concentrate"},{id:"cough",l:"Persistent cough"},{id:"tingle",l:"Tingling or numbness in the face",crit:1},{id:"sob",l:"Shortness of breath",crit:1}],
  evalEx(ex){let lv=-1;const notes=[];if(ex.pp!=null&&ex.pp!==""){const p=+ex.pp;lv=p>3?2:p>=2.3?1:0;notes.push(`${p} mmHg (limit 3)`)}return{lv,notes}},
  guide:["Below the level where symptoms were first noted (about 2.3 mmHg).","Between about 2.3 and 3 mmHg. Symptoms may start; reduce exertion and report the reading.","Above the 3 mmHg limit, or red-flag symptoms. Move to a better-ventilated area and alert ground and crew."],
  tips:["Symptoms tend to ease when cabin CO₂ drops","Ask whether the scrubber or fans need attention","High CO₂ is also an associated risk factor for SANS"],src:["co2","co2ops"]},
 {id:"airway",name:"Airway irritation",sum:"Cough, wheeze, throat",ev:"draft",
  about:"Dust and particles stay airborne in microgravity.",
  ind:[{id:"c",l:"Cough"},{id:"s",l:"Sore or dry throat"},{id:"w",l:"Wheezing"},{id:"t",l:"Chest tightness"},{id:"sob",l:"Shortness of breath",crit:1}],
  guide:["No airway symptoms reported.","Use filters and masks for dusty tasks and keep hydrated.","Shortness of breath or chest tightness should be reported."],
  tips:["Wear a mask for dusty tasks"],src:["hazards"]}
 ]},
{id:"immune",label:"Immune & Skin",icon:"shield",hz:["Closed environment"],
 intro:"The cabin is a closed ecosystem for microbes.",
 conds:[
 {id:"inf",name:"Possible infection",sum:"Fever, throat, cough, aches",ev:"draft",
  about:"A closed cabin shares microbes among crew.",
  ind:[{id:"fever",l:"Fever or chills",crit:1},{id:"sore",l:"Sore throat"},{id:"cough",l:"Cough"},{id:"cong",l:"Congestion"},{id:"ache",l:"Body aches"},{id:"fat",l:"Fatigue"}],
  guide:["No infection symptoms reported.","Wash hands, wipe shared surfaces and tell the crew medical officer.","A fever should be reported to the flight surgeon."],
  tips:["Hand hygiene and cleaning of shared surfaces"],src:["hazards"]},
 {id:"skin",name:"Skin problems",sum:"Rash, dryness, slow healing",ev:"draft",
  about:"Skin can react to equipment contact, dry air and stress.",
  ind:[{id:"rash",l:"Rash"},{id:"itch",l:"Itching"},{id:"dry",l:"Dry or peeling skin"},{id:"slow",l:"Cut or sore that is slow to heal",crit:1},{id:"pres",l:"Redness where equipment presses"}],
  guide:["No skin problems reported.","Moisturise, adjust fit of equipment and monitor.","A wound that is not healing should be reported."],
  tips:["Check equipment fit for pressure points"],src:["hazards"]}
 ]},
{id:"rad",label:"Radiation",icon:"rad",hz:["Space radiation"],
 intro:"Limits: 600 mSv per career, 250 mSv per solar event.",
 conds:[
 {id:"dose",name:"Radiation dose & solar events",sum:"Cumulative dose against the 600 mSv career limit",ev:"sourced",
  about:"Enter your total career spaceflight dose. Green is below 50% of 600 mSv, amber is 50–80%, and red is above 80% or any solar particle event. For context, highest multi-mission doses among US astronauts are about 240–290 mSv, and people on Earth get about 2–3 mSv a year.",
  ex:[{id:"dose",t:"num",l:"Cumulative career dose",u:"mSv",min:0,max:700,step:1,slider:1,gauge:1},{id:"spe",t:"check",l:"A solar particle event has occurred or an alert is active"}],
  ind:[{id:"nv",l:"Nausea or vomiting",crit:1},{id:"fat",l:"Unusual fatigue"},{id:"skin",l:"Skin reddening or burn",crit:1}],
  evalEx(ex){let lv=-1;const notes=[];if(ex.dose!=null&&ex.dose!==""){const d=+ex.dose,p=d/600*100;lv=p>80?2:p>=50?1:0;notes.push(`${d} mSv · ${p.toFixed(0)}% of career limit`)}
   if(ex.spe){lv=2;notes.push("Solar particle event (limit 250 mSv)")}return{lv,notes}},
  guide:["Below 50% of the career limit.","50–80% of the limit. Plan lower-dose assignments with the flight surgeon.","Above 80% of the limit, or a solar particle event. Go to the storm shelter or shielded area per protocol and report to ground."],
  tips:["Follow ALARA: keep exposure as low as reasonably achievable","Use storm shelters during solar particle events","Acute symptoms after an event need prompt reporting"],src:["radStd","radBrief"]}
 ]}
];
const ALL=TABS.flatMap(t=>t.conds.map(c=>({...c,tab:t.id})));
const PHQ_ITEMS=["Little interest or pleasure in doing things","Feeling down, depressed, or hopeless","Trouble falling or staying asleep, or sleeping too much","Feeling tired or having little energy","Poor appetite or overeating","Feeling bad about yourself, or that you are a failure or have let yourself or your family down","Trouble concentrating on things, such as reading or watching television","Moving or speaking so slowly that others noticed, or being so fidgety or restless that you move around much more than usual","Thoughts that you would be better off dead, or of hurting yourself in some way"];
const PHQ_LAB=["Not at all","Several days","More than half the days","Nearly every day"];

/* ---------- state ---------- */
const S={};ALL.forEach(c=>S[c.id]={sel:{},ex:{},phq:Array(9).fill(0),touched:false});
const LV=["Green","Amber","Red"];
const LVTXT=["No signs","Possible","Likely"];
const sevWord=v=>v<=2?"Barely":v<=4?"Mild":v<=6?"Moderate":v<=8?"Severe":"Worst";
const hue=p=>`hsl(${Math.round(150-150*p)} 80% 55%)`;
const esc=s=>String(s).replace(/[&<>]/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;"}[m]));

/* ---------- evaluation ---------- */
function evaluate(c){
 const st=S[c.id];let lv=-1;const notes=[];let extra="";
 if(c.type==="phq"){
  if(!st.touched)return{lv:-1,notes:[]};
  const tot=st.phq.reduce((a,b)=>a+b,0);
  const band=tot>=20?"Severe":tot>=15?"Moderately severe":tot>=10?"Moderate":tot>=5?"Mild":"None-minimal";
  lv=tot>=10?2:tot>=5?1:0;notes.push(`PHQ-9 total ${tot} of 27: ${band}`);
  if(st.phq[8]>0){lv=2;extra="item9"}
  return{lv,notes,extra};
 }
 const sel=st.sel,ids=Object.keys(sel);
 if(ids.length){
  const max=Math.max(...ids.map(i=>sel[i]));
  const crit=ids.some(i=>c.ind.find(x=>x.id===i).crit);
  let l=0;
  if(crit){l=2;notes.push("A red-flag symptom is selected")}
  else if(max>=8){l=2;notes.push("A symptom rated severe")}
  else if(c.redAt&&ids.length>=c.redAt){l=2;notes.push(`${ids.length} symptoms together`)}
  else if(c.amberAny||max>=3||ids.length>=2){l=1;notes.push(ids.length>1?`${ids.length} symptoms selected`:"A symptom is present")}
  else notes.push("Mild symptoms only");
  lv=Math.max(lv,l);
 }
 if(c.evalEx){const r=c.evalEx(st.ex,sel);if(r.lv>=0)lv=Math.max(lv,r.lv);notes.unshift(...r.notes)}
 const dd=window.SC_DATA&&window.SC_DATA(c.id);
 if(dd){notes.push(dd.text);if(lv>=0&&dd.lv>lv){lv=Math.min(lv+1,dd.lv);notes.push("Raised one level by your data")}}
 return{lv,notes,extra,data:dd};
}

/* ---------- build UI ---------- */
const tabsEl=document.getElementById("tabs"),panelsEl=document.getElementById("panels");
function build(){
 TABS.forEach((t,i)=>{
  const b=document.createElement("button");b.className="tab";b.role="tab";b.id="tab-"+t.id;b.dataset.tab=t.id;
  b.setAttribute("aria-selected",i===0);b.setAttribute("aria-controls","pn-"+t.id);b.tabIndex=i===0?0:-1;
  b.innerHTML=`<svg viewBox="0 0 24 24">${IC[t.icon]}</svg>${t.label}<span class="dot" data-dot="${t.id}"></span>`;
  tabsEl.appendChild(b);
  const p=document.createElement("section");p.className="scp";p.id="pn-"+t.id;p.role="tabpanel";p.setAttribute("aria-labelledby","tab-"+t.id);p.hidden=i!==0;
  p.innerHTML=`<div class="ptitle"><h2>${t.label}</h2><div class="hz">${t.hz.map(h=>`<span>${h}</span>`).join("")}</div></div><p class="pintro">${t.intro}</p>`+t.conds.map(c=>condHTML(c)).join("");
  panelsEl.appendChild(p);
 });
 const sb=document.createElement("button");sb.className="tab";sb.role="tab";sb.id="tab-sum";sb.dataset.tab="sum";sb.setAttribute("aria-selected",false);sb.tabIndex=-1;
 sb.innerHTML=`<svg viewBox="0 0 24 24">${IC.sum}</svg>Summary<span class="dot" data-dot="sum"></span>`;tabsEl.appendChild(sb);
 const sp=document.createElement("section");sp.className="scp";sp.id="pn-sum";sp.role="tabpanel";sp.hidden=true;panelsEl.appendChild(sp);
 ALL.forEach(refresh);
}
function condHTML(c){
 let inner="";
 if(c.type==="phq"){
  inner=`<div class="sec">Over the last 2 weeks, how often have you been bothered by:</div><div class="inds phq">`+PHQ_ITEMS.map((q,i)=>`
   <div class="ind on" data-q="${i}"><div class="q"><span>${i+1}</span>${q}</div>
   <div class="sl"><input type="range" min="0" max="3" step="1" value="0" data-scphq="${i}" aria-label="${esc(q)}"><output>0 · ${PHQ_LAB[0]}</output></div></div>`).join("")+`</div>`;
 }else{
  inner=(c.ex?`<div class="extras">${c.ex.map(e=>exHTML(c,e)).join("")}</div>`:"")+
   (c.tool==="amsler"?amslerHTML():"")+
   `<div class="sec">Tick and rate what you feel</div><div class="inds">`+
   c.ind.map(x=>`<div class="ind" data-ind="${x.id}"><button class="chip" aria-pressed="false" data-chip="${x.id}"><i>${CHECK}</i><span>${x.l}${x.crit?'<span class="flag">red flag</span>':""}</span></button>
   <div class="sl"><small>mild</small><input type="range" min="1" max="10" step="1" value="3" data-sev="${x.id}" aria-label="How bad is: ${esc(x.l)}"><small>worst</small><output>3 · Mild</output></div></div>`).join("")+`</div>`;
 }
 return `<article class="cond" id="c-${c.id}" data-c="${c.id}">
  <button class="cond-btn" aria-expanded="false" aria-controls="b-${c.id}"><span class="cb-main"><span class="cb-name">${c.name}</span><span class="cb-sum">${c.sum}</span></span>
   <span class="pill lv-1" data-pill></span>${CHEV}</button>
  <div class="collapse"><div class="inner" inert id="b-${c.id}"><div class="body"><p class="about">${c.brief||""}</p><details class="why"><summary>Why?</summary><div>${c.about}</div></details>${inner}<div class="res none" data-res aria-live="polite"></div>
   ${potHTML(c)}<div class="srcs">Sources: ${c.src.map(k=>`<a href="${SRC[k][1]}" target="_blank" rel="noopener">${SRC[k][0]}</a>`).join("")}</div></div></div></div></article>`;
}
function exHTML(c,e){
 if(e.t==="check")return `<div class="ex check wide"><label><input type="checkbox" data-ex="${e.id}">${e.l}</label></div>`;
 return `<div class="ex ${e.slider?"wide":""}"><label for="x-${c.id}-${e.id}">${e.l}</label><div class="row"><input type="number" id="x-${c.id}-${e.id}" data-ex="${e.id}" min="${e.min}" max="${e.max}" step="${e.step}" inputmode="decimal" placeholder="–"><span class="unit">${e.u}</span></div>
 ${e.slider?`<input type="range" min="${e.min}" max="${e.max}" step="${e.step}" value="0" data-exslider="${e.id}" style="margin-top:12px;width:100%" aria-label="${e.l}">`:""}
 ${e.gauge?`<div class="gauge" data-gauge><b style="left:0%"></b></div><div class="glab"><span>0</span><span>300 (50%)</span><span>480 (80%)</span><span>600 mSv</span></div>`:""}</div>`;
}
function amslerHTML(){
 let g="";for(let i=0;i<=20;i++){g+=`<line x1="${i*10}" y1="0" x2="${i*10}" y2="200" stroke="#111" stroke-width=".6"/><line x1="0" y1="${i*10}" x2="200" y2="${i*10}" stroke="#111" stroke-width=".6"/>`}
 return `<div class="amsler" data-amsler><div><button type="button" data-amtoggle>Show Amsler grid</button></div>
 <svg viewBox="0 0 200 200" role="img" aria-label="Amsler grid with a central dot">${g}<circle cx="100" cy="100" r="3" fill="#111"/></svg>
 <p>Cover one eye, look at the dot. Wavy or missing lines? Tick it below.</p></div>`;
}

/* ---------- refresh ---------- */
function refresh(c){
 const r=evaluate(c),card=document.getElementById("c-"+c.id);
 const pill=card.querySelector("[data-pill]");
 pill.className="pill lv"+r.lv;pill.textContent=r.lv<0?"":LV[r.lv];
 const res=card.querySelector("[data-res]");
 if(r.lv<0){res.className="res none";res.innerHTML="Tick what you feel to see a result."}
 else{
  let urgent="";
  if(r.extra==="item9")urgent=`<p><b>Please talk to the flight surgeon or a crewmate now.</b> If anyone is in immediate danger, alert the crew.</p>`;
  res.className="res lv"+r.lv;
  res.innerHTML=`<h4><span class="pill lv${r.lv}">${LV[r.lv]}</span>${LVTXT[r.lv]}</h4>${r.notes.length?`<ul>${r.notes.map(n=>`<li>${esc(n)}</li>`).join("")}</ul>`:""}${urgent}`;
 }
 updateDots();
 const sum=document.getElementById("pn-sum");if(!sum.hidden)renderSummary();
}
function worst(cs){let w=-1;cs.forEach(c=>{const l=evaluate(c).lv;if(l>w)w=l});return w}
function updateDots(){
 TABS.forEach(t=>{const w=worst(ALL.filter(c=>c.tab===t.id));root.querySelector(`[data-dot="${t.id}"]`).className="dot"+(w>=0?" lv"+w:"")});
 const w=worst(ALL);root.querySelector('[data-dot="sum"]').className="dot"+(w>=0?" lv"+w:"");
}

/* ---------- events ---------- */
function setSlider(inp,min,max){
 const v=+inp.value,p=(v-min)/(max-min);inp.style.setProperty("--p",(p*100)+"%");inp.style.setProperty("--c",hue(p));
}
function condOf(el){return ALL.find(c=>c.id===el.closest(".cond").dataset.c)}
root.addEventListener("click",e=>{
 const tab=e.target.closest(".tab");if(tab){showTab(tab.dataset.tab);return}
 const cb=e.target.closest(".cond-btn");if(cb){
  const card=cb.closest(".cond"),open=!card.classList.contains("open");
  card.classList.toggle("open",open);cb.setAttribute("aria-expanded",open);
  card.querySelector(".inner").toggleAttribute("inert",!open);return}
 const chip=e.target.closest("[data-chip]");if(chip){
  const c=condOf(chip),id=chip.dataset.chip,row=chip.closest(".ind"),on=!row.classList.contains("on");
  row.classList.toggle("on",on);chip.setAttribute("aria-pressed",on);
  const sl=row.querySelector("input");
  if(on){S[c.id].sel[id]=+sl.value;setSlider(sl,1,10)}else delete S[c.id].sel[id];
  refresh(c);return}
 const at=e.target.closest("[data-amtoggle]");if(at){
  const box=at.closest("[data-amsler]");box.classList.toggle("show");at.textContent=box.classList.contains("show")?"Hide Amsler grid":"Show Amsler grid";return}
 if(e.target.id==="copyBtn")copySummary();
 if(e.target.id==="resetBtn")resetAll();
 const go=e.target.closest("[data-goto]");if(go){showTab(go.dataset.goto,go.dataset.open)}
});
root.addEventListener("input",e=>{
 const t=e.target;
 if(t.dataset.sev){
  const c=condOf(t),row=t.closest(".ind"),v=+t.value;
  setSlider(t,1,10);row.querySelector("output").textContent=`${v} · ${sevWord(v)}`;
  if(row.classList.contains("on")){S[c.id].sel[row.dataset.ind]=v;refresh(c)}
 }else if(t.dataset.scphq!==undefined){
  const c=condOf(t),v=+t.value;setSlider(t,0,3);
  t.parentElement.querySelector("output").textContent=`${v} · ${PHQ_LAB[v]}`;
  S[c.id].phq[+t.dataset.scphq]=v;S[c.id].touched=true;refresh(c);
 }else if(t.dataset.ex){
  const c=condOf(t),id=t.dataset.ex;
  if(t.type==="checkbox")S[c.id].ex[id]=t.checked;
  else{S[c.id].ex[id]=t.value===""?null:+t.value;const sl=t.closest(".ex").querySelector("[data-exslider]");if(sl){sl.value=t.value||0;setSlider(sl,+sl.min,+sl.max)}}
  gauge(c);refresh(c);
 }else if(t.dataset.exslider){
  const c=condOf(t),id=t.dataset.exslider;setSlider(t,+t.min,+t.max);
  const n=t.closest(".ex").querySelector("input[type=number]");n.value=t.value;S[c.id].ex[id]=+t.value;gauge(c);refresh(c);
 }
});
function gauge(c){
 const g=root.querySelector(`#c-${c.id} [data-gauge] b`);if(!g)return;
 const d=+S[c.id].ex.dose||0;g.style.left=Math.min(100,d/600*100)+"%";
}

function showTab(id,openCond){
 root.querySelectorAll(".tab").forEach(b=>{const s=b.dataset.tab===id;b.setAttribute("aria-selected",s);b.tabIndex=s?0:-1;if(s)b.scrollIntoView({inline:"center",block:"nearest",behavior:"smooth"})});
 root.querySelectorAll(".scp").forEach(p=>p.hidden=p.id!=="pn-"+id);
 if(id==="sum")renderSummary();
 if(openCond){const card=document.getElementById("c-"+openCond);if(card&&!card.classList.contains("open"))card.querySelector(".cond-btn").click();card&&card.scrollIntoView({behavior:"smooth",block:"start"})}
 else root.scrollIntoView({block:"start",behavior:"smooth"});
}
tabsEl.addEventListener("keydown",e=>{
 const tabs=[...tabsEl.querySelectorAll(".tab")],i=tabs.indexOf(document.activeElement);
 if(i<0)return;let n=-1;
 if(e.key==="ArrowRight")n=(i+1)%tabs.length;if(e.key==="ArrowLeft")n=(i-1+tabs.length)%tabs.length;
 if(n>=0){tabs[n].focus();showTab(tabs[n].dataset.tab);e.preventDefault()}
});

/* ---------- summary ---------- */
function renderSummary(){
 const rows=ALL.map(c=>({c,r:evaluate(c)})).filter(x=>x.r.lv>=0).sort((a,b)=>b.r.lv-a.r.lv);
 const w=rows.length?rows[0].r.lv:-1;
 const head=w<0?["Nothing assessed yet","Pick a body system to start."]:
  w===2?["Red: an issue is likely",""]:w===1?["Amber: issues are possible",""]:["Green: no signs",""];
 const p=document.getElementById("pn-sum");
 p.innerHTML=`<div class="ptitle"><h2>Summary</h2></div><p class="pintro">Worst first.</p>
 <div class="sumhead"><div class="overall ${w>=0?"lv"+w:""}"><h3>${head[0]}</h3><p>${head[1]}</p></div>
 <div class="btns"><button class="btn" id="copyBtn">Copy report</button><button class="btn sec2" id="resetBtn">Reset all</button></div></div>
  <div id="copyOut"></div>
 <details class="why pot"><summary>NASA research</summary><div><ul><li><a href="https://www.nasa.gov/reference/tempus-pro/" target="_blank" rel="noopener">Remote diagnosis device (Tempus Pro)</a>: tests a commercial telemedicine device for collecting health data and enabling remote diagnoses.</li></ul><p class="note">Still being tested and not a proven treatment.</p></div></details>`+
 (rows.length?rows.map(({c,r})=>`<div class="sumrow"><span class="pill lv${r.lv}">${LV[r.lv]}</span><div class="t">${c.name}<small>${TABS.find(t=>t.id===c.tab).label} · ${esc(r.notes.join("; "))}</small></div><button data-goto="${c.tab}" data-open="${c.id}">View</button></div>`).join(""):`<div class="empty">Nothing assessed yet.</div>`);
}
function reportText(){
 const rows=ALL.map(c=>({c,r:evaluate(c)})).filter(x=>x.r.lv>=0).sort((a,b)=>b.r.lv-a.r.lv);
 const lines=["ASTRO HEALTH CHECK: crew self-assessment (prototype)",""];
 rows.forEach(({c,r})=>{
  lines.push(`[${LV[r.lv].toUpperCase()}] ${c.name}`);
  r.notes.forEach(n=>lines.push("  - "+n));
  if(c.type!=="phq"){Object.keys(S[c.id].sel).forEach(i=>lines.push(`  - ${c.ind.find(x=>x.id===i).l}: ${S[c.id].sel[i]}/10`))}
 });
 return lines.join("\n");
}
async function copySummary(){
 const txt=reportText(),out=document.getElementById("copyOut");
 try{await navigator.clipboard.writeText(txt);out.innerHTML=`<p class="pintro">Copied to clipboard.</p>`}
 catch(_){out.innerHTML=`<textarea class="copybox" readonly></textarea>`;const ta=out.querySelector("textarea");ta.value=txt;ta.focus();ta.select()}
}
function resetAll(){
 ALL.forEach(c=>{S[c.id]={sel:{},ex:{},phq:Array(9).fill(0),touched:false}});
 root.querySelectorAll(".ind[data-ind]").forEach(r=>{r.classList.remove("on");r.querySelector(".chip").setAttribute("aria-pressed","false")});
 root.querySelectorAll("input[type=number]").forEach(i=>i.value="");
 root.querySelectorAll("input[type=checkbox]").forEach(i=>i.checked=false);
 root.querySelectorAll("[data-exslider]").forEach(i=>{i.value=0;setSlider(i,+i.min,+i.max)});
 root.querySelectorAll("[data-scphq]").forEach(i=>{i.value=0;setSlider(i,0,3);i.parentElement.querySelector("output").textContent="0 · "+PHQ_LAB[0]});
 root.querySelectorAll("[data-gauge] b").forEach(b=>b.style.left="0%");
 ALL.forEach(refresh);renderSummary();
}
const POT={
 sans:[
  {n:"Thigh cuffs",d:"Tight cuffs on the thighs that may keep fluid in the legs and could help prevent space-related eye disorders.",u:"https://www.nasa.gov/reference/thigh-cuff/"},
  {n:"Daily B vitamins (B-Complex study)",d:"Testing whether a daily B vitamin supplement can prevent or lessen brain and eye changes in space.",u:"https://www.nasa.gov/reference/b-complex/"}],
 fluid:[
  {n:"Thigh cuffs",d:"Tight cuffs on the thighs that may keep fluid in the legs.",u:"https://www.nasa.gov/reference/thigh-cuff/"}],
 bone:[
  {n:"Diet, exercise and medication",d:"NASA lists these as the countermeasures under study for bone changes.",u:"https://www.nasa.gov/reference/risk-of-spaceflight-induced-bone-changes/"},
  {n:"Exercise without a treadmill (Zero T2)",d:"Examines exercise in space without a treadmill and its effects on health and performance.",u:"https://www.nasa.gov/reference/zero-t2/"},
  {n:"Enhanced diet (Food Physiology study)",d:"Tests whether an enhanced diet helps astronauts adapt to spaceflight.",u:"https://www.nasa.gov/missions/station/enhanced-diet-may-help-astronauts-adapt-to-spaceflight/"}],
 muscle:[
  {n:"Exercise without a treadmill (Zero T2)",d:"Examines exercise in space without a treadmill and its effects on health and performance.",u:"https://www.nasa.gov/reference/zero-t2/"},
  {n:"Finding the best exercise types",d:"Researchers are studying which exercise types best protect health and spacewalk ability.",u:"https://www.nasa.gov/reference/risk-of-reduced-cardiorespiratory-and-musculoskeletal-fitness/"}],
 iso:[
  {n:"Space gardening",d:"A survey of whether growing fresh vegetables eases isolation and confinement.",u:"https://www.nasa.gov/humans-in-space/can-space-gardening-help-astronauts-cope-with-isolation/"}]
};
// one visible line per check; the full "about" text sits behind "Why?"
const BRIEF={
 sans:"Track near vision, focus and the Amsler grid.",irr:"Floating particles can reach the eye.",
 vitals:"Use seated, rested readings.",ortho:"Try a 3-minute quiet stand.",fluid:"Common when fluid shifts to the head.",
 bone:"Silent, so track exercise and bone pain.",stone:"Calcium from bone passes through the kidneys.",muscle:"Unloaded muscles shrink and weaken.",
 phq:"Answer for the last 2 weeks.",iso:"One of NASA's five spaceflight hazards.",cog:"Poor sleep and CO₂ are common causes.",
 slp:"Enter your average for the last 3 nights.",motion:"Move slowly while the inner ear adjusts.",
 co2:"NASA limit: 3 mmHg (1-hour average).",airway:"Dust stays airborne in microgravity.",
 inf:"A closed cabin shares microbes.",skin:"Equipment, dry air and stress affect skin.",dose:"Enter your total career dose."
};
TABS.forEach(t=>t.conds.forEach(c=>{c.pot=POT[c.id];c.brief=BRIEF[c.id]}));
function potHTML(c){
 if(!c.pot)return "";
 return `<details class="why pot"><summary>NASA research (${c.pot.length})</summary><div><ul>${c.pot.map(x=>`<li><a href="${x.u}" target="_blank" rel="noopener">${x.n}</a>: ${x.d}</li>`).join("")}</ul><p class="note">Still being tested, not proven treatments.</p></div></details>`;
}
window.SC={
 show(tab,cond){showTab(tab,cond)},
 prefill(vals){Object.entries(vals).forEach(([cid,ex])=>{const c=ALL.find(x=>x.id===cid);if(!c)return;Object.entries(ex).forEach(([k,v])=>{S[cid].ex[k]=v;const inp=root.querySelector(`#x-${cid}-${k}`);if(inp)inp.value=v==null?"":v});refresh(c)})},
 refreshAll(){ALL.forEach(refresh)},
 flags(){return ALL.map(c=>({c,r:evaluate(c)})).filter(x=>x.r.lv>=1).sort((a,b)=>b.r.lv-a.r.lv).map(({c,r})=>({name:c.name,lv:r.lv,notes:r.notes}))},
 tabs:TABS.map(t=>({id:t.id,label:t.label,conds:t.conds.map(c=>({id:c.id,name:c.name}))}))
};
build();
root.querySelectorAll("input[type=range]").forEach(i=>setSlider(i,+i.min,+i.max));

})();
