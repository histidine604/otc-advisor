
console.log("App loaded v2.5");
function showError(msg){try{const b=document.getElementById('errorBanner');if(!b)return;b.textContent=msg;b.hidden=false;}catch{}}

// Persisted UI state
const BRAND_KEY = "otc_show_brands";
let SHOW_BRANDS = (localStorage.getItem(BRAND_KEY) ?? "true") === "true";
const $brandToggle = document.getElementById('brandToggle');
if ($brandToggle) {
  $brandToggle.checked = SHOW_BRANDS;
  $brandToggle.addEventListener('change', () => {
    SHOW_BRANDS = $brandToggle.checked;
    localStorage.setItem(BRAND_KEY, String(SHOW_BRANDS));
    if (window.__lastResultPayload) renderResult(window.__lastResultPayload);
  });
}

// Age group chips
function AgeGroupInput(id,label){const g=[{value:"0-1",label:"0–1 year"},{value:"2-12",label:"2–12 years"},{value:">12",label:">12 years"}];return{ id, type:"agegroup", label, groups:g };}

// Dosing helpers
const Dosing=(function(){const s={unit:"kg",weight:null};function setUnit(u){s.unit=u;}function setWeight(w){s.weight=isNaN(w)?null:Number(w);}function toKg(){if(s.weight==null)return null;return s.unit==="kg"?s.weight:s.weight*0.45359237;}function apapDose(){const kg=toKg();if(kg==null)return null;return{mgPerDoseLow:Math.round(kg*10),mgPerDoseHigh:Math.round(kg*15)}}function ibuDose(){const kg=toKg();if(kg==null)return null;return{mgPerDoseLow:Math.round(kg*5),mgPerDoseHigh:Math.round(kg*10)}}function volFor(mg,per5){if(!mg||!per5)return null;const mL=(mg/per5)*5;return Math.round(mL/2.5)*2.5;}return{state:s,setUnit,setWeight,apapDose,ibuDose,volFor};})();

// Brand map
const BRANDS = {
  acetaminophen: ["Tylenol", "Children’s Tylenol", "Store brand acetaminophen"],
  ibuprofen: ["Advil", "Motrin", "Store brand ibuprofen"],
  naproxen: ["Aleve"],
  peg3350: ["MiraLAX"],
  psyllium: ["Metamucil"],
  methylcellulose: ["Citrucel"],
  docusate: ["Colace"],
  senna: ["Senokot"],
  bisacodyl: ["Dulcolax"],
  oxymetazoline: ["Afrin"],
  pseudoephedrine: ["Sudafed (BTC)"],
  phenylephrine: ["Sudafed PE"],
  intranasal_steroid: ["Flonase (fluticasone)", "Nasacort (triamcinolone)", "Rhinocort (budesonide)"],
  cetirizine: ["Zyrtec"],
  loratadine: ["Claritin"],
  fexofenadine: ["Allegra"],
  diphenhydramine: ["Benadryl", "ZzzQuil"],
  doxylamine: ["Unisom (doxylamine)"],
  dextromethorphan: ["Delsym", "Robitussin DM"],
  guaifenesin: ["Mucinex"],
  lozenges: ["Chloraseptic", "Cepacol"],
  diclofenac_topical: ["Voltaren Arthritis Pain Gel"],
  loperamide: ["Imodium"],
  bismuth: ["Pepto-Bismol", "Kaopectate"]
};

function withBrands(rec, keys) {
  rec.brands = keys.flatMap(k => BRANDS[k] || []);
  return rec;
}

