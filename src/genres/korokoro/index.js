// 作成中のスタブ
import { drawVehicle } from '../../crayon/vehicles.js';
export default {
  id: 'korokoro',
  title: { ja: 'korokoro', en: 'korokoro' },
  drawIcon(c, s) { drawVehicle(c, 'bus', 0, s * 0.3, s); },
  levels: [{ id: '1', stars: 1 }, { id: '2', stars: 2 }, { id: '3', stars: 3 }],
  start(api) { const sc = api.createScene({}); sc.onFrame = (ctx) => api.drawLabel(ctx, 'じゅんびちゅう', 'coming soon', 500, 300, 48); return {}; },
};
