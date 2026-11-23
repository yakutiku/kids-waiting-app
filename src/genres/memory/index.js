// くるま しんけいすいじゃく(見本ジャンル)
// 裏返したカードから同じ車を 2 枚さがす。合わないときは そっと 裏にもどるだけ(ばつ は出さない)。
import { P } from '../../crayon/palette.js';
import { sprite, drawSprite, crayonRect, crayonPoly, starPts, rectPts, crayonFill } from '../../crayon/crayon.js';
import { drawVehicle, vehicleSprite, VEHICLES, WORK_VEHICLES } from '../../crayon/vehicles.js';
import { hit, ease } from '../../core/scene.js';

const POOL = [...WORK_VEHICLES, 'shinkansen', 'shinkansenBlue', 'loco'];
const LAYOUT = { 1: { pairs: 2, cols: 4 }, 2: { pairs: 4, cols: 4 }, 3: { pairs: 6, cols: 4 } };
const BORDER = [P.aka, P.daidai, P.kiiro, P.midori, P.ao, P.murasaki];

function shuffle(a) { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }

function cardBack(w, h) {
  return sprite('mem-back', w, h, (c) => {
    crayonRect(c, 4, 4, w - 8, h - 8, P.sorairo, { r: 16, seed: 11 });
    crayonPoly(c, starPts(w / 2, h / 2, Math.min(w, h) * 0.22), P.kiiro, { seed: 12, width: 2.5 });
  });
}
function cardFront(id, w, h, color) {
  return sprite('mem-front-' + id + color, w, h, (c) => {
    crayonRect(c, 4, 4, w - 8, h - 8, P.gayoshi, { r: 16, seed: 21, stroke: color, width: 5 });
    const vw = w * 0.86;
    const spr = vehicleSprite(id, Math.round(vw));
    c.drawImage(spr, (w - vw) / 2, h / 2 - (vw * 0.65) / 2, vw, vw * 0.65);
  });
}