// Data
window.DATA = window.DATA || {};
const BASE = {
  cough:{name:"Cough",questions:[
    AgeGroupInput("agegrp","Age group"),
    {id:"duration",type:"select",label:"How long has the cough lasted?",options:["<1 week","1–3 weeks",">3 weeks"],required:true},
    {id:"productive",type:"select",label:"Is the cough wet/productive?",options:["Yes","No"],required:true},
    {id:"redflags",type:"multiselect",label:"Any of these red flags?",options:["Shortness of breath or wheezing","Coughing up blood","High fever","Unintentional weight loss"]}
  ], recommend:(a)=>{
    const R=[],N=[],C=[],ND=[]; const g=a.agegrp,d=a.duration,p=a.productive,rf=a.redflags||[];
    if (rf.length) R.push("One or more red flags selected.");
    if (d === ">3 weeks") R.push("Cough longer than 3 weeks.");
    if (g === "0-1") N.push("Avoid OTC cough/cold medicines in children under 4. Use non-drug measures and seek pediatric advice if persistent.");
    ND.push("Hydration, warm fluids, humidified air."); ND.push("Throat lozenges (age-appropriate).");
    if (g !== "0-1") ND.push("Honey 1/2–1 tsp as needed (not for <1 year).");
    if (!R.length && g !== "0-1") {
      if (p === "Yes") C.push(withBrands({title:"Expectorant (Guaifenesin)",examples:["guaifenesin"],how:"Take with water; hydration improves effect.",warn:"Stop if fever/worsening or >7 days."},["guaifenesin"]));
      else C.push(withBrands({title:"Antitussive (Dextromethorphan)",examples:["dextromethorphan"],how:"Use as directed for dry cough.",warn:"Avoid with MAOIs; may cause drowsiness."},["dextromethorphan"]));
    }
    return { refer:R, notes:N, recs:C, nonDrug:ND, showDosing:false };
  }},
  heartburn:{name:"Heartburn / Indigestion",questions:[
    AgeGroupInput("agegrp","Age group"),
    {id:"freq",type:"select",label:"How often?",options:["<2 days/week","≥2 days/week"],required:true},
    {id:"alarm",type:"multiselect",label:"Any alarm symptoms?",options:["Trouble/painful swallowing","Vomiting blood or black stools","Unintentional weight loss","Severe chest pain"]},
    {id:"preg",type:"select",label:"Pregnant?",options:["No","Yes"]}
  ], recommend:(a)=>{
    const R=[],N=[],C=[],ND=[]; const g=a.agegrp,f=a.freq,al=a.alarm||[],p=a.preg||"No";
    if (al.length) R.push("Alarm symptoms present.");
    ND.push("Avoid trigger foods, smaller meals, avoid late meals, elevate head of bed.");
    if (!al.length) {
      if (f === "<2 days/week") {
        if (p === "Yes") C.push(withBrands({title:"Antacid (calcium carbonate)",examples:["calcium carbonate"],how:"Use as needed.",warn:"If frequent use needed, discuss with provider."},[]));
        else C.push(withBrands({title:"Antacid or H2RA (famotidine)",examples:["calcium carbonate","famotidine"],how:"Antacid for quick relief; H2RA for longer relief.",warn:"Seek care if symptoms persist >2 weeks."},[]));
      } else {
        if (g === "0-1" || g === "2-12") N.push("Recurring heartburn in children needs clinician evaluation before OTC PPI use.");
        else C.push({title:"PPI trial (14 days) if no alarm symptoms",examples:["omeprazole 20 mg daily before breakfast"],how:"Daily for 14 days; not for immediate relief.",warn:"If symptoms persist/return quickly, see provider."});
      }
    }
    return { refer:R, notes:N, recs:C, nonDrug:ND, showDosing:false };
  }},
  constipation:{name:"Constipation",questions:[
    AgeGroupInput("agegrp","Age group"),
    {id:"duration",type:"select",label:"How long?",options:["<1 week","1–3 weeks",">3 weeks"],required:true},
    {id:"features",type:"multiselect",label:"Any of these?",options:["Severe abdominal pain","Vomiting","Blood in stool","Unintentional weight loss","Fever"]},
    {id:"preg",type:"select",label:"Pregnant?",options:["No","Yes"]}
  ], recommend:(a)=>{
    const R=[],N=[],C=[],ND=[]; const g=a.agegrp,d=a.duration,f=a.features||[],p=a.preg||"No";
    if (f.includes("Severe abdominal pain")) R.push("Severe abdominal pain.");
    if (f.includes("Vomiting")) R.push("Vomiting present.");
    if (f.includes("Blood in stool")) R.push("Blood in stool.");
    if (f.includes("Unintentional weight loss")) R.push("Unintentional weight loss.");
    if (d === ">3 weeks") R.push("Constipation >3 weeks.");
    ND.push("Increase fluids and dietary fiber; regular physical activity.");
    if (g === "0-1") ND.push("Infants: small amounts of water; for >4 months, small amounts of prune/pear juice; discuss with pediatrician.");
    if (!R.length) {
      if (g === ">12") {
        if (p === "Yes") {
          C.push(withBrands({title:"Bulk-forming fiber (psyllium)",examples:["psyllium"],how:"Start low; take with water.",warn:"Space from other meds by 2 hours."},["psyllium","methylcellulose"]));
          C.push(withBrands({title:"Stool softener (docusate)",examples:["docusate sodium"],how:"Useful for hard, dry stools.",warn:"If ineffective in a few days, discuss alternatives."},["docusate"]));
        } else {
          C.push(withBrands({title:"Osmotic laxative (PEG 3350)",examples:["PEG 3350"],how:"Use as directed with water; may take 1–3 days to work.",warn:"Not for prolonged use without advice."},["peg3350"]));
          C.push(withBrands({title:"Bulk-forming fiber (psyllium)",examples:["psyllium"],how:"Increase slowly with water.",warn:"May cause gas/bloating initially."},["psyllium","methylcellulose"]));
          C.push(withBrands({title:"Stimulant (senna or bisacodyl) — short term",examples:["senna","bisacodyl"],how:"Consider short-term if others ineffective.",warn:"Abdominal cramping possible."},["senna","bisacodyl"]));
        }
      } else if (g === "2-12") {
        N.push("For children, many laxatives require clinician guidance for dosing/duration.");
        C.push(withBrands({title:"Glycerin suppository (age-appropriate)",examples:["glycerin"],how:"May provide quick relief; follow label by age.",warn:"If recurrent, seek pediatric advice."},[]));
        C.push(withBrands({title:"Stool softener (docusate) — if hard stools",examples:["docusate sodium"],how:"Use only per label by age/weight.",warn:"Consult pediatrician for ongoing use."},["docusate"]));
      } else {
        N.push("Avoid most OTC laxatives in infants without pediatric guidance.");
        C.push(withBrands({title:"Glycerin suppository (infant) — occasional",examples:["glycerin"],how:"Use only per label and pediatric advice.",warn:"If constipation persists or fever/abdominal distention present, seek care."},[]));
      }
    }
    return { refer:R, notes:N, recs:C, nonDrug:ND, showDosing:false };
  }},
  fever:{name:"Fever",questions:[
    AgeGroupInput("agegrp","Age group"),
    {id:"temp",type:"select",label:"Highest temperature (°F)",options:["<100.4","100.4–102.2","102.3–104",">104"],required:true},
    {id:"duration",type:"select",label:"How long?",options:["<24 hours","1–3 days",">3 days"],required:true},
    {id:"sx",type:"multiselect",label:"Any of these?",options:["Stiff neck","Rash","Severe sore throat or ear pain","Shortness of breath","Dehydration/poor intake","Confusion/lethargy","Recent surgery/chemo/immunosuppression"]}
  ], recommend:(a)=>{
    const R=[],N=[],C=[],ND=[]; const g=a.agegrp,t=a.temp,du=a.duration,s=a.sx||[];
    if (s.length) R.push("Concerning associated symptoms present.");
    if (t === ">104") R.push("Very high fever (>104°F).");
    if (du === ">3 days") R.push("Fever >3 days.");
    if (g === "0-1" && (t === "100.4–102.2" || t === "102.3–104" || t === ">104")) N.push("Infants <3 months with ≥100.4°F require immediate medical evaluation.");
    ND.push("Ensure hydration; light clothing; tepid sponging (avoid cold baths/alcohol rubs).");
    if (!R.length) {
      if (g === "0-1") {
        C.push(withBrands({title:"Acetaminophen (if ≥3 months)",examples:["acetaminophen"],how:"Use per label by weight; avoid duplicate APAP products.",warn:"If under 3 months with fever ≥100.4°F, seek care immediately."},["acetaminophen"]));
        N.push("Ibuprofen is generally not recommended for <6 months.");
      } else if (g === "2-12") {
        C.push(withBrands({title:"Acetaminophen",examples:["acetaminophen"],how:"Use per label by weight (mg/kg).",warn:"Do not exceed max daily dose; check combination products."},["acetaminophen"]));
        C.push(withBrands({title:"Ibuprofen (≥6 months)",examples:["ibuprofen"],how:"Use per label by weight (mg/kg).",warn:"Avoid if dehydration, vomiting, or history of ulcers/kidney issues."},["ibuprofen"]));
      } else {
        C.push(withBrands({title:"Acetaminophen",examples:["acetaminophen"],how:"Use as directed; avoid exceeding 3,000–4,000 mg/day depending on label/health status.",warn:"Avoid alcohol; liver disease risk."},["acetaminophen"]));
        C.push(withBrands({title:"Ibuprofen",examples:["ibuprofen"],how:"Use as directed with food if GI upset.",warn:"Avoid if history of ulcers, kidney disease, or late pregnancy."},["ibuprofen"]));
      }
    }
    return { refer:R, notes:N, recs:C, nonDrug:ND, showDosing:true };
  }},
  allergic_rhinitis:{name:"Allergic Rhinitis",questions:[
    AgeGroupInput("agegrp","Age group"),
    {id:"severity",type:"select",label:"How bad are symptoms?",options:["Mild (not daily life-limiting)","Moderate/Severe (affects sleep/daily life)"],required:true},
    {id:"symptoms",type:"multiselect",label:"Main symptoms",options:["Sneezing/itching","Rhinorrhea (runny nose)","Nasal congestion","Ocular symptoms (itchy/watery eyes)"]}
  ], recommend:(a)=>{
    const R=[],N=[],C=[],ND=[]; const g=a.agegrp, sev=a.severity, sym=a.symptoms||[];
    ND.push("Avoid triggers when possible; saline nasal irrigation.");
    if (!g) N.push("Select an age group for age-appropriate options.");
    if (g === "0-1") { N.push("For infants, prioritize saline spray and pediatric evaluation for ongoing symptoms."); return { refer:R, notes:N, recs:C, nonDrug:ND, showDosing:false }; }
    const wantsEyes = sym.includes("Ocular symptoms (itchy/watery eyes)");
    const hasCong = sym.includes("Nasal congestion");
    if (sev === "Moderate/Severe (affects sleep/daily life)" || hasCong) {
      C.push(withBrands({title:"Intranasal corticosteroid (INCS)",examples:["fluticasone","triamcinolone","budesonide"],how:"Daily, proper technique; onset within hours, peak in several days.",warn:"Minor nosebleeds/irritation possible; aim away from septum."},["intranasal_steroid"]));
      if (wantsEyes) C.push(withBrands({title:"Add oral non-sedating antihistamine for eyes",examples:["cetirizine","loratadine","fexofenadine"],how:"Once daily as needed.",warn:"May cause mild drowsiness (cetirizine > loratadine/fexofenadine)."},["cetirizine","loratadine","fexofenadine"]));
    } else {
      C.push(withBrands({title:"Oral non-sedating antihistamine",examples:["cetirizine","loratadine","fexofenadine"],how:"Once daily for itching/sneezing/runny nose.",warn:"Less effective for congestion alone; consider INCS if congestion predominant."},["cetirizine","loratadine","fexofenadine"]));
      if (wantsEyes) C.push(withBrands({title:"Ophthalmic antihistamine",examples:["ketotifen"],how:"Use per label; avoids systemic sedation.",warn:"Remove contacts before use."},[]));
    }
    return { refer:R, notes:N, recs:C, nonDrug:ND, showDosing:false };
  }},
  nasal_congestion:{name:"Nasal Congestion",questions:[
    AgeGroupInput("agegrp","Age group"),
    {id:"duration",type:"select",label:"How long?",options:["<1 week","1–3 weeks",">3 weeks"],required:true},
    {id:"conditions",type:"multiselect",label:"Any of these conditions?",options:["Uncontrolled hypertension","Heart disease","Thyroid disease","Diabetes","MAOI use (or within 14 days)"]}
  ], recommend:(a)=>{
    const R=[],N=[],C=[],ND=[]; const g=a.agegrp,d=a.duration,cond=a.conditions||[];
    ND.push("Saline irrigation/spray; humidified air.");
    if (d === ">3 weeks") R.push("Persistent symptoms >3 weeks.");
    const risky = (x)=>cond.includes(x);
    if (g === "0-1") { N.push("For infants: use saline spray and nasal suction; avoid decongestants."); return { refer:R, notes:N, recs:C, nonDrug:ND, showDosing:false }; }
    C.push(withBrands({title:"Topical decongestant (short-term)",examples:["oxymetazoline 0.05%"],how:"Up to 2–3 days only to avoid rebound congestion.",warn:"Do not exceed 3 days. Avoid in children <6 unless label allows and clinician advises."},["oxymetazoline"]));
    if (!(risky("Uncontrolled hypertension")||risky("Heart disease")||risky("Thyroid disease")||risky("Diabetes")||risky("MAOI use (or within 14 days)"))) {
      C.push(withBrands({title:"Oral decongestant",examples:["pseudoephedrine","phenylephrine"],how:"Use during the day; can cause insomnia/jitteriness.",warn:"Avoid late evening. Consider BP monitoring in hypertensive patients."},["pseudoephedrine","phenylephrine"]));
    } else {
      N.push("Oral decongestants may be inappropriate with selected conditions—consider intranasal steroid for ongoing congestion.");
    }
    C.push(withBrands({title:"Intranasal corticosteroid (INCS)",examples:["fluticasone","triamcinolone","budesonide"],how:"Daily use; not an immediate decongestant but helpful over days.",warn:"Nasal irritation possible; aim away from septum."},["intranasal_steroid"]));
    return { refer:R, notes:N, recs:C, nonDrug:ND, showDosing:false };
  }},
  sore_throat:{name:"Sore Throat",questions:[
    AgeGroupInput("agegrp","Age group"),
    {id:"duration",type:"select",label:"How long?",options:["<3 days","3–7 days",">7 days"],required:true},
    {id:"red",type:"multiselect",label:"Any red flags?",options:["Drooling/inability to swallow","Severe unilateral throat pain","High fever","Rash","Exposure to strep","Severe ear pain"]}
  ], recommend:(a)=>{
    const R=[],N=[],C=[],ND=[]; const g=a.agegrp,d=a.duration,red=a.red||[];
    if (red.includes("Drooling/inability to swallow")) R.push("Drooling/inability to swallow.");
    if (red.includes("High fever")) R.push("High fever.");
    if (d === ">7 days") R.push("Sore throat >7 days.");
    ND.push("Warm salt-water gargles, hydration, rest.");
    C.push(withBrands({title:"Lozenges/sprays",examples:["benzocaine/menthol lozenges","phenol spray"],how:"Use as directed for temporary relief.",warn:"Avoid in young children who cannot safely use lozenges."},["lozenges"]));
    if (g === "0-1") N.push("Infants with persistent sore throat should be evaluated.");
    C.push(withBrands({title:"Systemic analgesic",examples:["acetaminophen","ibuprofen (≥6 months)"],how:"Use per label by age/weight.",warn:"Avoid duplicate APAP; avoid NSAIDs in ulcer/renal risk, late pregnancy."},["acetaminophen","ibuprofen"]));
    return { refer:R, notes:N, recs:C, nonDrug:ND, showDosing:true };
  }},
  diarrhea:{name:"Diarrhea",questions:[
    AgeGroupInput("agegrp","Age group"),
    {id:"duration",type:"select",label:"How long?",options:["<24 hours","1–3 days",">3 days"],required:true},
    {id:"flags",type:"multiselect",label:"Any red flags?",options:["Blood/black stool","High fever","Severe abdominal pain","Signs of dehydration (low urine, dizziness)","Recent travel","Age <2 years"]}
  ], recommend:(a)=>{
    const R=[],N=[],C=[],ND=[]; const g=a.agegrp,d=a.duration,f=a.flags||[];
    if (f.includes("Blood/black stool")) R.push("Blood or black stools.");
    if (f.includes("High fever")) R.push("High fever.");
    if (f.includes("Severe abdominal pain")) R.push("Severe abdominal pain.");
    if (f.includes("Signs of dehydration (low urine, dizziness)")) R.push("Possible dehydration.");
    if (d === ">3 days") R.push("Diarrhea >3 days.");
    ND.push("Oral rehydration solution (ORS) first; small frequent sips if nauseated.");
    if (!R.length) {
      if (g === ">12") {
        C.push(withBrands({title:"Loperamide (if no fever/bloody stool)",examples:["loperamide"],how:"Use per label for acute, afebrile, non-bloody diarrhea.",warn:"Stop and seek care if symptoms worsen or persist >2 days."},["loperamide"]));
        C.push(withBrands({title:"Bismuth subsalicylate",examples:["bismuth subsalicylate"],how:"Helpful for mild traveler’s diarrhea.",warn:"Avoid in pregnancy, anticoagulants, salicylate allergy; Reye’s risk in children/teens."},["bismuth"]));
      } else {
        N.push("Children: prioritize ORS; medication use per pediatric guidance.");
      }
    }
    return { refer:R, notes:N, recs:C, nonDrug:ND, showDosing:false };
  }},
  cold:{name:"Common Cold",questions:[
    AgeGroupInput("agegrp","Age group"),
    {id:"duration",type:"select",label:"How long?",options:["<1 week","1–2 weeks",">2 weeks"],required:true},
    {id:"sym",type:"multiselect",label:"Which symptoms are present?",options:["Runny nose","Sneezing","Nasal congestion","Dry cough","Wet/productive cough","Sore throat","Fever","Body aches","Headache","Sinus pressure","Ear pain","Fatigue"]},
    {id:"cond",type:"multiselect",label:"Any conditions?",options:["Uncontrolled hypertension","Heart disease","Thyroid disease","Diabetes","MAOI use","Pregnancy"]},
    {id:"red",type:"multiselect",label:"Any red flags?",options:["Shortness of breath/chest pain","Severe unilateral facial pain","High persistent fever (≥102°F >2 days)","Severe ear pain","Symptoms >10 days without improvement","Dehydration"]}
  ], recommend:(a)=>{
    const R=[],N=[],C=[],ND=[]; const g=a.agegrp,d=a.duration,s=a.sym||[],c=a.cond||[],r=a.red||[];
    if (r.length) R.push("One or more red flags present.");
    if (d === ">2 weeks") R.push("Symptoms >2 weeks.");
    ND.push("Hydration, rest, humidified air, saline nasal spray/irrigation.");
    const risky=(x)=>c.includes(x);
    const deconContra = risky("Uncontrolled hypertension")||risky("Heart disease")||risky("Thyroid disease")||risky("Diabetes")||risky("MAOI use")||risky("Pregnancy")||g==="0-1";
    if (s.includes("Nasal congestion")) {
      C.push(withBrands({title:"Topical decongestant (short-term)",examples:["oxymetazoline 0.05%"],how:"≤3 days to avoid rebound.",warn:"Avoid >3 days."},["oxymetazoline"]));
      if (!deconContra) C.push(withBrands({title:"Oral decongestant",examples:["pseudoephedrine","phenylephrine"],how:"Daytime; may cause jitteriness.",warn:"Avoid at night; monitor BP if hypertensive."},["pseudoephedrine","phenylephrine"]));
      else N.push("Oral decongestants likely inappropriate—prefer INCS/saline.");
      C.push(withBrands({title:"Intranasal corticosteroid (INCS)",examples:["fluticasone","triamcinolone","budesonide"],how:"Daily; benefit over days.",warn:"Irritation possible."},["intranasal_steroid"]));
    }
    if (s.includes("Runny nose")||s.includes("Sneezing")) C.push(withBrands({title:"Oral non-sedating antihistamine",examples:["cetirizine","loratadine","fexofenadine"],how:"Once daily.",warn:"Less helpful for congestion alone."},["cetirizine","loratadine","fexofenadine"]));
    if (s.includes("Dry cough")) C.push(withBrands({title:"Antitussive (Dextromethorphan)",examples:["dextromethorphan"],how:"Use as directed.",warn:"Avoid with MAOIs."},["dextromethorphan"]));
    if (s.includes("Wet/productive cough")) C.push(withBrands({title:"Expectorant (Guaifenesin)",examples:["guaifenesin"],how:"Hydration improves effect.",warn:"—"},["guaifenesin"]));
    if (s.includes("Sore throat")) C.push(withBrands({title:"Lozenges/sprays",examples:["benzocaine/menthol lozenges","phenol spray"],how:"Temporary relief.",warn:"—"},["lozenges"]));
    if (s.includes("Fever")||s.includes("Body aches")||s.includes("Headache")) {
      if (g === "0-1") N.push("Ibuprofen not recommended for <6 months; assess infant fevers carefully.");
      C.push(withBrands({title:"Analgesic/antipyretic",examples:["acetaminophen","ibuprofen (≥6 months)"],how:"Use per label; consider dosing calculator.",warn:"Avoid duplicate APAP; NSAID cautions."},["acetaminophen","ibuprofen"]));
    }
    if (s.includes("Ear pain")) N.push("Persistent or severe ear pain warrants clinician evaluation.");
    if (s.includes("Sinus pressure")) N.push("If severe unilateral facial pain or symptoms >10 days, consider sinusitis evaluation.");
    return { refer:R, notes:N, recs:C, nonDrug:ND, showDosing:(s.includes("Fever")||s.includes("Body aches")||s.includes("Headache")) };
  }},
  sleep:{name:"Sleep Difficulty (Short‑term)",questions:[
    AgeGroupInput("agegrp","Age group"),
    {id:"freq",type:"select",label:"How often per week?",options:["<3 nights/week","≥3 nights/week"],required:true},
    {id:"dur",type:"select",label:"How long has this been going on?",options:["<2 weeks","2–4 weeks",">4 weeks"],required:true},
    {id:"flags",type:"multiselect",label:"Any of these?",options:["Pregnancy","Age ≥65","Other sedatives/alcohol","Untreated sleep apnea","Glaucoma/BPH/urinary retention","Liver disease"]}
  ], recommend:(a)=>{
    const R=[],N=[],C=[],ND=[]; const g=a.agegrp,f=a.freq,d=a.dur,fl=a.flags||[];
    ND.push("Sleep hygiene: fixed schedule, dark/cool room, limit late caffeine/screens, wind‑down routine.");
    if (d === ">4 weeks" || f === "≥3 nights/week") N.push("Persistent insomnia merits clinician evaluation; consider CBT‑I resources.");
    const risky = (x)=>fl.includes(x);
    if (g === "0-1" || g === "2-12") { N.push("Children with sleep issues should be evaluated; avoid OTC sedatives."); return { refer:R, notes:N, recs:C, nonDrug:ND, showDosing:false }; }
    if (risky("Pregnancy")||risky("Age ≥65")||risky("Other sedatives/alcohol")||risky("Untreated sleep apnea")||risky("Glaucoma/BPH/urinary retention")||risky("Liver disease")) {
      N.push("Avoid first‑generation antihistamines if any risk above applies; prefer non‑drug strategies and clinician advice.");
    } else {
      C.push(withBrands({title:"Short course only: Doxylamine or Diphenhydramine (bedtime)",examples:["doxylamine","diphenhydramine"],how:"Use for intermittent insomnia for a few nights; avoid nightly use.",warn:"Next‑day drowsiness, anticholinergic effects. Not for elderly/pregnancy/BPH/glaucoma/OSA."},["doxylamine","diphenhydramine"]));
    }
    return { refer:R, notes:N, recs:C, nonDrug:ND, showDosing:false };
  }},
  pain:{name:"Pain",questions:[
    AgeGroupInput("agegrp","Age group"),
    {id:"site",type:"select",label:"Where is the pain?",options:["Headache","Muscle/joint","Dental","Dysmenorrhea","Back pain","Sprain/strain"],required:true},
    {id:"sev",type:"select",label:"How severe?",options:["Mild","Moderate","Severe"],required:true},
    {id:"risks",type:"multiselect",label:"Any of these?",options:["Ulcer/GI bleed history","Kidney disease/heart failure","Anticoagulants","Pregnancy (3rd trimester)","Liver disease","Age ≥65"]}
  ], recommend:(a)=>{
    const R=[],N=[],C=[],ND=[]; const g=a.agegrp,site=a.site,sev=a.sev,rs=a.risks||[];
    const avoidNSAID = rs.includes("Ulcer/GI bleed history")||rs.includes("Kidney disease/heart failure")||rs.includes("Pregnancy (3rd trimester)")||rs.includes("Anticoagulants")||rs.includes("Age ≥65");
    const avoidAPAPHigh = rs.includes("Liver disease");
    ND.push("RICE for sprain/strain; gentle movement/heat for back or muscle pain; hydration and rest for headaches.");
    if (g === "0-1") { N.push("Infant pain needs pediatric guidance; avoid most OTC options."); return { refer:R, notes:N, recs:C, nonDrug:ND, showDosing:false }; }
    // Core analgesics
    if (!avoidAPAPHigh) C.push(withBrands({title:"Acetaminophen",examples:["acetaminophen"],how:"Use per label; consider weight‑based dosing if pediatric.",warn:"Mind total daily dose; avoid duplicate APAP."},["acetaminophen"]));
    if (!avoidNSAID && g !== "0-1") C.push(withBrands({title:"Ibuprofen or Naproxen",examples:["ibuprofen","naproxen"],how:"Use with food; shortest duration at lowest effective dose.",warn:"Avoid in late pregnancy, ulcer, kidney disease, or with anticoagulants."},["ibuprofen","naproxen"]));
    // Topical for localized MSK
    if (site in {"Muscle/joint":1,"Back pain":1,"Sprain/strain":1}) C.push(withBrands({title:"Topical diclofenac (localized pain)",examples:["diclofenac 1% gel"],how:"Apply per label to affected area; avoid on broken skin.",warn:"Lower systemic risk than oral NSAIDs."},["diclofenac_topical"]));
    // Site-specific notes
    if (site === "Headache") N.push("Seek care for “worst headache of life,” neurologic deficits, head injury, or new headaches in >50.");
    if (site === "Dental") N.push("Dental infections need dentist evaluation; OTCs are symptomatic only.");
    if (site === "Dysmenorrhea" && !avoidNSAID) N.push("NSAIDs started at onset of menses can be most effective.");
    return { refer:R, notes:N, recs:C, nonDrug:ND, showDosing:true };
  }},
  multi:{name:"Multi‑Symptom",questions:[
    AgeGroupInput("agegrp","Age group"),
    {id:"complaints",type:"multiselect",label:"Select complaints",options:["Fever","Cough","Nasal congestion","Runny nose","Sore throat","Heartburn","Constipation","Diarrhea","Headache/Body aches"]},
    {id:"cond",type:"multiselect",label:"Any conditions?",options:["Ulcer/GI bleed history","Kidney disease/heart failure","Anticoagulants","Pregnancy","Age <1 year","Uncontrolled hypertension","MAOI use"]}
  ], recommend:(a)=>{
    const R=[],N=[],C=[],ND=[]; const g=a.agegrp, comp=a.complaints||[], cond=a.cond||[];
    const riskyNSAID = cond.includes("Ulcer/GI bleed history")||cond.includes("Kidney disease/heart failure")||cond.includes("Anticoagulants")||cond.includes("Pregnancy");
    const infant = cond.includes("Age <1 year")||g==="0-1";
    if (comp.includes("Fever")||comp.includes("Headache/Body aches")) {
      if (!infant) {
        C.push(withBrands({title:"Acetaminophen",examples:["acetaminophen"],how:"Use per label; consider dosing calculator.",warn:"Avoid duplicate APAP."},["acetaminophen"]));
        if (!riskyNSAID) C.push(withBrands({title:"Ibuprofen (≥6 months)",examples:["ibuprofen"],how:"Use per label; with food.",warn:"Avoid in ulcer/kidney disease/late pregnancy."},["ibuprofen"]));
        else N.push("NSAIDs may be inappropriate due to selected risks.");
      } else {
        N.push("Infants need pediatric dosing guidance; ibuprofen generally not for <6 months.");
      }
    }
    if (comp.includes("Cough")) C.push(withBrands({title:"Cough — Dry: Dextromethorphan; Wet: Guaifenesin",examples:["DM or guaifenesin"],how:"Match to cough type; hydrate.",warn:"Avoid DM with MAOIs."},["dextromethorphan","guaifenesin"]));
    if (comp.includes("Nasal congestion")) C.push(withBrands({title:"Congestion — Oxymetazoline ≤3 days; consider oral decongestant if safe",examples:["oxymetazoline","pseudoephedrine","phenylephrine"],how:"Topical for quick relief; oral only if no contraindications.",warn:"Avoid oral decongestants with uncontrolled HTN or MAOIs."},["oxymetazoline","pseudoephedrine","phenylephrine"]));
    if (comp.includes("Runny nose")) C.push(withBrands({title:"Runny nose — Non‑sedating antihistamine",examples:["cetirizine","loratadine","fexofenadine"],how:"Once daily.",warn:"Less helpful for congestion alone."},["cetirizine","loratadine","fexofenadine"]));
    if (comp.includes("Sore throat")) C.push(withBrands({title:"Sore throat — Lozenges/sprays",examples:["benzocaine/menthol lozenges","phenol spray"],how:"Temporary relief.",warn:"—"},["lozenges"]));
    if (comp.includes("Heartburn")) C.push({title:"Heartburn — Antacid or H2RA",examples:["calcium carbonate","famotidine"],how:"Antacid quick; H2RA longer",warn:"Persisting symptoms >2 weeks → provider."});
    if (comp.includes("Constipation")) C.push(withBrands({title:"Constipation — PEG 3350 or Psyllium",examples:["PEG 3350","psyllium"],how:"Hydrate; may take 1–3 days.",warn:"Short courses; see provider if persistent."},["peg3350","psyllium","methylcellulose"]));
    if (comp.includes("Diarrhea")) C.push(withBrands({title:"Diarrhea — ORS first; Loperamide if afebrile/non‑bloody",examples:["ORS","loperamide"],how:"Stop if worsening; brief use.",warn:"Blood/fever/dehydration → provider."},["loperamide"]));
    ND.push("General: fluids/rest; avoid duplicate ingredients in combo products.");
    const dosing = comp.includes("Fever")||comp.includes("Headache/Body aches")||comp.includes("Sore throat");
    return { refer:R, notes:N, recs:C, nonDrug:ND, showDosing:dosing };
  }}
};

