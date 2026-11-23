// 働く車・新幹線・人などの手描き風の絵(オリジナル。実在車両のロゴ等は使わない)
// どの絵も「横 200 × 縦 130」の箱の中に、右向き、地面 y=126 で描く。
// 使い方: drawVehicle(ctx, 'excavator', x, y, w)  … キャッシュ済みスプライトで描く(速い)
import { P } from './palette.js';
import {
  crayonRect, crayonCircle, crayonPoly, crayonLine, crayonWheel, rectPts, sprite, drawSprite, crayonFill, circlePts, ellipsePts, crayonShape,
} from './crayon.js';

export const VW = 200, VH = 130;
const G = 126; // 地面

function win(ctx, x, y, w, h, seed) {
  crayonRect(ctx, x, y, w, h, P.sorairo, { r: 5, seed, width: 2.5 });
}
function wheels(ctx, xs, r = 15, seed = 1) {
  xs.forEach((x, i) => crayonWheel(ctx, x, G - r, r, seed + i * 7));
}
function light(ctx, x, y, color = P.kiiro, seed = 9) {
  crayonCircle(ctx, x, y, 5, color, { seed, width: 2 });
}

const D = {
  excavator(ctx) { // ショベルカー
    // キャタピラ
    crayonRect(ctx, 30, 98, 120, 28, P.haiiro, { r: 14, seed: 1 });
    [48, 72, 96, 120].forEach((x, i) => crayonCircle(ctx, x + 6, 112, 8, P.sumi, { seed: 3 + i, width: 2 }));
    // 本体
    crayonRect(ctx, 38, 64, 100, 34, P.kiiro, { r: 6, seed: 2 });
    crayonRect(ctx, 44, 30, 44, 38, P.kiiro, { r: 6, seed: 4 });
    win(ctx, 52, 36, 28, 24, 5);
    // アーム
    crayonPoly(ctx, [[120, 70], [134, 62], [168, 22], [178, 30], [142, 78]], P.daidai, { seed: 6 });
    crayonPoly(ctx, [[166, 22], [180, 24], [190, 70], [178, 72]], P.daidai, { seed: 7 });
    // バケット
    crayonPoly(ctx, [[170, 70], [196, 66], [196, 92], [182, 96], [172, 88]], P.haiiro, { seed: 8 });
  },
  dump(ctx) { // ダンプカー
    crayonPoly(ctx, [[18, 46], [128, 46], [134, 94], [18, 94]], P.daidai, { seed: 11 });
    crayonPoly(ctx, [[24, 46], [40, 30], [120, 30], [128, 46]], P.chairo, { seed: 12, width: 2.5 });
    crayonRect(ctx, 134, 40, 52, 56, P.kiiro, { r: 8, seed: 13 });
    win(ctx, 148, 48, 30, 22, 14);
    crayonRect(ctx, 14, 92, 176, 12, P.haiiro, { r: 4, seed: 15 });
    light(ctx, 184, 84);
    wheels(ctx, [42, 76, 160], 17, 16);
  },
  crane(ctx) { // クレーンしゃ
    crayonPoly(ctx, [[60, 70], [100, 64], [186, 6], [194, 16], [108, 78]], P.daidai, { seed: 21 });
    crayonLine(ctx, [[190, 12], [190, 54]], { width: 2.5, seed: 22 });
    crayonPoly(ctx, [[182, 54], [198, 54], [194, 66], [186, 66]], P.haiiro, { seed: 23, width: 2 });
    crayonRect(ctx, 14, 72, 150, 30, P.kiiro, { r: 6, seed: 24 });
    crayonRect(ctx, 130, 48, 46, 50, P.kiiro, { r: 8, seed: 25 });
    win(ctx, 142, 55, 26, 20, 26);
    crayonRect(ctx, 50, 56, 40, 20, P.daidai, { r: 5, seed: 27 });
    wheels(ctx, [36, 70, 120, 156], 14, 28);
  },
  fire(ctx) { // しょうぼうしゃ
    crayonRect(ctx, 12, 46, 136, 64, P.aka, { r: 8, seed: 31 });
    crayonRect(ctx, 140, 40, 50, 70, P.aka, { r: 10, seed: 32 });
    win(ctx, 152, 48, 30, 24, 33);
    // はしご
    crayonLine(ctx, [[16, 36], [136, 36]], { width: 3, seed: 34 });
    crayonLine(ctx, [[16, 26], [136, 26]], { width: 3, seed: 35 });
    for (let x = 22; x < 136; x += 16) crayonLine(ctx, [[x, 26], [x, 36]], { width: 2.5, seed: x });
    crayonRect(ctx, 24, 62, 46, 26, P.gayoshi, { r: 4, seed: 36, width: 2 });
    crayonRect(ctx, 80, 62, 46, 26, P.gayoshi, { r: 4, seed: 37, width: 2 });
    crayonRect(ctx, 156, 30, 18, 10, P.daidai, { r: 3, seed: 38, width: 2 });
    light(ctx, 184, 94);
    wheels(ctx, [44, 110, 164], 16, 39);
  },
  ambulance(ctx) { // きゅうきゅうしゃ
    crayonRect(ctx, 14, 40, 140, 72, P.gayoshi, { r: 10, seed: 41 });
    crayonPoly(ctx, [[150, 52], [176, 54], [192, 82], [192, 112], [150, 112]], P.gayoshi, { seed: 42 });
    win(ctx, 156, 58, 24, 22, 43);
    crayonRect(ctx, 14, 82, 178, 8, P.aka, { seed: 44, width: 1.5 });
    crayonRect(ctx, 66, 50, 12, 32, P.aka, { seed: 45, width: 1.5 });
    crayonRect(ctx, 56, 60, 32, 12, P.aka, { seed: 46, width: 1.5 });
    crayonRect(ctx, 104, 30, 24, 10, P.aka, { r: 4, seed: 47, width: 2 });
    wheels(ctx, [46, 162], 16, 48);
  },
  police(ctx) { // パトカー
    crayonPoly(ctx, [[12, 80], [24, 62], [58, 60], [80, 36], [140, 36], [160, 60], [190, 66], [192, 108], [12, 108]], P.gayoshi, { seed: 51 });
    crayonPoly(ctx, [[12, 84], [192, 84], [192, 108], [12, 108]], P.sumi, { seed: 52, width: 2 });
    win(ctx, 86, 42, 26, 20, 53);
    win(ctx, 118, 42, 26, 20, 54);
    crayonRect(ctx, 100, 24, 28, 12, P.aka, { r: 4, seed: 55, width: 2 });
    light(ctx, 186, 74);
    wheels(ctx, [50, 154], 16, 56);
  },
  garbage(ctx) { // ごみしゅうしゅうしゃ
    crayonRect(ctx, 12, 38, 120, 72, P.midori, { r: 10, seed: 61 });
    crayonPoly(ctx, [[12, 46], [2, 54], [2, 104], [12, 108]], P.haiiro, { seed: 62, width: 2.5 });
    crayonRect(ctx, 134, 46, 56, 64, P.gayoshi, { r: 10, seed: 63 });
    win(ctx, 148, 54, 30, 22, 64);
    crayonRect(ctx, 30, 58, 80, 10, P.kimidori, { r: 4, seed: 65, width: 2 });
    light(ctx, 186, 96);
    wheels(ctx, [44, 100, 164], 16, 66);
  },
  mixer(ctx) { // ミキサーしゃ
    crayonShape(ctx, ellipsePts(76, 66, 62, 34), P.gayoshi, { seed: 71 });
    crayonLine(ctx, [[40, 40], [64, 96]], { width: 4, color: P.daidai, seed: 72 });
    crayonLine(ctx, [[74, 34], [98, 98]], { width: 4, color: P.daidai, seed: 73 });
    crayonLine(ctx, [[108, 38], [124, 90]], { width: 4, color: P.daidai, seed: 74 });
    crayonRect(ctx, 140, 44, 50, 62, P.sorairo, { r: 10, seed: 75 });
    win(ctx, 152, 52, 28, 20, 76);
    crayonRect(ctx, 12, 96, 180, 12, P.haiiro, { r: 4, seed: 77 });
    wheels(ctx, [40, 80, 162], 16, 78);
  },
  bulldozer(ctx) { // ブルドーザー
    crayonRect(ctx, 24, 98, 120, 28, P.haiiro, { r: 14, seed: 81 });
    [42, 66, 90, 114].forEach((x, i) => crayonCircle(ctx, x + 6, 112, 8, P.sumi, { seed: 82 + i, width: 2 }));
    crayonRect(ctx, 30, 62, 106, 36, P.kiiro, { r: 6, seed: 86 });
    crayonRect(ctx, 44, 26, 48, 40, P.kiiro, { r: 6, seed: 87 });
    win(ctx, 52, 32, 32, 26, 88);
    crayonLine(ctx, [[136, 80], [158, 90]], { width: 6, color: P.haiiro, seed: 89 });
    crayonPoly(ctx, [[156, 54], [176, 50], [184, 120], [160, 124]], P.haiiro, { seed: 90 });
  },
  roller(ctx) { // ロードローラー
    crayonCircle(ctx, 154, 94, 30, P.haiiro, { seed: 91 });
    crayonRect(ctx, 40, 60, 110, 40, P.kimidori, { r: 8, seed: 92 });
    crayonRect(ctx, 50, 22, 50, 42, P.sorairo, { r: 6, seed: 93 });
    crayonRect(ctx, 46, 18, 58, 8, P.kimidori, { r: 3, seed: 94, width: 2 });
    wheels(ctx, [62], 28, 95);
  },
  forklift(ctx) { // フォークリフト
    crayonRect(ctx, 30, 62, 100, 42, P.daidai, { r: 8, seed: 101 });
    crayonLine(ctx, [[50, 62], [50, 20], [110, 20], [110, 62]], { width: 4, seed: 102 });
    crayonLine(ctx, [[150, 10], [150, 116]], { width: 6, color: P.haiiro, seed: 103 });
    crayonLine(ctx, [[150, 112], [194, 112]], { width: 5, color: P.haiiro, seed: 104 });
    crayonRect(ctx, 154, 70, 38, 38, P.chairo, { seed: 105 });
    crayonLine(ctx, [[160, 89], [186, 89]], { width: 2, seed: 106 });
    wheels(ctx, [56, 116], 16, 107);
  },
  bus(ctx) { // バス
    crayonRect(ctx, 10, 34, 182, 78, P.kiiro, { r: 14, seed: 111 });
    [24, 58, 92, 126].forEach((x, i) => win(ctx, x, 46, 28, 26, 112 + i));
    win(ctx, 162, 46, 24, 40, 117);
    crayonRect(ctx, 10, 84, 182, 8, P.daidai, { seed: 118, width: 1.5 });
    wheels(ctx, [48, 156], 16, 119);
  },
  tow(ctx) { // レッカーしゃ
    crayonRect(ctx, 14, 72, 120, 34, P.ao, { r: 6, seed: 121 });
    crayonPoly(ctx, [[30, 72], [44, 72], [24, 22], [12, 26]], P.haiiro, { seed: 122 });
    crayonLine(ctx, [[18, 24], [6, 66]], { width: 2.5, seed: 123 });
    crayonLine(ctx, [[2, 66], [10, 66], [10, 76]], { width: 3, seed: 124 });
    crayonRect(ctx, 130, 44, 60, 62, P.ao, { r: 10, seed: 125 });
    win(ctx, 144, 52, 32, 22, 126);
    crayonRect(ctx, 150, 34, 20, 10, P.daidai, { r: 3, seed: 127, width: 2 });
    wheels(ctx, [44, 98, 164], 16, 128);
  },
};

