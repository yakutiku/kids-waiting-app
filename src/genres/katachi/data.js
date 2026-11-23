// かたち パズル: お題データ(ブラウザにも node にも依存しない純粋なデータと計算)
// 単位は「ます」。1 ます = 画面で s 論理px。座標は影絵の左上が原点(y は下向き)。
// 各スロット: { kind, cx, cy, rot, color }  cx,cy は形の外接四角の中心、rot は時計まわりの度数。
const SQ3 = Math.sqrt(3) / 2;

function circ(r, n = 28) { const a = []; for (let i = 0; i < n; i++) { const t = (i / n) * Math.PI * 2; a.push([Math.cos(t) * r, Math.sin(t) * r]); } return a; }
function semi(n = 14) { const a = []; for (let i = 0; i <= n; i++) { const t = Math.PI + (i / n) * Math.PI; a.push([0.5 * Math.cos(t), 0.25 + 0.5 * Math.sin(t)]); } return a; }
const box = (w, h) => [[-w / 2, -h / 2], [w / 2, -h / 2], [w / 2, h / 2], [-w / 2, h / 2]];
const tri = (k) => [[-0.5 * k, 0.5 * k], [0.5 * k, 0.5 * k], [-0.5 * k, -0.5 * k]];   // 直角は左下
const etri = (k) => [[0, -SQ3 * k / 2], [0.5 * k, SQ3 * k / 2], [-0.5 * k, SQ3 * k / 2]]; // ぶ点は上

// step: タップで回る角度(0 = 回らない) / period: この角度で同じ見た目に戻る
export const KINDS = {
  sq: { w: 1, h: 1, step: 0, period: 90, pts: box(1, 1) },
  sq2: { w: 2, h: 2, step: 0, period: 90, pts: box(2, 2) },
  rect: { w: 2, h: 1, step: 90, period: 180, pts: box(2, 1) },
  rect3: { w: 3, h: 1, step: 90, period: 180, pts: box(3, 1) },
  tri: { w: 1, h: 1, step: 90, period: 360, pts: tri(1) },
  tri2: { w: 2, h: 2, step: 90, period: 360, pts: tri(2) },
  etri: { w: 1, h: SQ3, step: 180, period: 360, pts: etri(1) },
  etri2: { w: 2, h: SQ3 * 2, step: 180, period: 360, pts: etri(2) },
  circ: { w: 1, h: 1, step: 0, period: 90, pts: circ(0.5) },
  circ2: { w: 2, h: 2, step: 0, period: 90, pts: circ(1, 36) },
  semi: { w: 1, h: 0.5, step: 90, period: 360, pts: semi() },
};

export function rotPts(pts, rot, cx = 0, cy = 0) {
  const a = (rot * Math.PI) / 180, c = Math.cos(a), s = Math.sin(a);
  return pts.map(([x, y]) => [cx + x * c - y * s, cy + x * s + y * c]);
}
export function slotPts(sl) { return rotPts(KINDS[sl.kind].pts, sl.rot, sl.cx, sl.cy); }
export const maxDim = (kind) => Math.max(KINDS[kind].w, KINDS[kind].h);
export const sameRot = (kind, a, b) => { const p = KINDS[kind].period; return (((a - b) % p) + p) % p === 0; };

const S = (kind, cx, cy, rot, color) => ({ kind, cx, cy, rot, color });

