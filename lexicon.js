"use strict";
/* Selah — original-language words and lexicon.
   data/orig/NN.json  (one per Bible book, NN = 01..66): {"C:V": [[word, translit, gloss, strong, morph, flag?], ...]}
                      Psalm titles are stored as verse "C:0". flag "q" = Qere reading, "v" = not in the oldest Greek manuscripts.
   data/lex/XNN.json  (bucketed by Strong's number / 200): {strong: {l lemma, t translit, p part of speech, g gloss,
                      d definition (pre-sanitised: <b> <i> <br> <a data-r>), n uses, v verse ids delta-coded in base 36, a alias?}}
   Data: STEPBible.org (Tyndale House, Cambridge), CC BY 4.0. */

const ORIG={}, LEXB={};   // vrefs() (verse id -> ref) lives in app.js
const LEX_PAGE=60;
const lexState={ref:null, strong:null, word:null, shown:LEX_PAGE};

function bookNum(name){ return BOOKS.findIndex(b=>b.name===name)+1; }
function isOT(name){ return bookNum(name)<=39; }
async function loadOrig(name){
  const n=bookNum(name);
  if(!ORIG[n]) ORIG[n]=getJSON(`data/orig/${String(n).padStart(2,"0")}.json`).catch(e=>{ delete ORIG[n]; throw e; });
  return ORIG[n];
}
const lexBucket=s=>s[0]+String(Math.floor(parseInt(s.slice(1,5),10)/200)).padStart(2,"0");
async function loadLex(strong){
  const b=lexBucket(strong);
  if(!LEXB[b]) LEXB[b]=getJSON(`data/lex/${b}.json`).catch(e=>{ delete LEXB[b]; throw e; });
  return (await LEXB[b])[strong]||null;
}
function decodeIds(s){
  if(!s) return [];
  let x=0; return s.split(",").map(d=>(x+=parseInt(d,36)));
}

/* ---------- parsing codes, in plain words ---------- */
const G_POS={N:"noun",V:"verb",A:"adjective",T:"article",P:"personal pronoun",R:"relative pronoun",D:"demonstrative pronoun",
  C:"reciprocal pronoun",F:"reflexive pronoun",I:"interrogative pronoun",K:"correlative pronoun",Q:"correlative pronoun",
  S:"possessive pronoun",X:"indefinite pronoun",ADV:"adverb",CONJ:"conjunction",PREP:"preposition",PRT:"particle",
  INJ:"interjection",COND:"conditional",HEB:"Hebrew word",ARAM:"Aramaic word"};
const G_CASE={N:"nominative",G:"genitive",D:"dative",A:"accusative",V:"vocative"};
const G_NUM={S:"singular",P:"plural"}, G_GEN={M:"masculine",F:"feminine",N:"neuter"};
const G_TENSE={P:"present",I:"imperfect",F:"future",A:"aorist",R:"perfect",L:"pluperfect"};
const G_VOICE={A:"active",M:"middle",P:"passive",E:"middle/passive",D:"middle (deponent)",O:"passive (deponent)",N:"middle/passive (deponent)"};
const G_MOOD={I:"indicative",S:"subjunctive",O:"optative",M:"imperative",N:"infinitive",P:"participle"};
const PERS={1:"1st person",2:"2nd person",3:"3rd person"};
function decodeGreek(m){
  if(!m) return "";
  const parts=m.split("-"), pos=parts[0];
  if(pos==="V"){
    const tvm=parts[1]||"", t=tvm.match(/^(2?)([PIFARL])([AMPEDON])([ISOMNP])$/);
    let out=["verb"];
    if(t){ out.push((t[1]?"2nd ":"")+G_TENSE[t[2]], G_VOICE[t[3]], G_MOOD[t[4]]); }
    const rest=parts[2]||"";
    let r=rest.match(/^([123])([SP])$/); if(r) out.push(PERS[r[1]]+" "+G_NUM[r[2]]);
    r=rest.match(/^([NGDAV])([SP])([MFN])$/); if(r) out.push(G_CASE[r[1]],G_NUM[r[2]],G_GEN[r[3]]);
    return out.filter(Boolean).join(", ");
  }
  const out=[G_POS[pos]||pos];
  const body=(parts[1]||"").replace(/^[123]/,d=>{ out.push(PERS[d]); return ""; });
  const r=body.match(/^([NGDAV])([SP])([MFN])?/);
  if(r) out.push(G_CASE[r[1]],G_NUM[r[2]],G_GEN[r[3]]);
  else if(parts[1]==="PRI") out.push("proper name, indeclinable");
  const tag=parts[2];
  if(tag==="P") out.push("name"); else if(tag==="L") out.push("place"); else if(tag==="T") out.push("title");
  else if(tag==="C") out.push("comparative"); else if(tag==="S") out.push("superlative");
  return out.filter(Boolean).join(", ");
}
const H_STEM={q:"Qal",N:"Niphal",p:"Piel",P:"Pual",h:"Hiphil",H:"Hophal",t:"Hithpael",o:"Polel",O:"Polal",r:"Hithpolel",
  m:"Poel",M:"Poal",k:"Palel",K:"Pulal",Q:"Qal passive",l:"Pilpel",L:"Polpal",f:"Hithpalpel",D:"Nithpael",j:"Pealal",
  i:"Pilel",u:"Hothpaal",c:"Tiphil",v:"Hishtaphel",w:"Nithpalel",y:"Nithpoel",z:"Hithpoel"};
