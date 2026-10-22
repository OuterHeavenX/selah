"use strict";
/* Selah — ASV Study Bible prototype */
const DATA_V="10"; // bump when data/*.json changes so phones drop cached copies
let XREFS={}, STUDY=null, TYPES=[];
const TRANSLATIONS={
  asv:{name:"ASV", full:"American Standard Version (1901)", short:"ASV 1901", file:"data/bible.json"},
  web:{name:"WEB", full:"World English Bible", short:"WEB", file:"data/web.json"}
};
const BIBLES={}; // id -> parsed translation json (loaded on demand)
const VINDEX={}; // "Book C:V" -> text
const BOOKS=[];  // {name, chapters, headings?}
const state={view:"read", book:"John", ch:1, sheetRef:null, sheetTab:"xrefs", wordScope:"book", trans:"asv"};

const $=s=>document.querySelector(s);
const esc=s=>String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
const store={
  get(k,d){ try{const v=localStorage.getItem("selah_"+k); return v==null?d:JSON.parse(v);}catch(e){return d;} },
  set(k,v){ try{localStorage.setItem("selah_"+k, JSON.stringify(v));}catch(e){} }
};
let HL=store.get("hl",{}), NOTES=store.get("notes",{});

/* ---------- reference parsing ---------- */
function parseRef(s){
  // "John 3:16" (book names may contain spaces / digits)
  const m=String(s).match(/^(.+?)\s+(\d+):(\d+)$/);
  if(!m) return null;
  return {book:m[1], ch:+m[2], v:+m[3]};
}
function parsePassage(s){
  // "John 6:1-14", "John 3:16", cross-chapter "John 18:28-19:16", or chapter range "Genesis 6-8"
  let m=String(s).match(/^(.+?)\s+(\d+):(\d+)(?:-(\d+)(?::(\d+))?)?$/);
  if(m){
    const ch2=m[5]?+m[4]:+m[2];
    const v2=m[5]?+m[5]:(m[4]?+m[4]:+m[3]);
    return {book:m[1], ch:+m[2], v1:+m[3], ch2, v2};
  }
  m=s.match(/^(.+?)\s+(\d+)-(\d+)$/);
  if(m) return {book:m[1], ch:+m[2], v1:1, ch2:+m[3], v2:9999};
  m=s.match(/^(.+?)\s+(\d+)$/);
  if(m) return {book:m[1], ch:+m[2], v1:1, ch2:+m[2], v2:9999};
  return null;
}
function passageVerses(p){
  if(!p) return [];
  const b=BOOKS.find(b=>b.name===p.book); if(!b) return [];
  const out=[];
  for(let c=p.ch;c<=p.ch2;c++){
    const ch=b.chapters[c-1]; if(!ch) continue;
    const from=(c===p.ch)?p.v1:1, to=(c===p.ch2)?p.v2:ch.length;
    for(let v=from;v<=to&&v<=ch.length;v++) if(ch[v-1]) out.push({ref:`${p.book} ${c}:${v}`, text:ch[v-1]});
  }
  return out;
}
function verseInPassage(book,ch,v,p){
  return p.book===book &&
    (ch>p.ch||(ch===p.ch&&v>=p.v1)) &&
    (ch<p.ch2||(ch===p.ch2&&v<=p.v2));
}
function textOf(ref){ return VINDEX[ref]||""; }

