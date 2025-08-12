/* eslint-disable no-undef */
console.log("OTC Advisor — React build 1");

/* ----------------------- Utilities & Data ----------------------- */
const BrandPref = {
  key: "otc_show_brands",
  get(){ try { return JSON.parse(localStorage.getItem(this.key) ?? "true"); } catch { return true; } },
  set(v){ try { localStorage.setItem(this.key, JSON.stringify(!!v)); } catch {} }
};
/* Persist answers per ailment */
const AnswerStore = {
  key: "otc_answers_v1",
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

const AgeGroupInput = (id, label, required=false) => ({
  id, type: "agegroup", label, required, groups: [
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
  name:"Allergies",
  questions:[
    {
      id: "agegrp",
      type: "agegroup",
      label: "Age group",
      required: true,
      groups: [
        { value: "0-1", label: "0–1 year" },
        { value: "2-12", label: "2–12 years" },
        { value: ">12", label: ">12 years" },
      ]
    },
    { id:"severity", type:"select", label:"How bad are symptoms?", options:["Mild (not daily life-limiting)","Moderate/Severe (affects sleep/daily life)"], required:true },
    { id:"symptoms", type:"multiselect", label:"Main symptoms", options:["Sneezing/itching","Rhinorrhea (runny nose)","Nasal congestion","Ocular symptoms (itchy/watery eyes)"]}
  ],
  recommend:(a)=>{
    const refer=[], notes=[], recs=[], nonDrug=[];
    const ag=a.agegrp, sev=a.severity, sym=a.symptoms||[];
    nonDrug.push("Avoid triggers; saline irrigation.");
    if (ag==="0-1") { notes.push("For infants: saline + pediatric evaluation."); return {refer,notes,recs,nonDrug,showDosing:false}; }
    const hasCong=sym.includes("Nasal congestion"), eyes=sym.includes("Ocular symptoms (itchy/watery eyes)");
    if (sev==="Moderate/Severe (affects sleep/daily life)" || hasCong){
      recs.push(card("Intranasal corticosteroid (INCS)",["Flonase (fluticasone)", "Nasacort (triamcinolone)", "Rhinocort (budesonide)"],"Daily; proper technique.","Irritation/epistaxis possible.","INCS"));
      if (eyes) recs.push(card("Oral non‑sedating antihistamine",["cetirizine", "loratadine", "fexofenadine"],"Once daily.","Mild drowsiness (cetirizine).","Cetirizine"));
    } else {
      recs.push(card("Oral non‑sedating antihistamine",["cetirizine", "loratadine", "fexofenadine"],"Once daily.","Less helpful for congestion alone.","Cetirizine"));
    }
    return { refer, notes, recs, nonDrug, showDosing:false };
  }
},
fever: {
  name:"Fever",
  questions:[
    {
      id: "agegrp",
      type: "agegroup",
      label: "Age group",
      required: true,
      groups: [
        { value: "0-1", label: "0–1 year" },
        { value: "2-12", label: "2–12 years" },
        { value: ">12", label: ">12 years" },
      ]
    },
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
},
  nasal_congestion: {
    name: "Nasal Congestion",
    questions: [
      {
        id: "agegrp",
        type: "agegroup",
        label: "Age group",
        required: true,
        groups: [
          { value: "0-1", label: "0–1 year" },
          { value: "2-12", label: "2–12 years" },
          { value: ">12", label: ">12 years" },
        ]
      },
      { id:"duration", type:"select", label:"How long?", options:["<3 days","3–7 days",">7 days"], required:true },
      { id:"hx", type:"multiselect", label:"History", options:["Pregnant","Uncontrolled hypertension","Glaucoma/BPH/urinary retention"] }
    ],
    recommend: (a) => {
      const recs=[], notes=[], nonDrug=[], refer=[];
      const hx=a.hx||[];
      nonDrug.push("Saline spray/irrigation, humidifier, hydrate; elevate head during sleep.");
      recs.push(card("Intranasal corticosteroid (INCS)",["fluticasone", "triamcinolone", "budesonide"],"1–2 sprays/nostril daily; allow several days for full effect.","Irritation/epistaxis possible.","INCS"));
      recs.push(card("Short‑term topical decongestant",["oxymetazoline"],"Use up to 3 days for severe congestion.",">3 days can cause rebound congestion (rhinitis medicamentosa).","Oxymetazoline"));
      if (!hx.includes("Uncontrolled hypertension"))
        recs.push(card("Oral decongestant",["pseudoephedrine", "phenylephrine"],"As directed on label.","Avoid with uncontrolled HTN, certain eye/urinary conditions, or stimulant sensitivity.","Pseudoephedrine"));
      if (a.duration === ">7 days") notes.push("If symptoms persist >7–10 days or worsen, consider evaluation.");
      return { refer, notes, recs, nonDrug, showDosing:false };
    }
  },

  cough: {
    name:"Cough",
    questions:[
      {
        id: "agegrp",
        type: "agegroup",
        label: "Age group",
        required: true,
        groups: [
          { value: "0-1", label: "0–1 year" },
          { value: "2-12", label: "2–12 years" },
          { value: ">12", label: ">12 years" },
        ]
      },
      { id:"type", type:"select", label:"Cough type", options:["Dry","Wet/productive","Unknown"], required:true },
      { id:"duration", type:"select", label:"Duration", options:["<1 week","1–3 weeks",">3 weeks"], required:true },
      { id:"red", type:"multiselect", label:"Any of these?", options:["Shortness of breath","Chest pain","Bloody sputum","High fever","Asthma/COPD"] }
    ],
    recommend:(a)=>{
      const recs=[], notes=[], nonDrug=[], refer=[];
      const red=a.red||[];
      if (red.length) refer.push("Red‑flag symptoms present (SOB, chest pain, hemoptysis, high fever, severe underlying disease). Seek medical care.");
      nonDrug.push("Honey for ≥1 year olds; humidifier; hydrate; avoid smoke/irritants.");
      if (a.type==="Dry") {
        recs.push(card("Dextromethorphan",["dextromethorphan"],"Per label up to q6–8h or ER q12h.","Avoid with MAOIs/serotonergic interactions.","Dextromethorphan"));
      }
      if (a.type==="Wet/productive" || a.type==="Unknown") {
        recs.push(card("Guaifenesin",["guaifenesin"],"With plenty of water.","GI upset possible.","Guaifenesin"));
      }
      notes.push("Avoid OTC cough/cold combos in young children; follow age labeling.");
      if (a.duration === ">3 weeks") notes.push("Cough >3 weeks → consider evaluation (post‑viral cough, asthma, GERD, etc.).");
      return { refer, notes, recs, nonDrug, showDosing:false };
    }
  },

  heartburn: {
    name:"Heartburn / Indigestion",
    questions:[
      {
        id: "agegrp",
        type: "agegroup",
        label: "Age group",
        required: true,
        groups: [
          { value: "0-1", label: "0–1 year" },
          { value: "2-12", label: "2–12 years" },
          { value: ">12", label: ">12 years" },
        ]
      },
      { id:"freq", type:"select", label:"How often?", options:["Occasional (<2 days/week)","Frequent (≥2 days/week)"], required:true },
      { id:"alarm", type:"multiselect", label:"Any alarm features?", options:["Trouble swallowing","Unintentional weight loss","Vomiting blood/black stools","Severe chest pain"] }
    ],
    recommend:(a)=>{
      const recs=[], notes=[], nonDrug=[], refer=[];
      if ((a.alarm||[]).length) refer.push("Alarm symptoms present. Seek medical evaluation.");
      nonDrug.push("Smaller meals; avoid late meals; limit triggers (fat, caffeine, alcohol); elevate head of bed; weight management if applicable.");
      if (a.freq==="Occasional (<2 days/week)") {
        recs.push(card("Antacid (rapid relief)",["calcium carbonate, magnesium/aluminum salts"],"As needed per label.","Short‑acting; watch for constipation/diarrhea depending on salt."));
        recs.push(card("H2 blocker",["famotidine"],"Before meals or at symptoms onset.","Tolerance possible with daily use."));
      } else {
        recs.push(card("PPI short course",["omeprazole"],"Daily for 14 days then reassess.","Takes 1–4 days for full effect. Don’t combine with other acid reducers unless directed."));
      }
      notes.push("Persistent symptoms despite OTC therapy → evaluation for GERD or other causes.");
      return { refer, notes, recs, nonDrug, showDosing:false };
    }
  },

  constipation: {
    name:"Constipation",
    questions:[
      {
        id: "agegrp",
        type: "agegroup",
        label: "Age group",
        required: true,
        groups: [
          { value: "0-1", label: "0–1 year" },
          { value: "2-12", label: "2–12 years" },
          { value: ">12", label: ">12 years" },
        ]
      },
      { id:"duration", type:"select", label:"How long?", options:["<3 days","3–7 days",">7 days"], required:true },
      { id:"features", type:"multiselect", label:"Features", options:["Hard stools","Straining","Painful stools","Blood in stool","Recent opioid use"] }
    ],
    recommend:(a)=>{
      const recs=[], notes=[], nonDrug=[], refer=[];
      if ((a.features||[]).includes("Blood in stool")) refer.push("Blood in stool → medical evaluation.");
      nonDrug.push("Gradually increase fiber, fluids, and physical activity.");
      recs.push(card("Osmotic laxative",["PEG 3350"],"Once daily; titrate to soft stools.","Onset 1–3 days.","PEG 3350"));
      recs.push(card("Bulk fiber",["psyllium", "methylcellulose"],"Daily with water.","Gas/bloating possible initially.","Psyllium (fiber)"));
      recs.push(card("Stool softener",["docusate"],"Adjunct if hard stools predominate.","Variable benefit.","Docusate"));
      if ((a.features||[]).includes("Recent opioid use")) notes.push("Consider stimulant laxative for opioid‑induced constipation (senna/bisacodyl).");
      recs.push(card("Stimulant (rescue)",["senna", "bisacodyl"],"PRN, preferably at bedtime.","Cramping possible; short‑term use.","Senna"));
      if (a.duration === ">7 days") notes.push("Constipation >1 week despite OTC measures → consider evaluation.");
      return { refer, notes, recs, nonDrug, showDosing:false };
    }
  },

  sore_throat: {
    name:"Sore Throat",
    questions:[
      {
        id: "agegrp",
        type: "agegroup",
        label: "Age group",
        required: true,
        groups: [
          { value: "0-1", label: "0–1 year" },
          { value: "2-12", label: "2–12 years" },
          { value: ">12", label: ">12 years" },
        ]
      },
      { id:"assoc", type:"multiselect", label:"Associated symptoms", options:["Fever","Cough","Runny nose","Rash","Swollen lymph nodes","Trouble breathing/swallowing"] }
    ],
    recommend:(a)=>{
      const recs=[], notes=[], nonDrug=[], refer=[];
      if ((a.assoc||[]).includes("Trouble breathing/swallowing")) refer.push("Difficulty breathing or swallowing → urgent evaluation.");
      nonDrug.push("Warm fluids; saline gargles; throat lozenges/sprays (age‑appropriate); humidified air.");
      recs.push(card("Pain/fever relief",["acetaminophen", "ibuprofen (≥6 months)"],"As directed on label.","Avoid duplicate acetaminophen; ibuprofen cautions (GI/renal/pregnancy).","Acetaminophen"));
      notes.push("Cough/runny nose favor viral; absence of cough with fever + tender lymph nodes may suggest strep—seek testing if concerned.");
      return { refer, notes, recs, nonDrug, showDosing:true };
    }
  },

  diarrhea: {
    name:"Diarrhea",
    questions:[
      {
        id: "agegrp",
        type: "agegroup",
        label: "Age group",
        required: true,
        groups: [
          { value: "0-1", label: "0–1 year" },
          { value: "2-12", label: "2–12 years" },
          { value: ">12", label: ">12 years" },
        ]
      },
      { id:"features", type:"multiselect", label:"Any of these?", options:["Blood or black stools","High fever","Severe dehydration","Recent antibiotic use","Travel exposure"] }
    ],
    recommend:(a)=>{
      const recs=[], notes=[], nonDrug=[], refer=[];
      const f=a.features||[];
      if (f.includes("Blood or black stools") || f.includes("Severe dehydration")) refer.push("Red flags present → medical evaluation.");
      nonDrug.push("Oral rehydration solution first; small frequent sips.");
      recs.push(card("Loperamide (adults)",["loperamide"],"Start per label, then after each loose stool up to max.","Avoid if blood/high fever or suspected dysentery.","Loperamide"));
      recs.push(card("Bismuth subsalicylate (adults)",["bismuth subsalicylate"],"Per label.","Avoid with aspirin allergy, certain meds, pregnancy; may darken stool/tongue.","Bismuth subsalicylate"));
      if (f.includes("Recent antibiotic use")) notes.push("Consider possibility of C. difficile if severe/persistent—seek care.");
      if (f.includes("Travel exposure")) notes.push("Traveler’s diarrhea: fluids, consider bismuth; seek care if severe.");
      return { refer, notes, recs, nonDrug, showDosing:false };
    }
  },

  cold: {
    name:"Common Cold",
    questions:[
      {
        id: "agegrp",
        type: "agegroup",
        label: "Age group",
        required: true,
        groups: [
          { value: "0-1", label: "0–1 year" },
          { value: "2-12", label: "2–12 years" },
          { value: ">12", label: ">12 years" },
        ]
      },
      { id:"symptoms", type:"multiselect", label:"Symptoms", options:["Nasal congestion","Runny nose","Cough","Sore throat","Fever","Body aches"] }
    ],
    recommend:(a)=>{
      const recs=[], notes=[], nonDrug=[], refer=[];
      nonDrug.push("Rest, fluids, humidifier, saline irrigation, honey (≥1 year).");
      const s=a.symptoms||[];
      if (s.includes("Nasal congestion")) recs.push(card("INCS or short‑term oxymetazoline",["fluticasone", "oxymetazoline"],"INCS daily; oxymetazoline ≤3 days.","Rebound risk with prolonged topical decongestants.","Oxymetazoline"));
      if (s.includes("Cough")) recs.push(card("Dextromethorphan / Guaifenesin",["dextromethorphan", "guaifenesin"],"As directed; hydrate well.","DM interactions; guaifenesin needs fluids.","Dextromethorphan"));
      if (s.includes("Body aches") || s.includes("Fever")) recs.push(card("Analgesic/antipyretic",["acetaminophen", "ibuprofen (≥6 months)"],"As directed.","Watch max doses and duplicates.","Acetaminophen"));
      notes.push("Avoid multi‑symptom combos when possible; pick single‑ingredient products for targeted relief.");
      return { refer, notes, recs, nonDrug, showDosing:true };
    }
  },

  sleep: {
    name:"Sleep Difficulty",
    questions:[
      {
        id: "agegrp",
        type: "agegroup",
        label: "Age group",
        required: true,
        groups: [
          { value: "0-1", label: "0–1 year" },
          { value: "2-12", label: "2–12 years" },
          { value: ">12", label: ">12 years" },
        ]
      },
      { id:"pattern", type:"select", label:"Pattern", options:["Trouble falling asleep","Frequent awakenings","Jet lag/shift change"], required:true },
      { id:"contra", type:"multiselect", label:"Avoid sedating antihistamines if…", options:["Glaucoma","BPH/urinary retention","Elderly/fall risk","Pregnant/breastfeeding"] }
    ],
    recommend:(a)=>{
      const recs=[], notes=[], nonDrug=[], refer=[];
      nonDrug.push("Sleep hygiene: consistent schedule, cool/dark room, limit screens/caffeine, wind‑down routine.");
      if (!(a.contra||[]).some(x=>["Glaucoma","BPH/urinary retention","Elderly/fall risk","Pregnant/breastfeeding"].includes(x))) {
        recs.push(card("Sedating antihistamine (short‑term)",["diphenhydramine", "doxylamine"],"Occasional use only.","Next‑day drowsiness/anticholinergic effects; avoid chronic use.","Diphenhydramine"));
      } else {
        notes.push("Sedating antihistamines not advised given risk factors selected.");
      }
      notes.push("Persistent insomnia ≥3 weeks → evaluate for underlying causes (pain, OSA, anxiety, meds).");
      return { refer, notes, recs, nonDrug, showDosing:false };
    }
  },

  pain: {
    name:"Pain",
    questions:[
      {
        id: "agegrp",
        type: "agegroup",
        label: "Age group",
        required: true,
        groups: [
          { value: "0-1", label: "0–1 year" },
          { value: "2-12", label: "2–12 years" },
          { value: ">12", label: ">12 years" },
        ]
      },
      { id:"site", type:"select", label:"Pain type", options:["Headache","Muscle/joint pain","Dental pain","Dysmenorrhea","Other"], required:true },
      { id:"gi", type:"multiselect", label:"Risk factors", options:["Ulcer history","Kidney disease","Anticoagulant use","Late pregnancy"] }
    ],
    recommend:(a)=>{
      const recs=[], notes=[], nonDrug=[], refer=[];
      nonDrug.push("RICE for acute strains/sprains; heat for chronic muscle tightness.");
      recs.push(card("Acetaminophen",["acetaminophen"],"As directed; good baseline option.","Beware duplicate APAP across products.","Acetaminophen"));
      if (!(a.gi||[]).some(x=>["Ulcer history","Kidney disease","Late pregnancy"].includes(x))) {
        recs.push(card("NSAID (ibuprofen/naproxen)",["ibuprofen", "naproxen"],"With food if GI upset; follow max doses.","Avoid with ulcer history, renal disease, late pregnancy.","Ibuprofen"));
      } else {
        notes.push("NSAIDs may not be appropriate given selected risk factors.");
      }
      if (a.site==="Muscle/joint pain") {
        recs.push(card("Topical diclofenac (adults)",["diclofenac gel"],"Apply to affected area as labeled.","Avoid on broken skin; wash hands.","Diclofenac gel"));
      }
      return { refer, notes, recs, nonDrug, showDosing:true };
    }
  },

  multi: {
    name:"Multi‑Symptom",
    questions:[
      {
        id: "agegrp",
        type: "agegroup",
        label: "Age group",
        required: true,
        groups: [
          { value: "0-1", label: "0–1 year" },
          { value: "2-12", label: "2–12 years" },
          { value: ">12", label: ">12 years" },
        ]
      },
      { id:"goals", type:"multiselect", label:"What do you want to treat?", options:["Fever/pain","Nasal congestion","Runny nose/sneezing","Cough","Sleep at night"] }
    ],
    recommend:(a)=>{
      const recs=[], notes=[], nonDrug=[], refer=[];
      nonDrug.push("Fluids, rest, humidifier, saline.");
      const g=a.goals||[];
      if (g.includes("Fever/pain")) recs.push(card("Acetaminophen or ibuprofen",["acetaminophen", "ibuprofen"],"As directed on label.","Avoid duplicate APAP; ibuprofen cautions.","Acetaminophen"));
      if (g.includes("Nasal congestion")) recs.push(card("INCS / short‑term oxymetazoline / pseudoephedrine",["fluticasone", "oxymetazoline", "pseudoephedrine"],"Target congestion specifically.","Topical ≤3 days; oral decongestants not for certain conditions.","Pseudoephedrine"));
      if (g.includes("Runny nose/sneezing")) recs.push(card("Non‑sedating antihistamine",["cetirizine", "loratadine", "fexofenadine"],"Once daily.","Less helpful for pure congestion.","Cetirizine"));
      if (g.includes("Cough")) recs.push(card("Dextromethorphan ± Guaifenesin",["dextromethorphan", "guaifenesin"],"Per label.","Check interactions; hydrate.","Dextromethorphan"));
      if (g.includes("Sleep at night")) recs.push(card("Sedating antihistamine (short‑term)",["diphenhydramine", "doxylamine"],"Occasional nights only.","Anticholinergic effects; avoid in elderly, glaucoma, BPH, pregnancy.","Diphenhydramine"));
      notes.push("Prefer single‑ingredient products to avoid duplicate/contraindicated ingredients.");
      return { refer, notes, recs, nonDrug, showDosing:true };
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

/* ----------------------- React components ----------------------- */

function SiteHeader({showBrands, onToggleBrands, onPrint, onSubmit}) {
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
          <button className="btn btn-primary" type="button" onClick={onSubmit}>
            Get Recommendation
          </button>
        </div>
      </div>
    </header>
  );
}

function AilmentPicker({ailments, value, onChange, onReset}) {
  // Sort the ailments alphabetically by name
  const sortedAilments = Object.entries(ailments).sort(([, a], [, b]) => a.name.localeCompare(b.name));
  
  return (
    <div className="card">
      <div className="row">
        <div>
          <label htmlFor="ailment">Choose an ailment</label>
          <select id="ailment" value={value} onChange={(e)=>onChange(e.target.value)}>
            {sortedAilments.map(([k,v]) => (
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
    <option value="" disabled>Select an option…</option>
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
function isAnswered(q, answers){
  const v = answers[q.id];
  if (q.type === 'multiselect') return Array.isArray(v) && v.length > 0;
  return v != null && String(v).trim() !== "";
}

function QuestionsForm({aName, questions, answers, onChange, onSubmit, showDosing, onOpenDosing}) {
  const list = Array.isArray(questions) ? questions : [];
  const required = list.filter(q => q.required);
  const allGood = required.every(q => isAnswered(q, answers));

  return (
    <div className="card">
      <div className="title">{aName} — Intake</div>
      <hr />
      {list.length === 0 ? (
        <div className="muted">No questions configured yet for this ailment.</div>
      ) : (
        list.map(q => (
          <QuestionBlock key={q.id} q={q} value={answers[q.id]} onChange={onChange} />
        ))
      )}

      {!allGood && required.length > 0 && (
        <div className="muted" style={{marginTop:8}}>
          Please answer all required questions (marked with * ) to continue.
        </div>
      )}

      <div className="row no-print" style={{marginTop:12}}>
        <button className="btn btn-primary" onClick={onSubmit} disabled={!allGood}>
          Get Recommendation
        </button>
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

function planToText(aName, payload){
  const { refer=[], notes=[], recs=[], nonDrug=[] } = payload || {};
  const lines = [];
  lines.push(`${aName} — Recommendation`);
  if (refer.length){ lines.push("", "Refer:", ...refer.map(x=>`• ${x}`)); }
  if (recs.length){
    lines.push("", "OTC options:");
    recs.forEach(r=>{
      const title = r?.title || "Option";
      const examples = (r?.examples && r.examples.length) ? `Examples: ${r.examples.join(", ")}` : "";
      const how = r?.how ? `How: ${r.how}` : "";
      const warn = r?.warn ? `Notes: ${r.warn}` : "";
      lines.push(`• ${title}${examples?` — ${examples}`:""}`);
      if (how) lines.push(`   ${how}`);
      if (warn) lines.push(`   ${warn}`);
    });
  }
  if (nonDrug.length){ lines.push("", "Non-drug measures:", ...nonDrug.map(x=>`• ${x}`)); }
  if (notes.length){ lines.push("", "Important:", notes.join(" ")); }
  return lines.join("\n");
}

function Results({aName, payload, showBrands}) {
  const [query, setQuery] = React.useState("");
  const { refer=[], notes=[], recs=[], nonDrug=[] } = payload || {};

  const filtered = React.useMemo(()=>{
    if (!query) return recs;
    const q = query.toLowerCase();
    return recs.filter(r => (JSON.stringify(r) || "").toLowerCase().includes(q));
  }, [recs, query]);

  function copyPlan(){
    const txt = planToText(aName, payload);
    document.execCommand('copy').then(
      ()=>alert("Plan copied to clipboard ✅"),
      ()=>alert("Could not copy. (Your browser may block clipboard access.)")
    );
  }

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
        <button className="btn btn-ghost" type="button" onClick={copyPlan}>Copy plan</button>
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
  const ailments = CORE;

  // pick the first ailment that actually has questions
  const validKeys = Object.keys(ailments).filter(k => Array.isArray(ailments[k]?.questions));

  // (new) respect URL hash if present, else first valid key
  const initialFromHash = (location.hash || "").replace(/^#/, "");
  const initialKey = validKeys.includes(initialFromHash) ? initialFromHash : (validKeys[0] ?? Object.keys(ailments)[0]);

  const [ailmentKey, setAilmentKey] = React.useState(initialKey);
  const [answers, setAnswers] = React.useState(() => AnswerStore.get(initialKey)); // load saved
  const [result, setResult] = React.useState(null);
  const [showBrands, setShowBrands] = React.useState(BrandPref.get());
  const [dosingOpen, setDosingOpen] = React.useState(false);
  const a = ailments[ailmentKey];

  // keep URL hash in sync (nice little deep-link)
  React.useEffect(()=>{ if (ailmentKey) location.hash = ailmentKey; }, [ailmentKey]);

  const showDosing = React.useMemo(()=>{
    try { return !!a.recommend({}).showDosing; } catch { return false; }
  }, [a]);

  // (updated) when answers change, save them
  function onChangeAnswer(id, value){
    setAnswers(prev => {
      const next = { ...prev, [id]: value };
      AnswerStore.set(ailmentKey, next);
      return next;
    });
  }

  function onSubmit(){
  try {
    const normalized = normalizeAnswers(answers);
    const payload = a && typeof a.recommend === "function"
      ? a.recommend(normalized) || {}
      : {};

    // minimal fallback so Results always renders something
    const safePayload = {
      refer: Array.isArray(payload.refer) ? payload.refer : [],
      notes: Array.isArray(payload.notes) ? payload.notes : [],
      recs:  Array.isArray(payload.recs)  ? payload.recs  : [],
      nonDrug: Array.isArray(payload.nonDrug) ? payload.nonDrug : [],
      showDosing: !!payload.showDosing
    };

    setResult(safePayload);

    // Scroll to results (defer so React can render first)
    setTimeout(()=>{
      window.scrollTo({ top: document.body.scrollTop + 280, behavior: 'smooth' });
    }, 0);
  } catch (err) {
    console.error("Recommend error:", err);
    alert("Sorry—something went wrong creating the plan. Check the console for details.");
  }
}


  // (updated) on ailment change: swap answers to those saved for that ailment
  function changeAilment(k){
    setAilmentKey(k);
    setAnswers(AnswerStore.get(k));
    setResult(null);
  }

  function onReset(){
    AnswerStore.clear(ailmentKey);
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
      <SiteHeader showBrands={showBrands} onToggleBrands={toggleBrands} onPrint={()=>window.print()} onSubmit={onSubmit} />
      <main>
        <AilmentPicker
          ailments={ailments}
          value={ailmentKey}
          onChange={changeAilment}   // <-- uses the new function
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
