"use strict";
/* Selah — Settings panel (⚙ in the header, or tap the translation badge).
   Sections are listed in SETTINGS_SECTIONS so later features can add their own. */

const SETTINGS_SECTIONS=[];   // [{id, title, html(), bind(root)}]

function compareTrans(){ const c=store.get("compare",null); return c&&TRANSLATIONS[c]&&c!==state.trans?c:null; }
async function setCompare(id){
  store.set("compare",id||null);
  if(id&&!BIBLES[id]){ try{ await loadTranslation(id); }catch(e){ toast("Couldn’t load "+TRANSLATIONS[id].short); store.set("compare",null); } }
  if(typeof BOOK!=="undefined") BOOK.cache.clear();
  if(state.view==="read") renderRead();
}
function themePref(){ return store.get("themePref",null)||store.get("theme","light"); }
function applyThemePref(p){
  store.set("themePref",p);
  const dark=p==="auto"?(matchMedia&&matchMedia("(prefers-color-scheme: dark)").matches):p==="dark";
  applyTheme(dark?"dark":"light");
}
const seg=(name,opts,cur)=>`<div class="seg" role="radiogroup" aria-label="${esc(name)}">${opts.map(([v,l])=>`<button role="radio" aria-checked="${v===cur}" class="${v===cur?"on":""}" data-v="${esc(String(v))}">${esc(l)}</button>`).join("")}</div>`;
const toggle=(id,on,label)=>`<button class="tgl${on?" on":""}" id="${id}" role="switch" aria-checked="${on}" aria-label="${esc(label)}"><span></span></button>`;

SETTINGS_SECTIONS.push({id:"reading", title:"Reading", html:()=>{
  const cmp=compareTrans()||"";
  const opts=TRANS_GROUPS.map(g=>`<optgroup label="${esc(g)}">${Object.entries(TRANSLATIONS).filter(([k,t])=>t.group===g&&k!==state.trans).map(([k,t])=>`<option value="${k}"${k===cmp?" selected":""}>${esc(t.full)}</option>`).join("")}</optgroup>`).join("");
  return `<div class="set-row"><div class="set-l">Translation<small>${esc(TRANSLATIONS[state.trans].full)}</small></div><button class="btn-ghost set-pick" id="setTransPick">Change…</button></div>
    <div class="set-row"><div class="set-l">Side by side<small>Show a second translation with every verse</small></div><select id="setCmp" class="set-select" aria-label="Side by side"><option value="">Off</option>${opts}</select></div>
    <div class="set-row"><div class="set-l">Text size<small style="font-size:${store.get("fs",18)}px;font-family:Georgia,serif">In the beginning God created…</small></div>
      <div class="set-fs"><button class="nav-btn" id="setFsDec" aria-label="Smaller text">A−</button><span>${store.get("fs",18)}</span><button class="nav-btn" id="setFsInc" aria-label="Larger text">A+</button></div></div>
    <div class="set-row"><div class="set-l">Book view on wide screens<small>Two pages with page turns on iPad (landscape) and computers</small></div>${toggle("setBook",store.get("bookMode",true),"Book view")}</div>`;
}, bind:root=>{
  root.querySelector("#setTransPick").onclick=()=>{ SETTINGS_PAGE="library"; paintSettings(); };
  root.querySelector("#setCmp").onchange=async e=>{ await setCompare(e.target.value||null); paintSettings(); };
  root.querySelector("#setFsDec").onclick=()=>{ applyFontSize(Math.max(14,store.get("fs",18)-2)); paintSettings(); };
  root.querySelector("#setFsInc").onclick=()=>{ applyFontSize(Math.min(26,store.get("fs",18)+2)); paintSettings(); };
  root.querySelector("#setBook").onclick=()=>{ store.set("bookMode",!store.get("bookMode",true)); if(state.view==="read") renderRead(); paintSettings(); };
}});
SETTINGS_SECTIONS.push({id:"look", title:"Appearance & audio", html:()=>`
    <div class="set-row"><div class="set-l">Theme</div>${seg("Theme",[["light","Light"],["dark","Dark"],["auto","Auto"]],themePref())}</div>
    <div class="set-row"><div class="set-l">Read-aloud speed</div>${seg("Read-aloud speed",RATES.map(r=>[String(r),r+"×"]),String(SPEAK.rate))}</div>`,
  bind:root=>{
    const [th,rt]=root.querySelectorAll(".seg");
    th.querySelectorAll("button").forEach(b=>b.onclick=()=>{ applyThemePref(b.dataset.v); paintSettings(); });
    rt.querySelectorAll("button").forEach(b=>b.onclick=()=>{ SPEAK.rate=+b.dataset.v; store.set("rate",SPEAK.rate); paintSettings(); });
  }});

