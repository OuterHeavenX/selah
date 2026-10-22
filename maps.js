"use strict";
/* Selah — Bible maps.
   A parchment map of the biblical world with every identifiable place (OpenBible.info geocoding, CC BY 4.0)
   over Natural Earth coastlines and rivers (public domain). Three ways in:
     Places        search any place; tap one for where it is, how sure scholars are, and every verse naming it
     Journeys      Abraham, the Exodus, Paul's three journeys and his voyage to Rome, stop by stop
     This chapter  the places named in the chapter you're reading
   Addresses: #/maps  #/maps/place/<id>  #/maps/journey/<id>  #/maps/chapter
   Data: data/mapbase.json, data/places.json (tools/build_maps.py). */

const MAP={base:null, places:null, byId:null, journeys:null, rank:null,
  mode:store.get("mapMode","places"), sel:null, journey:null, q:"", vb:null, full:null, labelsT:0, anim:0};
const PLACE_AREA=new Set(["region","natural area","people group","body of water","wilderness","sea"]);
const CONF_LABEL=["Location uncertain","Probable location","Location known"];
let MAP_LOADING=null;
function loadMaps(){
  if(!MAP_LOADING) MAP_LOADING=Promise.all([getJSON("data/mapbase.json"),getJSON("data/places.json")]).then(([b,d])=>{
    MAP.base=b;
    MAP.places=d.p.map(r=>({id:r[0],name:r[1],x:r[2],y:r[3],type:r[4],conf:r[5],alt:r[6],modern:r[7],v:r[8],slug:r[9]||"",
      area:PLACE_AREA.has(r[4]), w:r[8].length*(r[5]+1)}));
    MAP.byId=new Map(MAP.places.map(p=>[p.id,p]));
    MAP.journeys=d.j.map(([id,title,range,stops])=>({id,title,range,stops:stops.map(([pid,ref])=>({p:MAP.byId.get(pid),ref}))}));
    const order=[...MAP.places].sort((a,b)=>b.w-a.w); order.forEach((p,i)=>p.rank=i);
    MAP.full={x:0,y:0,w:b.w,h:b.h};
  }).catch(e=>{ MAP_LOADING=null; throw e; });
  return MAP_LOADING;
}
const onMap=p=>p.x>=0&&p.y>=0&&p.x<=MAP.base.w&&p.y<=MAP.base.h;

/* ---------- address ---------- */
function mapHash(){
  if(MAP.sel) return "#/maps/place/"+MAP.sel;
  if(MAP.mode==="journeys"&&MAP.journey) return "#/maps/journey/"+MAP.journey;
  if(MAP.mode==="chapter") return "#/maps/chapter";
  if(MAP.mode==="journeys") return "#/maps/journeys";
  return "#/maps";
}
EXTRA_ROUTES.maps={hash:mapHash, apply:(parts)=>{
  MAP.sel=null; MAP.journey=null;
  if(parts[0]==="place"&&parts[1]) MAP.sel=parts[1];
  else if(parts[0]==="journey"&&parts[1]){ MAP.mode="journeys"; MAP.journey=parts[1]; }
  else if(parts[0]==="journeys") MAP.mode="journeys";
  else if(parts[0]==="chapter") MAP.mode="chapter";
  else MAP.mode="places";
  MAP.fit=true;
}};
function mapRoute(push){ setRoute(mapHash(),!push); }
function openPlace(id){
  MAP.sel=id; MAP.fit=true;
  if(state.view!=="maps") showView("maps");
  else { mapRoute(true); paintMapPanel(); focusPlace(MAP.byId.get(id)); drawMapMarks(); }
}

