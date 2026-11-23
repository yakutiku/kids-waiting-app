// ころころそうちのお題が「解ける」「置かないと解けない」ことを確かめる(開発用)
// node tests/korokoro-sim.mjs [level] [index] [--trace]
import { createWorld, simulate } from '../src/genres/korokoro/physics.js';
import { buildPart, buildField } from '../src/genres/korokoro/parts.js';
import { PUZZLES } from '../src/genres/korokoro/puzzles.js';

function run(fixed, extra, seconds = 14, trace = false) {
  const w = createWorld();
  buildField(w);
  const parts = [...fixed, ...extra].map((p) => ({ ...p }));
  parts.forEach((p) => buildPart(w, p));
  let goal = false, at = 0;
  const step = 0.25;
  for (let t = 0; t < seconds && !goal; t += step) {
    simulate(w, step, (e) => { if (e.type === 'goal') { goal = true; at = t; } });
    if (trace) console.log(t.toFixed(2), w.balls.map((b) => `${b.x.toFixed(0)},${b.y.toFixed(0)}${b.held ? 'H' : ''}`).join(' | '), w.bodies.map(b=>b.angle.toFixed(2)).join(','));
  }
  return { goal, at, balls: w.balls.map((b) => [Math.round(b.x), Math.round(b.y)]) };
}
const [lvArg, idxArg] = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const trace = process.argv.includes('--trace');
let bad = 0;
for (const lv of Object.keys(PUZZLES)) {
  if (lvArg && lv !== lvArg) continue;
  PUZZLES[lv].forEach((pz, i) => {
    if (idxArg != null && String(i) !== idxArg) return;
    const sol = run(pz.fixed, pz.solution, 14, trace);
    const none = run(pz.fixed, [], 14);
    const wrong = (pz.wrong || []).map((wr) => run(pz.fixed, wr, 14).goal);
    const ok = sol.goal && !none.goal && !wrong.some(Boolean);
    // ずれても解けるか(置く位置を ±30 ずらす)
    let tot = 0, good = 0;
    for (let dx = -30; dx <= 30; dx += 15) for (let dy = -30; dy <= 30; dy += 15) {
      const moved = pz.solution.map((p) => ({ ...p, x: p.x + dx, y: p.type === 'domino' ? p.y : p.y + dy }));
      tot++; if (run(pz.fixed, moved, 14).goal) good++;
    }
    if (!ok) bad++;
    console.log(`★${lv}-${i + 1} ${pz.name || ''}: 解ける=${sol.goal}${sol.goal ? '(' + sol.at.toFixed(1) + 's)' : ' end ' + JSON.stringify(sol.balls)}  置かずに解ける=${none.goal} ずれOK=${good}/${tot}${wrong.length ? ' まちがいで解ける=' + wrong : ''} ${ok ? 'OK' : '★NG'}`);
  });
}
process.exitCode = bad ? 1 : 0;
