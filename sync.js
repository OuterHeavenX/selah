"use strict";
/* Selah — sign-in and automatic sync of highlights, notes and reading-plan progress (Supabase).
   No library: talks to Supabase Auth and the selah_sync() database function over fetch.

   Sync model: every piece of study data is an "item" — "hl:<ref>" highlight colour, "nt:<ref>" note,
   "plan" {id,start}, "pd:<plan>:<day.k>" a checked chapter, "plog:<date>" chapters read that day.
   Each item carries the time it was last changed on this device; the server keeps the newest version
   of each item (deletions are kept as empty "tombstones" so they don't come back). */

const SB_URL="https://vxhoiyjodwzjzvfrbqvv.supabase.co";
const SB_KEY="sb_publishable_6CADiLns1haSbKVWTN_GIw_6rTaOb7H";     // publishable: safe in the page; row-level security protects the data
const SYNC={busy:false, timer:null, last:store.get("sync_last",0), error:null, again:false};
const SYNC_KEYS=["hl","notes","plan"];

/* ---------- auth ---------- */
function authSession(){ return store.get("auth",null); }
function setSession(s){ store.set("auth",s); }
const signedIn=()=>!!authSession();
async function sbAuth(path,body,method="POST",token){
  const r=await fetch(SB_URL+"/auth/v1/"+path,{method,headers:{"apikey":SB_KEY,"Content-Type":"application/json",...(token?{"Authorization":"Bearer "+token}:{})},body:body?JSON.stringify(body):undefined});
  const j=await r.json().catch(()=>({}));
  if(!r.ok) throw new Error(j.msg||j.error_description||j.message||j.error||("HTTP "+r.status));
  return j;
}
function sessionFrom(j){
  return {access_token:j.access_token, refresh_token:j.refresh_token,
    expires_at:j.expires_at||Math.floor(Date.now()/1000)+(+j.expires_in||3600), email:(j.user&&j.user.email)||(authSession()||{}).email||""};
}
async function accessToken(){
  let s=authSession(); if(!s) return null;
  if(s.expires_at-90<Date.now()/1000){
    try{ s=sessionFrom(await sbAuth("token?grant_type=refresh_token",{refresh_token:s.refresh_token})); setSession(s); }
    catch(e){ if(/invalid|not found|revoked|expired/i.test(e.message)){ setSession(null); refreshSyncUI(); } throw e; }
  }
  return s.access_token;
}
const siteURL=()=>location.origin+location.pathname;
async function signIn(email,password){
  const j=await sbAuth("token?grant_type=password",{email,password});
  setSession(sessionFrom(j)); firstSyncPrep(); await syncNow();
}
async function signUp(email,password){
  const j=await sbAuth("signup?redirect_to="+encodeURIComponent(siteURL()),{email,password});
  if(j.access_token){ setSession(sessionFrom(j)); firstSyncPrep(); await syncNow(); return "in"; }
  return "confirm";
}
async function signOut(){
  const s=authSession();
  if(s) sbAuth("logout",null,"POST",s.access_token).catch(()=>{});
  setSession(null); store.set("sync_last",0); SYNC.last=0; refreshSyncUI();
}
// After an email link (confirm sign-up or reset password), Supabase sends the user back with the session in the URL "#".
function handleAuthRedirect(){
  if(!location.hash||location.hash.length<5) return;
  const h=new URLSearchParams(location.hash.slice(1));
  if(!h.get("access_token")&&!h.get("error")) return;
  history.replaceState(null,"",location.pathname+location.search);
  if(h.get("error")){ setTimeout(()=>toast(h.get("error_description")||"That link didn’t work — it may have expired"),600); return; }
  setSession({access_token:h.get("access_token"),refresh_token:h.get("refresh_token"),
    expires_at:+h.get("expires_at")||Math.floor(Date.now()/1000)+(+h.get("expires_in")||3600),email:""});
  sbAuth("user",null,"GET",h.get("access_token")).then(u=>{ const s=authSession(); if(s){ s.email=u.email||""; setSession(s); refreshSyncUI(); } }).catch(()=>{});
  firstSyncPrep();
  if(h.get("type")==="recovery") setTimeout(promptNewPassword,700);
  else setTimeout(()=>toast("Email confirmed — you’re signed in"),700);
}
async function promptNewPassword(){
  const p=prompt("Choose a new password for Selah (at least 8 characters):");
  if(!p) return;
  if(p.length<8){ toast("Password must be at least 8 characters"); return promptNewPassword(); }
  try{ await sbAuth("user",{password:p},"PUT",await accessToken()); toast("Password updated"); }catch(e){ toast(e.message); }
}

