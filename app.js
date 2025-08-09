
console.log("App loaded v2.2.1");
document.addEventListener("DOMContentLoaded", () => {
  const d = new Date();
  const el = document.getElementById("buildDate");
  if (el) el.textContent = d.toLocaleString();
});

function AgeGroupInput(id, label) {
  const groups = [
    { value: "0-1", label: "0–1 year" },
    { value: "2-12", label: "2–12 years" },
    { value: ">12", label: ">12 years" },
  ];
  return { id, type: "agegroup", label, groups };
}

const Dosing = (function() {
  const state = { unit: "kg", weight: null };
  function setUnit(u) { state.unit = u; }
  function setWeight(w) { state.weight = isNaN(w) ? null : Number(w); }
  function toKg() { if (state.weight == null) return null; return state.unit === "kg" ? state.weight : state.weight * 0.45359237; }
  function apapDose() { const kg = toKg(); if (kg == null) return null; return { mgPerDoseLow: Math.round(kg*10), mgPerDoseHigh: Math.round(kg*15) }; }
  function ibuDose() { const kg = toKg(); if (kg == null) return null; return { mgPerDoseLow: Math.round(kg*5), mgPerDoseHigh: Math.round(kg*10) }; }
  function volFor(mg, per5mL) { if (!mg || !per5mL) return null; const mL = (mg/per5mL)*5; return Math.round(mL/2.5)*2.5; }
  return { state, setUnit, setWeight, apapDose, ibuDose, volFor };
})();

const DATA = { ailments: {} };

// COUGH
DATA.ailments.cough = {
  name: "Cough",
  questions: [
    AgeGroupInput("agegrp", "Age group"),
    { id: "duration", type: "select", label: "How long has the cough lasted?", options: ["<1 week","1–3 weeks",">3 weeks"], required: true },
    { id: "productive", type: "select", label: "Is the cough wet/productive?", options: ["Yes","No"], required: true },
    { id: "redflags", type: "multiselect", label: "Any of these red flags?", options: [
      "Shortness of breath or wheezing",
      "Coughing up blood",
      "High fever",
      "Unintentional weight loss"
    ]}
  ],
  recommend: (a) => {
    const refer = []; const notes = []; const recs = []; const nonDrug = [];
    const agegrp = a.agegrp; const duration = a.duration; const productive = a.productive;
    const redflags = a.redflags || [];
    if (redflags.length) refer.push("One or more red flags selected.");
    if (duration === ">3 weeks") refer.push("Cough longer than 3 weeks.");
    if (agegrp === "0-1") notes.push("Avoid OTC cough/cold medicines in children under 4. Use non-drug measures and seek pediatric advice if persistent.");
    nonDrug.push("Hydration, warm fluids, humidified air.");
    nonDrug.push("Throat lozenges (age-appropriate).");
    if (agegrp !== "0-1") nonDrug.push("Honey 1/2–1 tsp as needed (not for <1 year).");
    if (!refer.length && agegrp !== "0-1") {
      if (productive === "Yes") {
        recs.push({ title:"Expectorant (Guaifenesin)", examples:["Mucinex (guaifenesin)"], how:"Take with water; hydration improves effect.", warn:"Stop and seek care if fever, worsening, or >7 days." });
      } else {
        recs.push({ title:"Antitussive (Dextromethorphan)", examples:["Delsym (dextromethorphan ER)"], how:"Use as directed for dry cough.", warn:"Do not use with MAOIs. May cause drowsiness/dizziness. Reassess if >7 days." });
      }
    }
    return { refer, notes, recs, nonDrug, showDosing: false };
  }
};

