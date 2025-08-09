
console.log("App loaded v2.6");
function showError(msg){try{const b=document.getElementById('errorBanner');if(!b)return;b.textContent=msg;b.hidden=false;}catch{}}

// Brand DB
const BRAND_DB = {
  "Acetaminophen": ["Tylenol","Children's Tylenol","Store brand acetaminophen"],
  "Ibuprofen": ["Advil","Motrin","Children's Ibuprofen"],
  "Naproxen": ["Aleve"],
  "PEG 3350": ["MiraLAX"],
  "Fiber": ["Metamucil","Citrucel"],
  "Docusate": ["Colace"],
  "Senna": ["Senokot"],
  "Bisacodyl": ["Dulcolax"],
  "Loperamide": ["Imodium"],
  "Bismuth": ["Pepto-Bismol","Kaopectate"],
  "Non-sedating antihistamine": ["Claritin (loratadine)","Zyrtec (cetirizine)","Allegra (fexofenadine)"],
  "Sedating antihistamine": ["Benadryl (diphenhydramine)","Chlor-Trimeton (chlorpheniramine)","ZzzQuil (diphenhydramine)","Unisom (doxylamine)"],
  "INCS": ["Flonase (fluticasone)","Nasacort (triamcinolone)","Rhinocort (budesonide)"],
  "Oral decongestant": ["Sudafed (pseudoephedrine)","Sudafed PE (phenylephrine)"],
  "Topical decongestant": ["Afrin (oxymetazoline)"],
  "Dextromethorphan": ["Delsym","Robitussin DM"],
  "Guaifenesin": ["Mucinex"],
  "Topical diclofenac": ["Voltaren Arthritis Pain Gel"]
};

function brandsFor(recTitle, examples=[]) {
  const t = recTitle.toLowerCase();
  const out = new Set();

  function add(key){ (BRAND_DB[key]||[]).forEach(b => out.add(b)); }

  if (t.includes("acetaminophen")) add("Acetaminophen");
  if (t.includes("ibuprofen")) add("Ibuprofen");
  if (t.includes("naproxen")) add("Naproxen");
  if (t.includes("peg") || t.includes("osmotic") ) add("PEG 3350");
  if (t.includes("fiber") || t.includes("psyllium") ) add("Fiber");
  if (t.includes("docusate") || t.includes("stool softener")) add("Docusate");
  if (t.includes("senna")) add("Senna");
  if (t.includes("bisacodyl")) add("Bisacodyl");
  if (t.includes("loperamide")) add("Loperamide");
  if (t.includes("bismuth")) add("Bismuth");
  if (t.includes("antihistamine")) {
    if (t.includes("non-sedating") || t.includes("non‑sedating")) add("Non-sedating antihistamine");
    if (t.includes("sedating")) add("Sedating antihistamine");
  }
  if (t.includes("intranasal corticosteroid") || t.includes("incs")) add("INCS");
  if (t.includes("oral decongestant")) add("Oral decongestant");
  if (t.includes("topical decongestant")) add("Topical decongestant");
  if (t.includes("dextromethorphan") || t.includes("antitussive")) add("Dextromethorphan");
  if (t.includes("guaifenesin") || t.includes("expectorant")) add("Guaifenesin");
  if (t.includes("topical diclofenac") || t.includes("diclofenac")) add("Topical diclofenac");

  // Also infer from examples text
  (examples||[]).forEach(ex => {
    const e = ex.toLowerCase();
    if (e.includes("omeprazole")) out.add("Prilosec OTC (omeprazole)");
    if (e.includes("famotidine")) out.add("Pepcid (famotidine)");
  });

  return Array.from(out);
}

// Age group chips
function AgeGroupInput(id,label){
  const groups=[{value:"0-1",label:"0–1 year"},{value:"2-12",label:"2–12 years"},{value:">12",label:">12 years"}];
  return {id, type:"agegroup", label, groups};
}

// Dosing helpers
const Dosing=(function(){
  const s={unit:"kg",weight:null};
  function setUnit(u){s.unit=u;}
  function setWeight(w){s.weight=isNaN(w)?null:Number(w);}
  function toKg(){if(s.weight==null)return null;return s.unit==="kg"?s.weight:s.weight*0.45359237;}
  function apapDose(){const kg=toKg(); if(kg==null) return null; return {mgPerDoseLow:Math.round(kg*10), mgPerDoseHigh:Math.round(kg*15)};}
  function ibuDose(){const kg=toKg(); if(kg==null) return null; return {mgPerDoseLow:Math.round(kg*5), mgPerDoseHigh:Math.round(kg*10)};}
  function volFor(mg, per5){ if(!mg||!per5) return null; const mL=(mg/per5)*5; return Math.round(mL/2.5)*2.5; }
  return {state:s, setUnit, setWeight, apapDose, ibuDose, volFor};
})();

// DATA
window.DATA = window.DATA || {};
const BASE = {
  // (same as earlier ailments) trimmed here for brevity in this construction; we'll define the key ones below.
};

// For brevity, we programmatically attach previously defined ailments from a helper to keep this file concise.