/* ---------- screen ---------- */
EXTRA_VIEWS.maps=renderMaps;
HOME_TOOLS.push({go:"maps",title:"Maps",sub:()=>"Places, journeys, this chapter"});
async function renderMaps(){
  const v=$("#view");
  v.innerHTML=`<div class="map-screen"><div class="map-stage" id="mapStage"><div class="loading">Unrolling the map…</div></div><aside class="map-panel" id="mapPanel"></aside></div>`;
  sizeMap();
  try{ await loadMaps(); }catch(e){ $("#mapStage").innerHTML='<div class="loading">Couldn’t load the map. Check your connection and try again.</div>'; return; }
  if(state.view!=="maps") return;
  const B=MAP.base;
  $("#mapStage").innerHTML=`<svg id="mapSvg" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Map of the biblical world" preserveAspectRatio="xMidYMid meet">
      <rect class="m-sea" x="-4000" y="-4000" width="${B.w+8000}" height="${B.h+8000}"/>
      <path class="m-land" d="${B.land}"/><path class="m-lake" d="${B.lakes}"/>
      <g class="m-rivers">${B.rivers.map(([n,d])=>`<path d="${d}"><title>${esc(n)}</title></path>`).join("")}</g>
      <g id="mapRoute"></g><g id="mapDots"></g><g id="mapLabels"></g></svg>
    <div class="map-ctl"><button id="mapIn" aria-label="Zoom in">+</button><button id="mapOut" aria-label="Zoom out">−</button><button id="mapHome" aria-label="Show the whole map">⤢</button></div>
    <div class="map-credit">Places: OpenBible.info · Map: Natural Earth</div>`;
  if(!MAP.vb) MAP.vb=startView();
  bindMapGestures();
  paintMapPanel();
  const sel=MAP.sel&&MAP.byId.get(MAP.sel), j=MAP.journey&&MAP.journeys.find(x=>x.id===MAP.journey);
  if(MAP.fit){ MAP.fit=false;
    if(sel) MAP.vb=fitView([sel],sel.area?900:260);
    else if(MAP.mode==="journeys"&&j) MAP.vb=fitView(j.stops.map(s=>s.p),120);
    else if(MAP.mode==="chapter"){ const c=chapterPlaces(); if(c.length) MAP.vb=fitView(c.map(x=>x.p),160); }
  }
  applyVB(); drawMapMarks();
}
function startView(){ const p=MAP.byId.get("a15257a"); return fitView([p],1500); }   // the Levant, centred on Jerusalem
function sizeMap(){
  const s=document.querySelector(".map-screen"); if(!s) return;
  const top=s.getBoundingClientRect().top+window.scrollY, tab=$("#tabbar").offsetHeight;
  s.style.height=Math.max(420,innerHeight-top-tab)+"px";
}
addEventListener("resize",()=>{ if(state.view==="maps"&&MAP.vb){ sizeMap(); applyVB(); scheduleLabels(); } });

