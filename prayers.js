"use strict";
/* Selah — prayer list.
   Stored as store "prayers" = {id: {t: request, d: created ms, u: updated ms, a: answered ms (0 = still praying),
   n: how it was answered, r: [passages], p: times prayed, l: last prayed ms}}. Synced and backed up like the journal. */

const PR={tab:"open", open:null};
const prAll=()=>store.get("prayers",{})||{};
const prNewId=()=>Date.now().toString(36)+Math.random().toString(36).slice(2,6);
SYNC_STORES.push({key:"prayers", prefix:"pr:", valid:v=>!!(v&&typeof v.t==="string"&&v.t.length<=4000&&typeof v.d==="number"&&typeof v.a==="number"&&Array.isArray(v.r)&&v.r.every(x=>typeof x==="string")),
  onRemote:()=>{ if(state.view==="prayers") renderPrayers(); }});
function prSave(id,patch){ const all=prAll(); if(!all[id]) return; all[id]={...all[id],...patch,u:Date.now()}; store.set("prayers",all); }
function prAdd(t,refs=[]){ const id=prNewId(), all=prAll(); all[id]={t, d:Date.now(), u:Date.now(), a:0, n:"", r:refs, p:0, l:0}; store.set("prayers",all); return id; }
const prDay=t=>new Date(t).toLocaleDateString(undefined,{month:"short",day:"numeric",year:new Date(t).getFullYear()===new Date().getFullYear()?undefined:"numeric"});
const prToday=t=>t&&new Date(t).toDateString()===new Date().toDateString();

EXTRA_VIEWS.prayers=renderPrayers;
HOME_TOOLS.push({go:"prayers",title:"Prayer list",open:()=>{ PR.open=null; },sub:()=>{ const v=Object.values(prAll()), o=v.filter(x=>!x.a).length, a=v.length-o; return v.length?`${o} praying · ${a} answered`:"Bring your requests to God"; }});
EXTRA_ROUTES.prayers={hash:()=>"#/prayers"+(PR.tab==="answered"?"/answered":""), apply:parts=>{ PR.tab=parts[0]==="answered"?"answered":"open"; }};

