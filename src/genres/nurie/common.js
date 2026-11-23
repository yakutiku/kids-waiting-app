// くれよん ぬりえ・おえかき 共通: クレヨンのボタン、ツールバー、キャンバス作り
import { P } from '../../crayon/palette.js';
import { crayonRect, crayonPoly, crayonLine, crayonCircle, sprite, drawSprite } from '../../crayon/crayon.js';

export const COLORS = ['aka', 'daidai', 'kiiro', 'kimidori', 'midori', 'sorairo', 'ao', 'murasaki', 'chairo', 'haiiro', 'sumi'];

/** 1 度だけ描いて返す(キャッシュは呼び出し側で持つ。絵を変えたら捨てられる) */
export function makeCanvas(w, h, drawFn, scale) {
  const sc = scale || Math.min(1.5, (typeof window !== 'undefined' && window.devicePixelRatio) || 1);
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.ceil(w * sc));
  c.height = Math.max(1, Math.ceil(h * sc));
  const ctx = c.getContext('2d');
  ctx.scale(sc, sc);
  drawFn(ctx);
  return c;
}

/** クレヨン 1 本(論理 90×110) */
export function crayonSprite(key) {
  return sprite('nu-crayon-' + key, 90, 110, (c) => {
    const col = P[key];
    crayonRect(c, 24, 34, 42, 72, col, { seed: 5, r: 4, width: 3 });
    crayonPoly(c, [[26, 36], [45, 8], [64, 36]], col, { seed: 3, width: 2.5 });
    crayonRect(c, 24, 54, 42, 36, P.gayoshi, { seed: 7, width: 2 });
    crayonRect(c, 24, 63, 42, 14, col, { seed: 9, width: 1.5 });
  });
}
/** 消しゴム */
export function eraserSprite() {
  return sprite('nu-eraser', 90, 110, (c) => {
    crayonRect(c, 10, 38, 70, 56, P.gayoshi, { seed: 21, r: 12, width: 3.5 });
    crayonRect(c, 10, 38, 70, 24, P.sorairo, { seed: 22, r: 12, width: 3 });
    crayonLine(c, [[26, 78], [64, 78]], { width: 2.5, seed: 23, passes: 1 });
    // けしたあと
    crayonLine(c, [[18, 104], [28, 98], [38, 104], [48, 98]], { width: 2.5, seed: 24, passes: 1, color: P.haiiro });
  });
}
/** 太さボタン */
export function sizeSprite(kind) {
  return sprite('nu-size-' + kind, 90, 110, (c) => {
    crayonRect(c, 5, 8, 80, 94, P.gayoshi, { seed: 31, r: 14, width: 3 });
    const w = kind === 'thick' ? 17 : 6;
    crayonLine(c, [[20, 82], [34, 36], [56, 74], [70, 28]], { width: w, seed: 33, passes: 2, color: P.sumi });
  });
}

/** 下・右のボタン並び。選んでいるものは少し飛び出す */
export function makeToolbar() {
  const items = [];
  return {
    items,
    add(it) { it.pop = it.selected ? 1 : 0; items.push(it); return it; },
    hit(p) { for (const it of items) if (p.x >= it.x && p.x <= it.x + it.w && p.y >= it.y && p.y <= it.y + it.h) return it; return null; },
    find(id) { return items.find((i) => i.id === id); },
    select(group, id) { for (const it of items) if (it.group === group) it.selected = it.id === id; },
    draw(ctx, dt) {
      for (const it of items) {
        const target = it.selected ? 1 : 0;
        it.pop += Math.sign(target - it.pop) * Math.min(Math.abs(target - it.pop), dt * 7);
        const e = 1 - Math.pow(1 - it.pop, 3);
        let x = it.x, y = it.y;
        if (it.dir === 'left') x -= 16 * e; else y -= 20 * e;
        drawSprite(ctx, it.spr, x, y, it.w, it.h);
      }
    },
  };
}

/** 下の 11 色 */
export function addPalette(tb, y = 490) {
  const cw = 1000 / COLORS.length;
  COLORS.forEach((k, i) => tb.add({ id: k, group: 'color', x: i * cw, y, w: cw, h: 110, spr: crayonSprite(k), dir: 'up' }));
}

// ---------- アイコン ----------
export function crayonIcon(c, x, y, key, rot = 0, s = 1) {
  c.save(); c.translate(x, y); c.rotate(rot); c.scale(s, s);
  const col = P[key];
  crayonRect(c, -12, -10, 24, 56, col, { seed: 5, r: 3, width: 2.5 });
  crayonPoly(c, [[-11, -9], [0, -32], [11, -9]], col, { seed: 3, width: 2.2 });
  crayonRect(c, -12, 6, 24, 18, P.gayoshi, { seed: 7, width: 1.8 });
  c.restore();
}
/** ぬりかけの車(150×150 の中) */
export function halfPaintedBus(c, x, y, k = 1) {
  c.save(); c.translate(x, y); c.scale(k, k);
  crayonRect(c, 0, 10, 130, 56, null, { seed: 1, r: 9, width: 3 });
  crayonRect(c, 66, 10, 64, 56, P.kiiro, { seed: 2, r: 9, width: 3 });
  for (let i = 0; i < 4; i++) crayonRect(c, 8 + i * 30, 20, 22, 18, i < 2 ? null : P.sorairo, { seed: 3 + i, r: 3, width: 2 });
  crayonCircle(c, 30, 68, 11, P.sumi, { seed: 8, width: 2 });
  crayonCircle(c, 102, 68, 11, P.sumi, { seed: 9, width: 2 });
  c.restore();
}