/* ---------- view box ---------- */
function stageSize(){ const s=$("#mapStage"); return s?{w:s.clientWidth||1,h:s.clientHeight||1}:{w:1,h:1}; }
function fitView(pts,minW){
  pts=pts.filter(p=>p&&onMap(p));
  if(!pts.length) return {...MAP.full};
  let x0=Math.min(...pts.map(p=>p.x)), x1=Math.max(...pts.map(p=>p.x)), y0=Math.min(...pts.map(p=>p.y)), y1=Math.max(...pts.map(p=>p.y));
  const S=stageSize(), ar=S.w/S.h;
  let w=Math.max(minW,(x1-x0)*1.35), h=Math.max(minW/ar,(y1-y0)*1.35);
  if(w/h<ar) w=h*ar; else h=w/ar;
  return clampVB({x:(x0+x1)/2-w/2, y:(y0+y1)/2-h/2, w, h});
}
// The coastline is drawn a little past the frame (PX, PY); never show beyond that, so no straight cut edges appear.
function clampVB(vb){
  const F=MAP.full, S=stageSize(), ar=S.w/S.h, PX=MAP.base.pad[0], PY=MAP.base.pad[1];
  const maxW=Math.min(F.w+2*PX,(F.h+2*PY)*ar);
  const w=Math.min(Math.max(vb.w,36),maxW), h=w/ar;
  const x=Math.min(Math.max(vb.x,-PX),F.w+PX-w), y=Math.min(Math.max(vb.y,-PY),F.h+PY-h);
  return {x,y,w,h};
}
const upp=()=>MAP.vb.w/stageSize().w;              // map units per screen pixel
function applyVB(){
  const svg=$("#mapSvg"); if(!svg) return;
  const S=stageSize(); MAP.vb.h=MAP.vb.w*S.h/S.w;
  svg.setAttribute("viewBox",`${MAP.vb.x} ${MAP.vb.y} ${MAP.vb.w} ${MAP.vb.h}`);
  const u=upp(); svg.style.setProperty("--u",u);
  svg.querySelectorAll("#mapDots circle").forEach(c=>c.setAttribute("r",(+c.dataset.r)*u));
  svg.querySelectorAll("#mapRoute .m-stop circle").forEach(c=>c.setAttribute("r",9*u));
  svg.querySelectorAll("#mapRoute .m-stop text").forEach(t=>{ t.setAttribute("font-size",10*u); });
  const path=svg.querySelector("#mapRoute path"); if(path){ path.setAttribute("stroke-width",2.4*u); path.setAttribute("stroke-dasharray",`${7*u} ${5*u}`); }
  scheduleLabels();
}
function flyTo(target,ms=450){
  cancelAnimationFrame(MAP.anim);
  const a={...MAP.vb}, b=clampVB(target), t0=performance.now();
  if(matchMedia("(prefers-reduced-motion: reduce)").matches) ms=0;
  const step=now=>{
    const k=ms?Math.min(1,(now-t0)/ms):1, e=k<.5?2*k*k:1-Math.pow(-2*k+2,2)/2;
    // zoom geometrically so the motion feels even
    const w=a.w*Math.pow(b.w/a.w,e), cx=a.x+a.w/2+(b.x+b.w/2-a.x-a.w/2)*e, cy=a.y+a.h/2+(b.y+b.h/2-a.y-a.h/2)*e;
    MAP.vb={x:cx-w/2,y:cy-w*(a.h/a.w)/2,w,h:w*(a.h/a.w)}; applyVB();
    if(k<1) MAP.anim=requestAnimationFrame(step);
  };
  MAP.anim=requestAnimationFrame(step);
}
function zoomAt(f,sx,sy){
  const S=stageSize(), vb=MAP.vb;
  const mx=vb.x+vb.w*(sx/S.w), my=vb.y+vb.h*(sy/S.h);
  const w=Math.max(vb.w*f,36), k=w/vb.w;
  MAP.vb=clampVB({x:mx-(mx-vb.x)*k, y:my-(my-vb.y)*k, w, h:vb.h*k}); applyVB();
}
function focusPlace(p){ if(p&&onMap(p)) flyTo(fitView([p],p.area?900:Math.min(MAP.vb.w,260))); }

