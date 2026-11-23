// 自動動作確認(仕様書 8-4)。node tests/check.js  (要: node tools/serve.js 8090)
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path');
const BASE = 'http://localhost:8090/';
const OUT = '/tmp/claude-0/check/';
const GENRES = ['korokoro', 'hataraku', 'shinkansen', 'senro', 'memory'];
const LEVELS = { korokoro: ['1', '2', '3', 'free'], hataraku: ['1', '2', '3'], shinkansen: ['1', '2', '3'], senro: ['1', '2', '3'], memory: ['1', '2', '3'] };
const VPS = { m: { width: 874, height: 402, isMobile: true, hasTouch: true }, d: { width: 1280, height: 800 } };
const results = {}; const notes = [];
const R = (k, ok, msg) => { (results[k] ||= []).push({ ok, msg }); if (!ok) console.log('NG', k, msg); };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const seenInit = () => {
  for (const g of ['korokoro', 'hataraku', 'shinkansen', 'senro', 'memory'])
    for (const k of ['intro', 'intro1', 'intro2', 'intro3']) localStorage.setItem('kwa.g.' + g + '.seen.' + k, 'true');
};
const externals = [];
async function newCtx(browser, vp, opts = {}) {
  const ctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height }, isMobile: !!vp.isMobile, hasTouch: !!vp.hasTouch, ...opts });
  if (!opts.noSeen) await ctx.addInitScript(seenInit);
  ctx.on('request', (r) => { const u = r.url(); if (!/^(data:|blob:|about:)/.test(u) && new URL(u).hostname !== 'localhost') externals.push(u); });
  return ctx;
}
function watch(page, tag) {
  const errs = [];
  page.on('console', (m) => { if (m.type() === 'error') errs.push(tag + ' console: ' + m.text()); });
  page.on('pageerror', (e) => errs.push(tag + ' pageerror: ' + e.message));
  return errs;
}
async function toLevels(page, g) { await page.click(`[data-genre=${g}]`); await page.waitForSelector('.level-btn'); }
async function openGame(page, g, lv) { await toLevels(page, g); await page.click(`[data-level="${lv}"]`); await page.waitForSelector('canvas.scene'); }
// 論理座標 → ページ座標
async function L(page, x, y) {
  return page.evaluate(([x, y]) => {
    const r = document.querySelector('canvas.scene').getBoundingClientRect();
    const s = Math.min(r.width / 1000, r.height / 600);
    return { x: r.left + (r.width - 1000 * s) / 2 + x * s, y: r.top + (r.height - 600 * s) / 2 + y * s };
  }, [x, y]);
}
async function tapL(page, x, y) { const p = await L(page, x, y); await page.mouse.click(p.x, p.y); }