/* ---------- text helpers ---------- */
// Letters in any script (æ, accented, Hebrew, Greek) plus inner apostrophes: "doesn’t", "Judæa".
const WORD_RE=/[\p{L}\p{M}]+(?:['’][\p{L}\p{M}]+)*/gu;
function tokenize(t){ return String(t).match(WORD_RE)||[]; }
function normWord(w){ return w.toLowerCase().replace(/’/g,"'"); }
const foldQuotes=s=>s.replace(/[’‘]/g,"'");
// Wrap whole-word matches of nw in <mark>, escaping everything else.
function markWord(text,nw){
  let out="", last=0; WORD_RE.lastIndex=0; let m;
  while((m=WORD_RE.exec(text))){
    out+=esc(text.slice(last,m.index));
    out+=normWord(m[0])===nw?`<mark>${esc(m[0])}</mark>`:esc(m[0]);
    last=m.index+m[0].length;
  }
  return out+esc(text.slice(last));
}
// Wrap every occurrence of the (already lower-cased, quote-folded) phrase q.
function markPhrase(text,q){
  const low=foldQuotes(text.toLowerCase()); let out="", last=0, i;
  while(q && (i=low.indexOf(q,last))>=0){
    out+=esc(text.slice(last,i))+`<mark>${esc(text.slice(i,i+q.length))}</mark>`; last=i+q.length;
  }
  return out+esc(text.slice(last));
}
// ASV prints the liturgical marks as "[Selah" / "[Higgaion. Selah" — show them as a quiet marker instead.
function verseHTML(t){
  return esc(t).replace(/\[(Higgaion\. Selah|Selah)\b\.?/g,'<span class="selah">$1</span>');
}

/* ---------- loading ---------- */
async function getJSON(url){
  const r=await fetch(url+"?v="+DATA_V);
  if(!r.ok) throw new Error(url+" ("+r.status+")");
  return r.json();
}
async function loadTranslation(id){
  if(!BIBLES[id]) BIBLES[id]=await getJSON(TRANSLATIONS[id].file);
  return BIBLES[id];
}
async function boot(){
  applyTheme(store.get("theme",(window.matchMedia&&matchMedia("(prefers-color-scheme: dark)").matches)?"dark":"light"));
  bindTopbarHeight();
  $("#view").innerHTML='<div class="loading">Loading the Scriptures…</div>';
  let want=store.get("trans","asv"); if(!TRANSLATIONS[want]) want="asv";
  try{
    const [s,m]=await Promise.all([
      getJSON("data/study_john.json"), getJSON("data/typology.json"),
      loadTranslation(want)
    ]);
    STUDY=s; TYPES=(m.types||[]).map(t=>({...t, _nt:parsePassage(t.nt), _ot:parsePassage(t.ot)}));
  }catch(e){
    console.error(e);
    $("#view").innerHTML=`<div class="loading">Couldn’t load the Scriptures.<br><small>${esc(e.message)}</small><br><button class="btn-primary" id="retry" style="width:auto;margin-top:16px">Try again</button></div>`;
    $("#retry").onclick=()=>location.reload();
    return;
  }
  state.trans=want;
  buildIndex();
  updateTransUI();
  const pos=store.get("pos",null);
  if(pos&&BOOKS.some(b=>b.name===pos.book)){ state.book=pos.book; state.ch=pos.ch; }
  bindTabs(); bindTheme(); bindFontSize(); bindSheet(); bindTrans();
  showView("home");
  ensureXrefs(state.book);
}

/* ---------- cross-references (OpenBible.info, whole Bible, one file per book) ---------- */
// XREFS["John 3:16"] = [[toVerseId, votes, rangeEndId?], ...], best first.
const XLOADED={};
const VREF=[];
function vrefs(){
  if(!VREF.length) BOOKS.forEach(b=>b.chapters.forEach((ch,ci)=>{ for(let v=1;v<=ch.length;v++) VREF.push(`${b.name} ${ci+1}:${v}`); }));
  return VREF;
}
function ensureXrefs(bookName){
  const n=BOOKS.findIndex(b=>b.name===bookName)+1; if(!n) return Promise.resolve();
  if(!XLOADED[bookName]){
    XLOADED[bookName]=getJSON(`data/xrefs/${String(n).padStart(2,"0")}.json`).then(d=>{
      for(const k in d) XREFS[`${bookName} ${k}`]=d[k];
      XLOADED[bookName]=true;
      onXrefsLoaded(bookName);
    }).catch(e=>{ console.error(e); delete XLOADED[bookName]; });
  }
  return XLOADED[bookName]===true?Promise.resolve():XLOADED[bookName];
}
// Counts arrive after the page is drawn; add the "↔ n" badges in place.
function onXrefsLoaded(bookName){
  if(state.view!=="read") return;
  if(document.getElementById("book")){
    if(typeof BOOK!=="undefined"){
      for(const k of [...BOOK.cache.keys()]) if(k.startsWith(bookName+"|")) BOOK.cache.delete(k);
      if(!BOOK.flip&&BOOK.sp) paintSpread();
    }
    return;
  }
  document.querySelectorAll(".verses .verse[data-ref]").forEach(el=>{
    const n=(XREFS[el.dataset.ref]||[]).length; if(!n||el.querySelector(".xcount")) return;
    const span=document.createElement("span"); span.className="xcount"; span.textContent="↔ "+n;
    const t=el.querySelector(".tcount"); el.insertBefore(span,t||null);
  });
}
// Display label for a cross-reference target: "Proverbs 8:22-30", "John 18:28-19:16".
function xrefLabel(e){
  const R=vrefs(), a=R[e[0]]; if(e.length<3) return a;
  const z=R[e[2]], pa=parseRef(a), pz=parseRef(z);
  if(!pa||!pz) return a;
  if(pa.book!==pz.book) return `${a} – ${z}`;
  return pa.ch===pz.ch?`${a}-${pz.v}`:`${a}-${pz.ch}:${pz.v}`;
}
function buildIndex(){
  BOOKS.length=0;
  for(const k in VINDEX) delete VINDEX[k];
  BIBLES[state.trans].books.forEach(bk=>{ BOOKS.push(bk);
    bk.chapters.forEach((ch,ci)=>ch.forEach((t,vi)=>{ if(t) VINDEX[`${bk.name} ${ci+1}:${vi+1}`]=t; }));
  });
}
function updateTransUI(){
  const btn=$("#transBtn");
  if(btn) btn.textContent=TRANSLATIONS[state.trans].short;
}
function bindTrans(){
  $("#transBtn").onclick=()=>setTrans(state.trans==="asv"?"web":"asv");
}
async function setTrans(id){
  if(!TRANSLATIONS[id]||id===state.trans) return;
  const btn=$("#transBtn");
  if(!BIBLES[id]){
    btn.disabled=true; btn.textContent="Loading…";
    try{ await loadTranslation(id); }
    catch(e){ console.error(e); toast("Couldn’t load "+TRANSLATIONS[id].short); updateTransUI(); btn.disabled=false; return; }
    btn.disabled=false;
  }
  state.trans=id; store.set("trans",id);
  buildIndex(); updateTransUI();
  showView(state.view);
  toast("Switched to "+TRANSLATIONS[id].short);
}
function applyTheme(t){ document.documentElement.setAttribute("data-theme",t); store.set("theme",t); }
function bindTheme(){ $("#themeBtn").onclick=()=>applyTheme(document.documentElement.getAttribute("data-theme")==="dark"?"light":"dark"); }
function applyFontSize(px){
  document.documentElement.style.setProperty("--fs-verse",px+"px"); store.set("fs",px);
  if(state.view==="read"&&document.getElementById("book")) bookRelayout();
}
function bindFontSize(){
  applyFontSize(store.get("fs",18));
  $("#fsDec").onclick=()=>applyFontSize(Math.max(14,store.get("fs",18)-2));
  $("#fsInc").onclick=()=>applyFontSize(Math.min(26,store.get("fs",18)+2));
}
// Sticky sub-bars sit under the header; track its real height instead of a hard-coded 57px.
function bindTopbarHeight(){
  const bar=$("#topbar");
  const set=()=>document.documentElement.style.setProperty("--topbar-h",bar.offsetHeight+"px");
  set();
  if(window.ResizeObserver) new ResizeObserver(set).observe(bar); else addEventListener("resize",set);
}
function bindTabs(){
  document.querySelectorAll("#tabbar button").forEach(b=>{
    b.onclick=()=>showView(b.dataset.view);
  });
}
function showView(v){
  state.view=v;
  document.querySelectorAll("#tabbar button").forEach(b=>{
    const on=b.dataset.view===v; b.classList.toggle("active",on);
    if(on) b.setAttribute("aria-current","page"); else b.removeAttribute("aria-current");
  });
  closeSheet(); closeLightbox(); stopHeroRotation();
  if(v!=="read") document.documentElement.classList.remove("book-on");
  ({home:renderHome,read:renderRead,search:renderSearch,christ:renderChrist,images:renderImages,saved:renderSaved,plans:renderPlans})[v]();
  window.scrollTo(0,0);
}

/* ---------- ART ---------- */
// Listed in the order the scenes appear in Scripture; the Images tab and the Home slideshow both follow it.
// To add a piece: drop a ~900px-wide JPEG in img/art/ and add an entry in its place in the story.
const ART=[
  {file:"img/art/sinai.jpg", w:900, h:1125, focus:"50% 30%",
   title:"Moses and Aaron at Sinai", ref:"Exodus 32:15-20",
   alt:"Ink drawing of Moses holding the stone tablets beside Aaron in the high priest's garments, with the tabernacle and the golden calf",
   caption:"Moses brings the tablets of the testimony down the mountain while Aaron stands in the high priest’s garments; the tabernacle, the ark and the golden calf are sketched around them."},
  {file:"img/art/bronze-serpent.jpg", w:900, h:1125, focus:"50% 28%",
   title:"The bronze serpent", ref:"Numbers 21:4-9", also:"John 3:14-15",
   alt:"Ink drawing of Moses raising the bronze serpent on a pole above the people of Israel, with a technical sketch of the serpent",
   caption:"Bitten by fiery serpents, Israel looks to the bronze serpent on the pole and lives — the picture Jesus takes for himself: “as Moses lifted up the serpent in the wilderness, even so must the Son of man be lifted up.”"},
  {file:"img/art/prophet.jpg", w:900, h:1125, focus:"50% 38%",
   title:"The prophet and the scrolls", ref:null,
   alt:"Ink drawing of an old prophet poring over scrolls, with the temple sketched behind him",
   caption:"An old prophet bent over the scrolls of the word of the Lord, the temple sketched behind him."}
];
const artSrc=a=>a.file+"?v="+DATA_V;

/* ---------- HOME ---------- */
const VOTD=["John 1:1","Psalms 23:1","John 3:16","Romans 8:28","Philippians 4:13","Proverbs 3:5","Isaiah 40:31","Matthew 11:28","Psalms 46:1","Jeremiah 29:11","John 14:6","Micah 6:8","Psalms 19:14","Lamentations 3:22"];
function dayIndex(n){ const d=new Date(), s=new Date(d.getFullYear(),0,0); return Math.floor((d-s)/864e5)%n; }
function renderHome(){
  const v=$("#view");
  const pos=store.get("pos",null);
  const hlN=Object.keys(HL).length, noteN=Object.keys(NOTES).length;
  const votd=VOTD[dayIndex(VOTD.length)];
  const typ=TYPES.length?TYPES[dayIndex(TYPES.length)]:null;
  const typFirst=typ&&typ._nt?`${typ._nt.book} ${typ._nt.ch}:${typ._nt.v1}`:null;
  const start=dayIndex(ART.length);
  v.innerHTML=`<div class="home"><div class="home-art"><div class="home-hero">
      <button class="hero-slides" id="heroSlides" aria-label="Open this picture">${ART.map((a,i)=>
        `<img src="${artSrc(a)}" alt="${esc(a.alt)}" width="${a.w}" height="${a.h}" decoding="async" style="object-position:${a.focus}" class="${i===start?"on":""}" ${i===start?"":'loading="lazy"'}>`).join("")}</button>
      <div class="home-brand"><div class="home-name">Selah</div><div class="home-tag">Pause and reflect.</div>
        <div class="hero-dots" role="group" aria-label="Choose picture">${ART.map((a,i)=>`<button data-i="${i}" class="${i===start?"on":""}" aria-label="${esc(a.title)}"></button>`).join("")}</div></div>
    </div></div><div class="home-main">`
  +(pos&&BOOKS.some(b=>b.name===pos.book)?`<button class="home-continue" id="hcCont"><span>Continue reading</span><b>${esc(pos.book)} ${pos.ch} →</b></button>`:"")
  +planHomeCard()
  +`<button class="home-votd" id="hcVotd"><div class="hlab">Verse of the day</div><div class="votd-ref">${esc(votd)}</div><div class="votd-text">${verseHTML(textOf(votd))}</div></button>`
  +(typ&&typFirst?`<button class="home-typ" id="hcTyp"><div class="hlab">Typology of the day</div><div class="ty-t">${esc(typ.title)}</div><div class="ty-s">${esc(typ.nt)} &nbsp;↔&nbsp; ${esc(typ.ot)}</div></button>`:"")
  +`<div class="home-grid">
    <button class="home-card" data-go="read"><div class="hc-t">Read</div><div class="hc-s">The Bible · ${esc(TRANSLATIONS[state.trans].short)}</div></button>
    <button class="home-card" data-go="search"><div class="hc-t">Search</div><div class="hc-s">Any word or phrase</div></button>
    <button class="home-card" data-go="christ"><div class="hc-t">Trace Christ</div><div class="hc-s">Study trails in John</div></button>
    <button class="home-card" data-go="images"><div class="hc-t">Images</div><div class="hc-s">${ART.length} pieces of art</div></button>
    <button class="home-card" data-go="plans"><div class="hc-t">Reading plans</div><div class="hc-s">${getPlan()?"Your plan and progress":"Year, Gospels, NT…"}</div></button>
    <button class="home-card" data-go="saved"><div class="hc-t">Saved</div><div class="hc-s">${hlN} highlight${hlN===1?"":"s"} · ${noteN} note${noteN===1?"":"s"}</div></button>
  </div>
  <div class="home-foot">Selah · ${esc(TRANSLATIONS[state.trans].full)}, public domain</div></div></div>`;
  const go=g=>showView(g);
  v.querySelectorAll(".home-card").forEach(b=>b.onclick=()=>go(b.dataset.go));
  const hc=v.querySelector("#hcCont"); if(hc) hc.onclick=()=>go("read");
  v.querySelector("#hcVotd").onclick=()=>gotoVerse(votd);
  const ht=v.querySelector("#hcTyp"); if(ht) ht.onclick=()=>{ gotoVerse(typFirst); setTimeout(()=>openSheet(typFirst,"typology"),80); };
  bindPlanHomeCard();
  startHero(start);
}
/* Home slideshow: crossfades through ART; pauses when the tab is hidden or the user prefers reduced motion. */
const HERO_MS=6500;
let heroTimer=null, heroIdx=0;
function startHero(i){
  heroIdx=i;
  const slides=document.querySelectorAll("#heroSlides img"), dots=document.querySelectorAll(".hero-dots button");
  const show=n=>{ heroIdx=(n+ART.length)%ART.length;
    slides.forEach((im,k)=>im.classList.toggle("on",k===heroIdx));
    dots.forEach((d,k)=>{ d.classList.toggle("on",k===heroIdx); d.setAttribute("aria-pressed",k===heroIdx); }); };
  const reduced=window.matchMedia&&matchMedia("(prefers-reduced-motion: reduce)").matches;
  const tick=()=>{ if(!document.hidden) show(heroIdx+1); };
  const restart=()=>{ clearInterval(heroTimer); heroTimer=reduced?null:setInterval(tick,HERO_MS); };
  dots.forEach(d=>d.onclick=e=>{ e.stopPropagation(); show(+d.dataset.i); restart(); });
  $("#heroSlides").onclick=()=>openLightbox(heroIdx);
  show(heroIdx); restart();
}
function stopHeroRotation(){ clearInterval(heroTimer); heroTimer=null; }

/* ---------- IMAGES ---------- */
function renderImages(){
  const v=$("#view");
  v.innerHTML=`<h2 class="section-title">Images</h2>
  <div class="section-sub">Artwork in the order the scenes appear in Scripture. Tap a picture to see it full size.</div>
  <div class="art-list">`+ART.map((a,i)=>`
    <figure class="art-card">
      <button class="art-img" data-i="${i}" aria-label="View ${esc(a.title)} full size">
        <img src="${artSrc(a)}" alt="${esc(a.alt)}" width="${a.w}" height="${a.h}" loading="lazy" decoding="async"></button>
      <figcaption>
        <div class="art-n">${i+1} of ${ART.length}</div>
        <h3>${esc(a.title)}</h3>
        <p>${esc(a.caption)}</p>
        ${a.ref?`<button class="typ-link art-read" data-r="${esc(a.ref)}">Read ${esc(a.ref)} →</button>`:""}
        ${a.also?`<button class="typ-link art-read" data-r="${esc(a.also)}">Fulfilled in ${esc(a.also)} →</button>`:""}
      </figcaption>
    </figure>`).join("")+`</div>`;
  v.querySelectorAll(".art-img").forEach(b=>b.onclick=()=>openLightbox(+b.dataset.i));
  v.querySelectorAll(".art-read").forEach(b=>b.onclick=()=>gotoVerse(b.dataset.r));
}
let lbIdx=0, lbReturn=null;
function openLightbox(i){
  lbReturn=document.activeElement;
  const lb=$("#lightbox");
  const paint=()=>{ const a=ART[lbIdx];
    lb.querySelector("img").src=artSrc(a); lb.querySelector("img").alt=a.alt;
    lb.querySelector(".lb-cap").textContent=a.title+(a.ref?" · "+a.ref:""); };
  lbIdx=i; paint();
  lb.classList.remove("hidden"); document.body.classList.add("sheet-open");
  lb.querySelector(".lb-prev").onclick=e=>{ e.stopPropagation(); lbIdx=(lbIdx-1+ART.length)%ART.length; paint(); };
  lb.querySelector(".lb-next").onclick=e=>{ e.stopPropagation(); lbIdx=(lbIdx+1)%ART.length; paint(); };
  lb.querySelector(".lb-close").onclick=closeLightbox;
  lb.onclick=e=>{ if(e.target===lb) closeLightbox(); };
  let x0=null;
  lb.ontouchstart=e=>{ x0=e.touches[0].clientX; };
  lb.ontouchend=e=>{ if(x0==null) return; const dx=e.changedTouches[0].clientX-x0; x0=null;
    if(Math.abs(dx)>50) lb.querySelector(dx<0?".lb-next":".lb-prev").click(); };
  lb.querySelector(".lb-close").focus({preventScroll:true});
  stopHeroRotation();
}
function closeLightbox(){
  const lb=$("#lightbox"); if(!lb||lb.classList.contains("hidden")) return;
  lb.classList.add("hidden"); document.body.classList.remove("sheet-open");
  if(lbReturn&&document.contains(lbReturn)) lbReturn.focus({preventScroll:true});
  if(state.view==="home") startHero(heroIdx);
}

/* ---------- READ ---------- */
function typesFor(book,ch,v){
  return TYPES.filter(s=>(s._nt&&verseInPassage(book,ch,v,s._nt))||(s._ot&&verseInPassage(book,ch,v,s._ot)));
}
// Verses (and any headings) of one chapter as HTML — shared by the scrolling reader and the book view.
function chapterVersesHTML(bookName,chNum){
  const book=BOOKS.find(b=>b.name===bookName); const heads=book.headings||{};
  let h="";
  book.chapters[chNum-1].forEach((t,i)=>{
    const ref=`${bookName} ${chNum}:${i+1}`;
    const hd=heads[`${chNum}:${i+1}`];
    if(hd) h+=`<div class="vhead">${esc(hd)}</div>`;
    if(!t){
      // Verse number kept for standard versification; the translation leaves it out.
      h+=`<div class="verse omitted"><span class="vn">${i+1}</span>Not in the ${esc(TRANSLATIONS[state.trans].name)} text — this verse is absent from the oldest manuscripts.</div>`;
      return;
    }
    if(!XLOADED[bookName]) ensureXrefs(bookName);
    const xc=(XREFS[ref]||[]).length;
    const tc=typesFor(bookName,chNum,i+1).length;
    const hl=HL[ref]?` hl-${HL[ref]}`:"";
    const nn=NOTES[ref]?" has-note":"";
    h+=`<div class="verse${hl}${nn}" data-ref="${esc(ref)}" role="button" tabindex="0"><span class="vn">${i+1}</span>${verseHTML(t)}${xc?`<span class="xcount">↔ ${xc}</span>`:""}${tc?`<span class="tcount">◈ type</span>`:""}</div>`;
  });
  return h;
}
function readerNavHTML(){
  const book=BOOKS.find(b=>b.name===state.book);
  const toggle=bookCapable()?`<button class="nav-btn book-toggle" id="bookToggle" aria-pressed="${isBookMode()}">${isBookMode()?"Scroll view":"Book view"}</button>`:"";
  return `<div class="reader-nav">
    <button class="nav-btn" id="prevCh" aria-label="Previous chapter">‹</button>
    <select id="bookSel" aria-label="Book">${BOOKS.map(b=>`<option ${b.name===state.book?"selected":""}>${esc(b.name)}</option>`).join("")}</select>
    <select id="chSel" aria-label="Chapter">${book.chapters.map((_,i)=>`<option value="${i+1}" ${i+1===state.ch?"selected":""}>Ch ${i+1}</option>`).join("")}</select>
    <button class="nav-btn" id="nextCh" aria-label="Next chapter">›</button>${toggle}</div>`;
}
function bindReaderNav(){
  $("#bookSel").onchange=e=>{ state.book=e.target.value; state.ch=1; savePos(); renderRead(); window.scrollTo(0,0); };
  $("#chSel").onchange=e=>{ state.ch=+e.target.value; savePos(); renderRead(); window.scrollTo(0,0); };
  $("#prevCh").onclick=()=>stepChapter(-1); $("#nextCh").onclick=()=>stepChapter(1);
  const bt=$("#bookToggle"); if(bt) bt.onclick=()=>{ store.set("bookMode",!isBookMode()); renderRead(); window.scrollTo(0,0); };
}
// Verse taps / Enter open the study sheet (delegated, so it also works inside book pages).
function bindVerseOpen(root){
  root.addEventListener("keydown",e=>{
    const el=e.target.closest&&e.target.closest(".verse[data-ref]");
    if(el&&(e.key==="Enter"||e.key===" ")){ e.preventDefault(); openSheet(el.dataset.ref,"xrefs"); }
  });
}
function renderRead(){
  const book=BOOKS.find(b=>b.name===state.book);
  if(!book.chapters[state.ch-1]) state.ch=1;
  const v=$("#view");
  ensureXrefs(state.book);
  if(isBookMode()){ document.documentElement.classList.add("book-on"); v.innerHTML=readerNavHTML()+`<div id="book"></div>`; bindReaderNav(); renderBook(); return; }
  document.documentElement.classList.remove("book-on");
  v.innerHTML=readerNavHTML()+`<div class="verses">${chapterVersesHTML(state.book,state.ch)}</div>`;
  const list=v.querySelector(".verses");
  list.onclick=e=>{ const el=e.target.closest(".verse[data-ref]"); if(el) openSheet(el.dataset.ref,"xrefs"); };
  bindVerseOpen(list);
  bindReaderNav();
}
function savePos(){ store.set("pos",{book:state.book,ch:state.ch}); }
function stepChapter(d){
  const bi=BOOKS.findIndex(b=>b.name===state.book);
  let nb=bi, nc=state.ch+d;
  if(nc<1){ if(bi>0){nb=bi-1; nc=BOOKS[nb].chapters.length;} else return; }
  if(nc>BOOKS[bi].chapters.length){ if(bi<BOOKS.length-1){nb=bi+1; nc=1;} else return; }
  state.book=BOOKS[nb].name; state.ch=nc; savePos(); renderRead(); window.scrollTo(0,0);
}
// Accepts a single verse ("John 3:16") or a passage ("John 2:1-11"); scrolls to it and briefly marks the range.
function gotoVerse(ref){
  const p=parsePassage(ref); if(!p||!BOOKS.some(b=>b.name===p.book)) return;
  state.book=p.book; state.ch=p.ch; savePos();
  if(isBookMode()){ bookReveal(p); return; }
  showView("read");
  requestAnimationFrame(()=>{
    const els=[...document.querySelectorAll(".verse[data-ref]")].filter(el=>{
      const r=parseRef(el.dataset.ref); return r&&verseInPassage(r.book,r.ch,r.v,p);
    });
    if(!els.length) return;
    if(els.length>1){
      // Put the first verse of the passage just below the sticky header + chapter bar.
      const cover=$("#topbar").offsetHeight+(document.querySelector(".reader-nav")?.offsetHeight||0)+8;
      window.scrollTo(0,els[0].getBoundingClientRect().top+window.scrollY-cover);
    } else els[0].scrollIntoView({block:"center"});
    els.forEach(el=>el.classList.add("flash"));
    setTimeout(()=>els.forEach(el=>el.classList.remove("flash")),1800);
  });
}

/* ---------- SHEET ---------- */
let sheetReturnFocus=null;
function bindSheet(){
  $("#sheetClose").onclick=closeSheet;
  $("#sheetScrim").onclick=closeSheet;
  document.addEventListener("keydown",e=>{
    const lbOpen=!$("#lightbox").classList.contains("hidden");
    if(e.key==="Escape"){ if(lbOpen) closeLightbox(); else if(state.sheetRef) closeSheet(); }
    else if(lbOpen&&(e.key==="ArrowRight"||e.key==="ArrowLeft")) $(e.key==="ArrowRight"?".lb-next":".lb-prev").click();
  });
  document.querySelectorAll("#sheetTabs button").forEach(b=>{
    b.onclick=()=>{ state.sheetTab=b.dataset.tab; paintSheet(); };
  });
}
function openSheet(ref,tab){
  sheetReturnFocus=document.activeElement;
  state.sheetRef=ref; state.sheetTab=tab||"xrefs";
  if(typeof lexState!=="undefined"){ lexState.ref=null; lexState.strong=null; }
  $("#sheetWrap").classList.remove("hidden");
  document.body.classList.add("sheet-open");
  paintSheet();
  $("#sheetClose").focus({preventScroll:true});
}
function closeSheet(){
  const wasOpen=!!state.sheetRef;
  $("#sheetWrap").classList.add("hidden"); state.sheetRef=null;
  document.body.classList.remove("sheet-open");
  if(wasOpen&&sheetReturnFocus&&document.contains(sheetReturnFocus)) sheetReturnFocus.focus({preventScroll:true});
}
function paintSheet(){
  const ref=state.sheetRef; if(!ref) return;
  $("#sheetRef").textContent=ref+" · "+TRANSLATIONS[state.trans].name;
  const pr=parseRef(ref);
  const ob=document.querySelector('#sheetTabs [data-tab="original"]');
  if(ob&&pr) ob.textContent=isOT(pr.book)?"Hebrew":"Greek";
  const tabs=$("#sheetTabs");
  tabs.querySelectorAll("button").forEach(b=>{
    const on=b.dataset.tab===state.sheetTab; b.classList.toggle("active",on); b.setAttribute("aria-selected",on);
    // keep the active tab visible when the row scrolls sideways on narrow phones
    if(on){ const l=b.offsetLeft-12, r=b.offsetLeft+b.offsetWidth+12;
      if(l<tabs.scrollLeft) tabs.scrollLeft=l; else if(r>tabs.scrollLeft+tabs.clientWidth) tabs.scrollLeft=r-tabs.clientWidth; }
  });
  const body=$("#sheetBody"); body.scrollTop=0;
  ({xrefs:paintXrefs,original:paintOriginal,parallels:paintParallels,typology:paintTypes,words:paintWords,mark:paintMark})[state.sheetTab](body,ref);
}
async function paintXrefs(body,ref){
  const p=parseRef(ref);
  if(p&&XLOADED[p.book]!==true){
    body.innerHTML='<div class="empty">Loading cross-references…</div>';
    await ensureXrefs(p.book);
    if(state.sheetRef!==ref||state.sheetTab!=="xrefs") return;
  }
  const R=vrefs();
  const list=(XREFS[ref]||[]).filter(e=>textOf(R[e[0]]));
  if(!list.length){ body.innerHTML='<div class="empty">No cross-references recorded for this verse.</div>'; return; }
  body.innerHTML=`<div class="lbl">${list.length} cross-reference${list.length===1?"":"s"} · ranked by relevance</div>`+list.map(e=>{
    const t=textOf(R[e[0]]); const prev=t.length>110?t.slice(0,110)+"…":t; const d=xrefLabel(e);
    return `<button class="xref-row" data-r="${esc(d)}"><span class="xr">${esc(d)}</span><span class="xv">${verseHTML(prev)}</span><span class="xvotes">relevance ${e[1]}</span></button>`;
  }).join("")+`<div class="orig-credit">Cross-references: OpenBible.info (CC BY), from the Treasury of Scripture Knowledge and reader votes.</div>`;
  body.querySelectorAll(".xref-row").forEach(b=>b.onclick=()=>gotoVerse(b.dataset.r));
}
function passageHTML(vs){
  return vs.map(x=>`<span class="vn">${x.ref.split(":")[1]}</span>${verseHTML(x.text)} `).join("");
}
function paintParallels(body,ref){
  const p=parseRef(ref); if(!p){body.innerHTML='<div class="empty">—</div>';return;}
  const sets=STUDY.parallels.filter(s=>s.verses.some(v=>{const pp=parsePassage(v);return pp&&verseInPassage(p.book,p.ch,p.v,pp);}));
  if(!sets.length){ body.innerHTML='<div class="empty">No parallel passages recorded for this verse. Parallel sets currently cover the Gospels material in John.</div>'; return; }
  body.innerHTML=sets.map(s=>`<div class="par-card"><h4>${esc(s.title)}</h4>`+s.verses.map(v=>{
    const pp=parsePassage(v);
    const cur=pp&&verseInPassage(p.book,p.ch,p.v,pp);
    return `<div class="par-pass${cur?" current":""}"><div class="pr">${esc(v)}</div><div class="pv">${passageHTML(passageVerses(pp))}</div></div>`;
  }).join("")+"</div>").join("");
}
function paintTypes(body,ref){
  const p=parseRef(ref); if(!p){body.innerHTML='<div class="empty">—</div>';return;}
  const sets=typesFor(p.book,p.ch,p.v);
  if(!sets.length){ body.innerHTML='<div class="empty">No type recorded for this verse yet. Types trace where Jesus relives Israel’s story — the set is growing.</div>'; return; }
  const side=(pp,label,cur)=>`<div class="par-pass${cur?" current":""}"><div class="pr">${esc(label)}</div><div class="pv">${passageHTML(passageVerses(pp))}</div></div>`;
  body.innerHTML=`<div class="lbl">${sets.length} type${sets.length===1?"":"s"} · the New Testament reading the Old</div>`+sets.map(s=>{
    const onNT=s._nt&&verseInPassage(p.book,p.ch,p.v,s._nt);
    return `<div class="par-card"><h4>${esc(s.title)}</h4>`
      +side(s._ot,"The shadow · "+s.ot,!onNT)
      +side(s._nt,"The fulfillment in Christ · "+s.nt,onNT)
      +`<div class="typ-note">${esc(s.note)}</div>`
      +`<button class="typ-link" data-r="${esc(s.link)}">The New Testament draws it here: ${esc(s.link)} →</button>`
      +(s.src?`<div class="typ-src">Sourced from ${esc(s.src)}</div>`:"")+`</div>`;
  }).join("");
  body.querySelectorAll(".typ-link").forEach(b=>b.onclick=()=>gotoVerse(b.dataset.r));
}
function paintWords(body,ref){
  const p=parseRef(ref);
  const words=tokenize(textOf(ref));
  body.innerHTML=`<div class="lbl">Tap a word to trace it</div>
    <div class="word-line">${words.map((w,i)=>`<button class="w" data-i="${i}">${esc(w)}</button>`).join(" ")}</div>
    <div class="scope-toggle"><button data-s="book" class="${state.wordScope==="book"?"active":""}">${esc(p.book)}</button><button data-s="bible" class="${state.wordScope==="bible"?"active":""}">Whole Bible</button></div>
    <div id="occList"></div>`;
  let current=null;
  body.querySelectorAll(".scope-toggle button").forEach(b=>b.onclick=()=>{
    state.wordScope=b.dataset.s;
    body.querySelectorAll(".scope-toggle button").forEach(x=>x.classList.toggle("active",x===b));
    if(current) showOccurrences(body,p.book,current);
  });
  body.querySelectorAll(".w").forEach(el=>el.onclick=()=>{
    current=words[+el.dataset.i];
    body.querySelectorAll(".w").forEach(x=>x.classList.toggle("on",x===el));
    showOccurrences(body,p.book,current);
  });
}
const OCC_CAP=200;
function showOccurrences(body,book,word){
  const nw=normWord(word); const list=body.querySelector("#occList");
  const scopeBooks=state.wordScope==="book"?BOOKS.filter(b=>b.name===book):BOOKS;
  const out=[]; let more=false;
  scan: for(const b of scopeBooks) for(let ci=0;ci<b.chapters.length;ci++) for(let vi=0;vi<b.chapters[ci].length;vi++){
    const t=b.chapters[ci][vi];
    if(t&&tokenize(t).some(w=>normWord(w)===nw)){
      if(out.length>=OCC_CAP){ more=true; break scan; }
      out.push({ref:`${b.name} ${ci+1}:${vi+1}`, text:t});
    }
  }
  list.innerHTML=`<div class="lbl">“${esc(word)}” — ${out.length}${more?"+":""} verse${out.length===1?"":"s"}${more?" (showing first "+OCC_CAP+")":""}</div>`+
    out.map(o=>`<button class="occ-row" data-r="${esc(o.ref)}"><span class="or">${esc(o.ref)}</span><span class="ov">${markWord(o.text,nw)}</span></button>`).join("");
  list.querySelectorAll(".occ-row").forEach(b=>b.onclick=()=>gotoVerse(b.dataset.r));
}
const HL_COLORS=[["y","#f5d90a","Yellow"],["g","#7bc47f","Green"],["b","#6aa9e8","Blue"],["p","#e88bb8","Pink"]];
function paintMark(body,ref){
  const cur=HL[ref]||null, note=NOTES[ref]||"";
  body.innerHTML=`<div class="lbl">Highlight</div><div class="hl-row" role="group" aria-label="Highlight colour">`+
    HL_COLORS.map(([k,c,n])=>`<button class="hl-dot${cur===k?" sel":""}" data-c="${k}" style="background:${c}" aria-label="${n}" aria-pressed="${cur===k}"></button>`).join("")+
    `</div><div class="lbl">Study note</div>
    <textarea id="noteArea" placeholder="What do you see in this verse?" aria-label="Study note">${esc(note)}</textarea>
    <button class="btn-primary" id="saveMark">Save</button>
    ${(cur||note)?'<button class="btn-ghost" id="clearMark">Clear highlight & note</button>':""}`;
  let sel=cur;
  body.querySelectorAll(".hl-dot").forEach(d=>d.onclick=()=>{
    sel=d.dataset.c===sel?null:d.dataset.c;
    body.querySelectorAll(".hl-dot").forEach(x=>{ const on=x.dataset.c===sel; x.classList.toggle("sel",on); x.setAttribute("aria-pressed",on); });
  });
  const refresh=()=>{ if(state.view==="read") refreshVerse(ref); paintMark(body,ref); };
  $("#saveMark").onclick=()=>{
    const nv=$("#noteArea").value.trim();
    if(sel) HL[ref]=sel; else delete HL[ref];
    if(nv) NOTES[ref]=nv; else delete NOTES[ref];
    store.set("hl",HL); store.set("notes",NOTES);
    toast("Saved"); refresh();
  };
  const cm=$("#clearMark");
  if(cm) cm.onclick=()=>{ delete HL[ref]; delete NOTES[ref]; store.set("hl",HL); store.set("notes",NOTES); toast("Cleared"); refresh(); };
}
// Update one verse's highlight/note styling in place (no full re-render, so the page doesn't jump).
function refreshVerse(ref){
  if(isBookMode()&&document.getElementById("book")){ bookRefreshChapter(); return; }
  document.querySelectorAll(`.verse[data-ref="${CSS.escape(ref)}"]`).forEach(el=>{
    HL_COLORS.forEach(([k])=>el.classList.toggle("hl-"+k,HL[ref]===k));
    el.classList.toggle("has-note",!!NOTES[ref]);
  });
}

/* ---------- SEARCH ---------- */
const SEARCH_CAP=300;
function renderSearch(){
  const v=$("#view");
  v.innerHTML=`<div class="search-bar"><input id="q" type="search" placeholder="Search the Bible…" enterkeyhint="search" aria-label="Search the Bible"><button class="nav-btn" id="go">Go</button></div><div id="results"></div>`;
  const run=()=>{
    const q=foldQuotes($("#q").value.trim().toLowerCase()).replace(/\s+/g," "); const box=$("#results");
    if(q.length<2){ box.innerHTML='<div class="empty" style="padding:14px 16px">Type at least 2 characters.</div>'; return; }
    const out=[]; let more=false;
    scan: for(const b of BOOKS) for(let ci=0;ci<b.chapters.length;ci++) for(let vi=0;vi<b.chapters[ci].length;vi++){
      const t=b.chapters[ci][vi]; if(!t) continue;
      const ix=foldQuotes(t.toLowerCase()).indexOf(q);
      if(ix>=0){
        if(out.length>=SEARCH_CAP){ more=true; break scan; }
        // Trim the snippet to whole words around the match.
        let a=Math.max(0,ix-45), z=Math.min(t.length,ix+q.length+45);
        if(a>0){ const s=t.indexOf(" ",a); if(s>=0&&s<ix) a=s+1; }
        if(z<t.length){ const s=t.lastIndexOf(" ",z); if(s>ix+q.length) z=s; }
        out.push({ref:`${b.name} ${ci+1}:${vi+1}`, sn:t.slice(a,z), pre:a>0, post:z<t.length});
      }
    }
    box.innerHTML=`<div class="lbl" style="padding:0 16px">${out.length}${more?"+":""} result${out.length===1?"":"s"}${more?" — showing the first "+SEARCH_CAP:""}</div><div class="sr-list">`+out.map(o=>
      `<button class="sr" data-r="${esc(o.ref)}"><span class="srr">${esc(o.ref)}</span><span class="srv">${o.pre?"…":""}${markPhrase(o.sn,q)}${o.post?"…":""}</span></button>`
    ).join("")+`</div>`;
    box.querySelectorAll(".sr").forEach(b=>b.onclick=()=>gotoVerse(b.dataset.r));
  };
  $("#go").onclick=run;
  $("#q").addEventListener("keydown",e=>{ if(e.key==="Enter") run(); });
}

/* ---------- CHRIST ---------- */
function renderChrist(){
  const v=$("#view");
  v.innerHTML=`<h2 class="section-title">Trace Christ through John</h2>
  <div class="section-sub">Curated study trails: every item jumps straight to the verse in the ${esc(TRANSLATIONS[state.trans].name)}.</div>
  <div id="traces">`+STUDY.traces.map(t=>`
    <div class="trace-card" data-id="${esc(t.id)}">
      <button class="trace-head" aria-expanded="false"><h3>${esc(t.title)}</h3><span class="cnt">${t.items.length} ▾</span></button>
      <div class="trace-intro">${esc(t.intro)}</div>
      <div class="trace-items">${t.items.map(it=>`
        <button class="trace-item" data-r="${esc(it.ref)}">
          <span class="tr">${esc(it.ref)}</span><div class="tl">${esc(it.label)}</div>
          ${it.note?`<div class="tn">${esc(it.note)}</div>`:""}
        </button>`).join("")}</div>
    </div>`).join("")+`</div>`;
  v.querySelectorAll(".trace-card").forEach(c=>{
    const head=c.querySelector(".trace-head");
    head.onclick=()=>{ const open=c.classList.toggle("open"); head.setAttribute("aria-expanded",open); };
  });
  v.querySelectorAll(".trace-item").forEach(b=>b.onclick=e=>{ e.stopPropagation(); gotoVerse(b.dataset.r); });
}

/* ---------- SAVED ---------- */
function renderSaved(){
  const v=$("#view");
  const order=k=>{ const p=parseRef(k)||{book:"",ch:0,v:0}; return [BOOKS.findIndex(x=>x.name===p.book),p.ch,p.v]; };
  const keys=[...new Set([...Object.keys(HL),...Object.keys(NOTES)])].sort((a,b)=>{
    const pa=order(a),pb=order(b); return pa[0]-pb[0]||pa[1]-pb[1]||pa[2]-pb[2];
  });
  v.innerHTML=`<h2 class="section-title">Saved</h2>
  <div class="section-sub">Your highlights and study notes live on this device — use Backup below to carry them to your other devices.</div>
  <div id="savedList">`+(keys.length?keys.map(k=>`
    <button class="saved-item${HL[k]?" hl-"+HL[k]:""}" data-r="${esc(k)}">
      <span class="sr2">${esc(k)}</span><div class="sv2">${verseHTML(textOf(k))}</div>
      ${NOTES[k]?`<div class="sn">“${esc(NOTES[k])}”</div>`:""}
    </button>`).join(""):'<div class="empty" style="padding:6px 16px">Nothing saved yet. Tap any verse while reading, then use the Mark tab to highlight it or add a note.</div>')+`</div>
  <div class="about"><b>Selah</b> prototype · Gospel of John study edition<br>
  Text: ${esc(TRANSLATIONS[state.trans].full)} — public domain.<br>
  Cross-references (whole Bible): OpenBible.info (CC BY), derived primarily from the Treasury of Scripture Knowledge.<br>
  Hebrew and Greek text, glosses and lexicons: STEPBible.org (Tyndale House, Cambridge), CC BY 4.0.<br>
  Parallel passages, Christology trails and signs curated for this edition.</div>`;
  v.querySelector("#savedList").insertAdjacentHTML("afterend",backupHTML()); bindBackup();
  v.querySelectorAll(".saved-item").forEach(b=>b.onclick=()=>gotoVerse(b.dataset.r));
}

function toast(msg){
  const t=$("#toast"); t.textContent=msg; t.classList.remove("hidden");
  clearTimeout(t._h); t._h=setTimeout(()=>t.classList.add("hidden"),1600);
}

document.addEventListener("DOMContentLoaded",boot);
