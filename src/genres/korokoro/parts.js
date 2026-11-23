// ころころそうち: 部品の定義(物理の組み立て・当たり判定・描画)
// 部品データは物理の計算方法(自作 / 将来の Matter.js)と共通にする。
import { addSeg, addBody, addBall, BALL_R, FIELD } from './physics.js';
import { P } from '../../crayon/palette.js';
import { sprite, drawSprite, crayonRect, crayonCircle, crayonPoly, crayonLine, starPts, circlePts } from '../../crayon/crayon.js';
import { drawVehicle } from '../../crayon/vehicles.js';

const D2R = Math.PI / 180;
export const RAMP_LEN = 180;
export const RAMP_ANGLES = [-30, -15, 0, 15, 30];
export const DOMINO = { w: 18, h: 92 };
export const SEESAW_LEN = 240;
export const CONVEYOR_LEN = 220;

// ---------- 物理の組み立て ----------
export function buildPart(w, p) {
  switch (p.type) {
    case 'wall':
      addSeg(w, p.x1, p.y1, p.x2, p.y2, { t: 8, owner: p });
      break;
    case 'ramp': {
      const len = p.len || RAMP_LEN;
      const a = (p.angle || 0) * D2R;
      const dx = Math.cos(a) * len / 2, dy = Math.sin(a) * len / 2;
      addSeg(w, p.x - dx, p.y - dy, p.x + dx, p.y + dy, { t: 7, owner: p, mu: 0.04 });
      break;
    }
    case 'domino': {
      const b = addBody(w, {
        px: p.x, py: p.y, m: 1.2, I: (1.2 * (DOMINO.h ** 2 + DOMINO.w ** 2)) / 3,
        min: 0, max: Math.PI / 2 - 0.05, com: [-DOMINO.w / 2, -DOMINO.h / 2], damp: 0.6, limitE: 0.1, kind: 'domino', owner: p,
      });
      b.w = DOMINO.w; b.h = DOMINO.h;
      addSeg(w, -DOMINO.w / 2, -DOMINO.w / 2, -DOMINO.w / 2, -DOMINO.h + DOMINO.w / 2, { t: DOMINO.w / 2, body: b, owner: p, e: 0.1 });
      w.dominoes.push(b);
      p._body = b;
      break;
    }
    case 'seesaw': {
      const a0 = p.tilt === 'r' ? 0.3 : p.tilt === 'l' ? -0.3 : 0;
      const b = addBody(w, { px: p.x, py: p.y, angle: a0, m: 2, I: (2 * SEESAW_LEN ** 2) / 12 * 1.0, min: -0.3, max: 0.3, com: [0, 0], damp: 0.8, limitE: 0.05, kind: 'seesaw', owner: p });
      addSeg(w, -SEESAW_LEN / 2, -6, SEESAW_LEN / 2, -6, { t: 7, body: b, owner: p, e: 0.1, mu: 0.5 });
      // 台(三角)
      addSeg(w, p.x - 30, p.y + 44, p.x, p.y + 4, { t: 5, owner: p });
      addSeg(w, p.x + 30, p.y + 44, p.x, p.y + 4, { t: 5, owner: p });
      p._body = b;
      break;
    }
    case 'spring':
      addSeg(w, p.x - 40, p.y, p.x + 40, p.y, { t: 7, spring: p.power || 900, owner: p });
      addSeg(w, p.x - 44, p.y + 36, p.x + 44, p.y + 36, { t: 5, owner: p });
      p.squash = 0;
      break;
    case 'conveyor': {
      const len = p.len || CONVEYOR_LEN;
      addSeg(w, p.x - len / 2, p.y, p.x + len / 2, p.y, { t: 12, belt: p.speed ?? 240, owner: p, e: 0.05 });
      break;
    }
    case 'dump': {
      const m = { type: 'dump', part: p, x: p.x, groundY: p.y, dir: p.dir || 1, dist: p.dist ?? 200, driveTime: 1.8, state: 'idle', t: 0, offset: 0, tilt: 0 };
      m.move = p.toX != null ? p.toX - p.x : -m.dir * m.dist;
      const d = m.dir;
      const xa = p.x - d * 100, xb = p.x + d * 20;
      m.zone = { x0: Math.min(xa, xb), x1: Math.max(xa, xb), y0: p.y - 190, y1: p.y - 50 };
      w.machines.push(m);
      p._m = m;
      break;
    }
    case 'crane': {
      const m = { type: 'crane', part: p, x: p.x, groundY: p.y, hx: p.hx, hy: p.hy, lift: p.lift ?? 160, moveX: p.moveX ?? 200, state: 'idle', t: 0, k1: 0, k2: 0, bucketTilt: 0 };
      w.machines.push(m);
      p._m = m;
      break;
    }
    case 'goal': {
      if (p.style === 'bell') {
        // ベル: ボールがさわると鳴る
        addSeg(w, p.x - 30, p.y + 10, p.x + 30, p.y + 10, { t: 14, owner: p, e: 0.3 });
        w.goals.push({ x: p.x, y: p.y + 60, w: 110, h: 110, reached: false, part: p, bell: true, only: p.only });
        break;
      }
      const gw = 120, gh = 70;
      addSeg(w, p.x - gw / 2, p.y - gh, p.x - gw / 2, p.y, { t: 6, owner: p, e: 0.1 });
      addSeg(w, p.x + gw / 2, p.y - gh, p.x + gw / 2, p.y, { t: 6, owner: p, e: 0.1 });
      addSeg(w, p.x - gw / 2, p.y, p.x + gw / 2, p.y, { t: 6, owner: p, e: 0.05, mu: 0.6 });
      w.goals.push({ x: p.x, y: p.y, w: gw - 16, h: gh - 6, reached: false, part: p });
      break;
    }
    case 'ballS': case 'ballB': {
      const b = addBall(w, p.x, p.y, p.type === 'ballB' ? 'b' : 's');
      b.part = p;
      break;
    }
  }
}

