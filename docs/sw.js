// sw.js - Service Worker untuk PT. BIOLI LESTARI
const CACHE_NAME = 'bioli-app-v1.0.0'; // ⚠️ UBAH VERSI INI SETIAP UPDATE
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@500;700&display=swap',
  'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js'
];

// 1. INSTALL - Cache semua aset saat pertama kali dibuka
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[SW] Caching app assets...');
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
  self.skipWaiting(); // Langsung aktifkan SW baru tanpa menunggu tab lama ditutup
});

// 2. ACTIVATE - Bersihkan cache lama saat versi baru aktif
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => {
            console.log('[SW] Deleting old cache:', name);
            return caches.delete(name);
          })
      );
    })
  );
  self.clients.claim(); // Ambil alih kontrol dari SW lama
});

// 3. FETCH - Strategi: Network First, Fallback ke Cache
self.addEventListener('fetch', (event) => {
  // Abaikan request non-GET (POST, PUT, dll)
  if (event.request.method !== 'GET') return;

  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        // Jika berhasil fetch dari internet, update cache
        const responseClone = networkResponse.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseClone);
        });
        return networkResponse;
      })
      .catch(() => {
        // Jika offline, ambil dari cache
        return caches.match(event.request).then((cachedResponse) => {
          if (cachedResponse) return cachedResponse;
          // Fallback untuk navigasi offline
          if (event.request.mode === 'navigate') {
            return caches.match('./index.html');
          }
          return new Response('Offline', { status: 503 });
        });
      })
  );
});

// 4. MESSAGE - Terima pesan dari halaman utama
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});