// node src/genres/moji/test.mjs — 書き順データと言葉・お話データの検査
import { GLYPHS, GLYPH_ORDER } from './strokes.js';
import { WORDS, TRACE_WORD } from './words.js';
import { STORIES } from './stories.js';
let bad = 0;
const err = (m) => { bad++; console.log('NG ' + m); };
if (GLYPH_ORDER.length < 10) err('字が 10 字未満');
for (const ch of GLYPH_ORDER) {
  const g = GLYPHS[ch];
  if (!g || !g.length) { err(ch + ' に画がない'); continue; }
  g.forEach((s, i) => {
    if (s.length < 2) err(`${ch} 画${i + 1} 点が少ない`);
    let len = 0;
    s.forEach(([x, y], j) => {
      if (!(x >= 0 && x <= 1 && y >= 0 && y <= 1)) err(`${ch} 画${i + 1} 点${j} が範囲外`);
      if (j) len += Math.hypot(x - s[j - 1][0], y - s[j - 1][1]);
    });
    if (len < 0.08) err(`${ch} 画${i + 1} 短すぎる`);
  });
  const w = TRACE_WORD[ch];
  if (!w || !WORDS[w]) err(ch + ' の言葉がない');
  else if (WORDS[w].yomi[0] !== ch) err(`${ch} と ${w} の頭文字が違う`);
  console.log(ch, g.length + '画', w);
}
const keys = Object.keys(WORDS);
console.log('言葉', keys.length);
for (const k of keys) { const w = WORDS[k]; if (!w.ja || !w.yomi || !w.en || !w.draw) err('言葉の欠け ' + k); }
console.log('お話', STORIES.length);
if (STORIES.length < 6) err('お話が 6 未満');
for (const s of STORIES) {
  if (s.cards.length < 3 || s.cards.length > 4) err(s.id + ' の枚数');
  s.cards.forEach((c, i) => { if (typeof c.draw !== 'function') err(`${s.id} 札${i} draw なし`); });
}
console.log(bad ? 'NG ' + bad : 'OK');
process.exit(bad ? 1 : 0);
