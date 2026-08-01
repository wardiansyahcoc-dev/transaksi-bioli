/* =====================================================================
   PT. BIOLI LESTARI — Service Worker  •  v3.1
   Strategi:
   • HTML / navigasi : network-first (update selalu tembus),
                       fallback cache saat offline.
   • File lokal lain : cache-first (buka cepat).
   • CDN (font/lib)  : stale-while-revalidate (offline aman,
                       versi baru tetap diambil di latar).
   • version.json    : TIDAK dicache — wajib kena jaringan supaya
                       cek versi (vb_check) selalu akurat.
   PENTING: naikkan CACHE_NAME setiap rilis versi baru agar cache
   lama otomatis dibuang saat activate.
   ===================================================================== */
const CACHE_NAME = 'bioli-cache-v3.1';
const PRECACHE = ['./', './manifest.json', './icon.svg'];

self.addEventListener('install', function (e) {
  e.waitUntil(
    caches.open(CACHE_NAME)
      .then(function (c) { return c.addAll(PRECACHE); })
      .then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(
        keys.filter(function (k) { return k !== CACHE_NAME; })
            .map(function (k) { return caches.delete(k); })
      );
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function (e) {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  /* version.json wajib network-only (buat cek update) */
  if (url.pathname.indexOf('version.json') !== -1) return;

  /* navigasi lintas-origin (wa.me dsb) — biarkan browser */
  if (req.mode === 'navigate' && url.origin !== self.location.origin) return;

  /* navigasi aplikasi: network-first + fallback offline */
  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req).then(function (res) {
        const copy = res.clone();
        caches.open(CACHE_NAME).then(function (c) { c.put(req, copy); });
        return res;
      }).catch(function () {
        return caches.match(req).then(function (hit) {
          return hit || caches.match('./') || caches.match('./index.html');
        });
      })
    );
    return;
  }

  /* file lokal: cache-first */
  if (url.origin === self.location.origin) {
    e.respondWith(
      caches.match(req).then(function (hit) {
        return hit || fetch(req).then(function (res) {
          if (res && (res.ok || res.type === 'opaque')) {
            const copy = res.clone();
            caches.open(CACHE_NAME).then(function (c) { c.put(req, copy); });
          }
          return res;
        });
      })
    );
    return;
  }

  /* CDN (font, html2canvas, xlsx): stale-while-revalidate */
  e.respondWith(
    caches.match(req).then(function (hit) {
      const network = fetch(req).then(function (res) {
        if (res && (res.ok || res.type === 'opaque')) {
          const copy = res.clone();
          caches.open(CACHE_NAME).then(function (c) { c.put(req, copy); });
        }
        return res;
      }).catch(function () { return hit; });
      return hit || network;
    })
  );
});