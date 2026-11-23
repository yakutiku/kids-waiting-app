// せんろ つなぎ: どうぐばこの せんろを ドラッグして えきと えきを つなぐ。つながると しんかんせんが はしる。
// ばつ は出さない。あわない所に置いたら そっと もどるだけ。
import { P } from '../../crayon/palette.js';
import { sprite, drawSprite, crayonRect, crayonPoly, crayonLine, crayonCircle, ellipsePts, rectPts } from '../../crayon/crayon.js';
import { drawVehicle } from '../../crayon/vehicles.js';
import { approach, ease } from '../../core/scene.js';
import { LEVELS } from './levels.js';
import { DV, opp, parseProblem, trace, solve } from './logic.js';

const TOOL_SZ = 100;     // どうぐばこの中の部品の大きさ
const SLOT_W = 112;
const TRAY_Y = 466, TRAY_H = 126, TOOL_Y = TRAY_Y + TRAY_H / 2;
const BOARD_AREA = { y0: 12, y1: 452 };
const PIECE_SPR = 140;

// ---------- 絵 ----------
function drawTrackInto(c, type, N) {
  const L = N * 0.27, R = N * 0.15;           // まくらぎの はんぶんの長さ / レールのはば
  if (type === 's') {
    for (let i = 0; i < 5; i++) {
      const x = N * (0.1 + 0.2 * i);
      crayonLine(c, [[x, N * 0.5 - L], [x, N * 0.5 + L]], { color: P.chairo, width: N * 0.085, seed: 40 + i, passes: 1 });
    }
    crayonLine(c, [[0, N * 0.5 - R], [N, N * 0.5 - R]], { color: P.haiiro, width: N * 0.055, seed: 51 });
    crayonLine(c, [[0, N * 0.5 + R], [N, N * 0.5 + R]], { color: P.haiiro, width: N * 0.055, seed: 52 });
  } else {
    const M = N / 2;
    const arc = (r, a0, a1, n = 12) => Array.from({ length: n + 1 }, (_, i) => {
      const a = a0 + (a1 - a0) * (i / n);
      return [N + Math.cos(a) * r, Math.sin(a) * r];
    });
    for (let i = 0; i < 5; i++) {
      const a = Math.PI / 2 + (i + 0.5) / 5 * (Math.PI / 2);
      crayonLine(c, [[N + Math.cos(a) * (M - L), Math.sin(a) * (M - L)], [N + Math.cos(a) * (M + L), Math.sin(a) * (M + L)]], { color: P.chairo, width: N * 0.085, seed: 60 + i, passes: 1 });
    }
    crayonLine(c, arc(M - R, Math.PI, Math.PI / 2), { color: P.haiiro, width: N * 0.055, seed: 71 });
    crayonLine(c, arc(M + R, Math.PI, Math.PI / 2), { color: P.haiiro, width: N * 0.055, seed: 72 });
  }
}
function trackSprite(type, N, plate) {
  return sprite(`senro-trk-${type}-${plate ? 'p' : 'f'}`, N, N, (c) => {
    if (plate) crayonRect(c, 3, 3, N - 6, N - 6, P.gayoshi, { r: 12, seed: 17, stroke: P.chairo, width: 3 });
    drawTrackInto(c, type, N);
  });
}
function stationSprite(kind, N) {   // 出口は ひがし向き(右)
  return sprite('senro-station-' + kind, N, N, (c) => {
    crayonRect(c, 0.06 * N, 0.05 * N, 0.58 * N, 0.3 * N, P.gayoshi, { r: 6, seed: 81, stroke: P.chairo, width: 3 });
    crayonPoly(c, [[0.02 * N, 0.17 * N], [0.35 * N, -0.0 * N], [0.68 * N, 0.17 * N]], P.aka, { seed: 82, width: 3 });
    crayonRect(c, 0.14 * N, 0.2 * N, 0.12 * N, 0.15 * N, P.chairo, { r: 3, seed: 83, width: 2 });
    crayonRect(c, 0.42 * N, 0.2 * N, 0.13 * N, 0.1 * N, P.sorairo, { r: 3, seed: 84, width: 2 });
    // 旗
    crayonLine(c, [[0.84 * N, 0.4 * N], [0.84 * N, 0.04 * N]], { color: P.sumi, width: 3, seed: 85, passes: 1 });
    crayonPoly(c, [[0.84 * N, 0.05 * N], [0.62 * N, 0.13 * N], [0.84 * N, 0.21 * N]].reverse(), kind === 'start' ? P.midori : P.kiiro, { seed: 86, width: 2 });
    // 線路(中心から出口まで)
    for (let i = 0; i < 5; i++) {
      const x = N * (0.1 + 0.2 * i);
      crayonLine(c, [[x, N * 0.5 - N * 0.27], [x, N * 0.5 + N * 0.27]], { color: P.chairo, width: N * 0.085, seed: 90 + i, passes: 1 });
    }
    crayonLine(c, [[0.1 * N, N * 0.35], [N, N * 0.35]], { color: P.haiiro, width: N * 0.055, seed: 93 });
    crayonLine(c, [[0.1 * N, N * 0.65], [N, N * 0.65]], { color: P.haiiro, width: N * 0.055, seed: 94 });
  });
}
function drawRot(c, spr, cx, cy, size, quarter) {
  c.save();
  c.translate(cx, cy);
  c.rotate(quarter * Math.PI / 2);
  c.drawImage(spr, -size / 2, -size / 2, size, size);
  c.restore();
}
function drawDeco(c, deco, x, y, C, seed) {
  if (deco === 'tree') {
    crayonRect(c, x + C * 0.44, y + C * 0.5, C * 0.12, C * 0.36, P.chairo, { seed, width: 2.5 });
    crayonCircle(c, x + C * 0.5, y + C * 0.38, C * 0.27, P.midori, { seed: seed + 1, width: 3 });
    crayonCircle(c, x + C * 0.34, y + C * 0.52, C * 0.16, P.midori, { seed: seed + 2, width: 2.5 });
    crayonCircle(c, x + C * 0.66, y + C * 0.52, C * 0.16, P.midori, { seed: seed + 3, width: 2.5 });
  } else if (deco === 'mountain') {
    crayonPoly(c, [[x + C * 0.08, y + C * 0.86], [x + C * 0.5, y + C * 0.14], [x + C * 0.92, y + C * 0.86]], P.haiiro, { seed, width: 3.5 });
    crayonPoly(c, [[x + C * 0.38, y + C * 0.34], [x + C * 0.5, y + C * 0.14], [x + C * 0.62, y + C * 0.34], [x + C * 0.5, y + C * 0.3]], P.gayoshi, { seed: seed + 1, width: 2 });
  } else {
    crayonPoly(c, ellipsePts(x + C * 0.5, y + C * 0.54, C * 0.38, C * 0.27, 20), P.sorairo, { seed, width: 3.5 });
    crayonLine(c, [[x + C * 0.3, y + C * 0.5], [x + C * 0.42, y + C * 0.46]], { color: P.gayoshi, width: 3, seed: seed + 1, passes: 1 });
  }
}
function boardSprite(key, Pb, C) {
  const W = Pb.cols * C, H = Pb.rows * C;
  return sprite(key, W, H, (c) => {
    Pb.grid.forEach((row, r) => row.forEach((cell, col) => {
      const x = col * C, y = r * C, seed = 100 + r * 13 + col * 7;
      crayonRect(c, x, y, C, C, P.kimidori, { seed, outline: false });
      if ((r + col) % 2) { c.save(); c.globalAlpha = 0.2; c.fillStyle = P.midori; c.fillRect(x, y, C, C); c.restore(); }
    }));
    Pb.grid.forEach((row, r) => row.forEach((cell, col) => {
      const x = col * C, y = r * C, seed = 300 + r * 11 + col * 5;
      if (cell.k === 'empty') crayonLine(c, rectPts(x + 7, y + 7, C - 14, C - 14, 10), { color: P.gayoshi, width: 3, closed: true, seed });
      else if (cell.k === 'block') drawDeco(c, cell.deco, x, y, C, seed);
      else if (cell.k === 'fixed') drawRot(c, trackSprite(cell.type, C, false), x + C / 2, y + C / 2, C, cell.rot);
      else if (cell.k === 'start' || cell.k === 'goal') drawRot(c, stationSprite(cell.k, C), x + C / 2, y + C / 2, C, cell.dir - 1);
    }));
    crayonLine(c, rectPts(0, 0, W, H), { color: P.chairo, width: 7, closed: true, seed: 5 });
  });
}
const traySprite = () => sprite('senro-tray', 960, TRAY_H, (c, w, h) => {
  crayonRect(c, 4, 4, w - 8, h - 8, P.kiiro, { r: 18, seed: 9, stroke: P.chairo, width: 5 });
});

