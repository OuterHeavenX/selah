"use strict";
/* Selah — reading plans and backup/restore.
   Plan progress lives in localStorage ("selah_plan"): {id, start:"YYYY-MM-DD", done:{"day.chapterIndex":1}, log:{"YYYY-MM-DD":n}}.
   Chapters for a plan are split into days by verse count, so long chapters (Psalm 119) don't pile up. */

const PLAN_DEFS=[
  {id:"john21", title:"John in 21 days", days:21, blurb:"One chapter a day through the Gospel this app is built around.",
   books:["John"]},
  {id:"gospels30", title:"The Gospels in 30 days", days:30, blurb:"Matthew, Mark, Luke and John — the life of Jesus four ways, about three chapters a day.",
   books:["Matthew","Mark","Luke","John"]},
  {id:"psapro60", title:"Psalms & Proverbs in 60 days", days:60, blurb:"The prayer book and the wisdom book of Israel, a few chapters a day.",
   books:["Psalms","Proverbs"]},
  {id:"nt90", title:"New Testament in 90 days", days:90, blurb:"Matthew to Revelation in three months — about three chapters a day.",
   from:"Matthew", to:"Revelation"},
  {id:"bible365", title:"The Bible in a year", days:365, blurb:"Genesis to Revelation, about 15 minutes a day.",
   from:"Genesis", to:"Revelation"}
];
const PLAN_CACHE={};

function planBooks(def){
  if(def.books) return def.books;
  const a=BOOKS.findIndex(b=>b.name===def.from), z=BOOKS.findIndex(b=>b.name===def.to);
  return BOOKS.slice(a,z+1).map(b=>b.name);
}
// Split the plan's chapters into days with roughly equal verse counts.
function planSchedule(def){
  if(PLAN_CACHE[def.id]) return PLAN_CACHE[def.id];
  const chs=[];
  planBooks(def).forEach(name=>{ const b=BOOKS.find(x=>x.name===name); b.chapters.forEach((ch,ci)=>chs.push({book:name,ch:ci+1,n:ch.length})); });
  const total=chs.reduce((s,c)=>s+c.n,0), days=[];
  let acc=0, cur=[];
  chs.forEach((c,i)=>{
    cur.push(c); acc+=c.n;
    const target=total*(days.length+1)/def.days;          // verses that should be read by the end of this day
    const chLeft=chs.length-i-1, daysLeft=def.days-days.length-1;
    // Close the day once it reaches its share — or when every remaining day needs exactly one chapter.
    // Round to the nearest chapter boundary: stop here if adding the next chapter would overshoot by more.
    const next=chs[i+1], nearEnough=next?acc+next.n/2>=target:true;
    if(daysLeft>0&&(chLeft===daysLeft||(nearEnough&&chLeft>daysLeft))){ days.push(cur); cur=[]; }
  });
  if(cur.length) days.push(cur);
  PLAN_CACHE[def.id]=days; return days;
}
const todayStr=(d=new Date())=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
const dayDiff=(a,b)=>Math.round((new Date(b+"T12:00")-new Date(a+"T12:00"))/864e5);
function getPlan(){ const p=store.get("plan",null); return p&&PLAN_DEFS.find(d=>d.id===p.id)?p:null; }
function savePlan(p){ store.set("plan",p); }
function chapterLabel(c){ return `${c.book} ${c.ch}`; }
function dayDone(p,days,i){ return days[i].every((_,k)=>p.done[`${i}.${k}`]); }
function planStatus(p){
  const def=PLAN_DEFS.find(d=>d.id===p.id), days=planSchedule(def);
  const doneDays=days.filter((_,i)=>dayDone(p,days,i)).length;
  const next=days.findIndex((_,i)=>!dayDone(p,days,i));
  const scheduled=Math.min(days.length,dayDiff(p.start,todayStr())+1);   // days that should be done by end of today
  return {def,days,doneDays,next,scheduled,behind:Math.max(0,scheduled-doneDays),finished:next<0};
}
// Consecutive days (ending today, or yesterday if nothing yet today) with at least one chapter checked.
function planStreak(p){
  const log=p.log||{}; let n=0, d=new Date();
  if(!log[todayStr(d)]) d.setDate(d.getDate()-1);
  while(log[todayStr(d)]){ n++; d.setDate(d.getDate()-1); }
  return n;
}
function toggleChapter(p,day,k,on){
  const key=`${day}.${k}`;
  if(on===undefined) on=!p.done[key];
  if(on){ p.done[key]=1; p.log=p.log||{}; p.log[todayStr()]=(p.log[todayStr()]||0)+1; }
  else delete p.done[key];
  savePlan(p);
}

