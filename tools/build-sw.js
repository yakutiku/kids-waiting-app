// sw.js を作る(全ファイルの一覧と版を書きこむ)。開発時のみ: node tools/build-sw.js
const fs = require('fs'); const path = require('path'); const crypto = require('crypto');
const root = path.resolve(__dirname, '..');
const files = ['./', 'index.html', 'manifest.webmanifest'];
function walk(dir) {
  for (const f of fs.readdirSync(path.join(root, dir))) {
    const rel = path.join(dir, f);
    const st = fs.statSync(path.join(root, rel));
    if (st.isDirectory()) walk(rel);
    else if (/\.(js|css|png)$/.test(f) && !/test\.mjs$/.test(f)) files.push(rel.split(path.sep).join('/'));
  }
}
walk('src'); walk('icons');
const h = crypto.createHash('sha1');
for (const f of files) if (f !== './') h.update(fs.readFileSync(path.join(root, f)));
const version = h.digest('hex').slice(0, 10);
const sw = `// オフライン用(自動生成: node tools/build-sw.js)。外部への通信はしない。
const VERSION = '${version}';
const FILES = ${JSON.stringify(files, null, 2)};
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
`;
fs.writeFileSync(path.join(root, 'sw.js'), sw);
console.log('sw.js', version, files.length, 'files');
