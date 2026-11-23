// ころころそうち(ピタゴラ風)
// 部品を どうぐばこ から置いて「スタート」。うまくいかなければ置き直して もう一度(自己訂正)。
import { P } from '../../crayon/palette.js';
import { sprite, drawSprite, crayonRect, crayonPoly, crayonLine, crayonCircle, starPts } from '../../crayon/crayon.js';
import { drawVehicle } from '../../crayon/vehicles.js';
import { hit } from '../../core/scene.js';
import { createWorld, advance, FIELD } from './physics.js';
import { buildPart, buildField, partHit, clampPart, drawPart, drawToolIcon, RAMP_ANGLES, RAMP_LEN, PART_NAMES } from './parts.js';
import { PUZZLES } from './puzzles.js';
import { loadMatter, buildMatterWorld, advanceMatter } from './physics-matter.js';
import { settings } from '../../core/settings.js';

const TOOLBOX_X = 856;
const SLOT = { x: 864, w: 128, h: 112 };
const START_BTN = { x: 864, y: 478, w: 128, h: 112 };
const FREE_TYPES = ['ballS', 'ballB', 'ramp', 'domino', 'seesaw', 'spring', 'conveyor', 'dump', 'goal'];
const D2R = Math.PI / 180;

const clone = (o) => JSON.parse(JSON.stringify(o, (k, v) => (k.startsWith('_') ? undefined : v)));

function rampEnds(p) {
  const a = (p.angle || 0) * D2R, l = (p.len || RAMP_LEN) / 2;
  return [[p.x - Math.cos(a) * l, p.y - Math.sin(a) * l], [p.x + Math.cos(a) * l, p.y + Math.sin(a) * l]];
}
function wallEnds(p) {
  if (p.type === 'wall') return [[p.x1, p.y1], [p.x2, p.y2]];
  if (p.type === 'ramp') return rampEnds(p);
  return [];
}

