// ころころそうち: 自作の簡易物理(案A)。DOM を使わない純粋な計算。
// 固定の時間刻み(1/240 秒)で計算するので、毎回同じ結果になる。
//
// 部品の位置・形は parts.js の定義から world を作る(buildWorld)。
// 描画側は world の状態(ball.x, body.angle, machine.t など)を読むだけ。

export const G = 1400;          // 重力
export const STEP = 1 / 240;    // 時間刻み
export const FIELD = { x0: 0, x1: 840, y0: -400, y1: 600, floor: 560 };
export const BALL_R = { s: 20, b: 28 };
export const BALL_M = { s: 1, b: 2.2 };

// ---------- 小さなベクトル関数 ----------
function rot(x, y, a) { const c = Math.cos(a), s = Math.sin(a); return [x * c - y * s, x * s + y * c]; }
function closestOnSeg(px, py, ax, ay, bx, by) {
  const dx = bx - ax, dy = by - ay;
  const l2 = dx * dx + dy * dy || 1e-9;
  let t = ((px - ax) * dx + (py - ay) * dy) / l2;
  t = t < 0 ? 0 : t > 1 ? 1 : t;
  return [ax + dx * t, ay + dy * t];
}

/**
 * world = {
 *   balls: [{x,y,vx,vy,r,m,kind,active,held,start}],
 *   segs:  [{x1,y1,x2,y2,t,e,mu, belt, spring, body, owner}]   静止した線(または body に付いた線のローカル座標)
 *   bodies:[{px,py,angle,w,I,min,max,gravity(r→τ), segsLocal, kind}]  回転する部品(ドミノ・シーソー)
 *   machines: [...] ダンプ・クレーン
 *   goals: [{x,y,w,h,reached}]
 * }
 */
export function createWorld() {
  return { balls: [], segs: [], bodies: [], machines: [], goals: [], dominoes: [], time: 0, acc: 0, events: [], restTime: 0, done: false };
}

export function addBall(w, x, y, kind = 's') {
  const b = { x, y, vx: 0, vy: 0, r: BALL_R[kind], m: BALL_M[kind], kind, active: true, held: null, spin: 0 };
  w.balls.push(b);
  return b;
}
export function addSeg(w, x1, y1, x2, y2, opt = {}) {
  const s = { x1, y1, x2, y2, t: opt.t ?? 7, e: opt.e ?? 0.25, mu: opt.mu ?? 0.02, belt: opt.belt || 0, spring: opt.spring || 0, body: opt.body || null, owner: opt.owner || null, wx1: x1, wy1: y1, wx2: x2, wy2: y2 };
  w.segs.push(s);
  if (s.body) s.body.segs.push(s);
  return s;
}

/** 回転する部品(1 つの支点のまわりを回る) */
export function addBody(w, { px, py, angle = 0, m = 1, I = 1000, min = -1, max = 1, com = [0, 0], damp = 0.4, limitE = 0.15, kind = 'body', owner = null }) {
  const b = { px, py, angle, omega: 0, m, I, min, max, com, damp, limitE, kind, owner, segs: [], hitLimit: 0 };
  w.bodies.push(b);
  return b;
}

function updateBodySegs(b) {
  for (const s of b.segs) {
    const [ax, ay] = rot(s.x1, s.y1, b.angle);
    const [bx, by] = rot(s.x2, s.y2, b.angle);
    s.wx1 = b.px + ax; s.wy1 = b.py + ay; s.wx2 = b.px + bx; s.wy2 = b.py + by;
  }
}