// HEARTBURN
DATA.ailments.heartburn = {
  name: "Heartburn / Indigestion",
  questions: [
    AgeGroupInput("agegrp", "Age group"),
    { id: "freq", type: "select", label: "How often?", options: ["<2 days/week","≥2 days/week"], required: true },
    { id: "alarm", type: "multiselect", label: "Any alarm symptoms?", options: [
      "Trouble/painful swallowing",
      "Vomiting blood or black stools",
      "Unintentional weight loss",
      "Severe chest pain"
    ]},
    { id: "preg", type: "select", label: "Pregnant?", options: ["No","Yes"]}
  ],
  recommend: (a) => {
    const refer = []; const notes = []; const recs = []; const nonDrug = [];
    const agegrp = a.agegrp; const freq = a.freq; const alarms = a.alarm || []; const preg = a.preg || "No";
    if (alarms.length) refer.push("Alarm symptoms present.");
    nonDrug.push("Avoid trigger foods, smaller meals, avoid late meals, elevate head of bed.");
    if (!alarms.length) {
      if (freq === "<2 days/week") {
        if (preg === "Yes") {
          recs.push({ title:"Antacid (calcium carbonate)", examples:["Tums (calcium carbonate)"], how:"Use as needed.", warn:"If frequent use needed, discuss with provider." });
        } else {
          recs.push({ title:"Antacid or H2RA (famotidine)", examples:["Tums (calcium carbonate)","Pepcid (famotidine)"], how:"Antacid for quick relief; H2RA for longer relief.", warn:"Seek care if symptoms persist >2 weeks." });
        }
      } else {
        if (agegrp === "0-1" || agegrp === "2-12") {
          notes.push("For children, recurring heartburn needs clinician evaluation before OTC PPI use.");
        } else {
          recs.push({ title:"PPI trial (14 days) if no alarm symptoms", examples:["omeprazole 20 mg daily before breakfast"], how:"Take daily for 14 days, not for immediate relief.", warn:"If symptoms persist/return quickly, see provider." });
        }
      }
    }
    return { refer, notes, recs, nonDrug, showDosing: false };
  }
};

// CONSTIPATION
DATA.ailments.constipation = {
  name: "Constipation",
  questions: [
    AgeGroupInput("agegrp", "Age group"),
    { id: "duration", type: "select", label: "How long?", options: ["<1 week","1–3 weeks",">3 weeks"], required: true },
    { id: "features", type: "multiselect", label: "Any of these?", options: [
      "Severe abdominal pain","Vomiting","Blood in stool","Unintentional weight loss","Fever"
    ]},
    { id: "preg", type: "select", label: "Pregnant?", options: ["No","Yes"]}
  ],
  recommend: (a) => {
    const refer = []; const notes = []; const recs = []; const nonDrug = [];
    const agegrp = a.agegrp; const duration = a.duration; const features = a.features || []; const preg = a.preg || "No";
    if (features.includes("Severe abdominal pain")) refer.push("Severe abdominal pain.");
    if (features.includes("Vomiting")) refer.push("Vomiting present.");
    if (features.includes("Blood in stool")) refer.push("Blood in stool.");
    if (features.includes("Unintentional weight loss")) refer.push("Unintentional weight loss.");
    if (duration === ">3 weeks") refer.push("Constipation >3 weeks.");
    nonDrug.push("Increase fluids and dietary fiber (fruits/vegetables/whole grains).");
    nonDrug.push("Consider fiber supplement; regular physical activity.");
    if (agegrp === "0-1") nonDrug.push("For infants: small amounts of water; for >4 months, small amounts of prune/pear juice; discuss with pediatrician.");
    if (!refer.length) {
      if (agegrp === ">12") {
        if (preg === "Yes") {
          recs.push({ title:"Bulk-forming fiber (psyllium)", examples:["Metamucil (psyllium)"], how:"Start low, increase with water to avoid bloating.", warn:"Space from other meds by 2 hours." });
          recs.push({ title:"Stool softener (docusate)", examples:["Colace (docusate sodium)"], how:"Useful for hard, dry stools.", warn:"If ineffective in a few days, discuss alternatives." });
        } else {
          recs.push({ title:"Osmotic laxative (PEG 3350)", examples:["MiraLAX (polyethylene glycol 3350)"], how:"Use as directed with water; may take 1–3 days to work.", warn:"Not for prolonged use without clinician advice." });
          recs.push({ title:"Bulk-forming fiber (psyllium)", examples:["Metamucil (psyllium)"], how:"Start low and increase with plenty of water.", warn:"May cause gas/bloating initially." });
          recs.push({ title:"Stimulant (senna or bisacodyl) — short term", examples:["Senokot (senna)","Dulcolax (bisacodyl)"], how:"Consider if others ineffective for short-term relief.", warn:"Abdominal cramping possible; short courses only." });
        }
      } else if (agegrp === "2-12") {
        notes.push("For children, many laxatives require clinician guidance for dosing/duration.");
        recs.push({ title:"Glycerin suppository (age-appropriate)", examples:["Glycerin pediatric suppository"], how:"May provide quick relief; follow label by age.", warn:"If recurrent constipation, seek pediatric advice." });
        recs.push({ title:"Stool softener (docusate) — if hard stools", examples:["Docusate sodium (check pediatric labeling)"], how:"Use only per label by age/weight.", warn:"Consult pediatrician for ongoing use." });
      } else {
        notes.push("Avoid most OTC laxatives in infants without pediatric guidance.");
        recs.push({ title:"Glycerin suppository (infant) — occasional", examples:["Glycerin infant suppository"], how:"Use only per label and pediatric advice.", warn:"If constipation persists or fever/abdominal distention present, seek care." });
      }
    }
    return { refer, notes, recs, nonDrug, showDosing: false };
  }
};

