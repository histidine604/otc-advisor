/* eslint-disable no-undef */
// PharmRex — A React Application for OTC Recommendations
console.log("PharmRex — React build 1");

/* ----------------------- Utilities & Data ----------------------- */
// Persists user's previously selected answers for each ailment.
const AnswerStore = {
  key: "pharmrex_answers_v2",
  getAll(){
    try { return JSON.parse(localStorage.getItem(this.key) || "{}"); } catch { return {}; }
  },
  get(ailment){
    const all = this.getAll();
    return all[ailment] || {};
  },
  set(ailment, answers){
    const all = this.getAll();
    all[ailment] = answers || {};
    try { localStorage.setItem(this.key, JSON.stringify(all)); } catch {}
  },
  clear(ailment){
    const all = this.getAll();
    delete all[ailment];
    try { localStorage.setItem(this.key, JSON.stringify(all)); } catch {}
  }
};

// Maps generic drug names to common brand names.
const BRANDS = {
  "Acetaminophen": ["Tylenol", "Children’s Tylenol", "Store brand acetaminophen"],
  "Ibuprofen": ["Advil", "Motrin", "Children’s Advil/Motrin"],
  "Naproxen": ["Aleve"],
  "PEG 3350": ["MiraLAX"],
  "Psyllium (fiber)": ["Metamuci"],
  "Methylcellulose (fiber)": ["Citrucel"],
  "Docusate": ["Colace"],
  "Senna": ["Senokot"],
  "Bisacodyl": ["Dulcolax"],
  "Oxymetazoline": ["Afrin"],
  "Pseudoephedrine": ["Sudafed"],
  "Phenylephrine": ["Sudafed PE"],
  "INCS": ["Flonase (fluticasone)", "Nasacort (triamcinolone)"],
  "Cetirizine": ["Zyrtec"],
  "Loratadine": ["Claritin"],
  "Fexofenadine": ["Allegra"],
  "Diphenhydramine": ["Benadryl","ZzzQuil"],
  "Doxylamine": ["Unisom"],
  "Dextromethorphan": ["Delsym","Robitussin DM"],
  "Guaifenesin": ["Mucinex"],
  "Diclofenac gel": ["Voltaren Arthritis Pain"],
  "Loperamide": ["Imodium"],
  "Bismuth subsalicylate": ["Pepto-Bismol","Kaopectate"]
};

/** Small helper for null-safe brand text */
function brandText(key) {
  if (!key) return "N/A";
  if (BRANDS[key]) return BRANDS[key].join(" / ");
  return "N/A";
}

/** Dosing helper kept as a tiny service (logic only) */
const Dosing = (() => {
  let unit = "kg";
  let weight = null;
  const setUnit = (u) => unit = u;
  const setWeight = (w) => weight = isNaN(w) ? null : Number(w);
  const kg = () => (weight == null ? null : (unit === "kg" ? weight : weight * 0.45359237));
  const apapDose = () => {
    const k = kg(); if (k == null) return null;
    return { mgPerDoseLow: Math.round(k * 10), mgPerDoseHigh: Math.round(k * 15) };
  };
  const ibuDose = () => {
    const k = kg(); if (k == null) return null;
    return { mgPerDoseLow: Math.round(k * 5), mgPerDoseHigh: Math.round(k * 10) };
  };
  const volFor = (mg, per5) => {
    if (!mg || !per5) return null;
    const mL = (mg / per5) * 5;
    return Math.round(mL * 2) / 2; // Round to nearest 0.5 mL
  };
  return { setUnit, setWeight, apapDose, ibuDose, volFor };
})();

/* ----------------------- Domain Model ----------------------- */

// A factory for recommendation objects.
function card(title, brandKey, how, warn){
  return { title, brandKey, how, warn };
}