/** 床と左右の壁 */
export function buildField(w) {
  addSeg(w, FIELD.x0 - 40, FIELD.floor + 8, FIELD.x1 + 40, FIELD.floor + 8, { t: 8, mu: 0.06 });
  addSeg(w, FIELD.x0 - 8, FIELD.y0, FIELD.x0 - 8, FIELD.floor + 10, { t: 8 });
  addSeg(w, FIELD.x1 + 8, FIELD.y0, FIELD.x1 + 8, FIELD.floor + 10, { t: 8 });
}

// ---------- 当たり判定(指でつかむ) ----------
function distToSeg(px, py, ax, ay, bx, by) {
  const dx = bx - ax, dy = by - ay, l2 = dx * dx + dy * dy || 1;
  let t = ((px - ax) * dx + (py - ay) * dy) / l2; t = Math.max(0, Math.min(1, t));
  return Math.hypot(px - ax - dx * t, py - ay - dy * t);
}
export function partHit(p, x, y) {
  switch (p.type) {
    case 'ramp': {
      const a = (p.angle || 0) * D2R, len = p.len || RAMP_LEN;
      const dx = Math.cos(a) * len / 2, dy = Math.sin(a) * len / 2;
      return distToSeg(x, y, p.x - dx, p.y - dy, p.x + dx, p.y + dy) < 50;
    }
    case 'domino': return x > p.x - 60 && x < p.x + 40 && y > p.y - DOMINO.h - 30 && y < p.y + 20;
    case 'seesaw': return Math.abs(x - p.x) < SEESAW_LEN / 2 + 10 && y > p.y - 60 && y < p.y + 50;
    case 'spring': return Math.abs(x - p.x) < 60 && y > p.y - 50 && y < p.y + 50;
    case 'conveyor': return Math.abs(x - p.x) < (p.len || CONVEYOR_LEN) / 2 + 10 && Math.abs(y - p.y) < 50;
    case 'dump': return Math.abs(x - p.x) < 110 && y > p.y - 140 && y < p.y + 10;
    case 'goal': return Math.abs(x - p.x) < 75 && y > p.y - 120 && y < p.y + 20;
    case 'ballS': case 'ballB': return Math.hypot(x - p.x, y - p.y) < 55;
    default: return false;
  }
}
/** 部品をドラッグするときの「つかむ点」と部品の位置の差(指で隠れないよう少し上に) */
export const DRAG_LIFT = 40;

