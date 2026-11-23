// おえかき: 画用紙に指でクレヨンのように描く。描いた跡は画面外のレイヤーに積み、毎フレームはそれを貼るだけ。
import { P } from '../../crayon/palette.js';
import { crayonRect, sprite, drawSprite } from '../../crayon/crayon.js';
import { makeToolbar, addPalette, eraserSprite, sizeSprite } from './common.js';

const PAPER = { x: 14, y: 8, w: 880, h: 470 };

export function oekakiMode(api, scene) {
  const tb = makeToolbar();
  addPalette(tb);
  tb.add({ id: 'thin', group: 'size', x: 906, y: 12, w: 90, h: 110, spr: sizeSprite('thin'), dir: 'left', selected: true });
  tb.add({ id: 'thick', group: 'size', x: 906, y: 132, w: 90, h: 110, spr: sizeSprite('thick'), dir: 'left' });
  tb.add({ id: 'eraser', group: 'erase', x: 906, y: 252, w: 90, h: 110, spr: eraserSprite(), dir: 'left' });
  let color = 'aka', size = 'thin', eraser = false;
  tb.select('color', color);

  const k = Math.max(1, Math.min(2, scene.scale * Math.min(2, window.devicePixelRatio || 1)));
  const mk = () => { const c = document.createElement('canvas'); c.width = Math.round(PAPER.w * k); c.height = Math.round(PAPER.h * k); return c; };
  const layer = mk();
  const lctx = layer.getContext('2d');
  lctx.scale(k, k);
  lctx.lineCap = 'round'; lctx.lineJoin = 'round';
  const card = sprite('nu-paper-card', PAPER.w, PAPER.h, (c) => crayonRect(c, 4, 4, PAPER.w - 8, PAPER.h - 8, P.gayoshi, { r: 16, seed: 2, stroke: P.haiiro, width: 3 }));

  let drawing = false, last = null, offs = [], dirty = false, saveTimer = 0, demoInk = false, touched = false;
  let flip = null, used = false;

  function newStrokeStyle() {
    const n = size === 'thick' ? 5 : 3, spread = size === 'thick' ? 6.5 : 2.4;
    offs = [];
    for (let i = 0; i < n; i++) offs.push(((i / (n - 1)) - 0.5) * 2 * spread + (Math.random() - 0.5) * 1.2);
  }
  function segment(a, b) {
    const dx = b.x - a.x, dy = b.y - a.y;
    const len = Math.hypot(dx, dy) || 0.001;
    const nx = -dy / len, ny = dx / len;
    const c = lctx;
    if (eraser) {
      c.save(); c.globalCompositeOperation = 'destination-out'; c.globalAlpha = 1; c.lineWidth = 36; c.beginPath(); c.moveTo(a.x, a.y); c.lineTo(b.x, b.y); c.stroke(); c.restore();
      return;
    }
    const w = size === 'thick' ? 17 : 7;
    c.save();
    c.strokeStyle = P[color];
    for (let i = 0; i < offs.length; i++) {
      const o = offs[i] + (Math.random() - 0.5) * 0.8;
      c.globalAlpha = 0.72 + (i % 3) * 0.1;
      c.lineWidth = w * (0.2 + Math.random() * 0.14) * (size === 'thick' ? 1.1 : 1.5);
      c.beginPath();
      c.moveTo(a.x + nx * o, a.y + ny * o);
      c.lineTo(b.x + nx * o + (Math.random() - 0.5) * 0.6, b.y + ny * o + (Math.random() - 0.5) * 0.6);
      c.stroke();
    }
    // 紙のざらつき(クレヨンがのらない小さな点)
    c.globalCompositeOperation = 'destination-out';
    const cnt = Math.min(18, Math.ceil((len * w) / 14) + 1);
    for (let i = 0; i < cnt; i++) {
      const t = Math.random(), off = (Math.random() - 0.5) * w * 1.1;
      c.globalAlpha = 0.45 + Math.random() * 0.4;
      const s = 0.8 + Math.random() * 1.8;
      c.fillRect(a.x + dx * t + nx * off, a.y + dy * t + ny * off, s, s);
    }
    c.restore();
  }
  const toLayer = (p) => ({ x: p.x - PAPER.x, y: p.y - PAPER.y });
  const inPaper = (p) => p.x >= PAPER.x - 4 && p.x <= PAPER.x + PAPER.w + 4 && p.y >= PAPER.y - 4 && p.y <= PAPER.y + PAPER.h + 4;

  function markDirty() {
    if (demoInk) return;
    dirty = true; touched = true;
    clearTimeout(saveTimer);
    saveTimer = setTimeout(saveNow, 800);
  }
  function saveNow() {
    clearTimeout(saveTimer);
    if (!dirty) return;
    dirty = false;
    try {
      const c = document.createElement('canvas');
      c.width = 620; c.height = Math.round(620 * PAPER.h / PAPER.w);
      c.getContext('2d').drawImage(layer, 0, 0, c.width, c.height);
      api.save('img', c.toDataURL('image/png'));
    } catch { }
  }
  function clearLayer() { lctx.save(); lctx.setTransform(1, 0, 0, 1, 0, 0); lctx.clearRect(0, 0, layer.width, layer.height); lctx.restore(); }
  function newPaper() {
    if (demoInk) { demoInk = false; }
    const snap = mk();
    snap.getContext('2d').drawImage(layer, 0, 0);
    clearLayer();
    clearTimeout(saveTimer); dirty = false; touched = false;
    api.save('img', null);
    flip = { t: 0, snap };
    api.play('whoosh');
  }

  scene.onPointerDown = (p) => {
    if (!p.primary) return;
    used = true;
    const it = tb.hit(p);
    if (it) {
      api.play('pick');
      if (it.group === 'color') { color = it.id; eraser = false; tb.select('color', color); tb.select('erase', null); }
      else if (it.group === 'size') { size = it.id; tb.select('size', size); }
      else if (it.id === 'eraser') { eraser = true; tb.select('erase', 'eraser'); tb.select('color', null); }
      return;
    }
    if (!inPaper(p)) return;
    if (demoInk) { clearLayer(); demoInk = false; }
    drawing = true; newStrokeStyle();
    last = toLayer(p);
    segment(last, { x: last.x + 0.1, y: last.y + 0.1 });
    markDirty();
  };
  scene.onPointerMove = (p) => {
    if (!drawing || !p.primary) return;
    const q = toLayer(p);
    if (Math.hypot(q.x - last.x, q.y - last.y) < 2.5) return;
    segment(last, q);
    last = q;
    markDirty();
  };
  scene.onPointerUp = (p) => { if (p.primary) { drawing = false; } };

  scene.onFrame = (ctx, dt) => {
    drawSprite(ctx, card, PAPER.x, PAPER.y);
    ctx.drawImage(layer, PAPER.x, PAPER.y, PAPER.w, PAPER.h);
    if (flip) {
      flip.t += dt / 0.6;
      if (flip.t >= 1) flip = null;
      else {
        const e = flip.t * flip.t * (3 - 2 * flip.t);
        ctx.save();
        ctx.translate(PAPER.x, PAPER.y + PAPER.h);
        ctx.rotate(-e * 0.5);
        ctx.translate(-e * 40, 0);
        ctx.globalAlpha = 1 - e;
        ctx.translate(0, -PAPER.h);
        drawSprite(ctx, card, 0, 0);
        ctx.drawImage(flip.snap, 0, 0, PAPER.w, PAPER.h);
        ctx.restore();
      }
    }
    tb.draw(ctx, dt);
  };

  // 続きから
  const saved = api.load('img', null);
  if (typeof saved === 'string' && saved.startsWith('data:image')) {
    const img = new Image();
    img.onload = () => { if (!touched) { lctx.drawImage(img, 0, 0, PAPER.w, PAPER.h); } };
    img.src = saved;
  }

  async function intro() {
    if (!api.firstTime('oekaki') || saved) return;
    await new Promise((r) => setTimeout(r, 900));
    if (touched || used) return;
    const cw = 1000 / 11;
    const cx = (key) => ['aka', 'daidai', 'kiiro', 'kimidori', 'midori', 'sorairo', 'ao', 'murasaki', 'chairo', 'haiiro', 'sumi'].indexOf(key) * cw + cw / 2;
    demoInk = true;
    const steps = [];
    const sel = (key) => ({ x: cx(key), y: 545, press: true, wait: 0.5, onArrive: () => { color = key; eraser = false; tb.select('color', key); tb.select('erase', null); } });
    const wave = (y0, x0) => {
      const out = []; let prev = null;
      for (let x = x0; x <= x0 + 520; x += 26) {
        const pt = { x, y: y0 + Math.sin((x - x0) / 80) * 50 };
        const a = prev;
        out.push({ ...pt, wait: 0, onArrive: () => { if (a) { if (!drawing) newStrokeStyle(); segment(toLayer(a), toLayer(pt)); } } });
        prev = pt;
      }
      out[0].wait = 0.3; out[0].onArrive = () => newStrokeStyle();
      return out;
    };
    steps.push(sel('aka'), ...wave(200, 180), sel('sorairo'), ...wave(330, 220));
    await scene.hand(steps, { speed: 330, pause: 0 });
    if (demoInk) { clearLayer(); demoInk = false; }
  }
  intro();

  return {
    retry() { newPaper(); },
    next() { newPaper(); },
    stop() { saveNow(); },
  };
}
