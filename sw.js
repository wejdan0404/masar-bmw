/* MASAR offline navigation cache: no user notes, credentials or external content cached. */
const CACHE_NAME = 'masar-static-v14-design-system-light-mode';
const SCOPE = self.registration.scope;
const CORE = ['./','./index.html','./icon.svg','./manifest.webmanifest'];
self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(CORE)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith('masar-static-') && key !== CACHE_NAME).map(key => caches.delete(key)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET' || !request.url.startsWith(SCOPE)) return;
  if (request.mode !== 'navigate') return;
  event.respondWith(fetch(request).then(response => {
    if (response && response.ok && response.type === 'basic') {
      const copy = response.clone();
      event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.put('./index.html', copy)));
    }
    return response;
  }).catch(() => caches.match('./index.html')));
});