// FEVER
DATA.ailments.fever = {
  name: "Fever",
  questions: [
    AgeGroupInput("agegrp", "Age group"),
    { id: "temp", type: "select", label: "Highest temperature (°F)", options: ["<100.4","100.4–102.2","102.3–104",">104"], required: true },
    { id: "duration", type: "select", label: "How long?", options: ["<24 hours","1–3 days",">3 days"], required: true },
    { id: "sx", type: "multiselect", label: "Any of these?", options: [
      "Stiff neck","Rash","Severe sore throat or ear pain","Shortness of breath","Dehydration/poor intake","Confusion/lethargy","Recent surgery/chemo/immunosuppression"
    ]}
  ],
  recommend: (a) => {
    const refer = []; const notes = []; const recs = []; const nonDrug = [];
    const agegrp = a.agegrp; const temp = a.temp; const duration = a.duration; const sx = a.sx || [];
    if (sx.length) refer.push("Concerning associated symptoms present.");
    if (temp === ">104") refer.push("Very high fever (>104°F).");
    if (duration === ">3 days") refer.push("Fever >3 days.");
    if (agegrp === "0-1" && (temp === "100.4–102.2" || temp === "102.3–104" || temp === ">104")) {
      notes.push("Infants <3 months with ≥100.4°F require immediate medical evaluation.");
    }
    nonDrug.push("Ensure hydration; light clothing; tepid sponging (avoid cold baths/alcohol rubs).");
    if (!refer.length) {
      if (agegrp === "0-1") {
        recs.push({ title:"Acetaminophen (if ≥3 months)", examples:["Tylenol (acetaminophen) infant"], how:"Use per label by weight; avoid duplicate APAP products.", warn:"If under 3 months with fever ≥100.4°F, seek care immediately." });
        notes.push("Ibuprofen is generally not recommended for <6 months.");
      } else if (agegrp === "2-12") {
        recs.push({ title:"Acetaminophen", examples:["Tylenol (acetaminophen)"], how:"Use per label by weight (mg/kg).", warn:"Do not exceed max daily dose; check combination products." });
        recs.push({ title:"Ibuprofen (≥6 months)", examples:["Advil/Motrin (ibuprofen)"], how:"Use per label by weight (mg/kg) with food if stomach upset.", warn:"Avoid if dehydration, vomiting, or history of ulcers/kidney issues." });
      } else {
        recs.push({ title:"Acetaminophen", examples:["Tylenol (acetaminophen)"], how:"Use as directed; avoid exceeding 3,000–4,000 mg/day depending on label/health status.", warn:"Avoid alcohol; liver disease risk." });
        recs.push({ title:"Ibuprofen", examples:["Advil/Motrin (ibuprofen)"], how:"Use as directed with food if GI upset.", warn:"Avoid if history of ulcers, kidney disease, or late pregnancy." });
      }
    }
    return { refer, notes, recs, nonDrug, showDosing: true };
  }
};