// Merge without overwriting
window.DATA.ailments = window.DATA.ailments || {};
for (const [k,v] of Object.entries(BASE)) { if (!window.DATA.ailments[k]) window.DATA.ailments[k] = v; }

// DOM
const $ailment = document.getElementById('ailment');
const $questions = document.getElementById('questions');
const $result = document.getElementById('result');
const $printBtn = document.getElementById('printBtn');
const $resetBtn = document.getElementById('resetBtn');

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
    const keys = Object.keys(window.DATA.ailments);
    if ($ailment && $ailment.options.length <= 1) {
      $ailment.innerHTML="";
      keys.forEach(k=>{ const opt=document.createElement('option'); opt.value=k; opt.textContent=window.DATA.ailments[k].name||k; $ailment.appendChild(opt); });
    }
    $ailment.addEventListener('change', renderQuestions);
    $printBtn.addEventListener('click', ()=>window.print());
    $resetBtn.addEventListener('click', ()=>{ renderQuestions(true); $result.innerHTML=''; });

    if ($closeModal) $closeModal.addEventListener('click', hideModal);
    if ($unitChips) $unitChips.querySelectorAll('.chip').forEach(chip=>{
      chip.addEventListener('click', ()=>{
        $unitChips.querySelectorAll('.chip').forEach(c=>c.classList.remove('active'));
        chip.classList.add('active');
        Dosing.setUnit(chip.dataset.value);
        if ($unitHint) $unitHint.textContent = "Using " + (chip.dataset.value==="kg"?"kilograms (kg)":"pounds (lb)");
        recalcDoses();
      });
    });
    if ($weightInput) $weightInput.addEventListener('input', ()=>{ Dosing.setWeight($weightInput.value); recalcDoses(); });

    renderQuestions();
  }catch(e){ console.error(e); showError("Initialization error: "+e.message); }
}

