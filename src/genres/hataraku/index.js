// はたらく くるまの おしごと
// ★/★★: おしごとの ばしょに 合う くるまを えらんで つれていく。まちがえても そっと もどるだけ。
// ★★★: おおきい じゅんに ならべよう。
import { P } from '../../crayon/palette.js';
import { sprite, drawSprite, crayonRect, crayonPoly, crayonLine, crayonCircle, starPts } from '../../crayon/crayon.js';
import { drawVehicle, VEHICLES, drawCrate } from '../../crayon/vehicles.js';
import { ease, approach } from '../../core/scene.js';

const GY = 372; // 地面の高さ(おしごと ばめん)
const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const seg = (k, a, b) => clamp((k - a) / (b - a));
const shuffle = (a) => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const dv = (ctx, id, left, bottom, w, flip = false) => drawVehicle(ctx, id, left, bottom - 0.63 * w, w, flip);
const vname = (id) => { const v = VEHICLES[id]; return v.yomi && v.yomi !== v.ja ? `{${v.ja}|${v.yomi}}` : v.ja; };
function rotAbout(ctx, px, py, a) { ctx.translate(px, py); ctx.rotate(a); ctx.translate(-px, -py); }

// ---------- 絵(いちど だけ 描いて つかいまわす) ----------
const houseSpr = () => sprite('hat-house', 240, 190, (c) => {
  crayonRect(c, 12, 74, 216, 110, P.kiiro, { r: 6, seed: 3 });
  crayonPoly(c, [[0, 82], [120, 6], [240, 82]], P.aka, { seed: 4 });
  crayonRect(c, 36, 100, 56, 50, P.sorairo, { r: 4, seed: 5 });
  crayonRect(c, 148, 100, 56, 50, P.sorairo, { r: 4, seed: 6 });
  crayonRect(c, 100, 120, 42, 64, P.chairo, { r: 4, seed: 7 });
});
const buildingSpr = () => sprite('hat-bld', 180, 200, (c) => {
  crayonRect(c, 6, 8, 168, 190, P.haiiro, { r: 6, seed: 11 });
  for (let r = 0; r < 4; r++) for (let q = 0; q < 3; q++) crayonRect(c, 24 + q * 52, 26 + r * 40, 36, 28, P.sorairo, { r: 3, seed: 12 + r * 3 + q, width: 2.5 });
});
const shelfSpr = () => sprite('hat-shelf', 190, 190, (c) => {
  crayonLine(c, [[10, 6], [10, 188]], { width: 7, color: P.chairo, seed: 21 });
  crayonLine(c, [[180, 6], [180, 188]], { width: 7, color: P.chairo, seed: 22 });
  crayonRect(c, 4, 62, 182, 10, P.daidai, { seed: 23, width: 3 });
  crayonRect(c, 4, 126, 182, 10, P.daidai, { seed: 24, width: 3 });
});
const bagSpr = () => sprite('hat-bag', 60, 66, (c) => {
  crayonPoly(c, [[20, 14], [12, 22], [4, 44], [10, 62], [50, 62], [56, 44], [48, 22], [40, 14]], P.midori, { seed: 31 });
  crayonPoly(c, [[20, 14], [24, 2], [30, 8], [36, 2], [40, 14]], P.midori, { seed: 32, width: 2.5 });
});

