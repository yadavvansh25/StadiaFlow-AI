const CACHE_NAME = 'stadiaflow-v1';

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(['/', '/manifest.json']);
    })
  );
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      // return response if found, else fetch it from network (and we can catch offline later)
      return response || fetch(event.request).catch(() => {
        // Simple offline fallback
        return new Response('StadiaFlow Offline Mode. You are currently navigating via cached maps.', {
            status: 200,
            headers: new Headers({
                'Content-Type': 'text/plain'
            })
        });
      });
    })
  );
});