/* ---------- Home card ---------- */
function planHomeCard(){
  const p=getPlan();
  if(!p) return `<button class="home-plan empty-plan" id="hcPlan"><div class="hlab">Reading plan</div><div class="plan-t">Start a reading plan</div><div class="plan-s">The Bible in a year, the Gospels in 30 days, and more.</div></button>`;
  const s=planStatus(p), streak=planStreak(p);
  if(s.finished) return `<button class="home-plan" id="hcPlan"><div class="hlab">${esc(s.def.title)}</div><div class="plan-t">Finished — well done!</div><div class="plan-s">Tap to choose your next plan.</div></button>`;
  const day=s.days[s.next], pct=Math.round(100*s.doneDays/s.days.length);
  return `<div class="home-plan" id="hcPlanBox">
    <div class="plan-top"><div class="hlab">${esc(s.def.title)} · Day ${s.next+1} of ${s.days.length}</div>${streak?`<div class="plan-streak" title="Days in a row">🔥 ${streak}</div>`:""}</div>
    <div class="plan-chs">${day.map((c,k)=>`<span class="plan-ch${p.done[`${s.next}.${k}`]?" done":""}"><button class="plan-check" data-k="${k}" aria-label="Mark ${esc(chapterLabel(c))} read">${p.done[`${s.next}.${k}`]?"✓":""}</button><button class="plan-go" data-k="${k}">${esc(chapterLabel(c))}</button></span>`).join("")}</div>
    <div class="plan-bar"><div style="width:${pct}%"></div></div>
    <div class="plan-foot"><span>${pct}% complete${s.behind>1?` · ${s.behind-1} day${s.behind-1===1?"":"s"} behind`:""}</span><button class="plan-more" id="hcPlanMore">Plan →</button></div>
  </div>`;
}
function bindPlanHomeCard(){
  const btn=$("#hcPlan"); if(btn) btn.onclick=()=>showView("plans");
  const box=$("#hcPlanBox"); if(!box) return;
  const p=getPlan(), s=planStatus(p), day=s.days[s.next];
  box.querySelectorAll(".plan-go").forEach(b=>b.onclick=()=>{ const c=day[+b.dataset.k]; toggleChapter(p,s.next,+b.dataset.k,true); gotoVerse(`${c.book} ${c.ch}:1`); });
  box.querySelectorAll(".plan-check").forEach(b=>b.onclick=()=>{ toggleChapter(p,s.next,+b.dataset.k); renderHome(); });
  $("#hcPlanMore").onclick=()=>showView("plans");
}

/* ---------- Plans view ---------- */
function renderPlans(){
  const v=$("#view"), p=getPlan();
  let h=`<h2 class="section-title">Reading plans</h2><div class="section-sub">Tap a chapter to read it — it’s checked off for you. Progress stays on this device and is included in your backup.</div>`;
  if(p){
    const s=planStatus(p), pct=Math.round(100*s.doneDays/s.days.length), streak=planStreak(p);
    h+=`<div class="plan-active"><div class="plan-top"><h3>${esc(s.def.title)}</h3>${streak?`<div class="plan-streak">🔥 ${streak} day${streak===1?"":"s"}</div>`:""}</div>
      <div class="plan-bar"><div style="width:${pct}%"></div></div>
      <div class="plan-s">${s.doneDays} of ${s.days.length} days done · started ${new Date(p.start+"T12:00").toLocaleDateString(undefined,{month:"short",day:"numeric",year:"numeric"})}${s.behind>1?` · ${s.behind-1} behind schedule`:""}</div>
      <div class="plan-days">${s.days.map((day,i)=>{
        const done=dayDone(p,s.days,i), cur=i===s.next;
        return `<div class="plan-day${done?" done":""}${cur?" cur":""}" ${cur?'id="planCur"':""}><div class="pd-n">Day ${i+1}</div><div class="pd-chs">${day.map((c,k)=>`<span class="plan-ch${p.done[`${i}.${k}`]?" done":""}"><button class="plan-check" data-d="${i}" data-k="${k}" aria-label="Mark ${esc(chapterLabel(c))} read">${p.done[`${i}.${k}`]?"✓":""}</button><button class="plan-go" data-d="${i}" data-k="${k}">${esc(chapterLabel(c))}</button></span>`).join("")}</div></div>`;
      }).join("")}</div>
      <button class="btn-ghost" id="planStop">Stop this plan</button></div>
      <div class="lbl" style="padding:0 16px">Other plans</div>`;
  }
  h+=`<div class="plan-list">${PLAN_DEFS.filter(d=>!p||d.id!==p.id).map(d=>{
    const days=planSchedule(d), chs=days.reduce((s,x)=>s+x.length,0);
    return `<div class="plan-card"><h3>${esc(d.title)}</h3><div class="plan-s">${esc(d.blurb)}</div><div class="plan-s">${chs} chapters · ${days.length} days</div><button class="btn-primary plan-start" data-id="${d.id}">Start</button></div>`;
  }).join("")}</div>`;
  v.innerHTML=h;
  v.querySelectorAll(".plan-start").forEach(b=>b.onclick=()=>{
    if(p&&!confirm("Start a new plan? Your progress on the current plan will be cleared.")) return;
    savePlan({id:b.dataset.id,start:todayStr(),done:{},log:(p&&p.log)||{}}); toast("Plan started"); renderPlans();
  });
  if(p){
    const s=planStatus(p);
    v.querySelectorAll(".plan-days .plan-go").forEach(b=>b.onclick=()=>{ const d=+b.dataset.d,k=+b.dataset.k,c=s.days[d][k]; toggleChapter(p,d,k,true); gotoVerse(`${c.book} ${c.ch}:1`); });
    v.querySelectorAll(".plan-days .plan-check").forEach(b=>b.onclick=()=>{ const y=window.scrollY; toggleChapter(p,+b.dataset.d,+b.dataset.k); renderPlans(); window.scrollTo(0,y); });
    $("#planStop").onclick=()=>{ if(confirm("Stop this plan and clear its progress?")){ store.set("plan",null); renderPlans(); } };
    requestAnimationFrame(()=>{ const c=$("#planCur"); if(c&&window.scrollY===0) c.scrollIntoView({block:"center"}); });
  }
}