/** 新幹線(オリジナルのデザイン)。color でボディの帯色を変える */
function drawShinkansenHead(ctx, color = P.midori) {
  crayonPoly(ctx, [[6, 104], [6, 46], [80, 40], [130, 46], [176, 74], [196, 100], [196, 108], [6, 108]], P.gayoshi, { seed: 131 });
  crayonPoly(ctx, [[6, 84], [176, 84], [194, 98], [6, 98]], color, { seed: 132, width: 2 });
  crayonPoly(ctx, [[120, 52], [150, 56], [166, 72], [124, 72]], P.sorairo, { seed: 133, width: 2.5 });
  [20, 48, 76].forEach((x, i) => win(ctx, x, 54, 20, 16, 134 + i));
  crayonCircle(ctx, 184, 98, 4, P.kiiro, { seed: 138, width: 1.5 });
  crayonRect(ctx, 14, 108, 172, 8, P.haiiro, { seed: 139, width: 2 });
  [36, 66, 140, 170].forEach((x, i) => crayonCircle(ctx, x, 118, 7, P.sumi, { seed: 140 + i, width: 2 }));
}
function drawShinkansenCar(ctx, color = P.midori) {
  crayonRect(ctx, 4, 42, 192, 66, P.gayoshi, { r: 12, seed: 151 });
  crayonRect(ctx, 4, 84, 192, 12, color, { seed: 152, width: 2 });
  [18, 50, 82, 114, 146].forEach((x, i) => win(ctx, x, 52, 24, 18, 153 + i));
  crayonRect(ctx, 12, 108, 176, 8, P.haiiro, { seed: 160, width: 2 });
  [30, 60, 140, 170].forEach((x, i) => crayonCircle(ctx, x, 118, 7, P.sumi, { seed: 161 + i, width: 2 }));
}
function drawLoco(ctx, color = P.ao) { // 機関車(貨物用)
  crayonRect(ctx, 10, 40, 180, 66, color, { r: 8, seed: 171 });
  win(ctx, 24, 50, 30, 24, 172);
  win(ctx, 146, 50, 30, 24, 173);
  crayonRect(ctx, 70, 56, 60, 10, P.gayoshi, { seed: 174, width: 1.5 });
  crayonRect(ctx, 10, 106, 180, 8, P.haiiro, { seed: 175, width: 2 });
  [30, 60, 140, 170].forEach((x, i) => crayonCircle(ctx, x, 118, 8, P.sumi, { seed: 176 + i, width: 2 }));
}
function drawFreight(ctx, color = P.chairo) { // 貨車(平台 + 低いふち)
  crayonRect(ctx, 8, 80, 184, 26, color, { r: 4, seed: 181 });
  crayonRect(ctx, 12, 106, 176, 8, P.haiiro, { seed: 182, width: 2 });
  [30, 60, 140, 170].forEach((x, i) => crayonCircle(ctx, x, 118, 8, P.sumi, { seed: 183 + i, width: 2 }));
}