/* ---------- gestures: drag, pinch, wheel, tap ---------- */
function bindMapGestures(){
  const st=$("#mapStage"), pts=new Map(); let moved=0, pinch=null, last=null;
  const local=e=>{ const r=st.getBoundingClientRect(); return {x:e.clientX-r.left,y:e.clientY-r.top}; };
  st.addEventListener("pointerdown",e=>{
    if(e.target.closest(".map-ctl")) return;
    st.setPointerCapture(e.pointerId); pts.set(e.pointerId,local(e)); moved=0; cancelAnimationFrame(MAP.anim);
    if(pts.size===2){ const [a,b]=[...pts.values()]; pinch={d:Math.hypot(a.x-b.x,a.y-b.y)}; }
    last=local(e);
  });
  st.addEventListener("pointermove",e=>{
    if(!pts.has(e.pointerId)) return;
    const p=local(e), prev=pts.get(e.pointerId); pts.set(e.pointerId,p);
    if(pts.size===2&&pinch){
      const [a,b]=[...pts.values()], d=Math.hypot(a.x-b.x,a.y-b.y);
      if(d>0){ zoomAt(pinch.d/d,(a.x+b.x)/2,(a.y+b.y)/2); pinch.d=d; }
      moved+=10; return;
    }
    const u=upp(), dx=p.x-prev.x, dy=p.y-prev.y; moved+=Math.abs(dx)+Math.abs(dy);
    MAP.vb=clampVB({...MAP.vb,x:MAP.vb.x-dx*u,y:MAP.vb.y-dy*u}); applyVB();
  });
  const up=e=>{
    if(!pts.has(e.pointerId)) return;
    pts.delete(e.pointerId); if(pts.size<2) pinch=null;
    if(!pts.size&&moved<8&&e.type==="pointerup") mapTap(local(e));
  };
  st.addEventListener("pointerup",up); st.addEventListener("pointercancel",up);
  st.addEventListener("wheel",e=>{ e.preventDefault(); const p=local(e); zoomAt(Math.exp(e.deltaY*0.0016),p.x,p.y); },{passive:false});
  st.addEventListener("dblclick",e=>{ const p=local(e); zoomAt(0.5,p.x,p.y); });
  $("#mapIn").onclick=()=>{ const S=stageSize(); flyTo({...MAP.vb,x:MAP.vb.x+MAP.vb.w/4,y:MAP.vb.y+MAP.vb.h/4,w:MAP.vb.w/2,h:MAP.vb.h/2},250); };
  $("#mapOut").onclick=()=>{ flyTo({x:MAP.vb.x-MAP.vb.w/2,y:MAP.vb.y-MAP.vb.h/2,w:MAP.vb.w*2,h:MAP.vb.h*2},250); };
  $("#mapHome").onclick=()=>flyTo({...MAP.full,w:1e6});
  st.tabIndex=0;
  st.addEventListener("keydown",e=>{
    const u=upp()*60, k={ArrowLeft:[-u,0],ArrowRight:[u,0],ArrowUp:[0,-u],ArrowDown:[0,u]}[e.key];
    if(k){ e.preventDefault(); MAP.vb=clampVB({...MAP.vb,x:MAP.vb.x+k[0],y:MAP.vb.y+k[1]}); applyVB(); }
    else if(e.key==="+"||e.key==="=") $("#mapIn").click(); else if(e.key==="-") $("#mapOut").click();
  });
}
function mapTap(pt){
  // Nearest drawn place within reach of the finger.
  const S=stageSize(), vb=MAP.vb, u=upp();
  const mx=vb.x+pt.x*u, my=vb.y+pt.y*u;
  let best=null, bd=22*u;
  const {special}=markSets();
  document.querySelectorAll("#mapDots circle, #mapLabels text, #mapRoute .m-stop").forEach(el=>{
    const p=MAP.byId.get(el.dataset.id); if(!p||el.style.display==="none") return;
    const d=Math.hypot(p.x-mx,p.y-my)*(special.has(p.id)?0.6:p.rank<150?0.7:p.rank<500?0.85:1);
    if(d<bd){ bd=d; best=p; }
  });
  if(best) openPlace(best.id);
}