function buildAilments() {
  const A = {};

  // Cough
  A.cough = {
    name:"Cough",
    questions:[
      AgeGroupInput("agegrp","Age group"),
      { id:"duration", type:"select", label:"How long has the cough lasted?", options:["<1 week","1–3 weeks",">3 weeks"], required:true },
      { id:"productive", type:"select", label:"Is the cough wet/productive?", options:["Yes","No"], required:true },
      { id:"redflags", type:"multiselect", label:"Any of these red flags?", options:["Shortness of breath or wheezing","Coughing up blood","High fever","Unintentional weight loss"]}
    ],
    recommend:(a)=>{
      const R=[],N=[],C=[],ND=[];
      const g=a.agegrp, d=a.duration, p=a.productive, rf=a.redflags||[];
      if (rf.length) R.push("One or more red flags selected.");
      if (d === ">3 weeks") R.push("Cough longer than 3 weeks.");
      if (g === "0-1") N.push("Avoid OTC cough/cold medicines in children under 4.");
      ND.push("Hydration, warm fluids, humidified air.");
      ND.push("Throat lozenges (age‑appropriate).");
      if (g !== "0-1") ND.push("Honey 1/2–1 tsp as needed (not for <1 year).");
      if (!R.length && g !== "0-1"){
        if (p==="Yes") C.push({ title:"Expectorant (Guaifenesin)", examples:["Mucinex (guaifenesin)"], how:"Take with water; hydration improves effect.", warn:"Stop and seek care if fever, worsening, or >7 days."});
        else C.push({ title:"Antitussive (Dextromethorphan)", examples:["Delsym (dextromethorphan ER)"], how:"Use as directed for dry cough.", warn:"Do not use with MAOIs."});
      }
      return { refer:R, notes:N, recs:C, nonDrug:ND, showDosing:false };
    }
  };

  // Heartburn
  A.heartburn = {
    name:"Heartburn / Indigestion",
    questions:[
      AgeGroupInput("agegrp","Age group"),
      { id:"freq", type:"select", label:"How often?", options:["<2 days/week","≥2 days/week"], required:true },
      { id:"alarm", type:"multiselect", label:"Any alarm symptoms?", options:["Trouble/painful swallowing","Vomiting blood or black stools","Unintentional weight loss","Severe chest pain"]},
      { id:"preg", type:"select", label:"Pregnant?", options:["No","Yes"]}
    ],
    recommend:(a)=>{
      const R=[],N=[],C=[],ND=[];
      const g=a.agegrp, f=a.freq, alarms=a.alarm||[], preg=a.preg||"No";
      if (alarms.length) R.push("Alarm symptoms present.");
      ND.push("Avoid trigger foods, smaller meals, avoid late meals, elevate head of bed.");
      if (!alarms.length){
        if (f === "<2 days/week"){
          if (preg==="Yes") C.push({title:"Antacid (calcium carbonate)", examples:["Tums"], how:"Use as needed.", warn:"If frequent use needed, discuss with provider."});
          else C.push({title:"Antacid or H2RA (famotidine)", examples:["Tums","Pepcid (famotidine)"], how:"Antacid for quick relief; H2RA for longer relief.", warn:"Seek care if symptoms persist >2 weeks."});
        } else {
          if (g==="0-1"||g==="2-12") N.push("Children with frequent heartburn should be evaluated before OTC PPI.");
          else C.push({title:"PPI trial (14 days)", examples:["omeprazole 20 mg daily"], how:"Daily before breakfast for 14 days.", warn:"If persistent/recurs, see provider."});
        }
      }
      return { refer:R, notes:N, recs:C, nonDrug:ND, showDosing:false };
    }
  };

  // Constipation
  A.constipation = {
    name:"Constipation",
    questions:[
      AgeGroupInput("agegrp","Age group"),
      { id:"duration", type:"select", label:"How long?", options:["<1 week","1–3 weeks",">3 weeks"], required:true },
      { id:"features", type:"multiselect", label:"Any of these?", options:["Severe abdominal pain","Vomiting","Blood in stool","Unintentional weight loss","Fever"]},
      { id:"preg", type:"select", label:"Pregnant?", options:["No","Yes"]}
    ],
    recommend:(a)=>{
      const R=[],N=[],C=[],ND=[]; const g=a.agegrp, d=a.duration, f=a.features||[], preg=a.preg||"No";
      if (f.includes("Severe abdominal pain")) R.push("Severe abdominal pain.");
      if (f.includes("Vomiting")) R.push("Vomiting present.");
      if (f.includes("Blood in stool")) R.push("Blood in stool.");
      if (f.includes("Unintentional weight loss")) R.push("Unintentional weight loss.");
      if (d === ">3 weeks") R.push("Constipation >3 weeks.");
      ND.push("Increase fluids and dietary fiber; physical activity.");
      if (g==="0-1") ND.push("Infants: small water; >4 mo small prune/pear juice; discuss with pediatrician.");
      if (!R.length){
        if (g === ">12"){
          if (preg==="Yes"){
            C.push({title:"Bulk‑forming fiber (psyllium)", examples:["Metamucil"], how:"Start low; take with water.", warn:"Separate from other meds by 2 hours."});
            C.push({title:"Stool softener (docusate)", examples:["Colace"], how:"Useful for hard, dry stools.", warn:"If ineffective in a few days, discuss alternatives."});
          } else {
            C.push({title:"Osmotic laxative (PEG 3350)", examples:["MiraLAX"], how:"Mix with water; may take 1–3 days.", warn:"Not for prolonged use without advice."});
            C.push({title:"Bulk‑forming fiber (psyllium)", examples:["Metamucil","Citrucel"], how:"Increase slowly with water.", warn:"Gas/bloating initially."});
            C.push({title:"Stimulant (senna or bisacodyl) — short term", examples:["Senokot","Dulcolax"], how:"Use short courses.", warn:"Abdominal cramping possible."});
          }
        } else if (g === "2-12"){
          N.push("Children: many laxatives require clinician guidance for dosing/duration.");
          C.push({title:"Glycerin suppository (pediatric)", examples:["Glycerin pediatric"], how:"Per label by age.", warn:"If recurrent, seek pediatric advice."});
          C.push({title:"Stool softener (docusate)", examples:["Docusate pediatric"], how:"Per label by age/weight.", warn:"Consult pediatrician for ongoing use."});
        } else {
          N.push("Avoid most OTC laxatives in infants without pediatric guidance.");
          C.push({title:"Glycerin suppository (infant) — occasional", examples:["Glycerin infant"], how:"Per label and pediatric advice.", warn:"If distention/fever present, seek care."});
        }
      }
      return { refer:R, notes:N, recs:C, nonDrug:ND, showDosing:false };
    }
  };

  // Fever
  A.fever = {
    name:"Fever",
    questions:[
      AgeGroupInput("agegrp","Age group"),
      { id:"temp", type:"select", label:"Highest temperature (°F)", options:["<100.4","100.4–102.2","102.3–104",">104"], required:true },
      { id:"duration", type:"select", label:"How long?", options:["<24 hours","1–3 days",">3 days"], required:true },
      { id:"sx", type:"multiselect", label:"Any of these?", options:["Stiff neck","Rash","Severe sore throat or ear pain","Shortness of breath","Dehydration/poor intake","Confusion/lethargy","Recent surgery/chemo/immunosuppression"]}
    ],
    recommend:(a)=>{
      const R=[],N=[],C=[],ND=[]; const g=a.agegrp, t=a.temp, du=a.duration, s=a.sx||[];
      if (s.length) R.push("Concerning associated symptoms present.");
      if (t === ">104") R.push("Very high fever (>104°F).");
      if (du === ">3 days") R.push("Fever >3 days.");
      if (g==="0-1" && (t==="100.4–102.2"||t==="102.3–104"||t===">104")) N.push("Infants <3 months with ≥100.4°F require immediate medical evaluation.");
      ND.push("Hydration; light clothing; tepid sponging (avoid cold baths/alcohol rubs).");
      if (!R.length){
        if (g==="0-1"){
          C.push({title:"Acetaminophen (if ≥3 months)", examples:["Tylenol infant"], how:"Per label by weight; avoid duplicate APAP.", warn:"If under 3 months with ≥100.4°F, seek care immediately."});
          N.push("Ibuprofen generally not recommended for <6 months.");
        } else if (g==="2-12"){
          C.push({title:"Acetaminophen", examples:["Tylenol"], how:"Per label by weight (mg/kg).", warn:"Do not exceed max daily dose; check combo products."});
          C.push({title:"Ibuprofen (≥6 months)", examples:["Advil/Motrin"], how:"Per label by weight (mg/kg).", warn:"Avoid if dehydration/ulcer/renal risk."});
        } else {
          C.push({title:"Acetaminophen", examples:["Tylenol"], how:"Use as directed.", warn:"Avoid exceeding 3,000–4,000 mg/day depending on label/health."});
          C.push({title:"Ibuprofen", examples:["Advil/Motrin"], how:"Use with food if GI upset.", warn:"Avoid if ulcer/kidney disease or late pregnancy."});
        }
      }
      return { refer:R, notes:N, recs:C, nonDrug:ND, showDosing:true };
    }
  };

  // Allergic Rhinitis
  A.allergic_rhinitis = {
    name:"Allergic Rhinitis",
    questions:[
      AgeGroupInput("agegrp","Age group"),
      { id:"severity", type:"select", label:"How bad are symptoms?", options:["Mild (not daily life-limiting)","Moderate/Severe (affects sleep/daily life)"], required:true },
      { id:"symptoms", type:"multiselect", label:"Main symptoms", options:["Sneezing/itching","Rhinorrhea (runny nose)","Nasal congestion","Ocular symptoms (itchy/watery eyes)"]}
    ],
    recommend:(a)=>{
      const R=[],N=[],C=[],ND=[]; const g=a.agegrp, sev=a.severity, sym=a.symptoms||[];
      ND.push("Avoid triggers when possible; saline nasal irrigation.");
      if (!g) N.push("Select an age group for age-appropriate options.");
      if (g==="0-1"){ N.push("For infants, prioritize saline spray and pediatric evaluation."); return { refer:R, notes:N, recs:C, nonDrug:ND, showDosing:false }; }
      const wantsEyes = sym.includes("Ocular symptoms (itchy/watery eyes)");
      const hasCong = sym.includes("Nasal congestion");
      if (sev==="Moderate/Severe (affects sleep/daily life)" || hasCong){
        C.push({title:"Intranasal corticosteroid (INCS)", examples:["Flonase","Rhinocort","Nasacort"], how:"Daily, proper technique; onset hours, peak days.", warn:"Minor nosebleeds/irritation possible; aim away from septum."});
        if (wantsEyes) C.push({title:"Add oral non‑sedating antihistamine", examples:["cetirizine","loratadine","fexofenadine"], how:"Once daily as needed.", warn:"May cause mild drowsiness (cetirizine>loratadine/fexofenadine)."});
      } else {
        C.push({title:"Oral non‑sedating antihistamine", examples:["cetirizine","loratadine","fexofenadine"], how:"Once daily for itching/sneezing/runny nose.", warn:"Less effective for congestion alone; consider INCS if congestion predominant."});
        if (wantsEyes) C.push({title:"Ophthalmic antihistamine", examples:["ketotifen eye drops"], how:"Per label; remove contacts before use.", warn:"—"});
      }
      return { refer:R, notes:N, recs:C, nonDrug:ND, showDosing:false };
    }
  };

  // Nasal Congestion
  A.nasal_congestion = {
    name:"Nasal Congestion",
    questions:[
      AgeGroupInput("agegrp","Age group"),
      { id:"duration", type:"select", label:"How long?", options:["<1 week","1–3 weeks",">3 weeks"], required:true },
      { id:"conditions", type:"multiselect", label:"Any of these conditions?", options:["Uncontrolled hypertension","Heart disease","Thyroid disease","Diabetes","MAOI use (or within 14 days)"]}
    ],
    recommend:(a)=>{
      const R=[],N=[],C=[],ND=[]; const g=a.agegrp, du=a.duration, cond=a.conditions||[];
      ND.push("Saline irrigation/spray; humidified air.");
      if (du === ">3 weeks") R.push("Persistent symptoms >3 weeks.");
      const risky = (x)=>cond.includes(x);
      if (g==="0-1"){ N.push("Infants: saline spray and nasal suction; avoid decongestants."); return { refer:R, notes:N, recs:C, nonDrug:ND, showDosing:false }; }
      C.push({title:"Topical decongestant (short‑term)", examples:["Oxymetazoline 0.05% (Afrin)"], how:"Up to 2–3 days only to avoid rebound.", warn:"Avoid >3 days; caution in young children."});
      if (!(risky("Uncontrolled hypertension")||risky("Heart disease")||risky("Thyroid disease")||risky("Diabetes")||risky("MAOI use (or within 14 days)"))) {
        C.push({title:"Oral decongestant", examples:["pseudoephedrine (behind‑the‑counter)","phenylephrine"], how:"Daytime; may cause jitteriness.", warn:"Avoid late evening; consider BP monitoring if hypertensive."});
      } else {
        N.push("Oral decongestants may be inappropriate with selected conditions—consider INCS for ongoing congestion.");
      }
      C.push({title:"Intranasal corticosteroid (INCS)", examples:["Flonase (fluticasone)","Rhinocort (budesonide)","Nasacort (triamcinolone)"], how:"Daily use; not an immediate decongestant.", warn:"Aim away from septum to reduce irritation."});
      return { refer:R, notes:N, recs:C, nonDrug:ND, showDosing:false };
    }
  };

  // Sore Throat
  A.sore_throat = {
    name:"Sore Throat",
    questions:[
      AgeGroupInput("agegrp","Age group"),
      { id:"duration", type:"select", label:"How long?", options:["<3 days","3–7 days",">7 days"], required:true },
      { id:"red", type:"multiselect", label:"Any red flags?", options:["Drooling/inability to swallow","Severe unilateral throat pain","High fever","Rash","Exposure to strep","Severe ear pain"]}
    ],
    recommend:(a)=>{
      const R=[],N=[],C=[],ND=[]; const g=a.agegrp, d=a.duration, red=a.red||[];
      if (red.includes("Drooling/inability to swallow")) R.push("Drooling/inability to swallow.");
      if (red.includes("High fever")) R.push("High fever.");
      if (d === ">7 days") R.push("Sore throat >7 days.");
      ND.push("Warm salt‑water gargles, hydration, rest.");
      C.push({title:"Lozenges/sprays", examples:["benzocaine/menthol lozenges","phenol spray"], how:"Use as directed for temporary relief.", warn:"Avoid in young children who cannot safely use lozenges."});
      if (g === "0-1") N.push("Infants with persistent sore throat should be evaluated.");
      C.push({title:"Systemic analgesic", examples:["acetaminophen","ibuprofen (≥6 months)"], how:"Use per label by age/weight.", warn:"Avoid duplicate APAP; NSAID cautions."});
      return { refer:R, notes:N, recs:C, nonDrug:ND, showDosing:true };
    }
  };

  // Diarrhea
  A.diarrhea = {
    name:"Diarrhea",
    questions:[
      AgeGroupInput("agegrp","Age group"),
      { id:"duration", type:"select", label:"How long?", options:["<24 hours","1–3 days",">3 days"], required:true },
      { id:"flags", type:"multiselect", label:"Any red flags?", options:["Blood/black stool","High fever","Severe abdominal pain","Signs of dehydration (low urine, dizziness)","Recent travel","Age <2 years"]}
    ],
    recommend:(a)=>{
      const R=[],N=[],C=[],ND=[]; const g=a.agegrp, d=a.duration, f=a.flags||[];
      if (f.includes("Blood/black stool")) R.push("Blood or black stools.");
      if (f.includes("High fever")) R.push("High fever.");
      if (f.includes("Severe abdominal pain")) R.push("Severe abdominal pain.");
      if (f.includes("Signs of dehydration (low urine, dizziness)")) R.push("Possible dehydration.");
      if (d === ">3 days") R.push("Diarrhea >3 days.");
      ND.push("Oral rehydration solution (ORS) first; small frequent sips if nauseated.");
      if (!R.length){
        if (g === ">12"){
          C.push({title:"Loperamide (if no fever/bloody stool)", examples:["Imodium (loperamide)"], how:"Per label for acute, afebrile, non‑bloody diarrhea.", warn:"Stop and seek care if symptoms worsen or persist >2 days."});
          C.push({title:"Bismuth subsalicylate", examples:["Pepto‑Bismol","Kaopectate"], how:"Helpful for mild traveler’s diarrhea.", warn:"Avoid in pregnancy, anticoagulants, salicylate allergy; Reye’s risk in children/teens."});
        } else {
          N.push("Children: prioritize ORS; medication use per pediatric guidance.");
        }
      }
      return { refer:R, notes:N, recs:C, nonDrug:ND, showDosing:false };
    }
  };

  // Common Cold
  A.cold = {
    name:"Common Cold",
    questions:[
      AgeGroupInput("agegrp","Age group"),
      { id:"duration", type:"select", label:"How long?", options:["<1 week","1–2 weeks",">2 weeks"], required:true },
      { id:"sym", type:"multiselect", label:"Which symptoms are present?", options:["Runny nose","Sneezing","Nasal congestion","Dry cough","Wet/productive cough","Sore throat","Fever","Body aches","Headache","Sinus pressure","Ear pain","Fatigue"]},
      { id:"cond", type:"multiselect", label:"Any conditions?", options:["Uncontrolled hypertension","Heart disease","Thyroid disease","Diabetes","MAOI use","Pregnancy"]},
      { id:"red", type:"multiselect", label:"Any red flags?", options:["Shortness of breath/chest pain","Severe unilateral facial pain","High persistent fever (≥102°F >2 days)","Severe ear pain","Symptoms >10 days without improvement","Dehydration"]}
    ],
    recommend:(a)=>{
      const R=[],N=[],C=[],ND=[];
      const g=a.agegrp, d=a.duration, s=a.sym||[], c=a.cond||[], r=a.red||[];
      if (r.length) R.push("One or more red flags present.");
      if (d === ">2 weeks") R.push("Symptoms >2 weeks.");
      ND.push("Hydration, rest, humidified air, saline nasal spray/irrigation.");
      const risky=(x)=>c.includes(x);
      const deconContra = risky("Uncontrolled hypertension")||risky("Heart disease")||risky("Thyroid disease")||risky("Diabetes")||risky("MAOI use")||risky("Pregnancy")||g==="0-1";
      if (s.includes("Nasal congestion")){
        C.push({title:"Topical decongestant (short‑term)", examples:["Oxymetazoline 0.05%"], how:"≤3 days to avoid rebound.", warn:"Avoid >3 days."});
        if (!deconContra) C.push({title:"Oral decongestant", examples:["pseudoephedrine","phenylephrine"], how:"Daytime; may cause jitteriness.", warn:"Avoid at night; monitor BP if hypertensive."});
        else N.push("Oral decongestants likely inappropriate—prefer INCS/saline.");
        C.push({title:"Intranasal corticosteroid (INCS)", examples:["Flonase","Rhinocort","Nasacort"], how:"Daily; benefit over days.", warn:"Irritation possible."});
      }
      if (s.includes("Runny nose")||s.includes("Sneezing")) C.push({title:"Oral non‑sedating antihistamine", examples:["cetirizine","loratadine","fexofenadine"], how:"Once daily.", warn:"Less helpful for congestion alone."});
      if (s.includes("Dry cough")) C.push({title:"Antitussive (Dextromethorphan)", examples:["Delsym"], how:"Use as directed.", warn:"Avoid with MAOIs."});
      if (s.includes("Wet/productive cough")) C.push({title:"Expectorant (Guaifenesin)", examples:["Mucinex"], how:"Hydration improves effect.", warn:"—"});
      if (s.includes("Sore throat")) C.push({title:"Lozenges/sprays", examples:["benzocaine/menthol lozenges","phenol spray"], how:"Temporary relief.", warn:"—"});
      if (s.includes("Fever")||s.includes("Body aches")||s.includes("Headache")){
        if (g==="0-1") N.push("Ibuprofen not recommended for <6 months; assess infant fever carefully.");
        C.push({title:"Analgesic/antipyretic", examples:["acetaminophen","ibuprofen (≥6 months)"], how:"Use per label; consider dosing calculator.", warn:"Avoid duplicate APAP; NSAID cautions."});
      }
      if (s.includes("Ear pain")) N.push("Persistent or severe ear pain warrants clinician evaluation.");
      if (s.includes("Sinus pressure")) N.push("If severe unilateral facial pain or symptoms >10 days, consider sinusitis evaluation.");
      return { refer:R, notes:N, recs:C, nonDrug:ND, showDosing:(s.includes("Fever")||s.includes("Body aches")||s.includes("Headache")) };
    }
  };

  // Sleep Difficulty
  A.sleep = {
    name:"Sleep Difficulty (Short‑Term)",
    questions:[
      AgeGroupInput("agegrp","Age group"),
      { id:"freq", type:"select", label:"How often?", options:["Occasional","Most nights"], required:true },
      { id:"dur", type:"select", label:"Duration", options:["<2 weeks","≥2 weeks"], required:true },
      { id:"flags", type:"multiselect", label:"Any of these?", options:["Age ≥65","Pregnancy","Alcohol or other sedatives","Untreated sleep apnea","Glaucoma/BPH/urinary retention","Liver disease"]}
    ],
    recommend:(a)=>{
      const R=[],N=[],C=[],ND=[]; const g=a.agegrp, dur=a.dur, flags=a.flags||[];
      ND.push("Sleep hygiene: consistent schedule, dark cool room, limit late caffeine/screens, wind‑down routine.");
      if (dur === "≥2 weeks") R.push("Persistent insomnia ≥2 weeks—consider clinician evaluation/CBT‑I.");
      if (flags.includes("Age ≥65")||flags.includes("Glaucoma/BPH/urinary retention")) N.push("Avoid sedating antihistamines in elderly/BPH/glaucoma due to anticholinergic effects.");
      if (flags.includes("Pregnancy")) N.push("Avoid OTC sleep aids in pregnancy unless clinician advises.");
      if (flags.includes("Alcohol or other sedatives")) N.push("Avoid combining sedatives/alcohol with sleep aids.");
      if (!R.length){
        if (g === ">12" && !flags.includes("Age ≥65") && !flags.includes("Glaucoma/BPH/urinary retention") && !flags.includes("Pregnancy")){
          C.push({title:"Short‑term sedating antihistamine at bedtime (if needed)", examples:["doxylamine","diphenhydramine"], how:"Use the lowest effective dose for a few nights only.", warn:"Next‑day drowsiness and anticholinergic effects possible; avoid driving if sedated."});
        }
      }
      return { refer:R, notes:N, recs:C, nonDrug:ND, showDosing:false };
    }
  };

  // Pain
  A.pain = {
    name:"Pain",
    questions:[
      AgeGroupInput("agegrp","Age group"),
      { id:"site", type:"select", label:"Pain type", options:["Headache","Dental","Muscle/joint","Back pain","Dysmenorrhea","Sprain/strain"], required:true },
      { id:"sev", type:"select", label:"Severity", options:["Mild","Moderate","Severe"], required:true },
      { id:"risks", type:"multiselect", label:"Any of these?", options:["History of ulcer/GI bleed","Kidney disease","Heart disease","Anticoagulants","Pregnancy"]}
    ],
    recommend:(a)=>{
      const R=[],N=[],C=[],ND=[]; const g=a.agegrp, site=a.site, sev=a.sev, r=a.risks||[];
      ND.push("Rest as needed; ice (acute) or heat (muscle tension); gentle stretching.");
      const nsaidContra = r.includes("History of ulcer/GI bleed")||r.includes("Kidney disease")||r.includes("Heart disease")||r.includes("Pregnancy");
      if (g==="0-1"){ N.push("Infants require clinician guidance for pain management."); return { refer:R, notes:N, recs:C, nonDrug:ND, showDosing:false }; }
      // Core analgesics
      if (nsaidContra){
        C.push({title:"Acetaminophen", examples:["Tylenol"], how:"Use as directed; consider weight‑based dosing in children.", warn:"Avoid duplicate APAP; mind max daily dose."});
      } else {
        C.push({title:"NSAID option (ibuprofen or naproxen)", examples:["ibuprofen","naproxen"], how:"Use with food; shortest effective duration.", warn:"Avoid with ulcer/renal risk, late pregnancy, anticoagulants."});
        C.push({title:"Acetaminophen", examples:["acetaminophen"], how:"Can alternate with NSAIDs if advised.", warn:"Avoid exceeding max daily dose."});
      }
      if (site==="Muscle/joint"||site==="Sprain/strain") C.push({title:"Topical diclofenac (localized)", examples:["Voltaren gel"], how:"Apply per label to painful area.", warn:"Avoid on broken skin; wash hands after."});
      if (site==="Dysmenorrhea") C.push({title:"NSAID at onset of cramps", examples:["ibuprofen","naproxen"], how:"Start at onset, scheduled on day 1 if needed.", warn:"GI/renal cautions as above."});
      if (site==="Dental") N.push("Persistent/worsening dental pain or swelling warrants dental evaluation.");
      return { refer:R, notes:N, recs:C, nonDrug:ND, showDosing:true };
    }
  };

  // Multi-symptom
  A.multi = {
    name:"Multi‑Symptom",
    questions:[
      AgeGroupInput("agegrp","Age group"),
      { id:"complaints", type:"multiselect", label:"Select complaints", options:["Fever/aches","Cough (dry)","Cough (wet)","Nasal congestion","Runny nose/sneezing","Sore throat","Heartburn","Constipation","Diarrhea","Insomnia"]},
      { id:"cond", type:"multiselect", label:"Conditions to consider", options:["Uncontrolled hypertension","Heart disease","Kidney disease","Ulcer/GI bleed","Anticoagulants","MAOI use","Pregnancy"]}
    ],
    recommend:(a)=>{
      const R=[],N=[],C=[],ND=[]; const g=a.agegrp, comp=a.complaints||[], cond=a.cond||[];
      const risky=(x)=>cond.includes(x);
      if (comp.includes("Fever/aches")){
        if (g==="0-1") N.push("Assess infants with fever carefully; ibuprofen not for <6 months.");
        C.push({title:"Analgesic/antipyretic", examples:["acetaminophen","ibuprofen (≥6 months)"], how:"Use per label; consider dosing calculator.", warn:"Avoid duplicate APAP; NSAID cautions."});
      }
      if (comp.includes("Cough (dry)")) C.push({title:"Antitussive (Dextromethorphan)", examples:["Delsym"], how:"Use as directed.", warn:"Avoid with MAOIs."});
      if (comp.includes("Cough (wet)")) C.push({title:"Expectorant (Guaifenesin)", examples:["Mucinex"], how:"Hydration improves effect.", warn:"—"});
      if (comp.includes("Nasal congestion")){
        C.push({title:"Topical decongestant (short‑term)", examples:["Oxymetazoline 0.05%"], how:"≤3 days.", warn:"Avoid >3 days."});
        if (!(risky("Uncontrolled hypertension")||risky("Heart disease")||risky("MAOI use")||g==="0-1")) C.push({title:"Oral decongestant", examples:["pseudoephedrine","phenylephrine"], how:"Daytime; may cause jitteriness.", warn:"Avoid late evening; monitor BP if hypertensive."});
        C.push({title:"Intranasal corticosteroid (INCS)", examples:["Flonase","Nasacort","Rhinocort"], how:"Daily technique; benefit over days.", warn:"Irritation possible."});
      }
      if (comp.includes("Runny nose/sneezing")) C.push({title:"Oral non‑sedating antihistamine", examples:["cetirizine","loratadine","fexofenadine"], how:"Once daily.", warn:"Less helpful for congestion alone."});
      if (comp.includes("Sore throat")) C.push({title:"Lozenges/sprays", examples:["benzocaine/menthol lozenges","phenol spray"], how:"Temporary relief.", warn:"—"});
      if (comp.includes("Heartburn")){
        C.push({title:"Antacid or H2RA", examples:["Tums","famotidine"], how:"Antacid quick; H2RA longer relief.", warn:"Seek care if persistent >2 weeks or alarm symptoms."});
      }
      if (comp.includes("Constipation")){
        C.push({title:"Osmotic laxative (PEG 3350)", examples:["MiraLAX"], how:"Mix with water; may take 1–3 days.", warn:"Short-term unless advised."});
      }
      if (comp.includes("Diarrhea")){
        C.push({title:"Loperamide (if afebrile, non‑bloody)", examples:["Imodium"], how:"Per label.", warn:"Stop and seek care if symptoms worsen or persist >2 days."});
      }
      if (comp.includes("Insomnia")){
        if (g === ">12" && !cond.includes("Pregnancy")) C.push({title:"Short‑term sedating antihistamine at bedtime (if needed)", examples:["doxylamine","diphenhydramine"], how:"A few nights only.", warn:"Daytime drowsiness/anticholinergic effects."});
        ND.push("Sleep hygiene: consistent schedule, limit screens/caffeine, dark cool room.");
      }
      return { refer:R, notes:N, recs:C, nonDrug:ND, showDosing: comp.includes("Fever/aches") };
    }
  };

  return A;
}

