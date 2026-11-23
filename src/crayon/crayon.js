// クレヨン描画ライブラリ(仕様書 6-2)
// - 輪郭は少しぶれた線を 2 本重ねて手描き風に
// - 塗りは斜めのストロークを重ね、紙の色が少し透ける
// - 重い描画は sprite() で 1 度だけ描いてキャッシュし、drawImage で使い回す
import { P } from './palette.js';

export const FONT = '"Hiragino Maru Gothic ProN", "Hiragino Sans", "Noto Sans JP", "Noto Sans CJK JP", "Yu Gothic", "Meiryo", system-ui, sans-serif';

/** 決まった乱数(毎回同じ絵になるように) */
export function rng(seed = 1) {
  let a = (typeof seed === 'string' ? hashStr(seed) : seed) >>> 0;
  return function () {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export function hashStr(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}

// ---------- 点列(ポリゴン)ユーティリティ ----------
export function rectPts(x, y, w, h, r = 0) {
  if (r <= 0) return [[x, y], [x + w, y], [x + w, y + h], [x, y + h]];
  r = Math.min(r, w / 2, h / 2);
  const pts = [];
  const corner = (cx, cy, a0) => {
    for (let i = 0; i <= 4; i++) {
      const a = a0 + (Math.PI / 2) * (i / 4);
      pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]);
    }
  };
  corner(x + w - r, y + r, -Math.PI / 2);
  corner(x + w - r, y + h - r, 0);
  corner(x + r, y + h - r, Math.PI / 2);
  corner(x + r, y + r, Math.PI);
  return pts;
}
export function circlePts(cx, cy, r, n = 0) {
  n = n || Math.max(12, Math.round(r / 2.5));
  const pts = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]);
  }
  return pts;
}
export function ellipsePts(cx, cy, rx, ry, n = 24) {
  const pts = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    pts.push([cx + Math.cos(a) * rx, cy + Math.sin(a) * ry]);
  }
  return pts;
}
/** 辺を細かく分ける(ぶれを自然にするため) */
function subdivide(pts, closed, step) {
  const out = [];
  const n = pts.length;
  const last = closed ? n : n - 1;
  for (let i = 0; i < last; i++) {
    const a = pts[i], b = pts[(i + 1) % n];
    const d = Math.hypot(b[0] - a[0], b[1] - a[1]);
    const k = Math.max(1, Math.ceil(d / step));
    for (let j = 0; j < k; j++) out.push([a[0] + (b[0] - a[0]) * j / k, a[1] + (b[1] - a[1]) * j / k]);
  }
  if (!closed) out.push(pts[n - 1]);
  return out;
}
function jitter(pts, amt, rnd) {
  // なめらかなぶれ(隣とつながる)
  let ox = 0, oy = 0;
  return pts.map(([x, y]) => {
    ox = ox * 0.6 + (rnd() - 0.5) * amt;
    oy = oy * 0.6 + (rnd() - 0.5) * amt;
    return [x + ox, y + oy];
  });
}
function tracePath(ctx, pts, closed) {
  ctx.beginPath();
  ctx.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
  if (closed) ctx.closePath();
}
function bbox(pts) {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const [x, y] of pts) { if (x < x0) x0 = x; if (y < y0) y0 = y; if (x > x1) x1 = x; if (y > y1) y1 = y; }
  return { x0, y0, x1, y1 };
}

/** ぶれた線(開いた線・閉じた線) */
export function crayonLine(ctx, pts, { color = P.sumi, width = 4, closed = false, seed = 7, passes = 2, wobble = 1 } = {}) {
  const rnd = rng(seed);
  const step = Math.max(6, width * 2);
  const base = subdivide(pts, closed, step);
  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.strokeStyle = color;
  for (let p = 0; p < passes; p++) {
    const j = jitter(base, (1.2 + width * 0.25) * wobble, rnd);
    ctx.globalAlpha = p === 0 ? 0.9 : 0.55;
    ctx.lineWidth = width * (p === 0 ? 1 : 0.7);
    tracePath(ctx, j, closed);
    ctx.stroke();
  }
  ctx.restore();
}

/** クレヨンの塗り(斜めのストローク + 紙の透け) */
export function crayonFill(ctx, pts, color, { seed = 3, alpha = 1, angle = -0.5, density = 1 } = {}) {
  const rnd = rng(seed);
  const b = bbox(pts);
  ctx.save();
  tracePath(ctx, pts, true);
  ctx.clip();
  ctx.fillStyle = color;
  ctx.globalAlpha = 0.72 * alpha;
  ctx.fill();
  // 斜めのストローク
  ctx.strokeStyle = color;
  ctx.lineCap = 'round';
  const w = b.x1 - b.x0, h = b.y1 - b.y0;
  const diag = Math.hypot(w, h);
  const cx = (b.x0 + b.x1) / 2, cy = (b.y0 + b.y1) / 2;
  const ca = Math.cos(angle), sa = Math.sin(angle);
  const gap = 3.2 / density;
  for (let d = -diag / 2; d < diag / 2; d += gap + rnd() * gap) {
    const px = cx - sa * d, py = cy + ca * d;
    ctx.globalAlpha = (0.25 + rnd() * 0.45) * alpha;
    ctx.lineWidth = 1.2 + rnd() * 2.2;
    ctx.beginPath();
    ctx.moveTo(px - ca * diag / 2 + (rnd() - 0.5) * 6, py - sa * diag / 2);
    ctx.lineTo(px + ca * diag / 2, py + sa * diag / 2 + (rnd() - 0.5) * 6);
    ctx.stroke();
  }
  // 紙の透け(小さな白い点)
  ctx.fillStyle = P.gayoshi;
  const specks = Math.min(400, Math.round((w * h) / 90));
  for (let i = 0; i < specks; i++) {
    ctx.globalAlpha = 0.18 + rnd() * 0.25;
    const sx = b.x0 + rnd() * w, sy = b.y0 + rnd() * h;
    ctx.fillRect(sx, sy, 1 + rnd() * 2, 1 + rnd() * 1.5);
  }
  ctx.restore();
}

