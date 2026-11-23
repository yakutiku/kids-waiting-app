// 「おはなしを ならべよう」の絵カード。1 枚は 200×170 の座標で描く。
// draw(c, a, t): a は 0〜1 の動きの進み具合(その場面の中の動き)、t は時間(ゆらぎ用)。
// 乗り物の絵は drawVehicle(スプライトのキャッシュ)、そのほかは軽い図形だけ。色は P のみ。
import { P } from '../../crayon/palette.js';
import { drawVehicle, drawPerson, drawCrate } from '../../crayon/vehicles.js';

export const CW = 200, CH = 170, G = 138;
const L = (a, b, k) => a + (b - a) * k;
const E = (k) => k * k * (3 - 2 * k);
const clamp = (v) => Math.max(0, Math.min(1, v));
const veh = (c, id, x, w, flip = false, dy = 0) => drawVehicle(c, id, x, G - 0.63 * w + dy, w, flip);

function fill(c, color, alpha = 1) { c.fillStyle = color; c.globalAlpha = alpha; }
function poly(c, pts, color, alpha = 1) {
  fill(c, color, alpha); c.beginPath(); c.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) c.lineTo(pts[i][0], pts[i][1]);
  c.closePath(); c.fill(); c.globalAlpha = 1;
}
function ell(c, x, y, rx, ry, color, alpha = 1) {
  fill(c, color, alpha); c.beginPath(); c.ellipse(x, y, Math.max(0.01, rx), Math.max(0.01, ry), 0, 0, 7); c.fill(); c.globalAlpha = 1;
}
function rect(c, x, y, w, h, color, alpha = 1) { fill(c, color, alpha); c.fillRect(x, y, w, h); c.globalAlpha = 1; }
function flame(c, x, y, s, t) {
  if (s <= 0.02) return;
  const sw = Math.sin(t * 2.2 + x) * 2.5 * s;
  poly(c, [[x - 10 * s, y], [x - 6 * s + sw, y - 20 * s], [x + sw * 1.4, y - 34 * s], [x + 7 * s + sw, y - 18 * s], [x + 11 * s, y]], P.aka);
  poly(c, [[x - 6 * s, y], [x + sw, y - 20 * s], [x + 7 * s, y]], P.daidai);
  poly(c, [[x - 3 * s, y], [x + sw * 0.6, y - 10 * s], [x + 4 * s, y]], P.kiiro);
}
function house(c, x, y, w, h) {
  rect(c, x, y, w, h, P.gayoshi); c.strokeStyle = P.sumi; c.lineWidth = 2.5; c.strokeRect(x, y, w, h);
  poly(c, [[x - 6, y], [x + w / 2, y - 24], [x + w + 6, y]], P.chairo);
  rect(c, x + w * 0.4, y + h - 26, 16, 26, P.daidai);
  rect(c, x + 8, y + 10, 16, 14, P.sorairo);
}
function bag(c, x, y, k = 1) {
  c.save(); c.translate(x, y); c.scale(k, k);
  c.fillStyle = P.midori; c.strokeStyle = P.sumi; c.lineWidth = 2; c.globalAlpha = 1;
  c.beginPath(); c.ellipse(0, 4, 13, 12, 0, 0, 7); c.fill(); c.stroke();
  c.beginPath(); c.moveTo(-4, -6); c.lineTo(-6, -14); c.lineTo(6, -14); c.lineTo(4, -6); c.closePath(); c.fill(); c.stroke();
  c.restore();
}
function smoke(c, x, y, a, t, n = 3) {
  for (let i = 0; i < n; i++) {
    const k = (a * 0.6 + i / n + t * 0.08) % 1;
    ell(c, x + Math.sin(k * 6 + i) * 6 + k * 8, y - k * 52, 7 + k * 10, 6 + k * 8, P.haiiro, 0.5 * (1 - k));
  }
}
function pile(c, x, y, w, h, color = P.chairo) { if (h > 0.5) poly(c, [[x - w / 2, y], [x - w * 0.2, y - h * 0.8], [x + w * 0.05, y - h], [x + w * 0.3, y - h * 0.7], [x + w / 2, y]], color); }
function dirtArc(c, x0, y0, x1, y1, a, n = 5) {
  for (let i = 0; i < n; i++) {
    const k = clamp(((a * 1.6 + i / n) % 1));
    const x = L(x0, x1, k), y = L(y0, y1, k) - Math.sin(k * Math.PI) * 38;
    ell(c, x, y, 5, 4.5, P.chairo);
  }
}

