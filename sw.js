/* Cache only application files, never personal notes, PDFs or external media. */
const CACHE_NAME='masar-static-v19-selected-bmw-hero';
const SCOPE=self.registration.scope;
const CORE=['./','./index.html','./assets/site.css','./assets/course-data.js','./assets/site.js','./assets/masar-bmw-selected.webp','./icon.svg','./manifest.webmanifest'];
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE_NAME).then(c=>c.addAll(CORE)).then(()=>self.skipWaiting())));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('masar-static-')&&k!==CACHE_NAME).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',e=>{
 const req=e.request;
 if(req.method!=='GET'||!req.url.startsWith(SCOPE))return;
 if(req.mode==='navigate'){
   e.respondWith(fetch(req).then(res=>{
     if(res&&res.ok){const copy=res.clone();e.waitUntil(caches.open(CACHE_NAME).then(c=>c.put('./index.html',copy)))}
     return res;
   }).catch(()=>caches.match('./index.html')));
   return;
 }
 if(new URL(req.url).pathname.includes('/assets/')){
   e.respondWith(caches.match(req).then(cached=>cached||fetch(req)));
 }
});
