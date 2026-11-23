// 画面の骨組み: ホーム(ジャンル選択) → むずかしさ選択 → あそぶ画面、と大人用設定。
import { P } from '../crayon/palette.js';
import { iconCanvas, crayonPoly, crayonLine, crayonCircle, crayonRect, starPts, rectPts, crayonText } from '../crayon/crayon.js';
import { label, txt, drawLabel, plain } from './i18n.js';
import { settings } from './settings.js';
import { play, speak, unlockAudio } from './sound.js';
import { load, save, clearAll } from './storage.js';
import { createScene } from './scene.js';
import { GENRES } from './genres.js';

const $ = (tag, cls, parent) => { const e = document.createElement(tag); if (cls) e.className = cls; if (parent) parent.append(e); return e; };

// ---------- 共通アイコン ----------
const ICONS = {
  home: (c, s) => {
    const k = s / 100; c.scale(k, k);
    crayonPoly(c, [[50, 12], [90, 48], [80, 48], [80, 88], [20, 88], [20, 48], [10, 48]], P.daidai, { seed: 1 });
    crayonRect(c, 42, 60, 16, 28, P.chairo, { seed: 2, width: 2.5 });
  },
  retry: (c, s) => {
    const k = s / 100; c.scale(k, k);
    const pts = [];
    for (let i = 0; i <= 20; i++) { const a = -0.3 + (i / 20) * 4.9; pts.push([50 + Math.cos(a) * 30, 52 + Math.sin(a) * 30]); }
    crayonLine(c, pts, { width: 9, color: P.ao, seed: 3 });
    const e = pts[pts.length - 1];
    crayonPoly(c, [[e[0] - 4, e[1] - 18], [e[0] + 18, e[1] + 2], [e[0] - 8, e[1] + 12]], P.ao, { seed: 4, width: 2.5 });
  },
  next: (c, s) => {
    const k = s / 100; c.scale(k, k);
    crayonPoly(c, [[14, 38], [54, 38], [54, 18], [90, 50], [54, 82], [54, 62], [14, 62]], P.midori, { seed: 5 });
  },
  gear: (c, s) => {
    const k = s / 100; c.scale(k, k);
    const pts = [];
    for (let i = 0; i < 16; i++) { const r = i % 2 ? 30 : 40; const a = (i / 16) * Math.PI * 2; pts.push([50 + Math.cos(a) * r, 50 + Math.sin(a) * r]); }
    crayonPoly(c, pts, P.haiiro, { seed: 6, width: 2.5 });
    crayonCircle(c, 50, 50, 11, P.gayoshi, { seed: 7, width: 2 });
  },
  phone: (c, s) => {
    const k = s / 100; c.scale(k, k);
    crayonRect(c, 18, 30, 64, 40, P.sorairo, { r: 8, seed: 21, width: 3 });
    crayonLine(c, [[30, 18], [50, 8], [70, 18]], { width: 4, color: P.daidai, seed: 22 });
    crayonPoly(c, [[64, 10], [76, 20], [62, 24]], P.daidai, { seed: 23, width: 2 });
  },
  star: (c, s) => { const k = s / 100; c.scale(k, k); crayonPoly(c, starPts(50, 52, 44), P.kiiro, { seed: 8 }); },
};

// ---------- 状態 ----------
const root = document.getElementById('app');
let current = null; // { dispose() }

function clearScreen() {
  if (current) { try { current.dispose(); } catch (e) { console.error(e); } current = null; }
  root.textContent = '';
}

function makeBtn(cls, iconKey, ja, en, size = 64) {
  const b = $('button', 'btn ' + cls);
  b.type = 'button';
  b.setAttribute('aria-label', plain(ja) + ' / ' + en);
  b.append(iconCanvas(size, ICONS[iconKey], iconKey + size));
  return b;
}

/** タッチで押した感じを出す + 効果音 */
function onTap(el, fn) {
  el.addEventListener('pointerdown', () => { el.classList.add('pressed'); unlockAudio(); });
  const clear = () => el.classList.remove('pressed');
  el.addEventListener('pointerup', clear);
  el.addEventListener('pointercancel', clear);
  el.addEventListener('pointerleave', clear);
  el.addEventListener('click', (e) => { e.preventDefault(); play('tap'); fn(e); });
}

// ---------- 画面の履歴(Fire の「もどる」ボタン対応) ----------
// ホームから離れるときに 1 つだけ履歴を積む。「もどる」でいつでもホームへ。
let away = false;
function pushScreen() {
  if (away) return;
  away = true;
  try { history.pushState({ s: 'away' }, ''); } catch { }
}
window.addEventListener('popstate', () => {
  away = false;
  closeSettings();
  showHome();
});