async function t1_4(browser) {
  for (const [vn, vp] of Object.entries(VPS)) {
    const ctx = await newCtx(browser, vp); const page = await ctx.newPage();
    const errs = watch(page, vn);
    await page.goto(BASE); await page.waitForSelector('.genre-card');
    for (const g of GENRES) for (const lv of LEVELS[g]) {
      const id = `${vn}/${g}/${lv}`;
      try {
        await openGame(page, g, lv); await sleep(2000);
        await page.click('.bar .home');
        await page.waitForSelector('.genre-card', { timeout: 3000 });
        R('1', true, id);
      } catch (e) { R('1', false, id + ' ' + e.message.split('\n')[0]); try { await page.goto(BASE); await page.waitForSelector('.genre-card'); } catch { } }
    }
    R('1err', errs.length === 0, `${vn} errors=${errs.length} ${errs.slice(0, 5).join(' | ')}`);
    // 音オフ初期設定の確認
    const snd = await page.evaluate(() => { try { return JSON.parse(localStorage.getItem('kwa.settings') || '{}').sound; } catch { return 'err'; } });
    R('4', !snd, `${vn} sound setting=${snd}(undefined/false=オフ)`);
    await ctx.close();
  }
}
async function t1_solve(browser) {
  const ctx = await newCtx(browser, VPS.m); const page = await ctx.newPage(); const errs = watch(page, 'solve');
  await page.goto(BASE); await page.waitForSelector('.genre-card');
  // ころころ ★1
  await openGame(page, 'korokoro', '1'); await sleep(800);
  const sol = { x: 420, y: 225 }; // puzzles.js 1番目 ramp
  const s0 = await L(page, 928, 70), s1 = await L(page, sol.x, sol.y + 40);
  await page.mouse.move(s0.x, s0.y); await page.mouse.down();
  for (let i = 1; i <= 12; i++) { await page.mouse.move(s0.x + (s1.x - s0.x) * i / 12, s0.y + (s1.y - s0.y) * i / 12); await sleep(30); }
  await page.mouse.up(); await sleep(300);
  await tapL(page, 928, 534);
  let ok = false;
  try { await page.waitForSelector('.celebrate', { timeout: 15000 }); ok = true; } catch { }
  R('1solve', ok, 'ころころ★1 を solution で解いて「できた！」が出る');
  await page.screenshot({ path: OUT + 'solve-korokoro.png' });
  await page.click('.bar .home'); await page.waitForSelector('.genre-card');
  // しんけいすいじゃく ★1 (4枚の総当たり)
  await openGame(page, 'memory', '1'); await sleep(2500);
  const centers = [0, 1, 2, 3].map((i) => ({ x: 84 + 95 + i * 214, y: 309 }));
  let done = false;
  outer: for (let a = 0; a < 4; a++) for (let b = a + 1; b < 4; b++) {
    await tapL(page, centers[a].x, centers[a].y); await sleep(150);
    await tapL(page, centers[b].x, centers[b].y);
    await sleep(1700);
    if (await page.$('.celebrate')) { done = true; break outer; }
  }
  if (!done) { // 1組そろった後の残りも試す
    for (let k = 0; k < 4 && !done; k++) for (let a = 0; a < 4 && !done; a++) for (let b = a + 1; b < 4 && !done; b++) {
      await tapL(page, centers[a].x, centers[a].y); await sleep(150); await tapL(page, centers[b].x, centers[b].y); await sleep(1700);
      if (await page.$('.celebrate')) done = true;
    }
  }
  R('1solve', done, 'しんけいすいじゃく★1 総当たりで「ぜんぶ みつけた！」');
  await page.screenshot({ path: OUT + 'solve-memory.png' });
  R('1err', errs.length === 0, `solve errors=${errs.length} ${errs.join('|')}`);
  await ctx.close();
}
async function t2(browser) {
  const ctx = await newCtx(browser, VPS.d); const page = await ctx.newPage(); const errs = watch(page, 'sw');
  await page.goto(BASE); await page.waitForSelector('.genre-card');
  const reg = await page.evaluate(async () => { try { const r = await Promise.race([navigator.serviceWorker.ready, new Promise((_, j) => setTimeout(() => j('timeout'), 8000))]); return !!r.active; } catch (e) { return String(e); } });
  R('2', reg === true, 'SW 登録/有効化 ' + reg);
  await sleep(2500); await page.reload(); await page.waitForSelector('.genre-card'); await sleep(1500);
  await ctx.setOffline(true);
  try {
    await page.reload(); await page.waitForSelector('.genre-card', { timeout: 8000 });
    R('2', true, 'オフライン再読み込みでホーム表示');
    for (const g of GENRES) { await openGame(page, g, '1'); await sleep(600); await page.click('.bar .home'); await page.waitForSelector('.genre-card'); }
    R('2', true, 'オフラインで全ジャンル ★1 を開けた');
  } catch (e) { R('2', false, 'オフライン失敗 ' + e.message.split('\n')[0]); }
  R('2', errs.length === 0, 'offline errors ' + errs.slice(0, 3).join('|'));
  await ctx.setOffline(false); await ctx.close();
}
async function t5(browser) {
  const ctx = await newCtx(browser, VPS.m); const page = await ctx.newPage(); watch(page, 'fps');
  const cdp = await ctx.newCDPSession(page);
  await page.goto(BASE); await page.waitForSelector('.genre-card');
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
  const fps = () => page.evaluate(() => new Promise((res) => { let n = 0; const t0 = performance.now(); const f = (t) => { n++; if (t - t0 < 3000) requestAnimationFrame(f); else res(n / ((t - t0) / 1000)); }; requestAnimationFrame(f); }));
  // ころころ 実行中
  await openGame(page, 'korokoro', '1'); await sleep(500);
  const s0 = await L(page, 928, 70), s1 = await L(page, 420, 265);
  await page.mouse.move(s0.x, s0.y); await page.mouse.down(); await page.mouse.move(s1.x, s1.y, { steps: 8 }); await page.mouse.up();
  await tapL(page, 928, 534); await sleep(300);
  let v = await fps(); R('5', v >= 30, `ころころ★1 実行中 ${v.toFixed(1)}fps`);
  await page.click('.bar .home'); await page.waitForSelector('.genre-card');
  for (const g of ['senro', 'shinkansen']) {
    await openGame(page, g, '1'); await sleep(500);
    // 操作しながら測る(画面中央をゆっくりなぞる)
    const p = await L(page, 500, 300); await page.mouse.move(p.x, p.y); await page.mouse.down(); await page.mouse.move(p.x + 80, p.y + 20, { steps: 10 }); await page.mouse.up();
    v = await fps(); R('5', v >= 30, `${g}★1 ${v.toFixed(1)}fps`);
    await page.click('.bar .home'); await page.waitForSelector('.genre-card');
  }
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 }); await ctx.close();
}
const MEASURE = () => {
  const out = { small: [], font: [] };
  const vis = (el) => { const r = el.getBoundingClientRect(); const cs = getComputedStyle(el); return r.width > 0 && r.height > 0 && cs.visibility !== 'hidden' && cs.display !== 'none' && cs.opacity !== '0'; };
  document.querySelectorAll('button, .btn, .genre-card, .level-btn, .choice').forEach((el) => {
    if (!vis(el)) return; const r = el.getBoundingClientRect();
    if (r.width < 63.5 || r.height < 63.5) out.small.push(`${el.className || el.tagName}#${(el.dataset.genre || el.dataset.level || el.textContent || '').slice(0, 10)} ${r.width.toFixed(0)}x${r.height.toFixed(0)}`);
  });
  const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  let n; while ((n = w.nextNode())) {
    const t = n.textContent.trim(); if (!t) continue; const el = n.parentElement;
    if (!el || el.closest('rt') || ['SCRIPT', 'STYLE'].includes(el.tagName) || !vis(el)) continue;
    const fs = parseFloat(getComputedStyle(el).fontSize);
    if (fs < 24) out.font.push(`${fs}px "${t.slice(0, 14)}" <${el.tagName}.${el.className}>`);
  }
  return out;
};
async function t6(browser) {
  for (const [vn, vp] of Object.entries(VPS)) {
    const ctx = await newCtx(browser, vp); const page = await ctx.newPage(); watch(page, 't6');
    await page.goto(BASE); await page.waitForSelector('.genre-card');
    const chk = async (name) => { const o = await page.evaluate(MEASURE); R('6', !o.small.length && !o.font.length, `${vn} ${name} 小ボタン=${JSON.stringify([...new Set(o.small)])} 小文字=${JSON.stringify([...new Set(o.font)].slice(0, 6))}`); };
    await chk('home');
    for (const g of GENRES) {
      await toLevels(page, g); await chk(g + ' levels');
      for (const lv of LEVELS[g]) { await page.click(`[data-level="${lv}"]`); await page.waitForSelector('canvas.scene'); await sleep(1200); await chk(`${g} ★${lv}`); await page.click('.bar .home'); await page.waitForSelector('.level-btn,.genre-card'); if (await page.$('.level-btn')) { /* 戻り先が一覧なら続行 */ } else await toLevels(page, g); }
      await page.goto(BASE); await page.waitForSelector('.genre-card');
    }
    // 設定
    const gear = await page.$('.adult-gear'); const b = await gear.boundingBox();
    await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2); await page.mouse.down(); await sleep(3300); await page.mouse.up();
    await page.waitForSelector('.settings'); await chk('settings');
    await ctx.close();
  }
}
function t7_8() {
  const pal = 'D9786A E8A26A EBCB74 A9C98A 7FAE8E 8CBCD9 6E8FBF A895C2 A98466 9A9690 4A4642 FAF5EA'.split(' ').map((c) => c.toUpperCase());
  const palRgb = pal.map((h) => [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16)).join(','));
  const files = []; (function walk(d) { for (const f of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, f.name); if (f.isDirectory()) walk(p); else if (/\.(js|css|mjs)$/.test(f.name)) files.push(p); } })(path.resolve(__dirname, '../src'));
  const bad = [];
  for (const f of files) fs.readFileSync(f, 'utf8').split('\n').forEach((line, i) => {
    for (const m of line.matchAll(/#([0-9a-fA-F]{6}|[0-9a-fA-F]{3,8})\b/g)) { if (!(m[1].length === 6 && pal.includes(m[1].toUpperCase()))) { if (/^[0-9a-fA-F]{3,8}$/.test(m[1]) && /['"`(:\s]#/.test(line.slice(Math.max(0, m.index - 1), m.index + 1)) || m[1].length === 6) bad.push(`${path.relative(process.cwd(), f)}:${i + 1} ${m[0]}`); } }
    for (const m of line.matchAll(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/g)) { const k = `${+m[1]},${+m[2]},${+m[3]}`; if (!palRgb.includes(k)) bad.push(`${path.relative(process.cwd(), f)}:${i + 1} ${m[0]})`); }
  });
  R('7', bad.length === 0, `パレット外 ${bad.length} 件: ` + bad.slice(0, 40).join(' ; '));
  const words = ['ばつ', '×', '✕', '失敗', 'しっぱい', 'ざんねん', '点数', 'てんすう', 'タイマー', 'スコア'];
  const hits = [];
  for (const f of files.concat(['index.html'].map((x) => path.resolve(__dirname, '..', x)))) fs.readFileSync(f, 'utf8').split('\n').forEach((line, i) => {
    const code = line.replace(/\/\/.*$/, '').replace(/\/\*.*?\*\//g, '').replace(/<!--.*?-->/g, '');
    if (/^\s*(\*|\/\*)/.test(line)) return;
    for (const w of words) if (code.includes(w)) hits.push(`${path.relative(process.cwd(), f)}:${i + 1} 「${w}」 ${code.trim().slice(0, 70)}`);
  });
  R('8', hits.length === 0, `禁止語 ${hits.length} 件: ` + hits.join(' ; '));
}
async function t9(browser) {
  const sizes = { '874x402': [874, 402, 1], '402x874': [402, 874, 1], '1280x800': [1280, 800, 0], '800x1280': [800, 1280, 0] };
  for (const [sn, [w, h, mob]] of Object.entries(sizes)) {
    const ctx = await newCtx(browser, { width: w, height: h, isMobile: !!mob, hasTouch: !!mob }); const page = await ctx.newPage(); const errs = watch(page, sn);
    await page.goto(BASE); await page.waitForSelector('.genre-card'); await sleep(500);
    await page.screenshot({ path: `${OUT}${sn}-home.png` });
    for (const g of GENRES) {
      await toLevels(page, g); await sleep(300); await page.screenshot({ path: `${OUT}${sn}-${g}-levels.png` });
      await page.click('[data-level="1"]'); await page.waitForSelector('canvas.scene'); await sleep(1800);
      await page.screenshot({ path: `${OUT}${sn}-${g}-1.png` });
      await page.click('.bar .home'); await page.waitForSelector('.genre-card'); // 履歴で ホームへ
    }
    R('9err', errs.length === 0, `${sn} errors ${errs.join('|')}`);
    await ctx.close();
  }
}
async function t10(browser) {
  const ctx = await newCtx(browser, VPS.m); const page = await ctx.newPage(); const errs = watch(page, 't10');
  await page.goto(BASE); await page.waitForSelector('.genre-card');
  const gear = await page.$('.adult-gear'); const b = await gear.boundingBox(); const cx = b.x + b.width / 2, cy = b.y + b.height / 2;
  await page.mouse.move(cx, cy); await page.mouse.down(); await sleep(1500); await page.mouse.up();
  R('10', !(await page.$('.settings')), '1.5 秒では開かない');
  await page.mouse.move(cx, cy); await page.mouse.down(); await sleep(3300); await page.mouse.up();
  const open = !!(await page.$('.settings')); R('10', open, '3 秒長押しで開く');
  if (open) {
    const before = await page.evaluate(() => document.querySelector('.home').innerText);
    await page.screenshot({ path: OUT + 'settings-1.png' });
    await page.click('.choice[data-key=sound][data-val=true]');
    const sOn = await page.evaluate(() => JSON.parse(localStorage.getItem('kwa.settings')).sound && document.querySelector('.choice[data-key=sound][data-val=true]').classList.contains('on'));
    R('10', sOn, '音オンに切り替わる');
    await page.click('.choice[data-key=sound][data-val=false]');
    await page.click('.choice[data-key=lang][data-val=en]'); await sleep(300);
    const mid = await page.evaluate(() => document.querySelector('.home') ? document.querySelector('.home').innerText : null);
    await page.screenshot({ path: OUT + 'settings-2-en.png' });
    R('10', mid !== before, `English で表示が変わる(設定中のホーム文字 before="${before.replace(/\n/g, '/').slice(0, 40)}" after="${(mid || '').replace(/\n/g, '/').slice(0, 40)}")`);
    await page.click('.settings .close'); await page.waitForSelector('.genre-card'); await sleep(300);
    const closed = !(await page.$('.settings'));
    const after = await page.evaluate(() => document.querySelector('.home').innerText);
    R('10', closed && after !== before, `とじるでホームに戻り、表示が English に(after="${after.replace(/\n/g, '/').slice(0, 50)}")`);
    await page.screenshot({ path: OUT + 'settings-3-home-en.png' });
  }
  R('10', errs.length === 0, 'errors ' + errs.join('|'));
  await ctx.close();
}
(async () => {
  const browser = await chromium.launch();
  const only = process.argv[2];
  const T = { 1: t1_4, s: t1_solve, 2: t2, 5: t5, 6: t6, 9: t9, 10: t10 };
  for (const [k, f] of Object.entries(T)) { if (only && only !== k) continue; console.log('run', k); try { await f(browser); } catch (e) { R('crash' + k, false, e.stack.split('\n').slice(0, 3).join(' ')); } }
  if (!only) t7_8();
  R('3', externals.length === 0, `外部リクエスト ${externals.length} 件 ${[...new Set(externals)].slice(0, 5).join(',')}`);
  await browser.close();
  console.log('\n=== 結果 ===');
  for (const [k, arr] of Object.entries(results)) { const ng = arr.filter((x) => !x.ok); console.log(`${k}: ${ng.length ? 'NG' : 'OK'} (${arr.length - ng.length}/${arr.length})`); ng.forEach((x) => console.log('   - ' + x.msg)); if (!ng.length && ['5', '2', '10', '4', '1solve'].includes(k)) arr.forEach((x) => console.log('   . ' + x.msg)); }
})();
