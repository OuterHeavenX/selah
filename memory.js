"use strict";
/* Selah — memory verses (Home → Memory verses, #/memory, #/memory/review).
   Add a verse from the verse sheet (Mark → Memorize) or here; review with flash cards on a simple
   spaced-repetition schedule (Leitner boxes): "Got it" moves a verse up a box and further out,
   "Again" sends it back to the start. Practice in three steps: reference only → first letters → full text.
   Stored as store "memory" = {id: {r: passage, a: added ms, b: box 0-7, due: "YYYY-MM-DD", n: reviews, u: updated ms}}
   and synced/backed up through SYNC_STORES. Text always comes from the translation being read. */

const MEM_GAPS=[0,1,2,4,7,14,30,60];      // days until the next review, by box
const MEM_STARTERS=["John 3:16","Psalms 23:1","Proverbs 3:5-6","Romans 8:28","Philippians 4:13","Joshua 1:9","Isaiah 40:31","Matthew 11:28","Romans 12:2","2 Timothy 3:16","Ephesians 2:8-9","Psalms 119:105"];
SYNC_STORES.push({key:"memory", prefix:"mv:", valid:v=>!!(v&&typeof v.r==="string"&&parsePassage(v.r)&&Number.isInteger(v.b)&&v.b>=0&&v.b<MEM_GAPS.length&&typeof v.due==="string"&&/^\d{4}-\d\d-\d\d$/.test(v.due)), onRemote:()=>{ if(state.view==="memory") renderMemory(); }});
const memAll=()=>store.get("memory",{});
const memId=r=>r.replace(/[^A-Za-z0-9:-]+/g,"_");
const memHas=r=>!!memAll()[memId(r)];
function dayStr(d){ const x=new Date(d); return `${x.getFullYear()}-${String(x.getMonth()+1).padStart(2,"0")}-${String(x.getDate()).padStart(2,"0")}`; }
const today=()=>dayStr(Date.now());
const addDays=n=>dayStr(Date.now()+n*864e5);
function memDue(){ const t=today(); return Object.entries(memAll()).filter(([,m])=>m.due<=t).sort((a,b)=>a[1].due.localeCompare(b[1].due)||a[1].b-b[1].b); }
function memAdd(r){
  const p=parsePassage(r); if(!p||!passageVerses(p).length) return false;
  const all=memAll(), id=memId(r); if(all[id]) return true;
  all[id]={r, a:Date.now(), b:0, due:today(), n:0, u:Date.now()}; store.set("memory",all); return true;
}
function memRemove(r){ const all=memAll(); delete all[memId(r)]; store.set("memory",all); }
function memText(r){ const p=parsePassage(r); return passageVerses(p).map(v=>v.text).join(" "); }
// "For God so loved the world," → "F G s l t w,"
function firstLetters(t){ return t.replace(/([A-Za-z])[A-Za-z’'-]*/g,"$1").replace(/\s+/g," "); }
// Normalise "Psalm 23:1", "ps 23 1", "1 john 4:8" etc. into a passage the app knows.
function memParse(s){
  s=String(s).trim().replace(/\s+/g," ").replace(/[–—]/g,"-");
  const m=s.match(/^((?:[1-3]\s?)?[A-Za-z][A-Za-z ]*?)\.?\s*(\d+)(?:[:.\s]\s*(\d+)(?:\s*-\s*(\d+))?)?$/);
  if(!m) return null;
  const q=m[1].toLowerCase().replace(/\s+/g," ").replace(/^([1-3])\s?/,"$1 ").trim();
  const alias={psalm:"psalms",ps:"psalms",song:"song of solomon",songs:"song of solomon",rev:"revelation",gen:"genesis",matt:"matthew",mt:"matthew",jn:"john",rom:"romans",phil:"philippians",prov:"proverbs",isa:"isaiah",heb:"hebrews",eph:"ephesians",jas:"james"};
  const want=alias[q]||q;
  const b=BOOKS.find(x=>x.name.toLowerCase()===want)||BOOKS.find(x=>x.name.toLowerCase().startsWith(want));
  if(!b||!m[3]) return null;
  const r=`${b.name} ${m[2]}:${m[3]}`+(m[4]&&+m[4]>+m[3]?`-${m[4]}`:"");
  const p=parsePassage(r); return p&&passageVerses(p).length?r:null;
}

/* ---------- screen ---------- */
const MEM={review:null};
EXTRA_VIEWS.memory=renderMemory;
HOME_TOOLS.push({go:"memory",open:()=>{ MEM.review=null; },title:"Memory verses",sub:()=>{ const n=Object.keys(memAll()).length, d=memDue().length; return n?(d?`${d} to review today`:`${n} verse${n===1?"":"s"} · all reviewed`):"Hide God’s word in your heart"; }});
EXTRA_ROUTES.memory={hash:()=>"#/memory"+(MEM.review?"/review":""), apply:parts=>{ MEM.review=parts[0]==="review"?{queue:null}:null; }};

function renderMemory(){
  if(MEM.review) return renderReview();
  const v=$("#view"), all=Object.entries(memAll()).sort((a,b)=>a[1].due.localeCompare(b[1].due)||b[1].a-a[1].a), due=memDue();
  const mastered=all.filter(([,m])=>m.b>=5).length;
  v.innerHTML=`<div class="mem-screen">
    <div class="mem-head"><h2>Memory verses</h2>
      <p>“Thy word have I laid up in my heart, That I might not sin against thee.” <span>Psalm 119:11</span></p></div>
    ${all.length?`<div class="mem-stats"><div><b>${all.length}</b><span>verse${all.length===1?"":"s"}</span></div><div><b>${due.length}</b><span>due today</span></div><div><b>${mastered}</b><span>well known</span></div></div>
      <button class="btn-primary mem-go" id="memReview" ${due.length?"":"disabled"}>${due.length?`Review ${due.length} verse${due.length===1?"":"s"}`:"Nothing due — come back tomorrow"}</button>`:""}
    <form class="mem-add" id="memAddForm"><input id="memAddQ" placeholder="Add a verse — e.g. Romans 5:8 or Psalm 46:1-3" aria-label="Add a verse" autocomplete="off"><button class="nav-btn" type="submit">Add</button></form>
    <div class="mem-msg" id="memMsg"></div>
    ${all.length?`<div class="lbl" style="padding:0 16px">Your verses</div><div class="mem-list">${all.map(([id,m])=>`
      <div class="mem-row" data-id="${esc(id)}">
        <button class="mem-main" data-r="${esc(m.r)}"><span class="mem-ref">${esc(m.r.replace(/-/g,"–"))}</span><span class="mem-txt">${verseHTML(memText(m.r).slice(0,110))}${memText(m.r).length>110?"…":""}</span></button>
        <div class="mem-side"><span class="mem-boxes" aria-label="Level ${esc(String(m.b))} of 7">${MEM_GAPS.slice(1).map((_,i)=>`<i class="${i<m.b?"on":""}"></i>`).join("")}</span>
          <small>${m.due<=today()?"due today":"next "+memWhen(m.due)}</small>
          <button class="link-btn mem-del" data-r="${esc(m.r)}" aria-label="Remove ${esc(m.r)}">Remove</button></div>
      </div>`).join("")}</div>`
      :`<div class="mem-empty">Pick a verse to start with, or add one from any verse in the Bible (tap the verse → Mark → Memorize).</div>`}
    <div class="lbl" style="padding:14px 16px 0">${all.length?"More to learn":"Good verses to begin with"}</div>
    <div class="mem-starters">${MEM_STARTERS.filter(r=>!memHas(r)).map(r=>`<button class="chip" data-add="${esc(r)}">+ ${esc(r)}</button>`).join("")}</div>
  </div>`;
  const msg=t=>{ $("#memMsg").textContent=t; };
  $("#memAddForm").onsubmit=e=>{ e.preventDefault(); const raw=$("#memAddQ").value, r=memParse(raw)||(parsePassage(raw)&&passageVerses(parsePassage(raw)).length?raw.trim():null);
    if(!r){ msg("Couldn’t find that verse — try “John 3:16”."); return; }
    if(memHas(r)){ msg(r+" is already in your list."); return; }
    if(!memAdd(r)){ toast("Couldn’t find "+r); return; } toast("Added "+r); renderMemory(); };
  v.querySelectorAll("[data-add]").forEach(b=>b.onclick=()=>{ if(!memAdd(b.dataset.add)) return; toast("Added "+b.dataset.add); renderMemory(); });
  v.querySelectorAll(".mem-main").forEach(b=>b.onclick=()=>gotoVerse(b.dataset.r));
  v.querySelectorAll(".mem-del").forEach(b=>b.onclick=()=>{
    if(b.dataset.armed){ memRemove(b.dataset.r); renderMemory(); return; }
    b.dataset.armed=1; b.textContent="Tap again to remove"; setTimeout(()=>{ if(document.contains(b)){ delete b.dataset.armed; b.textContent="Remove"; } },3000);
  });
  const go=$("#memReview"); if(go) go.onclick=()=>{ MEM.review={queue:null}; setRoute("#/memory/review",false); renderMemory(); };
}
function memWhen(d){ const n=Math.round((new Date(d+"T00:00")-new Date(today()+"T00:00"))/864e5); return n<=1?"tomorrow":n<7?`in ${n} days`:n<14?"next week":`in ${Math.round(n/7)} weeks`; }

/* ---------- review ---------- */
function renderReview(){
  const v=$("#view"), R=MEM.review;
  if(!R.queue){ R.queue=memDue().map(([id])=>id); R.done=0; R.total=R.queue.length; R.stage=0; }
  const all=memAll();
  R.queue=R.queue.filter(id=>all[id]);
  if(!R.queue.length){
    v.innerHTML=`<div class="mem-screen"><div class="mem-done"><div class="mem-done-mark">✓</div><h2>${R.total?"All done for today":"Nothing to review"}</h2>
      <p>${R.total?`You reviewed ${R.total} verse${R.total===1?"":"s"}. Verses you knew come back later; ones you missed come back sooner.`:"Add a verse or come back when one is due."}</p>
      <button class="btn-primary" id="memBack">Back to my verses</button></div></div>`;
    $("#memBack").onclick=()=>{ MEM.review=null; setRoute("#/memory",true); renderMemory(); };
    return;
  }
  const id=R.queue[0], m=all[id], text=memText(m.r);
  const body=R.stage===0?`<div class="mem-prompt">Say it from memory, then check.</div>`
    :R.stage===1?`<div class="mem-hint">${esc(firstLetters(text))}</div><div class="mem-prompt">First letters of each word</div>`
    :`<div class="mem-full">${verseHTML(text)}</div>`;
  v.innerHTML=`<div class="mem-screen mem-review">
    <div class="mem-top"><button class="lex-back" id="memQuit">‹ My verses</button><span>${R.done+1} of ${R.done+R.queue.length}</span></div>
    <div class="mem-card${R.stage===2?" shown":""}"><div class="mem-card-ref">${esc(m.r.replace(/-/g,"–"))}</div>${body}<div class="mem-card-tr">${esc(TRANSLATIONS[state.trans].short)}</div></div>
    <div class="mem-actions">${R.stage<2
      ?`${R.stage===0?'<button class="btn-ghost" id="memHint">Show first letters</button>':""}<button class="btn-primary" id="memShow">Show verse</button>`
      :`<button class="mem-grade again" data-g="0">Again<small>soon</small></button><button class="mem-grade hard" data-g="1">Hard<small>${memWhenGap(m,1)}</small></button><button class="mem-grade good" data-g="2">Got it<small>${memWhenGap(m,2)}</small></button>`}</div>
  </div>`;
  $("#memQuit").onclick=()=>{ MEM.review=null; setRoute("#/memory",true); renderMemory(); };
  const hint=$("#memHint"); if(hint) hint.onclick=()=>{ R.stage=1; renderReview(); };
  const show=$("#memShow"); if(show) show.onclick=()=>{ R.stage=2; renderReview(); };
  v.querySelectorAll(".mem-grade").forEach(b=>b.onclick=()=>memGrade(id,+b.dataset.g));
}
function memNext(m,g){ const b=g===0?0:g===1?Math.max(1,m.b):Math.min(m.b+1,MEM_GAPS.length-1); return {b,gap:g===0?0:g===1?Math.max(1,Math.ceil(MEM_GAPS[b]/2)):MEM_GAPS[b]}; }
function memWhenGap(m,g){ const {gap}=memNext(m,g); return gap<=1?"tomorrow":gap<7?`${gap} days`:gap<30?`${Math.round(gap/7)} wk`:`${Math.round(gap/30)} mo`; }
function memGrade(id,g){
  const all=memAll(), m=all[id], R=MEM.review; if(!m) return;
  const {b,gap}=memNext(m,g);
  all[id]={...m,b,due:addDays(gap),n:(m.n||0)+1,u:Date.now()}; store.set("memory",all);
  R.queue.shift(); R.stage=0;
  if(g===0) R.queue.push(id); else R.done++;              // missed verses come round again this session
  renderReview();
}

/* ---------- from the verse sheet ---------- */
MARK_ACTIONS.push({
  html:ref=>`<button class="btn-ghost mem-toggle" id="memToggle">${memHas(ref)?"✓ In your memory verses":"Memorize this verse"}</button>`,
  bind:(body,ref)=>{ const b=body.querySelector("#memToggle"); if(!b) return;
    b.onclick=()=>{ if(memHas(ref)){ memRemove(ref); toast("Removed from memory verses"); } else if(memAdd(ref)) toast("Added to memory verses"); b.textContent=memHas(ref)?"✓ In your memory verses":"Memorize this verse"; }; }
});