// ALLERGIC RHINITIS
DATA.ailments.allergic_rhinitis = {
  name: "Allergic Rhinitis",
  questions: [
    AgeGroupInput("agegrp", "Age group"),
    { id: "severity", type: "select", label: "How bad are symptoms?", options: ["Mild (not daily life-limiting)","Moderate/Severe (affects sleep/daily life)"], required: true },
    { id: "symptoms", type: "multiselect", label: "Main symptoms", options: [
      "Sneezing/itching","Rhinorrhea (runny nose)","Nasal congestion","Ocular symptoms (itchy/watery eyes)"
    ]}
  ],
  recommend: (a) => {
    const refer = []; const notes = []; const recs = []; const nonDrug = [];
    const agegrp = a.agegrp; const severity = a.severity; const symptoms = a.symptoms || [];
    nonDrug.push("Avoid triggers when possible; saline nasal irrigation.");
    if (!agegrp) notes.push("Select an age group for age-appropriate options.");
    if (agegrp === "0-1") { notes.push("For infants, prioritize saline spray and pediatric evaluation for ongoing symptoms."); return { refer, notes, recs, nonDrug, showDosing:false }; }
    const wantsEyes = symptoms.includes("Ocular symptoms (itchy/watery eyes)");
    const hasCongestion = symptoms.includes("Nasal congestion");
    if (severity === "Moderate/Severe (affects sleep/daily life)" || hasCongestion) {
      recs.push({ title:"Intranasal corticosteroid (INCS)", examples:["Flonase (fluticasone)","Rhinocort (budesonide)","Nasacort (triamcinolone)"], how:"Daily, proper technique; onset within hours, peak in several days.", warn:"Minor nosebleeds/irritation possible; aim away from septum." });
      if (wantsEyes) recs.push({ title:"Add oral non-sedating antihistamine for eyes", examples:["cetirizine","loratadine","fexofenadine"], how:"Once daily as needed.", warn:"May cause mild drowsiness (cetirizine > loratadine/fexofenadine)." });
    } else {
      recs.push({ title:"Oral non-sedating antihistamine", examples:["cetirizine","loratadine","fexofenadine"], how:"Once daily for itching/sneezing/runny nose.", warn:"Less effective for congestion alone; consider INCS if congestion predominant." });
      if (wantsEyes) recs.push({ title:"Ophthalmic antihistamine", examples:["ketotifen eye drops"], how:"Use per label; avoids systemic sedation.", warn:"Remove contacts before use." });
    }
    return { refer, notes, recs, nonDrug, showDosing:false };
  }
};

// NASAL CONGESTION
DATA.ailments.nasal_congestion = {
  name: "Nasal Congestion",
  questions: [
    AgeGroupInput("agegrp", "Age group"),
    { id: "duration", type: "select", label: "How long?", options: ["<1 week","1–3 weeks",">3 weeks"], required: true },
    { id: "conditions", type: "multiselect", label: "Any of these conditions?", options: [
      "Uncontrolled hypertension","Heart disease","Thyroid disease","Diabetes","MAOI use (or within 14 days)"
    ]}
  ],
  recommend: (a) => {
    const refer = []; const notes = []; const recs = []; const nonDrug = [];
    const agegrp = a.agegrp; const duration = a.duration; const conditions = a.conditions || [];
    nonDrug.push("Saline irrigation/spray; humidified air.");
    if (duration === ">3 weeks") refer.push("Persistent symptoms >3 weeks.");
    const risky = (label) => conditions.includes(label);
    if (agegrp === "0-1") { notes.push("For infants: use saline spray and nasal suction; avoid decongestants."); return { refer, notes, recs, nonDrug, showDosing:false }; }
    recs.push({ title:"Topical decongestant (short-term)", examples:["Oxymetazoline 0.05% (Afrin)"], how:"Up to 2–3 days only to avoid rebound congestion.", warn:"Do not exceed 3 days. Avoid in children <6 unless label allows and clinician advises." });
    if (!(risky("Uncontrolled hypertension") || risky("Heart disease") || risky("Thyroid disease") || risky("Diabetes") || risky("MAOI use (or within 14 days)"))) {
      recs.push({ title:"Oral decongestant", examples:["pseudoephedrine (behind-the-counter)","phenylephrine"], how:"Use during the day; can cause insomnia/jitteriness.", warn:"Avoid late evening. Consider BP monitoring in hypertensive patients." });
    } else {
      notes.push("Oral decongestants may be inappropriate with selected conditions—consider intranasal steroid for ongoing congestion.");
    }
    recs.push({ title:"Intranasal corticosteroid (INCS)", examples:["Flonase (fluticasone)","Rhinocort (budesonide)","Nasacort (triamcinolone)"], how:"Daily use, proper technique; not an immediate decongestant but helpful over days.", warn:"Nasal irritation possible; aim away from septum." });
    return { refer, notes, recs, nonDrug, showDosing:false };
  }
};

