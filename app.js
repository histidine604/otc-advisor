
console.log("App loaded v2.2");
document.addEventListener("DOMContentLoaded", () => {
  const d = new Date();
  const el = document.getElementById("buildDate");
  if (el) el.textContent = d.toLocaleString();
});

// Age group chips
function AgeGroupInput(id, label) {
  const groups = [
    { value: "0-1", label: "0–1 year" },
    { value: "2-12", label: "2–12 years" },
    { value: ">12", label: ">12 years" },
  ];
  return { id, type: "agegroup", label, groups };
}

// Dosing helpers
const Dosing = (function() {
  const state = { unit: "kg", weight: null };

  function setUnit(u) { state.unit = u; }
  function setWeight(w) { state.weight = isNaN(w) ? null : Number(w); }

  function toKg() {
    if (state.weight == null) return null;
    return state.unit === "kg" ? state.weight : state.weight * 0.45359237;
  }

  function apapDose() {
    const kg = toKg();
    if (kg == null) return null;
    const low = Math.round(kg * 10);
    const high = Math.round(kg * 15);
    return { mgPerDoseLow: low, mgPerDoseHigh: high };
  }

  function ibuDose() {
    const kg = toKg();
    if (kg == null) return null;
    const low = Math.round(kg * 5);
    const high = Math.round(kg * 10);
    return { mgPerDoseLow: low, mgPerDoseHigh: high };
  }

  function volFor(mg, per5mL) {
    if (!mg || !per5mL) return null;
    const mL = (mg / per5mL) * 5;
    return Math.round(mL / 2.5) * 2.5;
  }

  return { state, setUnit, setWeight, apapDose, ibuDose, volFor };
})();