/** 塗り + 輪郭 */
export function crayonShape(ctx, pts, fill, { stroke = P.sumi, width = 3.5, seed = 5, outline = true, alpha = 1 } = {}) {
  if (fill) crayonFill(ctx, pts, fill, { seed, alpha });
  if (outline && stroke) crayonLine(ctx, pts, { color: stroke, width, closed: true, seed: seed + 11 });
}
export function crayonRect(ctx, x, y, w, h, fill, opt = {}) {
  crayonShape(ctx, rectPts(x, y, w, h, opt.r || 0), fill, opt);
}
export function crayonCircle(ctx, cx, cy, r, fill, opt = {}) {
  crayonShape(ctx, circlePts(cx, cy, r), fill, opt);
}
export function crayonPoly(ctx, pts, fill, opt = {}) {
  crayonShape(ctx, pts, fill, opt);
}

/** 車輪 */
export function crayonWheel(ctx, cx, cy, r, seed = 1) {
  crayonCircle(ctx, cx, cy, r, P.sumi, { seed, width: 3 });
  crayonCircle(ctx, cx, cy, r * 0.45, P.haiiro, { seed: seed + 3, width: 2 });
}

// ---------- スプライト(1 度だけ描いて使い回す) ----------
const spriteCache = new Map();
let SPRITE_SCALE = Math.min(2, (typeof window !== 'undefined' && window.devicePixelRatio) || 1);
export function setSpriteScale(s) { SPRITE_SCALE = s; spriteCache.clear(); }

/**
 * w×h の論理座標で drawFn(ctx) を描き、キャッシュしたキャンバスを返す。
 * 使うとき: drawSprite(ctx, spr, x, y, w, h)
 */
export function sprite(key, w, h, drawFn, scale = SPRITE_SCALE) {
  const k = key + '@' + w + 'x' + h + '@' + scale;
  let c = spriteCache.get(k);
  if (c) return c;
  c = document.createElement('canvas');
  c.width = Math.max(1, Math.ceil(w * scale));
  c.height = Math.max(1, Math.ceil(h * scale));
  const ctx = c.getContext('2d');
  ctx.scale(scale, scale);
  drawFn(ctx, w, h);
  c.logicalW = w; c.logicalH = h;
  spriteCache.set(k, c);
  return c;
}
export function drawSprite(ctx, spr, x, y, w = spr.logicalW, h = spr.logicalH) {
  ctx.drawImage(spr, x, y, w, h);
}

/** 画用紙の背景(ざらつき入り) */
export function paperSprite(w, h, tint = P.gayoshi) {
  return sprite('paper-' + tint, w, h, (ctx) => {
    ctx.fillStyle = tint;
    ctx.fillRect(0, 0, w, h);
    const rnd = rng(42);
    const n = Math.min(3000, Math.round((w * h) / 250));
    for (let i = 0; i < n; i++) {
      ctx.globalAlpha = 0.04 + rnd() * 0.06;
      ctx.fillStyle = rnd() < 0.5 ? P.haiiro : P.chairo;
      ctx.fillRect(rnd() * w, rnd() * h, 1 + rnd() * 2, 1 + rnd() * 2);
    }
    ctx.globalAlpha = 1;
  }, 1);
}

/** 文字(端末のフォント)。align/baseline は canvas と同じ */
export function crayonText(ctx, text, x, y, size = 32, { color = P.sumi, align = 'center', baseline = 'middle', weight = 'bold' } = {}) {
  ctx.save();
  ctx.font = `${weight} ${size}px ${FONT}`;
  ctx.textAlign = align;
  ctx.textBaseline = baseline;
  ctx.fillStyle = color;
  ctx.globalAlpha = 0.95;
  ctx.fillText(text, x, y);
  ctx.globalAlpha = 0.35;
  ctx.fillText(text, x + 0.8, y + 0.6);
  ctx.restore();
}

/** キラキラ(星形) */
export function starPts(cx, cy, r, inner = 0.45, n = 5, rot = -Math.PI / 2) {
  const pts = [];
  for (let i = 0; i < n * 2; i++) {
    const rr = i % 2 === 0 ? r : r * inner;
    const a = rot + (i / (n * 2)) * Math.PI * 2;
    pts.push([cx + Math.cos(a) * rr, cy + Math.sin(a) * rr]);
  }
  return pts;
}

/** 画面用の小さな手描きアイコン(DOM のボタンに使う)をキャンバスで作る */
export function iconCanvas(size, drawFn, key) {
  const scale = Math.min(2, window.devicePixelRatio || 1);
  const c = document.createElement('canvas');
  c.width = Math.round(size * scale);
  c.height = Math.round(size * scale);
  c.style.width = size + 'px';
  c.style.height = size + 'px';
  const src = key ? sprite('icon-' + key, size, size, drawFn, scale) : null;
  const ctx = c.getContext('2d');
  if (src) ctx.drawImage(src, 0, 0);
  else { ctx.scale(scale, scale); drawFn(ctx, size, size); }
  return c;
}