/* ---------- items ---------- */
function rawGet(k,d){ try{ const v=localStorage.getItem("selah_"+k); return v==null?d:JSON.parse(v); }catch(e){ return d; } }
function rawSet(k,v){ try{ localStorage.setItem("selah_"+k,JSON.stringify(v)); }catch(e){} }
function localItems(){
  const it={};
  for(const [r,c] of Object.entries(HL)) it["hl:"+r]=c;
  for(const [r,n] of Object.entries(NOTES)) it["nt:"+r]=n;
  const p=rawGet("plan",null);
  if(p&&p.id){
    it.plan={id:p.id,start:p.start};
    for(const k of Object.keys(p.done||{})) it[`pd:${p.id}:${k}`]=1;
    for(const [d,n] of Object.entries(p.log||{})) it["plog:"+d]=n;
  }
  return it;
}
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
// Record which items changed locally, and when, by comparing with the last snapshot.
function noteLocalChange(){
  const cur=localItems(), prev=rawGet("sync_prev",{}), meta=rawGet("sync_meta",{}), dirty=rawGet("sync_dirty",{}), now=Date.now();
  for(const k of new Set([...Object.keys(cur),...Object.keys(prev)])) if(!same(cur[k],prev[k])){ meta[k]=now; dirty[k]=1; }
  rawSet("sync_prev",cur); rawSet("sync_meta",meta); rawSet("sync_dirty",dirty);
  if(signedIn()) scheduleSync(1500);
}
// First sync on a device: offer everything already here, but let anything newer on the server win.
function firstSyncPrep(){
  const cur=localItems(), meta=rawGet("sync_meta",{}), dirty=rawGet("sync_dirty",{});
  for(const k of Object.keys(cur)){ if(!meta[k]) meta[k]=1; dirty[k]=1; }
  rawSet("sync_prev",cur); rawSet("sync_meta",meta); rawSet("sync_dirty",dirty);
}
function applyRemote(server){
  const meta=rawGet("sync_meta",{}), dirty=rawGet("sync_dirty",{}), cur=localItems(), changed=new Set();
  for(const [k,e] of Object.entries(server||{})){
    if(!e||typeof e.t!=="number"||dirty[k]) continue;          // a newer local edit is on its way up
    if((meta[k]||0)>=e.t) continue;
    meta[k]=e.t;
    if(!same(cur[k],e.v===null?undefined:e.v)){ if(e.v===null) delete cur[k]; else cur[k]=e.v; changed.add(k); }
  }
  rawSet("sync_meta",meta);
  if(!changed.size) return changed;
  // Rebuild the app's data from the merged items.
  const hl={}, notes={};
  let plan=null;
  for(const [k,v] of Object.entries(cur)){
    if(k.startsWith("hl:")&&/^[ygbp]$/.test(v)) hl[k.slice(3)]=v;
    else if(k.startsWith("nt:")&&typeof v==="string") notes[k.slice(3)]=v;
  }
  if(cur.plan&&cur.plan.id){
    plan={id:cur.plan.id,start:cur.plan.start,done:{},log:{}};
    for(const [k,v] of Object.entries(cur)){
      if(k.startsWith(`pd:${plan.id}:`)&&v) plan.done[k.slice(4+plan.id.length)]=1;
      else if(k.startsWith("plog:")) plan.log[k.slice(5)]=v;
    }
  }
  HL=hl; NOTES=notes; rawSet("hl",HL); rawSet("notes",NOTES); rawSet("plan",plan);
  rawSet("sync_prev",localItems());
  return changed;
}

