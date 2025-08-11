/* eslint-disable no-undef */
console.log("OTC Advisor — React build 1");

/* ----------------------- Utilities & Data ----------------------- */
const BrandPref = {
  key: "otc_show_brands",
  get(){ try { return JSON.parse(localStorage.getItem(this.key) ?? "true"); } catch { return true; } },
  set(v){ try { localStorage.setItem(this.key, JSON.stringify(!!v)); } catch {} }
};

const BRANDS = {
  "Acetaminophen": ["Tylenol", "Children’s Tylenol", "Store brand acetaminophen"],
  "Ibuprofen": ["Advil", "Motrin", "Children’s Advil/Motrin"],
  "Naproxen": ["Aleve"],
  "PEG 3350": ["MiraLAX"],
  "Psyllium (fiber)": ["Metamucil"],
  "Methylcellulose (fiber)": ["Citrucel"],
  "Docusate": ["Colace"],
  "Senna": ["Senokot"],
  "Bisacodyl": ["Dulcolax"],
  "Oxymetazoline": ["Afrin"],
  "Pseudoephedrine": ["Sudafed"],
  "Phenylephrine": ["Sudafed PE"],
  "INCS": ["Flonase (fluticasone)", "Nasacort (triamcinolone)", "Rhinocort (budesonide)"],
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
function brandText(key, fallbacks) {
  if (!key) return (fallbacks||[]).join(", ");
  if (BRANDS[key]) return BRANDS[key].join(", ");
  return (fallbacks||[]).join(", ");
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
    return Math.round(mL / 2.5) * 2.5;
  };
  return { setUnit, setWeight, apapDose, ibuDose, volFor };
})();

/* ----------------------- Domain Model ----------------------- */

const AgeGroupInput = (id, label) => ({
  id, type: "agegroup", label, groups: [
    { value: "0-1", label: "0–1 year" },
    { value: "2-12", label: "2–12 years" },
    { value: ">12", label: ">12 years" },
  ]
});

function card(title, examples, how, warn, brandKey){
  return { title, examples, how, warn, brandKey };
}

