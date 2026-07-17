// SkillBridge offline shell — network-first with cache fallback.
// Fresh content when online; the last-seen app when offline.
const VERSION = 'sb-v1';

self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET' || new URL(request.url).origin !== self.location.origin) return;
  event.respondWith(
    caches.open(VERSION).then(async (cache) => {
      try {
        const fresh = await fetch(request);
        if (fresh.ok) cache.put(request, fresh.clone());
        return fresh;
      } catch {
        const cached = await cache.match(request, { ignoreSearch: true });
        if (cached) return cached;
        // navigation fallback: the app shell
        if (request.mode === 'navigate') {
          const shell = await cache.match(new URL(self.registration.scope).pathname);
          if (shell) return shell;
        }
        return Response.error();
      }
    })
  );
});
