// node src/genres/katachi/test.mjs  — お題データが「解ける」ことの確認
import { KINDS, PUZZLES, layoutFor, bboxOf, fitScale, packTray, makePieces, slotPts, sameRot } from './data.js';
let bad = 0;
const fail = (m) => { bad++; console.log('NG  ' + m); };
const inPoly = (x, y, pts) => { let c = false; for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) { const [xi, yi] = pts[i], [xj, yj] = pts[j]; if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) c = !c; } return c; };
const COUNT = { 1: [2, 3], 2: [4, 5], 3: [5, 7] };
const COLORS = ['aka', 'daidai', 'kiiro', 'kimidori', 'midori', 'sorairo', 'ao', 'murasaki', 'chairo', 'haiiro', 'gayoshi'];
const lays = [layoutFor(false), layoutFor(true)];
let seed = 7; const rand = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };

for (const lv of ['1', '2', '3']) {
  const list = PUZZLES[lv];
  if (list.length < 5) fail(`lv${lv}: お題が 5 問未満 (${list.length})`);
  let squarePairs = 0;
  for (const p of list) {
    const tag = `lv${lv}/${p.id}`;
    const n = p.slots.length, ex = (p.extra || []).length;
    const [lo, hi] = lv === '3' ? [5, 7] : COUNT[lv];
    const total = n + ex;
    if (lv === '3') { if (total < 5 || total > 7) fail(`${tag}: ピース数 ${total} (5〜7)`); if (ex !== 1) fail(`${tag}: 余分が ${ex} 個 (1 個)`); }
    else { if (n < lo || n > hi) fail(`${tag}: ピース数 ${n} (${lo}〜${hi})`); if (ex) fail(`${tag}: 余分あり`); }
    if (lv === '2' && !((p.rotate || []).length >= 1 && p.rotate.length <= 2)) fail(`${tag}: 回すピースが 1〜2 個ではない`);
    // スロット検査
    for (const [i, sl] of p.slots.entries()) {
      const kd = KINDS[sl.kind];
      if (!kd) { fail(`${tag}#${i}: 不明な形 ${sl.kind}`); continue; }
      if (!COLORS.includes(sl.color)) fail(`${tag}#${i}: 色 ${sl.color}`);
      if (kd.step > 0 && sl.rot % kd.step !== 0) fail(`${tag}#${i}: 向き ${sl.rot} が step ${kd.step} で届かない`);
      if (kd.step === 0 && sl.rot !== 0) fail(`${tag}#${i}: 回らない形に向きがある`);
    }
    for (const i of p.rotate || []) if (!p.slots[i] || KINDS[p.slots[i].kind].step === 0) fail(`${tag}: rotate ${i} は回せない形`);
    // 重なり(サンプル点)
    const polys = p.slots.map(slotPts); const b = bboxOf(p.slots); let over = 0;
    for (let x = b.x0 + 0.0137; x < b.x1; x += 0.05) for (let y = b.y0 + 0.0121; y < b.y1; y += 0.05) { let c = 0; for (const pl of polys) if (inPoly(x, y, pl)) c++; if (c > 1) over++; }
    if (over > 3) fail(`${tag}: スロットが重なっている (${over})`);
    // ピース生成 → 各スロットに同じ形のピースがあり、回して合わせられる(割り当て可能)
    const pcs = makePieces(p, lv, rand);
    if (pcs.length !== total) fail(`${tag}: ピース総数 ${pcs.length} != ${total}`);
    const pool = pcs.map((q) => q.kind);
    for (const sl of p.slots) { const k = pool.indexOf(sl.kind); if (k < 0) fail(`${tag}: ${sl.kind} のピースが足りない`); else pool.splice(k, 1); }
    if (pool.length !== ex) fail(`${tag}: 余りが ${pool.length} 個 (余分 ${ex})`);
    for (const q of pcs) if (q.slotIdx >= 0) { const kd = KINDS[q.kind], sl = p.slots[q.slotIdx]; if (kd.step > 0 && (q.rot - sl.rot) % kd.step !== 0) fail(`${tag}: 回しても合わない開始向き`); if (lv === '1' && !sameRot(q.kind, q.rot, sl.rot)) fail(`${tag}: ★は最初から向きが合うはず`); if (lv === '2' && (p.rotate || []).includes(q.slotIdx) === sameRot(q.kind, q.rot, sl.rot)) fail(`${tag}: ★★の回転指定と開始向きが食い違う`); }
    // 余分ピースがどのスロットにも同じ形で必要ない(ぴったり余る)ことは上で確認済み
    // 配置: 影絵が枠に収まる / どうぐばこに収まる
    for (const lay of lays) {
      const S = fitScale(p, lay);
      if (S < 62) fail(`${tag}: 1 ます が小さい ${S.toFixed(0)} (${lay.W}x${lay.H})`);
      const t = packTray(pcs.map((q) => q.kind), lay.zone, S);
      if (!t.ok) fail(`${tag}: どうぐばこに収まらない (${lay.W}x${lay.H})`);
      else if (t.k < 0.65) fail(`${tag}: どうぐばこでの縮みが大きい k=${t.k.toFixed(2)} (${lay.W}x${lay.H})`);
    }
    // ★★★: 三角形の構成を含む
    if (lv === '3') {
      const tris = p.slots.filter((s) => /^(tri|tri2|etri)$/.test(s.kind));
      if (tris.length < 2) fail(`${tag}: 三角形が 2 つ未満`);
      for (let i = 0; i < tris.length; i++) for (let j = i + 1; j < tris.length; j++) {
        const a = tris[i], c = tris[j];
        if (a.kind === 'tri' && c.kind === 'tri' && a.cx === c.cx && a.cy === c.cy && Math.abs(a.rot - c.rot) === 180) squarePairs++;
      }
    }
    console.log(`ok  ${tag}  ${n}+${ex} pieces`);
  }
  if (lv === '3' && squarePairs < 3) fail(`lv3: 「三角形 2 つで四角」が ${squarePairs} 件(3 件以上)`);
}
console.log(bad ? `\n${bad} 件 NG` : '\nすべて OK');
process.exit(bad ? 1 : 0);
