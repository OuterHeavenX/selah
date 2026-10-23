"use strict";
/* Selah — ASV Study Bible prototype */
const DATA_V="20"; // bump when data/ or img/art/ changes (and DATA_V in sw.js) so devices drop cached copies
let XREFS={}, STUDY=null, TYPES=[];
const TRANSLATIONS={
  asv:{name:"ASV", full:"American Standard Version (1901)", short:"ASV 1901", group:"Classic", scope:"bible", license:"Public domain", about:"Selah’s default: a careful revision of the KJV, using the older manuscripts and “Jehovah” for God’s name.", file:"data/bible.json"},
  kjv:{name:"KJV", full:"King James Version (1769)", short:"KJV", group:"Classic", scope:"bible", license:"Public domain", about:"The Authorized Version in its standard 1769 Oxford text.", file:"data/kjv.json"},
  bsb:{name:"BSB", full:"Berean Standard Bible (2022)", short:"BSB", group:"Modern", scope:"bible", license:"Public domain", about:"Accurate, readable modern English; placed in the public domain in 2023.", file:"data/tr/bsb.json"},
  web:{name:"WEB", full:"World English Bible", short:"WEB", group:"Modern", scope:"bible", license:"Public domain", about:"A modern update of the ASV that uses “Yahweh” for God’s name.", file:"data/web.json"},
  webbe:{name:"WEB UK", full:"World English Bible, British Edition", short:"WEB UK", group:"Modern", scope:"bible", license:"Public domain", about:"The WEB with British spelling and “the LORD” for God’s name.", file:"data/tr/webbe.json"},
  wmb:{name:"WMB", full:"World Messianic Bible", short:"WMB", group:"Modern", scope:"bible", license:"Public domain", about:"The WEB with Hebrew names: Yeshua, Kefa, Yochanan.", file:"data/tr/wmb.json"},
  nheb:{name:"NHEB", full:"New Heart English Bible", short:"NHEB", group:"Modern", scope:"bible", license:"Public domain", about:"A modern revision of the WEB, kept in the public domain.", file:"data/tr/nheb.json"},
  fbv:{name:"FBV", full:"Free Bible Version (2018)", short:"FBV", group:"Modern", scope:"bible", license:"CC BY-SA 4.0 · Dr. Jonathan Gallagher", about:"Plain, everyday English that reads naturally aloud.", file:"data/tr/fbv.json"},
  bbe:{name:"BBE", full:"Bible in Basic English (1949/1964)", short:"BBE", group:"Modern", scope:"bible", license:"Public domain", about:"Written with a vocabulary of about 1,000 words — very easy to read.", file:"data/tr/bbe.json"},
  acv:{name:"ACV", full:"A Conservative Version (2005)", short:"ACV", group:"Modern", scope:"bible", license:"Public domain", about:"A literal update of the KJV’s language.", file:"data/tr/acv.json"},
  oeb:{name:"OEB", full:"Open English Bible", short:"OEB", group:"Modern", scope:"partial", license:"Public domain", about:"A fresh modern translation still in progress: the New Testament, the Psalms and several shorter Old Testament books.", file:"data/tr/oeb.json"},
  lsv:{name:"LSV", full:"Literal Standard Version (2020)", short:"LSV", group:"Literal", scope:"bible", license:"CC BY-SA 4.0 · Covenant Press", about:"Word-for-word modern English, based on Young’s Literal Translation.", file:"data/tr/lsv.json"},
  ylt:{name:"YLT", full:"Young’s Literal Translation (1898)", short:"YLT", group:"Literal", scope:"bible", license:"Public domain", about:"Extremely literal, keeping Hebrew and Greek tenses and word order.", file:"data/tr/ylt.json"},
  darby:{name:"Darby", full:"Darby Translation (1890)", short:"Darby", group:"Literal", scope:"bible", license:"Public domain", about:"J. N. Darby’s careful, literal translation.", file:"data/tr/darby.json"},
  rotherham:{name:"Rotherham", full:"Rotherham’s Emphasized Bible (1902)", short:"Rotherham", group:"Literal", scope:"bible", license:"Public domain", about:"Marks emphasis from the original word order; uses “Yahweh”.", file:"data/tr/rotherham.json"},
  rv:{name:"RV", full:"Revised Version (1885)", short:"RV", group:"Classic", scope:"bible", license:"Public domain", about:"The British revision of the KJV, the forerunner of the ASV.", file:"data/tr/rv.json"},
  webster:{name:"Webster", full:"Webster Bible (1833)", short:"Webster", group:"Classic", scope:"bible", license:"Public domain", about:"Noah Webster’s light update of the KJV’s wording.", file:"data/tr/webster.json"},
  geneva:{name:"Geneva", full:"Geneva Bible (1599)", short:"Geneva", group:"Classic", scope:"bible", license:"Public domain", about:"The Bible of Shakespeare and the Pilgrims, in its original spelling.", file:"data/tr/geneva.json"},
  tyndale:{name:"Tyndale", full:"Tyndale Bible (1530/1534)", short:"Tyndale", group:"Classic", scope:"partial", license:"Public domain", about:"William Tyndale’s Genesis and New Testament — the first English Bible translated from Hebrew and Greek, in its original spelling.", file:"data/tr/tyndale.json"},
  wycliffe:{name:"Wycliffe", full:"Wycliffe Bible (c. 1395)", short:"Wycliffe", group:"Classic", scope:"bible", license:"Public domain", about:"The first complete English Bible, in Middle English — a window into the 1300s.", file:"data/tr/wycliffe.json"},
  dra:{name:"Douay-Rheims", full:"Douay-Rheims Bible (Challoner)", short:"Douay-Rheims", group:"Catholic", scope:"bible", license:"Public domain", about:"The classic Catholic English Bible, translated from the Latin Vulgate.", file:"data/tr/dra.json"},
  cpdv:{name:"CPDV", full:"Catholic Public Domain Version (2009)", short:"CPDV", group:"Catholic", scope:"bible", license:"Public domain", about:"A modern Catholic translation from the Vulgate.", file:"data/tr/cpdv.json"},
  jps:{name:"JPS 1917", full:"JPS Tanakh (1917)", short:"JPS 1917", group:"Jewish", scope:"ot", license:"Public domain", about:"The Jewish Publication Society’s Hebrew Bible — the Old Testament only.", file:"data/tr/jps.json"},
  noyes:{name:"Noyes", full:"Noyes Translation (1869)", short:"Noyes", group:"Historic New Testaments", scope:"partial", license:"Public domain", about:"George Noyes’s New Testament, with Job to the Song of Solomon and all the Prophets.", file:"data/tr/noyes.json"},
  twenty:{name:"20th C. NT", full:"Twentieth Century New Testament (1904)", short:"20th C. NT", group:"Historic New Testaments", scope:"nt", license:"Public domain", about:"One of the first modern-English New Testaments.", file:"data/tr/twenty.json"},
  anderson:{name:"Anderson", full:"Anderson New Testament (1864)", short:"Anderson", group:"Historic New Testaments", scope:"nt", license:"Public domain", about:"Henry Tompkins Anderson’s New Testament.", file:"data/tr/anderson.json"},
  haweis:{name:"Haweis", full:"Haweis New Testament (1795)", short:"Haweis", group:"Historic New Testaments", scope:"nt", license:"Public domain", about:"Thomas Haweis’s 18th-century New Testament.", file:"data/tr/haweis.json"}
};
const TRANS_GROUPS=["Modern","Literal","Classic","Catholic","Jewish","Historic New Testaments"];
const SCOPE_LABEL={bible:"Whole Bible", nt:"New Testament", ot:"Old Testament", partial:"Parts of the Bible"};
const FALLBACK_TRANS="asv";   // shown for chapters a partial translation doesn’t have
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
// Feature data that syncs and goes into backups: {key, prefix, valid(v), onRemote()} — stored as {id: value} under `key`.
const SYNC_STORES=[];
// Extra buttons in the verse sheet's Mark tab: {html(ref), bind(body, ref)}.
const MARK_ACTIONS=[];

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
// The verses of a chapter as shown on screen: a chapter the current translation lacks comes from the fallback.
function chapterText(bookName,c){
  const b=BOOKS.find(x=>x.name===bookName), ch=b&&b.chapters[c-1]; if(!ch) return null;
  if(ch.some(Boolean)||!BIBLES[FALLBACK_TRANS]) return ch;
  const fb=BIBLES[FALLBACK_TRANS].books.find(x=>x.name===bookName);
  return (fb&&fb.chapters[c-1])||ch;
}
function passageVerses(p){
  if(!p) return [];
  if(!BOOKS.some(b=>b.name===p.book)) return [];
  const out=[];
  for(let c=p.ch;c<=p.ch2;c++){
    const ch=chapterText(p.book,c); if(!ch) continue;
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
function textOf(ref){
  const t=VINDEX[ref]; if(t) return t;
  // A partial translation (e.g. New Testament only): quote the fallback for the parts it doesn’t have.
  if(state.trans!==FALLBACK_TRANS&&TRANSLATIONS[state.trans].scope!=="bible"&&BIBLES[FALLBACK_TRANS]){
    const p=parseRef(ref), b=p&&BIBLES[FALLBACK_TRANS].books.find(x=>x.name===p.book);
    const own=p&&BOOKS.find(x=>x.name===p.book);
    if(b&&own&&!(own.chapters[p.ch-1]||[]).some(Boolean)) return (b.chapters[p.ch-1]||[])[p.v-1]||"";
  }
  return "";
}

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
  // Partial translations borrow the fallback for the chapters they don’t have.
  if(TRANSLATIONS[id].scope!=="bible"&&!BIBLES[FALLBACK_TRANS]) BIBLES[FALLBACK_TRANS]=await getJSON(TRANSLATIONS[FALLBACK_TRANS].file);
  return BIBLES[id];
}
async function boot(){
  applyTheme(store.get("theme",(window.matchMedia&&matchMedia("(prefers-color-scheme: dark)").matches)?"dark":"light"));
  bindTopbarHeight();
  $("#view").innerHTML='<div class="loading">Loading the Scriptures…</div>';
  let want=store.get("trans","asv"); if(!TRANSLATIONS[want]) want="asv";
  try{
    const [s,m]=await Promise.all([
      getJSON("data/study.json"), getJSON("data/typology.json"),
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
  bindTabs(); bindTheme(); bindFontSize(); bindSheet(); bindTrans(); bindSettings(); syncCommTab();
  setupSync();
  if("scrollRestoration" in history) history.scrollRestoration="manual";
  startRouter();
  ensureXrefs(state.book);
  setupOffline();
}

/* ---------- offline + install ---------- */
let installPrompt=null;
function setupOffline(){
  if("serviceWorker" in navigator&&location.protocol!=="file:"){
    navigator.serviceWorker.register("sw.js").catch(e=>console.warn("Service worker not registered",e));
    if(navigator.storage&&navigator.storage.persist) navigator.storage.persist().catch(()=>{});
  }
  const badge=$("#offlineBadge"), upd=()=>badge.classList.toggle("hidden",navigator.onLine);
  addEventListener("online",upd); addEventListener("offline",upd); upd();
  addEventListener("beforeinstallprompt",e=>{ e.preventDefault(); installPrompt=e; if(state.view==="saved") renderSaved(); });
}
const isStandalone=()=>matchMedia("(display-mode: standalone)").matches||navigator.standalone===true;
async function offlineStatus(){
  if(!("caches" in window)) return null;
  try{
    const list=await getJSON("data/files.json"), c=await caches.open("selah-data");
    const keys=new Set((await c.keys()).map(r=>r.url));
    // Commentary files count only for the work chosen in Settings (and none when commentary is off).
    // Translations count only for the one being read and the side-by-side one (all of them would be ~90 MB).
    const trFiles=new Set(Object.values(TRANSLATIONS).map(t=>t.file)), want=new Set([state.trans,compareTrans()].filter(Boolean).map(k=>TRANSLATIONS[k].file));
    const inUse=[state.trans,compareTrans()].filter(Boolean);
    const files=list.files.filter(f=>(!f.p.startsWith("data/comm/")||(commOn()&&f.p.startsWith(`data/comm/${commSrc()}/`)))&&(!trFiles.has(f.p)||want.has(f.p))
      &&(!f.p.startsWith("data/red/")||(redOn()&&inUse.some(k=>f.p===`data/red/${k}.json`))));
    const have=files.filter(f=>keys.has(new URL(f.p+"?v="+DATA_V,location.href).href));
    return {list:{files,bytes:files.reduce((a,f)=>a+f.s,0)},have:have.length,total:files.length,haveBytes:have.reduce((a,f)=>a+f.s,0)};
  }catch(e){ return null; }
}
function offlineHTML(){
  const ios=/iPhone|iPad|iPod/.test(navigator.userAgent)||(navigator.platform==="MacIntel"&&navigator.maxTouchPoints>1);
  const install=isStandalone()?"":installPrompt
    ?`<button class="btn-ghost" id="installBtn">Install Selah as an app</button>`
    :ios?`<div class="section-sub" style="padding:8px 0 0">To install: in Safari tap <b>Share</b> then <b>Add to Home Screen</b>. Selah then opens full-screen like an app.</div>`:"";
  return `<div class="backup" id="offlineBox"><div class="lbl">Offline</div>
    <div class="section-sub" style="padding:0 0 10px">The ASV, study trails and artwork are kept on this device, so Selah opens without a connection. Hebrew and Greek, cross-references, commentary and the translation you read in are saved as you use them — or save them all now.</div>
    <div id="offStatus" class="section-sub" style="padding:0 0 10px">Checking…</div>
    <div class="dl-bar hidden" id="dlBar"><div></div></div>
    <div class="backup-row"><button class="btn-primary" id="dlAll" disabled>Download everything</button></div>${install}</div>`;
}
async function bindOffline(){
  const ib=$("#installBtn"); if(ib) ib.onclick=async()=>{ installPrompt.prompt(); await installPrompt.userChoice.catch(()=>{}); installPrompt=null; renderSaved(); };
  const st=await offlineStatus(), out=$("#offStatus"), btn=$("#dlAll"); if(!out) return;
  if(!st||!("serviceWorker" in navigator)){ out.textContent="This browser can’t save Selah for offline use."; btn.remove(); return; }
  const mb=b=>(b/1e6).toFixed(0)+" MB";
  if(st.have>=st.total){ out.textContent=`Everything is saved on this device (${mb(st.list.bytes)}).`; btn.remove(); return; }
  out.textContent=st.have?`${st.have} of ${st.total} study files saved (${mb(st.haveBytes)} of ${mb(st.list.bytes)}).`:`Full study library: ${mb(st.list.bytes)}.`;
  btn.disabled=false;
  btn.onclick=async()=>{
    btn.disabled=true; const bar=$("#dlBar"); bar.classList.remove("hidden");
    const todo=[...st.list.files]; let done=0, bytes=0, failed=0;
    const c=await caches.open("selah-data");
    const worker=async()=>{ while(todo.length){ const f=todo.shift(); const u=f.p+"?v="+DATA_V;
      try{ if(!(await c.match(u))){ const r=await fetch(u); if(!r.ok) throw 0; await c.put(u,r); } }catch(e){ failed++; }
      done++; bytes+=f.s; bar.firstChild.style.width=(100*done/st.total)+"%"; out.textContent=`Saving… ${mb(bytes)} of ${mb(st.list.bytes)}`; } };
    await Promise.all([worker(),worker(),worker(),worker()]);
    out.textContent=failed?`Saved, but ${failed} file${failed===1?"":"s"} failed — check your connection and tap again.`:`Everything is saved on this device (${mb(st.list.bytes)}).`;
    if(failed){ btn.disabled=false; } else { btn.remove(); bar.classList.add("hidden"); toast("Saved for offline"); }
  };
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
    const host=el.querySelector(".vp")||el, t=host.querySelector(":scope > .tcount"); host.insertBefore(span,t||null);
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
  if(btn){ btn.textContent=TRANSLATIONS[state.trans].short; btn.setAttribute("aria-label",`Translation: ${TRANSLATIONS[state.trans].name}. Change translation`); }
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
function bindTheme(){ $("#themeBtn").onclick=()=>applyThemePref(document.documentElement.getAttribute("data-theme")==="dark"?"light":"dark"); }
// Reading look: font, line spacing and margins (Settings → Reading).
const READ_FONTS={classic:'Georgia,"Times New Roman",serif', book:'"Iowan Old Style","Palatino Linotype",Palatino,"Book Antiqua",Charter,"Bitstream Charter",serif', sans:'-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Inter,sans-serif'};
const READ_LH={compact:1.5, normal:1.65, roomy:1.9};
const READ_W={wide:{pad:10,max:920}, normal:{pad:18,max:780}, narrow:{pad:28,max:640}};
function applyReadLook(){
  const r=document.documentElement.style, f=store.get("readFont","classic"), l=store.get("readLH","normal"), w=READ_W[store.get("readW","normal")]||READ_W.normal;
  r.setProperty("--read-font",READ_FONTS[f]||READ_FONTS.classic); r.setProperty("--read-lh",READ_LH[l]||1.65);
  r.setProperty("--read-pad",w.pad+"px"); r.setProperty("--read-max",w.max+"px");
  if(state.view==="read"&&document.getElementById("book")) bookRelayout();
}
function applyFontSize(px){
  document.documentElement.style.setProperty("--fs-verse",px+"px"); store.set("fs",px);
  if(state.view==="read"&&document.getElementById("book")) bookRelayout();
}
function bindFontSize(){
  applyFontSize(store.get("fs",18)); applyReadLook();
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
  if(v!=="read"){ document.documentElement.classList.remove("book-on"); stopReading(); }
  ({home:renderHome,read:renderRead,search:renderSearch,christ:renderChrist,images:renderImages,saved:renderSaved,plans:renderPlans,...EXTRA_VIEWS})[v]();
  window.scrollTo(0,0);
  routeView(v);
}

// Screens added by feature files (maps.js, …): EXTRA_VIEWS[name]=render; HOME_TOOLS adds their card on Home.
const EXTRA_VIEWS={}, HOME_TOOLS=[];   // HOME_TOOLS: [{go, title, sub()}]

/* Artwork and the picture timeline live in pictures.js (ART, HOME_ART, PICTURE_BOOKS, renderImages). */

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
  const start=dayIndex(HOME_ART.length);
  v.innerHTML=`<div class="home"><div class="home-art"><div class="home-hero">
      <button class="hero-slides" id="heroSlides" aria-label="Open this picture">${HOME_ART.map((a,i)=>
        `<img src="${artSrc(a)}" alt="${esc(a.alt)}" width="${a.w}" height="${a.h}" decoding="async" style="object-position:${a.focus}" class="${i===start?"on":""}" ${i===start?"":'loading="lazy"'}>`).join("")}</button>
      <div class="home-brand"><div class="home-name">Selah</div><div class="home-tag">Pause and reflect.</div>
        <div class="hero-dots" role="group" aria-label="Choose picture">${HOME_ART.map((a,i)=>`<button data-i="${i}" class="${i===start?"on":""}" aria-label="${esc(a.title)}"></button>`).join("")}</div></div>
    </div></div><div class="home-main">`
  +(pos&&BOOKS.some(b=>b.name===pos.book)?`<button class="home-continue" id="hcCont"><span>Continue reading</span><b>${esc(pos.book)} ${pos.ch} →</b></button>`:"")
  +(()=>{ const rec=typeof historyList==="function"?historyList().filter(x=>!(pos&&x.b===pos.book&&x.c===pos.ch)).slice(0,4):[];
      return rec.length?`<div class="home-recent"><span>Recent</span>${rec.map(x=>`<button data-b="${esc(x.b)}" data-c="${x.c}">${esc(chLabel(x.b,x.c))}</button>`).join("")}</div>`:""; })()
  +planHomeCard()
  +`<button class="home-votd" id="hcVotd"><div class="hlab">Verse of the day</div><div class="votd-ref">${esc(votd)}</div><div class="votd-text">${verseHTML(textOf(votd))}</div></button>`
  +(typ&&typFirst?`<button class="home-typ" id="hcTyp"><div class="hlab">Typology of the day</div><div class="ty-t">${esc(typ.title)}</div><div class="ty-s">${esc(typ.nt)} &nbsp;↔&nbsp; ${esc(typ.ot)}</div></button>`:"")
  +`<div class="home-grid">
    <button class="home-card" data-go="read"><div class="hc-t">Read</div><div class="hc-s">The Bible · ${esc(TRANSLATIONS[state.trans].short)}</div></button>
    <button class="home-card" data-go="search"><div class="hc-t">Search</div><div class="hc-s">Any word or phrase</div></button>
    <button class="home-card" data-go="christ"><div class="hc-t">Trace Christ</div><div class="hc-s">Study trails, Genesis to Revelation</div></button>
    <button class="home-card" data-go="images"><div class="hc-t">Images</div><div class="hc-s">Picture Bible · ${ART.length} pieces</div></button>
    <button class="home-card" data-go="plans"><div class="hc-t">Reading plans</div><div class="hc-s">${getPlan()?"Your plan and progress":"Year, Gospels, NT…"}</div></button>
${HOME_TOOLS.map(t=>`<button class="home-card" data-go="${t.go}"><div class="hc-t">${esc(t.title)}</div><div class="hc-s">${esc(t.sub())}</div></button>`).join("")}
    <button class="home-card" data-go="saved"><div class="hc-t">Saved</div><div class="hc-s">${hlN} highlight${hlN===1?"":"s"} · ${noteN} note${noteN===1?"":"s"}</div></button>
  </div>
  <div class="home-foot">Selah · ${esc(TRANSLATIONS[state.trans].full)} · ${esc(TRANSLATIONS[state.trans].license)}</div></div></div>`;
  const go=g=>showView(g);
  v.querySelectorAll(".home-card").forEach(b=>b.onclick=()=>{ const t=HOME_TOOLS.find(x=>x.go===b.dataset.go); if(t&&t.open) t.open(); go(b.dataset.go); });
  const hc=v.querySelector("#hcCont"); if(hc) hc.onclick=()=>go("read");
  v.querySelectorAll(".home-recent button").forEach(b=>b.onclick=()=>{ state.book=b.dataset.b; state.ch=+b.dataset.c; savePos(); go("read"); });
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
  const show=n=>{ heroIdx=(n+HOME_ART.length)%HOME_ART.length;
    slides.forEach((im,k)=>im.classList.toggle("on",k===heroIdx));
    dots.forEach((d,k)=>{ d.classList.toggle("on",k===heroIdx); d.setAttribute("aria-pressed",k===heroIdx); }); };
  const reduced=window.matchMedia&&matchMedia("(prefers-reduced-motion: reduce)").matches;
  const tick=()=>{ if(!document.hidden) show(heroIdx+1); };
  const restart=()=>{ clearInterval(heroTimer); heroTimer=reduced?null:setInterval(tick,HERO_MS); };
  dots.forEach(d=>d.onclick=e=>{ e.stopPropagation(); show(+d.dataset.i); restart(); });
  $("#heroSlides").onclick=()=>openLightbox(heroIdx,HOME_ART);
  show(heroIdx); restart();
}
function stopHeroRotation(){ clearInterval(heroTimer); heroTimer=null; }

/* ---------- full-screen picture viewer ---------- */
let lbIdx=0, lbReturn=null;
function openLightbox(i,list=HOME_ART){
  lbReturn=document.activeElement;
  const lb=$("#lightbox"), L=list.length?list:ART;
  const paint=()=>{ const a=L[lbIdx];
    lb.querySelector("img").src=artSrc(a); lb.querySelector("img").alt=a.alt;
    lb.querySelector(".lb-cap").textContent=a.title+(a.ref?" · "+a.ref:""); };
  lbIdx=i; paint();
  lb.classList.remove("hidden"); document.body.classList.add("sheet-open");
  lb.querySelector(".lb-prev").onclick=e=>{ e.stopPropagation(); lbIdx=(lbIdx-1+L.length)%L.length; paint(); };
  lb.querySelector(".lb-next").onclick=e=>{ e.stopPropagation(); lbIdx=(lbIdx+1)%L.length; paint(); };
  lb.querySelector(".lb-prev").hidden=lb.querySelector(".lb-next").hidden=L.length<2;
  lb.querySelector(".lb-close").onclick=()=>dismissOverlay("lightbox",closeLightbox);
  lb.onclick=e=>{ if(e.target===lb) dismissOverlay("lightbox",closeLightbox); };
  pushOverlay("lightbox");
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
const NT_VARIANTS=new Set(["Matthew 17:21","Matthew 18:11","Matthew 23:14","Mark 7:16","Mark 9:44","Mark 9:46","Mark 11:26","Mark 15:28",
  "Luke 17:36","Luke 23:17","John 5:4","Acts 8:37","Acts 15:34","Acts 24:7","Acts 28:29","Romans 16:24"]);
function gapNote(bookName,ch){
  const T=TRANSLATIONS[state.trans];
  return T.scope==="nt"?`The ${T.full} has only the New Testament.`:T.scope==="ot"?`The ${T.full} has only the Old Testament.`:`The ${T.full} doesn’t include ${bookName} ${ch}.`;
}
// Why a verse slot is empty: its words are joined to another verse, it's a known manuscript variant, or the translation leaves it out.
function emptyVerseNote(book,chNum,v,tname,ref){
  const j=(book.joined||{})[`${chNum}:${v}`];
  if(j){ const [jc,jv]=j.split(":"); return `Included with ${+jc===chNum?"verse "+jv:jc+":"+jv} in the ${tname}.`; }
  return NT_VARIANTS.has(ref)?`Not in the ${tname} text — this verse is absent from the oldest manuscripts.`:`Not in the ${tname} text.`;
}
/* Red letters: data/red/<translation>.json = {"Book C:V": [[start,end],…]} — where Jesus speaks in that translation's words. */
const RED={}, RED_BOOKS=new Set(["Matthew","Mark","Luke","John","Acts","1 Corinthians","2 Corinthians","1 Timothy","Revelation"]);
const redOn=()=>store.get("redLetters",true);
function ensureRed(key){
  if(!redOn()||key in RED||!TRANSLATIONS[key]) return;
  RED[key]=null;                                    // loading
  getJSON(`data/red/${key}.json`).then(d=>{ RED[key]=d;
    if(state.view==="read"&&RED_BOOKS.has(state.book)&&(key===state.trans||key===compareTrans())){
      if(typeof BOOK!=="undefined") BOOK.cache.clear();
      if(document.getElementById("book")) bookRelayout(); else { const y=scrollY; renderRead(); scrollTo(0,y); }
    }
  }).catch(()=>{ delete RED[key]; });
}
function redHTML(key,ref,t){
  const sp=redOn()&&RED[key]&&RED[key][ref];
  if(!sp) return verseHTML(t);
  let m=t; for(const [a,b] of [...sp].sort((x,y)=>y[0]-x[0])) m=m.slice(0,a)+"\uE000"+m.slice(a,b)+"\uE001"+m.slice(b);
  return verseHTML(m).replace(/\uE000/g,'<span class="wj">').replace(/\uE001/g,"</span>");
}
function chapterVersesHTML(bookName,chNum){
  let book=BOOKS.find(b=>b.name===bookName), src=state.trans;
  let h="";
  if(!book.chapters[chNum-1].some(Boolean)){
    const fb=state.trans!==FALLBACK_TRANS&&BIBLES[FALLBACK_TRANS]?BIBLES[FALLBACK_TRANS].books.find(b=>b.name===bookName):null;
    h+=`<div class="trans-gap">${esc(gapNote(bookName,chNum))}${fb?` Showing ${esc(bookName)} ${chNum} in the ${esc(TRANSLATIONS[FALLBACK_TRANS].full)}.`:""}</div>`;
    if(fb){ book=fb; src=FALLBACK_TRANS; }
  }
  const heads=book.headings||{};
  const cmp=compareTrans(), cbook=cmp&&BIBLES[cmp]?BIBLES[cmp].books.find(b=>b.name===bookName):null;
  if(RED_BOOKS.has(bookName)){ ensureRed(src); if(cmp) ensureRed(cmp); }
  const cmpHTML=i=>{ if(!cbook) return ""; const ct=(cbook.chapters[chNum-1]||[])[i];
    const none=!(cbook.chapters[chNum-1]||[]).some(Boolean);
    return `<span class="vcmp"><span class="vtag">${TRANSLATIONS[cmp].name}</span>${ct?redHTML(cmp,`${bookName} ${chNum}:${i+1}`,ct):`<i>${none?"Not in this translation":esc(emptyVerseNote(cbook,chNum,i+1,TRANSLATIONS[cmp].name,`${bookName} ${chNum}:${i+1}`))}</i>`}</span>`; };
  book.chapters[chNum-1].forEach((t,i)=>{
    const ref=`${bookName} ${chNum}:${i+1}`;
    const hd=heads[`${chNum}:${i+1}`];
    if(hd) h+=`<div class="vhead">${esc(hd)}</div>`;
    if(!t){
      // Verse number kept for standard versification; the translation leaves it out.
      h+=`<div class="verse omitted${cbook?" cmp":""}"><span class="vp"><span class="vn">${i+1}</span>${esc(emptyVerseNote(book,chNum,i+1,TRANSLATIONS[src].name,ref))}</span>${cmpHTML(i)}</div>`;
      return;
    }
    if(!XLOADED[bookName]) ensureXrefs(bookName);
    const xc=(XREFS[ref]||[]).length;
    const tc=typesFor(bookName,chNum,i+1).length;
    const hl=HL[ref]?` hl-${HL[ref]}`:"";
    const nn=(NOTES[ref]?" has-note":"")+(typeof bmHas==="function"&&bmHas(ref)?" bm":"");
    const main=`<span class="vn">${i+1}</span>${redHTML(src,ref,t)}${xc?`<span class="xcount">↔ ${xc}</span>`:""}${tc?`<span class="tcount">◈ type</span>`:""}`;
    h+=cbook?`<div class="verse cmp${hl}${nn}" data-ref="${esc(ref)}" role="button" tabindex="0"><span class="vp">${main}</span>${cmpHTML(i)}</div>`
            :`<div class="verse${hl}${nn}" data-ref="${esc(ref)}" role="button" tabindex="0">${main}</div>`;
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
    <button class="nav-btn" id="nextCh" aria-label="Next chapter">›</button>${listenButtonsHTML()}${toggle}</div>`;
}
function bindReaderNav(){
  $("#bookSel").onchange=e=>{ state.book=e.target.value; state.ch=1; savePos(); renderRead(); window.scrollTo(0,0); };
  $("#chSel").onchange=e=>{ state.ch=+e.target.value; savePos(); renderRead(); window.scrollTo(0,0); };
  $("#prevCh").onclick=()=>stepChapter(-1); $("#nextCh").onclick=()=>stepChapter(1);
  bindListen();
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
  if(SPEAK.on&&!SPEAK.internal) stopReading();
  ensureXrefs(state.book);
  if(isBookMode()){ document.documentElement.classList.add("book-on"); v.innerHTML=readerNavHTML()+`<div id="book"></div>`; bindReaderNav(); renderBook(); return; }
  document.documentElement.classList.remove("book-on");
  const cmp=compareTrans();
  v.innerHTML=readerNavHTML()+`<div class="verses${cmp?" cmp-on":""}">${cmp?`<div class="cmp-head"><span>${esc(TRANSLATIONS[state.trans].short)}</span><span>${esc(TRANSLATIONS[cmp].short)}</span></div>`:""}${chapterVersesHTML(state.book,state.ch)}</div>`;
  const list=v.querySelector(".verses");
  list.onclick=e=>{ const el=e.target.closest(".verse[data-ref]"); if(el) openSheet(el.dataset.ref,"xrefs"); };
  bindVerseOpen(list);
  bindReaderNav();
}
function savePos(){ store.set("pos",{book:state.book,ch:state.ch}); if(typeof recordHistory==="function") recordHistory(state.book,state.ch); routeChapter(); }
function stepChapter(d){
  const bi=BOOKS.findIndex(b=>b.name===state.book);
  let nb=bi, nc=state.ch+d;
  if(nc<1){ if(bi>0){nb=bi-1; nc=BOOKS[nb].chapters.length;} else return; }
  if(nc>BOOKS[bi].chapters.length){ if(bi<BOOKS.length-1){nb=bi+1; nc=1;} else return; }
  state.book=BOOKS[nb].name; state.ch=nc; savePos(); renderRead(); window.scrollTo(0,0);
}
// Accepts a single verse ("John 3:16") or a passage ("John 2:1-11"); scrolls to it and briefly marks the range.
function gotoVerse(ref){
  const p=parsePassage(ref), bk=p&&BOOKS.find(b=>b.name===p.book); if(!bk||!bk.chapters[p.ch-1]) return;
  state.book=p.book; state.ch=p.ch; savePos();
  if(isBookMode()){ bookReveal(p); routeVerse(p); return; }
  showView("read"); routeVerse(p);
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

/* ---------- swipe down to close a bottom sheet ----------
   Drag from the handle or title bar anytime; from the content only when it's scrolled to the top.
   A long enough or quick enough pull closes it, otherwise it springs back. */
function swipeToClose(panel,body,dismiss){
  let y0=null, x0=0, dy=0, t0=0, drag=false, fromBody=false;
  panel.addEventListener("touchstart",e=>{
    if(e.touches.length!==1||e.target.closest("input,textarea,select,.seg,.tabs,.sheet-tabs")) { y0=null; return; }
    fromBody=body.contains(e.target);
    if(fromBody&&body.scrollTop>0){ y0=null; return; }
    y0=e.touches[0].clientY; x0=e.touches[0].clientX; dy=0; t0=performance.now(); drag=false;
  },{passive:true});
  panel.addEventListener("touchmove",e=>{
    if(y0===null) return;
    const d=e.touches[0].clientY-y0, dx=Math.abs(e.touches[0].clientX-x0);
    if(!drag){
      if(d<-4||dx>Math.abs(d)||(fromBody&&body.scrollTop>0)){ y0=null; return; }   // scrolling or sideways
      if(d<8){ if(d>0&&e.cancelable) e.preventDefault(); return; }    // stop the page's own pull-to-bounce
      drag=true; panel.style.transition="none"; panel.style.animation="none";
    }
    dy=Math.max(0,d); panel.style.transform=`translateY(${dy}px)`;
    if(e.cancelable) e.preventDefault();
  },{passive:false});
  const end=()=>{
    if(y0===null) return; y0=null;
    if(!drag) return; drag=false;
    const fast=dy/Math.max(1,performance.now()-t0)>0.6;
    panel.style.transition="transform .2s ease-out";
    if(dy>Math.min(140,panel.offsetHeight*0.25)||(fast&&dy>40)){
      panel.style.transform="translateY(100%)";
      setTimeout(()=>{ dismiss(); panel.style.transition=""; panel.style.transform=""; panel.style.animation=""; },190);
    } else {
      panel.style.transform="";
      setTimeout(()=>{ panel.style.transition=""; panel.style.animation=""; },210);
    }
  };
  panel.addEventListener("touchend",end); panel.addEventListener("touchcancel",end);
}

/* ---------- SHEET ---------- */
let sheetReturnFocus=null;
function bindSheet(){
  const dismiss=()=>dismissOverlay("sheet",closeSheet);
  $("#sheetClose").onclick=dismiss;
  $("#sheetShare").onclick=()=>{ state.sheetTab="share"; paintSheet(); };
  $("#sheetScrim").onclick=dismiss;
  swipeToClose($("#sheet"),$("#sheetBody"),dismiss);
  document.addEventListener("keydown",e=>{
    const lbOpen=!$("#lightbox").classList.contains("hidden");
    if(e.key==="Escape"){ if(lbOpen) dismissOverlay("lightbox",closeLightbox); else if(state.sheetRef) dismiss(); }
    else if(lbOpen&&(e.key==="ArrowRight"||e.key==="ArrowLeft")) $(e.key==="ArrowRight"?".lb-next":".lb-prev").click();
  });
  document.querySelectorAll("#sheetTabs button").forEach(b=>{
    b.onclick=()=>{ state.sheetTab=b.dataset.tab; paintSheet(); };
  });
}
function markPicked(ref){
  document.querySelectorAll(".verse.picked").forEach(el=>el.classList.remove("picked"));
  if(ref) document.querySelectorAll(".verse[data-ref]").forEach(el=>{ if(el.dataset.ref===ref) el.classList.add("picked"); });
}
function openSheet(ref,tab){
  sheetReturnFocus=document.activeElement;
  state.sheetRef=ref; state.sheetTab=tab==="comment"&&!commOn()?"xrefs":(tab||"xrefs");
  markPicked(ref);
  if(typeof lexState!=="undefined"){ lexState.ref=null; lexState.strong=null; }
  const wasOpen=!$("#sheetWrap").classList.contains("hidden");
  $("#sheetWrap").classList.remove("hidden");
  document.body.classList.add("sheet-open");
  if(!wasOpen) pushOverlay("sheet");
  paintSheet();
  $("#sheetClose").focus({preventScroll:true});
}
function closeSheet(){
  const wasOpen=!!state.sheetRef;
  $("#sheetWrap").classList.add("hidden"); state.sheetRef=null; markPicked(null);
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
  ({xrefs:paintXrefs,comment:paintComment,original:paintOriginal,parallels:paintParallels,typology:paintTypes,words:paintWords,mark:paintMark,share:paintShare})[state.sheetTab](body,ref);
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
  if(!list.length){ body.innerHTML='<div class="empty">No cross-references recorded for this verse.</div><div id="xTopics"></div>'; fillVerseTopics(ref); fillVersePlaces(ref); return; }
  body.innerHTML=`<div class="lbl">${list.length} cross-reference${list.length===1?"":"s"} · ranked by relevance</div>`+list.map(e=>{
    const t=textOf(R[e[0]]); const prev=t.length>110?t.slice(0,110)+"…":t; const d=xrefLabel(e);
    return `<button class="xref-row" data-r="${esc(d.includes(" – ")?R[e[0]]:d)}"><span class="xr">${esc(d)}</span><span class="xv">${verseHTML(prev)}</span><span class="xvotes">relevance ${e[1]}</span></button>`;
  }).join("")+`<div id="xTopics"></div><div class="orig-credit">Cross-references: OpenBible.info (CC BY), from the Treasury of Scripture Knowledge and reader votes.</div>`;
  body.querySelectorAll(".xref-row").forEach(b=>b.onclick=()=>gotoVerse(b.dataset.r));
  fillVerseTopics(ref); fillVersePlaces(ref);
}
function passageHTML(vs){
  return vs.map(x=>`<span class="vn">${x.ref.split(":")[1]}</span>${verseHTML(x.text)} `).join("");
}
function paintParallels(body,ref){
  const p=parseRef(ref); if(!p){body.innerHTML='<div class="empty">—</div>';return;}
  const sets=STUDY.parallels.filter(s=>s.verses.some(v=>{const pp=parsePassage(v);return pp&&verseInPassage(p.book,p.ch,p.v,pp);}));
  if(!sets.length){ body.innerHTML='<div class="empty">No parallel passages recorded for this verse. Parallels cover the major events and teaching shared by the Gospels.</div>'; return; }
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
    ${MARK_ACTIONS.length?`<div class="mark-more">${MARK_ACTIONS.map(a=>a.html(ref)).join("")}</div>`:""}
    <button class="btn-ghost share-link" id="markShare">Share this verse as an image</button>
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
  $("#markShare").onclick=()=>{ state.sheetTab="share"; paintSheet(); };
  MARK_ACTIONS.forEach(a=>a.bind(body,ref));
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
// renderSearch and the rest of Search live in search.js.

/* ---------- CHRIST ---------- */
function renderChrist(){
  const v=$("#view");
  const groups=[...new Set(STUDY.traces.map(t=>t.group||"John"))];
  const card=t=>`
    <div class="trace-card" data-id="${esc(t.id)}">
      <button class="trace-head" aria-expanded="false"><h3>${esc(t.title)}</h3><span class="cnt">${t.items.length} <span class="chev">▾</span></span></button>
      <div class="trace-intro">${esc(t.intro)}</div>
      <div class="trace-items">${t.items.map(it=>`
        <button class="trace-item" data-r="${esc(it.ref)}">
          <span class="tr">${esc(it.ref)}</span><div class="tl">${esc(it.label)}</div>
          ${it.note?`<div class="tn">${esc(it.note)}</div>`:""}
        </button>`).join("")}</div>
    </div>`;
  v.innerHTML=`<h2 class="section-title">Trace Christ</h2>
  <div class="section-sub">Curated study trails from Genesis to Revelation: every item jumps straight to the passage in the ${esc(TRANSLATIONS[state.trans].name)}. Tap a trail to open it.</div>`
  +groups.map(g=>`<div class="trace-group">${esc(g==="John"?"The Gospel of John":g)}</div><div class="traces">`+STUDY.traces.filter(t=>(t.group||"John")===g).map(card).join("")+`</div>`).join("");
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
  <div class="section-sub">Your highlights and study notes (bookmarks have their own screen on Home). Sign in below to keep them in step across your devices.</div>
  <div id="savedList">`+(keys.length?keys.map(k=>`
    <button class="saved-item${HL[k]?" hl-"+HL[k]:""}" data-r="${esc(k)}">
      <span class="sr2">${esc(k)}</span><div class="sv2">${verseHTML(textOf(k))}</div>
      ${NOTES[k]?`<div class="sn">“${esc(NOTES[k])}”</div>`:""}
    </button>`).join(""):'<div class="empty" style="padding:6px 16px">Nothing saved yet. Tap any verse while reading, then use the Mark tab to highlight it or add a note.</div>')+`</div>
  <div class="about"><b>Selah</b> · ${esc(TRANSLATIONS[state.trans].full)} — ${esc(TRANSLATIONS[state.trans].license)}.<br>
  <button class="link-btn" id="savedAbout">About Selah, sources & privacy</button></div>`;
  v.querySelector("#savedList").insertAdjacentHTML("afterend",syncHTML()+backupHTML()+offlineHTML()); bindSync(); bindBackup(); bindOffline();
  v.querySelector("#savedAbout").onclick=openAbout;
  v.querySelectorAll(".saved-item").forEach(b=>b.onclick=()=>gotoVerse(b.dataset.r));
}

function toast(msg){
  const t=$("#toast"); t.textContent=msg; t.classList.remove("hidden");
  clearTimeout(t._h); t._h=setTimeout(()=>t.classList.add("hidden"),1600);
}

document.addEventListener("DOMContentLoaded",boot);
