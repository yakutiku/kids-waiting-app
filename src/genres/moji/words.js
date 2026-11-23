// ことば(のりもの)の一覧と、自作の小さな乗り物の絵。
// 絵はすべて「横 200 × 縦 130、右向き、地面 y=126」。drawWord(ctx, key, x, y, w) で描く(スプライトのキャッシュつき)。
import { P } from '../../crayon/palette.js';
import {
  crayonRect, crayonCircle, crayonPoly, crayonLine, crayonWheel, ellipsePts, sprite, drawSprite,
} from '../../crayon/crayon.js';
import { drawVehicle, VEHICLES, VW, VH } from '../../crayon/vehicles.js';

const OWN = {
  car(c) {
    crayonRect(c, 16, 62, 168, 42, P.aka, { r: 12, seed: 101 });
    crayonPoly(c, [[54, 62], [70, 30], [128, 30], [150, 62]], P.aka, { seed: 102 });
    crayonPoly(c, [[64, 60], [76, 38], [96, 38], [96, 60]], P.sorairo, { seed: 103, width: 2.5 });
    crayonPoly(c, [[104, 60], [104, 38], [124, 38], [140, 60]], P.sorairo, { seed: 104, width: 2.5 });
    crayonCircle(c, 176, 80, 5, P.kiiro, { seed: 105, width: 2 });
    crayonCircle(c, 44, 106, 16, P.sumi, { seed: 106, width: 3 }); crayonCircle(c, 44, 106, 7, P.haiiro, { seed: 107, width: 2 });
    crayonWheel(c, 150, 110, 16, 108);
  },
  boat(c) {
    crayonPoly(c, [[100, 8], [100, 70], [150, 70]], P.kiiro, { seed: 111 });
    crayonLine(c, [[100, 6], [100, 90]], { width: 4, seed: 112 });
    crayonPoly(c, [[14, 84], [186, 84], [160, 116], [42, 116]], P.aka, { seed: 113 });
    crayonLine(c, [[8, 122], [40, 114], [80, 122], [120, 114], [160, 122], [194, 114]], { color: P.ao, width: 4, seed: 114 });
  },
  plane(c) {
    crayonPoly(c, [[40, 60], [34, 24], [52, 24], [74, 56]], P.sorairo, { seed: 121 });
    crayonPoly(c, ellipsePts(104, 66, 80, 22, 28), P.gayoshi, { seed: 122 });
    crayonPoly(c, [[96, 62], [76, 112], [100, 112], [128, 64]], P.sorairo, { seed: 123 });
    [74, 98, 122, 146].forEach((x, i) => crayonCircle(c, x, 62, 6, P.sorairo, { seed: 124 + i, width: 2 }));
    crayonPoly(c, [[168, 56], [182, 50], [186, 62], [176, 68]], P.aka, { seed: 129, width: 2.5 });
  },
  heli(c) {
    crayonLine(c, [[30, 18], [170, 18]], { width: 5, seed: 131 });
    crayonLine(c, [[102, 18], [102, 34]], { width: 4, seed: 132 });
    crayonPoly(c, [[20, 52], [70, 52], [74, 64], [20, 62]], P.aka, { seed: 133 });
    crayonPoly(c, ellipsePts(110, 62, 56, 30, 24), P.aka, { seed: 134 });
    crayonPoly(c, [[112, 42], [138, 42], [154, 62], [112, 62]], P.sorairo, { seed: 135, width: 2.5 });
    crayonLine(c, [[56, 100], [160, 100]], { width: 4, seed: 136 });
    crayonLine(c, [[84, 90], [84, 100]], { width: 3, seed: 137 });
    crayonLine(c, [[132, 90], [132, 100]], { width: 3, seed: 138 });
  },
  rocket(c) {
    crayonPoly(c, [[72, 100], [48, 118], [72, 118]], P.aka, { seed: 141 });
    crayonPoly(c, [[128, 100], [152, 118], [128, 118]], P.aka, { seed: 142 });
    crayonPoly(c, [[100, 4], [124, 34], [128, 108], [72, 108], [76, 34]], P.gayoshi, { seed: 143 });
    crayonPoly(c, [[100, 4], [118, 28], [82, 28]], P.aka, { seed: 144 });
    crayonCircle(c, 100, 56, 13, P.sorairo, { seed: 145, width: 2.5 });
    crayonPoly(c, [[84, 108], [116, 108], [100, 128]], P.daidai, { seed: 146, width: 2 });
  },
  bike(c) {
    crayonCircle(c, 44, 92, 28, null, { seed: 151, width: 4 }); crayonCircle(c, 156, 92, 28, null, { seed: 152, width: 4 });
    crayonLine(c, [[44, 92], [90, 52], [136, 52], [156, 92]], { width: 5, seed: 153, color: P.ao });
    crayonLine(c, [[44, 92], [86, 92], [90, 52]], { width: 5, seed: 154, color: P.ao });
    crayonLine(c, [[86, 92], [136, 52]], { width: 5, seed: 155, color: P.ao });
    crayonLine(c, [[136, 52], [132, 34], [150, 30]], { width: 5, seed: 156 });
    crayonLine(c, [[78, 44], [100, 44]], { width: 7, seed: 157 });
  },
};

