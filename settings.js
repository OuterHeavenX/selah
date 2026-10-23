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
    <div class="set-row"><div class="set-l">Text size<small class="set-preview" style="font-size:${store.get("fs",18)}px">In the beginning God created…</small></div>
      <div class="set-fs"><button class="nav-btn" id="setFsDec" aria-label="Smaller text">A−</button><span>${store.get("fs",18)}</span><button class="nav-btn" id="setFsInc" aria-label="Larger text">A+</button></div></div>
    <div class="set-row"><div class="set-l">Book introductions<small>Author, date, theme and outline before chapter 1</small></div>${toggle("setIntros",introsOn(),"Book introductions")}</div>
    <div class="set-row"><div class="set-l">Words of Jesus in red<small>In the Gospels, Acts and Revelation</small></div>${toggle("setRed",redOn(),"Words of Jesus in red")}</div>
    <div class="set-row"><div class="set-l">Font</div>${seg("Font",[["classic","Classic"],["book","Book"],["sans","Modern"]],store.get("readFont","classic"))}</div>
    <div class="set-row"><div class="set-l">Line spacing</div>${seg("Line spacing",[["compact","Snug"],["normal","Normal"],["roomy","Roomy"]],store.get("readLH","normal"))}</div>
    <div class="set-row"><div class="set-l">Margins</div>${seg("Margins",[["wide","Slim"],["normal","Normal"],["narrow","Wide"]],store.get("readW","normal"))}</div>
    <div class="set-row"><div class="set-l">Book view on wide screens<small>Two pages with page turns on iPad (landscape) and computers</small></div>${toggle("setBook",store.get("bookMode",true),"Book view")}</div>`;
}, bind:root=>{
  root.querySelector("#setTransPick").onclick=()=>{ SETTINGS_PAGE="library"; paintSettings(); };
  root.querySelector("#setCmp").onchange=async e=>{ await setCompare(e.target.value||null); paintSettings(); };
  root.querySelector("#setFsDec").onclick=()=>{ applyFontSize(Math.max(14,store.get("fs",18)-2)); paintSettings(); };
  root.querySelector("#setFsInc").onclick=()=>{ applyFontSize(Math.min(26,store.get("fs",18)+2)); paintSettings(); };
  const look=(name,key)=>root.querySelectorAll(`.seg[aria-label="${name}"] button`).forEach(b=>b.onclick=()=>{ store.set(key,b.dataset.v); applyReadLook(); paintSettings(); });
  look("Font","readFont"); look("Line spacing","readLH"); look("Margins","readW");
  root.querySelector("#setIntros").onclick=()=>{ store.set("intros",!introsOn()); if(state.view==="read") renderRead(); paintSettings(); };
  root.querySelector("#setRed").onclick=()=>{ store.set("redLetters",!redOn()); if(typeof BOOK!=="undefined") BOOK.cache.clear(); if(state.view==="read") renderRead(); paintSettings(); };
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

/* ---------- About & privacy (a page inside Settings) ---------- */
const APP_VERSION="1.0";
const SHELL_VER=((document.querySelector('script[src*="app.js?v="]')||{}).src||"").split("v=")[1]||"";
function aboutHTML(){
  const pd=Object.values(TRANSLATIONS).filter(t=>/public domain/i.test(t.license)).map(t=>t.full);
  const cc=Object.values(TRANSLATIONS).filter(t=>!/public domain/i.test(t.license)).map(t=>`${t.full} — ${t.license}`);
  return `<button class="lex-back" id="libBack">‹ Settings</button>
  <div class="about-page">
    <div class="about-brand"><img src="img/icons/icon-192.png?v=${SHELL_VER}" alt="" width="64" height="64"><div><b>Selah</b><span>Study Bible · version ${APP_VERSION}</span></div></div>
    <p>Selah is a free study Bible: ${Object.keys(TRANSLATIONS).length} English translations, Hebrew and Greek, cross-references, commentaries, maps, a timeline, reading plans and a place to keep what you learn. No ads, nothing to buy.</p>
    <h3>Your privacy</h3>
    <ul>
      <li><b>Everything stays on your device</b> — highlights, notes, bookmarks, prayers, plans, memory verses and journal are saved in this browser. Selah has no ads, no analytics and no tracking.</li>
      <li><b>If you sign in to sync</b>, your email address and that study data are stored with Supabase (our database host) so your devices can share them. Each account can only read its own data. You can delete the account and everything synced with it at any time on the Saved screen.</li>
      <li><b>If you turn on the daily reminder</b>, the reminder service keeps your browser’s notification address, the time you chose and your time zone — nothing that identifies you. Turning the reminder off deletes it.</li>
      <li><b>Downloads</b> come only from Selah’s own site. Backups you save are files on your device that only you control.</li>
    </ul>
    <h3>Sources and thanks</h3>
    <ul class="about-credits">
      <li><b>Translations in the public domain:</b> ${esc(pd.join(" · "))}.</li>
      ${cc.map(c=>`<li>${esc(c)} (used under that license).</li>`).join("")}
      <li><b>Hebrew and Greek</b> text, word glosses and lexicons: STEPBible.org, Tyndale House Cambridge (CC BY 4.0).</li>
      <li><b>Cross-references:</b> OpenBible.info (CC BY), from the Treasury of Scripture Knowledge.</li>
      <li><b>Topics:</b> Nave’s Topical Bible (1896), via BibleData by Brady Stephenson (CC BY 4.0).</li>
      <li><b>Commentaries:</b> Jamieson-Fausset-Brown (1871) and Matthew Henry (1706–1721), public domain.</li>
      <li><b>Bible dictionary:</b> Easton’s Bible Dictionary (1897) and Hitchcock’s Bible Names, public domain, from the Christian Classics Ethereal Library.</li>
      <li><b>Red letters:</b> from the World English Bible’s markup of the words of Jesus (public domain).</li>
      <li><b>Maps:</b> Natural Earth (public domain) and OpenBible.info Bible Geocoding Data (CC BY 4.0).</li>
    </ul>
    <button class="btn-ghost" id="aboutTour" style="color:var(--accent);border-color:var(--accent)">Take the welcome tour again</button>
    <p class="about-foot">Made with care for reading and reflection. <i>“Thy word is a lamp unto my feet, and light unto my path.”</i> — Psalm 119:105</p>
  </div>`;
}
function openAbout(){ SETTINGS_PAGE="about"; openSettings(); }

function paintSettings(){
  const box=$("#settingsBody"); if(!box) return;
  if(SETTINGS_PAGE==="library"){ box.innerHTML=libraryHTML(); bindLibrary(box); $("#settingsTitle").textContent="Translations"; return; }
  if(SETTINGS_PAGE==="about"){ box.innerHTML=aboutHTML(); $("#settingsTitle").textContent="About Selah"; box.querySelector("#libBack").onclick=()=>{ SETTINGS_PAGE=null; paintSettings(); box.scrollTop=0; };
    box.querySelector("#aboutTour").onclick=()=>{ dismissOverlay("settings",closeSettings); setTimeout(showWelcome,250); }; box.scrollTop=0; return; }
  $("#settingsTitle").textContent="Settings";
  const y=box.scrollTop;
  box.innerHTML=SETTINGS_SECTIONS.map(s=>`<section class="set-sec" data-id="${s.id}"><div class="lbl">${esc(s.title)}</div>${s.html()}</section>`).join("")
    +`<div class="set-foot">Sync, backup and offline downloads are on the <button class="link-btn" id="setToSaved">Saved</button> screen.</div>
      <button class="set-about" id="setAbout"><span>About Selah & privacy</span><small>Version ${APP_VERSION} ›</small></button>`;
  SETTINGS_SECTIONS.forEach(s=>s.bind(box.querySelector(`.set-sec[data-id="${s.id}"]`)));
  $("#setToSaved").onclick=()=>{ closeSettings(); showView("saved"); };
  $("#setAbout").onclick=()=>{ SETTINGS_PAGE="about"; paintSettings(); };
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
