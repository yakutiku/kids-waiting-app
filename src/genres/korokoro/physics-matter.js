// ころころそうち「リアルなうごき」: 物理エンジン Matter.js(MIT ライセンス、src/vendor に同梱)版。
// 保護者設定でオンにしたときだけ読み込む。通信はしない。
// 部品データ(parts.js)は自作物理と共通。ここでは「物理の計算部分」だけを差し替える。
// 描画側が読む形(world.balls / p._body.angle / machines / goals)は physics.js と同じにする。
import { createWorld, updateMachine, checkGoals, FIELD } from './physics.js';
import { buildPart, buildField, DOMINO, SEESAW_LEN } from './parts.js';

let loading = null;
/** Matter.js を読み込む(1 回だけ) */
export function loadMatter() {
  if (window.Matter) return Promise.resolve(window.Matter);
  if (loading) return loading;
  loading = new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = new URL('../../vendor/matter-0.20.0.min.js', import.meta.url).href;
    s.onload = () => resolve(window.Matter);
    s.onerror = reject;
    document.head.append(s);
  });
  return loading;
}

const DT = 1000 / 60;       // 1 回の計算(ミリ秒)
const V = 1 / 60;           // px/秒 → Matter の速さ

/** parts から Matter の世界を作る */
export function buildMatterWorld(Matter, parts) {
  const { Engine, Bodies, Body, Composite, Constraint, Events } = Matter;
  // まず自作物理の形で組み立てて、線・ボール・機械・ゴールの情報を使い回す
  const w = createWorld();
  buildField(w);
  parts.forEach((p) => buildPart(w, p));

  const engine = Engine.create({ positionIterations: 8, velocityIterations: 6 });
  engine.gravity.y = 1;
  engine.gravity.scale = 0.0014;
  const all = [];

  // 静止した線 → 細長い四角
  for (const s of w.segs) {
    if (s.body) continue;
    const dx = s.x2 - s.x1, dy = s.y2 - s.y1;
    const len = Math.hypot(dx, dy) + s.t * 2;
    const b = Bodies.rectangle((s.x1 + s.x2) / 2, (s.y1 + s.y2) / 2, len, s.t * 2, {
      isStatic: true, angle: Math.atan2(dy, dx), restitution: s.e, friction: s.belt ? 0.9 : 0.05,
      chamfer: { radius: Math.min(s.t, 6) },
    });
    b.plugin.seg = s;
    all.push(b);
  }
  // ドミノ・シーソー
  for (const body of w.bodies) {
    const p = body.owner;
    if (body.kind === 'domino') {
      const [cx, cy] = [p.x - DOMINO.w / 2, p.y - DOMINO.h / 2];
      const b = Bodies.rectangle(cx, cy, DOMINO.w, DOMINO.h, { density: 0.002, friction: 0.4, restitution: 0.05 });
      b.plugin.domino = p;
      all.push(b);
      p._mb = b;
      p._body = { angle: 0 };
    } else if (body.kind === 'seesaw') {
      const b = Bodies.rectangle(p.x, p.y - 6, SEESAW_LEN, 14, { density: 0.002, friction: 0.6, restitution: 0.05, angle: body.angle });
      const pin = Constraint.create({ pointA: { x: p.x, y: p.y }, bodyB: b, pointB: { x: 0, y: 6 }, stiffness: 1, length: 0 });
      all.push(b, pin);
      p._mb = b;
      p._body = { angle: body.angle };
    }
  }
  // ボール
  for (const ball of w.balls) {
    const b = Bodies.circle(ball.x, ball.y, ball.r, {
      density: ball.kind === 'b' ? 0.0028 : 0.0015, restitution: 0.35, friction: 0.02, frictionAir: 0.002, frictionStatic: 0.2,
    });
    b.plugin.ball = ball;
    ball._mb = b;
    all.push(b);
  }
  Composite.add(engine.world, all);

  // バネ・ベルトコンベア・音
  const ballOf = (pair) => (pair.bodyA.plugin.ball ? [pair.bodyA, pair.bodyB] : pair.bodyB.plugin.ball ? [pair.bodyB, pair.bodyA] : [null, null]);
  Events.on(engine, 'collisionStart', (ev) => {
    for (const pair of ev.pairs) {
      const [bb, other] = ballOf(pair);
      if (!bb) {
        if (pair.bodyA.plugin.domino && pair.bodyB.plugin.domino) w.events.push({ type: 'domino', x: pair.bodyA.position.x, y: pair.bodyA.position.y - 40 });
        continue;
      }
      const s = other.plugin.seg;
      if (s && s.spring) {
        // 線に垂直な向きで はね返す
        const lx = s.x2 - s.x1, ly = s.y2 - s.y1, l = Math.hypot(lx, ly) || 1;
        let nx = ly / l, ny = -lx / l; if (ny > 0) { nx = -nx; ny = -ny; }
        const v = bb.velocity;
        const vn = v.x * nx + v.y * ny;
        const target = s.spring * V;
        Body.setVelocity(bb, { x: v.x + nx * (target - vn), y: v.y + ny * (target - vn) });
        if (s.owner) s.owner.squash = 1;
        w.events.push({ type: 'spring', owner: s.owner, x: bb.position.x, y: bb.position.y + 20 });
      } else if (Math.hypot(bb.velocity.x, bb.velocity.y) > 260 * V) {
        w.events.push({ type: 'hit', x: bb.position.x, y: bb.position.y });
      }
    }
  });
  Events.on(engine, 'collisionActive', (ev) => {
    for (const pair of ev.pairs) {
      const [bb, other] = ballOf(pair);
      if (!bb) continue;
      const s = other.plugin.seg;
      if (s && s.belt) {
        const target = s.belt * V;
        Body.setVelocity(bb, { x: bb.velocity.x + (target - bb.velocity.x) * 0.25, y: bb.velocity.y });
      }
    }
  });

  w.matter = { Matter, engine };
  return w;
}

