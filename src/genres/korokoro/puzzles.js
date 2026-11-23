// ころころそうち のお題。fixed=最初からある部品、tools=どうぐばこ、solution=答えの一例(テスト用・見本の手)
// 座標: 横 0〜840(右はどうぐばこ)、床 y=560
export const PUZZLES = {
  1: [
    {
      name: 'さかで つなごう',
      fixed: [
        { type: 'ballS', x: 60, y: 90 },
        { type: 'wall', x1: 30, y1: 120, x2: 330, y2: 200 },
        { type: 'wall', x1: 510, y1: 250, x2: 760, y2: 300 },
        { type: 'goal', x: 775, y: 560 },
      ],
      tools: [{ type: 'ramp', angle: 15 }],
      solution: [{ type: 'ramp', x: 420, y: 225, angle: 15 }],
    },
    {
      name: 'バネで ジャンプ',
      fixed: [
        { type: 'ballS', x: 60, y: 170 },
        { type: 'wall', x1: 30, y1: 200, x2: 300, y2: 260 },
        { type: 'wall', x1: 620, y1: 330, x2: 620, y2: 560 },
        { type: 'goal', x: 770, y: 560 },
      ],
      tools: [{ type: 'spring' }],
      solution: [{ type: 'spring', x: 510, y: 524 }],
    },
    {
      name: 'ドミノを たおそう',
      fixed: [
        { type: 'ballS', x: 50, y: 120 },
        { type: 'wall', x1: 20, y1: 150, x2: 230, y2: 290 },
        { type: 'wall', x1: 230, y1: 292, x2: 660, y2: 292 },
        { type: 'domino', x: 300, y: 284, ci: 0 },
        { type: 'domino', x: 360, y: 284, ci: 1 },
        { type: 'domino', x: 480, y: 284, ci: 3 },
        { type: 'domino', x: 540, y: 284, ci: 4 },
        { type: 'ballS', x: 574, y: 264 },
        { type: 'goal', x: 775, y: 560 },
      ],
      tools: [{ type: 'domino' }],
      solution: [{ type: 'domino', x: 420, y: 284 }],
    },
    {
      name: 'ベルトコンベアで はこぼう',
      fixed: [
        { type: 'ballS', x: 200, y: 60 },
        { type: 'wall', x1: 340, y1: 380, x2: 560, y2: 430 },
        { type: 'goal', x: 650, y: 560 },
      ],
      tools: [{ type: 'conveyor' }],
      solution: [{ type: 'conveyor', x: 220, y: 300 }],
    },
    {
      name: 'さかの むきを かえよう',
      fixed: [
        { type: 'ballS', x: 300, y: 50 },
        { type: 'wall', x1: 390, y1: 380, x2: 390, y2: 560 },
        { type: 'goal', x: 520, y: 560 },
      ],
      tools: [{ type: 'ramp', angle: 0 }],
      solution: [{ type: 'ramp', x: 310, y: 260, angle: 30 }],
    },
  ],
  2: [
    {
      name: 'さかを ふたつ',
      fixed: [
        { type: 'ballS', x: 60, y: 60 },
        { type: 'wall', x1: 30, y1: 90, x2: 240, y2: 146 },
        { type: 'wall', x1: 414, y1: 192, x2: 540, y2: 226 },
        { type: 'goal', x: 775, y: 560 },
      ],
      tools: [{ type: 'ramp', angle: 0 }, { type: 'ramp', angle: 0 }],
      solution: [{ type: 'ramp', x: 327, y: 169, angle: 15 }, { type: 'ramp', x: 627, y: 249, angle: 15 }],
    },
    {
      name: 'ダンプカーで はこぼう',
      fixed: [
        { type: 'ballS', x: 60, y: 100 },
        { type: 'wall', x1: 30, y1: 130, x2: 200, y2: 165 },
        { type: 'goal', x: 775, y: 560 },
      ],
      tools: [{ type: 'dump', dir: -1, toX: 680 }],
      solution: [{ type: 'dump', x: 330, y: 560, dir: -1, toX: 680 }],
    },
    {
      name: 'さかと バネ',
      fixed: [
        { type: 'ballS', x: 150, y: 40 },
        { type: 'wall', x1: 620, y1: 380, x2: 620, y2: 560 },
        { type: 'goal', x: 760, y: 560 },
      ],
      tools: [{ type: 'ramp', angle: 0 }, { type: 'spring' }],
      solution: [{ type: 'ramp', x: 180, y: 250, angle: 30 }, { type: 'spring', x: 470, y: 524 }],
    },
    {
      name: 'ベルトの むき',
      fixed: [
        { type: 'ballS', x: 500, y: 40 },
        { type: 'wall', x1: 380, y1: 330, x2: 160, y2: 400 },
        { type: 'wall', x1: 560, y1: 360, x2: 840, y2: 360 },
        { type: 'goal', x: 80, y: 560 },
      ],
      tools: [{ type: 'conveyor', speed: 240 }],
      solution: [{ type: 'conveyor', x: 480, y: 280, speed: -240 }],
      wrong: [[{ type: 'conveyor', x: 480, y: 280, speed: 240 }]],
    },
    {
      name: 'シーソーで ベルを ならそう',
      fixed: [
        { type: 'seesaw', x: 420, y: 516, tilt: 'r' },
        { type: 'ballS', x: 515, y: 508 },
        { type: 'goal', style: 'bell', x: 505, y: 310 },
      ],
      tools: [{ type: 'ballB' }],
      solution: [{ type: 'ballB', x: 320, y: 150 }],
    },
  ],
  3: [
    {
      name: 'どれを つかう？',
      fixed: [
        { type: 'ballS', x: 260, y: 40 },
        { type: 'wall', x1: 680, y1: 360, x2: 680, y2: 560 },
        { type: 'goal', x: 775, y: 560 },
      ],
      tools: [{ type: 'ramp', angle: 0 }, { type: 'spring' }, { type: 'domino' }],
      solution: [{ type: 'ramp', x: 290, y: 250, angle: 30 }, { type: 'spring', x: 580, y: 524 }],
    },
    {
      name: 'ベルトと ドミノ',
      fixed: [
        { type: 'ballS', x: 90, y: 40 },
        { type: 'wall', x1: 300, y1: 292, x2: 680, y2: 292 },
        { type: 'domino', x: 360, y: 284, ci: 0 },
        { type: 'domino', x: 420, y: 284, ci: 1 },
        { type: 'domino', x: 540, y: 284, ci: 3 },
        { type: 'domino', x: 600, y: 284, ci: 4 },
        { type: 'ballS', x: 634, y: 264 },
        { type: 'goal', x: 780, y: 560 },
      ],
      tools: [{ type: 'conveyor', speed: -240 }, { type: 'domino' }, { type: 'spring' }],
      solution: [{ type: 'conveyor', x: 160, y: 260, speed: 240 }, { type: 'domino', x: 480, y: 284 }],
      wrong: [[{ type: 'conveyor', x: 160, y: 260, speed: -240 }, { type: 'domino', x: 480, y: 284 }]],
    },
    {
      name: 'ダンプと バネで ベル',
      fixed: [
        { type: 'ballS', x: 60, y: 60 },
        { type: 'wall', x1: 30, y1: 90, x2: 220, y2: 140 },
        { type: 'goal', style: 'bell', x: 770, y: 190 },
      ],
      tools: [{ type: 'dump', dir: -1, toX: 600 }, { type: 'spring' }, { type: 'ramp', angle: 0 }],
      solution: [{ type: 'dump', x: 400, y: 560, dir: -1, toX: 600 }, { type: 'spring', x: 720, y: 524 }],
    },
    {
      name: 'ベルトで シーソーへ',
      fixed: [
        { type: 'ballB', x: 790, y: 120 },
        { type: 'wall', x1: 820, y1: 150, x2: 600, y2: 200 },
        { type: 'seesaw', x: 300, y: 516, tilt: 'r' },
        { type: 'ballS', x: 395, y: 508 },
        { type: 'goal', style: 'bell', x: 395, y: 340, only: 's' },
      ],
      tools: [{ type: 'conveyor', speed: 240 }, { type: 'ramp', angle: 0 }],
      solution: [{ type: 'conveyor', x: 440, y: 300, speed: -240 }],
      wrong: [[{ type: 'conveyor', x: 440, y: 300, speed: 240 }]],
    },
    {
      name: 'ながい そうち',
      fixed: [
        { type: 'ballS', x: 60, y: 90 },
        { type: 'wall', x1: 30, y1: 120, x2: 330, y2: 200 },
        { type: 'wall', x1: 510, y1: 250, x2: 600, y2: 274 },
        { type: 'wall', x1: 700, y1: 490, x2: 700, y2: 560 },
        { type: 'goal', style: 'bell', x: 760, y: 160 },
      ],
      tools: [{ type: 'ramp', angle: 0 }, { type: 'spring' }, { type: 'domino' }],
      solution: [{ type: 'ramp', x: 420, y: 225, angle: 15 }, { type: 'spring', x: 790, y: 524 }],
      wrong: [[{ type: 'spring', x: 790, y: 524 }], [{ type: 'ramp', x: 420, y: 225, angle: 15 }]],
    },
  ],
};