// ---------- ホーム ----------
export function showHome(push = true) {
  clearScreen();
  if (push) { /* ホームは履歴の一番下 */ }
  const scr = $('div', 'screen home', root);
  const head = $('div', 'home-head', scr);
  head.append(label('なにで あそぶ？', 'What shall we play?', { className: 'title' }));
  const grid = $('div', 'genre-grid', scr);
  for (const g of GENRES) {
    const card = $('button', 'genre-card', grid);
    card.type = 'button';
    card.dataset.genre = g.id;
    const ic = iconCanvas(150, (c, s) => g.drawIcon(c, s), 'genre-' + g.id);
    ic.className = 'genre-icon';
    card.append(ic, label(g.title.ja, g.title.en));
    onTap(card, () => { speak(g.title.ja, g.title.en); showLevels(g); });
  }
  // 大人用設定(長押し 3 秒)
  const gear = $('div', 'adult-gear', scr);
  gear.setAttribute('aria-label', 'おとなの せってい(ながおし 3びょう)');
  gear.append(iconCanvas(44, ICONS.gear, 'gear44'));
  const ring = $('div', 'gear-ring', gear);
  let timer = null;
  const start = (e) => {
    e.preventDefault();
    gear.classList.add('holding');
    timer = setTimeout(() => { gear.classList.remove('holding'); openSettings(); }, 3000);
  };
  const cancel = () => { gear.classList.remove('holding'); clearTimeout(timer); };
  gear.addEventListener('pointerdown', start);
  gear.addEventListener('pointerup', cancel);
  gear.addEventListener('pointerleave', cancel);
  gear.addEventListener('pointercancel', cancel);
  current = { dispose() { clearTimeout(timer); } };
}

// ---------- むずかしさ選択 ----------
function bar(scr, { onHome, onRetry, onNext }) {
  const b = $('div', 'bar', scr);
  const home = makeBtn('home', 'home', 'おうち', 'home');
  const retry = makeBtn('retry', 'retry', 'もういっかい', 'again');
  const next = makeBtn('next', 'next', 'つぎへ', 'next');
  b.append(home, retry, next);
  onTap(home, onHome);
  if (onRetry) onTap(retry, onRetry); else retry.classList.add('hidden');
  if (onNext) onTap(next, onNext); else next.classList.add('hidden');
  return { home, retry, next };
}

function showLevels(g) {
  clearScreen();
  pushScreen();
  const scr = $('div', 'screen levels with-bar', root);
  bar(scr, { onHome: () => goHome() });
  const body = $('div', 'levels-body', scr);
  const head = $('div', 'levels-head', body);
  const ic = iconCanvas(110, (c, s) => g.drawIcon(c, s), 'genre-' + g.id + '-110');
  head.append(ic, label(g.title.ja, g.title.en, { className: 'title' }));
  const row = $('div', 'level-row', body);
  for (const lv of g.levels) {
    const b = $('button', 'level-btn', row);
    b.type = 'button';
    b.dataset.level = lv.id;
    if (lv.stars) {
      const stars = $('div', 'stars', b);
      for (let i = 0; i < lv.stars; i++) stars.append(iconCanvas(lv.stars === 3 ? 46 : 54, ICONS.star, 'star' + (lv.stars === 3 ? 46 : 54)));
      b.setAttribute('aria-label', '★'.repeat(lv.stars));
      if (lv.ja) b.append(label(lv.ja, lv.en, { className: 'small' }));
    } else {
      if (lv.drawIcon) b.append(iconCanvas(64, lv.drawIcon, 'lv-' + g.id + lv.id));
      b.append(label(lv.ja, lv.en, { className: 'small' }));
    }
    onTap(b, () => startGame(g, lv));
  }
  current = { dispose() { } };
}

function goHome() {
  if (away) { try { history.back(); return; } catch { } }
  showHome();
}

