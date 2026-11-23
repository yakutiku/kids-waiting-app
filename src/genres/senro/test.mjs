// node src/genres/senro/test.mjs  — 全問題が解けるか・最初から つながっていないか
import { LEVELS } from './levels.js';
import { parseProblem, solve, trace } from './logic.js';
let bad = 0;
for (const [lv, list] of Object.entries(LEVELS)) {
  list.forEach((prob, i) => {
    const P = parseProblem(prob);
    const sol = solve(P);
    const empties = P.grid.flat().filter((c) => c.k === 'empty').length;
    const already = trace(P, () => null).ok;
    const msg = `★${lv}-${i + 1} ${P.cols}x${P.rows} あき=${sol ? sol.used : '-'} どうぐ=${P.tools.length} 余り=${sol ? P.tools.length - sol.used : '-'} 空マス=${empties}`;
    const errs = [];
    if (!sol) errs.push('解けない');
    if (already) errs.push('最初からつながっている');
    if (sol) {
      // 解を実際に置いて trace で確認
      const t = trace(P, (c, r) => sol.placed.get(c + ',' + r) || null);
      if (!t.ok) errs.push('trace不一致');
    }
    if (errs.length) bad++;
    console.log(msg, errs.join(','));
  });
}
console.log(bad ? 'NG ' + bad : 'ALL OK');
process.exit(bad ? 1 : 0);
