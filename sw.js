// オフライン用(自動生成: node tools/build-sw.js)。外部への通信はしない。
const VERSION = '2caa9fd3b2';
const FILES = [
  "./",
  "index.html",
  "manifest.webmanifest",
  "src/core/app.js",
  "src/core/genres.js",
  "src/core/i18n.js",
  "src/core/scene.js",
  "src/core/settings.js",
  "src/core/sound.js",
  "src/core/storage.js",
  "src/core/style.css",
  "src/crayon/crayon.js",
  "src/crayon/palette.js",
  "src/crayon/vehicles.js",
  "src/genres/hataraku/index.js",
  "src/genres/korokoro/index.js",
  "src/genres/korokoro/parts.js",
  "src/genres/korokoro/physics-matter.js",
  "src/genres/korokoro/physics.js",
  "src/genres/korokoro/puzzles.js",
  "src/genres/memory/index.js",
  "src/genres/senro/index.js",
  "src/genres/senro/levels.js",
  "src/genres/senro/logic.js",
  "src/genres/shinkansen/index.js",
  "src/main.js",
  "src/vendor/matter-0.20.0.min.js",
  "icons/icon-180.png",
  "icons/icon-192.png",
  "icons/icon-512.png"
];
self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(FILES)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  e.respondWith(caches.match(e.request, { ignoreSearch: true }).then((r) => r || fetch(e.request)));
});
