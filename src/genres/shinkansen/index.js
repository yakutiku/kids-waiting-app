// しんかんせんの おきゃくさん
// ★/★★: きっぷの かず(ドット)だけ おきゃくさんを ドラッグして のせる。ちょうど のると はっしゃ。
// ★★★: のりおりを みて「いま なんにん？」を えらぶ。まちがえても そっと ゆれるだけ(ばつ は出さない)。
import { P } from '../../crayon/palette.js';
import { sprite, drawSprite, crayonRect, crayonCircle, crayonPoly, crayonLine, crayonText, rectPts } from '../../crayon/crayon.js';
import { drawVehicle, drawPerson, personSprite } from '../../crayon/vehicles.js';
import { hit, ease, approach } from '../../core/scene.js';

const NUM_JA = ['', 'いち', 'に', 'さん', 'よん', 'ご', 'ろく', 'なな', 'はち', 'きゅう', 'じゅう'];
const NUM_EN = ['', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten'];

const TY = 140;          // 新幹線の上
const BODY_H = 190;
const PLATFORM_Y = 392;
const GAT = '{ガタン|がたん} {ゴトン|ごとん}';

function rnd(a, b) { return a + Math.floor(Math.random() * (b - a + 1)); }
function shuffle(a) { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
function headYOf(v) { return (v % 3 === 2 ? 30 : 8) + 22; }

// ---- 新幹線の車体レイアウト(席の数 S で変わる) ----
function layoutOf(S) {
  const big = S <= 5;
  const pitch = big ? 120 : 76, ww = big ? 100 : 62, wh = big ? 104 : 70, wy = big ? 22 : 28, x0 = 74;
  const bodyEnd = x0 + S * pitch + 8;
  const total = bodyEnd + 120;
  return { S, pitch, ww, wh, wy, x0, bodyEnd, total, stop: (1000 - total) / 2, s: ww / 62 };
}
function trainSprite(L) {
  return sprite('shk-train-' + L.S, L.total + 10, BODY_H + 30, (c) => {
    const bE = L.bodyEnd;
    // 車体
    crayonRect(c, 2, 2, bE, BODY_H - 4, P.gayoshi, { r: 22, seed: 301 });
    // 先頭のかたち
    crayonPoly(c, [[bE - 8, 4], [bE + 50, 14], [bE + 96, 70], [bE + 118, 128], [bE + 112, 170], [bE + 100, BODY_H - 4], [bE - 8, BODY_H - 4]], P.gayoshi, { seed: 302 });
    // 帯
    crayonPoly(c, [[2, 138], [bE + 108, 138], [bE + 114, 158], [2, 158]], P.midori, { seed: 303, width: 2.5 });
    crayonPoly(c, [[2, 162], [bE + 104, 162], [bE + 106, 170], [2, 170]], P.sorairo, { seed: 304, width: 2 });
    // 運転席の窓とライト
    crayonPoly(c, [[bE + 20, 24], [bE + 50, 28], [bE + 82, 70], [bE + 22, 70]], P.sorairo, { seed: 305, width: 2.5 });
    crayonCircle(c, bE + 104, 138, 7, P.kiiro, { seed: 306, width: 2 });
    // ドア
    crayonRect(c, 12, 20, 50, 112, P.kiiro, { r: 8, seed: 307, width: 3 });
    crayonLine(c, [[37, 26], [37, 126]], { width: 2.5, seed: 308, passes: 1 });
    // 窓(席)
    for (let i = 0; i < L.S; i++) {
      crayonRect(c, L.x0 + i * L.pitch + (L.pitch - L.ww) / 2, L.wy, L.ww, L.wh, P.sorairo, { r: 8, seed: 320 + i, width: 3 });
    }
    // 車両のつなぎめ
    const mid = L.x0 + Math.ceil(L.S / 2) * L.pitch + 2;
    crayonLine(c, [[mid, 10], [mid, 176]], { width: 3, seed: 309, passes: 1 });
    // 足まわり
    crayonRect(c, 14, BODY_H - 4, bE + 80, 10, P.haiiro, { seed: 310, width: 2 });
    for (let i = 0; i < 6; i++) crayonCircle(c, 50 + i * ((bE + 20) / 6), BODY_H + 14, 10, P.sumi, { seed: 311 + i, width: 2 });
  });
}
function ringSprite(w, h) {
  return sprite('shk-ring-' + w + 'x' + h, w + 16, h + 16, (c) => {
    crayonLine(c, rectPts(8, 8, w, h, 8), { color: P.daidai, width: 6, closed: true, seed: 12 });
  });
}

// ---- ドットと札 ----
function dotSprite(kind, r) {
  const col = kind === 'a' ? P.aka : kind === 'b' ? P.ao : kind === 'c' ? P.daidai : null;
  return sprite('shk-dot-' + kind + r, r * 2 + 8, r * 2 + 8, (c) => {
    if (col) crayonCircle(c, r + 4, r + 4, r, col, { seed: 21, width: 2.5 });
    else { c.globalAlpha = 0.7; crayonCircle(c, r + 4, r + 4, r, P.gayoshi, { seed: 22, width: 2.5, stroke: P.haiiro }); }
  });
}
/** 5 のまとまり(5 + あまり)で ドットの位置を返す */
function dotPos(n, pitch, rowH, wrap = true) {
  const out = [];
  const rows = wrap && n > 5 ? 2 : 1;
  for (let i = 0; i < n; i++) {
    const row = wrap ? Math.floor(i / 5) : 0, col = wrap ? i % 5 : i;
    const cols = wrap ? Math.min(5, n) : n;
    out.push({ x: (col - (cols - 1) / 2) * pitch, y: (row - (rows - 1) / 2) * rowH, row });
  }
  return out;
}
function drawDot(ctx, x, y, r, kind) { const s = dotSprite(kind, r); drawSprite(ctx, s, x - r - 4, y - r - 4, r * 2 + 8, r * 2 + 8); }

function ticketSprite(level, N, w, h) {
  return sprite('shk-ticket-' + level + '-' + N, w, h, (c) => {
    crayonRect(c, 4, 4, w - 8, h - 8, P.gayoshi, { r: 14, seed: 41, stroke: P.aka, width: 4 });
    crayonLine(c, [[14, 14], [w - 14, 14]], { color: P.aka, width: 2, seed: 42, passes: 1 });
    if (level >= 2) {
      crayonText(c, String(N), 66, h / 2 + 4, 92, { color: P.sumi });
      crayonLine(c, [[128, 24], [128, h - 24]], { color: P.haiiro, width: 2.5, seed: 43, passes: 1 });
    }
  });
}
function cardSprite(n, w, h) {
  return sprite('shk-card-' + n, w, h, (c) => {
    crayonRect(c, 4, 4, w - 8, h - 8, P.gayoshi, { r: 16, seed: 51 + n, stroke: P.ao, width: 5 });
    const pts = dotPos(n, 34, 34);
    const oy = n > 5 ? 48 : 58;
    c.save();
    c.translate(w / 2, oy);
    // ドットは 1 ぎょうめ・2 ぎょうめで いろを かえる
    for (const p of pts) { const s = dotSprite(p.row ? 'b' : 'a', 14); drawSprite(c, s, p.x - 18, p.y - 18, 36, 36); }
    c.restore();
    crayonText(c, String(n), w / 2, h - 44, 80, { color: P.sumi });
  });
}

export default {
  id: 'shinkansen',
  title: { ja: 'しんかんせんの おきゃくさん', en: 'Bullet train passengers' },
  drawIcon(c, s) {
    const k = s / 150; c.scale(k, k);
    drawVehicle(c, 'shinkansen', 4, 14, 142);
    drawVehicle(c, 'shinkansenCar', -52, 14, 100);
    drawPerson(c, 0, 22, 100, 52);
    drawPerson(c, 3, 62, 98, 54);
    drawPerson(c, 2, 102, 104, 48);
  },
  levels: [{ id: '1', stars: 1 }, { id: '2', stars: 2 }, { id: '3', stars: 3 }],

  start(api) {
    const scene = api.createScene({ width: 1000, height: 600 });
    const level = Number(api.level.id) || 1;
    const S = level === 1 ? 5 : 10;
    const L = layoutOf(S);
    const TXstop = L.stop;

    let gen = 0;                 // タイマーの世代(retry/next/stop で無効にする)
    function after(sec, fn) { const g = gen; setTimeout(() => { if (g === gen) fn(); }, sec * 1000); }

    // ---- 状態 ----
    let N = 1, people = [], seats = [], drag = null;
    let trainDX = -1100, arriveT = 0, arrived = false;
    let depart = null;           // { v }
    let finished = false;
    let lastScenario = null;
    // ★★★
    let phase = 'idle', cards = [], cardsT = 0, askShown = 0;
    let counted = new Set(), countN = 0;
    let hintSeat = -1;

    const seatRectLocal = (i) => ({ x: L.x0 + i * L.pitch + (L.pitch - L.ww) / 2, y: L.wy, w: L.ww, h: L.wh });
    const trainX = () => TXstop + trainDX;
    const seatCx = (i) => trainX() + seatRectLocal(i).x + L.ww / 2;
    const headTargetY = () => TY + L.wy + L.wh * 0.42;
    const countAboard = () => seats.filter(Boolean).length;
    const personH = (M) => (level === 1 ? 120 : 100);

    function say(n) { if (n >= 1 && n <= 10) api.speak(NUM_JA[n], NUM_EN[n]); }

    // ---- お客さん ----
    function makePerson(v, hx, hy, h) {
      return { v, hx, hy, x: hx, y: hy, h, seat: -1, pop: 1, alpha: 1, tw: null, demo: null, nohome: false };
    }
    function homeSlots(M) {
      const out = [];
      if (M <= 7) {
        const sp = Math.min(130, 860 / Math.max(1, M));
        for (let i = 0; i < M; i++) out.push({ x: 500 + (i - (M - 1) / 2) * sp, y: 530 });
      } else {
        const r1 = Math.ceil(M / 2), r2 = M - r1;
        const sp = Math.min(140, 880 / r1);
        for (let i = 0; i < r1; i++) out.push({ x: 500 + (i - (r1 - 1) / 2) * sp, y: 472 });
        for (let i = 0; i < r2; i++) out.push({ x: 500 + (i - (r2 - 1) / 2) * sp + sp * 0.04, y: 580 });
      }
      return out;
    }
    function tween(p, steps, done) { p.tw = { steps, i: 0, t: 0, x0: p.x, y0: p.y, a0: p.alpha, done }; }
    function updatePerson(p, dt) {
      if (p.tw) {
        const tw = p.tw, s = tw.steps[tw.i];
        tw.t += dt;
        const k = Math.min(1, tw.t / s.d), e = (s.ease || ease.inOut)(k);
        p.x = tw.x0 + (s.x - tw.x0) * e; p.y = tw.y0 + (s.y - tw.y0) * e;
        if (s.a != null) p.alpha = tw.a0 + (s.a - tw.a0) * e;
        if (k >= 1) {
          tw.i++; tw.t = 0; tw.x0 = s.x; tw.y0 = s.y; tw.a0 = p.alpha;
          if (tw.i >= tw.steps.length) { const d = tw.done; p.tw = null; d && d(); }
        }
      } else if (p.demo) {
        p.x = approach(p.x, p.demo.x, 9, dt); p.y = approach(p.y, p.demo.y, 9, dt);
      } else if (p.seat < 0 && !p.nohome && !(drag && drag.p === p)) {
        p.x = approach(p.x, p.hx, 11, dt); p.y = approach(p.y, p.hy, 11, dt);
      }
      if (p.pop < 1) p.pop = Math.min(1, p.pop + dt * 3.5);
    }

    // ---- のる / おりる ----
    function board(p, i, quiet) {
      seats[i] = p; p.seat = i; p.pop = 0; p.tw = null; p.demo = null;
      api.play('drop');
      const n = countAboard();
      if (!quiet) say(n);
      scene.sparkle(seatCx(i), TY + L.wy + L.wh / 2, { count: 3, spread: 70 });
    }
    function alight(p) {
      if (p.seat >= 0) {
        // まどの ところから ホームの もとの ばしょへ
        const i = p.seat;
        p.x = seatCx(i);
        p.y = headTargetY() + (100 - headYOf(p.v)) * (p.h / 100) * 0.9;
        seats[i] = null; p.seat = -1;
      }
      p.demo = null;
    }
    function nearestEmptySeat(x) {
      let best = -1, bd = 1e9;
      for (let i = 0; i < S; i++) {
        if (seats[i]) continue;
        const d = Math.abs(seatCx(i) - x);
        if (d < bd) { bd = d; best = i; }
      }
      return best;
    }
    function overTrain(x, y) {
      return x > trainX() - 30 && x < trainX() + L.total + 30 && y > TY - 30 && y < TY + BODY_H + 50;
    }

    // ---- お題 ----
    function setup(same) {
      gen++; finished = false; depart = null; drag = null; counted = new Set(); countN = 0; hintSeat = -1;
      cards = []; cardsT = 0; askShown = 0; phase = 'idle';
      seats = new Array(S).fill(null);
      trainDX = -1100; arriveT = 0; arrived = false;
      api.glowNext(false);
      if (level < 3) {
        if (!(same && lastScenario)) lastScenario = { N: rnd(1, level === 1 ? 5 : 10), prev: lastScenario && lastScenario.N };
        if (!same && lastScenario.prev === lastScenario.N) lastScenario.N = (lastScenario.N % (level === 1 ? 5 : 10)) + 1;
        N = lastScenario.N;
        const M = Math.min(12, N + 2);
        const slots = homeSlots(M);
        const vs = shuffle([0, 1, 2, 3, 4, 5, 6, 7]);
        const h = personH(M) * (M > 7 ? 1 : 1);
        people = slots.map((s, i) => makePerson(vs[i % 8], s.x, s.y, M > 7 ? 100 : 120));
        // 手前(下)の列が前に描かれるように
        phase = 'play';
        after(3.6, () => { arrived = true; });
        intro12();
      } else {
        if (!(same && lastScenario)) {
          const k = rnd(2, 8);
          const on = Math.random() < 0.5;
          const d = on ? rnd(1, Math.min(4, 10 - k)) : rnd(1, Math.min(4, k - 1));
          const seatSet = shuffle([...Array(S).keys()]);
          lastScenario = { k, on, d, seatsInit: seatSet.slice(0, k), vs: shuffle([0, 1, 2, 3, 4, 5, 6, 7]) };
        }
        const sc = lastScenario;
        N = sc.on ? sc.k + sc.d : sc.k - sc.d;
        people = [];
        sc.seatsInit.forEach((si, j) => {
          const p = makePerson(sc.vs[j % 8], 0, 0, 100 * L.s); p.nohome = true;
          seats[si] = p; p.seat = si; p.pop = 1; people.push(p);
        });
        phase = 'arrive';
        after(3.6, () => { arrived = true; runChange(sc); });
      }
    }

    // ★★★: のりおり → しつもん
    function runChange(sc) {
      phase = 'change';
      let t = 1.0;
      const seated = () => seats.map((p, i) => (p ? i : -1)).filter((i) => i >= 0);
      if (sc.on) {
        const empties = shuffle([...Array(S).keys()].filter((i) => !seats[i]));
        const slots = homeSlots(sc.d).map((s) => ({ x: s.x, y: 520 }));
        for (let j = 0; j < sc.d; j++) {
          const p = makePerson(sc.vs[(sc.k + j) % 8], slots[j].x, slots[j].y, 100 * L.s);
          p.nohome = true; p.alpha = 0; people.push(p);
          const si = empties[j];
          after(t - 0.8, () => { tween(p, [{ x: p.x, y: p.y, d: 0.5, a: 1 }]); });
          after(t, () => {
            api.play('whoosh');
            const targetFeet = headTargetY() + (100 - headYOf(p.v)) * (p.h / 100);
            tween(p, [
              { x: seatCx(si), y: p.y, d: 1.1 },
              { x: seatCx(si), y: targetFeet, d: 0.8 },
            ], () => { board(p, si, true); });
          });
          t += 2.4;
        }
      } else {
        const out = shuffle(seated()).slice(0, sc.d);
        out.forEach((si) => {
          after(t, () => {
            const p = seats[si]; if (!p) return;
            api.play('pop');
            alight(p); p.nohome = true;
            const dir = seatCx(si) < 500 ? -1 : 1;
            tween(p, [
              { x: p.x, y: 500, d: 0.9, ease: ease.out },
              { x: p.x + dir * 700, y: 500 + (dir * 10), d: 4.2, ease: (k) => k, a: 0 },
            ], () => { people = people.filter((q) => q !== p); });
          });
          t += 2.2;
        });
      }
      after(t + 0.6, () => { askQuestion(); });
    }
    function askQuestion() {
      phase = 'ask';
      const set = new Set([N]);
      const cand = shuffle([-2, -1, 1, 2, 3, -3].map((d) => N + d).filter((v) => v >= 1 && v <= 10));
      for (const v of cand) { if (set.size >= 3) break; set.add(v); }
      let ns = shuffle([...set]);
      const cw = 250, ch = 190, gap = 40, x0 = (1000 - (cw * 3 + gap * 2)) / 2;
      cards = ns.map((n, i) => ({ n, x: x0 + i * (cw + gap), y: 398, w: cw, h: ch, shake: 0, win: 0 }));
      cardsT = 0;
      if (api.firstTime('intro3')) {
        after(1.2, () => {
          const si = seats.findIndex(Boolean);
          if (si < 0 || drag) return;
          scene.hand([
            { x: seatCx(si), y: TY + L.wy + L.wh * 0.5, press: true, onArrive: () => tapSeat(si), wait: 1.2 },
          ], { speed: 300 });
        });
      }
    }

    // ---- はっしゃ ----
    function win() {
      if (finished) return;
      finished = true; phase = 'done';
      api.markSolved();
      after(0.7, () => {
        scene.floatText(GAT, 'chug chug', 500, 90, { size: 56, color: P.aka, life: 2.4 });
        api.play('train');
        depart = { v: 30 };
        api.speak('しゅっぱつ', 'all aboard');
      });
      after(1.9, () => { api.celebrate({ ja: 'しゅっぱつ しんこう！', en: 'Off we go!' }); });
    }

    // ---- ★/★★ の ひょうじ ----
    function ticketGeom() {
      return level === 1 ? { x: 24, y: 14, w: 300, h: 104, r: 22, pitch: 56, cx: 174, cy: 66 }
        : { x: 24, y: 6, w: 360, h: 130, r: 16, pitch: 40, cx: 262, cy: 70 };
    }

    // ---- 入力 ----
    function personCenter(p) { return { x: p.x, y: p.y - p.h * 0.5 }; }
    function pickPerson(pt) {
      let best = null, bd = 1e9;
      for (const p of people) {
        if (p.tw || p.demo) continue;
        let ok, c;
        if (p.seat >= 0) {
          const sx = seatCx(p.seat);
          ok = pt.x > sx - L.pitch / 2 - 17 && pt.x < sx + L.pitch / 2 + 17 && pt.y > TY - 6 && pt.y < TY + BODY_H - 30;
          c = { x: sx, y: TY + L.wy + L.wh / 2 };
        } else {
          ok = hit(pt, { x: p.x - p.h * 0.3, y: p.y - p.h, w: p.h * 0.6, h: p.h }, 30);
          c = personCenter(p);
        }
        if (!ok) continue;
        const d = Math.hypot(pt.x - c.x, pt.y - c.y);
        if (d < bd) { bd = d; best = p; }
      }
      return best;
    }
    function tapSeat(i) {
      const p = seats[i]; if (!p) return;
      if (counted.has(i)) { p.pop = 0.5; return; }
      counted.add(i); countN++;
      scene.floatText(String(countN), '', seatCx(i), TY + L.wy - 18, { size: 64, color: P.aka, life: 1.5 });
      api.play('tap'); say(countN);
      p.pop = 0.3;
      if (countN >= seats.filter(Boolean).length) after(2.2, () => { counted = new Set(); countN = 0; });
    }
    function seatAt(pt) {
      let best = -1, bd = 1e9;
      for (let i = 0; i < S; i++) {
        if (!seats[i]) continue;
        const sx = seatCx(i);
        if (pt.x > sx - L.pitch / 2 - 17 && pt.x < sx + L.pitch / 2 + 17 && pt.y > TY - 6 && pt.y < TY + BODY_H - 30) {
          const d = Math.abs(pt.x - sx); if (d < bd) { bd = d; best = i; }
        }
      }
      return best;
    }

    scene.onPointerDown = (pt) => {
      if (!pt.primary || finished || !arrived) return;
      if (level < 3) {
        if (drag) return;
        const p = pickPerson(pt);
        if (!p) return;
        const from = p.seat;
        if (from >= 0) { alight(p); p.x = pt.x; p.y = pt.y + p.h * 0.45; }
        drag = { p, ox: p.x - pt.x, oy: (from >= 0 ? 0 : -16) + (p.y - pt.y), from, sx: pt.x, sy: pt.y, moved: false };
        if (from < 0) drag.oy = p.y - pt.y - 16;
        if (from >= 0) say(countAboard());
        api.play('tap');
      } else if (phase === 'ask') {
        const c = cards.find((c) => cardsT > 0.6 && hit(pt, c, 8));
        if (c) { chooseCard(c); return; }
        const si = seatAt(pt);
        if (si >= 0) tapSeat(si);
      }
    };
    scene.onPointerMove = (pt) => {
      if (!drag || !pt.primary) return;
      drag.p.x = pt.x + drag.ox; drag.p.y = pt.y + drag.oy;
      if (Math.hypot(pt.x - drag.sx, pt.y - drag.sy) > 18) drag.moved = true;
      hintSeat = overTrain(drag.p.x, drag.p.y - drag.p.h * 0.7) ? nearestEmptySeat(drag.p.x) : -1;
    };
    scene.onPointerUp = (pt) => {
      if (!drag || !pt.primary) return;
      const { p, from, moved } = drag;
      drag = null; hintSeat = -1;
      if (finished) return;
      const hx = p.x, hy = p.y - p.h * 0.7;
      if (from >= 0 && !moved) { api.play('back'); return; }       // タップ = おりる
      if (overTrain(hx, hy)) {
        const i = nearestEmptySeat(hx);
        if (i >= 0) {
          board(p, i);
          if (countAboard() === N) win();
          return;
        }
      }
      api.play('back');
      if (from >= 0) say(countAboard());
    };

    function chooseCard(c) {
      if (c.n === N) {
        c.win = 1; say(N);
        scene.sparkle(c.x + c.w / 2, c.y + c.h / 2, { count: 10 });
        win();
      } else {
        c.shake = 1; api.play('back');
      }
    }

    // ---- 手の見本(★/★★) ----
    async function intro12() {
      if (!api.firstTime('intro' + level)) return;
      const g = gen;
      await new Promise((r) => setTimeout(r, 4200));
      if (g !== gen || drag || finished) return;
      const p = people.find((q) => q.seat < 0 && !q.tw);
      if (!p) return;
      const i = Math.floor(S / 2) - (S === 5 ? 1 : 3);
      const tx = seatCx(i), ty = TY + L.wy + L.wh * 0.5;
      const sx = p.hx, sy = p.hy - p.h * 0.5;
      const wp = [0.33, 0.66].map((k) => ({ x: sx + (tx - sx) * k, y: sy + (ty - sy) * k }));
      const move = (x, y) => () => { p.demo = { x, y: y + p.h * 0.5 }; };
      const hidden = () => { p.demo = null; };
      const ok = await scene.hand([
        { x: sx, y: sy, press: true, onArrive: move(sx, sy), wait: 0.5 },
        { x: wp[0].x, y: wp[0].y, onArrive: move(wp[0].x, wp[0].y), wait: 0 },
        { x: wp[1].x, y: wp[1].y, onArrive: move(wp[1].x, wp[1].y), wait: 0 },
        { x: tx, y: ty, press: true, onArrive: () => { p.demo = null; board(p, i, true); }, wait: 1.6 },
      ], { speed: 190 });
      if (g !== gen) return;
      hidden();
      if (p.seat >= 0) { alight(p); api.play('back'); }
    }

    // ---- 描画 ----
    function drawBackdrop(ctx) {
      const v = scene.view || { x0: 0, y0: 0, x1: 1000, y1: 600 };
      const x0 = v.x0 - 20, w = v.x1 - v.x0 + 40;
      ctx.save();
      // 線路
      ctx.globalAlpha = 0.18; ctx.fillStyle = P.chairo;
      ctx.fillRect(x0, TY + BODY_H + 22, w, PLATFORM_Y - (TY + BODY_H + 22));
      ctx.globalAlpha = 0.55; ctx.fillStyle = P.haiiro;
      ctx.fillRect(x0, TY + BODY_H + 26, w, 6);
      ctx.fillRect(x0, TY + BODY_H + 46, w, 4);
      ctx.globalAlpha = 0.4; ctx.fillStyle = P.chairo;
      for (let x = Math.floor(x0 / 44) * 44; x < x0 + w; x += 44) ctx.fillRect(x, TY + BODY_H + 24, 12, 28);
      // ホーム
      ctx.globalAlpha = 0.3; ctx.fillStyle = P.haiiro;
      ctx.fillRect(x0, PLATFORM_Y, w, Math.max(0, v.y1 - PLATFORM_Y + 20));
      ctx.globalAlpha = 0.9; ctx.fillStyle = P.kiiro;
      ctx.fillRect(x0, PLATFORM_Y, w, 8);
      ctx.globalAlpha = 0.5; ctx.fillStyle = P.sumi;
      for (let x = Math.floor(x0 / 30) * 30; x < x0 + w; x += 30) ctx.fillRect(x, PLATFORM_Y, 10, 8);
      ctx.restore();
    }

    function drawFace(ctx, p, i) {
      const r = seatRectLocal(i);
      ctx.save();
      ctx.beginPath(); ctx.rect(r.x + 3, r.y + 3, r.w - 6, r.h - 6); ctx.clip();
      const s = p.h / 100;
      const hp = ease.out(Math.min(1, p.pop));
      const bounce = counted.has(i) ? Math.sin(p.pop * Math.PI) * 4 : 0;
      const headY = r.y + r.h * 0.42 + (1 - hp) * r.h * 0.6 - bounce;
      const spr = personSprite(p.v, Math.round(100 * L.s));
      drawSprite(ctx, spr, r.x + r.w / 2 - 30 * L.s, headY - headYOf(p.v) * L.s, 60 * L.s, 100 * L.s);
      ctx.restore();
      if (counted.has(i) || hintSeat === i) {
        const rs = ringSprite(r.w + 6, r.h + 6);
        ctx.save(); if (hintSeat === i && !counted.has(i)) ctx.globalAlpha = 0.8;
        drawSprite(ctx, rs, r.x - 3 - 8, r.y - 3 - 8, r.w + 22, r.h + 22);
        ctx.restore();
      }
    }

    function drawPersonAt(ctx, p, scale = 1, shadow = false) {
      ctx.save();
      ctx.globalAlpha = Math.max(0, p.alpha);
      if (shadow) {
        ctx.globalAlpha *= 0.2; ctx.fillStyle = P.sumi;
        ctx.beginPath(); ctx.ellipse(p.x, p.y + 28, p.h * 0.28, 8, 0, 0, 7); ctx.fill();
        ctx.globalAlpha = Math.max(0, p.alpha);
      }
      ctx.translate(p.x, p.y);
      ctx.scale(scale, scale);
      drawPerson(ctx, p.v, -p.h * 0.3, -p.h, p.h);
      ctx.restore();
    }

    function drawTicket(ctx) {
      const g = ticketGeom();
      drawSprite(ctx, ticketSprite(level, N, g.w, g.h), g.x, g.y, g.w, g.h);
      const n = countAboard();
      const pts = dotPos(N, g.pitch, g.pitch * 0.92, level === 2);
      pts.forEach((q, i) => {
        const filled = i < n;
        drawDot(ctx, g.x + (level === 1 ? g.w / 2 : 128 + (g.w - 128) / 2) + q.x, g.y + g.h / 2 + q.y, g.r, filled ? (q.row ? 'b' : 'a') : 'h');
      });
      // おおすぎた ぶんは ちいさな だいだい ドット(そっと)
      if (n > N) {
        for (let j = 0; j < n - N; j++) drawDot(ctx, g.x + g.w - 26 - j * 26, g.y + g.h + 14, 10, 'c');
      }
    }

    function drawCards(ctx, dt) {
      cardsT = Math.min(1, cardsT + dt * 1.6);
      const e = ease.out(cardsT);
      for (const c of cards) {
        if (c.shake > 0) c.shake = Math.max(0, c.shake - dt * 1.8);
        const ox = Math.sin(c.shake * 22) * 7 * c.shake;
        const sc = 1 + (c.win ? 0.06 : 0);
        ctx.save();
        ctx.globalAlpha = e * (finished && !c.win ? 0.35 : 1);
        ctx.translate(c.x + c.w / 2 + ox, c.y + c.h / 2 + (1 - e) * 220);
        ctx.scale(sc, sc);
        drawSprite(ctx, cardSprite(c.n, c.w, c.h), -c.w / 2, -c.h / 2, c.w, c.h);
        ctx.restore();
      }
    }

    scene.onFrame = (ctx, dt) => {
      // 到着・発車
      if (!arrived && !depart) {
        arriveT += dt;
        trainDX = -1100 * (1 - ease.out(Math.min(1, arriveT / 3.5)));
      }
      if (depart) { depart.v += 520 * dt; trainDX += depart.v * dt; }
      for (const p of people) updatePerson(p, dt);
      drawBackdrop(ctx);

      // 新幹線 + まどのお客さん
      const moving = (!arrived && arriveT < 3.4) || depart;
      const bob = moving ? Math.sin(scene.time * 26) * 1.2 : 0;
      ctx.save();
      ctx.translate(trainX(), TY + bob);
      drawSprite(ctx, trainSprite(L), 0, 0, L.total + 10, BODY_H + 30);
      for (let i = 0; i < S; i++) if (seats[i]) drawFace(ctx, seats[i], i);
      ctx.restore();
      if (hintSeat >= 0 && !seats[hintSeat]) {
        const r = seatRectLocal(hintSeat);
        ctx.save(); ctx.globalAlpha = 0.85;
        drawSprite(ctx, ringSprite(r.w + 6, r.h + 6), trainX() + r.x - 11, TY + r.y - 11, r.w + 22, r.h + 22);
        ctx.restore();
      }

      // ホームのお客さん(手前ほど後に描く)
      const free = people.filter((p) => p.seat < 0 && !(drag && drag.p === p)).sort((a, b) => a.y - b.y);
      for (const p of free) drawPersonAt(ctx, p);
      if (drag) drawPersonAt(ctx, drag.p, 1.12, true);

      if (level < 3) drawTicket(ctx);
      else if (phase === 'ask' || phase === 'done') {
        askShown = Math.min(1, askShown + dt * 2);
        if (!depart) {
          ctx.save(); ctx.globalAlpha = askShown;
          api.drawLabel(ctx, 'いま なんにん？', 'How many people now?', 500, 52, 44);
          ctx.restore();
        }
        drawCards(ctx, dt);
      }
    };

    setup(false);

    return {
      retry() { setup(true); },
      next() { setup(false); },
      stop() { gen++; },
    };
  },
};