// ---------- ボールと線の当たり ----------
function collideBallSeg(w, ball, s) {
  const [cx, cy] = closestOnSeg(ball.x, ball.y, s.wx1, s.wy1, s.wx2, s.wy2);
  let dx = ball.x - cx, dy = ball.y - cy;
  const d2 = dx * dx + dy * dy;
  const rr = ball.r + s.t;
  if (d2 >= rr * rr) return false;
  let d = Math.sqrt(d2);
  let nx, ny;
  if (d < 1e-6) { // 線の真上: 線の法線
    const lx = s.wx2 - s.wx1, ly = s.wy2 - s.wy1, l = Math.hypot(lx, ly) || 1;
    nx = ly / l; ny = -lx / l; if (ny > 0) { nx = -nx; ny = -ny; }
    d = 0;
  } else { nx = dx / d; ny = dy / d; }
  const pen = rr - d;
  ball.x += nx * pen; ball.y += ny * pen;
  // 面の速さ
  const body = s.body;
  let ux = 0, uy = 0, rx = 0, ry = 0;
  if (body) {
    rx = cx - body.px; ry = cy - body.py;
    ux = -body.omega * ry; uy = body.omega * rx;
  }
  // ベルトコンベア: 面に沿った速さ
  let tx = -ny, ty = nx;
  let relx = ball.vx - ux, rely = ball.vy - uy;
  const vn = relx * nx + rely * ny;
  if (vn >= 0) return true;
  const rn = rx * ny - ry * nx;
  const k = 1 / ball.m + (body ? (rn * rn) / body.I : 0);
  let e = Math.abs(vn) < 80 ? 0 : s.e;
  let jn = (-(1 + e) * vn) / k;
  if (s.spring) {
    // バネ: 少なくとも spring の速さで はね返す
    const target = Math.max(Math.abs(vn) * 0.95, s.spring);
    jn = (target - vn) * ball.m;
    w.events.push({ type: 'spring', owner: s.owner, x: cx, y: cy });
    if (s.owner) s.owner.squash = 1;
  } else if (Math.abs(vn) > 260) {
    w.events.push({ type: 'hit', x: cx, y: cy, v: -vn, owner: s.owner });
  }
  ball.vx += (nx * jn) / ball.m; ball.vy += (ny * jn) / ball.m;
  if (body) body.omega -= (jn * rn) / body.I;
  // まさつ / ベルト
  relx = ball.vx - ux; rely = ball.vy - uy;
  // 面の向きを右向きにそろえる(ベルトの向きのため)
  if (tx < 0) { tx = -tx; ty = -ty; }
  let vt = relx * tx + rely * ty - (s.belt || 0);
  if (s.spring) {
    // バネは 横の速さを そのまま
  } else if (s.belt) {
    const jt = -vt * ball.m * 0.25;
    ball.vx += (tx * jt) / ball.m; ball.vy += (ty * jt) / ball.m;
  } else {
    const kt = 1 / ball.m + (body ? ((rx * ty - ry * tx) ** 2) / body.I : 0);
    let jt = -vt / kt;
    const lim = s.mu * jn;
    if (jt > lim) jt = lim; else if (jt < -lim) jt = -lim;
    ball.vx += (tx * jt) / ball.m; ball.vy += (ty * jt) / ball.m;
    if (body) body.omega -= (jt * (rx * ty - ry * tx)) / body.I;
  }
  return true;
}

function collideBalls(w, a, b) {
  const dx = b.x - a.x, dy = b.y - a.y;
  const rr = a.r + b.r;
  const d2 = dx * dx + dy * dy;
  if (d2 >= rr * rr || d2 < 1e-9) return;
  const d = Math.sqrt(d2);
  const nx = dx / d, ny = dy / d;
  const pen = rr - d;
  const ta = b.m / (a.m + b.m), tb = a.m / (a.m + b.m);
  a.x -= nx * pen * ta; a.y -= ny * pen * ta;
  b.x += nx * pen * tb; b.y += ny * pen * tb;
  const vn = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny;
  if (vn >= 0) return;
  const e = Math.abs(vn) < 60 ? 0 : 0.6;
  const j = (-(1 + e) * vn) / (1 / a.m + 1 / b.m);
  a.vx -= (nx * j) / a.m; a.vy -= (ny * j) / a.m;
  b.vx += (nx * j) / b.m; b.vy += (ny * j) / b.m;
  if (Math.abs(vn) > 200) w.events.push({ type: 'click', x: a.x + nx * a.r, y: a.y + ny * a.r });
}

