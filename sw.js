// CleanTown service worker: network-first for the app's own files so updates (including
// supabase-config.js and ai-config.js edits) show up immediately, with the cache as the offline fallback.
const CACHE = 'cleantown-sime-darby-v7';
const ASSETS = ['./', './index.html', './app.css', './app.js', './manifest.webmanifest', './supabase-config.js', './ai-config.js', './icons/icon.svg', './icons/icon-192.png', './icons/icon-512.png'];
const RUNTIME_HOSTS = ['fonts.googleapis.com', 'fonts.gstatic.com', 'cdn.jsdelivr.net'];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(ASSETS)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});
self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin === self.location.origin) {
    if (url.pathname.startsWith('/api/')) return; // recognition API: always live
    event.respondWith(fetch(request).then(response => {
      if (response.ok) { const copy = response.clone(); caches.open(CACHE).then(cache => cache.put(request, copy)); }
      return response;
    }).catch(() => caches.match(request).then(cached => cached || (request.mode === 'navigate' ? caches.match('./index.html') : Response.error()))));
    return;
  }
  if (RUNTIME_HOSTS.includes(url.hostname)) {
    // Fonts and the Supabase client library: serve from cache, refresh in the background.
    event.respondWith(caches.open(CACHE).then(cache => cache.match(request).then(cached => {
      const network = fetch(request).then(response => { if (response.ok || response.type === 'opaque') cache.put(request, response.clone()); return response; }).catch(() => cached);
      return cached || network;
    })));
  }
});

// Ready to display server-sent Web Push messages once a push service is configured.
self.addEventListener('push', event => {
  let data = { title: 'CleanTown collection reminder', body: 'A garbage truck is scheduled to arrive tomorrow.' };
  try { if (event.data) data = { ...data, ...event.data.json() }; } catch (e) { if (event.data) data.body = event.data.text(); }
  event.waitUntil(self.registration.showNotification(data.title || 'CleanTown reminder', {
    body: data.body || 'A garbage truck is scheduled to arrive tomorrow.',
    icon: './icons/icon-192.png', badge: './icons/icon-192.png', data: { url: data.url || './index.html#trucks' }
  }));
});
self.addEventListener('notificationclick', event => {
  event.notification.close();
  const target = (event.notification.data && event.notification.data.url) || './index.html#trucks';
  event.waitUntil(clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
    for (const client of list) if ('focus' in client) return client.focus();
    return clients.openWindow(target);
  }));
});
