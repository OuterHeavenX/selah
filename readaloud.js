"use strict";
/* Selah — read aloud with the device's built-in voices (Web Speech API).
   Reads verse by verse from the first verse on screen, highlights the verse being read,
   follows it (scrolls, or turns the page in book view) and carries on into the next chapter. */

const SPEAK={on:false, book:null, ch:0, v:0, rate:+store.get("rate",1)||1, voice:null, gen:0};
const RATES=[0.8,1,1.2,1.4];
const canSpeak=()=>"speechSynthesis" in window&&"SpeechSynthesisUtterance" in window;

function pickVoice(){
  if(!canSpeak()) return null;
  const vs=speechSynthesis.getVoices().filter(v=>/^en(-|_|$)/i.test(v.lang));
  if(!vs.length) return null;
  const score=v=>(/premium|enhanced|natural|neural/i.test(v.name)?40:0)+(/en[-_]US/i.test(v.lang)?6:/en[-_]GB/i.test(v.lang)?5:0)
    +(/samantha|daniel|ava|allison|google us english|aria|jenny|guy/i.test(v.name)?10:0)+(v.localService?2:0)+(v.default?1:0);
  return vs.sort((a,b)=>score(b)-score(a))[0];
}
if(canSpeak()) speechSynthesis.addEventListener?.("voiceschanged",()=>{ SPEAK.voice=pickVoice(); });

function listenButtonsHTML(){
  if(!canSpeak()) return "";
  return `<button class="nav-btn listen-btn${SPEAK.on?" on":""}" id="listenBtn" aria-label="${SPEAK.on?"Pause reading aloud":"Read aloud"}">${SPEAK.on?"❚❚":"▶"}<span>${SPEAK.on?"Pause":"Listen"}</span></button>`
    +(SPEAK.on?`<button class="nav-btn rate-btn" id="rateBtn" aria-label="Reading speed">${SPEAK.rate}×</button>`:"");
}
function bindListen(){
  const b=$("#listenBtn"); if(b) b.onclick=()=>SPEAK.on?stopReading(true):startReading();
  const r=$("#rateBtn"); if(r) r.onclick=()=>{
    SPEAK.rate=RATES[(RATES.indexOf(SPEAK.rate)+1)%RATES.length]; store.set("rate",SPEAK.rate); r.textContent=SPEAK.rate+"×";
    if(SPEAK.on){ SPEAK.gen++; speechSynthesis.cancel(); speakCurrent(); }            // restart this verse at the new speed
  };
}
function refreshListenUI(){
  const nav=document.querySelector(".reader-nav"); if(!nav) return;
  nav.querySelectorAll(".listen-btn,.rate-btn").forEach(x=>x.remove());
  const holder=document.createElement("span"); holder.innerHTML=listenButtonsHTML();
  const before=nav.querySelector("#bookToggle");
  [...holder.childNodes].forEach(n=>nav.insertBefore(n,before||null));
  bindListen();
}

