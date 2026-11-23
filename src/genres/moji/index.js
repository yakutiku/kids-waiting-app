// もじと ことば — ★ なぞって かこう / ★★ おなじ おとで はじまるのは？ / ★★★ おはなしを ならべよう
// ばつ・点数・時間制限なし。合わないときは何も起きない(または そっと元にもどる)だけ。
import { P } from '../../crayon/palette.js';
import {
  sprite, drawSprite, crayonRect, crayonLine, crayonText, crayonPoly, starPts, FONT,
} from '../../crayon/crayon.js';
import { drawVehicle } from '../../crayon/vehicles.js';
import { hit, ease, approach } from '../../core/scene.js';
import { GLYPHS, GLYPH_ORDER } from './strokes.js';
import { WORDS, TRACE_WORD, head, drawArt } from './words.js';
import { STORIES, CW, CH } from './stories.js';

const shuffle = (a) => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const lerp = (a, b, k) => a + (b - a) * k;
const wordSpeak = (w) => w.ja;

// ============================================================ ★ なぞって かこう
const BOX = { cx: 500, cy: 305, s: 440 };
const TOL = 58;       // 点線からこのくらいまでは「なぞれている」
const STEP = 5;       // 点列を細かくするときの間隔(論理 px)

function catmull(pts) {
  const out = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(pts.length - 1, i + 2)];
    for (let k = 0; k < 12; k++) {
      const t = k / 12, t2 = t * t, t3 = t2 * t;
      out.push([
        0.5 * (2 * p1[0] + (-p0[0] + p2[0]) * t + (2 * p0[0] - 5 * p1[0] + 4 * p2[0] - p3[0]) * t2 + (-p0[0] + 3 * p1[0] - 3 * p2[0] + p3[0]) * t3),
        0.5 * (2 * p1[1] + (-p0[1] + p2[1]) * t + (2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) * t2 + (-p0[1] + 3 * p1[1] - 3 * p2[1] + p3[1]) * t3),
      ]);
    }
  }
  out.push(pts[pts.length - 1]);
  return out;
}
/** 画の点列(正規化)→ 論理座標の等間隔の点列 */
function buildStroke(norm) {
  const px = norm.map(([x, y]) => [BOX.cx - BOX.s / 2 + x * BOX.s, BOX.cy - BOX.s / 2 + y * BOX.s]);
  const sm = norm.length > 2 ? catmull(px) : px;
  const pts = [sm[0]];
  let acc = 0;
  for (let i = 1; i < sm.length; i++) {
    let [x0, y0] = pts[pts.length - 1];
    const [x1, y1] = sm[i];
    let d = Math.hypot(x1 - x0, y1 - y0);
    while (d + acc >= STEP) {
      const k = (STEP - acc) / d;
      x0 += (x1 - x0) * k; y0 += (y1 - y0) * k;
      pts.push([x0, y0]);
      d = Math.hypot(x1 - x0, y1 - y0); acc = 0;
    }
    acc += d;
  }
  const last = sm[sm.length - 1];
  if (Math.hypot(last[0] - pts[pts.length - 1][0], last[1] - pts[pts.length - 1][1]) > 1) pts.push(last);
  return pts;
}

