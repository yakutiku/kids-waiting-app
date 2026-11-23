import { boot } from './core/app.js';

boot();

// オフライン対応(Service Worker)。https か localhost のときだけ
if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost' || location.hostname === '127.0.0.1')) {
  window.addEventListener('load', () => {
    const hadController = !!navigator.serviceWorker.controller;
    let reloaded = false;
    // 新しい版が届いたら 1 回だけ読み込み直す(初回の取り込みでは読み込み直さない)
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (hadController && !reloaded) { reloaded = true; location.reload(); }
    });
    navigator.serviceWorker.register('./sw.js').catch(() => { });
  });
}
