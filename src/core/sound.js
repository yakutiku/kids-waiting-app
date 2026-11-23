// 効果音(ブラウザ内蔵の機能でその場で合成。音ファイルは使わない)と読み上げ。
// 音は初期設定でオフ。オフのときは何もしない。音がなくても遊べるように作ること。
import { settings } from './settings.js';
import { yomi } from './i18n.js';

let ac = null;
function ctx() {
  if (!settings.get('sound')) return null;
  try {
    if (!ac) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ac = new AC();
    }
    if (ac.state === 'suspended') ac.resume();
    return ac;
  } catch { return null; }
}
// iOS では最初のタッチで音の準備をする必要がある
export function unlockAudio() { ctx(); }

const VOL = 0.12; // 小さめ

function tone(a, { freq = 440, to = null, type = 'sine', dur = 0.15, vol = 1, delay = 0 }) {
  const t0 = a.currentTime + delay;
  const o = a.createOscillator();
  const g = a.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t0);
  if (to) o.frequency.exponentialRampToValueAtTime(to, t0 + dur);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(VOL * vol, t0 + 0.015);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  o.connect(g).connect(a.destination);
  o.start(t0);
  o.stop(t0 + dur + 0.05);
}
function noise(a, { dur = 0.2, vol = 0.6, delay = 0, lp = 1200 }) {
  const t0 = a.currentTime + delay;
  const len = Math.floor(a.sampleRate * dur);
  const buf = a.createBuffer(1, len, a.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const s = a.createBufferSource();
  s.buffer = buf;
  const f = a.createBiquadFilter();
  f.type = 'lowpass'; f.frequency.value = lp;
  const g = a.createGain();
  g.gain.value = VOL * vol;
  s.connect(f).connect(g).connect(a.destination);
  s.start(t0);
}

const SOUNDS = {
  tap: (a) => tone(a, { freq: 660, dur: 0.08, vol: 0.6 }),
  pick: (a) => tone(a, { freq: 520, to: 780, dur: 0.12, vol: 0.7 }),
  drop: (a) => tone(a, { freq: 600, to: 400, dur: 0.12, vol: 0.7 }),
  back: (a) => tone(a, { freq: 420, to: 330, dur: 0.18, vol: 0.5, type: 'triangle' }), // そっと戻る
  pop: (a) => tone(a, { freq: 880, to: 1320, dur: 0.1, vol: 0.7 }),
  done: (a) => { [523, 659, 784, 1047].forEach((f, i) => tone(a, { freq: f, dur: 0.35, delay: i * 0.12, type: 'triangle' })); },
  ding: (a) => tone(a, { freq: 1047, dur: 0.4, type: 'triangle' }),
  thud: (a) => { tone(a, { freq: 140, to: 70, dur: 0.15, vol: 1.2 }); noise(a, { dur: 0.08, vol: 0.4, lp: 600 }); },
  click: (a) => noise(a, { dur: 0.03, vol: 0.5, lp: 3000 }),
  boing: (a) => tone(a, { freq: 220, to: 660, dur: 0.25, type: 'triangle' }),
  whoosh: (a) => noise(a, { dur: 0.35, vol: 0.5, lp: 900 }),
  train: (a) => { tone(a, { freq: 392, dur: 0.5, type: 'triangle', vol: 0.8 }); tone(a, { freq: 494, dur: 0.5, type: 'triangle', vol: 0.6 }); },
  flip: (a) => tone(a, { freq: 700, to: 900, dur: 0.07, vol: 0.5, type: 'triangle' }),
};

/** 効果音を鳴らす(音オフなら何もしない) */
export function play(name) {
  const a = ctx();
  if (!a || !SOUNDS[name]) return;
  try { SOUNDS[name](a); } catch { }
}

/** 読み上げ(音オン かつ 読み上げオン のときだけ)。言語設定に合わせて読む */
export function speak(ja, en) {
  if (!settings.get('sound') || !settings.get('speech')) return;
  const synth = window.speechSynthesis;
  if (!synth) return;
  try {
    synth.cancel();
    const mode = settings.get('lang');
    const say = (text, lang) => {
      const u = new SpeechSynthesisUtterance(text);
      u.lang = lang; u.rate = lang === 'ja-JP' ? 0.95 : 0.85; u.volume = 0.8;
      synth.speak(u);
    };
    if (mode === 'en' && en) { say(en, 'en-US'); }
    else {
      say(yomi(ja), 'ja-JP');
      if (mode === 'both' && en) say(en, 'en-US');
    }
  } catch { }
}
