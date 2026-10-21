"use strict";
/* Selah — book view for wide screens (iPad landscape, desktop).
   Each chapter is laid out in CSS columns sized to one page; a page is a window onto
   that column flow. Two pages make a spread, and the leaf turns with a 3D flip that can
   be dragged by finger, swiped, tapped at the page edge, or driven by the arrow keys. */

const BOOK_MIN_W=900;
const BOOK={sp:null, dims:null, cache:new Map(), flip:null};

function bookCapable(){ return window.innerWidth>=BOOK_MIN_W && window.innerWidth>window.innerHeight; }
function isBookMode(){ return bookCapable() && store.get("bookMode",true); }
const prefersReducedMotion=()=>window.matchMedia&&matchMedia("(prefers-reduced-motion: reduce)").matches;

/* ---------- geometry ---------- */
function bookMeasureDims(host){
  // Everything below the book: its own padding plus the body's bottom padding (which clears the tab bar).
  const below=24+parseFloat(getComputedStyle(document.body).paddingBottom||64)+4;
  const avH=Math.max(380, window.innerHeight-(host.getBoundingClientRect().top+window.scrollY)-below);
  const avW=Math.min(window.innerWidth-120, 1560);                 // room for the turn arrows
  const ph=Math.floor(avH);
  const pw=Math.floor(Math.min(avW/2, ph*0.82));
  const padx=Math.round(Math.max(28, Math.min(52, pw*0.085)));
  const padt=40, padb=50, G=60;
  const fw=pw-2*padx, fh=ph-padt-padb;
  const fs=store.get("fs",18);
  return {pw,ph,padx,padt,padb,G,fw,fh,step:fw+G,sig:`${fw}x${fh}|${fs}|${state.trans}`};
}
function applyDims(host,d){
  const st=host.style;
  st.setProperty("--pw",d.pw+"px"); st.setProperty("--ph",d.ph+"px");
  st.setProperty("--padx",d.padx+"px"); st.setProperty("--padt",d.padt+"px"); st.setProperty("--padb",d.padb+"px");
  st.setProperty("--fw",d.fw+"px"); st.setProperty("--fh",d.fh+"px"); st.setProperty("--gap",d.G+"px");
}

/* ---------- chapter layout ---------- */
function chapterFlowHTML(b,c){
  return `<header class="btitle"><div class="bt-book">${esc(b)}</div><div class="bt-ch">${b==="Psalms"?"Psalm ":"Chapter "}${c}</div></header>`+chapterVersesHTML(b,c);
}
// Lays a chapter out once in a hidden measurer: page count + the page each verse starts on.
function measureChapter(b,c){
  const d=BOOK.dims, key=`${b}|${c}|${d.sig}`;
  if(BOOK.cache.has(key)) return BOOK.cache.get(key);
  const html=chapterFlowHTML(b,c);
  const host=$("#bookMeasure"); host.innerHTML=`<div class="bflow">${html}</div>`;
  const flow=host.firstChild;
  const n=Math.max(1,Math.round((flow.scrollWidth+d.G)/d.step));
  const fr=flow.getBoundingClientRect(), pages={};
  flow.querySelectorAll(".verse[data-ref]").forEach(el=>{
    const r=el.getClientRects()[0]||el.getBoundingClientRect();
    pages[el.dataset.ref]=Math.max(0,Math.floor((r.left-fr.left+2)/d.step));
  });
  host.innerHTML="";
  const rec={html,n,pages}; BOOK.cache.set(key,rec); return rec;
}
function adjChapter(b,c,dir){
  const bi=BOOKS.findIndex(x=>x.name===b); let nb=bi, nc=c+dir;
  if(nc<1){ if(bi===0) return null; nb=bi-1; nc=BOOKS[nb].chapters.length; }
  else if(nc>BOOKS[bi].chapters.length){ if(bi===BOOKS.length-1) return null; nb=bi+1; nc=1; }
  return {b:BOOKS[nb].name, c:nc};
}
const lastSpread=n=>(n-1)-((n-1)%2);
function nextSpread(sp){
  const r=measureChapter(sp.b,sp.c);
  if(sp.s+2<r.n) return {b:sp.b,c:sp.c,s:sp.s+2};
  const nx=adjChapter(sp.b,sp.c,1); return nx&&{b:nx.b,c:nx.c,s:0};
}
function prevSpread(sp){
  if(sp.s>=2) return {b:sp.b,c:sp.c,s:sp.s-2};
  const pv=adjChapter(sp.b,sp.c,-1); if(!pv) return null;
  return {b:pv.b,c:pv.c,s:lastSpread(measureChapter(pv.b,pv.c).n)};
}

