/**
 * CRM Service Worker
 * - Push Notifications
 * - Offline Cache (network-first)
 * - Periodic Background Sync (tasks + projects, every 15 min)
 * - Stale-while-revalidate for synced API routes
 */

const CACHE_NAME = 'crm-v5';
const API_CACHE_NAME = 'crm-api-v5';
const OFFLINE_URL = '/dashboard';

// Assets to pre-cache on install
const PRE_CACHE = [
  '/',
  '/dashboard',
  '/favicon.png',
  '/apple-touch-icon.png',
];

// API routes that get stale-while-revalidate caching + periodic sync
const SYNC_ROUTES = [
  '/api/v1/tasks',
  '/api/v1/projects',
];

// Periodic sync tag
const SYNC_TAG = 'crm-data-sync';

// ─── IndexedDB helpers (persist auth token across SW restarts) ────────────────

const IDB_NAME = 'crm-sw-meta';
const IDB_STORE = 'kv';

function idbOpen() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(IDB_NAME, 1);
    req.onupgradeneeded = (e) => {
      e.target.result.createObjectStore(IDB_STORE, { keyPath: 'k' });
    };
    req.onsuccess = (e) => resolve(e.target.result);
    req.onerror = () => reject(req.error);
  });
}

async function idbGet(key) {
  try {
    const db = await idbOpen();
    return await new Promise((resolve) => {
      const req = db.transaction(IDB_STORE, 'readonly').objectStore(IDB_STORE).get(key);
      req.onsuccess = () => resolve(req.result?.v ?? null);
      req.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}

async function idbSet(key, value) {
  try {
    const db = await idbOpen();
    await new Promise((resolve, reject) => {
      const tx = db.transaction(IDB_STORE, 'readwrite');
      tx.objectStore(IDB_STORE).put({ k: key, v: value });
      tx.oncomplete = resolve;
      tx.onerror = () => reject(tx.error);
    });
  } catch {
    // ignore
  }
}

// ─── Install ──────────────────────────────────────────────────────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(PRE_CACHE))
      .then(() => self.skipWaiting()),
  );
});