// ---------- あそぶ画面 ----------
function startGame(g, lv) {
  clearScreen();
  const scr = $('div', 'screen game with-bar', root);
  scr.dataset.genre = g.id;
  let inst = null;
  const btns = bar(scr, {
    onHome: () => goHome(),
    onRetry: () => { btns.next.classList.remove('glow'); inst && inst.retry && inst.retry(); },
    onNext: () => { btns.next.classList.remove('glow'); inst && inst.next && inst.next(); },
  });
  const stage = $('div', 'stage', scr);
  const hint = $('div', 'rotate-hint', scr);
  hint.setAttribute('aria-label', 'よこむきに すると おおきく なるよ');
  hint.append(iconCanvas(72, ICONS.phone, 'phone72'));
  const scenes = [];
  let celebrateTimer = null;
  const api = {
    stage,
    level: lv,
    genreId: g.id,
    createScene(opts) { const s = createScene(stage, opts); scenes.push(s); return s; },
    celebrate({ ja = 'できた！', en = 'You did it!' } = {}) {
      play('done');
      speak(ja, en);
      const old = stage.querySelector('.celebrate');
      if (old) old.remove();
      const c = $('div', 'celebrate', stage);
      c.append(label(ja, en));
      btns.next.classList.add('glow');
      clearTimeout(celebrateTimer);
      celebrateTimer = setTimeout(() => { c.classList.add('out'); setTimeout(() => c.remove(), 600); }, 2200);
    },
    markSolved() {
      const k = 'g.' + g.id + '.solved';
      const s = load(k, {});
      s[lv.id] = (s[lv.id] || 0) + 1;
      save(k, s);
    },
    /** その遊びで初めてなら true(手のアニメを見せるのに使う) */
    firstTime(key = 'intro') {
      const k = 'g.' + g.id + '.seen.' + key;
      if (load(k, false)) return false;
      save(k, true);
      return true;
    },
    load: (key, fb) => load('g.' + g.id + '.' + key, fb),
    save: (key, v) => save('g.' + g.id + '.' + key, v),
    play, speak, label, txt, drawLabel,
    settings: { get: (k) => settings.get(k), onChange: (fn) => settings.onChange(fn) },
    glowNext(on = true) { btns.next.classList.toggle('glow', on); },
  };
  pushScreen();
  try {
    inst = g.start(api) || {};
  } catch (err) {
    console.error(err);
    stage.append(label('ごめんね、もういちど ためしてね', 'Sorry. Please try again.'));
  }
  current = {
    dispose() {
      clearTimeout(celebrateTimer);
      try { inst && inst.stop && inst.stop(); } catch (e) { console.error(e); }
      scenes.forEach((s) => s.stop());
    },
  };
}

// ---------- 大人用設定 ----------
function closeSettings() {
  const s = document.querySelector('.settings');
  if (s) s.remove();
}
function openSettings() {
  pushScreen();
  const ov = $('div', 'settings', document.body);
  const panel = $('div', 'settings-panel scroll', ov);
  $('h2', '', panel).textContent = 'おとなの せってい';
  const row = (title, note) => {
    const r = $('div', 'set-row', panel);
    const t = $('div', 'set-title', r);
    t.textContent = title;
    if (note) { const n = $('div', 'set-note', r); n.textContent = note; }
    return $('div', 'set-choices', r);
  };
  const choice = (parent, key, options) => {
    const btns = options.map(([val, text]) => {
      const b = $('button', 'choice', parent);
      b.type = 'button';
      b.textContent = text;
      b.dataset.key = key;
      b.dataset.val = String(val);
      onTap(b, () => { settings.set(key, val); sync(); });
      return [b, val];
    });
    const sync = () => btns.forEach(([b, v]) => b.classList.toggle('on', settings.get(key) === v));
    sync();
  };
  choice(row('おと', '待合室ではオフがおすすめ。オフでもすべて遊べます。'), 'sound', [[false, 'オフ'], [true, 'オン']]);
  choice(row('よみあげ', '音がオンのときだけ、端末の読み上げ機能でことばを読みます。'), 'speech', [[false, 'オフ'], [true, 'オン']]);
  choice(row('ことば'), 'lang', [['ja', 'にほんご'], ['both', 'えいごも'], ['en', 'English']]);
  const hasReal = GENRES.some((g) => g.supportsRealPhysics);
  if (hasReal) choice(row('ころころそうち「リアルなうごき」', 'オンにすると、ころころそうちで物理エンジン版を選べます。'), 'realPhysics', [[false, 'オフ'], [true, 'オン']]);
  // きろくを消す(2 回押しで実行)
  const r = row('きろくを けす', 'あそんだ記録・作った装置・設定を消します。2回押すと消えます。');
  const del = $('button', 'choice danger', r);
  del.type = 'button';
  del.textContent = 'けす';
  let armed = false;
  onTap(del, () => {
    if (!armed) { armed = true; del.textContent = 'もういちど おすと けします'; return; }
    clearAll(); settings.reset(); del.textContent = 'けしました'; setTimeout(() => location.reload(), 600);
  });
  const info = $('div', 'set-note about', panel);
  info.textContent = 'このアプリは端末の中だけで動き、外部に通信しません。広告・課金はありません。 版: ' + (window.APP_VERSION || '');
  const close = $('button', 'choice close', panel);
  close.type = 'button';
  close.textContent = 'とじる';
  onTap(close, () => goHome());
}

// ---------- 起動 ----------
export function boot() {
  // ダブルタップ拡大・ピンチ・長押しメニュー・引っ張り更新を防ぐ
  document.addEventListener('gesturestart', (e) => e.preventDefault());
  document.addEventListener('dblclick', (e) => e.preventDefault());
  document.addEventListener('contextmenu', (e) => e.preventDefault());
  document.addEventListener('touchmove', (e) => {
    if (!e.target.closest || !e.target.closest('.scroll')) e.preventDefault();
  }, { passive: false });
  try { history.replaceState({ s: 'home', d: 0 }, ''); } catch { }
  showHome();
}
