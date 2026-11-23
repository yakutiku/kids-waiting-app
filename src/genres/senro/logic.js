// せんろ つなぎ: 盤面の論理(描画なし。テストからも使う)
// 方角: 0=きた 1=ひがし 2=みなみ 3=にし
export const DV = [[0, -1], [1, 0], [0, 1], [-1, 0]];
export const opp = (d) => (d + 2) % 4;

/** 部品がつないでいる 2 つの方角。s=まっすぐ(rot0 は ひがし-にし), c=カーブ(rot0 は きた-ひがし) */
export function conns(type, rot) {
  const r = ((rot % 4) + 4) % 4;
  if (type === 's') return r % 2 === 0 ? [1, 3] : [0, 2];
  return [r, (r + 1) % 4];
}

const DIRCH = { '^': 0, '>': 1, v: 2, '<': 3 };
const CURVE = { NE: 0, ES: 1, SW: 2, WN: 3 };

/** { rows:['S> -- ..', ...], tools:['s','c1'] } → 盤面 */
export function parseProblem(prob) {
  const grid = prob.rows.map((row) => row.trim().split(/\s+/).map((tok) => {
    if (tok === '..') return { k: 'empty' };
    if (tok === 'TT') return { k: 'block', deco: 'tree' };
    if (tok === 'MM') return { k: 'block', deco: 'mountain' };
    if (tok === 'PP') return { k: 'block', deco: 'pond' };
    if (tok[0] === 'S') return { k: 'start', dir: DIRCH[tok[1]] };
    if (tok[0] === 'G') return { k: 'goal', dir: DIRCH[tok[1]] };
    if (tok === '--') return { k: 'fixed', type: 's', rot: 0 };
    if (tok === '||') return { k: 'fixed', type: 's', rot: 1 };
    if (tok in CURVE) return { k: 'fixed', type: 'c', rot: CURVE[tok] };
    throw new Error('bad token ' + tok);
  }));
  const cols = grid[0].length, rows = grid.length;
  for (const r of grid) if (r.length !== cols) throw new Error('ragged rows');
  let start = null, goal = null;
  grid.forEach((row, r) => row.forEach((cell, c) => {
    if (cell.k === 'start') start = { c, r, dir: cell.dir };
    if (cell.k === 'goal') goal = { c, r, dir: cell.dir };
  }));
  const tools = prob.tools.map((t) => ({ type: t[0], rot: t.length > 1 ? +t[1] : 0 }));
  return { grid, cols, rows, start, goal, tools };
}

/**
 * スタートからたどる。placed(c,r) は あいたマスに置いた部品 {type,rot} か null。
 * 返り値: { ok, cells:[{c,r,inDir,outDir,type}] }  (inDir/outDir は方角。スタート/ゴールの駅も含む)
 */
export function trace(P, placed) {
  const cells = [{ c: P.start.c, r: P.start.r, inDir: null, outDir: P.start.dir, type: 'start' }];
  let { c, r } = P.start;
  let d = P.start.dir;
  for (let i = 0; i < 200; i++) {
    c += DV[d][0]; r += DV[d][1];
    if (c < 0 || r < 0 || c >= P.cols || r >= P.rows) return { ok: false, cells };
    const cell = P.grid[r][c];
    if (cell.k === 'goal') {
      if (cell.dir === opp(d)) { cells.push({ c, r, inDir: d, outDir: null, type: 'goal' }); return { ok: true, cells }; }
      return { ok: false, cells };
    }
    let t = null;
    if (cell.k === 'fixed') t = cell;
    else if (cell.k === 'empty') t = placed(c, r);
    if (!t) return { ok: false, cells };
    const cs = conns(t.type, t.rot);
    const back = opp(d);
    if (!cs.includes(back)) return { ok: false, cells };
    const out = cs[0] === back ? cs[1] : cs[0];
    cells.push({ c, r, inDir: d, outDir: out, type: t.type });
    d = out;
  }
  return { ok: false, cells };
}

/** 解けるか(テスト用)。部品の数を使い切らない範囲で たどりながら置いていく。 */
export function solve(P) {
  const have = { s: 0, c: 0 };
  P.tools.forEach((t) => have[t.type]++);
  const placed = new Map();
  let best = null;
  function go(c, r, d, used) {
    c += DV[d][0]; r += DV[d][1];
    if (c < 0 || r < 0 || c >= P.cols || r >= P.rows) return;
    const cell = P.grid[r][c];
    if (cell.k === 'goal') { if (cell.dir === opp(d) && (!best || used < best.used)) best = { used, placed: new Map(placed) }; return; }
    if (placed.has(c + ',' + r)) return;
    if (cell.k === 'fixed') {
      const cs = conns(cell.type, cell.rot);
      if (!cs.includes(opp(d))) return;
      go(c, r, cs[0] === opp(d) ? cs[1] : cs[0], used);
    } else if (cell.k === 'empty') {
      for (const type of ['s', 'c']) {
        if (!have[type]) continue;
        for (let rot = 0; rot < 4; rot++) {
          const cs = conns(type, rot);
          if (!cs.includes(opp(d))) continue;
          const out = cs[0] === opp(d) ? cs[1] : cs[0];
          have[type]--; placed.set(c + ',' + r, { type, rot });
          go(c, r, out, used + 1);
          have[type]++; placed.delete(c + ',' + r);
        }
      }
    }
  }
  go(P.start.c, P.start.r, P.start.dir, 0);
  return best;
}