/** 部品がフィールドからはみ出さないよう位置を直す。10 刻みにそろえる */
export function clampPart(p) {
  const snap = (v) => Math.round(v / 10) * 10;
  p.x = snap(p.x); p.y = snap(p.y);
  const half = p.type === 'seesaw' ? SEESAW_LEN / 2 : p.type === 'conveyor' ? (p.len || CONVEYOR_LEN) / 2 : p.type === 'ramp' ? 70 : p.type === 'dump' ? 100 : 40;
  p.x = Math.max(FIELD.x0 + half, Math.min(FIELD.x1 - half, p.x));
  // 床に置くもの
  if (p.type === 'domino' || p.type === 'dump' || p.type === 'goal') p.y = Math.min(p.y, FIELD.floor);
  if (p.type === 'seesaw') p.y = Math.min(p.y, FIELD.floor - 44);
  if (p.type === 'spring') p.y = Math.min(p.y, FIELD.floor - 36);
  p.y = Math.max(40, Math.min(FIELD.floor - 10, p.y));
  if (p.type === 'domino' || p.type === 'dump' || p.type === 'goal') {
    // 近くに床があれば床へ
    if (FIELD.floor - p.y < 60) p.y = FIELD.floor;
  }
  if (p.type === 'seesaw' && FIELD.floor - 44 - p.y < 60) p.y = FIELD.floor - 44;
  if (p.type === 'spring' && FIELD.floor - 36 - p.y < 60) p.y = FIELD.floor - 36;
  return p;
}

// ---------- 描画 ----------
const DOMINO_COLORS = [P.aka, P.daidai, P.kiiro, P.midori, P.ao, P.murasaki];