function sync(w) {
  const { Body } = w.matter.Matter;
  for (const ball of w.balls) {
    const b = ball._mb;
    if (!ball.active) continue;
    if (ball.held) {
      if (!b.isStatic) Body.setStatic(b, true);
      Body.setPosition(b, { x: ball.x, y: ball.y });
      ball._wasHeld = true;
      continue;
    }
    if (ball._wasHeld) {
      ball._wasHeld = false;
      Body.setStatic(b, false);
      Body.setPosition(b, { x: ball.x, y: ball.y });
      Body.setVelocity(b, { x: ball.vx * V, y: ball.vy * V });
    }
    ball.x = b.position.x; ball.y = b.position.y;
    ball.vx = b.velocity.x / V; ball.vy = b.velocity.y / V;
    ball.spin = b.angle;
    if (ball.y > FIELD.y1 + 200 || ball.x < FIELD.x0 - 200 || ball.x > FIELD.x1 + 200) ball.active = false;
  }
  for (const body of w.bodies) {
    const p = body.owner;
    const b = p._mb;
    if (!b) continue;
    if (body.kind === 'domino') {
      // 描画は「右下の角」と角度で描くので、角の位置を求めて入れる
      const c = Math.cos(b.angle), s = Math.sin(b.angle);
      const hx = DOMINO.w / 2, hy = DOMINO.h / 2;
      p.x = b.position.x + hx * c - hy * s;
      p.y = b.position.y + hx * s + hy * c;
      p._body.angle = b.angle;
    } else {
      p._body.angle = b.angle;
    }
  }
}

/** 経過時間ぶん進める。返り値はイベント(physics.js と同じ形) */
export function advanceMatter(w, dt) {
  const { Engine } = w.matter.Matter;
  w.acc += Math.min(dt, 0.05) * 1000;
  let n = 0;
  while (w.acc >= DT && n < 4) {
    sync(w);
    for (const m of w.machines) updateMachine(w, m, DT / 1000);
    sync(w);
    Engine.update(w.matter.engine, DT);
    sync(w);
    checkGoals(w);
    w.acc -= DT; n++;
  }
  const moving = w.balls.some((b) => b.active && !b.held && Math.hypot(b.vx, b.vy) > 8) ||
    w.machines.some((m) => m.state !== 'idle' && m.state !== 'rest');
  w.restTime = moving ? 0 : w.restTime + dt;
  const ev = w.events; w.events = [];
  return ev;
}