// ---------- 小さな 道具 ----------
function mound(ctx, cx, h, w) {
  if (h < 1) return;
  ctx.save();
  ctx.beginPath(); ctx.moveTo(cx - w / 2, GY + 4); ctx.quadraticCurveTo(cx - w * 0.12, GY - h * 1.75, cx, GY - h * 1.2);
  ctx.quadraticCurveTo(cx + w * 0.12, GY - h * 1.75, cx + w / 2, GY + 4); ctx.closePath();
  ctx.fillStyle = P.chairo; ctx.fill(); ctx.lineWidth = 3.5; ctx.lineJoin = 'round'; ctx.strokeStyle = P.sumi; ctx.stroke();
  ctx.restore();
}
function dashedMark(ctx, cx, cy, rx, ry, alpha = 1) {
  if (alpha <= 0.02) return;
  ctx.save(); ctx.globalAlpha = alpha; ctx.setLineDash([16, 12]); ctx.lineWidth = 5; ctx.strokeStyle = P.daidai; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2); ctx.stroke(); ctx.restore();
}
function flame(ctx, x, y, s, t, seed) {
  if (s < 0.04) return;
  const w = (1 + Math.sin(t * 5 + seed) * 0.06) * s, h = (1 + Math.sin(t * 6.3 + seed * 2) * 0.08) * s;
  const path = (k) => {
    ctx.beginPath(); ctx.moveTo(x, y);
    ctx.bezierCurveTo(x - 30 * w * k, y - 12 * h * k, x - 24 * w * k, y - 50 * h * k, x - 2 * w * k, y - 86 * h * k);
    ctx.bezierCurveTo(x + 4 * w * k, y - 52 * h * k, x + 34 * w * k, y - 44 * h * k, x + 28 * w * k, y - 16 * h * k);
    ctx.bezierCurveTo(x + 22 * w * k, y - 2 * h * k, x + 8 * w * k, y, x, y); ctx.closePath();
  };
  ctx.save(); ctx.lineJoin = 'round';
  path(1); ctx.fillStyle = P.daidai; ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = P.aka; ctx.stroke();
  path(0.55); ctx.fillStyle = P.kiiro; ctx.fill();
  ctx.restore();
}
function dot(ctx, x, y, r, fill, stroke) {
  ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fillStyle = fill; ctx.fill();
  if (stroke) { ctx.lineWidth = 2; ctx.strokeStyle = stroke; ctx.stroke(); }
}
const bez = (a, b, c, t) => { const u = 1 - t; return u * u * a + 2 * u * t * b + t * t * c; };

