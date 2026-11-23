// 端末の中だけに保存(外部には送らない)。使えない環境でも壊れないよう try/catch。
const PREFIX = 'kwa.';
export function load(key, fallback) {
  try {
    const s = localStorage.getItem(PREFIX + key);
    return s == null ? fallback : JSON.parse(s);
  } catch { return fallback; }
}
export function save(key, value) {
  try { localStorage.setItem(PREFIX + key, JSON.stringify(value)); } catch { /* 保存できなくても遊べる */ }
}
export function remove(key) {
  try { localStorage.removeItem(PREFIX + key); } catch { }
}
export function clearAll() {
  try {
    Object.keys(localStorage).filter((k) => k.startsWith(PREFIX)).forEach((k) => localStorage.removeItem(k));
  } catch { }
}
