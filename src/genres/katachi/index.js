// かたち パズル(タングラム風)
// 影絵に △□○ のピースをドラッグしてはめる。合わないときは そっと どうぐばこへ もどるだけ(ばつ は出さない)。
import { P } from '../../crayon/palette.js';
import { sprite, drawSprite, crayonRect, crayonPoly, crayonCircle, crayonLine, circlePts } from '../../crayon/crayon.js';
import { drawVehicle } from '../../crayon/vehicles.js';
import { ease } from '../../core/scene.js';
import { KINDS, PUZZLES, layoutFor, bboxOf, fitScale, packTray, makePieces, slotPts, sameRot, maxDim } from './data.js';

const PAD = 10;
const LIFT = 46;          // ドラッグ中、指の少し上に出す
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

function pathPoly(ctx, pts) { ctx.beginPath(); pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.closePath(); }

// ピースの絵(1 度だけ描いてキャッシュ)。中心が (w/2,h/2)
function pieceSprite(kind, color, S) {
  const kd = KINDS[kind];
  const w = Math.ceil(kd.w * S + PAD * 2), h = Math.ceil(kd.h * S + PAD * 2);
  return sprite(`kt-${kind}-${color}-${Math.round(S)}`, w, h, (c) => {
    const pts = kd.pts.map(([x, y]) => [w / 2 + x * S, h / 2 + y * S]);
    crayonPoly(c, pts, P[color], { seed: 5 + kind.length * 7, width: 3.5 });
  });
}
// 影絵(はいいろ)。mode 1: 点線の輪郭つき / 2: 区切り線つき / 3: 外形だけ
function silSprite(p, lv, S, b) {
  const w = Math.ceil(b.w * S + PAD * 2), h = Math.ceil(b.h * S + PAD * 2);
  const spr = sprite(`kt-sil-${lv}-${p.id}-${Math.round(S)}`, w, h, (c) => {
    const polys = p.slots.map((sl) => slotPts(sl).map(([x, y]) => [PAD + (x - b.x0) * S, PAD + (y - b.y0) * S]));
    c.fillStyle = P.haiiro; c.strokeStyle = P.haiiro; c.lineWidth = 2; c.lineJoin = 'round';
    for (const pl of polys) { pathPoly(c, pl); c.fill(); c.stroke(); }
    if (lv === '1') {
      c.strokeStyle = P.sumi; c.lineWidth = 3.5; c.setLineDash([11, 9]); c.lineCap = 'round';
      for (const pl of polys) { pathPoly(c, pl); c.stroke(); }
    } else if (lv === '2') {
      c.strokeStyle = P.gayoshi; c.lineWidth = 3.5; c.setLineDash([]);
      for (const pl of polys) { pathPoly(c, pl); c.stroke(); }
    }
  });
  return { spr, w, h };
}
function boxSprite(w, h) {
  return sprite('kt-box', w, h, (c) => crayonRect(c, 5, 5, w - 10, h - 10, P.chairo, { r: 22, seed: 31, alpha: 0.28, stroke: P.chairo, width: 4 }));
}
function puffSprite() {
  return sprite('kt-puff', 60, 60, (c) => crayonCircle(c, 30, 30, 24, P.gayoshi, { seed: 41, stroke: P.haiiro, width: 3 }));
}
function waveSprite() {
  return sprite('kt-wave', 600, 60, (c) => {
    for (let i = 0; i < 3; i++) {
      const pts = []; for (let x = 0; x <= 600; x += 25) pts.push([x, 20 + i * 16 + Math.sin(x / 40 + i) * 7]);
      crayonLine(c, pts, { color: P.sorairo, width: 6, seed: 50 + i });
    }
  });
}