// ---------- ジャンル ----------
export default {
  id: 'senro',
  title: { ja: 'せんろ つなぎ', en: 'Connect the tracks' },
  drawIcon(c, s) {
    const k = s / 150; c.scale(k, k);
    crayonRect(c, 8, 20, 134, 110, P.kimidori, { r: 14, seed: 3, stroke: P.chairo, width: 4 });
    // まっすぐ + カーブ
    c.save(); c.translate(8, 36); drawTrackInto(c, 's', 66); c.restore();
    c.save(); c.translate(74, 36); c.drawImage(trackSprite('c', 66, false), 0, 0, 66, 66); c.restore();
    c.save(); c.translate(74, 36); c.translate(33, 33); c.rotate(Math.PI / 2); c.drawImage(trackSprite('c', 66, false), -33, -33, 66, 66); c.restore();
    c.save(); c.translate(74, 98); drawTrackInto(c, 's', 66); c.restore();
    drawVehicle(c, 'shinkansen', 16, 22, 60);
  },
  levels: [{ id: '1', stars: 1 }, { id: '2', stars: 2 }, { id: '3', stars: 3 }],

  start(api) {
    const scene = api.createScene({ width: 1000, height: 600 });
    const lvId = String(api.level.id);
    const list = LEVELS[lvId] || LEVELS[1];
    const idxKey = 'idx' + lvId;
    let idx = (Number(api.load(idxKey, 0)) || 0) % list.length;
    const timers = new Set();
    const later = (fn, ms) => { const t = setTimeout(() => { timers.delete(t); fn(); }, ms); timers.add(t); };

    let Pb, C, bx0, by0, boardSpr, trayHome;
    let pieces = [], occ = [];
    let drag = null, state = 'play', demo = null;
    let run = null, hint = null, waitT = 0, gen = 0, touched = false;

    const cellCenter = (c, r) => [bx0 + (c + 0.5) * C, by0 + (r + 0.5) * C];

    function load() {
      gen++;
      clearTimers();
      scene.cancelHand();
      touched = false;
      demo = null; drag = null; run = null; state = 'play';
      api.glowNext(false);
      Pb = parseProblem(list[idx]);
      C = Math.min(140, Math.floor((BOARD_AREA.y1 - BOARD_AREA.y0) / Pb.rows), Math.floor(980 / Pb.cols));
      bx0 = (1000 - Pb.cols * C) / 2;
      by0 = BOARD_AREA.y0 + (BOARD_AREA.y1 - BOARD_AREA.y0 - Pb.rows * C) / 2;
      boardSpr = boardSprite(`senro-board-${lvId}-${idx}`, Pb, C);
      occ = Pb.grid.map((row) => row.map(() => null));
      const n = Pb.tools.length;
      const slotW = Math.min(SLOT_W + 10, 900 / n);
      const tx0 = (1000 - n * slotW) / 2;
      trayHome = (i) => [tx0 + (i + 0.5) * slotW, TOOL_Y];
      pieces = Pb.tools.map((t, i) => {
        const [x, y] = trayHome(i);
        return { id: i, type: t.type, rot: t.rot, rot0: t.rot, ang: t.rot * Math.PI / 2, where: 'tool', cell: null, x, y: y + 60, tx: x, ty: y, sz: TOOL_SZ, tsz: TOOL_SZ, appear: 0.15 + i * 0.07 };
      });
    }
    function clearTimers() { for (const t of timers) clearTimeout(t); timers.clear(); }

    function goHome(p) {
      if (p.cell) { occ[p.cell.r][p.cell.c] = null; p.cell = null; }
      p.where = 'tool';
      const [x, y] = trayHome(p.id);
      p.tx = x; p.ty = y; p.tsz = TOOL_SZ;
    }
    function putOn(p, c, r) {
      if (p.cell) occ[p.cell.r][p.cell.c] = null;
      p.where = 'board'; p.cell = { c, r }; occ[r][c] = p;
      const [x, y] = cellCenter(c, r);
      p.tx = x; p.ty = y; p.tsz = C;
    }

    // ---------- つながり ----------
    function check() {
      const t = trace(Pb, (c, r) => occ[r][c]);
      if (!t.ok) return;
      state = 'wait'; waitT = 0.9; run = { cells: t.cells };
    }
    function buildPath(cells) {
      const pts = [];
      const push = (x, y) => pts.push([x, y]);
      const mid = (cx, cy, d) => [cx + DV[d][0] * C / 2, cy + DV[d][1] * C / 2];
      cells.forEach((cell) => {
        const [cx, cy] = cellCenter(cell.c, cell.r);
        const line = (a, b) => { const n = Math.max(1, Math.round(Math.hypot(b[0] - a[0], b[1] - a[1]) / 3)); for (let i = 0; i < n; i++) push(a[0] + (b[0] - a[0]) * i / n, a[1] + (b[1] - a[1]) * i / n); };
        if (cell.type === 'start') line([cx, cy], mid(cx, cy, cell.outDir));
        else if (cell.type === 'goal') { line(mid(cx, cy, opp(cell.inDir)), [cx, cy]); push(cx, cy); }
        else {
          const a = opp(cell.inDir), b = cell.outDir;
          if (cell.type === 's') line(mid(cx, cy, a), mid(cx, cy, b));
          else {
            const kx = cx + (DV[a][0] + DV[b][0]) * C / 2, ky = cy + (DV[a][1] + DV[b][1]) * C / 2;
            const pa = mid(cx, cy, a), pb = mid(cx, cy, b);
            const a0 = Math.atan2(pa[1] - ky, pa[0] - kx);
            let d = Math.atan2(pb[1] - ky, pb[0] - kx) - a0;
            while (d > Math.PI) d -= 2 * Math.PI;
            while (d < -Math.PI) d += 2 * Math.PI;
            const n = 16;
            for (let i = 0; i < n; i++) push(kx + Math.cos(a0 + d * i / n) * C / 2, ky + Math.sin(a0 + d * i / n) * C / 2);
          }
        }
      });
      const cum = [0];
      for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
      return { pts, cum, total: cum[cum.length - 1] };
    }
    function startRun() {
      const path = buildPath(run.cells);
      run.path = path; run.s = 0; run.v = 0; run.j = 0; run.t = 0; state = 'run';
      api.play('train');
      const [sx, sy] = cellCenter(Pb.start.c, Pb.start.r);
      scene.floatText('ガタンゴトン', 'chugga chugga', sx + 40, sy - C * 0.6, { size: 38, life: 2 });
    }
    function trainPose(path, s) {
      const { pts, cum } = path;
      let j = 0;
      while (j < pts.length - 2 && cum[j + 1] < s) j++;
      const k = (s - cum[j]) / Math.max(1e-6, cum[j + 1] - cum[j]);
      const x = pts[j][0] + (pts[j + 1][0] - pts[j][0]) * k, y = pts[j][1] + (pts[j + 1][1] - pts[j][1]) * k;
      const a = pts[Math.max(0, j - 3)], b = pts[Math.min(pts.length - 1, j + 4)];
      return { x, y, h: Math.atan2(b[1] - a[1], b[0] - a[0]) };
    }
    function drawTrain(ctx, x, y, h) {
      const w = Math.round(C * 0.95), vh = w * 0.65;
      const sy = Math.cos(h) < -0.05 ? -1 : 1;   // 左向きのときは上下を返して車輪を下に
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(h);
      ctx.scale(1, sy);
      drawVehicle(ctx, 'shinkansen', -w / 2, -vh + 22, w);
      ctx.restore();
    }

    // ---------- 操作 ----------
    function findPiece(p) {
      let best = null, bd = 1e9;
      for (const q of pieces) {
        if (q.appear > 0) continue;
        const half = Math.max(q.sz, 110) / 2 + 4;
        if (Math.abs(p.x - q.x) <= half && Math.abs(p.y - q.y) <= half) {
          const d = Math.hypot(p.x - q.x, p.y - q.y);
          if (d < bd) { bd = d; best = q; }
        }
      }
      return best;
    }
    function abortDemo() {
      if (!demo) return;
      const d = demo; demo = null;
      clearTimers();
      d.piece.rot = d.piece.rot0; d.piece.ang = d.piece.rot * Math.PI / 2;
      goHome(d.piece);
      const [x, y] = trayHome(d.piece.id); d.piece.x = x; d.piece.y = y; d.piece.sz = TOOL_SZ;
    }
    scene.onPointerDown = (p) => {
      if (!p.primary) return;
      touched = true;
      abortDemo();
      if (state !== 'play' || drag) return;
      const q = findPiece(p);
      if (!q) return;
      pieces.splice(pieces.indexOf(q), 1); pieces.push(q);   // 手前に
      drag = { q, ox: p.x - q.x, oy: p.y - q.y, sx: p.x, sy: p.y, moved: false, from: q.where === 'board' ? { ...q.cell } : null };
      api.play('tap');
    };
    scene.onPointerMove = (p) => {
      if (!drag || !p.primary) return;
      const q = drag.q;
      if (!drag.moved && Math.hypot(p.x - drag.sx, p.y - drag.sy) > 14) {
        drag.moved = true;
        if (q.cell) { occ[q.cell.r][q.cell.c] = null; q.cell = null; q.where = 'hold'; }
        else q.where = 'hold';
        q.tsz = C * 1.06; api.play('pick');
      }
      if (drag.moved) { q.x = q.tx = p.x - drag.ox; q.y = q.ty = p.y - drag.oy; hint = cellAt(q.x, q.y); }
    };
    function cellAt(x, y) {
      const c = Math.floor((x - bx0) / C), r = Math.floor((y - by0) / C);
      if (c < 0 || r < 0 || c >= Pb.cols || r >= Pb.rows) return null;
      return { c, r };
    }
    scene.onPointerUp = (p) => {
      if (!drag || !p.primary) return;
      const { q, moved, from } = drag; drag = null; hint = null;
      if (!moved) {                       // タップ: 90 度まわす
        q.rot++; api.play('click');
        if (q.where === 'board') check();
        return;
      }
      const cell = cellAt(q.x, q.y);
      if (cell && Pb.grid[cell.r][cell.c].k === 'empty' && !occ[cell.r][cell.c]) {
        putOn(q, cell.c, cell.r); api.play('drop');
        const [x, y] = cellCenter(cell.c, cell.r); scene.sparkle(x, y, { count: 3, spread: 70 });
        check();
      } else if (!cell && q.y > BOARD_AREA.y1 - 20) {   // どうぐばこへ もどす
        goHome(q); api.play('drop');
      } else if (cell && from) {          // あわない所: もとの場所へ
        putOn(q, from.c, from.r); api.play('back');
      } else { goHome(q); api.play('back'); }
    };

    // ---------- 毎フレーム ----------
    scene.onFrame = (ctx, dt) => {
      drawSprite(ctx, boardSpr, bx0, by0);
      drawSprite(ctx, traySprite(), 20, TRAY_Y);
      if (hint && drag && drag.moved) {
        const g = Pb.grid[hint.r][hint.c];
        if (g.k === 'empty' && !occ[hint.r][hint.c]) {
          ctx.save(); ctx.globalAlpha = 0.5; ctx.fillStyle = P.kiiro;
          ctx.fillRect(bx0 + hint.c * C + 5, by0 + hint.r * C + 5, C - 10, C - 10); ctx.restore();
        }
      }
      // 部品
      for (const q of pieces) {
        if (q.appear > 0) { q.appear -= dt; continue; }
        const held = drag && drag.q === q && drag.moved;
        if (!held) {
          const rate = demo && demo.piece === q ? 2.6 : 14;
          q.x = approach(q.x, q.tx, rate, dt); q.y = approach(q.y, q.ty, rate, dt);
        }
        q.sz = approach(q.sz, q.tsz, 16, dt);
        q.ang = approach(q.ang, q.rot * Math.PI / 2, 13, dt);
      }
      for (const q of pieces) {
        if (q.appear > 0) continue;
        const held = drag && drag.q === q && drag.moved;
        ctx.save();
        ctx.translate(q.x, q.y);
        if (held) { ctx.globalAlpha = 0.22; ctx.fillStyle = P.sumi; ctx.fillRect(-q.sz / 2 + 7, -q.sz / 2 + 10, q.sz - 8, q.sz - 8); ctx.globalAlpha = 1; }
        ctx.rotate(q.ang);
        drawSprite(ctx, trackSprite(q.type, PIECE_SPR, true), -q.sz / 2, -q.sz / 2, q.sz, q.sz);
        ctx.restore();
      }
      // 列車
      if (state === 'wait') {
        waitT -= dt;
        if (waitT <= 0) startRun();
      }
      if (state === 'run' || state === 'done') {
        const path = run.path;
        if (state === 'run') {
          run.t += dt;
          const remain = path.total - run.s;
          const target = C * 2.6 * Math.min(1, run.t / 0.9, remain / (C * 0.9) + 0.12);
          run.v = approach(run.v, target, 6, dt);
          run.s = Math.min(path.total, run.s + run.v * dt);
          if (run.s >= path.total - 0.5) {
            state = 'done';
            api.play('done'); api.markSolved();
            api.save(idxKey, (idx + 1) % list.length);
            const [gx, gy] = cellCenter(Pb.goal.c, Pb.goal.r);
            scene.sparkle(gx, gy, { count: 12 });
            api.celebrate({ ja: 'とうちゃく！', en: 'We arrived!' });
          }
        }
        const t = trainPose(path, run.s);
        drawTrain(ctx, t.x, t.y, t.h);
      } else {
        const [sx, sy] = cellCenter(Pb.start.c, Pb.start.r);
        drawTrain(ctx, sx, sy, Math.atan2(DV[Pb.start.dir][1], DV[Pb.start.dir][0]));
      }
    };

    // ---------- はじめて: 手で見せる ----------
    async function intro() {
      if (!api.firstTime()) return;
      const g = gen;
      await new Promise((r) => later(r, 1500));
      if (g !== gen || state !== 'play' || touched || drag) return;
      const sol = solve(Pb);
      if (!sol) return;
      const tr = trace(Pb, (c, r) => sol.placed.get(c + ',' + r) || null);
      const first = tr.cells.find((x) => Pb.grid[x.r][x.c].k === 'empty');
      if (!first) return;
      const want = sol.placed.get(first.c + ',' + first.r);
      const free = pieces.filter((p) => p.where === 'tool');
      const q = free.find((p) => p.type === want.type && p.rot % 4 === want.rot) || free.find((p) => p.type === want.type);
      if (!q) return;
      const turns = (want.rot - q.rot + 4) % 4;
      const [tx, ty] = cellCenter(first.c, first.r);
      demo = { piece: q };
      pieces.splice(pieces.indexOf(q), 1); pieces.push(q);
      const steps = [
        { x: q.x, y: q.y, press: true, onArrive: () => { if (demo) { demo.piece.where = 'hold'; demo.piece.tx = tx; demo.piece.ty = ty; demo.piece.tsz = C; } }, wait: 0.2 },
        { x: tx, y: ty, press: true, onArrive: () => { if (demo) putOn(q, first.c, first.r); }, wait: 0.9 },
      ];
      for (let i = 0; i < turns; i++) steps.push({ x: tx, y: ty, press: true, onArrive: () => { if (demo) { q.rot++; api.play('click'); } }, wait: 0.9 });
      const ok = await scene.hand(steps, { speed: 230, pause: 0.5 });
      if (ok && demo && g === gen) {
        later(() => { if (demo && g === gen) { const d = demo; demo = null; d.piece.rot = d.piece.rot0; goHome(d.piece); } }, 1000);
      }
    }

    load();
    intro();

    return {
      retry() { load(); },
      next() { idx = (idx + 1) % list.length; api.save(idxKey, idx); load(); },
      stop() { gen++; clearTimers(); },
    };
  },
};