window.DATA.ailments = Object.assign({}, window.DATA.ailments || {}, buildAilments());

// --- DOM ---
const $ailment = document.getElementById('ailment');
const $questions = document.getElementById('questions');
const $result = document.getElementById('result');
const $printBtn = document.getElementById('printBtn');
const $resetBtn = document.getElementById('resetBtn');
const $brandToggle = document.getElementById('brandToggle');

// Modal
const $modal = document.getElementById('dosingModal');
const $closeModal = document.getElementById('closeModal');
const $unitChips = document.getElementById('unitChips');
const $weightInput = document.getElementById('weightInput');
const $unitHint = document.getElementById('unitHint');
const $apapDoses = document.getElementById('apapDoses');
const $ibuDoses = document.getElementById('ibuDoses');

function init(){
  try{
    // Load brand toggle state
    const saved = localStorage.getItem('showBrands');
    if (saved !== null) $brandToggle.checked = saved === 'true';
    $brandToggle.addEventListener('change', () => {
      localStorage.setItem('showBrands', String($brandToggle.checked));
      // Re-render result to reflect brand line visibility
      const evt = new Event('submit');
      const form = document.getElementById('intakeForm');
      if (form) form.dispatchEvent(new Event('submit'));
    });

    $ailment.addEventListener('change', renderQuestions);
    $printBtn.addEventListener('click', () => window.print());
    $resetBtn.addEventListener('click', () => { renderQuestions(true); $result.innerHTML=''; });

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
  }catch(e){ console.error(e); showError("Initialization error: " + e.message); }
}