/* ---------- pages ---------- */
function pageHTML(sp,side){
  const d=BOOK.dims, r=measureChapter(sp.b,sp.c), idx=sp.s+(side==="right"?1:0);
  if(idx>=r.n){
    const nx=adjChapter(sp.b,sp.c,1);
    return `<div class="bpage ${side} blank"><div class="bend"><div class="bend-orn">❦</div>${nx?`<div class="bend-next">${esc(nx.b)} ${nx.c} follows</div>`:""}</div></div>`;
  }
  return `<div class="bpage ${side}"><div class="bclip"><div class="bflow" style="transform:translateX(${-idx*d.step}px)">${r.html}</div></div>`
    +`<div class="bfoot">${esc(sp.b)} ${sp.c}<span>·</span>${idx+1} / ${r.n}</div></div>`;
}
function paintSpread(){
  const spread=$("#bookSpread"); if(!spread) return;
  spread.innerHTML=`<div class="bslot left">${pageHTML(BOOK.sp,"left")}</div><div class="bslot right">${pageHTML(BOOK.sp,"right")}</div><div class="bspine"></div>`;
  // Each page holds the whole chapter flow; only verses inside its window may take focus or be read out.
  spread.querySelectorAll(".bclip").forEach(clip=>{
    const cr=clip.getBoundingClientRect();
    clip.querySelectorAll(".verse, .vhead, .btitle").forEach(el=>{
      const rects=[...el.getClientRects()];
      const on=rects.some(r=>r.right>cr.left+1&&r.left<cr.right-1&&r.bottom>cr.top&&r.top<cr.bottom);
      if(on) el.removeAttribute("aria-hidden"); else el.setAttribute("aria-hidden","true");
      if(el.dataset.ref) el.tabIndex=on?0:-1;
    });
  });
  const prev=prevSpread(BOOK.sp), next=nextSpread(BOOK.sp);
  $("#bookPrev").disabled=!prev; $("#bookNext").disabled=!next;
  // Moving into another chapter keeps the chapter picker and "continue reading" in step.
  if(state.book!==BOOK.sp.b||state.ch!==BOOK.sp.c){
    state.book=BOOK.sp.b; state.ch=BOOK.sp.c; savePos();
    const nav=document.querySelector(".reader-nav");
    if(nav){ nav.outerHTML=readerNavHTML(); bindReaderNav(); }
  }
}

/* ---------- render / relayout ---------- */
function renderBook(){
  const host=$("#book");
  host.innerHTML=`<button class="bturn prev" id="bookPrev" aria-label="Previous page">‹</button>
    <div class="bspread" id="bookSpread" aria-live="polite"></div>
    <button class="bturn next" id="bookNext" aria-label="Next page">›</button>
    <div class="bmeasure" id="bookMeasure" aria-hidden="true"></div>`;
  BOOK.dims=bookMeasureDims(host); applyDims(host,BOOK.dims);
  const keep=BOOK.sp&&BOOK.sp.b===state.book&&BOOK.sp.c===state.ch;
  const r=measureChapter(state.book,state.ch);
  BOOK.sp={b:state.book, c:state.ch, s:keep?Math.min(BOOK.sp.s,lastSpread(r.n)):0};
  paintSpread();
  $("#bookPrev").onclick=()=>turnPage(-1);
  $("#bookNext").onclick=()=>turnPage(1);
  bindBookGestures($("#bookSpread"));
  bindVerseOpen($("#bookSpread"));
}
// First verse visible on the current spread — used to keep your place when the layout changes.
function spreadAnchor(){
  if(!BOOK.sp) return null;
  const r=measureChapter(BOOK.sp.b,BOOK.sp.c);
  let best=null;
  for(const [ref,pg] of Object.entries(r.pages)) if(pg>=BOOK.sp.s&&pg<=BOOK.sp.s+1){ best=ref; break; }
  return best;
}
function bookRelayout(){
  const host=$("#book"); if(!host||BOOK.flip) return;
  const anchor=spreadAnchor();
  BOOK.dims=bookMeasureDims(host); applyDims(host,BOOK.dims);
  if(anchor){ const r=measureChapter(BOOK.sp.b,BOOK.sp.c); const pg=r.pages[anchor]??0; BOOK.sp.s=pg-pg%2; }
  paintSpread();
}
// Highlights and notes are baked into the cached chapter HTML; drop it and repaint in place.
function bookRefreshChapter(){
  if(!BOOK.sp) return;
  for(const k of [...BOOK.cache.keys()]) if(k.startsWith(`${BOOK.sp.b}|${BOOK.sp.c}|`)) BOOK.cache.delete(k);
  const r=measureChapter(BOOK.sp.b,BOOK.sp.c); BOOK.sp.s=Math.min(BOOK.sp.s,lastSpread(r.n));
  paintSpread();
}
// Jump to the spread holding a verse or passage and flash it (book-mode gotoVerse).
function bookReveal(p){
  showView("read");
  const first=`${p.book} ${p.ch}:${p.v1}`;
  const r=measureChapter(p.book,p.ch);
  const pg=r.pages[first]??0;
  BOOK.sp={b:p.book,c:p.ch,s:pg-pg%2}; paintSpread();
  const els=[...document.querySelectorAll("#bookSpread .verse[data-ref]")].filter(el=>{
    const q=parseRef(el.dataset.ref); return q&&verseInPassage(q.book,q.ch,q.v,p);
  });
  els.forEach(el=>el.classList.add("flash"));
  setTimeout(()=>els.forEach(el=>el.classList.remove("flash")),1800);
}

