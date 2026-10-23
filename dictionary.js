"use strict";
/* Selah — Bible dictionary: Easton's Bible Dictionary (1897) and Hitchcock's Bible Names, public domain.
   A fourth Search mode (#/search?m=dict&t=Aaron), and a row of entries for the people and places in each
   verse at the bottom of the Cross-refs tab.
   Data: data/dict/index.json {t:[[term, letter file, name meaning]]}, data/dict/<letter>.json {term: html}.
   Built by tools/build_dictionary.py. */

const DICT={index:null, byLc:null, files:{}};
HOME_TOOLS.push({go:"search",title:"Bible dictionary",open:()=>{ SEARCH.mode="dict"; SEARCH.topic=null; SEARCH.q=""; },sub:()=>"People, places and words · Easton’s"});
function loadDictIndex(){
  if(!DICT.index) DICT.index=getJSON("data/dict/index.json").then(d=>{ DICT.list=d.t; DICT.byLc=new Map(d.t.map(x=>[x[0].toLowerCase(),x])); return d.t; })
    .catch(e=>{ DICT.index=null; throw e; });
  return DICT.index;
}
const loadDictLetter=l=>DICT.files[l]||(DICT.files[l]=getJSON(`data/dict/${l}.json`).catch(e=>{ delete DICT.files[l]; throw e; }));
const DICT_CREDIT=`<div class="orig-credit" style="padding:12px 16px">Easton’s Bible Dictionary (M. G. Easton, 1897) and Hitchcock’s Bible Names, public domain, from the Christian Classics Ethereal Library.</div>`;

async function searchDict(){
  const box=$("#results");
  box.innerHTML='<div class="empty">Opening the dictionary…</div>';
  try{ await loadDictIndex(); }catch(e){ box.innerHTML='<div class="empty">Couldn’t load the dictionary. Check your connection and try again.</div>'; return; }
  if(SEARCH.mode!=="dict") return;
  if(SEARCH.topic&&DICT.byLc.has(SEARCH.topic.toLowerCase())) paintDictEntry(SEARCH.topic); else { SEARCH.topic=null; paintDictList(); }
}
async function paintDictList(){
  const box=$("#results"); if(!box) return;
  const T=await loadDictIndex(), q=SEARCH.q.trim().toLowerCase();
  let list, head;
  if(q){
    const starts=[], has=[];
    for(const t of T){ const n=t[0].toLowerCase(); if(n.startsWith(q)) starts.push(t); else if(n.includes(q)) has.push(t); }
    list=[...starts,...has].slice(0,300);
    head=`<div class="lbl" style="padding:0 16px">${starts.length+has.length} entr${starts.length+has.length===1?"y":"ies"}</div>`;
    if(!list.length) head+=`<div class="empty">Nothing in the dictionary for “${esc(SEARCH.q)}”. Try the start of the name, or search the text under Words.</div>`;
  }else{
    const letters=[...new Set(T.map(t=>t[0][0].toUpperCase()).filter(c=>/[A-Z]/.test(c)))];
    if(!letters.includes(SEARCH.letter)) SEARCH.letter=letters[0];
    list=T.filter(t=>t[0][0].toUpperCase()===SEARCH.letter);
    head=`<div class="topic-intro">Easton’s Bible Dictionary explains ${T.filter(t=>t[1]).length.toLocaleString()} people, places, customs and words of the Bible, with the meaning of ${T.filter(t=>t[2]).length.toLocaleString()} names. Type a word above, or browse:</div>
      <div class="az">${letters.map(c=>`<button class="${c===SEARCH.letter?"on":""}" data-l="${c}">${c}</button>`).join("")}</div>`;
  }
  box.innerHTML=head+`<div class="topic-list">${list.map(t=>`<button class="topic-row" data-t="${esc(t[0])}"><span>${esc(t[0])}</span><small>${esc(t[2]?t[2].slice(0,40):"")}</small></button>`).join("")}</div>`+DICT_CREDIT;
  box.querySelectorAll(".az button").forEach(b=>b.onclick=()=>{ SEARCH.letter=b.dataset.l; paintDictList(); });
  box.querySelectorAll(".topic-row").forEach(b=>b.onclick=()=>openDictTerm(b.dataset.t));
}
function openDictTerm(term){
  if(state.view==="search"&&SEARCH.mode==="dict"&&!SEARCH.topic){ const q=$("#q"); if(q) SEARCH.q=q.value.trim(); saveSearchRoute(); }
  SEARCH.mode="dict"; SEARCH.topic=term;
  if(state.view!=="search"){ showView("search"); return; }
  setRoute(searchHash(),false);
  paintDictEntry(term);
}
async function paintDictEntry(term){
  const box=$("#results"); if(!box) return;
  await loadDictIndex();
  const e=DICT.byLc.get(term.toLowerCase()); if(!e){ paintDictList(); return; }
  let body="";
  if(e[1]){
    box.innerHTML='<div class="empty">Opening the entry…</div>';
    try{ body=(await loadDictLetter(e[1]))[e[0]]||""; }catch(err){ box.innerHTML='<div class="empty">Couldn’t load this entry. Check your connection and try again.</div>'; return; }
    if(SEARCH.topic!==term) return;
  }
  box.innerHTML=`<div class="topic-page dict-page"><button class="lex-back" id="dictBack">‹ Dictionary</button>
    <h2 class="topic-title">${esc(e[0])}</h2>
    ${e[2]?`<div class="dict-means">Name means: <i>${esc(e[2])}</i></div>`:""}
    <div class="dict-body">${body||`<p>Easton’s has no article on ${esc(e[0])}; Hitchcock’s gives the meaning of the name above.</p>`}</div>
    <button class="link-btn" id="dictFind">Find “${esc(e[0])}” in the Bible</button></div>`+DICT_CREDIT;
  $("#dictBack").onclick=()=>{ if(canGoBackInApp()&&location.hash.includes("t=")) history.back(); else { SEARCH.topic=null; saveSearchRoute(); paintDictList(); } };
  box.querySelectorAll(".dict-body a[data-r]").forEach(a=>{ a.href=verseLink(a.dataset.r); a.onclick=ev=>{ ev.preventDefault(); gotoVerse(a.dataset.r); }; });
  box.querySelectorAll(".dict-body a[data-t]").forEach(a=>{ a.href="#"; a.onclick=ev=>{ ev.preventDefault(); openDictTerm(a.dataset.t); }; });
  $("#dictFind").onclick=()=>{ SEARCH.mode="words"; SEARCH.q=e[0].replace(/,.*$/,""); SEARCH.topic=null; SEARCH.run=true; renderSearch(); saveSearchRoute(); };
  window.scrollTo(0,0);
}

