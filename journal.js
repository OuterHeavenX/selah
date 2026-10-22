"use strict";
/* Selah — a Bible journal (Home → Journal, #/journal, #/journal/<id>).
   Entries have a title, free text and any number of linked passages. Start one from a verse
   (Mark → Write in my journal) and it comes linked to that verse. Saves as you type.
   Stored as store "journal" = {id: {d: created ms, u: updated ms, t: title, b: body, r: [passages]}},
   synced and backed up through SYNC_STORES. Deleting keeps nothing: the entry becomes a sync tombstone. */

SYNC_STORES.push({key:"journal", prefix:"jn:", valid:v=>!!(v&&typeof v.b==="string"&&typeof v.t==="string"&&typeof v.d==="number"&&Array.isArray(v.r)&&v.r.every(x=>typeof x==="string")), onRemote:()=>{ if(state.view==="journal"&&!JN.open) renderJournal(); }});
const JN={open:null, q:"", saveT:0};
const jnAll=()=>store.get("journal",{});
const jnNewId=()=>Date.now().toString(36)+Math.random().toString(36).slice(2,6);
const SOAP=`Scripture — what does the passage say?\n\n\nObservation — what do I notice? What does it show about God?\n\n\nApplication — what will I do with it?\n\n\nPrayer — \n`;
EXTRA_VIEWS.journal=renderJournal;
HOME_TOOLS.push({go:"journal",open:()=>{ JN.open=null; },title:"Journal",sub:()=>{ const n=Object.keys(jnAll()).length; return n?`${n} entr${n===1?"y":"ies"}`:"Write what you’re learning"; }});
EXTRA_ROUTES.journal={hash:()=>"#/journal"+(JN.open?"/"+JN.open:""), apply:parts=>{ JN.open=parts[0]||null; }};

function jnNew(refs=[]){
  const id=jnNewId(), all=jnAll();
  all[id]={d:Date.now(),u:Date.now(),t:"",b:"",r:refs}; store.set("journal",all);
  return id;
}
function jnOpen(id){ JN.open=id; if(state.view!=="journal") showView("journal"); else { setRoute("#/journal/"+id,false); renderJournal(); } }
const jnDate=t=>new Date(t).toLocaleDateString(undefined,{weekday:"short",month:"short",day:"numeric",year:new Date(t).getFullYear()===new Date().getFullYear()?undefined:"numeric"});
const jnTitle=e=>e.t.trim()||(e.b.trim().split("\n")[0]||"Untitled").slice(0,70);