/* ---------- the page turn ---------- */
// Sets up a turn in direction dir (+1 forward, -1 back) and returns a controller driven by progress 0..1.
function beginFlip(dir){
  if(BOOK.flip) return null;
  const from=BOOK.sp, to=dir>0?nextSpread(from):prevSpread(from);
  if(!to) return null;
  const spread=$("#bookSpread");
  const slotL=spread.querySelector(".bslot.left"), slotR=spread.querySelector(".bslot.right");
  const leaf=document.createElement("div");
  leaf.className="bleaf "+(dir>0?"fwd":"bwd");
  if(dir>0){
    // The right page lifts off the stack; the next spread's right page lies beneath it.
    leaf.innerHTML=`<div class="bface front">${pageHTML(from,"right")}<div class="bshade"></div></div><div class="bface back">${pageHTML(to,"left")}<div class="bshade"></div></div>`;
    slotR.innerHTML=pageHTML(to,"right")+`<div class="bcast"></div>`;
  }else{
    leaf.innerHTML=`<div class="bface front">${pageHTML(from,"left")}<div class="bshade"></div></div><div class="bface back">${pageHTML(to,"right")}<div class="bshade"></div></div>`;
    slotL.innerHTML=pageHTML(to,"left")+`<div class="bcast"></div>`;
  }
  spread.appendChild(leaf);
  const shades=leaf.querySelectorAll(".bshade"), cast=spread.querySelector(".bcast");
  let p=0;
  const set=q=>{
    p=Math.max(0,Math.min(1,q));
    const ang=180*p*(dir>0?-1:1);
    // A slight lift at mid-turn reads as the paper bending away from the spine.
    leaf.style.transform=`rotateY(${ang}deg) translateZ(${Math.sin(Math.PI*p)*18}px)`;
    shades[0].style.opacity=Math.min(1,p*1.8)*0.55;
    shades[1].style.opacity=Math.min(1,(1-p)*1.8)*0.55;
    cast.style.opacity=Math.sin(Math.PI*p)*0.9;
    leaf.style.setProperty("--lift",Math.sin(Math.PI*p));
  };
  const done=complete=>{
    leaf.remove();
    if(complete) BOOK.sp=to;
    BOOK.flip=null;
    paintSpread();
  };
  const finish=(complete,ms)=>new Promise(res=>{
    const target=complete?1:0, start=p, dist=Math.abs(target-start);
    if(prefersReducedMotion()||dist<0.001){ done(complete); return res(); }
    const dur=(ms||820)*Math.max(0.35,dist), t0=performance.now();
    const ease=t=>t<.5?4*t*t*t:1-Math.pow(-2*t+2,3)/2;
    const tick=now=>{
      const t=Math.min(1,(now-t0)/dur); set(start+(target-start)*ease(t));
      if(t<1) requestAnimationFrame(tick); else { done(complete); res(); }
    };
    requestAnimationFrame(tick);
  });
  set(0);
  BOOK.flip={dir,set,finish};
  return BOOK.flip;
}
function turnPage(dir){
  const f=beginFlip(dir); if(f) f.finish(true);
}