function renderQuestions(reset=false){
  try{
    const aKey = $ailment && $ailment.value ? $ailment.value : Object.keys(window.DATA.ailments)[0];
    if ($ailment && !$ailment.value) $ailment.value = aKey;
    const a = window.DATA.ailments[aKey];
    if (!a) throw new Error("Selected ailment not found.");

    const form = document.createElement('form'); form.id='intakeForm';
    const title = document.createElement('div'); title.className='title'; title.textContent=(a.name||aKey)+' — Intake'; form.appendChild(title);
    form.appendChild(document.createElement('hr'));

    a.questions.forEach(q => {
      const wrap = document.createElement('div');
      const label = document.createElement('label'); label.htmlFor=q.id; label.textContent=q.label+(q.required?' *':'');
      wrap.appendChild(label);
      let input;
      if (q.type === 'agegroup') {
        input=document.createElement('div'); input.className='chip-group';
        q.groups.forEach(g=>{
          const chip=document.createElement('div'); chip.className='chip'; chip.textContent=g.label; chip.dataset.value=g.value;
          chip.addEventListener('click',()=>{ input.querySelectorAll('.chip').forEach(c=>c.classList.remove('active')); chip.classList.add('active'); input.dataset.selected=g.value; });
          input.appendChild(chip);
        });
      } else if (q.type === 'number') {
        input=document.createElement('input'); input.type='number'; input.min=q.min??0; input.max=q.max??999;
      } else if (q.type === 'select') {
        input=document.createElement('select'); q.options.forEach(o=>{ const opt=document.createElement('option'); opt.value=o; opt.textContent=o; input.appendChild(opt); });
      } else if (q.type === 'multiselect') {
        input=document.createElement('div'); input.className='multi';
        q.options.forEach((o,idx)=>{ const lab=document.createElement('label'); const cb=document.createElement('input'); cb.type='checkbox'; cb.value=o; cb.id=q.id+'_'+idx; lab.appendChild(cb); lab.appendChild(document.createTextNode(o)); input.appendChild(lab); });
      }
      input.id=q.id; wrap.appendChild(input); form.appendChild(wrap);
    });

    const actions=document.createElement('div'); actions.className='row no-print';
    const go=document.createElement('button'); go.className='btn btn-primary'; go.type='submit'; go.textContent='Get Recommendation'; actions.appendChild(go);
    if (a.recommend({}).showDosing) { const dosingBtn=document.createElement('button'); dosingBtn.type='button'; dosingBtn.className='btn btn-ghost'; dosingBtn.textContent='Open Dosing Calculator'; dosingBtn.addEventListener('click', showModal); actions.appendChild(dosingBtn); }
    form.appendChild(document.createElement('hr')); form.appendChild(actions);

    form.addEventListener('submit', (e)=>{
      e.preventDefault();
      const answers = getAnswers(a.questions);
      const result = a.recommend(answers);
      const payload = { aName: a.name || aKey, ...result };
      window.__lastResultPayload = payload;
      renderResult(payload);
    });

    $questions.innerHTML=''; $questions.appendChild(form);
    if (reset) window.scrollTo({ top: 0, behavior: 'smooth' });
  }catch(e){ console.error(e); showError("Render error: "+e.message); }
}