// ---------- おしごと(お題) ----------
// draw(ctx, k, show, t): k=0..1 の しんこう。show=false のときは くるま なし(おだい の え)
const JOBS = [
  { key: 'dig', veh: 'excavator', ja: 'あなを ほりたい', en: "Let's dig a hole", park: { x: 340, w: 210 }, dur: 4.2,
    draw(ctx, k, show) {
      const h = ease.inOut(seg(k, 0.05, 0.95));
      dashedMark(ctx, 610, GY + 12, 100, 24, 1 - h * 0.85);
      if (h > 0.02) {
        ctx.save(); ctx.beginPath(); ctx.ellipse(610, GY + 12, 100 * (0.5 + h * 0.5), 24 * (0.5 + h * 0.5), 0, 0, Math.PI * 2);
        ctx.fillStyle = P.chairo; ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = P.sumi; ctx.stroke();
        ctx.beginPath(); ctx.ellipse(610, GY + 15, 80 * h, 17 * h, 0, 0, Math.PI * 2); ctx.fillStyle = P.sumi; ctx.globalAlpha = 0.4; ctx.fill(); ctx.restore();
      }
      mound(ctx, 840, 70 * h, 170 * (0.4 + 0.6 * h));
      if (!show) return;
      const p = this.park, rock = Math.sin(k * Math.PI * 2 * 5) * 0.03 * (k > 0.04 && k < 0.96 ? 1 : 0);
      ctx.save(); rotAbout(ctx, p.x + p.w * 0.5, GY, rock); dv(ctx, 'excavator', p.x, GY, p.w); ctx.restore();
      const N = 5;
      for (let c = 0; c < N; c++) {
        const u = k * N - c; const live = k > 0.06 && k < 0.95;
        if (!live || u < 0.3 || u > 1) continue;
        const f = (u - 0.3) / 0.7, sx = p.x + p.w * 0.95, sy = GY - 0.63 * p.w + p.w * 0.4;
        dot(ctx, bez(sx, (sx + 820) / 2, 820, f), bez(sy, sy - 150, GY - 50 * h, f), 11, P.chairo, P.sumi);
      }
    } },
  { key: 'fire', veh: 'fire', ja: 'ひを けしたい', en: 'Put out the fire', park: { x: 200, w: 210 }, dur: 4.4,
    draw(ctx, k, show, t) {
      drawSprite(ctx, houseSpr(), 560, GY - 190, 240, 190);
      const FL = [[612, GY - 92, 0.9], [716, GY - 160, 0.75], [772, GY - 84, 0.8]];
      FL.forEach((f, i) => flame(ctx, f[0], f[1], f[2] * (1 - ease.inOut(seg(k, 0.1 + i * 0.25, 0.4 + i * 0.25))), t, i * 2 + 1));
      if (!show) return;
      const p = this.park; ctx.save(); ctx.translate(0, Math.sin(t * 9) * 0.8); dv(ctx, 'fire', p.x, GY, p.w); ctx.restore();
      if (k > 0.08 && k < 0.9) {
        const idx = Math.min(2, Math.floor((k - 0.08) / 0.28)), tg = FL[idx];
        const nx = p.x + p.w * 0.88, ny = GY - 0.63 * p.w + p.w * 0.17, ex = tg[0] - 8, ey = tg[1] - 25;
        for (let i = 0; i < 16; i++) {
          const f = (t * 1.1 + i / 16) % 1;
          dot(ctx, bez(nx, (nx + ex) / 2, ex, f), bez(ny, Math.min(ny, ey) - 90, ey, f), 6.5, P.sorairo, P.ao);
        }
      }
    } },
  { key: 'crane', veh: 'crane', ja: 'にもつを うえに あげたい', en: 'Lift the box up high', park: { x: 340, w: 220 }, dur: 4.6,
    draw(ctx, k, show) {
      drawSprite(ctx, buildingSpr(), 700, GY - 200, 180, 200);
      const roofY = GY - 200 + 8, done = seg(k, 0.7, 0.8);
      dashedMark(ctx, 790, roofY - 3, 44, 7, 1 - done);
      const p = this.park, tipX = p.x + p.w * 0.95, tipY = GY - 0.63 * p.w + p.w * 0.06;
      const L = 278 * ease.inOut(seg(k, 0.1, 0.65)) * (1 - ease.inOut(seg(k, 0.82, 1)));
      const ex = tipX + 0.866 * L, ey = tipY - 0.5 * L;
      const lift = ease.inOut(seg(k, 0.12, 0.7));
      const cx = lerp(515, 790, lift), cy = lerp(GY - 32, roofY - 32, lift) - Math.sin(lift * Math.PI) * 24;
      if (show) { const p2 = this.park; dv(ctx, 'crane', p2.x, GY, p2.w); }
      if (show && L > 1) {
        ctx.save(); ctx.lineCap = 'round';
        ctx.strokeStyle = P.sumi; ctx.lineWidth = 15; ctx.beginPath(); ctx.moveTo(tipX, tipY); ctx.lineTo(ex, ey); ctx.stroke();
        ctx.strokeStyle = P.daidai; ctx.lineWidth = 9; ctx.stroke();
        if (k < 0.82) { ctx.strokeStyle = P.sumi; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(ex, ey); ctx.lineTo(cx, cy - 32); ctx.stroke(); }
        ctx.restore();
      }
      drawCrate(ctx, cx - 32, cy - 32, 64, P.chairo, 5);
    } },
  { key: 'dump', veh: 'dump', ja: 'つちを はこびたい', en: 'Carry the dirt', park: { x: 330, w: 200 }, dur: 5,
    draw(ctx, k, show) {
      const load = ease.inOut(seg(k, 0.05, 0.3)), unload = ease.inOut(seg(k, 0.66, 0.86));
      mound(ctx, 190, 80 * (1 - load * 0.8), 210);
      dashedMark(ctx, 560, GY + 10, 90, 18, 1 - unload);
      mound(ctx, 560, 70 * unload, 170 * (0.4 + 0.6 * unload));
      if (!show) return;
      const left = lerp(330, 660, ease.inOut(seg(k, 0.34, 0.62))), w = 200;
      const tilt = -0.2 * ease.inOut(seg(k, 0.62, 0.78)) * (1 - ease.inOut(seg(k, 0.9, 1)));
      ctx.save(); rotAbout(ctx, left + 16, GY, tilt); dv(ctx, 'dump', left, GY, w);
      const m = load * (1 - unload);
      if (m > 0.02) {
        ctx.beginPath(); const mx = left + 76 + unload * -30, my = GY - 0.63 * w + 40;
        ctx.moveTo(mx - 52, my); ctx.quadraticCurveTo(mx, my - 62 * m, mx + 52, my); ctx.closePath();
        ctx.fillStyle = P.chairo; ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = P.sumi; ctx.lineJoin = 'round'; ctx.stroke();
      }
      ctx.restore();
      // つちが おちる
      if (k > 0.66 && k < 0.88) for (let i = 0; i < 6; i++) { const f = (k * 4 + i / 6) % 1; dot(ctx, left - 6 - f * 40 - i * 4, GY - 80 + f * 70 + (i % 2) * 8, 8, P.chairo, P.sumi); }
    } },
  { key: 'garbage', veh: 'garbage', ja: 'ごみを あつめたい', en: 'Collect the garbage', park: { x: 330, w: 200 }, dur: 4.6,
    draw(ctx, k, show) {
      const left = 330 + 120 * ease.inOut(seg(k, 0.88, 1)), w = 200;
      const bags = [330, 235, 140];
      bags.forEach((bx, i) => {
        const a = 0.08 + i * 0.26, f = seg(k, a, a + 0.22);
        if (f >= 1) return;
        const rx = 330 + 22, ry = GY - 0.63 * w + 30;
        const x = lerp(bx, rx, ease.inOut(f)), y = lerp(GY - 33, ry, ease.inOut(f)) - Math.sin(f * Math.PI) * 90, s = 1 - f * 0.45;
        drawSprite(ctx, bagSpr(), x - 30 * s, y - 33 * s, 60 * s, 66 * s);
      });
      if (!show) return;
      const bump = bags.reduce((m, _, i) => { const f = seg(k, 0.08 + i * 0.26 + 0.2, 0.08 + i * 0.26 + 0.34); return Math.max(m, Math.sin(f * Math.PI)); }, 0);
      ctx.save(); ctx.translate(left + 100, GY); ctx.scale(1, 1 - bump * 0.025); ctx.translate(-(left + 100), -GY); dv(ctx, 'garbage', left, GY, w); ctx.restore();
    } },
  { key: 'roller', veh: 'roller', ja: 'でこぼこの みちを ならしたい', en: 'Flatten the bumpy road', park: { x: 0, w: 210 }, dur: 4.6,
    draw(ctx, k, show) {
      const left = lerp(0, 700, ease.inOut(seg(k, 0.08, 0.95))), w = 210, cx = left + 160;
      const hump = (x) => { let m = 0; for (const c of [340, 490, 640, 790, 930]) { const d = Math.abs(x - c); if (d < 55) m = Math.max(m, 0.5 + 0.5 * Math.cos((d / 55) * Math.PI)); } return m * 28; };
      const x0 = -150, x1 = 1150;
      ctx.save(); ctx.beginPath(); ctx.moveTo(x0, GY + 40); ctx.lineTo(x0, GY + 2);
      for (let x = x0; x <= x1; x += 8) { const f = clamp((x - (cx - 24)) / 56); ctx.lineTo(x, GY + 2 - hump(x) * f); }
      ctx.lineTo(x1, GY + 40); ctx.closePath(); ctx.fillStyle = P.haiiro; ctx.fill(); ctx.lineWidth = 3.5; ctx.strokeStyle = P.sumi; ctx.lineJoin = 'round'; ctx.stroke(); ctx.restore();
      if (!show) return;
      const b = Math.sin(k * 60) * 0.8 * (k > 0.08 && k < 0.95 ? 1 : 0);
      dv(ctx, 'roller', left, GY + 2 + b, w);
    } },
  { key: 'forklift', veh: 'forklift', ja: 'にもつを たなに のせたい', en: 'Put the box on the shelf', park: { x: 150, w: 190 }, dur: 5,
    draw(ctx, k, show) {
      drawSprite(ctx, shelfSpr(), 690, GY - 190, 190, 190);
      const w = 190, shelfTop = GY - 190 + 62;
      let left = 150;
      left = lerp(150, 290, ease.inOut(seg(k, 0, 0.22)));
      left = lerp(left, 585, ease.inOut(seg(k, 0.34, 0.72)));
      left = lerp(left, 440, ease.inOut(seg(k, 0.82, 1)));
      const lift = ease.inOut(seg(k, 0.26, 0.58)) * (GY - shelfTop + 4);
      const carried = k < 0.78;
      const sz = 56;
      let cxx, cyy;
      if (carried) { cxx = left + 172; cyy = GY - lift; } else { cxx = 585 + 172; cyy = shelfTop; }
      if (k < 0.22) { cxx = 462; cyy = GY; }
      drawCrate(ctx, cxx - sz / 2, cyy - sz, sz, P.chairo, 9);
      if (show) dv(ctx, 'forklift', left, GY, w);
    } },
];