// ★ ... lv1 / ★★ ... lv2 / ★★★ ... lv3
// rotate: ★★ で最初に回っている(1 回タップで合う)ピースのスロット番号 / extra: ★★★ の余分なピース
export const PUZZLES = {
  1: [
    { id: 'shinkansen', ja: 'しんかんせん', en: 'bullet train', veh: 'shinkansen', anim: 'run', s: 125, slots: [S('rect', 1, 1.5, 0, 'sorairo'), S('sq', 2.5, 1.5, 0, 'sorairo'), S('tri', 3.5, 1.5, 0, 'ao')] },
    { id: 'dump', ja: '{ダンプカー|だんぷかー}', en: 'dump truck', veh: 'dump', anim: 'run', s: 125, slots: [S('rect', 1, 0.5, 0, 'daidai'), S('sq', 2.5, 0.5, 0, 'kiiro'), S('circ', 1.5, 1.5, 0, 'chairo')] },
    { id: 'house', ja: 'いえ', en: 'house', anim: 'smoke', s: 105, slots: [S('etri2', 1, SQ3, 0, 'aka'), S('rect', 1, SQ3 * 2 + 0.5, 0, 'daidai'), S('rect', 1, SQ3 * 2 + 1.5, 0, 'kiiro')] },
    { id: 'tree', ja: 'き', en: 'tree', anim: 'sway', s: 105, slots: [S('circ2', 1, 1, 0, 'midori'), S('sq', 1, 2.5, 0, 'chairo'), S('rect', 1, 3.5, 0, 'kimidori')] },
    { id: 'rocket', ja: '{ロケット|ろけっと}', en: 'rocket', anim: 'rise', s: 105, slots: [S('etri', 0.5, SQ3 / 2, 0, 'aka'), S('rect', 0.5, SQ3 + 1, 90, 'sorairo'), S('etri', 0.5, SQ3 + 2 + SQ3 / 2, 180, 'daidai')] },
    { id: 'bus', ja: '{バス|ばす}', en: 'bus', veh: 'bus', anim: 'run', s: 125, slots: [S('rect3', 1.5, 0.5, 0, 'kiiro'), S('circ', 0.75, 1.5, 0, 'chairo'), S('circ', 2.25, 1.5, 0, 'chairo')] },
  ],
  2: [
    { id: 'fire', ja: 'しょうぼうしゃ', en: 'fire engine', veh: 'fire', anim: 'run', s: 100, rotate: [2, 3], slots: [S('rect3', 1.5, 0.5, 0, 'aka'), S('sq', 3.5, 0.5, 0, 'aka'), S('rect', 1, 1.5, 0, 'kiiro'), S('tri', 2.5, 1.5, 270, 'daidai'), S('circ', 3.5, 1.5, 0, 'chairo')] },
    { id: 'shinkansenBlue', ja: 'しんかんせん', en: 'bullet train', veh: 'shinkansenBlue', anim: 'run', s: 88, rotate: [1, 2], slots: [S('rect3', 1.5, 1.5, 0, 'sorairo'), S('rect', 4, 1.5, 0, 'sorairo'), S('tri', 5.5, 1.5, 0, 'ao'), S('circ', 1, 2.5, 0, 'chairo'), S('circ', 4, 2.5, 0, 'chairo')] },
    { id: 'bus', ja: '{バス|ばす}', en: 'bus', veh: 'bus', anim: 'run', s: 100, rotate: [2], slots: [S('rect3', 1.5, 0.5, 0, 'kiiro'), S('sq', 3.5, 0.5, 0, 'kiiro'), S('rect', 2, 1.5, 0, 'kimidori'), S('circ', 0.5, 1.5, 0, 'chairo'), S('circ', 3.5, 1.5, 0, 'chairo')] },
    { id: 'house', ja: 'いえ', en: 'house', anim: 'smoke', s: 92, rotate: [0, 1], slots: [S('etri2', 1, SQ3, 0, 'aka'), S('rect', 1, SQ3 * 2 + 0.5, 0, 'daidai'), S('sq', 0.5, SQ3 * 2 + 1.5, 0, 'kiiro'), S('sq', 1.5, SQ3 * 2 + 1.5, 0, 'kiiro')] },
    { id: 'rocket', ja: '{ロケット|ろけっと}', en: 'rocket', anim: 'rise', s: 95, rotate: [2, 3], slots: [S('etri', 1.5, SQ3 / 2, 0, 'aka'), S('rect', 1.5, SQ3 + 1, 90, 'sorairo'), S('tri', 0.5, SQ3 + 1.5, 270, 'daidai'), S('tri', 2.5, SQ3 + 1.5, 0, 'daidai'), S('etri', 1.5, SQ3 + 2 + SQ3 / 2, 180, 'kiiro')] },
    { id: 'crane', ja: '{クレーン|くれーん}', en: 'crane truck', veh: 'crane', anim: 'run', s: 100, rotate: [2], slots: [S('rect3', 1.5, 2.5, 0, 'daidai'), S('sq', 0.5, 1.5, 0, 'kiiro'), S('tri2', 2, 1, 270, 'sorairo'), S('circ', 3.5, 2.5, 0, 'chairo')] },
  ],
  3: [
    { id: 'shinkansenRed', ja: 'しんかんせん', en: 'bullet train', veh: 'shinkansenRed', anim: 'run', s: 90, extra: ['semi'], slots: [S('rect3', 1.5, 1.5, 0, 'sorairo'), S('tri', 3.5, 1.5, 0, 'sorairo'), S('tri', 3.5, 1.5, 180, 'sorairo'), S('tri', 4.5, 1.5, 0, 'ao'), S('circ', 1, 2.5, 0, 'chairo'), S('circ', 3, 2.5, 0, 'chairo')] },
    { id: 'excavator', ja: '{ショベルカー|しょべるかー}', en: 'excavator', veh: 'excavator', anim: 'run', s: 88, extra: ['etri'], slots: [S('rect3', 1.5, 2.5, 0, 'chairo'), S('tri', 0.5, 1.5, 0, 'kiiro'), S('tri', 0.5, 1.5, 180, 'kiiro'), S('sq', 1.5, 1.5, 0, 'kiiro'), S('tri2', 3, 1, 270, 'daidai'), S('semi', 4.25, 1.5, 90, 'chairo')] },
    { id: 'house', ja: 'いえ', en: 'house', anim: 'smoke', s: 84, extra: ['circ'], slots: [S('tri2', 1, 1, 270, 'aka'), S('tri2', 3, 1, 0, 'aka'), S('sq', 0.5, 2.5, 0, 'kiiro'), S('tri', 1.5, 2.5, 0, 'daidai'), S('tri', 1.5, 2.5, 180, 'daidai'), S('rect', 3, 2.5, 0, 'kiiro')] },
    { id: 'ship', ja: 'ふね', en: 'ship', anim: 'sail', s: 88, extra: ['circ'], slots: [S('rect3', 2.5, 3.5, 0, 'ao'), S('tri', 0.5, 3.5, 180, 'ao'), S('tri', 4.5, 3.5, 90, 'ao'), S('tri2', 3, 2, 0, 'gayoshi'), S('sq', 1.5, 2.5, 0, 'aka'), S('etri', 1.5, 2 - SQ3 / 2, 0, 'kiiro')] },
    { id: 'rocket', ja: '{ロケット|ろけっと}', en: 'rocket', anim: 'rise', s: 86, extra: ['etri'], slots: [S('tri', 0.5, 0.5, 270, 'aka'), S('tri', 1.5, 0.5, 0, 'aka'), S('rect', 1, 1.5, 0, 'sorairo'), S('rect', 1, 2.5, 0, 'sorairo'), S('tri', -0.5, 2.5, 270, 'daidai'), S('tri', 2.5, 2.5, 0, 'daidai')] },
    { id: 'dump', ja: '{ダンプカー|だんぷかー}', en: 'dump truck', veh: 'dump', anim: 'run', s: 84, extra: ['semi'], slots: [S('rect3', 1.5, 2.5, 0, 'daidai'), S('tri2', 1, 1, 0, 'kiiro'), S('tri', 2.5, 1.5, 0, 'aka'), S('tri', 2.5, 1.5, 180, 'aka'), S('circ', 0.75, 3.5, 0, 'chairo'), S('circ', 2.25, 3.5, 0, 'chairo')] },
  ],
};

