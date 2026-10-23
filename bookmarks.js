"use strict";
/* Selah — bookmarks (ribbons you can name) and reading history.
   Bookmarks: store "bookmarks" = {id: {r: ref, n: name, d: created ms, u: updated ms}}, synced like memory verses.
   History: store "history" = [{b: book, c: chapter, t: ms}], newest first, this device only. */

const bmId=r=>r.replace(/[^A-Za-z0-9:-]+/g,"_");
const bmAll=()=>store.get("bookmarks",{})||{};
const bmHas=r=>!!bmAll()[bmId(r)];
SYNC_STORES.push({key:"bookmarks", prefix:"bm:", valid:v=>!!(v&&typeof v.r==="string"&&parseRef(v.r)&&typeof v.n==="string"&&v.n.length<=80&&typeof v.d==="number"), onRemote:()=>{ if(state.view==="bookmarks") renderBookmarks(); }});
function bmAdd(r){ const all=bmAll(); all[bmId(r)]={r, n:"", d:Date.now(), u:Date.now()}; store.set("bookmarks",all); }
function bmRemove(r){ const all=bmAll(); delete all[bmId(r)]; store.set("bookmarks",all); }
function bmRename(r,n){ const all=bmAll(), b=all[bmId(r)]; if(!b) return; b.n=n.slice(0,80); b.u=Date.now(); store.set("bookmarks",all); }
// Show or hide the ribbon on a verse already on screen.
function bmPaint(r){ document.querySelectorAll(".verse[data-ref]").forEach(el=>{ if(el.dataset.ref===r) el.classList.toggle("bm",bmHas(r)); }); }

/* ---------- reading history ---------- */
function recordHistory(book,ch){
  let h=store.get("history",[]); if(!Array.isArray(h)) h=[];
  if(h[0]&&h[0].b===book&&h[0].c===ch){ h[0].t=Date.now(); }
  else h=[{b:book,c:ch,t:Date.now()},...h.filter(x=>!(x.b===book&&x.c===ch))].slice(0,30);
  try{ localStorage.setItem("selah_history",JSON.stringify(h)); }catch(e){}   // not synced: skips the sync hook
}
const historyList=()=>{ const h=store.get("history",[]); return Array.isArray(h)?h.filter(x=>x&&BOOKS.some(b=>b.name===x.b)):[]; };
const chLabel=(b,c)=>`${b==="Psalms"?"Psalm":b} ${c}`;

/* ---------- screen ---------- */
EXTRA_VIEWS.bookmarks=renderBookmarks;
HOME_TOOLS.push({go:"bookmarks",title:"Bookmarks",sub:()=>{ const n=Object.keys(bmAll()).length; return n?`${n} bookmark${n===1?"":"s"} · recent reading`:"Ribbons and recent reading"; }});
function renderBookmarks(){
  const v=$("#view");
  const all=Object.values(bmAll()).sort((a,b)=>b.d-a.d);
  const hist=historyList().slice(0,20);
  const ago=t=>{ const d=Math.floor((Date.now()-t)/864e5); return d<1?"today":d<2?"yesterday":d<7?d+" days ago":new Date(t).toLocaleDateString(undefined,{month:"short",day:"numeric"}); };
  v.innerHTML=`<h2 class="section-title">Bookmarks</h2>
  <div class="section-sub">Ribbons you’ve placed, and the chapters you’ve read lately. Add a bookmark from any verse: tap it → Mark → Bookmark.</div>
  ${all.length?`<div class="bm-list">${all.map(b=>`
    <div class="bm-row"><button class="bm-main" data-r="${esc(b.r)}"><span class="bm-rib" aria-hidden="true"></span>
      <span class="bm-txt"><b>${esc(b.n||b.r)}</b>${b.n?`<small>${esc(b.r)}</small>`:""}<span class="bm-snip">${verseHTML((textOf(b.r)||"").slice(0,120))}${(textOf(b.r)||"").length>120?"…":""}</span></span></button>
      <button class="bm-x" data-r="${esc(b.r)}" aria-label="Remove bookmark ${esc(b.r)}">✕</button></div>`).join("")}</div>`
    :`<div class="empty" style="padding:6px 16px 4px">No bookmarks yet.</div>`}
  <div class="lbl" style="padding:18px 16px 0">Recently read</div>
  ${hist.length?`<div class="hist-list">${hist.map(x=>`<button class="hist-row" data-b="${esc(x.b)}" data-c="${x.c}"><span>${esc(chLabel(x.b,x.c))}</span><small>${ago(x.t)}</small></button>`).join("")}</div>
    <button class="link-btn" id="histClear" style="margin:4px 16px">Clear history</button>`
    :`<div class="empty" style="padding:6px 16px">Chapters you read will appear here.</div>`}`;
  v.querySelectorAll(".bm-main").forEach(b=>b.onclick=()=>gotoVerse(b.dataset.r));
  v.querySelectorAll(".bm-x").forEach(b=>b.onclick=()=>{ bmRemove(b.dataset.r); toast("Bookmark removed"); renderBookmarks(); });
  v.querySelectorAll(".hist-row").forEach(b=>b.onclick=()=>{ state.book=b.dataset.b; state.ch=+b.dataset.c; savePos(); showView("read"); });
  const hc=v.querySelector("#histClear"); if(hc) hc.onclick=()=>{ if(confirm("Clear your reading history on this device?")){ try{ localStorage.removeItem("selah_history"); }catch(e){} renderBookmarks(); } };
}

/* ---------- from the verse sheet ---------- */
MARK_ACTIONS.push({
  html:ref=>{ const b=bmAll()[bmId(ref)];
    return b?`<div class="bm-mark"><button class="btn-ghost" id="bmToggle">✓ Bookmarked — remove</button>
      <input id="bmName" class="bm-name" maxlength="80" placeholder="Name it (optional) — e.g. “Where I stopped”" value="${esc(b.n)}" aria-label="Bookmark name"></div>`
      :`<button class="btn-ghost" id="bmToggle">Bookmark this verse</button>`; },
  bind:(body,ref)=>{
    const b=body.querySelector("#bmToggle"); if(!b) return;
    b.onclick=()=>{ if(bmHas(ref)){ bmRemove(ref); toast("Bookmark removed"); } else { bmAdd(ref); toast("Bookmarked"); }
      bmPaint(ref); paintSheet(); };
    const n=body.querySelector("#bmName"); if(n) n.onchange=()=>bmRename(ref,n.value.trim());
  }
});