// First verse the reader can see right now.
function firstVisibleVerse(){
  const navB=(document.querySelector(".reader-nav")?.getBoundingClientRect().bottom)||0;
  const els=[...document.querySelectorAll(document.getElementById("book")?"#bookSpread .bslot .verse[data-ref][tabindex='0']":".verses .verse[data-ref]")];
  const el=els.find(e=>{ const r=e.getClientRects()[0]; return r&&r.bottom>navB+4&&r.top<innerHeight; })||els[0];
  return el?parseRef(el.dataset.ref):null;
}
function startReading(){
  if(!canSpeak()) return;
  const p=firstVisibleVerse(); if(!p) return;
  SPEAK.voice=SPEAK.voice||pickVoice();
  Object.assign(SPEAK,{on:true,book:p.book,ch:p.ch,v:p.v}); SPEAK.gen++;
  speechSynthesis.cancel();
  refreshListenUI();
  speakCurrent();
}
function stopReading(keepPlace){
  if(!SPEAK.on) return;
  SPEAK.on=false; SPEAK.gen++;
  if(canSpeak()) speechSynthesis.cancel();
  document.querySelectorAll(".verse.speaking").forEach(e=>e.classList.remove("speaking"));
  refreshListenUI();
}
function speechText(t){ return t.replace(/\[(Higgaion\. )?Selah/g,"Selah.").replace(/[\[\]]/g,""); }
function speakCurrent(){
  if(!SPEAK.on) return;
  const book=BOOKS.find(b=>b.name===SPEAK.book), chap=book&&book.chapters[SPEAK.ch-1];
  if(!chap) return stopReading();
  if(SPEAK.v>chap.length){                                   // chapter finished → next chapter
    const nb=BOOKS.findIndex(b=>b.name===SPEAK.book); let b2=nb, c2=SPEAK.ch+1;
    if(c2>book.chapters.length){ b2=nb+1; c2=1; }
    if(b2>=BOOKS.length) return stopReading();
    Object.assign(SPEAK,{book:BOOKS[b2].name,ch:c2,v:1});
    if(!document.getElementById("book")){ SPEAK.internal=true; state.book=SPEAK.book; state.ch=SPEAK.ch; savePos(); renderRead(); window.scrollTo(0,0); SPEAK.internal=false; }
  }
  const b=BOOKS.find(x=>x.name===SPEAK.book), t=b.chapters[SPEAK.ch-1][SPEAK.v-1];
  if(!t){ SPEAK.v++; return speakCurrent(); }               // verse not in this translation
  const head=(b.headings||{})[`${SPEAK.ch}:${SPEAK.v}`];
  let say=speechText(t);
  if(SPEAK.v===1) say=`${SPEAK.book==="Psalms"?"Psalm":SPEAK.book+", chapter"} ${SPEAK.ch}. `+(head&&!/^[֐-׿]/.test(head)?head+" ":"")+say;
  followVerse().then(()=>{
    if(!SPEAK.on) return;
    const u=new SpeechSynthesisUtterance(say), gen=SPEAK.gen;
    if(SPEAK.voice) u.voice=SPEAK.voice; u.lang=(SPEAK.voice&&SPEAK.voice.lang)||"en-US"; u.rate=SPEAK.rate;
    u.onend=()=>{ if(gen!==SPEAK.gen||!SPEAK.on) return; SPEAK.v++; speakCurrent(); };
    u.onerror=e=>{ if(gen!==SPEAK.gen) return; if(e.error!=="interrupted"&&e.error!=="canceled") stopReading(); };
    speechSynthesis.speak(u);
  });
}
// Highlight the verse being read and bring it into view (turning the page in book view).
async function followVerse(){
  const ref=`${SPEAK.book} ${SPEAK.ch}:${SPEAK.v}`;
  if(document.getElementById("book")&&typeof BOOK!=="undefined"){
    const visible=()=>[...document.querySelectorAll(`#bookSpread .verse[data-ref="${CSS.escape(ref)}"]`)].some(e=>e.tabIndex===0);
    let guard=0;
    while(!visible()&&guard++<3&&SPEAK.on){
      const r=measureChapter(SPEAK.book,SPEAK.ch), pg=r.pages[ref];
      const L=BOOK.sp.L, R=BOOK.sp.R;
      const ahead=pg!==undefined&&(L.b!==SPEAK.book||L.c!==SPEAK.ch||pg>(R&&R.b===SPEAK.book&&R.c===SPEAK.ch?R.i:L.i));
      if(ahead&&guard===1){ const f=beginFlip(1); if(f) await f.finish(true); else break; }
      else { BOOK.sp=spreadAt({b:SPEAK.book,c:SPEAK.ch,i:pg||0}); paintSpread(); }
    }
  }
  markSpeaking();
  if(!document.getElementById("book")){
    const el=document.querySelector(`.verses .verse[data-ref="${CSS.escape(ref)}"]`);
    if(el){ const r=el.getBoundingClientRect(), navB=(document.querySelector(".reader-nav")?.getBoundingClientRect().bottom)||0;
      if(r.top<navB+8||r.bottom>innerHeight-90) el.scrollIntoView({block:"center",behavior:"smooth"}); }
  }
}
function markSpeaking(){
  if(!SPEAK.on) return;
  const ref=`${SPEAK.book} ${SPEAK.ch}:${SPEAK.v}`;
  document.querySelectorAll(".verse.speaking").forEach(e=>{ if(e.dataset.ref!==ref) e.classList.remove("speaking"); });
  document.querySelectorAll(`.verse[data-ref="${CSS.escape(ref)}"]`).forEach(e=>e.classList.add("speaking"));
}
// Reading stops when you leave the reader or pick another chapter yourself (see app.js), or close the page.
window.addEventListener("pagehide",()=>stopReading());
