"use strict";
/* Selah — daily reading reminder (Settings → Daily reminder).
   Uses Web Push: the browser subscribes with the server's public key, and the selah-push edge function
   (supabase/functions/selah-push) sends one notification a day at the chosen time in this device's time zone,
   with the verse of the day; tapping it opens the verse. Works without signing in.
   iPhone and iPad only allow web notifications for apps added to the Home Screen (iOS 16.4 or later). */

const PUSH_FN=SB_URL+"/functions/v1/selah-push";
const REM={busy:false, msg:""};
const remState=()=>store.get("reminder",{on:false,at:"07:00"});
const pushSupported=()=>"serviceWorker" in navigator&&"PushManager" in window&&"Notification" in window;
const isIOS=()=>/iPhone|iPad|iPod/.test(navigator.userAgent)||(navigator.platform==="MacIntel"&&navigator.maxTouchPoints>1);
function b64urlToBytes(s){ const p="=".repeat((4-s.length%4)%4), b=atob((s+p).replace(/-/g,"+").replace(/_/g,"/")); return Uint8Array.from(b,c=>c.charCodeAt(0)); }
async function pushCall(body){
  const r=await fetch(PUSH_FN,{method:"POST",headers:{"Content-Type":"application/json","apikey":SB_KEY},body:JSON.stringify(body)});
  const j=await r.json().catch(()=>({}));
  if(!r.ok) throw new Error(j.error||("HTTP "+r.status));
  return j;
}
async function currentSub(){ if(!pushSupported()) return null; const reg=await navigator.serviceWorker.getRegistration(); return reg?reg.pushManager.getSubscription():null; }
async function enableReminder(at){
  if(!pushSupported()) throw new Error(isIOS()&&!isStandalone()?"On iPhone and iPad, add Selah to your Home Screen first (Share → Add to Home Screen), then turn this on from there.":"This browser can’t show notifications.");
  const perm=await Notification.requestPermission();
  if(perm!=="granted") throw new Error(perm==="denied"?"Notifications are blocked for Selah. Allow them in your browser or device settings, then try again.":"Notifications weren’t allowed.");
  const reg=await navigator.serviceWorker.ready;
  let sub=await reg.pushManager.getSubscription();
  if(!sub){
    const {publicKey}=await (await fetch(PUSH_FN+"?action=key",{headers:{"apikey":SB_KEY}})).json();
    sub=await reg.pushManager.subscribe({userVisibleOnly:true, applicationServerKey:b64urlToBytes(publicKey)});
  }
  await pushCall({action:"subscribe", sub:sub.toJSON(), at, tz:Intl.DateTimeFormat().resolvedOptions().timeZone||"UTC"});
  store.set("reminder",{on:true,at});
}
async function disableReminder(){
  const sub=await currentSub();
  if(sub){ pushCall({action:"unsubscribe",endpoint:sub.endpoint}).catch(()=>{}); await sub.unsubscribe().catch(()=>{}); }
  store.set("reminder",{...remState(),on:false});
}
function fmtTime(at){ const [h,m]=at.split(":").map(Number); return new Date(2000,0,1,h,m).toLocaleTimeString(undefined,{hour:"numeric",minute:"2-digit"}); }

SETTINGS_SECTIONS.push({id:"reminder", title:"Daily reminder", html:()=>{
  const r=remState(), blockedIOS=isIOS()&&!isStandalone();
  return `<div class="set-row"><div class="set-l">Remind me to read<small>${r.on?`Every day at ${esc(fmtTime(r.at))}, with the verse of the day`:"A notification each day with the verse of the day"}</small></div>${toggle("setRem",r.on,"Daily reminder")}</div>
    <div class="set-row"><div class="set-l">Time<small>${esc(Intl.DateTimeFormat().resolvedOptions().timeZone||"")}</small></div><input type="time" id="setRemAt" value="${esc(r.at)}" step="300" aria-label="Reminder time"></div>
    ${r.on?'<div class="set-row"><div class="set-l">Check it works</div><button class="btn-ghost set-test" id="setRemTest">Send a test</button></div>':""}
    ${blockedIOS?`<div class="set-note">On iPhone and iPad, notifications work once Selah is on your Home Screen: tap <b>Share</b> → <b>Add to Home Screen</b>, open Selah from there, then turn this on.</div>`:""}
    ${REM.msg?`<div class="set-note">${esc(REM.msg)}</div>`:""}`;
}, bind:root=>{
  const t=root.querySelector("#setRem"), at=root.querySelector("#setRemAt"), test=root.querySelector("#setRemTest");
  const run=async fn=>{ if(REM.busy) return; REM.busy=true; REM.msg=""; t.disabled=true;
    try{ await fn(); }catch(e){ REM.msg=e.message||"That didn’t work — try again."; } finally{ REM.busy=false; paintSettings(); } };
  t.onclick=()=>run(async()=>{ if(remState().on){ await disableReminder(); toast("Reminder off"); } else { await enableReminder(at.value||"07:00"); toast(`Reminder set for ${fmtTime(remState().at)}`); } });
  at.onchange=()=>{ const v=at.value; if(!/^\d\d:\d\d$/.test(v)) return; if(remState().on) run(async()=>{ await enableReminder(v); toast(`Reminder moved to ${fmtTime(v)}`); }); else store.set("reminder",{...remState(),at:v}); };
  if(test) test.onclick=()=>run(async()=>{ const s=await currentSub(); if(!s) throw new Error("Turn the reminder off and on again to reconnect."); const r=await pushCall({action:"test",endpoint:s.endpoint}); REM.msg=r.result==="sent"?"Sent — it should appear in a moment.":"Couldn’t reach this device; turn the reminder off and on again."; });
}});
// If the browser dropped the subscription (cleared data, revoked permission), show the switch as off.
(async()=>{ try{ if(remState().on&&pushSupported()&&(Notification.permission!=="granted"||!(await currentSub()))) store.set("reminder",{...remState(),on:false}); }catch(e){} })();
// Notification taps: the service worker asks an open window to go to the verse.
if("serviceWorker" in navigator) navigator.serviceWorker.addEventListener("message",e=>{ const h=e.data&&e.data.selahGoto; if(typeof h==="string"&&h.startsWith("#/")){ if(location.hash!==h) location.hash=h; } });
