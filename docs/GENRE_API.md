# ジャンルの作り方(作業者向け)

素の HTML/CSS/JavaScript(ES モジュール)。ビルドなし、npm パッケージ・外部ライブラリ・ウェブフォント・画像/音ファイル **使用禁止**。
外部への通信も禁止。すべてコードで描く。

## ファイル
`src/genres/<id>/index.js` に default export する。自分のフォルダ以外は編集しない(必要なら同じフォルダにファイルを増やすのは可)。
見本: `src/genres/memory/index.js`(くるま しんけいすいじゃく)。まずこれを読むこと。

```js
export default {
  id: 'hataraku',
  title: { ja: 'はたらく くるま', en: 'Working vehicles' },   // ja は「{カタカナ|よみ}」でふりがな
  drawIcon(ctx, size) { /* size×size の正方形にアイコンを描く */ },
  levels: [{ id: '1', stars: 1 }, { id: '2', stars: 2 }, { id: '3', stars: 3 }],
  // 星以外の遊び方を足すとき: { id: 'free', ja: 'じゆうに つくる', en: 'Free build', drawIcon(ctx, size) {} }
  start(api) {
    // ... 遊びを始める
    return { retry() {}, next() {}, stop() {} };  // もういっかい / つぎへ / おわり(片付け)
  },
};
```

## api(start に渡される)
| 名前 | 内容 |
|---|---|
| `api.level` | 選ばれた levels の 1 つ(`api.level.id` は '1' '2' '3' など) |
| `api.createScene({width:1000,height:600})` | キャンバスを作る。論理座標 1000×600 で描けば自動で拡大縮小・中央寄せ。下記 scene 参照 |
| `api.celebrate({ja, en})` | 「できた！」の表示 + つぎへボタンがやさしく光る。お題を解いたら呼ぶ |
| `api.markSolved()` | 解いた記録(画面には出ない) |
| `api.firstTime(key='intro')` | その遊びを初めて開いたときだけ true。手のアニメの見本を出すのに使う |
| `api.play(name)` | 効果音(音オフなら何もしない)。tap pick drop back pop done ding thud click boing whoosh train flip |
| `api.speak(ja, en)` | 読み上げ(音オン+読み上げオンのときだけ) |
| `api.drawLabel(ctx, ja, en, x, y, size)` | キャンバスに日本語+小さく英語(設定に従う)。(x,y) は日本語行の中心。英語は y+size*0.9 に出る |
| `api.load(key, fallback)` / `api.save(key, value)` | 端末内保存(ジャンルごとに自動で分かれる) |
| `api.glowNext(bool)` | つぎへボタンを光らせる/消す |

### scene
| 名前 | 内容 |
|---|---|
| `scene.onFrame = (ctx, dt, t) => {}` | 毎フレーム呼ばれる。ctx は論理座標に変換済み。背景(画用紙)は描画済み |
| `scene.onPointerDown/Move/Up = (p) => {}` | `p = {x, y, id, primary}`(論理座標)。複数指は `p.primary` で主の指だけ扱うのが無難 |
| `scene.hand(steps, {speed})` | 手のアニメでやって見せる。`steps=[{x,y,press:true,onArrive(),wait}]`。子どもが触ると中断。Promise |
| `scene.sparkle(x, y, {count})` | キラキラ |
| `scene.floatText(ja, en, x, y, {size})` | 「ガタン」などの文字が浮かんで消える |
| `scene.view` | 実際に見えている論理範囲 `{x0,y0,x1,y1}`(1000×600 の外も少し見えることがある) |

`hit(p, rect, pad)`, `ease.out/inOut/back`, `approach()` は `src/core/scene.js` から import できる。

## 絵(src/crayon/)
- `palette.js` の `P` だけを色に使う(P.aka, P.daidai, P.kiiro, P.kimidori, P.midori, P.sorairo, P.ao, P.murasaki, P.chairo, P.haiiro, P.sumi, P.gayoshi)。透明度(globalAlpha)はOK。**他の色コードは書かない**。
- `crayon.js`: `crayonRect(ctx,x,y,w,h,fill,{r,seed,stroke,width})`, `crayonCircle`, `crayonPoly(ctx,pts,fill,opt)`, `crayonLine(ctx,pts,{color,width,closed,seed})`, `crayonWheel`, `starPts`, `rectPts`, `circlePts`, `sprite(key,w,h,drawFn)`, `drawSprite`, `crayonText`。
- **重要(速さ)**: crayonRect などは重いので、onFrame で毎回呼ばない。`sprite(key, w, h, (c)=>{...})` で 1 度だけ描いてキャッシュし、`drawSprite(ctx, spr, x, y, w, h)` で描く(key は絵ごとに一意)。
- `vehicles.js`: `drawVehicle(ctx, id, x, y, w, flip)`(右向き、高さは w*0.65、flip=true で左向き)。id は `VEHICLES` のキー(excavator dump crane fire ambulance police garbage mixer bulldozer roller forklift bus tow shinkansen shinkansenBlue shinkansenRed shinkansenCar shinkansenCarBlue loco freight)。`VEHICLES[id]` に ja / yomi / en / job{ja,en}。`drawPerson(ctx, variant, x, y, h)`(人、幅 h*0.6)、`drawCrate(ctx,x,y,size,color,seed)`(荷物の箱)。
- 新しい絵が必要なら自分のフォルダに同じ書き方(crayon 関数 + sprite キャッシュ)で作る。

## 守るルール(モンテッソーリ・仕様書 2-2)
- 文字が読めなくても遊べる(お題は絵で示す)。文章は最小限。
- **「ばつ」「失敗」「ざんねん」の表示・音を出さない**。合わない操作は部品がそっと元の場所に戻るだけ(`api.play('back')`)。
- **点数・コイン・ランキング・タイマー・制限時間なし**。できた結果(車が動き出す等)がごほうび。最後に `api.celebrate()` と `api.markSolved()`。
- 1 お題 1〜3 分。`next()` で次のお題、`retry()` で同じお題をやり直し。何度でも。
- 難しさ ★〜★★★ を用意。★ はとてもやさしく。
- 初回は `if (api.firstTime()) scene.hand([...])` で、手のアニメでゆっくり見本を見せる。
- 音なしで成立させる(できた/合わないは動き・キラキラ・文字絵で伝える)。
- タップできるもの・つかむものは論理座標で **最低 110×110**(iPhone 横向きで 64px 以上になるように)。小さい物は当たり判定(pad)を広げる。
- 文字は論理サイズで 34 以上。ひらがな中心、カタカナには「{カタカナ|よみ}」でふりがな。単語の区切りに半角スペース(わかちがき)。
- 点滅・激しい揺れ・高速な動きはしない。
- 実在の番組・車両のロゴ・名前の商標は使わない(「しんかんせん」は一般名なのでOK)。
- localStorage は必ず api.load/save 経由(try/catch 済み)。

## 確認
`node tools/serve.js 8080` で http://localhost:8080/ 。Playwright(`require('playwright')`、chromium.launch() そのまま)でスクリーンショットを撮って目で確認できる。
iPhone 横向き相当 874×402、Fire HD 10 横 1280×800、縦向き 800×1280 / 402×874 で崩れないこと。
コンソールにエラーが出ないこと。