/* ---------- drawing ---------- */
function markSets(){
  const special=new Set(), j=MAP.mode==="journeys"&&MAP.journey&&MAP.journeys.find(x=>x.id===MAP.journey);
  if(j) j.stops.forEach(s=>special.add(s.p.id));
  if(MAP.mode==="chapter") chapterPlaces().forEach(c=>special.add(c.p.id));
  if(MAP.sel) special.add(MAP.sel);
  return {special,j};
}
function drawMapMarks(){
  const svg=$("#mapSvg"); if(!svg) return;
  const {special,j}=markSets();
  // Every point place gets a dot; the most-mentioned and highlighted ones are larger.
  svg.querySelector("#mapDots").innerHTML=MAP.places.filter(p=>!p.area&&onMap(p)&&p.type!=="special").map(p=>{
    const hot=special.has(p.id), r=hot?5.5:p.rank<60?3.6:p.rank<300?2.8:2.2;
    return `<circle data-id="${p.id}" data-r="${r}" cx="${p.x}" cy="${p.y}" r="0" class="${hot?"hot":""}${p.conf===0?" unsure":""}${p.id===MAP.sel?" sel":""}${p.rank>=300&&!hot?" minor":""}"/>`;
  }).join("");
  const route=svg.querySelector("#mapRoute");
  if(j){
    const pts=j.stops.map(s=>s.p).filter(onMap);
    route.innerHTML=`<path d="M${pts.map(p=>p.x+","+p.y).join("L")}"/>`+j.stops.map((s,i)=>onMap(s.p)?`<g class="m-stop" data-id="${s.p.id}"><circle cx="${s.p.x}" cy="${s.p.y}" r="0"/><text x="${s.p.x}" y="${s.p.y}" dy=".35em" text-anchor="middle">${i+1}</text></g>`:"").join("");
  }else route.innerHTML="";
  applyVB();
}
function scheduleLabels(){ clearTimeout(MAP.labelsT); MAP.labelsT=setTimeout(drawLabels,60); }
function drawLabels(){
  const svg=$("#mapSvg"); if(!svg||!MAP.vb) return;
  const vb=MAP.vb, u=upp(), S=stageSize(), {special}=markSets();
  const zoom=MAP.full.w/vb.w;                              // 1 = whole map
  const inView=p=>p.x>=vb.x-20*u&&p.x<=vb.x+vb.w+20*u&&p.y>=vb.y&&p.y<=vb.y+vb.h;
  // Hide minor dots when zoomed far out so the map stays readable.
  const dotLimit=zoom<2?140:zoom<5?500:zoom<12?1200:99999;
  svg.querySelectorAll("#mapDots circle").forEach(c=>{ const p=MAP.byId.get(c.dataset.id); c.style.display=(p.rank<dotLimit||special.has(p.id))?"":"none"; });
  const cand=MAP.places.filter(p=>onMap(p)&&p.type!=="special"&&inView(p)&&(special.has(p.id)||p.rank<dotLimit*0.6))
    .sort((a,b)=>(special.has(b.id)-special.has(a.id))||(b.id===MAP.sel)-(a.id===MAP.sel)||(a.area-b.area)||a.rank-b.rank);
  const taken=[], out=[], max=Math.round(S.w*S.h/9000)+12;
  for(const p of cand){
    if(out.length>=max) break;
    const fs=p.area?11:special.has(p.id)?13:p.rank<40?12.5:11.5;
    const tw=p.name.length*fs*(p.area?0.72:0.56)+6, th=fs+4;
    const sx=(p.x-vb.x)/u, sy=(p.y-vb.y)/u;
    const box=p.area?[sx-tw/2,sy-th/2,sx+tw/2,sy+th/2]:[sx+6,sy-th/2,sx+6+tw,sy+th/2];
    if(p.id!==MAP.sel&&taken.some(b=>box[0]<b[2]&&box[2]>b[0]&&box[1]<b[3]&&box[3]>b[1])) continue;
    taken.push(box);
    out.push(`<text data-id="${p.id}" class="${p.area?"area":""}${special.has(p.id)?" hot":""}${p.id===MAP.sel?" sel":""}" x="${p.area?p.x:p.x+6*u}" y="${p.y}" dy=".35em" ${p.area?'text-anchor="middle"':""} font-size="${fs*u}" stroke-width="${3*u}">${esc(p.area?p.name.toUpperCase():p.name)}</text>`);
  }
  svg.querySelector("#mapLabels").innerHTML=out.join("");
}

