"use strict";
/* Selah — Search: three ways in.
     Words           text of the current translation; exact phrase first, then verses with all the words
     Hebrew & Greek  find an original word by Strong's number (G26, H430), the word itself, its
                     transliteration or its English meaning, then list every verse that uses it
     Topics          Nave's Topical Bible — 5,319 topics, each a list of passages, verses opened in place
   Words and Hebrew & Greek can be narrowed to a testament or one book.
   Address: #/search?q=…&m=heb|topics&in=ot|nt|Book_Name&t=TOPIC
   Data: data/lexindex.json, data/lex/*.json (STEPBible, CC BY 4.0); data/topics.json (Nave's Topical Bible
   via BibleData by Brady Stephenson, CC BY 4.0). Built by tools/build_topics.py. */

const SEARCH={mode:store.get("searchMode","words"), q:"", scope:store.get("searchScope","all"), topic:null, letter:"A", run:false, open:null};
const SEARCH_MODES=[["words","Words"],["heb","Hebrew & Greek"],["topics","Topics"]];
let LEXIDX=null, TOPICS=null, TOPICS_DATA=null, TOPIC_BY=null, TOPIC_REV=null;   // TOPICS: the loading promise; TOPICS_DATA: the list once loaded
const loadLexIndex=()=>LEXIDX||(LEXIDX=getJSON("data/lexindex.json").catch(e=>{ LEXIDX=null; throw e; }));
function loadTopics(){
  if(!TOPICS) TOPICS=getJSON("data/topics.json").then(d=>{
    TOPIC_BY=new Map(d.t.map((t,i)=>[t[0],i])); TOPICS_DATA=d.t; return d.t;
  }).catch(e=>{ TOPICS=null; throw e; });
  return TOPICS;
}
const SMALL=new Set(["of","in","and","the","to","for","a","an","on","by","with","from","at","as","or","his","her","its","their","into","upon"]);
function titleCase(s){
  if(/[a-z]/.test(s)) return s;                        // already mixed case
  return s.toLowerCase().replace(/[a-z][a-z']*/g,(w,i)=>i>0&&SMALL.has(w)?w:w[0].toUpperCase()+w.slice(1));
}
const fold=s=>s.normalize("NFD").replace(/[̀-֑ͯ-ׇ]/g,"").replace(/[.ʼʾʿ'’]/g,"").toLowerCase();

/* ---------- scope (whole Bible, a testament, one book) ---------- */
function scopeBooks(){
  const s=SEARCH.scope;
  if(s==="ot") return BOOKS.slice(0,39);
  if(s==="nt") return BOOKS.slice(39);
  const b=BOOKS.find(x=>x.name===s); return b?[b]:BOOKS;
}
function scopeLabel(){ return SEARCH.scope==="ot"?"the Old Testament":SEARCH.scope==="nt"?"the New Testament":BOOKS.some(b=>b.name===SEARCH.scope)?SEARCH.scope:"the whole Bible"; }
function inScope(ref){
  const s=SEARCH.scope; if(s==="all") return true;
  const p=parseRef(ref); if(!p) return false;
  if(s==="ot"||s==="nt") return (bookNum(p.book)<=39)===(s==="ot");
  return p.book===s;
}
function scopeSelect(){
  const o=(v,l)=>`<option value="${esc(v)}"${SEARCH.scope===v?" selected":""}>${esc(l)}</option>`;
  return `<select id="sScope" aria-label="Search in">${o("all","Whole Bible")}${o("ot","Old Testament")}${o("nt","New Testament")}
    <optgroup label="Old Testament">${BOOKS.slice(0,39).map(b=>o(b.name,b.name)).join("")}</optgroup>
    <optgroup label="New Testament">${BOOKS.slice(39).map(b=>o(b.name,b.name)).join("")}</optgroup></select>`;
}

/* ---------- address ---------- */
function searchHash(){
  const p=new URLSearchParams();
  if(SEARCH.q) p.set("q",SEARCH.q);
  if(SEARCH.mode!=="words") p.set("m",SEARCH.mode);
  if(SEARCH.mode!=="topics"&&SEARCH.scope!=="all") p.set("in",SEARCH.scope.replace(/ /g,"_"));
  if(SEARCH.mode==="topics"&&SEARCH.topic) p.set("t",SEARCH.topic);
  const s=p.toString().replace(/\+/g,"%20"); return "#/search"+(s?"?"+s:"");
}
function setSearchFromQuery(query){
  const p=new URLSearchParams(query||"");
  const m=p.get("m"); SEARCH.mode=SEARCH_MODES.some(x=>x[0]===m)?m:"words";
  SEARCH.q=p.get("q")||"";
  const sc=(p.get("in")||"all").replace(/_/g," "); SEARCH.scope=sc==="ot"||sc==="nt"||BOOKS.some(b=>b.name===sc)?sc:"all";
  SEARCH.topic=p.get("t")||null;
  SEARCH.run=!!(SEARCH.q||SEARCH.topic);
}
const saveSearchRoute=()=>setRoute(searchHash(),true);

/* ---------- screen ---------- */
function renderSearch(){
  const v=$("#view"), m=SEARCH.mode;
  const ph={words:"Search the Bible…",heb:"G26, H430, agape, love…",topics:"Find a topic — faith, prayer, Aaron…"}[m];
  v.innerHTML=`<div class="search-bar search-top">
      <div class="seg search-modes" role="tablist" aria-label="Search by">${SEARCH_MODES.map(([k,l])=>`<button role="tab" data-m="${k}" aria-selected="${k===m}" class="${k===m?"on":""}">${esc(l)}</button>`).join("")}</div>
      <div class="search-row"><input id="q" type="search" placeholder="${esc(ph)}" enterkeyhint="search" aria-label="${esc(ph)}" value="${esc(SEARCH.q)}" autocomplete="off"><button class="nav-btn" id="go">Go</button></div>
      ${m!=="topics"?`<div class="search-scope"><span>In</span>${scopeSelect()}</div>`:""}
    </div><div id="results"></div>`;
  v.querySelectorAll(".search-modes button").forEach(b=>b.onclick=()=>{
    if(b.dataset.m===SEARCH.mode) return;
    SEARCH.mode=b.dataset.m; store.set("searchMode",SEARCH.mode); SEARCH.topic=null;
    SEARCH.run=!!SEARCH.q; renderSearch(); saveSearchRoute();
  });
  const sc=$("#sScope"); if(sc) sc.onchange=()=>{ SEARCH.scope=sc.value; store.set("searchScope",SEARCH.scope); if(SEARCH.q) runSearch(); else saveSearchRoute(); };
  const go=()=>{ SEARCH.q=$("#q").value.trim(); SEARCH.topic=null; runSearch(); };
  $("#go").onclick=go;
  $("#q").addEventListener("keydown",e=>{ if(e.key==="Enter") go(); });
  if(m==="topics") $("#q").addEventListener("input",()=>{ SEARCH.q=$("#q").value.trim(); if(!SEARCH.topic) paintTopicList(); });
  if(SEARCH.run||SEARCH.q||m==="topics"){ SEARCH.run=false; runSearch(false); }
  else $("#results").innerHTML=searchHelp();
}
function searchHelp(){
  return SEARCH.mode==="words"
    ?`<div class="search-help"><p>Type a word or phrase. If no verse has the exact phrase, Selah shows verses that contain all the words.</p><p>Use <b>In</b> to search one testament or one book.</p></div>`
    :`<div class="search-help"><p>Find a Hebrew or Greek word by its <b>Strong’s number</b> (G26, H430), the <b>word</b> (ἀγάπη), its <b>transliteration</b> (agape, chesed) or its <b>meaning</b> (love, mercy). Then see every verse that uses it.</p></div>`;
}
function runSearch(save=true){
  if(save) saveSearchRoute();
  ({words:searchWords,heb:searchHeb,topics:searchTopics})[SEARCH.mode]();
}

/* ---------- Words ---------- */
function markAny(text,words){
  const low=foldQuotes(text.toLowerCase()), hits=[];
  for(const w of words){ let i=0; while(w&&(i=low.indexOf(w,i))>=0){ hits.push([i,i+w.length]); i+=w.length; } }
  hits.sort((a,b)=>a[0]-b[0]);
  let out="", last=0;
  for(const [a,z] of hits){ if(a<last) continue; out+=esc(text.slice(last,a))+`<mark>${esc(text.slice(a,z))}</mark>`; last=z; }
  return out+esc(text.slice(last));
}
function searchWords(){
  const box=$("#results"), q=foldQuotes(SEARCH.q.toLowerCase()).replace(/\s+/g," ");
  if(q.length<2){ box.innerHTML='<div class="empty" style="padding:14px 16px">Type at least 2 characters.</div>'; return; }
  const scan=test=>{
    const out=[]; let more=false;
    loop: for(const b of scopeBooks()) for(let ci=0;ci<b.chapters.length;ci++) for(let vi=0;vi<b.chapters[ci].length;vi++){
      const t=b.chapters[ci][vi]; if(!t) continue;
      const ix=test(foldQuotes(t.toLowerCase()));
      if(ix<0) continue;
      if(out.length>=SEARCH_CAP){ more=true; break loop; }
      let a=Math.max(0,ix-45), z=Math.min(t.length,ix+q.length+45);
      if(a>0){ const s=t.indexOf(" ",a); if(s>=0&&s<ix) a=s+1; }
      if(z<t.length){ const s=t.lastIndexOf(" ",z); if(s>ix+q.length) z=s; }
      out.push({ref:`${b.name} ${ci+1}:${vi+1}`, sn:t.slice(a,z), pre:a>0, post:z<t.length});
    }
    return {out,more};
  };
  let words=[q], {out,more}=scan(t=>t.indexOf(q)), loose=false;
  const parts=q.split(" ").filter(w=>w.length>1);
  if(!out.length&&parts.length>1){
    // No exact phrase: verses with every word, in any order.
    ({out,more}=scan(t=>parts.every(w=>t.includes(w))?Math.max(0,t.indexOf(parts[0])):-1)); words=parts; loose=true;
  }
  const where=SEARCH.scope==="all"?"":` in ${esc(scopeLabel())}`;
  box.innerHTML=`<div class="lbl" style="padding:0 16px">${loose?"No verse has that exact phrase. ":""}${out.length}${more?"+":""} ${loose?"verse"+(out.length===1?"":"s")+" with all the words":"result"+(out.length===1?"":"s")}${where}${more?" — showing the first "+SEARCH_CAP:""}</div>`
    +(out.length?"":`<div class="empty" style="padding:6px 16px">Nothing found${where}.${SEARCH.scope!=="all"?' <button class="link-btn" id="sAll">Search the whole Bible</button>':""}</div>`)
    +`<div class="sr-list">`+out.map(o=>
      `<button class="sr" data-r="${esc(o.ref)}"><span class="srr">${esc(o.ref)}</span><span class="srv">${o.pre?"…":""}${markAny(o.sn,words)}${o.post?"…":""}</span></button>`
    ).join("")+`</div>`;
  box.querySelectorAll(".sr").forEach(b=>b.onclick=()=>gotoVerse(b.dataset.r));
  const all=$("#sAll"); if(all) all.onclick=()=>{ SEARCH.scope="all"; store.set("searchScope","all"); $("#sScope").value="all"; runSearch(); };
}

/* ---------- Hebrew & Greek ---------- */
async function searchHeb(){
  const box=$("#results"), raw=SEARCH.q.trim();
  if(!raw){ box.innerHTML=searchHelp(); return; }
  box.innerHTML='<div class="empty">Loading the word list…</div>';
  let idx; try{ idx=await loadLexIndex(); }catch(e){ box.innerHTML='<div class="empty">Couldn’t load the word list. Check your connection and try again.</div>'; return; }
  if(SEARCH.mode!=="heb"||SEARCH.q.trim()!==raw) return;
  const m=raw.replace(/\s+/g,"").match(/^([HGhg])0*(\d{1,4})([A-Za-z])?$/);
  let hits;
  if(m){
    const base=m[1].toUpperCase()+m[2].padStart(4,"0"), suf=(m[3]||"").toUpperCase();
    hits=idx.filter(e=>e[0].slice(0,5)===base&&(!suf||e[0].slice(5)===suf));
  }else{
    const q=fold(raw), qWord=new RegExp(`(^|[^a-z])${q.replace(/[.*+?^${}()|[\]\\]/g,"\\$&")}([^a-z]|$)`);
    const score=e=>{
      const l=fold(e[1]), t=fold(e[2]), g=e[3].toLowerCase();
      if(l===q||t===q) return 0;
      if(qWord.test(g)) return g===q||g==="to "+q?1:2;
      if(t.startsWith(q)||l.startsWith(q)) return 3;
      return -1;
    };
    hits=idx.map(e=>[score(e),e]).filter(x=>x[0]>=0).sort((a,b)=>a[0]-b[0]||b[1][4]-a[1][4]).map(x=>x[1]);
  }
  const total=hits.length; hits=hits.slice(0,60);
  if(!hits.length){ box.innerHTML=`<div class="empty">No Hebrew or Greek word matches “${esc(raw)}”. Try a Strong’s number (G26), a transliteration (agape) or an English meaning (love).</div>`; return; }
  box.innerHTML=`<div class="lbl" style="padding:0 16px">${total} word${total===1?"":"s"}${total>hits.length?" — showing the 60 most used":""} · tap one to see its verses${SEARCH.scope==="all"?"":" in "+esc(scopeLabel())}</div>
    <div class="hw-list">${hits.map(e=>{ const ot=e[0][0]==="H"; return `<div class="hw" data-s="${esc(e[0])}">
      <button class="hw-head" aria-expanded="false"><span class="hw-l" lang="${ot?"he":"grc"}" dir="${ot?"rtl":"ltr"}">${esc(e[1])}</span>
        <span class="hw-m"><span class="hw-t">${esc(e[2])}</span><span class="hw-g">${esc(e[3])}</span></span>
        <span class="hw-n"><span class="ow-s">${esc(e[0])}</span><span>${e[4]}×</span></span></button><div class="hw-body"></div></div>`; }).join("")}</div>`
    +origCredit();
  box.querySelectorAll(".hw-head").forEach(h=>h.onclick=()=>toggleHeb(h.parentElement));
  if(hits.length===1) toggleHeb(box.querySelector(".hw"));
}
async function toggleHeb(card,shown=60){
  const head=card.querySelector(".hw-head"), body=card.querySelector(".hw-body"), s=card.dataset.s;
  if(head.getAttribute("aria-expanded")==="true"&&shown===60){ head.setAttribute("aria-expanded","false"); body.innerHTML=""; return; }
  head.setAttribute("aria-expanded","true"); body.innerHTML='<div class="empty">Loading…</div>';
  let e; try{ e=await loadLex(s); }catch(err){ body.innerHTML='<div class="empty">Couldn’t load the lexicon.</div>'; return; }
  const R=vrefs(), verses=[...new Set(decodeIds(e&&e.v))].map(i=>R[i]).filter(r=>r&&inScope(r));
  const list=verses.slice(0,shown);
  body.innerHTML=(e&&e.d?`<details class="hw-def"><summary>Definition</summary><div class="lex-def">${e.d}</div></details>`:"")
    +`<div class="lbl">${verses.length} verse${verses.length===1?"":"s"}${SEARCH.scope==="all"?"":" in "+esc(scopeLabel())}</div>`
    +(verses.length?"":`<div class="empty" style="padding:4px 0 10px">Not used in ${esc(scopeLabel())}.</div>`)
    +`<div class="lex-occ">${list.map(r=>{ const t=textOf(r); const prev=t.length>140?t.slice(0,140)+"…":t;
      return `<button class="occ-row" data-r="${esc(r)}"><span class="or">${esc(r)}</span><span class="ov">${verseHTML(prev||"(not in this translation)")}</span></button>`; }).join("")}</div>`
    +(verses.length>list.length?`<button class="btn-ghost lex-more">Show more (${verses.length-list.length} left)</button>`:"");
  body.querySelectorAll(".occ-row").forEach(b=>b.onclick=()=>gotoVerse(b.dataset.r));
  body.querySelectorAll(".lex-def a[data-r]").forEach(a=>{ a.href=verseLink(a.dataset.r); a.onclick=ev=>{ ev.preventDefault(); gotoVerse(a.dataset.r); }; });
  const more=body.querySelector(".lex-more"); if(more) more.onclick=()=>toggleHeb(card,shown+240);
}

/* ---------- Topics (Nave's) ---------- */
async function searchTopics(){
  const box=$("#results");
  box.innerHTML='<div class="empty">Loading Nave’s Topical Bible…</div>';
  try{ await loadTopics(); }catch(e){ box.innerHTML='<div class="empty">Couldn’t load the topics. Check your connection and try again.</div>'; return; }
  if(SEARCH.mode!=="topics") return;
  if(SEARCH.topic&&TOPIC_BY.has(SEARCH.topic)) paintTopic(SEARCH.topic); else { SEARCH.topic=null; paintTopicList(); }
}
async function paintTopicList(){
  const box=$("#results"); if(!box) return;
  const T=await loadTopics(), q=SEARCH.q.trim().toUpperCase();
  let list, head;
  if(q){
    const starts=[], has=[];
    T.forEach((t,i)=>{ const n=t[0].toUpperCase(); if(n.startsWith(q)) starts.push(i); else if(n.includes(q)) has.push(i); });
    list=[...starts,...has].slice(0,300);
    head=`<div class="lbl" style="padding:0 16px">${starts.length+has.length} topic${starts.length+has.length===1?"":"s"}</div>`;
    if(!list.length) head+=`<div class="empty">No topic named “${esc(SEARCH.q)}”. Try a shorter word, or search the text under Words.</div>`;
  }else{
    const letters=[...new Set(T.map(t=>t[0][0].toUpperCase()).filter(c=>/[A-Z]/.test(c)))];
    if(!letters.includes(SEARCH.letter)) SEARCH.letter=letters[0];
    list=T.map((t,i)=>i).filter(i=>T[i][0][0].toUpperCase()===SEARCH.letter);
    head=`<div class="topic-intro">Nave’s Topical Bible gathers what Scripture says on ${T.length.toLocaleString()} subjects — people, places, doctrines and daily life. Type a topic above, or browse:</div>
      <div class="az">${letters.map(c=>`<button class="${c===SEARCH.letter?"on":""}" data-l="${c}">${c}</button>`).join("")}</div>`;
  }
  box.innerHTML=head+`<div class="topic-list">${list.map(i=>{ const t=T[i], n=t[1].reduce((a,l)=>a+l[2].length,0);
    return `<button class="topic-row" data-t="${esc(t[0])}"><span>${esc(titleCase(t[0]))}</span><small>${n?n+" passage"+(n===1?"":"s"):"see also"}</small></button>`; }).join("")}</div>
    <div class="orig-credit" style="padding:12px 16px">Nave’s Topical Bible (Orville J. Nave, 1896), from <a href="https://github.com/BradyStephenson/bible-data" target="_blank" rel="noopener">BibleData</a> by Brady Stephenson, CC BY 4.0.</div>`;
  box.querySelectorAll(".az button").forEach(b=>b.onclick=()=>{ SEARCH.letter=b.dataset.l; paintTopicList(); });
  box.querySelectorAll(".topic-row").forEach(b=>b.onclick=()=>openTopic(b.dataset.t));
}
function openTopic(name){
  if(state.view==="search"&&SEARCH.mode==="topics"&&!SEARCH.topic){ const q=$("#q"); if(q) SEARCH.q=q.value.trim(); saveSearchRoute(); }  // back returns to this list as it is
  SEARCH.mode="topics"; SEARCH.topic=name;
  if(state.view!=="search"){ showView("search"); return; }   // renderSearch runs the topic
  setRoute(searchHash(),false);                              // its own history entry, so back returns to the list
  paintTopic(name);
}
const refLabel=r=>Array.isArray(r)?xrefLabel([r[0],0,r[1]]):vrefs()[r];
function paintTopic(name){
  const box=$("#results"), T=TOPICS_DATA, i=T&&TOPIC_BY.get(name); if(!box||i==null) return;
  const lines=T[i][1];
  box.innerHTML=`<div class="topic-page"><button class="lex-back" id="topicBack">‹ Topics</button>
    <h2 class="topic-title">${esc(titleCase(name))}</h2>
    ${lines.map((l,k)=>{
      const [d,label,refs,see]=l, caps=label&&!/[a-z]/.test(label);
      return `<div class="tl d${d}${caps?" caps":""}">`
        +(label?`<div class="tl-label">${see?`See <button class="link-btn tl-see" data-t="${esc(see)}">${esc(titleCase(see))}</button>`:esc(caps?titleCase(label):label)}</div>`:"")
        +(refs.length?`<div class="tl-refs">${refs.map(r=>`<a class="tref" href="${esc(verseLink(refLabel(r)))}" data-r="${esc(refLabel(r))}">${esc(refLabel(r))}</a>`).join("")}</div>
           <button class="link-btn tl-show" data-k="${k}">Read ${refs.length===1?"it":"these "+refs.length}</button><div class="tl-verses"></div>`:"")
        +`</div>`; }).join("")}
    <div class="orig-credit">Nave’s Topical Bible (1896), via BibleData by Brady Stephenson, CC BY 4.0.</div></div>`;
  $("#topicBack").onclick=()=>{ if(canGoBackInApp()&&location.hash.includes("t=")) history.back(); else { SEARCH.topic=null; saveSearchRoute(); paintTopicList(); } };
  box.querySelectorAll(".tl-see").forEach(b=>b.onclick=()=>openTopic(b.dataset.t));
  box.querySelectorAll("a.tref").forEach(a=>a.onclick=e=>{ e.preventDefault(); gotoVerse(a.dataset.r); });
  box.querySelectorAll(".tl-show").forEach(b=>b.onclick=()=>{
    const out=b.nextElementSibling;
    if(out.innerHTML){ out.innerHTML=""; b.textContent=b.dataset.label; return; }
    b.dataset.label=b.textContent; b.textContent="Hide";
    const refs=lines[+b.dataset.k][2], R=vrefs();
    out.innerHTML=refs.slice(0,40).map(r=>{
      const ids=Array.isArray(r)?Array.from({length:Math.min(r[1]-r[0]+1,12)},(_,j)=>r[0]+j):[r];
      const cut=Array.isArray(r)&&r[1]-r[0]+1>12;
      return `<button class="par-pass tv" data-r="${esc(refLabel(r))}"><div class="pr">${esc(refLabel(r))}</div><div class="pv">${ids.map(id=>`<span class="vn">${R[id].split(":")[1]}</span>${verseHTML(textOf(R[id])||"—")} `).join("")}${cut?"…":""}</div></button>`;
    }).join("")+(refs.length>40?`<div class="section-sub">First 40 of ${refs.length} — tap the references above for the rest.</div>`:"");
    out.querySelectorAll(".tv").forEach(x=>x.onclick=()=>gotoVerse(x.dataset.r));
  });
  window.scrollTo(0,0);
}

/* ---------- topics that cite a verse (bottom of the Cross-refs tab) ---------- */
function topicIndex(){
  if(TOPIC_REV) return TOPIC_REV;
  TOPIC_REV=new Map();
  const add=(id,ti,span)=>{ let a=TOPIC_REV.get(id); if(!a) TOPIC_REV.set(id,a=[]); a.push(ti*64+Math.min(span,63)); };
  TOPICS_DATA.forEach((t,ti)=>t[1].forEach(l=>l[2].forEach(r=>{
    if(!Array.isArray(r)) add(r,ti,1);
    else if(r[1]-r[0]<30) for(let id=r[0];id<=r[1];id++) add(id,ti,r[1]-r[0]+1);   // whole chapters are too broad to list
  })));
  return TOPIC_REV;
}
async function fillVerseTopics(ref){
  const box=document.getElementById("xTopics"); if(!box) return;
  try{ await loadTopics(); }catch(e){ return; }
  if(state.sheetRef!==ref||!document.getElementById("xTopics")) return;
  const id=vrefs().indexOf(ref); if(id<0) return;
  const best=new Map();
  for(const x of topicIndex().get(id)||[]){ const ti=Math.floor(x/64), span=x%64; if(!best.has(ti)||span<best.get(ti)) best.set(ti,span); }
  const list=[...best].sort((a,b)=>a[1]-b[1]||TOPICS_DATA[a[0]][0].localeCompare(TOPICS_DATA[b[0]][0])).slice(0,14);
  if(!list.length) return;
  box.innerHTML=`<div class="lbl" style="margin-top:14px">In Nave’s Topical Bible</div><div class="vtopics">${list.map(([ti])=>`<button class="chip" data-t="${esc(TOPICS_DATA[ti][0])}">${esc(titleCase(TOPICS_DATA[ti][0]))}</button>`).join("")}</div>`;
  box.querySelectorAll("button").forEach(b=>b.onclick=()=>{ closeSheet(); openTopic(b.dataset.t); });
}