function plankSprite(len, color = P.chairo) {
  return sprite('plank-' + len + color, len + 8, 24, (c) => {
    crayonRect(c, 4, 4, len, 16, color, { r: 6, seed: len, width: 3 });
    crayonLine(c, [[14, 12], [len * 0.4, 11], [len - 10, 13]], { color: P.sumi, width: 1.2, passes: 1, seed: 3 });
  });
}
export function ballSprite(kind) {
  const r = BALL_R[kind];
  return sprite('ball-' + kind, r * 2 + 8, r * 2 + 8, (c) => {
    crayonCircle(c, r + 4, r + 4, r, kind === 'b' ? P.ao : P.aka, { seed: kind === 'b' ? 31 : 32, width: 3 });
    crayonPoly(c, starPts(r + 4, r + 4, r * 0.45), P.kiiro, { seed: 33, width: 1.5 });
  });
}
function dominoSprite(i) {
  const col = DOMINO_COLORS[i % DOMINO_COLORS.length];
  return sprite('domino-' + i % 6, DOMINO.w + 8, DOMINO.h + 8, (c) => {
    crayonRect(c, 4, 4, DOMINO.w, DOMINO.h, col, { r: 4, seed: 40 + i, width: 2.5 });
    crayonCircle(c, 4 + DOMINO.w / 2, 4 + DOMINO.h * 0.3, 3, P.gayoshi, { seed: 41, width: 1, outline: false });
  });
}
function springSprites() {
  return {
    pad: sprite('spring-pad', 96, 20, (c) => crayonRect(c, 4, 4, 88, 12, P.aka, { r: 5, seed: 51, width: 2.5 })),
    base: sprite('spring-base', 104, 20, (c) => crayonRect(c, 4, 4, 96, 12, P.haiiro, { r: 4, seed: 52, width: 2.5 })),
  };
}
function seesawStand() {
  return sprite('seesaw-stand', 80, 56, (c) => crayonPoly(c, [[40, 6], [72, 50], [8, 50]], P.kiiro, { seed: 61 }));
}
function conveyorSprite(len) {
  return sprite('conv-' + len, len + 20, 40, (c) => {
    crayonRect(c, 4, 6, len + 12, 28, P.haiiro, { r: 14, seed: 71, width: 3 });
  });
}
function goalSprite() {
  return sprite('goal', 150, 170, (c) => {
    // 旗のポール
    crayonLine(c, [[20, 100], [20, 6]], { width: 4, seed: 81 });
    // かご
    crayonPoly(c, [[10, 98], [140, 98], [130, 168], [20, 168]], P.kimidori, { seed: 82 });
    for (let x = 30; x < 130; x += 20) crayonLine(c, [[x, 102], [x + 2, 164]], { width: 1.8, color: P.midori, seed: x, passes: 1 });
  });
}
function bellSprite() {
  return sprite('bell', 80, 80, (c) => {
    crayonPoly(c, [[40, 6], [58, 16], [64, 46], [74, 60], [6, 60], [16, 46], [22, 16]], P.kiiro, { seed: 85 });
    crayonCircle(c, 40, 66, 8, P.daidai, { seed: 86, width: 2 });
  });
}
function flagSprite() {
  return sprite('goal-flag', 60, 40, (c) => crayonPoly(c, [[4, 4], [56, 18], [4, 34]], P.aka, { seed: 83, width: 2.5 }));
}
function truckSprites(dir) {
  const chassis = sprite('dump-chassis', 220, 90, (c) => {
    crayonRect(c, 4, 52, 210, 14, P.haiiro, { r: 4, seed: 91 });
    crayonRect(c, 150, 8, 60, 50, P.kiiro, { r: 8, seed: 92 });
    crayonRect(c, 164, 16, 34, 22, P.sorairo, { r: 4, seed: 93, width: 2.5 });
  });
  const bed = sprite('dump-bed', 150, 60, (c) => {
    crayonPoly(c, [[4, 4], [146, 4], [140, 56], [10, 56]], P.daidai, { seed: 94 });
  });
  const wheel = sprite('dump-wheel', 44, 44, (c) => {
    crayonCircle(c, 22, 22, 18, P.sumi, { seed: 95, width: 2.5 });
    crayonCircle(c, 22, 22, 8, P.haiiro, { seed: 96, width: 2 });
    crayonLine(c, [[22, 14], [22, 30]], { color: P.gayoshi, width: 2, passes: 1, seed: 97 });
  });
  return { chassis, bed, wheel };
}

