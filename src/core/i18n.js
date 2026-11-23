// ことば表示(にほんご / えいごも / English)
// ja の中では「{カタカナ|よみ}」と書くと、小さなふりがなが付きます。
//   例: '{ショベルカー|しょべるかー}で あなを ほろう'
import { settings } from './settings.js';
import { FONT } from '../crayon/crayon.js';
import { P } from '../crayon/palette.js';

const RUBY_RE = /\{([^|}]+)\|([^}]+)\}/g;

/** ルビ記法を外したふつうの文字 */
export function plain(ja) { return String(ja).replace(RUBY_RE, '$1'); }
/** ルビ記法を読み(ひらがな)に置きかえた文字(読み上げ用) */
export function yomi(ja) { return String(ja).replace(RUBY_RE, '$2'); }

/** 文字列を [{t, r}] の部品に分ける */
export function segments(ja) {
  const out = [];
  let last = 0;
  String(ja).replace(RUBY_RE, (m, base, r, idx) => {
    if (idx > last) out.push({ t: ja.slice(last, idx) });
    out.push({ t: base, r });
    last = idx + m.length;
    return m;
  });
  if (last < ja.length) out.push({ t: ja.slice(last) });
  return out;
}

function jaNode(ja) {
  const span = document.createElement('span');
  span.className = 'ja';
  for (const s of segments(ja)) {
    if (s.r) {
      const ruby = document.createElement('ruby');
      ruby.append(s.t);
      const rt = document.createElement('rt');
      rt.textContent = s.r;
      ruby.append(rt);
      span.append(ruby);
    } else span.append(s.t);
  }
  return span;
}

/**
 * DOM 用のラベル。設定に合わせて日本語・英語を並べる。
 * 設定が変わると自動で書きかわる。
 */
export function label(ja, en, { className = '' } = {}) {
  const el = document.createElement('span');
  el.className = 'lbl ' + className;
  const render = () => {
    el.textContent = '';
    const mode = settings.get('lang');
    const j = jaNode(ja);
    const e = document.createElement('span');
    e.className = 'en';
    e.textContent = en || '';
    if (mode === 'ja' || !en) { el.append(j); }
    else if (mode === 'en') { e.classList.add('main'); j.classList.add('sub'); el.append(e, j); }
    else { j.classList.add('main'); e.classList.add('sub'); el.append(j, e); }
    el.setAttribute('aria-label', plain(ja) + (en ? ' / ' + en : ''));
  };
  render();
  const off = settings.onChange((s, k) => { if (!k || k === 'lang') render(); });
  el._dispose = off;
  return el;
}

/** 文字列(設定に合わせて)。表示の補助や読み上げ向け */
export function txt(ja, en) {
  const mode = settings.get('lang');
  if (mode === 'en' && en) return en;
  return plain(ja);
}

function drawRubyLine(ctx, ja, x, y, size, color, align) {
  const segs = segments(ja);
  ctx.font = `bold ${size}px ${FONT}`;
  const widths = segs.map((s) => ctx.measureText(s.t).width);
  const total = widths.reduce((a, b) => a + b, 0);
  let cx = align === 'center' ? x - total / 2 : align === 'right' ? x - total : x;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  segs.forEach((s, i) => {
    ctx.font = `bold ${size}px ${FONT}`;
    ctx.fillStyle = color;
    ctx.fillText(s.t, cx, y);
    if (s.r) {
      const rs = Math.max(12, size * 0.42);
      ctx.font = `bold ${rs}px ${FONT}`;
      ctx.textAlign = 'center';
      ctx.fillText(s.r, cx + widths[i] / 2, y - size * 0.62 - rs * 0.3);
      ctx.textAlign = 'left';
    }
    cx += widths[i];
  });
}

/**
 * キャンバス用のラベル。(x, y) が日本語(主)の行の中心。
 * 英語が下に小さく付く(設定による)。返り値は描いた高さ。
 */
export function drawLabel(ctx, ja, en, x, y, size = 40, { color = P.sumi, align = 'center' } = {}) {
  const mode = settings.get('lang');
  ctx.save();
  ctx.globalAlpha = 0.95;
  if (mode === 'en' && en) {
    ctx.font = `bold ${size}px ${FONT}`;
    ctx.textAlign = align; ctx.textBaseline = 'middle'; ctx.fillStyle = color;
    ctx.fillText(en, x, y);
    drawRubyLine(ctx, ja.replace(RUBY_RE, '$2'), x, y + size * 0.95, size * 0.55, color, align);
  } else {
    drawRubyLine(ctx, ja, x, y, size, color, align);
    if (mode === 'both' && en) {
      ctx.font = `${Math.round(size * 0.55)}px ${FONT}`;
      ctx.textAlign = align; ctx.textBaseline = 'middle'; ctx.fillStyle = color;
      ctx.globalAlpha = 0.8;
      ctx.fillText(en, x, y + size * 0.9);
    }
  }
  ctx.restore();
}
