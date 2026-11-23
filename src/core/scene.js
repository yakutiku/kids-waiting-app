// 遊び画面のキャンバス。
// - 論理座標(標準 1000×600)で描けば、画面サイズに合わせて自動で拡大縮小・中央寄せ。
// - 指の操作も論理座標で届く。
// - 「手のアニメでやって見せる」(hand) と、キラキラ(sparkle)、浮かぶ文字(floatText) つき。
import { P } from '../crayon/palette.js';
import { paperSprite, sprite, crayonPoly, crayonCircle, crayonLine, starPts, crayonFill, drawSprite, rng } from '../crayon/crayon.js';
import { drawLabel } from './i18n.js';

function handSprite() {
  return sprite('hand', 90, 110, (c) => {
    // 人差し指で指す手(指先が (30, 6))
    crayonPoly(c, [[22, 50], [22, 12], [26, 4], [34, 4], [38, 12], [38, 46], [46, 44], [54, 48], [62, 50], [72, 56], [76, 70], [72, 92], [60, 104], [34, 104], [20, 92], [12, 72], [10, 58], [16, 52]], P.daidai, { seed: 301, width: 3.5 });
    crayonLine(c, [[38, 52], [40, 60]], { width: 2, seed: 302, passes: 1 });
    crayonLine(c, [[54, 54], [56, 62]], { width: 2, seed: 303, passes: 1 });
  });
}