/* ---------- translation library (a page inside Settings) ---------- */
let SETTINGS_PAGE=null;
function libraryHTML(){
  const cmp=compareTrans();
  return `<button class="lex-back" id="libBack">‹ Settings</button>
    <div class="lib-intro">${Object.keys(TRANSLATIONS).length} translations, all free to read. Each downloads the first time you open it (about 1–4 MB) and then works offline. <b>Read</b> switches the text; <b>Side by side</b> adds it next to every verse.</div>`
  +TRANS_GROUPS.map(g=>`<section class="lib-group"><div class="lbl">${esc(g)}</div>${Object.entries(TRANSLATIONS).filter(([,t])=>t.group===g).map(([k,t])=>`
    <div class="lib-card${k===state.trans?" on":""}">
      <div class="lib-top"><b>${esc(t.full)}</b><span class="lib-scope ${t.scope}">${esc(SCOPE_LABEL[t.scope])}</span></div>
      <div class="lib-about">${esc(t.about)}</div>
      <div class="lib-lic">${esc(t.license)}</div>
      <div class="lib-acts">${k===state.trans?'<span class="lib-cur">Reading now</span>':`<button class="btn-primary lib-read" data-k="${k}">Read</button>`}
        ${k===state.trans?"":`<button class="btn-ghost lib-cmp${k===cmp?" on":""}" data-k="${k}" aria-pressed="${k===cmp}">${k===cmp?"✓ Side by side":"Side by side"}</button>`}</div>
    </div>`).join("")}</section>`).join("");
}
function bindLibrary(box){
  box.querySelector("#libBack").onclick=()=>{ SETTINGS_PAGE=null; paintSettings(); box.scrollTop=0; };
  box.querySelectorAll(".lib-read").forEach(b=>b.onclick=async()=>{
    b.disabled=true; b.textContent="Loading…";
    await setTrans(b.dataset.k);
    if(store.get("compare",null)===b.dataset.k) store.set("compare",null);
    if(typeof BOOK!=="undefined") BOOK.cache.clear();
    const y=box.scrollTop; paintSettings(); box.scrollTop=y;
  });
  box.querySelectorAll(".lib-cmp").forEach(b=>b.onclick=async()=>{
    const k=b.dataset.k; b.disabled=true;
    await setCompare(compareTrans()===k?null:k);
    const y=box.scrollTop; paintSettings(); box.scrollTop=y;
  });
}
function openLibrary(){ SETTINGS_PAGE="library"; openSettings(); }

function paintSettings(){
  const box=$("#settingsBody"); if(!box) return;
  if(SETTINGS_PAGE==="library"){ box.innerHTML=libraryHTML(); bindLibrary(box); $("#settingsTitle").textContent="Translations"; return; }
  $("#settingsTitle").textContent="Settings";
  const y=box.scrollTop;
  box.innerHTML=SETTINGS_SECTIONS.map(s=>`<section class="set-sec" data-id="${s.id}"><div class="lbl">${esc(s.title)}</div>${s.html()}</section>`).join("")
    +`<div class="set-foot">Sync, backup and offline downloads are on the <button class="link-btn" id="setToSaved">Saved</button> screen.</div>`;
  SETTINGS_SECTIONS.forEach(s=>s.bind(box.querySelector(`.set-sec[data-id="${s.id}"]`)));
  $("#setToSaved").onclick=()=>{ closeSettings(); showView("saved"); };
  box.scrollTop=y;
}
let settingsReturn=null;
function openSettings(){
  settingsReturn=document.activeElement;
  $("#settingsWrap").classList.remove("hidden"); document.body.classList.add("sheet-open");
  pushOverlay("settings"); paintSettings();
  $("#settingsClose").focus({preventScroll:true});
}
function closeSettings(){
  const w=$("#settingsWrap"); if(!w||w.classList.contains("hidden")) return;
  w.classList.add("hidden"); if(!state.sheetRef) document.body.classList.remove("sheet-open");
  if(settingsReturn&&document.contains(settingsReturn)) settingsReturn.focus({preventScroll:true});
}
function bindSettings(){
  $("#settingsBtn").onclick=()=>{ SETTINGS_PAGE=null; openSettings(); };
  $("#transBtn").onclick=openLibrary;
  const dismiss=()=>dismissOverlay("settings",closeSettings);
  $("#settingsClose").onclick=dismiss; $("#settingsScrim").onclick=dismiss;
  swipeToClose($("#settingsPanel"),$("#settingsBody"),dismiss);
  document.addEventListener("keydown",e=>{ if(e.key==="Escape"&&!$("#settingsWrap").classList.contains("hidden")) dismiss(); });
  // "Auto" theme follows the device when it switches between light and dark.
  if(window.matchMedia) matchMedia("(prefers-color-scheme: dark)").addEventListener?.("change",()=>{ if(themePref()==="auto") applyThemePref("auto"); });
  if(themePref()==="auto") applyThemePref("auto");
  const c=store.get("compare",null); if(c&&TRANSLATIONS[c]&&!BIBLES[c]) loadTranslation(c).then(()=>{ if(state.view==="read"){ if(typeof BOOK!=="undefined") BOOK.cache.clear(); renderRead(); } }).catch(()=>{});
}
