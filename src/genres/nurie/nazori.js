// なぞろう: 点線の道を指でなぞる。車が指についてくる。外れても何も起きない(そこから続ければよい)。
import { P } from '../../crayon/palette.js';
import { crayonRect, crayonPoly, crayonLine, sprite, drawSprite } from '../../crayon/crayon.js';
import { vehicleSprite } from '../../crayon/vehicles.js';
import { ease } from '../../core/scene.js';
import { makeCanvas } from './common.js';

const bez = (p0, p1, p2, p3, n = 40) => {
  const out = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n, u = 1 - t;
    out.push([u * u * u * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t * t * t * p3[0], u * u * u * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t * t * t * p3[1]]);
  }
  return out;
};
const circle = () => { const o = []; for (let i = 0; i <= 72; i++) { const a = Math.PI + (i / 72) * Math.PI * 2; o.push([500 + Math.cos(a) * 190, 320 + Math.sin(a) * 190]); } return o; };
const wave = () => { const o = []; for (let i = 0; i <= 80; i++) { const t = i / 80; o.push([100 + t * 800, 320 - Math.sin(t * Math.PI * 6) * 110]); } return o; };
const spiral = () => { const o = []; for (let i = 0; i <= 160; i++) { const t = i / 160, a = -Math.PI / 2 + t * Math.PI * 4; const r = 200 - 140 * t; o.push([500 + Math.cos(a) * r, 350 + Math.sin(a) * r]); } return o; };
const star = () => {
  const v = []; for (let i = 0; i < 5; i++) { const a = -Math.PI / 2 + (i * 2 * Math.PI) / 5; v.push([500 + Math.cos(a) * 195, 355 + Math.sin(a) * 195]); }
  return [v[0], v[2], v[4], v[1], v[3], v[0]];
};

export const PROBLEMS = [
  { ja: 'まっすぐ', en: 'Straight', veh: 'shinkansen', style: 'rail', pts: [[130, 320], [870, 320]], accent: P.aka, tol: 60 },
  { ja: 'さかみち', en: 'Hill', veh: 'dump', style: 'road', pts: [[110, 460], [320, 460], [560, 220], [880, 220]], accent: P.daidai, tol: 56 },
  { ja: 'まる', en: 'Circle', veh: 'bus', style: 'road', pts: circle(), accent: P.kiiro, tol: 56, goal: [-95, 0] },
  { ja: 'しかく', en: 'Square', veh: 'fire', style: 'road', pts: [[280, 160], [740, 160], [740, 480], [280, 480], [280, 160]], accent: P.aka, tol: 56, goal: [-95, -10] },
  { ja: 'さんかく', en: 'Triangle', veh: 'police', style: 'road', pts: [[500, 165], [800, 505], [200, 505], [500, 165]], accent: P.ao, tol: 56, goal: [-120, 0] },
  { ja: 'なみなみ', en: 'Waves', veh: 'crane', style: 'road', pts: wave(), accent: P.midori, tol: 54 },
  { ja: 'せんろ', en: 'Railway', veh: 'shinkansenRed', style: 'rail', pts: [...bez([100, 470], [400, 470], [300, 170], [570, 170]), ...bez([570, 170], [820, 170], [720, 450], [900, 450]).slice(1)], accent: P.sorairo, tol: 56 },
  { ja: 'ジグザグ', en: 'Zigzag', veh: 'bulldozer', style: 'road', pts: [[100, 470], [250, 160], [400, 470], [550, 160], [700, 470], [850, 160]], accent: P.murasaki, tol: 50 },
  { ja: 'ぐるぐる', en: 'Swirl', veh: 'loco', style: 'road', pts: spiral(), accent: P.chairo, tol: 36 },
  { ja: 'ほし', en: 'Star', veh: 'ambulance', style: 'road', pts: star(), accent: P.kiiro, tol: 48, goal: [-125, -5] },
];
// ふりがな(カタカナ)
const LABEL = { 'ジグザグ': '{ジグザグ|じぐざぐ}' };