function renderPrayers(){
  const v=$("#view"), all=Object.entries(prAll());
  const open=all.filter(([,x])=>!x.a).sort((a,b)=>b[1].d-a[1].d), done=all.filter(([,x])=>x.a).sort((a,b)=>b[1].a-a[1].a);
  const list=PR.tab==="answered"?done:open;
  v.innerHTML=`<h2 class="section-title">Prayer list</h2>
  <div class="section-sub">“Be anxious for nothing; but in everything by prayer and supplication with thanksgiving let your requests be made known unto God.” — Philippians 4:6</div>
  <form class="pr-add" id="prForm"><textarea id="prText" rows="2" maxlength="4000" placeholder="What would you like to pray about?" aria-label="New prayer request"></textarea>
    <div class="pr-add-row"><input id="prRef" placeholder="Verse to pray with (optional)" aria-label="Verse to pray with" autocomplete="off"><button class="btn-primary" type="submit">Add</button></div>
    <div class="mem-msg" id="prMsg"></div></form>
  <div class="seg pr-tabs" role="tablist">${[["open",`Praying · ${open.length}`],["answered",`Answered · ${done.length}`]].map(([k,l])=>`<button role="tab" data-t="${k}" class="${PR.tab===k?"on":""}" aria-selected="${PR.tab===k}">${l}</button>`).join("")}</div>
  <div class="pr-list">${list.length?list.map(([id,x])=>prRowHTML(id,x)).join("")
    :`<div class="empty">${PR.tab==="answered"?"Answered prayers will be kept here — a record of God’s faithfulness.":"Nothing on your list yet. Add a request above, or from any verse: tap it → Mark → Pray this verse."}</div>`}</div>`;
  const msg=t=>{ $("#prMsg").textContent=t; };
  $("#prForm").onsubmit=e=>{ e.preventDefault();
    const t=$("#prText").value.trim(), rawRef=$("#prRef").value.trim();
    if(!t){ msg("Write your request first."); return; }
    let refs=[]; if(rawRef){ const p=parsePassage(rawRef); if(!p||!passageVerses(p).length){ msg("Couldn’t find that verse — try “Philippians 4:6”."); return; } refs=[rawRef.replace(/\s+/g," ")]; }
    prAdd(t,refs); PR.tab="open"; toast("Added to your prayer list"); renderPrayers(); };
  v.querySelectorAll(".pr-tabs button").forEach(b=>b.onclick=()=>{ PR.tab=b.dataset.t; PR.open=null; setRoute(EXTRA_ROUTES.prayers.hash(),true); renderPrayers(); });
  v.querySelectorAll(".pr-row").forEach(row=>bindPrayerRow(row));
}
function prRowHTML(id,x){
  const isOpen=PR.open===id;
  return `<div class="pr-row${x.a?" answered":""}${isOpen?" open":""}" data-id="${esc(id)}">
    <button class="pr-main" aria-expanded="${isOpen}"><span class="pr-t">${esc(x.t)}</span>
      <span class="pr-meta">${x.a?`Answered ${esc(prDay(x.a))}`:`Since ${esc(prDay(x.d))}`}${x.p?` · prayed ${x.p} time${x.p===1?"":"s"}`:""}${prToday(x.l)&&!x.a?" · today ✓":""}</span>
      ${x.a&&x.n?`<span class="pr-ans">${esc(x.n)}</span>`:""}</button>
    ${x.r.length?`<div class="pr-refs">${x.r.map(r=>`<button class="chip" data-r="${esc(r)}">${esc(r)}</button>`).join("")}</div>`:""}
    ${isOpen?`<div class="pr-edit">
      <textarea class="pr-et" rows="3" maxlength="4000" aria-label="Prayer request">${esc(x.t)}</textarea>
      ${x.a?`<textarea class="pr-en" rows="2" maxlength="2000" placeholder="How was it answered? (optional)" aria-label="How it was answered">${esc(x.n||"")}</textarea>`:""}
      <div class="pr-acts">
        ${x.a?`<button class="btn-ghost pr-reopen">Still praying</button>`:`<button class="btn-ghost pr-prayed"${prToday(x.l)?" disabled":""}>${prToday(x.l)?"Prayed today ✓":"I prayed today"}</button><button class="btn-primary pr-answer">Answered!</button>`}
        <button class="link-btn pr-del">Delete</button></div></div>`:""}
  </div>`;
}
function bindPrayerRow(row){
  const id=row.dataset.id, x=prAll()[id]; if(!x) return;
  row.querySelector(".pr-main").onclick=()=>{ PR.open=PR.open===id?null:id; renderPrayers(); };
  row.querySelectorAll(".pr-refs .chip").forEach(c=>c.onclick=()=>gotoVerse(c.dataset.r));
  const et=row.querySelector(".pr-et"); if(et) et.onchange=()=>{ const t=et.value.trim(); if(t) prSave(id,{t}); };
  const en=row.querySelector(".pr-en"); if(en) en.onchange=()=>prSave(id,{n:en.value.trim()});
  const q=s=>row.querySelector(s);
  if(q(".pr-prayed")) q(".pr-prayed").onclick=()=>{ prSave(id,{p:(x.p||0)+1,l:Date.now()}); toast("Amen"); renderPrayers(); };
  if(q(".pr-answer")) q(".pr-answer").onclick=()=>{ prSave(id,{a:Date.now()}); PR.tab="answered"; setRoute(EXTRA_ROUTES.prayers.hash(),true); toast("Praise God! Moved to Answered"); renderPrayers(); };
  if(q(".pr-reopen")) q(".pr-reopen").onclick=()=>{ prSave(id,{a:0}); PR.tab="open"; setRoute(EXTRA_ROUTES.prayers.hash(),true); renderPrayers(); };
  if(q(".pr-del")) q(".pr-del").onclick=()=>{ if(!confirm("Delete this prayer?")) return; const all=prAll(); delete all[id]; store.set("prayers",all); PR.open=null; renderPrayers(); };
}

/* ---------- from the verse sheet ---------- */
MARK_ACTIONS.push({
  html:ref=>`<button class="btn-ghost" id="prFromVerse">Pray this verse</button>`,
  bind:(body,ref)=>{ const b=body.querySelector("#prFromVerse"); if(!b) return;
    b.onclick=()=>{ const t=prompt(`What would you like to pray with ${ref}?`,""); if(t===null) return;
      const id=prAdd(t.trim()||`Praying ${ref}`,[ref]); PR.tab="open"; PR.open=id; toast("Added to your prayer list"); }; }
});