export function createScene(container, { width = 1000, height = 600, background = 'paper' } = {}) {
  const canvas = document.createElement('canvas');
  canvas.className = 'scene';
  container.append(canvas);
  const ctx = canvas.getContext('2d');
  const scene = {
    canvas, ctx, width, height,
    scale: 1, offX: 0, offY: 0,
    onFrame: null, onPointerDown: null, onPointerMove: null, onPointerUp: null, onResize: null,
    time: 0,
  };
  let dpr = 1, cssW = 0, cssH = 0;
  let running = true;
  let raf = 0;
  let last = performance.now();
  const particles = [];
  const floats = [];
  let handAnim = null;

  function resize() {
    const r = container.getBoundingClientRect();
    cssW = Math.max(1, r.width); cssH = Math.max(1, r.height);
    dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = Math.round(cssW * dpr);
    canvas.height = Math.round(cssH * dpr);
    canvas.style.width = cssW + 'px';
    canvas.style.height = cssH + 'px';
    const s = Math.min(cssW / width, cssH / height);
    scene.scale = s;
    scene.offX = (cssW - width * s) / 2;
    scene.offY = (cssH - height * s) / 2;
    // 論理座標で見えている範囲(はみ出し部分も描けるように)
    scene.view = { x0: -scene.offX / s, y0: -scene.offY / s, x1: (cssW - scene.offX) / s, y1: (cssH - scene.offY) / s };
    scene.onResize && scene.onResize(scene);
  }
  const ro = new ResizeObserver(resize);
  ro.observe(container);
  resize();

  function toLogical(e) {
    const r = canvas.getBoundingClientRect();
    return { x: (e.clientX - r.left - scene.offX) / scene.scale, y: (e.clientY - r.top - scene.offY) / scene.scale, id: e.pointerId, primary: e.isPrimary };
  }
  const down = (e) => {
    e.preventDefault();
    try { canvas.setPointerCapture(e.pointerId); } catch { }
    if (handAnim) { handAnim.cancel(); }
    scene.onPointerDown && scene.onPointerDown(toLogical(e));
  };
  const move = (e) => { e.preventDefault(); scene.onPointerMove && scene.onPointerMove(toLogical(e)); };
  const up = (e) => { e.preventDefault(); scene.onPointerUp && scene.onPointerUp(toLogical(e)); };
  canvas.addEventListener('pointerdown', down);
  canvas.addEventListener('pointermove', move);
  canvas.addEventListener('pointerup', up);
  canvas.addEventListener('pointercancel', up);

  const paper = background === 'paper' ? paperSprite(512, 512) : null;
  let paperPattern = null;

  function frame(now) {
    if (!running) return;
    raf = requestAnimationFrame(frame);
    if (document.hidden) { last = now; return; }
    let dt = (now - last) / 1000;
    last = now;
    if (dt > 0.05) dt = 0.05;
    scene.time += dt;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    // 背景
    if (paper) {
      if (!paperPattern) paperPattern = ctx.createPattern(paper, 'repeat');
      ctx.fillStyle = paperPattern;
    } else ctx.fillStyle = background;
    ctx.fillRect(0, 0, cssW, cssH);
    ctx.setTransform(dpr * scene.scale, 0, 0, dpr * scene.scale, dpr * scene.offX, dpr * scene.offY);
    try { scene.onFrame && scene.onFrame(ctx, dt, scene.time); } catch (err) { console.error(err); }
    drawOverlay(ctx, dt);
  }

  function drawOverlay(ctx, dt) {
    // キラキラ
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.t += dt;
      if (p.t > p.life) { particles.splice(i, 1); continue; }
      p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 60 * dt;
      const k = 1 - p.t / p.life;
      ctx.save();
      ctx.globalAlpha = Math.min(1, k * 1.5);
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot + p.t);
      drawSprite(ctx, p.spr, -p.size / 2, -p.size / 2, p.size, p.size);
      ctx.restore();
    }
    // 浮かぶ文字
    for (let i = floats.length - 1; i >= 0; i--) {
      const f = floats[i];
      f.t += dt;
      if (f.t > f.life) { floats.splice(i, 1); continue; }
      const k = f.t / f.life;
      ctx.save();
      ctx.globalAlpha = k < 0.15 ? k / 0.15 : 1 - Math.max(0, (k - 0.6) / 0.4);
      drawLabel(ctx, f.ja, f.en, f.x, f.y - k * 40, f.size, { color: f.color });
      ctx.restore();
    }
    // 手
    if (handAnim) handAnim.draw(ctx, dt);
  }
  raf = requestAnimationFrame(frame);

  const starSprites = [P.kiiro, P.daidai, P.aka, P.sorairo, P.kimidori, P.murasaki].map((col) =>
    sprite('star-' + col, 40, 40, (c) => crayonPoly(c, starPts(20, 20, 17), col, { seed: 7, width: 2 })));

  /** キラキラ(やさしく、ゆっくり) */
  scene.sparkle = (x, y, { count = 10, spread = 160 } = {}) => {
    const rnd = Math.random;
    for (let i = 0; i < count; i++) {
      const a = rnd() * Math.PI * 2;
      const sp = spread * (0.4 + rnd() * 0.6);
      particles.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 80, t: 0, life: 1.2 + rnd() * 0.6, size: 22 + rnd() * 18, rot: rnd() * 6, spr: starSprites[i % starSprites.length] });
    }
  };
  /** 「ガタン」などの文字を浮かべる */
  scene.floatText = (ja, en, x, y, { size = 44, color = P.sumi, life = 1.6 } = {}) => {
    floats.push({ ja, en, x, y, size, color, t: 0, life });
  };

  /**
   * 手のアニメでやって見せる。
   * steps: [{x, y}, ...] を順にたどる。{x, y, press:true} で押す動き。
   * 子どもが画面にさわると中断。Promise は終わったら(中断でも)解決。
   */
  scene.hand = (steps, { speed = 380, pause = 0.35, loops = 1 } = {}) => new Promise((resolve) => {
    if (handAnim) handAnim.cancel();
    const spr = handSprite();
    let idx = 0, t = 0, loop = 0;
    let x = steps[0].x, y = steps[0].y + 40;
    let alpha = 0, press = 0, done = false, waiting = pause;
    const anim = {
      cancel() { if (!done) { done = true; handAnim = null; resolve(false); } },
      draw(ctx, dt) {
        if (done) return;
        t += dt;
        alpha = Math.min(1, alpha + dt * 3);
        if (waiting > 0) { waiting -= dt; press = Math.max(0, press - dt * 4); }
        else {
          const target = steps[idx];
          const dx = target.x - x, dy = target.y - y;
          const d = Math.hypot(dx, dy);
          const stepLen = speed * dt;
          if (d <= stepLen) {
            x = target.x; y = target.y;
            if (target.press) press = 1;
            if (target.onArrive) target.onArrive();
            idx++;
            waiting = target.wait != null ? target.wait : pause;
            if (idx >= steps.length) {
              loop++;
              if (loop >= loops) { done = true; handAnim = null; resolve(true); return; }
              idx = 0;
            }
          } else { x += (dx / d) * stepLen; y += (dy / d) * stepLen; }
        }
        ctx.save();
        ctx.globalAlpha = 0.85 * alpha;
        const s = 1 - press * 0.12;
        ctx.translate(x, y);
        ctx.scale(s, s);
        if (press > 0.5) {
          ctx.globalAlpha = 0.4 * alpha;
          crayonCircleCached(ctx);
          ctx.globalAlpha = 0.85 * alpha;
        }
        drawSprite(ctx, spr, -30, -6, 90, 110);
        ctx.restore();
      },
    };
    handAnim = anim;
  });
  scene.isDemoing = () => !!handAnim;
  scene.cancelHand = () => handAnim && handAnim.cancel();

  const ring = sprite('press-ring', 60, 60, (c) => crayonLine(c, [[30, 4], [52, 12], [56, 30], [52, 48], [30, 56], [8, 48], [4, 30], [8, 12]], { color: P.daidai, width: 3, closed: true, seed: 9 }));
  function crayonCircleCached(ctx) { drawSprite(ctx, ring, -30, -30, 60, 60); }

  scene.stop = () => {
    running = false;
    cancelAnimationFrame(raf);
    ro.disconnect();
    canvas.removeEventListener('pointerdown', down);
    canvas.removeEventListener('pointermove', move);
    canvas.removeEventListener('pointerup', up);
    canvas.removeEventListener('pointercancel', up);
    canvas.remove();
  };
  return scene;
}

/** 点が四角の中か */
export function hit(p, r, pad = 0) {
  return p.x >= r.x - pad && p.x <= r.x + r.w + pad && p.y >= r.y - pad && p.y <= r.y + r.h + pad;
}
/** なめらかに近づける(1 フレームぶん) */
export function approach(cur, target, rate, dt) {
  return cur + (target - cur) * (1 - Math.exp(-rate * dt));
}
export const ease = {
  inOut: (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2),
  out: (t) => 1 - Math.pow(1 - t, 3),
  back: (t) => { const c1 = 1.4, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); },
};