export const STORIES = [
  {
    id: 'dump', bg: 'road', title: { ja: 'ダンプカーの おはなし', en: 'The dump truck' },
    cards: [
      { p: 0.5, draw(c, a) { veh(c, 'dump', L(-20, 60, E(a)), 112); pile(c, L(-20, 60, E(a)) + 40, G - 50, 52, 20); } },
      { p: 0.5, draw(c, a) { veh(c, 'dump', 58, 112); const h = 24 * (1 - a); pile(c, 98, G - 56, 54, h); pile(c, 38, G, 56, 8 + 24 * a); for (let i = 0; i < 3; i++) { const k = clamp(a * 1.4 - i * 0.2); if (k > 0 && k < 1) ell(c, L(70, 36, k), L(G - 40, G - 6, k), 4.5, 4, P.chairo); } } },
      { p: 0.5, draw(c, a) { pile(c, 150, G, 58, 30); veh(c, 'dump', L(90, -110, E(a)), 112, true); } },
    ],
  },
  {
    id: 'shinkansen', bg: 'station', title: { ja: 'しんかんせんの おはなし', en: 'The bullet train' },
    cards: [
      { p: 0.5, draw(c, a) { rect(c, 20, 60, 160, 7, P.haiiro); rect(c, 30, 66, 5, G - 66, P.haiiro); rect(c, 165, 66, 5, G - 66, P.haiiro); veh(c, 'shinkansen', L(-105, 36, E(a)), 124); drawPerson(c, 3, 156, G - 56, 56); } },
      { p: 0.5, draw(c, a) { rect(c, 20, 60, 160, 7, P.haiiro); rect(c, 30, 66, 5, G - 66, P.haiiro); rect(c, 165, 66, 5, G - 66, P.haiiro); veh(c, 'shinkansen', 36, 124); c.globalAlpha = 1 - clamp((a - 0.6) * 3); drawPerson(c, 3, L(156, 100, E(clamp(a * 1.4))), G - 56, 56); c.globalAlpha = 1; } },
      { p: 0.5, draw(c, a) { rect(c, 20, 60, 160, 7, P.haiiro); rect(c, 30, 66, 5, G - 66, P.haiiro); rect(c, 165, 66, 5, G - 66, P.haiiro); veh(c, 'shinkansen', L(36, 230, E(a)), 124); } },
    ],
  },
  {
    id: 'fire', bg: 'town', title: { ja: 'しょうぼうしゃの おはなし', en: 'The fire engine' },
    cards: [
      { p: 0.5, draw(c, a, t) { house(c, 100, 84, 78, 54); flame(c, 124, 84, 1, t); flame(c, 156, 84, 0.8, t + 2); smoke(c, 140, 70, a, t); } },
      { p: 0.5, draw(c, a, t) { house(c, 110, 84, 78, 54); flame(c, 134, 84, 1, t); flame(c, 166, 84, 0.8, t + 2); smoke(c, 150, 70, a, t); veh(c, 'fire', L(-112, 4, E(a)), 108); } },
      { p: 0.5, draw(c, a, t) { house(c, 110, 84, 78, 54); const s = 1 - 0.6 * a; flame(c, 134, 84, s, t); flame(c, 166, 84, s * 0.8, t + 2); veh(c, 'fire', 4, 108); c.strokeStyle = P.sorairo; c.lineWidth = 5; c.lineCap = 'round'; c.globalAlpha = 0.85; c.beginPath(); c.moveTo(78, 96); c.quadraticCurveTo(110, 40, 140, 84); c.stroke(); c.globalAlpha = 1; } },
      { p: 0.5, draw(c, a, t) { house(c, 110, 84, 78, 54); veh(c, 'fire', 4, 108); smoke(c, 150, 76, 1, t, 2); ell(c, 168, 28, 14, 14, P.kiiro); for (let i = 0; i < 3; i++) { const k = (t * 0.5 + i / 3) % 1; ell(c, 126 + i * 22, 66 - k * 10, 3, 3, P.sorairo, 1 - k); } } },
    ],
  },
  {
    id: 'shovel', bg: 'dirt', title: { ja: 'ショベルカーの おはなし', en: 'The excavator' },
    cards: [
      { p: 0.5, draw(c, a) { veh(c, 'excavator', 6, 96); ell(c, 148, G - 1, 14 + 14 * a, 4 + 4 * a, P.sumi, 0.7); pile(c, 82, G, 34, 4 + 22 * a); } },
      { p: 0.5, draw(c, a) { veh(c, 'excavator', -6, 86); veh(c, 'dump', 82, 112); pile(c, 122, G - 56, 54, 4 + 20 * a); dirtArc(c, 70, G - 14, 112, G - 44, a * 0.9, 4); } },
      { p: 0.5, draw(c, a) { pile(c, 22, G, 40, 18); veh(c, 'dump', L(10, 100, E(a)), 112); pile(c, L(10, 100, E(a)) + 40, G - 56, 54, 22); } },
    ],
  },
  {
    id: 'garbage', bg: 'town', title: { ja: 'ごみしゅうしゅうしゃの おはなし', en: 'The garbage truck' },
    cards: [
      { p: 0.5, draw(c, a) { for (let i = 0; i < 3; i++) bag(c, 40 + i * 28, G - 18 - (i % 2) * 3); veh(c, 'garbage', L(215, 150, E(a)), 112, true); } },
      { p: 0.5, draw(c, a) { for (let i = 0; i < 3; i++) { const k = clamp(a * 1.6 - i * 0.25); if (k >= 1) continue; const x = L(40 + i * 28, 100, E(k)), y = L(G - 22, G - 60, E(k)) - Math.sin(k * 3.14) * 20; bag(c, x, y + 6, 1 - 0.4 * k); } veh(c, 'garbage', 76, 112, true); } },
      { p: 0.5, draw(c, a) { veh(c, 'garbage', L(76, -140, E(a)), 112, true);  } },
    ],
  },
  {
    id: 'roller', bg: 'road', title: { ja: 'ロードローラーの おはなし', en: 'The road roller' },
    cards: [
      { p: 0.5, draw(c, a) { for (let i = 0; i < 6; i++) ell(c, 28 + i * 30, G + 1, 12, 7, P.chairo); veh(c, 'roller', L(-75, 20, E(a)), 112); } },
      { p: 0.5, draw(c, a) { const rx = L(-10, 110, E(a)); for (let i = 0; i < 6; i++) { const bx = 28 + i * 30; if (bx > rx + 50) ell(c, bx, G + 1, 12, 7, P.chairo); } veh(c, 'roller', rx, 112); } },
      { p: 0.5, draw(c, a) { veh(c, 'police', L(-110, 220, E(a)), 112); } },
    ],
  },
  {
    id: 'crane', bg: 'town', title: { ja: 'クレーンしゃの おはなし', en: 'The crane truck' },
    cards: [
      { p: 0.5, draw(c, a) { rect(c, 150, 96, 46, G - 96, P.sorairo); c.strokeStyle = P.sumi; c.lineWidth = 2.5; c.strokeRect(150, 96, 46, G - 96); veh(c, 'crane', 0, 150); const y = G - 28 - 3 * a; c.strokeStyle = P.sumi; c.lineWidth = 2; c.beginPath(); c.moveTo(142, 56); c.lineTo(142, y); c.stroke(); drawCrate(c, 128, y, 28, P.chairo, 3); } },
      { p: 0.5, draw(c, a) { rect(c, 150, 96, 46, G - 96, P.sorairo); c.strokeStyle = P.sumi; c.lineWidth = 2.5; c.strokeRect(150, 96, 46, G - 96); veh(c, 'crane', 0, 150); const y = L(G - 31, 72, E(a)); c.strokeStyle = P.sumi; c.lineWidth = 2; c.beginPath(); c.moveTo(142, 56); c.lineTo(142, y); c.stroke(); drawCrate(c, 128, y, 28, P.chairo, 3); } },
      { p: 0.5, draw(c, a) { rect(c, 150, 96, 46, G - 96, P.sorairo); c.strokeStyle = P.sumi; c.lineWidth = 2.5; c.strokeRect(150, 96, 46, G - 96); veh(c, 'crane', 0, 150); const x = L(128, 160, E(a)), y = L(72, 68, E(a)); c.strokeStyle = P.sumi; c.lineWidth = 2; c.beginPath(); c.moveTo(142, 56); c.lineTo(x + 14, y); c.stroke(); drawCrate(c, x, y, 28, P.chairo, 3); } },
    ],
  },
];