function renderJournal(){
  if(JN.open&&jnAll()[JN.open]) return renderEntry(JN.open);
  JN.open=null;
  const blank=Object.entries(jnAll()).filter(([,e])=>!e.t.trim()&&!e.b.trim()&&!e.r.length);
  if(blank.length&&!JN.pending){ const all=jnAll(); blank.forEach(([id])=>delete all[id]); store.set("journal",all); }
  const v=$("#view"), q=JN.q.trim().toLowerCase();
  const list=Object.entries(jnAll()).filter(([,e])=>!q||(e.t+" "+e.b+" "+e.r.join(" ")).toLowerCase().includes(q)).sort((a,b)=>b[1].d-a[1].d);
  const groups=[]; for(const [id,e] of list){ const k=new Date(e.d).toLocaleDateString(undefined,{month:"long",year:"numeric"}); let g=groups[groups.length-1]; if(!g||g.k!==k) groups.push(g={k,items:[]}); g.items.push([id,e]); }
  const total=Object.keys(jnAll()).length;
  v.innerHTML=`<div class="jn-screen">
    <div class="jn-head"><h2>Journal</h2><button class="btn-primary" id="jnNew">New entry</button></div>
    ${total>3?`<input id="jnQ" type="search" class="jn-q" placeholder="Search your journal" value="${esc(JN.q)}" aria-label="Search your journal">`:""}
    ${groups.map(g=>`<div class="lbl" style="padding:0 16px">${esc(g.k)}</div><div class="jn-list">${g.items.map(([id,e])=>`
      <button class="jn-card" data-id="${esc(id)}"><span class="jn-date">${esc(jnDate(e.d))}</span><span class="jn-title">${esc(jnTitle(e))}</span>
        ${e.b.trim()&&e.t.trim()?`<span class="jn-snip">${esc(e.b.trim().slice(0,140))}${e.b.trim().length>140?"…":""}</span>`:""}
        ${e.r.length?`<span class="jn-refs">${e.r.map(r=>`<i>${esc(r.replace(/-/g,"–"))}</i>`).join("")}</span>`:""}</button>`).join("")}</div>`).join("")
    ||(total?`<div class="empty">No entry mentions “${esc(JN.q)}”.</div>`
      :`<div class="jn-empty"><p>Write down what God is showing you as you read — a verse that stood out, a question, a prayer.</p><p>Start an entry here, or from any verse: tap it, then <b>Mark → Write in my journal</b>.</p></div>`)}
  </div>`;
  $("#jnNew").onclick=()=>jnOpen(jnNew());
  v.querySelectorAll(".jn-card").forEach(b=>b.onclick=()=>jnOpen(b.dataset.id));
  const qi=$("#jnQ"); if(qi) qi.oninput=()=>{ JN.q=qi.value; const p=qi.selectionStart; renderJournal(); const n=$("#jnQ"); n.focus(); n.setSelectionRange(p,p); };
}
function renderEntry(id){
  const v=$("#view"), e=jnAll()[id];
  v.innerHTML=`<div class="jn-screen jn-edit">
    <div class="jn-top"><button class="lex-back" id="jnBack">‹ Journal</button><span class="jn-saved" id="jnSaved">${esc(jnDate(e.d))}</span></div>
    <input id="jnT" class="jn-t" placeholder="Title" value="${esc(e.t)}" aria-label="Title">
    <div class="jn-refbar">${e.r.map((r,i)=>`<span class="jn-ref"><button class="jn-ref-go" data-r="${esc(r)}">${esc(r.replace(/-/g,"–"))}</button><button class="jn-ref-x" data-i="${i}" aria-label="Unlink ${esc(r)}">×</button></span>`).join("")}
      <form id="jnRefForm" class="jn-refadd"><input id="jnRefQ" placeholder="+ Link a passage" aria-label="Link a passage" autocomplete="off"></form></div>
    ${e.r.length?`<div class="jn-scripture">${e.r.slice(0,3).map(r=>{ const p=parsePassage(r), vs=p?passageVerses(p):[]; return vs.length?`<div><b>${esc(r.replace(/-/g,"–"))}</b> ${vs.slice(0,6).map(x=>verseHTML(x.text)).join(" ")}${vs.length>6?"…":""}</div>`:""; }).join("")}</div>`:""}
    <textarea id="jnB" class="jn-b" placeholder="What stood out to you? What is God saying? Write a prayer…" aria-label="Entry">${esc(e.b)}</textarea>
    <div class="jn-tools">${e.b.trim()?"":'<button class="btn-ghost" id="jnSoap">Use a guide (S.O.A.P.)</button>'}<button class="link-btn jn-del" id="jnDel">Delete entry</button></div>
  </div>`;
  // What was typed is captured at once, so the save still lands if the screen changes before it runs.
  const save=()=>{ const p=JN.pending; JN.pending=null; JN.saveT=0; if(!p) return; const all=jnAll(); if(!all[p.id]) return;
    all[p.id]={...all[p.id],t:p.t,b:p.b,u:Date.now()}; store.set("journal",all); const el=$("#jnSaved"); if(el) el.textContent="Saved"; };
  const later=()=>{ JN.pending={id,t:$("#jnT").value,b:$("#jnB").value}; $("#jnSaved").textContent="Saving…"; clearTimeout(JN.saveT); JN.saveT=setTimeout(save,600); };
  $("#jnT").oninput=later; $("#jnB").oninput=later;
  const flush=()=>{ if(JN.saveT){ clearTimeout(JN.saveT); JN.saveT=0; save(); } };
  $("#jnB").onblur=flush; $("#jnT").onblur=flush;
  const close=()=>{ flush(); const all=jnAll(); if(all[id]&&!all[id].t.trim()&&!all[id].b.trim()&&!all[id].r.length){ delete all[id]; store.set("journal",all); }
    if(canGoBackInApp()&&location.hash.startsWith("#/journal/")) history.back(); else { JN.open=null; setRoute("#/journal",true); renderJournal(); } };
  $("#jnBack").onclick=close;
  const soap=$("#jnSoap"); if(soap) soap.onclick=()=>{ $("#jnB").value=SOAP; soap.remove(); later(); flush(); $("#jnB").focus(); $("#jnB").setSelectionRange(SOAP.indexOf("\n")+1,SOAP.indexOf("\n")+1); };
  $("#jnRefForm").onsubmit=ev=>{ ev.preventDefault(); const raw=$("#jnRefQ").value; const r=(typeof memParse==="function"&&memParse(raw))||(parsePassage(raw.trim())&&passageVerses(parsePassage(raw.trim())).length?raw.trim():null);
    if(!r){ toast("Couldn’t find that passage — try “John 3:16”"); return; }
    flush(); const all=jnAll(); if(!all[id].r.includes(r)) all[id]={...all[id],r:[...all[id].r,r],u:Date.now()}; store.set("journal",all); renderEntry(id); };
  v.querySelectorAll(".jn-ref-x").forEach(b=>b.onclick=()=>{ flush(); const all=jnAll(); const r=[...all[id].r]; r.splice(+b.dataset.i,1); all[id]={...all[id],r,u:Date.now()}; store.set("journal",all); renderEntry(id); });
  v.querySelectorAll(".jn-ref-go").forEach(b=>b.onclick=()=>{ flush(); gotoVerse(b.dataset.r); });
  $("#jnDel").onclick=()=>{ const b=$("#jnDel");
    if(!b.dataset.armed){ b.dataset.armed=1; b.textContent="Tap again to delete"; setTimeout(()=>{ if(document.contains(b)){ delete b.dataset.armed; b.textContent="Delete entry"; } },3000); return; }
    clearTimeout(JN.saveT); JN.saveT=0; JN.pending=null; const all=jnAll(); delete all[id]; store.set("journal",all); toast("Entry deleted");
    if(canGoBackInApp()&&location.hash.startsWith("#/journal/")) history.back(); else { JN.open=null; renderJournal(); } };
  if(!e.b&&!e.t) $("#jnB").focus({preventScroll:true});
}
// Leaving the screen mid-edit still saves.
addEventListener("pagehide",()=>{ const p=JN.pending; if(!p) return; clearTimeout(JN.saveT); JN.pending=null; const all=jnAll(); if(all[p.id]){ all[p.id]={...all[p.id],t:p.t,b:p.b,u:Date.now()}; store.set("journal",all); } });

MARK_ACTIONS.push({
  html:ref=>{ const n=Object.values(jnAll()).filter(e=>e.r.includes(ref)).length; return `<button class="btn-ghost" id="jnFromVerse">Write in my journal${n?` · ${n} entr${n===1?"y":"ies"}`:""}</button>`; },
  bind:(body,ref)=>{ const b=body.querySelector("#jnFromVerse"); if(b) b.onclick=()=>{ closeSheet(); jnOpen(jnNew([ref])); }; }
});