// ─── Activate ─────────────────────────────────────────────────────────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((k) => k !== CACHE_NAME && k !== API_CACHE_NAME)
            .map((k) => caches.delete(k)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

// ─── Message (receive auth token from page) ───────────────────────────────────
self.addEventListener('message', (event) => {
  if (!event.data) return;

  // Токен теперь в httpOnly-cookie — SW получает её при fetch (credentials),
  // сообщение SET_TOKEN больше не нужно.

  // Manual sync trigger from page (e.g., on login)
  if (event.data.type === 'SYNC_NOW') {
    syncCrmData().catch(() => {});
  }

  // Clear cached API responses when user switches company account
  if (event.data.type === 'CLEAR_API_CACHE') {
    caches.delete(API_CACHE_NAME).catch(() => {});
  }
});

// ─── Network-First for API sync routes (fallback to cache when offline) ──────
function isMatchingSyncRoute(url) {
  return SYNC_ROUTES.some((route) => url.includes(route));
}

async function networkFirstWithCacheFallback(request) {
  const cache = await caches.open(API_CACHE_NAME);

  try {
    const response = await fetch(request.clone());
    if (response.ok) {
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    // Network failed — serve from cache so offline mode still works
    const cached = await cache.match(request);
    if (cached) return cached;

    return new Response(JSON.stringify({ data: [], message: 'Offline' }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

// ─── Fetch ────────────────────────────────────────────────────────────────────
self.addEventListener('fetch', (event) => {
  const { request } = event;

  // Stale-while-revalidate for GET /api/v1/tasks and /api/v1/projects
  if (
    request.method === 'GET' &&
    request.url.startsWith(self.location.origin) &&
    isMatchingSyncRoute(request.url)
  ) {
    event.respondWith(networkFirstWithCacheFallback(request));
    return;
  }

  // Skip non-GET, cross-origin, all other API and socket requests
  if (
    request.method !== 'GET' ||
    !request.url.startsWith(self.location.origin) ||
    request.url.includes('/api/') ||
    request.url.includes('/socket.io')
  ) {
    return;
  }

  // Next.js HMR — skip
  if (request.url.includes('_next/webpack-hmr')) return;

  // Network-first for all other routes
  event.respondWith(
    fetch(request)
      .then((response) => {
        if (
          response.ok &&
          (request.mode === 'navigate' || request.url.includes('/_next/static/'))
        ) {
          const responseClone = response.clone(); // clone synchronously before body is consumed
          caches.open(CACHE_NAME).then((cache) => cache.put(request, responseClone));
        }
        return response;
      })
      .catch(async () => {
        const cached = await caches.match(request);
        if (cached) return cached;

        if (request.mode === 'navigate') {
          const fallback = await caches.match(OFFLINE_URL);
          if (fallback) return fallback;
        }

        return new Response('Offline', { status: 503 });
      }),
  );
});

// ─── Periodic Background Sync ─────────────────────────────────────────────────
self.addEventListener('periodicsync', (event) => {
  if (event.tag === SYNC_TAG) {
    event.waitUntil(syncCrmData());
  }
});

/**
 * Silently fetch tasks + projects and store in API cache.
 * Runs every ~15 min (browser decides exact timing).
 * Requires auth token stored in IndexedDB via SET_TOKEN message.
 */
async function syncCrmData() {
  // Токен в httpOnly-cookie — same-origin fetch приложит её сам. Пропускаем,
  // если нет читаемого маркера сессии (crm-session; сам crm_at JS/SW не видят).
  try {
    if (self.cookieStore) {
      const session = await self.cookieStore.get('crm-session');
      if (!session) return; // не авторизован — пропускаем
    }
  } catch {
    /* cookieStore недоступен — пробуем всё равно, 401 просто не закешируется */
  }

  const endpoints = [
    '/api/v1/tasks?limit=50',
    '/api/v1/projects?limit=20',
  ];

  const cache = await caches.open(API_CACHE_NAME);

  const results = await Promise.allSettled(
    endpoints.map(async (path) => {
      const url = self.location.origin + path;
      const response = await fetch(url, { credentials: 'include' });
      if (response.ok) {
        // Cache with original path key so stale-while-revalidate finds it
        await cache.put(new Request(url), response.clone());
      }
      return response.ok;
    }),
  );

  const synced = results.filter((r) => r.status === 'fulfilled' && r.value).length;

  // Record sync time
  await idbSet('lastSyncAt', Date.now());

  // Notify all open windows that fresh data is ready
  const clients = await self.clients.matchAll({ type: 'window' });
  for (const client of clients) {
    client.postMessage({
      type: 'SYNC_COMPLETE',
      synced,
      total: endpoints.length,
      timestamp: Date.now(),
    });
  }
}

// ─── Push Notification ────────────────────────────────────────────────────────
self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data?.json() ?? {};
  } catch {
    data = { title: event.data?.text() ?? 'CRM Система' };
  }

  const title = data.title || 'CRM Система';

  const vibrate =
    data.priority === 3
      ? [300, 100, 300, 100, 300]
      : data.priority === 1
        ? [100]
        : [200, 100, 200];

  const tag =
    data.notificationType === 'chat_message'
      ? `chat_message_${data.entityId}`
      : data.notificationType || 'crm-notification';

  const options = {
    body: data.message || '',
    icon: '/apple-touch-icon.png',
    badge: '/favicon.png',
    tag,
    renotify: true,
    vibrate,
    data: { url: data.actionUrl || '/dashboard' },
    actions: [
      { action: 'open', title: 'Открыть' },
      { action: 'dismiss', title: 'Закрыть' },
    ],
    timestamp: Date.now(),
  };

  event.waitUntil(
    (async () => {
      // Let any open window update its in-app UI…
      try {
        const windowClients = await self.clients.matchAll({
          type: 'window',
          includeUncontrolled: true,
        });
        for (const c of windowClients) {
          c.postMessage({ type: 'PUSH_NOTIFICATION', data });
        }
      } catch {
        // ignore — must not block the notification below
      }

      // …and ALWAYS show a system notification FIRST. iOS revokes/throttles the
      // push subscription (and silently drops the push) if a push event does not
      // result in a visible notification, so nothing above may throw before this.
      await self.registration.showNotification(title, options);

      // App icon badge (Badging API) — best-effort, AFTER the notification so a
      // failure here can never suppress the push. Only the SW runs when the app
      // is backgrounded/closed, so we set it from the count in the payload.
      try {
        if (typeof data.badgeCount === 'number' && 'setAppBadge' in self.navigator) {
          if (data.badgeCount > 0) {
            await self.navigator.setAppBadge(data.badgeCount);
          } else if (self.navigator.clearAppBadge) {
            await self.navigator.clearAppBadge();
          }
        }
      } catch {
        // ignore — badge is a progressive enhancement
      }
    })()
  );
});

// ─── Notification Click ───────────────────────────────────────────────────────
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'dismiss') return;

  const targetUrl = event.notification.data?.url || '/dashboard';

  event.waitUntil(
    self.clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((windowClients) => {
        for (const client of windowClients) {
          if ('focus' in client) {
            client.navigate(targetUrl);
            return client.focus();
          }
        }
        return self.clients.openWindow(targetUrl);
      }),
  );
});

