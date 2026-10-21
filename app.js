"use strict";
/* Selah — ASV Study Bible prototype */
const DATA_V="2"; // bump when data/*.json changes so phones drop cached copies
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
    const [x,s,m]=await Promise.all([
      getJSON("data/xrefs_john.json"), getJSON("data/study_john.json"), getJSON("data/typology.json"),
      loadTranslation(want)
    ]);
    XREFS=x; STUDY=s; TYPES=(m.types||[]).map(t=>({...t, _nt:parsePassage(t.nt), _ot:parsePassage(t.ot)}));
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
function applyFontSize(px){ document.documentElement.style.setProperty("--fs-verse",px+"px"); store.set("fs",px); }
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
  closeSheet();
  ({home:renderHome,read:renderRead,search:renderSearch,christ:renderChrist,saved:renderSaved})[v]();
  window.scrollTo(0,0);
}

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
  v.innerHTML=`<div class="home-hero">
      <img src="img/hero.jpg?v=${DATA_V}" alt="An old prophet in ink, poring over scrolls, with the temple sketched behind him" width="900" height="1125" decoding="async">
      <div class="home-brand"><div class="home-name">Selah</div><div class="home-tag">Pause and reflect.</div></div>
    </div>`
  +(pos&&BOOKS.some(b=>b.name===pos.book)?`<button class="home-continue" id="hcCont"><span>Continue reading</span><b>${esc(pos.book)} ${pos.ch} →</b></button>`:"")
  +`<button class="home-votd" id="hcVotd"><div class="hlab">Verse of the day</div><div class="votd-ref">${esc(votd)}</div><div class="votd-text">${verseHTML(textOf(votd))}</div></button>`
  +(typ&&typFirst?`<button class="home-typ" id="hcTyp"><div class="hlab">Typology of the day</div><div class="ty-t">${esc(typ.title)}</div><div class="ty-s">${esc(typ.nt)} &nbsp;↔&nbsp; ${esc(typ.ot)}</div></button>`:"")
  +`<div class="home-grid">
    <button class="home-card" data-go="read"><div class="hc-t">Read</div><div class="hc-s">The Bible · ${esc(TRANSLATIONS[state.trans].short)}</div></button>
    <button class="home-card" data-go="search"><div class="hc-t">Search</div><div class="hc-s">Any word or phrase</div></button>
    <button class="home-card" data-go="christ"><div class="hc-t">Trace Christ</div><div class="hc-s">Study trails in John</div></button>
    <button class="home-card" data-go="saved"><div class="hc-t">Saved</div><div class="hc-s">${hlN} highlight${hlN===1?"":"s"} · ${noteN} note${noteN===1?"":"s"}</div></button>
  </div>
  <div class="home-foot">Selah · ${esc(TRANSLATIONS[state.trans].full)}, public domain</div>`;
  const go=g=>showView(g);
  v.querySelectorAll(".home-card").forEach(b=>b.onclick=()=>go(b.dataset.go));
  const hc=v.querySelector("#hcCont"); if(hc) hc.onclick=()=>go("read");
  v.querySelector("#hcVotd").onclick=()=>gotoVerse(votd);
  const ht=v.querySelector("#hcTyp"); if(ht) ht.onclick=()=>{ gotoVerse(typFirst); setTimeout(()=>openSheet(typFirst,"typology"),80); };
}

