/* Kiriのやさしい教科書 — Service Worker
   方針：
   - HTML（keisan.html）はネット優先。オンラインなら必ず最新を取得し、
     圏外のときだけキャッシュを使う（＝更新は今まで通り push で即反映）。
   - アイコンなどの静的ファイルはキャッシュ優先で高速＆オフライン対応。
   キャッシュ内容を大きく変えたいときは CACHE の "v1" の数字を上げてください。 */

const CACHE = 'kiri-textbook-v1';

const ASSETS = [
  '/keisan.html',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png',
  '/icon-maskable-192.png',
  '/icon-maskable-512.png',
  '/apple-touch-icon.png',
  '/favicon-32.png'
];

// インストール時：必要ファイルを先読みキャッシュ
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE)
      .then((cache) => cache.addAll(ASSETS))
      .then(() => self.skipWaiting())
  );
});

// 有効化時：古いバージョンのキャッシュを掃除
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const accept = req.headers.get('accept') || '';
  const isHTML = req.mode === 'navigate' || accept.includes('text/html');

  if (isHTML) {
    // HTML：ネット優先（最新を取りに行き、ダメならキャッシュ）
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((cache) => cache.put(req, copy));
          return res;
        })
        .catch(() => caches.match(req).then((r) => r || caches.match('/keisan.html')))
    );
    return;
  }

  // それ以外（アイコン等）：キャッシュ優先（無ければ取得して保存）
  event.respondWith(
    caches.match(req).then((cached) => {
      return cached || fetch(req).then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((cache) => cache.put(req, copy));
        return res;
      });
    })
  );
});