/** 部品を描く(状態は world から: p._body / p._m) */
export function drawPart(ctx, p, t, ghost = false) {
  ctx.save();
  if (ghost) ctx.globalAlpha = 0.85;
  switch (p.type) {
    case 'wall': {
      const len = Math.hypot(p.x2 - p.x1, p.y2 - p.y1);
      const a = Math.atan2(p.y2 - p.y1, p.x2 - p.x1);
      ctx.translate((p.x1 + p.x2) / 2, (p.y1 + p.y2) / 2); ctx.rotate(a);
      drawSprite(ctx, plankSprite(Math.round(len), P.chairo), -len / 2 - 4, -12);
      break;
    }
    case 'ramp': {
      const len = p.len || RAMP_LEN;
      ctx.translate(p.x, p.y); ctx.rotate((p.angle || 0) * D2R);
      drawSprite(ctx, plankSprite(len, p.fixed ? P.chairo : P.daidai), -len / 2 - 4, -12);
      break;
    }
    case 'domino': {
      const a = p._body ? p._body.angle : 0;
      ctx.translate(p.x, p.y); ctx.rotate(a);
      drawSprite(ctx, dominoSprite(p.ci || 0), -DOMINO.w - 4, -DOMINO.h - 4);
      break;
    }
    case 'seesaw': {
      const a = p._body ? p._body.angle : p.tilt === 'r' ? 0.3 : p.tilt === 'l' ? -0.3 : 0;
      drawSprite(ctx, seesawStand(), p.x - 40, p.y - 4);
      ctx.translate(p.x, p.y); ctx.rotate(a);
      drawSprite(ctx, plankSprite(SEESAW_LEN, P.ao), -SEESAW_LEN / 2 - 4, -18);
      break;
    }
    case 'spring': {
      const sq = p.squash || 0;
      const s = springSprites();
      const top = p.y - 4 + sq * 14;
      ctx.strokeStyle = P.sumi; ctx.lineWidth = 3.5; ctx.lineCap = 'round';
      ctx.beginPath();
      const n = 5, h = p.y + 36 - top;
      for (let i = 0; i <= n * 2; i++) {
        const yy = top + (h * i) / (n * 2);
        const xx = p.x + (i % 2 ? 26 : -26);
        if (i === 0) ctx.moveTo(p.x, yy); else ctx.lineTo(i === n * 2 ? p.x : xx, yy);
      }
      ctx.stroke();
      drawSprite(ctx, s.base, p.x - 52, p.y + 30);
      drawSprite(ctx, s.pad, p.x - 48, top - 10);
      break;
    }
    case 'conveyor': {
      const len = p.len || CONVEYOR_LEN;
      drawSprite(ctx, conveyorSprite(len), p.x - len / 2 - 10, p.y - 20);
      // 動く しるし
      const sp = p.speed ?? 240;
      const off = ((t * sp) % 40 + 40) % 40;
      ctx.strokeStyle = P.gayoshi; ctx.lineWidth = 3; ctx.globalAlpha *= 0.8;
      for (let x = -len / 2 + off; x < len / 2 - 4; x += 40) {
        ctx.beginPath(); ctx.moveTo(p.x + x, p.y - 4); ctx.lineTo(p.x + x + (sp > 0 ? 10 : -10), p.y); ctx.lineTo(p.x + x, p.y + 4); ctx.stroke();
      }
      ctx.globalAlpha = ghost ? 0.85 : 1;
      // ローラー
      for (const ex of [-len / 2 + 6, len / 2 - 6]) {
        ctx.save(); ctx.translate(p.x + ex, p.y); ctx.rotate(t * sp / 12);
        ctx.fillStyle = P.sumi; ctx.beginPath(); ctx.arc(0, 0, 9, 0, 7); ctx.fill();
        ctx.strokeStyle = P.gayoshi; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-6, 0); ctx.lineTo(6, 0); ctx.stroke();
        ctx.restore();
      }
      break;
    }
    case 'dump': {
      const m = p._m;
      const dir = p.dir || 1;
      const off = m ? m.offset : 0;
      const tilt = m ? m.tilt : 0;
      const s = truckSprites(dir);
      ctx.translate(p.x + off, p.y);
      if (dir < 0) ctx.scale(-1, 1);
      // 荷台(後ろ=左 を支点に かたむく)
      drawSprite(ctx, s.chassis, -110, -100);
      ctx.save();
      ctx.translate(-104, -52);
      ctx.rotate(-tilt * 0.6);
      drawSprite(ctx, s.bed, 0, -58);
      ctx.restore();
      const spin = off / 18;
      for (const wx of [-70, 70]) {
        ctx.save(); ctx.translate(wx, -22); ctx.rotate(-spin * (dir < 0 ? -1 : 1));
        drawSprite(ctx, s.wheel, -22, -22); ctx.restore();
      }
      break;
    }
    case 'crane': {
      const m = p._m;
      const k1 = m ? m.k1 : 0, k2 = m ? m.k2 : 0;
      const hx = p.hx + (p.moveX ?? 200) * k2, hy = p.hy - (p.lift ?? 160) * k1;
      const armY = p.hy - (p.lift ?? 160) - 70;
      const sp = sprite('crane-' + p.x + '-' + armY + '-' + p.hx + '-' + (p.moveX ?? 200), 1000, 600, (c) => {
        // 塔
        crayonRect(c, p.x - 18, armY - 10, 36, p.y - armY + 10, P.kiiro, { seed: 101 });
        for (let y = armY + 20; y < p.y - 20; y += 40) crayonLine(c, [[p.x - 16, y], [p.x + 16, y + 30]], { width: 2, seed: y, passes: 1 });
        // うで
        const x1 = Math.min(p.x - 40, p.hx - 40), x2 = Math.max(p.x + 40, p.hx + (p.moveX ?? 200) + 40);
        crayonRect(c, x1, armY - 16, x2 - x1, 20, P.daidai, { seed: 102 });
        crayonRect(c, p.x - 34, p.y - 30, 68, 30, P.haiiro, { seed: 103 });
      }, 1);
      drawSprite(ctx, sp, 0, 0, 1000, 600);
      ctx.strokeStyle = P.sumi; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(hx, armY + 4); ctx.lineTo(hx, hy - 6); ctx.stroke();
      // バケツ
      ctx.save(); ctx.translate(hx, hy);
      if (m && m.bucketTilt) ctx.rotate(m.bucketTilt * 1.2);
      drawSprite(ctx, sprite('crane-bucket', 90, 50, (c) => crayonPoly(c, [[4, 4], [86, 4], [74, 46], [16, 46]], P.haiiro, { seed: 104 })), -45, -6);
      ctx.restore();
      break;
    }
    case 'goal': {
      if (p.style === 'bell') {
        ctx.strokeStyle = P.sumi; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.moveTo(p.x, p.y - 200); ctx.lineTo(p.x, p.y - 30); ctx.stroke();
        ctx.translate(p.x, p.y - 30);
        ctx.rotate(Math.sin((p.ring || 0) * 14) * 0.35 * (p.ring || 0));
        drawSprite(ctx, bellSprite(), -40, -4);
        break;
      }
      drawSprite(ctx, goalSprite(), p.x - 75, p.y - 168);
      const up = p.flagUp || 0;
      drawSprite(ctx, flagSprite(), p.x - 55, p.y - 100 - up * 60);
      break;
    }
    case 'ballS': case 'ballB': {
      const kind = p.type === 'ballB' ? 'b' : 's';
      const r = BALL_R[kind];
      drawSprite(ctx, ballSprite(kind), p.x - r - 4, p.y - r - 4);
      break;
    }
  }
  ctx.restore();
}