// The core data model for ailments, questions, and recommendation logic.
const CORE = {
  allergic_rhinitis: {
  name:"Allergies (Allergic Rhinitis)",
  questions:[
    { id: "agegrp", type: "agegroup", label: "Age group", required: true, groups: [{ value: "2-12", label: "2–12 years" }, { value: ">12", label: ">12 years" }] },
    { id:"severity", type:"select", label:"How bad are symptoms?", options:["Mild (not daily life-limiting)","Moderate/Severe (affects sleep/daily life)"], required:true },
    { id:"symptoms", type:"multiselect", label:"Main symptoms", options:["Sneezing/itching","Runny nose","Nasal congestion","Itchy/watery eyes"]}
  ],
  recommend:(a)=>{
    const refer=[], notes=[], recs=[], nonDrug=[];
    const { severity, symptoms = [] } = a;
    nonDrug.push("Avoid triggers; use saline nasal sprays or irrigation.");
    const hasCongestion = symptoms.includes("Nasal congestion");
    const hasEyeSymptoms = symptoms.includes("Itchy/watery eyes");

    if (severity === "Moderate/Severe (affects sleep/daily life)" || hasCongestion){
      recs.push(card("Intranasal Steroid", "INCS", "Use daily for best results. Proper spray technique is key.", "May cause nasal irritation or dryness."));
      if (hasEyeSymptoms) {
        recs.push(card("Oral Antihistamine", "Cetirizine", "Take once daily as needed.", "Cetirizine (Zyrtec) may cause mild drowsiness."));
      }
    } else {
      recs.push(card("Oral Antihistamine", "Loratadine", "Take once daily as needed.", "Non-drowsy for most people. Less effective for congestion alone."));
    }
    return { refer, notes, recs, nonDrug, showDosing:false };
  }
},
fever: {
  name:"Fever / Pain",
  questions:[
    { id: "agegrp", type: "agegroup", label: "Age group", required: true, groups: [{ value: "0-1", label: "0–1 year" }, { value: "2-12", label: "2–12 years" }, { value: ">12", label: ">12 years" }] },
    { id:"temp", type:"select", label:"Highest temperature (°F)", options:["<100.4","100.4–102.2",">102.2"], required:true },
    { id:"duration", type:"select", label:"How long?", options:["<24 hours","1–3 days",">3 days"], required:true }
  ],
  recommend:(a)=>{
    const refer=[], notes=[], recs=[], nonDrug=[];
    const { agegrp } = a;
    if (agegrp === "0-1") notes.push("For infants <3 months with a fever of 100.4°F or higher, seek immediate medical evaluation.");
    nonDrug.push("Encourage hydration with water or electrolyte solutions. Use light clothing and avoid cold baths.");
    
    recs.push(card("Acetaminophen", "Acetaminophen", "Follow weight-based dosing on the package.", "Do not exceed the maximum daily dose. Avoid other products containing acetaminophen."));
    if (agegrp !== "0-1") {
        recs.push(card("Ibuprofen", "Ibuprofen", "Take with food to reduce stomach upset. Follow weight-based dosing.", "Not for infants under 6 months. Avoid if there's a risk of dehydration, kidney issues, or stomach ulcers."));
    }
     if (agegrp === ">12") {
        recs.push(card("Naproxen", "Naproxen", "Longer-acting option for adults, take with food.", "Same precautions as ibuprofen."));
    }
    return { refer, notes, recs, nonDrug, showDosing:true };
  }
},
  constipation: {
    name:"Constipation",
    questions:[
      { id: "agegrp", type: "agegroup", label: "Age group", required: true, groups: [{ value: "2-12", label: "2–12 years" }, { value: ">12", label: ">12 years" }] },
      { id:"duration", type:"select", label:"How long?", options:["<1 week",">1 week"], required:true },
      { id:"features", type:"multiselect", label:"Features", options:["Hard stools","Straining","Recent opioid use", "Blood in stool"] }
    ],
    recommend:(a)=>{
      const recs=[], notes=[], nonDrug=[], refer=[];
      if ((a.features||[]).includes("Blood in stool")) refer.push("Blood in stool requires medical evaluation to rule out serious conditions.");
      nonDrug.push("Gradually increase fiber intake (fruits, vegetables), drink plenty of water, and increase physical activity.");
      
      recs.push(card("Osmotic Laxative", "PEG 3350", "Mix powder in a full glass of water. Works gently over 1-3 days.", "Generally well-tolerated. Can be used daily."));
      recs.push(card("Fiber Supplement", "Psyllium (fiber)", "Mix with plenty of water and drink immediately.", "May cause gas or bloating initially."));
      recs.push(card("Stool Softener", "Docusate", "Useful for hard, dry stools, especially if straining should be avoided.", "Often used in combination with other laxatives."));
      recs.push(card("Stimulant (for rescue)", "Senna", "Use for occasional, short-term relief. Works overnight.", "Can cause cramping. Not for long-term use without medical advice."));
      
      if ((a.features||[]).includes("Recent opioid use")) notes.push("For opioid-induced constipation, a stimulant laxative (like Senna or Bisacodyl) is often needed in addition to a stool softener.");
      return { refer, notes, recs, nonDrug, showDosing:false };
    }
  },
  cough: {
    name:"Cough",
    questions:[
      { id: "agegrp", type: "agegroup", label: "Age group", required: true, groups: [{ value: "2-12", label: "2–12 years" }, { value: ">12", label: ">12 years" }] },
      { id:"type", type:"select", label:"Cough type", options:["Dry (no mucus)","Productive (with mucus)"], required:true },
      { id:"duration", type:"select", label:"Duration", options:["<1 week","1–3 weeks",">3 weeks"], required:true },
      { id:"red", type:"multiselect", label:"Any of these?", options:["Shortness of breath","Chest pain","High fever","Asthma/COPD"] }
    ],
    recommend:(a)=>{
      const recs=[], notes=[], nonDrug=[], refer=[];
      if ((a.red||[]).length) refer.push("Symptoms like shortness of breath, chest pain, or high fever require medical attention.");
      nonDrug.push("Stay hydrated with warm fluids. Use a humidifier. For children over 1 year, honey can soothe the throat.");
      
      if (a.type==="Dry (no mucus)") {
        recs.push(card("Cough Suppressant", "Dextromethorphan", "Use as directed to reduce the urge to cough.", "Check for drug interactions, especially with antidepressants (SSRIs/MAOIs)."));
      }
      if (a.type==="Productive (with mucus)") {
        recs.push(card("Expectorant", "Guaifenesin", "Take with a full glass of water to help thin mucus.", "Its main function is to make coughs more productive."));
      }
      notes.push("Avoid multi-symptom cold products in young children. A cough lasting more than 3 weeks should be evaluated by a doctor.");
      return { refer, notes, recs, nonDrug, showDosing:false };
    }
  },
};