/* ---------- syncing ---------- */
function scheduleSync(ms){ clearTimeout(SYNC.timer); SYNC.timer=setTimeout(syncNow,ms); }
async function syncNow(){
  if(!signedIn()) return;
  if(SYNC.busy){ SYNC.again=true; return; }
  if(!navigator.onLine){ SYNC.error="offline"; refreshSyncUI(); return; }
  SYNC.busy=true; SYNC.again=false; refreshSyncUI();
  const dirty=rawGet("sync_dirty",{}), meta=rawGet("sync_meta",{}), cur=localItems(), sent=Object.keys(dirty), changes={};
  for(const k of sent) changes[k]={v:k in cur?cur[k]:null, t:meta[k]||Date.now()};
  try{
    const token=await accessToken(); if(!token) throw new Error("Signed out");
    const r=await fetch(SB_URL+"/rest/v1/rpc/selah_sync",{method:"POST",
      headers:{"apikey":SB_KEY,"Authorization":"Bearer "+token,"Content-Type":"application/json"},body:JSON.stringify({changes})});
    const j=await r.json().catch(()=>null);
    if(!r.ok) throw new Error((j&&(j.message||j.msg))||("HTTP "+r.status));
    // Clear only what we sent and that hasn't been edited again since.
    const d2=rawGet("sync_dirty",{}), m2=rawGet("sync_meta",{});
    for(const k of sent) if(d2[k]&&m2[k]===changes[k].t) delete d2[k];
    rawSet("sync_dirty",d2);
    const changed=applyRemote(j);
    SYNC.last=Date.now(); store.set("sync_last",SYNC.last); SYNC.error=null;
    if(changed.size) afterRemoteChange(changed);
  }catch(e){
    SYNC.error=/Failed to fetch|NetworkError|Load failed/i.test(e.message)?"Couldn’t reach the sync server":e.message;
    console.warn("Sync failed",e);
  }finally{
    SYNC.busy=false; refreshSyncUI();
    if(SYNC.again) scheduleSync(300);
  }
}
// Show changes that arrived from another device without disturbing what the reader is doing.
function afterRemoteChange(changed){
  const refs=[...changed].filter(k=>/^(hl|nt):/.test(k)).map(k=>k.slice(3));
  if(state.view==="read") refs.forEach(r=>refreshVerse(r));
  else if(state.view==="home") renderHome();
  else if(state.view==="plans"){ const y=scrollY; renderPlans(); scrollTo(0,y); }
  else if(state.view==="saved"){ const y=scrollY; renderSaved(); scrollTo(0,y); }
  if(state.sheetRef&&state.sheetTab==="mark"&&refs.includes(state.sheetRef)) paintSheet();
}
function setupSync(){
  // Every save of highlights, notes or plan progress is noted for sync.
  const set=store.set.bind(store);
  store.set=(k,v)=>{ set(k,v); if(SYNC_KEYS.includes(k)) noteLocalChange(); };
  if(!rawGet("sync_prev",null)) rawSet("sync_prev",localItems());
  handleAuthRedirect();
  if(signedIn()) scheduleSync(800);
  document.addEventListener("visibilitychange",()=>{ if(!document.hidden&&signedIn()&&Date.now()-SYNC.last>20000) scheduleSync(300); });
  addEventListener("online",()=>{ if(signedIn()) scheduleSync(500); });
  setInterval(()=>{ if(!document.hidden&&signedIn()) syncNow(); },5*60*1000);
}

