/* Selah service worker — makes the app open and read offline.
   SHELL_V: bump with any change to code/styles (it must match the ?v= on the scripts in index.html).
   DATA_V:  must equal DATA_V in app.js; bump both when anything in data/ or img/art/ changes. */
const SHELL_V="33";
const DATA_V="20";
const SHELL="selah-shell-"+SHELL_V, DATA="selah-data";
const q="?v="+SHELL_V, dq="?v="+DATA_V;
const SHELL_FILES=["./","index.html","manifest.webmanifest",
  "style.css"+q,"app.js"+q,"book.js"+q,"lexicon.js"+q,"plans.js"+q,"readaloud.js"+q,"share.js"+q,"sync.js"+q,"pictures.js"+q,"router.js"+q,"settings.js"+q,"commentary.js"+q,"search.js"+q,"maps.js"+q,"timeline.js"+q,"memory.js"+q,"journal.js"+q,"trivia.js"+q,"reminder.js"+q,
  "img/icons/icon-192.png"+q,"img/icons/icon-512.png"+q,"img/icons/maskable-512.png"+q,"img/icons/icon-180.png"+q,"img/icons/favicon-64.png"+q];
// The core of the app works offline from the first visit: ASV text, study trails, typology, artwork.
const CORE_DATA=["data/bible.json","data/study.json","data/typology.json","data/files.json",
  "img/art/sinai.jpg","img/art/bronze-serpent.jpg","img/art/prophet.jpg"].map(p=>p+dq);

self.addEventListener("install",e=>{
  e.waitUntil((async()=>{
    const s=await caches.open(SHELL); await s.addAll(SHELL_FILES);
    const d=await caches.open(DATA);
    await Promise.all(CORE_DATA.map(async u=>{ if(!(await d.match(u))) await d.add(u); }));
    await self.skipWaiting();
  })());
});
self.addEventListener("activate",e=>{
  e.waitUntil((async()=>{
    for(const k of await caches.keys()) if(k.startsWith("selah-shell-")&&k!==SHELL) await caches.delete(k);
    // Drop data saved under an older data version; it will be fetched fresh when needed.
    const d=await caches.open(DATA);
    for(const r of await d.keys()){ const v=new URL(r.url).searchParams.get("v"); if(v!==DATA_V) await d.delete(r); }
    await self.clients.claim();
  })());
});
self.addEventListener("fetch",e=>{
  const req=e.request, url=new URL(req.url);
  if(req.method!=="GET"||url.origin!==location.origin) return;
  if(req.mode==="navigate"){
    // Page itself: network first (so updates arrive), saved copy when offline.
    e.respondWith((async()=>{
      try{
        const r=await fetch(req);
        // Keep a copy of the app page only — never an error page or some other address.
        const scope=new URL(self.registration.scope).pathname;
        if(r.ok&&(url.pathname===scope||url.pathname===scope+"index.html")){ const s=await caches.open(SHELL); s.put("index.html",r.clone()); }
        return r;
      }
      catch(_){ return (await caches.match("index.html"))||(await caches.match("./"))||Response.error(); }
    })());
    return;
  }
  const isData=/\/(data|img\/art)\//.test(url.pathname);
  e.respondWith((async()=>{
    const cache=await caches.open(isData?DATA:SHELL);
    const hit=await cache.match(req); if(hit) return hit;
    const r=await fetch(req);
    if(r.ok&&(isData||url.search)) cache.put(req,r.clone());      // versioned files are safe to keep
    return r;
  })());
});

// Daily reminder (see reminder.js and supabase/functions/selah-push).
self.addEventListener("push",e=>{
  let d={}; try{ d=e.data?e.data.json():{}; }catch(_){ d={body:e.data?e.data.text():""}; }
  e.waitUntil(self.registration.showNotification(d.title||"Selah",{
    body:d.body||"Time to read.", icon:"img/icons/icon-192.png"+q, tag:d.tag||"selah-daily", renotify:false,
    data:{url:d.url||"#/home"}}));
});
self.addEventListener("notificationclick",e=>{
  e.notification.close();
  const hash=(e.notification.data&&e.notification.data.url)||"#/home";
  e.waitUntil((async()=>{
    const wins=await clients.matchAll({type:"window",includeUncontrolled:true});
    const w=wins.find(c=>c.url.startsWith(self.registration.scope));
    if(w){ await w.focus(); w.postMessage({selahGoto:hash}); return; }
    await clients.openWindow(self.registration.scope+hash);
  })());
});