export const VEHICLES = {
  excavator: { ja: 'ショベルカー', yomi: 'しょべるかー', en: 'excavator', job: { ja: 'あなを ほる', en: 'digs holes' } },
  dump: { ja: 'ダンプカー', yomi: 'だんぷかー', en: 'dump truck', job: { ja: 'つちを はこぶ', en: 'carries dirt' } },
  crane: { ja: 'クレーンしゃ', yomi: 'くれーんしゃ', en: 'crane truck', job: { ja: 'たかく もちあげる', en: 'lifts things up high' } },
  fire: { ja: 'しょうぼうしゃ', yomi: 'しょうぼうしゃ', en: 'fire engine', job: { ja: 'ひを けす', en: 'puts out fires' } },
  ambulance: { ja: 'きゅうきゅうしゃ', yomi: 'きゅうきゅうしゃ', en: 'ambulance', job: { ja: 'けがを した ひとを はこぶ', en: 'takes hurt people to hospital' } },
  police: { ja: 'パトカー', yomi: 'ぱとかー', en: 'police car', job: { ja: 'まちを まもる', en: 'keeps the town safe' } },
  garbage: { ja: 'ごみしゅうしゅうしゃ', yomi: 'ごみしゅうしゅうしゃ', en: 'garbage truck', job: { ja: 'ごみを あつめる', en: 'collects garbage' } },
  mixer: { ja: 'ミキサーしゃ', yomi: 'みきさーしゃ', en: 'concrete mixer', job: { ja: 'コンクリートを まぜて はこぶ', en: 'mixes concrete' } },
  bulldozer: { ja: 'ブルドーザー', yomi: 'ぶるどーざー', en: 'bulldozer', job: { ja: 'つちを おして たいらにする', en: 'pushes dirt flat' } },
  roller: { ja: 'ロードローラー', yomi: 'ろーどろーらー', en: 'road roller', job: { ja: 'みちを かためる', en: 'presses the road flat' } },
  forklift: { ja: 'フォークリフト', yomi: 'ふぉーくりふと', en: 'forklift', job: { ja: 'にもつを もちあげる', en: 'lifts boxes' } },
  bus: { ja: 'バス', yomi: 'ばす', en: 'bus', job: { ja: 'たくさんの ひとを のせる', en: 'carries lots of people' } },
  tow: { ja: 'レッカーしゃ', yomi: 'れっかーしゃ', en: 'tow truck', job: { ja: 'こしょうした くるまを はこぶ', en: 'tows broken cars' } },
  shinkansen: { ja: 'しんかんせん', yomi: 'しんかんせん', en: 'bullet train' },
  shinkansenBlue: { ja: 'しんかんせん', yomi: 'しんかんせん', en: 'bullet train' },
  shinkansenRed: { ja: 'しんかんせん', yomi: 'しんかんせん', en: 'bullet train' },
  shinkansenCar: { ja: 'しんかんせん', yomi: 'しんかんせん', en: 'bullet train car' },
  shinkansenCarBlue: { ja: 'しんかんせん', yomi: 'しんかんせん', en: 'bullet train car' },
  loco: { ja: 'きかんしゃ', yomi: 'きかんしゃ', en: 'locomotive' },
  freight: { ja: 'かしゃ', yomi: 'かしゃ', en: 'freight car' },
};
const DRAW = {
  ...D,
  shinkansen: (c) => drawShinkansenHead(c, P.midori),
  shinkansenBlue: (c) => drawShinkansenHead(c, P.ao),
  shinkansenRed: (c) => drawShinkansenHead(c, P.aka),
  shinkansenCar: (c) => drawShinkansenCar(c, P.midori),
  shinkansenCarBlue: (c) => drawShinkansenCar(c, P.ao),
  loco: (c) => drawLoco(c, P.ao),
  freight: (c) => drawFreight(c, P.chairo),
};
/** 働く車だけの一覧(ゲームでの選択肢用) */
export const WORK_VEHICLES = ['excavator', 'dump', 'crane', 'fire', 'ambulance', 'police', 'garbage', 'mixer', 'bulldozer', 'roller', 'forklift', 'bus', 'tow'];

