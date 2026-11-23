import { boot } from './core/app.js';

boot();

// オフライン対応(Service Worker)。https か localhost のときだけ
if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost' || location.hostname === '127.0.0.1')) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => { });
  });
}