const CORE = {
  allergic_rhinitis: {
    name: "Allergic Rhinitis",
    questions: [
      AgeGroupInput("agegrp","Age group"),
      { id:"severity", type:"select", label:"How bad are symptoms?", options:["Mild (not daily life-limiting)","Moderate/Severe (affects sleep/daily life)"], required:true },
      { id:"symptoms", type:"multiselect", label:"Main symptoms", options:["Sneezing/itching","Rhinorrhea (runny nose)","Nasal congestion","Ocular symptoms (itchy/watery eyes)"]}
    ],
    recommend: (a) => {
      const refer=[], notes=[], recs=[], nonDrug=[];
      const ag=a.agegrp, sev=a.severity, sym=a.symptoms||[];
      nonDrug.push("Avoid triggers; saline irrigation.");
      if (ag==="0-1") { notes.push("For infants: saline + pediatric evaluation."); return {refer,notes,recs,nonDrug,showDosing:false}; }
      const hasCong = sym.includes("Nasal congestion");
      const eyes = sym.includes("Ocular symptoms (itchy/watery eyes)");
      if (sev==="Moderate/Severe (affects sleep/daily life)" || hasCong){
        recs.push(card("Intranasal corticosteroid (INCS)",["Flonase","Rhinocort","Nasacort"],"Daily; proper technique.","Nosebleed/irritation possible.","INCS"));
        if (eyes) recs.push(card("Oral non-sedating antihistamine",["cetirizine","loratadine","fexofenadine"],"Once daily.","Mild drowsiness (cetirizine).","Cetirizine"));
      } else {
        recs.push(card("Oral non-sedating antihistamine",["cetirizine","loratadine","fexofenadine"],"Once daily.","Less helpful for congestion alone.","Cetirizine"));
      }
      return { refer, notes, recs, nonDrug, showDosing:false };
    }
  },
  fever: {
    name:"Fever",
    questions:[
      AgeGroupInput("agegrp","Age group"),
      { id:"temp", type:"select", label:"Highest temperature (°F)", options:["<100.4","100.4–102.2","102.3–104",">104"], required:true },
      { id:"duration", type:"select", label:"How long?", options:["<24 hours","1–3 days",">3 days"], required:true }
    ],
    recommend:(a)=>{
      const refer=[], notes=[], recs=[], nonDrug=[]; const ag=a.agegrp;
      if (ag==="0-1") notes.push("If <3 months with ≥100.4°F → immediate medical evaluation.");
      nonDrug.push("Hydration; light clothing; avoid cold baths/alcohol rubs.");
      if (ag==="0-1"){
        recs.push(card("Acetaminophen",["acetaminophen"],"Per label by weight.","Avoid duplicate APAP.","Acetaminophen"));
      } else if (ag==="2-12"){
        recs.push(card("Acetaminophen",["acetaminophen"],"Per label by weight.","Avoid max daily dose.","Acetaminophen"));
        recs.push(card("Ibuprofen (≥6 months)",["ibuprofen"],"Per label by weight.","Avoid if dehydration/ulcer/renal risk.","Ibuprofen"));
      } else {
        recs.push(card("Acetaminophen",["acetaminophen"],"As directed.","Max per label/health status.","Acetaminophen"));
        recs.push(card("Ibuprofen",["ibuprofen"],"As directed with food if GI upset.","Avoid if ulcer/kidney disease/late pregnancy.","Ibuprofen"));
      }
      return { refer, notes, recs, nonDrug, showDosing:true };
    }
  }
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

/* ----------------------- React components ----------------------- */

function SiteHeader({showBrands, onToggleBrands, onPrint}) {
  return (
    <header className="site-header">
      <div className="header-inner">
        <div className="header-left">
          <h1>OTC Advisor (React)</h1>
          <p>Quick OTC guidance for common self-care issues. Not a substitute for medical advice.</p>
        </div>
        <div className="header-right no-print">
          <label className="brand-toggle">
            <input type="checkbox" checked={showBrands} onChange={(e)=>onToggleBrands(e.target.checked)} />
            <span>Show brand examples</span>
          </label>
          <button className="btn btn-primary" onClick={onPrint}>Print/Save</button>
        </div>
      </div>
    </header>
  );
}

function AilmentPicker({ailments, value, onChange, onReset}) {
  return (
    <div className="card">
      <div className="row">
        <div>
          <label htmlFor="ailment">Choose an ailment</label>
          <select id="ailment" value={value} onChange={(e)=>onChange(e.target.value)}>
            {Object.entries(ailments).map(([k,v]) => (
              <option key={k} value={k}>{v.name || k}</option>
            ))}
          </select>
        </div>
        <div className="no-print" style={{alignSelf:'flex-end'}}>
          <button className="btn btn-ghost" onClick={onReset}>Reset</button>
        </div>
      </div>
    </div>
  );
}

function ChipGroup({groups, value, onChange}) {
  return (
    <div className="chip-group" data-selected={value || ''}>
      {groups.map(g => (
        <div key={g.value}
             className={"chip" + (value===g.value ? " active" : "")}
             onClick={()=>onChange(g.value)}
             data-value={g.value}>
          {g.label}
        </div>
      ))}
    </div>
  );
}

function QuestionBlock({q, value, onChange}) {
  return (
    <div>
      <label>{q.label}{q.required ? ' *' : ''}</label>
      {q.type === 'agegroup' && (
        <ChipGroup groups={q.groups} value={value ?? null} onChange={(v)=>onChange(q.id, v)} />
      )}
      {q.type === 'select' && (
        <select value={value ?? ''} onChange={(e)=>onChange(q.id, e.target.value)}>
          {q.options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
        </select>
      )}
      {q.type === 'multiselect' && (
        <div className="multi">
          {q.options.map((opt, i) => {
            const checked = Array.isArray(value) && value.includes(opt);
            return (
              <label key={i}>
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={(e)=>{
                    const prev = Array.isArray(value) ? value : [];
                    const next = e.target.checked ? [...new Set([...prev, opt])] : prev.filter(x=>x!==opt);
                    onChange(q.id, next);
                  }} />
                {opt}
              </label>
            );
          })}
        </div>
      )}
      {(!['agegroup','select','multiselect'].includes(q.type)) && (
        <input type="text" value={value ?? ''} onChange={(e)=>onChange(q.id, e.target.value)} />
      )}
    </div>
  );
}

function QuestionsForm({aName, questions, answers, onChange, onSubmit, showDosing, onOpenDosing}) {
  return (
    <div className="card">
      <div className="title">{aName} — Intake</div>
      <hr />
      {questions.map(q => (
        <QuestionBlock key={q.id} q={q} value={answers[q.id]} onChange={onChange} />
      ))}
      <div className="row no-print" style={{marginTop:12}}>
        <button className="btn btn-primary" onClick={onSubmit}>Get Recommendation</button>
        {showDosing && (
          <button className="btn btn-ghost" type="button" onClick={onOpenDosing}>Open Dosing Calculator</button>
        )}
      </div>
    </div>
  );
}

function DoseCard({title, dose, per5}) {
  const low = dose ? dose.mgPerDoseLow : null;
  const high = dose ? dose.mgPerDoseHigh : null;
  const vl = dose ? Dosing.volFor(low, per5) : null;
  const vh = dose ? Dosing.volFor(high, per5) : null;
  return (
    <div className="card" style={{flex:'1 1 360px'}}>
      <div className="title">{title}</div>
      <div className="dose-grid">
        <div className="dose-card">
          {dose ? (
            <>
              <div><strong>{low}–{high} mg per dose</strong> {title === 'Acetaminophen' ? 'every 4–6 hours' : 'every 6–8 hours'}</div>
              <div className="muted">At {per5} mg/5 mL: ~{vl ?? "—"}–{vh ?? "—"} mL per dose</div>
            </>
          ) : "Enter weight to calculate dose."}
        </div>
      </div>
      <div className="muted">
        {title === 'Acetaminophen'
          ? "Common liquids: 160 mg/5 mL. Tablets: 325 mg, 500 mg."
          : "Common liquids: 100 mg/5 mL. Tablets: 200 mg."}
      </div>
    </div>
  );
}

function DosingModal({open, onClose}) {
  const [unit, setUnit] = React.useState("kg");
  const [weight, setWeight] = React.useState("");

  React.useEffect(()=>{
    Dosing.setUnit(unit);
    Dosing.setWeight(weight === "" ? null : Number(weight));
  }, [unit, weight]);

  if (!open) return null;
  return (
    <div id="dosingModal" className="modal no-print" onClick={(e)=>{ if (e.target.id==='dosingModal') onClose(); }}>
      <div className="modal-content">
        <div className="modal-header">
          <div className="title">Pediatric/Adult Dosing Calculator</div>
          <button className="btn btn-ghost" onClick={onClose}>Close</button>
        </div>
        <hr />
        <div className="row">
          <div className="card" style={{flex:'1 1 300px'}}>
            <label>Units</label>
            <div className="chip-group" id="unitChips">
              <div className={"chip" + (unit==='kg' ? ' active' : '')} data-value="kg" onClick={()=>setUnit('kg')}>kg</div>
              <div className={"chip" + (unit==='lb' ? ' active' : '')} data-value="lb" onClick={()=>setUnit('lb')}>lb</div>
            </div>
            <label htmlFor="weightInput">Weight</label>
            <input id="weightInput" type="number" min="0" step="0.1" placeholder="Enter weight" value={weight}
                   onChange={(e)=>setWeight(e.target.value)} />
            <div className="muted" id="unitHint">Using {unit === 'kg' ? 'kilograms (kg)' : 'pounds (lb)'}</div>
            <hr />
            <div className="muted">Label-standard ranges:</div>
            <ul className="muted">
              <li>Acetaminophen: 10–15 mg/kg q4–6h (max 75 mg/kg/day; adult OTC max 3,000–4,000 mg/day per label/health status).</li>
              <li>Ibuprofen (≥6 months): 5–10 mg/kg q6–8h (max 40 mg/kg/day; adult OTC max 1,200 mg/day).</li>
            </ul>
          </div>

          <DoseCard title="Acetaminophen" dose={Dosing.apapDose()} per5={160} />
          <DoseCard title="Ibuprofen" dose={Dosing.ibuDose()} per5={100} />
        </div>

        <div className="note" style={{marginTop:12}}>
          <strong>Safety notes:</strong> Avoid duplicate acetaminophen; avoid ibuprofen in infants &lt;6 months, late pregnancy, dehydration, ulcer/renal risk. Reference product labels.
        </div>
      </div>
    </div>
  );
}

function RecommendationCard({r, showBrands}) {
  // Defensive rendering prevents "undefined name" errors:
  const title = r?.title ?? 'Untitled';
  const examples = (r?.examples && r.examples.length) ? r.examples.join(", ") : "—";
  const brandLine = showBrands ? brandText(r?.brandKey, r?.examples) : null;

  return (
    <div className="dose-card">
      <div><span className="pill">{title}</span></div>
      <div className="muted">Examples: {examples}</div>
      {showBrands && brandLine
        ? <div className="muted"><em>Brands: {brandLine}</em></div>
        : null}
      <div>How: {r?.how || "—"}</div>
      <div className="muted">Notes: {r?.warn || "—"}</div>
    </div>
  );
}

function Results({aName, payload, showBrands}) {
  const [query, setQuery] = React.useState("");
  const { refer=[], notes=[], recs=[], nonDrug=[] } = payload || {};

  const filtered = React.useMemo(()=>{
    if (!query) return recs;
    const q = query.toLowerCase();
    return recs.filter(r => (JSON.stringify(r) || "").toLowerCase().includes(q));
  }, [recs, query]);

  return (
    <div className="card">
      <div className="title">{aName} — Recommendation</div>
      <hr />
      <div className="row no-print">
        <input
          placeholder="Search brands (e.g., Tylenol, Sudafed, Zyrtec)"
          style={{flex:"2 1 300px"}}
          value={query}
          onChange={(e)=>setQuery(e.target.value)}
        />
      </div>

      {refer.length > 0 && (
        <>
          <p><span className="danger">Refer to clinician/urgent care:</span></p>
          <ul>{refer.map((r,i)=><li key={i}>{r}</li>)}</ul>
        </>
      )}

      {filtered.length > 0 && (
        <>
          <p><span className="ok">OTC options:</span></p>
          <div>
            {filtered.map((r,i)=><RecommendationCard key={i} r={r} showBrands={showBrands} />)}
          </div>
        </>
      )}

      {nonDrug.length > 0 && (
        <>
          <p><strong>Non-drug measures:</strong></p>
          <ul>{nonDrug.map((n,i)=><li key={i}>{n}</li>)}</ul>
        </>
      )}

      {notes.length > 0 && (
        <div className="note"><strong>Important:</strong> {notes.join(' ')}</div>
      )}
    </div>
  );
}

/* ----------------------- Root App ----------------------- */

function App() {
  const ailments = CORE; // if you have extra DATA.ailments, merge here
  const [ailmentKey, setAilmentKey] = React.useState(Object.keys(ailments)[0]);
  const [answers, setAnswers] = React.useState({});
  const [result, setResult] = React.useState(null);
  const [showBrands, setShowBrands] = React.useState(BrandPref.get());
  const [dosingOpen, setDosingOpen] = React.useState(false);
  const a = ailments[ailmentKey];

  const showDosing = React.useMemo(()=>{
    // Call with empty answers to see if this ailment wants dosing tool visible
    try { return !!a.recommend({}).showDosing; } catch { return false; }
  }, [a]);

  function onChangeAnswer(id, value){
    setAnswers(prev => ({ ...prev, [id]: value }));
  }

  function onSubmit(){
    const normalized = normalizeAnswers(answers);
    const payload = a.recommend(normalized);
    setResult(payload);
    // Scroll to results
    setTimeout(()=>{
      const el = document.getElementById('root');
      if (el) window.scrollTo({ top: el.offsetTop + 240, behavior: 'smooth' });
    }, 0);
  }

  function onReset(){
    setAnswers({});
    setResult(null);
    window.scrollTo({ top: 0, behavior:'smooth' });
  }

  function toggleBrands(v){
    setShowBrands(v);
    BrandPref.set(v);
  }

  return (
    <>
      <SiteHeader showBrands={showBrands} onToggleBrands={toggleBrands} onPrint={()=>window.print()} />
      <main>
        <AilmentPicker
          ailments={ailments}
          value={ailmentKey}
          onChange={(k)=>{ setAilmentKey(k); setAnswers({}); setResult(null); }}
          onReset={onReset}
        />
        <QuestionsForm
          aName={a.name || ailmentKey}
          questions={a.questions}
          answers={answers}
          onChange={onChangeAnswer}
          onSubmit={onSubmit}
          showDosing={showDosing}
          onOpenDosing={()=>setDosingOpen(true)}
        />
        {result && (
          <Results
            aName={a.name || ailmentKey}
            payload={result}
            showBrands={showBrands}
          />
        )}
      </main>
      <footer className="footer no-print">
        OTC Advisor <strong>React</strong> — <span id="buildDate">{new Date().toISOString().slice(0,16).replace('T',' ')}</span>
      </footer>

      <DosingModal open={dosingOpen} onClose={()=>setDosingOpen(false)} />
    </>
  );
}

/* ----------------------- Mount ----------------------- */
const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);