export default {
  id: 'memory',
  title: { ja: 'くるま しんけいすいじゃく', en: 'Car memory game' },
  drawIcon(c, s) {
    const k = s / 150; c.scale(k, k);
    c.save(); c.translate(20, 40); c.rotate(-0.12);
    crayonRect(c, 0, 0, 62, 84, P.sorairo, { r: 10, seed: 3 });
    crayonPoly(c, starPts(31, 42, 15), P.kiiro, { seed: 4, width: 2 });
    c.restore();
    c.save(); c.translate(66, 30); c.rotate(0.1);
    crayonRect(c, 0, 0, 66, 88, P.gayoshi, { r: 10, seed: 5, stroke: P.aka, width: 4 });
    drawVehicle(c, 'fire', 4, 26, 58);
    c.restore();
  },
  levels: [{ id: '1', stars: 1 }, { id: '2', stars: 2 }, { id: '3', stars: 3 }],

  start(api) {
    const scene = api.createScene({ width: 1000, height: 600 });
    const conf = LAYOUT[api.level.id] || LAYOUT[1];
    let cards = [];
    let open = [];       // めくっている(未確定)カード
    let lock = 0;        // 秒。>0 のあいだは操作を待つ
    let finished = false;
    let parade = null;   // できたあとのパレード
    let nameTag = null;  // { id, t }
    let usedIds = [];

    function deal(sameIds = false) {
      let ids;
      if (sameIds && usedIds.length) ids = usedIds;
      else {
        const fresh = shuffle(POOL.filter((v) => !usedIds.includes(v)));
        ids = (fresh.length >= conf.pairs ? fresh : shuffle([...POOL])).slice(0, conf.pairs);
      }
      usedIds = ids;
      const deck = shuffle([...ids, ...ids].map((id) => ({ id })));
      const n = deck.length;
      const cols = Math.min(conf.cols, n);
      const rows = Math.ceil(n / cols);
      const gap = 24;
      const cw = Math.min(190, (920 - gap * (cols - 1)) / cols);
      const ch = Math.min(cw * 1.25, (520 - gap * (rows - 1)) / rows);
      const totalW = cols * cw + (cols - 1) * gap;
      const totalH = rows * ch + (rows - 1) * gap;
      const x0 = (1000 - totalW) / 2, y0 = (600 - totalH) / 2 + 10;
      cards = deck.map((d, i) => ({
        id: d.id,
        color: BORDER[ids.indexOf(d.id) % BORDER.length],
        x: x0 + (i % cols) * (cw + gap), y: y0 + Math.floor(i / cols) * (ch + gap), w: cw, h: ch,
        face: 0,          // 0=裏 … 1=表(アニメ用)
        up: false, matched: false, wiggle: 0, enter: 0.6 + i * 0.06,
      }));
      open = []; lock = 0.8; finished = false; parade = null; nameTag = null;
    }

    function flip(card) {
      card.up = true;
      open.push(card);
      api.play('flip');
      if (open.length === 2) {
        const [a, b] = open;
        if (a.id === b.id) {
          lock = 0.5;
          setTimeout(() => {
            a.matched = b.matched = true;
            a.wiggle = b.wiggle = 1;
            open = [];
            api.play('pop');
            const v = VEHICLES[a.id];
            nameTag = { id: a.id, t: 0 };
            api.speak(v.yomi ? `{${v.ja}|${v.yomi}}` : v.ja, v.en);
            scene.sparkle((a.x + a.w / 2 + b.x + b.w / 2) / 2, (a.y + b.y) / 2 + a.h / 2, { count: 8 });
            if (cards.every((c) => c.matched)) win();
          }, 450);
        } else {
          // 合わない: しばらく見せてから、そっと裏へ(自分で気づける)
          lock = 1.3;
          setTimeout(() => { a.up = false; b.up = false; open = []; api.play('back'); }, 1200);
        }
      }
    }

    function win() {
      finished = true;
      api.markSolved();
      setTimeout(() => {
        api.celebrate({ ja: 'ぜんぶ みつけた！', en: 'You found them all!' });
        parade = { t: 0, ids: [...usedIds] };
      }, 700);
    }

    scene.onPointerDown = (p) => {
      if (lock > 0 || finished || !p.primary) return;
      const c = cards.find((c) => hit(p, c, 6));
      if (!c || c.up || c.matched || c.enter > 0) return;
      flip(c);
    };

    function vehicleName(id) {
      const v = VEHICLES[id];
      return v.yomi && v.yomi !== v.ja ? `{${v.ja}|${v.yomi}}` : v.ja;
    }

    scene.onFrame = (ctx, dt) => {
      if (lock > 0) lock -= dt;
      for (const c of cards) {
        if (c.enter > 0) c.enter = Math.max(0, c.enter - dt);
        const target = c.up || c.matched ? 1 : 0;
        c.face += Math.sign(target - c.face) * Math.min(Math.abs(target - c.face), dt * 4);
        if (c.wiggle > 0) c.wiggle = Math.max(0, c.wiggle - dt * 1.5);
        // 配る アニメ
        const e = c.enter > 0 ? Math.max(0, 1 - c.enter / 0.6) : 1;
        if (e <= 0) continue;
        const sx = Math.abs(Math.cos(c.face * Math.PI)); // めくり
        const showFront = c.face > 0.5;
        ctx.save();
        ctx.translate(c.x + c.w / 2, c.y + c.h / 2 + (1 - ease.out(e)) * 60);
        ctx.globalAlpha = ease.out(e);
        if (c.wiggle > 0) ctx.rotate(Math.sin(c.wiggle * 18) * 0.06 * c.wiggle);
        if (c.matched && parade) ctx.globalAlpha = Math.max(0.35, 1 - parade.t);
        ctx.scale(Math.max(0.02, sx), 1);
        const spr = showFront ? cardFront(c.id, Math.round(c.w), Math.round(c.h), c.color) : cardBack(Math.round(c.w), Math.round(c.h));
        drawSprite(ctx, spr, -c.w / 2, -c.h / 2, c.w, c.h);
        ctx.restore();
      }
      // 名前(そろったとき)
      if (nameTag && !parade) {
        nameTag.t += dt;
        if (nameTag.t > 2.4) nameTag = null;
        else {
          ctx.save();
          ctx.globalAlpha = Math.min(1, nameTag.t * 4, (2.4 - nameTag.t) * 3);
          const v = VEHICLES[nameTag.id];
          api.drawLabel(ctx, vehicleName(nameTag.id), v.en, 500, 34, 34);
          ctx.restore();
        }
      }
      // パレード(できた ごほうび)
      if (parade) {
        parade.t += dt;
        const n = parade.ids.length;
        const w = n > 4 ? 150 : 190;
        parade.ids.forEach((id, i) => {
          const x = 1050 + i * (w + 30) - parade.t * 220;
          const bob = Math.sin(parade.t * 10 + i) * 2;
          drawVehicle(ctx, id, x, 600 - w * 0.65 - 6 + bob, w, true);
        });
      }
    };

    async function intro() {
      if (!api.firstTime()) return;
      await new Promise((r) => setTimeout(r, 1400));
      const [a, b] = cards;
      if (!a || !b || a.up || b.up) return;
      await scene.hand([
        { x: a.x + a.w / 2, y: a.y + a.h / 2, press: true, onArrive: () => { a.up = true; } },
        { x: b.x + b.w / 2, y: b.y + b.h / 2, press: true, onArrive: () => { b.up = true; }, wait: 1.2 },
      ], { speed: 300 });
      if (!a.matched) a.up = false;
      if (!b.matched) b.up = false;
      lock = 0.3;
    }

    deal();
    intro();

    return {
      retry() { deal(true); },
      next() { deal(false); },
      stop() { },
    };
  },
};