/* ---------- people and places in a verse (bottom of the Cross-refs tab) ---------- */
const DICT_SKIP=new Set(["god","lord","i","o","a","the","and","but","for","then","now","when","behold","verily","yea","thou","ye","he","she","his","him","they","we","my","our","your","it","in","of","to","so","that","this","these","who","what","which","therefore","and","let","if","as","not","all","there","be","is","said"]);
async function fillVerseDict(ref){
  const box=document.getElementById("xDict"); if(!box) return;
  const t=textOf(ref); if(!t) return;
  try{ await loadDictIndex(); }catch(e){ return; }
  if(state.sheetRef!==ref||!document.getElementById("xDict")) return;
  const words=t.match(/[A-Z][a-zæœ’']+(?:\s+[A-Z][a-z]+)?/g)||[], found=[];
  for(const w of words){
    const two=w.toLowerCase().replace(/’s$|'s$/,""), one=two.split(/\s+/)[0];
    for(const k of (two!==one?[two,one]:[one])){
      if(DICT_SKIP.has(k)) continue;
      const e=DICT.byLc.get(k); if(e&&!found.includes(e[0])){ found.push(e[0]); break; }
    }
  }
  if(!found.length) return;
  box.innerHTML=`<div class="lbl" style="margin-top:14px">In Easton’s Bible Dictionary</div><div class="vtopics">${found.slice(0,10).map(n=>`<button class="chip" data-t="${esc(n)}">${esc(n)}</button>`).join("")}</div>`;
  box.querySelectorAll("button").forEach(b=>b.onclick=()=>{ closeSheet(); openDictTerm(b.dataset.t); });
}
