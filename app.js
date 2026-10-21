"use strict";
/* Selah — ASV Study Bible prototype */
let BIBLE=null, XREFS={}, STUDY=null;
const VINDEX={}; // "Book C:V" -> text
const BOOKS=[];  // {name, chapters}
const state={view:"read", book:"John", ch:1, sheetRef:null, sheetTab:"xrefs", wordScope:"john"};

const $=s=>document.querySelector(s);
const esc=s=>String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
const store={
  get(k,d){ try{const v=localStorage.getItem("selah_"+k); return v==null?d:JSON.parse(v);}catch(e){return d;} },
  set(k,v){ try{localStorage.setItem("selah_"+k, JSON.stringify(v));}catch(e){} }
};
let HL=store.get("hl",{}), NOTES=store.get("notes",{});

/* ---------- reference parsing ---------- */
function parseRef(s){
  // "John 3:16" (book names may contain spaces / digits)
  const m=s.match(/^(.+?)\s+(\d+):(\d+)$/);
  if(!m) return null;
  return {book:m[1], ch:+m[2], v:+m[3]};
}
function parsePassage(s){
  // "John 6:1-14", "John 3:16", or cross-chapter "John 18:28-19:16"
  const m=s.match(/^(.+?)\s+(\d+):(\d+)(?:-(\d+)(?::(\d+))?)?$/);
  if(!m) return null;
  const ch2=m[5]?+m[4]:+m[2];
  const v2=m[5]?+m[5]:(m[4]?+m[4]:+m[3]);
  return {book:m[1], ch:+m[2], v1:+m[3], ch2, v2};
}
function passageVerses(p){
  const b=BOOKS.find(b=>b.name===p.book); if(!b) return [];
  const out=[];
  for(let c=p.ch;c<=p.ch2;c++){
    const ch=b.chapters[c-1]; if(!ch) continue;
    const from=(c===p.ch)?p.v1:1, to=(c===p.ch2)?p.v2:ch.length;
    for(let v=from;v<=to&&v<=ch.length;v++) out.push({ref:`${p.book} ${c}:${v}`, text:ch[v-1]});
  }
  return out;
}
function verseInPassage(book,ch,v,p){
  return p.book===book &&
    (ch>p.ch||(ch===p.ch&&v>=p.v1)) &&
    (ch<p.ch2||(ch===p.ch2&&v<=p.v2));
}
function textOf(ref){ return VINDEX[ref]||""; }

/* ---------- boot ---------- */
async function boot(){
  applyTheme(store.get("theme","light"));
  $("#view").innerHTML='<div class="loading">Loading the Scriptures…</div>';
  const [b,x,s]=await Promise.all([
    fetch("data/bible.json").then(r=>r.json()),
    fetch("data/xrefs_john.json").then(r=>r.json()),
    fetch("data/study_john.json").then(r=>r.json())
  ]);
  BIBLE=b; XREFS=x; STUDY=s;
  b.books.forEach(bk=>{ BOOKS.push(bk);
    bk.chapters.forEach((ch,ci)=>ch.forEach((t,vi)=>{ VINDEX[`${bk.name} ${ci+1}:${vi+1}`]=t; }));
  });
  const pos=store.get("pos",null);
  if(pos&&BOOKS.some(b=>b.name===pos.book)){ state.book=pos.book; state.ch=pos.ch; }
  bindTabs(); bindTheme(); bindSheet();
  showView("read");
}
function applyTheme(t){ document.documentElement.setAttribute("data-theme",t); store.set("theme",t); }
function bindTheme(){ $("#themeBtn").onclick=()=>applyTheme(document.documentElement.getAttribute("data-theme")==="dark"?"light":"dark"); }
function bindTabs(){
  document.querySelectorAll("#tabbar button").forEach(b=>{
    b.onclick=()=>showView(b.dataset.view);
  });
}
function showView(v){
  state.view=v;
  document.querySelectorAll("#tabbar button").forEach(b=>b.classList.toggle("active",b.dataset.view===v));
  closeSheet();
  ({read:renderRead,search:renderSearch,christ:renderChrist,saved:renderSaved})[v]();
  window.scrollTo(0,0);
}