export default {
  id: 'korokoro',
  title: { ja: 'ころころ そうち', en: 'Rolling machine' },
  supportsRealPhysics: true, // 保護者設定「リアルなうごき」で Matter.js 版を選べる(仕様書 5-1 案B)
  drawIcon(c, s) {
    const k = s / 150; c.scale(k, k);
    crayonPoly(c, [[10, 50], [90, 80], [90, 92], [10, 62]], P.chairo, { seed: 1 });
    crayonCircle(c, 30, 38, 14, P.aka, { seed: 2 });
    [100, 116, 132].forEach((x, i) => crayonRect(c, x, 96 - (i === 2 ? 0 : 0), 9, 44, [P.kiiro, P.midori, P.ao][i], { seed: 3 + i, width: 2 }));
    crayonPoly(c, [[8, 138], [142, 138], [142, 144], [8, 144]], P.kimidori, { seed: 7, width: 2 });
  },
  get levels() {
    const lv = [
      { id: '1', stars: 1 }, { id: '2', stars: 2 }, { id: '3', stars: 3 },
      {
        id: 'free', ja: 'じゆうに つくる', en: 'Free build',
        drawIcon(c, s) {
          const k = s / 64; c.scale(k, k);
          crayonPoly(c, starPts(32, 32, 26), P.daidai, { seed: 9, width: 2 });
        },
      },
    ];
    if (settings.get('realPhysics')) {
      lv.push({
        id: 'real', ja: 'リアルな うごき', en: 'Real physics',
        drawIcon(c, s) {
          const k = s / 64; c.scale(k, k);
          crayonCircle(c, 32, 32, 22, P.ao, { seed: 10 });
          crayonPoly(c, starPts(32, 32, 10), P.kiiro, { seed: 11, width: 1.5 });
        },
      });
    }
    return lv;
  },

  start(api) {
    const scene = api.createScene({ width: 1000, height: 600 });
    const real = api.level.id === 'real';
    const free = api.level.id === 'free' || real;
    let Matter = null;
    if (real) loadMatter().then((M) => { Matter = M; }).catch(() => { });
    const puzzles = free ? null : PUZZLES[api.level.id] || PUZZLES[1];
    let pIdx = free ? 0 : api.load('idx' + api.level.id, 0) % puzzles.length;

    let fixed = [];       // 動かせない部品
    let placed = [];      // 子どもが置いた部品
    let tools = [];       // どうぐばこ [{type, angle, speed, ..., used}]
    let freePage = 0;
    let mode = 'edit';    // 'edit' | 'run'
    let world = null;
    let runParts = null;
    let drag = null;      // { part, from: 'tool'|'field', toolIdx, dx, dy, startX, startY, moved, orig }
    let goalAnim = null;  // { t }
    let runs = 0;         // スタートを押した回数(ヒント用)
    let settledGlow = 0;
    let hitCooldown = 0;
    let solvedThis = false;

    function setupPuzzle() {
      mode = 'edit'; world = null; runParts = null; goalAnim = null; runs = 0; solvedThis = false; settledGlow = 0;
      api.glowNext(false);
      if (free) {
        const savedFree = api.load('free', null);
        fixed = [];
        placed = savedFree && savedFree.length ? savedFree : [
          { type: 'ballS', x: 80, y: 80 },
          { type: 'ramp', x: 160, y: 160, angle: 15 },
          { type: 'goal', x: 740, y: 560 },
        ];
        tools = FREE_TYPES.map((type) => ({ type, angle: type === 'ramp' ? 15 : undefined, infinite: true }));
      } else {
        const pz = puzzles[pIdx];
        fixed = clone(pz.fixed).map((p) => ({ ...p, fixed: true }));
        placed = [];
        tools = clone(pz.tools).map((t) => ({ ...t, used: false }));
      }
    }
    function saveFree() { if (free) api.save('free', placed.map(clone)); }

    // ---------- どうぐばこ ----------
    function visibleSlots() {
      if (!free) return tools.map((t, i) => ({ t, i, rect: { x: SLOT.x, y: 14 + i * 124, w: SLOT.w, h: SLOT.h } }));
      const per = 3;
      const start = freePage * per;
      return tools.slice(start, start + per).map((t, j) => ({ t, i: start + j, rect: { x: SLOT.x, y: 14 + j * 118, w: SLOT.w, h: SLOT.h - 6 } }));
    }
    const PAGE_BTN = { x: SLOT.x, y: 370, w: SLOT.w, h: 96 };

    function makePart(tool, x, y) {
      const p = { type: tool.type, x, y };
      if (tool.type === 'ramp') p.angle = tool.angle ?? 0;
      if (tool.type === 'conveyor') p.speed = tool.speed ?? 240;
      if (tool.type === 'dump') { p.dir = tool.dir ?? -1; if (tool.toX != null) p.toX = tool.toX; else p.dist = 200; p.y = FIELD.floor; }
      if (tool.type === 'seesaw') p.tilt = 'r';
      if (tool.type === 'domino') { p.y = FIELD.floor; p.ci = Math.floor(Math.random() * 6); }
      return p;
    }

    /** さかの はしを 近くの板の はしに ぴったり合わせる */
    function snapRamp(p) {
      if (p.type !== 'ramp') return;
      const mine = rampEnds(p);
      let best = null;
      for (const q of [...fixed, ...placed]) {
        if (q === p) continue;
        for (const e of wallEnds(q)) for (const m of mine) {
          const d = Math.hypot(e[0] - m[0], e[1] - m[1]);
          if (d < 40 && (!best || d < best.d)) best = { d, dx: e[0] - m[0], dy: e[1] - m[1] };
        }
      }
      if (best) { p.x += best.dx; p.y += best.dy; }
    }

    // ---------- 実行 ----------
    function startRun() {
      if (mode === 'run') return;
      mode = 'run'; runs++; settledGlow = 0;
      api.play('whoosh');
      runParts = [...fixed, ...placed].map((p) => ({ ...clone(p), fixed: p.fixed }));
      if (real && Matter) {
        world = buildMatterWorld(Matter, runParts);
      } else {
        world = createWorld();
        buildField(world);
        runParts.forEach((p) => buildPart(world, p));
      }
    }
    function stopRun() {
      mode = 'edit'; world = null; runParts = null; goalAnim = null; settledGlow = 0;
      api.play('back');
    }

    function onEvents(evs) {
      for (const e of evs) {
        switch (e.type) {
          case 'domino': api.play('click'); if (Math.random() < 0.5) scene.floatText('カタカタ', 'clack', e.x, e.y - 60, { size: 34 }); break;
          case 'spring': api.play('boing'); if (!e.owner || !e.owner._said) { scene.floatText('ビヨーン', 'boing!', e.x, e.y - 60, { size: 38 }); if (e.owner) e.owner._said = true; } break;
          case 'dump': api.play('pick'); scene.floatText('ブロロロ', 'vroom', e.x, e.y - 120, { size: 36 }); break;
          case 'crane': api.play('pick'); scene.floatText('ウィーン', 'whirr', e.x, e.y - 80, { size: 36 }); break;
          case 'hit': if (hitCooldown <= 0) { api.play('thud'); hitCooldown = 0.25; } break;
          case 'click': api.play('click'); break;
          case 'goal': reachGoal(e); break;
        }
      }
    }
    function reachGoal(e) {
      if (goalAnim) return;
      goalAnim = { t: 0, part: e.goal.part, bell: e.goal.bell };
      scene.sparkle(e.x, e.y, { count: 14 });
      api.play(e.goal.bell ? 'ding' : 'done');
      scene.floatText(e.goal.bell ? 'チリーン' : '{ゴール|ごーる}！', e.goal.bell ? 'ding!' : 'goal!', e.x, e.y - 90, { size: 44 });
      if (!solvedThis) {
        solvedThis = true;
        api.markSolved();
        if (!free) api.save('idx' + api.level.id, (pIdx + 1) % puzzles.length);
      }
      setTimeout(() => { if (goalAnim) api.celebrate(free ? { ja: '{ゴール|ごーる}！', en: 'Goal!' } : { ja: 'できた！', en: 'You did it!' }); }, 600);
    }

    // ---------- 指の操作 ----------
    function partAt(x, y) {
      for (let i = placed.length - 1; i >= 0; i--) if (partHit(placed[i], x, y)) return placed[i];
      return null;
    }
    scene.onPointerDown = (p) => {
      if (!p.primary || drag) return;
      // スタート / もどす
      if (hit(p, START_BTN, 10)) { mode === 'run' ? stopRun() : startRun(); return; }
      if (mode === 'run') return;
      if (free && hit(p, PAGE_BTN, 6)) { freePage = (freePage + 1) % Math.ceil(tools.length / 3); api.play('flip'); return; }
      // どうぐばこ
      for (const s of visibleSlots()) {
        if (!s.t.used && hit(p, s.rect, 4)) {
          const part = makePart(s.t, p.x, p.y);
          drag = { part, from: 'tool', tool: s.t, dx: 0, dy: -40, startX: p.x, startY: p.y, moved: true };
          part.x = p.x; part.y = p.y - 40;
          if (!s.t.infinite) s.t.used = true;
          api.play('pick');
          return;
        }
      }
      // おいた部品
      const part = partAt(p.x, p.y);
      if (part) {
        drag = { part, from: 'field', dx: part.x - p.x, dy: part.y - p.y, startX: p.x, startY: p.y, moved: false, orig: { x: part.x, y: part.y } };
        placed = placed.filter((q) => q !== part);
        placed.push(part); // 手前に
      }
    };
    scene.onPointerMove = (p) => {
      if (!drag || !p.primary) return;
      if (Math.hypot(p.x - drag.startX, p.y - drag.startY) > 14) drag.moved = true;
      if (!drag.moved) return;
      drag.part.x = p.x + drag.dx;
      drag.part.y = p.y + drag.dy;
    };
    scene.onPointerUp = (p) => {
      if (!drag || !p.primary) return;
      const d = drag; drag = null;
      const part = d.part;
      if (d.from === 'field' && !d.moved) { tapPart(part); return; }
      if (part.x > TOOLBOX_X - 10) {
        // どうぐばこへ もどす
        if (d.from === 'field') placed = placed.filter((q) => q !== part);
        returnTool(part, d);
        api.play('back');
        saveFree();
        return;
      }
      clampPart(part);
      snapRamp(part);
      if (d.from === 'tool') placed.push(part);
      api.play('drop');
      saveFree();
    };
    function returnTool(part, d) {
      if (free) return;
      const t = d.from === 'tool' ? d.tool : tools.find((t) => t.used && t.type === part.type);
      if (t) t.used = false;
    }
    function tapPart(part) {
      if (part.type === 'ramp') {
        const i = RAMP_ANGLES.indexOf(part.angle ?? 0);
        part.angle = RAMP_ANGLES[(i + 1) % RAMP_ANGLES.length];
        clampPart(part);
        snapRamp(part);
        api.play('flip');
      } else if (part.type === 'conveyor') {
        part.speed = -(part.speed ?? 240);
        api.play('flip');
      } else if (part.type === 'seesaw') {
        part.tilt = part.tilt === 'r' ? 'l' : 'r';
        api.play('flip');
      } else if (part.type === 'dump' && free) {
        part.dir = -(part.dir || -1);
        api.play('flip');
      } else {
        api.play('tap');
      }
      part._wiggle = 1;
      saveFree();
    }

    // ---------- 描画 ----------
    const bg = sprite('koro-bg', 1000, 600, (c) => {
      // 地面
      crayonRect(c, -10, FIELD.floor, 870, 60, P.kimidori, { seed: 5, width: 3 });
      // どうぐばこ
      c.globalAlpha = 0.9;
      crayonRect(c, TOOLBOX_X, 4, 140, 592, P.kiiro, { r: 18, seed: 6, width: 3, alpha: 0.35 });
      c.globalAlpha = 1;
    }, Math.min(2, window.devicePixelRatio || 1));
    const slotSpr = (h) => sprite('koro-slot-' + h, SLOT.w, h, (c) => crayonRect(c, 4, 4, SLOT.w - 8, h - 8, P.gayoshi, { r: 14, seed: 8, width: 2.5 }));
    const startSpr = sprite('koro-start', START_BTN.w, START_BTN.h, (c) => {
      crayonRect(c, 4, 4, START_BTN.w - 8, START_BTN.h - 8, P.midori, { r: 18, seed: 11 });
      crayonPoly(c, [[46, 24], [92, 56], [46, 88]], P.gayoshi, { seed: 12, width: 3 });
    });
    const resetSpr = sprite('koro-reset', START_BTN.w, START_BTN.h, (c) => {
      crayonRect(c, 4, 4, START_BTN.w - 8, START_BTN.h - 8, P.sorairo, { r: 18, seed: 13 });
      const pts = [];
      for (let i = 0; i <= 16; i++) { const a = -0.4 + (i / 16) * 4.6; pts.push([64 + Math.cos(a) * 26, 56 + Math.sin(a) * 26]); }
      crayonLine(c, pts, { width: 8, color: P.gayoshi, seed: 14 });
      const e = pts[pts.length - 1];
      crayonPoly(c, [[e[0] - 4, e[1] - 16], [e[0] + 16, e[1] + 2], [e[0] - 8, e[1] + 10]], P.gayoshi, { seed: 15, width: 2 });
    });
    const pageSpr = sprite('koro-page', PAGE_BTN.w, PAGE_BTN.h, (c) => {
      crayonRect(c, 4, 4, PAGE_BTN.w - 8, PAGE_BTN.h - 8, P.gayoshi, { r: 14, seed: 16, width: 2.5 });
      crayonPoly(c, [[40, 34], [88, 34], [64, 70]], P.daidai, { seed: 17, width: 2.5 });
    });

    function drawToolbox(ctx, t) {
      for (const s of visibleSlots()) {
        const r = s.rect;
        ctx.save();
        if (s.t.used) ctx.globalAlpha = 0.3;
        drawSprite(ctx, slotSpr(r.h), r.x, r.y);
        ctx.translate(r.x + r.w / 2, r.y + r.h / 2);
        drawToolIcon(ctx, s.t.type, s.t);
        ctx.restore();
      }
      if (free) {
        drawSprite(ctx, pageSpr, PAGE_BTN.x, PAGE_BTN.y);
        const pages = Math.ceil(tools.length / 3);
        for (let i = 0; i < pages; i++) {
          ctx.fillStyle = i === freePage ? P.daidai : P.haiiro;
          ctx.beginPath(); ctx.arc(PAGE_BTN.x + PAGE_BTN.w / 2 + (i - (pages - 1) / 2) * 18, PAGE_BTN.y + PAGE_BTN.h - 16, 5, 0, 7); ctx.fill();
        }
      }
      // スタート / もどす
      ctx.save();
      const glow = mode === 'run' && settledGlow > 0 ? 1 + Math.sin(t * 3) * 0.04 : mode === 'edit' && placedCount() > 0 && !free && allToolsUsed() ? 1 + Math.sin(t * 3) * 0.04 : 1;
      ctx.translate(START_BTN.x + START_BTN.w / 2, START_BTN.y + START_BTN.h / 2);
      ctx.scale(glow, glow);
      drawSprite(ctx, mode === 'run' ? resetSpr : startSpr, -START_BTN.w / 2, -START_BTN.h / 2);
      ctx.restore();
    }
    const placedCount = () => placed.length;
    const allToolsUsed = () => tools.every((t) => t.used);

    function drawHint(ctx) {
      // 3 回ためしても できなかったら、置く場所を うすく見せる
      if (free || runs < 3 || solvedThis) return;
      const pz = puzzles[pIdx];
      ctx.save();
      ctx.globalAlpha = 0.22;
      for (const s of pz.solution) drawPart(ctx, { ...s }, 0, true);
      ctx.restore();
    }

    let parade = null;
    scene.onFrame = (ctx, dt, t) => {
      hitCooldown -= dt;
      drawSprite(ctx, bg, 0, 0, 1000, 600);
      if (mode === 'run' && world) {
        onEvents(world.matter ? advanceMatter(world, dt) : advance(world, dt));
        if (world.restTime > 2 && !goalAnim) settledGlow = 1;
        for (const p of runParts) {
          if (p.type === 'ballS' || p.type === 'ballB') continue;
          if (p.type === 'spring' && p.squash > 0) p.squash = Math.max(0, p.squash - dt * 4);
          if (p.type === 'goal' && goalAnim && goalAnim.part === p) {
            p.flagUp = Math.min(1, goalAnim.t / 0.8);
            p.ring = Math.max(0, 1 - goalAnim.t / 2.5);
          }
          drawPart(ctx, p, t);
        }
        for (const b of world.balls) {
          if (!b.active) continue;
          ctx.save();
          ctx.translate(b.x, b.y); ctx.rotate(b.spin);
          drawPart(ctx, { type: b.kind === 'b' ? 'ballB' : 'ballS', x: 0, y: 0 }, t);
          ctx.restore();
        }
        if (goalAnim) {
          goalAnim.t += dt;
          // しんかんせんが はしる(ごほうび)
          const x = -260 + (goalAnim.t - 0.4) * 380;
          if (goalAnim.t > 0.4 && x < 1100) drawVehicle(ctx, 'shinkansen', x, FIELD.floor - 70, 170);
        }
      } else {
        drawHint(ctx);
        for (const p of [...fixed, ...placed]) {
          if (p === (drag && drag.part)) continue;
          ctx.save();
          if (p._wiggle) { p._wiggle = Math.max(0, p._wiggle - dt * 3); ctx.translate(p.x, p.y); ctx.rotate(Math.sin(p._wiggle * 12) * 0.03); ctx.translate(-p.x, -p.y); }
          drawPart(ctx, p, t);
          ctx.restore();
        }
      }
      drawToolbox(ctx, t);
      if (drag) {
        ctx.save();
        drawPart(ctx, drag.part, t, true);
        ctx.restore();
      }
    };

    async function intro() {
      if (free || !api.firstTime()) return;
      await new Promise((r) => setTimeout(r, 900));
      const pz = puzzles[pIdx];
      const sol = pz.solution[0];
      const slot = visibleSlots()[0];
      if (!sol || !slot || placed.length) return;
      const ghost = { ...makePart(slot.t, slot.rect.x + 64, slot.rect.y + 56) };
      let carrying = false;
      const origFrame = scene.onFrame;
      scene.onFrame = (ctx, dt, t) => {
        origFrame(ctx, dt, t);
        if (carrying) { ctx.save(); ctx.globalAlpha = 0.7; drawPart(ctx, { ...ghost, angle: sol.angle ?? ghost.angle }, t, true); ctx.restore(); }
      };
      ghost.x = sol.x; ghost.y = sol.y;
      await scene.hand([
        { x: slot.rect.x + 64, y: slot.rect.y + 56, press: true },
        { x: sol.x, y: sol.y + 40, wait: 1.2, onArrive: () => { carrying = true; } },
        { x: START_BTN.x + 64, y: START_BTN.y + 56, press: true, onArrive: () => { carrying = false; } },
      ], { speed: 260 });
      carrying = false;
      scene.onFrame = origFrame;
    }

    setupPuzzle();
    intro();

    return {
      retry() {
        if (free) { if (mode === 'run') stopRun(); return; }
        setupPuzzle();
      },
      next() {
        if (free) {
          placed = [{ type: 'ballS', x: 80, y: 80 }, { type: 'goal', x: 740, y: 560 }];
          saveFree(); setupPuzzle(); return;
        }
        pIdx = (pIdx + 1) % puzzles.length;
        api.save('idx' + api.level.id, pIdx);
        setupPuzzle();
      },
      stop() { },
    };
  },
};
