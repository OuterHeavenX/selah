"use strict";
/* Selah — welcome tour: four short screens on first launch (and from About → Take the tour again).
   Lets a new reader pick a translation and theme, shows what a tap on a verse opens, and how to install. */

const WELCOME={i:0, el:null, ret:null};
const WELCOME_TRANS=["bsb","kjv","asv","web","nheb","lsv"];
function welcomeSlides(){
  const ios=/iPhone|iPad|iPod/.test(navigator.userAgent)||(navigator.platform==="MacIntel"&&navigator.maxTouchPoints>1);
  const installed=typeof isStandalone==="function"&&isStandalone();
  return [
    `<img class="wl-logo" src="img/icons/icon-192.png?v=${SHELL_VER}" alt="" width="96" height="96">
     <h2>Welcome to Selah</h2>
     <p class="wl-lead">Pause and reflect.</p>
     <p>A quiet place to read the Bible and go deeper — ${Object.keys(TRANSLATIONS).length} translations, the Hebrew and Greek, cross-references, commentaries, maps and more. Free, with no ads.</p>`,
    `<h2>Read your way</h2>
     <div class="wl-h">Translation</div>
     <div class="wl-trans">${WELCOME_TRANS.map(k=>`<button data-k="${k}" class="${k===state.trans?"on":""}" aria-pressed="${k===state.trans}"><b>${esc(TRANSLATIONS[k].short)}</b><small>${esc(TRANSLATIONS[k].full.replace(/\s*\(.*\)$/,""))}</small></button>`).join("")}</div>
     <p class="wl-note">There are ${Object.keys(TRANSLATIONS).length - WELCOME_TRANS.length} more — tap the translation name at the top any time.</p>
     <div class="wl-h">Look</div>
     ${seg("Theme",[["light","Light"],["dark","Dark"],["auto","Auto"]],themePref())}`,
    `<h2>Tap any verse</h2>
     <p>Every verse opens a study sheet:</p>
     <ul class="wl-list">
       <li><b>Cross-refs</b><span>related passages across the Bible, and the people and places in the dictionary</span></li>
       <li><b>Hebrew &amp; Greek</b><span>the original words, what they mean, and where else they’re used</span></li>
       <li><b>Commentary</b><span>Jamieson-Fausset-Brown or Matthew Henry</span></li>
       <li><b>Mark</b><span>highlight, write a note, bookmark, memorize or pray the verse</span></li>
     </ul>
     <p class="wl-note">Home has reading plans, memory verses, a prayer list, your journal, maps, a timeline and Bible trivia.</p>`,
    `<h2>Keep it with you</h2>
     ${installed?`<p>Selah is installed — it opens full-screen and works offline.</p>`
       :ios?`<p><b>Add Selah to your Home Screen:</b> in Safari tap <b>Share</b> <span class="wl-ic">⇪</span> then <b>Add to Home Screen</b>. It opens like an app and works offline.</p>`
       :installPrompt?`<p>Install Selah so it opens like an app and works offline.</p><button class="btn-ghost" id="wlInstall">Install Selah</button>`
       :`<p>Selah works offline once you’ve opened it. In your browser’s menu, choose <b>Install</b> or <b>Add to Home screen</b> to open it like an app.</p>`}
     <p>Want your notes on every device? Sign in on the <b>Saved</b> screen and they sync automatically.</p>
     <p class="wl-note">Your highlights, notes and prayers stay private on your device unless you choose to sync.</p>`
  ];
}
function showWelcome(){
  if(WELCOME.el) return;
  WELCOME.ret=document.activeElement; WELCOME.i=0;
  const el=document.createElement("div"); el.id="welcome"; el.setAttribute("role","dialog"); el.setAttribute("aria-modal","true"); el.setAttribute("aria-label","Welcome to Selah");
  document.body.appendChild(el); document.body.classList.add("sheet-open"); WELCOME.el=el;
  paintWelcome();
  let x0=null;
  el.addEventListener("touchstart",e=>{ x0=e.touches[0].clientX; },{passive:true});
  el.addEventListener("touchend",e=>{ if(x0===null) return; const dx=e.changedTouches[0].clientX-x0; x0=null;
    if(Math.abs(dx)>60) { if(dx<0&&WELCOME.i<3){ WELCOME.i++; paintWelcome(); } else if(dx>0&&WELCOME.i>0){ WELCOME.i--; paintWelcome(); } } });
  el.addEventListener("keydown",e=>{ if(e.key==="Escape") closeWelcome(); });
}
function paintWelcome(){
  const el=WELCOME.el, S=welcomeSlides(), i=WELCOME.i, last=i===S.length-1;
  el.innerHTML=`<div class="wl-card">
    <button class="wl-skip link-btn" id="wlSkip">${last?"":"Skip"}</button>
    <div class="wl-body">${S[i]}</div>
    <div class="wl-foot">
      <button class="nav-btn" id="wlBack" ${i?"":"style=\"visibility:hidden\""} aria-label="Back">‹</button>
      <div class="wl-dots" aria-hidden="true">${S.map((_,k)=>`<i class="${k===i?"on":""}"></i>`).join("")}</div>
      <button class="btn-primary" id="wlNext">${last?"Start reading":"Next"}</button>
    </div></div>`;
  el.querySelector("#wlSkip").onclick=closeWelcome;
  el.querySelector("#wlBack").onclick=()=>{ WELCOME.i--; paintWelcome(); };
  el.querySelector("#wlNext").onclick=()=>{ if(last){ closeWelcome(); showView("read"); } else { WELCOME.i++; paintWelcome(); } };
  el.querySelectorAll(".wl-trans button").forEach(b=>b.onclick=async()=>{
    el.querySelectorAll(".wl-trans button").forEach(x=>{ x.classList.toggle("on",x===b); x.setAttribute("aria-pressed",x===b); });
    b.querySelector("small").textContent="Loading…"; await setTrans(b.dataset.k); paintWelcome(); });
  el.querySelectorAll('.seg[aria-label="Theme"] button').forEach(b=>b.onclick=()=>{ applyThemePref(b.dataset.v); paintWelcome(); });
  const ins=el.querySelector("#wlInstall"); if(ins) ins.onclick=async()=>{ installPrompt.prompt(); await installPrompt.userChoice.catch(()=>{}); installPrompt=null; paintWelcome(); };
  el.querySelector("#wlNext").focus({preventScroll:true});
}
function closeWelcome(){
  if(!WELCOME.el) return;
  WELCOME.el.remove(); WELCOME.el=null; store.set("welcomed",true);
  if(!state.sheetRef) document.body.classList.remove("sheet-open");
  if(state.view==="home") renderHome();
}