/** どうぐばこ用の小さい絵(中心 0,0、だいたい 110 の箱) */
export function drawToolIcon(ctx, type, opt = {}) {
  ctx.save();
  switch (type) {
    case 'ramp':
      ctx.rotate((opt.angle || 0) * D2R);
      ctx.scale(0.6, 0.6);
      drawSprite(ctx, plankSprite(RAMP_LEN, P.daidai), -RAMP_LEN / 2 - 4, -12);
      break;
    case 'domino': drawSprite(ctx, dominoSprite(0), -13, -50, 26, 100 * 0.9); break;
    case 'seesaw':
      ctx.scale(0.42, 0.42);
      drawSprite(ctx, seesawStand(), -40, 0);
      drawSprite(ctx, plankSprite(SEESAW_LEN, P.ao), -SEESAW_LEN / 2 - 4, -18);
      break;
    case 'spring': ctx.scale(0.8, 0.8); drawPart(ctx, { type: 'spring', x: 0, y: -16 }, 0); break;
    case 'conveyor': ctx.scale(0.44, 0.6); drawPart(ctx, { type: 'conveyor', x: 0, y: 0 }, 0); break;
    case 'dump': ctx.scale(0.45, 0.45); drawPart(ctx, { type: 'dump', x: 0, y: 60 }, 0); break;
    case 'goal': ctx.scale(0.55, 0.55); drawPart(ctx, { type: 'goal', x: 0, y: 80 }, 0); break;
    case 'ballS': drawSprite(ctx, ballSprite('s'), -24, -24); break;
    case 'ballB': drawSprite(ctx, ballSprite('b'), -32, -32); break;
  }
  ctx.restore();
}

export const PART_NAMES = {
  ramp: { ja: 'さか', en: 'ramp' },
  domino: { ja: 'ドミノ', en: 'domino' },
  seesaw: { ja: 'シーソー', en: 'seesaw' },
  spring: { ja: 'バネ', en: 'spring' },
  conveyor: { ja: 'ベルトコンベア', en: 'conveyor belt' },
  dump: { ja: 'ダンプカー', en: 'dump truck' },
  goal: { ja: 'ゴール', en: 'goal' },
  ballS: { ja: 'ボール', en: 'ball' },
  ballB: { ja: 'おおきい ボール', en: 'big ball' },
};