function startTrace(api, scene) {
  let order = [...GLYPH_ORDER];
  let oi = 0;
  let ch, strokes, si, prog, active, trail, layer, lctx, done, rt, wordKey;

  const LS = 2;
  function newLayer() {
    layer = document.createElement('canvas');
    layer.width = 1000 * LS; layer.height = 600 * LS;
    lctx = layer.getContext('2d');
    lctx.scale(LS, LS);
  }
  function load(i) {
    ch = order[i];
    strokes = GLYPHS[ch].map(buildStroke);
    wordKey = TRACE_WORD[ch];
    si = 0; prog = 0; active = false; trail = []; done = false; rt = 0;
    newLayer();
    api.glowNext(false);
  }
  const cur = () => strokes[si];
  const headPt = () => cur()[Math.min(cur().length - 1, Math.round(prog))];
  /** 窓の範囲で p にいちばん近い点の番号 */
  function project(p) {
    const pts = cur();
    const lo = Math.max(0, Math.floor(prog) - 16), hi = Math.min(pts.length - 1, Math.floor(prog) + 60);
    let best = -1, bd = TOL;
    for (let i = lo; i <= hi; i++) {
      const d = Math.hypot(pts[i][0] - p.x, pts[i][1] - p.y);
      if (d < bd) { bd = d; best = i; }
    }
    return best;
  }
  function advance(p) {
    const i = project(p);
    if (i < 0) return;
    if (i > prog) prog = i;
    if (prog >= cur().length - 1 - 4) completeStroke();
  }
  function completeStroke() {
    const pts = cur();
    crayonLine(lctx, pts.filter((_, i) => i % 3 === 0 || i === pts.length - 1), { color: P.ao, width: 30, seed: 40 + si * 7, passes: 2, wobble: 0.5 });
    const e = pts[pts.length - 1];
    scene.sparkle(e[0], e[1], { count: 5, spread: 90 });
    api.play('pop');
    si++; prog = 0; active = false;
    if (si >= strokes.length) finish();
  }
  function finish() {
    done = true; rt = 0;
    api.markSolved();
    const w = WORDS[wordKey];
    setTimeout(() => {
      api.celebrate({ ja: 'かけたね！', en: 'You wrote it!' });
      api.play('done');
      api.speak(wordSpeak(w), w.en);
    }, 700);
  }

  scene.onPointerDown = (p) => {
    if (!p.primary || done) return;
    trail = [];
    if (project(p) >= 0) { active = true; advance(p); }
  };
  scene.onPointerMove = (p) => {
    if (!p.primary || done || !active) return;
    advance(p);
  };
  scene.onPointerUp = () => { active = false; };

  function drawGlyph(ctx, scale, cx, cy, alpha) {
    ctx.save();
    ctx.translate(cx, cy); ctx.scale(scale, scale); ctx.translate(-BOX.cx, -BOX.cy);
    ctx.globalAlpha = alpha;
    ctx.font = `bold ${Math.round(BOX.s * 0.96)}px ${FONT}`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = P.kiiro;
    ctx.fillText(ch, BOX.cx, BOX.cy);
    ctx.globalAlpha = 1;
    ctx.drawImage(layer, 0, 0, 1000, 600);
    ctx.restore();
  }
  function polyline(ctx, pts, a, b) {
    ctx.beginPath(); ctx.moveTo(pts[a][0], pts[a][1]);
    for (let i = a + 1; i <= b; i++) ctx.lineTo(pts[i][0], pts[i][1]);
    ctx.stroke();
  }

  scene.onFrame = (ctx, dt, t) => {
    if (!done) {
      drawGlyph(ctx, 1, BOX.cx, BOX.cy, 0.55);
      const pts = cur();
      ctx.save();
      ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      const pi = Math.floor(prog);
      // なぞったところ
      if (pi > 0) {
        ctx.strokeStyle = P.ao; ctx.globalAlpha = 0.5; ctx.lineWidth = 32; polyline(ctx, pts, 0, pi);
        ctx.globalAlpha = 0.9; ctx.lineWidth = 22; polyline(ctx, pts, 0, pi);
      }
      // これから なぞる点線
      ctx.strokeStyle = P.haiiro; ctx.globalAlpha = 0.9; ctx.lineWidth = 7; ctx.setLineDash([1, 15]);
      polyline(ctx, pts, pi, pts.length - 1);
      ctx.setLineDash([]);
      // 矢印(進む向き)
      const ai = Math.min(pts.length - 1, pi + 9), bi = Math.min(pts.length - 1, pi + 12);
      let dx = pts[bi][0] - pts[ai][0], dy = pts[bi][1] - pts[ai][1];
      if (Math.hypot(dx, dy) < 1) { dx = pts[pts.length - 1][0] - pts[Math.max(0, pts.length - 4)][0]; dy = pts[pts.length - 1][1] - pts[Math.max(0, pts.length - 4)][1]; }
      const ang = Math.atan2(dy, dx);
      ctx.translate(pts[ai][0], pts[ai][1]); ctx.rotate(ang);
      ctx.fillStyle = P.aka; ctx.globalAlpha = 0.95;
      ctx.beginPath(); ctx.moveTo(14, 0); ctx.lineTo(-8, -11); ctx.lineTo(-8, 11); ctx.closePath(); ctx.fill();
      ctx.restore();
      // 始点の ●
      const h = headPt();
      const pr = 17 + Math.sin(t * 3.2) * 2.5;
      ctx.save();
      ctx.fillStyle = P.aka; ctx.globalAlpha = 0.95;
      ctx.beginPath(); ctx.arc(h[0], h[1], pr, 0, 7); ctx.fill();
      ctx.strokeStyle = P.gayoshi; ctx.lineWidth = 3; ctx.stroke();
      ctx.restore();
      // 何画目か(小さな点)
      for (let i = 0; i < strokes.length; i++) {
        ctx.fillStyle = i < si ? P.ao : P.haiiro; ctx.globalAlpha = i === si ? 1 : 0.6;
        ctx.beginPath(); ctx.arc(500 + (i - (strokes.length - 1) / 2) * 34, 556, i === si ? 10 : 8, 0, 7); ctx.fill();
      }
      ctx.globalAlpha = 1;
    } else {
      rt += dt;
      const k = ease.inOut(clamp(rt / 0.9));
      drawGlyph(ctx, lerp(1, 0.46, k), lerp(BOX.cx, 190, k), lerp(BOX.cy, 300, k), lerp(0.55, 0.25, k));
      const w = WORDS[wordKey];
      const VW = 400, vx0 = 560;
      ctx.save();
      ctx.globalAlpha = clamp((rt - 0.5) * 2);
      api.drawLabel(ctx, w.ja, w.en, 700, 520, 58);
      ctx.restore();
      // 走る(入ってくる → とまる → 出ていく → もどる)
      const tt = Math.max(0, rt - 0.6) % 9;
      let x;
      if (tt < 1.8) x = lerp(-VW - 20, vx0 - 60, ease.out(tt / 1.8));
      else if (tt < 6.5) x = vx0 - 60;
      else x = lerp(vx0 - 60, 1100, ease.inOut(clamp((tt - 6.5) / 2.2)));
      const moving = tt < 1.6 || tt > 6.5;
      const bob = moving ? Math.sin(rt * 14) * 2.5 : Math.sin(rt * 2) * 1.2;
      if (rt > 0.6) drawArt(ctx, w.draw, x, 440 - VW * 0.65 + bob, VW);
    }
  };

  async function intro() {
    if (!api.firstTime('trace')) return;
    await new Promise((r) => setTimeout(r, 900));
    if (done || si > 0 || prog > 0) return;
    const pts = strokes[0];
    const steps = pts.filter((_, i) => i % 7 === 0).map((q, i) => ({ x: q[0], y: q[1], press: i === 0, wait: i === 0 ? 0.5 : 0 }));
    await scene.hand(steps, { speed: 170, pause: 0 });
  }

  load(0);
  intro();
  return {
    retry() { load(oi); },
    next() { oi = (oi + 1) % order.length; load(oi); },
    stop() { },
  };
}

