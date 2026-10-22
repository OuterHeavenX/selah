"use strict";
/* Selah — addresses and the back button.
   Every screen has its own address, so links can be shared and the phone's back button works:
     #/home   #/read/John/3   #/read/John/3/16   #/read/1_John/4/7-12   #/search?q=grace
     #/christ   #/images/Genesis   #/plans   #/saved
   The verse sheet and the picture viewer add a history entry while they're open, so "back" closes them. */

const ROUTER={applying:false, ready:false};
const slugBook=b=>b.replace(/ /g,"_");
const unslugBook=s=>decodeURIComponent(s).replace(/_/g," ");
function readHash(book,ch,v,v2){
  return `#/read/${slugBook(book)}/${ch}`+(v?`/${v}`+(v2&&v2!==v?`-${v2}`:""):"");
}
function routeFor(v){
  if(v==="read") return readHash(state.book,state.ch);
  if(v==="images") return "#/images/"+slugBook(store.get("picBook","Genesis"));
  if(v==="search"){ const q=(document.getElementById("q")||{}).value; return "#/search"+(q?"?q="+encodeURIComponent(q):""); }
  return "#/"+v;
}
// Record a new address. replace=true updates the current entry (used for chapter turns inside the reader).
function setRoute(hash,replace){
  if(!ROUTER.ready||ROUTER.applying) return;
  const st=history.state||{};
  if(st.overlay) replace=true;                       // never stack pages on top of an open sheet's entry
  if(location.hash===hash&&!st.overlay) return;
  history[replace?"replaceState":"pushState"]({selah:1},"",hash);
}
function routeView(v){ setRoute(routeFor(v),false); }
function routeChapter(){ if(state.view==="read") setRoute(readHash(state.book,state.ch),true); }
function routeVerse(p){
  if(!p) return;
  const v2=p.ch2===p.ch&&p.v2!==9999?p.v2:null;
  setRoute(readHash(p.book,p.ch,p.v1,v2),true);
}
// Overlays (verse sheet, picture viewer): one history entry each, removed again when closed by the user.
function pushOverlay(kind){
  if(!ROUTER.ready||ROUTER.applying) return;
  if((history.state||{}).overlay===kind) return;
  history.pushState({selah:1,overlay:kind},"",location.hash);
}
function dismissOverlay(kind,close){
  if((history.state||{}).overlay===kind) history.back();   // popstate will close it
  else close();
}

function applyRoute(hash){
  const m=(hash||"").match(/^#\/([a-z]+)(?:\/([^?]*))?(?:\?(.*))?$/);
  if(!m){ showView("home"); return; }
  const [,view,rest="",query=""]=m, parts=rest.split("/").filter(Boolean);
  ROUTER.applying=true;
  try{
    if(view==="read"&&parts.length){
      const book=unslugBook(parts[0]);
      if(!BOOKS.some(b=>b.name===book)){ showView("read"); return; }
      const ch=Math.max(1,+parts[1]||1);
      if(parts[2]){ gotoVerse(`${book} ${ch}:${parts[2]}`); return; }
      state.book=book; state.ch=ch; savePos();
      if(state.view==="read"&&document.querySelector(".reader-nav")) renderRead(); else showView("read");
      return;
    }
    if(view==="images"&&parts[0]) store.set("picBook",unslugBook(parts[0]));
    const views=["home","read","search","christ","images","saved","plans"];
    showView(views.includes(view)?view:"home");
    if(view==="search"&&query){
      const q=new URLSearchParams(query).get("q");
      if(q){ $("#q").value=q; $("#go").click(); }
    }
  }finally{ ROUTER.applying=false; }
}
addEventListener("popstate",()=>{
  // Back closes an open overlay first.
  if(!$("#lightbox").classList.contains("hidden")){ ROUTER.applying=true; closeLightbox(); ROUTER.applying=false; return; }
  if(!$("#settingsWrap").classList.contains("hidden")){ ROUTER.applying=true; closeSettings(); ROUTER.applying=false; return; }
  if(state.sheetRef){ ROUTER.applying=true; closeSheet(); ROUTER.applying=false; return; }
  if(location.hash.startsWith("#/")) applyRoute(location.hash);
});
// Called once at boot: open whatever the address asks for (a shared verse link, a bookmark).
function startRouter(){
  const h=location.hash.startsWith("#/")?location.hash:"#/home";
  history.replaceState({selah:1},"",h);
  ROUTER.ready=true;
  applyRoute(h);
}
function verseLink(ref){
  const p=parsePassage(ref); if(!p) return location.href;
  const v2=p.ch2===p.ch&&p.v2!==9999?p.v2:null;
  return location.origin+location.pathname+readHash(p.book,p.ch,p.v1,v2);
}