const STEP = 6;
function buildPath(raw) {
  const xs = [raw[0][0]], ys = [raw[0][1]], cum = [0];
  for (let i = 1; i < raw.length; i++) {
    const [x0, y0] = raw[i - 1], [x1, y1] = raw[i];
    const d = Math.hypot(x1 - x0, y1 - y0);
    const n = Math.max(1, Math.round(d / STEP));
    for (let j = 1; j <= n; j++) {
      const t = j / n, x = x0 + (x1 - x0) * t, y = y0 + (y1 - y0) * t;
      cum.push(cum[cum.length - 1] + Math.hypot(x - xs[xs.length - 1], y - ys[ys.length - 1]));
      xs.push(x); ys.push(y);
    }
  }
  return { xs, ys, cum, n: xs.length, L: cum[cum.length - 1] };
}

function stationSprite() {
  return sprite('nz-station', 110, 110, (c) => {
    crayonRect(c, 10, 46, 90, 56, P.kiiro, { r: 4, seed: 2 });
    crayonPoly(c, [[2, 50], [55, 18], [108, 50]], P.aka, { seed: 3 });
    crayonRect(c, 44, 70, 22, 32, P.chairo, { seed: 4, r: 3 });
    crayonRect(c, 18, 58, 20, 18, P.sorairo, { seed: 5, r: 3, width: 2 });
    crayonRect(c, 72, 58, 20, 18, P.sorairo, { seed: 6, r: 3, width: 2 });
    crayonLine(c, [[55, 18], [55, 2]], { width: 3, seed: 7, passes: 1 });
    crayonPoly(c, [[55, 2], [80, 8], [55, 15]], P.midori, { seed: 8, width: 2 });
  });
}