/* ----------------------- Pure logic ----------------------- */
/**
 * Normalize answers for engine. Trims strings; keeps arrays for multiselect;
 * drops empties so recommend() only sees meaningful fields.
 */
function normalizeAnswers(answersRaw) {
  const out = {};
  for (const [k,v] of Object.entries(answersRaw)) {
    if (Array.isArray(v)) { if (v.length) out[k] = v; continue; }
    if (typeof v === 'string') { const t = v.trim(); if (t) out[k] = t; continue; }
    if (v != null) out[k] = v;
  }
  return out;
}

// Simple check to see if a required question has a valid answer.
function isAnswered(q, answers){
  const v = answers[q.id];
  if (!q.required) return true;
  if (Array.isArray(v)) return v.length > 0;
  return v != null && String(v).trim() !== "";
}


/* ----------------------- React Components ----------------------- */

function SiteHeader({ onReset }) {
  return (
    <header className="bg-white shadow-sm sticky top-0 z-10">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center py-3">
          <div className="flex items-center space-x-2">
             <svg className="w-8 h-8 text-teal-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 18v-5.25m0 0a6.01 6.01 0 0 0 1.5-.189m-1.5.189a6.01 6.01 0 0 1-1.5-.189m3.75 7.478a12.06 12.06 0 0 1-4.5 0m3.75 2.311a15.045 15.045 0 0 1-7.5 0C4.508 19.662 2.25 17.439 2.25 14.85V8.25a.75.75 0 0 1 .75-.75h18a.75.75 0 0 1 .75.75v6.6c0 2.589-2.258 4.812-4.5 5.161Z" />
            </svg>
            <h1 className="text-2xl font-bold text-slate-800">PharmRex</h1>
          </div>
          <button
            type="button"
            onClick={onReset}
            className="text-sm font-semibold text-slate-600 hover:text-slate-900"
          >
            Start Over
          </button>
        </div>
      </div>
    </header>
  );
}