// ============================================================ ★★ おなじ おとで はじまるのは？
function startQuiz(api, scene) {
  const keys = Object.keys(WORDS);
  let cards = [], letter = '', lastLetter = '', count = 0, finished = false, burst = 0;

  function newQuestion(first) {
    const heads = [...new Set(keys.map(head))].filter((h) => h !== lastLetter);
    const L = heads[Math.floor(Math.random() * heads.length)];
    lastLetter = L; letter = L;
    const seenDraw = new Set();
    const pick = (list, n) => {
      const out = [];
      for (const k of shuffle(list)) {
        if (out.length >= n) break;
        if (seenDraw.has(WORDS[k].draw)) continue;
        seenDraw.add(WORDS[k].draw); out.push(k);
      }
      return out;
    };
    const right = pick(keys.filter((k) => head(k) === L), 2);
    const total = first ? 3 : 4;
    const others = shuffle(keys.filter((k) => head(k) !== L));
    const wrong = [];
    const usedHeads = new Set([L]);
    for (const k of others) {
      if (wrong.length >= total - right.length) break;
      if (usedHeads.has(head(k)) || seenDraw.has(WORDS[k].draw)) continue;
      usedHeads.add(head(k)); seenDraw.add(WORDS[k].draw); wrong.push(k);
    }
    const deck = shuffle([...right.map((k) => ({ k, ok: true })), ...wrong.map((k) => ({ k, ok: false }))]);
    const n = deck.length, gap = 24;
    const cw = n === 3 ? 240 : 205, ch = 285;
    const x0 = (1000 - (n * cw + (n - 1) * gap)) / 2;
    cards = deck.map((d, i) => ({ ...d, x: x0 + i * (cw + gap), y: 262, w: cw, h: ch, found: false, wig: 0, pop: 0, enter: 0.5 + i * 0.1 }));
    finished = false; burst = 0;
  }

  scene.onPointerDown = (p) => {
    if (!p.primary || finished) return;
    if (Math.hypot(p.x - 500, p.y - 130) < 100) { api.speak(letter, ''); api.play('click'); return; }
    const c = cards.find((c) => c.enter <= 0 && hit(p, c, 4));
    if (!c || c.found) return;
    if (c.ok) {
      c.found = true; c.pop = 1;
      const w = WORDS[c.k];
      api.play('pop');
      scene.floatText(w.ja, w.en, c.x + c.w / 2, c.y - 6, { size: 46 });
      scene.sparkle(c.x + c.w / 2, c.y + c.h / 2, { count: 8 });
      api.speak(wordSpeak(w), w.en);
      if (cards.filter((x) => x.ok).every((x) => x.found)) {
        finished = true;
        api.markSolved();
        setTimeout(() => { api.celebrate({ ja: 'ぜんぶ みつけた！', en: 'You found them all!' }); api.play('done'); burst = 1; }, 900);
      }
    } else { c.wig = 1; api.play('back'); }
  };

  const frameSpr = (w, h) => sprite('moji-qframe', w, h, (c) => crayonRect(c, 5, 5, w - 10, h - 10, P.gayoshi, { r: 18, seed: 61 }));
  const discSpr = sprite('moji-qdisc', 230, 230, (c) => crayonPoly(c, starPts(115, 115, 106, 0.88, 14), P.kiiro, { seed: 62, width: 3 }));

  scene.onFrame = (ctx, dt, t) => {
    // もじ
    ctx.save();
    ctx.globalAlpha = 0.55;
    drawSprite(ctx, discSpr, 500 - 115, 130 - 115, 230, 230);
    ctx.restore();
    ctx.font = `bold 190px ${FONT}`;
    crayonText(ctx, letter, 500, 134, 190, { color: P.sumi });
    for (const c of cards) {
      if (c.enter > 0) c.enter = Math.max(0, c.enter - dt);
      if (c.wig > 0) c.wig = Math.max(0, c.wig - dt * 1.4);
      if (c.pop > 0) c.pop = Math.max(0, c.pop - dt * 1.2);
      const e = 1 - c.enter / 0.5;
      if (e <= 0) continue;
      const ee = ease.out(clamp(e));
      const w = WORDS[c.k];
      ctx.save();
      ctx.globalAlpha = ee;
      ctx.translate(c.x + c.w / 2, c.y + c.h / 2 + (1 - ee) * 50);
      if (c.wig > 0) ctx.rotate(Math.sin(c.wig * 16) * 0.05 * c.wig);
      const sc = 1 + (c.found ? 0.04 + Math.sin(Math.min(1, 1 - c.pop) * Math.PI) * 0.05 : 0);
      ctx.scale(sc, sc);
      if (c.found) {
        ctx.globalAlpha = ee * (0.55 + Math.sin(t * 3) * 0.1);
        ctx.fillStyle = P.kiiro;
        ctx.beginPath(); ctx.roundRect ? ctx.roundRect(-c.w / 2 - 12, -c.h / 2 - 12, c.w + 24, c.h + 24, 26) : ctx.rect(-c.w / 2 - 12, -c.h / 2 - 12, c.w + 24, c.h + 24);
        ctx.fill();
        ctx.globalAlpha = ee;
      }
      drawSprite(ctx, frameSpr(Math.round(c.w), Math.round(c.h)), -c.w / 2, -c.h / 2, c.w, c.h);
      const aw = c.w - 34;
      drawArt(ctx, w.draw, -aw / 2, -c.h / 2 + 24, aw);
      api.drawLabel(ctx, w.ja, w.en, 0, c.h / 2 - 66, Math.min(c.w > 220 ? 36 : 31, Math.floor((c.w - 14) / w.yomi.length)));
      ctx.restore();
    }
  };

  async function intro() {
    if (!api.firstTime('quiz')) return;
    await new Promise((r) => setTimeout(r, 1500));
    const c = cards.find((x) => x.ok);
    if (!c || c.found || finished) return;
    await scene.hand([
      { x: 500, y: 140, press: true, wait: 0.5 },
      { x: c.x + c.w / 2, y: c.y + c.h / 2, press: true, wait: 0.9 },
    ], { speed: 260 });
  }

  newQuestion(true); count++;
  intro();
  return {
    retry() { cards.forEach((c) => { c.found = false; c.wig = 0; c.enter = 0.3; }); finished = false; api.glowNext(false); },
    next() { count++; newQuestion(false); api.glowNext(false); },
    stop() { },
  };
}

