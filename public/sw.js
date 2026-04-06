const CACHE_NAME = 'mitm-tool-v1';
const OFFLINE_URL = '/captive-portal.html';

const ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/captive-portal.html',
  '/favicon.ico'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(() => {
        return caches.match(OFFLINE_URL);
      })
    );
  } else {
    event.respondWith(
      caches.match(event.request).then((response) => {
        return response || fetch(event.request);
      })
    );
  }
});

// Hintergrund-Synchronisation für Validierungsdaten
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-validation') {
    event.waitUntil(syncValidationData());
  }
});

async function syncValidationData() {
  console.log('Synchronisiere Validierungsdaten...');
  // Implementierung der Datensynchronisation
}