function AilmentPicker({ ailments, value, onChange }) {
  const sortedAilments = React.useMemo(() => 
    Object.entries(ailments).sort(([, a], [, b]) => a.name.localeCompare(b.name)),
    [ailments]
  );
  
  return (
    <div>
      <label htmlFor="ailment" className="block text-sm font-bold text-slate-700 mb-2">
        What is the primary concern?
      </label>
      <select 
        id="ailment" 
        value={value} 
        onChange={(e) => onChange(e.target.value)}
        className="block w-full rounded-lg border-slate-300 shadow-sm focus:border-teal-500 focus:ring-teal-500 text-lg p-3"
      >
        {sortedAilments.map(([k, v]) => (
          <option key={k} value={k}>{v.name || k}</option>
        ))}
      </select>
    </div>
  );
}

function ChipGroup({ groups, value, onChange }) {
  return (
    <div className="flex flex-wrap gap-2">
      {groups.map(g => (
        <button
          key={g.value}
          type="button"
          onClick={() => onChange(g.value)}
          className={`px-4 py-2 text-sm font-semibold rounded-full transition-colors ${
            value === g.value 
              ? 'bg-teal-600 text-white' 
              : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
          }`}
        >
          {g.label}
        </button>
      ))}
    </div>
  );
}

function QuestionBlock({ q, value, onChange }) {
  const handleChange = (id, val) => onChange(id, val);

  return (
    <div className="space-y-2">
      <label className="block text-sm font-bold text-slate-700">
        {q.label}{q.required && <span className="text-red-600 ml-1">*</span>}
      </label>
      
      {q.type === 'agegroup' && (
        <ChipGroup groups={q.groups} value={value ?? null} onChange={(v) => handleChange(q.id, v)} />
      )}

      {q.type === 'select' && (
        <select 
          value={value ?? ''} 
          onChange={(e) => handleChange(q.id, e.target.value)}
          className="block w-full rounded-md border-slate-300 shadow-sm focus:border-teal-500 focus:ring-teal-500 sm:text-sm p-2"
        >
          <option value="" disabled>Select an option…</option>
          {q.options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
        </select>
      )}

      {q.type === 'multiselect' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2">
          {q.options.map((opt) => {
            const checked = Array.isArray(value) && value.includes(opt);
            return (
              <label key={opt} className="flex items-center space-x-3 p-2 rounded-md hover:bg-slate-50">
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={(e) => {
                    const prev = Array.isArray(value) ? value : [];
                    const next = e.target.checked ? [...prev, opt] : prev.filter(x => x !== opt);
                    handleChange(q.id, next);
                  }}
                  className="h-4 w-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                />
                <span className="text-sm text-slate-700">{opt}</span>
              </label>
            );
          })}
        </div>
      )}
    </div>
  );
}

function QuestionsForm({ ailment, answers, onChange, onSubmit, onOpenDosing }) {
  const { name, questions = [] } = ailment;
  const allRequiredAnswered = questions.filter(q => q.required).every(q => isAnswered(q, answers));
  const showDosingButton = React.useMemo(() => {
    try { return !!ailment.recommend({}).showDosing; } catch { return false; }
  }, [ailment]);

  return (
    <div className="bg-white p-4 sm:p-6 rounded-xl shadow-lg border border-slate-200 space-y-6">
      <div className="space-y-4">
        {questions.length === 0 ? (
          <p className="text-slate-500">No questions for this ailment.</p>
        ) : (
          questions.map(q => (
            <QuestionBlock key={q.id} q={q} value={answers[q.id]} onChange={onChange} />
          ))
        )}
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-4 border-t border-slate-200">
        <button 
          type="button"
          onClick={onSubmit} 
          disabled={!allRequiredAnswered}
          className="w-full sm:w-auto px-6 py-3 text-base font-semibold text-white bg-teal-600 rounded-lg shadow-md hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 disabled:bg-slate-400 disabled:cursor-not-allowed transition-colors"
        >
          Generate Plan
        </button>
        {showDosingButton && (
          <button 
            type="button" 
            onClick={onOpenDosing}
            className="w-full sm:w-auto px-4 py-2 text-sm font-semibold text-teal-700 bg-teal-100 rounded-md hover:bg-teal-200 transition-colors"
          >
            Dosing Calculator
          </button>
        )}
      </div>
      {!allRequiredAnswered && (
        <p className="text-xs text-slate-500 text-center sm:text-left pt-2">
          Please answer all required questions (<span className="text-red-600">*</span>) to generate a plan.
        </p>
      )}
    </div>
  );
}