// Aramaic (Daniel, Ezra) stems use their own letters in the same position.
const A_STEM={q:"Peal",Q:"Peil",u:"Hithpeel",p:"Pael",P:"Ithpaal",M:"Hithpaal",a:"Aphel",h:"Haphel",s:"Saphel",e:"Shaphel",
  H:"Hophal",i:"Ithpeel",t:"Hishtaphel",v:"Ishtaphel",w:"Hithaphel",o:"Polel",z:"Ithpoel",r:"Hithpolel",f:"Hithpalpel",
  b:"Hephal",c:"Tiphel",m:"Poel",l:"Palpel",L:"Ithpalpel",O:"Ithpolel",G:"Ittaphal"};
const H_CONJ={p:"perfect",q:"sequential perfect",i:"imperfect",w:"sequential imperfect",h:"cohortative",j:"jussive",
  v:"imperative",r:"participle (active)",s:"participle (passive)",a:"infinitive absolute",c:"infinitive construct"};
const H_GEN={m:"masculine",f:"feminine",b:"both genders",c:"common"}, H_NUM={s:"singular",p:"plural",d:"dual"};
const H_STATE={a:"absolute",c:"construct",d:"determined"};
const H_SUB={Aa:"adjective",Ac:"number",Ag:"gentilic adjective",Ao:"ordinal number",Nc:"noun",Ng:"gentilic noun",
  Np:"proper name",Pd:"demonstrative pronoun",Pf:"indefinite pronoun",Pi:"interrogative pronoun",Pp:"personal pronoun",
  Pr:"relative pronoun",Rd:"preposition with article",Ta:"affirmation",Td:"definite article",Te:"exhortation",
  Ti:"interrogative",Tj:"interjection",Tm:"demonstrative particle",Tn:"negative",To:"object marker",Tr:"relative particle",
  Sd:"directional ending",Sh:"paragogic he",Sn:"paragogic nun",Sp:"pronominal suffix"};
