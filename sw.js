/* =====================================================================
   PT. BIOLI LESTARI — Service Worker  (v2.6.0)
   ---------------------------------------------------------------------
   Strategi:
   • Navigasi (buka halaman)  -> network-first, fallback ke cache (offline).
     Artinya: begitu ada HTML baru di server, langsung kepakai saat dibuka.
   • version.json             -> selalu network (biar polling auto-update akurat).
   • Asset & library (font, html2canvas, xlsx) -> cache-first.
     Artinya: setelah pertama kali load, aplikasi bisa jalan TANPA sinyal.
   • Service worker memperbarui dirinya sendiri di latar belakang.
   ===================================================================== */
const CACHE = 'bioli-v2.6.0';                 // ganti bareng versi biar cache lama kebuang
const SHELL = ['./', './index.html', './manifest.json', './icon.svg'];
const CDN = ['fonts.googleapis.com', 'fonts.gstatic.com', 'cdnjs.cloudflare.com'];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE).then((c) =>
      // precache shell; kalau ada file yang belum ke-upload, jangan sampai install gagal
      c.addAll(SHELL).catch(() => Promise.all(SHELL.map((u) => c.add(u).catch(() => undefined))))
    ).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;            // abaikan POST dll
  const url = new URL(req.url);

  // 1) version.json: selalu minta ke jaringan (jangan di-cache SW)
  if (url.pathname.endsWith('/version.json')) {
    e.respondWith(fetch(req));
    return;
  }

  // 2) Navigasi: network-first -> kalau offline, pakai halaman yang ter-cache
  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put('./index.html', copy)).catch(() => {});
          return res;
        })
        .catch(() => caches.match('./index.html').then((r) => r || caches.match('./')))
    );
    return;
  }

  // 3) Asset & library: cache-first -> hemat kuota & bisa offline
  const isCDN = CDN.some((h) => url.hostname === h || url.hostname.endsWith('.' + h));
  e.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached;
      return fetch(req).then((res) => {
        if (res && res.ok && (url.origin === self.location.origin || isCDN)) {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {});
        }
        return res;
      }).catch(() => cached);
    })
  );
});

// Pesan dari halaman (opsional): paksa ambil versi terbaru
self.addEventListener('message', (e) => {
  if (e.data === 'SKIP_WAITING') self.skipWaiting();
});