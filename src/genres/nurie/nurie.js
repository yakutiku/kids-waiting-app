// ぬりえ: 領域をタップして、クレヨンで塗る(はみ出さない)
import { P } from '../../crayon/palette.js';
import { crayonFill, crayonLine, sprite, drawSprite, crayonRect } from '../../crayon/crayon.js';
import { PICTURES } from './pictures.js';
import { COLORS, makeCanvas, makeToolbar, addPalette, eraserSprite } from './common.js';

let S = 3.5, OX = 98, OY = 14;                  // 絵の拡大率と置き場所(絵ごとに、カードに合わせて決める)
const PAD = 8;
const CARD = { x: 14, y: 8, w: 880, h: 470 };

function boxOf(pts) {
  let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
  for (const [x, y] of pts) { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); }
  return { x0, y0, x1, y1 };
}
function inPoly(x, y, pts) {
  let c = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const [xi, yi] = pts[i], [xj, yj] = pts[j];
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) c = !c;
  }
  return c;
}

export function nurieMode(api, scene) {
  const tb = makeToolbar();
  addPalette(tb);
  tb.add({ id: 'eraser', group: 'color', x: 906, y: 20, w: 90, h: 110, spr: eraserSprite(), dir: 'left' });
  let tool = 'aka';
  tb.select('color', tool);

  let idx = Math.max(0, Math.min(PICTURES.length - 1, api.load('nurie.idx', 0) | 0));
  let used = false, pic, fills, cache, linesCv, anim = null, celebrated = false, demo = false, wiggle = null;
  const card = sprite('nu-card', CARD.w, CARD.h, (c) => crayonRect(c, 4, 4, CARD.w - 8, CARD.h - 8, P.gayoshi, { r: 16, seed: 2, stroke: P.haiiro, width: 3 }));

  function region(ri, color) {
    const key = ri + '|' + (color || '');
    let e = cache.get(key);
    if (e) return e;
    const pts = pic.regions[ri];
    const b = boxOf(pts);
    const w = (b.x1 - b.x0) * S + PAD * 2, h = (b.y1 - b.y0) * S + PAD * 2;
    const p2 = pts.map(([x, y]) => [x * S, y * S]);
    const cv = makeCanvas(w, h, (c) => {
      c.translate(PAD - b.x0 * S, PAD - b.y0 * S);
      c.beginPath(); p2.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y))); c.closePath();
      c.fillStyle = P.gayoshi; c.fill();
      if (color) crayonFill(c, p2, P[color], { seed: ri * 11 + 3, angle: -0.6 + (ri % 4) * 0.4 });
      crayonLine(c, p2, { color: P.sumi, width: 4.5, closed: true, seed: ri * 7 + 1 });
    });
    e = { cv, x: OX + b.x0 * S - PAD, y: OY + b.y0 * S - PAD, w, h };
    cache.set(key, e);
    return e;
  }

  function loadPic(i, { speak = false } = {}) {
    idx = ((i % PICTURES.length) + PICTURES.length) % PICTURES.length;
    api.save('nurie.idx', idx);
    pic = PICTURES[idx];
    cache = new Map();
    const all = [...pic.regions.flat(), ...pic.lines.flat()].map((p) => p);
    const bb = boxOf(all);
    S = Math.min(4.4, 820 / (bb.x1 - bb.x0), 420 / (bb.y1 - bb.y0));
    OX = CARD.x + CARD.w / 2 - ((bb.x0 + bb.x1) / 2) * S;
    OY = CARD.y + CARD.h / 2 - ((bb.y0 + bb.y1) / 2) * S;
    const saved = api.load('pic.' + pic.id, null);
    fills = Array.isArray(saved) && saved.length === pic.regions.length ? saved.map((k) => (COLORS.includes(k) ? k : null)) : pic.regions.map(() => null);
    celebrated = fills.every(Boolean);
    anim = null;
    const lw = 200 * S + PAD * 2, lh = 130 * S + PAD * 2;
    linesCv = makeCanvas(lw, lh, (c) => {
      c.translate(PAD, PAD);
      pic.lines.forEach((ln, k) => crayonLine(c, ln.map(([x, y]) => [x * S, y * S]), { color: P.sumi, width: 3.5, seed: 50 + k }));
    });
    for (let r = 0; r < pic.regions.length; r++) region(r, fills[r]);
    if (speak) api.speak(pic.ja, pic.en);
  }
  function persist() { if (!demo) api.save('pic.' + pic.id, fills); }

  function paint(ri, color, x, y) {
    if (fills[ri] === color) { wiggle = { ri, t: 0 }; return; }
    anim = { ri, from: fills[ri], to: color, t: 0 };
    fills[ri] = color;
    persist();
    api.play('tap');
    if (color) scene.sparkle(x, y, { count: 3, spread: 70 });
    if (!celebrated && !demo && fills.every(Boolean)) {
      celebrated = true;
      api.markSolved();
      setTimeout(() => api.celebrate({ ja: 'きれいに ぬれたね！', en: 'Beautiful colors!' }), 450);
    }
  }
  function tap(x, y) {
    const px = (x - OX) / S, py = (y - OY) / S;
    for (let ri = pic.regions.length - 1; ri >= 0; ri--) {
      if (inPoly(px, py, pic.regions[ri])) { paint(ri, tool === 'eraser' ? null : tool, x, y); return true; }
    }
    return false;
  }
  function resetPic() { fills = pic.regions.map(() => null); anim = null; celebrated = false; api.glowNext(false); persist(); }

  scene.onPointerDown = (p) => {
    if (!p.primary) return;
    used = true;
    if (demo) { demo = false; resetPic(); }
    const it = tb.hit(p);
    if (it) { tool = it.id; tb.select('color', tool); api.play('pick'); return; }
    tap(p.x, p.y);
  };

  scene.onFrame = (ctx, dt) => {
    if (anim) { anim.t += dt / 0.35; if (anim.t >= 1) anim = null; }
    if (wiggle) { wiggle.t += dt; if (wiggle.t > 0.4) wiggle = null; }
    drawSprite(ctx, card, CARD.x, CARD.y);
    for (let ri = 0; ri < pic.regions.length; ri++) {
      const dx = wiggle && wiggle.ri === ri ? Math.sin(wiggle.t * 40) * 2 * (1 - wiggle.t / 0.4) : 0;
      if (anim && anim.ri === ri) {
        const a = region(ri, anim.from);
        ctx.drawImage(a.cv, a.x, a.y, a.w, a.h);
        const b = region(ri, anim.to);
        ctx.globalAlpha = anim.t;
        ctx.drawImage(b.cv, b.x, b.y, b.w, b.h);
        ctx.globalAlpha = 1;
      } else {
        const e = region(ri, fills[ri]);
        ctx.drawImage(e.cv, e.x + dx, e.y, e.w, e.h);
      }
    }
    ctx.drawImage(linesCv, OX - PAD, OY - PAD, 200 * S + PAD * 2, 130 * S + PAD * 2);
    tb.draw(ctx, dt);
  };

  async function intro() {
    if (!api.firstTime('nurie')) return;
    await new Promise((r) => setTimeout(r, 900));
    if (used) return;
    const cw = 1000 / 11;
    const cx = (k) => COLORS.indexOf(k) * cw + cw / 2;
    const steps = [];
    const at = (ri) => { const b = boxOf(pic.regions[ri]); return [OX + ((b.x0 + b.x1) / 2) * S, OY + ((b.y0 + b.y1) / 2) * S]; };
    const [bx, by] = at(0);
    demo = true;
    steps.push({ x: cx('aka'), y: 540, press: true, onArrive: () => { tool = 'aka'; tb.select('color', 'aka'); }, wait: 0.5 });
    steps.push({ x: bx - 60, y: by - 10, press: true, onArrive: () => tap(bx - 60, by - 10), wait: 0.9 });
    steps.push({ x: cx('kiiro'), y: 540, press: true, onArrive: () => { tool = 'kiiro'; tb.select('color', 'kiiro'); }, wait: 0.5 });
    const [wx, wy] = at(4);
    steps.push({ x: wx, y: wy, press: true, onArrive: () => tap(wx, wy), wait: 1.2 });
    await scene.hand(steps, { speed: 260 });
    if (demo) { demo = false; resetPic(); }
  }

  loadPic(idx);
  intro();
  return {
    retry() { resetPic(); api.play('whoosh'); },
    next() { loadPic(idx + 1, { speak: true }); },
    stop() { },
  };
}
