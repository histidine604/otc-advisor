
console.log("App loaded v2.6.1");

/* -------- utilities ---------- */
function showError(msg){try{const b=document.getElementById('errorBanner'); if(!b)return; b.textContent=msg; b.hidden=false;}catch{}}
const BrandPref = {
  key: "otc_show_brands",
  get(){ try { return JSON.parse(localStorage.getItem(this.key) ?? "true"); } catch { return true; } },
  set(v){ try { localStorage.setItem(this.key, JSON.stringify(!!v)); } catch {} }
};

/* ---- brand registry ---- */
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

/* ---- shared inputs ---- */
function AgeGroupInput(id,label){return{ id, type:"agegroup", label, groups:[
  {value:"0-1",label:"0–1 year"},{value:"2-12",label:"2–12 years"},{value:">12",label:">12 years"} ]};}

/* ---- dosing helper ---- */
const Dosing=(function(){const s={unit:"kg",weight:null};function setUnit(u){s.unit=u;}function setWeight(w){s.weight=isNaN(w)?null:Number(w);}function kg(){if(s.weight==null)return null;return s.unit==="kg"?s.weight:s.weight*0.45359237;}function apap(){const k=kg();if(k==null)return null;return{mgPerDoseLow:Math.round(k*10),mgPerDoseHigh:Math.round(k*15)}}function ibu(){const k=kg();if(k==null)return null;return{mgPerDoseLow:Math.round(k*5),mgPerDoseHigh:Math.round(k*10)}}function volFor(mg,per5){if(!mg||!per5)return null;const mL=(mg/per5)*5;return Math.round(mL/2.5)*2.5;}return{state:s,setUnit,setWeight,apapDose:apap,ibuDose:ibu,volFor};})();

/* ---- ailments (subset for brevity here; enough to show fix & search) ---- */
window.DATA = window.DATA || {}; window.DATA.ailments = window.DATA.ailments || {};