// ---------- ジャンル ----------
export default {
  id: 'hataraku',
  title: { ja: 'はたらく くるま', en: 'Working vehicles' },
  drawIcon(c, s) {
    const k = s / 150; c.scale(k, k);
    crayonRect(c, 6, 118, 138, 18, P.kimidori, { r: 6, seed: 3 });
    c.beginPath(); c.moveTo(94, 124); c.quadraticCurveTo(116, 70, 136, 124); c.closePath();
    c.fillStyle = P.chairo; c.fill(); c.lineWidth = 3; c.strokeStyle = P.sumi; c.stroke();
    drawVehicle(c, 'excavator', 6, 30, 118);
    crayonPoly(c, starPts(122, 36, 14), P.kiiro, { seed: 5, width: 2 });
  },
  levels: [{ id: '1', stars: 1 }, { id: '2', stars: 2 }, { id: '3', stars: 3 }],

  start(api) {
    return api.level.id === '3' ? startSort(api) : startMatch(api);
  },
};

// ---------- ★ ★★: おしごとに あう くるま ----------
function startMatch(api) {
  const scene = api.createScene({ width: 1000, height: 600 });
  const n = api.level.id === '2' ? 3 : 2;
  const HOME = { 2: [330, 670], 3: [190, 500, 810] }[n];
  const CW = 175, HY = 520;
  let order = [], job = null, cars = [], phase = 'play', t0 = 0, drive = null;
  let held = null, demo = null, alive = true, timers = [];
  const later = (fn, ms) => { timers.push(setTimeout(() => alive && fn(), ms)); };

  function newJob(same) {
    if (!same || !job) {
      if (!order.length) order = shuffle(JOBS.slice());
      job = order.pop();
    }
    const others = shuffle(JOBS.filter((j) => j.veh !== job.veh).map((j) => j.veh)).slice(0, n - 1);
    const ids = same && cars.length ? cars.map((c) => c.id) : shuffle([job.veh, ...others]);
    cars = ids.map((id, i) => ({ id, hx: HOME[i], hy: HY, x: HOME[i], y: HY + 60, s: 1, lift: false, wig: 0, alpha: 1, enter: 0.1 * i }));
    phase = 'play'; held = null; drive = null; t0 = 0;
    api.glowNext(false);
  }

  const boxOf = (c) => ({ x: c.x - CW / 2 - 24, y: c.y - 74, w: CW + 48, h: 148 });
  const inBox = (p, b) => p.x >= b.x && p.x <= b.x + b.w && p.y >= b.y && p.y <= b.y + b.h;

  function startWork(car) {
    phase = 'drive'; t0 = 0; car.lift = false;
    const sc = car.s * 1.0;
    drive = { car, fx: car.x - (CW * sc) / 2, fb: car.y + 0.315 * CW * sc, fw: CW * sc };
    api.play('pop');
    scene.floatText(vname(car.id), VEHICLES[car.id].en, car.x, car.y - 90, { size: 40 });
    api.speak(vname(car.id), VEHICLES[car.id].en);
  }
  function wrong(car) {
    car.lift = false; car.wig = 0.7; car.back = true;
    api.play('back');
    scene.floatText(vname(car.id), VEHICLES[car.id].en, car.x, Math.max(120, car.y - 90), { size: 40 });
  }

  scene.onPointerDown = (p) => {
    if (!p.primary || phase !== 'play') return;
    if (demo) releaseDemo();
    let best = null;
    for (const c of cars) if (!held && c.enter <= 0 && inBox(p, boxOf(c))) best = c;
    if (!best) return;
    held = { car: best, sx: p.x, sy: p.y, st: performance.now(), moved: false };
    best.lift = true; best.back = false; best.x = p.x; best.y = p.y - 55;
    api.play('pick');
  };
  scene.onPointerMove = (p) => {
    if (!held || !p.primary) return;
    if (Math.hypot(p.x - held.sx, p.y - held.sy) > 28) held.moved = true;
    held.car.x = p.x; held.car.y = p.y - 55;
  };
  scene.onPointerUp = (p) => {
    if (!held || !p.primary) return;
    const car = held.car, tap = !held.moved && performance.now() - held.st < 800;
    held = null;
    if (tap) { car.lift = false; car.x = car.hx; car.y = car.hy; }
    if (tap || p.y < 440) { if (car.id === job.veh) startWork(car); else wrong(car); }
    else { car.lift = false; car.back = true; api.play('back'); }
  };
  function releaseDemo() { if (!demo) return; demo.car.lift = false; demo.car.back = true; demo.car.glide = null; demo = null; }

  function finishJob() {
    phase = 'done';
    api.markSolved(); api.play('done');
    scene.sparkle(this_x(), GY - 100, { count: 14 });
    api.celebrate({ ja: 'おしごと できたね！', en: 'Great job!' });
  }
  const this_x = () => job.park.x + job.park.w / 2;

  scene.onFrame = (ctx, dt, t) => {
    const v = scene.view;
    // じめん
    ctx.save(); ctx.globalAlpha = 0.5; ctx.fillStyle = P.kimidori; ctx.fillRect(v.x0, GY, v.x1 - v.x0, 46); ctx.globalAlpha = 1;
    ctx.strokeStyle = P.midori; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(v.x0, GY + 1); ctx.lineTo(v.x1, GY + 1); ctx.stroke(); ctx.restore();
    // くるま おきば
    ctx.save(); ctx.globalAlpha = 0.18; ctx.fillStyle = P.sorairo; ctx.fillRect(v.x0, 436, v.x1 - v.x0, v.y1 - 436); ctx.restore();

    const sceneK = phase === 'work' ? clamp(t0 / job.dur) : phase === 'done' ? 1 : 0;
    if (phase === 'drive') {
      t0 += dt; const f = ease.inOut(clamp(t0 / 1.0)), pk = job.park;
      job.draw(ctx, 0, false, t);
      const w = lerp(drive.fw, pk.w, f), left = lerp(drive.fx, pk.x, f), bottom = lerp(drive.fb, GY, f);
      dv(ctx, job.veh, left, bottom, w);
      if (t0 >= 1.0) { phase = 'work'; t0 = 0; }
    } else if (phase === 'work') {
      t0 += dt; job.draw(ctx, clamp(t0 / job.dur), true, t);
      if (t0 >= job.dur) finishJob();
    } else job.draw(ctx, sceneK, phase === 'done', t);

    // 手前の くるま たち
    const showCars = phase === 'play' || phase === 'drive' || phase === 'work' || phase === 'done';
    if (showCars) for (const c of cars) {
      if (drive && c === drive.car && phase !== 'play') continue;
      if (c.enter > 0) c.enter = Math.max(0, c.enter - dt);
      if (c.glide) { c.x = approach(c.x, c.glide.x, 9, dt); c.y = approach(c.y, c.glide.y, 9, dt); }
      else if (!c.lift) { c.x = approach(c.x, c.hx, 9, dt); c.y = approach(c.y, c.hy, 9, dt); }
      if (Math.hypot(c.x - c.hx, c.y - c.hy) < 2 && !c.lift) c.back = false;
      c.s = approach(c.s, c.lift ? 1.16 : 1, 14, dt);
      if (c.wig > 0) c.wig = Math.max(0, c.wig - dt);
      const dim = phase === 'play' ? 1 : 0.3;
      c.alpha = approach(c.alpha, dim, 6, dt);
      if (c !== (held && held.car) && c.enter > 0) continue;
    }
    for (const c of cars.slice().sort((a, b) => (a.lift ? 1 : 0) - (b.lift ? 1 : 0))) {
      if (drive && c === drive.car && phase !== 'play') continue;
      if (c.enter > 0) continue;
      const w = CW * c.s;
      ctx.save(); ctx.globalAlpha = c.alpha;
      ctx.translate(c.x, c.y + 0.32 * w);
      if (c.wig > 0) ctx.rotate(Math.sin(c.wig * 22) * 0.06 * Math.min(1, c.wig * 2));
      if (c.lift) { ctx.globalAlpha = 0.25 * c.alpha; ctx.fillStyle = P.sumi; ctx.beginPath(); ctx.ellipse(0, 12, w * 0.4, 8, 0, 0, 7); ctx.fill(); ctx.globalAlpha = c.alpha; }
      drawVehicle(ctx, c.id, -w / 2, -0.63 * w, w);
      ctx.restore();
    }
    api.drawLabel(ctx, job.ja, job.en, 500, 46, 42);
  };

  async function intro() {
    if (!api.firstTime('intro' + api.level.id)) return;
    await new Promise((r) => setTimeout(r, 1300));
    if (!alive || phase !== 'play' || held) return;
    const car = cars.find((c) => c.id === job.veh);
    const from = { x: car.hx, y: car.hy }, to = { x: 520, y: 270 };
    const steps = [{ x: from.x, y: from.y, press: true, wait: 0.5, onArrive() { demo = { car }; car.lift = true; car.glide = { x: from.x, y: from.y - 55 }; } }];
    for (let i = 1; i <= 8; i++) {
      const f = i / 8;
      steps.push({ x: lerp(from.x, to.x, f), y: lerp(from.y, to.y, f), wait: 0, onArrive() { if (demo) car.glide = { x: lerp(from.x, to.x, f), y: lerp(from.y, to.y, f) - 55 }; } });
    }
    steps[steps.length - 1].wait = 0.6;
    steps[steps.length - 1].onArrive = () => { if (!demo) return; car.glide = null; demo = null; car.x = 520; car.y = 215; startWork(car); };
    const ok = await scene.hand(steps, { speed: 200 });
    if (!ok && demo) releaseDemo();
  }

  newJob(false);
  intro();
  return {
    retry() { newJob(true); },
    next() { newJob(false); },
    stop() { alive = false; timers.forEach(clearTimeout); scene.stop && scene.stop(); },
  };
}