const H_TOP={A:"adjective",C:"conjunction",D:"adverb",N:"noun",P:"pronoun",R:"preposition",S:"suffix",T:"particle",V:"verb"};
function gnsDecode(s,out){
  // trailing person/gender/number/state letters, e.g. "3ms", "fsa", "mpc"
  const r=s.match(/^([123])?([mfbc])?([spd])?([acd])?$/);
  if(!r) return;
  if(r[1]) out.push(PERS[r[1]]); if(r[2]) out.push(H_GEN[r[2]]); if(r[3]) out.push(H_NUM[r[3]]); if(r[4]) out.push(H_STATE[r[4]]);
}
function decodeHebrew(m){
  if(!m) return "";
  const lang=m[0]==="A"?"Aramaic":"Hebrew"; const s=m.slice(1);
  const out=[];
  if(s[0]==="V"){
    out.push(lang+" verb", (lang==="Aramaic"?A_STEM:H_STEM)[s[1]]||"", H_CONJ[s[2]]||"");
    gnsDecode(s.slice(3),out);
  }else{
    const sub=H_SUB[s.slice(0,2)];
    if(sub){ out.push(lang+" "+sub);
      let rest=s.slice(2);
      if(s.slice(0,2)==="Np"){ const k={m:"of a man",f:"of a woman",l:"of a place",t:"title"}[rest[0]]; if(k) out[0]+=" "+k; rest=""; }
      gnsDecode(rest,out);
    }else out.push(lang+" "+(H_TOP[s[0]]||s));
  }
  return out.filter(Boolean).join(", ");
}
function decodeMorph(m,strong){ return strong[0]==="G"?decodeGreek(m):decodeHebrew(m); }
function posLabel(p){
  // lexicon part of speech, e.g. "G:V", "H:N-M"
  const [lang,rest]=(p||"").split(":"); if(!rest) return "";
  const [pos,gen]=rest.split("-");
  const name={N:"noun",V:"verb",A:"adjective",ADV:"adverb",CONJ:"conjunction",PREP:"preposition",PRT:"particle",
    INJ:"interjection",T:"article",P:"pronoun",R:"pronoun",D:"pronoun",Adv:"adverb",Conj:"conjunction",Prep:"preposition",
    Prt:"particle",Intj:"interjection"}[pos]||pos.toLowerCase();
  const g={M:"masculine",F:"feminine",N:"neuter"}[gen];
  return [lang==="H"?"Hebrew":lang==="A"?"Aramaic":"Greek", g?g+" "+name:name].join(" ");
}