/** w(幅)で (x,y)(左上)に描く。id は VEHICLES のキーか OWN のキー */
export function drawArt(ctx, id, x, y, w) {
  if (OWN[id]) {
    const wr = Math.round(w);
    const spr = sprite('moji-own-' + id, wr, Math.round((wr * VH) / VW), (c) => { c.scale(wr / VW, wr / VW); OWN[id](c); });
    drawSprite(ctx, spr, x, y, w, (w * VH) / VW);
  } else drawVehicle(ctx, id, x, y, w);
}

const ruby = (ja, yomi) => (ja === yomi ? ja : `{${ja}|${yomi}}`);
const fromV = (id) => {
  const v = VEHICLES[id];
  return { ja: ruby(v.ja, v.yomi), yomi: v.yomi, en: v.en, draw: id };
};
// head(頭文字)は yomi の 1 文字目
export const WORDS = {
  shinkansen: fromV('shinkansen'),
  excavator: fromV('excavator'),
  fire: fromV('fire'),
  dump: fromV('dump'),
  crane: fromV('crane'),
  ambulance: fromV('ambulance'),
  loco: fromV('loco'),
  police: fromV('police'),
  garbage: fromV('garbage'),
  mixer: fromV('mixer'),
  bulldozer: fromV('bulldozer'),
  roller: fromV('roller'),
  forklift: fromV('forklift'),
  bus: fromV('bus'),
  tow: fromV('tow'),
  freight: fromV('freight'),
  norib: { ja: 'のりあい{バス|ばす}', yomi: 'のりあいばす', en: 'bus', draw: 'bus' },
  boat: { ja: 'ふね', yomi: 'ふね', en: 'boat', draw: 'boat' },
  car: { ja: 'くるま', yomi: 'くるま', en: 'car', draw: 'car' },
  plane: { ja: 'ひこうき', yomi: 'ひこうき', en: 'airplane', draw: 'plane' },
  heli: { ja: '{ヘリコプター|へりこぷたー}', yomi: 'へりこぷたー', en: 'helicopter', draw: 'heli' },
  rocket: { ja: '{ロケット|ろけっと}', yomi: 'ろけっと', en: 'rocket', draw: 'rocket' },
  bike: { ja: 'じてんしゃ', yomi: 'じてんしゃ', en: 'bicycle', draw: 'bike' },
};
for (const k of Object.keys(WORDS)) WORDS[k].key = k;
export const head = (k) => WORDS[k].yomi[0];

// なぞった字 → できあがる乗り物
export const TRACE_WORD = {
  し: 'shinkansen', く: 'crane', き: 'loco', の: 'norib', ひ: 'plane',
  ふ: 'boat', へ: 'heli', ろ: 'roller', れ: 'tow', み: 'mixer',
};
