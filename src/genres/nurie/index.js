// くれよん: ぬりえ / おえかき / なぞろう
import { P } from '../../crayon/palette.js';
import { crayonLine, crayonRect } from '../../crayon/crayon.js';
import { drawVehicle } from '../../crayon/vehicles.js';
import { crayonIcon, halfPaintedBus } from './common.js';
import { nurieMode } from './nurie.js';
import { oekakiMode } from './oekaki.js';
import { nazoriMode } from './nazori.js';

const MODES = { nurie: nurieMode, oekaki: oekakiMode, nazori: nazoriMode };

function wavyDots(c, y, amp = 14, color = P.sumi) {
  c.save(); c.setLineDash([6, 9]); c.lineCap = 'round'; c.strokeStyle = color; c.lineWidth = 4; c.globalAlpha = 0.8;
  c.beginPath();
  for (let x = 6; x <= 144; x += 4) { const yy = y + Math.sin(x / 22) * amp; x === 6 ? c.moveTo(x, yy) : c.lineTo(x, yy); }
  c.stroke(); c.restore();
}

export default {
  id: 'nurie',
  title: { ja: 'くれよん', en: 'Crayons' },
  drawIcon(c, s) {
    const k = s / 150; c.scale(k, k);
    halfPaintedBus(c, 14, 70, 0.9);
    crayonIcon(c, 28, 52, 'aka', -0.25, 0.9);
    crayonIcon(c, 56, 46, 'sorairo', -0.05, 0.9);
    crayonIcon(c, 84, 50, 'midori', 0.15, 0.9);
  },
  levels: [
    {
      id: 'nurie', ja: 'ぬりえ', en: 'Coloring',
      drawIcon(c, s) { const k = s / 150; c.scale(k, k); halfPaintedBus(c, 8, 50, 1.05); },
    },
    {
      id: 'oekaki', ja: 'おえかき', en: 'Drawing',
      drawIcon(c, s) {
        const k = s / 150; c.scale(k, k);
        crayonLine(c, [[20, 110], [44, 60], [72, 100], [98, 48], [124, 90]], { width: 12, color: P.aka, seed: 4 });
        crayonIcon(c, 108, 68, 'ao', 0.5, 1.5);
      },
    },
    {
      id: 'nazori', ja: 'なぞろう', en: 'Trace',
      drawIcon(c, s) {
        const k = s / 150; c.scale(k, k);
        wavyDots(c, 108, 16);
        drawVehicle(c, 'shinkansen', 6, 14, 92);
      },
    },
  ],

  start(api) {
    const scene = api.createScene({ width: 1000, height: 600 });
    const mode = (MODES[api.level.id] || nurieMode)(api, scene);
    return mode;
  },
};
