# 🧾 Sistem Transaksi — PT. BIOLI LESTARI

Aplikasi web transaksi, stok, pelanggan & laporan (single-file HTML) yang bisa
dipasang sebagai aplikasi (PWA) dan **jalan offline**. Dirancang untuk dipakai
di lapangan — termasuk wilayah luar kota (BDG / JKT) yang sinyalnya tidak stabil.

## 📦 Isi repo
| File | Fungsi |
|---|---|
| `index.html` | Aplikasi utama (semua logika & tampilan). |
| `version.json` | Penanda versi — dibaca untuk auto-update. |
| `manifest.json` | Supaya bisa *Install / Add to Home Screen*. |
| `icon.svg` | Logo aplikasi + favicon. |
| `sw.js` | Service worker — offline & tarik versi baru otomatis. |

## 🚀 Deploy ke GitHub Pages
1. Buat repository baru di GitHub, **upload semua file** di atas (pastikan file
   utama bernama `index.html`, satu folder dengan file lain).
2. Commit & push ke branch `main`.
3. Buka **Settings → Pages** → *Source* pilih **Deploy from a branch** →
   branch `main`, folder `/ (root)` → **Save**.
4. Tunggu 1–2 menit, buka link `https://<username>.github.io/<nama-repo>/`.
5. Di HP, buka link itu pakai **Chrome** → menu ⋮ → **"Tambahkan ke Layar utama"**.
   Sekarang aplikasi kebuka full-screen & datanya permanen.

> ⚠️ Service worker & install **hanya aktif lewat `https://`** (GitHub Pages sudah
> https). Kalau file dibuka langsung dari file manager (`file://`), SW & manifest
> tidak jalan — itu normal.

## 🔁 Cara rilis versi baru (PENTING — lakukan 3 edit ini)
Supaya banner "Muat Ulang" muncul di perangkat pengguna, **naikkan versi di 3 tempat**:
1. `index.html` → cari `var APP_VERSION='` → ganti angkanya (mis. `2.6.1`).
2. `version.json` → ganti `"version"` jadi angka yang **sama persis** (`2.6.1`),
   isi `releaseDate` & `notes`.
3. `sw.js` → ganti `const CACHE = 'bioli-v2.6.1';` (biar cache lama dibuang).
4. (opsional) catat di `CHANGELOG.md`.
5. Commit & push. Perangkat pengguna akan mendeteksi versi baru saat aplikasi dibuka.

> Tombol **⬆️ Muat Ulang** di aplikasi = reset total (hapus service worker + cache,
> lalu muat ulang) — pakai ini kalau mau memaksa tampilan paling baru.

## 🧩 Menyalakan service worker (1 blok, tempel di `index.html`)
Aplikasi sudah mendeteksi versi baru lewat `version.json` tanpa SW. Tapi supaya
**HTML-nya sendiri** ikut ke-pull otomatis & bisa offline, tempel blok ini
**tepat sebelum `</body>`** di `index.html`:

```html
<script>
if ('serviceWorker' in navigator) {
  window.addEventListener('load', function () {
    navigator.serviceWorker.register('./sw.js').catch(function (e) {
      console.warn('SW tidak terdaftar (normal kalau dibuka via file://):', e);
    });
  });
}
</script>