// ---------- ドミノどうし ----------
function pointInBody(b, x, y, pad = 0) {
  // ドミノの四角(ローカル x∈[-w,0], y∈[-h,0])
  const [lx, ly] = rot(x - b.px, y - b.py, -b.angle);
  return lx >= -b.w - pad && lx <= pad && ly >= -b.h - pad && ly <= pad;
}
function dominoTip(b) {
  const [tx, ty] = rot(0, -b.h, b.angle);
  return [b.px + tx, b.py + ty];
}
function dominoPairs(w) {
  const ds = w.dominoes;
  for (const a of ds) {
    if (a.angle < 0.05) continue;
    for (const b of ds) {
      if (a === b) continue;
      let [tx, ty] = dominoTip(a);
      if (!pointInBody(b, tx, ty)) continue;
      // a の先が b に当たった: b を押す
      if (b.omega < a.omega * 0.9 && b.angle < b.max - 0.01) {
        if (b.omega < 0.5) w.events.push({ type: 'domino', x: tx, y: ty });
        b.omega = Math.max(b.omega, a.omega * 0.9 + 0.6);
      }
      // a は b にもたれる(めり込まないところまで戻す)
      for (let i = 0; i < 12 && pointInBody(b, ...dominoTip(a)); i++) a.angle -= 0.01;
      a.omega = Math.min(a.omega, b.omega);
    }
  }
}

// ---------- 機械(ダンプ・クレーン) ----------
function updateMachine(w, m, dt) {
  if (m.type === 'dump') {
    if (m.state === 'idle') {
      for (const ball of w.balls) {
        if (!ball.active || ball.held) continue;
        if (ball.x > m.zone.x0 && ball.x < m.zone.x1 && ball.y > m.zone.y0 && ball.y < m.zone.y1) {
          ball.held = m; m.ball = ball; m.state = 'load'; m.t = 0;
          w.events.push({ type: 'dump', x: ball.x, y: ball.y, owner: m });
          break;
        }
      }
    } else {
      m.t += dt;
      const ball = m.ball;
      if (m.state === 'load') {
        if (m.t > 0.5) { m.state = 'drive'; m.t = 0; }
      } else if (m.state === 'drive') {
        const k = Math.min(1, m.t / m.driveTime);
        const e = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
        m.offset = m.move * e; // 決まった場所まで(バックで)進む
        if (k >= 1) { m.state = 'tilt'; m.t = 0; }
      } else if (m.state === 'tilt') {
        m.tilt = Math.min(1, m.t / 0.7);
        if (m.t > 0.7) {
          // 荷台の後ろから ボールを出す
          ball.held = null;
          ball.x = m.x + m.offset - m.dir * 80; ball.y = m.groundY - 120;
          ball.vx = -m.dir * 120; ball.vy = -60;
          m.state = 'back'; m.t = 0; m.ball = null;
        }
      } else if (m.state === 'back') {
        m.tilt = Math.max(0, 1 - m.t / 0.7);
        if (m.t > 0.7) m.state = 'rest';
      }
      if (ball && ball.held === m) {
        // 荷台の上
        const tx = m.x + m.offset - m.dir * 22, ty = m.groundY - 74;
        ball.x += (tx - ball.x) * Math.min(1, dt * 12); ball.y += (ty - ball.y) * Math.min(1, dt * 12);
        ball.vx = 0; ball.vy = 0;
      }
    }
  } else if (m.type === 'crane') {
    const hookX = () => m.hx + m.moveX * m.k2;
    const hookY = () => m.hy - m.lift * m.k1;
    if (m.state === 'idle') {
      for (const ball of w.balls) {
        if (!ball.active || ball.held) continue;
        const bx = hookX(), by = hookY();
        if (Math.abs(ball.x - bx) < 40 && ball.y > by - 10 && ball.y < by + 40) {
          ball.held = m; m.ball = ball; m.state = 'lift'; m.t = 0;
          w.events.push({ type: 'crane', x: ball.x, y: ball.y, owner: m });
          break;
        }
      }
    } else {
      m.t += dt;
      const ease = (k) => (k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2);
      if (m.state === 'lift') {
        m.k1 = ease(Math.min(1, Math.max(0, (m.t - 0.4) / 1.4)));
        if (m.t > 1.8) { m.state = 'move'; m.t = 0; }
      } else if (m.state === 'move') {
        m.k2 = ease(Math.min(1, m.t / 1.6));
        if (m.t > 1.8) {
          const ball = m.ball;
          ball.held = null; ball.vx = 0; ball.vy = 0;
          m.ball = null; m.state = 'rest';
          m.bucketTilt = 1;
        }
      }
      const ball = m.ball;
      if (ball && ball.held === m) {
        const tx = hookX(), ty = hookY() + 14;
        ball.x += (tx - ball.x) * Math.min(1, dt * 14); ball.y += (ty - ball.y) * Math.min(1, dt * 14);
        ball.vx = 0; ball.vy = 0;
      }
      if (m.bucketTilt > 0 && m.state === 'rest') m.bucketTilt = Math.max(0, m.bucketTilt - dt);
    }
  }
}