/* ---------- the Original tab ---------- */
async function paintOriginal(body,ref){
  const p=parseRef(ref); if(!p){ body.innerHTML='<div class="empty">—</div>'; return; }
  if(lexState.ref!==ref){ lexState.ref=ref; lexState.strong=null; }
  if(lexState.strong) return paintLexEntry(body);
  body.innerHTML='<div class="empty">Loading the original text…</div>';
  let book;
  try{ book=await loadOrig(p.book); }
  catch(e){ body.innerHTML='<div class="empty">Couldn’t load the original text. Check your connection and try again.</div>'; return; }
  if(state.sheetRef!==ref||state.sheetTab!=="original") return;           // user moved on while loading
  const ot=isOT(p.book), words=book[`${p.ch}:${p.v}`]||[], title=p.v===1?(book[`${p.ch}:0`]||[]):[];
  const lang=ot?"Hebrew":"Greek";
  if(!words.length&&!title.length){
    body.innerHTML=`<div class="empty">${ot
      ?"This verse isn’t in the Leningrad Codex, the Hebrew manuscript this text follows. Other Hebrew manuscripts and the Greek Old Testament include it."
      :"No Greek text is recorded for this verse."}</div>`+origCredit();
    return;
  }
  const rows=(list,offset)=>list.map((w,i)=>{
    const [o,t,g,s,,f]=w;
    return `<button class="ow${f==="v"?" var":""}" data-i="${offset+i}">
      <span class="ow-o" lang="${ot?"he":"grc"}" dir="${ot?"rtl":"ltr"}">${esc(o)}</span>
      <span class="ow-m"><span class="ow-t">${esc(t)}</span><span class="ow-g">${esc(g)}</span></span>
      <span class="ow-s">${esc(s)}</span></button>`;
  }).join("");
  const all=[...title,...words];
  const line=all.map(w=>esc(w[0])).join(" ");
  const hasVar=words.some(w=>w[5]==="v"), hasQ=all.some(w=>w[5]==="q");
  body.innerHTML=`<div class="orig-line" lang="${ot?"he":"grc"}" dir="${ot?"rtl":"ltr"}">${line}</div>
    <div class="lbl">${lang} · ${ot?"read right to left · ":""}tap a word for its lexicon entry</div>`
    +(title.length?`<div class="orig-sub">Psalm title</div><div class="ow-list">${rows(title,0)}</div><div class="orig-sub">Verse ${p.v}</div>`:"")
    +`<div class="ow-list">${rows(words,title.length)}</div>`
    +(hasVar?`<div class="orig-note">Faded words are in later Greek manuscripts (the text behind the KJV) but not in the oldest ones, which the ASV follows.</div>`:"")
    +(hasQ?`<div class="orig-note">Some words are the <i>qere</i> — the reading Jewish scribes marked to be read aloud in place of the written text.</div>`:"")
    +origCredit();
  body.querySelectorAll(".ow").forEach(b=>b.onclick=()=>{
    const w=all[+b.dataset.i]; if(!w[3]) return;
    lexState.strong=w[3]; lexState.word=w; lexState.shown=LEX_PAGE; paintLexEntry(body);
  });
}
function origCredit(){
  return `<div class="orig-credit">Hebrew and Greek text, glosses and lexicons: <a href="https://www.stepbible.org" target="_blank" rel="noopener">STEPBible.org</a> (Tyndale House, Cambridge), CC BY 4.0.</div>`;
}
async function paintLexEntry(body){
  const ref=lexState.ref, strong=lexState.strong, w=lexState.word;
  body.innerHTML='<div class="empty">Loading the lexicon…</div>';
  let e;
  try{ e=await loadLex(strong); }
  catch(err){ if(state.sheetRef===ref&&state.sheetTab==="original") body.innerHTML='<div class="empty">Couldn’t load the lexicon. Check your connection and try again.</div>'; return; }
  if(state.sheetRef!==ref||lexState.strong!==strong||state.sheetTab!=="original") return;
  const ot=strong[0]==="H";
  const ids=decodeIds(e&&e.v), refs=vrefs();
  const verses=[...new Set(ids)].map(i=>refs[i]).filter(Boolean);
  const shown=verses.slice(0,lexState.shown);
  const parsing=w?decodeMorph(w[4],strong):"";
  body.innerHTML=`<button class="lex-back" id="lexBack">‹ ${esc(ref)}</button>
    <div class="lex-head">
      <div class="lex-lemma" lang="${ot?"he":"grc"}" dir="${ot?"rtl":"ltr"}">${esc(e?e.l:w[0])}</div>
      <div class="lex-tr">${esc(e?e.t:"")}</div>
      <div class="lex-gloss">${esc(e?e.g.replace(/^:\s*/,""):"")}</div>
      <div class="lex-meta"><span class="ow-s">${esc(strong)}</span>${e&&e.p?`<span>${esc(posLabel(e.p))}</span>`:""}</div>
    </div>`
    +(w?`<div class="lex-form"><div class="lbl">In ${esc(ref)}</div>
        <div><span class="lex-formword" lang="${ot?"he":"grc"}" dir="${ot?"rtl":"ltr"}">${esc(w[0])}</span> <i>${esc(w[1])}</i> — “${esc(w[2])}”</div>
        ${parsing?`<div class="lex-parse">${esc(parsing)}</div>`:""}</div>`:"")
    +(e&&e.d?`<div class="lbl">Definition</div><div class="lex-def">${e.d}</div>`:"")
    +`<div class="lbl">${e?e.n:0} use${e&&e.n===1?"":"s"} in ${verses.length} verse${verses.length===1?"":"s"}</div>
    <div class="lex-occ">${shown.map(r=>{
      const t=textOf(r); const prev=t.length>120?t.slice(0,120)+"…":t;
      return `<button class="occ-row${r===ref?" here":""}" data-r="${esc(r)}"><span class="or">${esc(r)}</span><span class="ov">${verseHTML(prev||"(not in this translation)")}</span></button>`;
    }).join("")}</div>`
    +(verses.length>shown.length?`<button class="btn-ghost lex-more" id="lexMore">Show more (${verses.length-shown.length} left)</button>`:"")
    +origCredit();
  $("#lexBack").onclick=()=>{ lexState.strong=null; paintOriginal(body,ref); };
  const more=$("#lexMore"); if(more) more.onclick=()=>{ const y=body.scrollTop; lexState.shown+=LEX_PAGE*2; paintLexEntry(body).then(()=>{ body.scrollTop=y; }); };
  body.querySelectorAll(".occ-row").forEach(b=>b.onclick=()=>gotoVerse(b.dataset.r));
  body.querySelectorAll(".lex-def a[data-r]").forEach(a=>{ a.href="#"; a.onclick=ev=>{ ev.preventDefault(); gotoVerse(a.dataset.r); }; });
  body.scrollTop=0;
}
