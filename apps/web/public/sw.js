const CACHE = 'syncsaga-v3';
const STATIC_ASSETS = [
  '/',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png',
  '/robots.txt',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key.startsWith('syncsaga-') && key !== CACHE)
          .map((key) => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // Never cache authentication/session URLs. OAuth callbacks and auth pages
  // must always reach the network so a stale PWA cannot break login.
  if (
    url.pathname.startsWith('/auth/') ||
    url.pathname.startsWith('/api/auth/') ||
    url.pathname.includes('/callback') ||
    url.searchParams.has('code') ||
    url.searchParams.has('error') ||
    url.searchParams.has('access_token') ||
    url.searchParams.has('refresh_token')
  ) {
    event.respondWith(fetch(event.request));
    return;
  }

  // API calls are always network-first. Do not let stale authenticated data
  // masquerade as current server state.
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(networkFirst(event.request));
    return;
  }

  // HTML/navigation requests must be network-first. The previous cache-first
  // strategy could keep an installed PWA on an old Next.js application shell.
  if (event.request.mode === 'navigate' || event.request.destination === 'document') {
    event.respondWith(networkFirstNavigation(event.request));
    return;
  }

  // Immutable-ish static assets can safely use cache-first, with the versioned
  // cache name forcing a clean refresh when the service worker changes.
  if (
    url.pathname.startsWith('/_next/static/') ||
    url.pathname.match(/\.(?:png|jpg|jpeg|gif|webp|svg|ico|woff|woff2|ttf|otf)$/i)
  ) {
    event.respondWith(cacheFirst(event.request));
    return;
  }

  event.respondWith(networkFirst(event.request));
});

async function networkFirst(request) {
  const cache = await caches.open(CACHE);
  try {
    const response = await fetch(request);
    if (response.ok && response.type !== 'opaque') {
      await cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await cache.match(request);
    return cached || new Response('Offline', { status: 503 });
  }
}

async function networkFirstNavigation(request) {
  try {
    const response = await fetch(request, { cache: 'no-store' });
    return response;
  } catch {
    const cache = await caches.open(CACHE);
    const cached = await cache.match('/');
    return cached || new Response('Offline', { status: 503 });
  }
}

async function cacheFirst(request) {
  const cache = await caches.open(CACHE);
  const cached = await cache.match(request);
  if (cached) return cached;

  try {
    const response = await fetch(request);
    if (response.ok && response.type !== 'opaque') {
      await cache.put(request, response.clone());
    }
    return response;
  } catch {
    return cached || new Response('Offline', { status: 503 });
  }
}

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
          return client.focus();
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
      self.registration.showNotification(
        event.data.title || 'SyncSaga',
        {
          body: event.data.body || '',
          icon: '/icon-192.png',
          badge: '/icon-192.png',
          data: event.data.data || {},
        }
      )
    );
  }
});

async function cacheUrls(urls) {
  const cache = await caches.open(CACHE);
  await cache.addAll(urls);
}