// SORE THROAT
DATA.ailments.sore_throat = {
  name: "Sore Throat",
  questions: [
    AgeGroupInput("agegrp", "Age group"),
    { id: "duration", type: "select", label: "How long?", options: ["<3 days","3–7 days",">7 days"], required: true },
    { id: "redflags", type: "multiselect", label: "Any of these red flags?", options: [
      "Drooling or trouble swallowing","Inability to open mouth (trismus)","High fever","Rash","Stiff neck","Severe one-sided throat pain/swelling"
    ]}
  ],
  recommend: (a) => {
    const refer = []; const notes = []; const recs = []; const nonDrug = [];
    const agegrp = a.agegrp; const duration = a.duration; const red = a.redflags || [];
    if (red.length) refer.push("Red flag symptoms present.");
    if (duration === ">7 days") refer.push("Sore throat lasting >7 days.");
    nonDrug.push("Warm saline gargles; hydration; rest; humidified air.");
    if (!refer.length) {
      recs.push({ title:"Lozenges/sprays (age-appropriate)", examples:["benzocaine/menthol lozenges","phenol spray"], how:"Use as directed for temporary relief.", warn:"Avoid strong local anesthetics in children <2 years." });
      if (agegrp !== "0-1") {
        recs.push({ title:"Systemic analgesic", examples:["acetaminophen","ibuprofen (≥6 months)"], how:"Use per label; see dosing calculator under Fever for weight-based dosing.", warn:"Avoid ibuprofen in dehydration/ulcer risk; avoid duplicate APAP." });
      }
      notes.push("If classic strep signs (sudden severe sore throat, fever, no cough, tender anterior nodes), seek testing.");
    }
    return { refer, notes, recs, nonDrug, showDosing:false };
  }
};