/* ---------- backup / restore ---------- */
function exportBackup(){
  const data={app:"selah",version:1,exported:new Date().toISOString(),highlights:HL,notes:NOTES,plan:store.get("plan",null),
    stores:Object.fromEntries(SYNC_STORES.map(s=>[s.key,store.get(s.key,{})]))};
  const blob=new Blob([JSON.stringify(data,null,1)],{type:"application/json"});
  const name=`selah-backup-${todayStr()}.json`;
  const file=new File([blob],name,{type:"application/json"});
  if(navigator.canShare&&navigator.canShare({files:[file]})&&/iPhone|iPad|Android/i.test(navigator.userAgent)){
    navigator.share({files:[file],title:"Selah backup"}).catch(()=>{});
    return;
  }
  const a=document.createElement("a"); a.href=URL.createObjectURL(blob); a.download=name;
  document.body.appendChild(a); a.click(); setTimeout(()=>{ URL.revokeObjectURL(a.href); a.remove(); },500);
  toast("Backup saved");
}
// Merges a backup into what's on this device: nothing here is lost.
function importBackup(text){
  let d; try{ d=JSON.parse(text); }catch(e){ toast("That file isn’t a Selah backup"); return; }
  if(!d||d.app!=="selah"){ toast("That file isn’t a Selah backup"); return; }
  let h=0,n=0;
  for(const [k,c] of Object.entries(d.highlights||{})) if(parseRef(k)&&!HL[k]&&/^[ygbp]$/.test(c)){ HL[k]=c; h++; }
  for(const [k,t] of Object.entries(d.notes||{})){
    if(!parseRef(k)||typeof t!=="string"||!t.trim()) continue;
    if(!NOTES[k]){ NOTES[k]=t; n++; }
    else if(NOTES[k]!==t&&!NOTES[k].includes(t)){ NOTES[k]=NOTES[k]+"\n\n— "+t; n++; }
  }
  store.set("hl",HL); store.set("notes",NOTES);
  // Memory verses, journal entries…: add what's missing, keep whichever copy was edited last.
  let extra=0;
  for(const s of SYNC_STORES){
    const theirs=(d.stores||{})[s.key]; if(!theirs||typeof theirs!=="object") continue;
    const mine=store.get(s.key,{}); let n2=0;
    for(const [id,v] of Object.entries(theirs)) if(s.valid(v)&&(!mine[id]||(v.u||0)>(mine[id].u||0))){ mine[id]=v; n2++; }
    if(n2){ store.set(s.key,mine); extra+=n2; }
  }
  let planMsg="";
  const mine=store.get("plan",null), theirs=d.plan;
  if(theirs&&PLAN_DEFS.some(x=>x.id===theirs.id)){
    if(!mine){ store.set("plan",theirs); planMsg=" and your reading plan"; }
    else if(mine.id===theirs.id){
      mine.done={...theirs.done,...mine.done}; mine.log={...(theirs.log||{}),...(mine.log||{})};
      if(theirs.start<mine.start) mine.start=theirs.start;
      store.set("plan",mine); planMsg=" and plan progress";
    }
  }
  toast(`Restored ${h} highlight${h===1?"":"s"}, ${n} note${n===1?"":"s"}${extra?`, ${extra} memory verse${extra===1?"":"s"} & journal entr${extra===1?"y":"ies"}`:""}${planMsg}`);
  showView(state.view);
}
function backupHTML(){
  return `<div class="backup"><div class="lbl">Backup</div>
    <div class="section-sub" style="padding:0 0 10px">Save your highlights, notes, reading-plan progress, memory verses and journal to a file, then restore it on your other devices. Restoring adds to what’s already here — it never deletes anything.</div>
    <div class="backup-row"><button class="btn-primary" id="bkExport">Save backup</button><button class="btn-ghost" id="bkImport">Restore from file</button></div>
    <input type="file" id="bkFile" accept="application/json,.json" hidden></div>`;
}
function bindBackup(){
  $("#bkExport").onclick=exportBackup;
  $("#bkImport").onclick=()=>$("#bkFile").click();
  $("#bkFile").onchange=e=>{ const f=e.target.files[0]; if(!f) return; const r=new FileReader(); r.onload=()=>importBackup(r.result); r.readAsText(f); e.target.value=""; };
}
