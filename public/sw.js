
// sw.js para relative base con Firebase Cloud Messaging

const CACHE_NAME = 'mi-panel-academico-cache-v24';
const FILES_TO_CACHE = [
  './index.html',
  './manifest.json',
];

// --- FIREBASE CLOUD MESSAGING SETUP ---
let messaging;
let app;

// Define event handlers FIRST (at top level)
self.addEventListener('push', (event) => {
  const data = event.data ? event.data.json() : {};
  const title = data.title || 'Mi Panel Académico';
  const options = {
    body: data.message || 'Tienes una nueva notificación.',
    icon: './icons/icon-192x192.png',
    badge: './icons/icon-192x192.png',
    data: { url: data.url || '/' }
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window' }).then((windowClients) => {
      const url = event.notification.data?.url;
      for (let i = 0; i < windowClients.length; i++) {
        const client = windowClients[i];
        if (client.url === url && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(url || '/');
      }
    })
  );
});

// Firebase installation
self.addEventListener('install', (event) => {
  console.log('[SW] Installing Firebase...');
  
  event.waitUntil(
    Promise.all([
      // Precachear archivos necesarios
      caches.open(CACHE_NAME).then(cache => cache.addAll(FILES_TO_CACHE)),
      // Instalar Firebase scripts
      importScripts(
        'https://www.gstatic.com/firebasejs/9.22.0/firebase-app-compat.js',
        'https://www.gstatic.com/firebasejs/9.22.0/firebase-messaging-compat.js',
        'https://www.gstatic.com/firebasejs/9.22.0/firebase-analytics-compat.js'
      )
    ]).then(() => {
      console.log('[SW] Firebase scripts loaded, initializing...');
      
      try {
        const firebaseConfig = {
          apiKey: 'AIzaSyDRk6xK2NmbG20dgHqBgdyYTREnrcVl_iA',
          authDomain: 'consulta-pps-uflo.firebaseapp.com',
          projectId: 'consulta-pps-uflo',
          storageBucket: 'consulta-pps-uflo.firebasestorage.app',
          messagingSenderId: '977860997987',
          appId: '1:977860997987:web:ffc7e7716cd5da02c9d956'
        };

        app = firebase.initializeApp(firebaseConfig);
        messaging = firebase.messaging();
        
        // Setup Firebase background message handler
        messaging.onMessage((payload) => {
          console.log('[SW] Received Firebase message:', payload);
          
          const notificationTitle = payload.notification?.title || 'Notificación';
          const notificationOptions = {
            body: payload.notification?.body || '',
            icon: './icons/icon-192x192.png',
            badge: './icons/icon-72x72.png',
            data: payload.data || {},
            tag: 'fcm-notification',
            requireInteraction: true
          };

          return self.registration.showNotification(notificationTitle, notificationOptions);
        });
        
        console.log('[SW] ✅ Firebase initialized');
      } catch (err) {
        console.error('[SW] ❌ Firebase initialization error:', err);
      }
    }).catch((err) => {
      console.error('[SW] ❌ Failed to install:', err);
    })
  );
  
  self.skipWaiting();
});

// Activar y purgar caches viejas
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating service worker...');
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.map((key) => (key !== CACHE_NAME ? caches.delete(key) : undefined))
      )
    )
  );
  self.clients.claim();
});

// Network-first fetch strategy con fallback a cache
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET' || event.request.url.startsWith('chrome-extension://')) {
    return;
  }

  event.respondWith(
    (async () => {
      try {
        const networkResponse = await fetch(event.request);

        if (networkResponse.status === 404 && (event.request.url.endsWith('.css') || event.request.url.endsWith('.js'))) {
          return new Response('', {
            status: 200,
            headers: { 'Content-Type': event.request.url.endsWith('.css') ? 'text/css' : 'application/javascript' }
          });
        }

        if (networkResponse && networkResponse.ok) {
          const copy = networkResponse.clone();
          const cache = await caches.open(CACHE_NAME);
          cache.put(event.request, copy).catch(() => { });
        }
        return networkResponse;
      } catch (err) {
        const cached = await caches.match(event.request);
        if (cached) return cached;

        if (event.request.mode === 'navigate') {
          const fallback = await caches.match('./index.html');
          if (fallback) return fallback;
        }

        return new Response(null, { status: 404, statusText: 'Not Found' });
      }
    })()
  );
});