// DIARRHEA
DATA.ailments.diarrhea = {
  name: "Diarrhea",
  questions: [
    AgeGroupInput("agegrp", "Age group"),
    { id: "duration", type: "select", label: "How long?", options: ["<1 day","1–3 days",">3 days"], required: true },
    { id: "features", type: "multiselect", label: "Any of these?", options: [
      "Blood or black stools","Fever","Severe abdominal pain","Signs of dehydration (very low urine, dizziness)","Recent antibiotic use","Traveler's diarrhea"
    ]},
    { id: "preg", type: "select", label: "Pregnant?", options: ["No","Yes"]}
  ],
  recommend: (a) => {
    const refer = []; const notes = []; const recs = []; const nonDrug = [];
    const agegrp = a.agegrp; const duration = a.duration; const features = a.features || []; const preg = a.preg || "No";
    if (features.includes("Blood or black stools")) refer.push("Bloody or black stools.");
    if (features.includes("Severe abdominal pain")) refer.push("Severe abdominal pain.");
    if (features.includes("Signs of dehydration (very low urine, dizziness)")) refer.push("Dehydration signs.");
    if (duration === ">3 days") refer.push("Diarrhea >3 days.");
    nonDrug.push("Oral rehydration solution (ORS) is first-line for all ages; small, frequent sips.");
    nonDrug.push("Avoid high-sugar drinks; consider BRAT elements but resume balanced diet as tolerated.");
    if (!refer.length) {
      if (agegrp === ">12") {
        // Adults
        if (!features.includes("Blood or black stools") && !features.includes("Fever")) {
          recs.push({ title:"Loperamide (symptomatic relief)", examples:["Imodium (loperamide)"], how:"Use per label for non-bloody, afebrile acute diarrhea.", warn:"Do not use if bloody stool or high fever." });
        }
        recs.push({ title:"Bismuth subsalicylate (if appropriate)", examples:["Pepto-Bismol (bismuth subsalicylate)"], how:"Use per label for mild diarrhea/nausea.", warn:"Avoid in pregnancy, aspirin allergy, anticoagulant use; Reye’s risk in children/teens recovering from viral illness." });
        if (features.includes("Traveler's diarrhea")) notes.push("Traveler’s diarrhea often self-limited; ORS first. Persistent/severe cases need medical guidance.");
      } else if (agegrp === "2-12") {
        notes.push("Children: prioritize ORS and clinician guidance. OTC antidiarrheals are generally not recommended without advice.");
        recs.push({ title:"Zinc (short course) — optional", examples:["per local guidance"], how:"Some guidelines suggest zinc for children; follow clinician advice.", warn:"Dosing varies; consult pediatrician." });
      } else {
        // 0-1
        notes.push("Infants: ORS only and urgent pediatric advice for ongoing symptoms.");
      }
    }
    return { refer, notes, recs, nonDrug, showDosing:false };
  }
};

// ---- DOM ----
const $ailment = document.getElementById('ailment');
const $questions = document.getElementById('questions');
const $result = document.getElementById('result');
const $printBtn = document.getElementById('printBtn');
const $resetBtn = document.getElementById('resetBtn');
const $modal = document.getElementById('dosingModal');
const $closeModal = document.getElementById('closeModal');
const $unitChips = document.getElementById('unitChips');
const $weightInput = document.getElementById('weightInput');
const $unitHint = document.getElementById('unitHint');
const $apapDoses = document.getElementById('apapDoses');
const $ibuDoses = document.getElementById('ibuDoses');

function init() {
  try {
    populateDropdown();
  } catch (e) {
    console.error("Dropdown population failed, injecting fallback:", e);
    fallbackDropdown();
  }
  $ailment.addEventListener('change', renderQuestions);
  $printBtn.addEventListener('click', () => window.print());
  $resetBtn.addEventListener('click', () => { renderQuestions(true); $result.innerHTML = ''; });

  if ($closeModal) $closeModal.addEventListener('click', hideModal);
  if ($unitChips) $unitChips.querySelectorAll('.chip').forEach(chip => {
    chip.addEventListener('click', () => {
      $unitChips.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      Dosing.setUnit(chip.dataset.value);
      if ($unitHint) $unitHint.textContent = "Using " + (chip.dataset.value === "kg" ? "kilograms (kg)" : "pounds (lb)");
      recalcDoses();
    });
  });
  if ($weightInput) $weightInput.addEventListener('input', () => { Dosing.setWeight($weightInput.value); recalcDoses(); });

  renderQuestions();
}

function populateDropdown() {
  $ailment.innerHTML = "";
  Object.entries(DATA.ailments).forEach(([key, obj]) => {
    const opt = document.createElement('option');
    opt.value = key; opt.textContent = obj.name; $ailment.appendChild(opt);
  });
  if (!$ailment.value && $ailment.options.length) $ailment.value = $ailment.options[0].value;
}

function fallbackDropdown() {
  const fallback = [
    ["fever","Fever"],
    ["cough","Cough"],
    ["heartburn","Heartburn / Indigestion"],
    ["constipation","Constipation"],
    ["allergic_rhinitis","Allergic Rhinitis"],
    ["nasal_congestion","Nasal Congestion"],
    ["sore_throat","Sore Throat"],
    ["diarrhea","Diarrhea"]
  ];
  $ailment.innerHTML = "";
  fallback.forEach(([v,t]) => { const o=document.createElement('option'); o.value=v; o.textContent=t; $ailment.appendChild(o); });
  if (!$ailment.value && $ailment.options.length) $ailment.value = $ailment.options[0].value;
}