/* ---------- the panel ---------- */
function chapterPlaces(){
  const R=vrefs(), b=BOOKS.find(x=>x.name===state.book); if(!b) return [];
  const first=R.indexOf(`${state.book} ${state.ch}:1`), last=first+b.chapters[state.ch-1].length-1;
  const out=[];
  for(const p of MAP.places){ const hits=p.v.filter(i=>i>=first&&i<=last); if(hits.length) out.push({p,hits}); }
  return out.sort((a,b)=>a.hits[0]-b.hits[0]);
}
function paintMapPanel(){
  const box=$("#mapPanel"); if(!box||!MAP.places) return;
  if(MAP.sel&&MAP.byId.get(MAP.sel)) return paintPlaceCard(box,MAP.byId.get(MAP.sel));
  const m=MAP.mode;
  let body="";
  if(m==="places"){
    const q=MAP.q.trim().toLowerCase();
    const list=q?MAP.places.filter(p=>p.name.toLowerCase().includes(q)).sort((a,b)=>(!a.name.toLowerCase().startsWith(q))-(!b.name.toLowerCase().startsWith(q))||a.rank-b.rank).slice(0,60)
      :[...MAP.places].sort((a,b)=>a.rank-b.rank).slice(0,40);
    body=`<input id="mapQ" type="search" placeholder="Find a place — Bethel, Corinth…" value="${esc(MAP.q)}" autocomplete="off" aria-label="Find a place">
      <div class="lbl">${q?list.length+" place"+(list.length===1?"":"s"):"Most mentioned · "+MAP.places.length.toLocaleString()+" places in all"}</div>
      <div class="mp-list">${list.map(p=>placeRow(p)).join("")||'<div class="empty">No place by that name.</div>'}</div>`;
  }else if(m==="journeys"){
    const j=MAP.journey&&MAP.journeys.find(x=>x.id===MAP.journey);
    body=j?`<button class="lex-back" id="mjBack">‹ Journeys</button><h3 class="mp-title">${esc(j.title)}</h3><div class="section-sub">${esc(j.range)} · ${j.stops.length} stops</div>
        <ol class="mj-stops">${j.stops.map((s,i)=>`<li><button class="mj-stop" data-id="${s.p.id}"><span class="mj-n">${i+1}</span><span class="mj-name">${esc(s.p.name)}</span><a class="mj-ref" href="${esc(verseLink(s.ref))}" data-r="${esc(s.ref)}">${esc(s.ref)}</a></button></li>`).join("")}</ol>`
      :`<div class="mj-list">${MAP.journeys.map(x=>`<button class="mj-card" data-j="${x.id}"><b>${esc(x.title)}</b><span>${esc(x.range)} · ${x.stops.length} stops</span></button>`).join("")}</div>`;
  }else{
    const c=chapterPlaces();
    body=`<div class="lbl">Places in ${esc(state.book)} ${state.ch}</div>`+(c.length
      ?`<div class="mp-list">${c.map(({p,hits})=>placeRow(p,hits.map(i=>vrefs()[i].split(":")[1]).join(", "))).join("")}</div>`
      :`<div class="empty">No mapped places are named in ${esc(state.book)} ${state.ch}.</div>`)
      +`<div class="section-sub" style="padding-top:8px">Follows the chapter you’re reading. <button class="link-btn" id="mpRead">Open ${esc(state.book)} ${state.ch}</button></div>`;
  }
  box.innerHTML=`<div class="seg map-modes" role="tablist">${[["places","Places"],["journeys","Journeys"],["chapter","This chapter"]].map(([k,l])=>`<button role="tab" data-m="${k}" class="${k===m?"on":""}" aria-selected="${k===m}">${l}</button>`).join("")}</div><div class="mp-body">${body}</div>`;
  box.querySelectorAll(".map-modes button").forEach(b=>b.onclick=()=>{
    MAP.mode=b.dataset.m; store.set("mapMode",MAP.mode); MAP.journey=null; mapRoute(false); paintMapPanel(); drawMapMarks();
    if(MAP.mode==="chapter"){ const c=chapterPlaces(); if(c.length) flyTo(fitView(c.map(x=>x.p),160)); }
  });
  box.querySelectorAll(".mp-row").forEach(b=>b.onclick=()=>openPlace(b.dataset.id));
  const q=$("#mapQ"); if(q){ q.oninput=()=>{ MAP.q=q.value; const pos=q.selectionStart; paintMapPanel(); const n=$("#mapQ"); n.focus(); n.setSelectionRange(pos,pos); }; }
  box.querySelectorAll(".mj-card").forEach(b=>b.onclick=()=>{
    MAP.journey=b.dataset.j; mapRoute(true); paintMapPanel(); drawMapMarks();
    const j=MAP.journeys.find(x=>x.id===MAP.journey); flyTo(fitView(j.stops.map(s=>s.p),120),600);
  });
  const jb=$("#mjBack"); if(jb) jb.onclick=()=>{ MAP.journey=null; mapRoute(false); paintMapPanel(); drawMapMarks(); };
  box.querySelectorAll(".mj-stop").forEach(b=>b.onclick=e=>{
    if(e.target.closest(".mj-ref")){ e.preventDefault(); gotoVerse(e.target.closest(".mj-ref").dataset.r); return; }
    box.querySelectorAll(".mj-stop").forEach(x=>x.classList.toggle("on",x===b));
    focusPlace(MAP.byId.get(b.dataset.id));
  });
  const rd=$("#mpRead"); if(rd) rd.onclick=()=>showView("read");
}
function placeRow(p,extra){
  return `<button class="mp-row" data-id="${p.id}"><span class="mp-dot${p.conf===0?" unsure":""}${p.area?" area":""}"></span><span class="mp-name">${esc(p.name)}</span><small>${extra?"v. "+esc(extra):p.v.length+" verse"+(p.v.length===1?"":"s")}</small></button>`;
}
function paintPlaceCard(box,p){
  const R=vrefs(), shown=p.v.slice(0,40);
  box.innerHTML=`<button class="lex-back" id="mpBack">‹ ${esc({places:"Places",journeys:"Journeys",chapter:"This chapter"}[MAP.mode])}</button>
    <h3 class="mp-title">${esc(p.name)}</h3>
    <div class="mp-meta"><span class="mp-conf c${p.conf}">${CONF_LABEL[p.conf]}</span><span>${esc(p.type)}</span></div>
    ${p.modern?`<div class="mp-modern">${p.area?"":"Identified with "}${esc(p.modern)}${p.alt?` · ${p.alt} other proposed site${p.alt===1?"":"s"}`:""}</div>`:""}
    ${onMap(p)?"":`<div class="section-sub">Lies beyond the edge of this map.</div>`}
    <div class="lbl">Named in ${p.v.length} verse${p.v.length===1?"":"s"}</div>
    <div class="lex-occ">${shown.map(i=>{ const r=R[i], t=textOf(r), pv=t.length>120?t.slice(0,120)+"…":t;
      return `<button class="occ-row" data-r="${esc(r)}"><span class="or">${esc(r)}</span><span class="ov">${verseHTML(pv||"(not in this translation)")}</span></button>`; }).join("")}</div>
    ${p.v.length>shown.length?`<div class="section-sub">First 40 of ${p.v.length}. <button class="link-btn" id="mpAll">Show all</button></div>`:""}
    <div class="orig-credit"><a href="https://www.openbible.info/geo/ancient/${esc(p.id)}/${esc(p.slug)}" target="_blank" rel="noopener">${esc(p.name)} on OpenBible.info</a> — sources, photos and the other proposed sites. Geocoding CC BY 4.0.</div>`;
  $("#mpBack").onclick=()=>{ if((history.state||{}).selah&&location.hash.startsWith("#/maps/place/")) history.back(); else { MAP.sel=null; mapRoute(false); paintMapPanel(); drawMapMarks(); } };
  box.querySelectorAll(".occ-row").forEach(b=>b.onclick=()=>gotoVerse(b.dataset.r));
  const all=$("#mpAll"); if(all) all.onclick=()=>{ const list=box.querySelector(".lex-occ"); list.innerHTML=p.v.map(i=>{ const r=R[i]; return `<button class="occ-row" data-r="${esc(r)}"><span class="or">${esc(r)}</span></button>`; }).join(""); all.parentElement.remove(); list.querySelectorAll(".occ-row").forEach(b=>b.onclick=()=>gotoVerse(b.dataset.r)); };
  box.scrollTop=0;
}

/* ---------- places named in a verse (bottom of the Cross-refs tab) ---------- */
let PLACE_REV=null;
async function fillVersePlaces(ref){
  const host=document.getElementById("xTopics"); if(!host) return;
  try{ await loadMaps(); }catch(e){ return; }
  if(state.sheetRef!==ref||!document.getElementById("xTopics")) return;
  if(!PLACE_REV){ PLACE_REV=new Map(); MAP.places.forEach(p=>p.v.forEach(i=>{ let a=PLACE_REV.get(i); if(!a) PLACE_REV.set(i,a=[]); a.push(p); })); }
  const list=(PLACE_REV.get(vrefs().indexOf(ref))||[]).filter(p=>p.type!=="special").slice(0,10);
  if(!list.length) return;
  const div=document.createElement("div"); div.id="xPlaces";
  div.innerHTML=`<div class="lbl" style="margin-top:14px">Places in this verse</div><div class="vtopics">${list.map(p=>`<button class="chip" data-id="${p.id}">📍 ${esc(p.name)}</button>`).join("")}</div>`;
  host.parentNode.insertBefore(div,host);
  div.querySelectorAll("button").forEach(b=>b.onclick=()=>{ closeSheet(); openPlace(b.dataset.id); });
}
