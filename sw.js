/* ============================================================
   PT. BIOLI LESTARI — Service Worker v2.8.0
   Strategi:
     • HTML / version.json → Network-first (selalu fresh)
     • CDN fonts & libs    → Cache-first (jarang berubah)
     • Gambar              → Stale-while-revalidate
     • Fallback SPA        → index.html
   ============================================================ */
const APP_VERSION = '2.8.0';
const CACHE_STATIC = 'bioli-static-v2.8.0';
const CACHE_RUNTIME = 'bioli-runtime-v1';

// Asset yang langsung di-cache saat install (precache)
const PRECACHE_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './version.json',
  'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js',
  'https://cdn.jsdelivr.net/npm/@fontsource/inter/400.css',
  'https://cdn.jsdelivr.net/npm/@fontsource/inter/500.css',
  'https://cdn.jsdelivr.net/npm/@fontsource/inter/600.css',
  'https://cdn.jsdelivr.net/npm/@fontsource/inter/700.css',
  'https://cdn.jsdelivr.net/npm/@fontsource/inter/800.css',
  'https://cdn.jsdelivr.net/npm/@fontsource/jetbrains-mono/500.css',
  'https://cdn.jsdelivr.net/npm/@fontsource/jetbrains-mono/700.css',
  'https://cdn.jsdelivr.net/npm/@fontsource/space-grotesk/500.css',
  'https://cdn.jsdelivr.net/npm/@fontsource/space-grotesk/600.css',
  'https://cdn.jsdelivr.net/npm/@fontsource/space-grotesk/700.css'
];

// ===== INSTALL =====
self.addEventListener('install', (event) => {
  console.log('[SW] Installing v' + APP_VERSION);
  event.waitUntil(
    caches.open(CACHE_STATIC)
      .then(cache => cache.addAll(PRECACHE_ASSETS))
      .then(() => self.skipWaiting())
      .catch(err => console.warn('[SW] Precache gagal:', err))
  );
});

// ===== ACTIVATE — hapus cache lama =====
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating v' + APP_VERSION);
  const currentCaches = [CACHE_STATIC, CACHE_RUNTIME];
  event.waitUntil(
    caches.keys().then(names =>
      Promise.all(
        names.filter(n => !currentCaches.includes(n))
             .map(n => { console.log('[SW] Hapus cache lama:', n); return caches.delete(n); })
      )
    ).then(() => self.clients.claim())
  );
});

// ===== FETCH =====
self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  // version.json → network-first (biar checker update jalan)
  if (url.pathname.endsWith('version.json')) {
    event.respondWith(networkFirst(request));
    return;
  }

  // HTML / root path → network-first + fallback ke cache
  if (request.headers.get('accept')?.includes('text/html') ||
      url.pathname === '/' || url.pathname.endsWith('.html')) {
    event.respondWith(networkFirst(request, './index.html'));
    return;
  }

  // CDN (fontsource, cdnjs, jsdelivr) → cache-first
  if (url.origin !== location.origin &&
      (url.href.includes('cdn.jsdelivr.net') ||
       url.href.includes('cdnjs.cloudflare.com') ||
       url.href.includes('fonts.googleapis.com') ||
       url.href.includes('fonts.gstatic.com'))) {
    event.respondWith(cacheFirst(request));
    return;
  }

  // Gambar (logo, icon, screenshot) → stale-while-revalidate
  if (request.destination === 'image') {
    event.respondWith(staleWhileRevalidate(request));
    return;
  }

  // JSON lokal (manifest, dll) → cache-first
  if (url.pathname.endsWith('.json')) {
    event.respondWith(cacheFirst(request));
    return;
  }

  // Default → stale-while-revalidate
  event.respondWith(staleWhileRevalidate(request));
});

// ===== STRATEGI =====

// Network-first: coba network, fallback cache
async function networkFirst(request, fallbackUrl) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const clone = response.clone();
      const cache = await caches.open(CACHE_RUNTIME);
      cache.put(request, clone);
    }
    return response;
  } catch (err) {
    const cached = await caches.match(request);
    if (cached) return cached;
    if (fallbackUrl) return caches.match(fallbackUrl);
    return new Response('Offline', { status: 503 });
  }
}

// Cache-first: ambil cache, kalau ga ada baru fetch
async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;
  try {
    const response = await fetch(request);
    if (response.ok) {
      const clone = response.clone();
      const cache = await caches.open(CACHE_STATIC);
      cache.put(request, clone);
    }
    return response;
  } catch (err) {
    return new Response('Offline', { status: 503 });
  }
}

// Stale-while-revalidate: tampilkan cache dulu, update di background
async function staleWhileRevalidate(request) {
  const cache = await caches.open(CACHE_RUNTIME);
  const cached = await cache.match(request);
  const fetchPromise = fetch(request).then(response => {
    if (response.ok) cache.put(request, response.clone());
    return response;
  }).catch(() => cached);
  return cached || fetchPromise;
}

// ===== MESSAGE HANDLER (untuk trigger update manual) =====
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});