function renderQuestions(reset = false) {
  const aKey = $ailment.value || Object.keys(DATA.ailments)[0];
  const a = DATA.ailments[aKey];
  const form = document.createElement('form'); form.id='intakeForm';
  const title = document.createElement('div'); title.className='title'; title.textContent = (a ? a.name : "Ailment") + ' — Intake';
  form.appendChild(title); form.appendChild(document.createElement('hr'));

  const qs = a ? a.questions : [];
  qs.forEach(q => {
    const wrap = document.createElement('div');
    const label = document.createElement('label');
    label.htmlFor = q.id; label.textContent = q.label + (q.required ? ' *' : ''); wrap.appendChild(label);
    let input;
    if (q.type === 'agegroup') {
      input = document.createElement('div'); input.className='chip-group';
      q.groups.forEach(g => {
        const chip = document.createElement('div'); chip.className='chip'; chip.textContent=g.label; chip.dataset.value=g.value;
        chip.addEventListener('click', () => { input.querySelectorAll('.chip').forEach(c=>c.classList.remove('active')); chip.classList.add('active'); input.dataset.selected = g.value; });
        input.appendChild(chip);
      });
    } else if (q.type === 'number') {
      input = document.createElement('input'); input.type='number'; input.min = q.min ?? 0; input.max = q.max ?? 999;
    } else if (q.type === 'select') {
      input = document.createElement('select'); q.options.forEach(o => { const opt=document.createElement('option'); opt.value=o; opt.textContent=o; input.appendChild(opt); });
    } else if (q.type === 'multiselect') {
      input = document.createElement('div'); input.className='multi';
      q.options.forEach((o, idx) => { const lab=document.createElement('label'); const cb=document.createElement('input'); cb.type='checkbox'; cb.value=o; cb.id=q.id+'_'+idx; lab.appendChild(cb); lab.appendChild(document.createTextNode(o)); input.appendChild(lab); });
    }
    input.id = q.id; wrap.appendChild(input); form.appendChild(wrap);
  });

  const actions = document.createElement('div'); actions.className='row no-print';
  const go=document.createElement('button'); go.className='btn btn-primary'; go.type='submit'; go.textContent='Get Recommendation';
  actions.appendChild(go);
  if (a && a.recommend({}).showDosing) {
    const dosingBtn = document.createElement('button'); dosingBtn.type='button'; dosingBtn.className='btn btn-ghost'; dosingBtn.textContent='Open Dosing Calculator'; dosingBtn.addEventListener('click', showModal); actions.appendChild(dosingBtn);
  }
  form.appendChild(document.createElement('hr')); form.appendChild(actions);

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const answers = getAnswers(qs);
    const result = a ? a.recommend(answers) : { refer:[], notes:[], recs:[], nonDrug:[], showDosing:false };
    renderResult({ aName: a ? a.name : "Ailment", ...result });
  });

  const qWrap = document.getElementById('questions');
  qWrap.innerHTML = ''; qWrap.appendChild(form);
  if (reset) window.scrollTo({ top: 0, behavior: 'smooth' });
}

function getAnswers(questions) {
  const out={};
  questions.forEach(q => {
    const el = document.getElementById(q.id); if (!el) return;
    if (q.type === 'multiselect') { const checks = el.querySelectorAll('input[type="checkbox"]'); out[q.id] = Array.from(checks).filter(c=>c.checked).map(c=>c.value); }
    else if (q.type === 'agegroup') { out[q.id] = el.dataset.selected || null; }
    else if (q.type === 'number') { out[q.id] = el.value; }
    else { out[q.id] = el.value; }
  });
  return out;
}