function RecommendationCard({ r }) {
  return (
    <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
      <p className="font-semibold text-slate-800">{r.title}</p>
      <p className="text-teal-700 font-bold text-lg">{brandText(r.brandKey)}</p>
    </div>
  );
}

function Results({ payload }) {
  const { refer = [], notes = [], recs = [], nonDrug = [] } = payload;
  const primaryRec = recs.length > 0 ? recs[0] : null;
  const secondaryRecs = recs.length > 1 ? recs.slice(1) : [];

  return (
    <div className="space-y-8">
      {refer.length > 0 && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-r-lg">
          <h3 className="font-bold text-red-800">Seek Medical Attention</h3>
          <ul className="list-disc list-inside mt-2 text-sm text-red-700 space-y-1">
            {refer.map((r, i) => <li key={i}>{r}</li>)}
          </ul>
        </div>
      )}

      {primaryRec && (
        <div>
          <h2 className="text-xl font-bold text-slate-800 mb-3">PharmRex Recommends:</h2>
          <RecommendationCard r={primaryRec} />
        </div>
      )}
      
      {secondaryRecs.length > 0 && (
        <div>
           <h3 className="text-lg font-semibold text-slate-700 mb-3">Other things you can do:</h3>
           <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {secondaryRecs.map((r, i) => <RecommendationCard key={i} r={r} />)}
           </div>
        </div>
      )}

      {nonDrug.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-slate-700 mb-2">Non-Drug Measures</h3>
          <ul className="list-disc list-inside text-sm text-slate-600 space-y-1">
            {nonDrug.map((n, i) => <li key={i}>{n}</li>)}
          </ul>
        </div>
      )}

      {notes.length > 0 && (
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded-r-lg text-sm text-yellow-800">
          <strong className="font-bold">Important Notes:</strong> {notes.join(' ')}
        </div>
      )}
    </div>
  );
}

function DosingModal({ open, onClose }) {
  const [unit, setUnit] = React.useState("kg");
  const [weight, setWeight] = React.useState("");

  React.useEffect(() => {
    Dosing.setUnit(unit);
    Dosing.setWeight(weight === "" ? null : Number(weight));
  }, [unit, weight]);

  if (!open) return null;

  const DoseDisplay = ({ title, dose, per5, details }) => {
    const low = dose?.mgPerDoseLow;
    const high = dose?.mgPerDoseHigh;
    const volLow = Dosing.volFor(low, per5);
    const volHigh = Dosing.volFor(high, per5);
    return (
      <div className="bg-slate-50 p-4 rounded-lg flex-1 min-w-[240px]">
        <h3 className="font-bold text-lg text-slate-800">{title}</h3>
        <div className="mt-2">
          {dose ? (
            <>
              <p className="text-2xl font-bold text-teal-600">{low}–{high} mg</p>
              <p className="text-sm text-slate-600">per dose</p>
              <p className="mt-2 text-sm text-slate-500">For {per5}mg/5mL liquid: <strong className="text-slate-700">{volLow}–{volHigh} mL</strong></p>
            </>
          ) : (
            <p className="text-slate-500">Enter weight to calculate.</p>
          )}
        </div>
        <p className="text-xs text-slate-400 mt-4">{details}</p>
      </div>
    );
  };
  
  return (
    <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center p-4 z-50" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="p-4 sm:p-6">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-bold text-slate-800">Dosing Calculator</h2>
            <button onClick={onClose} className="text-slate-500 hover:text-slate-800">&times;</button>
          </div>
          <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-1 space-y-4 p-4 bg-slate-100 rounded-lg">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Weight Unit</label>
                <ChipGroup groups={[{value: 'kg', label: 'kg'}, {value: 'lb', label: 'lb'}]} value={unit} onChange={setUnit} />
              </div>
              <div>
                <label htmlFor="weightInput" className="block text-sm font-medium text-slate-700 mb-1">Patient Weight</label>
                <input
                  id="weightInput"
                  type="number"
                  min="0"
                  step="0.1"
                  placeholder={`Enter weight in ${unit}`}
                  value={weight}
                  onChange={(e) => setWeight(e.target.value)}
                  className="block w-full rounded-md border-slate-300 shadow-sm focus:border-teal-500 focus:ring-teal-500 sm:text-sm p-2"
                />
              </div>
            </div>
            <div className="md:col-span-2 flex flex-wrap gap-4">
              <DoseDisplay title="Acetaminophen" dose={Dosing.apapDose()} per5={160} details="e.g., Tylenol. Common liquid: 160mg/5mL."/>
              <DoseDisplay title="Ibuprofen" dose={Dosing.ibuDose()} per5={100} details="e.g., Advil/Motrin. Common liquid: 100mg/5mL."/>
            </div>
          </div>
          <div className="mt-6 p-3 bg-yellow-50 text-yellow-800 text-xs rounded-lg">
            <strong>Disclaimer:</strong> This is a tool for estimation. Always verify dosing with official product labeling or a healthcare professional. Avoid ibuprofen in infants <6 months.
          </div>
        </div>
      </div>
    </div>
  );
}