// ---- 画面の配置(横長 1000×600 / 縦長 600×1000) ----
export function layoutFor(portrait) {
  if (portrait) {
    return { W: 600, H: 1000, portrait: true, sil: { cx: 300, cy: 282, w: 560, h: 500 }, panel: { x: 14, y: 540, w: 572, h: 448 }, label: { x: 300, y: 568 }, zone: { x: 26, y: 604, w: 548, h: 372 } };
  }
  return { W: 1000, H: 600, portrait: false, sil: { cx: 305, cy: 300, w: 570, h: 540 }, panel: { x: 612, y: 14, w: 374, h: 572 }, label: { x: 799, y: 42 }, zone: { x: 622, y: 94, w: 354, h: 480 } };
}

export function bboxOf(slots) {
  let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
  for (const sl of slots) for (const [x, y] of slotPts(sl)) { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); }
  return { x0, y0, x1, y1, w: x1 - x0, h: y1 - y0 };
}
/** 影絵が枠に収まる 1 ます の大きさ */
export function fitScale(p, lay) {
  const b = bboxOf(p.slots);
  return Math.min(p.s, lay.sil.w / b.w, lay.sil.h / b.h);
}
/** どうぐばこにピースを並べる。大きさ k(1 以下)を縮めてでも収める。homes は zone 左上からの中心座標 */
export function packTray(kinds, zone, S) {
  const gap = 16;
  for (let k = 1; k >= 0.45; k -= 0.05) {
    const cells = kinds.map((kd, i) => ({ i, c: maxDim(kd) * S * k + gap }));
    cells.sort((a, b) => b.c - a.c);
    const rows = []; let row = null;
    for (const cell of cells) {
      if (!row || row.w + cell.c > zone.w) { row = { w: 0, h: 0, items: [] }; rows.push(row); }
      row.items.push(cell); row.w += cell.c; row.h = Math.max(row.h, cell.c);
    }
    const totalH = rows.reduce((a, r) => a + r.h, 0);
    if (totalH <= zone.h) {
      const homes = []; let y = zone.y + (zone.h - totalH) / 2;
      for (const r of rows) {
        let x = zone.x + (zone.w - r.w) / 2;
        for (const it of r.items) { homes[it.i] = { x: x + it.c / 2, y: y + r.h / 2 }; x += it.c; }
        y += r.h;
      }
      return { k, homes, ok: true };
    }
  }
  return { k: 0.45, homes: kinds.map(() => ({ x: zone.x + zone.w / 2, y: zone.y + zone.h / 2 })), ok: false };
}

/** お題のピース一覧(スロットの数ぶん + 余分)。rand は 0〜1 を返す関数 */
export function makePieces(p, levelId, rand = Math.random) {
  const pieces = p.slots.map((sl, i) => {
    const kd = KINDS[sl.kind];
    let rot = sl.rot;
    if (kd.step > 0) {
      if (levelId === '2' && (p.rotate || []).includes(i)) rot = sl.rot - kd.step;
      else if (levelId === '3') rot = sl.rot + kd.step * Math.floor(rand() * (360 / kd.step));
    }
    return { kind: sl.kind, color: sl.color, rot, slotIdx: i };
  });
  for (const kind of p.extra || []) pieces.push({ kind, color: 'murasaki', rot: KINDS[kind].step > 0 ? KINDS[kind].step * Math.floor(rand() * (360 / KINDS[kind].step)) : 0, slotIdx: -1 });
  // 並びをシャッフル
  for (let i = pieces.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [pieces[i], pieces[j]] = [pieces[j], pieces[i]]; }
  return pieces;
}
