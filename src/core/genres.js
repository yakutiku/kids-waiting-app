// ジャンルの一覧(ホーム画面の並び順)。1 ジャンル = src/genres/<名前>/index.js
import korokoro from '../genres/korokoro/index.js';
import hataraku from '../genres/hataraku/index.js';
import shinkansen from '../genres/shinkansen/index.js';
import senro from '../genres/senro/index.js';
import memory from '../genres/memory/index.js';

export const GENRES = [korokoro, hataraku, shinkansen, senro, memory];

// ホームのカード用の みじかい なまえ(むずかしさ選択の画面では もとの なまえ)
const SHORT = {
  shinkansen: { ja: 'しんかんせん', en: 'Bullet train' },
  memory: { ja: 'しんけい すいじゃく', en: 'Memory cards' },
};
for (const g of GENRES) g.short = SHORT[g.id] || g.title;