/* ----------------------- Root App ----------------------- */
function PharmRexApp() {
  const ailments = CORE;
  const initialKey = Object.keys(ailments)[0];

  const [ailmentKey, setAilmentKey] = React.useState(initialKey);
  const [answers, setAnswers] = React.useState(() => AnswerStore.get(initialKey));
  const [result, setResult] = React.useState(null);
  const [dosingOpen, setDosingOpen] = React.useState(false);
  
  const activeAilment = ailments[ailmentKey];

  const handleAilmentChange = (key) => {
    setAilmentKey(key);
    setAnswers(AnswerStore.get(key));
    setResult(null);
  };
  
  const handleAnswerChange = React.useCallback((id, value) => {
    setAnswers(prev => {
      const next = { ...prev, [id]: value };
      AnswerStore.set(ailmentKey, next);
      return next;
    });
  }, [ailmentKey]);

  const handleSubmit = () => {
    try {
      const normalized = normalizeAnswers(answers);
      const payload = activeAilment?.recommend?.(normalized) || {};
      setResult(payload);
      setTimeout(() => {
        document.getElementById('results-section')?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    } catch (err) {
      console.error("Recommendation generation failed:", err);
      // You could set an error state here to show a message to the user
    }
  };

  const handleReset = () => {
    AnswerStore.clear(ailmentKey);
    setAnswers({});
    setResult(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="bg-slate-50 min-h-screen font-sans">
      <SiteHeader onReset={handleReset} />
      <main className="max-w-3xl mx-auto py-6 sm:py-8 px-4 space-y-8">
        <div className="bg-white p-4 sm:p-6 rounded-xl shadow-lg border border-slate-200">
           <AilmentPicker ailments={ailments} value={ailmentKey} onChange={handleAilmentChange} />
        </div>
        
        <QuestionsForm
          ailment={activeAilment}
          answers={answers}
          onChange={handleAnswerChange}
          onSubmit={handleSubmit}
          onOpenDosing={() => setDosingOpen(true)}
        />
        
        {result && (
          <div id="results-section" className="bg-white p-4 sm:p-6 rounded-xl shadow-lg border border-slate-200">
            <Results payload={result} />
          </div>
        )}
      </main>
      <footer className="text-center py-4 text-xs text-slate-400">
        PharmRex &copy; {new Date().getFullYear()} | This tool is for informational purposes and is not a substitute for professional medical advice.
      </footer>
      <DosingModal open={dosingOpen} onClose={() => setDosingOpen(false)} />
    </div>
  );
}

// Mount the app to the root element in index.html
const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<PharmRexApp />);