/** id の絵を 200×130 の座標系で直接描く(遅いので通常は drawVehicle を使う) */
export function drawVehicleRaw(ctx, id) { DRAW[id](ctx); }

/** キャッシュした絵を返す。w は表示する幅(論理px) */
export function vehicleSprite(id, w = VW, flip = false) {
  const h = (w * VH) / VW;
  return sprite('veh-' + id + (flip ? '-f' : ''), w, h, (ctx) => {
    ctx.scale(w / VW, h / VH);
    if (flip) { ctx.translate(VW, 0); ctx.scale(-1, 1); }
    DRAW[id](ctx);
  });
}
/** (x, y) を左上として、幅 w で描く。flip=true で左向き */
export function drawVehicle(ctx, id, x, y, w = VW, flip = false) {
  const spr = vehicleSprite(id, Math.round(w), flip);
  drawSprite(ctx, spr, x, y, w, (w * VH) / VW);
}

// ---------- 人(お客さん) ----------
// 縦 100 × 横 60 の箱。足元 y=100
const PERSON_COLORS = [P.aka, P.daidai, P.kiiro, P.midori, P.ao, P.murasaki, P.sorairo, P.kimidori];
export function personSprite(variant = 0, h = 100) {
  const w = h * 0.6;
  return sprite('person-' + variant, w, h, (ctx) => {
    ctx.scale(h / 100, h / 100);
    const col = PERSON_COLORS[variant % PERSON_COLORS.length];
    const kid = variant % 3 === 2;
    const top = kid ? 30 : 8;
    // 体
    crayonPoly(ctx, [[14, top + 40], [46, top + 40], [52, 92], [8, 92]], col, { seed: 200 + variant });
    // 足
    crayonLine(ctx, [[22, 92], [22, 99]], { width: 5, seed: 210 + variant });
    crayonLine(ctx, [[38, 92], [38, 99]], { width: 5, seed: 220 + variant });
    // 顔
    crayonCircle(ctx, 30, top + 22, 17, P.gayoshi, { seed: 230 + variant });
    // 髪
    const hair = variant % 2 ? P.chairo : P.sumi;
    crayonPoly(ctx, [[13, top + 20], [18, top + 6], [30, top + 2], [44, top + 8], [47, top + 20], [40, top + 12], [22, top + 12]], hair, { seed: 240 + variant, width: 2 });
    // 目と口(にっこり)
    ctx.fillStyle = P.sumi;
    ctx.beginPath(); ctx.arc(24, top + 23, 2.2, 0, 7); ctx.arc(36, top + 23, 2.2, 0, 7); ctx.fill();
    crayonLine(ctx, [[25, top + 30], [30, top + 33], [35, top + 30]], { width: 2, seed: 250 + variant, passes: 1 });
    // ほっぺ
    ctx.globalAlpha = 0.35; ctx.fillStyle = P.aka;
    ctx.beginPath(); ctx.arc(19, top + 29, 3.5, 0, 7); ctx.arc(41, top + 29, 3.5, 0, 7); ctx.fill();
    ctx.globalAlpha = 1;
  });
}
export function drawPerson(ctx, variant, x, y, h = 100) {
  const spr = personSprite(variant, Math.round(h));
  drawSprite(ctx, spr, x, y, h * 0.6, h);
}

// ---------- 小物 ----------
/** 木箱・荷物 (size×size) */
export function drawCrate(ctx, x, y, size = 60, color = P.chairo, seed = 1) {
  const spr = sprite('crate-' + color + '-' + seed, size, size, (c) => {
    crayonRect(c, 3, 3, size - 6, size - 6, color, { seed, r: 3 });
    crayonLine(c, [[8, 8], [size - 8, size - 8]], { width: 2.5, seed: seed + 1 });
    crayonLine(c, [[size - 8, 8], [8, size - 8]], { width: 2.5, seed: seed + 2 });
  });
  drawSprite(ctx, spr, x, y);
}