/* ---------- UI (Saved tab) ---------- */
function ago(t){
  if(!t) return "not yet";
  const s=Math.round((Date.now()-t)/1000);
  return s<45?"just now":s<3600?Math.round(s/60)+" min ago":s<86400?Math.round(s/3600)+" h ago":new Date(t).toLocaleDateString();
}
function syncHTML(){
  const s=authSession();
  if(s) return `<div class="backup sync-box" id="syncBox"><div class="lbl">Sync between devices</div>
    <div class="section-sub" style="padding:0 0 10px">Signed in${s.email?` as <b>${esc(s.email)}</b>`:""}. Highlights, notes and reading-plan progress stay in step on every device where you sign in.</div>
    <div class="sync-status${SYNC.error?" err":""}" id="syncStatus">${syncStatusText()}</div>
    <div class="backup-row"><button class="btn-primary" id="syncNowBtn">Sync now</button><button class="btn-ghost" id="signOutBtn">Sign out</button></div></div>`;
  return `<div class="backup sync-box" id="syncBox"><div class="lbl">Sync between devices</div>
    <div class="section-sub" style="padding:0 0 10px">Sign in on your iPhone, iPad or computer and your highlights, notes and reading plan stay in step automatically.</div>
    <form id="authForm" autocomplete="on">
      <input type="email" id="authEmail" placeholder="Email" autocomplete="email" required>
      <input type="password" id="authPass" placeholder="Password (8+ characters)" autocomplete="current-password" minlength="8" required>
      <div class="backup-row"><button class="btn-primary" type="submit" id="signInBtn">Sign in</button><button class="btn-ghost" type="button" id="signUpBtn">Create account</button></div>
      <button type="button" class="link-btn" id="forgotBtn">Forgot password?</button>
      <div class="sync-msg" id="authMsg"></div>
    </form></div>`;
}
function syncStatusText(){
  if(SYNC.busy) return "Syncing…";
  if(SYNC.error==="offline") return "Offline — changes will sync when you’re back online.";
  if(SYNC.error) return "Last sync didn’t finish: "+esc(SYNC.error)+". It will try again.";
  return "Last synced "+ago(SYNC.last)+".";
}
function refreshSyncUI(){
  const st=document.getElementById("syncStatus");
  if(st){ st.innerHTML=syncStatusText(); st.classList.toggle("err",!!SYNC.error&&!SYNC.busy); }
  const box=document.getElementById("syncBox");
  if(box&&(!!authSession())!==!!document.getElementById("syncNowBtn")){ box.outerHTML=syncHTML(); bindSync(); }
}
function bindSync(){
  const nowBtn=document.getElementById("syncNowBtn");
  if(nowBtn){
    nowBtn.onclick=()=>syncNow();
    document.getElementById("signOutBtn").onclick=()=>{ if(confirm("Sign out? Your notes stay on this device.")) signOut(); };
    return;
  }
  const form=document.getElementById("authForm"), msg=document.getElementById("authMsg");
  const val=()=>({email:document.getElementById("authEmail").value.trim(),pass:document.getElementById("authPass").value});
  const busy=on=>form.querySelectorAll("button").forEach(b=>b.disabled=on);
  form.onsubmit=async e=>{
    e.preventDefault(); const {email,pass}=val(); busy(true); msg.textContent="Signing in…";
    try{ await signIn(email,pass); toast("Signed in — syncing"); renderSaved(); }
    catch(err){ msg.textContent=/confirm/i.test(err.message)?"Please confirm your email first — check your inbox for the link.":/invalid/i.test(err.message)?"Wrong email or password.":err.message; busy(false); }
  };
  document.getElementById("signUpBtn").onclick=async()=>{
    const {email,pass}=val();
    if(!email||pass.length<8){ msg.textContent="Enter your email and a password of at least 8 characters."; return; }
    busy(true); msg.textContent="Creating your account…";
    try{
      const r=await signUp(email,pass);
      if(r==="in"){ toast("Account created — syncing"); renderSaved(); }
      else{ msg.innerHTML="Check your inbox and tap the link to confirm your email. Then sign in here with the same email and password."; busy(false); }
    }catch(err){ msg.textContent=/registered|exists/i.test(err.message)?"That email already has an account — sign in instead.":err.message; busy(false); }
  };
  document.getElementById("forgotBtn").onclick=async()=>{
    const {email}=val(); if(!email){ msg.textContent="Type your email above first."; return; }
    try{ await sbAuth("recover?redirect_to="+encodeURIComponent(siteURL()),{email}); msg.textContent="If that email has an account, a reset link is on its way."; }
    catch(err){ msg.textContent=err.message; }
  };
}