export function nazoriMode(api, scene) {
  let idx = Math.max(0, Math.min(PROBLEMS.length - 1, api.load('nazori.idx', 0) | 0));
  let prob, path, bg = null, s = 0, sCar = 0, angle = 0, pressing = false, done = false, run = null, demo = false, used = false, t = 0;
  const station = stationSprite();

  function pointAt(a) {
    a = Math.max(0, Math.min(path.L, a));
    const i = Math.min(path.n - 2, Math.floor(a / STEP));
    const f = (a - path.cum[i]) / ((path.cum[i + 1] - path.cum[i]) || 1);
    return [path.xs[i] + (path.xs[i + 1] - path.xs[i]) * f, path.ys[i] + (path.ys[i + 1] - path.ys[i]) * f];
  }
  function load(i) {
    idx = ((i % PROBLEMS.length) + PROBLEMS.length) % PROBLEMS.length;
    api.save('nazori.idx', idx);
    prob = PROBLEMS[idx];
    path = buildPath(prob.pts);
    s = 0; sCar = 0; done = false; run = null; pressing = false; angle = 0;
    api.glowNext(false);
    bg = makeCanvas(1000, 600, (c) => {
      c.lineCap = 'round'; c.lineJoin = 'round';
      const trace = () => { c.beginPath(); for (let k = 0; k < path.n; k++) (k ? c.lineTo(path.xs[k], path.ys[k]) : c.moveTo(path.xs[k], path.ys[k])); };
      c.globalAlpha = 0.2; c.strokeStyle = P.haiiro; c.lineWidth = 76; trace(); c.stroke();
      if (prob.style === 'rail') {
        c.globalAlpha = 0.85;
        for (let a = 0; a <= path.L; a += 26) {
          const [x, y] = pointAt(a), [x2, y2] = pointAt(a + 4), [x1, y1] = pointAt(a - 4);
          const dx = x2 - x1, dy = y2 - y1, l = Math.hypot(dx, dy) || 1, nx = -dy / l * 26, ny = dx / l * 26;
          c.strokeStyle = P.chairo; c.lineWidth = 7;
          c.beginPath(); c.moveTo(x - nx, y - ny); c.lineTo(x + nx, y + ny); c.stroke();
        }
      }
      c.globalAlpha = 0.8; c.strokeStyle = P.sumi; c.lineWidth = 6; c.setLineDash([14, 18]); trace(); c.stroke();
    });
    api.speak(LABEL[prob.ja] || prob.ja, prob.en);
  }

  function follow(x, y) {
    if (done) return;
    const lo = Math.max(0, Math.floor((s - 40) / STEP)), hi = Math.min(path.n - 1, Math.ceil((s + 130) / STEP));
    let best = -1, bd = prob.tol;
    for (let i = lo; i <= hi; i++) {
      const d = Math.hypot(path.xs[i] - x, path.ys[i] - y);
      if (d < bd) { bd = d; best = i; }
    }
    if (best >= 0 && path.cum[best] > s) s = path.cum[best];
    if (s >= path.L - 14 && !demo) finish();
  }
  function finish() {
    done = true; s = path.L;
    run = { t: 0 };
    api.markSolved();
    api.play('train');
    api.celebrate({ ja: 'できた！', en: 'You did it!' });
  }

  scene.onPointerDown = (p) => {
    if (!p.primary) return;
    used = true;
    if (demo) { demo = false; s = 0; sCar = 0; }
    pressing = true; follow(p.x, p.y);
  };
  scene.onPointerMove = (p) => { if (pressing && p.primary) follow(p.x, p.y); };
  scene.onPointerUp = (p) => { if (p.primary) pressing = false; };

  scene.onFrame = (ctx, dt) => {
    t += dt;
    ctx.drawImage(bg, 0, 0, 1000, 600);

    api.drawLabel(ctx, LABEL[prob.ja] || prob.ja, prob.en, 500, 34, 38);
    // ゴール
    const [ex, ey] = pointAt(path.L), g = prob.goal || [0, 0];
    drawSprite(ctx, station, ex + g[0] - 55, ey + g[1] - 78, 110, 110);
    // 走ってきた道
    let carA = sCar;
    if (run) {
      run.t += dt / 2.4;
      if (run.t >= 1) { run.t = 1; }
      carA = ease.inOut(run.t) * path.L;
      if (run.t >= 1 && !run.done) { run.done = true; scene.sparkle(ex, ey - 30, { count: 14, spread: 220 }); scene.floatText('{ガタンゴトン|がたんごとん}', 'Choo choo!', 500, 520, { size: 44 }); }
    } else {
      sCar += (s - sCar) * Math.min(1, dt * 14);
      carA = sCar;
    }
    if (!run && sCar > 1) {
      ctx.save();
      ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      ctx.strokeStyle = prob.accent; ctx.globalAlpha = 0.9; ctx.lineWidth = 17;
      ctx.beginPath(); ctx.moveTo(path.xs[0], path.ys[0]);
      const m = Math.min(path.n - 1, Math.floor(sCar / STEP));
      for (let k = 1; k <= m; k++) ctx.lineTo(path.xs[k], path.ys[k]);
      ctx.stroke();
      ctx.globalAlpha = 0.4; ctx.lineWidth = 7; ctx.strokeStyle = P.gayoshi;
      ctx.stroke();
      ctx.restore();
    }
    // 始点のやさしい目印(ゆっくり息をする)
    if (s < 1 && !run) {
      const k = 1 + Math.sin(t * 2.4) * 0.08;
      ctx.save(); ctx.globalAlpha = 0.5; ctx.strokeStyle = P.aka; ctx.lineWidth = 5; ctx.setLineDash([10, 10]);
      ctx.beginPath(); ctx.arc(path.xs[0], path.ys[0], 62 * k, 0, Math.PI * 2); ctx.stroke(); ctx.restore();
    }
    // 車
    const [cx, cy] = pointAt(carA);
    const [ax, ay] = pointAt(carA - 18), [bx, by] = pointAt(carA + 18);
    let dx = bx - ax, dy = by - ay;
    if (Math.hypot(dx, dy) < 1) { dx = 1; dy = 0; }
    const flipX = dx < -0.01;
    let want = Math.atan2(dy, flipX ? -dx : dx);
    want = Math.max(-0.55, Math.min(0.55, want));
    angle += (want - angle) * Math.min(1, dt * 10);
    const spr = vehicleSprite(prob.veh, 120);
    ctx.save();
    ctx.translate(cx, cy);
    if (flipX) ctx.scale(-1, 1);
    ctx.rotate(flipX ? angle : angle);
    drawSprite(ctx, spr, -60, -62, 120, 78);
    ctx.restore();
  };

  async function intro() {
    if (!api.firstTime('nazori')) return;
    await new Promise((r) => setTimeout(r, 900));
    if (used) return;
    demo = true;
    const steps = [];
    for (let a = 0; a <= path.L * 0.7; a += 70) {
      const [x, y] = pointAt(a);
      steps.push({ x, y, wait: 0, press: a === 0, onArrive: () => follow(x, y) });
    }
    steps[steps.length - 1].wait = 1;
    await scene.hand(steps, { speed: 230, pause: 0 });
    if (demo) { demo = false; s = 0; sCar = 0; }
  }

  load(idx);
  intro();
  return {
    retry() { load(idx); },
    next() { load(idx + 1); },
    stop() { },
  };
}