/* ---------- READ ---------- */
function typesFor(book,ch,v){
  return TYPES.filter(s=>(s._nt&&verseInPassage(book,ch,v,s._nt))||(s._ot&&verseInPassage(book,ch,v,s._ot)));
}
function renderRead(){
  const book=BOOKS.find(b=>b.name===state.book);
  if(!book.chapters[state.ch-1]) state.ch=1;
  const v=$("#view");
  const heads=book.headings||{};
  let h=`<div class="reader-nav">
    <button class="nav-btn" id="prevCh" aria-label="Previous chapter">‹</button>
    <select id="bookSel" aria-label="Book">${BOOKS.map(b=>`<option ${b.name===state.book?"selected":""}>${esc(b.name)}</option>`).join("")}</select>
    <select id="chSel" aria-label="Chapter">${book.chapters.map((_,i)=>`<option value="${i+1}" ${i+1===state.ch?"selected":""}>Ch ${i+1}</option>`).join("")}</select>
    <button class="nav-btn" id="nextCh" aria-label="Next chapter">›</button></div><div class="verses">`;
  book.chapters[state.ch-1].forEach((t,i)=>{
    const ref=`${state.book} ${state.ch}:${i+1}`;
    const hd=heads[`${state.ch}:${i+1}`];
    if(hd) h+=`<div class="vhead">${esc(hd)}</div>`;
    if(!t){
      // Verse number kept for standard versification; the translation leaves it out.
      h+=`<div class="verse omitted"><span class="vn">${i+1}</span>Not in the ${esc(TRANSLATIONS[state.trans].name)} text — this verse is absent from the oldest manuscripts.</div>`;
      return;
    }
    const xc=(XREFS[ref]||[]).length;
    const tc=typesFor(state.book,state.ch,i+1).length;
    const hl=HL[ref]?` hl-${HL[ref]}`:"";
    const nn=NOTES[ref]?" has-note":"";
    h+=`<div class="verse${hl}${nn}" data-ref="${esc(ref)}" role="button" tabindex="0"><span class="vn">${i+1}</span>${verseHTML(t)}${xc?`<span class="xcount">↔ ${xc}</span>`:""}${tc?`<span class="tcount">◈ type</span>`:""}</div>`;
  });
  v.innerHTML=h+"</div>";
  v.querySelectorAll(".verse[data-ref]").forEach(el=>{
    el.onclick=()=>openSheet(el.dataset.ref,"xrefs");
    el.onkeydown=e=>{ if(e.key==="Enter"||e.key===" "){ e.preventDefault(); openSheet(el.dataset.ref,"xrefs"); } };
  });
  $("#bookSel").onchange=e=>{ state.book=e.target.value; state.ch=1; savePos(); renderRead(); window.scrollTo(0,0); };
  $("#chSel").onchange=e=>{ state.ch=+e.target.value; savePos(); renderRead(); window.scrollTo(0,0); };
  $("#prevCh").onclick=()=>stepChapter(-1); $("#nextCh").onclick=()=>stepChapter(1);
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
  state.book=p.book; state.ch=p.ch; savePos(); showView("read");
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
  document.addEventListener("keydown",e=>{ if(e.key==="Escape"&&state.sheetRef) closeSheet(); });
  document.querySelectorAll("#sheetTabs button").forEach(b=>{
    b.onclick=()=>{ state.sheetTab=b.dataset.tab; paintSheet(); };
  });
}
function openSheet(ref,tab){
  sheetReturnFocus=document.activeElement;
  state.sheetRef=ref; state.sheetTab=tab||"xrefs";
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
  document.querySelectorAll("#sheetTabs button").forEach(b=>{
    const on=b.dataset.tab===state.sheetTab; b.classList.toggle("active",on); b.setAttribute("aria-selected",on);
  });
  const body=$("#sheetBody"); body.scrollTop=0;
  ({xrefs:paintXrefs,parallels:paintParallels,typology:paintTypes,words:paintWords,mark:paintMark})[state.sheetTab](body,ref);
}
function paintXrefs(body,ref){
  const list=(XREFS[ref]||[]).filter(e=>textOf(e.r));
  if(!list.length){ body.innerHTML='<div class="empty">No cross-references recorded for this verse yet. The curated cross-reference set covers the Gospel of John; the rest of the canon is coming.</div>'; return; }
  body.innerHTML=`<div class="lbl">${list.length} cross-references · ranked by relevance</div>`+list.map(e=>{
    const t=textOf(e.r); const prev=t.length>110?t.slice(0,110)+"…":t;
    return `<button class="xref-row" data-r="${esc(e.r)}"><span class="xr">${esc(e.d)}</span><span class="xv">${verseHTML(prev)}</span><span class="xvotes">relevance ${e.v}</span></button>`;
  }).join("");
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
  const el=document.querySelector(`.verse[data-ref="${CSS.escape(ref)}"]`); if(!el) return;
  HL_COLORS.forEach(([k])=>el.classList.toggle("hl-"+k,HL[ref]===k));
  el.classList.toggle("has-note",!!NOTES[ref]);
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
    box.innerHTML=`<div class="lbl" style="padding:0 16px">${out.length}${more?"+":""} result${out.length===1?"":"s"}${more?" — showing the first "+SEARCH_CAP:""}</div>`+out.map(o=>
      `<button class="sr" data-r="${esc(o.ref)}"><span class="srr">${esc(o.ref)}</span><span class="srv">${o.pre?"…":""}${markPhrase(o.sn,q)}${o.post?"…":""}</span></button>`
    ).join("");
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
  <div class="section-sub">Your highlights and study notes live on this device.</div>
  <div id="savedList">`+(keys.length?keys.map(k=>`
    <button class="saved-item${HL[k]?" hl-"+HL[k]:""}" data-r="${esc(k)}">
      <span class="sr2">${esc(k)}</span><div class="sv2">${verseHTML(textOf(k))}</div>
      ${NOTES[k]?`<div class="sn">“${esc(NOTES[k])}”</div>`:""}
    </button>`).join(""):'<div class="empty" style="padding:6px 16px">Nothing saved yet. Tap any verse while reading, then use the Mark tab to highlight it or add a note.</div>')+`</div>
  <div class="about"><b>Selah</b> prototype · Gospel of John study edition<br>
  Text: ${esc(TRANSLATIONS[state.trans].full)} — public domain.<br>
  Cross-references: OpenBible.info (CC-BY), derived primarily from the Treasury of Scripture Knowledge.<br>
  Parallel passages, Christology trails and signs curated for this edition.</div>`;
  v.querySelectorAll(".saved-item").forEach(b=>b.onclick=()=>gotoVerse(b.dataset.r));
}

function toast(msg){
  const t=$("#toast"); t.textContent=msg; t.classList.remove("hidden");
  clearTimeout(t._h); t._h=setTimeout(()=>t.classList.add("hidden"),1600);
}

document.addEventListener("DOMContentLoaded",boot);