function getAnswers(questions){
  const out={};
  questions.forEach(q=>{
    const el=document.getElementById(q.id); if (!el) return;
    if (q.type === 'multiselect') { const checks=el.querySelectorAll('input[type="checkbox"]'); out[q.id]=Array.from(checks).filter(c=>c.checked).map(c=>c.value); }
    else if (q.type === 'agegroup') { out[q.id]=el.dataset.selected || null; }
    else if (q.type === 'number') { out[q.id]=el.value; }
    else { out[q.id]=el.value; }
  });
  return out;
}

function renderResult({ aName, refer, notes, recs, nonDrug, showDosing }){
  try{
    const box = document.createElement('div');
    const title=document.createElement('div'); title.className='title'; title.textContent=aName+' — Recommendation'; box.appendChild(title);
    box.appendChild(document.createElement('hr'));

    if (refer.length) {
      const p=document.createElement('p'); p.innerHTML=`<span class="danger">Refer to clinician/urgent care:</span>`; box.appendChild(p);
      const ul=document.createElement('ul'); refer.forEach(r=>{ const li=document.createElement('li'); li.textContent=r; ul.appendChild(li); }); box.appendChild(ul);
    }

    if (recs.length) {
      const p=document.createElement('p'); p.innerHTML=`<span class="ok">OTC options:</span>`; box.appendChild(p);
      recs.forEach(r=>{
        const d=document.createElement('div'); d.className='dose-card';
        const brandsLine = (SHOW_BRANDS && r.brands && r.brands.length) ? `<div class="muted"><em>Brands:</em> ${r.brands.join(", ")}</div>` : "";
        d.innerHTML = `<div><span class="pill">${r.title}</span></div>
                       <div class="muted">Examples: ${(r.examples && r.examples.length ? r.examples.join(", ") : "—")}</div>
                       ${brandsLine}
                       <div>How: ${r.how || "—"}</div>
                       <div class="muted">Notes: ${r.warn || "—"}</div>`;
        box.appendChild(d);
      });
    }

    if (nonDrug.length) {
      const p=document.createElement('p'); p.innerHTML = `<strong>Non-drug measures:</strong>`; box.appendChild(p);
      const ul=document.createElement('ul'); nonDrug.forEach(n=>{ const li=document.createElement('li'); li.textContent=n; ul.appendChild(li); }); box.appendChild(ul);
    }

    if (notes.length) {
      const n=document.createElement('div'); n.className='note'; n.innerHTML = `<strong>Important:</strong> ${notes.join(' ')}`; box.appendChild(n);
    }

    if (showDosing) {
      const wrap=document.createElement('div'); wrap.style.marginTop='10px';
      const btn=document.createElement('button'); btn.className='btn btn-ghost'; btn.type='button'; btn.textContent='Open Dosing Calculator';
      btn.addEventListener('click', showModal); wrap.appendChild(btn); box.appendChild(wrap);
    }

    $result.innerHTML=''; $result.appendChild(box);
    window.scrollTo({ top: $result.offsetTop - 10, behavior: 'smooth' });
  }catch(e){ console.error(e); showError("Result error: "+e.message); }
}