function renderQuestions(reset=false){
  try{
    const key = $ailment.value || 'fever';
    const a = window.DATA.ailments[key];
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
      if (q.type === 'agegroup' || q.type === 'age_group'){ // allow either
        input = document.createElement('div'); input.className='chip-group';
        (q.groups || [{value:"0-1",label:"0–1 year"},{value:"2-12",label:"2–12 years"},{value:">12",label:">12 years"}]).forEach(g => {
          const chip = document.createElement('div'); chip.className='chip'; chip.textContent=g.label; chip.dataset.value=g.value;
          chip.addEventListener('click',()=>{
            input.querySelectorAll('.chip').forEach(c=>c.classList.remove('active'));
            chip.classList.add('active'); input.dataset.selected = g.value;
          });
          input.appendChild(chip);
        });
      } else if (q.type === 'number'){
        input = document.createElement('input'); input.type='number'; input.min=q.min??0; input.max=q.max??999;
      } else if (q.type === 'select'){
        input = document.createElement('select');
        q.options.forEach(o => { const opt=document.createElement('option'); opt.value=o; opt.textContent=o; input.appendChild(opt); });
      } else if (q.type === 'multiselect'){
        input = document.createElement('div'); input.className='multi';
        q.options.forEach((o, idx) => {
          const lab=document.createElement('label');
          const cb=document.createElement('input'); cb.type='checkbox'; cb.value=o; cb.id=q.id + '_' + idx;
          lab.appendChild(cb); lab.appendChild(document.createTextNode(o));
          input.appendChild(lab);
        });
      }
      input.id = q.id;
      wrap.appendChild(input); form.appendChild(wrap);
    });

    const actions = document.createElement('div'); actions.className='row no-print';
    const go = document.createElement('button'); go.className='btn btn-primary'; go.type='submit'; go.textContent='Get Recommendation';
    actions.appendChild(go);
    if (a.recommend({}).showDosing){
      const dosingBtn=document.createElement('button'); dosingBtn.type='button'; dosingBtn.className='btn btn-ghost'; dosingBtn.textContent='Open Dosing Calculator';
      dosingBtn.addEventListener('click', showModal); actions.appendChild(dosingBtn);
    }
    form.appendChild(document.createElement('hr')); form.appendChild(actions);

    form.addEventListener('submit', (e)=>{
      e.preventDefault();
      const answers = getAnswers(a.questions);
      const result = a.recommend(answers);
      renderResult({ aName: a.name, ...result });
    });

    $questions.innerHTML=''; $questions.appendChild(form);
    if (reset) window.scrollTo({ top: 0, behavior: 'smooth' });
  }catch(e){ console.error(e); showError("Render error: " + e.message); }
}

