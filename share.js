"use strict";
/* Selah — share a verse (or a few) as an image card, drawn on a canvas in the app's
   ink-and-parchment look, then handed to the phone's share sheet or downloaded. */

const SHARE={ref:null, count:1, style:"parchment", art:0};
const SHARE_W=1080, SHARE_H=1350;                      // 4:5 portrait — fits Instagram, Messages, WhatsApp
const SHARE_STYLES=[["parchment","Parchment"],["ink","Ink"],["art","Artwork"]];

function shareVerses(){
  const p=parseRef(SHARE.ref); if(!p) return {label:SHARE.ref,text:"",items:[]};
  const book=BOOKS.find(b=>b.name===p.book), ch=book.chapters[p.ch-1];
  const items=[];
  for(let v=p.v; v<p.v+SHARE.count&&v<=ch.length; v++) if(ch[v-1]) items.push({v,t:ch[v-1].replace(/\[(Higgaion\. )?Selah\.?/g,"Selah").replace(/[\[\]]/g,"")});
  const last=items.length?items[items.length-1].v:p.v;
  return {label:`${p.book==="Psalms"?"Psalm":p.book} ${p.ch}:${p.v}${last>p.v?"-"+last:""}`, items, book:p.book, ch:p.ch};
}
// Small seeded random so a verse always gets the same ink splatter.
function seeded(str){ let h=2166136261; for(const c of str) h=Math.imul(h^c.charCodeAt(0),16777619); return ()=>((h=Math.imul(h^(h>>>15),2246822507)^Math.imul(h^(h>>>13),3266489909))>>>0)/4294967296; }
function inkSplatter(ctx,x,y,r,rnd,color){
  ctx.fillStyle=color;
  ctx.beginPath(); ctx.arc(x,y,r,0,Math.PI*2); ctx.fill();
  for(let i=0;i<18;i++){
    const a=rnd()*Math.PI*2, d=r*(0.6+rnd()*1.9), rr=r*(0.05+rnd()*0.22);
    ctx.beginPath(); ctx.arc(x+Math.cos(a)*d,y+Math.sin(a)*d,rr,0,Math.PI*2); ctx.fill();
  }
  for(let i=0;i<5;i++){                                  // a few drips / streaks
    const a=rnd()*Math.PI*2, len=r*(1+rnd()*1.6);
    ctx.lineWidth=r*(0.04+rnd()*0.08); ctx.strokeStyle=color; ctx.lineCap="round";
    ctx.beginPath(); ctx.moveTo(x+Math.cos(a)*r*0.6,y+Math.sin(a)*r*0.6); ctx.lineTo(x+Math.cos(a)*len,y+Math.sin(a)*len); ctx.stroke();
  }
}
function paperGrain(ctx,x,y,w,h,rnd,alpha){
  for(let i=0;i<2600;i++){
    ctx.fillStyle=`rgba(90,70,30,${alpha*rnd()})`;
    ctx.fillRect(x+rnd()*w,y+rnd()*h,1+rnd()*2,1+rnd()*2);
  }
}
function wrapLines(ctx,text,maxW){
  const words=text.split(/\s+/), lines=[]; let cur="";
  for(const w of words){ const t=cur?cur+" "+w:w; if(ctx.measureText(t).width>maxW&&cur){ lines.push(cur); cur=w; } else cur=t; }
  if(cur) lines.push(cur); return lines;
}
function loadImg(src){ return new Promise((res,rej)=>{ const i=new Image(); i.onload=()=>res(i); i.onerror=rej; i.src=src; }); }

async function drawShareCard(canvas){
  const ctx=canvas.getContext("2d"), W=SHARE_W, H=SHARE_H, s=shareVerses(), rnd=seeded(SHARE.ref+SHARE.style);
  canvas.width=W; canvas.height=H;
  const dark=SHARE.style==="ink";
  const ink=dark?"#efe4c8":"#2b2519", accent=dark?"#d3a94e":"#8a6d2f";
  // background
  if(dark){
    const g=ctx.createRadialGradient(W/2,H*0.45,80,W/2,H/2,H*0.8); g.addColorStop(0,"#2a2118"); g.addColorStop(1,"#0e0b08");
    ctx.fillStyle=g; ctx.fillRect(0,0,W,H);
  }else{
    const g=ctx.createLinearGradient(0,0,W,H); g.addColorStop(0,"#f8f1de"); g.addColorStop(1,"#eadcbc");
    ctx.fillStyle=g; ctx.fillRect(0,0,W,H); paperGrain(ctx,0,0,W,H,rnd,0.18);
  }
  let top=150;
  if(SHARE.style==="art"&&ART.length){
    const a=ART[SHARE.art%ART.length];
    try{
      const img=await loadImg(artSrc(a)); const ih=Math.round(H*0.52);
      const scale=Math.max(W/img.width,ih/img.height), dw=img.width*scale, dh=img.height*scale;
      ctx.save(); ctx.beginPath(); ctx.rect(0,0,W,ih); ctx.clip();
      ctx.drawImage(img,(W-dw)/2,(ih-dh)*0.35,dw,dh); ctx.restore();
      const f=ctx.createLinearGradient(0,ih*0.55,0,ih); f.addColorStop(0,"rgba(242,232,207,0)"); f.addColorStop(1,"rgba(242,232,207,1)");
      ctx.fillStyle=f; ctx.fillRect(0,0,W,ih);
      top=ih-10;
    }catch(e){ /* artwork unavailable — fall back to plain parchment */ }
  }else{
    // ink splatters in two corners, like the artwork
    const blot=dark?"rgba(211,169,78,0.20)":"rgba(28,24,18,0.86)", moss=dark?"rgba(120,140,100,0.18)":"rgba(52,66,44,0.80)";
    inkSplatter(ctx,W*0.08,H*0.06,46,rnd,blot); inkSplatter(ctx,W*0.16,H*0.10,22,rnd,moss);
    inkSplatter(ctx,W*0.92,H*0.94,40,rnd,blot); inkSplatter(ctx,W*0.84,H*0.90,18,rnd,moss);
  }
  // frame
  if(SHARE.style!=="art"){
    ctx.strokeStyle=dark?"rgba(211,169,78,0.45)":"rgba(138,109,47,0.55)"; ctx.lineWidth=2; ctx.strokeRect(54,54,W-108,H-108);
    ctx.lineWidth=1; ctx.strokeRect(66,66,W-132,H-132);
  }
  // verse text, auto-sized to the space
  const boxX=120, boxW=W-240, boxTop=top+40, boxBottom=H-300;
  const sup=n=>String(n).replace(/\d/g,d=>"⁰¹²³⁴⁵⁶⁷⁸⁹"[d]);
  const body=s.items.map(it=>(s.items.length>1?sup(it.v)+"\u2009":"")+it.t).join(" ");
  const quoted=`“${body}”`;
  let size=64, lines=[], lh=0;
  for(; size>=26; size-=2){
    ctx.font=`${size}px Georgia, "Times New Roman", serif`;
    lines=wrapLines(ctx,quoted,boxW); lh=size*1.42;
    if(lines.length*lh<=boxBottom-boxTop) break;
  }
  if(lines.length*lh>boxBottom-boxTop){                  // still too long: trim with an ellipsis
    const max=Math.floor((boxBottom-boxTop)/lh); lines=lines.slice(0,max); lines[max-1]=lines[max-1].replace(/\s*\S*$/,"")+"…”";
  }
  const textH=lines.length*lh, y0=boxTop+((boxBottom-boxTop)-textH)/2;
  ctx.fillStyle=ink; ctx.textAlign="center"; ctx.textBaseline="alphabetic";
  lines.forEach((ln,i)=>ctx.fillText(ln,W/2,y0+i*lh+size));
  // reference + mark
  const ry=Math.min(H-215,y0+textH+90);              // keep clear of the Selah mark at the bottom
  ctx.fillStyle=accent; ctx.font=`bold 40px Georgia, serif`;
  ctx.fillText(s.label.toUpperCase().split("").join(String.fromCharCode(8202)),W/2,ry);
  ctx.fillStyle=dark?"rgba(239,228,200,0.55)":"rgba(43,37,25,0.55)"; ctx.font=`26px -apple-system, "Segoe UI", Roboto, sans-serif`;
  ctx.fillText(`${TRANSLATIONS[state.trans].short}`,W/2,ry+46);
  ctx.font=`bold 30px Georgia, serif`; ctx.fillStyle=accent;
  ctx.fillText("Selah",W/2,H-96);
  return canvas;
}

function paintShare(body,ref){
  if(SHARE.ref!==ref){ SHARE.ref=ref; SHARE.count=1; }
  const p=parseRef(ref), ch=BOOKS.find(b=>b.name===p.book).chapters[p.ch-1];
  body.innerHTML=`<button class="lex-back" id="shareBack">‹ Back</button>
    <div class="share-preview"><img id="sharePrev" alt="Preview of the verse image"></div>
    <div class="share-opts">
      <div class="share-row" role="group" aria-label="Style">${SHARE_STYLES.map(([k,n])=>`<button class="chip${SHARE.style===k?" on":""}" data-st="${k}">${n}</button>`).join("")}</div>
      ${SHARE.style==="art"&&ART.length>1?`<div class="share-row" role="group" aria-label="Artwork">${ART.map((a,i)=>`<button class="chip${SHARE.art%ART.length===i?" on":""}" data-art="${i}">${esc(a.title.replace(/^The /,""))}</button>`).join("")}</div>`:""}
      <div class="share-row"><span class="share-lbl">Verses</span><button class="chip" id="shLess" ${SHARE.count<=1?"disabled":""}>−</button><span class="share-n">${SHARE.count}</span><button class="chip" id="shMore" ${SHARE.count>=6||p.v+SHARE.count>ch.length?"disabled":""}>+</button></div>
    </div>
    <div class="backup-row"><button class="btn-primary" id="shareGo">Share image</button><button class="btn-ghost" id="shareCopy">Copy text</button></div>
    <button class="btn-ghost share-link" id="shareLink">Copy link to ${esc(shareVerses().label)}</button>`;
  const repaint=()=>paintShare(body,ref);
  body.querySelectorAll("[data-st]").forEach(b=>b.onclick=()=>{ SHARE.style=b.dataset.st; repaint(); });
  body.querySelectorAll("[data-art]").forEach(b=>b.onclick=()=>{ SHARE.art=+b.dataset.art; repaint(); });
  $("#shLess").onclick=()=>{ SHARE.count=Math.max(1,SHARE.count-1); repaint(); };
  $("#shMore").onclick=()=>{ SHARE.count=Math.min(6,SHARE.count+1); repaint(); };
  $("#shareBack").onclick=()=>{ state.sheetTab="mark"; paintSheet(); };
  $("#shareCopy").onclick=async()=>{
    const s=shareVerses(), txt=`“${s.items.map(i=>i.t).join(" ")}” — ${s.label} (${TRANSLATIONS[state.trans].name})\n${verseLink(SHARE.ref)}`;
    try{ await navigator.clipboard.writeText(txt); toast("Copied"); }catch(e){ toast("Couldn’t copy"); }
  };
  $("#shareLink").onclick=async()=>{
    const s=shareVerses(), first=SHARE.ref, last=s.items.length?s.items[s.items.length-1].v:null;
    const url=verseLink(last&&last!==parseRef(first).v?`${first}-${last}`:first);
    try{ if(navigator.share&&/iPhone|iPad|Android/i.test(navigator.userAgent)) await navigator.share({title:s.label,url}); else { await navigator.clipboard.writeText(url); toast("Link copied"); } }
    catch(e){ if(!(e&&e.name==="AbortError")) toast("Couldn’t copy the link"); }
  };
  const canvas=document.createElement("canvas");
  const ready=(document.fonts?document.fonts.ready:Promise.resolve()).then(()=>drawShareCard(canvas));
  ready.then(c=>{
    if(state.sheetRef!==ref||state.sheetTab!=="share") return;
    const img=$("#sharePrev"); if(img) img.src=c.toDataURL("image/jpeg",0.85);
  });
  $("#shareGo").onclick=()=>ready.then(()=>shareCard(canvas));
}
function shareCard(canvas){
  const s=shareVerses(), name=`selah-${s.label.toLowerCase().replace(/[^a-z0-9]+/g,"-")}.png`;
  canvas.toBlob(async blob=>{
    if(!blob){ toast("Couldn’t make the image"); return; }
    const file=new File([blob],name,{type:"image/png"});
    if(navigator.canShare&&navigator.canShare({files:[file]})){
      try{ await navigator.share({files:[file],title:s.label}); return; }catch(e){ if(e&&e.name==="AbortError") return; }
    }
    const a=document.createElement("a"); a.href=URL.createObjectURL(blob); a.download=name;
    document.body.appendChild(a); a.click(); setTimeout(()=>{ URL.revokeObjectURL(a.href); a.remove(); },500);
    toast("Image saved");
  },"image/png");
}