function drawIcon(c, s) {
  const k = s / 150; c.scale(k, k);
  crayonPoly(c, [[10, 50], [92, 50], [92, 100], [10, 100]], P.sorairo, { seed: 3, width: 3 });
  crayonPoly(c, [[92, 50], [140, 100], [92, 100]], P.ao, { seed: 4, width: 3 });
  crayonPoly(c, [[22, 60], [46, 60], [46, 80], [22, 80]], P.gayoshi, { seed: 5, width: 2.5 });
  crayonPoly(c, [[24, 20], [44, 50], [4, 50]].map(([x, y]) => [x + 30, y]), P.kiiro, { seed: 6, width: 2.5 });
  crayonCircle(c, 38, 112, 14, P.daidai, { seed: 7, width: 3 });
  crayonCircle(c, 82, 112, 14, P.daidai, { seed: 8, width: 3 });
  crayonPoly(c, [[110, 100], [128, 100], [128, 118], [110, 118]], P.kimidori, { seed: 9, width: 2.5 });
}

export default {
  id: 'katachi',
  title: { ja: 'かたち パズル', en: 'Shape puzzle' },
  drawIcon,
  levels: [{ id: '1', stars: 1 }, { id: '2', stars: 2 }, { id: '3', stars: 3 }],
  start(api) {
    const portrait = typeof window !== 'undefined' && window.innerHeight > window.innerWidth * 1.1;
    const lay = layoutFor(portrait);
    const scene = api.createScene({ width: lay.W, height: lay.H });
    const lv = String(api.level.id);
    const list = PUZZLES[lv] || PUZZLES[1];
    const idxKey = 'idx' + lv;
    let idx = Math.max(0, Math.min(list.length - 1, Number(api.load(idxKey, 0)) || 0)) % list.length;

    let pz, S, bb, sil, ox, oy, slots, pieces, tk, drag, demo, won, clock;
    let timers = [];        // { t, fn }  フレームで進める(止めても残らない)
    let puffs = [];
    const later = (sec, fn) => timers.push({ t: sec, fn, gen });
    let gen = 0;

    function build() {
      gen++; timers = []; puffs = []; drag = null; demo = null; won = null; clock = 0;
      pz = list[idx];
      S = fitScale(pz, lay);
      bb = bboxOf(pz.slots);
      sil = silSprite(pz, lv, S, bb);
      ox = lay.sil.cx - (bb.x0 + bb.w / 2) * S;    // 単位座標 → 画面
      oy = lay.sil.cy - (bb.y0 + bb.h / 2) * S;
      slots = pz.slots.map((sl) => ({ ...sl, x: ox + sl.cx * S, y: oy + sl.cy * S, piece: null }));
      const raw = makePieces(pz, lv);
      tk = packTray(raw.map((r) => r.kind), lay.zone, S).k;
      const homes = packTray(raw.map((r) => r.kind), lay.zone, S).homes;
      pieces = raw.map((r, i) => ({
        kind: r.kind, color: r.color, rot: r.rot, ang: r.rot,
        x: homes[i].x, y: homes[i].y, hx: homes[i].x, hy: homes[i].y,
        sc: tk, slot: -1, state: 'home', wig: 0, chk: 0,
      }));
      // ふわっと入ってくる
      pieces.forEach((q, i) => { q.y += 40; q.sc = 0.01; q.delay = 0.1 + i * 0.07; });
    }

    const kd = (q) => KINDS[q.kind];
    const radius = (q) => Math.max(64, (maxDim(q.kind) * S * q.sc) / 2 + 6);
    const front = (q) => { pieces.splice(pieces.indexOf(q), 1); pieces.push(q); };

    function trySnap(q, x, y) {
      const thr = Math.max(78, maxDim(q.kind) * S * 0.55 + 28);
      let best = -1, bd = 1e9;
      slots.forEach((s, i) => {
        if (s.piece || s.kind !== q.kind || !sameRot(q.kind, q.rot, s.rot)) return;
        const d = Math.hypot(s.x - x, s.y - y);
        if (d < thr && d < bd) { bd = d; best = i; }
      });
      return best;
    }
    function place(q, i, quiet) {
      const s = slots[i];
      s.piece = q; q.slot = i; q.state = 'placed'; q.rot = s.rot; q.ang = s.rot;
      if (!quiet) { api.play('drop'); scene.sparkle(s.x, s.y, { count: 5, spread: 90 }); }
      if (slots.every((t) => t.piece) && !won) win();
    }
    function release(q) {
      if (q.slot >= 0) { slots[q.slot].piece = null; q.slot = -1; }
    }
    function goHome(q) { release(q); q.state = 'back'; }

    function tapRotate(q) {
      const k = kd(q);
      if (k.step === 0) { q.wig = 1; api.play('tap'); return; }
      release(q);
      q.state = 'loose';
      q.rot += k.step;
      api.play('click');
      q.chk = 0.3;
    }

    function win() {
      won = { t: 0, celebrated: false };
      api.markSolved();
      idx = (idx + 1) % list.length; api.save(idxKey, idx); idx = (idx - 1 + list.length) % list.length;
      api.play('done');
    }

    // ---------- 入力 ----------
    scene.onPointerDown = (p) => {
      if (!p.primary) return;
      if (demo) abortDemo();
      if (won || drag) return;
      let hitQ = null, bd = 1e9;
      for (const q of pieces) {
        if (q.sc < 0.5 || q.state === 'demo') continue;
        const d = dist(p, q);
        if (d <= radius(q) && d < bd) { bd = d; hitQ = q; }
      }
      if (!hitQ) return;
      // 重なっているときは、手前(あとに描かれる方)を優先
      const over = pieces.filter((q) => q.sc >= 0.5 && dist(p, q) <= radius(q));
      if (over.length > 1) { hitQ = over[over.length - 1]; if (over.some((q) => dist(p, q) < dist(p, hitQ) - 30)) hitQ = over.reduce((a, b) => (dist(p, a) <= dist(p, b) ? a : b)); }
      drag = { q: hitQ, sx: p.x, sy: p.y, dx: hitQ.x - p.x, dy: hitQ.y - p.y, moved: false, id: p.id, tx: hitQ.x, ty: hitQ.y };
    };
    scene.onPointerMove = (p) => {
      if (!drag || p.id !== drag.id) return;
      if (!drag.moved && Math.hypot(p.x - drag.sx, p.y - drag.sy) > 14) {
        drag.moved = true;
        const q = drag.q;
        release(q); q.state = 'drag'; front(q); api.play('pick');
      }
      if (drag.moved) { drag.tx = p.x + drag.dx; drag.ty = p.y + drag.dy - LIFT; }
    };
    const up = (p) => {
      if (!drag || (p.id !== undefined && p.id !== drag.id)) return;
      const d = drag; drag = null;
      const q = d.q;
      if (!d.moved) { front(q); tapRotate(q); return; }
      const i = trySnap(q, q.x, q.y);
      if (i >= 0) place(q, i);
      else { goHome(q); api.play('back'); }
    };
    scene.onPointerUp = up;

    // ---------- 見本(はじめてだけ) ----------
    function abortDemo() {
      if (!demo) return;
      const q = demo.q; demo = null;
      release(q); q.state = 'back'; q.rot = q.rot0; q.ang = q.rot0;
      q.x = q.hx; q.y = q.hy; q.sc = tk;
    }
    async function intro() {
      if (!api.firstTime()) return;
      const g = gen;
      await new Promise((r) => later(1.4, r));
      if (g !== gen || won || drag) return;
      let pick = null;
      for (const q of pieces) {
        if (q.state !== 'home' || q.slot >= 0) continue;
        const i = slots.findIndex((s) => !s.piece && s.kind === q.kind && sameRot(q.kind, q.rot, s.rot));
        if (i >= 0) { pick = { q, i }; break; }
      }
      if (!pick) return;
      const { q, i } = pick, s = slots[i];
      q.rot0 = q.rot;
      const speed = 240, d = Math.hypot(s.x - q.x, s.y - q.y);
      demo = { q, i, from: { x: q.x, y: q.y }, t: -1, dur: d / speed };
      const ok = await scene.hand([
        { x: q.x, y: q.y, press: true, wait: 0.6, onArrive: () => { if (demo && demo.q === q) { demo.t = 0; q.state = 'demo'; front(q); } } },
        { x: s.x, y: s.y, press: true, wait: 0.9, onArrive: () => { if (demo && demo.q === q) place(q, i); } },
      ], { speed, pause: 0.4 });
      if (ok && demo && g === gen) later(1.0, () => { if (demo && demo.q === q) abortDemo(); });
    }

    // ---------- できた ----------
    function vehRect() {
      const w = Math.max(bb.w * S * 1.08, 220);
      return { w, x: lay.sil.cx - w / 2, y: lay.sil.cy + (bb.h * S) / 2 - w * 0.65 + 6 };
    }
    function drawWon(ctx, dt) {
      won.t += dt;
      const t = won.t;
      if (t > 1.0 && !won.celebrated) {
        won.celebrated = true;
        api.celebrate({ ja: `${pz.ja} できた！`, en: `You made a ${pz.en}!` });
        scene.sparkle(lay.sil.cx, lay.sil.cy, { count: 14, spread: 220 });
      }
      const tt = Math.max(0, t - 1.2);
      const v = scene.view;
      const bw = bb.w * S, bh = bb.h * S;
      const cx = lay.sil.cx, cy = lay.sil.cy;
      if (pz.veh) {
        const r = vehRect();
        const a = ease.out(Math.min(1, Math.max(0, (t - 0.3) / 0.8)));
        // ピースはうすれる
        ctx.save(); ctx.globalAlpha = 1 - a; drawPieces(ctx, true); ctx.restore();
        const sp = Math.min(220, 90 * tt);
        const dx = tt < 2.45 ? 45 * tt * tt : 270 + (tt - 2.45) * 220;
        const range = (v.x1 - v.x0) + 2 * r.w;
        let x = r.x + dx; x = ((((x - (v.x0 - r.w)) % range) + range) % range) + (v.x0 - r.w);
        const bob = Math.sin(t * 13) * (sp > 5 ? 1.6 : 0);
        ctx.save(); ctx.globalAlpha = a;
        drawVehicle(ctx, pz.veh, x, r.y + bob, r.w);
        ctx.restore();
        if (tt > 0.3 && Math.random() < dt * 5) puffs.push({ x: x + r.w * 0.06, y: r.y + r.w * 0.38, age: 0 });
      } else {
        let dx = 0, dy = 0, rot = 0, sc = 1;
        if (pz.anim === 'rise') { const range = (v.y1 - v.y0) + bh + 240; dy = (-26 * tt * tt) % range; if (dy < -(cy + bh / 2 - v.y0 + 20)) dy += range; }
        if (pz.anim === 'sail') { const range = (v.x1 - v.x0) + bw + 200; dx = (tt * 60) % range; dy = Math.sin(t * 2.2) * 8; rot = Math.sin(t * 2.2) * 0.03; if (cx + dx - bw / 2 > v.x1 + 40) dx -= range; }
        if (pz.anim === 'sway') rot = Math.sin(t * 2.4) * 0.045 * Math.min(1, tt + 0.3);
        if (pz.anim === 'smoke') sc = 1 + Math.sin(Math.min(t, 1.4) * 5) * 0.025 * Math.max(0, 1 - tt);
        ctx.save();
        if (pz.anim === 'sail') drawWaves(ctx);
        const px = cx + dx, py = cy + bh / 2 + dy;   // ゆれは足もとを軸に
        ctx.translate(px, py); ctx.rotate(rot); ctx.scale(sc, sc); ctx.translate(-cx, -(cy + bh / 2));
        if (pz.anim === 'rise') drawFlame(ctx, cx, cy + bh / 2 + 4, t);
        drawPieces(ctx, true);
        ctx.restore();
        if (pz.anim === 'smoke' && Math.random() < dt * 2.5) puffs.push({ x: cx + bw * 0.12, y: cy - bh / 2 + 18, age: 0, up: true });
        if (pz.anim === 'sway' && tt > 0.2 && Math.random() < dt * 1.2) scene.sparkle(cx + (Math.random() - 0.5) * bw * 0.7, cy - bh * 0.25, { count: 1, spread: 40 });
      }
      // けむり
      const spr = puffSprite();
      for (let i = puffs.length - 1; i >= 0; i--) {
        const pf = puffs[i]; pf.age += dt;
        if (pf.age > 1.8) { puffs.splice(i, 1); continue; }
        const k = pf.age / 1.8;
        ctx.save(); ctx.globalAlpha = 0.6 * (1 - k);
        const sz = 16 + k * 34;
        drawSprite(ctx, spr, pf.x - sz / 2 + (pf.up ? k * 20 : -k * 40), pf.y - sz / 2 - k * 50, sz, sz);
        ctx.restore();
      }
    }
    const flames = {};
    function drawFlame(ctx, x, y, t) {
      const f = 1 + Math.sin(t * 5) * 0.08;
      for (const [col, k] of [['daidai', 1], ['kiiro', 0.6]]) {
        const w = S * 0.9 * k * f, h = S * 1.3 * k * f;
        const spr = flames[col + Math.round(S)] || (flames[col + Math.round(S)] = sprite('kt-flame-' + col + Math.round(S), Math.ceil(S * 1.2), Math.ceil(S * 1.5), (c) => {
          const W = S * 1.2, H = S * 1.5; crayonPoly(c, [[W / 2 - S * 0.4, 6], [W / 2 + S * 0.4, 6], [W / 2, H - 6]], P[col], { seed: 61, width: 3 });
        }));
        drawSprite(ctx, spr, x - (S * 1.2 * k * f) / 2, y, S * 1.2 * k * f, S * 1.5 * k * f);
      }
    }
    function drawWaves(ctx) {
      const w = waveSprite(); const v = scene.view;
      ctx.save(); ctx.globalAlpha = 0.8;
      drawSprite(ctx, w, lay.sil.cx - 300 + (won.t * 20) % 40, lay.sil.cy + (bb.h * S) / 2 - 6, 600, 60);
      ctx.restore();
    }

    // ---------- 描画 ----------
    function drawPieces(ctx, onlyPlaced) {
      for (const q of pieces) {
        if (onlyPlaced && q.state !== 'placed') continue;
        if (q.sc < 0.02) continue;
        const spr = q.spr || (q.spr = pieceSprite(q.kind, q.color, S));
        ctx.save();
        ctx.translate(q.x, q.y);
        if (q.state === 'drag') {      // かげ
          ctx.save(); ctx.globalAlpha = 0.16; ctx.fillStyle = P.sumi;
          ctx.translate(7, 12); ctx.rotate((q.ang * Math.PI) / 180); ctx.scale(q.sc, q.sc);
          pathPoly(ctx, kd(q).pts.map(([x, y]) => [x * S, y * S])); ctx.fill(); ctx.restore();
        }
        ctx.rotate(((q.ang + Math.sin(q.wig * 16) * 5 * q.wig) * Math.PI) / 180);
        ctx.scale(q.sc, q.sc);
        drawSprite(ctx, spr, -spr.logicalW / 2, -spr.logicalH / 2, spr.logicalW, spr.logicalH);
        ctx.restore();
      }
    }
    const ap = (cur, target, rate, dt) => cur + (target - cur) * (1 - Math.exp(-rate * dt));
    function update(dt) {
      clock += dt;
      for (let i = timers.length - 1; i >= 0; i--) { const tm = timers[i]; tm.t -= dt; if (tm.t <= 0) { timers.splice(i, 1); if (tm.gen === gen) tm.fn(); } }
      for (const q of pieces) {
        if (q.delay > 0) { q.delay -= dt; if (q.delay > 0) continue; q.delay = 0; }
        if (q.wig > 0) q.wig = Math.max(0, q.wig - dt * 2);
        q.ang = ap(q.ang, q.rot, 16, dt);
        if (Math.abs(q.ang - q.rot) < 0.2) q.ang = q.rot;
        let tx = q.x, ty = q.y, tsc = q.sc, rate = 14;
        if (q.state === 'home' || q.state === 'back') {
          tx = q.hx; ty = q.hy; tsc = tk; rate = q.state === 'back' ? 9 : 14;
          if (q.state === 'back' && Math.hypot(q.x - tx, q.y - ty) < 2) q.state = 'home';
        } else if (q.state === 'drag') {
          tx = drag ? drag.tx : q.x; ty = drag ? drag.ty : q.y; tsc = 1.08; rate = 30;
        } else if (q.state === 'placed') {
          const s = slots[q.slot]; tx = s.x; ty = s.y; tsc = 1; rate = 24;
        } else if (q.state === 'loose') {
          tsc = 1; rate = 12;
          if (q.chk > 0) {
            q.chk -= dt;
            if (q.chk <= 0) { const i = trySnap(q, q.x, q.y); if (i >= 0) place(q, i); }
          }
        } else if (q.state === 'demo') {
          const d = demo;
          if (d && d.q === q && d.t >= 0) {
            d.t += dt; const k = Math.min(1, d.t / Math.max(0.01, d.dur)), s = slots[d.i];
            const e = ease.inOut(k);
            q.x = d.from.x + (s.x - d.from.x) * e; q.y = d.from.y + (s.y - d.from.y) * e; q.sc = ap(q.sc, 1.08, 14, dt);
          }
          continue;
        }
        q.x = ap(q.x, tx, rate, dt); q.y = ap(q.y, ty, rate, dt); q.sc = ap(q.sc, tsc, 16, dt);
      }
    }

    scene.onFrame = (ctx, dt) => {
      update(dt);
      // 影絵
      ctx.save(); ctx.globalAlpha = won && pz.veh ? Math.max(0, 0.5 - won.t) : 0.5;
      if (!(won && !pz.veh && won.t > 0.5)) drawSprite(ctx, sil.spr, lay.sil.cx - (bb.w * S) / 2 - PAD, lay.sil.cy - (bb.h * S) / 2 - PAD, sil.w, sil.h);
      ctx.restore();
      // どうぐばこ
      const pn = lay.panel;
      drawSprite(ctx, boxSprite(pn.w, pn.h), pn.x, pn.y, pn.w, pn.h);
      api.drawLabel(ctx, 'どうぐばこ', 'Toolbox', lay.label.x, lay.label.y, 34);
      if (won) {
        // ピースは drawWon が描く(乗り物のときはうすれる)。余分は箱に残す
        drawLoosePieces(ctx);
        drawWon(ctx, dt);
        return;
      }
      drawPieces(ctx, false);
    };
    function drawLoosePieces(ctx) {
      const keep = pieces.filter((q) => q.state !== 'placed');
      const all = pieces; pieces = keep; drawPieces(ctx, false); pieces = all;
    }

    build();
    intro();
    if (typeof window !== 'undefined' && window.__KATACHI_DEBUG) window.__katachi = () => ({ pieces, slots, won: !!won, lay, S, demo: !!demo });
    return {
      retry() { build(); },
      next() { idx = (idx + 1) % list.length; api.save(idxKey, idx); build(); },
      stop() { gen++; timers = []; demo = null; drag = null; },
    };
  },
};