function getAnswers(questions){
  const out={};
  questions.forEach(q => {
    const el=document.getElementById(q.id);
    if (!el) return;
    if (q.type === 'multiselect'){
      const checks = el.querySelectorAll('input[type="checkbox"]');
      out[q.id] = Array.from(checks).filter(c => c.checked).map(c => c.value);
    } else if (q.type === 'agegroup' || q.type === 'age_group'){
      out[q.id] = el.dataset.selected || null;
    } else if (q.type === 'number'){
      out[q.id] = el.value;
    } else {
      out[q.id] = el.value;
    }
  });
  return out;
}

function renderResult({ aName, refer, notes, recs, nonDrug, showDosing }){
  try{
    const box = document.createElement('div');

    // Result header
    const title=document.createElement('div'); title.className='title'; title.textContent = aName + ' — Recommendation';
    box.appendChild(title); box.appendChild(document.createElement('hr'));

    // Brand search + clear button
    const controls = document.createElement('div'); controls.className='result-controls no-print';
    const searchLabel = document.createElement('label'); searchLabel.textContent = "Search brands in these results";
    const search = document.createElement('input'); search.type='text'; search.placeholder='e.g., Tylenol, Zyrtec, Sudafed...'; search.id='brandSearch';
    const clearBtn = document.createElement('button'); clearBtn.className='btn'; clearBtn.type='button'; clearBtn.textContent='Clear';
    clearBtn.addEventListener('click', ()=>{ search.value=''; filterRecs(''); });
    controls.appendChild(searchLabel); controls.appendChild(search); controls.appendChild(clearBtn);
    box.appendChild(controls);

    // Refer list
    if (refer.length){
      const p=document.createElement('p'); p.innerHTML = `<span class="danger">Refer to clinician/urgent care:</span>`; box.appendChild(p);
      const ul=document.createElement('ul'); refer.forEach(r=>{ const li=document.createElement('li'); li.textContent=r; ul.appendChild(li); }); box.appendChild(ul);
    }

    // Recs
    const recWrap = document.createElement('div'); recWrap.id='recWrap';
    if (recs.length){
      const p=document.createElement('p'); p.innerHTML = `<span class="ok">OTC options:</span>`; box.appendChild(p);
      recs.forEach(r => {
        const d=document.createElement('div'); d.className='dose-card';
        const brands = brandsFor(r.title, r.examples);
        d.dataset.title = r.title.toLowerCase();
        d.dataset.examples = (r.examples||[]).join(', ').toLowerCase();
        d.dataset.brands = brands.join(', ').toLowerCase();

        let brandsHTML = '';
        const showBrands = document.getElementById('brandToggle').checked;
        if (showBrands && brands.length){
          brandsHTML = `<div class="brand-line">Brands: ${brands.join(', ')}</div>`;
        }

        d.innerHTML = `<div><span class="pill">${r.title}</span></div>
                       <div class="muted">Examples: ${(r.examples && r.examples.length ? r.examples.join(", ") : "—")}</div>
                       <div>How: ${r.how || "—"}</div>
                       <div class="muted">Notes: ${r.warn || "—"}</div>
                       ${brandsHTML}`;
        recWrap.appendChild(d);
      });
      box.appendChild(recWrap);
    }

    // Non-drug
    if (nonDrug.length){
      const p=document.createElement('p'); p.innerHTML = `<strong>Non-drug measures:</strong>`; box.appendChild(p);
      const ul=document.createElement('ul'); nonDrug.forEach(n=>{ const li=document.createElement('li'); li.textContent=n; ul.appendChild(li); }); box.appendChild(ul);
    }

    // Notes
    if (notes.length){
      const n=document.createElement('div'); n.className='note'; n.innerHTML = `<strong>Important:</strong> ${notes.join(' ')} `; box.appendChild(n);
    }

    // Dosing button
    if (showDosing){
      const wrap=document.createElement('div'); wrap.style.marginTop='10px';
      const btn=document.createElement('button'); btn.className='btn btn-ghost'; btn.type='button'; btn.textContent='Open Dosing Calculator';
      btn.addEventListener('click', showModal);
      wrap.appendChild(btn); box.appendChild(wrap);
    }

    $result.innerHTML=''; $result.appendChild(box);
    window.scrollTo({ top: $result.offsetTop - 10, behavior:'smooth' });

    // Brand search behavior
    search.addEventListener('input', () => filterRecs(search.value));
    function filterRecs(q){
      const term = (q||'').trim().toLowerCase();
      const cards = Array.from(recWrap.querySelectorAll('.dose-card'));
      cards.forEach(card => {
        // Remove previous highlights
        card.innerHTML = card.innerHTML.replace(/<mark>/g,'').replace(/<\/mark>/g,'');
      });
      if (!term){
        cards.forEach(card => card.hidden = false);
        return;
      }
      cards.forEach(card => {
        const hay = [card.dataset.brands, card.dataset.examples, card.dataset.title].join(' ');
        const match = hay.includes(term);
        card.hidden = !match;
        if (match){
          // crude highlight in the visible text
          highlight(card, term);
        }
      });
    }
    function highlight(node, term){
      const walker = document.createTreeWalker(node, NodeFilter.SHOW_TEXT, null);
      const texts = [];
      while (walker.nextNode()) texts.push(walker.currentNode);
      texts.forEach(t => {
        const i = t.nodeValue.toLowerCase().indexOf(term);
        if (i >= 0){
          const span = document.createElement('span');
          span.innerHTML = t.nodeValue.slice(0,i) + '<mark>' + t.nodeValue.slice(i, i+term.length) + '</mark>' + t.nodeValue.slice(i+term.length);
          t.parentNode.replaceChild(span, t);
        }
      });
    }

  }catch(e){ console.error(e); showError("Result error: " + e.message); }
}