/* ---------- gestures ---------- */
function bindBookGestures(spread){
  let start=null, flip=null, dragged=false, lastX=0, lastT=0, vx=0;
  spread.addEventListener("pointerdown",e=>{
    if(e.button>0||BOOK.flip) return;
    start={x:e.clientX,y:e.clientY,id:e.pointerId}; flip=null; dragged=false; lastX=e.clientX; lastT=performance.now(); vx=0;
  });
  spread.addEventListener("pointermove",e=>{
    if(!start||e.pointerId!==start.id) return;
    const dx=e.clientX-start.x, dy=e.clientY-start.y;
    const now=performance.now(); vx=(e.clientX-lastX)/Math.max(1,now-lastT); lastX=e.clientX; lastT=now;
    if(!flip){
      if(Math.abs(dx)<12||Math.abs(dx)<Math.abs(dy)*1.2) return;
      flip=beginFlip(dx<0?1:-1);
      if(!flip){ start=null; return; }
      dragged=true;
      try{ spread.setPointerCapture(e.pointerId); }catch(_){}
    }
    const travel=BOOK.dims.pw*1.6;
    flip.set(flip.dir>0?-dx/travel:dx/travel);
  });
  const end=e=>{
    if(!start||e.pointerId!==start.id) return;
    start=null;
    if(flip){
      const fast=Math.abs(vx)>0.45&&Math.sign(vx)===-flip.dir;      // a quick flick completes the turn
      const back=Math.abs(vx)>0.45&&Math.sign(vx)===flip.dir;
      const f=flip; flip=null;
      f.finish(!back&&(fast||progressOf(spread)>0.28),640);
    }
  };
  spread.addEventListener("pointerup",end);
  spread.addEventListener("pointercancel",e=>{ if(flip){ const f=flip; flip=null; start=null; f.finish(false,400); } });
  // Taps: page margins turn the page; anywhere on a verse opens the study sheet.
  spread.addEventListener("click",e=>{
    if(dragged){ dragged=false; e.preventDefault(); e.stopPropagation(); return; }
    if(BOOK.flip) return;
    const r=spread.getBoundingClientRect(), edge=BOOK.dims.padx+18;
    if(e.clientX>r.right-edge){ turnPage(1); return; }
    if(e.clientX<r.left+edge){ turnPage(-1); return; }
    const v=e.target.closest(".verse[data-ref]");
    if(v) openSheet(v.dataset.ref,"xrefs");
  },true);
}
// Current turn progress, read back from the leaf's rotation.
function progressOf(spread){
  const leaf=spread.querySelector(".bleaf"); if(!leaf) return 0;
  const m=/rotateY\((-?[\d.]+)deg\)/.exec(leaf.style.transform);
  return m?Math.abs(parseFloat(m[1]))/180:0;
}

/* ---------- keyboard + resize ---------- */
document.addEventListener("keydown",e=>{
  if(state.view!=="read"||!document.getElementById("book")||state.sheetRef) return;
  if(!$("#lightbox").classList.contains("hidden")) return;
  const tag=(e.target.tagName||"").toLowerCase(); if(tag==="input"||tag==="select"||tag==="textarea") return;
  if(e.key==="ArrowRight"||e.key==="PageDown"){ e.preventDefault(); turnPage(1); }
  else if(e.key==="ArrowLeft"||e.key==="PageUp"){ e.preventDefault(); turnPage(-1); }
});
let bookResizeT=null;
window.addEventListener("resize",()=>{
  clearTimeout(bookResizeT);
  bookResizeT=setTimeout(()=>{
    if(state.view!=="read"||!BOOKS.length) return;
    const inBook=!!document.getElementById("book");
    if(inBook!==isBookMode()){ renderRead(); window.scrollTo(0,0); }   // rotated across the threshold
    else if(inBook) bookRelayout();
    else { const nav=document.querySelector(".reader-nav"); if(nav){ nav.outerHTML=readerNavHTML(); bindReaderNav(); } }
  },180);
});