const CORE = {
  allergic_rhinitis: {
    name:"Allergic Rhinitis",
    questions:[
      AgeGroupInput("agegrp","Age group"),
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

// merge core without overwriting
for (const [k,v] of Object.entries(CORE)){ if(!window.DATA.ailments[k]) window.DATA.ailments[k]=v; }

/* ---- card helper adds brand info key ---- */
function card(title, examples, how, warn, brandKey){
  return { title, examples, how, warn, brandKey };
}

/* ---- DOM cache ---- */
const $ailment=document.getElementById('ailment');
const $questions=document.getElementById('questions');
const $result=document.getElementById('result');
const $printBtn=document.getElementById('printBtn');
const $resetBtn=document.getElementById('resetBtn');
const $brandToggle=document.getElementById('brandToggle');

/* ---- init ---- */
function init(){
  try{
    // brand toggle
    $brandToggle.checked = BrandPref.get();
    $brandToggle.addEventListener('change', ()=>{ BrandPref.set($brandToggle.checked); renderResult(lastResultPayload); });

    // actions
    $printBtn.addEventListener('click',()=>window.print());
    $resetBtn.addEventListener('click', ()=>{ renderQuestions(true); $result.innerHTML=''; });

    // populate select if somehow empty
    if ($ailment.options.length <= 1){
      $ailment.innerHTML = "";
      for (const [k,v] of Object.entries(window.DATA.ailments)){
        const o=document.createElement('option'); o.value=k; o.textContent=v.name||k; $ailment.appendChild(o);
      }
    }
    $ailment.addEventListener('change', renderQuestions);

    renderQuestions();
  }catch(e){ console.error(e); showError("Init error: "+e.message); }
}

/* ---- render intake ---- */
function renderQuestions(reset=false){
  try{
    const key = $ailment.value || Object.keys(window.DATA.ailments)[0];
    if(!$ailment.value) $ailment.value = key;
    const a = window.DATA.ailments[key];
    const form = document.createElement('form');
    form.id='intakeForm';
    const title=document.createElement('div'); title.className='title'; title.textContent=(a.name||key)+" — Intake"; form.appendChild(title);
    form.appendChild(document.createElement('hr'));
    a.questions.forEach(q=>{
      const wrap=document.createElement('div');
      const label=document.createElement('label'); label.textContent=q.label+(q.required?' *':''); wrap.appendChild(label);
      let input;
      if (q.type==='agegroup'){
        input=document.createElement('div'); input.className='chip-group';
        q.groups.forEach(g=>{
          const chip=document.createElement('div'); chip.className='chip'; chip.textContent=g.label; chip.dataset.value=g.value;
          chip.addEventListener('click',()=>{ input.querySelectorAll('.chip').forEach(c=>c.classList.remove('active')); chip.classList.add('active'); input.dataset.selected=g.value; });
          input.appendChild(chip);
        });
      } else if (q.type==='select'){
        input=document.createElement('select'); q.options.forEach(o=>{ const opt=document.createElement('option'); opt.value=o; opt.textContent=o; input.appendChild(opt); });
      } else if (q.type==='multiselect'){
        input=document.createElement('div'); input.className='multi'; q.options.forEach((o,i)=>{ const lab=document.createElement('label'); const cb=document.createElement('input'); cb.type='checkbox'; cb.value=o; cb.id=q.id+'_'+i; lab.appendChild(cb); lab.appendChild(document.createTextNode(o)); input.appendChild(lab); });
      } else { input=document.createElement('input'); input.type='text'; }
      input.id=q.id; wrap.appendChild(input); form.appendChild(wrap);
    });
    const actions=document.createElement('div'); actions.className='row no-print';
    const go=document.createElement('button'); go.className='btn btn-primary'; go.type='submit'; go.textContent='Get Recommendation'; actions.appendChild(go);
    if (a.recommend({}).showDosing){ const dosing=document.createElement('button'); dosing.type='button'; dosing.className='btn btn-ghost'; dosing.textContent='Open Dosing Calculator'; dosing.addEventListener('click', showModal); actions.appendChild(dosing); }
    form.appendChild(document.createElement('hr')); form.appendChild(actions);

    form.addEventListener('submit', (e)=>{ e.preventDefault(); const ans=getAnswers(a.questions); const res=a.recommend(ans); renderResult({ aName:a.name||key, ...res }); });
    $questions.innerHTML=''; $questions.appendChild(form);
    if (reset) window.scrollTo({top:0, behavior:'smooth'});
  }catch(e){ console.error(e); showError("Render error: "+e.message); }
}

function getAnswers(questions){
  const out={};
  questions.forEach(q=>{
    const el=document.getElementById(q.id); if(!el) return;
    if (q.type==='agegroup') out[q.id]=el.dataset.selected||null;
    else if (q.type==='multiselect'){ const checks=el.querySelectorAll('input[type="checkbox"]'); out[q.id]=Array.from(checks).filter(c=>c.checked).map(c=>c.value); }
    else out[q.id]=el.value;
  });
  return out;
}

/* ---- render result (with search) ---- */
let lastResultPayload=null;
function renderResult(payload){
  lastResultPayload = payload;
  try{
    const { aName, refer=[], notes=[], recs=[], nonDrug=[], showDosing=false } = payload||{};
    const wrap=document.createElement('div');

    // header
    const title=document.createElement('div'); title.className='title'; title.textContent=aName+" — Recommendation"; wrap.appendChild(title);
    wrap.appendChild(document.createElement('hr'));

    // brand search (inside results card)
    const tools=document.createElement('div'); tools.className='row no-print';
    const searchInput=document.createElement('input'); searchInput.placeholder="Search brands (e.g., Tylenol, Sudafed, Zyrtec)"; searchInput.style.flex="2 1 300px";
    tools.appendChild(searchInput);
    if (showDosing){ const btn=document.createElement('button'); btn.className='btn btn-ghost'; btn.type='button'; btn.textContent='Open Dosing Calculator'; btn.addEventListener('click', showModal); tools.appendChild(btn); }
    wrap.appendChild(tools);

    const recWrap=document.createElement('div');
    // filters on input
    searchInput.addEventListener('input', ()=>{
      const q = searchInput.value.trim().toLowerCase();
      Array.from(recWrap.children).forEach(cardEl=>{
        const hay = (cardEl.textContent||"").toLowerCase();
        cardEl.style.display = q && !hay.includes(q) ? "none" : "";
      });
    });

    if (refer.length){
      const p=document.createElement('p'); p.innerHTML='<span class="danger">Refer to clinician/urgent care:</span>'; wrap.appendChild(p);
      const ul=document.createElement('ul'); refer.forEach(r=>{ const li=document.createElement('li'); li.textContent=r; ul.appendChild(li); }); wrap.appendChild(ul);
    }

    if (recs.length){
      const p=document.createElement('p'); p.innerHTML='<span class="ok">OTC options:</span>'; wrap.appendChild(p);
      recs.forEach(r=>{
        const d=document.createElement('div'); d.className='dose-card';
        const brandsOn = BrandPref.get();
        const brandLine = brandText(r.brandKey, r.examples);
        d.innerHTML = `<div><span class="pill">${r.title}</span></div>
                       <div class="muted">Examples: ${(r.examples && r.examples.length)? r.examples.join(", ") : "—"}</div>
                       ${brandsOn && brandLine ? `<div class="muted"><em>Brands: ${brandLine}</em></div>` : ""}
                       <div>How: ${r.how || "—"}</div>
                       <div class="muted">Notes: ${r.warn || "—"}</div>`;
        recWrap.appendChild(d);
      });
      wrap.appendChild(recWrap);
    }

    if (nonDrug.length){
      const p=document.createElement('p'); p.innerHTML='<strong>Non-drug measures:</strong>'; wrap.appendChild(p);
      const ul=document.createElement('ul'); nonDrug.forEach(n=>{ const li=document.createElement('li'); li.textContent=n; ul.appendChild(li); }); wrap.appendChild(ul);
    }

    if (notes.length){
      const n=document.createElement('div'); n.className='note'; n.innerHTML=`<strong>Important:</strong> ${notes.join(' ')}`; wrap.appendChild(n);
    }

    $result.innerHTML=''; $result.appendChild(wrap);
    window.scrollTo({ top: $result.offsetTop - 10, behavior:'smooth' });
  }catch(e){ console.error(e); showError("Result error: "+e.message); }
}

function brandText(key, fallbacks){
  if (!key) return (fallbacks||[]).join(", ");
  if (BRANDS[key]) return BRANDS[key].join(", ");
  return (fallbacks||[]).join(", ");
}

/* ---- modal ---- */
function showModal(){ const m=document.getElementById('dosingModal'); if (m){ m.hidden=false; recalcDoses(); } }
function hideModal(){ const m=document.getElementById('dosingModal'); if (m) m.hidden=true; }
document.addEventListener('click', e=>{ if (e.target && e.target.id==='dosingModal') hideModal(); });
document.addEventListener('keydown', e=>{ if (e.key==='Escape') hideModal(); });

function recalcDoses(){
  const A=document.getElementById('apapDoses'), I=document.getElementById('ibuDoses'); if(!A||!I) return;
  A.innerHTML=''; I.innerHTML='';
  const ap=Dosing.apapDose(), ib=Dosing.ibuDose();
  const ac=document.createElement('div'); ac.className='dose-card';
  if (ap){ const vl=Dosing.volFor(ap.mgPerDoseLow,160), vh=Dosing.volFor(ap.mgPerDoseHigh,160);
    ac.innerHTML = `<div><strong>${ap.mgPerDoseLow}–${ap.mgPerDoseHigh} mg per dose</strong> every 4–6 hours</div>
                    <div class="muted">At 160 mg/5 mL: ~${vl ?? "—"}–${vh ?? "—"} mL per dose</div>`;
  } else ac.textContent="Enter weight to calculate dose.";
  A.appendChild(ac);
  const ic=document.createElement('div'); ic.className='dose-card';
  if (ib){ const vl=Dosing.volFor(ib.mgPerDoseLow,100), vh=Dosing.volFor(ib.mgPerDoseHigh,100);
    ic.innerHTML = `<div><strong>${ib.mgPerDoseLow}–${ib.mgPerDoseHigh} mg per dose</strong> every 6–8 hours</div>
                    <div class="muted">At 100 mg/5 mL: ~${vl ?? "—"}–${vh ?? "—"} mL per dose</div>`;
  } else ic.textContent="Enter weight to calculate dose.";
  I.appendChild(ic);
}

/* ---- go ---- */
try { init(); } catch(e){ console.error(e); showError("Fatal init error: "+e.message); }