function renderResult({ aName, refer, notes, recs, nonDrug, showDosing }) {
  const box = document.createElement('div');
  const title = document.createElement('div'); title.className='title'; title.textContent = aName + ' — Recommendation'; box.appendChild(title);
  box.appendChild(document.createElement('hr'));

  if (refer.length) { const p=document.createElement('p'); p.innerHTML = `<span class="danger">Refer to clinician/urgent care:</span>`; box.appendChild(p); const ul=document.createElement('ul'); refer.forEach(r=>{ const li=document.createElement('li'); li.textContent=r; ul.appendChild(li); }); box.appendChild(ul); }
  if (recs.length) { const p=document.createElement('p'); p.innerHTML = `<span class="ok">OTC options:</span>`; box.appendChild(p);
    recs.forEach(r => { const d=document.createElement('div'); d.className='dose-card'; d.innerHTML = `<div><span class="pill">${r.title}</span></div><div class="muted">Examples: ${("examples" in r && r.examples.length ? r.examples.join(", ") : "—")}</div><div>How: ${r.how || "—"}</div><div class="muted">Notes: ${r.warn || "—"}</div>`; box.appendChild(d); });
  }
  if (nonDrug.length) { const p=document.createElement('p'); p.innerHTML = `<strong>Non-drug measures:</strong>`; box.appendChild(p); const ul=document.createElement('ul'); nonDrug.forEach(n=>{ const li=document.createElement('li'); li.textContent=n; ul.appendChild(li); }); box.appendChild(ul); }
  if (notes.length) { const n=document.createElement('div'); n.className='note'; n.innerHTML = `<strong>Important:</strong> ${notes.join(' ')}`; box.appendChild(n); }
  if (showDosing) { const wrap=document.createElement('div'); wrap.style.marginTop='10px'; const btn=document.createElement('button'); btn.className='btn btn-ghost'; btn.type='button'; btn.textContent='Open Dosing Calculator'; btn.addEventListener('click', showModal); wrap.appendChild(btn); box.appendChild(wrap); }

  const res = document.getElementById('result'); res.innerHTML=''; res.appendChild(box);
  window.scrollTo({ top: res.offsetTop - 10, behavior: 'smooth' });
}

function showModal(){ const m=document.getElementById('dosingModal'); if (m){ m.hidden=false; recalcDoses(); } }
function hideModal(){ const m=document.getElementById('dosingModal'); if (m) m.hidden=true; }

function recalcDoses(){
  const ap = document.getElementById('apapDoses'); const ib = document.getElementById('ibuDoses');
  if (!ap || !ib) return;
  ap.innerHTML=''; ib.innerHTML='';
  const apap=Dosing.apapDose(); const ibu=Dosing.ibuDose();
  const apCard=document.createElement('div'); apCard.className='dose-card';
  if (apap){ const vL=Dosing.volFor(apap.mgPerDoseLow,160); const vH=Dosing.volFor(apap.mgPerDoseHigh,160); apCard.innerHTML = `<div><strong>${apap.mgPerDoseLow}–${apap.mgPerDoseHigh} mg per dose</strong> every 4–6 hours</div><div class="muted">At 160 mg/5 mL: ~${vL ?? "—"}–${vH ?? "—"} mL per dose</div>`; } else { apCard.textContent='Enter weight to calculate dose.'; }
  ap.appendChild(apCard);
  const ibCard=document.createElement('div'); ibCard.className='dose-card';
  if (ibu){ const vL=Dosing.volFor(ibu.mgPerDoseLow,100); const vH=Dosing.volFor(ibu.mgPerDoseHigh,100); ibCard.innerHTML = `<div><strong>${ibu.mgPerDoseLow}–${ibu.mgPerDoseHigh} mg per dose</strong> every 6–8 hours</div><div class="muted">At 100 mg/5 mL: ~${vL ?? "—"}–${vH ?? "—"} mL per dose</div>`; } else { ibCard.textContent='Enter weight to calculate dose.'; }
  ib.appendChild(ibCard);
}

document.addEventListener('click', (e)=>{ if (e.target && e.target.id === 'dosingModal') hideModal(); });
document.addEventListener('keydown', (e)=>{ if (e.key === 'Escape') hideModal(); });

// INIT
init();