// ─── Background Sync — offline queue ─────────────────────────────────────────

const OFFLINE_DB_NAME = 'crm-offline';
const OFFLINE_STORE = 'queue';

function openOfflineDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(OFFLINE_DB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(OFFLINE_STORE)) {
        const store = db.createObjectStore(OFFLINE_STORE, { keyPath: 'id' });
        store.createIndex('createdAt', 'createdAt', { unique: false });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function getAllQueueItems() {
  const db = await openOfflineDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(OFFLINE_STORE, 'readonly');
    const req = tx.objectStore(OFFLINE_STORE).index('createdAt').getAll();
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function removeQueueItem(id) {
  const db = await openOfflineDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(OFFLINE_STORE, 'readwrite');
    tx.objectStore(OFFLINE_STORE).delete(id);
    tx.oncomplete = resolve;
    tx.onerror = () => reject(tx.error);
  });
}

async function processPendingQueue() {
  const items = await getAllQueueItems();
  if (!items.length) return { processed: 0, failed: 0 };

  let processed = 0;
  let failed = 0;

  for (const item of items) {
    try {
      const response = await fetch(item.url, {
        method: item.method,
        credentials: 'include', // токен в httpOnly-cookie (same-origin)
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(item.body),
      });

      if (response.ok || response.status === 409) {
        await removeQueueItem(item.id);
        processed++;
      } else if (response.status >= 400 && response.status < 500) {
        // Client error — won't succeed on retry, discard
        await removeQueueItem(item.id);
        failed++;
      } else {
        failed++; // server error — keep for next sync
      }
    } catch {
      failed++; // network still down — keep
    }
  }

  // Notify all open windows
  const clients = await self.clients.matchAll({ type: 'window' });
  for (const client of clients) {
    client.postMessage({ type: 'QUEUE_PROCESSED', processed, failed });
  }

  return { processed, failed };
}

self.addEventListener('sync', (event) => {
  if (event.tag === 'crm-sync') {
    event.waitUntil(processPendingQueue());
  }
});

// ─── Push Subscription Change ─────────────────────────────────────────────────
self.addEventListener('pushsubscriptionchange', (event) => {
  event.waitUntil(
    self.clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((clients) => {
        for (const client of clients) {
          client.postMessage({
            type: 'PUSH_SUBSCRIPTION_CHANGED',
            subscription: event.newSubscription?.toJSON() ?? null,
          });
        }
      }),
  );
});