/* ---------- READ ---------- */
function renderRead(){
  const book=BOOKS.find(b=>b.name===state.book);
  const v=$("#view");
  let h=`<div class="reader-nav">
    <button class="nav-btn" id="prevCh">‹</button>
    <select id="bookSel">${BOOKS.map(b=>`<option ${b.name===state.book?"selected":""}>${esc(b.name)}</option>`).join("")}</select>
    <select id="chSel">${book.chapters.map((_,i)=>`<option value="${i+1}" ${i+1===state.ch?"selected":""}>Ch ${i+1}</option>`).join("")}</select>
    <button class="nav-btn" id="nextCh">›</button></div><div class="verses">`;
  book.chapters[state.ch-1].forEach((t,i)=>{
    const ref=`${state.book} ${state.ch}:${i+1}`;
    const xc=(XREFS[ref]||[]).length;
    const hl=HL[ref]?` hl-${HL[ref]}`:"";
    const nn=NOTES[ref]?" has-note":"";
    h+=`<div class="verse${hl}${nn}" data-ref="${esc(ref)}"><span class="vn">${i+1}</span>${esc(t)}${xc?`<span class="xcount">↔ ${xc}</span>`:""}</div>`;
  });
  v.innerHTML=h+"</div>";
  v.querySelectorAll(".verse").forEach(el=>{ el.onclick=()=>openSheet(el.dataset.ref,"xrefs"); });
  $("#bookSel").onchange=e=>{ state.book=e.target.value; state.ch=1; savePos(); renderRead(); };
  $("#chSel").onchange=e=>{ state.ch=+e.target.value; savePos(); renderRead(); };
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
function gotoVerse(ref){
  const p=parseRef(ref); if(!p) return;
  state.book=p.book; state.ch=p.ch; savePos(); showView("read");
  requestAnimationFrame(()=>{
    const el=document.querySelector(`.verse[data-ref="${CSS.escape(ref)}"]`);
    if(el) el.scrollIntoView({block:"center"});
  });
}

/* ---------- SHEET ---------- */
function bindSheet(){
  $("#sheetClose").onclick=closeSheet;
  $("#sheetScrim").onclick=closeSheet;
  document.querySelectorAll("#sheetTabs button").forEach(b=>{
    b.onclick=()=>{ state.sheetTab=b.dataset.tab; paintSheet(); };
  });
}
function openSheet(ref,tab){
  state.sheetRef=ref; state.sheetTab=tab||"xrefs";
  $("#sheetWrap").classList.remove("hidden");
  paintSheet();
}
function closeSheet(){ $("#sheetWrap").classList.add("hidden"); state.sheetRef=null; }
function paintSheet(){
  const ref=state.sheetRef; if(!ref) return;
  $("#sheetRef").textContent=ref+" · ASV";
  document.querySelectorAll("#sheetTabs button").forEach(b=>b.classList.toggle("active",b.dataset.tab===state.sheetTab));
  const body=$("#sheetBody");
  ({xrefs:paintXrefs,parallels:paintParallels,words:paintWords,mark:paintMark})[state.sheetTab](body,ref);
}
function paintXrefs(body,ref){
  const list=XREFS[ref]||[];
  if(!list.length){ body.innerHTML='<div class="empty">No cross-references recorded for this verse yet. The curated cross-reference set covers the Gospel of John; the rest of the canon is coming.</div>'; return; }
  body.innerHTML=`<div class="lbl">${list.length} cross-references · ranked by relevance</div>`+list.map(e=>{
    const t=textOf(e.r); const prev=t.length>110?t.slice(0,110)+"…":t;
    return `<button class="xref-row" data-r="${esc(e.r)}"><span class="xr">${esc(e.d)}</span><span class="xv">${esc(prev)}</span><span class="xvotes">relevance ${e.v}</span></button>`;
  }).join("");
  body.querySelectorAll(".xref-row").forEach(b=>b.onclick=()=>gotoVerse(b.dataset.r));
}
function paintParallels(body,ref){
  const p=parseRef(ref); if(!p){body.innerHTML='<div class="empty">—</div>';return;}
  const sets=STUDY.parallels.filter(s=>s.verses.some(v=>{const pp=parsePassage(v);return pp&&verseInPassage(p.book,p.ch,p.v,pp);}));
  if(!sets.length){ body.innerHTML='<div class="empty">No parallel passages recorded for this verse. Parallel sets currently cover the Gospels material in John.</div>'; return; }
  body.innerHTML=sets.map(s=>`<div class="par-card"><h4>${esc(s.title)}</h4>`+s.verses.map(v=>{
    const pp=parsePassage(v); const vs=passageVerses(pp);
    const cur=pp&&verseInPassage(p.book,p.ch,p.v,pp);
    return `<div class="par-pass${cur?" current":""}"><div class="pr">${esc(v)}</div><div class="pv">${
      vs.map(x=>`<span class="vn">${x.ref.split(":")[1]}</span>${esc(x.text)} `).join("")
    }</div></div>`;
  }).join("")+"</div>").join("");
}
function tokenize(t){ const out=[]; const re=/[A-Za-z']+/g; let m; while((m=re.exec(t))) out.push(m[0]); return out; }
function paintWords(body,ref){
  const t=textOf(ref);
  const words=tokenize(t);
  body.innerHTML=`<div class="lbl">Tap a word to trace it</div>
    <div class="word-line">${words.map((w,i)=>`<span class="w" data-i="${i}">${esc(w)}</span>`).join(" ")}</div>
    <div class="scope-toggle"><button data-s="john" class="${state.wordScope==="john"?"active":""}">Gospel of John</button><button data-s="bible" class="${state.wordScope==="bible"?"active":""}">Whole Bible</button></div>
    <div id="occList"></div>`;
  body.querySelectorAll(".scope-toggle button").forEach(b=>b.onclick=()=>{state.wordScope=b.dataset.s; paintWords(body,ref);});
  body.querySelectorAll(".w").forEach(el=>el.onclick=()=>showOccurrences(body,ref,words[+el.dataset.i]));
}
function normWord(w){ return w.toLowerCase().replace(/^'+|'+$/g,""); }
function showOccurrences(body,ref,word){
  const nw=normWord(word); const list=body.querySelector("#occList");
  const scopeBooks=state.wordScope==="john"?BOOKS.filter(b=>b.name==="John"):BOOKS;
  const out=[];
  for(const b of scopeBooks) for(let ci=0;ci<b.chapters.length;ci++) for(let vi=0;vi<b.chapters[ci].length;vi++){
    const t=b.chapters[ci][vi];
    if(tokenize(t).some(w=>normWord(w)===nw)){
      out.push({ref:`${b.name} ${ci+1}:${vi+1}`, text:t});
      if(out.length>=200) break;
    }
    if(out.length>=200) break;
  }
  const hi=t=>esc(t).replace(new RegExp(`(${nw.replace(/[.*+?^${}()|[\]\\]/g,"\\$&")})`,"gi"),"<mark>$1</mark>");
  list.innerHTML=`<div class="lbl">“${esc(word)}” — ${out.length}${out.length>=200?"+":""} occurrence${out.length===1?"":"s"}</div>`+
    out.map(o=>`<button class="occ-row" data-r="${esc(o.ref)}"><span class="or">${esc(o.ref)}</span><span class="ov">${hi(o.text)}</span></button>`).join("");
  list.querySelectorAll(".occ-row").forEach(b=>b.onclick=()=>gotoVerse(b.dataset.r));
}
const HL_COLORS=[["y","#f5d90a"],["g","#7bc47f"],["b","#6aa9e8"],["p","#e88bb8"]];
function paintMark(body,ref){
  const cur=HL[ref]||null, note=NOTES[ref]||"";
  body.innerHTML=`<div class="lbl">Highlight</div><div class="hl-row">`+
    HL_COLORS.map(([k,c])=>`<div class="hl-dot${cur===k?" sel":""}" data-c="${k}" style="background:${c}"></div>`).join("")+
    `</div><div class="lbl">Study note</div>
    <textarea id="noteArea" placeholder="What do you see in this verse?">${esc(note)}</textarea>
    <button class="btn-primary" id="saveMark">Save</button>
    ${(cur||note)?'<button class="btn-ghost" id="clearMark">Clear highlight & note</button>':""}`;
  let sel=cur;
  body.querySelectorAll(".hl-dot").forEach(d=>d.onclick=()=>{
    sel=d.dataset.c===sel?null:d.dataset.c;
    body.querySelectorAll(".hl-dot").forEach(x=>x.classList.toggle("sel",x.dataset.c===sel));
  });
  $("#saveMark").onclick=()=>{
    const nv=$("#noteArea").value.trim();
    if(sel) HL[ref]=sel; else delete HL[ref];
    if(nv) NOTES[ref]=nv; else delete NOTES[ref];
    store.set("hl",HL); store.set("notes",NOTES);
    toast("Saved"); renderRead(); paintMark(body,ref);
  };
  const cm=$("#clearMark");
  if(cm) cm.onclick=()=>{ delete HL[ref]; delete NOTES[ref]; store.set("hl",HL); store.set("notes",NOTES); toast("Cleared"); renderRead(); paintMark(body,ref); };
}

/* ---------- SEARCH ---------- */
function renderSearch(){
  const v=$("#view");
  v.innerHTML=`<div class="search-bar"><input id="q" placeholder="Search the Bible…" enterkeyhint="search"><button class="nav-btn" id="go">Go</button></div><div id="results"></div>`;
  const run=()=>{
    const q=$("#q").value.trim().toLowerCase(); const box=$("#results");
    if(q.length<2){ box.innerHTML='<div class="empty" style="padding:14px 16px">Type at least 2 characters.</div>'; return; }
    const out=[];
    for(const b of BOOKS) for(let ci=0;ci<b.chapters.length;ci++) for(let vi=0;vi<b.chapters[ci].length;vi++){
      const t=b.chapters[ci][vi];
      const ix=t.toLowerCase().indexOf(q);
      if(ix>=0){
        const a=Math.max(0,ix-45), z=Math.min(t.length,ix+q.length+45);
        out.push({ref:`${b.name} ${ci+1}:${vi+1}`, sn:"…"+t.slice(a,z)+"…", q});
        if(out.length>=300) break;
      }
      if(out.length>=300) break;
    }
    box.innerHTML=`<div class="lbl" style="padding:0 16px">${out.length}${out.length>=300?"+":""} results</div>`+out.map(o=>{
      const sn=esc(o.sn).replace(new RegExp(`(${q.replace(/[.*+?^${}()|[\]\\]/g,"\\$&")})`,"gi"),"<mark>$1</mark>");
      return `<button class="sr" data-r="${esc(o.ref)}"><span class="srr">${esc(o.ref)}</span><span class="srv">${sn}</span></button>`;
    }).join("");
    box.querySelectorAll(".sr").forEach(b=>b.onclick=()=>gotoVerse(b.dataset.r));
  };
  $("#go").onclick=run;
  $("#q").addEventListener("keydown",e=>{ if(e.key==="Enter") run(); });
}

/* ---------- CHRIST ---------- */
function renderChrist(){
  const v=$("#view");
  v.innerHTML=`<h2 class="section-title">Trace Christ through John</h2>
  <div class="section-sub">Curated study trails: every item jumps straight to the verse in the American Standard Version.</div>
  <div id="traces">`+STUDY.traces.map(t=>`
    <div class="trace-card" data-id="${t.id}">
      <div class="trace-head"><h3>${esc(t.title)}</h3><span class="cnt">${t.items.length} ▾</span></div>
      <div class="trace-intro">${esc(t.intro)}</div>
      <div class="trace-items">${t.items.map(it=>`
        <button class="trace-item" data-r="${esc(it.ref)}">
          <span class="tr">${esc(it.ref)}</span><div class="tl">${esc(it.label)}</div>
          ${it.note?`<div class="tn">${esc(it.note)}</div>`:""}
        </button>`).join("")}</div>
    </div>`).join("")+`</div>`;
  v.querySelectorAll(".trace-card").forEach(c=>{
    c.querySelector(".trace-head").onclick=()=>c.classList.toggle("open");
  });
  v.querySelectorAll(".trace-item").forEach(b=>b.onclick=e=>{ e.stopPropagation(); gotoVerse(b.dataset.r); });
}

/* ---------- SAVED ---------- */
function renderSaved(){
  const v=$("#view");
  const keys=[...new Set([...Object.keys(HL),...Object.keys(NOTES)])].sort((a,b)=>{
    const pa=parseRef(a),pb=parseRef(b);
    const ia=BOOKS.findIndex(x=>x.name===pa.book), ib=BOOKS.findIndex(x=>x.name===pb.book);
    return ia-ib||pa.ch-pb.ch||pa.v-pb.v;
  });
  v.innerHTML=`<h2 class="section-title">Saved</h2>
  <div class="section-sub">Your highlights and study notes live on this device.</div>
  <div id="savedList">`+(keys.length?keys.map(k=>`
    <button class="saved-item" data-r="${esc(k)}">
      <span class="sr2">${esc(k)}</span><div class="sv2">${esc(textOf(k))}</div>
      ${NOTES[k]?`<div class="sn">“${esc(NOTES[k])}”</div>`:""}
    </button>`).join(""):'<div class="empty" style="padding:6px 16px">Nothing saved yet. Tap any verse while reading, then use the Mark tab to highlight it or add a note.</div>')+`</div>
  <div class="about"><b>Selah</b> prototype · Gospel of John study edition<br>
  Text: American Standard Version (1901) — public domain.<br>
  Cross-references: OpenBible.info (CC-BY), derived primarily from the Treasury of Scripture Knowledge.<br>
  Parallel passages, Christology trails and signs curated for this edition.</div>`;
  v.querySelectorAll(".saved-item").forEach(b=>b.onclick=()=>gotoVerse(b.dataset.r));
}

function toast(msg){
  const t=$("#toast"); t.textContent=msg; t.classList.remove("hidden");
  clearTimeout(t._h); t._h=setTimeout(()=>t.classList.add("hidden"),1600);
}

document.addEventListener("DOMContentLoaded",boot);