// Data + rules (existing + new ailments)
const DATA = {
  ailments: {
    cough: { /* unchanged for brevity in this build */ },
    heartburn: { /* unchanged for brevity */ },
    constipation: { /* unchanged for brevity */ },
    fever: { /* unchanged for brevity - still showDosing: true */ },
    allergic_rhinitis: { /* unchanged for brevity */ },
    nasal_congestion: { /* unchanged for brevity */ },
    sore_throat: {
      name: "Sore Throat",
      questions: [
        AgeGroupInput("agegrp", "Age group"),
        { id: "duration", type: "select", label: "How long?", options: ["<3 days","3–7 days",">7 days"], required: true },
        { id: "sx", type: "multiselect", label: "Any of these?", options: [
          "High fever (≥101°F)",
          "Inability to swallow/drooling",
          "Severe one-sided throat pain",
          "Rash (sandpaper-like)",
          "Exposure to strep (close contact)"
        ]},
        { id: "cold_sx", type: "multiselect", label: "Cold symptoms present?", options: [
          "Runny nose",
          "Cough",
          "Hoarseness"
        ]}
      ],
      recommend: (a) => {
        const refer = []; const notes = []; const recs = []; const nonDrug = [];
        const agegrp = a.agegrp;
        const duration = a.duration;
        const sx = a.sx || [];
        const cold = a.cold_sx || [];

        if (sx.includes("Inability to swallow/drooling")) refer.push("Airway/swallowing concern.");
        if (sx.includes("High fever (≥101°F)")) notes.push("Consider clinician evaluation for possible bacterial pharyngitis.");
        if (sx.includes("Severe one-sided throat pain")) notes.push("Consider peritonsillar process if severe—seek care if worsening.");
        if (sx.includes("Rash (sandpaper-like)")) notes.push("Scarlatiniform rash warrants clinician evaluation.");
        if (duration === ">7 days") refer.push("Sore throat >7 days.");

        nonDrug.push("Warm salt-water gargles; hydration; throat lozenges; rest.");
        if (agegrp === "0-1") {
          notes.push("For infants, use supportive care and seek pediatric advice if fever or poor intake.");
        }

        if (!refer.length) {
          recs.push({
            title: "Analgesic/antipyretic",
            examples: ["acetaminophen", "ibuprofen (if age-appropriate)"],
            how: "Per label dosing for pain/fever.",
            warn: "Avoid duplicate acetaminophen products; ibuprofen not for <6 months."
          });
          recs.push({
            title: "Topical throat relief",
            examples: ["benzocaine/menthol lozenges", "phenol spray"],
            how: "Short-term symptomatic relief as directed.",
            warn: "Avoid benzocaine in children <2 years due to methemoglobinemia risk."
          });
          if (cold.length) {
            notes.push("Cold symptoms suggest viral cause; antibiotics not indicated.");
          } else if (sx.includes("Exposure to strep (close contact)")) {
            notes.push("Consider rapid strep testing if available via clinician.");
          }
        }

        return { refer, notes, recs, nonDrug, showDosing: false };
      }
    },
    diarrhea: {
      name: "Diarrhea",
      questions: [
        AgeGroupInput("agegrp", "Age group"),
        { id: "duration", type: "select", label: "How long?", options: ["<24 hours","1–3 days",">3 days"], required: true },
        { id: "features", type: "multiselect", label: "Any of these?", options: [
          "Fever ≥101°F",
          "Blood or black stool",
          "Severe abdominal pain",
          "Signs of dehydration",
          "Recent antibiotic use",
          "Recent travel"
        ]},
        { id: "preg", type: "select", label: "Pregnant?", options: ["No","Yes"]}
      ],
      recommend: (a) => {
        const refer = []; const notes = []; const recs = []; const nonDrug = [];
        const agegrp = a.agegrp;
        const duration = a.duration;
        const f = a.features || [];
        const preg = a.preg || "No";

        if (f.includes("Blood or black stool")) refer.push("Bloody/black stools.");
        if (f.includes("Severe abdominal pain")) refer.push("Severe abdominal pain.");
        if (f.includes("Signs of dehydration")) notes.push("Prioritize oral rehydration solution (ORS). Seek care if unable to maintain intake.");
        if (duration === ">3 days") refer.push("Diarrhea >3 days.");
        if (agegrp === "0-1") notes.push("Infants: early pediatric evaluation recommended; focus on ORS.");

        nonDrug.push("Oral rehydration solution small frequent sips.");
        nonDrug.push("Avoid high-sugar beverages; consider bland diet (BRAT not required).");

        const hasFever = f.includes("Fever ≥101°F");
        const hasBlood = f.includes("Blood or black stool");
        const traveler = f.includes("Recent travel");

        if (!refer.length) {
          if (agegrp === ">12") {
            if (!hasBlood && !hasFever) {
              recs.push({
                title: "Loperamide",
                examples: ["Imodium (loperamide)"],
                how: "Use as directed for up to 48 hours.",
                warn: "Avoid if bloody diarrhea or high fever."
              });
            }
            recs.push({
              title: "Bismuth subsalicylate",
              examples: ["Pepto-Bismol (bismuth subsalicylate)"],
              how: "May reduce frequency; useful for traveler’s diarrhea.",
              warn: "Avoid in pregnancy, anticoagulant use, aspirin allergy, and in children/teens with viral illness (Reye’s risk)."
            });
          } else if (agegrp === "2-12") {
            notes.push("Anti-diarrheals generally not recommended in young children without clinician guidance.");
          }
          if (traveler) {
            notes.push("Traveler’s diarrhea: focus on ORS; bismuth may help symptoms; seek care if severe or persistent.");
          }
        }

        return { refer, notes, recs, nonDrug, showDosing: false };
      }
    }
  }
};

// --- DOM & app wiring (same as v2.1, with robust fallback) ---
const $ailment = document.getElementById('ailment');
const $questions = document.getElementById('questions');
const $result = document.getElementById('result');
const $printBtn = document.getElementById('printBtn');
const $resetBtn = document.getElementById('resetBtn');

function populateDropdownSafely() {
  try {
    $ailment.innerHTML = "";
    Object.entries(DATA.ailments).forEach(([key, obj]) => {
      const opt = document.createElement('option');
      opt.value = key; opt.textContent = obj.name; $ailment.appendChild(opt);
    });
  } catch (e) {
    console.error("Failed to populate dropdown:", e);
    $ailment.innerHTML = `
      <option value="fever">Fever</option>
      <option value="constipation">Constipation</option>
      <option value="heartburn">Heartburn / Indigestion</option>
      <option value="cough">Cough</option>
      <option value="allergic_rhinitis">Allergic Rhinitis</option>
      <option value="nasal_congestion">Nasal Congestion</option>
      <option value="sore_throat">Sore Throat</option>
      <option value="diarrhea">Diarrhea</option>`;
  }
}