// ---------- ★★★: おおきい じゅんに ならべよう ----------
const SORT_POOL = ['excavator', 'dump', 'crane', 'fire', 'garbage', 'roller', 'forklift', 'bus', 'tow', 'mixer', 'bulldozer', 'ambulance'];
function startSort(api) {
  const scene = api.createScene({ width: 1000, height: 600 });
  let items = [], slots = [], held = null, phase = 'play', parade = 0, alive = true, demo = null, lastSet = null;
  const DROP_Y = 380;

  function setup(same) {
    let spec;
    if (same && lastSet) spec = lastSet;
    else {
      const n = Math.random() < 0.5 ? 3 : 4;
      const ranges = n === 3 ? [[100, 125], [150, 178], [205, 232]] : [[92, 112], [128, 148], [166, 190], [208, 232]];
      const ids = shuffle(SORT_POOL.slice()).slice(0, n);
      spec = { n, list: ids.map((id, rank) => ({ id, rank, w: Math.round(lerp(ranges[rank][0], ranges[rank][1], Math.random())) })) };
      spec.list = shuffle(spec.list);
      lastSet = spec;
    }
    const n = spec.n;
    const sw = n === 3 ? 270 : 225, gap = n === 3 ? 20 : 12, tot = n * sw + (n - 1) * gap, x0 = (1000 - tot) / 2;
    slots = [];
    for (let i = 0; i < n; i++) slots.push({ rank: i, x: x0 + i * (sw + gap), w: sw, top: 500 - i * 12, filled: null });
    const cs = n === 3 ? [200, 500, 800] : [130, 377, 623, 870];
    items = spec.list.map((s, i) => ({ id: s.id, rank: s.rank, w: s.w, hx: cs[i], hy: 300, x: cs[i], y: 300, lift: false, placed: false, wig: 0, sc: 1, out: 0, vx: 0 }));
    phase = 'play'; held = null; parade = 0; demo = null;
    api.glowNext(false);
  }
  // 台の え(大小の ヒントつき)
  const slotSpr = (s, n) => sprite('hat-slot' + n + '-' + s.rank, Math.round(s.w), 600 - s.top, (c) => {
    crayonRect(c, 3, 3, s.w - 6, 600 - s.top - 6, P.sorairo, { r: 12, seed: 40 + s.rank, stroke: P.ao, width: 4 });
    const r = 9 + s.rank * (n === 3 ? 11 : 8);
    crayonCircle(c, s.w / 2, (600 - s.top) * 0.55, r, P.kiiro, { seed: 50 + s.rank, width: 3 });
  });
  // it.x は くるま の まんなか、it.y は ちめん
  const hitIt = (p, it) => { const h = it.w * 0.63, cy = it.y - h / 2, hw = Math.max(it.w / 2 + 22, 66), hh = Math.max(h / 2 + 22, 56); return Math.abs(p.x - it.x) <= hw && Math.abs(p.y - cy) <= hh; };

  function place(it, slot) {
    it.placed = true; it.lift = false; slot.filled = it; it.hx = slot.x + slot.w / 2; it.hy = slot.top + 2; it.glide = null;
    api.play('drop');
    scene.floatText(vname(it.id), VEHICLES[it.id].en, it.hx, slot.top - it.w * 0.63 - 24, { size: 38 });
    api.speak(vname(it.id), VEHICLES[it.id].en);
    scene.sparkle(it.hx, slot.top - 40, { count: 8 });
    if (items.every((i) => i.placed)) {
      phase = 'win'; parade = 0; api.markSolved();
      setTimeout(() => alive && api.celebrate({ ja: 'おおきい じゅんに ならんだよ！', en: 'Smallest to biggest!' }), 900);
    }
  }
  function tryDrop(it, p) {
    const s = slots.find((s) => p.x >= s.x - 6 && p.x <= s.x + s.w + 6);
    if (p.y > DROP_Y && s && s.rank === it.rank && !s.filled) place(it, s);
    else { it.lift = false; it.back = true; api.play('back'); if (p.y > DROP_Y && s) it.wig = 0.6; }
  }

  scene.onPointerDown = (p) => {
    if (!p.primary || phase !== 'play') return;
    if (demo) { demo.it.lift = false; demo.it.glide = null; demo = null; }
    let best = null;
    for (const it of items) if (!it.placed && hitIt(p, it)) best = it;
    if (!best || held) return;
    held = { it: best };
    best.lift = true; best.glide = null; best.x = p.x; best.y = p.y + best.w * 0.3 - 40;
    api.play('pick');
  };
  scene.onPointerMove = (p) => { if (held && p.primary) { held.it.x = p.x; held.it.y = p.y + held.it.w * 0.3 - 40; held.px = p.x; held.py = p.y; } };
  scene.onPointerUp = (p) => {
    if (!held || !p.primary) return;
    const it = held.it; held = null; tryDrop(it, p);
  };

  scene.onFrame = (ctx, dt, t) => {
    const v = scene.view;
    ctx.save(); ctx.globalAlpha = 0.5; ctx.fillStyle = P.kimidori; ctx.fillRect(v.x0, 306, v.x1 - v.x0, 8); ctx.restore();
    for (const s of slots) drawSprite(ctx, slotSpr(s, slots.length), s.x, s.top, s.w, 600 - s.top);
    if (phase === 'win') parade += dt;
    const sorted = items.slice().sort((a, b) => (a.lift ? 1 : 0) - (b.lift ? 1 : 0));
    items.forEach((it, idx) => {
      if (it.wig > 0) it.wig = Math.max(0, it.wig - dt);
      if (it.glide) { it.x = approach(it.x, it.glide.x, 9, dt); it.y = approach(it.y, it.glide.y, 9, dt); }
      else if (!it.lift) { it.x = approach(it.x, it.hx, 10, dt); it.y = approach(it.y, it.hy, 10, dt); }
      it.sc = approach(it.sc, it.lift ? 1.12 : 1, 14, dt);
      if (phase === 'win') {
        const go = 0.5 + (items.length - 1 - it.rank) * 0.7;
        if (parade > go) { it.vx += dt * 260; it.hx += it.vx * dt; it.x = it.hx; }
      }
    });
    for (const it of sorted) {
      const w = it.w * it.sc, bob = phase === 'win' && it.vx > 0 ? Math.sin(t * 14 + it.rank) * 1.5 : 0;
      ctx.save();
      ctx.translate(it.x, it.y + bob);
      if (it.wig > 0) ctx.rotate(Math.sin(it.wig * 22) * 0.06);
      if (it.lift) { ctx.globalAlpha = 0.22; ctx.fillStyle = P.sumi; ctx.beginPath(); ctx.ellipse(0, 10, w * 0.4, 8, 0, 0, 7); ctx.fill(); ctx.globalAlpha = 1; }
      dv(ctx, it.id, -w / 2, 0, w);
      ctx.restore();
    }
    api.drawLabel(ctx, 'おおきい じゅんに ならべよう', 'Line up from small to big', 500, 46, 40);
  };

  async function intro() {
    if (!api.firstTime('intro' + api.level.id)) return;
    await new Promise((r) => setTimeout(r, 1300));
    if (!alive || phase !== 'play' || held) return;
    const it = items.find((i) => i.rank === 0), s = slots[0];
    const from = { x: it.hx, y: it.hy - it.w * 0.3 }, to = { x: s.x + s.w / 2, y: s.top + 20 };
    const pos = (f) => ({ x: lerp(from.x, to.x, f), y: lerp(from.y, to.y, f) });
    const steps = [{ ...from, press: true, wait: 0.5, onArrive() { demo = { it }; it.lift = true; it.glide = { x: from.x, y: from.y + it.w * 0.3 - 40 }; } }];
    for (let i = 1; i <= 8; i++) { const f = i / 8, q = pos(f); steps.push({ ...q, wait: 0, onArrive() { if (demo) it.glide = { x: q.x, y: q.y + it.w * 0.3 - 40 }; } }); }
    steps[steps.length - 1].wait = 0.6;
    steps[steps.length - 1].onArrive = () => { if (!demo) return; demo = null; it.glide = null; place(it, s); };
    const ok = await scene.hand(steps, { speed: 220 });
    if (!ok && demo) { demo.it.lift = false; demo.it.glide = null; demo = null; }
  }

  setup(false);
  intro();
  return {
    retry() { setup(true); },
    next() { setup(false); },
    stop() { alive = false; scene.stop && scene.stop(); },
  };
}
