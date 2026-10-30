// cache del cascaron para que abra sin internet (el seller si necesita internet)
const C = 'tadapocs-v1';
const A = ['./','./index.html','./manifest.webmanifest','./icon-180.png','./icon-192.png','./icon-512.png','./xlsx.full.min.js'];
self.addEventListener('install', e => { e.waitUntil(caches.open(C).then(c => c.addAll(A.map(u=>new Request(u,{mode:'no-cors'})) ).catch(()=>{}))); self.skipWaiting(); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(k => Promise.all(k.filter(x=>x!==C).map(x=>caches.delete(x))))); self.clients.claim(); });
self.addEventListener('fetch', e => {
  const u = e.request.url;
  if (u.indexOf('tadadelivery.com.ec') >= 0) return; // el seller siempre en vivo
  e.respondWith(caches.match(e.request).then(r => r || fetch(e.request).then(res => { try { const cp=res.clone(); caches.open(C).then(c=>c.put(e.request,cp)); } catch(x){} return res; }).catch(()=>r)));
});
