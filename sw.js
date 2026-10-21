const CACHE = 'cleantown-sime-darby-v6';
const ASSETS = ['./', './index.html', './manifest.webmanifest', './supabase-config.js', './ai-config.js'];
self.addEventListener('install', event => event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(ASSETS))));
self.addEventListener('activate', event => event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))));
self.addEventListener('fetch', event => event.respondWith(caches.match(event.request).then(cached => cached || fetch(event.request))));

// Ready to display server-sent Web Push messages once a push service is configured.
self.addEventListener('push', event => {
  let data = { title: 'CleanTown collection reminder', body: 'A garbage truck is scheduled to arrive tomorrow.' };
  try { if (event.data) data = { ...data, ...event.data.json() }; } catch (e) { if (event.data) data.body = event.data.text(); }
  event.waitUntil(self.registration.showNotification(data.title || 'CleanTown reminder', {
    body: data.body || 'A garbage truck is scheduled to arrive tomorrow.',
    icon: './icon-192.png', badge: './icon-192.png', data: { url: data.url || './index.html' }
  }));
});
self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil(clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
    for (const client of list) if ('focus' in client) return client.focus();
    return clients.openWindow(event.notification.data?.url || './index.html');
  }));
});