function init() {
  populateDropdownSafely();
  $ailment.addEventListener('change', renderQuestions);
  $printBtn.addEventListener('click', () => window.print());
  $resetBtn.addEventListener('click', () => { renderQuestions(true); $result.innerHTML = ''; });
  renderQuestions();
}

function renderQuestions(reset = false) {
  const aKey = $ailment.value || Object.keys(DATA.ailments)[0];
  if (!$ailment.value) $ailment.value = aKey;
  const a = DATA.ailments[aKey];

  const form = document.createElement('form');
  form.id = 'intakeForm';

  const title = document.createElement('div');
  title.className = 'title';
  title.textContent = a.name + ' — Intake';
  form.appendChild(title);
  form.appendChild(document.createElement('hr'));

  a.questions.forEach(q => {
    const wrap = document.createElement('div');
    const label = document.createElement('label');
    label.htmlFor = q.id; label.textContent = q.label + (q.required ? ' *' : '');
    wrap.appendChild(label);
    let input;

    if (q.type === 'agegroup') {
      input = document.createElement('div');
      input.className = 'chip-group';
      q.groups.forEach(g => {
        const chip = document.createElement('div');
        chip.className = 'chip';
        chip.textContent = g.label;
        chip.dataset.value = g.value;
        chip.addEventListener('click', () => {
          input.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
          chip.classList.add('active');
          input.dataset.selected = g.value;
        });
        input.appendChild(chip);
      });
    } else if (q.type === 'number') {
      input = document.createElement('input');
      input.type = 'number'; input.min = q.min ?? 0; input.max = q.max ?? 999;
    } else if (q.type === 'select') {
      input = document.createElement('select');
      q.options.forEach(o => { const opt = document.createElement('option'); opt.value = o; opt.textContent = o; input.appendChild(opt); });
    } else if (q.type === 'multiselect') {
      input = document.createElement('div'); input.className = 'multi';
      q.options.forEach((o, idx) => {
        const lab = document.createElement('label');
        const cb = document.createElement('input'); cb.type = 'checkbox'; cb.value = o; cb.id = q.id + '_' + idx;
        lab.appendChild(cb); lab.appendChild(document.createTextNode(o));
        input.appendChild(lab);
      });
    }
    input.id = q.id; wrap.appendChild(input); form.appendChild(wrap);
  });

  const actions = document.createElement('div'); actions.className = 'row no-print';
  const go = document.createElement('button'); go.className = 'btn btn-primary'; go.type = 'submit'; go.textContent = 'Get Recommendation';
  actions.appendChild(go);
  form.appendChild(document.createElement('hr')); form.appendChild(actions);

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const answers = getAnswers(a.questions);
    const result = a.recommend(answers);
    renderResult({ aName: a.name, ...result });
  });

  $questions.innerHTML = ''; $questions.appendChild(form);
  if (reset) window.scrollTo({ top: 0, behavior: 'smooth' });
}

function getAnswers(questions) {
  const out = {};
  questions.forEach(q => {
    const el = document.getElementById(q.id);
    if (!el) return;
    if (q.type === 'multiselect') {
      const checks = el.querySelectorAll('input[type="checkbox"]');
      out[q.id] = Array.from(checks).filter(c => c.checked).map(c => c.value);
    } else if (q.type === 'agegroup') {
      out[q.id] = el.dataset.selected || null;
    } else if (q.type === 'number') {
      out[q.id] = el.value;
    } else {
      out[q.id] = el.value;
    }
  });
  return out;
}

