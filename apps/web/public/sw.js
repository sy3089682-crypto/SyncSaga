const CACHE = 'syncsaga-v2';
const STATIC_ASSETS = [
  '/',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png',
  '/robots.txt',
];

// Install: cache static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

// Activate: clean old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Fetch: network-first for API, cache-first for static
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  
  const url = new URL(event.request.url);
  
  // API calls: network-first with offline fallback
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(networkFirst(event.request));
    return;
  }
  
  // Static assets: cache-first
  event.respondWith(cacheFirst(event.request));
});

async function networkFirst(request) {
  const cache = await caches.open(CACHE);
  try {
    const response = await fetch(request);
    if (response.ok) {
      cache.put(request, response.clone());
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
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    return cached || new Response('Offline', { status: 503 });
  }
}

// Push notifications for guests
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

// Notification click: open room
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  const url = event.notification.data?.url || '/';
  const roomId = event.notification.data?.roomId;
  const action = event.action;
  
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Check if there's already a window open for this room
      for (const client of clientList) {
        if (roomId && client.url.includes(`room/${roomId}`)) {
          client.focus();
          return Promise.resolve();
        }
      }
      // Open new window
      return clients.openWindow(roomId ? `/room/${roomId}` : url);
    })
  );
});

// Handle messages from client
self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  if (event.data?.type === 'CACHE_URLS') {
    event.waitUntil(cacheUrls(event.data.urls));
  }
  if (event.data?.type === 'SHOW_NOTIFICATION') {
    self.registration.showNotification(
      event.data.title || 'SyncSaga',
      {
        body: event.data.body || '',
        icon: '/icon-192.png',
        badge: '/icon-192.png',
        data: event.data.data || {},
      }
    );
  }
});

async function cacheUrls(urls) {
  const cache = await caches.open(CACHE);
  await cache.addAll(urls);
}
