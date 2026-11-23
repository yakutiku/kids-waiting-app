// アイコン画像を作る(開発時のみ)。node tools/make-icons.js (サーバー起動中に)
const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const port = process.argv[2] || 8080;
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 512, height: 512 } });
  await p.goto(`http://localhost:${port}/tools/icon.html`);
  await p.waitForTimeout(500);
  for (const s of [512, 192, 180]) {
    await p.setViewportSize({ width: s, height: s });
    await p.evaluate((s) => window.draw(s), s);
    await p.screenshot({ path: path.resolve(__dirname, '../icons/icon-' + s + '.png'), omitBackground: false });
  }
  await b.close();
})();