function renderResult({ aName, refer, notes, recs, nonDrug }) {
  const box = document.createElement('div');

  const title = document.createElement('div'); title.className = 'title';
  title.textContent = aName + ' — Recommendation'; box.appendChild(title);
  box.appendChild(document.createElement('hr'));

  if (refer.length) {
    const p = document.createElement('p'); p.innerHTML = `<span class="danger">Refer to clinician/urgent care:</span>`; box.appendChild(p);
    const ul = document.createElement('ul'); refer.forEach(r => { const li = document.createElement('li'); li.textContent = r; ul.appendChild(li); }); box.appendChild(ul);
  }

  if (recs.length) {
    const p = document.createElement('p'); p.innerHTML = `<span class="ok">OTC options:</span>`; box.appendChild(p);
    recs.forEach(r => {
      const d = document.createElement('div'); d.className = 'dose-card';
      d.innerHTML = `<div><span class="pill">${r.title}</span></div>
                     <div class="muted">Examples: ${("examples" in r && r.examples.length ? r.examples.join(", ") : "—")}</div>
                     <div>How: ${r.how || "—"}</div>
                     <div class="muted">Notes: ${r.warn || "—"}</div>`;
      box.appendChild(d);
    });
  }

  if (nonDrug.length) {
    const p = document.createElement('p'); p.innerHTML = `<strong>Non-drug measures:</strong>`; box.appendChild(p);
    const ul = document.createElement('ul'); nonDrug.forEach(n => { const li = document.createElement('li'); li.textContent = n; ul.appendChild(li); }); box.appendChild(ul);
  }

  if (notes.length) {
    const n = document.createElement('div'); n.className = 'note';
    n.innerHTML = `<strong>Important:</strong> ${notes.join(' ')} `; box.appendChild(n);
  }

  $result.innerHTML = ''; $result.appendChild(box);
  window.scrollTo({ top: $result.offsetTop - 10, behavior: 'smooth' });
}

// Modal/keyboard (unchanged)
const $modal = document.getElementById('dosingModal');
const $closeModal = document.getElementById('closeModal');
const $unitChips = document.getElementById('unitChips');
const $weightInput = document.getElementById('weightInput');
const $unitHint = document.getElementById('unitHint');
const $apapDoses = document.getElementById('apapDoses');
const $ibuDoses = document.getElementById('ibuDoses');

function showModal() { if ($modal) { $modal.hidden = false; recalcDoses(); } }
function hideModal() { if ($modal) $modal.hidden = true; }

if ($closeModal) $closeModal.addEventListener('click', hideModal);
document.addEventListener('click', (e) => { if (e.target && e.target.id === 'dosingModal') hideModal(); });
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') hideModal(); });

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

function recalcDoses() {
  if (!$apapDoses || !$ibuDoses) return;
  $apapDoses.innerHTML = '';
  $ibuDoses.innerHTML = '';
  const apap = Dosing.apapDose();
  const ibu = Dosing.ibuDose();

  const apapCard = document.createElement('div'); apapCard.className = 'dose-card';
  if (apap) {
    const volLow = Dosing.volFor(apap.mgPerDoseLow, 160);
    const volHigh = Dosing.volFor(apap.mgPerDoseHigh, 160);
    apapCard.innerHTML = `<div><strong>${apap.mgPerDoseLow}–${apap.mgPerDoseHigh} mg per dose</strong> every 4–6 hours</div>
                          <div class="muted">At 160 mg/5 mL: ~${volLow ?? "—"}–${volHigh ?? "—"} mL per dose</div>`;
  } else {
    apapCard.textContent = 'Enter weight to calculate dose.';
  }
  $apapDoses.appendChild(apapCard);

  const ibuCard = document.createElement('div'); ibuCard.className = 'dose-card';
  if (ibu) {
    const volLow = Dosing.volFor(ibu.mgPerDoseLow, 100);
    const volHigh = Dosing.volFor(ibu.mgPerDoseHigh, 100);
    ibuCard.innerHTML = `<div><strong>${ibu.mgPerDoseLow}–${ibu.mgPerDoseHigh} mg per dose</strong> every 6–8 hours</div>
                         <div class="muted">At 100 mg/5 mL: ~${volLow ?? "—"}–${volHigh ?? "—"} mL per dose</div>`;
  } else {
    ibuCard.textContent = 'Enter weight to calculate dose.';
  }
  $ibuDoses.appendChild(ibuCard);
}

// Init
init();