// ---------- 1 ステップ ----------
function step(w, dt) {
  w.time += dt;
  // 回転部品
  for (const b of w.bodies) {
    const [cx] = rot(b.com[0], b.com[1], b.angle);
    const tau = cx * b.m * G;
    b.omega += (tau / b.I) * dt;
    b.omega *= Math.max(0, 1 - b.damp * dt);
    b.angle += b.omega * dt;
    if (b.angle < b.min) { b.angle = b.min; if (b.omega < 0) { if (b.omega < -1.5) b.hitLimit = 1; b.omega = -b.omega * b.limitE; } }
    if (b.angle > b.max) { b.angle = b.max; if (b.omega > 0) { if (b.omega > 1.5) b.hitLimit = 1; b.omega = -b.omega * b.limitE; } }
  }
  if (w.dominoes.length) dominoPairs(w);
  for (const b of w.bodies) updateBodySegs(b);
  // ボール
  for (const ball of w.balls) {
    if (!ball.active || ball.held) continue;
    ball.vy += G * dt;
    ball.vx *= 1 - 0.05 * dt;
    ball.x += ball.vx * dt; ball.y += ball.vy * dt;
  }
  for (let iter = 0; iter < 2; iter++) {
    for (const ball of w.balls) {
      if (!ball.active || ball.held) continue;
      for (const s of w.segs) collideBallSeg(w, ball, s);
    }
    for (let i = 0; i < w.balls.length; i++) {
      const a = w.balls[i]; if (!a.active || a.held) continue;
      for (let j = i + 1; j < w.balls.length; j++) {
        const b = w.balls[j]; if (!b.active || b.held) continue;
        collideBalls(w, a, b);
      }
    }
  }
  for (const ball of w.balls) {
    if (!ball.active) continue;
    ball.spin += (ball.vx / ball.r) * dt;
    if (ball.y > FIELD.y1 + 200 || ball.x < FIELD.x0 - 200 || ball.x > FIELD.x1 + 200) ball.active = false;
  }
  for (const m of w.machines) updateMachine(w, m, dt);
  // ゴール
  for (const g of w.goals) {
    if (g.reached) continue;
    for (const ball of w.balls) {
      if (!ball.active || ball.held) continue;
      if (g.only && ball.kind !== g.only) continue;
      if (ball.x > g.x - g.w / 2 && ball.x < g.x + g.w / 2 && ball.y > g.y - g.h && ball.y < g.y) {
        g.reached = true;
        w.events.push({ type: 'goal', x: g.x, y: g.y - g.h / 2, goal: g });
      }
    }
  }
  // 止まったか
  const moving = w.balls.some((b) => b.active && !b.held && Math.hypot(b.vx, b.vy) > 8) ||
    w.machines.some((m) => m.state !== 'idle' && m.state !== 'rest') ||
    w.bodies.some((b) => Math.abs(b.omega) > 0.05);
  w.restTime = moving ? 0 : w.restTime + dt;
}

/** 経過時間 dt ぶん進める(内部は固定刻み) */
export function advance(w, dt) {
  w.acc += Math.min(dt, 0.05);
  let n = 0;
  while (w.acc >= STEP && n < 20) { step(w, STEP); w.acc -= STEP; n++; }
  const ev = w.events; w.events = [];
  return ev;
}
/** テスト用: 秒数ぶん一気に進める */
export function simulate(w, seconds, onEvent) {
  const n = Math.round(seconds / STEP);
  for (let i = 0; i < n; i++) {
    step(w, STEP);
    if (w.events.length) { onEvent && w.events.forEach(onEvent); w.events = []; }
  }
}
