// クレヨン調パレット(仕様書 6-1)。この表以外の色は使わないこと。
export const P = Object.freeze({
  aka: '#D9786A',      // あか
  daidai: '#E8A26A',   // だいだい
  kiiro: '#EBCB74',    // きいろ
  kimidori: '#A9C98A', // きみどり
  midori: '#7FAE8E',   // みどり
  sorairo: '#8CBCD9',  // そらいろ
  ao: '#6E8FBF',       // あお
  murasaki: '#A895C2', // むらさき
  chairo: '#A98466',   // ちゃいろ
  haiiro: '#9A9690',   // はいいろ
  sumi: '#4A4642',     // くろ(すみ)
  gayoshi: '#FAF5EA',  // がようし
});

export const PALETTE_LIST = Object.values(P);

/** 色名の一覧(子ども向け表示用) */
export const COLOR_NAMES = {
  aka: { ja: 'あか', en: 'red' },
  daidai: { ja: 'だいだい', en: 'orange' },
  kiiro: { ja: 'きいろ', en: 'yellow' },
  kimidori: { ja: 'きみどり', en: 'light green' },
  midori: { ja: 'みどり', en: 'green' },
  sorairo: { ja: 'そらいろ', en: 'sky blue' },
  ao: { ja: 'あお', en: 'blue' },
  murasaki: { ja: 'むらさき', en: 'purple' },
  chairo: { ja: 'ちゃいろ', en: 'brown' },
  haiiro: { ja: 'はいいろ', en: 'gray' },
  sumi: { ja: 'くろ', en: 'black' },
  gayoshi: { ja: 'しろ', en: 'white' },
};