// Modal control
function showModal(){ if ($modal){ $modal.hidden=false; recalcDoses(); } }
function hideModal(){ if ($modal){ $modal.hidden=true; } }
function recalcDoses(){
  if (!$apapDoses || !$ibuDoses) return;
  $apapDoses.innerHTML=''; $ibuDoses.innerHTML='';
  const ap = Dosing.apapDose(); const ib = Dosing.ibuDose();
  const apCard=document.createElement('div'); apCard.className='dose-card';
  if (ap){
    const vL = Dosing.volFor(ap.mgPerDoseLow,160);
    const vH = Dosing.volFor(ap.mgPerDoseHigh,160);
    apCard.innerHTML = `<div><strong>${ap.mgPerDoseLow}–${ap.mgPerDoseHigh} mg per dose</strong> every 4–6 hours</div>
                        <div class="muted">At 160 mg/5 mL: ~${vL ?? "—"}–${vH ?? "—"} mL per dose</div>`;
  } else apCard.textContent = 'Enter weight to calculate dose.';
  $apapDoses.appendChild(apCard);

  const ibCard=document.createElement('div'); ibCard.className='dose-card';
  if (ib){
    const vL = Dosing.volFor(ib.mgPerDoseLow,100);
    const vH = Dosing.volFor(ib.mgPerDoseHigh,100);
    ibCard.innerHTML = `<div><strong>${ib.mgPerDoseLow}–${ib.mgPerDoseHigh} mg per dose</strong> every 6–8 hours</div>
                        <div class="muted">At 100 mg/5 mL: ~${vL ?? "—"}–${vH ?? "—"} mL per dose</div>`;
  } else ibCard.textContent = 'Enter weight to calculate dose.';
  $ibuDoses.appendChild(ibCard);
}

document.addEventListener('click',(e)=>{ if (e.target && e.target.id === 'dosingModal') hideModal(); });
document.addEventListener('keydown',(e)=>{ if (e.key === 'Escape') hideModal(); });

// Init
init();
