// 大人用設定
import { load, save } from './storage.js';

const DEFAULTS = {
  sound: false,      // 音(初期はオフ)
  speech: false,     // 読み上げ(音オンのときだけ働く)
  lang: 'both',      // 'ja' | 'both'(ひらがなの下に小さく英語) | 'en'
  realPhysics: false // ころころそうちの「リアルなうごき」(Matter.js 版)
};
const listeners = new Set();
let current = { ...DEFAULTS, ...load('settings', {}) };

export const settings = {
  get(k) { return current[k]; },
  all() { return { ...current }; },
  set(k, v) {
    current = { ...current, [k]: v };
    save('settings', current);
    listeners.forEach((fn) => fn(current, k));
  },
  onChange(fn) { listeners.add(fn); return () => listeners.delete(fn); },
  reset() { current = { ...DEFAULTS }; save('settings', current); listeners.forEach((fn) => fn(current)); },
};