// ============================================================ ★★★ おはなしを ならべよう
const CARD_BG = {
  road: [P.sorairo, P.haiiro], town: [P.sorairo, P.kimidori], station: [P.sorairo, P.kiiro], dirt: [P.sorairo, P.daidai],
};
function cardBg(kind) {
  return sprite('moji-cbg-' + kind, CW, CH, (c) => {
    crayonRect(c, 4, 4, CW - 8, CH - 8, P.gayoshi, { r: 14, seed: 71 });
    c.save();
    c.beginPath(); c.rect(8, 8, CW - 16, CH - 16); c.clip();
    c.globalAlpha = 0.28; c.fillStyle = CARD_BG[kind][0]; c.fillRect(0, 0, CW, 138);
    c.globalAlpha = 0.5; c.fillStyle = CARD_BG[kind][1]; c.fillRect(0, 138, CW, CH - 138);
    c.restore();
  });
}
const cardFrame = sprite('moji-cframe', CW, CH, (c) => crayonRect(c, 4, 4, CW - 8, CH - 8, null, { r: 14, seed: 72, width: 4 }));

function startStory(api, scene) {
  const order = shuffle(STORIES.map((_, i) => i));
  let oi = 0;
  let story, cards, slots, n, mode, drag, playT, finished, sorted;
  const GAP = 40, TRAY_Y = 64, SLOT_Y = 330;

  function load(i) {
    story = STORIES[i]; n = story.cards.length;
    const total = n * CW + (n - 1) * GAP, x0 = (1000 - total) / 2;
    slots = Array.from({ length: n }, (_, k) => ({ x: x0 + k * (CW + GAP), y: SLOT_Y, w: CW, h: CH, card: null }));
    const idx = shuffle([...Array(n).keys()]);
    // 最初から正解の並びにならないように
    if (idx.every((v, k) => v === k)) idx.reverse();
    cards = idx.map((v, k) => ({
      v, data: story.cards[v], hx: x0 + k * (CW + GAP), hy: TRAY_Y, x: x0 + k * (CW + GAP), y: TRAY_Y - 80, slot: -1,
      lift: 0, rate: 12, glow: 0, appear: 0.4 + k * 0.12,
    }));
    mode = 'arrange'; drag = null; playT = 0; finished = false;
    api.glowNext(false);
  }
  const cardAt = (p) => [...cards].reverse().find((c) => hit(p, { x: c.x, y: c.y, w: CW, h: CH }, 0));
  const release = (c) => { if (c.slot >= 0) { slots[c.slot].card = null; c.slot = -1; } };

  scene.onPointerDown = (p) => {
    if (!p.primary || mode !== 'arrange' || drag) return;
    const c = cardAt(p);
    if (!c || c.appear > 0) return;
    drag = { c, ox: p.x - c.x, oy: p.y - c.y };
    cards.splice(cards.indexOf(c), 1); cards.push(c);   // いちばん上に
    c.rate = 30; api.play('pick');
  };
  scene.onPointerMove = (p) => {
    if (!drag || !p.primary) return;
    drag.c.x = p.x - drag.ox; drag.c.y = p.y - drag.oy;
  };
  scene.onPointerUp = (p) => {
    if (!drag) return;
    const c = drag.c; drag = null;
    const cx = c.x + CW / 2, cy = c.y + CH / 2;
    let best = -1, bd = 150;
    slots.forEach((s, i) => { const d = Math.hypot(cx - (s.x + s.w / 2), cy - (s.y + s.h / 2)); if (d < bd) { bd = d; best = i; } });
    c.rate = 14;
    if (best < 0) {   // わくに入らない → もとの場所にそっともどる
      api.play('back');
      return;
    }
    const prevSlot = c.slot;
    const other = slots[best].card;
    if (other && other !== c) {
      // 入れかえ(前の場所が わくならそこへ、トレーならトレーへ)
      other.slot = -1; slots[best].card = null;
      if (prevSlot >= 0) { slots[prevSlot].card = other; other.slot = prevSlot; }
    }
    if (prevSlot >= 0 && slots[prevSlot].card === c) slots[prevSlot].card = null;
    slots[best].card = c; c.slot = best;
    api.play('drop');
    if (slots.every((s) => s.card)) setTimeout(playStory, 450);
  };

  function target(c) {
    return c.slot >= 0 ? { x: slots[c.slot].x, y: slots[c.slot].y } : { x: c.hx, y: c.hy };
  }
  function playStory() {
    if (mode !== 'arrange' || !slots.every((s) => s.card)) return;
    mode = 'play'; playT = 0; api.play('whoosh');
  }
  function judge() {
    const wrong = slots.filter((s, i) => s.card.v !== i);
    if (!wrong.length) {
      finished = true; mode = 'done';
      api.markSolved();
      cards.forEach((c) => scene.sparkle(c.x + CW / 2, c.y + 20, { count: 4, spread: 110 }));
      api.celebrate({ ja: 'おはなしが できたね！', en: 'The story is done!' });
      api.play('done');
    } else {
      wrong.forEach((s) => { const c = s.card; s.card = null; c.slot = -1; c.rate = 2.6; });
      api.play('back');
      mode = 'arrange';
    }
  }

  scene.onFrame = (ctx, dt, t) => {
    // 見出し
    api.drawLabel(ctx, story.title.ja, story.title.en, 500, 30, 30);
    // わく
    ctx.save();
    ctx.lineWidth = 5; ctx.setLineDash([2, 14]); ctx.lineCap = 'round'; ctx.strokeStyle = P.haiiro; ctx.globalAlpha = 0.9;
    slots.forEach((s, i) => {
      ctx.strokeRect(s.x - 6, s.y - 6, s.w + 12, s.h + 12);
    });
    ctx.restore();
    slots.forEach((s, i) => {
      crayonText(ctx, String(i + 1), s.x + s.w / 2, s.y + s.h + 36, 48, { color: P.aka });
      if (i < n - 1) {
        const ax = s.x + s.w + GAP / 2, ay = s.y + s.h / 2;
        ctx.fillStyle = P.haiiro; ctx.globalAlpha = 0.8;
        ctx.beginPath(); ctx.moveTo(ax + 11, ay); ctx.lineTo(ax - 8, ay - 14); ctx.lineTo(ax - 8, ay + 14); ctx.closePath(); ctx.fill();
        ctx.globalAlpha = 1;
      }
    });
    if (mode === 'play') {
      playT += dt;
      if (playT > n * 1.8 + 0.5) judge();
    }
    const order = mode === 'play' || mode === 'done' ? slots.map((s) => s.card).filter(Boolean) : null;
    for (const c of cards) {
      if (c.appear > 0) c.appear = Math.max(0, c.appear - dt);
      if (c !== (drag && drag.c)) {
        const tg = target(c);
        c.x = approach(c.x, tg.x, c.rate, dt); c.y = approach(c.y, tg.y, c.rate, dt);
      }
      const dragging = drag && drag.c === c;
      let a = 0.5, active = false;
      if (mode === 'play') {
        const k = order.indexOf(c);
        const lt = playT - k * 1.8;
        if (lt >= 0 && lt <= 1.6) { a = clamp(lt / 1.5); active = true; }
        else if (lt > 1.6) a = 1;
        else a = 0.5;
      } else if (mode === 'done') {
        a = 0.5 + 0.5 * Math.abs(Math.sin(t * 1.2 + order.indexOf(c) * 0.9));
      }
      c.glow = approach(c.glow, active ? 1 : 0, 10, dt);
      c.lift = approach(c.lift, dragging ? 1 : 0, 18, dt);
      const ap = 1 - c.appear / 0.4;
      if (c.appear > 0.4 && c.slot < 0) { /* まだ出てこない */ }
      ctx.save();
      ctx.globalAlpha = clamp(ap * 2 + 0.2, 0, 1);
      const sc = 1 + c.lift * 0.07 + c.glow * 0.06;
      ctx.translate(c.x + CW / 2, c.y + CH / 2 - c.lift * 6);
      ctx.scale(sc, sc);
      ctx.translate(-CW / 2, -CH / 2);
      if (c.glow > 0.02) {
        ctx.fillStyle = P.kiiro; ctx.globalAlpha *= 0.7 * c.glow;
        ctx.fillRect(-8, -8, CW + 16, CH + 16);
        ctx.globalAlpha = clamp(ap * 2 + 0.2, 0, 1);
      }
      drawSprite(ctx, cardBg(story.bg), 0, 0, CW, CH);
      ctx.save();
      ctx.beginPath(); ctx.rect(8, 8, CW - 16, CH - 16); ctx.clip();
      c.data.draw(ctx, a, t);
      ctx.restore();
      drawSprite(ctx, cardFrame, 0, 0, CW, CH);
      ctx.restore();
    }
  };

  async function intro() {
    if (!api.firstTime('story')) return;
    await new Promise((r) => setTimeout(r, 1600));
    if (mode !== 'arrange') return;
    const c = cards.find((x) => x.v === 0);
    if (!c || c.slot >= 0) return;
    await scene.hand([
      { x: c.hx + CW / 2, y: c.hy + CH / 2, press: true, wait: 0.5 },
      { x: slots[0].x + CW / 2, y: slots[0].y + CH / 2, press: true, wait: 0.6 },
    ], { speed: 230 });
  }

  load(order[0]);
  intro();
  return {
    retry() { load(order[oi]); },
    next() { oi = (oi + 1) % order.length; load(order[oi]); },
    stop() { },
  };
}

// ============================================================ ジャンル
export default {
  id: 'moji',
  title: { ja: 'もじと ことば', en: 'Letters and words' },
  drawIcon(c, s) {
    crayonText(c, 'あ', s * 0.4, s * 0.46, s * 0.78, { color: P.aka });
    drawVehicle(c, 'dump', s * 0.34, s * 0.52, s * 0.62);
  },
  levels: [{ id: '1', stars: 1 }, { id: '2', stars: 2 }, { id: '3', stars: 3 }],
  start(api) {
    const scene = api.createScene({ width: 1000, height: 600 });
    const lv = api.level.id;
    return (lv === '3' ? startStory : lv === '2' ? startQuiz : startTrace)(api, scene);
  },
};