// Modal control
function showModal(){ if ($modal) { $modal.hidden=false; recalcDoses(); } }
function hideModal(){ if ($modal) $modal.hidden=true; }
function recalcDoses(){
  if (!$apapDoses || !$ibuDoses) return;
  $apapDoses.innerHTML=''; $ibuDoses.innerHTML='';
  const ap = Dosing.apapDose(); const ib = Dosing.ibuDose();
  const apCard=document.createElement('div'); apCard.className='dose-card';
  if (ap) {
    const vl=Dosing.volFor(ap.mgPerDoseLow,160), vh=Dosing.volFor(ap.mgPerDoseHigh,160);
    apCard.innerHTML = `<div><strong>${ap.mgPerDoseLow}–${ap.mgPerDoseHigh} mg per dose</strong> every 4–6 hours</div>
                        <div class="muted">At 160 mg/5 mL: ~${vl ?? "—"}–${vh ?? "—"} mL per dose</div>`;
  } else apCard.textContent = 'Enter weight to calculate dose.';
  $apapDoses.appendChild(apCard);
  const ibCard=document.createElement('div'); ibCard.className='dose-card';
  if (ib) {
    const vl=Dosing.volFor(ib.mgPerDoseLow,100), vh=Dosing.volFor(ib.mgPerDoseHigh,100);
    ibCard.innerHTML = `<div><strong>${ib.mgPerDoseLow}–${ib.mgPerDoseHigh} mg per dose</strong> every 6–8 hours</div>
                        <div class="muted">At 100 mg/5 mL: ~${vl ?? "—"}–${vh ?? "—"} mL per dose</div>`;
  } else ibCard.textContent = 'Enter weight to calculate dose.';
  $ibuDoses.appendChild(ibCard);
}

// Close modal on backdrop/Esc
document.addEventListener('click', (e)=>{ if (e.target && e.target.id === 'dosingModal') hideModal(); });
document.addEventListener('keydown', (e)=>{ if (e.key === 'Escape') hideModal(); });

// Init
try{ init(); }catch(e){ console.error(e); showError("Fatal init error: "+e.message); }
