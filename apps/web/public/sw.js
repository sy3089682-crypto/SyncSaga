const CACHE = 'syncsaga-v3';
const STATIC_ASSETS = [
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png',
  '/robots.txt',
];

// Install: cache only immutable/static assets. Never cache the HTML app shell.
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

// Activate: remove every previous SyncSaga cache and immediately control clients.
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key.startsWith('syncsaga-') && key !== CACHE)
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;

  // OAuth/auth routes must always hit the network. Never serve a cached callback,
  // login page, redirect, or auth response from an installed PWA.
  if (
    url.pathname.startsWith('/auth/') ||
    url.pathname === '/dashboard' ||
    url.pathname.startsWith('/room/')
  ) {
    event.respondWith(networkOnly(event.request));
    return;
  }

  // API calls: network-first with offline fallback.
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(networkFirst(event.request));
    return;
  }

  // Navigations/app HTML: network-first so installed PWAs never remain on an
  // old landing page after a deployment. Fall back to the last cached response.
  if (event.request.mode === 'navigate' || event.request.destination === 'document') {
    event.respondWith(networkFirst(event.request));
    return;
  }

  // Immutable/static assets: cache-first.
  event.respondWith(cacheFirst(event.request));
});

async function networkOnly(request) {
  return fetch(request, { cache: 'no-store' });
}

async function networkFirst(request) {
  const cache = await caches.open(CACHE);
  try {
    const response = await fetch(request, { cache: 'no-store' });
    if (response.ok && request.method === 'GET') {
      await cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await cache.match(request);
    return cached || new Response('Offline', { status: 503 });
  }
}

async function cacheFirst(request) {
  const cache = await caches.open(CACHE);
  const cached = await cache.match(request);
  if (cached) return cached;

  try {
    const response = await fetch(request);
    if (response.ok) {
      await cache.put(request, response.clone());
    }
    return response;
  } catch {
    return new Response('Offline', { status: 503 });
  }
}

// Push notifications.
self.addEventListener('push', (event) => {
  if (!event.data) return;

  let data;
  try {
    data = event.data.json();
  } catch {
    data = { title: 'SyncSaga', body: 'New notification', url: '/' };
  }

  const options = {
    body: data.body || 'New notification',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    vibrate: [100, 50, 100],
    data: {
      url: data.url || '/',
      roomId: data.roomId,
    },
    actions: data.actions || [],
    tag: data.tag || 'syncsaga-notification',
    renotify: data.renotify || false,
  };

  event.waitUntil(
    self.registration.showNotification(data.title || 'SyncSaga', options)
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const url = event.notification.data?.url || '/';
  const roomId = event.notification.data?.roomId;

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (roomId && client.url.includes(`room/${roomId}`)) {
          client.focus();
          return;
        }
      }
      return clients.openWindow(roomId ? `/room/${roomId}` : url);
    })
  );
});

self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  if (event.data?.type === 'CACHE_URLS') {
    event.waitUntil(cacheUrls(event.data.urls));
  }
  if (event.data?.type === 'SHOW_NOTIFICATION') {
    event.waitUntil(
      self.registration.showNotification(event.data.title || 'SyncSaga', {
        body: event.data.body || '',
        icon: '/icon-192.png',
        badge: '/icon-192.png',
        data: event.data.data || {},
      })
    );
  }
});

async function cacheUrls(urls) {
  const cache = await caches.open(CACHE);
  await cache.addAll(urls);
}
